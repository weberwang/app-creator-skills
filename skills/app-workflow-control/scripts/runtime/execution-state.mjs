import { VERSION } from './constants.mjs';
import { loadPackage, validateUnitResult } from './artifacts.mjs';
import { readJson, requireFile, WorkflowError } from './io.mjs';
import { createExecutionPlanSnapshot, expectedActiveBatch } from './execution-batches.mjs';
import { validateDeletionBaselineState } from './deletion-baseline.mjs';
import { validateIntegrationScope } from './final-integration.mjs';
import { assertSampleResult } from './production-samples.mjs';

/** 校验当前有序执行计划，返回尚未闭合的首个单元。 */
export function inspectExecution(repo, work, { requireComplete = false, historical = false } = {}) {
  const pack = loadPackage(repo, work);
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  const state = readJson(repo, statePath, 'Execution State');
  const activeBatch = validateExecutionState(repo, work, pack, state, { requireComplete, historical });
  return { pack, state, activeBatch };
}

/** 校验运行时状态、冻结计划、当前批次和全部已通过单元的真实结果。 */
export function validateExecutionState(repo, work, pack, state, { requireComplete = false, historical = false } = {}) {
  if (state.schemaVersion !== VERSION || state.workItemId !== work.workItemId || state.stack !== work.stack || state.implementationPackageRef !== work.implementationPackageRef.path) {
    throw new WorkflowError('Execution State 未绑定当前工作项和实施包');
  }
  if (work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final') {
    if (!state.integrationScopeRef || state.integrationScopeRef.path !== work.integrationScopeRef?.path || state.integrationScopeRef.sha256 !== work.integrationScopeRef?.sha256) throw new WorkflowError('最终集成范围与开始实施时冻结的范围不一致');
    validateIntegrationScope(repo, work);
  }
  const plan = createExecutionPlanSnapshot(pack, { repo });
  if (JSON.stringify(state.executionPlan) !== JSON.stringify(plan)) throw new WorkflowError('冻结的执行计划与当前实施包不匹配');
  validateDeletionBaselineState(state, plan.batches);
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
      validateUnitResult(repo, work, pack, unit, result, { historical });
      assertSampleResult(repo, work, unit, result, resultState);
    }
  }
  const activeBatch = expectedActiveBatch(plan.batches, state.units);
  if (!Array.isArray(state.activeBatch) || JSON.stringify(state.activeBatch) !== JSON.stringify(activeBatch)) {
    throw new WorkflowError('Execution State.activeBatch 与已完成结果不一致');
  }
  if (requireComplete && activeBatch.length) throw new WorkflowError(`仍有执行批次未完成：${activeBatch.join(', ')}`);
  return activeBatch;
}
