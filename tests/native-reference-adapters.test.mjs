/** 核对原生参考纠错只覆盖经审阅的来源，不能改变其他技术栈。 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { adaptNativeReference } from '../scripts/migration/native-reference-adapters.mjs';
import { adaptNativeFunctionFirst, renderNativeManual } from '../scripts/migration/native-manual-renderer.mjs';

const SOURCE = resolve(import.meta.dirname, '../../threejs-skills/skills/threejs-game-juice/references/design-guide.md');
const OPTIONS = { stack: 'threejs', sourcePath: 'skills/threejs-game-juice/references/design-guide.md' };

test('原生手册与验证命令直接使用统一阶段并允许功能先行', () => {
  const source = 'V2 前的灰盒或视觉样片必须与正式运行链隔离，不得注册正式入口或实现正式业务逻辑；\nnode validate_visual_manifest.mjs --stage V4';
  const adapted = adaptNativeFunctionFirst(source, { stack: 'threejs' });
  const manual = renderNativeManual({ stack: 'threejs', capabilityGroups: [], sections: [] });
  assert.match(adapted, /V1 可按已授权范围实现并验证正式功能，白盒按需使用/);
  assert.match(adapted, /--stage V5/);
  assert.match(manual, /各技术栈统一使用 V0–V5/);
  assert.doesNotMatch(manual, /原生视觉 V1\/V2\/V3\/V4/);
});

test('Unity 场景的草图或灰盒按需提供，同时保留实际结构记录', () => {
  const source = '提交草图/灰盒和 Scene/Prefab/UXML 结构，覆盖稳定节点。';
  const adapted = adaptNativeFunctionFirst(source, { stack: 'unity' });
  assert.match(adapted, /按需提交草图或灰盒/);
  assert.match(adapted, /记录 Scene\/Prefab\/UXML 结构/);
});

test('Three.js 音频采用真实对象接口并保留共享声音所有权', (t) => {
  if (!existsSync(SOURCE)) return t.skip('需要只读 Three.js 源仓库');
  const original = readFileSync(SOURCE, 'utf8');
  const corrected = adaptNativeReference(original, OPTIONS);
  assert.doesNotMatch(corrected, /Sound Manager 属于 Game|threejsjs|docs\.threejs\.io/);
  assert.match(corrected, /THREE\.AudioListener/);
  assert.match(corrected, /共享监听器和音频上下文由其所有者管理/);
  assert.equal(adaptNativeReference(original, { ...OPTIONS, stack: 'phaser' }), original);
  assert.equal(adaptNativeReference(original, { ...OPTIONS, sourcePath: 'skills/threejs-game-audio/SKILL.md' }), original);
  assert.throws(() => adaptNativeReference(original.replace('Sound Manager 属于 Game', '上游规则已变化'), OPTIONS), /须重新审查/);
});
