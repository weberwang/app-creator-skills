import { fileIdentityKey, readJson, WorkflowError } from './io.mjs';
import { productionIdentity, validateProductionScope } from './production-scope.mjs';
import { assertRunnableCommand } from './runnable-command.mjs';
import { getWorkSource } from './work-source.mjs';

const kinds = ['function', 'state', 'step', 'transition', 'progress'];

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
  const multipleStates = plan.entries.filter((entry) => entry.kind === 'state').length > 1;
  const multipleSteps = plan.entries.filter((entry) => entry.kind === 'step').length > 1;
  if (multipleStates && !plan.entries.some((entry) => entry.kind === 'transition')) throw new WorkflowError('V1 多状态模块缺少状态转换规划');
  if (multipleSteps && !plan.entries.some((entry) => entry.kind === 'progress')) throw new WorkflowError('V1 多步骤模块缺少进度规划');
  const production = validateProductionScope(repo, work);
  if (production) assertProductionPlanCoverage(repo, work, entries, production);
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
  for (const id of batch?.stepIds ?? production.steps.keys()) {
    const step = production.steps.get(id);
    forObject('step', id, step.objectIds);
    step.stateIds.forEach((stateId) => stateIds.add(stateId));
  }
  for (const id of batch?.transitionIds ?? production.transitions.keys()) {
    const { fromStateId, toStateId } = production.transitions.get(id);
    stateIds.add(fromStateId);
    stateIds.add(toStateId);
    forObject('transition', id, [production.states.get(fromStateId).objectId, production.states.get(toStateId).objectId]);
  }
  for (const id of stateIds) forObject('state', id, [production.states.get(id).objectId]);
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
