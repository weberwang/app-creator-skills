/** 真实控制器生命周期使用合成空间和人工记录，不执行引擎或声称人工验收。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, completeUnit, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { bindEvidence, bindImplementation, put, putJson, readWork } from './controller-fixture.mjs';
import { createWorld3DFixture } from './world3d-fixture.mjs';
import { moduleDesignItems, withModuleRules } from './module-rules-fixture.mjs';

/** 真实执行一个基础工程单元，证据中固定全局视觉清单。 */
async function finishFoundation(f, baselineRef) {
  const { repo, context } = f;
  const initialized = await initializeWork({ repo, args: { id: 'foundation', stack: context.stack, type: 'FOUNDATION',
    objective: '建立基础工程与全局方向', 'project-id': context.projectId } });
  const workPath = initialized.metadata.workItemPath;
  let work = await readWork(repo, workPath);
  const manifest = f.write('spec/foundation-manifest.json', { schemaVersion: '1.0', foundationWorkItemPath: workPath,
    projectId: work.projectId, stack: work.stack, baselines: [{ route: 'world-3d', ref: baselineRef }] });
  work.foundationVisualRef = manifest;
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await putJson(repo, workPath, work);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'foundation', unitPaths: ['src/game/foundation.ts'] });
  const pack = JSON.parse(await readFile(resolve(repo, packPath), 'utf8'));
  pack.systemCoverage.modules[0].designRefs.push(manifest);
  await putJson(repo, packPath, pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await put(repo, units[0].paths[0], '// 测试基础工程单元\n');
  const command = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(command.status, 0, command.stderr);
  const output = `${work.evidenceRoot}/node-version.txt`;
  await put(repo, output, command.stdout);
  await putJson(repo, units[0].resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId,
    stack: work.stack, implementationPackageRef: packPath, unitId: units[0].unitId, sequence: 1, exitCode: 0,
    files: units[0].paths, commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }] });
  await completeUnit({ repo, workItem: workPath, resultPath: units[0].resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage: 'foundation' });
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} });
  return manifest;
}

test('三维模块须在 V1 提交白模，白模运行可按风险省略', async (t) => {
  const f = createWorld3DFixture(t);
  const { repo, context } = f;
  const direction = f.write('spec/global-direction.md', '仅供测试的全局方向\n');
  const selection = f.write('reviews/global-selection.json', { schemaVersion: '1.0', projectId: context.projectId,
    stack: context.stack, objectId: 'baseline', stage: 'BASELINE', purpose: 'visual-baseline', decision: 'APPROVED',
    userMessageRef: 'test-only://global', subjectRef: direction });
  const baseline = f.write('spec/global-baseline.json', { schemaVersion: '1.0', designRoute: 'world-3d',
    baselineId: 'baseline', projectId: context.projectId, stack: context.stack, directionRef: direction, selectionReviewRef: selection });
  const foundation = await finishFoundation(f, baseline);
  const initialized = await initializeWork({ repo, args: { id: context.workItemId, stack: context.stack, type: 'SCENE',
    objective: '验证三维模块设计阶段', 'project-id': context.projectId, 'object-id': context.objectId, 'design-route': 'world-3d' } });
  const workPath = initialized.metadata.workItemPath;
  let work = await readWork(repo, workPath);
  const plan = withModuleRules({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, dependencies: [],
    entries: ['function', 'state', 'step'].map((kind) => ({ kind, id: `${kind}-one`, description: `测试 ${kind}`,
      acceptance: '满足方案', requirementId: 'world-requirement', command: 'node --version' })) });
  const planRef = f.write('spec/module-plan.json', plan);
  work.foundationVisualRef = foundation;
  work.globalVisualBaselineRef = baseline;
  work.visual.modulePlanRef = planRef;
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  const { spatialSpecRef, blockoutRef } = f.contract;
  const spatialBasis = { ...context, designRoute: 'world-3d', stage: 'V1', scopeIds: f.scopeIds, spatialSpecRef };
  work.visual.candidateId = context.candidateId;
  work.visual.domainEvidenceRef = f.write('spec/module-world-v1-without-blockout.json', spatialBasis);
  await putJson(repo, workPath, work);
  await assert.rejects(advanceVisual({ repo, workItem: workPath, to: 'V2' }), /blockoutRef/);
  work.visual.domainEvidenceRef = f.write('spec/module-world-v1.json', { ...spatialBasis, blockoutRef });
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V2' });
  work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V2');
  assert.equal(work.evidenceRef, null);
  assert.equal(work.implementationPackageRef, null);

  const review = f.write('reviews/module-space-review.json', { ...context, kind: 'world-3d-design-review',
    rounds: 1, status: 'COMPLETE', basisRefs: [spatialSpecRef, blockoutRef], issues: [] });
  const spaceApproval = f.write('reviews/module-space-approval.json', { ...context, stage: 'V2', purpose: 'space-baseline',
    decision: 'APPROVED', userMessageRef: 'test-only://space', subjectRef: spatialSpecRef, basisRefs: [blockoutRef, review] });
  const directionApproval = f.write('reviews/module-direction-approval.json', { ...context, stage: 'V2', purpose: 'visual-direction',
    decision: 'APPROVED', userMessageRef: 'test-only://direction', subjectRef: direction, basisRefs: [spaceApproval] });
  work.visual.candidateId = context.candidateId;
  work.visual.domainEvidenceRef = f.write('spec/module-world-v2.json', { ...context, designRoute: 'world-3d', stage: 'V2',
    scopeIds: f.scopeIds, spatialSpecRef, blockoutRef, reviewRef: review, spaceApprovalRef: spaceApproval,
    directionRef: direction, directionApprovalRef: directionApproval, functionBaselineRef: work.visual.functionBaselineRef });
  const stateDesign = f.write('spec/state-design.md', '合成状态的构图与反馈描述\n');
  const stepDesign = f.write('spec/step-design.md', '合成步骤的空间与时序描述\n');
  const design = f.write('spec/module-design.json', { schemaVersion: '1.0', workItemId: work.workItemId,
    modulePlanRef: planRef, baselineRef: baseline, entries: moduleDesignItems(plan).map((entry) => ({
      ...entry, targetRef: entry.kind === 'step' ? spatialSpecRef : direction,
      designRef: entry.kind === 'step' ? stepDesign : stateDesign,
    })) });
  work.visual.moduleDesignRef = design;
  work.visual.moduleDesignReviewRef = f.write('reviews/module-design-confirm.json', { schemaVersion: '1.0',
    workItemId: work.workItemId, stage: 'V2', decision: 'approved', userMessageRef: 'test-only://design', subjectRef: design });
  assert.equal(f.read(work.visual.domainEvidenceRef).blockoutRunRef, undefined);
  work.visual.hud = { scopeIds: ['late-hud'] };
  await putJson(repo, workPath, work);
  await assert.rejects(advanceVisual({ repo, workItem: workPath, to: 'V3' }), /HUD.*存在.*V1/);
  delete work.visual.hud;
  const contract = f.read(work.visual.domainEvidenceRef);
  const unapproved = f.write('reviews/unapproved-direction.json', { ...context, stage: 'V2', purpose: 'visual-direction',
    decision: 'REJECTED', userMessageRef: 'test-only://rejected', subjectRef: direction, basisRefs: [spaceApproval] });
  work.visual.domainEvidenceRef = f.write('spec/module-world-rejected.json', { ...contract, directionApprovalRef: unapproved });
  await putJson(repo, workPath, work);
  await assert.rejects(advanceVisual({ repo, workItem: workPath, to: 'V3' }), /确认|批准|APPROVED/);
  work.visual.domainEvidenceRef = f.identity('spec/module-world-v2.json');
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V3' });
  work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V3');
  assert.ok(work.visual.versionDesignSnapshotRef?.sha256);
});
