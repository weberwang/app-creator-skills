import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initializeDocs } from '../skills/app-stack-roblox/scripts/initialize-project-docs.mjs';
import { initializeWork } from '../skills/app-workflow-control/scripts/runtime/workflow.mjs';

const script = fileURLToPath(new URL('../skills/app-stack-roblox/scripts/initialize-project-docs.mjs', import.meta.url));

/** 创建隔离项目和真实工作项，供命令行复用现有权限预检。 */
async function fixture(t, approved = true) {
  const temporary = fs.realpathSync(tmpdir());
  const root = fs.mkdtempSync(join(temporary, 'roblox-docs-preflight-'));
  t.after(() => {
    const actual = fs.realpathSync(root);
    assert.equal(dirname(actual), temporary);
    assert.ok(basename(actual).startsWith('roblox-docs-preflight-'));
    fs.rmSync(actual, { recursive: true, force: true });
  });
  const project = join(root, 'project');
  fs.mkdirSync(project);
  const result = await initializeWork({ repo: project, args: { id: 'roblox-docs-test', stack: 'roblox', type: 'FOUNDATION', objective: '验证文档初始化边界' } });
  const workItem = result.metadata.workItemPath;
  const workFile = join(project, ...workItem.split('/'));
  const work = JSON.parse(fs.readFileSync(workFile, 'utf8'));
  if (approved) work.gateStatus.F0 = 'PASS';
  work.forbiddenPaths.push('src/private.luau');
  fs.writeFileSync(workFile, JSON.stringify(work, null, 2));
  return { root, project, workItem, workFile };
}

/** 通过真实子进程调用 CLI，保留其 Work Item 和 F0 检查。 */
function cli(f, extra = [], hook) {
  const args = [...(hook ? ['--import', hook] : []), script, '--project-root', f.project, '--work-item', f.workItem, '--object', '测试项目文档', ...extra];
  return spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, timeout: 30000, env: { ...process.env, ...(hook ? { ROBLOX_TEST_LINK: join(f.project, 'docs', 'GDD.md') } : {}) } });
}

/** 在符号链接权限不可用时将硬链接伪装为链接，仍以真实目标文件验证写入边界。 */
function installLinkProbe(target) {
  const original = fs.lstatSync;
  fs.lstatSync = (path, ...args) => {
    const stat = original(path, ...args);
    if (resolve(String(path)) !== resolve(target)) return stat;
    return new Proxy(stat, { get(object, key) { if (key === 'isSymbolicLink') return () => true; const value = Reflect.get(object, key, object); return typeof value === 'function' ? value.bind(object) : value; } });
  };
  syncBuiltinESMExports();
  return () => { fs.lstatSync = original; syncBuiltinESMExports(); };
}

/** 给 CLI 子进程注入与进程内一致的受控链接探针。 */
function writeLinkHook(root) {
  const hook = join(root, 'link-hook.mjs');
  fs.writeFileSync(hook, `import fs from 'node:fs';\nimport { syncBuiltinESMExports } from 'node:module';\nimport { resolve } from 'node:path';\nconst original = fs.lstatSync;\nfs.lstatSync = (path, ...args) => {\n  const stat = original(path, ...args);\n  if (resolve(String(path)) !== resolve(process.env.ROBLOX_TEST_LINK)) return stat;\n  return new Proxy(stat, { get(object, key) { if (key === 'isSymbolicLink') return () => true; const value = Reflect.get(object, key, object); return typeof value === 'function' ? value.bind(object) : value; } });\n};\nsyncBuiltinESMExports();\n`);
  return hook;
}

test('CLI 保留 F0、路径预检及默认和 QA 文档的覆盖保护', async (t) => {
  const f = await fixture(t, false);
  let result = cli(f);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /F0=PASS/);
  assert.equal(fs.existsSync(join(f.project, 'docs')), false);
  const work = JSON.parse(fs.readFileSync(f.workFile, 'utf8'));
  work.gateStatus.F0 = 'PASS';
  work.allowedPaths = ['docs/TDD.md'];
  fs.writeFileSync(f.workFile, JSON.stringify(work, null, 2));
  result = cli(f, ['--force']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /allowedPaths/);
  assert.equal(fs.existsSync(join(f.project, 'docs')), false);
  work.allowedPaths = ['docs'];
  fs.writeFileSync(f.workFile, JSON.stringify(work, null, 2));
  result = cli(f);
  assert.equal(result.status, 0, result.stderr);
  const gdd = join(f.project, 'docs', 'GDD.md');
  const original = fs.readFileSync(gdd, 'utf8');
  assert.ok(fs.existsSync(join(f.project, 'docs', 'TDD.md')));
  assert.equal(fs.existsSync(join(f.project, 'docs', 'qa-plan.md')), false);
  result = cli(f, ['--include', 'qa']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(join(f.project, 'docs', 'qa-plan.md')));
  result = cli(f);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /拒绝覆盖/);
  assert.equal(fs.readFileSync(gdd, 'utf8'), original);
});

test('程序接口和 CLI 拒绝指向项目内禁止文件的目标链接', async (t) => {
  const f = await fixture(t);
  fs.mkdirSync(join(f.project, 'src'));
  fs.mkdirSync(join(f.project, 'docs'));
  const victim = join(f.project, 'src', 'private.luau');
  const target = join(f.project, 'docs', 'GDD.md');
  fs.writeFileSync(victim, '原始文件字节');
  let hook;
  try {
    fs.symlinkSync(victim, target, 'file');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    // Windows 未授予创建符号链接权限时，通过硬链接保留实际被覆盖的风险。
    fs.linkSync(victim, target);
    hook = writeLinkHook(f.root);
  }
  const restore = hook ? installLinkProbe(target) : () => {};
  try {
    assert.throws(() => initializeDocs({ projectRoot: f.project, force: true }), /符号链接/);
    assert.throws(() => initializeDocs({ projectRoot: f.project }), /符号链接/);
  } finally { restore(); }
  for (const args of [[], ['--force']]) {
    const result = cli(f, args, hook);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /符号链接/);
    assert.equal(fs.readFileSync(victim, 'utf8'), '原始文件字节');
  }
});

test('程序接口和 CLI 拒绝指向项目外目录的 Junction', async (t) => {
  const f = await fixture(t);
  const outside = join(f.root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(join(outside, 'GDD.md'), '外部原始文件字节');
  fs.symlinkSync(outside, join(f.project, 'docs'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => initializeDocs({ projectRoot: f.project, force: true }), /符号链接|越出项目/);
  const result = cli(f, ['--force']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /符号链接|越出项目/);
  assert.equal(fs.readFileSync(join(outside, 'GDD.md'), 'utf8'), '外部原始文件字节');
});

test('程序接口和 CLI 拒绝链接形式的项目根目录', async (t) => {
  const f = await fixture(t);
  const alias = join(f.root, 'project-alias');
  fs.symlinkSync(f.project, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => initializeDocs({ projectRoot: alias, force: true }), /符号链接/);
  const result = cli({ ...f, project: alias }, ['--force']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /符号链接|父级不是目录/);
  assert.equal(fs.existsSync(join(f.project, 'docs')), false);
});
