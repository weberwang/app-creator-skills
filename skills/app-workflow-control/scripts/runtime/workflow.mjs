import { existsSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { GATES, STAGE_LABELS, STAGES, TRANSITIONS, VERSION, VISUAL_STAGES } from './constants.mjs';
import { assertFinalCompletion, assertGates, assertNoOpenGrilling, assertReadyToPass, assertTransitionInputs, assertVisualReview, bindWorkSource, hasPreciseApproval, loadPackage, validateEvidence, validateGlobalBaseline, validateUnitResult } from './artifacts.mjs';
import { atomicWriteJson, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { loadProfile, requireOneOf, requireText, validateWork } from './validation.mjs';
import { createExecutionPlanSnapshot, expectedActiveBatch } from './execution-batches.mjs';
import { withWorkLock } from './work-lock.mjs';
import { assertWorkflowPolicy, workflowMode } from './task-policy.mjs';
import { assertReleaseTransition } from './release-policy.mjs';

/** 产出供 CLI /工具稳定解析的统一结果结构。 */
export function response({ status, work = null, changed = false, blocking = [], next = [], metadata = {} }) {
  return {
    status,
    stage: work ? `${work.stageId}/${work.globalState}` : null,
    changed,
    blocking,
    next,
    metadata: {
      workflowView: work ? {
        phaseId: work.stageId, phaseLabel: STAGE_LABELS[work.stageId],
        visualStage: work.visual?.stage ?? null, workItemType: work.workItemType,
        workflowMode: workflowMode(work), releaseIntent: work.releaseIntent ?? null,
        completionKind: work.globalState === 'COMPLETE' ? (work.workItemType === 'RELEASE' ? `release-${work.releaseIntent === 'prepare' ? 'prepared' : 'published'}` : 'task-complete') : null,
      } : null,
      ...metadata,
    },
  };
}

/** 将项目内工作项读入并验证栈 profile 与路径合同。 */
export function loadWork(repo, file) {
  const work = readJson(repo, file, 'Work Item');
  validateWork(work, { repo });
  return bindWorkSource(work, repoPath(repo, file, 'Work Item 路径').relative);
}

/** 创建不覆盖已有文件的最小 Work Item 与固定目录布局。 */
export async function initializeWork({ repo, args }) {
  requireText(args?.id, '--id');
  const workPath = args['work-item'] ?? `.workflow-control/work-items/${args.id}.json`;
  return withWorkLock(repo, workPath, () => initializeWorkLocked({ repo, args }));
}

/** 在已取得 Work Item 排他锁后执行初始化，避免同名并发创建竞争。 */
async function initializeWorkLocked({ repo, args }) {
  const id = args.id;
  const stack = args.stack;
  const type = args.type ?? 'FOUNDATION';
  const mode = args.mode ?? 'standard';
  const objective = args.objective;
  requireText(id, '--id');
  requireText(objective, '--objective');
  requireOneOf(type, ['PROJECT', 'FOUNDATION', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'], '--type');
  const profile = loadProfile(repo, stack);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)) throw new WorkflowError('--id 只能包含字母、数字、点、下划线和短横线');
  const workPath = args['work-item'] ?? `.workflow-control/work-items/${id}.json`;
  const workTarget = repoPath(repo, workPath, 'Work Item 输出路径');
  if (existsSync(workTarget.absolute)) throw new WorkflowError(`拒绝覆盖现有 Work Item：${workPath}`, 'ALREADY_EXISTS');
  const visualType = ['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(type);
  if (visualType && type === 'DISPLAY_LAYER') {
    requireText(args['host-id'], '--host-id');
    requireOneOf(args['layer-type'], ['modal', 'popup', 'drawer', 'toast'], '--layer-type');
  }
  const work = {
    schemaVersion: VERSION,
    workItemId: id,
    projectId: args['project-id'] ?? 'default-project',
    stack,
    workItemType: type,
    stageId: type === 'PROJECT' ? 'requirements-scope' : type === 'INTEGRATION' ? 'global-integration-validation' : type === 'RELEASE' ? 'release' : visualType ? 'scene-production' : 'foundation-engineering',
    globalState: mode === 'light' ? 'REVIEW' : 'INTAKE',
    workflowMode: mode,
    ...(type === 'RELEASE' ? { releaseIntent: args['release-intent'] ?? 'prepare' } : {}),
    objective,
    allowedPaths: [...profile.runtimeRoots],
    forbiddenPaths: ['node_modules/**', '**/.git/**', '**/Library/**', '**/Temp/**'],
    gateStatus: Object.fromEntries(GATES.map((gate) => [gate, 'NOT_RUN'])),
    revision: 0,
    implementationPackageRef: null,
    planningRef: null,
    evidenceRef: null,
    globalVisualBaselineRef: null,
    assetReviewRef: null,
    grillingRef: null,
    visualBaselineRequired: visualType,
    evidenceRoot: `.workflow-control/evidence/${id}`,
    ...(visualType ? { visual: {
      objectId: args['object-id'] ?? id,
      stage: 'V0',
      ...(type === 'DISPLAY_LAYER' ? { hostId: args['host-id'], layerType: args['layer-type'] } : {}),
      reviews: {},
    } } : {}),
  };
  if (type !== 'RELEASE' && args['release-intent'] !== undefined) throw new WorkflowError('只有 RELEASE 可以使用 --release-intent');
  validateWork(work, { repo });
  await atomicWriteJson(repo, workPath, work);
  return response({ status: 'PASS', work, changed: true, metadata: { workItemPath: workPath, stackProfile: profile.displayName } });
}

/** 无写入地收集 Work Item 阶段和资产引用的阻断原因。 */
export function inspectWork(repo, work, { strict = false } = {}) {
  const blocking = [];
  const next = [];
  let activeBatch = null;
  try {
    assertTransitionInputs(repo, work, work.globalState);
  } catch (error) {
    blocking.push(error.message);
  }
  if (work.globalState === 'INTAKE' && work.gateStatus.F0 !== 'PASS') next.push('完成范围与操作边界调查并提交 F0 事实');
  if (work.globalState === 'BASELINE' && work.gateStatus.F1 !== 'PASS') next.push('完成项目基线与验收边界并通过 F1');
  if (work.globalState === 'PROPOSAL' && work.gateStatus.F2 !== 'PASS') next.push('明确工作范围及技术实施方案并通过 F2');
  if (workflowMode(work) === 'light' && work.globalState === 'REVIEW') {
    try { assertGates(work, ['F0', 'F1', 'F2']); }
    catch (error) { blocking.push(error.message); next.push('先记录本次范围、验收与实施方案的实际自评，再开始轻量实施'); }
  }
  if (['REVIEW', 'IMPLEMENTING', 'VALIDATING'].includes(work.globalState) && !work.implementationPackageRef) {
    next.push('冻结与当前工作项绑定的 Implementation Package');
  }
  const executionStates = ['IMPLEMENTING', 'VALIDATING', 'PASSED', 'INTEGRATING', 'RELEASE_APPROVAL_REQUIRED', 'RELEASING', 'COMPLETE'];
  const recoveringImplementation = work.globalState === 'BLOCKED' && work.blockedRecord?.returnState === 'IMPLEMENTING';
  if (executionStates.includes(work.globalState) || recoveringImplementation) {
    try {
      const execution = inspectExecution(repo, work, { requireComplete: work.globalState !== 'IMPLEMENTING' && !recoveringImplementation });
      activeBatch = execution.activeBatch;
      if (strict && work.globalState === 'IMPLEMENTING' && activeBatch.length) {
        blocking.push(`执行批次尚未全部完成：${activeBatch.join(', ')}`);
      }
    } catch (error) { blocking.push(error.message); }
  }
  if (['VALIDATING', 'PASSED', 'INTEGRATING', 'RELEASE_APPROVAL_REQUIRED', 'RELEASING', 'COMPLETE'].includes(work.globalState)) {
    try {
      if (work.globalState === 'COMPLETE') assertFinalCompletion(repo, work);
      else assertReadyToPass(repo, work);
    } catch (error) { blocking.push(error.message); }
  }
  const target = TRANSITIONS[work.globalState] ?? [];
  const safeNext = target.filter((state) => !['IMPLEMENTING', 'RELEASING', 'RETURN', 'BLOCKED'].includes(state) &&
    !(work.globalState === 'IMPLEMENTING' && activeBatch?.length && state === 'VALIDATING'));
  if (!next.length && safeNext.length) next.push(...safeNext.map((state) => `可按门禁显式迁移到 ${state}`));
  if (work.globalState === 'REVIEW') next.push('工作流在生产实现前停止；显式迁移到 IMPLEMENTING 并生成新证据目录');
  if (strict) {
    const requiredByState = { INTAKE: ['F0'], BASELINE: ['F1'], PROPOSAL: ['F2'], REVIEW: ['F0', 'F1', 'F2'] };
    for (const gate of requiredByState[work.globalState] ?? []) if (work.gateStatus[gate] !== 'PASS') blocking.push(`${gate} 尚未 PASS`);
    if (work.globalState === 'REVIEW' && !work.implementationPackageRef) blocking.push('尚未冻结 Implementation Package');
    if (work.globalState === 'PASSED') {
      try { assertReadyToPass(repo, work); } catch (error) { blocking.push(error.message); }
    }
    if (work.globalState === 'RELEASE_APPROVAL_REQUIRED') {
      if (!hasPreciseApproval(work)) blocking.push('当前发布动作尚未获得精确用户批准');
      else if (work.gateStatus.F4 !== 'PASS') blocking.push('F4 尚未 PASS，不能进入 RELEASING');
    }
    if (work.globalState === 'COMPLETE' || work.globalState === 'RELEASING') {
      // check 在发布边界要求真实完成记录，但不会执行发布动作。
      try { assertFinalCompletion(repo, work); } catch (error) { blocking.push(error.message); }
    }
  }
  return { status: blocking.length ? 'BLOCKED' : 'PASS', blocking, next: [...new Set(next)], activeBatch };
}

/** 校验当前有序执行计划，返回尚未闭合的首个单元。 */
function inspectExecution(repo, work, { requireComplete = false } = {}) {
  const pack = loadPackage(repo, work);
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  const state = readJson(repo, statePath, 'Execution State');
  const activeBatch = validateExecutionState(repo, work, pack, state, { requireComplete });
  return { pack, state, activeBatch };
}

/** 校验运行时状态、冻结计划、当前批次和全部已通过单元的真实结果。 */
function validateExecutionState(repo, work, pack, state, { requireComplete = false } = {}) {
  if (state.schemaVersion !== VERSION || state.workItemId !== work.workItemId || state.stack !== work.stack || state.implementationPackageRef !== work.implementationPackageRef.path) {
    throw new WorkflowError('Execution State 未绑定当前工作项和实施包');
  }
  const plan = createExecutionPlanSnapshot(pack, { repo });
  if (JSON.stringify(state.executionPlan) !== JSON.stringify(plan)) throw new WorkflowError('冻结的执行计划与当前实施包不匹配');
  if (!Array.isArray(state.units) || state.units.length !== pack.executionUnits.length) throw new WorkflowError('Execution State 与实施包的执行单元数量不一致');
  for (const [index, unit] of pack.executionUnits.entries()) {
    const resultState = state.units[index];
    if (resultState.unitId !== unit.unitId || resultState.sequence !== unit.sequence || !['PENDING', 'PASS'].includes(resultState.status)) {
      throw new WorkflowError(`Execution State 单元次序或状态无效：${unit.unitId}`);
    }
  }
  // 仅当前首个未闭合批次允许组内部分 PASS；所有后续批次必须保持 PENDING。
  let firstIncompleteBatchSeen = false;
  for (const batch of plan.batches) {
    const statuses = batch.unitIds.map((unitId) => state.units.find((unit) => unit.unitId === unitId).status);
    if (!statuses.every((status) => status === 'PASS')) {
      if (firstIncompleteBatchSeen && statuses.some((status) => status === 'PASS')) {
        throw new WorkflowError(`未来执行批次不能预先登记 PASS：${batch.unitIds.join(', ')}`);
      }
      firstIncompleteBatchSeen = true;
      continue;
    }
    if (firstIncompleteBatchSeen) throw new WorkflowError(`未来执行批次不能预先登记 PASS：${batch.unitIds.join(', ')}`);
  }
  for (const [index, unit] of pack.executionUnits.entries()) {
    const resultState = state.units[index];
    if (resultState.status === 'PASS') {
      const resultPath = requireFile(repo, unit.resultPath, '执行单元结果');
      const result = readJson(repo, resultPath, 'Execution Unit Result');
      validateUnitResult(repo, work, pack, unit, result);
    }
  }
  const activeBatch = expectedActiveBatch(plan.batches, state.units);
  if (!Array.isArray(state.activeBatch) || JSON.stringify(state.activeBatch) !== JSON.stringify(activeBatch)) {
    throw new WorkflowError('Execution State.activeBatch 与已完成结果不一致');
  }
  if (requireComplete && activeBatch.length) throw new WorkflowError(`仍有执行批次未完成：${activeBatch.join(', ')}`);
  return activeBatch;
}

/** 按结果中的 unitId 提交当前批次成员，整批通过后才开放下一批。 */
export async function completeUnit(args) {
  return withWorkLock(args.repo, args.workItem, () => completeUnitLocked(args));
}

/** 在工作项锁内提交并回滚失败的双文件状态写入。 */
async function completeUnitLocked({ repo, workItem, resultPath }) {
  const work = loadWork(repo, workItem);
  if (work.globalState !== 'IMPLEMENTING') throw new WorkflowError('unit-check 只允许用于 IMPLEMENTING 状态');
  const pack = loadPackage(repo, work);
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  const state = readJson(repo, statePath, 'Execution State');
  const activeBatch = validateExecutionState(repo, work, pack, state);
  if (!activeBatch.length) throw new WorkflowError('所有执行单元都已经通过');
  const normalizedResultPath = repoPath(repo, resultPath, 'Execution Unit Result 路径').relative;
  const result = readJson(repo, normalizedResultPath, 'Execution Unit Result');
  const resultUnitId = result && typeof result === 'object' && !Array.isArray(result) ? result.unitId : null;
  const unit = pack.executionUnits.find((entry) => entry.unitId === resultUnitId);
  if (!unit) throw new WorkflowError(`Execution Unit Result.unitId 不在冻结计划中：${resultUnitId}`);
  if (!activeBatch.includes(unit.unitId)) throw new WorkflowError(`执行单元不属于当前批次：${unit.unitId}`);
  if (state.units.find((entry) => entry.unitId === unit.unitId)?.status === 'PASS') throw new WorkflowError(`执行单元已通过：${unit.unitId}`);
  if (normalizedResultPath !== unit.resultPath) throw new WorkflowError(`仅接受该计划单元预设结果路径：${unit.resultPath}`);
  validateUnitResult(repo, work, pack, unit, result);
  const previousState = JSON.parse(JSON.stringify(state));
  const stateIndex = state.units.findIndex((entry) => entry.unitId === unit.unitId);
  state.units[stateIndex] = { ...state.units[stateIndex], status: 'PASS' };
  state.activeBatch = expectedActiveBatch(state.executionPlan.batches, state.units);
  work.revision += 1;
  await atomicWriteJson(repo, statePath, state);
  try {
    await atomicWriteJson(repo, workItem, work);
  } catch (error) {
    try {
      await atomicWriteJson(repo, statePath, previousState);
    } catch (rollbackError) {
      throw new WorkflowError(`Work Item 写入失败且 Execution State 回滚失败：${error.message}; ${rollbackError.message}`, 'WRITE_FAILED');
    }
    throw error;
  }
  return response({ status: 'PASS', work, changed: true, metadata: { completedUnit: unit.unitId, sequence: unit.sequence, activeBatch: state.activeBatch } });
}

/** 按显式门禁迁移全局状态，自动推导 RETURN 恢复入口。 */
export async function transitionWork(args) {
  return withWorkLock(args.repo, args.workItem, () => transitionWorkLocked(args));
}

/** 在工作项锁内执行一次状态迁移，恢复锁保护下的证据状态。 */
async function transitionWorkLocked({ repo, workItem, to, args }) {
  const work = loadWork(repo, workItem);
  if (!TRANSITIONS[work.globalState]?.includes(to)) throw new WorkflowError(`拒绝不合法状态迁移：${work.globalState} -> ${to}`, 'INVALID_TRANSITION');
  const from = work.globalState;
  const recoveryState = from === 'BLOCKED' ? work.blockedRecord?.returnState : null;
  assertWorkflowPolicy(work);
  assertReleaseTransition(work, { from, to, recoveryState });
  // RETURN/BLOCKED 是恢复控制记录，应允许登记上游失效或未决问题。
  if (to === 'RETURN') return enterReturn({ repo, workItem, work, from, args });
  if (to === 'BLOCKED') return enterBlocked({ repo, workItem, work, from, args });
  if (from === 'RETURN' || from === 'BLOCKED') resolveReturn(work, from, to, args);
  assertTransitionInputs(repo, work, to);
  if (to === 'BASELINE') assertGates(work, ['F0']);
  if (to === 'PROPOSAL') assertGates(work, ['F1']);
  if (to === 'REVIEW') assertGates(work, ['F1', 'F2']);
  if (to === 'VALIDATING') {
    const { pack } = inspectExecution(repo, work, { requireComplete: true });
    if (work.gateStatus.F3 !== 'PASS') throw new WorkflowError('进入 VALIDATING 前须由执行者提交 F3=PASS');
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: false });
    if (!pack.executionUnits.length) throw new WorkflowError('实施包没有可验证的执行单元');
  }
  if (to === 'PASSED') assertReadyToPass(repo, work);
  // 发布等待态只记录需要批准的动作；F4 在真正进入 RELEASING 前才必须通过。
  if (to !== 'RELEASE_APPROVAL_REQUIRED' && work.action?.effects?.some((effect) => ['external-write', 'device', 'sign', 'upload', 'publish', 'payment', 'destructive'].includes(effect))) assertGates(work, ['F4']);
  if (to === 'RELEASING') {
    const priorState = recoveryState ?? from;
    if (work.workItemType !== 'RELEASE' || priorState !== 'RELEASE_APPROVAL_REQUIRED' || !work.action?.effects?.includes('publish')) {
      throw new WorkflowError('RELEASING 只允许 RELEASE 工作项在批准发布阶段记录 publish 动作');
    }
    assertGates(work, ['F4']);
  }
  if (to === 'COMPLETE') {
    if (work.workItemType === 'RELEASE') {
      // 两类发布交付由同一策略校验；实际发布仍必须经过批准态与真实发布结果。
      assertReleaseTransition(work, { from, to, recoveryState });
    } else if (from !== 'PASSED' && from !== 'INTEGRATING') {
      throw new WorkflowError('仅 PASSED/INTEGRATING 能进入 COMPLETE');
    }
  }
  if (to === 'INTEGRATING' || to === 'RELEASE_APPROVAL_REQUIRED') {
    const resumedExactState = from === 'BLOCKED' && recoveryState === to;
    if (!resumedExactState && from !== 'PASSED') throw new WorkflowError('完成当前工作项验证之前不可集成或发布');
    if (resumedExactState) assertReadyToPass(repo, work);
  }
  if (to === 'COMPLETE') assertFinalCompletion(repo, work);
  let createdExecutionStatePath = null;
  if (to === 'IMPLEMENTING') {
    if (from === 'BLOCKED') await resumeImplementation(repo, work);
    else createdExecutionStatePath = await startImplementation(repo, work);
  }
  work.globalState = to;
  work.revision += 1;
  work.transitionHistory ??= [];
  work.transitionHistory.push({ from, to, reason: args.reason ?? null, revision: work.revision });
  try {
    await atomicWriteJson(repo, workItem, work);
  } catch (error) {
    if (createdExecutionStatePath) {
      try { unlinkSync(repoPath(repo, createdExecutionStatePath, '新建 Execution State').absolute); }
      catch (rollbackError) {
        throw new WorkflowError(`Work Item 写入失败且新建 Execution State 清理失败：${error.message}; ${rollbackError.message}`, 'WRITE_FAILED');
      }
    }
    throw error;
  }
  return response({ status: 'PASS', work, changed: true });
}

/** 暂停当前状态并记录恢复入口，未解决阻断之前不再执行生产门禁。 */
async function enterBlocked({ repo, workItem, work, from, args }) {
  if (from === 'RETURN' || work.returnRecord?.resolvedAt === null) throw new WorkflowError('不能用 BLOCKED 绕过尚未解决的 RETURN');
  requireText(args.reason, '--reason');
  work.blockedRecord = { reason: args.reason, returnState: from, resolvedAt: null };
  work.globalState = 'BLOCKED';
  work.revision += 1;
  await atomicWriteJson(repo, workItem, work);
  return response({ status: 'PASS', work, changed: true, metadata: { blockedFrom: from } });
}

/** 启动前关闭范围门并初始化新证据根内的执行状态。 */
async function startImplementation(repo, work) {
  assertGates(work, ['F0', 'F1', 'F2']);
  const pack = loadPackage(repo, work);
  const executionPlan = createExecutionPlanSnapshot(pack, { repo });
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  if (existsSync(repoPath(repo, statePath).absolute)) throw new WorkflowError('拒绝复用 evidenceRoot：执行状态已经存在');
  const executionState = {
    schemaVersion: VERSION,
    workItemId: work.workItemId,
    stack: work.stack,
    implementationPackageRef: work.implementationPackageRef.path,
    executionPlan,
    units: pack.executionUnits.map(({ unitId, sequence }) => ({ unitId, sequence, status: 'PENDING' })),
    activeBatch: executionPlan.batches[0]?.unitIds ?? [],
  };
  await atomicWriteJson(repo, statePath, executionState);
  return statePath;
}

/** 恢复 BLOCKED 的 IMPLEMENTING 时重验既有批次，不重建或清空执行进度。 */
async function resumeImplementation(repo, work) {
  assertGates(work, ['F0', 'F1', 'F2']);
  inspectExecution(repo, work);
}

/** 进入 RETURN 时冻结失效引用和受影响范围，不能手选恢复点。 */
async function enterReturn({ repo, workItem, work, from, args }) {
  const reason = args.reason;
  const affected = args['affected-scope'];
  requireText(reason, '--reason');
  requireText(affected, '--affected-scope');
  const returnState = inferReturnState(affected, work.stageId);
  const invalidatedRefs = [...(work.invalidatedRefs ?? [])];
  for (const name of ['implementationPackageRef', 'evidenceRef', 'planningRef']) {
    if (work[name]?.path) invalidatedRefs.push({ path: work[name].path, state: from });
  }
  if (work.globalState === 'IMPLEMENTING' && work.evidenceRoot) {
    const stateFile = `${work.evidenceRoot}/execution-state.json`;
    if (existsSync(repoPath(repo, stateFile).absolute)) {
      const state = readJson(repo, stateFile, 'Execution State');
      await atomicWriteJson(repo, `${work.evidenceRoot}/archive-${work.revision + 1}-execution-state.json`, state);
    }
  }
  invalidateReturnGates(work, affected, returnState);
  invalidateReturnVisual(work, affected, invalidatedRefs);
  const oldEvidenceRoot = work.evidenceRoot;
  const invalidated = [...new Map(invalidatedRefs.map((item) => [item.path, item])).values()];
  work.returnRecord = { reason, affectedScope: affected, returnState, resolvedAt: null, invalidatedRefs: invalidated, evidenceRoot: oldEvidenceRoot };
  work.blockedRecord = null;
  work.invalidatedRefs = invalidated;
  work.implementationPackageRef = null;
  work.evidenceRef = null;
  work.planningRef = null;
  // 每次 RETURN 使用新证据目录，旧执行状态和结果只作为可追溯历史。
  work.evidenceRoot = `${oldEvidenceRoot}-return-${work.revision + 1}`;
  work.globalState = 'RETURN';
  work.revision += 1;
  await atomicWriteJson(repo, workItem, work);
  return response({ status: 'PASS', work, changed: true, metadata: { returnState, invalidatedRefs: invalidated } });
}

/** 按 affected-scope 清除已经失效的质量门，避免旧 PASS 推进新需求。 */
function invalidateReturnGates(work, scope, returnState) {
  const scopeName = scope.startsWith('stage:') ? scope.slice('stage:'.length) : scope;
  let gates = returnState === 'BASELINE' ? ['F1', 'F2', 'F3', 'F4']
    : returnState === 'PROPOSAL' ? ['F2', 'F3', 'F4']
      : ['F3', 'F4'];
  if (['requirements', 'requirements-scope'].includes(scopeName)) gates = ['F0', 'F1', 'F2', 'F3', 'F4'];
  if (/^visual(?::V[1-2])?$/i.test(scope) || scope.startsWith('page:') || scope.startsWith('scene:')) gates = ['F2', 'F3', 'F4'];
  for (const gate of gates) work.gateStatus[gate] = 'NOT_RUN';
}

/** 从最早被影响的视觉阶段回退，并删除该阶段及下游的人工确认引用。 */
function invalidateReturnVisual(work, scope, invalidatedRefs) {
  if (!work.visual) return;
  const scopeName = scope.startsWith('stage:') ? scope.slice('stage:'.length) : scope;
  if (['implementation', 'engineering'].includes(scopeName)) {
    const runtimeReview = work.visual.reviews?.V4;
    if (runtimeReview?.path) invalidatedRefs.push({ path: runtimeReview.path, state: 'V4' });
    delete work.visual.reviews?.V4;
    return;
  }
  const baselineAffected = ['requirements', 'requirements-scope', 'global-baseline'].includes(scopeName) || /^visual:V0$/i.test(scope);
  const stageMatch = scope.match(/^visual(?::(V[0-4]))?$/i);
  const pageOrSceneAffected = scope.startsWith('page:') || scope.startsWith('scene:');
  if (!baselineAffected && !stageMatch && !pageOrSceneAffected) return;
  const requestedStage = baselineAffected ? 'V0' : stageMatch?.[1]?.toUpperCase() ?? 'V1';
  const stageIndex = Math.min(VISUAL_STAGES.indexOf(work.visual.stage), VISUAL_STAGES.indexOf(requestedStage));
  const earliestStage = VISUAL_STAGES[stageIndex];
  const clearFrom = earliestStage === 'V0' ? 1 : stageIndex;
  const reviewOrder = { V1: 1, V2Decomposition: 2, V2Layout: 2, V3: 3, V4: 4 };
  for (const [name, ref] of Object.entries(work.visual.reviews ?? {})) {
    if (reviewOrder[name] >= clearFrom && ref?.path) {
      invalidatedRefs.push({ path: ref.path, state: name });
      delete work.visual.reviews[name];
    }
  }
  if (earliestStage === 'V0' || earliestStage === 'V1') delete work.visual.candidateId;
  if (stageIndex <= 3 && work.assetReviewRef?.path) {
    invalidatedRefs.push({ path: work.assetReviewRef.path, state: 'V3' });
    work.assetReviewRef = null;
  }
  if (baselineAffected && work.globalVisualBaselineRef?.path) {
    invalidatedRefs.push({ path: work.globalVisualBaselineRef.path, state: 'V0' });
    work.globalVisualBaselineRef = null;
  }
  work.visual.stage = earliestStage;
  if (work.visual.reuse) {
    if (!work.globalVisualBaselineRef) delete work.visual.reuse;
    else {
      // RETURN 只保留仍有效的继承引用，不把旧复用声明当成新阶段确认。
      work.visual.reuse.inheritedReviews = work.visual.reuse.inheritedReviews.filter((name) => work.visual.reviews[name]?.path);
      if (!work.visual.reuse.inheritedReviews.includes('V1')) work.visual.reuse.impact = 'target';
      else if (!work.visual.reuse.inheritedReviews.includes('V2Layout')) work.visual.reuse.impact = 'layout';
    }
  }
}

/** 仅从实质受影响阶段推导最早恢复入口，不接受用户指定 target state。 */
export function inferReturnState(scope, stageId) {
  if (/^visual:V0$/i.test(scope)) return 'BASELINE';
  if (/^visual(?::V[1-4])?$/i.test(scope)) return 'REVIEW';
  const direct = {
    requirements: 'BASELINE', 'global-baseline': 'BASELINE',
    proposal: 'PROPOSAL', design: 'PROPOSAL',
    implementation: 'REVIEW', engineering: 'REVIEW', visual: 'REVIEW',
  };
  const scopeName = scope.startsWith('stage:') ? scope.slice('stage:'.length) : scope;
  if (direct[scopeName]) return direct[scopeName];
  if (STAGES.includes(scopeName)) {
    if (scopeName === 'requirements-scope' || scopeName === 'global-baseline') return 'BASELINE';
    if (scopeName === 'release' || scopeName === 'global-integration-validation') return 'REVIEW';
    return 'PROPOSAL';
  }
  if (scope.startsWith('module:') || scope.startsWith('scene:') || scope.startsWith('page:')) return 'REVIEW';
  if (scope.startsWith('decision:')) return stageId === 'requirements-scope' ? 'BASELINE' : 'PROPOSAL';
  throw new WorkflowError(`无法从 affected-scope 推导恢复入口：${scope}`);
}

/** 只有显式声明解决说明且目标等于推导入口，才关闭 RETURN。 */
function resolveReturn(work, from, to, args) {
  const record = from === 'RETURN' ? work.returnRecord : work.blockedRecord;
  const expected = record?.returnState;
  if (!expected) throw new WorkflowError('BLOCKED/RETURN 缺少完整的恢复来源记录');
  if (to !== expected) throw new WorkflowError(`恢复入口由 affected-scope 推导为 ${expected}，拒绝迁移至 ${to}`);
  requireText(args['return-resolution'], '--return-resolution');
  if (from === 'RETURN' && to === 'IMPLEMENTING' && work.evidenceRoot === record.evidenceRoot) throw new WorkflowError('RETURN 恢复到实现阶段前必须绑定全新 evidenceRoot');
  record.resolvedAt = new Date().toISOString();
  record.resolution = args['return-resolution'];
  if (from === 'BLOCKED') work.blockedRecord = null;
}

/** 相邻推进一个视觉阶段，并在阶段变化时作废旧包与执行证据。 */
export async function advanceVisual(args) {
  return withWorkLock(args.repo, args.workItem, () => advanceVisualLocked(args));
}

/** 在工作项锁内推进视觉阶段，避免并发推进覆盖引用失效记录。 */
async function advanceVisualLocked({ repo, workItem, to }) {
  const work = loadWork(repo, workItem);
  if (['BLOCKED', 'RETURN'].includes(work.globalState)) throw new WorkflowError('BLOCKED/RETURN 未解决前不能推进视觉阶段');
  if (!work.visual) throw new WorkflowError('当前工作项没有视觉阶段');
  requireOneOf(to, VISUAL_STAGES, '--to');
  const currentIndex = VISUAL_STAGES.indexOf(work.visual.stage);
  if (currentIndex < 0 || VISUAL_STAGES[currentIndex + 1] !== to) throw new WorkflowError(`视觉阶段必须相邻推进：${work.visual.stage} -> ${to}`);
  assertNoOpenGrilling(repo, work);
  if (work.visual.stage === 'V0') {
    assertGates(work, ['F0', 'F1']);
    validateGlobalBaseline(repo, work);
  }
  if (work.visual.stage === 'V1') assertVisualReview(repo, work, 'V1');
  if (work.visual.stage === 'V2') assertVisualReview(repo, work, 'V2');
  if (work.visual.stage === 'V3') {
    if (work.globalState !== 'PASSED') throw new WorkflowError('V3 正式资源验收需通过当前实现与导入验证');
    assertGates(work, ['F0', 'F1', 'F2', 'F3']);
    assertVisualReview(repo, work, 'V3');
  }
  const previousState = work.globalState;
  const archive = { visualStage: work.visual.stage, implementationPackageRef: work.implementationPackageRef, evidenceRef: work.evidenceRef, planningRef: work.planningRef ?? null, revision: work.revision };
  const archivePath = `${work.evidenceRoot}/archive-${work.visual.stage}-${work.revision + 1}.json`;
  if (work.implementationPackageRef || work.evidenceRef) await atomicWriteJson(repo, archivePath, archive);
  if (work.implementationPackageRef?.path) (work.invalidatedRefs ??= []).push({ path: work.implementationPackageRef.path, state: work.visual.stage });
  if (work.evidenceRef?.path) (work.invalidatedRefs ??= []).push({ path: work.evidenceRef.path, state: work.visual.stage });
  if (work.planningRef?.path) (work.invalidatedRefs ??= []).push({ path: work.planningRef.path, state: work.visual.stage });
  work.visual.stage = to;
  work.implementationPackageRef = null;
  work.evidenceRef = null;
  work.planningRef = null;
  work.assetReviewRef = to === 'V4' ? work.assetReviewRef : null;
  // 设计阶段不需要伪造编译；新正式资源/运行阶段需各自冻结新的实施包和结果。
  if (['V3', 'V4'].includes(to)) {
    // V3 与 V4 各自有独立执行闭环，切换时不复用前一阶段的 execution-state。
    work.evidenceRoot = `${work.evidenceRoot}-${to}-r${work.revision + 1}`;
    work.globalState = 'PROPOSAL';
    work.gateStatus.F2 = 'NOT_RUN';
    work.gateStatus.F3 = 'NOT_RUN';
  }
  work.revision += 1;
  work.transitionHistory ??= [];
  work.transitionHistory.push({ from: `${previousState}/${archive.visualStage}`, to: `${work.globalState}/${to}`, revision: work.revision });
  await atomicWriteJson(repo, workItem, work);
  return response({ status: 'PASS', work, changed: true, metadata: { archivedStage: archive.visualStage, archivePath } });
}

/** status 与 check 共用只读诊断，不执行工作命令也不改 JSON。 */
export function inspect({ repo, workItem, check = false }) {
  const work = loadWork(repo, workItem);
  const result = inspectWork(repo, work, { strict: check });
  return response({ ...result, work, metadata: { mode: check ? 'check' : 'status', ...(result.activeBatch ? { activeBatch: result.activeBatch } : {}) } });
}
