import assert from 'node:assert/strict';
import { readFile, rm, utimes } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, assertFunctionBaseline, completeUnit, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { createFixture, put, putJson, readWork, bindImplementation, submitPassingUnits, bindEvidence, runEngineeringStage, createQualityChecks, reviewRecord, frozenReview } from './controller-fixture.mjs';

/** 为控制器创建 V1 功能基线及 V5 的可验证执行计划。 */
async function prepareRegression(t, { commands = ['node --version'], files = ['lib/sample.dart'], changeSource = true, deferStart = false } = {}) {
  const fixture = await createFixture({ id: 'local-regression', type: 'PAGE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V1' });
  await runEngineeringStage(fixture, 'V1');
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });
  work = await readWork(fixture.repo, fixture.workPath);
  // 此夹具聚焦回归绑定；视觉确认链由其他完整 V0–V5 测试覆盖。
  work.visual.stage = 'V5';
  work.globalState = 'REVIEW';
  work.gateStatus.F2 = 'PASS';
  work.visual.reviews.V2 = { path: 'reviews/target.json', sha256: 'a'.repeat(64) };
  const checks = await createQualityChecks(fixture.repo, 'visual/checks');
  const dimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];
  const candidates = [];
  for (const candidateId of ['a', 'b', 'c']) {
    const path = await put(fixture.repo, `visual/${candidateId}.png`, `合成候选 ${candidateId}`);
    candidates.push({ candidateId, path, qualityChecks: candidateId === 'a' ? checks : dimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })) });
  }
  const target = await frozenReview(fixture.repo, candidates[0].path);
  const reviewPath = 'visual/baseline-review.json';
  await putJson(fixture.repo, reviewPath, { ...reviewRecord({ objectId: 'base', candidateId: 'a', stage: 'BASELINE', purpose: 'visual-baseline', userMessageRef: 'chat://baseline', qualityChecks: checks, targetRef: target.path }), targetSha256: target.sha256 });
  const baselinePath = 'visual/baseline.json';
  await putJson(fixture.repo, baselinePath, { schemaVersion: '1.0', baselineId: 'base', projectId: work.projectId, stack: work.stack, candidates, selectedCandidateId: 'a', selectionReviewRef: await frozenReview(fixture.repo, reviewPath) });
  work.globalVisualBaselineRef = await frozenReview(fixture.repo, baselinePath);
  await putJson(fixture.repo, fixture.workPath, work);
  if (deferStart) return fixture;
  const { packPath, units } = await bindImplementation({ repo: fixture.repo, work, workPath: fixture.workPath, stage: 'V5', commands, unitPaths: files });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(fixture.repo, fixture.workPath);
  await submitPassingUnits({ repo: fixture.repo, work, workPath: fixture.workPath, packPath, units });
  if (changeSource && files.includes('lib/sample.dart')) {
    await put(fixture.repo, 'lib/sample.dart', 'V5 正式布局后的功能源码');
    // 回归记录必须晚于源码修改，且使用本阶段新生成的独立记录。
    for (const unit of units) {
      const result = JSON.parse(await readFile(resolve(fixture.repo, unit.resultPath), 'utf8'));
      for (const output of result.commandOutputs) await put(fixture.repo, output.outputFile, `exitCode=0\n${output.command}\n`);
      await putJson(fixture.repo, unit.resultPath, result);
    }
  }
  for (const unit of units) await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: unit.resultPath });
  work = await readWork(fixture.repo, fixture.workPath);
  await bindEvidence({ repo: fixture.repo, work, workPath: fixture.workPath, packPath, stage: 'V5' });
  await putJson(fixture.repo, 'docs/local-regression.json', { visualImpact: 'none', reason: '正式装配后重新执行原有功能验证', localRegression: true });
  return { ...fixture, units, packPath };
}

test('V5 修改同一源码后必须回归并冻结新摘要，保留当前阶段和视觉确认', async (t) => {
  const fixture = await prepareRegression(t);
  let work = await readWork(fixture.repo, fixture.workPath);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} }), /功能证据已变化/);
  const result = await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' });
  assert.equal(result.status, 'PASS');
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.globalState, 'IMPLEMENTING');
  assert.equal(work.visual.stage, 'V5');
  assert.equal(work.visual.reviews.V2.path, 'reviews/target.json');
  const snapshot = JSON.parse(await readFile(resolve(fixture.repo, work.visual.functionBaselineRef.path), 'utf8'));
  assert.equal(snapshot.mode, 'local-regression');
  assert.doesNotThrow(() => assertFunctionBaseline(fixture.repo, work));
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  await put(fixture.repo, 'lib/sample.dart', '回归之后再次修改源码');
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /功能证据已变化/);
});

test('功能回归后追加视觉证据不使功能基线失效，工程条目仍不可变', async (t) => {
  const fixture = await prepareRegression(t);
  let work = await readWork(fixture.repo, fixture.workPath);
  const manifestPath = work.evidenceRef.path;
  const manifest = JSON.parse(await readFile(resolve(fixture.repo, manifestPath), 'utf8'));
  const categories = new Set(loadProfile(fixture.repo, work.stack).evidenceRequirements.engineering);
  const visualItems = manifest.items.filter((item) => !categories.has(item.category));
  manifest.items = manifest.items.filter((item) => categories.has(item.category));
  await putJson(fixture.repo, manifestPath, manifest);
  await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' });
  work = await readWork(fixture.repo, fixture.workPath);
  manifest.items.push(...visualItems);
  manifest.items.reverse();
  await putJson(fixture.repo, manifestPath, manifest);
  assert.doesNotThrow(() => assertFunctionBaseline(fixture.repo, work));
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  const engineeringItem = manifest.items.find((item) => categories.has(item.category));
  const original = engineeringItem.path;
  engineeringItem.path = visualItems[0].path;
  await putJson(fixture.repo, manifestPath, manifest);
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /工程证据清单已变化/);
  engineeringItem.path = original;
  await putJson(fixture.repo, manifestPath, manifest);
  await put(fixture.repo, original, '工程证据遭替换');
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /功能证据已变化/);
});

test('本地回归不能遗漏原交付文件或原验收命令', async (t) => {
  const missingFile = await prepareRegression(t, { files: ['lib/other.dart'] });
  await put(missingFile.repo, 'lib/sample.dart', '旧交付文件变化');
  await assert.rejects(refreshFunctionBaseline({ repo: missingFile.repo, workItem: missingFile.workPath, specPath: 'docs/local-regression.json' }), /未覆盖原交付文件/);
  const missingCommand = await prepareRegression(t, { commands: ['node -v'] });
  await assert.rejects(refreshFunctionBaseline({ repo: missingCommand.repo, workItem: missingCommand.workPath, specPath: 'docs/local-regression.json' }), /未覆盖原交付文件及验收命令/);
});

test('本地回归不能掩盖旧执行记录被修改', async (t) => {
  const fixture = await prepareRegression(t);
  const work = await readWork(fixture.repo, fixture.workPath);
  const old = JSON.parse(await readFile(resolve(fixture.repo, work.visual.functionBaselineRef.path), 'utf8'));
  await put(fixture.repo, old.work.implementationPackageRef.path, '被篡改的旧记录');
  await assert.rejects(refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' }), /原功能记录已变化/);
});

test('验证状态下可更新基线，回归之后日志变化仍会阻断', async (t) => {
  const fixture = await prepareRegression(t, { changeSource: false });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  const result = JSON.parse(await readFile(resolve(fixture.repo, fixture.units[0].resultPath), 'utf8'));
  await put(fixture.repo, 'lib/sample.dart', '验证阶段修改的正式源码');
  for (const output of result.commandOutputs) await put(fixture.repo, output.outputFile, `exitCode=0\n${output.command}\n`);
  await putJson(fixture.repo, fixture.units[0].resultPath, result);
  await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' });
  let work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.globalState, 'VALIDATING');
  await put(fixture.repo, result.commandOutputs[0].outputFile, '篡改回归日志');
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /功能证据已变化/);
});

test('直接修改功能依赖不能通过本地回归掩盖', async (t) => {
  const fixture = await prepareRegression(t);
  const work = await readWork(fixture.repo, fixture.workPath);
  work.visual.functionDependencies = [{ workItemRef: { path: 'other/work.json' }, caseId: 'changed', evidenceRef: { path: 'other/result.json', sha256: 'a'.repeat(64) } }];
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' }), /不能替换或改变功能依赖/);
});

test('V5 新增交付源码后再次修改须重验完整范围并保留旧日志完整性', async (t) => {
  const fixture = await prepareRegression(t, { files: ['lib/sample.dart', 'lib/visual.dart'] });
  await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  const sample = await readFile(resolve(fixture.repo, 'lib/sample.dart'), 'utf8');
  await put(fixture.repo, 'lib/visual.dart', '第二次修改后的视觉源码');
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: {} }), /功能证据已变化/);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '再次修复实现', 'affected-scope': 'implementation' } });
  const oldResult = JSON.parse(await readFile(resolve(fixture.repo, fixture.units[1].resultPath), 'utf8'));
  const oldOutputPath = oldResult.commandOutputs[0].outputFile;
  const oldOutput = await readFile(resolve(fixture.repo, oldOutputPath), 'utf8');
  await put(fixture.repo, oldOutputPath, '旧日志被篡改');
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'REVIEW', args: { 'return-resolution': '准备新的回归执行计划' } }), /原功能记录已变化/);
  await put(fixture.repo, oldOutputPath, oldOutput);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'REVIEW', args: { 'return-resolution': '准备新的回归执行计划' } });
  let work = await readWork(fixture.repo, fixture.workPath);
  const packPath = '.workflow-control/implementation-packages/repeated-v5.json';
  const unit = { unitId: 'repeat', sequence: 1, type: 'PAGE', owner: 'test-owner', paths: ['lib/sample.dart', 'lib/visual.dart'], resultPath: `${work.evidenceRoot}/repeat.json`, acceptanceCommands: ['node --version'] };
  await putJson(fixture.repo, packPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType, visualStage: 'V5', executionUnits: [unit] });
  work.implementationPackageRef = { path: packPath };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(fixture.repo, fixture.workPath);
  await submitPassingUnits({ repo: fixture.repo, work, workPath: fixture.workPath, packPath, units: [unit] });
  await put(fixture.repo, 'lib/sample.dart', sample);
  await put(fixture.repo, 'lib/visual.dart', '第二次修改后的视觉源码');
  const result = JSON.parse(await readFile(resolve(fixture.repo, unit.resultPath), 'utf8'));
  for (const output of result.commandOutputs) await put(fixture.repo, output.outputFile, `exitCode=0\n${output.command}\n`);
  await putJson(fixture.repo, unit.resultPath, result);
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: unit.resultPath });
  work = await readWork(fixture.repo, fixture.workPath);
  const profile = loadProfile(fixture.repo, work.stack);
  const items = [];
  for (const category of [...new Set([...profile.evidenceRequirements.engineering, ...profile.evidenceRequirements.visual])]) {
    const path = `${work.evidenceRoot}/${category}.txt`;
    await put(fixture.repo, path, `${category} 新回归证据`);
    items.push({ category, status: 'PASS', path });
  }
  const evidencePath = '.workflow-control/evidence/local-regression/repeated-manifest.json';
  await putJson(fixture.repo, evidencePath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, visualStage: 'V5', items });
  work.evidenceRef = { path: evidencePath };
  work.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} }), /功能证据已变化/);
  await putJson(fixture.repo, unit.resultPath, { ...result, files: ['lib/sample.dart'] });
  await assert.rejects(refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' }), /未覆盖原交付文件及验收命令：lib\/visual\.dart/);
  await putJson(fixture.repo, unit.resultPath, result);
  await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.globalState, 'VALIDATING');
  assert.doesNotThrow(() => assertFunctionBaseline(fixture.repo, work));
});

test('新增交付源码在回归输出之后变化时不得刷新基线', async (t) => {
  const fixture = await prepareRegression(t, { files: ['lib/sample.dart', 'lib/visual.dart'] });
  const later = new Date(Date.now() + 10_000);
  await utimes(resolve(fixture.repo, 'lib/visual.dart'), later, later);
  await assert.rejects(refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/local-regression.json' }), /源码修改及旧基线之后/);
});

test('记录器可登记源码变化后的 V5 新回归，刷新后才可推进', async (t) => {
  const fixture = await prepareRegression(t, { deferStart: true });
  const planPath = 'docs/actual-v5-plan.json';
  await putJson(fixture.repo, planPath, { executionUnits: [{ unitId: 'regression', type: 'PAGE', owner: 'executor', paths: ['lib/sample.dart'], acceptanceCommands: ['node --version'] }] });
  await prepareWorkRecords({ repo: fixture.repo, workItem: fixture.workPath, planPath });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  let work = await readWork(fixture.repo, fixture.workPath);
  const pack = JSON.parse(await readFile(resolve(fixture.repo, work.implementationPackageRef.path), 'utf8'));
  await put(fixture.repo, 'lib/sample.dart', '正式视觉装配后的源码');
  const outputFile = `${work.evidenceRoot}/regression.log`;
  await put(fixture.repo, outputFile, 'node --version\nv22\n');
  const profile = loadProfile(fixture.repo, work.stack);
  const evidence = [];
  for (const category of [...new Set([...profile.evidenceRequirements.engineering, ...profile.evidenceRequirements.visual])]) {
    const path = `${work.evidenceRoot}/${category}.txt`;
    await put(fixture.repo, path, `${category} 回归材料`);
    evidence.push({ category, path });
  }
  const reportPath = 'docs/actual-v5-report.json';
  await putJson(fixture.repo, reportPath, { files: ['lib/sample.dart'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile }], evidence });
  await recordWorkResult({ repo: fixture.repo, workItem: fixture.workPath, unitId: 'regression', reportPath });
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: pack.executionUnits[0].resultPath });
  work = await readWork(fixture.repo, fixture.workPath);
  work.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await putJson(fixture.repo, 'docs/actual-refresh.json', { visualImpact: 'none', reason: '执行原功能回归', localRegression: true });
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} }), /功能证据已变化/);
  await refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/actual-refresh.json' });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.doesNotThrow(() => assertFunctionBaseline(fixture.repo, work));
  await put(fixture.repo, outputFile, '回归输出被替换');
  assert.throws(() => assertFunctionBaseline(fixture.repo, work), /功能证据已变化/);
});
