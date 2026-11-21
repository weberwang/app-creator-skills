import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readModulePlan } from '../../skills/app-workflow-control/scripts/runtime/module-plan.mjs';

/** 创建具备机制裁决、可达状态和循环步骤的方案，直接使用与 V1 推进相同的校验。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'module-plan-rules-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'module', projectId: 'project', stack: 'flutter', workItemType: 'PAGE', visual: { objectId: 'module', stage: 'V1' } };
  /** 为不同类型的条目生成已约定的验收依据。 */
  const entry = (kind, id, rule = {}) => ({
    kind, id, description: `规划 ${id}`, acceptance: `按约定观察 ${id}`,
    requirementId: 'active', command: 'node --test', ...rule,
  });
  const plan = {
    schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, dependencies: [],
    entries: [
      entry('function', 'action', { trigger: '收到有效输入', resolution: '更新局部状态' }),
      entry('function', 'recovery', { trigger: '进入可恢复状态后请求重新开始', resolution: '恢复初始状态' }),
      entry('state', 'ready'), entry('state', 'active'),
      entry('step', 'open'), entry('step', 'play'),
      entry('transition', 'start', { fromStateId: 'ready', toStateId: 'active', trigger: '执行有效操作' }),
      entry('progress', 'current'),
    ],
    rules: {
      flows: [{
        id: 'play', functionIds: ['action', 'recovery'], stateIds: ['ready', 'active'], initialStateIds: ['ready'],
        stepIds: ['open', 'play', 'open'], transitionIds: ['start'], progressIds: ['current'], combinationIds: ['interrupt'],
      }],
      combinations: [{
        id: 'interrupt', functionIds: ['action', 'recovery'], trigger: '动作期间收到恢复请求',
        resolution: '当前动作结束后再恢复，动作只结算一次', verification: { kind: 'step', id: 'play' },
      }],
    },
  };
  /** 把测试变化作为真实摘要引用写入临时项目。 */
  function freeze(path, data) {
    const bytes = JSON.stringify(data);
    writeFileSync(join(repo, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  /** 通过公开读取入口触发与 V1 冻结一致的校验。 */
  function read() {
    work.visual.modulePlanRef = freeze('plan.json', plan);
    return readModulePlan(repo, work);
  }
  return { work, plan, entry, freeze, read };
}

test('可执行的机制、状态、流程和组合规则使用同一合同，单机制无需组合', (t) => {
  const f = fixture(t);
  for (const stack of ['flutter', 'unity', 'phaser']) {
    f.work.stack = stack;
    assert.deepEqual(f.read(), f.plan);
  }
  f.plan.entries = f.plan.entries.filter((entry) => entry.id !== 'recovery');
  f.plan.rules.flows[0].functionIds = ['action'];
  f.plan.rules.flows[0].combinationIds = [];
  f.plan.rules.combinations = [];
  assert.deepEqual(f.read(), f.plan);
});

test('没有进度指标的多步骤玩法及各自独立的初始模式可以推进', (t) => {
  const f = fixture(t);
  f.plan.entries = f.plan.entries.filter((entry) => !['transition', 'progress'].includes(entry.kind));
  const first = f.plan.rules.flows[0];
  Object.assign(first, { stateIds: ['ready'], transitionIds: [], progressIds: [] });
  f.plan.rules.flows.push({ ...first, id: 'practice', stateIds: ['active'], initialStateIds: ['active'] });
  assert.deepEqual(f.read(), f.plan);
});

test('遗漏组合裁决、遗漏方案条目和无归属的组合用例均被拒绝', (t) => {
  const f = fixture(t);
  const flow = f.plan.rules.flows[0];
  f.plan.entries.push(f.entry('function', 'save', { trigger: '完成操作', resolution: '更新存档' }));
  assert.throws(f.read, /流程遗漏方案条目.*save/);
  flow.functionIds.push('save');
  assert.throws(f.read, /缺少机制 action 与 save 的组合规则/);
  f.plan.rules.combinations[0].functionIds.push('save');
  f.plan.rules.combinations[0].verification.id = 'missing';
  assert.throws(f.read, /缺少已登记的验收条目/);
  f.plan.rules.combinations[0].verification.id = 'play';
  flow.simultaneousGroups = [['action', 'recovery', 'save']];
  assert.deepEqual(f.read(), f.plan);
});

test('两两裁决不能覆盖实际会共同触发的三项机制', (t) => {
  const f = fixture(t);
  const flow = f.plan.rules.flows[0];
  f.plan.entries.push(f.entry('function', 'save', { trigger: '完成操作', resolution: '更新存档' }));
  flow.functionIds.push('save');
  const first = f.plan.rules.combinations[0];
  f.plan.rules.combinations.push(
    { ...first, id: 'action-save', functionIds: ['action', 'save'] },
    { ...first, id: 'recovery-save', functionIds: ['recovery', 'save'] },
  );
  flow.combinationIds.push('action-save', 'recovery-save');
  assert.throws(f.read, /尚未明确三个及以上机制/);
  flow.simultaneousGroups = [['action', 'recovery', 'save']];
  assert.throws(f.read, /共同触发的整体裁决/);
  f.plan.rules.combinations.push({
    ...first, id: 'all', functionIds: [...flow.functionIds],
    trigger: '结算期间同时收到恢复和保存请求', resolution: '结算完成后先恢复，再写入恢复后的状态',
  });
  flow.combinationIds.push('all');
  assert.deepEqual(f.read(), f.plan);
});

test('无法到达的状态、未登记的端点及遗漏进度会阻断 V1', (t) => {
  const f = fixture(t);
  const flow = f.plan.rules.flows[0];
  const transition = f.plan.entries.find((entry) => entry.kind === 'transition');
  transition.toStateId = 'missing';
  assert.throws(f.read, /起止状态未登记/);
  transition.toStateId = 'ready';
  assert.throws(f.read, /无法从初始状态到达.*active/);
  transition.toStateId = 'active';
  flow.progressIds = [];
  assert.throws(f.read, /流程遗漏方案条目.*progress:current/);
});

test('未决事项和待定裁决明确提示 V1 grilling', (t) => {
  const f = fixture(t);
  assert.throws(() => {
    f.plan.rules.openQuestions = ['恢复和结算同时触发时谁先执行'];
    f.read();
  }, { code: 'V1_GRILLING_REQUIRED' });
  f.plan.rules.openQuestions = [];
  f.plan.rules.combinations[0].resolution = '待确认：恢复优先级';
  assert.throws(f.read, { code: 'V1_GRILLING_REQUIRED' });
  f.plan.rules.combinations[0].resolution = '动作结算后恢复';
  f.plan.entries.find((entry) => entry.kind === 'state').acceptance = '待补充';
  assert.throws(f.read, { code: 'V1_GRILLING_REQUIRED' });
  f.plan.entries.find((entry) => entry.kind === 'state').acceptance = '进入初始状态后输入可用';
  f.plan.entries[0].trigger = 'TBD';
  assert.throws(f.read, { code: 'V1_GRILLING_REQUIRED' });
});

test('版本生产范围核对跨对象状态端点，并保留业务路径的步骤顺序及回环', (t) => {
  const f = fixture(t);
  const flow = f.plan.rules.flows[0];
  f.work.productionBatchId = 'release';
  f.plan.entries.push(f.entry('transition', 'next', { fromStateId: 'active', toStateId: 'peer-ready', trigger: '完成当前模块' }));
  flow.transitionIds.push('next');
  flow.stateIds.push('peer-ready');
  const scope = {
    schemaVersion: '1.0', scopeId: 'release', projectId: f.work.projectId, stack: f.work.stack,
    objects: [
      { objectId: 'module', workItemType: 'PAGE' }, { objectId: 'peer', workItemType: 'PAGE' },
    ],
    states: [
      { stateId: 'ready', objectId: 'module', description: '初始' },
      { stateId: 'active', objectId: 'module', description: '进行中' },
      { stateId: 'peer-ready', objectId: 'peer', description: '接到前序状态' },
    ],
    steps: [
      { stepId: 'open', objectIds: ['module'], stateIds: ['ready'], precondition: '可进入', action: '打开', expectedResult: '进入', caseId: 'open' },
      { stepId: 'play', objectIds: ['module'], stateIds: ['active'], precondition: '已进入', action: '操作', expectedResult: '继续', caseId: 'play' },
      { stepId: 'receive', objectIds: ['peer'], stateIds: ['peer-ready'], precondition: '前序完成', action: '接收', expectedResult: '准备', caseId: 'receive' },
    ],
    transitions: [
      { transitionId: 'start', fromStateId: 'ready', toStateId: 'active', trigger: '执行有效操作', expectedResult: '继续', caseId: 'play' },
      { transitionId: 'next', fromStateId: 'active', toStateId: 'peer-ready', trigger: '完成当前模块', expectedResult: '交给下一对象', caseId: 'receive' },
    ],
    paths: [{ pathId: 'replay', stepIds: ['open', 'play', 'open', 'receive'], caseId: 'loop' }],
    batches: [{ batchId: 'release', objectIds: ['module', 'peer'], stepIds: ['open', 'play', 'receive'],
      transitionIds: ['start', 'next'], pathIds: ['replay'] }],
  };
  f.work.productionScopeRef = f.freeze('scope.json', scope);
  assert.deepEqual(f.read(), f.plan);
  flow.stepIds = ['open', 'open', 'play'];
  assert.throws(f.read, /生产路径 replay.*步骤顺序/);
  flow.stepIds = ['open', 'play', 'open'];
  f.plan.entries.at(-1).fromStateId = 'ready';
  assert.throws(f.read, /起止状态与生产范围不一致/);
  f.plan.entries.at(-1).fromStateId = 'active';
  f.plan.entries.push(f.entry('state', 'peer-ready'));
  assert.throws(f.read, /peer-ready 属于其他对象.*流程边界/);
  f.plan.entries.pop();

  scope.states.push({ stateId: 'paused', objectId: 'module', description: '暂停' });
  scope.steps.find((step) => step.stepId === 'play').stateIds.push('paused');
  f.work.productionScopeRef = f.freeze('scope.json', scope);
  f.plan.entries.push(f.entry('state', 'paused'), f.entry('step', 'resume'));
  f.plan.rules.flows.push({
    id: 'pause', functionIds: ['recovery'], stateIds: ['paused'], initialStateIds: ['paused'],
    stepIds: ['resume'], transitionIds: [], progressIds: [], combinationIds: [],
  });
  assert.throws(f.read, /生产步骤 play 的适用状态/);
});
