import { WorkflowError } from './io.mjs';

/** 沿用方案条目的分类，按流程反查每个条目的用途。 */
const flowFields = {
  function: 'functionIds',
  state: 'stateIds',
  step: 'stepIds',
  transition: 'transitionIds',
  progress: 'progressIds',
};

/** 仅接受有实际内容的标识，避免把空白或错误类型当成可引用的条目。 */
function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** 明确待定规则使用原有拷问流程，已有依据直接记录规则。 */
function requireRuleText(value, label) {
  if (!hasText(value) || /^(?:(?:待定|未定|不明确|待明确|待确认|待澄清|待补充|待填写)(?:$|[：:。\s])|(?:TBD|TODO|N\/?A)(?:$|\b)|<[^>]+>$)/i.test(value.trim())) {
    throw new WorkflowError(`${label} 尚未明确，须在 V1 做 grilling 并补齐方案`, 'V1_GRILLING_REQUIRED');
  }
}

/** 读取实际有序引用，流程允许同一步骤在循环中出现多次。 */
function readIds(value, label, { minimum = 0, repeated = false } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.some((id) => !hasText(id))
    || (!repeated && new Set(value).size !== value.length)) {
    throw new WorkflowError(`${label} 缺失、重复或含无效标识`);
  }
  return value;
}

/** 核对机制、转换及每个条目的验收预期，供流程验证复用已核对的转换。 */
function readEntryRules(entries, boundaryStates) {
  const transitions = new Map();
  for (const entry of entries.values()) {
    requireRuleText(entry.acceptance, `V1 条目 ${entry.kind}:${entry.id} 的验收预期`);
    if (entry.kind === 'function') {
      requireRuleText(entry.trigger, `V1 机制 ${entry.id} 的触发条件`);
      requireRuleText(entry.resolution, `V1 机制 ${entry.id} 的处理规则`);
    }
    if (entry.kind !== 'transition') continue;
    requireRuleText(entry.trigger, `V1 状态转换 ${entry.id} 的触发条件`);
    for (const stateId of [entry.fromStateId, entry.toStateId]) {
      if (!hasText(stateId) || (!entries.has(`state:${stateId}`) && !boundaryStates.has(stateId))) {
        throw new WorkflowError(`V1 状态转换 ${entry.id} 的起止状态未登记`);
      }
    }
    transitions.set(entry.id, entry);
  }
  return transitions;
}

/** 组合可以覆盖两项或多项机制，验证仍落在已有的 V5 验收条目上。 */
function readCombinations(combinations, entries) {
  const rules = new Map();
  for (const rule of combinations) {
    if (!hasText(rule?.id) || rules.has(rule.id)) throw new WorkflowError('V1 组合规则标识缺失或重复');
    const label = `V1 组合规则 ${rule.id}`;
    const functionIds = readIds(rule.functionIds, label, { minimum: 2 });
    if (functionIds.some((id) => !entries.has(`function:${id}`))) throw new WorkflowError(`${label} 引用了未登记的机制`);
    requireRuleText(rule.trigger, `${label} 的适用条件`);
    requireRuleText(rule.resolution, `${label} 的处理规则`);
    const { kind, id } = rule.verification ?? {};
    const verification = `${kind}:${id}`;
    if (!Object.hasOwn(flowFields, kind) || !hasText(id) || !entries.has(verification)) throw new WorkflowError(`${label} 缺少已登记的验收条目`);
    rules.set(rule.id, { functionIds: new Set(functionIds), verification });
  }
  return rules;
}

/** 同一流程的端点保持在当前范围内，从合法初始状态推演状态类别的可达性。 */
function assertReachableStates(flow, transitions, label) {
  const states = new Set(flow.stateIds);
  const pending = [...readIds(flow.initialStateIds, `${label}.initialStateIds`, { minimum: 1 })];
  if (pending.some((id) => !states.has(id))) throw new WorkflowError(`${label} 的初始状态未登记在本流程`);
  const edges = new Map();
  for (const id of flow.transitionIds) {
    const { fromStateId, toStateId } = transitions.get(id);
    if (!states.has(fromStateId) || !states.has(toStateId)) throw new WorkflowError(`${label} 的状态转换 ${id} 缺少流程内起止状态`);
    if (!edges.has(fromStateId)) edges.set(fromStateId, []);
    edges.get(fromStateId).push(toStateId);
  }
  const reached = new Set(pending);
  while (pending.length) {
    for (const target of edges.get(pending.pop()) ?? []) {
      if (reached.has(target)) continue;
      reached.add(target);
      pending.push(target);
    }
  }
  const unreachable = flow.stateIds.filter((id) => !reached.has(id));
  if (unreachable.length) throw new WorkflowError(`${label} 有无法从初始状态到达的已登记状态：${unreachable.join('、')}`);
}

/** 已确认可能共同触发的机制组需要整体裁决，单独的两两规则无法描述整体结果。 */
function assertSimultaneousGroups(flow, mechanisms, rules, label) {
  if (flow.functionIds.length < 3 && flow.simultaneousGroups === undefined) return;
  if (!Array.isArray(flow.simultaneousGroups)) throw new WorkflowError(`${label} 尚未明确三个及以上机制可共同触发的组合`);
  const seen = new Set();
  for (const group of flow.simultaneousGroups) {
    const ids = readIds(group, `${label}.simultaneousGroups`, { minimum: 3 });
    const key = JSON.stringify([...ids].sort());
    if (seen.has(key) || ids.some((id) => !mechanisms.has(id))) throw new WorkflowError(`${label} 的共同触发组合重复或越出本流程`);
    seen.add(key);
    if (!rules.some((rule) => ids.every((id) => rule.has(id)))) {
      throw new WorkflowError(`${label} 缺少机制 ${ids.join('、')} 共同触发的整体裁决，规则不清时做 grilling`);
    }
  }
}

/** 共处流程的每对机制均有裁决依据，同一条规则可以说明多项机制如何共存。 */
function assertFlowCombinations(flow, combinations, covered, used, label) {
  const mechanisms = new Set(flow.functionIds);
  const rules = readIds(flow.combinationIds, `${label}.combinationIds`).map((id) => {
    const rule = combinations.get(id);
    if (!rule || [...rule.functionIds].some((mechanism) => !mechanisms.has(mechanism)) || !covered.has(rule.verification)) {
      throw new WorkflowError(`${label} 的组合规则 ${id} 或其验收条目未绑定本流程`);
    }
    used.add(id);
    return rule.functionIds;
  });
  for (const [index, first] of flow.functionIds.entries()) {
    for (const second of flow.functionIds.slice(index + 1)) {
      if (!rules.some((ids) => ids.has(first) && ids.has(second))) {
        throw new WorkflowError(`${label} 缺少机制 ${first} 与 ${second} 的组合规则，须明确裁决；规则不清时做 grilling`);
      }
    }
  }
  assertSimultaneousGroups(flow, mechanisms, rules, label);
}

/** V1 方案的机制、流程、状态转换和组合裁决形成一个可核对的覆盖闭环。 */
export function assertResolvedModuleRules(rules, entries, boundaryStates = new Set()) {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)
    || Object.keys(rules).some((key) => !['flows', 'combinations', 'openQuestions'].includes(key))
    || !Array.isArray(rules.flows) || !rules.flows.length || !Array.isArray(rules.combinations)) {
    throw new WorkflowError('V1 模块方案必须登记机制、状态、流程及组合规则');
  }
  if (rules.openQuestions !== undefined && readIds(rules.openQuestions, 'V1 未决规则').length) {
    throw new WorkflowError('V1 存在未决规则，须先完成 grilling 并更新模块方案', 'V1_GRILLING_REQUIRED');
  }
  for (const stateId of boundaryStates) {
    if (entries.has(`state:${stateId}`)) throw new WorkflowError(`V1 状态 ${stateId} 属于其他对象，只能作为流程边界引用`);
  }
  const transitions = readEntryRules(entries, boundaryStates);
  const combinations = readCombinations(rules.combinations, entries);
  const flowIds = new Set();
  const covered = new Set();
  const usedCombinations = new Set();
  for (const flow of rules.flows) {
    if (!hasText(flow?.id) || flowIds.has(flow.id)) throw new WorkflowError('V1 流程标识缺失或重复');
    flowIds.add(flow.id);
    const label = `V1 流程 ${flow.id}`;
    const flowEntries = new Set();
    for (const [kind, field] of Object.entries(flowFields)) {
      const minimum = ['function', 'state', 'step'].includes(kind) ? 1 : 0;
      for (const id of readIds(flow[field], `${label}.${field}`, { minimum, repeated: kind === 'step' })) {
        const key = `${kind}:${id}`;
        // 跨对象转换可引用版本规划中的边界，当前模块只制作用于本地状态的设计。
        if (kind === 'state' && !entries.has(key) && boundaryStates.has(id)) continue;
        if (!entries.has(key)) throw new WorkflowError(`${label} 引用了未登记的条目 ${key}`);
        flowEntries.add(key);
        covered.add(key);
      }
    }
    assertReachableStates(flow, transitions, label);
    assertFlowCombinations(flow, combinations, flowEntries, usedCombinations, label);
  }
  // 视觉要素可以是常驻或静态内容，不必为其编造交互流程。
  const unassigned = [...entries].filter(([key, entry]) => entry.kind !== 'element' && !covered.has(key)).map(([key]) => key);
  if (unassigned.length) throw new WorkflowError(`V1 流程遗漏方案条目：${unassigned.join('、')}`);
  const unusedRules = [...combinations.keys()].filter((id) => !usedCombinations.has(id));
  if (unusedRules.length) throw new WorkflowError(`V1 流程未登记组合规则：${unusedRules.join('、')}`);
}
