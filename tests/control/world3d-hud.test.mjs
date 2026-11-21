/** 合成文件只验证 HUD 控制合同，不生成场景图或代表真实人工验收。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import { unityLayoutFixture } from './unity-text-fixture.mjs';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateGlobalBaseline, assertAssetReview } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { validateDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/domain-target-check.mjs';
import { advanceVisual, completeUnit, initializeWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { loadProfile, validateWork } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { invalidateWorld3DVisual } from '../../skills/app-workflow-control/scripts/runtime/world3d-lifecycle.mjs';
import { validateWorld3DProductionBasis, world3dModelArchiveEvidenceRoot } from '../../skills/app-workflow-control/scripts/runtime/world3d-contract.mjs';
import { assertFrozenWorldHud, captureWorldHudAssets, collectWorldHudReferences, validateWorldHud, validateWorldHudShape } from '../../skills/app-workflow-control/scripts/runtime/world3d-hud.mjs';
import { attachWorld3DPhase, attachWorld3DPreflight, createWorld3DFixture } from './world3d-fixture.mjs';
import { putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { validManifest } from '../../skills/threejs-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';

/** 构造同一真实工作项下的合成 HUD 图片链，阶段确认都引用测试消息。 */
function attachHud(f, { stateId = 'play', viewport = { width: 1280, height: 720 } } = {}) {
  const work = f.work;
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({
    dimension, status: 'PASS', evidenceRef: f.write(`hud/quality-${dimension}.txt`, `合成质量：${dimension}`).path,
  }));
  const candidates = ['a', 'b', 'c'].map((candidateId) => ({ candidateId, path: f.write(`hud/${candidateId}.txt`, `合成候选：${candidateId}`).path, qualityChecks }));
  const baselineImage = f.identity(candidates[0].path);
  const baselineReview = f.write('hud/baseline-review.json', {
    schemaVersion: '1.0', objectId: 'hud-baseline', stage: 'BASELINE', purpose: 'visual-baseline',
    candidateId: 'a', decision: 'APPROVED', userMessageRef: 'test-only://hud-baseline',
    targetRef: baselineImage.path, targetSha256: baselineImage.sha256, qualityChecks,
  });
  const globalVisualBaselineRef = f.write('hud/baseline.json', {
    schemaVersion: '1.0', baselineId: 'hud-baseline', projectId: work.projectId, stack: work.stack,
    candidates, selectedCandidateId: 'a', selectionReviewRef: baselineReview,
  });
  const referenceTarget = f.write('hud/target.txt', '仅供协议验证的界面目标');
  const target = {
    targetId: 'hud-main', candidateId: 'hud-candidate', sceneId: work.visual.objectId, stateId,
    scope: '常驻操作区', viewport, referenceTarget,
    domainEvidenceRef: { path: f.write('hud/domain.json', { invalid: '用于测试原生门的无效封套' }).path }, reviews: {},
  };
  /** 同一测试消息可覆盖多个事实，真实 UI 决定仍来自用户。 */
  function review(name, purpose, imageRef = referenceTarget) {
    const record = {
      schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId,
      targetId: target.targetId, candidateId: target.candidateId,
      stage: name.startsWith('V3') ? 'V3' : name, purpose, decision: 'APPROVED',
      userMessageRef: 'test-only://hud-decision', referenceTarget,
      targetRef: imageRef.path, targetSha256: imageRef.sha256,
    };
    if (name === 'V2') record.qualityChecks = qualityChecks;
    if (name === 'V3Layout') record.decompositionReviewRef = target.reviews.V3Decomposition;
    target.reviews[name] = f.write(`hud/${name}.json`, record);
  }
  review('V2', 'target');
  review('V3Decomposition', 'decomposition', f.write('hud/decomposition.txt', '合成拆解'));
  review('V3Layout', 'layout', f.write('hud/layout.txt', '合成布局'));
  if (work.stack === 'unity') {
    const plan = unityLayoutFixture((path, value) => f.write(path, value), target, { prefix: 'hud/unity' });
    const record = f.read(target.reviews.V3Layout);
    target.reviews.V3Layout = f.write('hud/V3Layout.json', { ...record, layoutSpecRef: plan.planRef });
  }
  const component = f.write('src/hud/component.ts', '// 合成 HUD 原生组件');
  const componentEvidence = f.write('hud/component-check.log', '合成组件检查');
  target.assetReviewRef = f.write('hud/assets.json', {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4',
    candidateId: target.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS',
    userMessageRef: 'test-only://hud-decision', qualityChecks,
    assets: [{ assetType: 'native-component', assetId: 'hud-component', output: component.path, componentEvidenceRef: componentEvidence.path }],
  });
  review('V4', 'imported-assets', f.write('hud/v4.txt', '合成资源检查'));
  const coverageRef = f.write('hud/coverage.json', {
    workItemId: work.workItemId, sceneId: work.visual.objectId, status: 'CONFIRMED', userMessageRef: 'test-only://hud-decision',
    targetIds: [target.targetId], targets: [{ ...target }],
  });
  work.visual.hud = { scopeIds: ['persistent-controls'], globalVisualBaselineRef, targets: [target], coverageRef };
  return { target, review, qualityChecks };
}

/** 以指定原生校验回调确认投影不会替换真实三维工作项。 */
function options(f, extra = {}) {
  return {
    validateGlobalBaseline,
    validateDomainTarget: (_repo, work, target) => {
      assert.strictEqual(work, f.work);
      assert.equal(work.visual.designRoute, 'world-3d');
      assert.equal(target.sceneId, work.visual.objectId);
      return true;
    },
    validateAssetReview: assertAssetReview,
    ...extra,
  };
}

/** 仅重签本次受影响的合成 HUD 确认，真实消息的适用性仍由执行者核对。 */
function reissueHudConfirmations(f, work, previous, earliest) {
  const target = work.visual.hud.targets[0];
  const old = previous.targets[0];
  const index = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'].indexOf(earliest);
  if (index <= 2) {
    target.reviews.V2 = f.write(`hud/revised-${earliest}-v2.json`, f.read(old.reviews.V2));
    work.visual.hud.coverageRef = f.write(`hud/revised-${earliest}-coverage.json`, f.read(previous.coverageRef));
  }
  if (index <= 3) {
    target.reviews.V3Decomposition = f.write(`hud/revised-${earliest}-decomposition.json`, f.read(old.reviews.V3Decomposition));
    target.reviews.V3Layout = f.write(`hud/revised-${earliest}-layout.json`, { ...f.read(old.reviews.V3Layout), decompositionReviewRef: target.reviews.V3Decomposition });
  }
  if (index <= 4) {
    target.assetReviewRef = f.write(`hud/revised-${earliest}-assets.json`, f.read(old.assetReviewRef));
    target.reviews.V4 = f.write(`hud/revised-${earliest}-v4.json`, f.read(old.reviews.V4));
  }
}

/** 构造 Unity 原生 UI 合同，数据仅用于验证控制器是否调用真实领域门。 */
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

/** 更新当前阶段的 Unity 原生封套；正式项目须使用真实 Studio 或编辑器证据。 */
function attachUnityHudDomain(f, work, stage) {
  const target = work.visual.hud.targets[0];
  const evidenceFile = `${work.evidenceRoot}/hud-synthetic.bin`;
  f.write(evidenceFile, '测试用引擎记录，不代表真实运行');
  const native = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: work.workItemId, projectId: work.projectId,
    workItemType: 'SCENE', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: work.visual.objectId, stage, status: 'IN_PROGRESS' },
    responsiveContract: unityResponsiveContract(), baselineHash: 'sha256:abc', revision: 0, objective: '合成 HUD 合同',
    moduleIds: ['scene'], allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'],
    actionLevel: 'A3', actionType: 'unity-code-change', gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' },
  };
  const nativeWork = f.write(`hud/native-work-${stage}.json`, native);
  const evidence = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', evidenceId: 'hud-evidence', workItemId: work.workItemId,
    packageId: 'hud-package', workItemType: 'SCENE', visualStage: stage, contractVersions: { responsiveContract: 'unity-responsive/1.0' },
    baselineHash: 'sha256:abc', recordedAt: '2026-10-26T00:00:00.000Z', verdict: 'PASS',
    gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, { status: gate === 'F4' ? 'NOT_RUN' : 'PASS', summary: '合成夹具', evidenceRefs: [] }])),
    unityEvidence: { editorStable: 'PASS', compile: 'PASS', domainReload: 'PASS', console: 'PASS', scenePrefabImporterGuid: 'PASS' }, candidateId: target.candidateId,
  };
  if (stage === 'V5') {
    const artifact = (source) => ({ source, measured: true, path: evidenceFile });
    evidence.responsiveEvidence = {
      gameView: artifact('GameView'), screen: artifact('Screen'), backbuffer: artifact('backbuffer'),
      canvasScaler: artifact('CanvasScaler'), camera: artifact('Camera'), screenshot: artifact('Screenshot'),
      safeArea: { source: 'Screen.safeArea', measured: true, rect: { x: 0, y: 0, width: 1920, height: 1080 } },
      inputHit: { system: 'InputSystem', eventSystem: 'EventSystem', hit: true, coordinates: { x: 1, y: 1 } },
      resizeOrientationTrajectory: { sameProcess: true, events: [{ type: 'resize' }, { type: 'resize' }] }, supportedOrientations: ['landscape'],
    };
    evidence.productionContractAudit = { status: 'PASS', contractVersion: '1', staticDeclarationOnly: false, buildOnly: false, singleScreenshotOnly: false };
  }
  const nativeEvidence = f.write(`hud/native-evidence-${stage}.json`, evidence);
  target.domainEvidenceRef = { path: f.write(`hud/native-domain-${stage}.json`, { ...target, workItemId: work.workItemId, nativeWorkItemRef: { path: nativeWork.path }, nativeEvidenceRef: { path: nativeEvidence.path } }).path };
}

/** 在最终 HUD 组合中追加真实字段结构的合成证据，不分析图片。 */
async function attachHudRuntimeEvidence(f, work, workPath) {
  const target = work.visual.hud.targets[0];
  const budget = { brightnessContrast: 'test', screenCoverage: 'test', duration: 'test', triggerFrequency: 'test', maxConcurrent: 1, recovery: 'test', blendPolicy: 'test' };
  const brief = f.write('hud/art-brief.json', { schemaVersion: '1.0', projectId: work.projectId, theme: 'test', audience: { facts: ['test'], assumptions: [] }, coreLoop: 'test', experienceGoals: ['test'], viewingContext: 'test', visualHierarchy: ['test'], intensityBudget: { normal: budget, operation: budget, peak: budget, measurementMethod: 'test' } });
  const recording = f.write(`${work.evidenceRoot}/hud-recording.mp4`, '测试用运行材料');
  const acceptance = f.write(`${work.evidenceRoot}/hud-art-acceptance.json`, {
    schemaVersion: '1.0', workItemId: work.workItemId, candidateId: target.candidateId, candidateVersion: 'version-1', sceneId: work.visual.objectId, artBriefRef: brief.path,
    qualityResults: Object.fromEntries(['themeFit', 'audienceFit', 'gameplayReadability', 'viewingComfort', 'artCompletion'].map((key) => [key, { status: 'PASS', reason: '合成夹具' }])),
    scenarios: [
      { id: 'normal-play', required: true, reason: '合成夹具', status: 'PASS', recordingPath: recording.path, durationSeconds: 10, startSeconds: 0, endSeconds: 10, eventCount: 1, peakConcurrency: 1, viewport: target.viewport, targetId: target.targetId, stateId: target.stateId, referenceTarget: target.referenceTarget, observations: '合成夹具' },
      ...['repeated-feedback', 'event-peak', 'overlap-peak'].map((id) => ({ id, required: false, reason: '合成夹具', status: 'NOT_APPLICABLE' })),
    ], confirmedBy: 'test', confirmedAt: '2026-10-26T00:00:00.000Z', userMessageRef: 'test-only://display', userText: '合成夹具',
  });
  const manifest = JSON.parse(readFileSync(resolve(f.repo, work.evidenceRef.path), 'utf8'));
  const kinds = loadProfile(f.repo, work.stack).evidenceRequirements.visual;
  for (const category of kinds) {
    const item = manifest.items.find((entry) => entry.category === category);
    manifest.items.push({ ...item, targetId: target.targetId });
  }
  manifest.items.push({ category: 'art-experience-acceptance', status: 'PASS', targetId: target.targetId, path: acceptance.path });
  await putJson(f.repo, work.evidenceRef.path, manifest);
  await putJson(f.repo, workPath, work);
}

/** 运行公共控制器的合成工程门；不启动 Unity。 */
async function runUnityEngineering(f, workPath, stage, { hudRuntime = false } = {}) {
  let work = await readWork(f.repo, workPath);
  work.gateStatus.F2 = 'PASS';
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(f.repo, workPath, work);
  if (work.globalState === 'PROPOSAL') {
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'REVIEW', args: {} });
    work = await readWork(f.repo, workPath);
  }
  // 返回已有阶段时使用新实施包与证据目录，不能覆盖上一轮归档引用。
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-${stage}-r${work.revision}.json`;
  const units = [{ unitId: 'unit-1', sequence: 1, type: 'SCENE', owner: 'test-owner', paths: [`Assets/${stage}-hud.cs`], resultPath: `${work.evidenceRoot}/${stage}-unit-1.json`, acceptanceCommands: ['node --version'] }];
  await putJson(f.repo, packPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType, visualStage: stage, executionUnits: units, systemCoverage: createSystemCoverage(f.repo, work, units) });
  work.implementationPackageRef = { path: packPath };
  await putJson(f.repo, workPath, work);
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(f.repo, workPath);
  await submitPassingUnits({ repo: f.repo, work, workPath, packPath, units });
  await completeUnit({ repo: f.repo, workItem: workPath, resultPath: units[0].resultPath });
  work = await readWork(f.repo, workPath);
  const requirements = loadProfile(f.repo, work.stack).evidenceRequirements;
  const categories = [...new Set([...requirements.engineering, ...(stage === 'V4' ? requirements.assetImport ?? [] : []), ...(stage === 'V5' ? requirements.visual : [])])];
  const items = categories.map((category) => ({ category, status: 'PASS', path: f.write(`${work.evidenceRoot}/${stage}-${category}.txt`, `合成证据：${category}`).path }));
  const path = `${work.evidenceRoot}/hud-engineering-manifest.json`;
  await putJson(f.repo, path, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, visualStage: stage, items });
  work.evidenceRef = { path };
  work.gateStatus.F3 = 'PASS';
  await putJson(f.repo, workPath, work);
  if (hudRuntime) {
    await attachHudRuntimeEvidence(f, work, workPath);
  }
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'PASSED', args: {} });
}

test('HUD 声明属于 3D 场景且功能快照冻结范围', (t) => {
  const f = createWorld3DFixture(t);
  assert.doesNotThrow(() => validateWorldHudShape(f.work));
  f.work.visual.hud = { scopeIds: ['hud-main'] };
  const snapshot = { work: structuredClone(f.work) };
  assert.doesNotThrow(() => assertFrozenWorldHud(f.work, snapshot));
  for (const route of ['world-2d', 'game-ui']) {
    const wrong = structuredClone(f.work);
    wrong.visual.designRoute = route;
    assert.throws(() => validateWorldHudShape(wrong), /world-3d/);
  }
  f.work.visual.hud.scopeIds = ['other'];
  assert.throws(() => assertFrozenWorldHud(f.work, snapshot), /范围.*V1/);
  delete f.work.visual.hud;
  assert.throws(() => assertFrozenWorldHud(f.work, snapshot), /存在.*V1/);
  assert.throws(() => assertFrozenWorldHud({ ...f.work, visual: { ...f.work.visual, hud: { scopeIds: ['new'] } } }, { work: structuredClone(f.work) }), /存在.*V1/);
});

test('HUD 使用原三候选、目标、拆解布局及资源人工链', (t) => {
  const f = createWorld3DFixture(t);
  const { target } = attachHud(f);
  for (const stage of ['V2', 'V3', 'V4']) {
    f.work.visual.stage = stage;
    assert.doesNotThrow(() => validateWorldHud(f.repo, f.work, stage, options(f)));
  }
  const v3 = target.reviews.V3Layout;
  delete target.reviews.V3Layout;
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V4', options(f)), /V3Layout/);
  target.reviews.V3Layout = v3;
  const asset = target.assetReviewRef;
  delete target.assetReviewRef;
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V4', options(f)), /素材评审/);
  target.assetReviewRef = asset;
  target.sceneId = 'other-scene';
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V4', options(f)), /宿主场景/);
});

test('HUD 不借三维单方向或伪造原生领域材料通过 UI 门', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V2');
  attachHud(f);
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V2', options(f, { validateDomainTarget })), /领域|清单/);
  f.work.visual.hud.globalVisualBaselineRef = f.baselineRef;
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V2', options(f)), /2D／UI|3D 方向|三维/);
});

test('HUD 在同一三维宿主上调用真实 Three.js V2 领域合同', (t) => {
  const f = createWorld3DFixture(t);
  f.work.visual.stage = 'V2';
  f.work.visual.objectId = 'main-gameplay';
  const { target } = attachHud(f, { stateId: 'default', viewport: { width: 390, height: 844 } });
  const manifest = validManifest();
  manifest.visualStage = 'V2';
  manifest.visualStageState = 'in-progress';
  manifest.workItemId = f.work.workItemId;
  manifest.candidateVersion = target.candidateId;
  Object.assign(manifest.reference_target, {
    original_file: target.referenceTarget.path, target_sha256: `sha256:${target.referenceTarget.sha256}`,
    scene_ids: [target.sceneId], state_ids: [target.stateId],
  });
  Object.assign(manifest.scene_reconstruction_contract.target_conditions, {
    target_sha256: `sha256:${target.referenceTarget.sha256}`, scene_id: target.sceneId, state_id: target.stateId,
    viewport: target.viewport, original_pixel_size: target.viewport,
  });
  manifest.scene_reconstruction_contract.layout_decomposition = {};
  target.domainEvidenceRef = { path: f.write('hud/real-domain.json', manifest).path };
  assert.doesNotThrow(() => validateWorldHud(f.repo, f.work, 'V2', options(f, { validateDomainTarget })));
});

test('HUD V5 复验 V4 归档、各目标运行证据与最终用户确认', (t) => {
  const f = createWorld3DFixture(t);
  const { target, review } = attachHud(f);
  f.work.visual.stage = 'V4';
  const archive = f.write('hud/archive.json', { visualStage: 'V4', world3dModelBaseline: { workItemId: f.work.workItemId, objectId: f.work.visual.objectId }, world3dHudAssets: captureWorldHudAssets(f.work) });
  f.work.visual.modelBaselineRef = archive;
  f.work.visual.stage = 'V5';
  review('V5', 'runtime-acceptance', f.write('hud/runtime.txt', '合成最终组合'));
  f.work.visual.hud.integrationEvidenceRef = f.write('hud/integration.json', {
    workItemId: f.work.workItemId, sceneId: f.work.visual.objectId, status: 'APPROVED',
    userMessageRef: 'test-only://final', targetIds: [target.targetId],
  });
  const log = f.write('hud/runtime.log', '合成运行输出');
  const manifest = { workItemId: f.work.workItemId, stack: f.work.stack, visualStage: 'V5', items: [{ targetId: target.targetId, category: 'runtime', status: 'PASS', path: log.path }] };
  const opts = options(f, { manifest, visualCategories: ['runtime'] });
  assert.doesNotThrow(() => validateWorldHud(f.repo, f.work, 'V5', opts));
  const original = target.assetReviewRef;
  target.assetReviewRef = { sha256: original.sha256, path: original.path };
  assert.doesNotThrow(() => validateWorldHud(f.repo, f.work, 'V5', opts));
  target.assetReviewRef = f.write('hud/other-asset.json', JSON.parse(readFileSync(resolve(f.repo, original.path), 'utf8')));
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V5', opts), /V4/);
  target.assetReviewRef = original;
  delete target.reviews.V5;
  assert.throws(() => validateWorldHud(f.repo, f.work, 'V5', opts), /V5/);
});

test('HUD 局部 RETURN 保留世界空间、方向及模型，撤销受影响的 HUD 和最终运行', (t) => {
  for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    const f = createWorld3DFixture(t);
    attachWorld3DPhase(f, 'V5');
    const { target, review } = attachHud(f);
    review('V5', 'runtime-acceptance', f.write('hud/runtime.txt', '合成最终组合'));
    f.work.visual.hud.integrationEvidenceRef = f.write('hud/integration.json', { status: 'APPROVED' });
    const contract = structuredClone(f.contract);
    const modelReview = structuredClone(f.work.assetReviewRef);
    const modelBaseline = structuredClone(f.work.visual.modelBaselineRef);
    const invalidated = [];
    assert.equal(invalidateWorld3DVisual(f.repo, f.work, `hud:${stage}`, invalidated), stage);
    const invalid = new Set(invalidated.map((entry) => entry.path));
    for (const ref of [contract.reviewRef, contract.spaceApprovalRef, contract.directionApprovalRef, modelReview, modelBaseline]) assert.ok(!invalid.has(ref.path), `${stage} 错误撤销 ${ref.path}`);
    assert.ok(invalid.has(contract.formalRunRef.path));
    assert.ok(invalid.has(contract.displayApprovalRef.path));
    assert.deepEqual(f.work.assetReviewRef, modelReview);
    assert.deepEqual(f.work.visual.modelBaselineRef, modelBaseline);
    assert.equal(target.reviews.V5, undefined);
    assert.equal(f.work.visual.hud.integrationEvidenceRef, undefined);
  }
});

test('HUD 返修只接受原 V4 模型归档及同一规格、试接', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V5');
  f.work.returnRecord = { affectedScope: 'hud:V3' };
  attachWorld3DPhase(f, 'V4');
  f.work.evidenceRoot = '.workflow-control/evidence/hud-new-v4';
  assert.equal(world3dModelArchiveEvidenceRoot(f.repo, f.work), '.workflow-control/evidence/world-task');
  const contract = { ...f.contract, modelSpecRef: f.write('hud/other-model-spec.json', { different: true }) };
  f.work.visual.domainEvidenceRef = f.write('hud/changed-world-v4.json', contract);
  assert.throws(() => world3dModelArchiveEvidenceRoot(f.repo, f.work), /规格|风险|试接/);
});

test('首个 V4 的 HUD 返工没有旧模型归档时只接受当前证据根', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V4');
  f.work.returnRecord = { affectedScope: 'hud:V4' };
  assert.equal(f.work.visual.modelBaselineRef, undefined);
  assert.equal(world3dModelArchiveEvidenceRoot(f.repo, f.work), f.work.evidenceRoot);
  f.work.evidenceRoot = '.workflow-control/evidence/new-root';
  assert.throws(() => world3dModelArchiveEvidenceRoot(f.repo, f.work), /当前阶段/);
  f.work.visual.modelBaselineRef = { path: 'hud/missing-archive.json', sha256: '0'.repeat(64) };
  assert.throws(() => world3dModelArchiveEvidenceRoot(f.repo, f.work), /不存在|基线/);
});

test('3D 样本准备复用 V3 世界前置，不等待尚未存在的 V4 资源', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V3');
  f.work.visual.modelProductionBasisRef = f.write('hud/production-basis.json', {
    visualStage: 'V3', world3dModelProductionBasis: {
      workItemId: f.work.workItemId, projectId: f.work.projectId, stack: f.work.stack,
      objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
      domainEvidenceRef: f.work.visual.domainEvidenceRef,
    },
  });
  f.work.visual.stage = 'V4';
  assert.deepEqual(validateWorld3DProductionBasis(f.repo, f.work).contract.modelSpecRef, f.modelSpecRef);
  const v4 = { ...f.contract, stage: 'V4' };
  f.work.visual.domainEvidenceRef = f.write('hud/preproduction-v4.json', v4);
  assert.deepEqual(validateWorld3DProductionBasis(f.repo, f.work).contract.modelSpecRef, f.modelSpecRef);
  const noDirection = { ...v4 };
  delete noDirection.directionApprovalRef;
  f.work.visual.domainEvidenceRef = f.write('hud/missing-direction-v4.json', noDirection);
  assert.throws(() => validateWorld3DProductionBasis(f.repo, f.work), /directionApprovalRef|SHA|路径/);
  const wrongSpec = { ...f.read(f.modelSpecRef), objectId: 'other-scene' };
  f.work.visual.domainEvidenceRef = f.write('hud/wrong-model-v4.json', { ...v4, modelSpecRef: f.write('hud/wrong-model-spec.json', wrongSpec) });
  assert.throws(() => validateWorld3DProductionBasis(f.repo, f.work), /模型规格/);
});

for (const scenario of ['V5', 'V3', 'firstV2', 'firstV4']) test(`公共控制器完成 3D 世界与 HUD，${scenario} 返工后完成 V5`, async (t) => {
  const returnStage = ['firstV2', 'firstV4'].includes(scenario) ? 'V5' : scenario;
  const f = createWorld3DFixture(t, { stack: 'unity' });
  const created = await initializeWork({ repo: f.repo, args: {
    id: f.context.workItemId, stack: 'unity', type: 'SCENE', objective: '验证世界和 HUD 同宿主闭环',
    'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d',
  } });
  const workPath = created.metadata.workItemPath;
  let work = await readWork(f.repo, workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  work.visual.hud = { scopeIds: ['persistent-controls'] };
  await putJson(f.repo, workPath, work);

  work = await readWork(f.repo, workPath);
  work.visual.candidateId = f.context.candidateId;
  work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
  await putJson(f.repo, workPath, work);
  await runUnityEngineering(f, workPath, 'V1');
  work = await readWork(f.repo, workPath);
  attachWorld3DPreflight(f, work);
  await putJson(f.repo, workPath, work);
  await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V2' });

  work = await readWork(f.repo, workPath);
  attachWorld3DPhase(f, 'V2', work);
  attachHud(f, { stateId: 'default', viewport: { width: 1920, height: 1080 } });
  attachUnityHudDomain(f, work, 'V2');
  await putJson(f.repo, workPath, work);
  if (scenario === 'firstV2') {
    const previous = structuredClone(work.visual.hud);
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'RETURN', args: { reason: '首次目标确认需修改', 'affected-scope': 'hud:V2' } });
    work = await readWork(f.repo, workPath);
    assert.equal(work.visual.modelBaselineRef, undefined);
    reissueHudConfirmations(f, work, previous, 'V2');
    attachWorld3DPhase(f, 'V2', work);
    attachUnityHudDomain(f, work, 'V2');
    work.gateStatus.F2 = 'PASS';
    await putJson(f.repo, workPath, work);
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '重新确认 HUD 目标' } });
  }
  await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V3' });
  work = await readWork(f.repo, workPath);
  attachWorld3DPhase(f, 'V3', work);
  attachUnityHudDomain(f, work, 'V3');
  await putJson(f.repo, workPath, work);
  await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V4' });
  work = await readWork(f.repo, workPath);
  attachWorld3DPhase(f, 'V4', work);
  attachUnityHudDomain(f, work, 'V4');
  await putJson(f.repo, workPath, work);
  if (scenario === 'firstV4') {
    const previous = structuredClone(work.visual.hud);
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'RETURN', args: { reason: '首批 HUD 资源需修改', 'affected-scope': 'hud:V4' } });
    work = await readWork(f.repo, workPath);
    assert.equal(work.visual.modelBaselineRef, undefined);
    reissueHudConfirmations(f, work, previous, 'V4');
    // 首次世界模型尚无完整 V4 归档，在新的当前证据根完成试接。
    f.model = undefined;
    f.sampleRef = undefined;
    f.assetReviewRef = undefined;
    attachWorld3DPhase(f, 'V4', work);
    attachUnityHudDomain(f, work, 'V4');
    work.gateStatus.F2 = 'PASS';
    await putJson(f.repo, workPath, work);
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '重新验证首批资源' } });
  }
  await runUnityEngineering(f, workPath, 'V4');
  await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V5' });
  work = await readWork(f.repo, workPath);
  const modelBaseline = structuredClone(work.visual.modelBaselineRef);
  const modelReview = structuredClone(work.assetReviewRef);
  const previousHud = structuredClone(work.visual.hud);
  const archived = f.read(modelBaseline);
  assert.ok(archived.world3dHudAssets?.targets?.length);
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'RETURN', args: { reason: '只修 HUD 当前范围', 'affected-scope': `hud:${returnStage}` } });
  work = await readWork(f.repo, workPath);
  assert.deepEqual(work.visual.modelBaselineRef, modelBaseline);
  assert.deepEqual(work.assetReviewRef, modelReview);
  if (returnStage === 'V3') {
    // 只重建受影响 HUD 的确认引用；用户消息仍须真实覆盖本次内容。
    reissueHudConfirmations(f, work, previousHud, 'V3');
    attachWorld3DPhase(f, 'V3', work);
    attachUnityHudDomain(f, work, 'V3');
    work.gateStatus.F2 = 'PASS';
    await putJson(f.repo, workPath, work);
    await transitionWork({ repo: f.repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '重新确认 HUD 布局' } });
    await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V4' });
    work = await readWork(f.repo, workPath);
    attachWorld3DPhase(f, 'V4', work);
    attachUnityHudDomain(f, work, 'V4');
    await putJson(f.repo, workPath, work);
    await runUnityEngineering(f, workPath, 'V4');
    await advanceVisual({ repo: f.repo, workItem: workPath, to: 'V5' });
    work = await readWork(f.repo, workPath);
    const newArchive = f.read(work.visual.modelBaselineRef);
    assert.deepEqual(newArchive.world3dModelBaseline.assetReviewRef, modelReview);
    assert.equal(newArchive.world3dModelBaseline.evidenceRoot, archived.world3dModelBaseline.evidenceRoot);
  }
  attachWorld3DPhase(f, 'V5', work);
  const target = work.visual.hud.targets[0];
  const finalVisual = f.write('hud/final-visual.txt', '合成运行组合');
  target.reviews.V5 = f.write('hud/final-review.json', {
    schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, targetId: target.targetId,
    candidateId: target.candidateId, stage: 'V5', purpose: 'runtime-acceptance', decision: 'APPROVED',
    userMessageRef: 'test-only://final-hud', referenceTarget: target.referenceTarget, targetRef: finalVisual.path, targetSha256: finalVisual.sha256,
  });
  work.visual.hud.integrationEvidenceRef = f.write('hud/final-integration.json', {
    workItemId: work.workItemId, sceneId: work.visual.objectId, status: 'APPROVED', userMessageRef: 'test-only://final-hud', targetIds: [target.targetId],
  });
  attachUnityHudDomain(f, work, 'V5');
  work.gateStatus.F2 = 'PASS';
  await putJson(f.repo, workPath, work);
  if (returnStage === 'V5') await transitionWork({ repo: f.repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '重新验证 HUD 和正式组合' } });
  await runUnityEngineering(f, workPath, 'V5', { hudRuntime: true });
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'COMPLETE', args: {} });
  work = await readWork(f.repo, workPath);
  assert.equal(work.globalState, 'COMPLETE');
  if (returnStage === 'V5') assert.deepEqual(work.visual.modelBaselineRef, modelBaseline);
  assert.deepEqual(work.assetReviewRef, modelReview);
});

test('HUD 引用覆盖基线、确认与素材，文件身份失效不能重绑', (t) => {
  const f = createWorld3DFixture(t);
  const { target } = attachHud(f);
  const refs = collectWorldHudReferences(f.repo, f.work);
  for (const path of [f.work.visual.hud.globalVisualBaselineRef.path, target.referenceTarget.path, target.reviews.V2.path, target.assetReviewRef.path, 'src/hud/component.ts']) assert.ok(refs.includes(path), path);
  f.work.invalidatedRefs = [{ path: target.reviews.V2.path, state: 'V2' }];
  assert.throws(() => validateWorldHudShape(f.work, { repo: f.repo }), /作废/);
});

test('工作项 schema 仅允许 3D 世界声明 HUD，不要求前期完成目标图', async (t) => {
  const f = createWorld3DFixture(t);
  const created = await initializeWork({ repo: f.repo, args: { id: 'hud-schema', stack: 'threejs', type: 'SCENE', objective: '验证 HUD 声明', 'design-route': 'world-3d' } });
  const work = loadWork(f.repo, created.metadata.workItemPath);
  work.visual.hud = { scopeIds: ['persistent-controls'] };
  const schema = JSON.parse(readFileSync(resolve('skills/app-workflow-control/schemas/work-item.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(work), true, JSON.stringify(validate.errors));
  assert.doesNotThrow(() => validateWork(work, { repo: f.repo }));
  for (const route of ['world-2d', 'game-ui']) {
    const invalid = structuredClone(work);
    invalid.visual.designRoute = route;
    invalid.visual.targets = [];
    assert.equal(validate(invalid), false, route);
    assert.throws(() => validateWork(invalid, { repo: f.repo }), /world-3d/);
  }
});
