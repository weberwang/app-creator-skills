import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { link, mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { completeUnit, initializeWork, inspect, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

const command = 'node --version';

/** 建立可隔离删除的临时 Flutter 项目根目录。 */
async function fixtureRoot() {
  return mkdtemp(resolve(tmpdir(), 'workflow-batches-'));
}

/** 写入非空的项目相对文件，自动建立父目录。 */
async function put(repo, path, body = 'fixture output\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, body, 'utf8');
  return path;
}

/** 写入 JSON 合同并返回项目相对路径。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 构造默认单元字段，允许测试覆盖计划字段。 */
function unit(unitId, sequence, overrides = {}) {
  return {
    unitId,
    sequence,
    type: 'MODULE',
    owner: `owner-${unitId}`,
    paths: [`lib/${unitId}.dart`],
    resultPath: `.workflow-control/evidence/batch-work/${unitId}.json`,
    acceptanceCommands: [command],
    ...overrides,
  };
}

/** 绑定实施计划并返回尚未执行实施迁移的测试工作项。 */
async function prepareWork(units, { workItemPath, packagePath, evidenceRef, packageExtras } = {}) {
  const repo = await fixtureRoot();
  const initialized = await initializeWork({ repo, args: {
    id: 'batch-work', stack: 'flutter', type: 'FOUNDATION', objective: '验证执行批次',
    ...(workItemPath ? { 'work-item': workItemPath } : {}),
  } });
  const workPath = initialized.metadata.workItemPath;
  const work = JSON.parse(await readFile(resolve(repo, workPath), 'utf8'));
  work.globalState = 'REVIEW';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };
  packagePath ??= '.workflow-control/implementation-packages/batch-work.json';
  const pack = {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    workItemType: work.workItemType, executionUnits: units, ...packageExtras,
  };
  work.implementationPackageRef = { path: packagePath };
  if (evidenceRef) work.evidenceRef = { path: evidenceRef };
  await putJson(repo, packagePath, pack);
  await putJson(repo, workPath, work);
  return { repo, workPath, packagePath, units };
}

/** 绑定有效实施计划并将测试工作项推进到 IMPLEMENTING。 */
async function startWork(units, options) {
  const context = await prepareWork(units, options);
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  return context;
}

/** 读取工作项，供断言当前控制器写入的修订状态。 */
async function readWork(repo, workPath) {
  return JSON.parse(await readFile(resolve(repo, workPath), 'utf8'));
}

/** 为一个单元写真实交付文件、命令输出和绑定完整的 PASS 结果。 */
async function writePassingResult(context, target, { missingOutput = false } = {}) {
  const work = await readWork(context.repo, context.workPath);
  if (!missingOutput) for (const path of target.paths) await put(context.repo, path);
  const outputFile = `${work.evidenceRoot}/command-${target.unitId}.txt`;
  await put(context.repo, outputFile, `${command}\nexitCode=0\n`);
  await putJson(context.repo, target.resultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: context.packagePath, unitId: target.unitId, sequence: target.sequence,
    exitCode: 0, files: [...target.paths],
    commandOutputs: [{ command, exitCode: 0, outputFile }],
  });
  return target.resultPath;
}

/** 读取 execution-state，避免测试重复拼接状态结构。 */
async function readExecutionState(context) {
  const work = await readWork(context.repo, context.workPath);
  return JSON.parse(await readFile(resolve(context.repo, work.evidenceRoot, 'execution-state.json'), 'utf8'));
}

test('串行、双单元并行、串行批次按计划依次开放且允许 B 先完成', async (t) => {
  const units = [
    unit('foundation', 1),
    unit('feature-a', 2, { parallelGroup: 'feature-work', dependsOn: ['foundation'] }),
    unit('feature-b', 3, { parallelGroup: 'feature-work', dependsOn: ['foundation'] }),
    unit('integration', 4, { type: 'INTEGRATION', dependsOn: ['feature-a', 'feature-b'] }),
  ];
  const context = await startWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));

  assert.deepEqual((await readExecutionState(context)).activeBatch, ['foundation']);
  const resultPaths = await Promise.all(units.map((target) => writePassingResult(context, target)));
  await assert.rejects(completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[1] }), /不属于当前批次/);

  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[0] });
  assert.deepEqual((await readExecutionState(context)).activeBatch, ['feature-a', 'feature-b']);
  await assert.rejects(completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[3] }), /不属于当前批次/);

  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[2] });
  assert.deepEqual((await readExecutionState(context)).activeBatch, ['feature-a', 'feature-b']);
  const status = inspect({ repo: context.repo, workItem: context.workPath });
  assert.equal(status.status, 'PASS');
  assert.deepEqual(status.metadata.activeBatch, ['feature-a', 'feature-b']);
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[1] });
  assert.deepEqual((await readExecutionState(context)).activeBatch, ['integration']);
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: resultPaths[3] });
  assert.deepEqual((await readExecutionState(context)).activeBatch, []);
});

test('拒绝并行路径冲突、glob、非法依赖、交错组、重复 ID 和共享单元', async (t) => {
  const base = [unit('foundation', 1)];
  const cases = [
    { name: '路径父子冲突', units: [unit('a', 1, { parallelGroup: 'g', paths: ['lib/shared'] }), unit('b', 2, { parallelGroup: 'g', paths: ['lib/shared/child.dart'] })], reason: /文件所有权冲突/ },
    { name: 'Windows 大小写路径冲突', units: [unit('a', 1, { parallelGroup: 'g', paths: ['lib/Shared.dart'] }), unit('b', 2, { parallelGroup: 'g', paths: ['lib/shared.dart'] })], reason: /文件所有权冲突/, windowsOnly: true },
    { name: '并行 glob 所有权', units: [unit('a', 1, { parallelGroup: 'g', paths: ['lib/a*.dart'] }), unit('b', 2, { parallelGroup: 'g', paths: ['lib/b.dart'] })], reason: /不能使用 glob/ },
    { name: '未知或未来依赖', units: [unit('a', 1, { dependsOn: ['b'] }), unit('b', 2)], reason: /更早批次/ },
    { name: '同组成员依赖', units: [unit('a', 1, { parallelGroup: 'g' }), unit('b', 2, { parallelGroup: 'g', dependsOn: ['a'] })], reason: /更早批次|相互依赖/ },
    { name: '分组交错', units: [base[0], unit('a', 2, { parallelGroup: 'g' }), unit('b', 3, { parallelGroup: 'g' }), unit('c', 4, { parallelGroup: 'h' }), unit('d', 5, { parallelGroup: 'g' })], reason: /连续出现/ },
    { name: '重复单元 ID', units: [unit('a', 1), unit('a', 2)], reason: /unitId 重复/ },
    { name: 'SHARED 不可并行', units: [unit('a', 1, { type: 'SHARED', parallelGroup: 'g' }), unit('b', 2, { parallelGroup: 'g' })], reason: /必须串行/ },
  ];

  for (const item of cases) {
    if (item.windowsOnly && process.platform !== 'win32') continue;
    const context = await prepareWork(item.units);
    t.after(() => rm(context.repo, { recursive: true, force: true }));
    await assert.rejects(
      transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} }),
      item.reason,
      item.name,
    );
  }
});

test('拒绝通过目录叶 Junction 或文件叶符号链接声明的并行路径', async (t) => {
  const directoryUnits = [
    unit('directory-one', 1, { parallelGroup: 'g', paths: ['lib/one'] }),
    unit('directory-two', 2, { parallelGroup: 'g', paths: ['lib/two'] }),
  ];
  const directoryContext = await prepareWork(directoryUnits);
  t.after(() => rm(directoryContext.repo, { recursive: true, force: true }));
  await put(directoryContext.repo, 'lib/one/placeholder.txt');
  await symlink(resolve(directoryContext.repo, 'lib/one'), resolve(directoryContext.repo, 'lib/two'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(
    transitionWork({ repo: directoryContext.repo, workItem: directoryContext.workPath, to: 'IMPLEMENTING', args: {} }),
    /符号链接或 Junction 祖先/,
    '目录路径本身是 Junction 时也不得并行授权',
  );

  const fileUnits = [
    unit('file-one', 1, { parallelGroup: 'g', paths: ['lib/one.dart'] }),
    unit('file-two', 2, { parallelGroup: 'g', paths: ['lib/two.dart'] }),
  ];
  const fileContext = await prepareWork(fileUnits);
  t.after(() => rm(fileContext.repo, { recursive: true, force: true }));
  await put(fileContext.repo, 'lib/one.dart');
  await symlink(resolve(fileContext.repo, 'lib/one.dart'), resolve(fileContext.repo, 'lib/two.dart'), process.platform === 'win32' ? 'file' : undefined);
  await assert.rejects(
    transitionWork({ repo: fileContext.repo, workItem: fileContext.workPath, to: 'IMPLEMENTING', args: {} }),
    /符号链接或 Junction 祖先/,
    '文件叶符号链接不得作为独立并行所有权',
  );

  const danglingUnits = [
    unit('dangling-one', 1, { parallelGroup: 'g', paths: ['lib/dangling/file.dart'] }),
    unit('dangling-two', 2, { parallelGroup: 'g', paths: ['lib/other.dart'] }),
  ];
  const danglingContext = await prepareWork(danglingUnits);
  t.after(() => rm(danglingContext.repo, { recursive: true, force: true }));
  await mkdir(resolve(danglingContext.repo, 'lib'), { recursive: true });
  await symlink(resolve(danglingContext.repo, 'lib/missing-target'), resolve(danglingContext.repo, 'lib/dangling'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(
    transitionWork({ repo: danglingContext.repo, workItem: danglingContext.workPath, to: 'IMPLEMENTING', args: {} }),
    /符号链接或 Junction 祖先/,
    '即使目标不存在，也应检查并拒绝悬空链接',
  );
});

test('拒绝指向已存在文件的并行硬链接别名', async (t) => {
  const units = [
    unit('file-one', 1, { parallelGroup: 'g', paths: ['lib/one.dart'] }),
    unit('file-two', 2, { parallelGroup: 'g', paths: ['lib/two.dart'] }),
  ];
  const context = await prepareWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  await put(context.repo, 'lib/one.dart');
  await link(resolve(context.repo, 'lib/one.dart'), resolve(context.repo, 'lib/two.dart'));
  await assert.rejects(
    transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} }),
    /硬链接别名/,
  );
});

test('串并行实施单元的结果路径不得重复、嵌套或覆盖控制文件', async (t) => {
  const root = '.workflow-control/evidence/batch-work';
  const cases = [
    { name: '串行同结果路径', units: [unit('a', 1, { resultPath: `${root}/same.json` }), unit('b', 2, { resultPath: `${root}/same.json` })], reason: /结果路径冲突/ },
    { name: '并行同结果路径', units: [unit('a', 1, { parallelGroup: 'g', resultPath: `${root}/same.json` }), unit('b', 2, { parallelGroup: 'g', resultPath: `${root}/same.json` })], reason: /结果路径冲突/ },
    { name: '结果路径父子嵌套', units: [unit('a', 1, { resultPath: `${root}/nested.json` }), unit('b', 2, { resultPath: `${root}/nested.json/child.json` })], reason: /结果路径冲突/ },
    { name: '执行状态文件覆盖', units: [unit('a', 1, { resultPath: `${root}/execution-state.json` })], reason: /保留控制文件冲突/ },
    { name: '执行状态文件子路径覆盖', units: [unit('a', 1, { resultPath: `${root}/execution-state.json/child.json` })], reason: /保留控制文件冲突/ },
    { name: 'Work Item 文件覆盖', units: [unit('a', 1, { resultPath: `${root}/work-item.json` })], options: { workItemPath: `${root}/work-item.json` }, reason: /保留控制文件冲突/ },
    { name: '实施包文件覆盖', units: [unit('a', 1, { resultPath: `${root}/implementation.json` })], options: { packagePath: `${root}/implementation.json` }, reason: /保留控制文件冲突/ },
    { name: 'Evidence 引用文件覆盖', units: [unit('a', 1, { resultPath: `${root}/manifest.json` })], options: { evidenceRef: `${root}/manifest.json` }, reason: /保留控制文件冲突/ },
    { name: 'Windows 结果路径大小写别名', units: [unit('a', 1, { resultPath: `${root}/same.json` }), unit('b', 2, { resultPath: `${root}/SAME.json` })], reason: /结果路径冲突/, windowsOnly: true },
    { name: 'Windows 执行状态路径大小写覆盖', units: [unit('a', 1, { resultPath: `${root}/EXECUTION-STATE.json` })], reason: /保留控制文件冲突/, windowsOnly: true },
  ];
  for (const item of cases) {
    if (item.windowsOnly && process.platform !== 'win32') continue;
    const context = await prepareWork(item.units, item.options);
    t.after(() => rm(context.repo, { recursive: true, force: true }));
    await assert.rejects(
      transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} }),
      item.reason,
      item.name,
    );
  }
});

test('实施包和执行单元拒绝旧 serial 字段及所有未声明字段', async (t) => {
  const cases = [
    { name: '带并行组的旧 serial 标记', units: [unit('a', 1, { parallelGroup: 'g', serial: true }), unit('b', 2, { parallelGroup: 'g' })], reason: /不支持字段：serial/ },
    { name: '拼错 parallelGroup', units: [unit('a', 1, { paralellGroup: 'g' })], reason: /不支持字段：paralellGroup/ },
    { name: '实施包未知字段', units: [unit('a', 1)], packageExtras: { description: '未知扩展' }, reason: /不支持字段：description/ },
  ];
  for (const item of cases) {
    const context = await prepareWork(item.units, { packageExtras: item.packageExtras });
    t.after(() => rm(context.repo, { recursive: true, force: true }));
    await assert.rejects(
      transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} }),
      item.reason,
      item.name,
    );
  }
});

test('缺少声明的真实交付文件时不能登记 PASS', async (t) => {
  const target = unit('deliverable', 1);
  const context = await startWork([target]);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const resultPath = await writePassingResult(context, target, { missingOutput: true });
  await assert.rejects(completeUnit({ repo: context.repo, workItem: context.workPath, resultPath }), /执行结果中报告的交付文件不存在/);
  assert.equal((await readExecutionState(context)).units[0].status, 'PENDING');
});

test('BLOCKED 恢复保留批次进度并重新核验已通过的结果', async (t) => {
  const units = [
    unit('feature-a', 1, { parallelGroup: 'feature-work' }),
    unit('feature-b', 2, { parallelGroup: 'feature-work' }),
  ];
  const context = await startWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const resultPath = await writePassingResult(context, units[0]);
  await writePassingResult(context, units[1]);
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'BLOCKED', args: { reason: '等待处理' } });

  const work = await readWork(context.repo, context.workPath);
  await unlink(resolve(context.repo, units[0].paths[0]));
  await assert.rejects(
    transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: { 'return-resolution': '阻断已处理' } }),
    /执行结果中报告的交付文件不存在/,
  );
  await put(context.repo, units[0].paths[0]);
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: { 'return-resolution': '阻断已处理' } });
  assert.deepEqual((await readExecutionState(context)).activeBatch, ['feature-a', 'feature-b']);
  assert.equal(work.globalState, 'BLOCKED');
});

test('计划分组改动后旧 Execution State 不可继续消费', async (t) => {
  const units = [
    unit('a', 1, { parallelGroup: 'original' }),
    unit('b', 2, { parallelGroup: 'original' }),
  ];
  const context = await startWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const changed = JSON.parse(await readFile(resolve(context.repo, context.packagePath), 'utf8'));
  changed.executionUnits.forEach((entry) => { entry.parallelGroup = 'changed'; });
  await putJson(context.repo, context.packagePath, changed);
  const status = inspect({ repo: context.repo, workItem: context.workPath });
  assert.ok(status.blocking.some((reason) => reason.includes('冻结的执行计划')));
  await assert.rejects(completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: units[0].resultPath }), /冻结的执行计划/);
});

test('未来批次即使有有效结果也不能提前登记 PASS', async (t) => {
  const units = [unit('current', 1), unit('future', 2)];
  const context = await startWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const currentResult = await writePassingResult(context, units[0]);
  await writePassingResult(context, units[1]);
  const work = await readWork(context.repo, context.workPath);
  const statePath = resolve(context.repo, work.evidenceRoot, 'execution-state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  state.units[1].status = 'PASS';
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  const status = inspect({ repo: context.repo, workItem: context.workPath });
  const check = inspect({ repo: context.repo, workItem: context.workPath, check: true });
  assert.ok(status.blocking.some((reason) => reason.includes('未来执行批次不能预先登记 PASS')));
  assert.ok(check.blocking.some((reason) => reason.includes('未来执行批次不能预先登记 PASS')));
  await assert.rejects(completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: currentResult }), /未来执行批次不能预先登记 PASS/);

  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'BLOCKED', args: { reason: '检查非法进度记录' } });
  await assert.rejects(
    transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: { 'return-resolution': '记录已复核' } }),
    /未来执行批次不能预先登记 PASS/,
  );
});

test('并发提交不丢同批 PASS，BUSY 调用可重试且只读状态不建锁', async (t) => {
  const units = [
    unit('a', 1, { parallelGroup: 'feature-work' }),
    unit('b', 2, { parallelGroup: 'feature-work' }),
  ];
  const context = await startWork(units);
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const work = await readWork(context.repo, context.workPath);
  const lockPath = resolve(context.repo, `${context.workPath}.lock`);
  assert.equal(existsSync(lockPath), false);
  const status = inspect({ repo: context.repo, workItem: context.workPath });
  const check = inspect({ repo: context.repo, workItem: context.workPath, check: true });
  assert.deepEqual(status.metadata.activeBatch, ['a', 'b']);
  assert.equal(check.status, 'BLOCKED');
  assert.deepEqual(check.metadata.activeBatch, ['a', 'b']);
  assert.equal(existsSync(lockPath), false);

  const resultPaths = await Promise.all(units.map((target) => writePassingResult(context, target)));
  const first = await Promise.allSettled(resultPaths.map((resultPath) => completeUnit({ repo: context.repo, workItem: context.workPath, resultPath })));
  const rejected = first.filter((entry) => entry.status === 'rejected');
  for (const entry of rejected) assert.equal(entry.reason.code, 'BUSY');
  // BUSY 只表示未取得锁；按原结果路径重试即可幂等完成尚未写入的同批单元。
  const stateAfterRace = await readExecutionState(context);
  for (const target of units) {
    if (stateAfterRace.units.find((entry) => entry.unitId === target.unitId).status === 'PENDING') {
      await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: target.resultPath });
    }
  }
  assert.ok((await readExecutionState(context)).units.every((entry) => entry.status === 'PASS'));
  assert.equal(existsSync(lockPath), false);
  assert.ok(work.revision < (await readWork(context.repo, context.workPath)).revision);
});
