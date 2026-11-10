/** 使用 Unity 合成协议材料验证两批增量复用；不会启动编辑器或代表真实人工验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { initializeWork, loadWork, advanceVisual, transitionWork, completeUnit, inspectVisualReuseSource } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

const controller = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
const dimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

/** 写入隔离项目的合成文件并冻结其内容身份。 */
function put(repo, path, value) {
  const full = join(repo, ...path.split('/'));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof value === 'string' ? value : JSON.stringify(value));
  return { path, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') };
}

/** 创建在系统临时根中的独占目录，并在清理前核验真实绝对路径。 */
function temporaryProject(t) {
  const root = realpathSync(tmpdir());
  const repo = mkdtempSync(join(root, 'incremental-visual-cli-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), root);
    assert.ok(basename(actual).startsWith('incremental-visual-cli-'));
    rmSync(actual, { recursive: true, force: true });
  });
  return repo;
}

/** 建立真实合成质量记录，供视觉基线、目标和素材复用。 */
function quality(repo) {
  const evidence = put(repo, 'proof/quality.txt', '合成人工判断记录');
  return dimensions.map((dimension) => ({ dimension, status: 'PASS', evidenceRef: evidence.path }));
}

/** 提供通过 Unity 原生领域入口的响应式合同，内容仅是测试夹具。 */
function responsiveContract() {
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
    textLocalization: { programmatic: false }, resourceResolution: { sourceScale: 1, runtimeScalePolicy: 'platform', platformMeasured: true },
    performanceBudget: { frameTimeMs: 16, uiDrawCalls: 80, renderTexturePixels: 1000, memoryMb: 100, degradationPolicy: 'tier' },
    representativeViewports: [{ id: 'a', width: 1920, height: 1080, orientation: 'landscape' }, { id: 'b', width: 1280, height: 720, orientation: 'landscape' }],
    requiredRuntimeEvidence: ['gameView', 'screen', 'backbuffer', 'canvasScalerOrPanelSettings', 'camera', 'screenSafeArea', 'inputHit', 'resizeOrientationTrajectory', 'screenshot', 'supportedOrientations'],
  };
}

/** 写入当前工作项的 Unity 目标领域包装及合成运行材料。 */
function nativeDomain(repo, work, target, stage) {
  const prefix = `proof/${work.workItemId}-${target.targetId}-${stage}`;
  const native = { schemaVersion: '1.0', visualStageModel: 'function-first-v1', workItemId: work.workItemId, projectId: work.projectId, workItemType: 'SCENE', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: 'Main', stage, status: 'IN_PROGRESS' }, responsiveContract: responsiveContract(), baselineHash: 'sha256:abc', revision: 0, objective: '合成测试', moduleIds: ['scene'], allowedPaths: ['Assets/**'], forbiddenPaths: ['Library/**'], allowedActions: ['unity-code-change'], actionLevel: 'A3', actionType: 'unity-code-change', gateStatus: { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' } };
  const nativeRef = put(repo, `${prefix}-native.json`, native);
  const evidence = { schemaVersion: '1.0', visualStageModel: 'function-first-v1', evidenceId: 'ev-1', workItemId: work.workItemId, packageId: 'pkg-1', workItemType: 'SCENE', visualStage: stage, contractVersions: { responsiveContract: 'unity-responsive/1.0' }, baselineHash: 'sha256:abc', recordedAt: '2026-10-26T00:00:00.000Z', verdict: 'PASS', gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, { status: gate === 'F4' ? 'NOT_RUN' : 'PASS', summary: '合成夹具', evidenceRefs: [] }])), unityEvidence: { editorStable: 'PASS', compile: 'PASS', domainReload: 'PASS', console: 'PASS', scenePrefabImporterGuid: 'PASS' }, candidateId: target.candidateId };
  if (stage === 'V5') {
    const artifact = (source) => ({ source, measured: true, path: 'proof/synthetic.bin' });
    evidence.responsiveEvidence = { gameView: artifact('GameView'), screen: artifact('Screen'), backbuffer: artifact('backbuffer'), canvasScaler: artifact('CanvasScaler'), camera: artifact('Camera'), screenshot: artifact('Screenshot'), safeArea: { source: 'Screen.safeArea', measured: true, rect: { x: 0, y: 0, width: 1920, height: 1080 } }, inputHit: { system: 'InputSystem', eventSystem: 'EventSystem', hit: true, coordinates: { x: 1, y: 1 } }, resizeOrientationTrajectory: { sameProcess: true, events: [{ type: 'resize' }, { type: 'resize' }] }, supportedOrientations: ['landscape'] };
    evidence.productionContractAudit = { status: 'PASS', contractVersion: '1', staticDeclarationOnly: false, buildOnly: false, singleScreenshotOnly: false };
  }
  const evidenceRef = put(repo, `${prefix}-evidence.json`, evidence);
  const envelope = { workItemId: work.workItemId, targetId: target.targetId, candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId, viewport: target.viewport, referenceTarget: target.referenceTarget, nativeWorkItemRef: { path: nativeRef.path }, nativeEvidenceRef: { path: evidenceRef.path } };
  target.domainEvidenceRef = { path: put(repo, `${prefix}-domain.json`, envelope).path };
}

/** 将合成的用户确认与实际测试材料绑定，V3 布局始终引用本目标拆解。 */
function addReview(repo, work, target, name) {
  const [stage, purpose] = { V2: ['V2', 'target'], V3Decomposition: ['V3', 'decomposition'], V3Layout: ['V3', 'layout'], V4: ['V4', 'imported-assets'], V5: ['V5', 'runtime-acceptance'] }[name];
  const record = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: 'Main', targetId: target.targetId, candidateId: target.candidateId, stage, purpose, decision: 'APPROVED', userMessageRef: `synthetic-${work.workItemId}-${target.targetId}`, referenceTarget: target.referenceTarget, targetRef: target.referenceTarget.path, targetSha256: target.referenceTarget.sha256, ...(name === 'V2' ? { qualityChecks: quality(repo) } : {}), ...(name === 'V3Layout' ? { decompositionReviewRef: target.reviews.V3Decomposition } : {}) };
  target.reviews[name] = put(repo, `proof/${work.workItemId}-${target.targetId}-${name}.json`, record);
}

/** 构造正式候选绑定所需的模拟美术记录和目标素材评审。 */
function addAssetsAndArt(repo, work, target) {
  const userMessageRef = `synthetic-${work.workItemId}-${target.targetId}`;
  target.assetReviewRef = put(repo, `proof/${work.workItemId}-${target.targetId}-assets.json`, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4', candidateId: target.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef, qualityChecks: quality(repo), assets: [{ assetId: target.targetId, assetType: 'image', output: target.referenceTarget.path, sourceRef: 'synthetic', sourceKind: 'hand-authored' }] });
  const budget = { brightnessContrast: 'test', screenCoverage: 'test', duration: 'test', triggerFrequency: 'test', maxConcurrent: 1, recovery: 'test', blendPolicy: 'test' };
  const brief = put(repo, `proof/${work.workItemId}-brief.json`, { schemaVersion: '1.0', projectId: work.projectId, theme: 'test', audience: { facts: ['test'], assumptions: [] }, coreLoop: 'test', experienceGoals: ['test'], viewingContext: 'test', visualHierarchy: ['test'], intensityBudget: { normal: budget, operation: budget, peak: budget, measurementMethod: 'test' } });
  put(repo, 'proof/synthetic.bin', '合成运行文件');
  const recording = put(repo, 'proof/synthetic.mp4', '合成运行视频');
  const acceptance = { schemaVersion: '1.0', workItemId: work.workItemId, candidateId: target.candidateId, candidateVersion: 'version-1', sceneId: 'Main', artBriefRef: brief.path, qualityResults: Object.fromEntries(['themeFit', 'audienceFit', 'gameplayReadability', 'viewingComfort', 'artCompletion'].map((key) => [key, { status: 'PASS', reason: '合成夹具' }])), scenarios: [{ id: 'normal-play', required: true, reason: '合成夹具', status: 'PASS', recordingPath: recording.path, durationSeconds: 10, startSeconds: 0, endSeconds: 10, eventCount: 1, peakConcurrency: 1, viewport: target.viewport, targetId: target.targetId, stateId: target.stateId, referenceTarget: target.referenceTarget, observations: '合成夹具' }, ...['repeated-feedback', 'event-peak', 'overlap-peak'].map((id) => ({ id, required: false, reason: '合成夹具', status: 'NOT_APPLICABLE' }))], confirmedBy: 'test', confirmedAt: '2026-10-26T00:00:00.000Z', userMessageRef: 'synthetic', userText: '合成夹具' };
  return put(repo, `${work.evidenceRoot}/art-${target.targetId}.json`, acceptance).path;
}

/** 将声明的全部场景目标冻结为本工作项的累计范围。 */
function saveCoverage(repo, work) {
  const targetIds = work.visual.targets.map((target) => target.targetId);
  const targets = work.visual.targets.map(({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget }) => ({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget }));
  work.visual.coverageRef = put(repo, `proof/${work.workItemId}-coverage.json`, { workItemId: work.workItemId, sceneId: 'Main', status: 'CONFIRMED', userMessageRef: 'synthetic-coverage', targetIds, targets });
  work.visual.integrationEvidenceRef = put(repo, `proof/${work.workItemId}-integration.json`, { workItemId: work.workItemId, sceneId: 'Main', status: 'APPROVED', userMessageRef: 'synthetic-integration', targetIds });
}

/** 创建有效全局基线，三候选和人工记录均仅服务隔离测试。 */
function baseline(repo, work) {
  const checks = quality(repo);
  const candidates = ['a', 'b', 'c'].map((id) => ({ candidateId: id, path: put(repo, `baseline/${id}.txt`, `合成候选 ${id}`).path, qualityChecks: id === 'a' ? checks : dimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })) }));
  const selected = put(repo, candidates[0].path, '合成候选 a');
  const review = put(repo, 'baseline/review.json', { schemaVersion: '1.0', objectId: 'baseline-a', candidateId: 'a', stage: 'BASELINE', purpose: 'visual-baseline', decision: 'APPROVED', userMessageRef: 'synthetic', targetRef: selected.path, targetSha256: selected.sha256, qualityChecks: checks });
  return put(repo, 'baseline/global.json', { schemaVersion: '1.0', baselineId: 'baseline-a', projectId: work.projectId, stack: work.stack, candidates, selectedCandidateId: 'a', selectionReviewRef: review });
}

/** 构造工作项的有序实施和输出，使用真实 Node 版本命令作为测试命令。 */
async function runStage(repo, path, stage, extraItems = []) {
  let work = loadWork(repo, path);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = 'PASS'; work.gateStatus.F1 = 'PASS'; work.gateStatus.F2 = 'PASS';
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-${stage}.json`;
  const unit = { unitId: `unit-${stage}`, sequence: 1, type: 'SCENE', owner: 'synthetic-test', paths: ['Assets/Main.unity', ...(stage === 'V1' ? [`Assets/Scripts/${work.workItemId}.cs`] : [])], resultPath: `${work.evidenceRoot}/unit-${stage}.json`, acceptanceCommands: ['node --version'] };
  const pack = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: 'SCENE', visualStage: stage, executionUnits: [unit] };
  put(repo, packPath, pack);
  const manifestPath = `${work.evidenceRoot}/manifest-${stage}.json`;
  const items = ['compile', 'tests'].map((category) => ({ category, status: 'PASS', path: put(repo, `${work.evidenceRoot}/${stage}-${category}.txt`, '合成工程证据').path }));
  if (stage === 'V4') items.push({ category: 'asset-import', status: 'PASS', path: put(repo, `${work.evidenceRoot}/${stage}-asset.txt`, '合成资源导入证据').path });
  if (stage === 'V5') for (const target of work.visual.targets) for (const category of ['runtime-layout', 'runtime-interaction', 'asset-import']) items.push({ category, status: 'PASS', targetId: target.targetId, path: put(repo, `${work.evidenceRoot}/${stage}-${target.targetId}-${category}.txt`, '合成运行证据').path });
  put(repo, manifestPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, visualStage: stage, items: [...items, ...extraItems] });
  work.implementationPackageRef = { path: packPath };
  work.evidenceRef = { path: manifestPath };
  put(repo, path, work);
  await transitionWork({ repo, workItem: path, to: 'IMPLEMENTING', args: {} });
  const run = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(run.status, 0, run.stderr);
  const outputFile = put(repo, `${work.evidenceRoot}/node-version.txt`, run.stdout).path;
  put(repo, unit.resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, unitId: unit.unitId, sequence: 1, exitCode: 0, files: unit.paths, commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile }] });
  await completeUnit({ repo, workItem: path, resultPath: unit.resultPath });
  work = loadWork(repo, path); work.gateStatus.F3 = 'PASS'; put(repo, path, work);
  await transitionWork({ repo, workItem: path, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: path, to: 'PASSED', args: {} });
}

/** 以真实状态迁移完成当前场景的 V1，并冻结功能基线。 */
async function runV1(repo, path, content) {
  let work = loadWork(repo, path);
  work.globalState = 'REVIEW'; work.gateStatus.F0 = 'PASS'; work.gateStatus.F1 = 'PASS';
  put(repo, path, work);
  await advanceVisual({ repo, workItem: path, to: 'V1' });
  put(repo, 'Assets/Main.unity', content);
  put(repo, `Assets/Scripts/${work.workItemId}.cs`, '// 合成测试功能源码');
  await runStage(repo, path, 'V1');
  await advanceVisual({ repo, workItem: path, to: 'V2' });
}

/** 创建独立工作项的合成场景目标。 */
function makeTarget(repo, id) {
  return { targetId: id, candidateId: `candidate-${id}`, sceneId: 'Main', stateId: `state-${id}`, viewport: { width: 1920, height: 1080 }, scope: id, referenceTarget: put(repo, `targets/${id}.png`, `合成目标 ${id}`), reviews: {} };
}

/** 设置当前视觉阶段的原生包装、素材及确认；复用的 V2/V3 原记录由调用方保留。 */
function stageTargets(repo, work, stage, { inherited = [] } = {}) {
  const extras = [];
  for (const target of work.visual.targets) {
    nativeDomain(repo, work, target, stage);
    if (!inherited.includes(target.targetId)) {
      if (stage === 'V2') addReview(repo, work, target, 'V2');
      if (stage === 'V3') { addReview(repo, work, target, 'V3Decomposition'); addReview(repo, work, target, 'V3Layout'); }
    }
    if (stage === 'V4' || stage === 'V5') {
      const art = addAssetsAndArt(repo, work, target);
      if (stage === 'V4') addReview(repo, work, target, 'V4');
      if (stage === 'V5') { addReview(repo, work, target, 'V5'); extras.push({ category: 'art-experience-acceptance', status: 'PASS', targetId: target.targetId, path: art }); }
    }
  }
  saveCoverage(repo, work);
  return extras;
}

test('同一正式场景两批通过真实 CLI 与累计 V2/V3 复用，修改共享源后历史确认仍可追溯', async (t) => {
  const repo = temporaryProject(t);
  const init = async (id) => (await initializeWork({ repo, args: { id, stack: 'unity', type: 'SCENE', objective: '合成场景测试', 'project-id': 'p1', 'object-id': 'Main' } })).metadata.workItemPath;
  const sourcePath = await init('first');
  await runV1(repo, sourcePath, '首批场景源码');
  let source = loadWork(repo, sourcePath);
  source.globalVisualBaselineRef = baseline(repo, source);
  source.visual.targets = [makeTarget(repo, 'old')];
  stageTargets(repo, source, 'V2'); put(repo, sourcePath, source);
  await advanceVisual({ repo, workItem: sourcePath, to: 'V3' });
  source = loadWork(repo, sourcePath); stageTargets(repo, source, 'V3'); put(repo, sourcePath, source);
  await advanceVisual({ repo, workItem: sourcePath, to: 'V4' });
  source = loadWork(repo, sourcePath); stageTargets(repo, source, 'V4'); put(repo, sourcePath, source);
  await runStage(repo, sourcePath, 'V4');
  await advanceVisual({ repo, workItem: sourcePath, to: 'V5' });
  source = loadWork(repo, sourcePath); const sourceExtras = stageTargets(repo, source, 'V5'); put(repo, sourcePath, source);
  await runStage(repo, sourcePath, 'V5', sourceExtras);
  await transitionWork({ repo, workItem: sourcePath, to: 'COMPLETE', args: {} });
  source = loadWork(repo, sourcePath);

  const targetPath = await init('second');
  await runV1(repo, targetPath, '第二批修改同一正式场景');
  assert.equal(inspectVisualReuseSource(repo, source).status, 'PASS');
  let current = loadWork(repo, targetPath);
  const old = structuredClone(source.visual.targets[0]); old.reviews = {}; delete old.assetReviewRef;
  const added = makeTarget(repo, 'new');
  current.visual.targets = [old, added];
  for (const target of current.visual.targets) nativeDomain(repo, current, target, 'V2');
  put(repo, targetPath, current);

  const args = [controller, 'reuse-visual', '--repo', repo, '--work-item', targetPath, '--source-work-item', sourcePath, '--impact', 'implementation', '--reason', '合成未变化目标', '--target-ids', 'old'];
  const baselinePath = source.visual.functionBaselineRef.path;
  const snapshot = JSON.parse(readFileSync(join(repo, baselinePath), 'utf8'));
  const planPath = snapshot.work.implementationPackageRef.path;
  const plan = JSON.parse(readFileSync(join(repo, planPath), 'utf8'));
  const result = JSON.parse(readFileSync(join(repo, plan.executionUnits[0].resultPath), 'utf8'));
  const logPath = result.commandOutputs[0].outputFile;
  const originalTarget = readFileSync(join(repo, targetPath));
  // 共享业务场景可增量修改，但历史基线、V1 计划及真实命令输出必须保持原始身份。
  for (const [path, action] of [[baselinePath, 'delete'], [baselinePath, 'alter'], [planPath, 'alter'], [logPath, 'alter']]) {
    const full = join(repo, path);
    const original = readFileSync(full);
    try {
      if (action === 'delete') rmSync(full);
      else writeFileSync(full, Buffer.concat([original, Buffer.from('\n') ]));
      const rejected = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
      assert.notEqual(rejected.status, 0, `${path} 被${action}后仍允许复用`);
      assert.deepEqual(readFileSync(join(repo, targetPath)), originalTarget, '拒绝复用时不得修改目标工作项');
    } finally {
      writeFileSync(full, original);
    }
  }
  // 保留正式场景和视觉确认，只更名来源 V1 的独立功能源码。
  renameSync(join(repo, 'Assets/Scripts/first.cs'), join(repo, 'Assets/Scripts/first-renamed.cs'));
  assert.equal(inspectVisualReuseSource(repo, source).status, 'PASS');
  const cli = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).status, 'PASS');
  current = loadWork(repo, targetPath);
  assert.equal(current.visual.stage, 'V2');
  assert.deepEqual(current.visual.reuse.targetIds, ['old']);
  assert.equal(current.visual.targets[0].reviews.V2.path, source.visual.targets[0].reviews.V2.path);
  assert.equal(current.visual.coverageRef, undefined);
  await assert.rejects(advanceVisual({ repo, workItem: targetPath, to: 'V3' }), /缺少 V2 确认/);
  addReview(repo, current, current.visual.targets[1], 'V2'); saveCoverage(repo, current); put(repo, targetPath, current);
  await advanceVisual({ repo, workItem: targetPath, to: 'V3' });
  current = loadWork(repo, targetPath); stageTargets(repo, current, 'V3', { inherited: ['old'] }); put(repo, targetPath, current);
  await advanceVisual({ repo, workItem: targetPath, to: 'V4' });
  current = loadWork(repo, targetPath); stageTargets(repo, current, 'V4', { inherited: ['old'] }); put(repo, targetPath, current);
  await runStage(repo, targetPath, 'V4');
  await advanceVisual({ repo, workItem: targetPath, to: 'V5' });
  current = loadWork(repo, targetPath); const targetExtras = stageTargets(repo, current, 'V5', { inherited: ['old'] }); put(repo, targetPath, current);
  await runStage(repo, targetPath, 'V5', targetExtras);
  await transitionWork({ repo, workItem: targetPath, to: 'COMPLETE', args: {} });
  assert.equal(loadWork(repo, targetPath).globalState, 'COMPLETE');
});
