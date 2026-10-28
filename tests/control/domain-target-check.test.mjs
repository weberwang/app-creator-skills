import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import addFormats from '../../skills/app-skill-runtime/ajv-formats.mjs';
import { validateDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/domain-target-check.mjs';
import { validateMultiVisualStage } from '../../skills/app-workflow-control/scripts/runtime/multi-visual-contract.mjs';
import { assertAssetReview } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { minimalPng, validManifest } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { fixtureLayoutDocument } from '../../skills/cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs';
import { validManifest as phaserManifest, minimalPng as phaserPng } from '../../skills/phaser4-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { validManifest as threeManifest, minimalPng as threePng } from '../../skills/threejs-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';

/** 将测试工件写入独立临时项目，避免污染真实工作区。 */
function put(repo, path, value) {
  const file = join(repo, ...path.split('/'));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value));
}

/** 使用正式 Cocos 测试夹具建立同一目标与实际 PNG 文件。 */
function webFixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'domain-target-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const image = minimalPng(390, 844);
  const sha256 = createHash('sha256').update(image).digest('hex');
  const manifest = validManifest();
  manifest.visualStage = 'V2';
  manifest.visualStageState = 'in-progress';
  put(repo, 'evidence/visual/mockup.png', image);
  put(repo, manifest.scene_reconstruction_contract.layout_decomposition.layout_source.nodes_file, fixtureLayoutDocument(manifest.scene_reconstruction_contract));
  put(repo, 'docs/visual-assets.json', manifest);
  return {
    repo, manifest,
    work: { workItemId: manifest.workItemId, workItemType: 'SCENE', stack: 'cocos' },
    target: { targetId: 'view-1', candidateId: manifest.candidateVersion, sceneId: 'main-gameplay', stateId: 'default', viewport: { width: 390, height: 844 }, referenceTarget: { path: 'evidence/visual/mockup.png', sha256 }, domainEvidenceRef: { path: 'docs/visual-assets.json' } },
  };
}

test('V2 调用 Cocos 场景目标合同并拒绝目标身份错绑', (t) => {
  const fixture = webFixture(t);
  const { repo, work, target, manifest } = fixture;
  assert.equal(validateDomainTarget(repo, work, target, 'V2'), true);
  assert.throws(() => validateDomainTarget(repo, work, target, 'V1'), /不支持的领域校验阶段/);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, candidateId: 'wrong' }, 'V2'), /候选/);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, sceneId: 'wrong' }, 'V2'), /场景/);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, viewport: { width: 1, height: 844 } }, 'V2'), /viewport/);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, referenceTarget: { ...target.referenceTarget, sha256: '0'.repeat(64) } }, 'V2'), /绑定/);
  put(repo, 'docs/visual-assets.json', { ...manifest, visualStage: 'V5' });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /阶段.*不匹配/);
  const bad = structuredClone(manifest);
  delete bad.scene_reconstruction_contract.reference_technical_conflicts;
  put(repo, 'docs/visual-assets.json', bad);
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /reference_technical_conflicts/);
  delete bad.visualStageModel;
  put(repo, 'docs/visual-assets.json', bad);
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /阶段语义标记/);
});

test('V2 不要求尚未生成的 V3 布局节点文件', (t) => {
  const { repo, work, target, manifest } = webFixture(t);
  const v1 = structuredClone(manifest);
  v1.scene_reconstruction_contract.layout_decomposition = {};
  put(repo, 'docs/visual-assets.json', v1);
  assert.equal(validateDomainTarget(repo, work, target, 'V2'), true);
});

test('公共 V3 不以结构 PASS 代替真实文件门且拒绝不存在的领域文件', (t) => {
  const { repo, work, target, manifest } = webFixture(t);
  put(repo, 'docs/visual-assets.json', { ...manifest, visualStage: 'V3', visualStageState: 'v3-production-planning-complete' });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V3'), /清单失败|文件不存在|未通过/);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, domainEvidenceRef: { path: 'docs/missing.json' } }, 'V3'), /不存在/);
  assert.throws(() => validateDomainTarget(repo, { ...work, stack: 'unknown' }, target, 'V2'), /不支持/);
});

test('未安装当前栈领域脚本时明确阻断而非跳过', (t) => {
  const { repo, work, target } = webFixture(t);
  const runtime = join(repo, 'isolated', 'skills', 'app-workflow-control', 'scripts', 'runtime');
  mkdirSync(runtime, { recursive: true });
  for (const name of ['domain-target-check.mjs', 'visual-confirmation-domain.mjs', 'io.mjs']) copyFileSync(resolve('skills/app-workflow-control/scripts/runtime', name), join(runtime, name));
  const moduleUrl = pathToFileURL(join(runtime, 'domain-target-check.mjs')).href;
  const script = `import {validateDomainTarget} from ${JSON.stringify(moduleUrl)}; const [repo,work,target]=JSON.parse(process.argv[1]); try {validateDomainTarget(repo,work,target,'V2'); process.exitCode=1;} catch(e) {process.stdout.write(e.message);}`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify([repo, work, target])], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /缺少 cocos 场景领域校验器/);
});

test('Phaser 与 Three.js 使用各自的实际 V2 合同，且不能跨候选冒充', (t) => {
  for (const [stack, makeManifest, makePng] of [['phaser', phaserManifest, phaserPng], ['threejs', threeManifest, threePng]]) {
    const repo = mkdtempSync(join(tmpdir(), `domain-target-${stack}-`));
    t.after(() => rmSync(repo, { recursive: true, force: true }));
    const manifest = makeManifest();
    manifest.visualStage = 'V2';
    manifest.visualStageState = 'in-progress';
    const targetPath = manifest.reference_target.original_file;
    const size = manifest.scene_reconstruction_contract.target_conditions.viewport;
    const image = makePng(size.width, size.height);
    const sha256 = createHash('sha256').update(image).digest('hex');
    const target = { targetId: 'view-1', candidateId: manifest.candidateVersion, sceneId: manifest.scene_reconstruction_contract.target_conditions.scene_id, stateId: manifest.scene_reconstruction_contract.target_conditions.state_id, viewport: size, referenceTarget: { path: targetPath, sha256 }, domainEvidenceRef: { path: 'docs/visual-assets.json' } };
    put(repo, targetPath, image);
    put(repo, 'docs/visual-assets.json', manifest);
    const work = { workItemId: manifest.workItemId, workItemType: 'SCENE', stack };
    assert.equal(validateDomainTarget(repo, work, target, 'V2'), true, stack);
    assert.throws(() => validateDomainTarget(repo, work, { ...target, candidateId: 'wrong' }, 'V2'), /候选/);
  }
});

/** Unity 原生响应式合同最小有效夹具，基于正式 Unity 合同字段。 */
function unityContract() {
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
    resize: { mode: 'reflow', events: ['resize'], sameProcess: true },
    orientation: { supported: ['landscape'], runtimeReflow: true },
    textLocalization: { programmatic: false },
    resourceResolution: { sourceScale: 1, runtimeScalePolicy: 'platform', platformMeasured: true },
    performanceBudget: { frameTimeMs: 16, uiDrawCalls: 80, renderTexturePixels: 1000, memoryMb: 100, degradationPolicy: 'tier' },
    representativeViewports: [{ id: 'a', width: 1920, height: 1080, orientation: 'landscape' }, { id: 'b', width: 1280, height: 720, orientation: 'landscape' }],
    requiredRuntimeEvidence: ['gameView', 'screen', 'backbuffer', 'canvasScalerOrPanelSettings', 'camera', 'screenSafeArea', 'inputHit', 'resizeOrientationTrajectory', 'screenshot', 'supportedOrientations'],
  };
}

test('Unity 使用真实响应式合同并拒绝错误包装或伪造原生运行记录', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'unity-domain-target-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const image = Buffer.from('冻结目标内容');
  const referenceTarget = { path: 'visual/target.png', sha256: createHash('sha256').update(image).digest('hex') };
  const target = { targetId: 'view-1', candidateId: 'c1', sceneId: 'Main', stateId: 'default', viewport: { width: 1920, height: 1080 }, referenceTarget, domainEvidenceRef: { path: 'docs/unity-domain.json' } };
  const work = { workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stack: 'unity' };
  const native = { schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: 'Main', stage: 'V2', status: 'IN_PROGRESS' }, responsiveContract: unityContract(), baselineHash: 'sha256:abc', revision: 0, objective: '场景验收', moduleIds: ['scene'], allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change', gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' } };
  const envelope = { ...target, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: 'docs/native-evidence.json' } };
  put(repo, referenceTarget.path, image);
  put(repo, 'docs/native-work.json', native);
  put(repo, target.domainEvidenceRef.path, envelope);
  assert.equal(validateDomainTarget(repo, work, target, 'V2'), true);
  assert.throws(() => validateDomainTarget(repo, work, { ...target, stateId: 'other' }, 'V2'), /stateId/);
  put(repo, 'docs/native-work.json', { ...native, projectId: 'another-project' });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /项目.*错绑/);
  const oldNative = { ...native };
  delete oldNative.visualStageModel;
  put(repo, 'docs/native-work.json', oldNative);
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /visualStageModel|语义标记/);
  put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, stage: 'V1' } });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V2'), /阶段错绑/);
  put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, stage: 'V3' } });
  put(repo, 'docs/native-evidence.json', { visualStageModel: 'function-first-v1', workItemId: 'WI-1', workItemType: 'SCENE', visualStage: 'V3', verdict: 'PASS', contractVersions: { responsiveContract: '1' } });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V3'), /未通过/);
  put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, stage: 'V5' } });
  put(repo, 'docs/native-evidence.json', { visualStageModel: 'function-first-v1', workItemId: 'WI-1', workItemType: 'SCENE', visualStage: 'V5', verdict: 'PASS', candidateId: 'c1', contractVersions: { responsiveContract: '1' } });
  assert.throws(() => validateDomainTarget(repo, work, target, 'V5'), /未通过/);
});

/** 构造结构合法的合成证据，验证字段及实际文件门，不代表真实运行验收。 */
function unityEvidence(stage, candidateId) {
  const evidence = {
    schemaVersion: '1.0', visualStageModel: 'function-first-v1', evidenceId: 'ev-1', workItemId: 'WI-1', packageId: 'pkg-1',
    workItemType: 'SCENE', visualStage: stage, contractVersions: { responsiveContract: 'unity-responsive/1.0' },
    baselineHash: 'sha256:abc', recordedAt: '2026-10-26T00:00:00.000Z', verdict: 'PASS',
    gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, { status: gate === 'F4' ? 'NOT_RUN' : 'PASS', summary: '合成夹具', evidenceRefs: [] }])),
    unityEvidence: { editorStable: 'PASS', compile: 'PASS', domainReload: 'PASS', console: 'PASS', scenePrefabImporterGuid: 'PASS' },
    candidateId, candidateVersion: 'version-1',
  };
  if (stage === 'V5') {
    const artifact = (source) => ({ source, measured: true, path: 'evidence/synthetic.bin' });
    evidence.responsiveEvidence = {
      gameView: artifact('GameView'), screen: artifact('Screen'), backbuffer: artifact('backbuffer'),
      canvasScaler: artifact('CanvasScaler'), camera: artifact('Camera'), screenshot: artifact('Screenshot'),
      safeArea: { source: 'Screen.safeArea', measured: true, rect: { x: 0, y: 0, width: 1920, height: 1080 } },
      inputHit: { system: 'InputSystem', eventSystem: 'EventSystem', hit: true, coordinates: { x: 1, y: 1 } },
      resizeOrientationTrajectory: { sameProcess: true, events: [{ type: 'resize' }, { type: 'resize' }] }, supportedOrientations: ['landscape'],
    };
    evidence.productionContractAudit = { status: 'PASS', contractVersion: '1', staticDeclarationOnly: false, buildOnly: false, singleScreenshotOnly: false };
    evidence.artExperienceAcceptanceRef = 'evidence/acceptance.json';
  }
  return evidence;
}

/** 写入 V5 美术验收所需的结构化测试材料；不把合成数据视为实际人工结论。 */
function putUnityArtFixture(repo, candidateId, target) {
  const budget = { brightnessContrast: 'test', screenCoverage: 'test', duration: 'test', triggerFrequency: 'test', maxConcurrent: 1, recovery: 'test', blendPolicy: 'test' };
  put(repo, 'evidence/brief.json', { schemaVersion: '1.0', projectId: 'p1', theme: 'test', audience: { facts: ['test'], assumptions: [] }, coreLoop: 'test', experienceGoals: ['test'], viewingContext: 'test', visualHierarchy: ['test'], intensityBudget: { normal: budget, operation: budget, peak: budget, measurementMethod: 'test' } });
  put(repo, 'evidence/synthetic.bin', Buffer.from('synthetic test artifact'));
  put(repo, 'evidence/synthetic.mp4', Buffer.from('synthetic test recording'));
  put(repo, 'evidence/acceptance.json', {
    schemaVersion: '1.0', workItemId: 'WI-1', candidateId, candidateVersion: 'version-1', sceneId: 'Main', artBriefRef: 'evidence/brief.json',
    qualityResults: Object.fromEntries(['themeFit', 'audienceFit', 'gameplayReadability', 'viewingComfort', 'artCompletion'].map((key) => [key, { status: 'PASS', reason: '合成夹具' }])),
    scenarios: [
      { id: 'normal-play', required: true, reason: '合成夹具', status: 'PASS', recordingPath: 'evidence/synthetic.mp4', durationSeconds: 10, startSeconds: 0, endSeconds: 10, eventCount: 1, peakConcurrency: 1, viewport: { width: 1920, height: 1080 }, targetId: target.targetId, stateId: target.stateId, referenceTarget: target.referenceTarget, observations: '合成夹具' },
      ...['repeated-feedback', 'event-peak', 'overlap-peak'].map((id) => ({ id, required: false, reason: '合成夹具', status: 'NOT_APPLICABLE' })),
    ], confirmedBy: 'test', confirmedAt: '2026-10-26T00:00:00.000Z', userMessageRef: 'test', userText: '合成夹具',
  });
}

test('Unity V3–V5 经领域门接受完整合同，并拒绝候选、场景和运行文件错绑', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'unity-domain-stages-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const image = Buffer.from('合成目标');
  const referenceTarget = { path: 'visual/target.png', sha256: createHash('sha256').update(image).digest('hex') };
  const target = { targetId: 'view-1', candidateId: 'c1', sceneId: 'Main', stateId: 'default', viewport: { width: 1920, height: 1080 }, referenceTarget, domainEvidenceRef: { path: 'docs/unity-domain.json' } };
  const work = { workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stack: 'unity' };
  const native = { schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: 'Main', stage: 'V2', status: 'IN_PROGRESS' }, responsiveContract: unityContract(), baselineHash: 'sha256:abc', revision: 0, objective: '场景验收', moduleIds: ['scene'], allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change', gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' } };
  put(repo, referenceTarget.path, image);
  put(repo, target.domainEvidenceRef.path, { ...target, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: 'docs/native-evidence.json' } });
  putUnityArtFixture(repo, target.candidateId, target);
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const schema = JSON.parse(readFileSync(new URL('../../skills/unity-development-workflow/schemas/art-experience-acceptance.schema.json', import.meta.url), 'utf8'));
  const validateAcceptance = ajv.compile(schema);
  const acceptance = JSON.parse(readFileSync(join(repo, 'evidence/acceptance.json'), 'utf8'));
  assert.equal(validateAcceptance(acceptance), true, JSON.stringify(validateAcceptance.errors));
  const incompleteAcceptance = structuredClone(acceptance);
  delete incompleteAcceptance.scenarios[0].stateId;
  assert.equal(validateAcceptance(incompleteAcceptance), false, '目标情境不得缺少状态绑定');
  for (const stage of ['V3', 'V4', 'V5']) {
    put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, stage } });
    const evidence = unityEvidence(stage, target.candidateId);
    put(repo, 'docs/native-evidence.json', evidence);
    assert.equal(validateDomainTarget(repo, work, target, stage), true, stage);
    put(repo, 'docs/native-evidence.json', { ...evidence, candidateId: 'other' });
    assert.throws(() => validateDomainTarget(repo, work, target, stage), /候选|candidateId/, stage);
    put(repo, 'docs/native-evidence.json', evidence);
    put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, sceneId: 'Other', stage } });
    assert.throws(() => validateDomainTarget(repo, work, target, stage), /场景|sceneId/, stage);
  }
  put(repo, 'docs/native-work.json', { ...native, scene: { ...native.scene, stage: 'V5' } });
  put(repo, 'docs/native-evidence.json', unityEvidence('V5', target.candidateId));
  // 包装字段与目标同时变化时，不能冒充已经人工验收过的运行情境。
  for (const changed of [{ ...target, stateId: 'other' }, { ...target, viewport: { width: 37, height: 41 } }]) {
    put(repo, target.domainEvidenceRef.path, { ...changed, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: 'docs/native-evidence.json' } });
    assert.throws(() => validateDomainTarget(repo, work, changed, 'V5'), /状态及运行视口/);
  }
  const alternative = Buffer.from('其他目标');
  put(repo, 'visual/other.png', alternative);
  const changedTarget = { ...target, referenceTarget: { path: 'visual/other.png', sha256: createHash('sha256').update(alternative).digest('hex') } };
  put(repo, target.domainEvidenceRef.path, { ...changedTarget, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: 'docs/native-evidence.json' } });
  assert.throws(() => validateDomainTarget(repo, work, changedTarget, 'V5'), /未绑定当前目标文件/);
  put(repo, target.domainEvidenceRef.path, { ...target, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: 'docs/native-evidence.json' } });
  const missing = unityEvidence('V5', target.candidateId);
  missing.responsiveEvidence.screen.path = 'evidence/missing.bin';
  put(repo, 'docs/native-evidence.json', missing);
  assert.throws(() => validateDomainTarget(repo, work, target, 'V5'), /不存在/);
});

/** 使用真实领域和公共合同校验器，构造两目标的合成合同数据。 */
function unityMultiFixture(t, stage) {
  const repo = mkdtempSync(join(tmpdir(), 'unity-multi-stages-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const save = (path, value) => {
    put(repo, path, value);
    return { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
  };
  save('evidence/quality.txt', Buffer.from('合成测试数据'));
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'PASS', evidenceRef: 'evidence/quality.txt' }));
  const work = { workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stack: 'unity', visual: { objectId: 'Main', targets: [] } };
  const native = { schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: 'WI-1', projectId: 'p1', workItemType: 'SCENE', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: 'Main', stage, status: 'IN_PROGRESS' }, responsiveContract: unityContract(), baselineHash: 'sha256:abc', revision: 0, objective: '测试', moduleIds: ['scene'], allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change', gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' } };
  save('docs/native-work.json', native);
  const manifest = { workItemId: work.workItemId, stack: work.stack, visualStage: 'V5', items: [] };
  const visualCategories = ['runtime-layout', 'runtime-interaction'];
  for (const id of ['left', 'right']) {
    const candidateId = `candidate-${id}`;
    const referenceTarget = save(`visual/${id}.png`, Buffer.from(`合成目标 ${id}`));
    const target = { targetId: id, candidateId, sceneId: 'Main', stateId: 'default', viewport: { width: 1920, height: 1080 }, scope: id, referenceTarget, domainEvidenceRef: { path: `docs/domain-${id}.json` }, reviews: {} };
    putUnityArtFixture(repo, candidateId, target);
    const acceptancePath = `evidence/acceptance-${id}.json`;
    copyFileSync(join(repo, 'evidence/acceptance.json'), join(repo, acceptancePath));
    const evidence = unityEvidence(stage, candidateId);
    if (stage === 'V5') evidence.artExperienceAcceptanceRef = acceptancePath;
    save(`docs/evidence-${id}.json`, evidence);
    save(target.domainEvidenceRef.path, { ...target, workItemId: work.workItemId, nativeWorkItemRef: { path: 'docs/native-work.json' }, nativeEvidenceRef: { path: `docs/evidence-${id}.json` } });
    const message = `synthetic-user-${id}`;
    target.assetReviewRef = save(`docs/assets-${id}.json`, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4', candidateId, technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: message, qualityChecks, assets: [{ assetId: id, assetType: 'image', output: referenceTarget.path, sourceRef: 'synthetic', sourceKind: 'hand-authored' }] });
    for (const [name, reviewStage, purpose] of [['V2', 'V2', 'target'], ['V3Decomposition', 'V3', 'decomposition'], ['V3Layout', 'V3', 'layout'], ['V4', 'V4', 'imported-assets'], ['V5', 'V5', 'runtime-acceptance']]) {
      const review = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: 'Main', targetId: id, candidateId, stage: reviewStage, purpose, decision: 'APPROVED', userMessageRef: message, referenceTarget, targetRef: referenceTarget.path, targetSha256: referenceTarget.sha256, ...(name === 'V2' ? { qualityChecks } : {}) };
      if (name === 'V3Layout') review.decompositionReviewRef = target.reviews.V3Decomposition;
      target.reviews[name] = save(`docs/review-${id}-${name}.json`, review);
    }
    work.visual.targets.push(target);
    for (const category of visualCategories) manifest.items.push({ category, status: 'PASS', targetId: id, path: 'evidence/synthetic.bin' });
  }
  const ids = work.visual.targets.map((target) => target.targetId);
  work.visual.coverageRef = save('docs/coverage.json', { workItemId: work.workItemId, sceneId: 'Main', status: 'CONFIRMED', userMessageRef: 'synthetic', targetIds: ids, targets: work.visual.targets.map(({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget }) => ({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget })) });
  work.visual.integrationEvidenceRef = save('docs/integration.json', { workItemId: work.workItemId, sceneId: 'Main', status: 'APPROVED', userMessageRef: 'synthetic', targetIds: ids });
  return { repo, work, manifest, options: { validateDomainTarget, validateAssetReview: assertAssetReview, manifest, visualCategories } };
}

test('Unity 多目标公共 V4 与 V5 执行真实领域和素材校验，缺失单目标证据则失败', (t) => {
  for (const stage of ['V4', 'V5']) {
    const f = unityMultiFixture(t, stage);
    assert.equal(validateMultiVisualStage(f.repo, f.work, stage, f.options).length, 2, stage);
    const bad = structuredClone(f.work);
    bad.visual.targets[1].domainEvidenceRef.path = bad.visual.targets[0].domainEvidenceRef.path;
    assert.throws(() => validateMultiVisualStage(f.repo, bad, stage, f.options), /绑定|targetId|candidateId/, stage);
    if (stage === 'V5') {
      f.manifest.items = f.manifest.items.filter((item) => !(item.targetId === 'right' && item.category === 'runtime-interaction'));
      assert.throws(() => validateMultiVisualStage(f.repo, f.work, stage, f.options), /right 缺少 V5 运行证据/);
    } else {
      delete bad.visual.targets[1].reviews.V4;
      bad.visual.targets[1].domainEvidenceRef = f.work.visual.targets[1].domainEvidenceRef;
      assert.throws(() => validateMultiVisualStage(f.repo, bad, stage, f.options), /缺少 V4 确认/);
    }
  }
});
