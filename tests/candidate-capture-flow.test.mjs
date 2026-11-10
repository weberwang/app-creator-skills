/** 验证候选文件检查通过真实命令采集接入现有控制器。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import test from 'node:test';
import { completeUnit, initializeWork, loadWork, transitionWork } from '../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../skills/app-workflow-control/scripts/runtime/records.mjs';

/** 将参数按当前采集器使用的 shell 语法引用，支持路径中的空格和单引号。 */
function quote(value) {
  return process.platform === 'win32'
    ? `'${value.replaceAll("'", "''")}'`
    : `'${value.replaceAll("'", "'\\''")}'`;
}

/** 写入独占合成项目内的文件。 */
async function put(repo, path, content) {
  const absolute = resolve(repo, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

/** 创建真实控制器工作项；门禁及项目数据均为合成测试材料。 */
async function fixture(t, id) {
  const root = await realpath(tmpdir());
  const repo = await mkdtemp(resolve(root, 'candidate-capture-flow-'));
  t.after(async () => {
    // 仅清理真实位于临时根目录、属于本测试的独占项目。
    const actual = await realpath(repo);
    assert.equal(dirname(actual), root);
    assert.match(basename(actual), /^candidate-capture-flow-/);
    await rm(actual, { recursive: true, force: true });
  });
  const initialized = await initializeWork({ repo, args: { id, stack: 'flutter', type: 'FOUNDATION', objective: '验证候选检查命令采集' } });
  const workPath = initialized.metadata.workItemPath;
  const work = await loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await put(repo, workPath, JSON.stringify(work));
  const snapshotPath = `${work.evidenceRoot}/candidate-snapshot.json`;
  const checkPath = `${work.evidenceRoot}/candidate-check.json`;
  const tool = resolve('skills/app-domain-toolkit/scripts/verification/candidate-files.mjs');
  const runner = `${process.platform === 'win32' ? '& ' : ''}${quote(process.execPath)} ${quote(tool)}`;
  const commands = [
    `${runner} snapshot --repo . --artifact build --input lib --require index.html`,
    `${runner} check --repo . --snapshot ${quote(snapshotPath)}`,
  ];
  await put(repo, 'docs/plan.json', JSON.stringify({ executionUnits: [{ unitId: 'candidate', owner: 'fixture', paths: ['lib/app.dart'], acceptanceCommands: commands }] }));
  await prepareWorkRecords({ repo, workItem: workPath, planPath: 'docs/plan.json' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  await put(repo, 'lib/app.dart', '// 合成业务交付\n');
  await put(repo, 'build/index.html', '<main>合成候选</main>\n');
  return { repo, workPath, snapshotPath, checkPath, commands };
}

/** 运行真实采集器并读取其原始命令记录。 */
async function capture(context, index, output) {
  const script = resolve('skills/app-workflow-control/scripts/capture-command.mjs');
  const cli = spawnSync(process.execPath, [script, '--repo', context.repo, '--work-item', context.workPath, '--unit', 'candidate', '--index', String(index), '--output', output], { encoding: 'utf8', windowsHide: true });
  assert.ifError(cli.error);
  const record = JSON.parse(await readFile(resolve(context.repo, output), 'utf8'));
  assert.equal(record.schemaVersion, 'command-capture-v1');
  assert.equal(record.command, context.commands[index - 1]);
  assert.equal(record.exitCode, cli.status);
  return { cli, record };
}

/** 把业务交付和两条采集结果写入测试报告，不以证据文件冒充交付。 */
async function report(context, checkExitCode) {
  const { repo, commands, snapshotPath, checkPath } = context;
  const data = {
    files: ['lib/app.dart'],
    commandOutputs: [
      { command: commands[0], exitCode: 0, outputFile: snapshotPath },
      { command: commands[1], exitCode: checkExitCode, outputFile: checkPath },
    ],
    evidence: [],
  };
  await put(repo, 'docs/report.json', JSON.stringify(data));
  return recordWorkResult({ repo, workItem: context.workPath, unitId: 'candidate', reportPath: 'docs/report.json' });
}

test('真实采集的候选快照可复核、登记并完成执行单元', async (t) => {
  const context = await fixture(t, 'candidate-pass');
  const snapshot = await capture(context, 1, context.snapshotPath);
  assert.equal(snapshot.cli.status, 0, snapshot.cli.stderr);
  assert.equal(JSON.parse(snapshot.record.stdout).schemaVersion, 'candidate-files-v1');
  const checked = await capture(context, 2, context.checkPath);
  assert.equal(checked.cli.status, 0, checked.cli.stderr);
  assert.equal(JSON.parse(checked.record.stdout).ok, true);
  const recorded = await report(context, 0);
  assert.equal((await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: recorded.metadata.resultPath })).status, 'PASS');
});

test('候选内容变化时采集失败，不能通过虚报退出码登记成功', async (t) => {
  const context = await fixture(t, 'candidate-change');
  assert.equal((await capture(context, 1, context.snapshotPath)).cli.status, 0);
  await put(context.repo, 'build/extra.js', '// 候选产生变化\n');
  const checked = await capture(context, 2, context.checkPath);
  assert.notEqual(checked.cli.status, 0);
  assert.match(JSON.parse(checked.record.stdout).error, /候选.*变化/);
  // 故意将真实失败虚报为零，以验证控制器会核对原始采集记录。
  await assert.rejects(report(context, 0), /采集记录/);
});
