import { fileIdentityKey, readJson, WorkflowError } from './io.mjs';
import { productionIdentity, validateProductionScope } from './production-scope.mjs';
import { assertRunnableCommand } from './runnable-command.mjs';
import { getWorkSource } from './work-source.mjs';
import { assertResolvedModuleRules } from './module-plan-rules.mjs';

// 二维要素独立登记并沿用现有验收字段，避免只靠流程或状态名称推断画面内容。
const kinds = ['element', 'function', 'state', 'step', 'transition', 'progress'];

/** 比较已冻结引用，防止用内容相同的另一份计划改绑阶段来源。 */
export function samePlanRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256
    && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 按明确的小合同读取计划，完整性以本轮范围及每项可验证的验收结果为准。 */
export function readModulePlan(repo, work) {
  const path = productionIdentity(repo, work.visual.modulePlanRef, 'V1 模块方案');
  const plan = readJson(repo, path, 'V1 模块方案');
  if (plan?.schemaVersion !== '1.0' || plan.workItemId !== work.workItemId || plan.objectId !== work.visual.objectId
    || (work.workItemType === 'DISPLAY_LAYER' && plan.hostId !== work.visual.hostId)) {
    throw new WorkflowError('V1 模块方案未绑定当前工作项、对象或宿主');
  }
  if (!Array.isArray(plan.entries) || !plan.entries.length || !Array.isArray(plan.dependencies)
    || plan.dependencies.some((dependency) => typeof dependency !== 'string' || !dependency.trim())) {
    throw new WorkflowError('V1 模块方案必须登记依赖及带验收条件的范围');
  }
  const entries = new Map();
  for (const entry of plan.entries) {
    const key = `${entry?.kind}:${entry?.id}`;
    if (!kinds.includes(entry?.kind) || typeof entry.id !== 'string' || !entry.id.trim()
      || typeof entry.description !== 'string' || !entry.description.trim()
      || typeof entry.acceptance !== 'string' || !entry.acceptance.trim()
      || typeof entry.requirementId !== 'string' || !entry.requirementId.trim()
      || typeof entry.command !== 'string' || !entry.command.trim() || entries.has(key)) {
      throw new WorkflowError(`V1 模块方案条目重复或缺少验收方式：${key}`);
    }
    assertRunnableCommand(entry.command, `V1 ${key} 验收命令`);
    entries.set(key, entry);
  }
  for (const kind of ['function', 'state', 'step']) {
    if (!plan.entries.some((entry) => entry.kind === kind)) throw new WorkflowError(`V1 模块方案必须登记 ${kind}`);
  }
  const production = validateProductionScope(repo, work);
  if (production) assertProductionPlanCoverage(repo, work, entries, production);
  // 规则在 V1 冻结时核对，后续阶段按已冻结的方案身份验收。
  if (work.visual.stage === 'V1') {
    const boundaryStates = new Set([...(production?.states.values() ?? [])]
      .filter((state) => state.objectId !== work.visual.objectId).map((state) => state.stateId));
    assertResolvedModuleRules(plan.rules, entries, boundaryStates);
    if (production) assertProductionFlowScope(work, plan.rules.flows, production);
  }
  return plan;
}

/** 绑定了版本范围时，模块方案必须覆盖本对象本批的已登记条目及转换端点。 */
function assertProductionPlanCoverage(repo, work, entries, production) {
  const listed = production.scope.versionVisual?.workItemPaths;
  const workPath = getWorkSource(work);
  if (listed && workPath && !listed.some((path) => fileIdentityKey(repo, path) === fileIdentityKey(repo, workPath))) {
    throw new WorkflowError('正式模块未登记在当前版本视觉来源清单');
  }
  const objectId = work.visual.objectId;
  const batch = production.batches.get(work.productionBatchId);
  const forObject = (kind, id, objectIds) => {
    if (objectIds.includes(objectId) && !entries.has(`${kind}:${id}`)) throw new WorkflowError(`V1 模块方案遗漏生产范围中的 ${kind}：${id}`);
  };
  const stateIds = new Set();
  const scopedTransitions = [];
  for (const id of batch?.stepIds ?? production.steps.keys()) {
    const step = production.steps.get(id);
    forObject('step', id, step.objectIds);
    step.stateIds.forEach((stateId) => stateIds.add(stateId));
  }
  for (const id of batch?.transitionIds ?? production.transitions.keys()) {
    const transition = production.transitions.get(id);
    const { fromStateId, toStateId } = transition;
    stateIds.add(fromStateId);
    stateIds.add(toStateId);
    const objectIds = [production.states.get(fromStateId).objectId, production.states.get(toStateId).objectId];
    forObject('transition', id, objectIds);
    if (work.visual.stage === 'V1' && objectIds.includes(objectId)) scopedTransitions.push(transition);
  }
  for (const id of stateIds) forObject('state', id, [production.states.get(id).objectId]);
  // 只有同名标识仍可能把进度写到错误对象，明确核对生产范围的源状态和目标状态。
  for (const { transitionId, fromStateId, toStateId } of scopedTransitions) {
    const entry = entries.get(`transition:${transitionId}`);
    if (entry.fromStateId !== fromStateId || entry.toStateId !== toStateId) {
      throw new WorkflowError(`V1 状态转换 ${transitionId} 的起止状态与生产范围不一致`);
    }
  }
}

/** 核对步骤的适用状态及生产路径，保留步骤顺序和回环。 */
function assertProductionFlowScope(work, flows, production) {
  const scopedSteps = new Set(production.batch?.stepIds ?? []);
  for (const flow of flows) {
    const states = new Set(flow.stateIds);
    for (const id of new Set(flow.stepIds)) {
      if (!scopedSteps.has(id)) continue;
      const step = production.steps.get(id);
      if (step.stateIds.some((stateId) => !states.has(stateId))) {
        throw new WorkflowError(`V1 流程 ${flow.id} 未覆盖生产步骤 ${id} 的适用状态`);
      }
    }
  }
  for (const id of production.batch?.pathIds ?? []) {
    const path = production.paths.get(id);
    const localSteps = path.stepIds.filter((stepId) => production.steps.get(stepId).objectIds.includes(work.visual.objectId));
    if (!localSteps.length) continue;
    const covered = flows.some((flow) => {
      let position = 0;
      for (const stepId of flow.stepIds) {
        if (stepId === localSteps[position]) position += 1;
      }
      return position === localSteps.length;
    });
    if (!covered) throw new WorkflowError(`V1 流程遗漏生产路径 ${id} 或未保留步骤顺序`);
  }
}

/** 正式验收使用当前包已完成的执行单元，准备阶段的同名命令不能代替 V5。 */
export function assertModuleRuntimeCoverage(plan, pack) {
  const modules = new Map(pack.systemCoverage.modules.map((module) => [module.moduleId, module]));
  const current = new Map(pack.systemCoverage.requirements.filter((requirement) => requirement.scope === 'current')
    .map((requirement) => [requirement.requirementId, requirement]));
  for (const entry of plan.entries) {
    const matches = current.get(entry.requirementId)?.moduleIds.some((moduleId) =>
      modules.get(moduleId)?.verifications.some((verification) => verification.command === entry.command));
    if (!matches) throw new WorkflowError(`V5 执行结果遗漏 V1 验收项 ${entry.kind}:${entry.id}`);
  }
}
