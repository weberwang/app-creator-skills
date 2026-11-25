import { formalIntegrationFixture } from './v4-formal-integration-fixture.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateWebTextStage, webTextReadbackOptions } from '../../skills/app-workflow-control/scripts/runtime/web-text-stage.mjs';

/** 固定与当前视觉单位绑定的 V3 文字、正式入口和原生组件根。 */
function freezeTarget(freeze, target, manifest, rootComponentPath, entryPath = 'assets/scene.scene') {
  const frozen = structuredClone(manifest);
  frozen.visualStage = 'V3';
  frozen.candidateVersion = target.candidateId;
  frozen.reference_target = { original_file: target.referenceTarget.path, target_sha256: target.referenceTarget.sha256 };
  frozen.scene_reconstruction_contract.target_conditions = { scene_id: target.sceneId, state_id: target.stateId };
  frozen.formalTarget = { entryPath, rootComponentPath };
  const layoutSpecRef = freeze('v3-target.json', frozen);
  target.reviews = { ...target.reviews, V3Layout: freeze('v3-layout-review.json', { layoutSpecRef }) };
}

test('Web V4 文字试装使用资源评审冻结的实际文件', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'web-text-trial-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 写入测试产物并返回冻结身份。 */
  function freeze(path, value) {
    const bytes = JSON.stringify(value);
    writeFileSync(join(repo, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const work = { workItemType: 'SCENE', workItemId: 'work', stack: 'cocos' };
  const target = { candidateId: 'current', sceneId: 'shop', stateId: 'loaded', referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
  const scene = { scene_reconstruction_contract: { text_decomposition: { text_nodes: [{ text_node_id: 'price', layout_node_id: 'price-label' }] } } };
  freezeTarget(freeze, target, scene, 'Panel');
  const read = () => webTextReadbackOptions(repo, work, scene, target, 'V4');
  const readFinal = () => webTextReadbackOptions(repo, work, scene, target, 'V5');
  assert.throws(read, /资源评审.*缺少路径/);
  const trial = {
    schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', visualStage: 'V4', runId: 'trial-1',
    workItemId: work.workItemId, stack: work.stack, candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId,
    referenceTarget: target.referenceTarget, nodes: [{ textNodeId: 'price', layoutNodeId: 'price-label', componentPath: 'Panel/Price',
      measurement: { actual_content: '50', actual_visible: true } }],
    formalIntegration: { ...formalIntegrationFixture(repo, 'assets/scene.scene'), rootComponentPath: 'Panel' },
  };
  /** 按资源评审文档的流程冻结一个新的试装报告版本。 */
  function recordTrial(report, assets = [{ assetId: 'scene', assetType: 'native-component', output: 'assets/scene.scene' }]) {
    const ref = freeze('trial.json', report);
    target.assetReviewRef = freeze('assets.json', { schemaVersion: '1.0', visualStage: 'V4',
      workItemId: work.workItemId, stack: work.stack, candidateId: target.candidateId, assets, textRestorationRef: ref });
    return ref;
  }
  const trialRef = recordTrial(trial);
  assert.deepEqual(read().textReadbackIdentity.runtimeEvidenceRef, trialRef);
  assert.equal(readFinal().textTrialRunId, trial.runId);
  freeze('trial.json', { visualStage: 'V4', runId: 'replaced-trial' });
  assert.throws(read, /textRestorationRef.*冻结摘要不符/);
  recordTrial({ formalIntegration: trial.formalIntegration });
  assert.throws(readFinal, /试装未绑定/);
  recordTrial({ ...trial, stateId: 'wrong' });
  assert.throws(readFinal, /试装未绑定/);
  recordTrial({ ...trial, nodes: [] });
  assert.throws(readFinal, /节点范围/);
  recordTrial({ ...trial, formalIntegration: { ...trial.formalIntegration, entryRef: formalIntegrationFixture(repo, 'assets/wrong.scene').entryRef } });
  assert.throws(read, /当前视觉单位的正式源文件/);
  recordTrial({ ...trial, nodes: [{ ...trial.nodes[0], componentPath: 'Detached/Price' }] });
  assert.throws(read, /缺少本次试装的可见内容或实际组件/);
  const outputRef = freeze('shop-image.png', '当前正式图片');
  scene.assets = [{ id: 'shop-image', scene_id: target.sceneId, runtime_outputs: [outputRef.path] }];
  recordTrial(trial);
  assert.throws(read, /缺少当前领域清单图片/);
  const assets = [{ assetId: 'shop-image', assetType: 'image', output: outputRef.path }];
  const current = { ...trial, formalIntegration: { ...trial.formalIntegration, images: [{ assetId: 'shop-image', outputRef, componentPath: 'Detached/Image' }] } };
  recordTrial(current, assets);
  assert.throws(read, /图片消费者未绑定 V3 冻结的正式目标根/);
  current.formalIntegration.images[0].componentPath = 'Panel/Image';
  const currentRef = recordTrial(current, assets);
  assert.deepEqual(read().textReadbackIdentity.runtimeEvidenceRef, currentRef);
  assert.throws(() => webTextReadbackOptions(repo, work, {}, target, 'V4'), /缺少 V3 目标或当前交接/);
  assert.equal(webTextReadbackOptions(repo, work, {}, { ...target, reviews: {} }, 'V4').requireNativeTextReadback, false);
});

test('Web V5 文字使用 V3 冻结目标，实际读数不能重定义预期样式', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'web-text-stage-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const target = { sceneId: 'shop', stateId: 'loaded', candidateId: 'current', referenceTarget: { path: 'target.png', sha256: '0'.repeat(64) } };
  const design = {
    visualStage: 'V3', candidateVersion: target.candidateId,
    formalTarget: { entryPath: 'assets/scene.scene', rootComponentPath: 'Canvas' },
    reference_target: { original_file: target.referenceTarget.path, target_sha256: target.referenceTarget.sha256 },
    scene_reconstruction_contract: {
      target_conditions: { scene_id: target.sceneId, state_id: target.stateId },
      text_decomposition: { text_nodes: [{ text_node_id: 'timer', typography_target: { font_size: 24, fill: '#FFFFFFFF' } }] },
    },
  };
  const bytes = JSON.stringify(design);
  writeFileSync(join(repo, 'v3.json'), bytes);
  writeFileSync(join(repo, 'review.json'), JSON.stringify({ layoutSpecRef: { path: 'v3.json', sha256: createHash('sha256').update(bytes).digest('hex') } }));
  const current = structuredClone(design);
  current.visualStage = 'V5';
  const nodes = current.scene_reconstruction_contract.text_decomposition.text_nodes;
  nodes[0].runtime_verification = { actual_typography: { font_size: 24, fill: '#FFFFFFFF' } };
  nodes[0].required_resources = [{ path: 'fonts/current.fnt' }];
  assert.doesNotThrow(() => validateWebTextStage(repo, current, { path: 'review.json' }, target));
  nodes[0].typography_target.font_size = 16;
  nodes[0].runtime_verification.actual_typography.font_size = 16;
  assert.throws(() => validateWebTextStage(repo, current, { path: 'review.json' }, target), /timer.*typography_target.*偏离/);
  nodes.pop();
  assert.throws(() => validateWebTextStage(repo, current, { path: 'review.json' }, target), /timer.*缺少/);
  assert.doesNotThrow(() => validateWebTextStage(repo, current, undefined, target));
});

test('Cocos 文字决议必须绑定已确认截图、资源评审及同批原生试装', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'approved-text-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 固定测试文件的真实路径和摘要。 */
  function freeze(path, value) {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    writeFileSync(join(repo, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const screenshot = freeze('screen.png', '实际截图');
  const referenceTarget = freeze('target.png', '参考图');
  const work = { workItemType: 'SCENE', workItemId: 'work', stack: 'cocos' };
  const target = { targetId: 'view', candidateId: 'candidate', sceneId: 'scene', stateId: 'ready', referenceTarget };
  const review = { schemaVersion: '1.0', workItemId: 'work', objectId: 'scene', targetId: 'view', candidateId: 'candidate', stage: 'V4',
    purpose: 'imported-assets', decision: 'APPROVED', userMessageRef: 'chat:1/message:2', referenceTarget,
    targetRef: screenshot.path, targetSha256: screenshot.sha256 };
  target.reviews = { V4: freeze('review.json', review) };
  const contentSource = { key: 'price' };
  const contentCases = [{ case_id: 'price', locale: 'zh-CN', inputs: { value: 10 }, expected_content: '10', content_source: contentSource }];
  const scene = { scene_reconstruction_contract: { text_decomposition: { text_nodes: [{ text_node_id: 'price', layout_node_id: 'label', planned_test_id: 'test-price', content_cases: contentCases }] } } };
  freezeTarget(freeze, target, scene, 'Canvas');
  const fontResources = [freeze('font.fnt', '字体'), freeze('font.png', '图集')];
  scene.scene_reconstruction_contract.text_decomposition.text_nodes[0].required_resources = fontResources.map(({ path }) => ({ path }));
  const style = { fontFamily: 'Noto Sans SC SemiBold', renderedFontSize: 20, fontSizeUnit: 'logical-px', lineHeight: 24, letterSpacing: 0,
    fill: '#ffffffff', wrap: false, lineCount: 1, isBold: false, isItalic: false, outlineEnabled: false, shadowEnabled: false, horizontalAlign: 1, verticalAlign: 1 };
  const actualStyle = { font_family: style.fontFamily, font_size: 20, font_size_unit: 'logical-px', font_weight: 'semibold', font_style: 'normal',
    line_height: 24, letter_spacing: 0, alignment: { horizontal: 'center', vertical: 'center' }, fill: style.fill, stroke: 'none', shadow: 'none', wrap: false, line_count: 1 };
  const measurement = { actual_content: '10', actual_visible: true, font_loaded: true, fallback_detected: false,
    renderer: 'bitmap-text', actual_geometry_unit: 'logical-px', actual_coordinate_space: 'viewport-logical', actual_test_id: 'test-price',
    actual_font_resources: fontResources.map((ref) => ref.path), actual_typography: actualStyle,
    actual_bounds: { x: 1 }, glyph_bounds: { x: 2 }, baseline: { y: 3 },
    actual_locale: 'zh-CN', actual_inputs: { value: 10 }, actual_content_source: contentSource, content_case_id: 'price' };
  const formalIntegration = { ...formalIntegrationFixture(repo, 'assets/scene.scene'), rootComponentPath: 'Canvas' };
  const raw = { schemaVersion: 'cocos-native-text-trial/1.0', measurementSource: 'runtime-component', runId: 'run', formalIntegration,
    workItemId: 'work', sceneId: 'scene', stateId: 'ready', candidateId: 'candidate', referenceTarget, font: fontResources[0], fontTexture: fontResources[1],
    labels: { screenshot, results: [{ textNodeId: 'price', measurements: [{ caseId: 'price', content: '10', locale: 'zh-CN', inputs: { value: 10 },
      fixtureContentSource: contentSource, actualBounds: measurement.actual_bounds, glyphBounds: measurement.glyph_bounds, baseline: measurement.baseline,
      fontLoaded: true, fallbackDetected: false, visible: true, actualTypography: style }] }] } };
  const report = { schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', visualStage: 'V4', runId: 'run',
    workItemId: 'work', stack: 'cocos', sceneId: 'scene', stateId: 'ready', candidateId: 'candidate', referenceTarget,
    acceptedScreenshot: screenshot, rawReadback: freeze('raw.json', raw), fontResources,
    formalIntegration,
    nodes: [{ textNodeId: 'price', layoutNodeId: 'label', componentPath: 'Canvas/Price', measurement, cases: [measurement] }] };
  const reportRef = freeze('report.json', report);
  const ruleApprovalRef = freeze('rule.json', { schemaVersion: '1.0', workItemId: 'work', candidateId: 'candidate',
    scope: 'verify-cocos-v4-original-prompts-and-approved-trial', decision: 'APPROVED',
    reviewRef: target.reviews.V4, userMessageRef: 'chat:1/message:rules' });
  const acceptance = { schemaVersion: 'cocos-text-acceptance/1.0', workItemId: 'work', sceneId: 'scene', stateId: 'ready', candidateId: 'candidate',
    referenceTarget, userMessageRef: review.userMessageRef, reviewRef: target.reviews.V4, textRestorationRef: reportRef, acceptedScreenshot: screenshot,
    ruleApprovalRef };
  const decisionRef = freeze('decision.json', acceptance);
  const asset = { schemaVersion: '1.0', visualStage: 'V4', workItemId: 'work', stack: 'cocos', candidateId: 'candidate',
    userMessageRef: review.userMessageRef, assets: [{ assetId: 'scene', assetType: 'native-component', output: 'assets/scene.scene' }], textRestorationRef: reportRef, textAcceptanceRef: decisionRef };
  target.assetReviewRef = freeze('asset.json', asset);
  const options = () => webTextReadbackOptions(repo, work, scene, target, 'V4');
  assert.equal(options().approvedTextTrial.get('price').cases[0].actual_content, '10');
  delete acceptance.ruleApprovalRef;
  asset.textAcceptanceRef = freeze('decision.json', acceptance);
  target.assetReviewRef = freeze('asset.json', asset);
  assert.throws(options, /用户规则调整授权/);
  acceptance.ruleApprovalRef = ruleApprovalRef;
  const other = freeze('other.png', '另一张截图');
  acceptance.acceptedScreenshot = other;
  asset.textAcceptanceRef = freeze('decision.json', acceptance);
  target.assetReviewRef = freeze('asset.json', asset);
  assert.throws(options, /截图/);
  acceptance.acceptedScreenshot = screenshot;
  asset.textAcceptanceRef = freeze('decision.json', acceptance);
  target.assetReviewRef = freeze('asset.json', asset);
  work.invalidatedRefs = [target.reviews.V4];
  assert.throws(options, /已作废/);
  delete work.invalidatedRefs;
  report.nodes[0].cases[0].font_loaded = false;
  acceptance.textRestorationRef = freeze('report.json', report);
  asset.textRestorationRef = acceptance.textRestorationRef;
  asset.textAcceptanceRef = freeze('decision.json', acceptance);
  target.assetReviewRef = freeze('asset.json', asset);
  assert.throws(options, /未绑定原始读数/);
});
