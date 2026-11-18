/** 通过真实 plan 入口检查三维业务源可持续制作，证据与快照仍不可覆盖。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../../skills/app-workflow-control/scripts/runtime/io.mjs';
import { prepareWorkRecords, recordWorkResult } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { completeUnit, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { put, putJson } from './controller-fixture.mjs';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import { prepareWorld3DStage } from './world3d-completed-fixture.mjs';

/** 以正式 Unity 场景路径承载白模，V5 规划沿用同一场景而非复制运行世界。 */
async function planningFixture(t) {
  return prepareWorld3DStage(t, 'V5', { beforeEngineering: ({ fixture, work, stage }) => {
    if (stage !== 'V1') return;
    const blockoutRef = fixture.write('Assets/Scenes/world.unity', '合成白模场景');
    fixture.run = { ...fixture.run, sceneRef: blockoutRef };
    const blockoutRunRef = fixture.write(`${work.evidenceRoot}/blockout-run.json`, fixture.run);
    fixture.contract = { ...fixture.contract, blockoutRef, blockoutRunRef };
    work.visual.domainEvidenceRef = fixture.write('spec/world-V1.json', fixture.contract);
  } });
}

/** 使用既有范围和覆盖字段创建计划，不为本次修复增加新的声明结构。 */
async function plan(context, paths) {
  const work = { ...context.work, gateStatus: { ...context.work.gateStatus, F2: 'PASS' } };
  await putJson(context.repo, context.workPath, work);
  const executionUnits = [{ unitId: 'assemble-world', owner: 'fixture', paths, acceptanceCommands: ['node --version'] }];
  const planPath = 'docs/world-plan.json';
  await putJson(context.repo, planPath, { executionUnits, systemCoverage: createSystemCoverage(context.repo, work, executionUnits) });
  return prepareWorkRecords({ repo: context.repo, workItem: context.workPath, planPath });
}

test('正式世界源可以作为 V5 唯一写者的计划交付', async (t) => {
  const context = await planningFixture(t);
  const result = await plan(context, ['Assets/Scenes/world.unity']);
  assert.equal(result.status, 'PASS');
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW', args: {} });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  const work = loadWork(context.repo, context.workPath);
  const raw = `${work.evidenceRoot}/scene-registration.txt`;
  await put(context.repo, raw, '合成的场景保存与只读登记复核结果，不代表实际运行');
  const reportPath = `${work.evidenceRoot}/scene-report.json`;
  const report = { files: ['Assets/Scenes/world.unity'], commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: raw }], evidence: [{ category: 'tests', path: raw }] };
  await putJson(context.repo, reportPath, report);
  const recorded = await recordWorkResult({ repo: context.repo, workItem: context.workPath, unitId: 'assemble-world', reportPath });
  assert.equal(recorded.status, 'PASS');
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: `${work.evidenceRoot}/unit-assemble-world.json` });
});

test('正式源可作交付但不能冒充命令输出或验收证据', async (t) => {
  const context = await planningFixture(t);
  await plan(context, ['Assets/Scenes/world.unity']);
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW', args: {} });
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  const work = loadWork(context.repo, context.workPath);
  const raw = `${work.evidenceRoot}/scene-registration.txt`;
  await put(context.repo, raw, '合成检查结果');
  const reportPath = `${work.evidenceRoot}/scene-report.json`;
  for (const role of ['command', 'evidence']) {
    await putJson(context.repo, reportPath, { files: ['Assets/Scenes/world.unity'],
      commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: role === 'command' ? 'Assets/Scenes/world.unity' : raw }],
      evidence: [{ category: 'tests', path: role === 'evidence' ? 'Assets/Scenes/world.unity' : raw }],
    });
    await assert.rejects(recordWorkResult({ repo: context.repo, workItem: context.workPath, unitId: 'assemble-world', reportPath }), /命令输出|工作流记录|evidence/);
  }
});

test('可变世界源的规划例外不允许覆盖冻结控制记录或快照副本', async (t) => {
  const context = await planningFixture(t);
  const archive = context.fixture.read(context.work.visual.modelBaselineRef);
  const state = readJson(context.repo, `${archive.world3dModelBaseline.evidenceRoot}/execution-state.json`);
  const snapshot = state.world3dFileSnapshots.V4[0].snapshotPath;
  for (const path of [context.work.visual.domainEvidenceRef.path, context.work.visual.functionBaselineRef.path,
    archive.world3dModelBaseline.assetReviewRef.path, snapshot]) {
    await assert.rejects(plan(context, [path]), /不能覆盖工作流控制记录/);
  }
});
