/** 验证 ESP32 能在独立安装后加载自身原生规范，且不会连带安装其他技术栈。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';

test('ESP32 独立安装提供全部原生路由并排除其他栈', async (t) => {
  const project = mkdtempSync(join(tmpdir(), 'app-creator-esp32-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const preview = installSkills({ projectRoot: project, stacks: ['esp32'], dryRun: true });
  assert.equal(preview.changed, false);
  assert.equal(existsSync(join(project, '.agents')), false);

  installSkills({ projectRoot: project, stacks: ['esp32'] });
  const skills = join(project, '.agents', 'skills');
  const profile = JSON.parse(readFileSync(join(skills, 'app-stack-esp32', 'profile.json'), 'utf8'));
  assert.equal(profile.id, 'esp32');
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'flutter']) {
    assert.equal(existsSync(join(skills, `app-stack-${stack}`)), false);
  }
  assert.ok(Array.isArray(profile.nativeAdapters) && profile.nativeAdapters.length > 0);
  // 从实际安装目录加载读取器，逐项覆盖路由、原生章节及直接引用资料。
  const { loadNativeMode } = await import(pathToFileURL(join(skills, 'app-skill-runtime', 'read-native-mode.mjs')).href);
  for (const route of profile.nativeAdapters) {
    const result = loadNativeMode({ stack: 'esp32', capability: route.capability, sourceSkill: route.sourceSkill, skillsRoot: skills });
    assert.equal(result.stack, 'esp32');
    assert.equal(result.sourceSkill, route.sourceSkill);
    const native = result.documents.filter((document) => document.kind === 'native');
    assert.equal(native.length, 1, route.sourceSkill);
    assert.equal(native[0].path, 'app-stack-esp32/references/native-contracts.md');
    assert.equal(native[0].section, route.section);
    assert.ok(native[0].content.trim(), route.sourceSkill);
    for (const document of result.documents) {
      assert.doesNotMatch(document.path, /^app-stack-(unity|cocos|phaser|threejs|flutter)\//);
    }
  }
});
