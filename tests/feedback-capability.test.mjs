/** 验证游戏与应用使用同一反馈入口，以及新增原生规范的诚实来源和实际安装闭包。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { CAPABILITY_GROUPS, capabilityAdapters, capabilityForSourceSkill, extractNativeSection, nativeContractPath } from '../scripts/capability-map.mjs';
import { installSkills, SOURCE_ROOT } from '../scripts/install-project-skills.mjs';

/** 新增规范不能伪装成从Flutter源仓库迁入，也不能替代四个游戏原生规范。 */
test('公共反馈覆盖五栈并区分继承规范与仓库新增规范', () => {
  const group = CAPABILITY_GROUPS.find((item) => item.name === 'app-feedback');
  const adapters = capabilityAdapters(group);
  assert.deepEqual(adapters.map((item) => item.stack), ['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
  assert.equal(adapters.filter((item) => !item.reused && !item.authored).length, 4);
  const flutter = adapters.find((item) => item.stack === 'flutter');
  assert.equal(flutter.authored, true);
  assert.equal(capabilityForSourceSkill('flutter', 'flutter-feedback'), null);
  const catalog = JSON.parse(readFileSync(join(SOURCE_ROOT, 'migration/catalog.json'), 'utf8'));
  assert.equal(catalog.stacks.flutter.sourceSkillCount, 14);
  assert.equal(catalog.stacks.flutter.nativeAdapters.length, 12);
  assert.ok(catalog.stacks.flutter.nativeAdapters.every((item) => item.sourceSkill !== 'flutter-feedback'));
  assert.deepEqual(catalog.stacks.flutter.authoredAdapters.map((item) => item.sourceSkill), ['flutter-feedback', 'flutter-artifact-cleanup']);
  const record = catalog.generatedFiles.find((item) => item.kind === 'native-manual' && item.stack === 'flutter');
  const section = record?.sections.find((item) => item.sourceSkill === flutter.sourceSkill);
  assert.equal(record?.path, nativeContractPath('flutter'));
  assert.equal(section?.origin, 'repository-authored');
  assert.equal(section?.template, 'scripts/migration/templates/flutter-feedback.source');
  const body = extractNativeSection(readFileSync(join(SOURCE_ROOT, record.path), 'utf8'), flutter.sourceSkill);
  assert.equal(section?.sourceSha256, createHash('sha256').update(readFileSync(join(SOURCE_ROOT, section.template))).digest('hex'));
  assert.equal(section?.sha256, createHash('sha256').update(body).digest('hex'));
});

/** 单独安装Flutter时必须获得公共设计、原生适配和可运行工作流校验器，不产生新别名入口。 */
test('Flutter 单栈实际安装即可读取共用汁水设计与原生规范', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'shared-feedback-flutter-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const installed = installSkills({ projectRoot: project, stacks: ['flutter'] });
  const root = join(project, '.agents/skills');
  assert.ok(existsSync(join(root, 'app-feedback/SKILL.md')));
  assert.ok(existsSync(join(root, 'app-feedback/references/interaction-feedback.md')));
  const manual = join(root, 'app-stack-flutter/references/native-contracts.md');
  assert.ok(existsSync(manual));
  assert.ok(extractNativeSection(readFileSync(manual, 'utf8'), 'flutter-feedback').trim());
  assert.equal(existsSync(join(root, 'flutter-feedback/SKILL.md')), false);
  assert.equal(existsSync(join(root, 'flutter-feedback/ADAPTER.md')), false);
  assert.equal(existsSync(join(root, 'unity-game-juice')), false);
  const manifest = JSON.parse(readFileSync(join(root, 'app-feedback/native-adapters.json'), 'utf8'));
  assert.equal(manifest.adapters.flutter[0].authored, true);
  assert.equal(manifest.adapters.flutter[0].section, 'mode-flutter-feedback');
  assert.equal(resolve(join(root, 'app-feedback'), manifest.adapters.flutter[0].path), manual);
  const check = spawnSync(process.execPath, [join(root, 'flutter-domain-contracts/tools/scripts/validate-workflow.js')], {
    encoding: 'utf8', timeout: 30000, windowsHide: true, env: { ...process.env, NODE_PATH: '' },
  });
  assert.equal(check.error, undefined);
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const report = JSON.parse(check.stdout);
  assert.equal(report.ok, true, JSON.stringify(report.errors));
  assert.equal(report.checks.skills, installed.entries.filter((item) => item.kind === 'skill').length + 1);
});
