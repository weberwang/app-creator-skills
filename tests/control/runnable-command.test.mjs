import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { assertRunnableCommand } from '../../skills/app-workflow-control/scripts/runtime/runnable-command.mjs';
import { validateCommandCapture } from '../../skills/app-workflow-control/scripts/runtime/command-capture.mjs';
import { initializeWork, loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';

/** 写入独占测试目录中的本地资料，不执行其中声明的命令。 */
async function put(repo, path, value) {
  const file = resolve(repo, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
}

test('实际多行命令、重定向和HTML字面量可用，解释性占位不可当命令', () => {
  for (const command of ['node --test tests/design.test.mjs', 'node -e "process.exit(0)"', 'node -e "console.log(\'<div>内容</div>\')"', 'node --version > result.txt', 'node --version\nnode --test']) {
    assert.equal(assertRunnableCommand(command), command);
  }
  for (const command of ['', '   ', '<执行某项检查>', 'TODO', '待填写', 'node <path>', 'flutter test <实际测试路径>']) {
    assert.throws(() => assertRunnableCommand(command), /实际可复跑命令/);
  }
});

test('计划、实施包、报告和结果Schema均拒绝命令占位', async () => {
  const ajv = new Ajv2020({ strict: false });
  for (const name of ['work-plan', 'implementation-package', 'execution-report', 'execution-result']) {
    const schema = JSON.parse(await readFile(new URL(`../../skills/app-workflow-control/schemas/${name}.schema.json`, import.meta.url)));
    const command = schema.properties.executionUnits?.items.properties.acceptanceCommands.items ?? schema.properties.commandOutputs.items.properties.command;
    const validate = ajv.compile(command);
    assert.equal(validate('node --test'), true, name);
    assert.equal(validate('<执行某项检查>'), false, name);
    assert.equal(validate('TODO'), false, name);
  }
});

test('控制器拒绝冻结占位计划，也拒绝普通日志和采集JSON中的占位命令', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'workflow-runnable-'));
  // 只清理由本用例创建并核对过的临时目录。
  t.after(() => {
    assert.equal(dirname(repo), resolve(tmpdir()));
    return rm(repo, { recursive: true, force: true });
  });
  const created = await initializeWork({ repo, args: { id: 'runnable', stack: 'flutter', type: 'FOUNDATION', objective: '验证命令记录' } });
  const workPath = created.metadata.workItemPath;
  const work = loadWork(repo, workPath);
  work.globalState = 'REVIEW';
  await put(repo, workPath, work);
  await put(repo, 'plan.json', { executionUnits: [{ unitId: 'one', owner: 'agent', paths: ['lib/check.dart'], acceptanceCommands: ['<执行某项检查>'] }] });
  await assert.rejects(prepareWorkRecords({ repo, workItem: workPath, planPath: 'plan.json' }), /实际可复跑命令/);
  await put(repo, 'raw.log', '任意非空输出');
  assert.throws(() => validateCommandCapture(repo, 'raw.log', { command: '<执行某项检查>', exitCode: 0 }), /实际可复跑命令/);
  const entry = { command: 'node --version', exitCode: 0 };
  await put(repo, 'capture.json', { schemaVersion: 'command-capture-v1', ...entry, stdout: 'v22\n', stderr: '' });
  assert.doesNotThrow(() => validateCommandCapture(repo, 'capture.json', entry));
  await put(repo, 'capture.json', { schemaVersion: 'command-capture-v1', ...entry, command: '<运行检查>', stdout: '', stderr: '' });
  assert.throws(() => validateCommandCapture(repo, 'capture.json', entry), /实际可复跑命令/);
  await put(repo, 'capture.json', { schemaVersion: 'command-capture-v1', ...entry, exitCode: 3, stdout: '', stderr: '' });
  assert.throws(() => validateCommandCapture(repo, 'capture.json', entry), /退出码不一致/);
});
