import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { loadPackage } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { prepareWorkRecords } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { inspectExecution } from '../../skills/app-workflow-control/scripts/runtime/execution-state.mjs';
import { transitionWork, loadWork, completeUnit, inspectWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createFixture, readWork, putJson, put, frozenReview, submitPassingUnits, bindEvidence } from './controller-fixture.mjs';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import { readCoveragePlan } from '../../skills/app-workflow-control/scripts/runtime/system-coverage-binding.mjs';

/** 创建已具备实际范围门事实的本地控制器夹具，不启动服务或设备。 */
async function fixture(t, stack = 'flutter', mode = 'standard') {
  const f = await createFixture({ stack, type: 'MODULE', id: `coverage-${stack}` });
  t.after(() => rm(f.repo, { recursive: true, force: true }));
  const work = await readWork(f.repo, f.workPath);
  work.globalState = 'REVIEW';
  work.workflowMode = mode;
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await putJson(f.repo, f.workPath, work);
  const path = ['unity', 'cocos'].includes(stack) ? 'assets/feature.txt' : stack === 'phaser' ? 'src/feature.ts' : 'lib/feature.dart';
  // 工作项显式授权测试文件，避免把运行根目录建议误当作不可扩展边界。
  work.allowedPaths = [path];
  await putJson(f.repo, f.workPath, work);
  const units = [{ unitId: 'feature', owner: 'test-owner', paths: [path], acceptanceCommands: ['node --version'] }];
  const plan = { executionUnits: units, systemCoverage: createSystemCoverage(f.repo, work, units) };
  return { ...f, work, plan, planPath: 'docs/coverage-plan.json' };
}

/** 经正式规划入口写入覆盖资料，并读取控制器生成的实施包。 */
async function prepare(f) {
  await putJson(f.repo, f.planPath, f.plan);
  await prepareWorkRecords({ repo: f.repo, workItem: f.workPath, planPath: f.planPath });
  const work = await loadWork(f.repo, f.workPath);
  return { work, pack: loadPackage(f.repo, work) };
}

test('游戏与非游戏在规划、启动和真实结果闭环中保留同一覆盖关系', async (t) => {
  for (const stack of ['unity', 'phaser', 'flutter', 'expo', 'esp32', 'nodejs']) {
    const f = await fixture(t, stack);
    const { work, pack } = await prepare(f);
    assert.deepEqual(pack.systemCoverage, f.plan.systemCoverage);
    await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} });
    assert.deepEqual(inspectExecution(f.repo, work).state.executionPlan.systemCoverage, pack.systemCoverage);
    const results = await submitPassingUnits({ repo: f.repo, work, workPath: f.workPath, packPath: work.implementationPackageRef.path, units: pack.executionUnits });
    await completeUnit({ repo: f.repo, workItem: f.workPath, resultPath: results[0] });
    assert.deepEqual(inspectExecution(f.repo, work, { requireComplete: true }).activeBatch, []);
  }
});

test('缺覆盖或设计时规划无副产物，手写包和轻量模式也不能跳过', async (t) => {
  for (const mode of ['standard', 'light']) {
    const f = await fixture(t, 'flutter', mode);
    delete f.plan.systemCoverage;
    await putJson(f.repo, f.planPath, f.plan);
    await assert.rejects(prepareWorkRecords({ repo: f.repo, workItem: f.workPath, planPath: f.planPath }), /systemCoverage/);
    assert.equal(existsSync(resolve(f.repo, f.work.evidenceRoot)), false);
    f.work.implementationPackageRef = { path: '.workflow-control/implementation-packages/manual.json' };
    await putJson(f.repo, f.work.implementationPackageRef.path, {
      schemaVersion: '1.0', workItemId: f.work.workItemId, stack: f.work.stack, workItemType: 'MODULE',
      executionUnits: f.plan.executionUnits.map((unit) => ({ ...unit, type: 'MODULE', sequence: 1, resultPath: `${f.work.evidenceRoot}/unit-feature.json` })),
    });
    await putJson(f.repo, f.workPath, f.work);
    assert.ok(inspectWork(f.repo, f.work, { strict: true }).blocking.some((message) => message.includes('systemCoverage')));
    await assert.rejects(transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} }), /systemCoverage/);
    assert.equal(existsSync(resolve(f.repo, `${f.work.evidenceRoot}/execution-state.json`)), false);
  }
  const f = await fixture(t);
  f.plan.systemCoverage.modules[0].designRefs = [];
  await assert.rejects(prepare(f), /缺少设计依据/);
  assert.equal(existsSync(resolve(f.repo, f.work.evidenceRoot)), false);
});

test('来源变化、计划与包不一致均阻断启动，不能用当前控制记录自证', async (t) => {
  const changed = await fixture(t);
  await prepare(changed);
  await put(changed.repo, changed.plan.systemCoverage.requirementsRef.path, '变更后的需求');
  await assert.rejects(transitionWork({ repo: changed.repo, workItem: changed.workPath, to: 'IMPLEMENTING', args: {} }), /冻结摘要/);
  const rewritten = await fixture(t);
  const { work, pack } = await prepare(rewritten);
  pack.systemCoverage.requirements[0].description = '缩减后的需求';
  await putJson(rewritten.repo, work.implementationPackageRef.path, pack);
  await assert.rejects(transitionWork({ repo: rewritten.repo, workItem: rewritten.workPath, to: 'IMPLEMENTING', args: {} }), /冻结计划来源/);
  rewritten.plan.systemCoverage = pack.systemCoverage;
  await putJson(rewritten.repo, rewritten.planPath, rewritten.plan);
  // 两个可编辑文件同时变化也不能替换规划提交时固定的源摘要。
  await assert.rejects(transitionWork({ repo: rewritten.repo, workItem: rewritten.workPath, to: 'IMPLEMENTING', args: {} }), /冻结计划来源摘要/);
  const self = await fixture(t);
  self.plan.systemCoverage.requirementsRef = await frozenReview(self.repo, self.workPath);
  await assert.rejects(prepare(self), /系统需求、设计或复用证据不能引用当前控制记录/);
});

test('冻结来源不得落入实施单元写入范围，结果也不得覆盖设计文件', async (t) => {
  const f = await fixture(t);
  f.work.allowedPaths.push('test-fixtures');
  await putJson(f.repo, f.workPath, f.work);
  f.plan.executionUnits[0].paths = ['test-fixtures'];
  await assert.rejects(prepare(f), /路径不能覆盖工作流控制记录|冻结的系统需求/);
  const g = await fixture(t);
  const { work, pack } = await prepare(g);
  const designPath = `${work.evidenceRoot}/frozen-design.md`;
  await put(g.repo, designPath, '已冻结设计，仅供测试保留来源保护');
  const designRef = await frozenReview(g.repo, designPath);
  pack.systemCoverage.modules[0].designRefs = [designRef];
  g.plan.systemCoverage = pack.systemCoverage;
  await putJson(g.repo, g.planPath, g.plan);
  work.planningRef = await frozenReview(g.repo, g.planPath);
  pack.executionUnits[0].resultPath = designPath;
  await putJson(g.repo, work.implementationPackageRef.path, pack);
  assert.throws(() => loadPackage(g.repo, work), /保留控制文件/);
});

test('模块前置落实到任务依赖，不能仅依靠排列顺序', async (t) => {
  const f = await fixture(t);
  const second = { unitId: 'consumer', owner: 'test-owner', paths: ['lib/consumer.dart'], acceptanceCommands: ['node --version'] };
  f.work.allowedPaths.push(second.paths[0]);
  await putJson(f.repo, f.workPath, f.work);
  f.plan.executionUnits.push(second);
  f.plan.systemCoverage = createSystemCoverage(f.repo, f.work, f.plan.executionUnits);
  f.plan.systemCoverage.modules[1].dependsOn = [f.plan.systemCoverage.modules[0].moduleId];
  await assert.rejects(prepare(f), /系统依赖未关联任务前置/);
  // 前一次规划失败须回滚新包与空证据根，补齐依赖后允许在同一工作项重试。
  second.dependsOn = ['feature'];
  const { pack } = await prepare(f);
  assert.deepEqual(pack.executionUnits[1].dependsOn, ['feature']);
});

test('相依模块可在同一任务实现并由后续集成统一验证', async (t) => {
  const f = await fixture(t);
  f.work.allowedPaths.push('lib/integration.dart');
  await putJson(f.repo, f.workPath, f.work);
  f.plan.executionUnits.push({ unitId: 'integration', owner: 'test-owner', paths: ['lib/integration.dart'], acceptanceCommands: ['node --version'], dependsOn: ['feature'] });
  const coverage = createSystemCoverage(f.repo, f.work, f.plan.executionUnits);
  const [base, consumer] = coverage.modules;
  consumer.dependsOn = [base.moduleId];
  consumer.implementationUnitIds = ['feature'];
  base.verifications = [{ unitId: 'integration', command: 'node --version' }];
  consumer.verifications = [{ unitId: 'integration', command: 'node --version' }];
  f.plan.systemCoverage = coverage;
  await prepare(f);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} });
});

test('复用前置允许在组合阶段验证，不要求消费实现反向依赖组合任务', async (t) => {
  const f = await fixture(t);
  f.work.allowedPaths.push('lib/integration.dart');
  await putJson(f.repo, f.workPath, f.work);
  f.plan.executionUnits.push({ unitId: 'integration', owner: 'test-owner', paths: ['lib/integration.dart'], acceptanceCommands: ['node --version'], dependsOn: ['feature'] });
  const coverage = createSystemCoverage(f.repo, f.work, f.plan.executionUnits);
  const [reused, consumer] = coverage.modules;
  reused.status = 'reuse';
  reused.implementationUnitIds = [];
  await put(f.repo, 'test-fixtures/reuse-evidence.json', '已有模块的独立工程验证记录');
  reused.evidenceRefs = [await frozenReview(f.repo, 'test-fixtures/reuse-evidence.json')];
  reused.verifications = [{ unitId: 'integration', command: 'node --version' }];
  consumer.dependsOn = [reused.moduleId];
  consumer.implementationUnitIds = ['feature'];
  consumer.verifications = [{ unitId: 'integration', command: 'node --version' }];
  f.plan.systemCoverage = coverage;
  await prepare(f);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} });
});

test('复用模块不能截断其依赖的本批实现任务', async (t) => {
  const f = await fixture(t);
  const provider = { unitId: 'provider', owner: 'test-owner', paths: ['lib/provider.dart'], acceptanceCommands: ['node --version'] };
  const integration = { unitId: 'integration', owner: 'test-owner', paths: ['lib/integration.dart'], acceptanceCommands: ['node --version'], dependsOn: ['feature', 'provider'] };
  const consumer = f.plan.executionUnits[0];
  f.work.allowedPaths.push(...provider.paths, ...integration.paths);
  await putJson(f.repo, f.workPath, f.work);
  f.plan.executionUnits.push(provider, integration);
  const coverage = createSystemCoverage(f.repo, f.work, f.plan.executionUnits);
  const [consumerModule, providerModule, reusedModule] = coverage.modules;
  reusedModule.status = 'reuse';
  reusedModule.implementationUnitIds = [];
  await put(f.repo, 'test-fixtures/reuse-evidence.json', '已有模块的独立工程验证记录');
  reusedModule.evidenceRefs = [await frozenReview(f.repo, 'test-fixtures/reuse-evidence.json')];
  reusedModule.dependsOn = [providerModule.moduleId];
  consumerModule.dependsOn = [reusedModule.moduleId];
  f.plan.systemCoverage = coverage;
  await assert.rejects(prepare(f), /系统依赖未关联任务前置/);
  consumer.dependsOn = ['provider'];
  f.plan.executionUnits = [provider, consumer, integration];
  await prepare(f);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} });
});

test('计划解析与身份使用同一份原始字节，保留真实格式版本', async (t) => {
  const f = await fixture(t);
  await put(f.repo, f.planPath, `\n ${JSON.stringify(f.plan)} \n`);
  const snapshot = readCoveragePlan(f.repo, f.planPath);
  assert.deepEqual(snapshot.plan, f.plan);
  assert.equal(snapshot.sha256, (await frozenReview(f.repo, f.planPath)).sha256);
  await put(f.repo, f.planPath, '{');
  assert.throws(() => readCoveragePlan(f.repo, f.planPath), /不是有效 JSON/);
});

test('启动后同步改写计划与包仍被快照阻断，来源变化也阻断完成', async (t) => {
  const f = await fixture(t);
  const { work, pack } = await prepare(f);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'IMPLEMENTING', args: {} });
  f.plan.systemCoverage.requirements[0].description = '实施中缩小范围';
  pack.systemCoverage = f.plan.systemCoverage;
  await putJson(f.repo, f.planPath, f.plan);
  await putJson(f.repo, work.implementationPackageRef.path, pack);
  // 即使测试主动更新工作项来源摘要，实施时已经冻结的覆盖关系仍不能变化。
  work.planningRef = await frozenReview(f.repo, f.planPath);
  assert.throws(() => inspectExecution(f.repo, work), /冻结的执行计划/);
  const g = await fixture(t);
  const prepared = await prepare(g);
  await transitionWork({ repo: g.repo, workItem: g.workPath, to: 'IMPLEMENTING', args: {} });
  const results = await submitPassingUnits({ repo: g.repo, work: prepared.work, workPath: g.workPath, packPath: prepared.work.implementationPackageRef.path, units: prepared.pack.executionUnits });
  await completeUnit({ repo: g.repo, workItem: g.workPath, resultPath: results[0] });
  await bindEvidence({ repo: g.repo, work: await loadWork(g.repo, g.workPath), workPath: g.workPath, packPath: prepared.work.implementationPackageRef.path, stage: 'module' });
  await transitionWork({ repo: g.repo, workItem: g.workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: g.repo, workItem: g.workPath, to: 'PASSED', args: {} });
  await put(g.repo, g.plan.systemCoverage.modules[0].designRefs[0].path, '设计发生实质变化');
  assert.equal(inspectWork(g.repo, await loadWork(g.repo, g.workPath)).status, 'BLOCKED');
  await assert.rejects(transitionWork({ repo: g.repo, workItem: g.workPath, to: 'COMPLETE', args: {} }), /冻结摘要/);
});

test('计划与实施包 Schema 都强制包含系统覆盖合同', async (t) => {
  const f = await fixture(t);
  const { pack } = await prepare(f);
  const ajv = new Ajv2020({ strict: false });
  const base = new URL('../../skills/app-workflow-control/schemas/', import.meta.url);
  ajv.addSchema(JSON.parse(await readFile(new URL('system-coverage.schema.json', base), 'utf8')));
  for (const [name, value] of [['work-plan', f.plan], ['implementation-package', pack]]) {
    const validate = ajv.compile(JSON.parse(await readFile(new URL(`${name}.schema.json`, base), 'utf8')));
    assert.equal(validate(value), true, JSON.stringify(validate.errors));
    const missing = { ...value };
    delete missing.systemCoverage;
    assert.equal(validate(missing), false);
  }
});
