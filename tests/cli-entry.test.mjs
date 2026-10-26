import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDirectEntry } from '../skills/app-skill-runtime/direct-entry.mjs';
import { routeCliEntry } from '../scripts/migration/cli-entry-routing.mjs';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 为测试创建隔离临时目录，并校验清理目标始终位于系统临时目录。 */
function createTemporaryRoot(prefix) {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

/** 按平台创建目录别名；Windows 使用不要求管理员权限的目录 Junction。 */
function createDirectoryAlias(target, alias) {
  symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  return alias;
}

/** 清理目录别名本身，避免递归删除沿着链接触及其目标。 */
function removeDirectoryAlias(alias) {
  if (process.platform === 'win32') rmdirSync(alias);
  else unlinkSync(alias);
}

/** 仅递归清理本测试刚创建、且直接位于系统临时目录下的目录。 */
function removeTemporaryRoot(temporaryRoot, prefix) {
  const absoluteRoot = path.resolve(temporaryRoot);
  assert.equal(path.dirname(absoluteRoot), path.resolve(tmpdir()));
  assert.ok(path.basename(absoluteRoot).startsWith(prefix));
  rmSync(absoluteRoot, { recursive: true, force: true });
}

/** 通过当前 Node 进程运行一个 CLI 子进程并保留可诊断输出。 */
function runNode(entryPath, args = [], options = {}) {
  const result = spawnSync(process.execPath, [entryPath, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

test('direct-entry 按真实文件身份识别真实路径和目录别名', (t) => {
  const prefix = 'app-creator-cli-entry-';
  const temporaryRoot = createTemporaryRoot(prefix);
  const aliases = [];
  t.after(() => {
    for (const alias of aliases) removeDirectoryAlias(alias);
    removeTemporaryRoot(temporaryRoot, prefix);
  });

  const targetDirectory = path.join(temporaryRoot, 'target');
  const aliasDirectory = path.join(temporaryRoot, 'alias');
  mkdirSync(targetDirectory);
  const targetFile = path.join(targetDirectory, 'entry.mjs');
  writeFileSync(targetFile, '');
  aliases.push(createDirectoryAlias(targetDirectory, aliasDirectory));

  const moduleUrl = pathToFileURL(targetFile).href;
  assert.equal(isDirectEntry(moduleUrl, targetFile), true);
  assert.equal(isDirectEntry(moduleUrl, path.join(aliasDirectory, 'entry.mjs')), true);
  assert.equal(isDirectEntry(moduleUrl, undefined), false);
  assert.equal(isDirectEntry(moduleUrl, '-'), false);
  assert.equal(isDirectEntry(moduleUrl, path.join(temporaryRoot, 'missing.mjs')), false);
});

test('普通导入与 argv1 为 - 时不触发 CLI 主体', (t) => {
  const prefix = 'app-creator-cli-import-';
  const temporaryRoot = createTemporaryRoot(prefix);
  t.after(() => removeTemporaryRoot(temporaryRoot, prefix));
  const helperPath = path.join(temporaryRoot, 'direct-entry.mjs');
  const scriptPath = path.join(temporaryRoot, 'entry.mjs');
  copyFileSync(path.join(REPOSITORY_ROOT, 'skills/app-skill-runtime/direct-entry.mjs'), helperPath);
  writeFileSync(scriptPath, [
    `import { isDirectEntry } from ${JSON.stringify(pathToFileURL(helperPath).href)};`,
    'if (isDirectEntry(import.meta.url)) console.log("CLI-RAN");',
  ].join('\n'));

  const result = runNode('--input-type=module', ['-e', `process.argv[1] = "-"; await import(${JSON.stringify(pathToFileURL(scriptPath).href)});`]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('专业入口路由只替换尾部 guard，并给别名调用保留 CLI 行为', (t) => {
  const prefix = 'app-creator-cli-route-';
  const temporaryRoot = createTemporaryRoot(prefix);
  const aliases = [];
  t.after(() => {
    for (const alias of aliases) removeDirectoryAlias(alias);
    removeTemporaryRoot(temporaryRoot, prefix);
  });

  const destination = 'skills/probe/scripts/entry.mjs';
  const sourcePath = 'skills/probe/scripts/entry.mjs';
  const original = [
    '#!/usr/bin/env node',
    'const example = "if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))";',
    'export function main() { console.log("CLI-RAN"); }',
    'if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();',
    '',
  ].join('\n');
  const routed = routeCliEntry(original, { sourcePath, destination, enabled: true });
  assert.deepEqual(routed.transforms, ['route-cli-entry-through-direct-entry-helper']);
  assert.match(routed.text, /import \{ isDirectEntry \} from "\.\.\/\.\.\/app-skill-runtime\/direct-entry\.mjs";/);
  assert.match(routed.text, /if \(isDirectEntry\(import\.meta\.url\)\) await main\(\);/);
  assert.match(routed.text, /const example = "if \(process\.argv\[1\].*fileURLToPath\(import\.meta\.url\)\)";/);

  const fixtureRoot = path.join(temporaryRoot, 'fixture');
  const fixtureEntry = path.join(fixtureRoot, ...destination.split('/'));
  const fixtureRuntime = path.join(fixtureRoot, 'skills/app-skill-runtime/direct-entry.mjs');
  mkdirSync(path.dirname(fixtureEntry), { recursive: true });
  mkdirSync(path.dirname(fixtureRuntime), { recursive: true });
  copyFileSync(path.join(REPOSITORY_ROOT, 'skills/app-skill-runtime/direct-entry.mjs'), fixtureRuntime);
  writeFileSync(fixtureEntry, routed.text);

  const aliasDirectory = path.join(temporaryRoot, 'probe-alias');
  aliases.push(createDirectoryAlias(path.dirname(path.dirname(fixtureEntry)), aliasDirectory));
  const directResult = runNode(path.join(aliasDirectory, 'scripts/entry.mjs'));
  assert.equal(directResult.status, 0, directResult.stderr);
  assert.equal(directResult.stdout.trim(), 'CLI-RAN');

  const importResult = runNode('--input-type=module', ['-e', `process.argv[1] = "-"; await import(${JSON.stringify(pathToFileURL(fixtureEntry).href)});`]);
  assert.equal(importResult.status, 0, importResult.stderr);
  assert.equal(importResult.stdout, '');
  assert.equal(importResult.stderr, '');
});

test('专业 CLI 路由覆盖常见 guard，未知入口 fail closed', (t) => {
  const prefix = 'app-creator-cli-guards-';
  const temporaryRoot = createTemporaryRoot(prefix);
  const aliases = [];
  t.after(() => {
    for (const alias of aliases) removeDirectoryAlias(alias);
    removeTemporaryRoot(temporaryRoot, prefix);
  });
  const fixtureRoot = path.join(temporaryRoot, 'fixture');
  const fixtureRuntime = path.join(fixtureRoot, 'skills/app-skill-runtime/direct-entry.mjs');
  mkdirSync(path.dirname(fixtureRuntime), { recursive: true });
  copyFileSync(path.join(REPOSITORY_ROOT, 'skills/app-skill-runtime/direct-entry.mjs'), fixtureRuntime);

  const guards = [
    'if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) { await main(); }',
    'if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();',
    'if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) { await main(); }',
    'if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) await main();',
    'if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await main(); }',
    'if (invokedFile && currentFile === invokedFile) process.exitCode = await main();',
  ];
  for (const [index, guard] of guards.entries()) {
    const destination = `skills/probe-${index}/scripts/tool.mjs`;
    const declarations = guard.includes('invokedFile &&')
      ? 'import { resolve } from "node:path";\nimport { fileURLToPath } from "node:url";\nconst currentFile = resolve(fileURLToPath(import.meta.url));\nconst invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;\n'
      : '';
    const routed = routeCliEntry(`${declarations}export async function main() { console.log("CLI-${index}"); return 0; }\n${guard}\n`, {
      sourcePath: `skills/probe-${index}/scripts/tool.mjs`,
      destination,
      enabled: true,
    });
    assert.equal((routed.text.match(/isDirectEntry\(import\.meta\.url\)/g) ?? []).length, 1, guard);
    assert.ok(routed.text.endsWith('\n'));

    const fixtureEntry = path.join(fixtureRoot, ...destination.split('/'));
    mkdirSync(path.dirname(fixtureEntry), { recursive: true });
    writeFileSync(fixtureEntry, routed.text);
    const aliasDirectory = path.join(temporaryRoot, `probe-${index}-alias`);
    aliases.push(createDirectoryAlias(path.dirname(path.dirname(fixtureEntry)), aliasDirectory));
    const execution = runNode(path.join(aliasDirectory, 'scripts/tool.mjs'));
    assert.equal(execution.status, 0, `${guard}\n${execution.stderr}`);
    assert.equal(execution.stdout.trim(), `CLI-${index}`, guard);
  }

  const unchanged = 'export const imported = true;\n';
  assert.deepEqual(routeCliEntry(unchanged, { sourcePath: 'skills/x.mjs', destination: 'skills/x.mjs', enabled: false }), { text: unchanged, transforms: [] });
  assert.deepEqual(routeCliEntry(unchanged, {
    sourcePath: 'scripts/verify-game-build.mjs',
    destination: 'skills/threejs-domain-contracts/tools/scripts/verify-game-build.mjs',
    enabled: true,
  }), { text: unchanged, transforms: ['preserve-unconditional-cli-entry'] });
  assert.throws(() => routeCliEntry(unchanged, { sourcePath: 'skills/x.mjs', destination: 'skills/x.mjs', enabled: true }), /必须恰好匹配一个已知 ESM guard/);
});

test('公共 installer、workflow 和去背 CLI 经根目录别名仍有实际输出', (t) => {
  const prefix = 'app-creator-cli-public-';
  const temporaryRoot = createTemporaryRoot(prefix);
  const aliases = [];
  t.after(() => {
    for (const alias of aliases) removeDirectoryAlias(alias);
    removeTemporaryRoot(temporaryRoot, prefix);
  });
  const aliasRoot = path.join(temporaryRoot, 'repository-alias');
  aliases.push(createDirectoryAlias(REPOSITORY_ROOT, aliasRoot));

  const installer = runNode(path.join(aliasRoot, 'scripts/install-project-skills.mjs'), ['--help']);
  assert.equal(installer.status, 0, installer.stderr);
  assert.match(installer.stdout, /--stack unity\|cocos\|phaser\|threejs\|flutter/);

  const workflow = runNode(path.join(aliasRoot, 'skills/app-workflow-control/scripts/workflow-control.mjs'), ['not-a-command']);
  assert.notEqual(workflow.stdout + workflow.stderr, '');

  const background = runNode(path.join(aliasRoot, 'skills/app-asset-workflow/scripts/remove-background-local.mjs'), ['--help']);
  assert.equal(background.status, 0, background.stderr);
  assert.match(background.stdout, /用法：node remove-background-local\.mjs/);
});
