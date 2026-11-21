/** 通过合成材料检验公共控制器协议；不启动引擎，也不代替用户验收。 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, initializeWork, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateWork } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';
import { createFixture, frozenReview, put, putJson, readWork, runEngineeringStage } from './controller-fixture.mjs';

/** 写出合成空间依据并以真实文件摘要建立关联。 */
async function fixture(t) {
  const repo = await mkdtemp(resolve(tmpdir(), 'scene-design-'));
  const initialized = await initializeWork({ repo, args: { id: 'scene-design', stack: 'cocos', type: 'SCENE', objective: '验证默认二维场景空间设计' } });
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
  const bind = async () => { work = await readWork(f.repo, f.workPath); work.visual.sceneDesignRef = await json('spec/design.json', contract); await putJson(f.repo, f.workPath, work); };
  const approve = async ({ reviewOnly = false } = {}) => {
    contract.reviewRef = await json('review/scene.json', { ...context, kind: 'scene-design-review', rounds: 1, status: 'COMPLETE', basisRefs: [spatialSpecRef, layoutRef, layoutRunRef], issues: [] });
    if (!reviewOnly) contract.spaceApprovalRef = await json('review/space.json', { ...context, stage: 'V2', purpose: 'space-baseline', decision: 'APPROVED', userMessageRef: 'test-only://human-message', subjectRef: spatialSpecRef, basisRefs: [layoutRef, layoutRunRef, contract.reviewRef] });
    await bind();
  };
  return { ...f, context, contract, evidenceRoot: work.evidenceRoot, json, bind, approve };
}

test('二维世界 V1 需空间依据，进入 V2 需单次审查与人工确认，图片门仍有效', async (t) => {
  const f = await fixture(t);
  await assert.rejects(runEngineeringStage(f, 'V1'), /sceneDesignRef|空间|设计/i);
  assert.equal((await readWork(f.repo, f.workPath)).globalState, 'VALIDATING');
  await f.bind();
  // 前一次失败发生在 PASSED 检查，按实际控制器状态继续完成同一功能门。
  let work = await readWork(f.repo, f.workPath);
  if (work.globalState === 'VALIDATING') await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'PASSED', args: {} });
  else await runEngineeringStage(f, 'V1');
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' }), /review|审查|确认/i);
  await f.approve({ reviewOnly: true });
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' }), /approval|确认/i);
  await f.approve();
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  work = await readWork(f.repo, f.workPath);
  assert.equal(work.visual.stage, 'V2');
  const snapshot = JSON.parse(await readFile(resolve(f.repo, work.visual.functionBaselineRef.path), 'utf8'));
  assert.equal(snapshot.sceneDesignEvidenceRoot, f.evidenceRoot);
  assert.deepEqual(snapshot.sceneDesignRefs, { spatialSpecRef: f.contract.spatialSpecRef, layoutRef: f.contract.layoutRef, layoutRunRef: f.contract.layoutRunRef, scopeIds: f.contract.scopeIds });
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V3' }), /目标|target|确认|baseline/i);
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

  await runEngineeringStage(f, 'V1');
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
});

test('二维空间基线变更不能通过刷新或 RETURN 复用旧功能快照', async (t) => {
  for (const path of ['refresh', 'return']) await t.test(path, async (st) => {
    const f = await fixture(st);
    await f.bind();
    await runEngineeringStage(f, 'V1');
    await f.approve();
    await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
    let work = await readWork(f.repo, f.workPath);
    if (path === 'return') {
      await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'RETURN', args: { reason: '更改布局', 'affected-scope': 'implementation' } });
      work = await readWork(f.repo, f.workPath);
    } else {
      work.globalState = 'IMPLEMENTING';
      await putJson(f.repo, 'spec/regression.json', { localRegression: true, visualImpact: 'none', reason: '合成重验' });
    }
    const ref = await f.json('spec/alternate-layout.json', { description: '与原功能快照不同的布局' });
    f.contract.layoutRef = ref;
    await putJson(f.repo, f.workPath, work);
    await f.bind();
    if (path === 'refresh') await assert.rejects(refreshFunctionBaseline({ repo: f.repo, workItem: f.workPath, specPath: 'spec/regression.json' }), /空间|布局|基线|layout/i);
    else await assert.rejects(transitionWork({ repo: f.repo, workItem: f.workPath, to: 'REVIEW', args: { 'return-resolution': '重新验证布局' } }), /空间|布局|基线|layout/i);
  });
});

test('二维世界与游戏 UI 不得跨路线复用视觉确认', async (t) => {
  const world = await fixture(t);
  // 来源必须位于同一项目：在同一临时目录初始化独立 UI 工作项。
  const result = await initializeWork({ repo: world.repo, args: { id: 'ui-source', stack: 'cocos', type: 'SCENE', objective: '验证跨路线复用', 'design-route': 'game-ui', 'project-id': world.context.projectId, 'object-id': world.context.objectId } });
  for (const [workItem, sourceWorkItem] of [[world.workPath, result.metadata.workItemPath], [result.metadata.workItemPath, world.workPath]]) {
    await assert.rejects(reuseVisualReviews({ repo: world.repo, workItem, sourceWorkItem, impact: 'implementation', reason: '路线不同' }), /路线|world-2d|game-ui/i);
  }
});

test('二维场景使用新 MODULE 功能依赖刷新时继承空间快照，布局变化必须返修', async (t) => {
  const f = await fixture(t);
  await f.bind();
  await runEngineeringStage(f, 'V1');
  await f.approve();
  await advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' });
  let work = await readWork(f.repo, f.workPath);
  const old = JSON.parse(await readFile(resolve(f.repo, work.visual.functionBaselineRef.path), 'utf8'));
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
  const originalLayout = f.contract.layoutRef;
  f.contract.layoutRef = await f.json('spec/changed-layout.json', { changed: true });
  await f.bind();
  await assert.rejects(refreshFunctionBaseline({ repo: f.repo, workItem: f.workPath, specPath: 'spec/feature-refresh.json' }), /空间|布局|基线|layout/i);
  f.contract.layoutRef = originalLayout;
  await f.bind();
  await refreshFunctionBaseline({ repo: f.repo, workItem: f.workPath, specPath: 'spec/feature-refresh.json' });
  work = await readWork(f.repo, f.workPath);
  const refreshed = JSON.parse(await readFile(resolve(f.repo, work.visual.functionBaselineRef.path), 'utf8'));
  assert.equal(refreshed.mode, 'dependencies');
  assert.equal(refreshed.sceneDesignEvidenceRoot, old.sceneDesignEvidenceRoot);
  assert.deepEqual(refreshed.sceneDesignRefs, old.sceneDesignRefs);
});

test('二维方向 RETURN 保留空间审查和确认，失效的方向批准不能重新绑定', async (t) => {
  const f = await fixture(t);
  await f.bind();
  await runEngineeringStage(f, 'V1');
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
