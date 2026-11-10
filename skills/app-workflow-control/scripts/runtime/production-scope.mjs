import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 核对引用的实际文件和字节身份；范围或证据变化必须重新冻结。 */
export function productionIdentity(repo, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}必须提供项目路径和小写 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}内容已变化或为空，必须重新冻结`);
  return path;
}

/** 要求身份及规则为非空文字，不接受占位的空对象。 */
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label}必须为非空字符串`);
}

/** 拒绝拼写错误的额外字段，避免遗漏范围被当作已核对。 */
function fields(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new WorkflowError(`${label}包含不支持字段：${key}`);
}

/** 校验非空且不重复的标识数组；允许空数组时显式指定。 */
function ids(value, label, { empty = false } = {}) {
  if (!Array.isArray(value) || (!empty && !value.length) || value.some((item) => typeof item !== 'string' || !item.trim()) || new Set(value).size !== value.length) throw new WorkflowError(`${label}必须是${empty ? '' : '非空'}且无重复的标识数组`);
  return value;
}

/** 按唯一标识建立索引，禁止用重复对象覆盖原有定义。 */
function index(items, key, label, { empty = false } = {}) {
  if (!Array.isArray(items) || (!empty && !items.length)) throw new WorkflowError(`${label}必须为${empty ? '' : '非空'}数组`);
  const result = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new WorkflowError(`${label}条目必须是对象`);
    text(item[key], `${label}.${key}`);
    if (result.has(item[key])) throw new WorkflowError(`${label}.${key}不得重复：${item[key]}`);
    result.set(item[key], item);
  }
  return result;
}

/** 严格识别总范围及其业务状态、步骤、转移与开发批次关系。 */
export function validateProductionDefinition(scope, work) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) || scope.schemaVersion !== '1.0') throw new WorkflowError('生产总范围版本无效');
  fields(scope, ['schemaVersion', 'scopeId', 'projectId', 'stack', 'objects', 'regions', 'states', 'steps', 'transitions', 'paths', 'batches'], '生产总范围');
  for (const key of ['scopeId', 'projectId', 'stack']) text(scope[key], `生产总范围.${key}`);
  if (scope.projectId !== work.projectId || scope.stack !== work.stack) throw new WorkflowError('生产总范围与工作项的项目或技术栈不匹配');
  const objects = index(scope.objects, 'objectId', '生产对象');
  const regions = index(scope.regions ?? [], 'regionId', '生产区域', { empty: true });
  const states = index(scope.states, 'stateId', '业务状态');
  const steps = index(scope.steps, 'stepId', '业务步骤', { empty: true });
  const transitions = index(scope.transitions, 'transitionId', '状态转移', { empty: true });
  const paths = index(scope.paths ?? [], 'pathId', '业务路径', { empty: true });
  const batches = index(scope.batches, 'batchId', '生产批次');
  if (!steps.size && !transitions.size) throw new WorkflowError('生产总范围至少需要一个业务步骤或状态转移');

  for (const object of objects.values()) {
    fields(object, ['objectId', 'workItemType', 'targetIds', 'hostId', 'layerType'], `生产对象 ${object.objectId}`);
    if (!['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(object.workItemType)) throw new WorkflowError(`生产对象 ${object.objectId} 的类型无效`);
    if (object.workItemType === 'SCENE') ids(object.targetIds, `生产对象 ${object.objectId}.targetIds`);
    else if (object.targetIds !== undefined) throw new WorkflowError(`生产对象 ${object.objectId} 只有 SCENE 可声明多目标`);
    if (object.workItemType === 'DISPLAY_LAYER') {
      text(object.hostId, `生产对象 ${object.objectId}.hostId`);
      if (!['modal', 'popup', 'drawer', 'toast'].includes(object.layerType)) throw new WorkflowError(`生产对象 ${object.objectId} 的显示层类型无效`);
    } else if (object.hostId !== undefined || object.layerType !== undefined) throw new WorkflowError(`生产对象 ${object.objectId} 只有 DISPLAY_LAYER 可声明宿主和类型`);
  }
  for (const region of regions.values()) {
    fields(region, ['regionId', 'objectId', 'description'], `生产区域 ${region.regionId}`);
    if (!objects.has(region.objectId)) throw new WorkflowError(`生产区域 ${region.regionId} 引用了未知对象`);
    text(region.description, `生产区域 ${region.regionId}.description`);
  }
  const coveredRegions = new Set();
  for (const state of states.values()) {
    fields(state, ['stateId', 'objectId', 'description', 'regionIds'], `业务状态 ${state.stateId}`);
    if (!objects.has(state.objectId)) throw new WorkflowError(`业务状态 ${state.stateId} 引用了未知对象`);
    text(state.description, `业务状态 ${state.stateId}.description`);
    if (state.regionIds !== undefined) {
      ids(state.regionIds, `业务状态 ${state.stateId}.regionIds`, { empty: true });
      if (state.regionIds.some((id) => !regions.has(id) || regions.get(id).objectId !== state.objectId)) throw new WorkflowError(`业务状态 ${state.stateId} 引用了未知或不属于当前对象的区域`);
      state.regionIds.forEach((id) => coveredRegions.add(id));
    }
  }
  // 区域一旦列入总范围，必须与有业务覆盖的状态关联，避免被静默遗漏。
  for (const id of regions.keys()) if (!coveredRegions.has(id)) throw new WorkflowError(`生产区域 ${id} 未被任何业务状态覆盖`);
  const coveredStates = new Set();
  for (const step of steps.values()) {
    fields(step, ['stepId', 'objectIds', 'stateIds', 'precondition', 'action', 'expectedResult', 'caseId'], `业务步骤 ${step.stepId}`);
    ids(step.objectIds, `业务步骤 ${step.stepId}.objectIds`);
    ids(step.stateIds, `业务步骤 ${step.stepId}.stateIds`);
    if (step.objectIds.some((id) => !objects.has(id)) || step.stateIds.some((id) => !states.has(id) || !step.objectIds.includes(states.get(id).objectId))) throw new WorkflowError(`业务步骤 ${step.stepId} 引用了未知对象或不属于该对象的状态`);
    for (const key of ['precondition', 'action', 'expectedResult', 'caseId']) text(step[key], `业务步骤 ${step.stepId}.${key}`);
    step.stateIds.forEach((id) => coveredStates.add(id));
  }
  for (const transition of transitions.values()) {
    fields(transition, ['transitionId', 'fromStateId', 'toStateId', 'trigger', 'expectedResult', 'caseId'], `状态转移 ${transition.transitionId}`);
    if (!states.has(transition.fromStateId) || !states.has(transition.toStateId)) throw new WorkflowError(`状态转移 ${transition.transitionId} 引用了未知状态`);
    for (const key of ['trigger', 'expectedResult', 'caseId']) text(transition[key], `状态转移 ${transition.transitionId}.${key}`);
    coveredStates.add(transition.fromStateId); coveredStates.add(transition.toStateId);
  }
  for (const id of states.keys()) if (!coveredStates.has(id)) throw new WorkflowError(`业务状态 ${id} 未被任何步骤或转移覆盖`);
  for (const path of paths.values()) {
    fields(path, ['pathId', 'stepIds', 'caseId'], `业务路径 ${path.pathId}`);
    text(path.caseId, `业务路径 ${path.pathId}.caseId`);
    // 步骤重复可表达重试或回环；有序列表本身是需要验证的业务事实。
    if (!Array.isArray(path.stepIds) || !path.stepIds.length || path.stepIds.some((id) => typeof id !== 'string' || !steps.has(id))) throw new WorkflowError(`业务路径 ${path.pathId} 包含未知或空步骤`);
  }

  const seenObjects = new Set(); const seenSteps = new Set(); const seenTransitions = new Set(); const seenPaths = new Set();
  for (const batch of batches.values()) {
    fields(batch, ['batchId', 'objectIds', 'stepIds', 'transitionIds', 'pathIds', 'dependsOn'], `生产批次 ${batch.batchId}`);
    ids(batch.objectIds, `生产批次 ${batch.batchId}.objectIds`);
    ids(batch.stepIds, `生产批次 ${batch.batchId}.stepIds`, { empty: true });
    ids(batch.transitionIds, `生产批次 ${batch.batchId}.transitionIds`, { empty: true });
    if (!batch.stepIds.length && !batch.transitionIds.length) throw new WorkflowError(`生产批次 ${batch.batchId} 未声明业务步骤或转移`);
    if (batch.objectIds.some((id) => !objects.has(id))) throw new WorkflowError(`生产批次 ${batch.batchId} 引用了未知对象`);
    for (const id of batch.stepIds) {
      const step = steps.get(id);
      if (!step || step.objectIds.some((objectId) => !batch.objectIds.includes(objectId))) throw new WorkflowError(`生产批次 ${batch.batchId} 的步骤 ${id} 未绑定完整对象`);
      seenSteps.add(id);
    }
    for (const id of batch.transitionIds) {
      const transition = transitions.get(id);
      if (!transition || [states.get(transition.fromStateId).objectId, states.get(transition.toStateId).objectId].some((objectId) => !batch.objectIds.includes(objectId))) throw new WorkflowError(`生产批次 ${batch.batchId} 的状态转移 ${id} 未绑定完整对象`);
      seenTransitions.add(id);
    }
    if (batch.pathIds !== undefined) {
      ids(batch.pathIds, `生产批次 ${batch.batchId}.pathIds`, { empty: true });
      for (const id of batch.pathIds) {
        const path = paths.get(id);
        if (!path || path.stepIds.some((stepId) => !batch.stepIds.includes(stepId))) throw new WorkflowError(`生产批次 ${batch.batchId} 的业务路径 ${id} 未绑定完整步骤`);
        seenPaths.add(id);
      }
    }
    batch.objectIds.forEach((id) => seenObjects.add(id));
    if (batch.dependsOn !== undefined) {
      ids(batch.dependsOn, `生产批次 ${batch.batchId}.dependsOn`, { empty: true });
      if (batch.dependsOn.some((id) => !batches.has(id) || id === batch.batchId)) throw new WorkflowError(`生产批次 ${batch.batchId} 引用了未知或自身依赖`);
    }
  }
  for (const id of objects.keys()) if (!seenObjects.has(id)) throw new WorkflowError(`生产对象 ${id} 未列入任何批次`);
  for (const id of steps.keys()) if (!seenSteps.has(id)) throw new WorkflowError(`业务步骤 ${id} 未列入任何批次`);
  for (const id of transitions.keys()) if (!seenTransitions.has(id)) throw new WorkflowError(`状态转移 ${id} 未列入任何批次`);
  for (const id of paths.keys()) if (!seenPaths.has(id)) throw new WorkflowError(`业务路径 ${id} 未列入任何批次`);
  const visited = new Set(); const visiting = new Set();
  /** 批次依赖描述开发顺序；循环会使执行永远无法收敛。 */
  function visit(id) {
    if (visiting.has(id)) throw new WorkflowError(`生产批次依赖存在循环：${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of batches.get(id).dependsOn ?? []) visit(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of batches.keys()) visit(id);
  return { scope, objects, regions, states, steps, transitions, paths, batches };
}

/** 核对已绑定总范围；普通工作项无引用时不增加任何阶段要求。 */
export function validateProductionScope(repo, work) {
  if (!work?.productionScopeRef) return null;
  const path = productionIdentity(repo, work.productionScopeRef, '生产总范围');
  const result = validateProductionDefinition(readJson(repo, path, '生产总范围'), work);
  const final = work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final';
  if (final) {
    if (work.productionBatchId !== undefined) throw new WorkflowError('最终集成不能指定单个生产批次');
    if (work.productionDependencies !== undefined) throw new WorkflowError('最终集成不能声明单批次生产依赖');
    return { ...result, batch: null };
  }
  text(work.productionBatchId, 'productionBatchId');
  const batch = result.batches.get(work.productionBatchId);
  if (!batch) throw new WorkflowError('工作项绑定了未知生产批次');
  const expectedDependencies = batch.dependsOn ?? [];
  const dependencies = work.productionDependencies === undefined ? [] : work.productionDependencies;
  if (!Array.isArray(dependencies) || dependencies.length !== expectedDependencies.length || new Set(dependencies.map((item) => item?.batchId)).size !== expectedDependencies.length) throw new WorkflowError('生产批次依赖必须逐项绑定来源工作项');
  for (const dependency of dependencies) {
    if (!expectedDependencies.includes(dependency?.batchId)) throw new WorkflowError('生产依赖批次不在当前范围中');
    repoPath(repo, dependency.workItemRef?.path, '生产依赖工作项');
    if (dependency.workItemRef.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(dependency.workItemRef.sha256)) throw new WorkflowError('生产依赖摘要必须为小写 SHA-256');
  }
  if (work.visual) {
    const object = result.objects.get(work.visual.objectId);
    if (!object || object.workItemType !== work.workItemType || !batch.objectIds.includes(object.objectId)) throw new WorkflowError('工作项视觉对象或类型不在当前生产批次');
    if (object.workItemType === 'DISPLAY_LAYER' && (work.visual.hostId !== object.hostId || work.visual.layerType !== object.layerType)) throw new WorkflowError('工作项显示层宿主或类型与生产总范围不一致');
    if (object.workItemType === 'SCENE' && (work.visual.targets ?? []).some((target) => !object.targetIds.includes(target.targetId))) throw new WorkflowError('工作项场景目标超出生产总范围');
  }
  return { ...result, batch };
}

/** 从真实项目内范围文件生成引用并立即检查批次，不生成虚构通过结果。 */
export function bindProductionScope(repo, work, { scopePath, batchId, dependenciesPath } = {}) {
  if (!scopePath) {
    if (batchId !== undefined || dependenciesPath !== undefined) throw new WorkflowError('指定生产批次或依赖时必须提供生产总范围');
    return work;
  }
  const path = requireFile(repo, scopePath, '生产总范围');
  const bytes = readFileSync(repoPath(repo, path).absolute);
  work.productionScopeRef = { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  if (batchId !== undefined) work.productionBatchId = batchId;
  if (dependenciesPath !== undefined) work.productionDependencies = readJson(repo, dependenciesPath, '生产依赖声明');
  validateProductionScope(repo, work);
  return work;
}

/** 冻结依赖来源的当前完成版本，规划前允许路径已知而来源尚未完成。 */
export function freezeProductionDependencies(repo, work, inspectSource) {
  const result = validateProductionScope(repo, work);
  if (!result?.batch || !work.productionDependencies?.length) return work;
  work.productionDependencies = work.productionDependencies.map((dependency) => {
    const path = requireFile(repo, dependency.workItemRef.path, '生产依赖工作项');
    const sha256 = createHash('sha256').update(readFileSync(repoPath(repo, path).absolute)).digest('hex');
    if (dependency.workItemRef.sha256 && dependency.workItemRef.sha256 !== sha256) throw new WorkflowError(`生产依赖 ${dependency.batchId} 已变化，须重新确认依赖`);
    return { batchId: dependency.batchId, workItemRef: { path, sha256 } };
  });
  assertProductionDependencies(repo, work, inspectSource);
  return work;
}

/** 持续核对已冻结的前置批次身份和完成状态，不把历史结果当作当前版本通过。 */
export function assertProductionDependencies(repo, work, inspectSource) {
  const result = validateProductionScope(repo, work);
  if (!result?.batch || !work.productionDependencies?.length) return;
  if (typeof inspectSource !== 'function') throw new WorkflowError('生产依赖必须提供实际完成材料检查器');
  for (const dependency of work.productionDependencies) {
    const path = productionIdentity(repo, dependency.workItemRef, `生产依赖 ${dependency.batchId}`);
    const source = readJson(repo, path, '生产依赖工作项');
    if (source.workItemId === work.workItemId || source.globalState !== 'COMPLETE' || source.projectId !== work.projectId || source.stack !== work.stack || source.productionBatchId !== dependency.batchId) throw new WorkflowError(`生产依赖 ${dependency.batchId} 必须绑定当前项目中已完成的前置批次`);
    if (!source.productionScopeRef || source.productionScopeRef.sha256 !== work.productionScopeRef.sha256 || repoPath(repo, source.productionScopeRef.path).relative !== repoPath(repo, work.productionScopeRef.path).relative) throw new WorkflowError(`生产依赖 ${dependency.batchId} 未绑定同一冻结总范围`);
    const sourceBatch = result.batches.get(dependency.batchId);
    if (source.visual) {
      // 多对象批次需要整批功能来源，单个页面完成不能证明跨对象链路。
      if (sourceBatch.objectIds.length !== 1 || source.visual.objectId !== sourceBatch.objectIds[0] || source.workItemType !== result.objects.get(source.visual.objectId)?.workItemType) throw new WorkflowError(`生产依赖 ${dependency.batchId} 的单个视觉对象不能代表整个批次`);
    } else if (source.workItemType !== 'MODULE' && !(source.workItemType === 'INTEGRATION' && source.integrationPurpose === 'feature')) {
      throw new WorkflowError(`生产依赖 ${dependency.batchId} 必须使用模块或功能集成作为批次汇总`);
    }
    const checked = inspectSource(repo, source, path);
    if (!checked || typeof checked.then === 'function' || checked.status !== 'PASS' || (Array.isArray(checked.blocking) && checked.blocking.length)) throw new WorkflowError(`生产依赖 ${dependency.batchId} 的历史完成材料未通过检查`);
  }
}

/** 检查实施包冻结的范围与批次仍匹配工作项；文件内容也须保持不变。 */
export function validateProductionPackage(repo, work, pack) {
  if (!work?.productionScopeRef) {
    if (pack.productionScopeRef !== undefined || pack.productionBatchId !== undefined || pack.productionDependencies !== undefined) throw new WorkflowError('实施包生产范围未绑定当前工作项');
    return;
  }
  validateProductionScope(repo, work);
  const expected = work.productionScopeRef; const actual = pack.productionScopeRef;
  /** Windows 同一文件的大小写写法不能制造不同范围身份。 */
  const key = (path) => { const value = repoPath(repo, path).relative; return process.platform === 'win32' ? value.toLowerCase() : value; };
  if (!actual?.path || actual.sha256 !== expected.sha256 || key(actual.path) !== key(expected.path) || pack.productionBatchId !== work.productionBatchId) throw new WorkflowError('实施包生产范围或批次与工作项不一致');
  /** 按批次身份规范化，数组顺序变化不改变依赖来源。 */
  const normalize = (items) => (items ?? []).map((item) => {
    if (!/^[a-f0-9]{64}$/.test(item?.workItemRef?.sha256 ?? '')) throw new WorkflowError('实施包生产依赖缺少已冻结的 SHA-256');
    return { batchId: item.batchId, path: key(item.workItemRef.path), sha256: item.workItemRef.sha256 };
  }).sort((a, b) => a.batchId.localeCompare(b.batchId));
  if (!Array.isArray(pack.productionDependencies ?? []) || JSON.stringify(normalize(pack.productionDependencies)) !== JSON.stringify(normalize(work.productionDependencies))) throw new WorkflowError('实施包生产依赖与工作项不一致');
}
