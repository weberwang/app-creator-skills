/** 本文件仅用合成材料验证控制协议，不运行引擎或代替用户验收。 */
import assert from 'node:assert/strict';
import { existsSync, linkSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateGlobalBaseline } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { createExecutionPlanSnapshot } from '../../skills/app-workflow-control/scripts/runtime/execution-batches.mjs';
import { validateSamplePlan, validateSampleResult, freezeSampleResult, assertSampleResult, collectSampleReferences, collectSampleControlReferences } from '../../skills/app-workflow-control/scripts/runtime/production-samples.mjs';
import { advanceVisual, completeUnit, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { bindEvidence, bindImplementation, frozenReview, put, putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { attachWorld3DPhase, attachWorld3DPreflight, createWorld3DFixture } from './world3d-fixture.mjs';

/** 构造覆盖一组模型或图片的样本、稳定批量执行单元。 */
function units(basis, decisionRequired = true) {
  const common = { type: 'SCENE', owner: 'test-owner', acceptanceCommands: ['node --version'], sampleScopeIds: ['building-a'], sampleBasisRef: basis };
  return [
    { ...common, unitId: 'sample', sequence: 1, paths: ['src/game/sample-consumer.ts'], resultPath: '.workflow-control/evidence/unit-sample.json', sampleRole: 'sample', sampleDecisionRequired: decisionRequired },
    { ...common, unitId: 'batch', sequence: 2, paths: ['src/game/batch-production.ts'], resultPath: '.workflow-control/evidence/unit-batch.json', sampleRole: 'batch', dependsOn: ['sample'] },
  ];
}

/** 在真实项目相对路径中构造当前三维规格及任务包。 */
function fixture(t, productionRisk = 'high') {
  const f = createWorld3DFixture(t, { productionRisk });
  attachWorld3DPhase(f, 'V3');
  const handoff = f.work.visual.domainEvidenceRef;
  attachWorld3DPhase(f, 'V4');
  f.work.visual.domainEvidenceRef = handoff;
  const executionUnits = units(f.modelSpecRef);
  return { ...f, pack: { visualStage: 'V4', executionUnits }, unit: executionUnits[0] };
}

/** 按现有图片目标合同构造一套与宿主绑定的合成人工确认链。 */
function imageTarget(f) {
  const objectId = f.work.visual.objectId;
  const referenceTarget = f.write('reviews/reference-target.txt', '仅供测试的目标内容');
  const target = { targetId: 'ui-target', candidateId: 'ui-candidate', sceneId: objectId, stateId: 'default', scope: '当前 UI', viewport: { width: 1280, height: 720 }, referenceTarget, reviews: {} };
  const common = { schemaVersion: '1.0', workItemId: f.work.workItemId, objectId, targetId: target.targetId, candidateId: target.candidateId, decision: 'APPROVED', userMessageRef: 'test-only://ui-review', targetRef: referenceTarget.path, targetSha256: referenceTarget.sha256, referenceTarget };
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'PASS', evidenceRef: f.write(`reviews/quality-${dimension}.txt`, '合成质量记录').path }));
  target.reviews.V2 = f.write('reviews/ui-V2.json', { ...common, stage: 'V2', purpose: 'target', qualityChecks });
  target.reviews.V3Decomposition = f.write('reviews/ui-decomposition.json', { ...common, stage: 'V3', purpose: 'decomposition' });
  target.reviews.V3Layout = f.write('reviews/ui-layout.json', { ...common, stage: 'V3', purpose: 'layout', decompositionReviewRef: target.reviews.V3Decomposition });
  return target;
}

/** 以既有覆盖清单冻结目标视口、状态和区域，不生成额外确认。 */
function imageCoverage(f, target) {
  return f.write('reviews/ui-coverage.json', {
    workItemId: f.work.workItemId, sceneId: f.work.visual.objectId, status: 'CONFIRMED',
    userMessageRef: 'test-only://same-ui-confirmation', targetIds: [target.targetId],
    targets: [{ targetId: target.targetId, candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId, scope: target.scope, viewport: { ...target.viewport }, referenceTarget: target.referenceTarget }],
  });
}

/** 图片路线的三候选与用户选择沿用既有格式，全部文件仅为协议测试材料。 */
function imageBaseline(f, target) {
  const qualityChecks = f.read(target.reviews.V2).qualityChecks;
  const candidates = ['a', 'b', 'c'].map((candidateId) => ({ candidateId, path: f.write(`reviews/ui-baseline-${candidateId}.txt`, `合成候选 ${candidateId}`).path, qualityChecks }));
  const selected = f.identity(candidates[0].path);
  const selectionReviewRef = f.write('reviews/ui-baseline-selection.json', {
    schemaVersion: '1.0', objectId: 'image-baseline', stage: 'BASELINE', purpose: 'visual-baseline',
    candidateId: 'a', decision: 'APPROVED', userMessageRef: 'test-only://baseline-selection',
    targetRef: selected.path, targetSha256: selected.sha256, qualityChecks,
  });
  return f.write('reviews/ui-global-baseline.json', { schemaVersion: '1.0', baselineId: 'image-baseline', projectId: f.work.projectId, stack: f.work.stack, candidates, selectedCandidateId: 'a', selectionReviewRef });
}

/** 构造当前或旧工作项留下的真实引用关系；文件内容均为合成测试数据。 */
function trial(f, { producer = f.work.workItemId, scopeIds = ['building-a'], decision = 'APPROVED', includeDecision = true, writeResult = true, structured = true } = {}) {
  const root = producer === f.work.workItemId ? f.work.evidenceRoot : `.workflow-control/evidence/${producer}`;
  const sourceRef = f.write(`public/assets/${producer}-sample.glb`, '仅用于测试的样本来源');
  const runtimeRef = f.write(`${root}/sample-run.log`, '合成试接原始命令输出');
  const sceneRef = f.write('src/game/trial-scene.ts', '// 合成目标引擎首件场景');
  const outputRef = f.write(`public/assets/${producer}-output.glb`, '仅用于测试的首件输出');
  const runRef = structured ? f.write(`${root}/sample-run.json`, {
    ...f.context, workItemId: producer, phase: 'sample', executionMode: 'engine', engineSessionId: 'synthetic-session',
    startedAt: '2026-11-15T00:00:00Z', completedAt: '2026-11-15T00:01:00Z',
    sceneRef, commandEvidenceRef: runtimeRef,
    checks: ['camera', 'navigation', 'collision', 'interaction'].map((id) => ({ id, status: 'PASS', evidenceRef: runtimeRef })),
    modelBindings: [{ assetId: 'building-a', nodeId: 'World/FirstItem', outputRef }],
  }) : runtimeRef;
  const displayRef = f.write(`reviews/${producer}-sample-view.txt`, '合成的用户展示记录');
  const review = {
    schemaVersion: '1.0', workItemId: producer, objectId: f.work.visual.objectId, stage: 'V4',
    purpose: 'representative-sample', decision, userMessageRef: 'test-only://sample-confirmation',
    scope: { kind: 'representative-sample', designItemIds: scopeIds, conditionIds: [] },
    targetRef: displayRef.path, targetSha256: displayRef.sha256, runtimeContextRef: runRef,
  };
  const humanDecisionRef = includeDecision ? f.write(`${root}/sample-review.json`, review) : undefined;
  const sample = {
    schemaVersion: '1.0', kind: 'production-sample', workItemId: producer, projectId: f.work.projectId,
    stack: f.work.stack, objectId: f.work.visual.objectId, candidateId: f.context.candidateId, phase: 'sample',
    assetId: 'building-a', scopeIds, basisRef: f.modelSpecRef, sceneRef, outputs: [outputRef],
    evidenceRoot: root, sourceRefs: [sourceRef], runtimeRef: runRef, ...(humanDecisionRef ? { humanDecisionRef } : {}),
  };
  const sampleEvidenceRef = f.write(`${root}/sample-contract.json`, sample);
  const result = { sampleEvidenceRef };
  if (writeResult) f.write(f.unit.resultPath, result);
  return { root, sample, result, sourceRef, runtimeRef, humanDecisionRef, displayRef };
}

test('仅声明批量时要求更早样本、完整覆盖与相同当前制作依据', async (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateSamplePlan(f.repo, f.work, f.pack));
  const cases = [
    ['缺少依赖', (pack) => { delete pack.executionUnits[1].dependsOn; }, /dependsOn/],
    ['依赖未知样本', (pack) => { pack.executionUnits[1].dependsOn = ['other']; }, /未依赖样本/],
    ['范围超出模型规格', (pack) => { pack.executionUnits[1].sampleScopeIds = ['building-a', 'building-b']; }, /当前模型规格/],
    ['样本不早于批量', (pack) => { pack.executionUnits[0].sequence = 3; }, /更早批次/],
    ['同一并行批次', (pack) => { pack.executionUnits.forEach((unit) => { unit.parallelGroup = 'same'; }); }, /更早批次/],
    ['当前依据已变化', (pack) => { pack.executionUnits[1].sampleBasisRef = f.write('spec/wrong.json', { wrong: true }); }, /须声明|当前 V3/],
    ['缺少人工判断适用性', (pack) => { delete pack.executionUnits[0].sampleDecisionRequired; }, /人工判断/],
    ['范围重复', (pack) => { pack.executionUnits[0].sampleScopeIds = ['building-a', 'building-a']; }, /不能重复/],
  ];
  for (const [name, mutate, reason] of cases) await t.test(name, () => {
    const bad = structuredClone(f.pack);
    mutate(bad);
    assert.throws(() => validateSamplePlan(f.repo, f.work, bad), reason);
  });
  const ui = { ...f.work, workItemType: 'SCENE', visual: { objectId: f.work.visual.objectId, designRoute: 'game-ui', stage: 'V4', targets: [] } };
  assert.doesNotThrow(() => validateSamplePlan(f.repo, ui, { executionUnits: [{ unitId: 'normal' }] }));
});

test('低风险模型正常导入，高风险不能把扩批写成无依赖普通场景单元', (t) => {
  const normal = { visualStage: 'V4', executionUnits: [{ type: 'SCENE', unitId: 'ordinary' }] };
  const low = fixture(t, 'low');
  assert.doesNotThrow(() => validateSamplePlan(low.repo, low.work, normal));
  assert.throws(() => validateSamplePlan(low.repo, low.work, low.pack), /低风险导入/);
  low.write(low.modelSpecRef.path, '计划前原地替换规格');
  assert.throws(() => validateSamplePlan(low.repo, low.work, normal), /模型规格.*内容已变化/);
  const high = fixture(t);
  assert.throws(() => validateSamplePlan(high.repo, high.work, normal), /高风险模型批次需要一个/);
  assert.throws(() => validateSamplePlan(high.repo, high.work, { ...high.pack, executionUnits: [high.unit, ...normal.executionUnits] }), /须声明首件或扩批依赖/);
  const earlyModule = { type: 'MODULE', unitId: 'early-production', sequence: 1 };
  assert.throws(() => validateSamplePlan(high.repo, high.work, { ...high.pack, executionUnits: [earlyModule, { ...high.unit, sequence: 2 }] }), /须声明首件或扩批依赖/);
  assert.doesNotThrow(() => validateSamplePlan(high.repo, high.work, { ...high.pack, executionUnits: [high.unit] }));
  const raw = trial(high, { structured: false });
  assert.throws(() => validateSampleResult(high.repo, high.work, high.unit, raw.result), /结构化的目标引擎/);
  const missingBinding = trial(high);
  const run = high.read(missingBinding.sample.runtimeRef);
  missingBinding.sample.runtimeRef = high.write(`${missingBinding.root}/unbound-run.json`, { ...run, modelBindings: [] });
  missingBinding.sample.humanDecisionRef = undefined;
  high.unit.sampleDecisionRequired = false;
  missingBinding.result.sampleEvidenceRef = high.write(`${missingBinding.root}/unbound-sample.json`, missingBinding.sample);
  assert.throws(() => validateSampleResult(high.repo, high.work, high.unit, missingBinding.result), /未绑定代表模型输出和消费节点/);
  const result = trial(high).result;
  const contract = high.read(high.work.visual.domainEvidenceRef);
  const unrelated = trial(high, { producer: 'other-first-item' }).result.sampleEvidenceRef;
  high.work.visual.domainEvidenceRef = high.write('spec/finalized-v4.json', { ...contract, stage: 'V4', sampleRef: unrelated });
  assert.throws(() => validateSampleResult(high.repo, high.work, high.unit, result), /封套首件与通过的执行结果不一致/);
});

test('二维世界使用自己的布局依据，不能借三维规格充当当前方案', (t) => {
  const f = fixture(t);
  const target = imageTarget(f);
  const layout = target.reviews.V3Layout;
  const coverageRef = imageCoverage(f, target);
  const globalVisualBaselineRef = imageBaseline(f, target);
  const work = { ...f.work, globalVisualBaselineRef, visual: { objectId: f.work.visual.objectId, designRoute: 'world-2d', stage: 'V4', targets: [target], coverageRef } };
  const pack = { visualStage: 'V4', executionUnits: units(layout) };
  const options = { validateGlobalBaseline };
  assert.doesNotThrow(() => validateSamplePlan(f.repo, work, pack, options));
  delete work.globalVisualBaselineRef;
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /视觉基线/);
  work.globalVisualBaselineRef = f.baselineRef;
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /不得引用无图 3D/);
  work.globalVisualBaselineRef = globalVisualBaselineRef;
  pack.executionUnits[0].sampleBasisRef = f.modelSpecRef;
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /当前 V3/);
  pack.executionUnits[0].sampleBasisRef = layout;
  const review = f.read(layout);
  review.decision = 'REJECTED';
  target.reviews.V3Layout = f.write('reviews/rejected-layout.json', review);
  pack.executionUnits.forEach((unit) => { unit.sampleBasisRef = target.reviews.V3Layout; });
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /人工确认|状态错绑/);
  target.reviews.V3Layout = layout;
  pack.executionUnits.forEach((unit) => { unit.sampleBasisRef = layout; });
  target.sceneId = 'other-scene';
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /宿主场景|目标范围/);
  target.sceneId = work.visual.objectId;
  target.viewport.width += 1;
  assert.throws(() => validateSamplePlan(f.repo, work, pack, options), /目标范围|身份已变化/);
});

test('三维场景的 HUD 样本继续核对独立图片基线和同宿主确认', (t) => {
  const f = fixture(t, 'low');
  const target = imageTarget(f);
  const coverageRef = imageCoverage(f, target);
  const globalVisualBaselineRef = imageBaseline(f, target);
  f.work.visual.hud = { scopeIds: ['persistent-hud'], targets: [target], coverageRef, globalVisualBaselineRef };
  const snapshot = f.read(f.work.visual.functionBaselineRef);
  snapshot.work.visual.hud = { scopeIds: ['persistent-hud'] };
  f.work.visual.functionBaselineRef = f.write('spec/hud-function-baseline.json', snapshot);
  const contract = f.read(f.work.visual.domainEvidenceRef);
  contract.functionBaselineRef = f.work.visual.functionBaselineRef;
  f.work.visual.domainEvidenceRef = f.write('spec/hud-world-V3.json', contract);
  const pack = { visualStage: 'V4', executionUnits: units(target.reviews.V3Layout) };
  const options = { validateGlobalBaseline };
  assert.doesNotThrow(() => validateSamplePlan(f.repo, f.work, pack, options));
  f.work.visual.hud.globalVisualBaselineRef = f.baselineRef;
  assert.throws(() => validateSamplePlan(f.repo, f.work, pack, options), /不得引用无图 3D/);
  f.work.visual.hud.globalVisualBaselineRef = globalVisualBaselineRef;
  target.stateId = 'other-state';
  assert.throws(() => validateSamplePlan(f.repo, f.work, pack, options), /目标范围|身份已变化/);
  target.stateId = 'default';
  const v2 = f.read(target.reviews.V2);
  v2.workItemId = 'other-task';
  target.reviews.V2 = f.write('reviews/hud-other-owner.json', v2);
  assert.throws(() => validateSamplePlan(f.repo, f.work, pack, options), /不允许跨工作项复用/);
});

test('计划和执行报告 Schema 保留样本声明并拒绝缺失必要字段', (t) => {
  const ajv = new Ajv2020({ strict: false });
  const base = 'skills/app-workflow-control/schemas';
  const schema = (name) => JSON.parse(readFileSync(`${base}/${name}.schema.json`, 'utf8'));
  ajv.addSchema(schema('system-coverage'));
  const plan = ajv.compile(schema('work-plan'));
  const report = ajv.compile(schema('execution-report'));
  const source = { executionUnits: [{ unitId: 'sample', owner: 'test', paths: ['src/a.ts'], acceptanceCommands: ['node --version'], sampleRole: 'sample', sampleScopeIds: ['a'], sampleBasisRef: { path: 'spec/a.json', sha256: 'a'.repeat(64) }, sampleDecisionRequired: true }] };
  const f = createWorld3DFixture(t);
  source.systemCoverage = createSystemCoverage(f.repo, { stack: 'unity', workItemId: 'schema' }, source.executionUnits);
  assert.equal(plan(source), true);
  delete source.executionUnits[0].sampleDecisionRequired;
  assert.equal(plan(source), false);
  const input = { files: ['src/a.ts'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: 'evidence/out.log' }], evidence: [], sampleEvidenceRef: { path: 'evidence/sample.json', sha256: 'b'.repeat(64) } };
  assert.equal(report(input), true);
  input.sampleEvidenceRef.sha256 = 'wrong';
  assert.equal(report(input), false);
});

test('公开计划入口拒绝同路径摘要已更新但确认错宿主的二维布局', async (t) => {
  const f = createWorld3DFixture(t);
  const result = await initializeWork({ repo: f.repo, args: { id: f.context.workItemId, stack: f.context.stack, type: 'SCENE', objective: '验证图片布局来源', 'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-2d' } });
  let work = await readWork(f.repo, result.metadata.workItemPath);
  const target = imageTarget(f);
  const coverageRef = imageCoverage(f, target);
  const globalVisualBaselineRef = imageBaseline(f, target);
  const valid = target.reviews.V3Layout;
  const bad = f.read(valid);
  bad.objectId = 'wrong-scene';
  target.reviews.V3Layout = f.write('reviews/wrong-host-layout.json', bad);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  work.visual.stage = 'V4';
  work.visual.targets = [target];
  work.visual.coverageRef = coverageRef;
  work.globalVisualBaselineRef = globalVisualBaselineRef;
  // 测试工作项另用空证据根；试接结果尚不存在，不代表引擎或用户验收。
  work.evidenceRoot = '.workflow-control/evidence/sample-preflight';
  await putJson(f.repo, result.metadata.workItemPath, work);
  const plan = { executionUnits: units(target.reviews.V3Layout).map(({ sequence, resultPath, ...entry }) => entry) };
  plan.systemCoverage = createSystemCoverage(f.repo, work, plan.executionUnits);
  await putJson(f.repo, 'spec/invalid-ui-plan.json', plan);
  await assert.rejects(prepareWorkRecords({ repo: f.repo, workItem: result.metadata.workItemPath, planPath: 'spec/invalid-ui-plan.json' }), /人工确认|状态错绑/);
  work = await readWork(f.repo, result.metadata.workItemPath);
  assert.equal(work.implementationPackageRef, null);
  assert.equal(existsSync(join(f.repo, ...work.evidenceRoot.split('/'))), false);
  target.reviews.V3Layout = valid;
  target.viewport.width += 1;
  work.visual.targets = [target];
  await putJson(f.repo, result.metadata.workItemPath, work);
  plan.executionUnits.forEach((unit) => { unit.sampleBasisRef = valid; });
  await putJson(f.repo, 'spec/valid-ui-plan.json', plan);
  await assert.rejects(prepareWorkRecords({ repo: f.repo, workItem: result.metadata.workItemPath, planPath: 'spec/valid-ui-plan.json' }), /目标范围|身份已变化/);
  target.viewport.width -= 1;
  work.visual.targets = [target];
  await putJson(f.repo, result.metadata.workItemPath, work);
  const prepared = await prepareWorkRecords({ repo: f.repo, workItem: result.metadata.workItemPath, planPath: 'spec/valid-ui-plan.json' });
  assert.equal(prepared.status, 'PASS');
});

test('样本真实依据与人工决定绑定后冻结，任一后续内容变化均阻断', async (t) => {
  for (const field of ['sourceRef', 'runtimeRef', 'humanDecisionRef', 'displayRef', 'result']) await t.test(field, (st) => {
    const f = fixture(st);
    const data = trial(f);
    const snapshot = freezeSampleResult(f.repo, f.work, f.unit, data.result);
    assert.doesNotThrow(() => assertSampleResult(f.repo, f.work, f.unit, data.result, { sampleSnapshot: snapshot }));
    const path = field === 'result' ? f.unit.resultPath : data[field].path;
    writeFileSync(join(f.repo, ...path.split('/')), '内容被修改');
    assert.throws(() => assertSampleResult(f.repo, f.work, f.unit, data.result, { sampleSnapshot: snapshot }), /变化|无效|冻结/);
  });
});

test('待人工决定、拒绝、错宿主或用控制记录自证运行不能放行', async (t) => {
  for (const variation of ['missing', 'rejected', 'host', 'control-output', 'control-source']) await t.test(variation, (st) => {
    const f = fixture(st);
    const data = trial(f, { includeDecision: variation !== 'missing', decision: variation === 'rejected' ? 'REJECTED' : 'APPROVED' });
    if (variation === 'host') data.sample.objectId = 'another-scene';
    if (variation === 'control-output') data.sample.runtimeRef = data.humanDecisionRef;
    if (variation === 'control-source') data.sample.sourceRefs = [data.sample.basisRef];
    if (['host', 'control-output', 'control-source'].includes(variation)) data.result.sampleEvidenceRef = f.write(`${data.root}/changed-sample.json`, data.sample);
    assert.throws(() => validateSampleResult(f.repo, f.work, f.unit, data.result));
  });
  const f = fixture(t);
  const data = trial(f, { includeDecision: false });
  f.unit.sampleDecisionRequired = false;
  assert.doesNotThrow(() => validateSampleResult(f.repo, f.work, f.unit, data.result));
});

test('有效旧样本复用同一对象与当前依据，不依赖旧工作项 COMPLETE/V5', (t) => {
  const f = fixture(t);
  const data = trial(f, { producer: 'previous-task' });
  assert.doesNotThrow(() => validateSampleResult(f.repo, f.work, f.unit, data.result));
  f.work.invalidatedRefs = [{ path: data.runtimeRef.path, state: 'V4' }];
  assert.throws(() => validateSampleResult(f.repo, f.work, f.unit, data.result), /已作废/);
});

test('三维已有结构化试接可补充元数据复用，运行观测仍逐项冻结', (t) => {
  const f = fixture(t);
  const data = trial(f);
  const sceneRef = f.write('src/game/sample-scene.ts', '// 合成试接场景');
  const runRef = f.write(`${data.root}/sample-run.json`, {
    ...f.context, phase: 'sample', executionMode: 'engine', engineSessionId: 'synthetic-session',
    startedAt: '2026-11-15T00:00:00Z', completedAt: '2026-11-15T00:01:00Z',
    sceneRef, commandEvidenceRef: data.runtimeRef,
    checks: ['camera', 'navigation', 'collision', 'interaction'].map((id) => ({ id, status: 'PASS', evidenceRef: data.runtimeRef })),
    modelBindings: [{ assetId: 'building-a', nodeId: 'World/FirstItem', outputRef: data.sourceRef }],
  });
  const review = f.read(data.humanDecisionRef);
  review.runtimeContextRef = runRef;
  data.sample.humanDecisionRef = f.write(data.humanDecisionRef.path, review);
  data.sample.sceneRef = sceneRef;
  data.sample.runtimeRef = runRef;
  data.sample.outputs = [data.sourceRef];
  data.result.sampleEvidenceRef = f.write(data.result.sampleEvidenceRef.path, data.sample);
  f.write(f.unit.resultPath, data.result);
  const snapshot = freezeSampleResult(f.repo, f.work, f.unit, data.result);
  assert(snapshot.references.some((ref) => ref.path === runRef.path));
  assert(snapshot.references.some((ref) => ref.path === data.runtimeRef.path));
  writeFileSync(join(f.repo, ...data.runtimeRef.path.split('/')), '原始运行输出已更改');
  assert.throws(() => assertSampleResult(f.repo, f.work, f.unit, data.result, { sampleSnapshot: snapshot }), /变化/);
});

test('控制引用与真实原始日志分别收集，计划快照冻结样本声明', (t) => {
  const f = fixture(t);
  const data = trial(f);
  const packageRef = f.write('spec/sample-package.json', f.pack);
  f.work.implementationPackageRef = packageRef;
  const all = collectSampleReferences(f.repo, f.work);
  const control = collectSampleControlReferences(f.repo, f.work);
  assert(all.includes(f.modelSpecRef.path));
  assert(all.includes(data.result.sampleEvidenceRef.path));
  assert(all.includes(data.runtimeRef.path));
  assert(all.includes(data.sourceRef.path));
  assert(control.includes(data.result.sampleEvidenceRef.path));
  assert(control.includes(data.humanDecisionRef.path));
  assert(!control.includes(data.runtimeRef.path));
  const snapshot = createExecutionPlanSnapshot(f.pack, { repo: f.repo });
  const changed = structuredClone(f.pack);
  changed.executionUnits[1].dependsOn = [];
  assert.notDeepEqual(createExecutionPlanSnapshot(changed, { repo: f.repo }), snapshot);
});

test('未声明样本的普通任务不读取执行状态，已声明样本仍拒绝损坏状态', (t) => {
  const f = fixture(t);
  const plainPack = { executionUnits: [{ unitId: 'ordinary', sequence: 1 }] };
  f.work.implementationPackageRef = f.write('spec/sample-free-package.json', plainPack);
  f.write(`${f.work.evidenceRoot}/execution-state.json`, '不是 JSON 的合成材料');
  assert.deepEqual(collectSampleReferences(f.repo, f.work), []);
  assert.deepEqual(collectSampleControlReferences(f.repo, f.work), []);
  f.write('spec/sample-free-package.json', f.pack);
  assert.throws(() => collectSampleReferences(f.repo, f.work), /不是有效 JSON/);
});

/** 通过公共 V1 工程入口建立可供本测试复用的真实控制器快照。 */
async function preparePublic(t) {
  const f = createWorld3DFixture(t, { productionRisk: 'high' });
  const initialized = await initializeWork({ repo: f.repo, args: { id: f.context.workItemId, stack: f.context.stack, type: 'SCENE', objective: '核对代表样本依赖', 'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d' } });
  const context = { repo: f.repo, workPath: initialized.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V1' });
  work = await readWork(context.repo, context.workPath);
  work.visual.candidateId = f.context.candidateId;
  work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
  await putJson(context.repo, context.workPath, work);
  const { packPath, units: initialUnits } = await bindImplementation({ ...context, work, stage: 'V1', unitPaths: ['src/game/function.ts'] });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(context.repo, context.workPath);
  await submitPassingUnits({ ...context, work, packPath, units: initialUnits });
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: initialUnits[0].resultPath });
  work = await readWork(context.repo, context.workPath);
  await bindEvidence({ ...context, work, packPath, stage: 'V1' });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'PASSED', args: {} });
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPreflight(f, work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V2' });
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V2', work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V3' });
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V3', work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V4' });
  work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(context.repo, context.workPath, work);
  f.work = work;
  f.unit = units(f.modelSpecRef)[0];
  return { ...context, f };
}

test('公开计划、记录与单元检查先冻结样本，再开放覆盖相同依据的批量', async (t) => {
  for (const producer of ['current', 'previous-task']) await t.test(producer, async (st) => {
  const { repo, workPath, f } = await preparePublic(st);
  const plan = { executionUnits: units(f.modelSpecRef).map(({ sequence, resultPath, ...entry }) => entry) };
  plan.systemCoverage = createSystemCoverage(repo, await readWork(repo, workPath), plan.executionUnits);
  const plain = { ...plan, executionUnits: plan.executionUnits.map(({ sampleRole, sampleScopeIds, sampleBasisRef, sampleDecisionRequired, ...unit }) => unit) };
  await putJson(repo, 'spec/missing-first-item-plan.json', plain);
  await assert.rejects(prepareWorkRecords({ repo, workItem: workPath, planPath: 'spec/missing-first-item-plan.json' }), /高风险模型批次需要一个/);
  await putJson(repo, 'spec/sample-plan.json', plan);
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'spec/sample-plan.json' });
  let work = await readWork(repo, workPath);
  const pack = JSON.parse(readFileSync(join(repo, work.implementationPackageRef.path), 'utf8'));
  assert.equal(pack.executionUnits[0].sampleRole, 'sample');
  assert.deepEqual(pack.executionUnits[1].dependsOn, ['sample']);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  f.work = work;
  f.unit = pack.executionUnits[0];
  const data = trial(f, { producer: producer === 'current' ? f.work.workItemId : producer, writeResult: false });
  // 该消费文件是当前单元的真实交付；试接记录及日志独立保存在 evidenceRoot。
  await put(repo, 'src/game/sample-consumer.ts', '// 合成样本接入');
  const output = `${work.evidenceRoot}/sample-command.log`;
  await put(repo, output, '合成命令输出');
  const forged = `${work.evidenceRoot}/review-alias.log`;
  linkSync(join(repo, ...data.humanDecisionRef.path.split('/')), join(repo, ...forged.split('/')));
  const report = { files: ['src/game/sample-consumer.ts'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }], evidence: [{ category: 'tests', path: forged }], sampleEvidenceRef: data.result.sampleEvidenceRef };
  await putJson(repo, 'spec/sample-report.json', report);
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'sample', reportPath: 'spec/sample-report.json' }), /控制记录/);
  assert.equal(existsSync(join(repo, ...f.unit.resultPath.split('/'))), false);
  report.evidence = [];
  await putJson(repo, 'spec/sample-report.json', report);
  await recordWorkResult({ repo, workItem: workPath, unitId: 'sample', reportPath: 'spec/sample-report.json' });
  await completeUnit({ repo, workItem: workPath, resultPath: f.unit.resultPath });
  const statePath = join(repo, work.evidenceRoot, 'execution-state.json');
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.deepEqual(state.activeBatch, ['batch']);
  assert(state.units[0].sampleSnapshot.references.some((ref) => ref.path === data.runtimeRef.path));
  const bytes = readFileSync(join(repo, ...data.sourceRef.path.split('/')));
  writeFileSync(join(repo, ...data.sourceRef.path.split('/')), '样本被替换');
  await put(repo, 'src/game/batch-production.ts', '// 合成批量结果');
  const batchOutput = `${work.evidenceRoot}/batch-command.log`;
  await put(repo, batchOutput, '合成批量命令输出');
  await putJson(repo, 'spec/batch-report.json', { files: ['src/game/batch-production.ts'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: batchOutput }], evidence: [] });
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'batch', reportPath: 'spec/batch-report.json' }), /变化|样本|Execution State/);
  writeFileSync(join(repo, ...data.sourceRef.path.split('/')), bytes);
  await recordWorkResult({ repo, workItem: workPath, unitId: 'batch', reportPath: 'spec/batch-report.json' });
  await completeUnit({ repo, workItem: workPath, resultPath: pack.executionUnits[1].resultPath });
  assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')).activeBatch, []);
  });
});
