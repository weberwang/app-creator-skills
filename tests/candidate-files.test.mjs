/** 验证候选检查只绑定明确路径及真实文件身份，不选择其他构建目录。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CLI = fileURLToPath(new URL('../skills/app-domain-toolkit/scripts/verification/candidate-files.mjs', import.meta.url));

/** 每例使用独占临时根，并在删除前核实真实路径、父目录和前缀。 */
function fixture(t) {
  const prefix = 'candidate-files-test-';
  const base = mkdtempSync(join(tmpdir(), prefix));
  const repo = join(base, 'project');
  mkdirSync(repo);
  t.after(() => {
    const actual = realpathSync(base);
    assert.equal(dirname(actual), realpathSync(tmpdir()));
    assert.ok(basename(actual).startsWith(prefix));
    rmSync(actual, { recursive: true, force: true });
  });
  return { base, repo };
}

/** 在本用例项目内准备实际输入或输出，不触碰真实候选。 */
function write(repo, path, bytes) {
  const target = join(repo, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

/** 执行真实 CLI 并要求失败和成功都返回可解析的 JSON。 */
function run(...args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.ok(result.stdout, result.stderr);
  return { status: result.status, output: JSON.parse(result.stdout), stderr: result.stderr };
}

/** 创建明确输入、旧输出和当前输出，覆盖目录顺序不可靠的场景。 */
function setup(t) {
  const result = fixture(t);
  write(result.repo, 'src/game.js', 'source-v1');
  write(result.repo, 'dist/index.html', 'old');
  write(result.repo, 'build/index.html', 'new');
  write(result.repo, 'build/assets/game.js', 'built');
  return result;
}

/** 测试用的快照通过真实命令取得，后续明确保存为调用方输入。 */
function snapshot(repo, extra = []) {
  const result = run('snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src', '--require', 'index.html', ...extra);
  assert.equal(result.status, 0, JSON.stringify(result.output));
  return result.output;
}

/** 即使旧 dist 存在，也只读取调用方选择的 build，不修改任何文件。 */
test('显式选定当前候选，快照和检查不猜选或修改其他目录', (t) => {
  const { repo } = setup(t);
  const before = readFileSync(join(repo, 'dist/index.html'), 'utf8');
  const record = snapshot(repo);
  assert.equal(record.ok, true);
  assert.equal(record.artifact.path, 'build');
  assert.deepEqual(record.artifact.files.map((file) => file.path), ['build/assets/game.js', 'build/index.html']);
  assert.ok(record.limitations.some((item) => item.includes('不证明构建')));
  assert.equal(readFileSync(join(repo, 'dist/index.html'), 'utf8'), before);
  assert.equal(readFileSync(join(repo, 'build/index.html'), 'utf8'), 'new');
  write(repo, 'evidence/snapshot.json', JSON.stringify(record));
  const checked = run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json');
  assert.equal(checked.status, 0, JSON.stringify(checked.output));
  assert.equal(checked.output.operation, 'check');
  assert.equal(checked.output.artifact, 'build');
  assert.equal(readFileSync(join(repo, 'dist/index.html'), 'utf8'), before);
});

/** 输入内容以及候选的新增、删除和修改都必须使已有快照失效。 */
test('冻结后输入或候选文件集合和内容发生变化时拒绝', (t) => {
  const { repo } = setup(t);
  const record = snapshot(repo);
  write(repo, 'evidence/snapshot.json', JSON.stringify(record));
  write(repo, 'src/game.js', 'source-v2');
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json').status, 1);
  write(repo, 'src/game.js', 'source-v1');
  write(repo, 'build/assets/extra.js', 'extra');
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json').status, 1);
  rmSync(join(repo, 'build/assets/extra.js'));
  rmSync(join(repo, 'build/assets/game.js'));
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json').status, 1);
  write(repo, 'build/assets/game.js', 'different');
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json').status, 1);
});

/** 标准命令采集包装可复用；非零退出、缺字段或非 JSON 输出不得冒充快照。 */
test('接受成功的 command-capture-v1 原始输出并拒绝失败记录', (t) => {
  const { repo } = setup(t);
  const record = snapshot(repo);
  const capture = { schemaVersion: 'command-capture-v1', command: '实际测试命令', exitCode: 0, stdout: JSON.stringify(record), stderr: '' };
  write(repo, 'evidence/capture.json', JSON.stringify(capture));
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/capture.json').status, 0);
  for (const invalid of [{ ...capture, exitCode: 1 }, { ...capture, stdout: 'not-json' }, { ...capture, command: '' }, { ...capture, stderr: null }]) {
    write(repo, 'evidence/capture.json', JSON.stringify(invalid));
    assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/capture.json').status, 1);
  }
});

/** 静态项目的同一文件可同时是输入与候选，原生包也不要求目录入口。 */
test('允许同一静态源和产物，支持单文件候选', (t) => {
  const { repo } = fixture(t);
  write(repo, 'index.html', 'static');
  const result = run('snapshot', '--repo', repo, '--artifact', 'index.html', '--input', 'index.html');
  assert.equal(result.status, 0, JSON.stringify(result.output));
  assert.equal(result.output.artifact.kind, 'file');
  write(repo, 'evidence/snapshot.json', JSON.stringify(result.output));
  assert.equal(run('check', '--repo', repo, '--snapshot', 'evidence/snapshot.json').status, 0);
  write(repo, 'native/release.aab', 'native-binary');
  assert.equal(run('snapshot', '--repo', repo, '--artifact', 'native/release.aab', '--input', 'index.html').status, 0);
  assert.equal(run('snapshot', '--repo', repo, '--artifact', 'native/release.aab', '--input', 'index.html', '--require', 'index.html').status, 1);
});

/** 缺少明确目标、空候选、必需入口缺失和重复选项不能产生成功记录。 */
test('拒绝模糊、空和不完整候选及非法参数', (t) => {
  const { repo } = setup(t);
  mkdirSync(join(repo, 'empty'));
  write(repo, 'empty-file.aab', '');
  const cases = [
    ['snapshot', '--repo', repo, '--input', 'src'],
    ['snapshot', '--repo', repo, '--artifact', 'empty', '--input', 'src'],
    ['snapshot', '--repo', repo, '--artifact', 'empty-file.aab', '--input', 'src'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src', '--require', 'absent.html'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src', '--require', '../dist/index.html'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src', '--input', 'src'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--artifact', 'dist', '--input', 'src'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src', '--unknown', 'value'],
    ['snapshot', '--repo', repo, '--artifact', 'build', '--input'],
  ];
  for (const args of cases) {
    const result = run(...args);
    assert.equal(result.status, 1, JSON.stringify({ args, result }));
    assert.equal(result.output.ok, false);
  }
});

/** 不允许借路径穿越或本地工具目录冒充实际输入。 */
test('拒绝越界路径、根级本地工具目录和 Git 元数据', (t) => {
  const { base, repo } = setup(t);
  write(base, 'outside.txt', 'outside');
  write(repo, '.agents/skills/tool.txt', 'tool');
  write(repo, '.git/config', 'git');
  for (const input of ['../outside.txt', '.agents/skills/tool.txt', '.git/config']) {
    assert.equal(run('snapshot', '--repo', repo, '--artifact', 'build', '--input', input).status, 1, input);
  }
  if (process.platform === 'win32') assert.equal(run('snapshot', '--repo', repo, '--artifact', 'build', '--input', '.AGENTS/skills/tool.txt').status, 1);
  write(repo, 'src/.agents/business.txt', 'business');
  assert.equal(run('snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src/.agents/business.txt').status, 0);
});

/** 目录链接不能让显式路径或目录遍历读取项目外内容。 */
test('拒绝候选树和输入路径中的目录链接', (t) => {
  const { base, repo } = setup(t);
  const outside = join(base, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'secret.txt'), 'outside');
  const link = join(repo, 'build/linked');
  try { symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip(`环境不支持链接：${error.code}`);
    throw error;
  }
  assert.equal(run('snapshot', '--repo', repo, '--artifact', 'build', '--input', 'src').status, 1);
  assert.equal(run('snapshot', '--repo', repo, '--artifact', 'dist', '--input', 'build/linked/secret.txt').status, 1);
});

/** 快照只能引用自己的路径、唯一文件及明确的原始验证范围。 */
test('拒绝被篡改、重复或越出候选范围的快照', (t) => {
  const { repo } = setup(t);
  const record = snapshot(repo);
  const variants = [
    { ...record, ok: false },
    { ...record, extra: true },
    { ...record, limitations: [] },
    { ...record, inputs: [record.inputs[0], record.inputs[0]] },
    { ...record, artifact: { ...record.artifact, files: [...record.artifact.files, record.artifact.files[0]] } },
    { ...record, artifact: { ...record.artifact, files: [{ ...record.artifact.files[0], path: 'dist/index.html' }] } },
    { ...record, requiredFiles: ['../dist/index.html'] },
    { ...record, requiredFiles: ['index.html', 'index.html'] },
  ];
  for (const invalid of variants) {
    write(repo, 'evidence/invalid.json', JSON.stringify(invalid));
    const result = run('check', '--repo', repo, '--snapshot', 'evidence/invalid.json');
    assert.equal(result.status, 1, JSON.stringify(invalid));
    assert.equal(result.output.ok, false);
  }
});

/** 作为模块导入不能执行 CLI 或访问项目路径，便于复用与独立测试。 */
test('作为模块导入没有标准输出和文件副作用', () => {
  const url = new URL('../skills/app-domain-toolkit/scripts/verification/candidate-files.mjs', import.meta.url);
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url.href)})`], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});
