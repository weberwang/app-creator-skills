import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertWorkflowPolicy } from '../../skills/app-workflow-control/scripts/runtime/task-policy.mjs';

const CLI = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');

/** 建立独占临时工程，所有本地验证写入均在该目录内。 */
function temporaryProject(t) {
  const repo = mkdtempSync(join(tmpdir(), 'light-workflow-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  return repo;
}

/** 写入测试事实或合成合同材料，不代表真实 Flutter 应用经过测试。 */
function put(repo, path, content) {
  const target = join(repo, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return target;
}

/** 从实际文件读取工作项，避免测试只检查内存中的未保存状态。 */
function read(repo, path) {
  return JSON.parse(readFileSync(join(repo, path), 'utf8'));
}

/** 通过真实 CLI 执行编排操作；不会在测试内启动开发服务或引擎。 */
function call(repo, command, args = [], expectedExit = 0) {
  const result = spawnSync(process.execPath, [CLI, command, '--repo', repo, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, expectedExit, result.stderr || result.stdout);
  return JSON.parse(result.stdout || result.stderr);
}

test('普通模式保持原入口，PROJECT从需求阶段开始，RELEASE默认只准备', async (t) => {
  const repo = temporaryProject(t);
  for (const [id, type, phase] of [['normal', 'MODULE', 'foundation-engineering'], ['project', 'PROJECT', 'requirements-scope'], ['release', 'RELEASE', 'release']]) {
    const result = await initializeWork({ repo, args: { id, type, stack: 'flutter', objective: '验证控制器任务分流' } });
    const work = read(repo, result.metadata.workItemPath);
    assert.equal(work.workflowMode, 'standard');
    assert.equal(work.globalState, 'INTAKE');
    assert.equal(work.stageId, phase);
    if (type === 'RELEASE') assert.equal(work.releaseIntent, 'prepare');
  }
});

test('轻量初始化直接进入REVIEW，但没有质量门和实施包不能开始实施', async (t) => {
  const repo = temporaryProject(t);
  const result = await initializeWork({ repo, args: { id: 'small', type: 'MODULE', mode: 'light', stack: 'flutter', objective: '单模块本地修复' } });
  const work = read(repo, result.metadata.workItemPath);
  assert.equal(work.globalState, 'REVIEW');
  assert.equal(work.workflowMode, 'light');
  assert.ok(Object.values(work.gateStatus).every((status) => status === 'NOT_RUN'));
  const check = call(repo, 'check', ['--work-item', result.metadata.workItemPath], 2);
  assert.equal(check.status, 'BLOCKED');
  const run = call(repo, 'run', ['--work-item', result.metadata.workItemPath], 2);
  assert.equal(run.status, 'BLOCKED');
  await assert.rejects(transitionWork({ repo, workItem: result.metadata.workItemPath, to: 'IMPLEMENTING', args: {} }), /F0|F1|F2|实施包/);
  assert.ok(!existsSync(join(repo, work.evidenceRoot, 'execution-state.json')));
});

test('轻量模式拒绝视觉、项目、集成、发布、外部动作及多单元计划', async (t) => {
  const repo = temporaryProject(t);
  for (const type of ['PROJECT', 'SCENE', 'PAGE', 'INTEGRATION', 'RELEASE']) {
    await assert.rejects(initializeWork({ repo, args: { id: type.toLowerCase(), type, mode: 'light', stack: 'flutter', objective: '不适用轻量模式的任务' } }), /light/);
  }
  const basic = { workflowMode: 'light', workItemType: 'MODULE', visualBaselineRequired: false };
  assert.throws(() => assertWorkflowPolicy({ ...basic, action: { effects: ['external-write'] } }), /受保护/);
  assert.throws(() => assertWorkflowPolicy(basic, { executionUnits: [{}, {}] }), /一个独立/);
  assert.throws(() => assertWorkflowPolicy(basic, { executionUnits: [{ parallelGroup: 'group' }] }), /并行/);
  assert.throws(() => assertWorkflowPolicy(basic, { executionUnits: [{ dependsOn: ['other'] }] }), /依赖/);
  assert.throws(() => assertWorkflowPolicy({ ...basic, workflowMode: 'unknown' }), /workflowMode/);
  await assert.rejects(initializeWork({ repo, args: { id: 'wrong-intent', type: 'MODULE', 'release-intent': 'publish', stack: 'flutter', objective: '错误参数' } }), /只有 RELEASE/);
});

test('轻量任务通过plan与record生成关联记录，实际命令结果仍经既有单元与工程门完成', (t) => {
  const repo = temporaryProject(t);
  const initialized = call(repo, 'init', ['--id', 'local-fix', '--stack', 'flutter', '--type', 'MODULE', '--mode', 'light', '--objective', '验证轻量编排的机器记录闭环']);
  const workPath = initialized.metadata.workItemPath;
  const planPath = '.workflow-control/input/local-fix-plan.json';
  const command = 'node --version';
  put(repo, planPath, {
    gateAssessments: {
      F0: { status: 'PASS', reason: '合成工程中只允许当前测试文件' },
      F1: { status: 'PASS', reason: '验收控制记录引用与真实版本命令输出' },
      F2: { status: 'PASS', reason: '本夹具仅证明控制协议，不证明Flutter功能' },
    },
    executionUnits: [{ unitId: 'fix', owner: 'test', paths: ['lib/fix.dart'], acceptanceCommands: [command] }],
  });
  call(repo, 'plan', ['--work-item', workPath, '--spec', planPath]);
  let work = read(repo, workPath);
  assert.deepEqual(work.allowedPaths, ['lib/fix.dart']);
  assert.equal(work.planningRef.path, planPath);
  assert.equal(work.gateStatus.F3, 'NOT_RUN');
  assert.deepEqual(read(repo, work.evidenceRef.path).items, []);
  const stopped = call(repo, 'run', ['--work-item', workPath]);
  assert.equal(stopped.status, 'STOPPED');
  call(repo, 'transition', ['--work-item', workPath, '--to', 'IMPLEMENTING']);

  const executed = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(executed.status, 0);
  const logPath = `${work.evidenceRoot}/node-version.txt`;
  put(repo, logPath, executed.stdout);
  put(repo, 'lib/fix.dart', '// 合成工程文件，仅用于验证路径与记录绑定。\n');
  const reportPath = '.workflow-control/input/local-fix-report.json';
  put(repo, reportPath, {
    files: ['lib/fix.dart'],
    commandOutputs: [{ command, exitCode: executed.status, outputFile: logPath }],
    evidence: [{ category: 'analyze', path: logPath }, { category: 'tests', path: logPath }],
  });
  call(repo, 'record', ['--work-item', workPath, '--unit', 'fix', '--report', reportPath]);
  work = read(repo, workPath);
  assert.equal(work.gateStatus.F3, 'NOT_RUN');
  const packageFile = read(repo, work.implementationPackageRef.path);
  const unitResult = packageFile.executionUnits[0].resultPath;
  call(repo, 'unit-check', ['--work-item', workPath, '--result', unitResult]);
  // F3仍是实施者对当前工程事实的结论，记录工具不会用模板自动提升门禁。
  work = read(repo, workPath);
  work.gateStatus.F3 = 'PASS';
  put(repo, workPath, work);
  for (const state of ['VALIDATING', 'PASSED', 'COMPLETE']) call(repo, 'transition', ['--work-item', workPath, '--to', state]);
  const closed = call(repo, 'status', ['--work-item', workPath]);
  assert.equal(closed.metadata.workflowView.completionKind, 'task-complete');
  assert.equal(read(repo, workPath).globalState, 'COMPLETE');
});
