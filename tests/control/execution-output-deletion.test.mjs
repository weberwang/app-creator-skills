import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { link, mkdtemp, mkdir, readFile, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import test from 'node:test';
import { completeUnit, initializeWork, inspectWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { freezeDeletionBaseline, validateDeletedFiles } from '../../skills/app-workflow-control/scripts/runtime/deletion-baseline.mjs';

/** 写入测试工作区的文件。 */
async function put(repo, path, content) {
  const absolute = resolve(repo, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

test('删除基线剪枝根技能目录并保留业务路径，旧基线不能申报技能删除', async (t) => {
  const root = await realpath(tmpdir());
  const repo = await mkdtemp(resolve(root, 'workflow-agents-baseline-'));
  t.after(async () => {
    const actual = await realpath(repo);
    assert.equal(dirname(actual), root);
    assert.match(basename(actual), /^workflow-agents-baseline-/);
    await rm(actual, { recursive: true, force: true });
  });
  await put(repo, '.agents/skills/local.txt', '本地技能');
  await put(repo, '.agents-other/business.txt', '相似前缀');
  await put(repo, 'src/.agents/business.txt', '嵌套业务');
  await put(repo, 'lib/old.dart', '业务删除');
  const unit = { unitId: 'wide', paths: ['**'] };
  const pack = { executionUnits: [unit, { unitId: 'direct', paths: ['.agents/skills'] }] };
  const state = { activeBatch: ['wide', 'direct'] };
  freezeDeletionBaseline(repo, pack, state);
  assert.deepEqual(state.deletionBaselines.direct, []);
  assert.deepEqual(state.deletionBaselines.wide.map((entry) => entry.path).sort(), [
    '.agents-other/business.txt', 'lib/old.dart', 'src/.agents/business.txt',
  ]);
  const work = { evidenceRoot: '.workflow/evidence', allowedPaths: ['**'], forbiddenPaths: [] };
  await put(repo, `${work.evidenceRoot}/execution-state.json`, JSON.stringify(state));
  await unlink(resolve(repo, 'lib/old.dart'));
  assert.doesNotThrow(() => validateDeletedFiles(repo, work, pack, unit, ['lib/old.dart'], {}, []));
  // 模拟历史状态中的旧条目，确保不能绕过当前的本地技能排除规则。
  state.deletionBaselines.wide.push({ path: '.agents/skills/local.txt', sha256: 'a'.repeat(64), dev: '1', ino: '1', links: 1 });
  await put(repo, `${work.evidenceRoot}/execution-state.json`, JSON.stringify(state));
  await unlink(resolve(repo, '.agents/skills/local.txt'));
  assert.throws(() => validateDeletedFiles(repo, work, pack, unit, ['.agents/skills/local.txt'], {}, []), /本地技能目录不能作为删除交付/);
});

test('真实静默命令可采集，失败退出码及伪造采集被拒绝', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-capture-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const initialized = await initializeWork({ repo, args: { id: 'capture-test', stack: 'flutter', type: 'FOUNDATION', objective: '验证真实命令采集' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  const commands = ['node -e "process.exit(0)"', 'node -e "process.exit(3)"'];
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: [{ unitId: 'one', owner: 'agent', paths: ['lib/one.dart'], acceptanceCommands: commands }] }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const active = await loadWork(repo, workPath);
  const script = resolve('skills/app-workflow-control/scripts/capture-command.mjs');
  const capture = (index, path) => spawnSync(process.execPath, [script, '--repo', repo, '--work-item', workPath, '--unit', 'one', '--index', String(index), '--output', path], { encoding: 'utf8', windowsHide: true });
  const output = `${active.evidenceRoot}/silent.json`;
  assert.equal(capture(1, output).status, 0);
  const recorded = JSON.parse(await readFile(resolve(repo, output), 'utf8'));
  assert.equal(recorded.stdout, '');
  assert.equal(recorded.stderr, '');
  assert.equal(recorded.command, commands[0]);
  assert.notEqual(capture(1, output).status, 0);
  const failed = `${active.evidenceRoot}/failed.json`;
  assert.equal(capture(2, failed).status, 3);
  await put(repo, 'lib/one.dart', 'change');
  const report = { files: ['lib/one.dart'], commandOutputs: [{ command: commands[0], exitCode: 0, outputFile: output }, { command: commands[1], exitCode: 0, outputFile: failed }], evidence: [] };
  await put(repo, failed, '   \n');
  await put(repo, 'docs/report.json', JSON.stringify(report));
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'one', reportPath: 'docs/report.json' }), /输出为空/);
  await put(repo, failed, JSON.stringify({ schemaVersion: 'command-capture-v1', command: commands[1], exitCode: 3, stdout: '', stderr: '' }));
  await put(repo, 'docs/report.json', JSON.stringify(report));
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'one', reportPath: 'docs/report.json' }), /采集记录/);
});

test('真实静默成功采集可登记并通过单元检查', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-silent-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const initialized = await initializeWork({ repo, args: { id: 'silent-pass', stack: 'flutter', type: 'FOUNDATION', objective: '验证静默成功' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  const command = 'node -e "process.exit(0)"';
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: [{ unitId: 'one', owner: 'agent', paths: ['lib/one.dart'], acceptanceCommands: [command] }] }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const active = await loadWork(repo, workPath);
  const output = `${active.evidenceRoot}/silent.json`;
  const cli = spawnSync(process.execPath, [resolve('skills/app-workflow-control/scripts/capture-command.mjs'), '--repo', repo, '--work-item', workPath, '--unit', 'one', '--index', '1', '--output', output], { encoding: 'utf8', windowsHide: true });
  assert.equal(cli.status, 0, cli.stderr);
  await put(repo, 'lib/one.dart', '变更');
  await put(repo, 'docs/report.json', JSON.stringify({ files: ['lib/one.dart'], commandOutputs: [{ command, exitCode: 0, outputFile: output }], evidence: [] }));
  const result = await recordWorkResult({ repo, workItem: workPath, unitId: 'one', reportPath: 'docs/report.json' });
  assert.equal((await completeUnit({ repo, workItem: workPath, resultPath: result.metadata.resultPath })).status, 'PASS');
});

test('后续批次在激活时冻结前一批新增的文件', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-delete-batch-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const initialized = await initializeWork({ repo, args: { id: 'delete-batch', stack: 'flutter', type: 'FOUNDATION', objective: '验证批次冻结' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: [
    { unitId: 'first', owner: 'agent', paths: ['lib'], acceptanceCommands: ['node --version'] },
    { unitId: 'second', owner: 'agent', paths: ['lib/new.dart'], acceptanceCommands: ['node --version'] },
  ] }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const active = await loadWork(repo, workPath);
  const output = `${active.evidenceRoot}/command.log`;
  await put(repo, output, '真实命令日志');
  await put(repo, 'lib/new.dart', '由前一批创建');
  const common = { commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }], evidence: [] };
  await put(repo, 'docs/first.json', JSON.stringify({ ...common, files: ['lib/new.dart'] }));
  const first = await recordWorkResult({ repo, workItem: workPath, unitId: 'first', reportPath: 'docs/first.json' });
  await completeUnit({ repo, workItem: workPath, resultPath: first.metadata.resultPath });
  await unlink(resolve(repo, 'lib/new.dart'));
  await put(repo, 'docs/second.json', JSON.stringify({ ...common, files: [], deletedFiles: ['lib/new.dart'] }));
  // 前一单元仍要求交付文件存在，因此不允许通过删除破坏已通过单元。
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'second', reportPath: 'docs/second.json' }), /不存在/);
  const state = JSON.parse(await readFile(resolve(repo, active.evidenceRoot, 'execution-state.json'), 'utf8'));
  assert.equal(state.deletionBaselines.second[0].path, 'lib/new.dart');
});

/** 建立带实施前文件的删除测试工作项。 */
async function deletionFixture(t, paths = ['lib']) {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-delete-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const initialized = await initializeWork({ repo, args: { id: 'delete-test', stack: 'flutter', type: 'FOUNDATION', objective: '验证真实删除' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  await put(repo, 'lib/old.dart', '删除前的真实内容');
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: [{ unitId: 'one', owner: 'agent', paths, acceptanceCommands: ['node --version'] }] }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const active = await loadWork(repo, workPath);
  const output = `${active.evidenceRoot}/command.log`;
  await put(repo, output, '真实命令日志');
  const report = { files: [], deletedFiles: ['lib/old.dart'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }], evidence: [] };
  return { repo, workPath, active, report };
}

/** 写入报告并尝试记录当前执行单元。 */
async function recordDeletion(fixture) {
  await put(fixture.repo, 'docs/report.json', JSON.stringify(fixture.report));
  return recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: 'docs/report.json' });
}

test('纯删除使用冻结基线闭环，文件重建后检查失败', async (t) => {
  const fixture = await deletionFixture(t);
  await unlink(resolve(fixture.repo, 'lib/old.dart'));
  const recorded = await recordDeletion(fixture);
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: recorded.metadata.resultPath });
  let work = await loadWork(fixture.repo, fixture.workPath);
  assert.equal(inspectWork(fixture.repo, work).status, 'PASS');
  await put(fixture.repo, 'lib/old.dart', '重建');
  work = await loadWork(fixture.repo, fixture.workPath);
  assert.match(inspectWork(fixture.repo, work).blocking.join(' '), /仍然存在或已重建/);
});

test('删除记录拒绝不存在基线、越权和现存硬链接别名', async (t) => {
  const fixture = await deletionFixture(t);
  fixture.report.deletedFiles = ['lib/never.dart'];
  await assert.rejects(recordDeletion(fixture), /实施前存在性/);
  fixture.report.deletedFiles = ['outside/not-owned.dart'];
  await assert.rejects(recordDeletion(fixture), /allowedPaths/);
  await link(resolve(fixture.repo, 'lib/old.dart'), resolve(fixture.repo, 'lib/alias.dart'));
  // 基线记录原文件只有一个链接，后来创建的链接仍需防止借名删除。
  await unlink(resolve(fixture.repo, 'lib/old.dart'));
  fixture.report.deletedFiles = ['lib/old.dart'];
  await assert.rejects(recordDeletion(fixture), /硬链接别名/);
});

test('缺少实施前快照的旧状态不能通过重新扫描补造删除依据', async (t) => {
  const fixture = await deletionFixture(t);
  const statePath = `${fixture.active.evidenceRoot}/execution-state.json`;
  const state = JSON.parse(await readFile(resolve(fixture.repo, statePath), 'utf8'));
  delete state.deletionBaselines;
  await put(fixture.repo, statePath, JSON.stringify(state));
  await unlink(resolve(fixture.repo, 'lib/old.dart'));
  await assert.rejects(recordDeletion(fixture), /缺少实施前冻结/);
});

test('并行批次后建的跨单元硬链接不能冒充删除', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-delete-alias-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const initialized = await initializeWork({ repo, args: { id: 'delete-alias', stack: 'flutter', type: 'FOUNDATION', objective: '验证并行删除别名' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  await put(repo, 'lib/one/old.dart', '旧文件');
  await mkdir(resolve(repo, 'lib/two'), { recursive: true });
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: ['one', 'two'].map((id) => ({ unitId: id, owner: 'agent', type: 'MODULE', paths: [`lib/${id}`], acceptanceCommands: ['node --version'], parallelGroup: 'parallel' })) }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  const active = await loadWork(repo, workPath);
  await link(resolve(repo, 'lib/one/old.dart'), resolve(repo, 'lib/two/alias.dart'));
  await unlink(resolve(repo, 'lib/one/old.dart'));
  const output = `${active.evidenceRoot}/command.log`;
  await put(repo, output, '真实日志');
  await put(repo, 'docs/report.json', JSON.stringify({ files: [], deletedFiles: ['lib/one/old.dart'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }], evidence: [] }));
  await assert.rejects(recordWorkResult({ repo, workItem: workPath, unitId: 'one', reportPath: 'docs/report.json' }), /并行单元存在硬链接别名/);
});
