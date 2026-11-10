/** 覆盖多状态生产范围的冻结、批次依赖与当前版本整体验证。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { bindProductionScope, freezeProductionDependencies, assertProductionDependencies, validateProductionPackage, validateProductionScope } from '../../skills/app-workflow-control/scripts/runtime/production-scope.mjs';
import { validateProductionBatchEvidence } from '../../skills/app-workflow-control/scripts/runtime/production-coverage.mjs';
import { bindWorkSource } from '../../skills/app-workflow-control/scripts/runtime/work-source.mjs';
import { validateFinalIntegration, validateIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/final-integration.mjs';
import { initializeWork, inspectProductionDependencySource } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

/** 创建独占系统临时项目，只允许清理经过核对的测试目录。 */
function fixture(t, { app = false } = {}) {
  const root = realpathSync(tmpdir());
  const repo = mkdtempSync(join(root, 'production-scope-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), root);
    assert.ok(basename(actual).startsWith('production-scope-'));
    rmSync(actual, { recursive: true, force: true });
  });
  /** 写入合成文件并绑定真实摘要；所有用户确认和运行材料均为测试数据。 */
  function write(path, value) {
    const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const objectId = app ? 'home' : 'world';
  const stack = app ? 'expo' : 'cocos';
  const workItemType = app ? 'PAGE' : 'SCENE';
  const scope = {
    schemaVersion: '1.0', scopeId: 'scope-a', projectId: 'project-a', stack,
    objects: [{ objectId, workItemType, ...(app ? {} : { targetIds: ['entrance', 'battle'] }) }],
    ...(app ? {} : { regions: [{ regionId: 'area-a', objectId, description: '入口区域' }] }),
    states: [
      { stateId: 'ready', objectId, description: '准备', ...(app ? {} : { regionIds: ['area-a'] }) },
      { stateId: 'progress', objectId, description: '进行' },
      { stateId: 'failed', objectId, description: '失败' },
      { stateId: 'done', objectId, description: '完成' },
    ],
    steps: [
      { stepId: 'start', objectIds: [objectId], stateIds: ['ready', 'progress'], precondition: '准备完成', action: '开始', expectedResult: '进入进行状态', caseId: 'case-start' },
      { stepId: 'fail', objectIds: [objectId], stateIds: ['progress', 'failed'], precondition: '进行中', action: '触发失败', expectedResult: '进入失败状态', caseId: 'case-fail' },
      { stepId: 'retry', objectIds: [objectId], stateIds: ['failed', 'ready'], precondition: '失败', action: '重试', expectedResult: '回到准备状态', caseId: 'case-retry' },
      { stepId: 'finish', objectIds: [objectId], stateIds: ['progress', 'done'], precondition: '进行中', action: '完成', expectedResult: '进入完成状态', caseId: 'case-finish' },
    ],
    transitions: [
      { transitionId: 'begin', fromStateId: 'ready', toStateId: 'progress', trigger: '开始', expectedResult: '进行', caseId: 'case-start' },
      { transitionId: 'failure', fromStateId: 'progress', toStateId: 'failed', trigger: '失败', expectedResult: '失败', caseId: 'case-fail' },
      { transitionId: 'retry', fromStateId: 'failed', toStateId: 'ready', trigger: '重试', expectedResult: '准备', caseId: 'case-retry' },
      { transitionId: 'finish', fromStateId: 'progress', toStateId: 'done', trigger: '完成', expectedResult: '完成', caseId: 'case-finish' },
    ],
    paths: [{ pathId: 'retry-path', stepIds: ['start', 'fail', 'retry', 'start', 'finish'], caseId: 'case-retry-path' }],
    batches: [
      { batchId: 'first', objectIds: [objectId], stepIds: ['start'], transitionIds: ['begin'] },
      { batchId: 'second', objectIds: [objectId], stepIds: ['start', 'fail', 'retry', 'finish'], transitionIds: ['failure', 'retry', 'finish'], pathIds: ['retry-path'], dependsOn: ['first'] },
    ],
  };
  const ref = write('spec/scope.json', scope);
  const work = { schemaVersion: '1.0', projectId: scope.projectId, stack, workItemId: 'first-work', workItemType, globalState: 'IMPLEMENTING', productionBatchId: 'first', productionScopeRef: ref, evidenceRoot: 'evidence/first', implementationPackageRef: { path: 'packages/first.json' }, visual: { objectId, stage: 'V1' } };
  const pack = { productionScopeRef: ref, productionBatchId: 'first' };
  const output = write('evidence/first/run.log', '合成的真实文件输出');
  const caseA = { caseId: 'case-start', objectIds: [objectId], stepIds: ['start'], stateIds: ['ready', 'progress'], transitions: [{ transitionId: 'begin', fromStateId: 'ready', toStateId: 'progress' }], evidenceRef: output };
  const coverage = { schemaVersion: '1.0', scopeId: scope.scopeId, workItemId: work.workItemId, projectId: scope.projectId, stack, productionBatchId: work.productionBatchId, implementationPackageRef: work.implementationPackageRef.path, visualStage: 'V1', status: 'PASS', cases: [caseA] };
  const manifest = { items: [{ category: 'production-coverage', status: 'PASS', path: 'evidence/first/coverage.json' }, { category: 'tests', status: 'PASS', path: output.path }] };
  /** 保存当前合成批次覆盖记录。 */
  function saveCoverage() { write('evidence/first/coverage.json', coverage); }
  saveCoverage();
  return { repo, write, scope, ref, work, pack, manifest, coverage, saveCoverage, objectId, stack };
}

test('SCENE 与 App 页面可冻结总范围，首批只完成自己的步骤', (t) => {
  for (const app of [false, true]) {
    const f = fixture(t, { app });
    assert.equal(validateProductionScope(f.repo, f.work).batch.batchId, 'first');
    assert.doesNotThrow(() => validateProductionPackage(f.repo, f.work, f.pack));
    assert.doesNotThrow(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest));
    const second = { ...f.work, workItemId: 'second-work', productionBatchId: 'second', productionDependencies: [{ batchId: 'first', workItemRef: { path: 'first.json' } }] };
    const inspect = () => ({ status: 'PASS', blocking: [] });
    f.write('first.json', { ...f.work, globalState: 'IMPLEMENTING' });
    assert.throws(() => freezeProductionDependencies(f.repo, second, inspect), /已完成的前置批次/);
    f.write('first.json', { ...f.work, globalState: 'COMPLETE' });
    delete second.productionDependencies[0].workItemRef.sha256;
    freezeProductionDependencies(f.repo, second, inspect);
    assert.doesNotThrow(() => assertProductionDependencies(f.repo, second, inspect));
    assert.throws(() => assertProductionDependencies(f.repo, second, () => ({ status: 'BLOCKED' })), /历史完成材料未通过/);
    assert.throws(() => assertProductionDependencies(f.repo, second), /必须提供实际完成材料检查器/);
    f.write('first.json', { ...f.work, globalState: 'RETURN' });
    assert.throws(() => assertProductionDependencies(f.repo, second, inspect), /内容已变化/);
  }
});

test('跨页面前置批次不能由单个页面冒充，须使用完整功能汇总来源', (t) => {
  const f = fixture(t, { app: true });
  f.scope.objects.push({ objectId: 'detail', workItemType: 'PAGE' });
  f.scope.states.push({ stateId: 'detail-ready', objectId: 'detail', description: '详情就绪' });
  f.scope.steps.push({ stepId: 'open-detail', objectIds: [f.objectId, 'detail'], stateIds: ['progress', 'detail-ready'], precondition: '列表可用', action: '进入详情', expectedResult: '详情就绪', caseId: 'case-detail' });
  f.scope.batches[0].objectIds.push('detail'); f.scope.batches[0].stepIds.push('open-detail');
  const ref = f.write('spec/cross-scope.json', f.scope);
  const source = { ...f.work, globalState: 'COMPLETE', productionScopeRef: ref };
  f.write('first.json', source);
  const next = { ...f.work, workItemId: 'next', productionScopeRef: ref, productionBatchId: 'second', productionDependencies: [{ batchId: 'first', workItemRef: { path: 'first.json' } }] };
  const inspect = () => ({ status: 'PASS', blocking: [] });
  assert.throws(() => freezeProductionDependencies(f.repo, next, inspect), /单个视觉对象不能代表整个批次/);
  delete next.productionDependencies[0].workItemRef.sha256;
  delete source.visual; source.workItemType = 'MODULE';
  f.write('first.json', source);
  assert.doesNotThrow(() => freezeProductionDependencies(f.repo, next, inspect));
});

test('显示层批次必须绑定实际宿主及类型，场景目标不能越出总范围', (t) => {
  const f = fixture(t, { app: true });
  f.scope.objects.push({ objectId: 'dialog', workItemType: 'DISPLAY_LAYER', hostId: f.objectId, layerType: 'modal' });
  f.scope.states.push({ stateId: 'dialog-open', objectId: 'dialog', description: '弹窗打开' });
  f.scope.steps.push({ stepId: 'open-dialog', objectIds: [f.objectId, 'dialog'], stateIds: ['ready', 'dialog-open'], precondition: '首页就绪', action: '打开', expectedResult: '显示弹窗', caseId: 'case-dialog' });
  f.scope.batches[0].objectIds.push('dialog'); f.scope.batches[0].stepIds.push('open-dialog');
  const ref = f.write('spec/layer-scope.json', f.scope);
  const layer = { ...f.work, productionScopeRef: ref, workItemType: 'DISPLAY_LAYER', visual: { objectId: 'dialog', hostId: f.objectId, layerType: 'modal', stage: 'V1' } };
  assert.doesNotThrow(() => validateProductionScope(f.repo, layer));
  layer.visual.hostId = 'other';
  assert.throws(() => validateProductionScope(f.repo, layer), /显示层宿主或类型/);
  const scene = fixture(t);
  scene.work.visual.targets = [{ targetId: 'unknown' }];
  assert.throws(() => validateProductionScope(scene.repo, scene.work), /场景目标超出生产总范围/);
});

test('真实控制器拒绝仅声明 COMPLETE 而缺少执行材料的前置工作项', async (t) => {
  const f = fixture(t, { app: true });
  const initialized = await initializeWork({ repo: f.repo, args: { id: 'fake-source', type: 'MODULE', stack: f.stack, 'project-id': f.scope.projectId, objective: '模拟前置批次', 'production-scope': 'spec/scope.json', 'production-batch': 'first' } });
  const path = initialized.metadata.workItemPath;
  const source = JSON.parse(readFileSync(join(f.repo, path), 'utf8'));
  source.globalState = 'COMPLETE';
  for (const gate of ['F0', 'F1', 'F2', 'F3']) source.gateStatus[gate] = 'PASS';
  f.write(path, source);
  const next = { ...f.work, workItemId: 'second-work', productionBatchId: 'second', productionDependencies: [{ batchId: 'first', workItemRef: { path } }] };
  assert.throws(() => freezeProductionDependencies(f.repo, next, inspectProductionDependencySource), /历史完成材料未通过检查/);
});

test('业务范围拒绝未知状态、错误对象、遗漏状态与循环批次', (t) => {
  const f = fixture(t);
  assert.throws(() => validateProductionScope(f.repo, { ...f.work, productionDependencies: null }), /生产批次依赖/);
  const cases = [
    [(scope) => { scope.transitions[0].toStateId = 'missing'; }, /未知状态/],
    [(scope) => { scope.steps[0].objectIds = ['other']; }, /未知对象/],
    [(scope) => { scope.states.push({ stateId: 'orphan', objectId: f.objectId, description: '未覆盖' }); }, /未被任何步骤或转移覆盖/],
    [(scope) => { scope.batches[0].dependsOn = ['second']; }, /依赖存在循环/],
    [(scope) => { scope.batches[1].stepIds = ['missing']; }, /步骤 missing/],
    [(scope) => { scope.regions = [{ regionId: 'north', objectId: f.objectId, description: '北' }, { regionId: 'south', objectId: f.objectId, description: '南' }]; scope.states[0].regionIds = ['north']; }, /生产区域 south 未被任何业务状态覆盖/],
  ];
  for (const [change, expected] of cases) {
    const scope = structuredClone(f.scope); change(scope);
    const work = { ...f.work, productionScopeRef: f.write('spec/changed.json', scope) };
    assert.throws(() => validateProductionScope(f.repo, work), expected);
  }
});

test('证据目录内的自定义工作项及其硬链接不能冒充运行输出', (t) => {
  const f = fixture(t);
  const source = f.write('evidence/first/custom-work.json', f.work);
  bindWorkSource(f.work, source.path);
  f.coverage.cases[0].evidenceRef = source; f.saveCoverage();
  f.manifest.items.push({ category: 'tests', status: 'PASS', path: source.path });
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /独立于控制记录/);
  linkSync(join(f.repo, source.path), join(f.repo, 'evidence/first/custom-alias.log'));
  f.coverage.cases[0].evidenceRef = { path: 'evidence/first/custom-alias.log', sha256: source.sha256 }; f.saveCoverage();
  f.manifest.items.push({ category: 'tests', status: 'PASS', path: 'evidence/first/custom-alias.log' });
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /独立于控制记录/);
});

test('强结构控制 JSON 不能冒充输出，普通应用 JSON 仍可用', (t) => {
  const f = fixture(t);
  const records = [
    { schemaVersion: '1.0', workItemId: 'x', globalState: 'COMPLETE', workItemType: 'PAGE', projectId: 'p' },
    { schemaVersion: '1.0', workItemId: 'x', stack: 'expo', implementationPackageRef: 'pack', items: [] },
    { schemaVersion: '1.0', workItemId: 'x', implementationPackageRef: 'pack', executionPlan: {}, units: [] },
    { schemaVersion: '1.0', workItemId: 'x', implementationPackageRef: 'pack', unitId: 'u', sequence: 1, files: [], commandOutputs: [] },
  ];
  for (const value of records) {
    const ref = f.write('evidence/first/other.log', value);
    f.coverage.cases[0].evidenceRef = ref; f.saveCoverage();
    f.manifest.items.push({ category: 'tests', status: 'PASS', path: ref.path });
    assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /独立于控制记录/);
  }
  const ref = f.write('evidence/first/app.json', { schemaVersion: '1.0', workItemId: 'x', status: 'PASS', message: '正常应用输出' });
  f.coverage.cases[0].evidenceRef = ref; f.saveCoverage();
  f.manifest.items.push({ category: 'tests', status: 'PASS', path: ref.path });
  assert.doesNotThrow(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest));
});

test('批次证据拒绝漏步骤、错状态转移、冒用旧实施包或缺失原始输出', (t) => {
  const f = fixture(t);
  f.coverage.cases[0].stepIds = []; f.saveCoverage();
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /步骤或状态覆盖/);
  f.coverage.cases[0].stepIds = ['start']; f.coverage.cases[0].transitions[0].toStateId = 'failed'; f.saveCoverage();
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /状态转移身份/);
  f.coverage.cases[0].transitions[0].toStateId = 'progress'; f.coverage.implementationPackageRef = 'packages/old.json'; f.saveCoverage();
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /当前实施包/);
  f.coverage.implementationPackageRef = f.work.implementationPackageRef.path; f.saveCoverage();
  f.write('evidence/first/run.log', '已替换');
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /内容已变化/);
});

test('批次不能以清单、计划或总范围等控制文件冒充运行原始输出', (t) => {
  const f = fixture(t);
  const fake = f.write('evidence/first/manifest.json', { status: 'PASS' });
  f.coverage.cases[0].evidenceRef = fake; f.saveCoverage();
  f.manifest.items.push({ category: 'tests', status: 'PASS', path: fake.path });
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /独立于控制记录/);
});

test('生产证据不能通过硬链接别名冒充独立运行输出', (t) => {
  const f = fixture(t);
  const control = f.write('evidence/first/manifest.json', { status: 'PASS' });
  const alias = 'evidence/first/alias.log';
  linkSync(join(f.repo, control.path), join(f.repo, alias));
  f.coverage.cases[0].evidenceRef = { path: alias, sha256: control.sha256 }; f.saveCoverage();
  f.manifest.items.push({ category: 'tests', status: 'PASS', path: alias });
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /独立于控制记录/);
});

test('V2–V4 不要求未来运行记录，V5 不能冒用 V1 的覆盖', (t) => {
  const f = fixture(t);
  for (const stage of ['V2', 'V3', 'V4']) {
    f.work.visual.stage = stage;
    assert.doesNotThrow(() => validateProductionBatchEvidence(f.repo, f.work, { items: [] }));
  }
  f.work.visual.stage = 'V5';
  assert.throws(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest), /视觉阶段不匹配/);
  f.coverage.visualStage = 'V5'; f.saveCoverage();
  assert.doesNotThrow(() => validateProductionBatchEvidence(f.repo, f.work, f.manifest));
});

test('范围与批次冻结后不得改写，普通工作项不引入生产范围', (t) => {
  const f = fixture(t);
  assert.equal(validateProductionScope(f.repo, { stack: 'nodejs' }), null);
  assert.doesNotThrow(() => validateProductionPackage(f.repo, {}, {}));
  assert.throws(() => validateProductionPackage(f.repo, f.work, { ...f.pack, productionBatchId: 'second' }), /范围或批次/);
  f.scope.scopeId = 'changed'; f.write('spec/scope.json', f.scope);
  assert.throws(() => validateProductionScope(f.repo, f.work), /内容已变化/);
  const newWork = { projectId: f.scope.projectId, stack: f.scope.stack, workItemType: f.work.workItemType, visual: f.work.visual };
  bindProductionScope(f.repo, newWork, { scopePath: 'spec/scope.json', batchId: 'first' });
  assert.equal(newWork.productionScopeRef.sha256, createHash('sha256').update(readFileSync(join(f.repo, 'spec/scope.json'))).digest('hex'));
});

/** 构造绑定总范围及当前累计对象的合成最终集成，原始输出不冒充实际运行。 */
function finalFixture(t, options) {
  const f = fixture(t, options);
  if (options?.cross) {
    f.scope.objects.push({ objectId: 'detail', workItemType: 'PAGE' });
    f.scope.states.push({ stateId: 'detail-ready', objectId: 'detail', description: '详情就绪' });
    f.scope.steps.push({ stepId: 'open-detail', objectIds: [f.objectId, 'detail'], stateIds: ['progress', 'detail-ready'], precondition: '列表可用', action: '进入详情', expectedResult: '详情就绪', caseId: 'case-detail' });
    f.scope.paths.push({ pathId: 'cross-page', stepIds: ['start', 'open-detail'], caseId: 'case-cross-page' });
    f.scope.batches[0].objectIds.push('detail');
    f.scope.batches[0].stepIds.push('open-detail');
    f.scope.batches[0].pathIds = ['cross-page'];
    f.ref = f.write('spec/scope.json', f.scope);
    f.work.productionScopeRef = f.ref;
  }
  const baseline = f.write('final/baseline.json', { objectId: f.objectId });
  const source = { ...f.work, workItemId: 'current-work', globalState: 'COMPLETE', visual: { objectId: f.objectId, stage: 'V5', functionBaselineRef: baseline, ...(options?.app ? {} : { targets: [{ targetId: 'entrance' }, { targetId: 'battle' }] }) } };
  const sourceRef = f.write('final/source.json', source);
  const entry = { objectId: f.objectId, workItemRef: sourceRef, functionBaselineRef: baseline };
  const objects = [entry];
  if (options?.cross) {
    const detailBaseline = f.write('final/detail-baseline.json', { objectId: 'detail' });
    const detailSource = { ...source, workItemId: 'detail-work', visual: { objectId: 'detail', stage: 'V5', functionBaselineRef: detailBaseline } };
    objects.push({ objectId: 'detail', workItemRef: f.write('final/detail-source.json', detailSource), functionBaselineRef: detailBaseline });
  }
  const work = { schemaVersion: '1.0', workItemId: 'final', projectId: f.scope.projectId, stack: f.stack, workItemType: 'INTEGRATION', integrationPurpose: 'final', productionScopeRef: f.ref, evidenceRoot: 'evidence/final', evidenceRef: { path: 'evidence/final/manifest.json' } };
  const cases = [
    { caseId: 'case-start', objectIds: [f.objectId], stepIds: ['start'], stateIds: ['ready', 'progress'], transitions: [{ transitionId: 'begin', fromStateId: 'ready', toStateId: 'progress' }] },
    { caseId: 'case-fail', objectIds: [f.objectId], stepIds: ['fail'], stateIds: ['progress', 'failed'], transitions: [{ transitionId: 'failure', fromStateId: 'progress', toStateId: 'failed' }] },
    { caseId: 'case-retry', objectIds: [f.objectId], stepIds: ['retry'], stateIds: ['failed', 'ready'], transitions: [{ transitionId: 'retry', fromStateId: 'failed', toStateId: 'ready' }] },
    { caseId: 'case-finish', objectIds: [f.objectId], stepIds: ['finish'], stateIds: ['progress', 'done'], transitions: [{ transitionId: 'finish', fromStateId: 'progress', toStateId: 'done' }] },
    { caseId: 'case-retry-path', objectIds: [f.objectId], stepIds: ['start', 'fail', 'retry', 'finish'], stateIds: ['ready', 'progress', 'failed', 'done'], transitions: [], paths: [{ pathId: 'retry-path', stepIds: ['start', 'fail', 'retry', 'start', 'finish'] }] },
  ];
  if (options?.cross) {
    cases.push({ caseId: 'case-detail', objectIds: [f.objectId, 'detail'], stepIds: ['open-detail'], stateIds: ['progress', 'detail-ready'], transitions: [] });
    cases.push({ caseId: 'case-cross-page', objectIds: [f.objectId, 'detail'], stepIds: ['start', 'open-detail'], stateIds: ['ready', 'progress', 'detail-ready'], transitions: [], paths: [{ pathId: 'cross-page', stepIds: ['start', 'open-detail'] }] });
  }
  const integrationScope = { schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, workItemId: work.workItemId, productionScopeRef: f.ref, objects, cases: cases.map(({ caseId, objectIds }) => ({ caseId, objectIds })) };
  work.integrationScopeRef = f.write('final/scope.json', integrationScope);
  const manifest = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, items: [{ status: 'PASS', path: 'evidence/final/result.json' }] };
  const evidence = { schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, workItemId: work.workItemId, status: 'PASS', objects, cases: [] };
  for (const item of cases) {
    const log = f.write(`evidence/final/${item.caseId}.log`, '合成运行轨迹');
    const actual = { schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, workItemId: work.workItemId, status: 'PASS', caseId: item.caseId, objectIds: item.objectIds, production: { stepIds: item.stepIds, stateIds: item.stateIds, transitions: item.transitions, ...(item.paths ? { paths: item.paths } : {}), evidenceRef: log } };
    const caseRef = f.write(`evidence/final/${item.caseId}.json`, actual);
    evidence.cases.push({ caseId: item.caseId, objectIds: item.objectIds, evidenceRef: caseRef });
    manifest.items.push({ status: 'PASS', path: caseRef.path }, { status: 'PASS', path: log.path });
  }
  work.integrationEvidenceRef = f.write('evidence/final/result.json', evidence);
  f.write(work.evidenceRef.path, manifest);
  return { ...f, work, source, sourceRef, integrationScope, evidence, manifest, cases, inspect: () => ({ status: 'PASS', blocking: [] }) };
}

test('最终游戏场景与 App 页面必须覆盖完整总范围及当前版本用例', (t) => {
  for (const app of [false, true]) {
    const f = finalFixture(t, { app });
    assert.doesNotThrow(() => validateIntegrationScope(f.repo, f.work));
    assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
    const changed = structuredClone(f.integrationScope); changed.cases = changed.cases.filter((item) => item.caseId !== 'case-fail');
    f.work.integrationScopeRef = f.write('final/short-scope.json', changed);
    assert.throws(() => validateIntegrationScope(f.repo, f.work), /缺少生产行为 case-fail/);
  }
});

test('最终场景不能缺少累计目标、篡改状态转移或引用不在清单的输出', (t) => {
  const missingTarget = finalFixture(t, { app: false });
  missingTarget.source.visual.targets.pop();
  missingTarget.integrationScope.objects[0].workItemRef = missingTarget.write('final/short-source.json', missingTarget.source);
  missingTarget.work.integrationScopeRef = missingTarget.write('final/short-scope.json', missingTarget.integrationScope);
  assert.throws(() => validateIntegrationScope(missingTarget.repo, missingTarget.work), /累计目标未覆盖/);

  const changed = finalFixture(t, { app: false });
  const actualPath = 'evidence/final/case-fail.json';
  const actual = JSON.parse(readFileSync(join(changed.repo, actualPath), 'utf8'));
  actual.production.transitions[0].toStateId = 'done';
  changed.evidence.cases.find((item) => item.caseId === 'case-fail').evidenceRef = changed.write(actualPath, actual);
  changed.work.integrationEvidenceRef = changed.write('evidence/final/result.json', changed.evidence);
  assert.throws(() => validateFinalIntegration(changed.repo, changed.work, changed.inspect), /状态转移身份/);

  const noLog = finalFixture(t, { app: true });
  noLog.manifest.items = noLog.manifest.items.filter((item) => item.path !== 'evidence/final/case-fail.log');
  noLog.write(noLog.work.evidenceRef.path, noLog.manifest);
  assert.throws(() => validateFinalIntegration(noLog.repo, noLog.work, noLog.inspect), /原始输出必须列入/);
});

test('最终集成不能省略其范围或参与对象绑定的生产总范围', (t) => {
  const f = finalFixture(t, { app: true });
  const bypass = { ...f.work }; delete bypass.productionScopeRef;
  assert.throws(() => validateIntegrationScope(f.repo, bypass), /遗漏了已声明的生产总范围/);
  delete f.integrationScope.productionScopeRef;
  bypass.integrationScopeRef = f.write('final/unscoped.json', f.integrationScope);
  assert.throws(() => validateIntegrationScope(f.repo, bypass), /已绑定生产总范围/);
});

test('最终组合不能换绑已冻结的显示层宿主', (t) => {
  const f = finalFixture(t, { app: true });
  f.scope.objects.push({ objectId: 'dialog', workItemType: 'DISPLAY_LAYER', hostId: f.objectId, layerType: 'modal' });
  f.scope.states.push({ stateId: 'dialog-open', objectId: 'dialog', description: '弹窗打开' });
  f.scope.steps.push({ stepId: 'show-dialog', objectIds: ['dialog'], stateIds: ['dialog-open'], precondition: '入口可用', action: '打开', expectedResult: '弹窗可见', caseId: 'case-dialog' });
  f.scope.batches[0].objectIds.push('dialog'); f.scope.batches[0].stepIds.push('show-dialog');
  const ref = f.write('spec/final-layer-scope.json', f.scope);
  f.work.productionScopeRef = ref; f.integrationScope.productionScopeRef = ref;
  f.source.productionScopeRef = ref;
  f.integrationScope.objects[0].workItemRef = f.write('final/current-source.json', f.source);
  const baseline = f.write('final/dialog-baseline.json', { objectId: 'dialog' });
  const layer = { ...f.source, workItemId: 'dialog-work', workItemType: 'DISPLAY_LAYER', visual: { objectId: 'dialog', hostId: 'other', layerType: 'modal', stage: 'V5', functionBaselineRef: baseline } };
  f.integrationScope.objects.push({ objectId: 'dialog', workItemRef: f.write('final/dialog-source.json', layer), functionBaselineRef: baseline });
  f.integrationScope.cases.push({ caseId: 'case-dialog', objectIds: ['dialog'] });
  f.work.integrationScopeRef = f.write('final/layer-scope.json', f.integrationScope);
  assert.throws(() => validateIntegrationScope(f.repo, f.work), /宿主或类型与总范围不一致/);
});

test('完整路径必须按冻结顺序执行，不能漏步、倒序或改变重试次数', (t) => {
  for (const steps of [
    ['start', 'retry', 'fail', 'start', 'finish'],
    ['start', 'fail', 'retry', 'finish'],
    ['start', 'fail', 'retry', 'start', 'start', 'finish'],
  ]) {
    const f = finalFixture(t, { app: false });
    const path = 'evidence/final/case-retry-path.json';
    const actual = JSON.parse(readFileSync(join(f.repo, path), 'utf8'));
    actual.production.paths[0].stepIds = steps;
    f.evidence.cases.find((item) => item.caseId === 'case-retry-path').evidenceRef = f.write(path, actual);
    f.work.integrationEvidenceRef = f.write('evidence/final/result.json', f.evidence);
    assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /路径步骤顺序或重复次数/);
  }
});

test('跨页面顺序路径由当前组合的完整证据验证', (t) => {
  const f = finalFixture(t, { app: true, cross: true });
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
  const path = 'evidence/final/case-cross-page.json';
  const actual = JSON.parse(readFileSync(join(f.repo, path), 'utf8'));
  actual.production.paths[0].stepIds.reverse();
  f.evidence.cases.find((item) => item.caseId === 'case-cross-page').evidenceRef = f.write(path, actual);
  f.work.integrationEvidenceRef = f.write('evidence/final/result.json', f.evidence);
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /路径步骤顺序或重复次数/);
});

test('公开 schema 认可实际范围与批次覆盖，拒绝未知字段', (t) => {
  const f = fixture(t, { app: true });
  const root = '../../skills/app-workflow-control/schemas/';
  const ajv = new Ajv2020({ strict: false });
  const scope = ajv.compile(JSON.parse(readFileSync(new URL(`${root}production-scope.schema.json`, import.meta.url), 'utf8')));
  const coverage = ajv.compile(JSON.parse(readFileSync(new URL(`${root}production-coverage.schema.json`, import.meta.url), 'utf8')));
  assert.equal(scope(f.scope), true, JSON.stringify(scope.errors));
  assert.equal(coverage(f.coverage), true, JSON.stringify(coverage.errors));
  assert.equal(scope({ ...f.scope, misspelled: true }), false);
});
