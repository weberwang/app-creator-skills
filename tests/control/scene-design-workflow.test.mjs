/** 通过合成材料检验公共控制器协议；不启动引擎，也不代替用户验收。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, initializeWork, inspect, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateWork } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { validateWorld2DDesign } from '../../skills/app-workflow-control/scripts/runtime/scene-design-contract.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';
import { minimalPng, validManifest } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { fixtureLayoutDocument } from '../../skills/cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs';
import { createFixture, createQualityChecks, frozenReview, prepareFormalVisualFixture, put, putJson, putVisualReview, readWork, reviewRecord, runEngineeringStage } from './controller-fixture.mjs';
import { confirmModuleDesignFixture } from './module-design-fixture.mjs';

/** 写出合成空间依据并以真实文件摘要建立关联。 */
async function fixture(t) {
  const repo = await mkdtemp(resolve(tmpdir(), 'scene-design-'));
  const initialized = await initializeWork({ repo, args: { id: 'scene-design', stack: 'cocos', type: 'SCENE', 'object-id': 'main-gameplay', objective: '验证默认二维场景空间设计' } });
  const f = { repo, workPath: initialized.metadata.workItemPath };
  t.after(() => rm(f.repo, { recursive: true, force: true }));
  let work = await readWork(f.repo, f.workPath);
  assert.equal(work.visual.designRoute, 'world-2d');
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(f.repo, f.workPath, work);

  work = await readWork(f.repo, f.workPath);
  const context = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId };
  const json = async (path, value) => { await putJson(f.repo, path, value); return frozenReview(f.repo, path); };
  const file = async (path) => { await put(f.repo, path, '仅供测试的合成材料\n'); return frozenReview(f.repo, path); };
  const scopeIds = ['entry'];
  const spatialSpecRef = await json('spec/space.json', { ...context, dimension: 2, units: 'm', scopeIds, regions: [{ id: 'entry' }], playerScale: [1, 2], viewport: { width: 1280, height: 720 } });
  const layoutRef = await file('assets/layout.ts');
  const commandEvidenceRef = await file(`${work.evidenceRoot}/layout-command.txt`);
  const checks = [];
  for (const id of ['camera', 'navigation', 'collision', 'interaction']) checks.push({ id, status: 'PASS', evidenceRef: await file(`${work.evidenceRoot}/layout-${id}.txt`) });
  const layoutRunRef = await json(`${work.evidenceRoot}/layout-run.json`, { ...context, phase: 'layout', executionMode: 'engine', engineSessionId: 'synthetic-session', startedAt: '2026-11-15T00:00:00Z', completedAt: '2026-11-15T00:01:00Z', sceneRef: layoutRef, commandEvidenceRef, checks });
  const contract = { ...context, designRoute: 'world-2d', scopeIds, spatialSpecRef, layoutRef, layoutRunRef };
  const bind = async (path = 'spec/design.json') => { work = await readWork(f.repo, f.workPath); work.visual.sceneDesignRef = await json(path, contract); await putJson(f.repo, f.workPath, work); };
  const approve = async ({ reviewOnly = false } = {}) => {
    contract.reviewRef = await json('review/scene.json', { ...context, kind: 'scene-design-review', rounds: 1, status: 'COMPLETE', basisRefs: [spatialSpecRef, layoutRef, layoutRunRef], issues: [] });
    if (!reviewOnly) contract.spaceApprovalRef = await json('review/space.json', { ...context, stage: 'V2', purpose: 'space-baseline', decision: 'APPROVED', userMessageRef: 'test-only://human-message', subjectRef: spatialSpecRef, basisRefs: [layoutRef, layoutRunRef, contract.reviewRef] });
    await bind();
  };
  return { ...f, context, contract, evidenceRoot: work.evidenceRoot, json, bind, approve };
}

/** 绑定 Cocos 原生目标、场景覆盖和模块覆盖，测试可经真实门禁冻结二维空间。 */
async function confirmSceneDesign(f) {
  const work = await readWork(f.repo, f.workPath);
  const manifest = validManifest();
  Object.assign(manifest, { visualStageModel: 'function-first-v1', visualStage: 'V2', visualStageState: 'in-progress', workItemId: work.workItemId });
  await putJson(f.repo, manifest.scene_reconstruction_contract.layout_decomposition.layout_source.nodes_file, fixtureLayoutDocument(manifest.scene_reconstruction_contract));
  const domainPath = await putJson(f.repo, 'spec/cocos-v2.json', manifest);
  const image = await put(f.repo, 'evidence/visual/mockup.png', minimalPng(390, 844));
  const target = { targetId: 'entry', candidateId: manifest.candidateVersion, sceneId: work.visual.objectId, stateId: 'default', viewport: { width: 390, height: 844 }, scope: 'entry', referenceTarget: await frozenReview(f.repo, image) };
  const review = await putVisualReview(f.repo, 'review/entry-v2.json', reviewRecord({
    objectId: target.sceneId, candidateId: target.candidateId, stage: 'V2', purpose: 'target', targetRef: image,
    userMessageRef: 'test-only://target', qualityChecks: await createQualityChecks(f.repo, 'review/entry-quality'),
  }), work.workItemId, image, null, target.targetId);
  work.visual.targets = [{ ...target, domainEvidenceRef: { path: domainPath }, reviews: { V2: await frozenReview(f.repo, review) } }];
  work.visual.coverageRef = await f.json('spec/coverage.json', {
    workItemId: work.workItemId, sceneId: target.sceneId, status: 'CONFIRMED', userMessageRef: 'test-only://coverage', targetIds: [target.targetId], targets: [target],
  });
  await confirmModuleDesignFixture(f.repo, work, [{ targetRef: target.referenceTarget }]);
  await putJson(f.repo, f.workPath, work);
}

test('世界场景初始化后立即交接 V1 设计任务，纯界面和 App 不交接', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'scene-design-dispatch-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  for (const [id, stack, type, route, expected] of [
    ['world2d', 'cocos', 'SCENE', undefined, 'world-2d'],
    ['world3d', 'threejs', 'SCENE', 'world-3d', 'world-3d'],
    ['game-ui', 'cocos', 'SCENE', 'game-ui', undefined],
    ['app-page', 'flutter', 'PAGE', undefined, undefined],
  ]) await t.test(id, async () => {
    const result = await initializeWork({ repo, args: { id, stack, type, objective: '核对 V1 设计任务分流',
      'object-id': `${id}-object`, ...(route && { 'design-route': route }) } });
    const task = expected && { stage: 'V1', workItemId: id, objectId: `${id}-object`, designRoute: expected };
    const workItem = result.metadata.workItemPath;
    const before = await readWork(repo, workItem);
    for (const output of [result, inspect({ repo, workItem }), inspect({ repo, workItem, check: true })]) {
      assert.deepEqual(output.metadata.sceneDesignTask, task);
      assert.equal(output.next.filter((step) => step.includes('场景／关卡设计')).length, expected ? 1 : 0);
    }
    if (id === 'world2d') {
      // F0 尚未完成时，安全运行仍可提示在 V1 核对设计任务的适用性。
      const controller = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
      const run = spawnSync(process.execPath, [controller, 'run', '--repo', repo, '--work-item', workItem], { encoding: 'utf8', windowsHide: true });
      assert.equal(run.status, 2, run.stdout + run.stderr);
      assert.deepEqual(JSON.parse(run.stdout).metadata.sceneDesignTask, task);
    }
    assert.deepEqual(await readWork(repo, workItem), before);
  });
});

test('二维世界 V1 需空间依据，V2 需单次审查和人工确认并继续核对图片', async (t) => {
  const f = await fixture(t);
  await assert.rejects(runEngineeringStage(f, 'V1'), /sceneDesignRef|空间|设计/i);
  assert.equal((await readWork(f.repo, f.workPath)).globalState, 'VALIDATING');
  await f.bind();
  // 前一次失败发生在 PASSED 检查，按实际控制器状态继续完成同一功能门。
  let work = await readWork(f.repo, f.workPath);
  if (work.globalState === 'VALIDATING') await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'PASSED', args: {} });
  else await runEngineeringStage(f, 'V1');
  await prepareFormalVisualFixture(f);
  const enteredV2 = await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  assert.equal(enteredV2.metadata.sceneDesignTask, undefined);
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' }), /review|审查|确认/i);
  await f.approve({ reviewOnly: true });
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' }), /approval|确认/i);
  await f.approve();
  work = await readWork(f.repo, f.workPath);
  assert.equal(work.visual.stage, 'V2');
  const snapshot = JSON.parse(await readFile(resolve(f.repo, work.visual.functionBaselineRef.path), 'utf8'));
  assert.equal(snapshot.mode, 'module-plan');
  assert.equal(snapshot.evidenceRoot, f.evidenceRoot);
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' }), /目标|target|范围/);
  await confirmSceneDesign(f);
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' });
  work = await readWork(f.repo, f.workPath);
  const archive = await readWork(f.repo, work.visual.versionDesignSnapshotRef.path);
  assert.deepEqual(archive.versionVisualSnapshot.visual.sceneDesignRef, work.visual.sceneDesignRef);
});

test('二维世界使用布局合同并拒绝白模与白模运行字段', async (t) => {
  const f = await fixture(t);
  await f.bind();
  const current = await readWork(f.repo, f.workPath);
  assert.doesNotThrow(() => validateWorld2DDesign(f.repo, current));
  for (const field of ['blockoutRef', 'blockoutRunRef']) {
    f.contract[field] = f.contract.layoutRef;
    await f.bind();
    const work = await readWork(f.repo, f.workPath);
    assert.throws(() => validateWorld2DDesign(f.repo, work), new RegExp(field));
    delete f.contract[field];
  }
});

test('二维空间版本、区域和路线错绑不能通过功能门', async (t) => {
  for (const mutation of ['digest', 'scope', 'route']) {
    await t.test(mutation, async (st) => {
      const f = await fixture(st);
      if (mutation === 'digest') f.contract.layoutRef.sha256 = '0'.repeat(64);
      if (mutation === 'scope') f.contract.scopeIds = ['other'];
      if (mutation === 'route') f.contract.designRoute = 'world-3d';
      await f.bind();
      await assert.rejects(runEngineeringStage(f, 'V1'));
    });
  }
});

test('显式游戏 UI 不接受世界空间记录，也不增加空间前置', async (t) => {
  const f = await createFixture({ id: 'ui-only', stack: 'cocos', type: 'SCENE', designRoute: 'game-ui' });
  t.after(() => rm(f.repo, { recursive: true, force: true }));
  let work = await readWork(f.repo, f.workPath);
  const invalid = structuredClone(work);
  invalid.visual.sceneDesignRef = { path: 'x.json', sha256: '0'.repeat(64) };
  assert.throws(() => validateWork(invalid), /sceneDesignRef|场景设计|game-ui/i);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(f.repo, f.workPath, work);

  await prepareFormalVisualFixture(f);
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
});

test('二维场景实现返修不能替换 V2 已冻结的布局', async (t) => {
  const f = await fixture(t);
  await prepareFormalVisualFixture(f);
  await f.approve();
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  await confirmSceneDesign(f);
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' });
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'RETURN', args: { reason: '更改布局', 'affected-scope': 'implementation' } });
  const before = await readWork(f.repo, f.workPath);
  f.contract.layoutRef = await f.json('spec/alternate-layout.json', { description: '与冻结稿不同的布局' });
  await f.bind('spec/changed-design.json');
  await assert.rejects(transitionWork({ repo: f.repo, workItem: f.workPath, to: 'REVIEW', args: { 'return-resolution': '重新验证布局' } }), /二维空间依据 layoutRef 已变化/);
  await putJson(f.repo, f.workPath, { ...before, gateStatus: { ...before.gateStatus, F2: 'PASS' } });
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'REVIEW', args: { 'return-resolution': '沿用已确认的布局并重做实现' } });
  assert.equal((await readWork(f.repo, f.workPath)).globalState, 'REVIEW');
});

test('二维世界与游戏 UI 不得跨路线复用视觉确认', async (t) => {
  const world = await fixture(t);
  // 来源必须位于同一项目：在同一临时目录初始化独立 UI 工作项。
  const result = await initializeWork({ repo: world.repo, args: { id: 'ui-source', stack: 'cocos', type: 'SCENE', objective: '验证跨路线复用', 'design-route': 'game-ui', 'project-id': world.context.projectId, 'object-id': world.context.objectId } });
  for (const [workItem, sourceWorkItem] of [[world.workPath, result.metadata.workItemPath], [result.metadata.workItemPath, world.workPath]]) {
    await assert.rejects(reuseVisualReviews({ repo: world.repo, workItem, sourceWorkItem, impact: 'implementation', reason: '路线不同' }), /路线|world-2d|game-ui/i);
  }
});

test('二维场景不能用新的 MODULE 功能证据替换已冻结的 V1 方案', async (t) => {
  const f = await fixture(t);
  await prepareFormalVisualFixture(f);
  await f.approve();
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  const { visual } = await readWork(f.repo, f.workPath);
  const init = await initializeWork({ repo: f.repo, args: { id: 'function-module', stack: 'cocos', type: 'MODULE', objective: '合成行为回归', 'project-id': f.context.projectId } });
  const source = { repo: f.repo, workPath: init.metadata.workItemPath };
  let moduleWork = await readWork(f.repo, source.workPath);
  moduleWork.globalState = 'REVIEW';
  moduleWork.gateStatus.F0 = moduleWork.gateStatus.F1 = 'PASS';
  await putJson(f.repo, source.workPath, moduleWork);
  moduleWork = await runEngineeringStage(source, 'feature');
  const casePath = `${moduleWork.evidenceRoot}/case.json`;
  await putJson(f.repo, casePath, { schemaVersion: '1.0', workItemId: moduleWork.workItemId, projectId: moduleWork.projectId, stack: moduleWork.stack, caseId: 'walk', status: 'PASS', objectIds: [f.context.objectId] });
  const manifest = JSON.parse(await readFile(resolve(f.repo, moduleWork.evidenceRef.path), 'utf8'));
  manifest.items.push({ category: 'feature-case', status: 'PASS', path: casePath });
  await putJson(f.repo, moduleWork.evidenceRef.path, manifest);
  await putJson(f.repo, 'spec/feature-refresh.json', { visualImpact: 'none', reason: '用新功能结果重验', functionDependencies: [{ workItemRef: { path: source.workPath }, caseId: 'walk', evidenceRef: await frozenReview(f.repo, casePath) }] });
  await assert.rejects(refreshFunctionBaseline({ repo: f.repo, workItem: f.workPath, specPath: 'spec/feature-refresh.json' }), /使用 V1 模块方案.*返回 V1/);
  assert.deepEqual((await readWork(f.repo, f.workPath)).visual, visual);
});

test('二维方向 RETURN 保留空间审查和确认，失效的方向批准不能重新绑定', async (t) => {
  const f = await fixture(t);
  await prepareFormalVisualFixture(f);
  await f.approve();
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  let work = await readWork(f.repo, f.workPath);
  const spaceRef = work.visual.sceneDesignRef;
  const directionApprovalRef = await f.json('review/target.json', { stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: 'test-only://direction' });
  work.visual.targets = [{ targetId: 'entry', candidateId: 'candidate', sceneId: 'entry', stateId: 'default', viewport: { width: 1280, height: 720 }, scope: 'entry', reviews: { V2: directionApprovalRef } }];
  await putJson(f.repo, f.workPath, work);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'RETURN', args: { reason: '调整正式方向', 'affected-scope': 'visual:V2' } });
  work = await readWork(f.repo, f.workPath);
  assert.deepEqual(work.visual.sceneDesignRef, spaceRef);
  assert.ok(!work.invalidatedRefs.some((entry) => [f.contract.reviewRef.path, f.contract.spaceApprovalRef.path].includes(entry.path)));
  assert.ok(work.invalidatedRefs.some((entry) => entry.path === directionApprovalRef.path));
  work.visual.targets[0].reviews.V2 = directionApprovalRef;
  assert.throws(() => validateWork(work, { repo: f.repo }), /已作废/);
});
