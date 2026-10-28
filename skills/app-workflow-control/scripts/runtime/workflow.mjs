import { existsSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { GATES, PROTECTED_ACTIONS, STAGE_LABELS, STAGES, TRANSITIONS, VERSION, VISUAL_STAGES } from './constants.mjs';
import { assertFinalCompletion, assertGates, assertNoOpenGrilling, assertReadyToPass, assertTransitionInputs, assertVisualReview, bindWorkSource, hasPreciseApproval, loadPackage, requiresProtectedActionApproval, validateEvidence, validateGlobalBaseline, validateUnitResult } from './artifacts.mjs';
import { validateFinalIntegration, validateIntegrationScope } from './final-integration.mjs';
import { atomicWriteJson, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { loadProfile, requireOneOf, requireText, validateWork } from './validation.mjs';
import { createExecutionPlanSnapshot, expectedActiveBatch } from './execution-batches.mjs';
import { withWorkLock } from './work-lock.mjs';
import { assertWorkflowPolicy, workflowMode } from './task-policy.mjs';
import { assertReleaseTransition } from './release-policy.mjs';
import { validateFeatureDependencies, dependencyPath } from './feature-dependencies.mjs';
import { engineeringEvidence, assertEngineeringEvidence, unchangedFunctionSource, sameFunctionDependency, sameFunctionDependencies, sameDependencyPath } from './function-evidence.mjs';

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

/** 只读核对将要执行的具体受保护动作，调用者仍须自行执行且不能复用不同动作的批准。 */
export function checkProtectedAction({ repo, workItem, actionId, effect, target }) {
  const work = loadWork(repo, workItem);
  requireText(actionId, '--action-id');
  requireText(effect, '--effect');
  requireText(target, '--target');
  if (!PROTECTED_ACTIONS.has(effect)) throw new WorkflowError('--effect 必须是受保护动作', 'ACTION_MISMATCH');
  if (work.action?.actionId !== actionId || work.action?.target !== target || !work.action?.effects?.includes(effect)) {
    throw new WorkflowError('动作 ID、类型或目标与当前工作项不匹配', 'ACTION_MISMATCH');
  }
  // BLOCKED/RETURN 不能以保留的旧批准绕过工作项恢复要求。
  if (!['IMPLEMENTING', 'VALIDATING', 'PASSED', 'INTEGRATING', 'RELEASING'].includes(work.globalState)) {
    throw new WorkflowError('当前工作项尚未到达可执行受保护动作的阶段', 'ACTION_NOT_READY');
  }
  if (effect === 'publish' && (work.workItemType !== 'RELEASE' || work.globalState !== 'RELEASING')) {
    throw new WorkflowError('发布动作只能在 RELEASE 的 RELEASING 阶段执行', 'ACTION_NOT_READY');
  }
  assertNoOpenGrilling(repo, work);
  assertGates(work, ['F0', 'F1', 'F2']);
  if (!hasPreciseApproval(work)) throw new WorkflowError('受保护动作缺少与当前对象和动作一致的明确批准', 'APPROVAL_REQUIRED');
  assertGates(work, ['F4']);
  if (effect === 'publish') assertReleaseExecutionReady(repo, work);
  return response({ status: 'PASS', work, changed: false, metadata: { actionId, effect, target } });
}

/** 批准等待期间准备证据仍可能失效，实际发布前重新核对工程门及全部已完成单元。 */
function assertReleaseExecutionReady(repo, work) {
  assertReadyToPass(repo, work);
  inspectExecution(repo, work, { requireComplete: true });
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
  const integrationPurpose = type === 'INTEGRATION' ? (args['integration-purpose'] ?? 'feature') : undefined;
  if (integrationPurpose !== undefined) requireOneOf(integrationPurpose, ['feature', 'final'], '--integration-purpose');
  if (type !== 'INTEGRATION' && args['integration-purpose'] !== undefined) throw new WorkflowError('只有 INTEGRATION 可以使用 --integration-purpose');
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
    stageId: type === 'PROJECT' ? 'requirements-scope' : type === 'INTEGRATION' && integrationPurpose === 'final' ? 'global-integration-validation' : type === 'RELEASE' ? 'release' : visualType ? 'scene-production' : 'foundation-engineering',
    globalState: mode === 'light' ? 'REVIEW' : 'INTAKE',
    workflowMode: mode,
    ...(type === 'RELEASE' ? { releaseIntent: args['release-intent'] ?? 'prepare' } : {}),
    ...(type === 'INTEGRATION' ? { integrationPurpose } : {}),
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
      stageModel: 'function-first-v1',
      stage: 'V0',
      ...(type === 'DISPLAY_LAYER' ? { hostId: args['host-id'], layerType: args['layer-type'] } : {}),
      ...(type === 'SCENE' ? { targets: [] } : { reviews: {} }),
    } } : {}),
  };
  if (type !== 'RELEASE' && args['release-intent'] !== undefined) throw new WorkflowError('只有 RELEASE 可以使用 --release-intent');
  validateWork(work, { repo });
  await atomicWriteJson(repo, workPath, work);
  return response({ status: 'PASS', work, changed: true, metadata: { workItemPath: workPath, stackProfile: profile.displayName } });
}

/** 无写入地收集 Work Item 阶段和资产引用的阻断原因。 */
export function inspectWork(repo, work, { strict = false } = {}) {
  return inspectWorkCore(repo, work, { strict, checkFunctionBaseline: true });
}

/** 实施中仅为登记新的阶段执行证据检查计划；不得用于通过阶段门。 */
export function inspectPendingRegressionExecution(repo, work) {
  if (work?.globalState !== 'IMPLEMENTING' || !['V4', 'V5'].includes(work.visual?.stage)) throw new WorkflowError('仅 V4/V5 实施期间可检查待登记回归');
  return inspectWorkCore(repo, work, { strict: false, checkFunctionBaseline: false });
}

/** 视觉复用仅复验已完成来源的视觉与执行记录；当前工作项仍须通过功能基线。 */
export function inspectVisualReuseSource(repo, work) {
  if (work?.globalState !== 'COMPLETE' || work.visual?.stage !== 'V5') throw new WorkflowError('视觉复用来源必须为已完成的 V5 工作项');
  return inspectWorkCore(repo, work, { strict: true, checkFunctionBaseline: false });
}

/** 按用途收集诊断，常规检查始终包含当前功能基线。 */
function inspectWorkCore(repo, work, { strict, checkFunctionBaseline }) {
  const blocking = [];
  const next = [];
  let activeBatch = null;
  try {
    assertTransitionInputs(repo, work, work.globalState);
    if (checkFunctionBaseline) assertFunctionBaseline(repo, work);
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
  if (['PASSED', 'INTEGRATING', 'COMPLETE'].includes(work.globalState)) {
    try { validateFinalIntegration(repo, work, inspectFunctionSource); }
    catch (error) { blocking.push(error.message); }
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
  if (work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final') {
    if (!state.integrationScopeRef || state.integrationScopeRef.path !== work.integrationScopeRef?.path || state.integrationScopeRef.sha256 !== work.integrationScopeRef?.sha256) throw new WorkflowError('最终集成范围与开始实施时冻结的范围不一致');
    validateIntegrationScope(repo, work);
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
  try {
    assertFunctionBaseline(repo, work);
  } catch (error) {
    // 仅允许实现返修进入新的执行闭环，不能借此通过验证或完成门。
    const record = work.returnRecord;
    const recovery = ['V4', 'V5'].includes(work.visual?.stage) && ['implementation', 'engineering', 'stage:implementation', 'stage:engineering'].includes(record?.affectedScope)
      && record?.resolvedAt && record.evidenceRoot !== work.evidenceRoot
      && ((from === 'RETURN' && to === 'REVIEW') || (from === 'REVIEW' && to === 'IMPLEMENTING'));
    if (!recovery) throw error;
    assertRecoverableLocalBaseline(repo, work);
  }
  if (to === 'BASELINE') assertGates(work, ['F0']);
  if (to === 'PROPOSAL') assertGates(work, ['F1']);
  if (to === 'REVIEW') assertGates(work, ['F1', 'F2']);
  if (to === 'VALIDATING') {
    const { pack } = inspectExecution(repo, work, { requireComplete: true });
    if (work.gateStatus.F3 !== 'PASS') throw new WorkflowError('进入 VALIDATING 前须由执行者提交 F3=PASS');
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: false });
    if (!pack.executionUnits.length) throw new WorkflowError('实施包没有可验证的执行单元');
  }
  if (to === 'PASSED') {
    // 进入通过态前重验执行快照，不能在 VALIDATING 后替换最终集成范围。
    inspectExecution(repo, work, { requireComplete: true });
    assertReadyToPass(repo, work);
    validateFinalIntegration(repo, work, inspectFunctionSource);
  }
  // 普通准备不执行受保护动作；发布与关闭前仍须核对精确批准与 F4。
  if (requiresProtectedActionApproval(work, to)) assertGates(work, ['F4']);
  if (to === 'RELEASING') {
    const priorState = recoveryState ?? from;
    if (work.workItemType !== 'RELEASE' || priorState !== 'RELEASE_APPROVAL_REQUIRED' || !work.action?.effects?.includes('publish')) {
      throw new WorkflowError('RELEASING 只允许 RELEASE 工作项在批准发布阶段记录 publish 动作');
    }
    assertGates(work, ['F4']);
    assertReleaseExecutionReady(repo, work);
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
  if (to === 'COMPLETE') {
    // 完成前重验当前执行闭环，避免通过后证据丢失仍写入 COMPLETE。
    inspectExecution(repo, work, { requireComplete: true });
    assertFinalCompletion(repo, work);
    validateFinalIntegration(repo, work, inspectFunctionSource);
  }
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
  // 正式跨对象回归先冻结预期范围，结果不能通过遗漏对象缩小验收。
  if (work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final') validateIntegrationScope(repo, work);
  const pack = loadPackage(repo, work);
  const executionPlan = createExecutionPlanSnapshot(pack, { repo });
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  if (existsSync(repoPath(repo, statePath).absolute)) throw new WorkflowError('拒绝复用 evidenceRoot：执行状态已经存在');
  const executionState = {
    schemaVersion: VERSION,
    workItemId: work.workItemId,
    stack: work.stack,
    implementationPackageRef: work.implementationPackageRef.path,
    ...(work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final' ? { integrationScopeRef: structuredClone(work.integrationScopeRef) } : {}),
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
  if (/^visual(?::V[1-3])?$/i.test(scope) || scope === 'function' || scope.startsWith('page:') || scope.startsWith('scene:')) gates = ['F2', 'F3', 'F4'];
  for (const gate of gates) work.gateStatus[gate] = 'NOT_RUN';
}

/** 从最早被影响的视觉阶段回退，并删除该阶段及下游的人工确认引用。 */
function invalidateReturnVisual(work, scope, invalidatedRefs) {
  if (!work.visual) return;
  const scopeName = scope.startsWith('stage:') ? scope.slice('stage:'.length) : scope;
  if (work.workItemType === 'SCENE') {
    invalidateSceneVisual(work, scope, scopeName, invalidatedRefs);
    return;
  }
  if (['implementation', 'engineering'].includes(scopeName)) {
    const runtimeReview = work.visual.reviews?.V5;
    if (runtimeReview?.path) invalidatedRefs.push({ path: runtimeReview.path, state: 'V5' });
    delete work.visual.reviews?.V5;
    return;
  }
  const baselineAffected = ['requirements', 'requirements-scope', 'global-baseline'].includes(scopeName) || /^visual:V0$/i.test(scope);
  const stageMatch = scope.match(/^visual(?::(V[0-5]))?$/i);
  const pageOrSceneAffected = scope.startsWith('page:') || scope.startsWith('scene:');
  if (!baselineAffected && !stageMatch && !pageOrSceneAffected && scopeName !== 'function') return;
  const requestedStage = baselineAffected ? 'V0' : scopeName === 'function' ? 'V1' : stageMatch?.[1]?.toUpperCase() ?? 'V2';
  const stageIndex = Math.min(VISUAL_STAGES.indexOf(work.visual.stage), VISUAL_STAGES.indexOf(requestedStage));
  const earliestStage = VISUAL_STAGES[stageIndex];
  const clearFrom = Math.max(2, stageIndex);
  const reviewOrder = { V2: 2, V3Decomposition: 3, V3Layout: 3, V4: 4, V5: 5 };
  for (const [name, ref] of Object.entries(work.visual.reviews ?? {})) {
    if (reviewOrder[name] >= clearFrom && ref?.path) {
      invalidatedRefs.push({ path: ref.path, state: name });
      delete work.visual.reviews[name];
    }
  }
  if (stageIndex <= 2) delete work.visual.candidateId;
  if (stageIndex <= 4 && work.assetReviewRef?.path) {
    invalidatedRefs.push({ path: work.assetReviewRef.path, state: 'V4' });
    work.assetReviewRef = null;
  }
  if (stageIndex <= 1) invalidateFunctionBaseline(work, invalidatedRefs);
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
      if (!work.visual.reuse.inheritedReviews.includes('V2')) work.visual.reuse.impact = 'target';
      else if (!work.visual.reuse.inheritedReviews.includes('V3Layout')) work.visual.reuse.impact = 'layout';
    }
  }
}

/** 场景回退时逐目标作废受影响确认，保留不受影响的目标身份和资源。 */
function invalidateSceneVisual(work, scope, scopeName, invalidatedRefs) {
  const implementationOnly = ['implementation', 'engineering'].includes(scopeName);
  if (implementationOnly) {
    // 实现返修不改动已确认设计与素材，只有正式运行组合需重新验收。
    for (const target of work.visual.targets ?? []) {
      if (target.reviews?.V5?.path) invalidatedRefs.push({ path: target.reviews.V5.path, state: 'V5' });
      if (target.reviews) delete target.reviews.V5;
    }
    if (work.visual.integrationEvidenceRef?.path) invalidatedRefs.push({ path: work.visual.integrationEvidenceRef.path, state: 'V5' });
    delete work.visual.integrationEvidenceRef;
    return;
  }
  const baselineAffected = ['requirements', 'requirements-scope', 'global-baseline'].includes(scopeName) || /^visual:V0$/i.test(scope);
  const match = scope.match(/^visual(?::(V[0-5]))?$/i);
  if (!implementationOnly && !baselineAffected && !match && scopeName !== 'function' && !scope.startsWith('scene:')) return;
  const requested = baselineAffected ? 'V0' : scopeName === 'function' ? 'V1' : implementationOnly ? 'V5' : match?.[1]?.toUpperCase() ?? 'V2';
  const index = Math.min(VISUAL_STAGES.indexOf(work.visual.stage), VISUAL_STAGES.indexOf(requested));
  const earliest = VISUAL_STAGES[index];
  const order = { V2: 2, V3Decomposition: 3, V3Layout: 3, V4: 4, V5: 5 };
  const clearFrom = Math.max(2, index);
  for (const target of work.visual.targets ?? []) {
    for (const [name, ref] of Object.entries(target.reviews ?? {})) {
      if (order[name] >= clearFrom && ref?.path) { invalidatedRefs.push({ path: ref.path, state: name }); delete target.reviews[name]; }
    }
    if (clearFrom <= 4 && target.assetReviewRef?.path) { invalidatedRefs.push({ path: target.assetReviewRef.path, state: 'V4' }); delete target.assetReviewRef; }
  }
  if (clearFrom <= 5 && work.visual.integrationEvidenceRef?.path) {
    invalidatedRefs.push({ path: work.visual.integrationEvidenceRef.path, state: 'V5' });
    delete work.visual.integrationEvidenceRef;
  }
  if (clearFrom <= 2 && work.visual.coverageRef?.path) {
    invalidatedRefs.push({ path: work.visual.coverageRef.path, state: 'V2' });
    delete work.visual.coverageRef;
  }
  if (index <= 1) invalidateFunctionBaseline(work, invalidatedRefs);
  if (baselineAffected && work.globalVisualBaselineRef?.path) {
    invalidatedRefs.push({ path: work.globalVisualBaselineRef.path, state: 'V0' });
    work.globalVisualBaselineRef = null;
  }
  work.visual.stage = earliest;
  if (work.visual.reuse) {
    if (!work.globalVisualBaselineRef || clearFrom <= 2) delete work.visual.reuse;
    else {
      work.visual.reuse.inheritedReviews = work.visual.reuse.inheritedReviews.filter((name) => order[name] < clearFrom);
      if (!work.visual.reuse.inheritedReviews.includes('V2')) work.visual.reuse.impact = 'target';
      else if (!work.visual.reuse.inheritedReviews.includes('V3Layout')) work.visual.reuse.impact = 'layout';
    }
  }
}

/** 功能变更时作废原始基线和依赖，避免旧行为范围被复用。 */
function invalidateFunctionBaseline(work, invalidatedRefs) {
  if (work.visual.functionBaselineRef?.path) invalidatedRefs.push({ path: work.visual.functionBaselineRef.path, state: 'V1' });
  delete work.visual.functionBaselineRef;
  delete work.visual.functionDependencies;
}

/** 仅从实质受影响阶段推导最早恢复入口，不接受用户指定 target state。 */
export function inferReturnState(scope, stageId) {
  if (/^visual:V0$/i.test(scope)) return 'BASELINE';
  if (/^visual(?::V[1-5])?$/i.test(scope)) return 'REVIEW';
  const direct = {
    requirements: 'BASELINE', 'global-baseline': 'BASELINE',
    proposal: 'PROPOSAL', design: 'PROPOSAL',
    implementation: 'REVIEW', engineering: 'REVIEW', function: 'REVIEW', visual: 'REVIEW',
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

/** 来源必须先符合工作项合同，再执行完整状态及工程证据检查。 */
function inspectFunctionSource(repo, source) {
  validateWork(source, { repo });
  return inspectWork(repo, source, { strict: true });
}

/** 冻结工程记录的内容身份，避免后续只凭路径存在复用过期证据。 */
function fileDigest(repo, path) {
  const relative = requireFile(repo, path, '功能基线文件');
  return { path: relative, sha256: createHash('sha256').update(readFileSync(repoPath(repo, relative).absolute)).digest('hex') };
}

/** 收集本工作项 V1 的真实计划、执行结果、输出及证据文件。 */
function collectFunctionFiles(repo, work) {
  const { pack } = inspectExecution(repo, work, { requireComplete: true });
  const engineering = engineeringEvidence(repo, work);
  const paths = [work.implementationPackageRef.path, `${work.evidenceRoot}/execution-state.json`];
  for (const unit of pack.executionUnits) {
    paths.push(unit.resultPath);
    const result = readJson(repo, unit.resultPath, '功能执行结果');
    for (const output of result.commandOutputs ?? []) paths.push(output.outputFile);
    // 已验证交付文件变化时需重新验证行为，但不据此自动撤销视觉确认。
    for (const path of result.files ?? []) paths.push(path);
  }
  for (const item of engineering.items) if (item.status === 'PASS') paths.push(item.path);
  return [...new Set(paths)].map((path) => fileDigest(repo, path));
}

/** 在进入视觉设计前固化功能验证；外部来源必须是已验证的非视觉工作项。 */
async function freezeFunctionBaseline(repo, work) {
  assertGates(work, ['F0', 'F1']);
  const dependencies = work.visual.functionDependencies ?? [];
  const snapshot = { schemaVersion: VERSION, workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId };
  if (work.workItemType === 'DISPLAY_LAYER') Object.assign(snapshot, { hostId: work.visual.hostId, layerType: work.visual.layerType });
  if (dependencies.length) {
    if (!['REVIEW', 'PASSED'].includes(work.globalState)) throw new WorkflowError('引用功能证据时须先完成当前工作项范围复核');
    validateFeatureDependencies(repo, work, inspectFunctionSource);
    snapshot.mode = 'dependencies';
    snapshot.dependencies = dependencies;
    // 功能来源的交付文件与执行证据一起冻结，防止源码被替换后沿用旧 PASS。
    snapshot.sources = dependencies.map((dependency) => {
      const source = readJson(repo, dependencyPath(repo, dependency.workItemRef.path), '功能来源工作项');
      return { workItemRef: dependency.workItemRef, revision: source.revision, implementationPackageRef: source.implementationPackageRef, evidenceRef: source.evidenceRef, evidenceRoot: source.evidenceRoot, files: collectFunctionFiles(repo, source), engineeringEvidence: engineeringEvidence(repo, source) };
    });
  } else {
    if (work.globalState !== 'PASSED') throw new WorkflowError('V1 直接实现必须先通过功能工程验证');
    assertReadyToPass(repo, work);
    assertFunctionHostResults(repo, work);
    snapshot.mode = 'local';
    snapshot.work = structuredClone(work);
    snapshot.files = collectFunctionFiles(repo, work);
    snapshot.engineeringEvidence = engineeringEvidence(repo, work);
  }
  const path = `${work.evidenceRoot}/function-baseline-r${work.revision + 1}.json`;
  if (existsSync(repoPath(repo, path).absolute)) throw new WorkflowError('功能基线文件已存在，拒绝覆盖');
  await atomicWriteJson(repo, path, snapshot);
  return fileDigest(repo, path);
}

/** 显示层执行结果必须明确记录实际验证的宿主与层类型。 */
function assertFunctionHostResults(repo, work) {
  if (work.workItemType !== 'DISPLAY_LAYER') return;
  const { pack } = inspectExecution(repo, work, { requireComplete: true });
  for (const unit of pack.executionUnits) {
    const result = readJson(repo, unit.resultPath, '显示层功能执行结果');
    if (result.hostId !== work.visual.hostId || result.layerType !== work.visual.layerType) throw new WorkflowError('显示层功能执行结果未绑定当前宿主及类型');
  }
}

/** V2 起持续重验功能来源及 V1 实际工程记录，禁止清空阶段引用后凭空通过。 */
export function assertFunctionBaseline(repo, work) {
  if (!work.visual || ['V0', 'V1'].includes(work.visual.stage)) return;
  const ref = work.visual.functionBaselineRef;
  if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || fileDigest(repo, ref.path).sha256 !== ref.sha256) throw new WorkflowError('缺少有效功能基线或基线内容已变化');
  const snapshot = readJson(repo, ref.path, '功能基线');
  if (snapshot.schemaVersion !== VERSION || snapshot.workItemId !== work.workItemId || snapshot.projectId !== work.projectId || snapshot.stack !== work.stack || snapshot.objectId !== work.visual.objectId) throw new WorkflowError('功能基线工作项、项目或对象身份错绑');
  if (work.workItemType === 'DISPLAY_LAYER' && (snapshot.hostId !== work.visual.hostId || snapshot.layerType !== work.visual.layerType)) throw new WorkflowError('显示层宿主或类型已变化，必须重新验证功能');
  if (snapshot.mode === 'dependencies') {
    if (!sameFunctionDependencies(repo, snapshot.dependencies, work.visual.functionDependencies)) throw new WorkflowError('功能依赖已变化，必须重新验证 V1');
    validateFeatureDependencies(repo, work, inspectFunctionSource);
    if (!Array.isArray(snapshot.sources) || snapshot.sources.length !== snapshot.dependencies.length) throw new WorkflowError('功能基线缺少来源执行记录');
    for (const [index, sourceSnapshot] of snapshot.sources.entries()) {
      const source = readJson(repo, dependencyPath(repo, snapshot.dependencies[index].workItemRef.path), '功能来源工作项');
      // PASSED→COMPLETE 只改变生命周期 revision；计划或证据引用变化才需要重验。
      if (!sameDependencyPath(repo, sourceSnapshot.workItemRef?.path, snapshot.dependencies[index].workItemRef?.path) || source.implementationPackageRef?.path !== sourceSnapshot.implementationPackageRef?.path || source.evidenceRef?.path !== sourceSnapshot.evidenceRef?.path || source.evidenceRoot !== sourceSnapshot.evidenceRoot || !Array.isArray(sourceSnapshot.files) || !sourceSnapshot.files.length) throw new WorkflowError('功能来源计划或证据已变化，必须重新验证');
      assertEngineeringEvidence(repo, source, sourceSnapshot.engineeringEvidence);
      for (const identity of sourceSnapshot.files) if (fileDigest(repo, identity.path).sha256 !== identity.sha256) throw new WorkflowError(`功能来源交付或证据已变化：${identity.path}`);
    }
    return;
  }
  if (!['local', 'local-regression'].includes(snapshot.mode) || !snapshot.work || !Array.isArray(snapshot.files) || !snapshot.files.length || (work.visual.functionDependencies ?? []).length) throw new WorkflowError('功能基线内容无效或功能依赖已改变');
  const original = snapshot.work;
  assertEngineeringEvidence(repo, original, snapshot.engineeringEvidence);
  validateWork(original, { repo });
  if (original.workItemId !== work.workItemId || original.projectId !== work.projectId || original.stack !== work.stack || original.workItemType !== work.workItemType || original.visual?.objectId !== work.visual.objectId || (work.workItemType === 'DISPLAY_LAYER' && (original.visual.hostId !== snapshot.hostId || original.visual.layerType !== snapshot.layerType)) || (snapshot.mode === 'local' ? original.visual?.stage !== 'V1' || original.globalState !== 'PASSED' : !['V4', 'V5'].includes(original.visual?.stage) || !['IMPLEMENTING', 'VALIDATING'].includes(original.globalState))) throw new WorkflowError('V1 功能基线身份或状态无效');
  for (const identity of snapshot.files) if (fileDigest(repo, identity.path).sha256 !== identity.sha256) throw new WorkflowError(`V1 功能证据已变化：${identity.path}`);
  if (snapshot.mode === 'local') assertReadyToPass(repo, original);
  else {
    assertGates(original, ['F0', 'F1', 'F2', 'F3']);
    validateEvidence(repo, original, { requireEngineering: true, requireVisual: false, requireAssetImport: false });
  }
  inspectExecution(repo, original, { requireComplete: true });
  assertFunctionHostResults(repo, original);
}

/** 从不可变执行记录提取每个交付文件及其原有功能验收命令。 */
function functionScope(repo, snapshot) {
  if (snapshot.mode === 'local-regression') return snapshot.functionScope;
  const identities = new Map(snapshot.files.map((item) => [item.path, item.sha256]));
  const checkRecord = (path) => {
    if (!identities.has(path) || fileDigest(repo, path).sha256 !== identities.get(path)) throw new WorkflowError(`原功能记录已变化：${path}`);
  };
  checkRecord(snapshot.work.implementationPackageRef.path);
  const { pack } = inspectExecution(repo, snapshot.work, { requireComplete: true });
  return pack.executionUnits.map((unit) => {
    checkRecord(unit.resultPath);
    const result = readJson(repo, unit.resultPath, '原功能执行结果');
    return { files: result.files, commands: unit.acceptanceCommands };
  });
}

/** 恢复实施前只容许原交付文件变化，禁止把记录篡改或跨场景依赖失效伪装成返修。 */
function assertRecoverableLocalBaseline(repo, work) {
  const ref = work.visual.functionBaselineRef;
  if (!ref?.path || fileDigest(repo, ref.path).sha256 !== ref.sha256) throw new WorkflowError('旧功能基线身份无效，不能恢复实施');
  const old = readJson(repo, ref.path, '旧功能基线');
  if (!['local', 'local-regression'].includes(old.mode) || old.workItemId !== work.workItemId || old.projectId !== work.projectId || old.stack !== work.stack || old.objectId !== work.visual.objectId || (work.visual.functionDependencies ?? []).length) throw new WorkflowError('功能基线或功能依赖已改变，不能恢复实施');
  const scope = functionScope(repo, old);
  if (!Array.isArray(scope) || !scope.length || scope.some((item) => !Array.isArray(item.files) || !item.files.length || !Array.isArray(item.commands) || !item.commands.length)) throw new WorkflowError('原功能范围无效，不能恢复实施');
  const deliveryFiles = new Set(scope.flatMap((item) => item.files));
  for (const identity of old.files) if (!deliveryFiles.has(identity.path) && fileDigest(repo, identity.path).sha256 !== identity.sha256) throw new WorkflowError(`原功能记录已变化：${identity.path}`);
  assertEngineeringEvidence(repo, old.work, old.engineeringEvidence);
}

/** 用当前阶段完整的执行闭环重验原功能范围，保留既有视觉确认。 */
async function refreshLocalFunctionBaseline(repo, work, old, oldRef, spec) {
  if (!['local', 'local-regression'].includes(old.mode) || (work.visual.functionDependencies ?? []).length) throw new WorkflowError('本地功能重验不能替换或改变功能依赖');
  if (!['V4', 'V5'].includes(work.visual.stage) || !['IMPLEMENTING', 'VALIDATING'].includes(work.globalState)) throw new WorkflowError('本地功能重验仅适用于 V4/V5 的实施或验证状态');
  assertGates(work, ['F0', 'F1', 'F2', 'F3']);
  const scope = functionScope(repo, old);
  if (!Array.isArray(scope) || !scope.length || scope.some((item) => !Array.isArray(item.files) || !item.files.length || !Array.isArray(item.commands) || !item.commands.length)) throw new WorkflowError('原功能范围无效，不能重验');
  const deliveryFiles = new Set(scope.flatMap((item) => item.files));
  // 只允许交付源码变化；篡改既有执行记录不能通过新回归掩盖。
  for (const identity of old.files) if (!deliveryFiles.has(identity.path) && fileDigest(repo, identity.path).sha256 !== identity.sha256) throw new WorkflowError(`原功能记录已变化：${identity.path}`);
  assertEngineeringEvidence(repo, old.work, old.engineeringEvidence);
  const { pack } = inspectExecution(repo, work, { requireComplete: true });
  validateEvidence(repo, work, { requireEngineering: true, requireVisual: false, requireAssetImport: false });
  assertFunctionHostResults(repo, work);
  const oldFiles = new Set(old.files.map((item) => item.path));
  const oldTime = statSync(repoPath(repo, oldRef.path).absolute).mtimeMs;
  const current = pack.executionUnits.map((unit) => ({ unit, result: readJson(repo, unit.resultPath, '当前功能执行结果') }));
  for (const previous of scope) for (const file of previous.files) {
    const match = current.find(({ unit, result }) => result.files.includes(file) && previous.commands.every((command) => unit.acceptanceCommands.includes(command)));
    if (!match) throw new WorkflowError(`新功能回归未覆盖原交付文件及验收命令：${file}`);
  }
  for (const { unit, result } of current) {
    // 新增交付物也必须在最终修改后执行命令，不能用较早的日志冻结新源码。
    const sourceTime = Math.max(...result.files.map((file) => statSync(repoPath(repo, file).absolute).mtimeMs));
    for (const path of [unit.resultPath, ...result.commandOutputs.map((output) => output.outputFile)]) {
      const record = requireFile(repo, path, '新功能执行记录');
      const recordTime = statSync(repoPath(repo, record).absolute).mtimeMs;
      if (oldFiles.has(record) || recordTime < oldTime || recordTime < sourceTime) throw new WorkflowError('功能重验需要源码修改及旧基线之后产生的新执行结果与命令输出');
    }
  }
  // 后续返修须将本次新增交付物视作可重验源码，同时继续保留原 V1 命令范围。
  const nextScope = [...scope];
  for (const { unit, result } of current) {
    const addedFiles = result.files.filter((file) => !deliveryFiles.has(file));
    if (addedFiles.length) nextScope.push({ files: addedFiles, commands: unit.acceptanceCommands });
    for (const file of addedFiles) deliveryFiles.add(file);
  }
  const snapshot = { schemaVersion: VERSION, workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, mode: 'local-regression', functionScope: nextScope, work: structuredClone(work), files: collectFunctionFiles(repo, work), engineeringEvidence: engineeringEvidence(repo, work) };
  if (work.workItemType === 'DISPLAY_LAYER') Object.assign(snapshot, { hostId: work.visual.hostId, layerType: work.visual.layerType });
  const path = `${work.evidenceRoot}/function-baseline-r${work.revision + 1}.json`;
  if (existsSync(repoPath(repo, path).absolute)) throw new WorkflowError('功能基线文件已存在，拒绝覆盖');
  await atomicWriteJson(repo, path, snapshot);
  work.invalidatedRefs ??= [];
  work.invalidatedRefs.push({ path: oldRef.path, state: 'V1' });
  work.visual.functionBaselineRef = fileDigest(repo, path);
  // 运行确认针对旧组合，需重审；目标、布局与资源确认仍可保留。
  if (work.visual.reviews?.V5?.path) work.invalidatedRefs.push({ path: work.visual.reviews.V5.path, state: 'V5' });
  if (work.visual.reviews) delete work.visual.reviews.V5;
  for (const target of work.visual.targets ?? []) {
    if (target.reviews?.V5?.path) work.invalidatedRefs.push({ path: target.reviews.V5.path, state: 'V5' });
    if (target.reviews) delete target.reviews.V5;
  }
  if (work.visual.integrationEvidenceRef?.path) work.invalidatedRefs.push({ path: work.visual.integrationEvidenceRef.path, state: 'V5' });
  delete work.visual.integrationEvidenceRef;
  work.revision += 1;
  work.transitionHistory ??= [];
  work.transitionHistory.push({ from: 'function-baseline', to: 'function-revalidated', reason: spec.reason, revision: work.revision });
  return work.visual.functionBaselineRef;
}

/** 显式用新通过的功能证据重建基线，保留未受影响的视觉目标与拆解确认。 */
export async function refreshFunctionBaseline({ repo, workItem, specPath }) {
  return withWorkLock(repo, workItem, async () => {
    const work = loadWork(repo, workItem);
    if (!work.visual || ['V0', 'V1'].includes(work.visual.stage) || !['PROPOSAL', 'REVIEW', 'PASSED', 'IMPLEMENTING', 'VALIDATING'].includes(work.globalState)) throw new WorkflowError('功能重验仅适用于 V2–V5 的未完成工作项');
    const oldRef = work.visual.functionBaselineRef;
    if (!oldRef?.path || fileDigest(repo, oldRef.path).sha256 !== oldRef.sha256) throw new WorkflowError('旧功能基线身份无效，不能直接重绑');
    const old = readJson(repo, oldRef.path, '旧功能基线');
    if (old.workItemId !== work.workItemId || old.objectId !== work.visual.objectId || old.projectId !== work.projectId || old.stack !== work.stack) throw new WorkflowError('旧功能基线身份不匹配');
    if (old.mode === 'dependencies' && !sameFunctionDependencies(repo, old.dependencies, work.visual.functionDependencies)) throw new WorkflowError('当前功能依赖已被直接修改，不能重绑');
    const spec = readJson(repo, specPath, '功能重验规格');
    if (spec.visualImpact !== 'none' || typeof spec.reason !== 'string' || !spec.reason.trim()) throw new WorkflowError('功能重验须提供不影响视觉的结论及原因');
    if (spec.localRegression === true) {
      if (spec.functionDependencies !== undefined) throw new WorkflowError('本地功能重验不能同时指定功能依赖');
      const nextRef = await refreshLocalFunctionBaseline(repo, work, old, oldRef, spec);
      await atomicWriteJson(repo, workItem, work);
      return response({ status: 'PASS', work, changed: true, metadata: { functionBaselineRef: nextRef } });
    }
    if (!['PROPOSAL', 'REVIEW', 'PASSED'].includes(work.globalState) || !Array.isArray(spec.functionDependencies) || !spec.functionDependencies.length) throw new WorkflowError('功能依赖重验须在静止状态提供新功能依赖');
    if (old.mode === 'dependencies' && old.dependencies.some((previous) => !spec.functionDependencies.some((dependency) => dependency.caseId === previous.caseId))) throw new WorkflowError('功能重验不能遗漏已冻结的行为范围');
    const candidate = structuredClone(work);
    candidate.globalState = 'REVIEW';
    candidate.visual.stage = 'V1';
    candidate.visual.functionDependencies = spec.functionDependencies;
    validateFeatureDependencies(repo, candidate, inspectFunctionSource);
    const oldTime = statSync(repoPath(repo, oldRef.path).absolute).mtimeMs;
    const oldFiles = new Set((['local', 'local-regression'].includes(old.mode) ? old.files : (old.sources ?? []).flatMap((source) => source.files ?? [])).map((item) => item.path));
    let changed = 0;
    for (const dependency of spec.functionDependencies) {
      const source = readJson(repo, dependencyPath(repo, dependency.workItemRef.path), '功能来源工作项');
      const previousIndex = old.mode === 'dependencies' ? old.dependencies.findIndex((item) => item.caseId === dependency.caseId) : -1;
      const previous = previousIndex >= 0 ? old.dependencies[previousIndex] : null;
      if (previous && sameFunctionDependency(repo, previous, dependency) && unchangedFunctionSource(repo, source, old.sources[previousIndex])) continue;
      changed += 1;
      const { pack } = inspectExecution(repo, source, { requireComplete: true });
      for (const unit of pack.executionUnits) {
        const result = readJson(repo, unit.resultPath, '新功能执行结果');
        // 必须有基线建立后新产生的执行记录及日志，不能重读或触碰旧摘要冒充重验。
        for (const path of [unit.resultPath, ...result.commandOutputs.map((output) => output.outputFile)]) {
          const file = requireFile(repo, path, '新功能执行记录');
          if (oldFiles.has(file) || statSync(repoPath(repo, file).absolute).mtimeMs < oldTime) throw new WorkflowError('功能重验需要旧基线之后产生的新执行结果与命令输出');
        }
      }
      if (previous && sameFunctionDependency(repo, previous, dependency)) throw new WorkflowError('不能仅重新计算旧功能证据摘要，须提供新验证记录');
      if (previous && sameDependencyPath(repo, previous.workItemRef.path, dependency.workItemRef.path)) {
        const priorSource = old.sources[previousIndex];
        const currentSource = source;
        if (!priorSource || currentSource.revision <= priorSource.revision) throw new WorkflowError('功能来源没有新的已完成验证版本');
      }
    }
    if (!changed) throw new WorkflowError('不能沿用全部旧功能证据冒充新验证记录');
    const nextRef = await freezeFunctionBaseline(repo, candidate);
    const invalidated = work.invalidatedRefs ??= [];
    invalidated.push({ path: oldRef.path, state: 'V1' });
    for (const name of ['implementationPackageRef', 'evidenceRef', 'planningRef']) {
      if (work[name]?.path) invalidated.push({ path: work[name].path, state: work.visual.stage });
      work[name] = null;
    }
    // 最终运行确认必须基于重新验证后的组合，目标及布局确认仍可保留。
    if (work.visual.reviews?.V5?.path) invalidated.push({ path: work.visual.reviews.V5.path, state: 'V5' });
    if (work.visual.reviews) delete work.visual.reviews.V5;
    for (const target of work.visual.targets ?? []) {
      if (target.reviews?.V5?.path) invalidated.push({ path: target.reviews.V5.path, state: 'V5' });
      if (target.reviews) delete target.reviews.V5;
    }
    if (work.visual.integrationEvidenceRef?.path) invalidated.push({ path: work.visual.integrationEvidenceRef.path, state: 'V5' });
    delete work.visual.integrationEvidenceRef;
    work.visual.functionDependencies = spec.functionDependencies;
    work.visual.functionBaselineRef = nextRef;
    work.evidenceRoot = `${work.evidenceRoot}-function-r${work.revision + 1}`;
    work.gateStatus.F2 = 'NOT_RUN';
    work.gateStatus.F3 = 'NOT_RUN';
    work.globalState = 'PROPOSAL';
    work.revision += 1;
    work.transitionHistory ??= [];
    work.transitionHistory.push({ from: 'function-baseline', to: 'function-revalidated', reason: spec.reason, revision: work.revision });
    await atomicWriteJson(repo, workItem, work);
    return response({ status: 'PASS', work, changed: true, metadata: { functionBaselineRef: nextRef } });
  });
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
  }
  if (work.visual.stage !== 'V1') assertFunctionBaseline(repo, work);
  let functionBaselineRef = null;
  if (work.visual.stage === 'V1') {
    // 功能确认后进入 V2，视觉基线及目标可随后创建或复用。
    functionBaselineRef = await freezeFunctionBaseline(repo, work);
  }
  if (work.visual.stage === 'V2') {
    validateGlobalBaseline(repo, work, { required: true });
    assertVisualReview(repo, work, 'V2');
  }
  if (work.visual.stage === 'V3') assertVisualReview(repo, work, 'V3');
  if (work.visual.stage === 'V4') {
    if (work.globalState !== 'PASSED') throw new WorkflowError('V4 正式资源验收需通过当前实现与导入验证');
    assertGates(work, ['F0', 'F1', 'F2', 'F3']);
    // V4 的执行证据可能在 PASSED 后失效，阶段推进前必须重新核对。
    inspectExecution(repo, work, { requireComplete: true });
    assertVisualReview(repo, work, 'V4');
  }
  const previousState = work.globalState;
  const archive = { visualStage: work.visual.stage, implementationPackageRef: work.implementationPackageRef, evidenceRef: work.evidenceRef, planningRef: work.planningRef ?? null, revision: work.revision };
  const archivePath = `${work.evidenceRoot}/archive-${work.visual.stage}-${work.revision + 1}.json`;
  if (work.implementationPackageRef || work.evidenceRef) await atomicWriteJson(repo, archivePath, archive);
  if (work.implementationPackageRef?.path) (work.invalidatedRefs ??= []).push({ path: work.implementationPackageRef.path, state: work.visual.stage });
  if (work.evidenceRef?.path) (work.invalidatedRefs ??= []).push({ path: work.evidenceRef.path, state: work.visual.stage });
  if (work.planningRef?.path) (work.invalidatedRefs ??= []).push({ path: work.planningRef.path, state: work.visual.stage });
  work.visual.stage = to;
  if (functionBaselineRef) work.visual.functionBaselineRef = functionBaselineRef;
  work.implementationPackageRef = null;
  work.evidenceRef = null;
  work.planningRef = null;
  work.assetReviewRef = to === 'V5' ? work.assetReviewRef : null;
  // 设计阶段不需要伪造编译；新正式资源/运行阶段需各自冻结新的实施包和结果。
  if (['V2', 'V4', 'V5'].includes(to)) {
    // V4 与 V5 各自有独立执行闭环，切换时不复用前一阶段的 execution-state。
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
