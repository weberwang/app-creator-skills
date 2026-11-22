/** 用真实 CLI 与隔离夹具验证阶段四来源、模块方案和模块稿的交接。 */
import assert from 'node:assert/strict';
import { visualResearchFixture } from './visual-research-fixture.mjs';
import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { initializeWork, completeUnit, inspectFunctionSource, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertModuleRuntimeCoverage } from '../../skills/app-workflow-control/scripts/runtime/module-plan.mjs';
import { createFixture, put, readWork, putJson, createQualityChecks, reviewRecord, putVisualReview, frozenReview, bindImplementation, bindEvidence } from './controller-fixture.mjs';
import { attachFigmaBaselineFixture } from './figma-app-fixture.mjs';
import { writeSingleDomainFixture } from './single-domain-fixture.mjs';
import { syntheticDesignPng } from './visual-image-fixture.mjs';
import { moduleDesignItems, withModuleRules } from './module-rules-fixture.mjs';

const cliPath = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
const dimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

/** 使用 CLI 命令推进，保留错误输出以检查实际阻断原因。 */
function visualStage(repo, workPath, target) {
  const result = spawnSync(process.execPath, [cliPath, 'visual-stage', '--repo', repo, '--work-item', workPath, '--to', target], { encoding: 'utf8', windowsHide: true });
  return { status: result.status, output: result.stdout + result.stderr };
}

/** 使用真实命令执行记录完成基础工程，并冻结已经用户确认的全局基线。 */
async function finishFoundation(repo, baseline) {
  const initialized = await initializeWork({ repo, args: {
    id: 'foundation', stack: 'flutter', type: 'FOUNDATION', objective: '完成基础工程并冻结全局视觉',
  } });
  const workPath = initialized.metadata.workItemPath;
  let work = await readWork(repo, workPath);
  const freezePath = 'visual/foundation.json';
  await putJson(repo, freezePath, { schemaVersion: '1.0', foundationWorkItemPath: workPath,
    projectId: work.projectId, stack: work.stack, baselines: [{ route: 'figma-app', ref: baseline }] });
  work.foundationVisualRef = await frozenReview(repo, freezePath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await putJson(repo, workPath, work);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'foundation', unitPaths: ['lib/foundation.dart'] });
  const pack = JSON.parse(await readFile(resolve(repo, packPath), 'utf8'));
  pack.systemCoverage.modules[0].designRefs.push(work.foundationVisualRef);
  await putJson(repo, packPath, pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await put(repo, units[0].paths[0], '// 基础工程隔离测试\n');
  const execution = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(execution.status, 0, execution.stderr);
  const output = `${work.evidenceRoot}/command.txt`;
  await put(repo, output, execution.stdout);
  await putJson(repo, units[0].resultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, unitId: units[0].unitId, sequence: 1,
    exitCode: 0, files: units[0].paths,
    commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }],
  });
  await completeUnit({ repo, workItem: workPath, resultPath: units[0].resultPath });
  const manifestPath = `${work.evidenceRoot}/manifest.json`;
  await putJson(repo, manifestPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath,
    items: [{ category: 'analyze', status: 'PASS', path: output }, { category: 'tests', status: 'PASS', path: output }],
  });
  work = await readWork(repo, workPath);
  work.evidenceRef = { path: manifestPath };
  work.gateStatus.F3 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} });
  return await frozenReview(repo, freezePath);
}

/** 构造真实文件摘要与人工选择记录所绑定的全局方向。 */
async function makeBaseline(repo, work) {
  const checks = await createQualityChecks(repo, 'visual/reviews/baseline');
  const candidates = [];
  for (const candidateId of ['direction-a', 'direction-b', 'direction-c']) {
    const path = await put(repo, `visual/candidates/${candidateId}.png`, syntheticDesignPng(candidateId));
    candidates.push({ candidateId, path, qualityChecks: candidateId === 'direction-a' ? checks : dimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })) });
  }
  const target = await frozenReview(repo, candidates[0].path);
  const reviewPath = 'visual/baseline-review.json';
  await putJson(repo, reviewPath, { ...reviewRecord({ objectId: 'baseline', candidateId: 'direction-a', stage: 'BASELINE', purpose: 'visual-baseline', userMessageRef: 'test://baseline', targetRef: target.path, qualityChecks: checks }), targetSha256: target.sha256 });
  const baselinePath = 'visual/baseline.json';
  await putJson(repo, baselinePath, { schemaVersion: '1.0', baselineId: 'baseline', projectId: work.projectId, stack: work.stack, visualResearchRef: visualResearchFixture(repo, work.projectId, work.stack), candidates, selectedCandidateId: 'direction-a', selectionReviewRef: await frozenReview(repo, reviewPath) });
  work.globalVisualBaselineRef = await frozenReview(repo, baselinePath);
  attachFigmaBaselineFixture(repo, work);
  return work.globalVisualBaselineRef;
}

/** 登记完整的模块方案，但无需创建运行产出或实施包。 */
async function bindPlan(repo, workPath, names = {}) {
  const work = await readWork(repo, workPath);
  const definitions = [
    ['element', 'submit-button'], ['function', 'submit'], ['state', names.state ?? 'ready'], ['state', 'working'],
    ['step', names.step ?? 'enter'], ['step', 'submit'], ['transition', names.transition ?? 'start'],
    ['progress', 'halfway'],
  ];
  const plan = withModuleRules({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId,
    dependencies: [], entries: definitions.map(([kind, id]) => ({
      kind, id, description: `测试 ${kind} ${id}`, acceptance: '满足已约定结果',
      requirementId: 'fixture-requirement-1', command: 'node --test lib/module.spec.mjs',
    })) });
  await putJson(repo, 'spec/module-plan.json', plan);
  work.visual.modulePlanRef = await frozenReview(repo, 'spec/module-plan.json');
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await putJson(repo, workPath, work);
  return plan;
}

/** 生成与原生 Figma 领域合同相连的模块稿及 V2 用户确认。 */
async function makeV2(repo, workPath, plan) {
  const work = await readWork(repo, workPath);
  work.visual.candidateId = 'direction-a';
  const targetPath = await put(repo, 'assets/visual/module.png', syntheticDesignPng('module'));
  const reviewPath = 'visual/module-target-review.json';
  const checks = await createQualityChecks(repo, 'visual/reviews/module');
  await putVisualReview(repo, reviewPath, { ...reviewRecord({
    objectId: work.visual.objectId, candidateId: 'direction-a', stage: 'V2', purpose: 'target',
    userMessageRef: 'test://module-target', targetRef: targetPath, qualityChecks: checks,
  }), scope: { kind: 'full-object', designItemIds: [], conditionIds: [] } }, work.workItemId, targetPath);
  work.visual.reviews.V2 = await frozenReview(repo, reviewPath);
  // 使用同一套已确认节点制作 V2 效果稿和 V3 拆解夹具，避免夹具重生成不同快照。
  await writeSingleDomainFixture(repo, work, 'V3');
  const decompositionRef = work.visual.domainEvidenceRef;
  const domain = JSON.parse(await readFile(resolve(repo, decompositionRef.path), 'utf8'));
  await putJson(repo, 'visual/module-domain-v2.json', { ...domain, visualStage: 'V2' });
  work.visual.domainEvidenceRef = await frozenReview(repo, 'visual/module-domain-v2.json');
  const targetRef = await frozenReview(repo, targetPath);
  const design = { schemaVersion: '1.0', workItemId: work.workItemId,
    modulePlanRef: work.visual.modulePlanRef, baselineRef: work.globalVisualBaselineRef,
    entries: moduleDesignItems(plan).map((entry) => ({
      kind: entry.kind, id: entry.id, targetRef, designRef: domain.figmaDesignRef,
    })) };
  /** 用新摘要重写清单和用户确认，模拟确认当前设计版本。 */
  async function saveDesign() {
    await putJson(repo, 'visual/module-design.json', design);
    work.visual.moduleDesignRef = await frozenReview(repo, 'visual/module-design.json');
    await putJson(repo, 'visual/module-design-review.json', { schemaVersion: '1.0', workItemId: work.workItemId,
      stage: 'V2', decision: 'approved', userMessageRef: 'test://module-design', subjectRef: work.visual.moduleDesignRef });
    work.visual.moduleDesignReviewRef = await frozenReview(repo, 'visual/module-design-review.json');
    await putJson(repo, workPath, work);
  }
  await saveDesign();
  return { design, saveDesign, decompositionRef };
}

test('控制器以已确认的基线和模块稿贯通 V1 至 V5 并完成验收', async (t) => {
  const { repo, workPath } = await createFixture({ id: 'module', stack: 'flutter', type: 'PAGE' });
  t.after(() => rm(repo, { recursive: true, force: true }));
  let work = await readWork(repo, workPath);
  const baseline = await makeBaseline(repo, work);
  work.globalVisualBaselineRef = baseline;
  await putJson(repo, workPath, work);
  const plan = await bindPlan(repo, workPath);
  let attempt = visualStage(repo, workPath, 'V2');
  assert.notEqual(attempt.status, 0, '缺少已完成的全局视觉来源必须阻断');
  assert.match(attempt.output, /基础视觉|冻结/);

  const foundationRef = await finishFoundation(repo, baseline);
  work = await readWork(repo, workPath);
  work.foundationVisualRef = foundationRef;
  const scope = { schemaVersion: '1.0', scopeId: 'version', projectId: work.projectId, stack: work.stack,
    objects: [{ objectId: 'module', workItemType: 'PAGE' }],
    states: [{ stateId: 'ready', objectId: 'module', description: '可操作' }, { stateId: 'working', objectId: 'module', description: '处理中' }],
    steps: [
      { stepId: 'enter', objectIds: ['module'], stateIds: ['ready'], precondition: '可进入', action: '进入', expectedResult: '显示页面', caseId: 'enter-case' },
      { stepId: 'submit', objectIds: ['module'], stateIds: ['working'], precondition: '可提交', action: '提交', expectedResult: '处理中', caseId: 'submit-case' },
    ],
    transitions: [{ transitionId: 'start', fromStateId: 'ready', toStateId: 'working', trigger: '提交', expectedResult: '处理中', caseId: 'submit-case' }],
    batches: [{ batchId: 'batch', objectIds: ['module'], stepIds: ['enter', 'submit'], transitionIds: ['start'] }] };
  await putJson(repo, 'spec/scope.json', scope);
  work.productionScopeRef = await frozenReview(repo, 'spec/scope.json');
  work.productionBatchId = 'batch';
  const incompletePlan = structuredClone(plan);
  incompletePlan.entries.find((entry) => entry.kind === 'state' && entry.id === 'working').id = 'other';
  await putJson(repo, 'spec/module-plan.json', withModuleRules(incompletePlan));
  work.visual.modulePlanRef = await frozenReview(repo, 'spec/module-plan.json');
  await putJson(repo, workPath, work);
  attempt = visualStage(repo, workPath, 'V2');
  assert.notEqual(attempt.status, 0, 'V1 必须覆盖本批已登记的全部状态');
  assert.match(attempt.output, /遗漏生产范围中的 state/);
  const missingCombination = structuredClone(plan);
  missingCombination.entries.push({
    ...plan.entries.find((entry) => entry.kind === 'function'),
    id: 'retry', trigger: '收到重试请求', resolution: '恢复为可操作状态',
  });
  missingCombination.rules.flows[0].functionIds.push('retry');
  await putJson(repo, 'spec/module-plan.json', missingCombination);
  work.visual.modulePlanRef = await frozenReview(repo, 'spec/module-plan.json');
  await putJson(repo, workPath, work);
  attempt = visualStage(repo, workPath, 'V2');
  assert.notEqual(attempt.status, 0, '同流程机制缺少组合裁决必须阻断 V2');
  assert.match(attempt.output, /缺少机制 .* 的组合规则/);

  const question = '处理中是否允许重复提交？';
  await putJson(repo, 'spec/module-plan.json', { ...plan, rules: { ...plan.rules, openQuestions: [question] } });
  work.visual.modulePlanRef = await frozenReview(repo, 'spec/module-plan.json');
  const grillingPath = 'spec/pending-grilling.json';
  await putJson(repo, grillingPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, status: 'OPEN',
    decisions: [{ question, impact: '影响状态转换', options: ['允许', '禁止'], recommendation: '禁止' }],
  });
  work.grillingRef = { path: grillingPath };
  await putJson(repo, workPath, work);
  attempt = visualStage(repo, workPath, 'V2');
  assert.notEqual(attempt.status, 0, '未决业务拷问必须阻断 V2');
  assert.match(attempt.output, /未决拷问/);
  const answer = { question, answer: '处理中忽略重复提交', userMessageRef: 'test://submit-decision' };
  await putJson(repo, grillingPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, status: 'CLOSED', userMessageRef: answer.userMessageRef, decisions: [answer],
  });
  attempt = visualStage(repo, workPath, 'V2');
  assert.notEqual(attempt.status, 0, '关闭 grilling 后仍须回填方案');
  assert.match(attempt.output, /V1 存在未决规则/);
  plan.entries.find((entry) => entry.kind === 'function').resolution = answer.answer;
  await putJson(repo, 'spec/module-plan.json', plan);
  work.visual.modulePlanRef = await frozenReview(repo, 'spec/module-plan.json');
  await putJson(repo, workPath, work);
  attempt = visualStage(repo, workPath, 'V2');
  assert.equal(attempt.status, 0, attempt.output);
  work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V2');
  assert.equal(work.evidenceRef, null);
  assert.equal(work.implementationPackageRef, null);

  const { design, saveDesign, decompositionRef } = await makeV2(repo, workPath, plan);
  // 每类条目分别缺失时即使用户确认了当前清单，也不得创建 V3 归档或修改阶段。
  const fullEntries = design.entries;
  for (const kind of ['element', 'function', 'state', 'step', 'transition', 'progress', 'flow']) {
    const missing = fullEntries.find((entry) => entry.kind === kind);
    design.entries = fullEntries.filter((entry) => entry !== missing);
    await saveDesign();
    attempt = visualStage(repo, workPath, 'V3');
    assert.notEqual(attempt.status, 0, `缺少 ${kind} 必须阻断 V3`);
    assert.ok(attempt.output.includes(`遗漏 V1 条目：${kind}:${missing.id}`), attempt.output);
    const unchanged = await readWork(repo, workPath);
    assert.equal(unchanged.visual.stage, 'V2');
    assert.equal(unchanged.revision, work.revision);
    assert.equal(unchanged.visual.versionDesignSnapshotRef, undefined);
  }
  design.entries = fullEntries;
  await saveDesign();
  attempt = visualStage(repo, workPath, 'V3');
  assert.equal(attempt.status, 0, attempt.output);
  work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V3');
  assert.ok(work.visual.versionDesignSnapshotRef?.sha256);

  // 改写同一设计清单不能借旧确认或旧 V2 归档继续推进。
  const oldDesign = JSON.parse(await readFile(resolve(repo, work.visual.moduleDesignRef.path), 'utf8'));
  await putJson(repo, work.visual.moduleDesignRef.path, { ...oldDesign, entries: oldDesign.entries.slice(1) });
  attempt = visualStage(repo, workPath, 'V4');
  assert.notEqual(attempt.status, 0, 'V3 换稿必须阻断后续推进');
  assert.match(attempt.output, /变化|确认|冻结|摘要/);

  await putJson(repo, work.visual.moduleDesignRef.path, oldDesign);
  work.visual.domainEvidenceRef = decompositionRef;
  await putJson(repo, workPath, work);
  attempt = visualStage(repo, workPath, 'V4');
  assert.equal(attempt.status, 0, attempt.output);

  work = await readWork(repo, workPath);
  const component = await put(repo, 'lib/features/module/module_view.dart', 'class ModuleView {}\n');
  const componentCheck = await put(repo, `${work.evidenceRoot}/component.txt`, '隔离测试检查组件。\n');
  const assetPath = 'visual/module-asset-review.json';
  await putJson(repo, assetPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4', candidateId: 'direction-a',
    technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: 'test://asset-review',
    qualityChecks: await createQualityChecks(repo, 'visual/reviews/asset'),
    assets: [{ assetId: 'module-native', assetType: 'native-component', output: component, componentEvidenceRef: componentCheck }],
  });
  work.assetReviewRef = await frozenReview(repo, assetPath);
  const assetStagePath = 'visual/module-v4-review.json';
  await putJson(repo, assetStagePath, reviewRecord({ objectId: work.visual.objectId, candidateId: 'direction-a',
    stage: 'V4', purpose: 'imported-assets', userMessageRef: 'test://asset-review' }));
  work.visual.reviews.V4 = await frozenReview(repo, assetStagePath);
  await writeSingleDomainFixture(repo, work, 'V4');
  await putJson(repo, workPath, work);
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
  work = await readWork(repo, workPath);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'V4', unitPaths: ['lib/sample.dart'] });
  const pack = JSON.parse(await readFile(resolve(repo, packPath), 'utf8'));
  pack.productionScopeRef = work.productionScopeRef;
  pack.productionBatchId = work.productionBatchId;
  await putJson(repo, packPath, pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await put(repo, units[0].paths[0], '// 模块资源准备\n');
  const execution = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(execution.status, 0, execution.stderr);
  const output = `${work.evidenceRoot}/command.txt`;
  await put(repo, output, execution.stdout);
  await putJson(repo, units[0].resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId,
    stack: work.stack, implementationPackageRef: packPath, unitId: units[0].unitId, sequence: 1, exitCode: 0,
    files: units[0].paths, commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }] });
  await completeUnit({ repo, workItem: workPath, resultPath: units[0].resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage: 'V4' });
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  attempt = visualStage(repo, workPath, 'V5');
  assert.equal(attempt.status, 0, attempt.output);

  work = await readWork(repo, workPath);
  const runtimeImage = await put(repo, 'visual/module-runtime.png', '仅供合同测试的运行画面');
  const runtimePath = 'visual/module-v5-review.json';
  await putVisualReview(repo, runtimePath, reviewRecord({ objectId: work.visual.objectId, candidateId: 'direction-a',
    stage: 'V5', purpose: 'runtime-acceptance', userMessageRef: 'test://runtime-reviewed', targetRef: runtimeImage }),
  work.workItemId, design.entries[0].targetRef.path);
  work.visual.reviews.V5 = await frozenReview(repo, runtimePath);
  await writeSingleDomainFixture(repo, work, 'V5');
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
  work = await readWork(repo, workPath);
  const v5 = await bindImplementation({ repo, work, workPath, stage: 'V5',
    commands: ['node --test lib/module.spec.mjs'], unitPaths: ['lib/module.mjs'] });
  const v5Pack = JSON.parse(await readFile(resolve(repo, v5.packPath), 'utf8'));
  v5Pack.productionScopeRef = work.productionScopeRef;
  v5Pack.productionBatchId = work.productionBatchId;
  v5Pack.executionUnits[0].paths.push('lib/module.spec.mjs');
  await putJson(repo, v5.packPath, v5Pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await put(repo, 'lib/module.mjs', `export function enter() { return { state: 'ready', progress: 0 }; }\nexport function submit() { return { state: 'working', progress: 0.5 }; }\n`);
  await put(repo, 'lib/module.spec.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { enter, submit } from './module.mjs';\ntest('进入模块', () => assert.deepEqual(enter(), { state: 'ready', progress: 0 }));\ntest('提交并更新进度', () => assert.deepEqual(submit(), { state: 'working', progress: 0.5 }));\n`);
  const v5Execution = spawnSync(process.execPath, ['--test', 'lib/module.spec.mjs'], { cwd: repo, encoding: 'utf8', windowsHide: true });
  assert.equal(v5Execution.status, 0, v5Execution.stdout + v5Execution.stderr);
  const v5Output = `${work.evidenceRoot}/module-tests.txt`;
  await put(repo, v5Output, v5Execution.stdout + v5Execution.stderr);
  await putJson(repo, v5.units[0].resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId,
    stack: work.stack, implementationPackageRef: v5.packPath, unitId: v5.units[0].unitId, sequence: 1, exitCode: 0,
    files: v5Pack.executionUnits[0].paths, commandOutputs: [{ command: 'node --test lib/module.spec.mjs', exitCode: 0, outputFile: v5Output }] });
  await completeUnit({ repo, workItem: workPath, resultPath: v5.units[0].resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath: v5.packPath, stage: 'V5' });
  work = await readWork(repo, workPath);
  const coveragePath = `${work.evidenceRoot}/production-coverage.json`;
  await putJson(repo, coveragePath, { schemaVersion: '1.0', scopeId: 'version', workItemId: work.workItemId,
    projectId: work.projectId, stack: work.stack, productionBatchId: 'batch', implementationPackageRef: v5.packPath,
    visualStage: 'V5', status: 'PASS', cases: [
      { caseId: 'enter-case', objectIds: ['module'], stepIds: ['enter'], stateIds: ['ready'], transitions: [], evidenceRef: await frozenReview(repo, v5Output) },
      { caseId: 'submit-case', objectIds: ['module'], stepIds: ['submit'], stateIds: ['ready', 'working'], transitions: [{ transitionId: 'start', fromStateId: 'ready', toStateId: 'working' }], evidenceRef: await frozenReview(repo, v5Output) },
    ] });
  const v5Manifest = JSON.parse(await readFile(resolve(repo, work.evidenceRef.path), 'utf8'));
  v5Manifest.items.push({ category: 'tests', status: 'PASS', path: v5Output }, { category: 'production-coverage', status: 'PASS', path: coveragePath });
  await putJson(repo, work.evidenceRef.path, v5Manifest);
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  const completed = await transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} });
  assert.ok(completed.stage.endsWith('/COMPLETE'));
  const runtimeSource = loadWork(repo, workPath);
  assert.ok(runtimeSource.visual.moduleRuntimeRef, 'V5 通过后固定运行证据摘要');
  assert.equal(inspectFunctionSource(repo, runtimeSource, { historical: true }).status, 'PASS');
  const commandOutput = await readFile(resolve(repo, v5Output), 'utf8');
  await put(repo, v5Output, '原地改写了验收命令输出\n');
  const changedEvidence = inspectFunctionSource(repo, runtimeSource, { historical: true });
  assert.notEqual(changedEvidence.status, 'PASS');
  assert.match(changedEvidence.blocking.join('\n'), /V5 .*已变化/);
  await put(repo, v5Output, commandOutput);
  const manifestPath = runtimeSource.evidenceRef.path;
  const originalManifest = await readFile(resolve(repo, manifestPath), 'utf8');
  await put(repo, manifestPath, `${originalManifest}\n`);
  assert.match(inspectFunctionSource(repo, runtimeSource).blocking.join('\n'), /V5 验收材料内容已变化/);
});

test('V5 验收命令必须覆盖 V1 每个方案条目的当前需求', () => {
  const plan = { entries: [
    { kind: 'function', id: 'submit', requirementId: 'submit', command: 'node --test submit.test.mjs' },
    { kind: 'state', id: 'failure', requirementId: 'recovery', command: 'node --test recovery.test.mjs' },
    { kind: 'progress', id: 'halfway', requirementId: 'submit', command: 'node --test submit.test.mjs' },
  ] };
  const pack = { systemCoverage: {
    requirements: [
      { requirementId: 'submit', scope: 'current', moduleIds: ['submit-module'] },
      { requirementId: 'recovery', scope: 'current', moduleIds: ['recovery-module'] },
    ],
    modules: [
      { moduleId: 'submit-module', verifications: [{ unitId: 'submit-unit', command: 'node --test submit.test.mjs' }] },
      { moduleId: 'recovery-module', verifications: [{ unitId: 'recovery-unit', command: 'node --test recovery.test.mjs' }] },
    ],
  } };
  assert.doesNotThrow(() => assertModuleRuntimeCoverage(plan, pack));
  pack.systemCoverage.modules[1].verifications = [{ unitId: 'recovery-unit', command: 'node --test unrelated.test.mjs' }];
  assert.throws(() => assertModuleRuntimeCoverage(plan, pack), /遗漏 V1 验收项 state:failure/);
  // 其他模块中的同名命令不能替代当前需求自己的验收映射。
  pack.systemCoverage.modules[0].verifications.push({ unitId: 'submit-unit', command: 'node --test recovery.test.mjs' });
  assert.throws(() => assertModuleRuntimeCoverage(plan, pack), /遗漏 V1 验收项 state:failure/);
  pack.systemCoverage.modules[1].verifications[0].command = 'node --test recovery.test.mjs';
  pack.systemCoverage.requirements[1].scope = 'later';
  assert.throws(() => assertModuleRuntimeCoverage(plan, pack), /遗漏 V1 验收项 state:failure/);
});
