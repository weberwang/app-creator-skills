/** 通过真实控制器阶段生成合成已完成来源；不运行引擎或取得真实人工验收。 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceVisual, completeUnit, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { bindEvidence, bindImplementation, putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { attachWorld3DPhase, attachWorld3DPreflight, createWorld3DFixture } from './world3d-fixture.mjs';
import { finishWorldFoundation } from './module-world-fixture.mjs';
import { moduleDesignItems, withModuleRules } from './module-rules-fixture.mjs';

/** 用两个不同玩家机位和独立文件构造合成设计稿，HUD 沿用同一状态与视口目标。 */
export function worldViewFixture(fixture, scopeIds, hud, suffix = '') {
  const target = hud?.targets?.[0];
  const stateId = target?.stateId ?? 'state-one';
  const viewport = target?.viewport ?? { width: 1280, height: 720 };
  const worldViews = [0, 1].map((index) => ({
    viewId: `view-${index + 1}`,
    scopeIds,
    camera: { position: [index * 4, 2, 6], target: [0, 1, 0] },
    stateId,
    viewport,
    designRef: fixture.write(`spec/world-view-${index + 1}${suffix}.txt`, `合成场景机位 ${index + 1} 的设计稿`),
    ...(target && { hudTargetId: target.targetId }),
  }));
  return { worldViews, ...(target && { hudSourceRef: target.referenceTarget }) };
}

/** 按正式入口建立全局方向和 V1 模块方案，供三维生命周期用例复用。 */
export async function prepareWorldModule(fixture, work, additionalBaselines = []) {
  const blockoutRun = fixture.read(fixture.contract.blockoutRunRef);
  fixture.contract.blockoutRunRef = fixture.write(fixture.contract.blockoutRunRef.path, { ...blockoutRun, evidenceRoot: work.evidenceRoot });
  work.visual.domainEvidenceRef = fixture.write('spec/world-v1-plan.json', { ...fixture.contract, stage: 'V1' });
  const originalContract = fixture.contract;
  const originalWork = fixture.work;
  attachWorld3DPhase(fixture, 'V2', structuredClone(work));
  fixture.contract = originalContract;
  fixture.work = originalWork;
  work.foundationVisualRef = await finishWorldFoundation(fixture, fixture.baselineRef, additionalBaselines);
  work.globalVisualBaselineRef = fixture.baselineRef;
  const kinds = ['function', 'state', 'step', ...(additionalBaselines.length ? ['transition'] : [])];
  work.visual.modulePlanRef = fixture.write('spec/module-plan.json', withModuleRules({
    schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, dependencies: [],
    entries: kinds.map((kind) => ({ kind, id: `${kind}-one`, description: `测试 ${kind}`,
      acceptance: '满足方案', requirementId: 'fixture-requirement-1', command: 'node --version' })),
  }));
}

/** 让 V2 的状态与步骤覆盖每个实际确认的世界或 HUD 稿件。 */
export function attachWorldModuleDesign(fixture, work, { suffix = '' } = {}) {
  const contract = fixture.read(work.visual.domainEvidenceRef);
  const targets = [contract.directionRef, contract.spatialSpecRef];
  if (work.visual.hud?.targets?.length) targets.push(work.visual.hud.targets[0].referenceTarget);
  const plan = fixture.read(work.visual.modulePlanRef);
  const designEntries = plan.entries.filter((entry) => ['state', 'step', 'transition', 'progress'].includes(entry.kind));
  const entries = targets.map((targetRef, index) => ({
    kind: designEntries[index].kind, id: designEntries[index].id, targetRef,
    ...(index < 2 ? { designRef: fixture.write(`spec/module-${designEntries[index].kind}${suffix}.md`, `合成 ${designEntries[index].kind} 设计\n`) } : {}),
  }));
  // 沿用状态、步骤和 HUD 的既有目标，为其余机制及流程补齐同一场景设计依据。
  const represented = new Set(entries.map(({ kind, id }) => JSON.stringify([kind, id])));
  for (const item of moduleDesignItems(plan)) {
    if (!represented.has(JSON.stringify([item.kind, item.id]))) {
      entries.push({ ...item, targetRef: entries[0].targetRef, designRef: entries[0].designRef });
    }
  }
  work.visual.moduleDesignRef = fixture.write(`spec/module-design${suffix}.json`, {
    schemaVersion: '1.0', workItemId: work.workItemId, modulePlanRef: work.visual.modulePlanRef,
    baselineRef: work.globalVisualBaselineRef, entries,
    ...worldViewFixture(fixture, contract.scopeIds, work.visual.hud, suffix),
  });
  work.visual.moduleDesignReviewRef = fixture.write(`reviews/module-design${suffix}.json`, {
    schemaVersion: '1.0', workItemId: work.workItemId, stage: 'V2', decision: 'approved',
    userMessageRef: 'test-only://module-design', subjectRef: work.visual.moduleDesignRef,
  });
}

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

/** 从 V1 推进到真实 COMPLETE/V5，阶段钩子只构造合成的待验证条件。 */
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

  work = await readWork(context.repo, context.workPath);
  work.visual.candidateId = fixture.context.candidateId;
  work.visual.domainEvidenceRef = fixture.identity('spec/world-V1.json');
  await beforeEngineering?.({ fixture, context, work, stage: 'V1' });
  // 可选白模运行需要记录其原始证据根，供后续阶段按实际路径重新核验。
  const blockoutRun = fixture.read(fixture.contract.blockoutRunRef);
  fixture.contract.blockoutRunRef = fixture.write(fixture.contract.blockoutRunRef.path, { ...blockoutRun, evidenceRoot: work.evidenceRoot });
  work.visual.domainEvidenceRef = fixture.write('spec/world-v1-plan.json', { ...fixture.contract, stage: 'V1' });
  // 全局方向先由基础工程确认，模块方案在 V1 冻结为后续覆盖依据。
  const baselineWork = structuredClone(work);
  attachWorld3DPhase(fixture, 'V2', baselineWork);
  work.foundationVisualRef = await finishWorldFoundation(fixture, fixture.baselineRef);
  work.globalVisualBaselineRef = fixture.baselineRef;
  const entries = ['function', 'state', 'step'].map((kind) => ({ kind, id: `${kind}-one`, description: `测试 ${kind}`,
    acceptance: '满足方案', requirementId: 'fixture-requirement-1', command: 'node --version' }));
  const planRef = fixture.write('spec/module-plan.json', withModuleRules({ schemaVersion: '1.0', workItemId: work.workItemId,
    objectId: work.visual.objectId, dependencies: [], entries }));
  work.visual.modulePlanRef = planRef;
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
    if (stage === 'V2') {
      attachWorldModuleDesign(fixture, work);
    }
    await beforeEngineering?.({ fixture, context, work, stage });
    await putJson(context.repo, context.workPath, work);
    if (['V4', 'V5'].includes(stage)) await runWorld3DEngineering(context, stage, undefined, (current) => beforePassed?.({ fixture, context, work: current, stage }));
    if (stage !== 'V5') await advanceVisual({ repo: context.repo, workItem: context.workPath, to: `V${Number(stage.slice(1)) + 1}` });
  }
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'COMPLETE', args: {} });
  work = await readWork(context.repo, context.workPath);
  return { ...context, fixture, work, ref: fixture.identity(context.workPath) };
}
