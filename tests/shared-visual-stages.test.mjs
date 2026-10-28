import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDisplayLayerPlanning } from '../skills/app-domain-toolkit/scripts/visual/display-layer-planning-contract.mjs';
import { requiresVisualFileGate } from '../skills/app-domain-toolkit/scripts/visual/visual-file-gate.mjs';
import { earliestVisualReturnStage } from '../skills/app-domain-toolkit/scripts/visual/visual-human-review-contract.mjs';

test('资源和运行文件门只在统一 V4、V5 启用', () => {
  const manifest = { effect_image_reconstruction: { applicability: 'effect-image' } };
  assert.equal(requiresVisualFileGate(manifest, 'V3'), false);
  assert.equal(requiresVisualFileGate(manifest, 'V4'), true);
  assert.equal(requiresVisualFileGate(manifest, 'V5'), true);
});

test('显示层只在 V5 要求打开到恢复的运行轨迹', () => {
  const sceneMaster = { scene_id: 'scene', state_id: 'default', origin: 'provided', viewport: { width: 100, height: 100 }, persistent_layer_ids: [] };
  const layer = { layer_id: 'dialog', type: 'modal', host_scene_id: 'scene', persistence: 'transient', states: [{ state_id: 'open', required: false }], in_scene_master: false, trigger: 'open', dismiss: 'close', input_blocking: 'block', z_order: 1, backdrop: 'shade', focus_restore: 'restore', responsive: 'reflow', relations: { mutually_exclusive_layer_ids: [], coexists_with_layer_ids: [] } };
  const planning = { version: '1.0', scene_master: sceneMaster, inventory: [layer] };
  const target = { sceneId: 'scene', stateId: 'default', viewport: sceneMaster.viewport };
  assert(!validateDisplayLayerPlanning(planning, target, { stage: 'V4' }).some((error) => error.includes('runtime_replay')));
  assert(validateDisplayLayerPlanning(planning, target, { stage: 'V5' }).some((error) => error.includes('runtime_replay')));
});

test('视觉错误回退使用统一阶段', () => {
  assert.equal(earliestVisualReturnStage('V3'), 'V2/PROPOSAL');
  assert.equal(earliestVisualReturnStage('V4'), 'V3/V4');
});

test('三栈项目模板先验证功能并声明完整 V0–V5', async () => {
  for (const stack of ['cocos', 'phaser4', 'threejs']) {
    const templates = await import(`../skills/${stack}-game-orchestrator/scripts/project_doc_templates.mjs`);
    const design = templates.CORE_TEMPLATES['visual-design.md'];
    const tdd = templates.CORE_TEMPLATES['TDD.md'];
    const assets = templates.OPTIONAL_TEMPLATES.assets['asset-license-register.md'];
    assert.match(design, /V1 实现并验证相关功能（白盒按需使用）→ V2/);
    assert.match(tdd, /当前功能切片可直接实现或按需使用白盒，在 V1 验证相关行为后/);
    assert.doesNotMatch(tdd, /不得注册正式入口或实现正式场景功能/);
    assert.match(assets, /V0→V1→V2→V3→V4→V5/);
    const manifest = JSON.parse(templates.OPTIONAL_TEMPLATES.assets['visual-assets.json']);
    assert.deepEqual(Object.keys(manifest.visualStageEvidenceRefs).sort(), ['V3', 'V4', 'V5']);
  }
});
