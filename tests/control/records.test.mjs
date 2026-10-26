import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { advanceVisual, completeUnit, initializeWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { validateEvidence } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';

const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

/** 创建独立临时项目并准备可冻结的工作项。 */
async function createFixture({ id = 'records-sample', type = 'FOUNDATION', state = 'REVIEW' } = {}) {
  const repo = await mkdtemp(resolve(tmpdir(), 'app-workflow-records-'));
  const initialized = await initializeWork({
    repo,
    args: { id, stack: 'flutter', type, objective: '验证自动生成计划与执行记录' },
  });
  const workPath = initialized.metadata.workItemPath;
  const work = await readJson(repo, workPath);
  work.globalState = state;
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  return { repo, workPath };
}

/** 读取临时项目中的 JSON 文件。 */
async function readJson(repo, path) {
  return JSON.parse(await readFile(resolve(repo, ...path.split('/')), 'utf8'));
}

/** 在临时项目内写入普通文件并创建父目录。 */
async function put(repo, path, content = '用于测试的非空文件\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return path;
}

/** 将 JSON 记录写入临时项目并保留固定缩进。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 为视觉资源人工验收建立五项带文件依据的质量检查。 */
async function createQualityChecks(repo, prefix) {
  const checks = [];
  for (const dimension of qualityDimensions) {
    const evidenceRef = `${prefix}/${dimension}.txt`;
    await put(repo, evidenceRef, `${dimension} 已检查。\n`);
    checks.push({ dimension, status: 'PASS', evidenceRef });
  }
  return checks;
}

/** 生成最小计划单元，调用者可覆盖路径和批次字段。 */
function unit(unitId, overrides = {}) {
  return {
    unitId,
    owner: 'main-agent',
    paths: [`lib/${unitId}.dart`],
    acceptanceCommands: ['node --version'],
    ...overrides,
  };
}

/** 写入计划并调用 records API，返回新冻结的工作项。 */
async function prepare(fixture, executionUnits, extra = {}) {
  const planPath = 'docs/work-plan.json';
  await putJson(fixture.repo, planPath, { executionUnits, ...extra });
  const result = await prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath });
  return { result, planPath, work: await loadWork(fixture.repo, fixture.workPath) };
}

/** 启动已计划工作项并返回当前冻结单元。 */
async function start(fixture, executionUnits) {
  const prepared = await prepare(fixture, executionUnits);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  const work = await loadWork(fixture.repo, fixture.workPath);
  return { ...prepared, work, pack: await readJson(fixture.repo, work.implementationPackageRef.path) };
}

/** 写入真实文件形状的报告输入与命令日志，供记录 API 校验。 */
async function writeReport(fixture, work, unitId, { exitCode = 0, evidence = [], reportPath = 'docs/execution-report.json' } = {}) {
  const pack = await readJson(fixture.repo, work.implementationPackageRef.path);
  const plannedUnit = pack.executionUnits.find((entry) => entry.unitId === unitId);
  const outputFile = `${work.evidenceRoot}/command-${unitId}.log`;
  await put(fixture.repo, plannedUnit.paths[0].replace(/\/$/, '') + (plannedUnit.paths[0].includes('.') ? '' : '/actual.dart'));
  await put(fixture.repo, outputFile, 'node --version\nv22\n');
  const report = {
    files: [plannedUnit.paths[0].includes('.') ? plannedUnit.paths[0] : `${plannedUnit.paths[0]}/actual.dart`],
    commandOutputs: [{ command: plannedUnit.acceptanceCommands[0], exitCode, outputFile }],
    evidence,
  };
  await putJson(fixture.repo, reportPath, report);
  return { reportPath, report, outputFile, unit: plannedUnit };
}

test('从 Work Item 推导包身份、阶段、序号与结果路径，并收窄允许范围', async (t) => {
  const fixture = await createFixture({ id: 'page-records', type: 'PAGE', state: 'PROPOSAL' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const workBefore = await loadWork(fixture.repo, fixture.workPath);
  workBefore.gateStatus.F0 = 'NOT_RUN';
  workBefore.gateStatus.F1 = 'FAIL';
  workBefore.gateStatus.F2 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, workBefore);

  const { result, planPath, work } = await prepare(fixture, [unit('screen', { type: 'PAGE' })], {
    gateAssessments: { F0: { status: 'PASS', reason: '需求范围已核实' } },
  });
  const pack = await readJson(fixture.repo, work.implementationPackageRef.path);
  const manifest = await readJson(fixture.repo, work.evidenceRef.path);

  assert.equal(result.status, 'PASS');
  assert.equal(work.planningRef.path, planPath);
  assert.deepEqual(work.allowedPaths, ['lib/screen.dart']);
  assert.deepEqual(work.gateStatus, { F0: 'PASS', F1: 'FAIL', F2: 'NOT_RUN', F3: 'NOT_RUN', F4: 'NOT_RUN' });
  assert.equal(pack.workItemId, 'page-records');
  assert.equal(pack.stack, 'flutter');
  assert.equal(pack.workItemType, 'PAGE');
  assert.equal(pack.visualStage, 'V0');
  assert.equal(pack.executionUnits[0].sequence, 1);
  assert.equal(pack.executionUnits[0].type, 'PAGE');
  assert.equal(pack.executionUnits[0].resultPath, `${work.evidenceRoot}/unit-screen.json`);
  assert.equal(manifest.implementationPackageRef, work.implementationPackageRef.path);
  assert.deepEqual(manifest.items, []);
});

test('拒绝身份注入、未知字段、越界路径和覆盖控制记录的单元路径', async (t) => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const maliciousPlan = {
    workItemId: 'spoofed',
    executionUnits: [unit('one')],
  };
  await putJson(fixture.repo, 'docs/spoofed-plan.json', maliciousPlan);
  await assert.rejects(
    prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: 'docs/spoofed-plan.json' }),
    /未知字段/,
  );

  await putJson(fixture.repo, 'docs/unknown-plan.json', { executionUnits: [unit('one', { resultPath: 'arbitrary.json' })] });
  await assert.rejects(
    prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: 'docs/unknown-plan.json' }),
    /未知字段/,
  );

  await putJson(fixture.repo, 'docs/outside-plan.json', { executionUnits: [unit('one', { paths: ['outside/file.dart'] })] });
  await assert.rejects(
    prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: 'docs/outside-plan.json' }),
    /allowedPaths/,
  );

  await putJson(fixture.repo, 'docs/control-plan.json', { executionUnits: [unit('one', { paths: [fixture.workPath] })] });
  await assert.rejects(
    prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: 'docs/control-plan.json' }),
    /控制记录/,
  );
  assert.equal((await loadWork(fixture.repo, fixture.workPath)).implementationPackageRef, null);
});

test('锁冲突和已占用目标不覆盖文件；冻结校验失败会回滚本次新建文件', async (t) => {
  const locked = await createFixture({ id: 'locked-records' });
  t.after(() => rm(locked.repo, { recursive: true, force: true }));
  await putJson(locked.repo, 'docs/work-plan.json', { executionUnits: [unit('one')] });
  await put(locked.repo, `${locked.workPath}.lock`, 'another writer\n');
  await assert.rejects(
    prepareWorkRecords({ repo: locked.repo, workItem: locked.workPath, planPath: 'docs/work-plan.json' }),
    { code: 'BUSY' },
  );
  assert.equal((await loadWork(locked.repo, locked.workPath)).implementationPackageRef, null);

  const conflict = await createFixture({ id: 'conflict-records' });
  t.after(() => rm(conflict.repo, { recursive: true, force: true }));
  const occupiedPath = '.workflow-control/implementation-packages/conflict-records-r1.json';
  await put(conflict.repo, occupiedPath, 'leave this file unchanged\n');
  await putJson(conflict.repo, 'docs/work-plan.json', { executionUnits: [unit('one')] });
  await assert.rejects(
    prepareWorkRecords({ repo: conflict.repo, workItem: conflict.workPath, planPath: 'docs/work-plan.json' }),
    { code: 'ALREADY_EXISTS' },
  );
  assert.equal(await readFile(resolve(conflict.repo, ...occupiedPath.split('/')), 'utf8'), 'leave this file unchanged\n');

  const duplicate = await createFixture({ id: 'duplicate-records' });
  t.after(() => rm(duplicate.repo, { recursive: true, force: true }));
  await putJson(duplicate.repo, 'docs/work-plan.json', {
    executionUnits: [unit('same', { paths: ['lib/first.dart'] }), unit('same', { paths: ['lib/second.dart'] })],
  });
  await assert.rejects(
    prepareWorkRecords({ repo: duplicate.repo, workItem: duplicate.workPath, planPath: 'docs/work-plan.json' }),
    /unitId 重复/,
  );
  await assert.rejects(readFile(resolve(duplicate.repo, '.workflow-control/implementation-packages/duplicate-records-r1.json')));
  await assert.rejects(readFile(resolve(duplicate.repo, '.workflow-control/evidence/duplicate-records/manifest.json')));

  const rollback = await createFixture({ id: 'rollback-records', type: 'PAGE' });
  t.after(() => rm(rollback.repo, { recursive: true, force: true }));
  const conflictingUnits = [
    unit('one', { type: 'PAGE', paths: ['lib/shared.dart'], parallelGroup: 'same-batch' }),
    unit('two', { type: 'PAGE', paths: ['lib/shared.dart'], parallelGroup: 'same-batch' }),
  ];
  await putJson(rollback.repo, 'docs/work-plan.json', { executionUnits: conflictingUnits });
  await assert.rejects(prepareWorkRecords({ repo: rollback.repo, workItem: rollback.workPath, planPath: 'docs/work-plan.json' }), /冲突/);
  const rollbackWork = await loadWork(rollback.repo, rollback.workPath);
  assert.equal(rollbackWork.implementationPackageRef, null);
  assert.equal(rollbackWork.evidenceRef, null);
  await assert.rejects(readFile(resolve(rollback.repo, '.workflow-control/implementation-packages/rollback-records-r1.json')));
  await assert.rejects(readFile(resolve(rollback.repo, '.workflow-control/evidence/rollback-records/manifest.json')));
  await assert.rejects(readdir(resolve(rollback.repo, '.workflow-control/evidence/rollback-records')), { code: 'ENOENT' });
  await putJson(rollback.repo, 'docs/work-plan.json', { executionUnits: [unit('one')] });
  const retry = await prepareWorkRecords({ repo: rollback.repo, workItem: rollback.workPath, planPath: 'docs/work-plan.json' });
  assert.equal(retry.status, 'PASS');
  assert.equal((await loadWork(rollback.repo, rollback.workPath)).implementationPackageRef.path, '.workflow-control/implementation-packages/rollback-records-r1.json');
});

test('RETURN 后使用新计划源和 evidenceRoot 可冻结同一工作项的新包', async (t) => {
  const fixture = await createFixture({ id: 'return-replan' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const initial = await prepare(fixture, [unit('one')]);
  const oldPackagePath = initial.work.implementationPackageRef.path;
  const oldEvidenceRoot = initial.work.evidenceRoot;
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  await transitionWork({
    repo: fixture.repo,
    workItem: fixture.workPath,
    to: 'RETURN',
    args: { reason: '实现范围需要修订', 'affected-scope': 'implementation' },
  });
  const returned = await loadWork(fixture.repo, fixture.workPath);
  assert.notEqual(returned.evidenceRoot, oldEvidenceRoot);
  assert.ok(returned.invalidatedRefs.some((reference) => reference.path === oldPackagePath));
  await transitionWork({
    repo: fixture.repo,
    workItem: fixture.workPath,
    to: 'REVIEW',
    args: { 'return-resolution': '修订范围已复核' },
  });

  const newPlanPath = 'docs/revised-work-plan.json';
  await putJson(fixture.repo, newPlanPath, { executionUnits: [unit('one')] });
  await prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: newPlanPath });
  const replanned = await loadWork(fixture.repo, fixture.workPath);
  assert.equal(replanned.planningRef.path, newPlanPath);
  assert.notEqual(replanned.implementationPackageRef.path, oldPackagePath);
  assert.notEqual(replanned.evidenceRoot, oldEvidenceRoot);
  assert.equal((await readJson(fixture.repo, replanned.evidenceRef.path)).items.length, 0);
});

test('V3→V4 阶段归档能授权重计划，未作废历史包仍会阻断', async (t) => {
  const fixture = await createFixture({ id: 'visual-replan', type: 'PAGE', state: 'PROPOSAL' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await loadWork(fixture.repo, fixture.workPath);
  work.globalState = 'PASSED';
  work.visual.stage = 'V3';
  work.visual.candidateId = 'candidate-v3';
  for (const gate of ['F0', 'F1', 'F2', 'F3']) work.gateStatus[gate] = 'PASS';
  const oldPackagePath = '.workflow-control/implementation-packages/visual-replan-r1.json';
  const oldPlanPath = 'docs/v3-work-plan.json';
  const manifestPath = `${work.evidenceRoot}/manifest.json`;
  const pack = {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    workItemType: work.workItemType, visualStage: 'V3',
    executionUnits: [{
      unitId: 'v3', sequence: 1, type: 'PAGE', owner: 'visual-agent', paths: ['lib/page.dart'],
      resultPath: `${work.evidenceRoot}/unit-v3.json`, acceptanceCommands: ['node --version'],
    }],
  };
  await putJson(fixture.repo, oldPlanPath, { executionUnits: [unit('v3', { type: 'PAGE', paths: ['lib/page.dart'] })] });
  await putJson(fixture.repo, oldPackagePath, pack);
  work.implementationPackageRef = { path: oldPackagePath };
  work.planningRef = { path: oldPlanPath };
  work.evidenceRef = { path: manifestPath };
  const profile = loadProfile(fixture.repo, work.stack);
  const items = [];
  for (const category of [...profile.evidenceRequirements.engineering, ...(profile.evidenceRequirements.assetImport ?? [])]) {
    const path = `${work.evidenceRoot}/engineering-${category}.txt`;
    await put(fixture.repo, path, `${category} 已通过。\n`);
    items.push({ category, status: 'PASS', path });
  }
  const componentPath = 'lib/page.dart';
  const componentEvidencePath = `${work.evidenceRoot}/component-check.txt`;
  await put(fixture.repo, componentPath, 'class Page {}\n');
  await put(fixture.repo, componentEvidencePath, '原生组件已检查。\n');
  const userMessageRef = 'chat://v3-assets-reviewed';
  const assetReviewPath = 'reviews/v3-assets.json';
  await putJson(fixture.repo, assetReviewPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V3',
    candidateId: work.visual.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef,
    qualityChecks: await createQualityChecks(fixture.repo, 'reviews/v3-quality'),
    assets: [{ assetId: 'native-page', assetType: 'native-component', output: componentPath, componentEvidenceRef: componentEvidencePath }],
  });
  work.assetReviewRef = { path: assetReviewPath };
  const v3ReviewPath = 'reviews/v3-human-review.json';
  await putJson(fixture.repo, v3ReviewPath, {
    schemaVersion: '1.0', objectId: work.visual.objectId, candidateId: work.visual.candidateId,
    stage: 'V3', purpose: 'imported-assets', decision: 'APPROVED', userMessageRef,
  });
  work.visual.reviews.V3 = { path: v3ReviewPath };
  await putJson(fixture.repo, manifestPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: oldPackagePath, visualStage: 'V3', items,
  });
  await putJson(fixture.repo, fixture.workPath, work);

  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V4' });
  work = await loadWork(fixture.repo, fixture.workPath);
  assert.equal(work.visual.stage, 'V4');
  assert.ok(work.invalidatedRefs.some((reference) => reference.path === oldPackagePath));
  // 移除直接失效索引，确认阶段归档本身也能证明该包已过期。
  work.invalidatedRefs = [];
  await putJson(fixture.repo, fixture.workPath, work);

  const newPlanPath = 'docs/v4-work-plan.json';
  await putJson(fixture.repo, newPlanPath, { executionUnits: [unit('v4', { type: 'PAGE', paths: ['lib/page.dart'] })] });
  await prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath: newPlanPath });
  const replanned = await loadWork(fixture.repo, fixture.workPath);
  assert.equal(replanned.planningRef.path, newPlanPath);
  assert.equal((await readJson(fixture.repo, replanned.implementationPackageRef.path)).visualStage, 'V4');

  const orphan = await createFixture({ id: 'orphan-replan' });
  t.after(() => rm(orphan.repo, { recursive: true, force: true }));
  const orphanWork = await loadWork(orphan.repo, orphan.workPath);
  orphanWork.revision = 1;
  await putJson(orphan.repo, orphan.workPath, orphanWork);
  const orphanPackPath = '.workflow-control/implementation-packages/orphan-replan-r1.json';
  await putJson(orphan.repo, orphanPackPath, {
    schemaVersion: '1.0', workItemId: 'orphan-replan', stack: 'flutter', workItemType: 'FOUNDATION',
    executionUnits: [{ unitId: 'old', sequence: 1, type: 'MODULE', owner: 'old-owner', paths: ['lib/old.dart'], resultPath: '.workflow-control/evidence/orphan-replan-old/unit-old.json', acceptanceCommands: ['node --version'] }],
  });
  await putJson(orphan.repo, 'docs/work-plan.json', { executionUnits: [unit('new')] });
  await assert.rejects(
    prepareWorkRecords({ repo: orphan.repo, workItem: orphan.workPath, planPath: 'docs/work-plan.json' }),
    /未登记或未作废/,
  );
});

test('失败命令不能生成 PASS，原报告与日志保留', async (t) => {
  const fixture = await createFixture({ id: 'failed-command' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work } = await start(fixture, [unit('one')]);
  const { reportPath, outputFile, unit: planned } = await writeReport(fixture, work, 'one', { exitCode: 2 });
  const manifestBefore = await readFile(resolve(fixture.repo, ...work.evidenceRef.path.split('/')));
  await assert.rejects(
    recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath }),
    /命令失败/,
  );
  assert.equal((await loadWork(fixture.repo, fixture.workPath)).gateStatus.F3, 'NOT_RUN');
  assert.deepEqual(await readFile(resolve(fixture.repo, ...work.evidenceRef.path.split('/'))), manifestBefore);
  await assert.rejects(readFile(resolve(fixture.repo, ...planned.resultPath.split('/'))));
  assert.ok((await readFile(resolve(fixture.repo, ...reportPath.split('/')))).length > 0);
  assert.ok((await readFile(resolve(fixture.repo, ...outputFile.split('/')))).length > 0);
});

test('只允许当前批次单元登记，未来批次和已完成单元均拒绝', async (t) => {
  const fixture = await createFixture({ id: 'batch-records' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work, pack } = await start(fixture, [unit('one'), unit('two')]);
  await assert.rejects(
    recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'two', reportPath: 'docs/not-created.json' }),
    /当前活动批次/,
  );
  const firstReport = await writeReport(fixture, work, 'one');
  await recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: firstReport.reportPath });
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: pack.executionUnits[0].resultPath });
  await assert.rejects(
    recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: firstReport.reportPath }),
    /当前活动批次/,
  );
  assert.ok((await loadWork(fixture.repo, fixture.workPath)).evidenceRef.path.endsWith('/manifest.json'));
});

test('有效结果可被既有 unit-check 和 Evidence Manifest 校验器消费', async (t) => {
  const fixture = await createFixture({ id: 'valid-records' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work, pack } = await start(fixture, [unit('one')]);
  const profile = loadProfile(fixture.repo, work.stack);
  const evidence = [];
  for (const category of profile.evidenceRequirements.engineering) {
    const path = `${work.evidenceRoot}/evidence-${category}.txt`;
    await put(fixture.repo, path, `实际记录：${category}\n`);
    evidence.push({ category, path });
  }
  const report = await writeReport(fixture, work, 'one', { evidence });
  const recorded = await recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: report.reportPath });
  assert.equal(recorded.metadata.recordedUnit, 'one');
  assert.equal((await loadWork(fixture.repo, fixture.workPath)).gateStatus.F3, 'NOT_RUN');

  const afterRecord = await loadWork(fixture.repo, fixture.workPath);
  const manifestResult = validateEvidence(fixture.repo, afterRecord);
  assert.equal(manifestResult.manifest.items.length, evidence.length);
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: pack.executionUnits[0].resultPath });
  assert.equal((await readJson(fixture.repo, `${work.evidenceRoot}/execution-state.json`)).units[0].status, 'PASS');
});

test('RELEASE.prepare 可用记录器合并正式准备材料并按既有门禁关闭', async (t) => {
  const fixture = await createFixture({ id: 'release-records', type: 'RELEASE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work, pack } = await start(fixture, [unit('release', { type: 'RELEASE', paths: ['lib/release.dart'] })]);
  const profile = loadProfile(fixture.repo, work.stack);
  const evidence = [];
  for (const category of profile.evidenceRequirements.engineering) {
    const path = `${work.evidenceRoot}/evidence-${category}.txt`;
    await put(fixture.repo, path, `发布前真实记录：${category}\n`);
    evidence.push({ category, path });
  }
  const deliverablePath = `${work.evidenceRoot}/release-readiness.md`;
  const preparationEvidencePath = `${work.evidenceRoot}/release-checks.txt`;
  const preparationResultPath = `${work.evidenceRoot}/release-preparation.json`;
  await put(fixture.repo, deliverablePath, '目标环境、版本和回滚方案已逐项核对。\n');
  await put(fixture.repo, preparationEvidencePath, '签名、第三方参数与发布配置核对结果。\n');
  await putJson(fixture.repo, preparationResultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    stageId: 'release', deliverablePath, evidencePath: preparationEvidencePath,
  });
  evidence.push({ category: 'release-preparation', path: preparationResultPath });

  const report = await writeReport(fixture, work, 'release', { evidence });
  await recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'release', reportPath: report.reportPath });
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: pack.executionUnits[0].resultPath });
  const afterRecord = await loadWork(fixture.repo, fixture.workPath);
  afterRecord.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, afterRecord);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: {} });
  const completed = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });

  assert.equal(completed.stage, 'release/COMPLETE');
  assert.equal(completed.metadata.workflowView.completionKind, 'release-prepared');
  const manifest = await readJson(fixture.repo, (await loadWork(fixture.repo, fixture.workPath)).evidenceRef.path);
  assert.ok(manifest.items.some((item) => item.category === 'release-preparation' && item.path === preparationResultPath));
});

test('提交前检测 Evidence Manifest 并发更新并保留另一写者的条目', async (t) => {
  const fixture = await createFixture({ id: 'manifest-race' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work, pack } = await start(fixture, [unit('one')]);
  const report = await writeReport(fixture, work, 'one');
  const concurrentEvidence = `${work.evidenceRoot}/concurrent-evidence.txt`;
  await put(fixture.repo, concurrentEvidence, '另一写者已保存的真实材料。\n');
  const manifestAbsolute = resolve(fixture.repo, ...work.evidenceRef.path.split('/'));
  const resultAbsolute = resolve(fixture.repo, ...pack.executionUnits[0].resultPath.split('/'));
  const originalLinkSync = fs.linkSync;
  const concurrentManifest = {
    ...(await readJson(fixture.repo, work.evidenceRef.path)),
    items: [{ category: 'tests', status: 'PASS', path: concurrentEvidence }],
  };
  const concurrentBytes = Buffer.from(`${JSON.stringify(concurrentManifest, null, 2)}\n`, 'utf8');
  let injected = false;
  fs.linkSync = function (...args) {
    const linked = originalLinkSync.apply(this, args);
    if (!injected && resolve(String(args[1])) === resultAbsolute) {
      injected = true;
      fs.writeFileSync(manifestAbsolute, concurrentBytes);
    }
    return linked;
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(
      recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: report.reportPath }),
      { code: 'CONCURRENT_MODIFICATION' },
    );
  } finally {
    fs.linkSync = originalLinkSync;
    syncBuiltinESMExports();
  }

  assert.equal(injected, true);
  assert.deepEqual(await readFile(manifestAbsolute), concurrentBytes);
  await assert.rejects(readFile(resultAbsolute));
  assert.ok((await readFile(resolve(fixture.repo, ...report.reportPath.split('/')))).length > 0);
});

test('报告不能把 manifest 当证据，也不能自我证明', async (t) => {
  const fixture = await createFixture({ id: 'self-reference' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const { work } = await start(fixture, [unit('one')]);
  await putJson(fixture.repo, 'docs/injected-report.json', {
    workItemId: 'spoofed', files: ['lib/one.dart'], commandOutputs: [], evidence: [],
  });
  await assert.rejects(
    recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath: 'docs/injected-report.json' }),
    /未知字段/,
  );
  const manifestPath = `${work.evidenceRoot}/manifest.json`;
  const { reportPath } = await writeReport(fixture, work, 'one', {
    evidence: [{ category: 'tests', path: manifestPath }],
  });
  await assert.rejects(
    recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'one', reportPath }),
    /不能引用工作流记录/,
  );
  await assert.rejects(readFile(resolve(fixture.repo, ...packResultPath(work, 'one').split('/'))));
});

/** 由当前 Work Item 证据根推导测试结果文件位置。 */
function packResultPath(work, unitId) {
  return `${work.evidenceRoot}/unit-${unitId}.json`;
}
