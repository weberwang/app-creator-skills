/** 验证 Expo 单栈安装及其原生能力路由，不调用网络或启动应用。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { parseNpxArgs } from '../packages/cli/cli.mjs';

/** 只移除本用例在系统临时目录独占创建的目标。 */
function createProject(t) {
  const temporaryRoot = realpathSync(tmpdir());
  const project = mkdtempSync(join(temporaryRoot, 'app-creator-expo-'));
  t.after(() => {
    assert.equal(dirname(project), temporaryRoot);
    assert.ok(basename(project).startsWith('app-creator-expo-'));
    rmSync(project, { recursive: true, force: true });
  });
  return project;
}

test('Expo 预览、独立安装、重复安装和混合安装保持边界', async (t) => {
  const project = createProject(t);
  const preview = installSkills({ projectRoot: project, stacks: ['expo'], dryRun: true });
  assert.equal(preview.changed, false);
  assert.equal(existsSync(join(project, '.agents')), false);
  assert.equal(existsSync(join(project, '.gitignore')), false);
  assert.equal(installSkills({ projectRoot: project, stacks: ['expo'] }).changed, true);
  const skills = join(project, '.agents', 'skills');
  const profile = JSON.parse(readFileSync(join(skills, 'app-stack-expo', 'profile.json'), 'utf8'));
  assert.equal(profile.id, 'expo');
  assert.equal(profile.nativeAdapters.length, 11);
  assert.ok(existsSync(join(skills, 'expo-domain-contracts')));
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'flutter', 'esp32', 'nodejs']) {
    assert.equal(existsSync(join(skills, `app-stack-${stack}`)), false, stack);
  }
  const { loadNativeMode } = await import(pathToFileURL(join(skills, 'app-skill-runtime', 'read-native-mode.mjs')).href);
  // 通过安装后的读取器逐项读取完整直接依赖，防止清单存在但缺少正文或跨栈引用。
  for (const route of profile.nativeAdapters) {
    const result = loadNativeMode({ stack: 'expo', capability: route.capability, sourceSkill: route.sourceSkill, skillsRoot: skills });
    assert.equal(result.stack, 'expo');
    assert.equal(result.documents.find((document) => document.kind === 'native')?.section, route.section);
    assert.ok(result.documents.every((document) => !/^app-stack-(unity|cocos|phaser|threejs|flutter|esp32|nodejs)\//.test(document.path)));
  }
  assert.equal(installSkills({ projectRoot: project, stacks: ['expo'] }).changed, false);
  assert.equal(installSkills({ projectRoot: project, stacks: ['nodejs'] }).changed, true);
  assert.ok(existsSync(join(skills, 'app-stack-expo', 'SKILL.md')));
  assert.ok(existsSync(join(skills, 'app-stack-nodejs', 'SKILL.md')));
  assert.equal(existsSync(join(skills, 'app-stack-flutter')), false);
});

test('npx 支持 Expo 显式选择及全部技术栈', () => {
  const options = { config: { repository: 'fixture/repo', ref: '' }, env: {} };
  assert.deepEqual(parseNpxArgs(['expo'], options).stacks, ['expo']);
  assert.deepEqual(parseNpxArgs(['--stack', 'expo,nodejs'], options).stacks, ['expo', 'nodejs']);
  assert.ok(parseNpxArgs(['all'], options).stacks.includes('expo'));
});
