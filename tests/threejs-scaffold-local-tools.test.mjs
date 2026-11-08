import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { createGame } from '../skills/threejs-game-runtime/scripts/create-game.mjs';

/** 每个用例拥有独立临时项目，仅清理本次创建且仍位于系统临时目录内的路径。 */
function project(t) {
  const root = mkdtempSync(join(tmpdir(), 'threejs-local-tools-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'threejs-local-tools-')));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

/** 已安装的技能、Git 元数据和忽略文件不得阻断脚手架，也不得被覆盖。 */
test('Three.js 脚手架保留本地技能及 Git 元数据', (t) => {
  const root = project(t);
  mkdirSync(join(root, '.agents/skills/local'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/local/SKILL.md'), '本地规则');
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, '.git/config'), '已有 Git 配置');
  const ignore = 'node_modules/\r\n/.agents/\r\n';
  writeFileSync(join(root, '.gitignore'), ignore);
  assert.equal(createGame(root), root);
  assert.equal(readFileSync(join(root, '.agents/skills/local/SKILL.md'), 'utf8'), '本地规则');
  assert.equal(readFileSync(join(root, '.git/config'), 'utf8'), '已有 Git 配置');
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), ignore);
  assert.ok(existsSync(join(root, 'package.json')));
  assert.ok(existsSync(join(root, 'src/game-runtime.mjs')));
});

/** 根级工具目录可存在，但任何真实业务内容仍阻止覆盖。 */
test('Three.js 脚手架拒绝覆盖已有业务文件', (t) => {
  const root = project(t);
  mkdirSync(join(root, '.agents'));
  writeFileSync(join(root, 'index.html'), '用户已有页面');
  assert.throws(() => createGame(root), /目标目录必须为空/);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), '用户已有页面');
  assert.equal(existsSync(join(root, 'package.json')), false);
});

/** 只有本地技能或完全空白时均可创建；异常元数据不能绕过入口检查。 */
test('Three.js 脚手架支持仅有技能的目录并拒绝异常忽略文件', (t) => {
  const root = project(t);
  mkdirSync(join(root, '.agents'));
  createGame(root);
  const invalid = project(t);
  mkdirSync(join(invalid, '.gitignore'));
  assert.throws(() => createGame(invalid), /本地元数据/);
  assert.equal(existsSync(join(invalid, 'package.json')), false);
});
