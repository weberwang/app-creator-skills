/** 验证素材文件检查只读取显式资料，并区分错误与无法核实的关系。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CLI = fileURLToPath(new URL('../skills/app-domain-toolkit/scripts/verification/asset-files.mjs', import.meta.url));

/** 每个测试独占临时项目，并在真实目录与前缀核验后清理。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'asset-files-test-'));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), realpathSync(tmpdir()));
    assert.ok(basename(actual).startsWith('asset-files-test-'));
    rmSync(actual, { recursive: true, force: true });
  });
  return root;
}

/** 写入单个夹具文件，模拟已有规格与正式工程文件。 */
function write(root, relative, value) {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
}

/** 生成遵循现有 asset-task 形状的最小填写结果。 */
function task(overrides = {}) {
  return { assetId: 'icon', route: 'bitmap', sourcePath: 'art/icon.source', runtimePath: 'assets/icon.png', consumer: '主界面图标', ...overrides };
}

/** 运行受测 CLI 并解析唯一 JSON 输出。 */
function run(root, args = ['--task', 'plans/icon.json', '--consumer', 'icon=src/menu.js']) {
  const result = spawnSync(process.execPath, [CLI, '--repo', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  return { code: result.status, body: JSON.parse(result.stdout), stderr: result.stderr };
}

/** 记录真实字节，以检查只读工具不会改写任何项目文件。 */
function prepare(root, record = task()) {
  write(root, 'plans/icon.json', JSON.stringify(record));
  write(root, 'art/icon.source', 'source');
  write(root, 'assets/icon.png', 'runtime');
  write(root, 'src/menu.js', 'consumer');
}

test('核对现有规格、同一路径源与正式资源，以及多个消费者的身份', (t) => {
  const root = fixture(t);
  prepare(root, task({ sourcePath: 'assets/icon.png' }));
  write(root, 'src/overlay.js', 'overlay');
  const before = readFileSync(join(root, 'plans/icon.json'));
  const { code, body } = run(root, ['--task', 'plans/icon.json', '--consumer', 'icon=src/menu.js', '--consumer', 'icon=src/overlay.js']);
  assert.equal(code, 0);
  assert.equal(body.status, 'PASS');
  assert.equal(body.assets[0].source.sha256, body.assets[0].runtime.sha256);
  assert.equal(body.assets[0].consumers.length, 2);
  assert.match(body.limitations.join(' '), /不证明消费者实际引用/);
  assert.deepEqual(readFileSync(join(root, 'plans/icon.json')), before);
  assert.equal(readFileSync(join(root, 'assets/icon.png'), 'utf8'), 'runtime');
});

test('只有语义消费者、远程资源或空映射时明确保留未验证', (t) => {
  const root = fixture(t);
  prepare(root, task({ sourcePath: 'https://example.test/resource?token=secret' }));
  const result = run(root, ['--task', 'plans/icon.json']);
  assert.equal(result.code, 2);
  assert.equal(result.body.status, 'NOT_RUN');
  assert.equal(result.body.assets[0].source.status, 'NOT_RUN');
  assert.doesNotMatch(JSON.stringify(result.body), /token=secret/);
  write(root, 'plans/icon.json', JSON.stringify(task({ sourcePath: '', runtimePath: '' })));
  assert.equal(run(root).body.status, 'NOT_RUN');
});

test('原生组件无需图片，但实际对象与引擎引用保持未验证', (t) => {
  const root = fixture(t);
  prepare(root, task({ route: 'native', sourcePath: '', runtimePath: '' }));
  const { code, body } = run(root);
  assert.equal(code, 2);
  assert.equal(body.status, 'NOT_RUN');
  assert.equal(body.assets[0].source, null);
  assert.equal(body.assets[0].runtime, null);
  assert.match(body.assets[0].reasons.join(' '), /引擎回读/);
});

test('未知或模板素材路线不能伪装通过', (t) => {
  const root = fixture(t);
  prepare(root, task({ route: 'native-or-bitmap-or-vector-or-3d' }));
  assert.equal(run(root).body.status, 'NOT_RUN');
  write(root, 'plans/icon.json', JSON.stringify(task({ route: 'future-type' })));
  assert.equal(run(root).body.status, 'NOT_RUN');
});

test('缺失文件和空正式资源为失败，失败优先于其他未验证项', (t) => {
  const root = fixture(t);
  prepare(root, task({ sourcePath: '' }));
  write(root, 'assets/icon.png', '');
  let result = run(root);
  assert.equal(result.code, 1);
  assert.equal(result.body.assets[0].runtime.status, 'FAIL');
  write(root, 'plans/icon.json', JSON.stringify(task({ runtimePath: 'assets/missing.png' })));
  result = run(root);
  assert.equal(result.code, 1);
  assert.equal(result.body.status, 'FAIL');
});

test('拒绝重复素材、未知或重复绑定和无效命令行参数', (t) => {
  const root = fixture(t);
  prepare(root);
  write(root, 'plans/duplicate.json', JSON.stringify(task()));
  for (const args of [
    ['--task', 'plans/icon.json', '--task', 'plans/duplicate.json'],
    ['--task', 'plans/icon.json', '--consumer', 'unknown=src/menu.js'],
    ['--task', 'plans/icon.json', '--consumer', 'icon=src/menu.js', '--consumer', 'icon=src/menu.js'],
    ['--task', 'plans/icon.json', '--consumer', 'icon=src/menu.js', '--consumer', 'icon=src//menu.js'],
    ['--task', 'plans/icon.json', '--consumer', 'invalid'],
    ['--task', 'plans/icon.json', '--repo', root],
    ['--task', 'plans/icon.json', '--unexpected', 'x'],
    ['--task'],
  ]) {
    const result = run(root, args);
    assert.equal(result.code, 1, JSON.stringify(args));
    assert.equal(result.body.status, 'FAIL');
  }
});

test('拒绝消费者文件的硬链接别名重复登记', (t) => {
  const root = fixture(t);
  prepare(root);
  try { linkSync(join(root, 'src/menu.js'), join(root, 'src/alias.js')); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('当前环境不支持创建硬链接');
    throw error;
  }
  const result = run(root, ['--task', 'plans/icon.json', '--consumer', 'icon=src/menu.js', '--consumer', 'icon=src/alias.js']);
  assert.equal(result.code, 1);
  assert.equal(result.body.status, 'FAIL');
});

test('作为模块导入时不读取项目或执行 CLI', async () => {
  const module = await import('../skills/app-domain-toolkit/scripts/verification/asset-files.mjs');
  assert.equal(typeof module.inspectAssetFiles, 'function');
});

test('拒绝路径逃逸和项目根工具目录', (t) => {
  const root = fixture(t);
  prepare(root);
  write(root, '.agents/hidden', 'not-a-business-resource');
  for (const path of ['../outside', '.agents/hidden', ...(process.platform === 'win32' ? ['.AGENTS/hidden'] : [])]) {
    write(root, 'plans/icon.json', JSON.stringify(task({ runtimePath: path })));
    assert.equal(run(root).body.status, 'FAIL', path);
  }
});

test('拒绝通过符号链接或目录 Junction 读取消费者', (t) => {
  const root = fixture(t);
  prepare(root);
  try {
    symlinkSync(join(root, 'src'), join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('当前环境没有创建链接的权限');
    throw error;
  }
  const result = run(root, ['--task', 'plans/icon.json', '--consumer', 'icon=linked/menu.js']);
  assert.equal(result.code, 1);
  assert.equal(result.body.status, 'FAIL');
});
