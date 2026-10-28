import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateSingleDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/single-domain-check.mjs';
import { initializeWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validManifest as cocosManifest, minimalPng as cocosPng, createFixtureFiles as createCocosFiles, writeConfirmationFixtureFiles as writeCocosConfirmations } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { validManifest as phaserManifest, minimalPng as phaserPng } from '../../skills/phaser4-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { validManifest as threeManifest, minimalPng as threePng } from '../../skills/threejs-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { fixtureLayoutDocument } from '../../skills/cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs';
import { loadVisualConfirmationAuthority } from '../../skills/cocos-domain-contracts/scripts/visual-confirmation-authority.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

/** 为每次校验写入真实隔离文件并返回其内容身份。 */
function write(repo, path, contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(typeof contents === 'string' ? contents : JSON.stringify(contents));
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 构造只覆盖单对象领域输入的临时项目；文件不代表用户真实验收。 */
function fixture(t, { stack = 'flutter', type = 'PAGE', stage = 'V2' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'single-domain-test-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const referenceTarget = write(repo, 'target.txt', '测试目标内容');
  write(repo, 'v2-review.json', { referenceTarget });
  const visual = { objectId: 'example-page', candidateId: 'candidate-a', stage, reviews: { V2: { path: 'v2-review.json' } } };
  if (type === 'DISPLAY_LAYER') Object.assign(visual, { objectId: 'dialog', hostId: 'host', layerType: 'modal' });
  const work = { workItemId: 'work-a', projectId: 'project-a', stack, workItemType: type, visual };
  const doc = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack, workItemType: type, visualStageModel: 'function-first-v1', visualStage: stage, objectId: visual.objectId, candidateId: visual.candidateId, referenceTarget };
  if (type === 'DISPLAY_LAYER') Object.assign(doc, { hostId: visual.hostId, layerType: visual.layerType });
  return { repo, work, doc, referenceTarget, save() { work.visual.domainEvidenceRef = write(repo, 'domain.json', doc); } };
}

/** 使用项目提供的真实布局模板，避免仅断言外层字段。 */
function addLayout(f, file = 'layout-spec-template.yaml') {
  const source = readFileSync(join(ROOT, 'skills/adaptive-layout-implementation/assets', file), 'utf8');
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', source);
}

/** 对照与测量文件只作为合成测试材料，不能代表真实视觉验收。 */
function addFidelityLayout(f) {
  const source = readFileSync(join(ROOT, 'skills/adaptive-layout-implementation/assets/layout-spec-fidelity-template.yaml'), 'utf8');
  const yaml = require(join(ROOT, 'skills/app-skill-runtime/dependencies.cjs'))('yaml');
  const spec = yaml.parse(source);
  for (const item of spec.parity_cases) {
    item.target_screenshot = f.referenceTarget.path;
    item.target_sha256 = f.referenceTarget.sha256;
    item.flutter_screenshot = 'runtime.txt';
  }
  for (const item of spec.critical_alignments) {
    item.evidence.target_screenshot = f.referenceTarget.path;
    item.evidence.flutter_screenshot = 'runtime.txt';
    item.evidence.actual_measurement_output = 'measurements.json';
  }
  write(f.repo, 'runtime.txt', '合成运行证据');
  write(f.repo, 'measurements.json', { synthetic: true });
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec);
  return spec;
}

test('Flutter V2 绑定真实目标且不要求提前制作布局规格', (t) => {
  const f = fixture(t); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
  delete f.work.visual.domainEvidenceRef;
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /单目标领域证据/);
  f.doc.visualStage = 'V3'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /visualStage/);
  f.doc.visualStage = 'V2'; f.doc.visualStageModel = 'old'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /visualStageModel/);
});

test('Flutter V3 执行真实布局合同并校验对象与文件身份', (t) => {
  const f = fixture(t, { stage: 'V3' }); addLayout(f); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V3'), true);
  writeFileSync(join(f.repo, 'layout.yaml'), 'phase: sketch\npage: {id: example-page}\n');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /布局规格.*内容/);
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', 'phase: sketch\npage: {id: example-page}\n'); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /布局合同失败/);
  addLayout(f); f.work.visual.objectId = 'other-page'; f.doc.objectId = 'other-page'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /未绑定当前页面/);
});

test('Flutter V5 可用性模式允许草图，精确模式要求 fidelity', (t) => {
  const f = fixture(t, { stage: 'V5' }); addLayout(f); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.doc.visualValidationMode = 'exact'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /exact.*fidelity/);
  addFidelityLayout(f); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
});

test('Flutter fidelity 对照目标与实际截图和测量文件均须有效', (t) => {
  const f = fixture(t, { stage: 'V5' }); f.doc.visualValidationMode = 'exact';
  const spec = addFidelityLayout(f); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  const wrongTarget = write(f.repo, 'wrong-target.txt', '非当前视觉目标');
  spec.parity_cases[0].target_screenshot = wrongTarget.path;
  spec.parity_cases[0].target_sha256 = wrongTarget.sha256;
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /未绑定已确认目标/);
  spec.parity_cases[0].target_screenshot = f.referenceTarget.path;
  spec.parity_cases[0].target_sha256 = f.referenceTarget.sha256;
  spec.parity_cases[0].flutter_screenshot = 'missing-runtime.txt';
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /实际运行证据.*不存在/);
  spec.parity_cases[0].flutter_screenshot = 'runtime.txt';
  spec.critical_alignments[0].evidence.actual_measurement_output = 'missing-measurement.json';
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /actual_measurement_output.*不存在/);
});

test('Flutter fidelity 多视口分别绑定已确认目标，拒绝未经确认的目标', (t) => {
  const f = fixture(t, { stage: 'V5' }); f.doc.visualValidationMode = 'exact';
  const spec = addFidelityLayout(f);
  const secondTarget = write(f.repo, 'second-target.txt', '合成的第二视口目标');
  const secondReview = write(f.repo, 'second-review.json', {
    workItemId: f.work.workItemId, objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '合成确认',
    referenceTarget: secondTarget, targetRef: secondTarget.path, targetSha256: secondTarget.sha256,
  });
  spec.parity_cases.push({ ...spec.parity_cases[0], id: 'landscape-case', orientation: 'landscape', viewport: { width: 844, height: 390 }, target_screenshot: secondTarget.path, target_sha256: secondTarget.sha256 });
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec);
  f.doc.additionalTargets = [{ referenceTarget: secondTarget, reviewRef: secondReview }]; f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  delete f.doc.additionalTargets; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /未绑定已确认目标/);
  const unrelatedReview = write(f.repo, 'second-review.json', {
    workItemId: 'other-work', objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '合成确认',
    referenceTarget: secondTarget, targetRef: secondTarget.path, targetSha256: secondTarget.sha256,
  });
  f.doc.additionalTargets = [{ referenceTarget: secondTarget, reviewRef: unrelatedReview }]; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /额外视口目标缺少当前对象的真实确认|确认拥有者不在已声明的复用来源链中/);
});

test('Flutter 显示层额外目标确认不能跨宿主或层类型复用', (t) => {
  const f = fixture(t, { type: 'DISPLAY_LAYER', stage: 'V5' });
  f.work.visual.objectId = 'example-page'; f.doc.objectId = 'example-page';
  f.doc.visualValidationMode = 'exact';
  const spec = addFidelityLayout(f);
  const evidenceRef = write(f.repo, 'host-runtime.txt', '当前宿主运行证据');
  const runtimeContextRef = write(f.repo, 'host-context.json', {
    schemaVersion: '1.0', workItemId: f.work.workItemId, objectId: f.work.visual.objectId,
    candidateId: f.work.visual.candidateId, hostId: 'host', layerType: 'modal',
    interactions: ['open', 'close', 'focus-restore'].map((action) => ({ action, status: 'PASS', evidenceRef })),
  });
  for (const name of ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5']) {
    f.work.visual.reviews[name] = write(f.repo, `${name}.json`, { referenceTarget: f.referenceTarget, hostId: 'host', layerType: 'modal', ...(name === 'V5' ? { runtimeContextRef } : {}) });
  }
  f.doc.runtimeContextRef = runtimeContextRef;
  const target = write(f.repo, 'extra-target.txt', '额外目标');
  const review = { workItemId: f.work.workItemId, objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '合成确认', hostId: 'host', layerType: 'modal',
    referenceTarget: target, targetRef: target.path, targetSha256: target.sha256 };
  spec.parity_cases.push({ ...spec.parity_cases[0], id: 'extra', orientation: 'landscape', viewport: { width: 844, height: 390 }, target_screenshot: target.path, target_sha256: target.sha256 });
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec);
  f.doc.additionalTargets = [{ referenceTarget: target, reviewRef: write(f.repo, 'extra-review.json', review) }]; f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  review.hostId = 'other-host'; review.workItemId = 'source-work';
  f.doc.additionalTargets[0].reviewRef = write(f.repo, 'extra-review.json', review); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /额外目标确认.*宿主/);
  review.hostId = 'host'; review.layerType = 'popup'; review.workItemId = f.work.workItemId;
  f.doc.additionalTargets[0].reviewRef = write(f.repo, 'extra-review.json', review); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /额外目标确认.*层类型/);
});

test('人工确认 schema 接受显示层宿主和运行上下文身份', () => {
  const schema = JSON.parse(readFileSync(join(ROOT, 'skills/app-workflow-control/schemas/human-review.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  const review = { schemaVersion: '1.0', objectId: 'dialog', stage: 'V5', purpose: 'runtime-acceptance',
    decision: 'APPROVED', userMessageRef: 'test', hostId: 'home', layerType: 'modal',
    runtimeContextRef: { path: 'context.json', sha256: 'a'.repeat(64) } };
  assert.equal(validate(review), true, JSON.stringify(validate.errors));
  review.runtimeContextRef.sha256 = 'invalid';
  assert.equal(validate(review), false);
});

test('Flutter fidelity 可以沿已验证的 V2 来源链复用额外视口目标', async (t) => {
  const f = fixture(t, { stage: 'V5' }); f.doc.visualValidationMode = 'exact';
  const spec = addFidelityLayout(f);
  const secondTarget = write(f.repo, 'reuse-target.txt', '已确认的合成额外视口');
  const secondReview = write(f.repo, 'reuse-review.json', {
    workItemId: 'source-work', objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '合成原始确认',
    referenceTarget: secondTarget, targetRef: secondTarget.path, targetSha256: secondTarget.sha256,
  });
  spec.parity_cases.push({ ...spec.parity_cases[0], id: 'reused-landscape', orientation: 'landscape', viewport: { width: 844, height: 390 }, target_screenshot: secondTarget.path, target_sha256: secondTarget.sha256 });
  f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', spec);
  f.doc.additionalTargets = [{ referenceTarget: secondTarget, reviewRef: secondReview }];

  // 复用链使用真实工作项结构和文件身份；合成用户消息不代表实际验收。
  const created = await initializeWork({ repo: f.repo, args: { id: 'source-work', stack: 'flutter', type: 'PAGE', objective: '合成来源', 'project-id': f.work.projectId, 'object-id': f.work.visual.objectId } });
  const source = JSON.parse(readFileSync(join(f.repo, created.metadata.workItemPath), 'utf8'));
  source.globalState = 'COMPLETE'; source.visual.stage = 'V5'; source.visual.candidateId = f.work.visual.candidateId;
  source.visual.reviews.V2 = write(f.repo, 'source-v2-review.json', { referenceTarget: f.referenceTarget });
  const baselineCandidate = write(f.repo, 'baseline-candidate.txt', '合成视觉候选');
  const baselineReview = write(f.repo, 'baseline-review.json', { targetRef: baselineCandidate.path, targetSha256: baselineCandidate.sha256 });
  source.globalVisualBaselineRef = write(f.repo, 'baseline.json', { schemaVersion: '1.0', projectId: f.work.projectId, stack: 'flutter', selectedCandidateId: 'a', candidates: [{ candidateId: 'a', path: baselineCandidate.path }], selectionReviewRef: baselineReview });
  source.visual.domainEvidenceRef = write(f.repo, 'source-domain.json', { additionalTargets: f.doc.additionalTargets });
  write(f.repo, created.metadata.workItemPath, source);
  f.work.globalVisualBaselineRef = { ...source.globalVisualBaselineRef };
  f.work.visual.reviews.V2 = source.visual.reviews.V2;
  f.work.visual.reuse = { sourceWorkItemRef: { path: created.metadata.workItemPath }, impact: 'implementation', reason: '目标未变化', inheritedReviews: ['V2'] };
  f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);

  // 来源未将该确认纳入冻结领域证据时，不能借用其它工作项的记录。
  source.visual.domainEvidenceRef = write(f.repo, 'source-domain.json', { additionalTargets: [] });
  write(f.repo, created.metadata.workItemPath, source);
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /未绑定复用来源的确认/);
});

test('目标内容变化后不能继续引用原有确认', (t) => {
  const f = fixture(t); f.save();
  writeFileSync(join(f.repo, 'target.txt'), '已更换的目标');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /目标.*内容/);
  f.doc.referenceTarget = write(f.repo, 'target.txt', '新目标'); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /V2 目标.*内容|未绑定/);
});

test('Unity 显示层必须匹配宿主且不能只提交外层记录', (t) => {
  const f = fixture(t, { stack: 'unity', type: 'DISPLAY_LAYER' }); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /Unity 原生工作项/);
  f.doc.nativeWorkItemRef = write(f.repo, 'native.json', { workItemId: 'work-a', projectId: 'project-a', workItemType: 'DISPLAY_LAYER', displayLayer: { displayLayerId: 'dialog', hostSceneId: 'wrong', type: 'modal', stage: 'V2' } }); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /宿主或阶段错绑/);
  f.doc.hostId = 'wrong'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /宿主或类型错绑/);
});

/** 实际 Unity 领域校验使用的响应式合同，数据只用于协议测试。 */
function unityResponsiveContract() {
  return {
    version: 'unity-responsive/1.0', uiSystem: 'UGUI',
    logicalSpace: { mode: 'Canvas', referenceResolution: { width: 1920, height: 1080 }, unit: 'Unity logical units' },
    backbuffer: { source: 'Display', policy: 'measured', measuredAtRuntime: true },
    panel: { mode: 'Overlay', panelId: 'Canvas', runtimePanel: false },
    renderTexture: { enabled: false, format: 'none', resolutionPolicy: 'measured' },
    canvasScaler: { status: 'configured', enabled: true, mode: 'Scale With Screen Size', screenMatchMode: 'MatchWidthOrHeight', referenceResolution: { width: 1920, height: 1080 }, matchWidthOrHeight: 1 },
    panelSettings: { status: 'not-applicable', reason: 'UGUI' },
    camera: { id: 'Camera', renderMode: 'ScreenSpaceCamera', viewport: { width: 1920, height: 1080 }, projection: 'Orthographic', measuredAtRuntime: true },
    safeArea: { source: 'Screen.safeArea', policy: 'inset', measuredAtRuntime: true },
    inputCoordinates: { inputSystem: 'InputSystem', eventSystem: 'EventSystem', screenToLocal: 'RectTransformUtility', cameraRaycast: 'Camera' },
    resize: { mode: 'reflow', events: ['resize'], sameProcess: true }, orientation: { supported: ['landscape'], runtimeReflow: true },
    textLocalization: { programmatic: false }, resourceResolution: { sourceScale: 1, runtimeScalePolicy: 'platform', platformMeasured: true },
    performanceBudget: { frameTimeMs: 16, uiDrawCalls: 80, renderTexturePixels: 1000, memoryMb: 100, degradationPolicy: 'tier' },
    representativeViewports: [{ id: 'a', width: 1920, height: 1080, orientation: 'landscape' }, { id: 'b', width: 1280, height: 720, orientation: 'landscape' }],
    requiredRuntimeEvidence: ['gameView', 'screen', 'backbuffer', 'canvasScalerOrPanelSettings', 'camera', 'screenSafeArea', 'inputHit', 'resizeOrientationTrajectory', 'screenshot', 'supportedOrientations'],
  };
}

test('Unity V2 显示层可通过真实原生合同且不能错绑宿主', (t) => {
  const f = fixture(t, { stack: 'unity', type: 'DISPLAY_LAYER' });
  const native = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: f.work.workItemId, projectId: f.work.projectId,
    workItemType: 'DISPLAY_LAYER', stageId: 'scene-production', globalState: 'REVIEW',
    displayLayer: { displayLayerId: f.work.visual.objectId, hostSceneId: f.work.visual.hostId, type: 'modal', stage: 'V2', status: 'IN_PROGRESS' },
    responsiveContract: unityResponsiveContract(), baselineHash: 'sha256:abc', revision: 0, objective: '显示层合同测试', moduleIds: ['dialog'],
    allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change',
    gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' },
  };
  f.doc.nativeWorkItemRef = write(f.repo, 'native.json', native); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
  native.displayLayer.hostSceneId = 'other-host';
  f.doc.nativeWorkItemRef = write(f.repo, 'native.json', native); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /宿主或阶段错绑/);
});

test('Unity V5 显示层绑定真实原生运行与人工验收情境', (t) => {
  const f = fixture(t, { stack: 'unity', type: 'DISPLAY_LAYER', stage: 'V5' });
  const native = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: f.work.workItemId, projectId: f.work.projectId,
    workItemType: 'DISPLAY_LAYER', stageId: 'scene-production', globalState: 'REVIEW',
    displayLayer: { displayLayerId: f.work.visual.objectId, hostSceneId: f.work.visual.hostId, type: 'modal', stage: 'V5', status: 'IN_PROGRESS' },
    responsiveContract: unityResponsiveContract(), baselineHash: 'sha256:abc', revision: 0, objective: '显示层运行合同测试', moduleIds: ['dialog'],
    allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change',
    gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'NOT_RUN' },
  };
  const artifact = (source) => ({ source, measured: true, path: 'runtime.bin' });
  const evidence = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', evidenceId: 'ev-1', workItemId: f.work.workItemId, packageId: 'pkg-1',
    workItemType: 'DISPLAY_LAYER', visualStage: 'V5', contractVersions: { responsiveContract: 'unity-responsive/1.0' },
    baselineHash: 'sha256:abc', recordedAt: '2026-10-26T00:00:00.000Z', verdict: 'PASS',
    gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, { status: gate === 'F4' ? 'NOT_RUN' : 'PASS', summary: '合成夹具', evidenceRefs: [] }])),
    unityEvidence: { editorStable: 'PASS', compile: 'PASS', domainReload: 'PASS', console: 'PASS', scenePrefabImporterGuid: 'PASS' },
    candidateId: f.work.visual.candidateId, candidateVersion: 'version-1',
    responsiveEvidence: {
      gameView: artifact('GameView'), screen: artifact('Screen'), backbuffer: artifact('backbuffer'),
      canvasScaler: artifact('CanvasScaler'), camera: artifact('Camera'), screenshot: artifact('Screenshot'),
      safeArea: { source: 'Screen.safeArea', measured: true, rect: { x: 0, y: 0, width: 1920, height: 1080 } },
      inputHit: { system: 'InputSystem', eventSystem: 'EventSystem', hit: true, coordinates: { x: 1, y: 1 } },
      resizeOrientationTrajectory: { sameProcess: true, events: [{ type: 'resize' }, { type: 'resize' }] }, supportedOrientations: ['landscape'],
    },
    productionContractAudit: { status: 'PASS', contractVersion: '1', staticDeclarationOnly: false, buildOnly: false, singleScreenshotOnly: false },
    artExperienceAcceptanceRef: 'acceptance.json',
  };
  const budget = { brightnessContrast: 'test', screenCoverage: 'test', duration: 'test', triggerFrequency: 'test', maxConcurrent: 1, recovery: 'test', blendPolicy: 'test' };
  write(f.repo, 'brief.json', { schemaVersion: '1.0', projectId: f.work.projectId, theme: 'test', audience: { facts: ['test'], assumptions: [] }, coreLoop: 'test', experienceGoals: ['test'], viewingContext: 'test', visualHierarchy: ['test'], intensityBudget: { normal: budget, operation: budget, peak: budget, measurementMethod: 'test' } });
  write(f.repo, 'runtime.bin', '合成运行证据');
  write(f.repo, 'recording.mp4', '合成动态文件');
  const acceptance = {
    schemaVersion: '1.0', workItemId: f.work.workItemId, candidateId: f.work.visual.candidateId, candidateVersion: 'version-1',
    sceneId: f.work.visual.hostId, displayLayerId: f.work.visual.objectId, artBriefRef: 'brief.json',
    qualityResults: Object.fromEntries(['themeFit', 'audienceFit', 'gameplayReadability', 'viewingComfort', 'artCompletion'].map((key) => [key, { status: 'PASS', reason: '合成夹具' }])),
    scenarios: [
      { id: 'normal-play', required: true, reason: '合成夹具', status: 'PASS', recordingPath: 'recording.mp4', durationSeconds: 10, startSeconds: 0, endSeconds: 10, eventCount: 1, peakConcurrency: 1, viewport: { width: 1920, height: 1080 }, targetId: f.work.visual.objectId, stateId: 'default', referenceTarget: f.referenceTarget, observations: '合成夹具' },
      ...['repeated-feedback', 'event-peak', 'overlap-peak'].map((id) => ({ id, required: false, reason: '合成夹具', status: 'NOT_APPLICABLE' })),
    ], confirmedBy: 'test', confirmedAt: '2026-10-26T00:00:00.000Z', userMessageRef: 'test', userText: '合成夹具',
  };
  write(f.repo, 'acceptance.json', acceptance);
  f.doc.nativeWorkItemRef = write(f.repo, 'native.json', native);
  f.doc.nativeEvidenceRef = write(f.repo, 'native-evidence.json', evidence);
  f.doc.stateId = 'default'; f.doc.viewport = { width: 1920, height: 1080 }; f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.doc.stateId = 'other'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /未绑定当前目标、状态和视口/);
  f.doc.stateId = 'default'; f.doc.viewport = { width: 1280, height: 720 }; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /未绑定当前目标、状态和视口/);
});

for (const [stack, makeManifest, makePng] of [['cocos', cocosManifest, cocosPng], ['phaser', phaserManifest, phaserPng], ['threejs', threeManifest, threePng]]) {
  test(`${stack} V2 显示层通过实际场景合同并拒绝错绑宿主`, (t) => {
    const f = fixture(t, { stack, type: 'DISPLAY_LAYER' });
    const manifest = makeManifest();
    const conditions = manifest.scene_reconstruction_contract.target_conditions;
    const image = makePng(conditions.viewport.width, conditions.viewport.height);
    const target = write(f.repo, 'visual-target.png', image);
    assert.equal(String(manifest.reference_target.target_sha256).replace(/^sha256:/, ''), target.sha256);
    manifest.reference_target.original_file = target.path;
    manifest.visualStage = 'V2'; manifest.visualStageState = 'in-progress';
    const layoutPath = manifest.scene_reconstruction_contract.layout_decomposition?.layout_source?.nodes_file;
    if (layoutPath) write(f.repo, layoutPath, fixtureLayoutDocument(manifest.scene_reconstruction_contract));
    f.work.workItemId = manifest.workItemId;
    f.work.visual.candidateId = manifest.candidateVersion;
    f.work.visual.hostId = conditions.scene_id;
    f.doc.workItemId = manifest.workItemId;
    f.doc.candidateId = manifest.candidateVersion;
    f.doc.hostId = conditions.scene_id;
    f.doc.referenceTarget = target;
    write(f.repo, 'v2-review.json', { referenceTarget: target });
    const planning = manifest.scene_reconstruction_contract.display_layer_planning;
    planning.scene_master.persistent_layer_ids = [];
    const sha = manifest.reference_target.target_sha256;
    planning.inventory = [{
      layer_id: f.work.visual.objectId, type: 'modal', host_scene_id: conditions.scene_id, target_sha256: sha,
      persistence: 'transient', states: [{ state_id: conditions.state_id, required: true, contextual_effect_image: {
        evidence: 'pause-context.png', sha256: sha, origin: 'provided', host_scene_id: conditions.scene_id,
        host_target_sha256: sha, layer_target_sha256: sha, viewport: conditions.viewport, kind: 'host-scene-context', isolated_only: false,
      } }], in_scene_master: false, trigger: { event: 'pause' }, dismiss: { event: 'resume' }, input_blocking: true,
      z_order: 20, backdrop: { mode: 'dim' }, focus_restore: { mode: 'previous' }, responsive: { rule: 'safe-area' },
      relations: { mutually_exclusive_layer_ids: [], coexists_with_layer_ids: [] },
    }];
    f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
    assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
    planning.inventory[0].host_scene_id = 'wrong-host';
    f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
    assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /宿主/);
  });
}

test('Cocos V5 显示层以真实 ledger 通过领域合同并验证宿主轨迹', async (t) => {
  const f = fixture(t, { stack: 'cocos', type: 'DISPLAY_LAYER', stage: 'V5' });
  const manifest = cocosManifest();
  await createCocosFiles(f.repo);
  const target = write(f.repo, manifest.reference_target.original_file, cocosPng(390, 844));
  f.work.workItemId = manifest.workItemId;
  f.work.visual.candidateId = manifest.candidateVersion;
  f.work.visual.hostId = 'main-gameplay';
  f.doc.workItemId = manifest.workItemId;
  f.doc.candidateId = manifest.candidateVersion;
  f.doc.hostId = 'main-gameplay';
  f.doc.referenceTarget = target;
  write(f.repo, 'v2-review.json', { referenceTarget: target });
  const planning = manifest.scene_reconstruction_contract.display_layer_planning;
  const sha = manifest.reference_target.target_sha256;
  planning.scene_master.persistent_layer_ids = [];
  planning.inventory = [{
    layer_id: f.work.visual.objectId, type: 'modal', host_scene_id: f.work.visual.hostId, target_sha256: sha,
    persistence: 'transient', states: [{ state_id: 'default', required: true, contextual_effect_image: {
      evidence: 'evidence/display/context.png', sha256: sha, origin: 'provided', host_scene_id: f.work.visual.hostId,
      host_target_sha256: sha, layer_target_sha256: sha, viewport: { width: 390, height: 844 }, kind: 'host-scene-context', isolated_only: false,
    } }], in_scene_master: false, trigger: { event: 'pause' }, dismiss: { event: 'resume' }, input_blocking: true,
    z_order: 20, backdrop: { mode: 'dim' }, focus_restore: { mode: 'previous' }, responsive: { rule: 'safe-area' },
    relations: { mutually_exclusive_layer_ids: [], coexists_with_layer_ids: [] },
    runtime_replay: { status: 'PASS', host_scene_id: f.work.visual.hostId, same_screen_combination: true,
      steps: ['open', 'interact', 'close', 'restore'].map((phase) => ({ phase, evidence: `evidence/display/${phase}.txt` })) },
  }];
  write(f.repo, 'evidence/display/context.png', '合成上下文证据');
  for (const phase of ['open', 'interact', 'close', 'restore']) write(f.repo, `evidence/display/${phase}.txt`, `合成 ${phase} 轨迹`);
  for (const region of manifest.scene_reconstruction_contract.coverage_regions) {
    if (!region.native_runtime_evidence) continue;
    // 测试文件只模拟结构化运行报告，不代表真实设备或图像验收。
    region.native_runtime_evidence.evidence = `evidence/runtime/${region.region_id}.json`;
    write(f.repo, region.native_runtime_evidence.evidence, { ...region.native_runtime_evidence, report_schema: 'native-render-consumption/1.0', consumed: true, region_id: region.region_id, scene_id: region.scene_id, state_id: region.state_id });
  }
  await writeCocosConfirmations(f.repo, manifest);
  const ledgerFile = '.workflow-control/user-resolutions/main-gameplay-default-ledger.json';
  const ledger = JSON.parse(readFileSync(join(f.repo, ledgerFile), 'utf8'));
  const entry = ledger.entries[0];
  const authorityWork = {
    workItemId: manifest.workItemId,
    visualConfirmationAuthorityRefs: [{ scene_id: 'main-gameplay', state_id: 'default', ledger_file: ledgerFile, receipt_id: entry.receipt_id }],
    visualConfirmationPrerequisiteFiles: [ledgerFile, entry.receipt_file].sort(),
  };
  const loaded = loadVisualConfirmationAuthority(authorityWork, { projectRoot: f.repo, manifest, checkFiles: true });
  assert.deepEqual(loaded.errors, []);
  f.doc.visualConfirmationAuthorityRefs = authorityWork.visualConfirmationAuthorityRefs;
  f.doc.visualConfirmationPrerequisiteFiles = authorityWork.visualConfirmationPrerequisiteFiles;
  f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);

  // 确认遮罩关闭后的恢复轨迹是必需事实，不能以其他阶段冒充。
  planning.inventory[0].runtime_replay.steps = planning.inventory[0].runtime_replay.steps.filter((step) => step.phase !== 'restore');
  f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /缺少 restore/);
  planning.inventory[0].host_scene_id = 'other-host';
  f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /宿主/);
});

for (const stack of ['cocos', 'phaser', 'threejs']) {
  test(`${stack} 显示层不能仅凭外层记录或错绑宿主通过`, (t) => {
    const f = fixture(t, { stack, type: 'DISPLAY_LAYER' }); f.save();
    assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /显示层视觉清单/);
    const manifest = { visualStageModel: 'function-first-v1', visualStage: 'V2', workItemId: 'work-a', candidateVersion: 'candidate-a', reference_target: { original_file: f.referenceTarget.path, target_sha256: f.referenceTarget.sha256 }, scene_reconstruction_contract: { display_layer_planning: { inventory: [{ layer_id: 'dialog', host_scene_id: 'wrong', type: 'modal' }] } } };
    f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
    assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /唯一对象、宿主和层类型/);
    manifest.scene_reconstruction_contract.display_layer_planning.inventory[0].host_scene_id = 'host';
    f.doc.manifestRef = write(f.repo, 'manifest.json', manifest); f.save();
    assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /领域合同失败/);
  });
}
