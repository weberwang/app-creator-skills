/** 验证用户从真实命令行选择技术栈，防止默认全装或追加栈覆盖公共内容。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALLER = join(ROOT, 'packages/installer/install-project-skills.mjs');
const STACKS = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];

/** 仅在独占临时项目中运行一次性 CLI，不启动开发服务或接触真实用户项目。 */
function invoke(t, args, project) {
  const target = project ?? mkdtempSync(join(tmpdir(), 'app-creator-cli-'));
  if (!project) t.after(() => rmSync(target, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [INSTALLER, target, ...args], {
    encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(result.error, undefined, result.error?.message);
  return { ...result, project: target };
}

/** 未选择时只报告错误，不能把缺省值解释为所有技术栈。 */
test('CLI 必须明确选择技术栈且无效选择不会写入项目', (t) => {
  for (const args of [[], ['--stack', ''], ['--stack', 'unknown']]) {
    const result = invoke(t, args);
    assert.equal(result.status, 1);
    assert.equal(existsSync(join(result.project, '.agents')), false);
  }
});

/** 每个单栈与组合选择均通过实际输出证明安装边界，预览不写目标目录。 */
test('CLI 支持五个单栈、多栈组合以及显式 all', (t) => {
  for (const choice of [...STACKS, 'unity,cocos', 'all']) {
    const result = invoke(t, ['--stack', choice, '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const selected = choice === 'all' ? STACKS : choice.split(',');
    assert.deepEqual(report.skills.filter((name) => name.startsWith('app-stack-')).sort(), selected.map((name) => `app-stack-${name}`).sort());
    assert.equal(report.changed, false);
    assert.equal(existsSync(join(result.project, '.agents')), false);
  }
});

/** 重复安装和追加栈沿用内容判定，用户可以从 CLI 观察实际跳过与新增结果。 */
test('CLI 可先装 Flutter 再追加 Unity，同版本重复执行无变更', (t) => {
  const first = invoke(t, ['--stack', 'flutter']);
  assert.equal(first.status, 0, first.stderr);
  const repeated = invoke(t, ['--stack', 'flutter'], first.project);
  assert.equal(repeated.status, 0, repeated.stderr);
  const repeatedReport = JSON.parse(repeated.stdout);
  assert.equal(repeatedReport.changed, false);
  assert.deepEqual(repeatedReport.installed, []);
  assert.ok(repeatedReport.skipped.includes('grilling'));
  const appended = invoke(t, ['--stack', 'unity'], first.project);
  assert.equal(appended.status, 0, appended.stderr);
  const appendedReport = JSON.parse(appended.stdout);
  assert.ok(appendedReport.installed.includes('app-stack-unity'));
  assert.ok(appendedReport.skipped.includes('grilling'));
  assert.ok(existsSync(join(first.project, '.agents/skills/app-stack-flutter/SKILL.md')));
  assert.ok(existsSync(join(first.project, '.agents/skills/app-stack-unity/SKILL.md')));
});

/** 远程分支同样先校验选择，参数错误不能提前访问网络或创建项目安装目录。 */
test('远程 CLI 和独立启动器拒绝缺少或无效的技术栈', (t) => {
  for (const entry of [INSTALLER, join(ROOT, 'install.mjs')]) {
    const project = mkdtempSync(join(tmpdir(), 'app-creator-remote-cli-'));
    t.after(() => rmSync(project, { recursive: true, force: true }));
    for (const choice of [[], ['--stack', 'unknown']]) {
      const result = spawnSync(process.execPath, [entry, project, '--repo', 'example/app-creator-skills', ...choice], {
        encoding: 'utf8', timeout: 10000, windowsHide: true,
      });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 1);
      const report = JSON.parse(result.stderr);
      assert.match(report.error, /stack|技术栈/);
      assert.equal(existsSync(join(project, '.agents')), false);
    }
  }
});

/** 帮助命令无需仓库、技术栈或网络，允许先了解独立安装器用法。 */
test('独立远程启动器可离线显示帮助', () => {
  const result = spawnSync(process.execPath, [join(ROOT, 'install.mjs'), '--help'], {
    encoding: 'utf8', timeout: 10000, windowsHide: true,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--stack/);
  assert.match(result.stdout, /--repo/);
});
