import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, assertFunctionBaseline, completeUnit, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import { prepareFlutterModuleV5 } from './module-design-fixture.mjs';
import { writeSingleDomainFixture } from './single-domain-fixture.mjs';
import { createFixture, put, putJson, readWork, putVisualReview, reviewRecord, frozenReview, prepareFormalVisualFixture, bindImplementation, submitPassingUnits, bindEvidence } from './controller-fixture.mjs';

/** 通过正式基础工程和 V2 门禁，建立等待 V5 执行的隔离模块。 */
async function prepareRegression(t) {
  const fixture = await createFixture({ id: 'local-regression', type: 'PAGE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  await prepareFlutterModuleV5(fixture);
  return fixture;
}

/** 为首次 V5 验收绑定已确认界面对应的合成运行证据。 */
async function bindRuntimeReview({ repo, workPath }, work) {
  const target = await readWork(repo, work.visual.reviews.V2.path);
  const output = await put(repo, `${work.evidenceRoot}/runtime.txt`, '本轮合成运行结果\n');
  const path = `${work.evidenceRoot}/runtime-review.json`;
  await putVisualReview(repo, path, reviewRecord({ objectId: work.visual.objectId, candidateId: work.visual.candidateId,
    stage: 'V5', purpose: 'runtime-acceptance', userMessageRef: 'test://runtime', targetRef: output,
  }), work.workItemId, target.referenceTarget.path);
  work.visual.reviews.V5 = await frozenReview(repo, path);
  await writeSingleDomainFixture(repo, work, 'V5');
  await putJson(repo, workPath, work);
}

/** 在 V5 本轮实施包中完成实际校验单元，按需推进到冻结运行证据的 PASSED。 */
async function verifyImplementation(fixture, { additionalVisualEvidence = false, beforePassed } = {}) {
  const { repo, workPath } = fixture;
  let work = await readWork(repo, workPath);
  work.gateStatus.F2 = 'PASS';
  await bindRuntimeReview(fixture, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
  work = await readWork(repo, workPath);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'V5', unitPaths: ['lib/sample.dart', 'lib/visual.dart'] });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  for (const unit of units) await completeUnit({ repo, workItem: workPath, resultPath: unit.resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage: 'V5' });
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  if (additionalVisualEvidence) {
    // 视觉材料可在验证态补齐，真正冻结发生在本轮所有验收通过时。
    const manifest = await readWork(repo, work.evidenceRef.path);
    const path = await put(repo, `${work.evidenceRoot}/extra-visual.txt`, '后补合成视觉证据');
    manifest.items.push({ category: 'visual-supplement', status: 'PASS', path });
    await putJson(repo, work.evidenceRef.path, manifest);
  }
  if (beforePassed) await beforePassed(work, units);
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  return { work: await readWork(repo, workPath), units };
}

test('V5 通过前可补视觉证据，通过后冻结交付源码、运行结果和原始命令输出', async (t) => {
  const fixture = await prepareRegression(t);
  const { repo, workPath } = fixture;
  const { work, units } = await verifyImplementation(fixture, { additionalVisualEvidence: true,
    async beforePassed(_, [unit]) {
      const result = await readWork(repo, unit.resultPath);
      const path = result.commandOutputs[0].outputFile;
      const original = await readFile(resolve(repo, path), 'utf8');
      await put(repo, path, '');
      await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} }), /验收命令.*输出/);
      await put(repo, path, original);
    },
  });
  const runtime = await readWork(repo, work.visual.moduleRuntimeRef.path);
  assert.ok(runtime.evidence.some((ref) => ref.path.endsWith('/extra-visual.txt')));
  const result = await readWork(repo, units[0].resultPath);
  const paths = ['lib/sample.dart', 'lib/visual.dart', units[0].resultPath, result.commandOutputs[0].outputFile];
  for (const path of paths) await t.test(path, async () => {
    const original = await readFile(resolve(repo, path), 'utf8');
    await put(repo, path, '冻结后修改内容');
    try {
      await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} }), /V5 模块验收证据已变化/);
      assert.equal((await readWork(repo, workPath)).globalState, 'PASSED');
    } finally {
      await put(repo, path, original);
    }
  });
  assert.doesNotThrow(() => assertFunctionBaseline(repo, work));
});

test('修改 V5 实现后通过返修重新登记执行，沿用已冻结的模块设计', async (t) => {
  const fixture = await prepareRegression(t);
  const { repo, workPath } = fixture;
  const { work: passed } = await verifyImplementation(fixture);
  const previousManifest = await readWork(repo, passed.evidenceRef.path);
  await put(repo, 'lib/sample.dart', 'V5 实现返修后的源码');
  await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} }), /V5 模块验收证据已变化/);
  await transitionWork({ repo, workItem: workPath, to: 'RETURN', args: { reason: '本轮实现有误', 'affected-scope': 'implementation' } });
  let work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V5');
  assert.deepEqual(work.visual.versionDesignSnapshotRef, passed.visual.versionDesignSnapshotRef);
  assert.deepEqual(work.visual.moduleDesignReviewRef, passed.visual.moduleDesignReviewRef);
  assert.equal(work.visual.moduleRuntimeRef, undefined);
  // 重新挂接上游已确认稿以进入实施。新的运行确认在本轮实施后提供。
  const { versionVisualSnapshot } = await readWork(repo, work.visual.versionDesignSnapshotRef.path);
  work.visual.domainEvidenceRef = versionVisualSnapshot.visual.domainEvidenceRef;
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '保留确认稿，重新执行 V5 验收' } });
  work = await readWork(repo, workPath);
  const executionUnits = [{ unitId: 'regression', type: 'PAGE', owner: 'executor', paths: ['lib/sample.dart'], acceptanceCommands: ['node --version'] }];
  const planPath = await putJson(repo, 'docs/v5-repair-plan.json', { executionUnits, systemCoverage: createSystemCoverage(repo, work, executionUnits) });
  await prepareWorkRecords({ repo, workItem: workPath, planPath });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  const pack = await readWork(repo, work.implementationPackageRef.path);
  assert.notEqual(work.evidenceRoot, passed.evidenceRoot);
  assert.notEqual(work.implementationPackageRef.path, passed.implementationPackageRef.path);
  const execution = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(execution.status, 0, execution.stderr);
  const outputFile = await put(repo, `${work.evidenceRoot}/regression.log`, execution.stdout);
  // 新一轮证据由记录器归档到当前目录，旧报告仍保留原样。
  const evidence = await Promise.all(previousManifest.items.map(async ({ category }) => ({
    category, path: await put(repo, `${work.evidenceRoot}/validated-${category}.txt`, '本轮回归证据'),
  })));
  const reportPath = await putJson(repo, 'docs/v5-repair-report.json', { files: ['lib/sample.dart'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile }], evidence });
  await recordWorkResult({ repo, workItem: workPath, unitId: 'regression', reportPath });
  await completeUnit({ repo, workItem: workPath, resultPath: pack.executionUnits[0].resultPath });
  work = await readWork(repo, workPath);
  work.gateStatus.F3 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  assert.equal((await readWork(repo, workPath)).globalState, 'VALIDATING');
  assert.deepEqual(await readWork(repo, passed.evidenceRef.path), previousManifest);
});

test('V5 按冻结方案拒绝遗漏验收命令，单元记录仍须绑定本轮所有权及命令输出', async (t) => {
  const { repo, workPath } = await prepareRegression(t);
  let work = await readWork(repo, workPath);
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
  work = await readWork(repo, workPath);
  await bindImplementation({ repo, work, workPath, stage: 'V5', commands: ['node --help'] });
  await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} }), /遗漏 V1 验收项/);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'V5' });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  const path = units[0].resultPath;
  const result = await readWork(repo, path);
  await put(repo, 'lib/outside.dart', '不属于该单元的源码');
  await putJson(repo, path, { ...result, files: ['lib/outside.dart'] });
  await assert.rejects(completeUnit({ repo, workItem: workPath, resultPath: path }), /越过单元/);
  await putJson(repo, path, { ...result, commandOutputs: [] });
  await assert.rejects(completeUnit({ repo, workItem: workPath, resultPath: path }), /输出必须与声明命令一一对应/);
  await putJson(repo, path, result);
  await completeUnit({ repo, workItem: workPath, resultPath: path });
});

test('已冻结 V1 方案的交付范围变化必须返修 V1，旧刷新命令无法重绑', async (t) => {
  const fixture = await createFixture({ id: 'fixed-module-plan', type: 'PAGE' });
  const { repo, workPath } = fixture;
  t.after(() => rm(repo, { recursive: true, force: true }));
  await prepareFormalVisualFixture(fixture);
  await advanceVisual({ repo, workItem: workPath, to: 'V2' });
  const work = await readWork(repo, workPath);
  const specPath = await putJson(repo, 'docs/stale-regression.json', { localRegression: true, visualImpact: 'none', reason: '尝试沿用旧重验命令' });
  const plan = await readWork(repo, work.visual.modulePlanRef.path);
  plan.dependencies.push('新的功能依赖');
  await putJson(repo, work.visual.modulePlanRef.path, plan);
  await assert.rejects(refreshFunctionBaseline({ repo, workItem: workPath, specPath }), /使用 V1 模块方案.*返回 V1/);
  assert.throws(() => assertFunctionBaseline(repo, work), /V1 模块方案内容已变化/);
  assert.deepEqual((await readWork(repo, workPath)).visual.functionBaselineRef, work.visual.functionBaselineRef);
});
