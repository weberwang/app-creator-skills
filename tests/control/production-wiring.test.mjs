/** 验证真实控制器的生产范围、计划冻结和跨批次依赖接线。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { completeUnit, initializeWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { createExecutionPlanSnapshot } from '../../skills/app-workflow-control/scripts/runtime/execution-batches.mjs';

/** 创建独占项目，递归清理前核对其真实路径和前缀。 */
function project(t) {
  const root = realpathSync(tmpdir());
  const repo = mkdtempSync(join(root, 'production-wiring-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), root);
    assert.ok(basename(actual).startsWith('production-wiring-'));
    rmSync(actual, { recursive: true, force: true });
  });
  return repo;
}

/** 保存合成合同材料并返回真实字节身份，不能作为应用验收证据。 */
function put(repo, path, content) {
  const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 定义同一 App 页面中先编辑、后保存的两批实际业务范围。 */
function definition() {
  return {
    schemaVersion: '1.0', scopeId: 'edit-flow', projectId: 'fixture', stack: 'expo',
    objects: [{ objectId: 'form', workItemType: 'PAGE' }],
    states: [{ stateId: 'editing', objectId: 'form', description: '正在编辑' }, { stateId: 'saved', objectId: 'form', description: '保存完成' }],
    steps: [
      { stepId: 'edit', objectIds: ['form'], stateIds: ['editing'], precondition: '页面打开', action: '填写内容', expectedResult: '内容可见', caseId: 'edit' },
      { stepId: 'save', objectIds: ['form'], stateIds: ['editing', 'saved'], precondition: '内容有效', action: '提交', expectedResult: '只保存一次', caseId: 'save' },
    ],
    transitions: [{ transitionId: 'submit', fromStateId: 'editing', toStateId: 'saved', trigger: '提交成功', expectedResult: '进入保存完成状态', caseId: 'save' }],
    batches: [
      { batchId: 'edit', objectIds: ['form'], stepIds: ['edit'], transitionIds: [] },
      { batchId: 'save', objectIds: ['form'], stepIds: ['save'], transitionIds: ['submit'], dependsOn: ['edit'] },
    ],
  };
}

/** 通过真实初始化与 plan 入口建立有界功能实施，不自动设置工程通过。 */
async function prepare(repo, id, batchId, dependenciesPath) {
  const initialized = await initializeWork({ repo, args: {
    id, stack: 'expo', type: 'MODULE', objective: '验证生产接线', 'project-id': 'fixture',
    'production-scope': 'docs/flow.json', 'production-batch': batchId,
    ...(dependenciesPath ? { 'production-dependencies': dependenciesPath } : {}),
  } });
  const workPath = initialized.metadata.workItemPath;
  const work = loadWork(repo, workPath);
  work.globalState = 'PROPOSAL';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  put(repo, workPath, work);
  const planPath = `docs/plan-${id}.json`;
  put(repo, planPath, { executionUnits: [{ unitId: id, owner: 'fixture', paths: ['src/flow.ts'], acceptanceCommands: ['node --version'] }] });
  await prepareWorkRecords({ repo, workItem: workPath, planPath });
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
  return { repo, workPath, work: loadWork(repo, workPath) };
}

/** 用显式合成材料完成首批功能闭环，供后批核验历史完成记录。 */
async function completeFirst(context) {
  const { repo, workPath } = context;
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  let work = loadWork(repo, workPath);
  const root = work.evidenceRoot;
  put(repo, 'src/flow.ts', '// 合同测试的合成代码\n');
  const raw = put(repo, `${root}/raw.txt`, '合同测试合成输出，不代表真实 App 已运行\n');
  const coverage = {
    schemaVersion: '1.0', scopeId: 'edit-flow', workItemId: work.workItemId, projectId: 'fixture', stack: 'expo',
    productionBatchId: 'edit', implementationPackageRef: work.implementationPackageRef.path, status: 'PASS',
    cases: [{ caseId: 'edit', objectIds: ['form'], stepIds: ['edit'], stateIds: ['editing'], transitions: [], evidenceRef: raw }],
  };
  put(repo, `${root}/coverage.json`, coverage);
  const reportPath = `${root}/report.json`;
  put(repo, reportPath, {
    files: ['src/flow.ts'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: raw.path }],
    evidence: [
      { category: 'typecheck', path: raw.path }, { category: 'tests', path: raw.path },
      { category: 'production-coverage', path: `${root}/coverage.json` }, { category: 'production-output', path: raw.path },
    ],
  });
  await recordWorkResult({ repo, workItem: workPath, unitId: work.workItemId, reportPath });
  await completeUnit({ repo, workItem: workPath, resultPath: `${root}/unit-${work.workItemId}.json` });
  work = loadWork(repo, workPath);
  work.gateStatus.F3 = 'PASS';
  put(repo, workPath, work);
  for (const to of ['VALIDATING', 'PASSED', 'COMPLETE']) await transitionWork({ repo, workItem: workPath, to, args: {} });
  return loadWork(repo, workPath);
}

test('CLI 区分本批与最终范围，缺少明确参数值时不静默初始化', (t) => {
  const repo = project(t);
  put(repo, 'docs/flow.json', definition());
  const cli = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
  const common = [cli, 'init', '--repo', repo, '--stack', 'expo', '--project-id', 'fixture', '--objective', '验证生产CLI'];
  const batch = spawnSync(process.execPath, [...common, '--id', 'page', '--type', 'PAGE', '--object-id', 'form', '--production-scope', 'docs/flow.json', '--production-batch', 'edit'], { encoding: 'utf8', windowsHide: true });
  assert.equal(batch.status, 0, batch.stderr);
  assert.equal(JSON.parse(batch.stdout).metadata.workflowView.productionBatchId, 'edit');
  const final = spawnSync(process.execPath, [...common, '--id', 'final', '--type', 'INTEGRATION', '--integration-purpose', 'final', '--production-scope', 'docs/flow.json'], { encoding: 'utf8', windowsHide: true });
  assert.equal(final.status, 0, final.stderr);
  assert.equal(JSON.parse(final.stdout).metadata.workflowView.productionBatchId, null);
  const invalid = spawnSync(process.execPath, [...common, '--id', 'invalid', '--type', 'MODULE', '--production-scope'], { encoding: 'utf8', windowsHide: true });
  assert.equal(invalid.status, 2);
  assert.equal(existsSync(join(repo, '.workflow-control/work-items/invalid.json')), false);
});

test('plan 与执行快照冻结总范围，范围内容变化不能继续消费', async (t) => {
  const repo = project(t);
  const scope = definition();
  const scopeRef = put(repo, 'docs/flow.json', scope);
  const context = await prepare(repo, 'edit', 'edit');
  const pack = JSON.parse(readFileSync(join(repo, context.work.implementationPackageRef.path), 'utf8'));
  assert.deepEqual(pack.productionScopeRef, scopeRef);
  assert.equal(pack.productionBatchId, 'edit');
  assert.deepEqual(createExecutionPlanSnapshot(pack).productionScopeRef, scopeRef);
  await transitionWork({ repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  const activeWork = loadWork(repo, context.workPath);
  scope.steps[0].expectedResult = '改变了冻结预期';
  const changedRef = put(repo, 'docs/flow.json', scope);
  assert.throws(() => loadWork(repo, context.workPath), /生产总范围.*内容已变化/);
  // 同时改写范围、工作项和实施包，也不能越过已保存的执行快照。
  activeWork.productionScopeRef = changedRef;
  pack.productionScopeRef = changedRef;
  put(repo, context.workPath, activeWork);
  put(repo, activeWork.implementationPackageRef.path, pack);
  await assert.rejects(completeUnit({ repo, workItem: context.workPath, resultPath: `${activeWork.evidenceRoot}/unit-edit.json` }), /冻结|计划.*变化|执行计划/);
});

test('真实前批完成后冻结依赖，unit-check 持续拒绝被改写的前置材料', async (t) => {
  const repo = project(t);
  put(repo, 'docs/flow.json', definition());
  const first = await prepare(repo, 'edit', 'edit');
  const finished = await completeFirst(first);
  put(repo, 'docs/dependencies.json', [{ batchId: 'edit', workItemRef: { path: first.workPath } }]);
  const second = await prepare(repo, 'save', 'save', 'docs/dependencies.json');
  assert.match(second.work.productionDependencies[0].workItemRef.sha256, /^[a-f0-9]{64}$/);
  await transitionWork({ repo, workItem: second.workPath, to: 'IMPLEMENTING', args: {} });
  const resultPath = `${second.work.evidenceRoot}/unit-save.json`;
  // 只改变前置输出即可使历史检查失效，不能跨次缓存先前的 PASS。
  put(repo, `${finished.evidenceRoot}/raw.txt`, '前置原始输出被替换');
  await assert.rejects(completeUnit({ repo, workItem: second.workPath, resultPath }), /生产依赖.*历史|生产依赖.*完成|检查未通过/);
  const output = `${second.work.evidenceRoot}/blocked-capture.json`;
  const captured = spawnSync(process.execPath, [resolve('skills/app-workflow-control/scripts/capture-command.mjs'), '--repo', repo, '--work-item', second.workPath, '--unit', 'save', '--index', '1', '--output', output], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(captured.status, 0);
  assert.equal(existsSync(join(repo, output)), false);
  assert.equal(loadWork(repo, second.workPath).globalState, 'IMPLEMENTING');
});
