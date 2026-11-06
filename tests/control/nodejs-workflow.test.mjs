/** 验证服务端模块和最终集成通过实际控制器状态迁移完成，无需视觉记录。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { completeUnit, initializeWork, inspectWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

/** 写入测试独占工程中的实际文件或机器记录。 */
function put(repo, path, value) {
  const file = join(repo, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

/** 冻结现有文件的内容身份。 */
function identity(repo, path) {
  return { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
}

/** 运行真实的本地 Node 命令，将输出保存到测试工程的证据目录。 */
function runCommand(repo, args, outputPath) {
  const result = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const command = `node ${args.join(' ')}`;
  put(repo, outputPath, `command: ${command}\nexitCode: ${result.status}\n${result.stdout}${result.stderr}`);
  return { command, exitCode: result.status, outputFile: outputPath };
}

/** 用实际源码和测试输出完成一个非视觉工作项的执行单元。 */
async function executeUnit(repo, workPath, sourceFile, scopeRef) {
  let work = loadWork(repo, workPath);
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}.json`;
  const resultPath = `${work.evidenceRoot}/unit-run.json`;
  const check = `node --check ${sourceFile}`;
  const suite = 'node --test tests/add.test.mjs';
  const pack = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType, executionUnits: [{ unitId: 'run', sequence: 1, type: 'MODULE', owner: 'fixture', paths: [sourceFile], resultPath, acceptanceCommands: [check, suite] }] };
  put(repo, packPath, pack);
  work.implementationPackageRef = { path: packPath };
  if (scopeRef) work.integrationScopeRef = scopeRef;
  put(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = loadWork(repo, workPath);
  const outputs = [runCommand(repo, ['--check', sourceFile], `${work.evidenceRoot}/check.log`), runCommand(repo, ['--test', 'tests/add.test.mjs'], `${work.evidenceRoot}/tests.log`)];
  put(repo, resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, unitId: 'run', sequence: 1, exitCode: 0, files: [sourceFile], commandOutputs: outputs });
  await completeUnit({ repo, workItem: workPath, resultPath });
  work = loadWork(repo, workPath);
  return { work, packPath, outputs };
}

/** 为当前工作项登记现有日志和可选集成报告，F3 仍由执行者明确提交。 */
function bindEvidence(repo, workPath, work, packPath, outputs, extra = []) {
  const manifestPath = `${work.evidenceRoot}/manifest.json`;
  put(repo, manifestPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, items: [
    { category: 'static-analysis', status: 'PASS', path: outputs[0].outputFile },
    { category: 'tests', status: 'PASS', path: outputs[1].outputFile },
    ...extra,
  ] });
  work.evidenceRef = { path: manifestPath };
  work.gateStatus.F3 = 'PASS';
  put(repo, workPath, work);
}

/** 通过公共 API 推进到指定状态，避免通过直接改写状态冒充通过。 */
async function move(repo, path, ...states) {
  for (const to of states) await transitionWork({ repo, workItem: path, to, args: {} });
}

test('Node.js 无视觉 MODULE 和最终集成通过完整状态闭环', async (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'nodejs-workflow-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  put(repo, 'src/add.mjs', 'export const add = (a, b) => a + b;\n');
  put(repo, 'tests/add.test.mjs', "import test from 'node:test'; import assert from 'node:assert/strict'; import { add } from '../src/add.mjs'; test('add', () => assert.equal(add(2, 3), 5));\n");

  const moduleInit = await initializeWork({ repo, args: { id: 'add-module', stack: 'nodejs', type: 'MODULE', mode: 'light', objective: '验证可执行模块' } });
  const modulePath = moduleInit.metadata.workItemPath;
  let moduleWork = loadWork(repo, modulePath);
  Object.assign(moduleWork.gateStatus, { F0: 'PASS', F1: 'PASS', F2: 'PASS' });
  put(repo, modulePath, moduleWork);
  const moduleExecution = await executeUnit(repo, modulePath, 'src/add.mjs');
  bindEvidence(repo, modulePath, moduleExecution.work, moduleExecution.packPath, moduleExecution.outputs);
  await move(repo, modulePath, 'VALIDATING', 'PASSED', 'COMPLETE');
  moduleWork = loadWork(repo, modulePath);
  assert.equal(moduleWork.globalState, 'COMPLETE');
  assert.equal(moduleWork.visual, undefined);
  assert.equal(inspectWork(repo, moduleWork, { strict: true }).status, 'PASS');

  const init = await initializeWork({ repo, args: { id: 'combined', stack: 'nodejs', type: 'INTEGRATION', 'integration-purpose': 'final', objective: '验证最终服务组合' } });
  const workPath = init.metadata.workItemPath;
  let work = loadWork(repo, workPath);
  Object.assign(work.gateStatus, { F0: 'PASS', F1: 'PASS', F2: 'PASS' });
  put(repo, workPath, work);
  await move(repo, workPath, 'BASELINE', 'PROPOSAL', 'REVIEW');
  const object = { objectId: moduleWork.workItemId, workItemRef: identity(repo, modulePath), implementationPackageRef: identity(repo, moduleWork.implementationPackageRef.path), evidenceRef: identity(repo, moduleWork.evidenceRef.path), deliverableRefs: [identity(repo, 'src/add.mjs')] };
  const scopePath = '.workflow-control/input/combined-scope.json';
  const scope = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objects: [object], cases: [{ caseId: 'sum', objectIds: [object.objectId] }] };
  put(repo, scopePath, scope);
  const execution = await executeUnit(repo, workPath, 'tests/add.test.mjs', identity(repo, scopePath));
  work = execution.work;
  const outputPath = `${work.evidenceRoot}/sum-output.log`;
  const output = runCommand(repo, ['--test', 'tests/add.test.mjs'], outputPath);
  const casePath = `${work.evidenceRoot}/sum-case.json`;
  put(repo, casePath, { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, caseId: 'sum', objectIds: [object.objectId], status: 'PASS', command: output.command, exitCode: output.exitCode, outputRef: identity(repo, outputPath) });
  const resultPath = `${work.evidenceRoot}/integration-result.json`;
  put(repo, resultPath, { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, status: 'PASS', objects: [object], cases: [{ caseId: 'sum', objectIds: [object.objectId], evidenceRef: identity(repo, casePath) }] });
  work.integrationEvidenceRef = identity(repo, resultPath);
  bindEvidence(repo, workPath, work, execution.packPath, execution.outputs, [
    { category: 'tests', status: 'PASS', path: resultPath },
    { category: 'tests', status: 'PASS', path: casePath },
  ]);
  await move(repo, workPath, 'VALIDATING', 'PASSED', 'COMPLETE');
  const completed = loadWork(repo, workPath);
  assert.equal(completed.globalState, 'COMPLETE');
  assert.equal(completed.visual, undefined);
  assert.equal(inspectWork(repo, completed, { strict: true }).status, 'PASS');
});
