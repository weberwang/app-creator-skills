/** 通过真实控制器阶段生成合成已完成来源；不运行引擎或取得真实人工验收。 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceVisual, completeUnit, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { bindEvidence, bindImplementation, putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { attachWorld3DPhase, attachWorld3DPreflight, createWorld3DFixture } from './world3d-fixture.mjs';

/** 使用现有工程夹具执行本阶段命令与结果登记，保留真实的控制器校验链。 */
export async function runWorld3DEngineering(context, stage, unitPaths, beforePassed) {
  const { repo, workPath } = context;
  let work = await readWork(repo, workPath);
  work.gateStatus.F2 = 'PASS';
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(repo, workPath, work);
  if (work.globalState === 'PROPOSAL') {
    await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
    work = await readWork(repo, workPath);
  }
  const defaultPath = work.stack === 'unity' ? `Assets/Scripts/${work.workItemId}-${stage}.cs` : `src/game/${work.workItemId}-${stage}.ts`;
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage, unitPaths: unitPaths ?? [defaultPath] });
  const contract = stage === 'V4' ? await readWork(repo, work.visual.domainEvidenceRef.path) : null;
  if (contract?.sampleRef) {
    // 通过公开执行入口登记合成首件，默认唯一单元对应无需扩批的高风险场景。
    const { scopeIds } = await readWork(repo, contract.sampleRef.path);
    const sampleUnit = units[0];
    for (const unit of units) Object.assign(unit, { sampleScopeIds: scopeIds, sampleBasisRef: contract.modelSpecRef });
    Object.assign(sampleUnit, { sampleRole: 'sample', sampleDecisionRequired: false });
    for (const unit of units.slice(1)) Object.assign(unit, { sampleRole: 'batch', dependsOn: [sampleUnit.unitId] });
    const pack = await readWork(repo, packPath);
    await putJson(repo, packPath, { ...pack, executionUnits: units });
  }
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  // 通用结果夹具会创建占位文件；场景作为真实交付时须保留其已绑定的合成版本。
  const existing = new Map(units.flatMap((unit) => unit.paths).filter((path) => existsSync(resolve(repo, path))).map((path) => [path, readFileSync(resolve(repo, path))]));
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  if (contract?.sampleRef) {
    const resultPath = units[0].resultPath;
    const result = await readWork(repo, resultPath);
    await putJson(repo, resultPath, { ...result, sampleEvidenceRef: contract.sampleRef });
  }
  for (const [path, bytes] of existing) writeFileSync(resolve(repo, path), bytes);
  for (const unit of units) await completeUnit({ repo, workItem: workPath, resultPath: unit.resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage });
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await beforePassed?.(await readWork(repo, workPath));
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  return readWork(repo, workPath);
}

/** 从 V0 推进到真实 COMPLETE/V5，阶段钩子只构造合成的待验证条件。 */
export async function createCompletedWorld3D(t, options = {}) {
  return buildWorld3D(t, options);
}

/** 在新阶段尚未产生运行材料时停下，供真实 plan 入口验证规划与文件所有权。 */
export async function prepareWorld3DStage(t, stage, options = {}) {
  return buildWorld3D(t, { ...options, stopBeforeStage: stage });
}

/** 共用真实控制器推进步骤，避免不同回归用例各自手写已完成状态。 */
async function buildWorld3D(t, { stack = 'unity', fixture: existingFixture, beforeEngineering, beforePassed, v1UnitPaths, stopBeforeStage } = {}) {
  const fixture = existingFixture ?? createWorld3DFixture(t, { stack });
  stack = fixture.work.stack;
  const result = await initializeWork({ repo: fixture.repo, args: {
    id: fixture.context.workItemId, stack, type: 'SCENE', objective: '合成三维来源闭环',
    'project-id': fixture.context.projectId, 'object-id': fixture.context.objectId, 'design-route': 'world-3d',
  } });
  const context = { repo: fixture.repo, workPath: result.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V1' });
  work = await readWork(context.repo, context.workPath);
  work.visual.candidateId = fixture.context.candidateId;
  work.visual.domainEvidenceRef = fixture.identity('spec/world-V1.json');
  await beforeEngineering?.({ fixture, context, work, stage: 'V1' });
  await putJson(context.repo, context.workPath, work);
  await runWorld3DEngineering(context, 'V1', typeof v1UnitPaths === 'function' ? v1UnitPaths({ fixture, context, work }) : v1UnitPaths);
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPreflight(fixture, work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ repo: context.repo, workItem: context.workPath, to: 'V2' });
  for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    work = await readWork(context.repo, context.workPath);
    if (stage === stopBeforeStage) return { ...context, fixture, work, ref: fixture.identity(context.workPath) };
    attachWorld3DPhase(fixture, stage, work);
    await beforeEngineering?.({ fixture, context, work, stage });
    await putJson(context.repo, context.workPath, work);
    if (['V4', 'V5'].includes(stage)) await runWorld3DEngineering(context, stage, undefined, (current) => beforePassed?.({ fixture, context, work: current, stage }));
    if (stage !== 'V5') await advanceVisual({ repo: context.repo, workItem: context.workPath, to: `V${Number(stage.slice(1)) + 1}` });
  }
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'COMPLETE', args: {} });
  work = await readWork(context.repo, context.workPath);
  return { ...context, fixture, work, ref: fixture.identity(context.workPath) };
}
