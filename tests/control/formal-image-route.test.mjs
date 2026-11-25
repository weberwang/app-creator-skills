import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { initializeWork } from '../../skills/app-workflow-control/scripts/runtime/work-initialization.mjs';
import { validateDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/domain-target-check.mjs';
import { assertFormalImageManifestRoute, assertFormalImageReviewRoute } from '../../skills/app-workflow-control/scripts/runtime/formal-image-route.mjs';
import { minimalPng, validAiManifest } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';

/** 通过正式初始化入口建立带冻结路线的隔离项目。 */
async function fixture(t, method) {
  const repo = mkdtempSync(join(tmpdir(), 'formal-image-route-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const result = await initializeWork({ repo, args: {
    id: 'scene', stack: 'cocos', type: 'SCENE', objective: '验证正式单图路线',
    'design-route': 'game-ui', 'design-image-method': 'prompt-handoff', 'formal-image-method': method,
  } });
  return { repo, work: JSON.parse(readFileSync(join(repo, result.metadata.workItemPath), 'utf8')) };
}

/** 建立组件级计划，同时模拟素材评审会读取的同一资源身份。 */
function manifest(method, { origin = 'generated', svg = false, route } = {}) {
  const expected = { asset_id: 'icon', source_file: 'art/icon.png', runtime_file: 'assets/icon.png' };
  if (svg) expected.svg_source_file = 'art/icon.svg';
  const image = method === 'image-generation';
  const production = { production_origin: 'independent-production', production_method: method,
    delivery_kind: 'raster-image', image_generation_required: image, expected_assets: [expected] };
  return {
    coverage_audit: { regions: [{ id: 'region', owner_type: 'fixed-production-visual', ...production }] },
    assets: [{ id: 'icon', origin, route, source_file: expected.source_file, output_file: expected.runtime_file, ...production }],
  };
}

test('初始化冻结 SVG 后 V3 到 V5 拒绝直接生图和缺少 SVG 来源的独立单图', async (t) => {
  const { repo, work } = await fixture(t, 'svg-to-png');
  const direct = manifest('image-generation');
  for (const stage of ['V3', 'V4', 'V5']) {
    assert.throws(() => assertFormalImageManifestRoute(repo, work, direct, stage), /冻结 SVG 转 PNG/);
    assert.throws(() => assertFormalImageManifestRoute(repo, work, manifest('authored-raster'), stage), /缺少.*svg_source_file/);
    assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, manifest('authored-raster', { svg: true }), stage));
  }
  assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, direct, 'V2'));
});

test('直接生图路线拒绝 SVG，评审中的明确 SVG 源同样受约束', async (t) => {
  const { repo, work } = await fixture(t, 'direct-image-generation');
  assert.throws(() => assertFormalImageManifestRoute(repo, work, manifest('authored-raster', { svg: true }), 'V3'), /冻结直接生图/);
  assert.throws(() => assertFormalImageManifestRoute(repo, work, manifest('authored-raster'), 'V3'), /冻结直接生图/);
  assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, manifest('image-generation'), 'V4'));
  const asset = { assetId: 'icon', assetType: 'image', sourceKind: 'hand-authored', sourceRef: 'art/icon.svg' };
  assert.throws(() => assertFormalImageReviewRoute(repo, work, asset), /冻结直接生图/);
  assert.doesNotThrow(() => assertFormalImageReviewRoute(repo, work, { ...asset, sourceKind: 'existing' }));
});

test('复用、提供资源、帧动画和文字资源沿原有专用合同', async (t) => {
  const { repo, work } = await fixture(t, 'svg-to-png');
  for (const options of [{ origin: 'provided' }, { origin: 'existing' }, { route: 'frame-animation' }]) {
    assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, manifest('image-generation', options), 'V4'));
  }
  const reused = manifest('image-generation');
  reused.coverage_audit.regions[0].implementation_plan = { mode: 'reuse-existing' };
  reused.assets[0].origin = 'existing';
  assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, reused, 'V4'));
  const text = manifest('image-generation');
  text.scene_reconstruction_contract = { text_decomposition: { text_nodes: [{ required_resources: [{ kind: 'image', path: 'assets/icon.png' }] }] } };
  assert.doesNotThrow(() => assertFormalImageManifestRoute(repo, work, text, 'V4'));
});

test('控制器在使用时复核冻结策略摘要', async (t) => {
  const { repo, work } = await fixture(t, 'svg-to-png');
  work.imageRoutesRef.sha256 = '0'.repeat(64);
  assert.throws(() => assertFormalImageManifestRoute(repo, work, manifest('image-generation'), 'V4'), /图片路线/);
});

test('Cocos 场景的 V3 领域入口拒绝偏离冻结路线的正式单图计划', async (t) => {
  const { repo, work } = await fixture(t, 'svg-to-png');
  const draft = validAiManifest();
  draft.workItemId = work.workItemId;
  draft.visualStage = 'V3';
  const conditions = draft.scene_reconstruction_contract.target_conditions;
  const original = draft.reference_target.original_file;
  const image = minimalPng(conditions.viewport.width, conditions.viewport.height);
  const referenceTarget = { path: original, sha256: createHash('sha256').update(image).digest('hex') };
  // 只生成文件身份一致的测试原图；路线冲突应在后续导入或文件检查前报告。
  mkdirSync(dirname(join(repo, original)), { recursive: true });
  writeFileSync(join(repo, original), image);
  const domainEvidenceRef = { path: 'visual-assets.json' };
  writeFileSync(join(repo, domainEvidenceRef.path), JSON.stringify(draft));
  const target = { targetId: 'scene-view', candidateId: draft.candidateVersion, sceneId: conditions.scene_id,
    stateId: conditions.state_id, viewport: conditions.viewport, referenceTarget, domainEvidenceRef };
  assert.throws(() => validateDomainTarget(repo, work, target, 'V3'), /冻结 SVG 转 PNG/);
});
