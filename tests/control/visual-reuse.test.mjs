import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { assertVisualReuse, resolveReuseOwner, validateSceneReuseCoverage, validateSceneReuseReview } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse-binding.mjs';
import { assertVisualReview } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { advanceVisual, assertFunctionBaseline, completeUnit, initializeWork, inspectWork, loadWork, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { writeSingleDomainFixture } from './single-domain-fixture.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';

const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];
const expectedReviews = {
  implementation: ['V2', 'V3Decomposition', 'V3Layout'],
  assets: ['V2', 'V3Decomposition', 'V3Layout'],
  layout: ['V2', 'V3Decomposition'],
  target: [],
};
const expectedStages = { implementation: 'V3', assets: 'V3', layout: 'V2', target: 'V2' };

/** 创建隔离的合成协议夹具；夹具记录不代表真实用户审阅或视觉验收。 */
async function createFixture({ id, stack = 'flutter', type = 'PAGE', projectId = 'project-a', objectId = 'object-a', hostId, layerType } = {}) {
  const repo = await mkdtemp(resolve(tmpdir(), 'visual-reuse-'));
  const args = { id, stack, type, objective: `验证 ${id} 的视觉控制协议`, 'project-id': projectId, 'object-id': objectId };
  if (type === 'DISPLAY_LAYER') Object.assign(args, { 'host-id': hostId ?? 'host-a', 'layer-type': layerType ?? 'modal' });
  const result = await initializeWork({ repo, args });
  return { repo, workPath: result.metadata.workItemPath };
}

/** 写入合成测试材料，验证项目内相对路径约束与读取流程。 */
async function put(repo, path, content = '合成协议测试材料\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return path;
}

/** 序列化 Work Item 或人工记录等 JSON 测试材料。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 冻结单目标审阅涉及的画面内容，保持来源确认可复核。 */
async function putVisualReview(repo, path, review, workItemId, targetPath, decompositionPath) {
  const identity = async (value) => ({ path: value, sha256: createHash('sha256').update(await readFile(resolve(repo, ...value.split('/')))).digest('hex') });
  const target = await identity(review.targetRef);
  return putJson(repo, path, { ...review, workItemId, targetId: review.objectId, targetSha256: target.sha256, referenceTarget: await identity(targetPath),
    ...(decompositionPath ? { decompositionReviewRef: await identity(decompositionPath) } : {}) });
}

/** 冻结人工确认记录内容，避免原路径被替换后沿用旧确认。 */
async function frozenReview(repo, path) {
  return { path, sha256: createHash('sha256').update(await readFile(resolve(repo, ...path.split('/')))).digest('hex') };
}

/** 为一项合成审阅生成非空的五维校验文件。 */
async function qualityChecks(repo, prefix) {
  const checks = [];
  for (const [index, dimension] of qualityDimensions.entries()) {
    const evidenceRef = `${prefix}/${index}-${dimension}.txt`;
    await put(repo, evidenceRef, `${dimension} 合成测试证据\n`);
    checks.push({ dimension, status: 'PASS', evidenceRef });
  }
  return checks;
}

/** 构造只用于控制器合同的人工记录形状，不伪装成真实审批。 */
function humanRecord({ objectId, stage, purpose, candidateId, targetRef, userMessageRef, checks, hostId, layerType, runtimeContextRef }) {
  return {
    schemaVersion: '1.0', objectId, candidateId, stage, purpose,
    decision: 'APPROVED', userMessageRef,
    ...(targetRef ? { targetRef } : {}), ...(checks ? { qualityChecks: checks } : {}),
    ...(hostId ? { hostId, layerType } : {}), ...(runtimeContextRef ? { runtimeContextRef } : {}),
  };
}

/** 经实际执行与状态迁移建立可复验的 V1 功能基线，不依赖正式视觉或其他场景。 */
async function prepareFunctionalStage(repo, workPath, { deliveryPath } = {}) {
  let work = loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V1' });
  work = loadWork(repo, workPath);
  work.gateStatus.F2 = 'PASS';
  const profile = loadProfile(repo, work.stack);
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-function.json`;
  const outputFile = `${work.evidenceRoot}/function-command.txt`;
  const unit = { unitId: 'function', sequence: 1, type: work.workItemType, owner: 'test-fixture', paths: [deliveryPath ?? `lib/function-${work.workItemId}.dart`], resultPath: `${work.evidenceRoot}/function-result.json`, acceptanceCommands: ['node --version'] };
  await put(repo, unit.paths[0], `功能夹具 ${work.workItemId}\n`);
  await putJson(repo, packPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType, visualStage: 'V1', executionUnits: [unit] });
  const items = [];
  for (const category of profile.evidenceRequirements.engineering) {
    const path = `${work.evidenceRoot}/function-${category}.txt`;
    await put(repo, path, `${category} 合成测试证据\n`);
    items.push({ category, status: 'PASS', path });
  }
  const evidencePath = `${work.evidenceRoot}/function-manifest.json`;
  await putJson(repo, evidencePath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, visualStage: 'V1', items });
  work.implementationPackageRef = { path: packPath };
  work.evidenceRef = { path: evidencePath };
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const result = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  await put(repo, outputFile, result.stdout);
  await putJson(repo, unit.resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, unitId: unit.unitId, sequence: unit.sequence, exitCode: result.status, files: [...unit.paths], commandOutputs: [{ command: 'node --version', exitCode: result.status, outputFile }], ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {}) });
  await completeUnit({ repo, workItem: workPath, resultPath: unit.resultPath });
  work = loadWork(repo, workPath);
  work.gateStatus.F3 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  await advanceVisual({ repo, workItem: workPath, to: 'V2' });
}

/** 为来源构造完整的合成 V5 材料，覆盖真实校验器读取的绑定字段。 */
async function completeVisualSource(fixture, { regression = false } = {}) {
  await prepareFunctionalStage(fixture.repo, fixture.workPath, regression ? { deliveryPath: 'lib/fixture.dart' } : {});
  const work = loadWork(fixture.repo, fixture.workPath);
  const baseChecks = await qualityChecks(fixture.repo, 'proof/baseline');
  const candidates = [];
  for (const candidateId of ['direction-a', 'direction-b', 'direction-c']) {
    const path = await put(fixture.repo, `proof/candidates/${candidateId}.txt`, `${candidateId} 合成候选\n`);
    candidates.push({
      candidateId, path,
      qualityChecks: candidateId === 'direction-a' ? baseChecks : qualityDimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })),
    });
  }
  const baselineReviewPath = '.workflow-control/reviews/baseline-review.json';
  const baselineTarget = candidates[0].path;
  const baselineSha256 = createHash('sha256').update(await readFile(resolve(fixture.repo, baselineTarget))).digest('hex');
  await putJson(fixture.repo, baselineReviewPath, { ...humanRecord({
    objectId: 'baseline-a', candidateId: 'direction-a', stage: 'BASELINE', purpose: 'visual-baseline',
    userMessageRef: 'test-message://baseline', checks: baseChecks,
  }), targetRef: baselineTarget, targetSha256: baselineSha256 });
  const baselinePath = '.workflow-control/visual/global-baseline.json';
  await putJson(fixture.repo, baselinePath, {
    schemaVersion: '1.0', baselineId: 'baseline-a', projectId: work.projectId, stack: work.stack,
    candidates, selectedCandidateId: 'direction-a', selectionReviewRef: await frozenReview(fixture.repo, baselineReviewPath),
  });

  work.globalState = 'REVIEW';
  work.globalVisualBaselineRef = await frozenReview(fixture.repo, baselinePath);
  work.visual.stage = 'V5';
  work.visual.candidateId = 'direction-a';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };

  const targetRef = await put(fixture.repo, 'proof/target.txt', 'V2 合成目标\n');
  const layerContext = work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {};
  const v1Checks = await qualityChecks(fixture.repo, 'proof/v1');
  const v1Path = '.workflow-control/reviews/v1.json';
  await putVisualReview(fixture.repo, v1Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target',
    targetRef, userMessageRef: 'test-message://v1', checks: v1Checks, ...layerContext,
  }), work.workItemId, targetRef);
  work.visual.reviews.V2 = await frozenReview(fixture.repo, v1Path);

  const decompositionRef = await put(fixture.repo, 'proof/decomposition.txt', 'V3 合成拆解\n');
  const decompositionPath = '.workflow-control/reviews/v2-decomposition.json';
  await putVisualReview(fixture.repo, decompositionPath, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V3', purpose: 'decomposition',
    targetRef: decompositionRef, userMessageRef: 'test-message://v2-decomposition', ...layerContext,
  }), work.workItemId, targetRef);
  work.visual.reviews.V3Decomposition = await frozenReview(fixture.repo, decompositionPath);

  const layoutRef = await put(fixture.repo, 'proof/layout.txt', 'V3 合成布局\n');
  const layoutPath = '.workflow-control/reviews/v2-layout.json';
  await putVisualReview(fixture.repo, layoutPath, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V3', purpose: 'layout',
    targetRef: layoutRef, userMessageRef: 'test-message://v2-layout', ...layerContext,
  }), work.workItemId, targetRef, decompositionPath);
  work.visual.reviews.V3Layout = await frozenReview(fixture.repo, layoutPath);

  const v3Path = '.workflow-control/reviews/v3-imported-assets.json';
  await putJson(fixture.repo, v3Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V4', purpose: 'imported-assets',
    userMessageRef: 'test-message://assets', ...layerContext,
  }));
  work.visual.reviews.V4 = await frozenReview(fixture.repo, v3Path);
  const v4Path = '.workflow-control/reviews/v4-runtime.json';
  const runtimeRef = await put(fixture.repo, 'proof/runtime.txt', 'V5 合成运行画面\n');
  let runtimeContextRef;
  if (work.workItemType === 'DISPLAY_LAYER') {
    const evidenceRef = await frozenReview(fixture.repo, runtimeRef);
    const contextPath = '.workflow-control/evidence/layer-runtime-context.json';
    await putJson(fixture.repo, contextPath, {
      schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId,
      ...layerContext, interactions: [
        { action: 'open', status: 'PASS', evidenceRef },
        { action: 'close', status: 'PASS', evidenceRef },
        { action: 'focus-restore', status: 'NOT_APPLICABLE', reason: '合成测试层不占用焦点' },
      ],
    });
    runtimeContextRef = await frozenReview(fixture.repo, contextPath);
  }
  await putVisualReview(fixture.repo, v4Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V5', purpose: 'runtime-acceptance',
    userMessageRef: 'test-message://v4', targetRef: runtimeRef, ...layerContext, runtimeContextRef,
  }), work.workItemId, targetRef);
  work.visual.reviews.V5 = await frozenReview(fixture.repo, v4Path);
  await writeSingleDomainFixture(fixture.repo, work, 'V5');

  const assetChecks = await qualityChecks(fixture.repo, 'proof/assets');
  const componentOutput = await put(fixture.repo, 'proof/final-component.txt', '合成原生组件文件\n');
  const componentEvidence = await put(fixture.repo, 'proof/component-check.txt', '合成组件导入检查\n');
  const assetReviewPath = '.workflow-control/reviews/assets.json';
  await putJson(fixture.repo, assetReviewPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4',
    candidateId: work.visual.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS',
    userMessageRef: 'test-message://assets', qualityChecks: assetChecks,
    assets: [{ assetId: 'component-a', assetType: 'native-component', output: componentOutput, componentEvidenceRef: componentEvidence }],
  });
  work.assetReviewRef = await frozenReview(fixture.repo, assetReviewPath);

  const profile = loadProfile(fixture.repo, work.stack);
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-v4.json`;
  const unit = {
    unitId: 'unit-v4', sequence: 1, type: work.workItemType, owner: 'test-fixture',
    paths: ['lib/fixture.dart'], resultPath: `${work.evidenceRoot}/unit-result.json`, acceptanceCommands: ['node --version'],
  };
  await putJson(fixture.repo, packPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType,
    visualStage: 'V5', executionUnits: [unit],
  });
  work.implementationPackageRef = { path: packPath };
  const items = [];
  for (const category of [...profile.evidenceRequirements.engineering, ...profile.evidenceRequirements.visual]) {
    const path = `${work.evidenceRoot}/v4-${category}.txt`;
    await put(fixture.repo, path, `${category} 合成测试证据\n`);
    items.push({ category, status: 'PASS', path });
  }
  const evidencePath = `.workflow-control/evidence/${work.workItemId}/v4-manifest.json`;
  await putJson(fixture.repo, evidencePath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, visualStage: 'V5', items: regression ? items.filter((item) => profile.evidenceRequirements.engineering.includes(item.category)) : items,
  });
  work.evidenceRef = { path: evidencePath };
  await putJson(fixture.repo, fixture.workPath, work);

  // 使用正式状态迁移和 unit-check 接口生成执行状态；命令输出仍是协议测试夹具。
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  const outputFile = `${work.evidenceRoot}/command-unit-v4-1.txt`;
  await put(fixture.repo, unit.paths[0], '合成实施单元产物\n');
  await put(fixture.repo, outputFile, 'exitCode=0\nnode --version\n');
  await putJson(fixture.repo, unit.resultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, unitId: unit.unitId, sequence: unit.sequence,
    exitCode: 0, files: [...unit.paths],
    commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile }],
    ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {}),
  });
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: unit.resultPath });
  const implementing = loadWork(fixture.repo, fixture.workPath);
  implementing.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, implementing);
  if (regression) {
    // 功能验证先完成，视觉材料与新的人工运行确认随后独立登记。
    const specPath = 'proof/local-regression.json';
    await putJson(fixture.repo, specPath, { visualImpact: 'none', reason: '正式布局后重验功能', localRegression: true });
    await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath });
    const current = loadWork(fixture.repo, fixture.workPath);
    const nextReviewPath = '.workflow-control/reviews/v5-revalidated-runtime.json';
    await putVisualReview(fixture.repo, nextReviewPath, humanRecord({ objectId: current.visual.objectId, candidateId: current.visual.candidateId, stage: 'V5', purpose: 'runtime-acceptance', userMessageRef: 'test-message://new-v5', targetRef: runtimeRef }), current.workItemId, targetRef);
    current.visual.reviews.V5 = await frozenReview(fixture.repo, nextReviewPath);
    await putJson(fixture.repo, fixture.workPath, current);
    const manifest = JSON.parse(await readFile(resolve(fixture.repo, evidencePath), 'utf8'));
    manifest.items.push(...items.filter((item) => !profile.evidenceRequirements.engineering.includes(item.category)));
    await putJson(fixture.repo, evidencePath, manifest);
  }
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  const completed = loadWork(fixture.repo, fixture.workPath);
  assert.equal(inspectWork(fixture.repo, completed, { strict: true }).status, 'PASS');
  return completed;
}

test('V5 功能重验后补充视觉证据并完成正式阶段', async (t) => {
  const fixture = await createFixture({ id: 'late-visual-evidence' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await completeVisualSource(fixture, { regression: true });
  assert.equal(work.globalState, 'COMPLETE');
  assert.equal(inspectWork(fixture.repo, work, { strict: true }).status, 'PASS');
});

/** 在清理前保存来源记录字节，核验复用命令只建立引用、不改原始记录。 */
async function readSourceReviewBytes(repo, source) {
  const references = [source.globalVisualBaselineRef, source.assetReviewRef, source.implementationPackageRef, source.evidenceRef,
    ...Object.values(source.visual.reviews)];
  const entries = [];
  for (const reference of references) entries.push([reference.path, await readFile(resolve(repo, ...reference.path.split('/')))]);
  return entries;
}

/** 同时创建具备同源和同目标身份的完成来源与待复用目标。 */
async function createPair(t, { impactId = 'implementation', type = 'PAGE', reuseSourceFunction = false, ...options } = {}) {
  const repoFixture = await createFixture({ id: `source-${impactId}`, type, ...options });
  t.after(() => rm(repoFixture.repo, { recursive: true, force: true }));
  const targetArgs = {
    id: `target-${impactId}`, type, stack: options.stack ?? 'flutter', projectId: options.projectId ?? 'project-a',
    objectId: options.objectId ?? 'object-a', hostId: options.hostId, layerType: options.layerType,
  };
  const targetResult = await initializeWork({
    repo: repoFixture.repo,
    args: {
      id: targetArgs.id, stack: targetArgs.stack, type: targetArgs.type,
      objective: `验证 ${targetArgs.id} 的视觉控制协议`, 'project-id': targetArgs.projectId, 'object-id': targetArgs.objectId,
      ...(type === 'DISPLAY_LAYER' ? { 'host-id': targetArgs.hostId, 'layer-type': targetArgs.layerType } : {}),
    },
  });
  const targetPath = targetResult.metadata.workItemPath;
  const source = await completeVisualSource(repoFixture);
  await prepareFunctionalStage(repoFixture.repo, targetPath, { deliveryPath: reuseSourceFunction ? `lib/function-${source.workItemId}.dart` : undefined });
  let target = loadWork(repoFixture.repo, targetPath);
  target.visual.objectId = source.visual.objectId;
  if (type === 'DISPLAY_LAYER') {
    target.visual.hostId = source.visual.hostId;
    target.visual.layerType = source.visual.layerType;
  }
  await putJson(repoFixture.repo, targetPath, target);
  return { ...repoFixture, targetPath, source, target };
}

test('Flutter 显示层更换宿主必须重新绑定实际运行证据和阶段确认', async (t) => {
  const fixture = await createFixture({ id: 'host-revalidation', type: 'DISPLAY_LAYER', hostId: 'host-a', layerType: 'modal' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await completeVisualSource(fixture);
  const domainPath = work.visual.domainEvidenceRef.path;
  const domain = JSON.parse(await readFile(resolve(fixture.repo, domainPath), 'utf8'));
  work.visual.layerType = 'popup';
  domain.layerType = 'popup';
  await putJson(fixture.repo, domainPath, domain);
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, domainPath);
  assert.throws(() => assertVisualReview(fixture.repo, work, 'V5'), /宿主或层类型/);
  work.visual.layerType = 'modal';
  domain.layerType = 'modal';
  work.visual.hostId = 'host-b';
  domain.hostId = 'host-b';
  await putJson(fixture.repo, domainPath, domain);
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, domainPath);
  assert.throws(() => assertVisualReview(fixture.repo, work, 'V5'), /宿主或层类型/);

  // 更换宿主后须使用新上下文，不能仅修改外层字段或沿用旧确认。
  for (const name of ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5']) {
    const path = work.visual.reviews[name].path;
    const review = JSON.parse(await readFile(resolve(fixture.repo, path), 'utf8'));
    review.hostId = 'host-b';
    if (name === 'V3Layout') review.decompositionReviewRef = work.visual.reviews.V3Decomposition;
    await putJson(fixture.repo, path, review);
    work.visual.reviews[name] = await frozenReview(fixture.repo, path);
  }
  assert.throws(() => assertVisualReview(fixture.repo, work, 'V5'), /运行上下文 hostId/);
  const runtimePath = domain.runtimeContextRef.path;
  const context = JSON.parse(await readFile(resolve(fixture.repo, runtimePath), 'utf8'));
  context.hostId = 'host-b';
  const newEvidencePath = await put(fixture.repo, 'proof/new-host-runtime.txt', '新宿主合成运行证据\n');
  const newEvidence = await frozenReview(fixture.repo, newEvidencePath);
  for (const interaction of context.interactions) if (interaction.status === 'PASS') interaction.evidenceRef = newEvidence;
  await putJson(fixture.repo, runtimePath, context);
  domain.runtimeContextRef = await frozenReview(fixture.repo, runtimePath);
  const updatedReviewPath = work.visual.reviews.V5.path;
  const updatedReview = JSON.parse(await readFile(resolve(fixture.repo, updatedReviewPath), 'utf8'));
  updatedReview.runtimeContextRef = domain.runtimeContextRef;
  await putJson(fixture.repo, updatedReviewPath, updatedReview);
  work.visual.reviews.V5 = await frozenReview(fixture.repo, updatedReviewPath);
  await putJson(fixture.repo, domainPath, domain);
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, domainPath);
  assert.doesNotThrow(() => assertVisualReview(fixture.repo, work, 'V5'));
  // 视觉证据更新不能替代新宿主的 V1 功能回归。
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /宿主|hostId/);
  context.interactions[0].evidenceRef = { path: newEvidence.path, sha256: '0'.repeat(64) };
  await putJson(fixture.repo, runtimePath, context);
  domain.runtimeContextRef = await frozenReview(fixture.repo, runtimePath);
  const runtimeReviewPath = work.visual.reviews.V5.path;
  const runtimeReview = JSON.parse(await readFile(resolve(fixture.repo, runtimeReviewPath), 'utf8'));
  runtimeReview.runtimeContextRef = domain.runtimeContextRef;
  await putJson(fixture.repo, runtimeReviewPath, runtimeReview);
  work.visual.reviews.V5 = await frozenReview(fixture.repo, runtimeReviewPath);
  await putJson(fixture.repo, domainPath, domain);
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, domainPath);
  assert.throws(() => assertVisualReview(fixture.repo, work, 'V5'), /运行证据.*内容/);
});

test('当前功能已重验时允许复用同对象未改变的旧视觉目标', async (t) => {
  const fixture = await createPair(t, { impactId: 'changed-function-unchanged-visual', reuseSourceFunction: true });
  const current = loadWork(fixture.repo, fixture.targetPath);
  // 新工作项已修改并重新验证相同源码，旧视觉确认文件没有改写。
  assert.doesNotThrow(() => assertFunctionBaseline(fixture.repo, current));
  const sourceV3 = structuredClone(fixture.source);
  await writeSingleDomainFixture(fixture.repo, sourceV3, 'V3');
  assert.doesNotThrow(() => assertVisualReview(fixture.repo, sourceV3, 'V3'));
  const result = await reuseVisualReviews({ repo: fixture.repo, workItem: fixture.targetPath,
    sourceWorkItem: fixture.workPath, impact: 'implementation', reason: '功能已完成重新验证且目标和布局不变' });
  assert.equal(result.status, 'PASS');
  const reused = loadWork(fixture.repo, fixture.targetPath);
  assert.deepEqual(reused.visual.reviews.V2, fixture.source.visual.reviews.V2);
  assert.deepEqual(reused.visual.reviews.V3Layout, fixture.source.visual.reviews.V3Layout);
});

test('四种影响范围只继承各自允许的基线与 V2/V3 确认', async (t) => {
  for (const impact of Object.keys(expectedReviews)) {
    await t.test(impact, async (st) => {
      const fixture = await createPair(st, { impactId: impact });
      const beforeBytes = await readSourceReviewBytes(fixture.repo, fixture.source);
      const beforeTarget = loadWork(fixture.repo, fixture.targetPath);
      const result = await reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact, reason: '同一个已批准视觉对象的变化只发生在本轮流程的后续阶段',
      });
      const target = loadWork(fixture.repo, fixture.targetPath);

      assert.equal(result.status, 'PASS');
      assert.equal(target.visual.stage, expectedStages[impact]);
      assert.equal(target.visual.reuse.sourceWorkItemRef.path, fixture.workPath);
      assert.equal(target.visual.reuse.impact, impact);
      assert.deepEqual(target.visual.reuse.inheritedReviews, expectedReviews[impact]);
      assert.deepEqual(Object.keys(target.visual.reviews).sort(), [...expectedReviews[impact]].sort());
      assert.equal(target.globalVisualBaselineRef.path, fixture.source.globalVisualBaselineRef.path);
      assert.equal(target.visual.candidateId, impact === 'target' ? beforeTarget.visual.candidateId : fixture.source.visual.candidateId);
      assert.equal(target.implementationPackageRef, null);
      assert.equal(target.evidenceRef, null);
      assert.equal(target.assetReviewRef, null);
      assert.deepEqual(target.gateStatus, beforeTarget.gateStatus);
      assert.equal(target.evidenceRoot, beforeTarget.evidenceRoot);
      assert.deepEqual(result.metadata.reusedReviews, expectedReviews[impact]);
      assert.ok(result.metadata.remainingChecks.length > 0);
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, target));

      for (const [path, bytes] of beforeBytes) {
        assert.deepEqual(await readFile(resolve(fixture.repo, ...path.split('/'))), bytes, `${path} 应保持原字节`);
      }
    });
  }
});

test('target 影响不复制来源 candidateId，保持 V2 并要求新视觉目标', async (t) => {
  const fixture = await createPair(t, { impactId: 'new-target' });
  const verified = loadWork(fixture.repo, fixture.targetPath);
  const beforeFunction = structuredClone(verified);
  beforeFunction.visual.stage = 'V0';
  delete beforeFunction.visual.functionBaselineRef;
  await putJson(fixture.repo, fixture.targetPath, beforeFunction);
  await assert.rejects(reuseVisualReviews({ repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '尚未完成当前功能验证' }), /先完成 V1 功能验证/);
  await putJson(fixture.repo, fixture.targetPath, verified);
  const result = await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '同一产品内新增一个独立目标',
  });
  const target = loadWork(fixture.repo, fixture.targetPath);
  assert.equal(target.visual.stage, 'V2');
  assert.equal(target.visual.candidateId, undefined);
  assert.deepEqual(result.metadata.remainingChecks[0], '为新目标完成 V2 候选与目标人工确认');
});

test('拒绝不同项目、栈、对象及显示层宿主', async (t) => {
  const mismatches = [
    { label: 'project', sourceChange: (work) => { work.projectId = 'project-b'; } },
    { label: 'stack', sourceChange: (work) => { work.stack = 'unity'; } },
    { label: 'object', sourceChange: (work) => { work.visual.objectId = 'object-b'; } },
  ];
  for (const mismatch of mismatches) {
    await t.test(mismatch.label, async (st) => {
      const fixture = await createPair(st, { impactId: mismatch.label });
      mismatch.sourceChange(fixture.source);
      await putJson(fixture.repo, fixture.workPath, fixture.source);
      await assert.rejects(reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact: 'implementation', reason: '应拒绝不匹配来源',
      }));
    });
  }

  const layer = await createPair(t, { impactId: 'layer-host', type: 'DISPLAY_LAYER', hostId: 'host-a', layerType: 'modal' });
  const target = loadWork(layer.repo, layer.targetPath);
  target.visual.hostId = 'host-b';
  await putJson(layer.repo, layer.targetPath, target);
  await assert.rejects(reuseVisualReviews({
    repo: layer.repo, workItem: layer.targetPath, sourceWorkItem: layer.workPath,
    impact: 'implementation', reason: '不能跨宿主继承确认',
  }), /宿主或层类型/);

  const layerType = await createPair(t, { impactId: 'layer-type', type: 'DISPLAY_LAYER', hostId: 'host-a', layerType: 'modal' });
  const layerTypeTarget = loadWork(layerType.repo, layerType.targetPath);
  layerTypeTarget.visual.layerType = 'popup';
  await putJson(layerType.repo, layerType.targetPath, layerTypeTarget);
  await assert.rejects(reuseVisualReviews({
    repo: layerType.repo, workItem: layerType.targetPath, sourceWorkItem: layerType.workPath,
    impact: 'implementation', reason: '不能跨显示层类型继承确认',
  }), /宿主或层类型/);
});

test('拒绝候选冲突、未完成来源、目标旧确认及已失效来源引用', async (t) => {
  const candidate = await createPair(t, { impactId: 'candidate' });
  const candidateTarget = loadWork(candidate.repo, candidate.targetPath);
  candidateTarget.visual.candidateId = 'other-direction';
  await putJson(candidate.repo, candidate.targetPath, candidateTarget);
  await assert.rejects(reuseVisualReviews({
    repo: candidate.repo, workItem: candidate.targetPath, sourceWorkItem: candidate.workPath,
    impact: 'assets', reason: '候选冲突必须失败',
  }), /candidateId/);

  const unfinished = await createPair(t, { impactId: 'unfinished' });
  const unfinishedSource = loadWork(unfinished.repo, unfinished.workPath);
  unfinishedSource.globalState = 'PASSED';
  await putJson(unfinished.repo, unfinished.workPath, unfinishedSource);
  await assert.rejects(reuseVisualReviews({
    repo: unfinished.repo, workItem: unfinished.targetPath, sourceWorkItem: unfinished.workPath,
    impact: 'layout', reason: '未完成来源必须失败',
  }), /来源必须完成全局流程/);

  const existing = await createPair(t, { impactId: 'existing-review' });
  const existingTarget = loadWork(existing.repo, existing.targetPath);
  existingTarget.visual.reviews.V2 = { path: 'new/review.json', sha256: '0'.repeat(64) };
  await putJson(existing.repo, existing.targetPath, existingTarget);
  await assert.rejects(reuseVisualReviews({
    repo: existing.repo, workItem: existing.targetPath, sourceWorkItem: existing.workPath,
    impact: 'implementation', reason: '不能覆盖目标确认',
  }), /拒绝覆盖目标已有/);

  const invalidated = await createPair(t, { impactId: 'invalidated' });
  const invalidatedTarget = loadWork(invalidated.repo, invalidated.targetPath);
  invalidatedTarget.invalidatedRefs = [{ path: invalidated.source.visual.reviews.V2.path, state: 'V2' }];
  await putJson(invalidated.repo, invalidated.targetPath, invalidatedTarget);
  await assert.rejects(reuseVisualReviews({
    repo: invalidated.repo, workItem: invalidated.targetPath, sourceWorkItem: invalidated.workPath,
    impact: 'implementation', reason: '目标已作废的路径不能重新绑定',
  }));
});

test('拒绝源 Work Item 中伪造或身份错绑的 V2 确认', async (t) => {
  const fixture = await createPair(t, { impactId: 'fake-review' });
  const fakePath = '.workflow-control/reviews/fake-v1.json';
  await putJson(fixture.repo, fakePath, humanRecord({
    objectId: 'someone-else', candidateId: 'direction-a', stage: 'V2', purpose: 'target',
    targetRef: 'proof/target.txt', userMessageRef: 'test-message://fake',
    checks: await qualityChecks(fixture.repo, 'proof/fake-v1'),
  }));
  fixture.source.visual.reviews.V2 = await frozenReview(fixture.repo, fakePath);
  await putJson(fixture.repo, fixture.workPath, fixture.source);
  await assert.rejects(reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'implementation', reason: '身份错绑记录不能被继承',
  }), /身份或阶段错绑/);
});

test('已确认的单目标画面被原地替换后不能继承旧确认', async (t) => {
  const fixture = await createPair(t, { impactId: 'changed-target' });
  await put(fixture.repo, 'proof/target.txt', '用户确认后被替换的目标');
  await assert.rejects(reuseVisualReviews({ repo: fixture.repo, workItem: fixture.targetPath,
    sourceWorkItem: fixture.workPath, impact: 'implementation', reason: '目标图已变更' }), /内容已变化/);
});

test('单目标确认记录原地变化后不能借原路径复用', async (t) => {
  const fixture = await createPair(t, { impactId: 'changed-review' });
  const path = fixture.source.visual.reviews.V2.path;
  const record = JSON.parse(await readFile(resolve(fixture.repo, ...path.split('/')), 'utf8'));
  await putJson(fixture.repo, path, { ...record, userMessageRef: 'test-message://changed' });
  await assert.rejects(reuseVisualReviews({ repo: fixture.repo, workItem: fixture.targetPath,
    sourceWorkItem: fixture.workPath, impact: 'implementation', reason: '确认记录已变更' }), /确认记录.*内容已变化/);
});

test('多目标来源绑定逐视图校验，不能错绑清单、确认或继承 V4', async (t) => {
  const fixture = await createFixture({ id: 'scene-source', stack: 'cocos', type: 'SCENE', objectId: 'scene' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const targetInit = await initializeWork({ repo: fixture.repo, args: { id: 'scene-target', stack: 'cocos', type: 'SCENE', objective: '验证多目标来源', 'project-id': 'project-a', 'object-id': 'scene' } });
  const source = loadWork(fixture.repo, fixture.workPath);
  const work = loadWork(fixture.repo, targetInit.metadata.workItemPath);
  source.globalState = 'COMPLETE';
  source.visual.stage = 'V5';
  const candidatePath = await put(fixture.repo, 'baseline-candidate.txt', '合成视觉候选');
  const candidateRef = await frozenReview(fixture.repo, candidatePath);
  await putJson(fixture.repo, 'baseline-review.json', { targetRef: candidatePath, targetSha256: candidateRef.sha256 });
  await putJson(fixture.repo, 'baseline.json', { schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, selectedCandidateId: 'a', candidates: [{ candidateId: 'a', path: candidatePath }], selectionReviewRef: await frozenReview(fixture.repo, 'baseline-review.json') });
  source.globalVisualBaselineRef = await frozenReview(fixture.repo, 'baseline.json');
  work.globalVisualBaselineRef = { ...source.globalVisualBaselineRef };
  const ref = { path: 'target.png', sha256: 'a'.repeat(64) };
  const coverage = { path: 'coverage.json', sha256: 'b'.repeat(64) };
  source.visual.coverageRef = { ...coverage };
  work.visual.coverageRef = { ...coverage };
  const makeTarget = (id) => ({ targetId: id, candidateId: `candidate-${id}`, sceneId: 'scene', stateId: 'default', scope: id, viewport: { width: 100, height: 100 }, referenceTarget: { ...ref }, domainEvidenceRef: { path: `domain/${id}.json` }, reviews: {
    V2: { path: `reviews/${id}-v1.json`, sha256: '1'.repeat(64) }, V3Decomposition: { path: `reviews/${id}-v2d.json`, sha256: '2'.repeat(64) }, V3Layout: { path: `reviews/${id}-v2l.json`, sha256: '3'.repeat(64) }, V4: { path: `reviews/${id}-v3.json`, sha256: '4'.repeat(64) }, V5: { path: `reviews/${id}-v4.json`, sha256: '5'.repeat(64) },
  } });
  source.visual.targets = ['left', 'right'].map(makeTarget);
  work.visual.targets = source.visual.targets.map((item) => ({ ...structuredClone(item), reviews: { V2: item.reviews.V2, V3Decomposition: item.reviews.V3Decomposition, V3Layout: item.reviews.V3Layout } }));
  work.visual.reuse = { sourceWorkItemRef: { path: fixture.workPath }, impact: 'implementation', reason: '目标不变', inheritedReviews: ['V2', 'V3Decomposition', 'V3Layout'] };
  await putJson(fixture.repo, fixture.workPath, source);
  assert.doesNotThrow(() => assertVisualReuse(fixture.repo, work));
  assert.equal(validateSceneReuseCoverage(fixture.repo, work, { workItemId: source.workItemId }), source.workItemId);
  assert.equal(validateSceneReuseReview(fixture.repo, work, work.visual.targets[0], 'V2', work.visual.targets[0].reviews.V2, { workItemId: source.workItemId }), source.workItemId);
  // 中间工作项必须保留自己的 V4/V5；祖先只拥有声明继承的前置确认。
  const middle = structuredClone(work);
  middle.globalState = 'COMPLETE';
  middle.visual.stage = 'V5';
  const middlePath = targetInit.metadata.workItemPath;
  await putJson(fixture.repo, middlePath, middle);
  const thirdInit = await initializeWork({ repo: fixture.repo, args: { id: 'scene-third', stack: 'cocos', type: 'SCENE', objective: '验证多级来源', 'project-id': 'project-a', 'object-id': 'scene' } });
  const third = loadWork(fixture.repo, thirdInit.metadata.workItemPath);
  third.globalVisualBaselineRef = structuredClone(middle.globalVisualBaselineRef);
  third.visual.coverageRef = structuredClone(middle.visual.coverageRef);
  third.visual.targets = structuredClone(middle.visual.targets);
  third.visual.reuse = { ...structuredClone(middle.visual.reuse), sourceWorkItemRef: { path: middlePath } };
  assert.equal(validateSceneReuseCoverage(fixture.repo, third, { workItemId: source.workItemId }), source.workItemId);
  assert.equal(validateSceneReuseReview(fixture.repo, third, third.visual.targets[0], 'V2', third.visual.targets[0].reviews.V2, { workItemId: source.workItemId }), source.workItemId);
  middle.visual.targets[0].reviews.V2.sha256 = 'f'.repeat(64);
  await putJson(fixture.repo, middlePath, middle);
  assert.throws(() => assertVisualReuse(fixture.repo, third), /确认未绑定来源/);
  middle.visual.targets[0].reviews.V2 = structuredClone(source.visual.targets[0].reviews.V2);
  middle.visual.reuse.sourceWorkItemRef.path = thirdInit.metadata.workItemPath;
  await putJson(fixture.repo, middlePath, middle);
  await putJson(fixture.repo, thirdInit.metadata.workItemPath, third);
  assert.throws(() => assertVisualReuse(fixture.repo, third), /循环/);
  work.visual.targets[0].reviews.V2 = work.visual.targets[1].reviews.V2;
  assert.throws(() => assertVisualReuse(fixture.repo, work), /确认未绑定来源/);
  work.visual.targets[0].reviews.V2 = source.visual.targets[0].reviews.V2;
  work.visual.targets[0].reviews.V4 = source.visual.targets[0].reviews.V4;
  assert.throws(() => assertVisualReuse(fixture.repo, work), /不能复用来源确认/);
  delete work.visual.targets[0].reviews.V4;
  source.visual.targets[0].assetReviewRef = { path: 'assets/source-v3.json', sha256: 'd'.repeat(64) };
  work.visual.targets[0].assetReviewRef = { ...source.visual.targets[0].assetReviewRef };
  await putJson(fixture.repo, fixture.workPath, source);
  assert.throws(() => assertVisualReuse(fixture.repo, work), /不能复用来源资产评审/);
  delete work.visual.targets[0].assetReviewRef;
  work.visual.coverageRef.sha256 = 'c'.repeat(64);
  assert.throws(() => assertVisualReuse(fixture.repo, work), /冻结视图清单/);
});

test('PAGE 多级复用逐跳绑定原始确认并拒绝祖先异常及图片替换', async (t) => {
  const fixture = await createPair(t, { impactId: 'chain' });
  await reuseVisualReviews({ repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath, impact: 'implementation', reason: '继承确认' });
  const middle = loadWork(fixture.repo, fixture.targetPath);
  middle.globalState = 'COMPLETE';
  middle.visual.stage = 'V5';
  await putJson(fixture.repo, fixture.targetPath, middle);
  const init = await initializeWork({ repo: fixture.repo, args: { id: 'third-chain', type: 'PAGE', stack: 'flutter', objective: '验证多级来源', 'project-id': 'project-a', 'object-id': 'object-a' } });
  const third = loadWork(fixture.repo, init.metadata.workItemPath);
  third.globalVisualBaselineRef = structuredClone(middle.globalVisualBaselineRef);
  third.visual.candidateId = middle.visual.candidateId;
  third.visual.reviews = structuredClone(middle.visual.reviews);
  third.visual.reuse = { ...structuredClone(middle.visual.reuse), sourceWorkItemRef: { path: fixture.targetPath } };
  await writeSingleDomainFixture(fixture.repo, third, 'V3');
  assert.equal(resolveReuseOwner(fixture.repo, third, fixture.source.workItemId, 'V2'), fixture.source.workItemId);
  assert.doesNotThrow(() => assertVisualReview(fixture.repo, third, 'V3'));
  middle.globalState = 'REVIEW';
  await putJson(fixture.repo, fixture.targetPath, middle);
  assert.throws(() => assertVisualReuse(fixture.repo, third), /来源必须已完成/);
  middle.globalState = 'COMPLETE';
  await putJson(fixture.repo, fixture.targetPath, middle);
  await put(fixture.repo, 'proof/target.txt', '替换后的目标');
  assert.throws(() => assertVisualReview(fixture.repo, third, 'V3'), /内容已变化/);
});

test('拒绝缺少 Execution State 或仍有未闭合单元的来源', async (t) => {
  await t.test('Execution State 缺失', async (st) => {
    const fixture = await createPair(st, { impactId: 'missing-execution-state' });
    await rm(resolve(fixture.repo, ...`${fixture.source.evidenceRoot}/execution-state.json`.split('/')), { force: true });
    await assert.rejects(reuseVisualReviews({
      repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
      impact: 'implementation', reason: '缺少正式执行状态的来源不可复用',
    }), { code: 'SOURCE_NOT_COMPLETE' });
  });

  await t.test('Execution Unit 未闭合', async (st) => {
    const fixture = await createPair(st, { impactId: 'pending-execution-unit' });
    const statePath = `${fixture.source.evidenceRoot}/execution-state.json`;
    const absolute = resolve(fixture.repo, ...statePath.split('/'));
    const state = JSON.parse(await readFile(absolute, 'utf8'));
    state.units[0].status = 'PENDING';
    state.activeBatch = [state.units[0].unitId];
    await writeFile(absolute, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await assert.rejects(reuseVisualReviews({
      repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
      impact: 'assets', reason: '尚未闭合实施单元的来源不可复用',
    }), { code: 'SOURCE_NOT_COMPLETE' });
  });
});

test('绑定校验拒绝未列入继承清单的来源 V4/V5 确认', async (t) => {
  const fixture = await createPair(t, { impactId: 'unlisted-review' });
  await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '新目标只继承项目视觉基线',
  });
  const target = loadWork(fixture.repo, fixture.targetPath);
  target.visual.reviews.V4 = { ...fixture.source.visual.reviews.V4 };
  await putJson(fixture.repo, fixture.targetPath, target);
  assert.throws(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)), /未声明为可继承确认/);
});

test('绑定校验拒绝元数据已错绑项目或技术栈的来源基线', async (t) => {
  const fixture = await createPair(t, { impactId: 'baseline-metadata' });
  await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '新目标复用同项目的全局方向',
  });
  const baselinePath = fixture.source.globalVisualBaselineRef.path;
  const baseline = JSON.parse(await readFile(resolve(fixture.repo, ...baselinePath.split('/')), 'utf8'));
  baseline.stack = 'unity';
  await putJson(fixture.repo, baselinePath, baseline);
  // 即使来源与目标都重新绑定实际摘要，错项目或技术栈仍须独立拒绝。
  const rebound = await frozenReview(fixture.repo, baselinePath);
  const source = loadWork(fixture.repo, fixture.workPath);
  source.globalVisualBaselineRef = rebound;
  await putJson(fixture.repo, fixture.workPath, source);
  const target = loadWork(fixture.repo, fixture.targetPath);
  target.globalVisualBaselineRef = rebound;
  await putJson(fixture.repo, fixture.targetPath, target);
  assert.throws(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)), /项目或技术栈不匹配/);
});

test('RETURN visual:V2/V3 清理失效继承后，恢复 REVIEW 仍可验证来源绑定', async (t) => {
  const cases = [
    { stage: 'V2', impact: 'target', inherited: [], retained: [], invalidatedReview: 'V2' },
    { stage: 'V3', impact: 'layout', inherited: ['V2'], retained: ['V2'], invalidatedReview: 'V3Decomposition' },
  ];
  for (const scenario of cases) {
    await t.test(scenario.stage, async (st) => {
      const fixture = await createPair(st, { impactId: `return-${scenario.stage}` });
      const target = loadWork(fixture.repo, fixture.targetPath);
      target.gateStatus.F1 = 'PASS';
      target.gateStatus.F2 = 'PASS';
      await putJson(fixture.repo, fixture.targetPath, target);
      await reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact: 'implementation', reason: 'RETURN 同步测试来源确认保留边界',
      });
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)));

      await transitionWork({
        repo: fixture.repo, workItem: fixture.targetPath, to: 'RETURN',
        args: { reason: '视觉阶段发生变化', 'affected-scope': `visual:${scenario.stage}` },
      });
      let returned = loadWork(fixture.repo, fixture.targetPath);
      assert.equal(returned.visual.reuse.impact, scenario.impact);
      assert.deepEqual(returned.visual.reuse.inheritedReviews, scenario.inherited);
      assert.deepEqual(Object.keys(returned.visual.reviews).sort(), [...scenario.retained].sort());
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, returned));

      returned.visual.reviews[scenario.invalidatedReview] = { path: fixture.source.visual.reviews[scenario.invalidatedReview].path };
      assert.throws(() => assertVisualReuse(fixture.repo, returned), /RETURN 已作废引用/);
      delete returned.visual.reviews[scenario.invalidatedReview];
      returned.gateStatus.F2 = 'PASS';
      await putJson(fixture.repo, fixture.targetPath, returned);

      await transitionWork({
        repo: fixture.repo, workItem: fixture.targetPath, to: 'REVIEW',
        args: { 'return-resolution': '重新确认受影响的视觉阶段后继续当前工作项' },
      });
      const recovered = loadWork(fixture.repo, fixture.targetPath);
      assert.equal(recovered.globalState, 'REVIEW');
      assert.deepEqual(recovered.visual.reuse.inheritedReviews, scenario.inherited);
      assert.deepEqual(Object.keys(recovered.visual.reviews).sort(), [...scenario.retained].sort());
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, recovered));
    });
  }
});
