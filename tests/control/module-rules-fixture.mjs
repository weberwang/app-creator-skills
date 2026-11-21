/** 为测试方案补齐覆盖所有条目的流程和明确的组合规则。 */
export function withModuleRules(plan) {
  const entries = plan.entries.map((entry) => ({ ...entry }));
  const ids = (kind) => entries.filter((entry) => entry.kind === kind).map((entry) => entry.id);
  const stateIds = ids('state');
  const functionIds = ids('function');
  let transitionIndex = 0;
  for (const entry of entries) {
    if (entry.kind === 'function') {
      entry.trigger = '用户触发该机制';
      entry.resolution = '按方案产生可验证结果';
    }
    if (entry.kind === 'transition') {
      entry.fromStateId = stateIds[Math.min(transitionIndex, stateIds.length - 1)];
      entry.toStateId = stateIds[Math.min(transitionIndex + 1, stateIds.length - 1)];
      entry.trigger = '触发状态转换';
      transitionIndex += 1;
    }
  }
  // 仅有未被转换覆盖的状态作为额外入口，防止测试夹具制造不可达状态。
  const targets = new Set(entries.filter((entry) => entry.kind === 'transition').map((entry) => entry.toStateId));
  const initialStateIds = stateIds.filter((id, index) => index === 0 || !targets.has(id));
  const combinations = functionIds.length > 1 ? [{
    id: 'combined-functions', functionIds,
    trigger: '机制同时适用',
    resolution: '各机制按约定独立结算',
    verification: { kind: 'function', id: functionIds[0] },
  }] : [];
  return {
    ...plan, entries,
    rules: {
      flows: [{
        id: 'fixture-flow', functionIds, stateIds, initialStateIds, stepIds: ids('step'),
        transitionIds: ids('transition'), progressIds: ids('progress'),
        combinationIds: combinations.map((item) => item.id),
        simultaneousGroups: functionIds.length > 2 ? [functionIds] : [],
      }],
      combinations,
      openQuestions: [],
    },
  };
}

/** 将模块方案条目与实际流程统一转换为设计清单的覆盖标识。 */
export function moduleDesignItems(plan) {
  return [
    ...plan.entries.map(({ kind, id }) => ({ kind, id })),
    ...plan.rules.flows.map(({ id }) => ({ kind: 'flow', id })),
  ];
}
