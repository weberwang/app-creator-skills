import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { syntheticDesignPng } from './visual-image-fixture.mjs';
import { advanceVisual, checkProtectedAction, completeUnit, initializeWork, inspect, inspectFunctionSource, refreshFunctionBaseline } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertOwnedPath, loadProfile, pathMatch } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { transitionWork, inferReturnState } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { WorkflowError } from '../../skills/app-workflow-control/scripts/runtime/io.mjs';
import { validateFeatureDependencies } from '../../skills/app-workflow-control/scripts/runtime/feature-dependencies.mjs';
import { minimalPng, validManifest } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';
import { fixtureLayoutDocument } from '../../skills/cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';
import { writeSingleDomainFixture } from './single-domain-fixture.mjs';
import { attachFigmaBaselineFixture } from './figma-app-fixture.mjs';
import { collectIntegrationSystemSources } from '../../skills/app-workflow-control/scripts/runtime/integration-system-sources.mjs';
import { coverageMappings } from './integration-coverage-fixture.mjs';
import { moduleDesignItems } from './module-rules-fixture.mjs';

import { createFixture, put, readWork, putJson, createQualityChecks, reviewRecord, putVisualReview, frozenReview, bindImplementation, submitPassingUnits, bindEvidence, runEngineeringStage, readyForRelease, approveRelease, prepareFormalVisualFixture } from './controller-fixture.mjs';

const cliPath = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

test('V1 方案完整且基础视觉就绪后进入 V2，方案变更阻断后续推进', async (t) => {
  const fixture = await createFixture({ id: 'function-first', type: 'PAGE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);

  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' }), /基础视觉冻结清单/);
  const prepared = await prepareFormalVisualFixture(fixture);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.visual.stage, 'V2');
  assert.deepEqual(work.globalVisualBaselineRef, prepared.baselineRef);
  assert.ok(work.visual.functionBaselineRef.sha256);
  const snapshot = JSON.parse(await readFile(resolve(fixture.repo, work.visual.functionBaselineRef.path), 'utf8'));
  assert.equal(snapshot.mode, 'module-plan');
  assert.equal(inspect({ repo: fixture.repo, workItem: fixture.workPath }).status, 'PASS');
  work.action = { actionId: 'module-design', effects: ['external-write'], target: 'figma:file123', approval: {
    workItemId: work.workItemId, stack: work.stack, stageId: work.stageId, actionId: 'module-design',
    effects: ['external-write'], target: 'figma:file123', userMessageRef: 'test://figma-approval',
  } };
  work.gateStatus.F2 = work.gateStatus.F4 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  assert.equal(checkProtectedAction({ repo: fixture.repo, workItem: fixture.workPath, actionId: 'module-design', effect: 'external-write', target: 'figma:file123' }).status, 'PASS');
  assert.throws(() => checkProtectedAction({ repo: fixture.repo, workItem: fixture.workPath, actionId: 'module-design', effect: 'external-write', target: 'figma:other' }), /不匹配/);
  await put(fixture.repo, prepared.planPath, '被改写的模块方案');
  assert.equal(inspect({ repo: fixture.repo, workItem: fixture.workPath }).status, 'BLOCKED');
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '功能范围发生变化', 'affected-scope': 'function' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V1');
  assert.equal(returned.visual.functionBaselineRef, undefined);
  assert.ok(returned.invalidatedRefs.some((ref) => ref.path === work.visual.functionBaselineRef.path));
});

test('早期功能集成不等待场景视觉完成', async (t) => {
  const fixture = await createFixture({ id: 'feature-integration', type: 'INTEGRATION' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.integrationPurpose, 'feature');
  assert.equal(work.stageId, 'cross-module-integration');
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'feature');
  assert.equal(work.globalState, 'PASSED');
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });

});

test('跨对象功能来源必须严格通过并绑定真实行为证据', async (t) => {
  const fixture = await createFixture({ id: 'purchase-module', type: 'MODULE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let source = await readWork(fixture.repo, fixture.workPath);
  source.globalState = 'REVIEW';
  source.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };
  await putJson(fixture.repo, fixture.workPath, source);
  source = await runEngineeringStage(fixture, 'feature');
  const casePath = `${source.evidenceRoot}/purchase.json`;
  await putJson(fixture.repo, casePath, { schemaVersion: '1.0', workItemId: source.workItemId, projectId: source.projectId, stack: source.stack, caseId: 'purchase', status: 'PASS', objectIds: ['shop'] });
  const manifest = JSON.parse(await readFile(resolve(fixture.repo, source.evidenceRef.path), 'utf8'));
  manifest.items.push({ category: 'feature-case', status: 'PASS', path: casePath });
  await putJson(fixture.repo, source.evidenceRef.path, manifest);
  const initialized = await initializeWork({ repo: fixture.repo, args: { id: 'shop', stack: 'flutter', type: 'PAGE', objective: '商店', 'object-id': 'shop' } });
  const target = await readWork(fixture.repo, initialized.metadata.workItemPath);
  target.visual.functionDependencies = [{ workItemRef: { path: fixture.workPath }, caseId: 'purchase', evidenceRef: await frozenReview(fixture.repo, casePath) }];
  const verify = () => validateFeatureDependencies(fixture.repo, target, inspectFunctionSource);
  assert.equal(verify()[0].caseId, 'purchase');
  target.visual.functionDependencies[0].evidenceRef.sha256 = 'f'.repeat(64);
  assert.throws(verify, /摘要|变化/);
  target.visual.functionDependencies[0].evidenceRef = await frozenReview(fixture.repo, casePath);
  source.globalState = 'RETURN';
  await putJson(fixture.repo, fixture.workPath, source);
  assert.throws(verify, /尚未通过/);
});
test('视觉复用不能绕过当前工作项的 V1 方案确认', async (t) => {
  const fixture = await createFixture({ id: 'reuse-target', type: 'PAGE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const source = await initializeWork({ repo: fixture.repo, args: { id: 'reuse-source', stack: 'flutter', type: 'PAGE', objective: '复用来源', 'object-id': 'reuse-target' } });
  await assert.rejects(reuseVisualReviews({ repo: fixture.repo, workItem: fixture.workPath, sourceWorkItem: source.metadata.workItemPath, impact: 'implementation', reason: '检查不能跳过功能阶段' }), /先完成 V1/);
});

test('旧阶段含义未标记时拒绝误读，SCENE 的 V1 可没有视觉目标', async (t) => {
  const fixture = await createFixture({ id: 'scene-no-target', stack: 'cocos', type: 'SCENE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);

  const current = await readWork(fixture.repo, fixture.workPath);
  assert.deepEqual(current.visual.targets, []);
  delete current.visual.stageModel;
  await putJson(fixture.repo, fixture.workPath, current);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /旧工作项不能按新阶段解释/);
});

test('SCENE 在 V3、V4 实现返修只撤销运行验收并保留视觉与素材确认', async (t) => {
  for (const stage of ['V3', 'V4']) {
    const fixture = await createFixture({ id: `scene-return-${stage}`, stack: 'cocos', type: 'SCENE' });
    t.after(() => rm(fixture.repo, { recursive: true, force: true }));
    const work = await readWork(fixture.repo, fixture.workPath);
    const ref = (path) => ({ path, sha256: 'a'.repeat(64) });
    work.globalState = 'REVIEW';
    work.visual.stage = stage;
    work.visual.targets = [{ targetId: 'view', reviews: { V2: ref('reviews/target.json'), V3Decomposition: ref('reviews/decomposition.json'), V3Layout: ref('reviews/layout.json'), V4: ref('reviews/assets.json'), V5: ref('reviews/runtime.json') }, assetReviewRef: ref('reviews/asset-review.json') }];
    work.visual.integrationEvidenceRef = ref('reviews/integration.json');
    work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'NOT_RUN' };
    await putJson(fixture.repo, fixture.workPath, work);
    await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '修复内部实现', 'affected-scope': 'implementation' } });
    const returned = await readWork(fixture.repo, fixture.workPath);
    assert.equal(returned.visual.stage, stage);
    assert.deepEqual(Object.keys(returned.visual.targets[0].reviews), ['V2', 'V3Decomposition', 'V3Layout', 'V4']);
    assert.equal(returned.visual.targets[0].assetReviewRef.path, 'reviews/asset-review.json');
    assert.equal(returned.visual.integrationEvidenceRef, undefined);
    assert.ok(returned.invalidatedRefs.some((item) => item.path === 'reviews/runtime.json'));
  }
});

test('方案驱动的模块拒绝旧功能基线重绑并要求回到 V1', async (t) => {
  const fixture = await createFixture({ id: 'refresh-page', type: 'PAGE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await prepareFormalVisualFixture(fixture);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });
  await putJson(fixture.repo, 'docs/function-refresh.json', { visualImpact: 'none', reason: '方案发生变化' });
  await assert.rejects(refreshFunctionBaseline({ repo: fixture.repo, workItem: fixture.workPath, specPath: 'docs/function-refresh.json' }), /返回 V1/);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '功能方案发生变化', 'affected-scope': 'function' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V1');
  assert.equal(returned.visual.functionBaselineRef, undefined);
});
test('五栈可初始化工作项；check 严格识别 F0 阻断且不写工作项', async (t) => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const before = await readFile(resolve(fixture.repo, fixture.workPath));
  const check = inspect({ repo: fixture.repo, workItem: fixture.workPath, check: true });
  assert.equal(check.status, 'BLOCKED');
  assert.ok(check.blocking.some((reason) => reason.includes('F0')));
  assert.deepEqual(await readFile(resolve(fixture.repo, fixture.workPath)), before);
});

test('项目授权路径可以超出技术栈默认根；禁止路径与跨单元文件仍会阻断', async (t) => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.allowedPaths = ['lib', 'shared-assets'];
  work.forbiddenPaths = ['shared-assets/private/**'];
  const profile = loadProfile(fixture.repo, 'flutter');
  assert.equal(assertOwnedPath(fixture.repo, work, profile, 'shared-assets/animation/source.json'), 'shared-assets/animation/source.json');
  assert.throws(() => assertOwnedPath(fixture.repo, work, profile, 'shared-assets/private/key.json'), { code: 'FORBIDDEN_PATH' });
  assert.equal(pathMatch('.git/config', '**/.git/**'), true);
  assert.equal(pathMatch('assets/source.png', '**/*.png'), true);
  const { packPath, units } = await bindImplementation({
    repo: fixture.repo, work, workPath: fixture.workPath, stage: 'V1',
    unitPaths: ['shared-assets/a.json', 'shared-assets/b.json'],
  });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BASELINE', args: { } }).catch(() => {});
  work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(fixture.repo, fixture.workPath);
  await submitPassingUnits({ repo: fixture.repo, work, workPath: fixture.workPath, packPath, units, declaredPaths: [['shared-assets/b.json']] });
  await assert.rejects(
    completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: units[0].resultPath }),
    /越过单元 unit-1 的文件所有权/,
  );
  const state = JSON.parse(await readFile(resolve(fixture.repo, work.evidenceRoot, 'execution-state.json'), 'utf8'));
  assert.equal(state.units[0].status, 'PENDING');
});

test('拒绝错栈、跳级和假 PASS 执行结果', async (t) => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: {} }), /不合法状态迁移/);
  const pack = await bindImplementation({ repo: fixture.repo, work, workPath: fixture.workPath, stage: 'V1' });
  const badPack = JSON.parse(await readFile(resolve(fixture.repo, pack.packPath), 'utf8'));
  badPack.stack = 'unity';
  await putJson(fixture.repo, pack.packPath, badPack);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} }), /技术栈错绑/);
});

test('RETURN 可记录未决拷问阻断，但恢复仍要解决拷问', async (t) => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const grillingPath = '.workflow-control/grilling/open.json';
  await putJson(fixture.repo, grillingPath, { schemaVersion: '1.0', workItemId: 'sample', status: 'OPEN', decisions: [{ question: '范围?', impact: '返工', options: ['甲', '乙'], recommendation: '甲' }] });
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'PROPOSAL';
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.grillingRef = { path: grillingPath };
  await putJson(fixture.repo, fixture.workPath, work);
  const returned = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '发现上游范围矛盾', 'affected-scope': 'stage:foundation-engineering' } });
  assert.ok(returned.stage.endsWith('/RETURN'));
  assert.equal(returned.metadata.returnState, 'PROPOSAL');
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PROPOSAL', args: { 'return-resolution': '已处理' } }),
    /未决拷问/,
  );
  const remainsReturned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(remainsReturned.globalState, 'RETURN');
  assert.throws(() => inferReturnState('stage:not-a-stage', 'release'), { name: 'WorkflowError' });
});

test('需求 RETURN 清除旧门并要求重新确认 F0、F1', async (t) => {
  const fixture = await createFixture({ id: 'requirements-return' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '需求边界发生变化', 'affected-scope': 'requirements' } });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.deepEqual(work.gateStatus, { F0: 'NOT_RUN', F1: 'NOT_RUN', F2: 'NOT_RUN', F3: 'NOT_RUN', F4: 'NOT_RUN' });
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BASELINE', args: { 'return-resolution': '补充需求证据' } }),
    /缺少已通过的质量门：F0/,
  );
  work = await readWork(fixture.repo, fixture.workPath);
  work.gateStatus.F0 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BASELINE', args: { 'return-resolution': '重新确认需求事实' } });
  const check = inspect({ repo: fixture.repo, workItem: fixture.workPath, check: true });
  assert.equal(check.status, 'BLOCKED');
  assert.ok(check.blocking.some((reason) => reason.includes('F1')));
});

test('视觉 RETURN 回退到最早受影响阶段并撤销下游确认', async (t) => {
  const fixture = await createFixture({ id: 'visual-return', type: 'PAGE', objective: '维护页面视觉确认' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.visual.stage = 'V5';
  work.visual.candidateId = 'direction-a';
  work.visual.reviews = {
    V2: { path: 'reviews/v1.json', sha256: '0'.repeat(64) },
    V3Decomposition: { path: 'reviews/v2-decomposition.json', sha256: '0'.repeat(64) },
    V3Layout: { path: 'reviews/v2-layout.json', sha256: '0'.repeat(64) },
    V4: { path: 'reviews/v3.json', sha256: '0'.repeat(64) }, V5: { path: 'reviews/v4.json', sha256: '0'.repeat(64) },
  };
  // 这些合成文件用于证明 RETURN 只作废引用，不删除历史材料。
  await putJson(fixture.repo, 'reviews/v2-layout.json', { historical: 'layout' });
  await putJson(fixture.repo, 'reviews/assets.json', { historical: 'assets' });
  await putJson(fixture.repo, 'reviews/domain.json', { historical: 'domain' });
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, 'reviews/domain.json');
  await putJson(fixture.repo, 'reviews/global-baseline.json', { scope: 'synthetic' }); work.globalVisualBaselineRef = await frozenReview(fixture.repo, 'reviews/global-baseline.json');
  work.assetReviewRef = { path: 'reviews/assets.json', sha256: '0'.repeat(64) };
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '布局方向变更', 'affected-scope': 'visual:V3' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V3');
  assert.equal(returned.visual.reviews.V2.path, 'reviews/v1.json');
  assert.equal(returned.visual.reviews.V3Decomposition, undefined);
  assert.equal(returned.visual.reviews.V3Layout, undefined);
  assert.equal(returned.visual.reviews.V4, undefined);
  assert.equal(returned.visual.reviews.V5, undefined);
  assert.equal(returned.globalVisualBaselineRef.path, 'reviews/global-baseline.json');
  assert.equal(returned.assetReviewRef, null);
  assert.equal(returned.visual.domainEvidenceRef, undefined);
  assert.ok(returned.invalidatedRefs.some((ref) => ref.path === 'reviews/domain.json' && ref.state === 'V5'));
  for (const path of ['reviews/v2-layout.json', 'reviews/assets.json', 'reviews/domain.json']) assert.ok((await readFile(resolve(fixture.repo, path))).length);
  assert.equal(returned.gateStatus.F2, 'NOT_RUN');
  assert.equal(returned.gateStatus.F3, 'NOT_RUN');
  returned.visual.reviews.V3Layout = { path: 'reviews/v2-layout.json', sha256: '0'.repeat(64) };
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /visual\.reviews\.V3Layout 重新绑定了 RETURN 已作废引用/);
  returned.visual.reviews.V3Layout = undefined;
  returned.assetReviewRef = { path: 'reviews/assets.json', sha256: '0'.repeat(64) };
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /assetReviewRef 重新绑定了 RETURN 已作废引用/);
  returned.assetReviewRef = null;
  returned.visual.domainEvidenceRef = await frozenReview(fixture.repo, 'reviews/domain.json');
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /重新绑定.*已作废引用/);
});

test('全局基线 RETURN 后不能重绑旧选择记录', async (t) => {
  const fixture = await createFixture({ id: 'baseline-return', type: 'PAGE', objective: '更新全局视觉基线' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  await putJson(fixture.repo, 'reviews/global-baseline.json', { scope: 'synthetic' }); work.globalVisualBaselineRef = await frozenReview(fixture.repo, 'reviews/global-baseline.json');
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '视觉基线变更', 'affected-scope': 'stage:global-baseline' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.globalVisualBaselineRef, null);
  assert.equal(returned.visual.stage, 'V1');
  returned.globalVisualBaselineRef = await frozenReview(fixture.repo, 'reviews/global-baseline.json');
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /globalVisualBaselineRef 重新绑定了 RETURN 已作废引用/);
});

test('实现返修 RETURN 保留仍有效的 V2–V4 确认与素材评审', async (t) => {
  const fixture = await createFixture({ id: 'implementation-return', type: 'PAGE', objective: '修复页面实现' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.visual.stage = 'V5';
  work.visual.candidateId = 'direction-a';
  work.visual.reviews = {
    V2: { path: 'reviews/v1.json', sha256: '0'.repeat(64) }, V3Decomposition: { path: 'reviews/v2-decomposition.json', sha256: '0'.repeat(64) },
    V3Layout: { path: 'reviews/v2-layout.json', sha256: '0'.repeat(64) }, V4: { path: 'reviews/v3.json', sha256: '0'.repeat(64) }, V5: { path: 'reviews/v4.json', sha256: '0'.repeat(64) },
  };
  await putJson(fixture.repo, 'reviews/runtime-domain.json', { historical: 'runtime' });
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, 'reviews/runtime-domain.json');
  work.assetReviewRef = { path: 'reviews/assets.json', sha256: '0'.repeat(64) };
  work.implementationPackageRef = { path: 'packages/old.json' };
  work.evidenceRef = { path: 'evidence/old.json' };
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '修复实现问题', 'affected-scope': 'implementation' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V5');
  assert.equal(returned.visual.reviews.V2.path, 'reviews/v1.json');
  assert.equal(returned.visual.reviews.V3Decomposition.path, 'reviews/v2-decomposition.json');
  assert.equal(returned.visual.reviews.V3Layout.path, 'reviews/v2-layout.json');
  assert.equal(returned.visual.reviews.V4.path, 'reviews/v3.json');
  assert.equal(returned.visual.reviews.V5, undefined);
  assert.equal(returned.visual.domainEvidenceRef, undefined);
  assert.ok(returned.invalidatedRefs.some((ref) => ref.path === 'reviews/runtime-domain.json'));
  assert.ok((await readFile(resolve(fixture.repo, 'reviews/runtime-domain.json'))).length);
  assert.equal(returned.assetReviewRef.path, 'reviews/assets.json');
  assert.equal(returned.implementationPackageRef, null);
  assert.equal(returned.evidenceRef, null);
});

test('RETURN 和 BLOCKED 期间不能推进视觉阶段', async (t) => {
  const fixture = await createFixture({ id: 'blocked-visual-stage', type: 'PAGE', objective: '验证视觉阶段恢复边界' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.visual.stage = 'V3';
  work.globalState = 'BLOCKED';
  work.blockedRecord = { reason: '等待解决', returnState: 'REVIEW', resolvedAt: null };
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V4' }), /未解决前不能推进视觉阶段/);
  work.globalState = 'RETURN';
  work.blockedRecord = null;
  work.returnRecord = { reason: '等待解决', affectedScope: 'visual:V3', returnState: 'REVIEW', resolvedAt: null, invalidatedRefs: [], evidenceRoot: work.evidenceRoot };
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V4' }), /未解决前不能推进视觉阶段/);
});

test('BLOCKED 只能恢复原状态；IMPLEMENTING 恢复保留并重验现有执行批次', async (t) => {
  const intake = await createFixture({ id: 'blocked-intake' });
  t.after(() => rm(intake.repo, { recursive: true, force: true }));
  await transitionWork({ repo: intake.repo, workItem: intake.workPath, to: 'BLOCKED', args: { reason: '等待澄清' } });
  await assert.rejects(
    transitionWork({ repo: intake.repo, workItem: intake.workPath, to: 'BASELINE', args: { 'return-resolution': '任意跳级' } }),
    /恢复入口由 affected-scope 推导/,
  );
  const restoredIntake = await transitionWork({ repo: intake.repo, workItem: intake.workPath, to: 'INTAKE', args: { 'return-resolution': '补充调查' } });
  assert.ok(restoredIntake.stage.endsWith('/INTAKE'));

  const implementation = await createFixture({ id: 'blocked-implementation' });
  t.after(() => rm(implementation.repo, { recursive: true, force: true }));
  let work = await readWork(implementation.repo, implementation.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };
  await putJson(implementation.repo, implementation.workPath, work);
  const { packPath, units } = await bindImplementation({ repo: implementation.repo, work, workPath: implementation.workPath, stage: 'base' });
  await transitionWork({ repo: implementation.repo, workItem: implementation.workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(implementation.repo, implementation.workPath);
  await submitPassingUnits({ repo: implementation.repo, work, workPath: implementation.workPath, packPath, units });
  await completeUnit({ repo: implementation.repo, workItem: implementation.workPath, resultPath: units[0].resultPath });
  const executionPath = `${work.evidenceRoot}/execution-state.json`;
  const before = await readFile(resolve(implementation.repo, ...executionPath.split('/')));
  await transitionWork({ repo: implementation.repo, workItem: implementation.workPath, to: 'BLOCKED', args: { reason: '等待人工处理' } });
  const restoredImplementation = await transitionWork({ repo: implementation.repo, workItem: implementation.workPath, to: 'IMPLEMENTING', args: { 'return-resolution': '阻断已处理' } });
  assert.ok(restoredImplementation.stage.endsWith('/IMPLEMENTING'));
  assert.deepEqual(await readFile(resolve(implementation.repo, ...executionPath.split('/'))), before);
});

test('模拟阶段材料与人工记录驱动 PAGE 从 V1 到 V5 的控制器闭环', async (t) => {
  const fixture = await createFixture({ id: 'home-page', type: 'PAGE', objective: '交付首页页面视觉及运行体验' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.globalVisualBaselineRef = { path: 'visual/global-baseline.json' };
  const selectedChecks = await createQualityChecks(fixture.repo, 'visual/reviews/baseline-selected');
  const baselineCandidates = [];
  for (const candidateId of ['direction-a', 'direction-b', 'direction-c']) {
    const path = await put(fixture.repo, `visual/candidates/${candidateId}.png`, syntheticDesignPng(candidateId));
    baselineCandidates.push({
      candidateId, path,
      qualityChecks: candidateId === 'direction-a' ? selectedChecks : qualityDimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })),
    });
  }
  const baselinePath = '.workflow-control/reviews/global-selection.json';
  const baselineTarget = await frozenReview(fixture.repo, baselineCandidates[0].path);
  await putJson(fixture.repo, baselinePath, { ...reviewRecord({
    objectId: 'project-baseline-1', candidateId: 'direction-a', stage: 'BASELINE', purpose: 'visual-baseline',
    userMessageRef: 'chat://baseline-selection', qualityChecks: selectedChecks, targetRef: baselineTarget.path,
  }), targetSha256: baselineTarget.sha256 });
  await putJson(fixture.repo, work.globalVisualBaselineRef.path, {
    schemaVersion: '1.0', baselineId: 'project-baseline-1', projectId: work.projectId,
    stack: work.stack, candidates: baselineCandidates, selectedCandidateId: 'direction-a',
    selectionReviewRef: await frozenReview(fixture.repo, baselinePath),
  }); work.globalVisualBaselineRef = await frozenReview(fixture.repo, work.globalVisualBaselineRef.path);
  attachFigmaBaselineFixture(fixture.repo, work);
  await putJson(fixture.repo, fixture.workPath, work);

  work.globalState = 'REVIEW';
  work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);

  const { plan } = await prepareFormalVisualFixture(fixture);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.implementationPackageRef, null);
  assert.equal(work.evidenceRef, null);
  assert.equal(work.globalState, 'PROPOSAL');
  work.visual.candidateId = 'direction-a';
  const target = await put(fixture.repo, 'visual/home-target.png', syntheticDesignPng('home-target'));
  const v1ReviewPath = '.workflow-control/reviews/home-target.json';
  const v1Checks = await createQualityChecks(fixture.repo, 'visual/reviews/v1');
  await putVisualReview(fixture.repo, v1ReviewPath, { ...reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V2', purpose: 'target', userMessageRef: 'chat://home-target', targetRef: target, qualityChecks: v1Checks }), scope: { kind: 'full-object', designItemIds: [], conditionIds: [] } }, work.workItemId, target);
  work.visual.reviews.V2 = await frozenReview(fixture.repo, v1ReviewPath);
  await writeSingleDomainFixture(fixture.repo, work, 'V3');
  const decompositionDomainRef = work.visual.domainEvidenceRef;
  const domain = await readWork(fixture.repo, decompositionDomainRef.path);
  await putJson(fixture.repo, 'visual/home-domain-v2.json', { ...domain, visualStage: 'V2' });
  work.visual.domainEvidenceRef = await frozenReview(fixture.repo, 'visual/home-domain-v2.json');
  const targetRef = await frozenReview(fixture.repo, target);
  const moduleDesignPath = 'visual/home-module-design.json';
  await putJson(fixture.repo, moduleDesignPath, { schemaVersion: '1.0', workItemId: work.workItemId,
    modulePlanRef: work.visual.modulePlanRef, baselineRef: work.globalVisualBaselineRef,
    entries: moduleDesignItems(plan).map((entry) => ({ ...entry, targetRef, designRef: domain.figmaDesignRef })) });
  work.visual.moduleDesignRef = await frozenReview(fixture.repo, moduleDesignPath);
  const moduleReviewPath = 'visual/home-module-review.json';
  await putJson(fixture.repo, moduleReviewPath, { schemaVersion: '1.0', workItemId: work.workItemId, stage: 'V2', decision: 'approved', userMessageRef: 'chat://module-design', subjectRef: work.visual.moduleDesignRef });
  work.visual.moduleDesignReviewRef = await frozenReview(fixture.repo, moduleReviewPath);
  await putJson(fixture.repo, fixture.workPath, work);
  // 原地替换已选候选必须阻断旧确认；恢复原始内容后可继续。
  const baselineBytes = await readFile(resolve(fixture.repo, baselineTarget.path));
  await writeFile(resolve(fixture.repo, baselineTarget.path), '已更换的候选');
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' }), /内容已变化/);
  await writeFile(resolve(fixture.repo, baselineTarget.path), baselineBytes);
  await putJson(fixture.repo, fixture.workPath, { ...work, visualBaselineRequired: false, globalVisualBaselineRef: null });
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' }), /visualBaselineRequired/);
  await putJson(fixture.repo, fixture.workPath, work);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' });

  work = await readWork(fixture.repo, fixture.workPath);
  const decomposition = await put(fixture.repo, 'visual/home-decomposition.png', '编号拆解图');
  const layout = await put(fixture.repo, 'visual/home-layout.png', '独立布局图');
  const decompositionPath = '.workflow-control/reviews/home-decomposition.json';
  const layoutPath = '.workflow-control/reviews/home-layout.json';
  await putVisualReview(fixture.repo, decompositionPath, reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V3', purpose: 'decomposition', userMessageRef: 'chat://home-decomposition', targetRef: decomposition }), work.workItemId, target);
  await putVisualReview(fixture.repo, layoutPath, reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V3', purpose: 'layout', userMessageRef: 'chat://home-layout', targetRef: layout }), work.workItemId, target, decompositionPath);
  work.visual.reviews.V3Decomposition = await frozenReview(fixture.repo, decompositionPath);
  work.visual.reviews.V3Layout = await frozenReview(fixture.repo, layoutPath);
  work.visual.domainEvidenceRef = decompositionDomainRef;
  await putJson(fixture.repo, fixture.workPath, work);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V4' });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.globalState, 'PROPOSAL');
  assert.equal(work.visual.stage, 'V4');
  assert.equal(work.implementationPackageRef, null);

  const component = await put(fixture.repo, 'lib/features/home/home_view.dart', 'class HomeView {}\n');
  const componentCheck = await put(fixture.repo, `${work.evidenceRoot}/v3-components.txt`, 'Creator-native Widget tree was inspected.\n');
  const assetReviewPath = '.workflow-control/reviews/home-assets.json';
  const assetUserMessage = 'chat://home-assets-reviewed';
  await putJson(fixture.repo, assetReviewPath, {
    schemaVersion: '1.0', workItemId: 'home-page', stack: 'flutter', visualStage: 'V4',
    candidateId: 'direction-a', technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: assetUserMessage,
    qualityChecks: await createQualityChecks(fixture.repo, 'visual/reviews/asset'),
    assets: [{ assetId: 'home-native-component', assetType: 'native-component', output: component, componentEvidenceRef: componentCheck }],
  });
  work.assetReviewRef = await frozenReview(fixture.repo, assetReviewPath);
  work.visual.reviews.V4 = { path: '.workflow-control/reviews/home-v3.json' };
  await putJson(fixture.repo, work.visual.reviews.V4.path, reviewRecord({
    objectId: 'home-page', candidateId: 'direction-a', stage: 'V4', purpose: 'imported-assets',
    userMessageRef: assetUserMessage,
  }));
  work.visual.reviews.V4 = await frozenReview(fixture.repo, work.visual.reviews.V4.path);
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await writeSingleDomainFixture(fixture.repo, work, 'V4');
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'V4');
  assert.equal(work.globalState, 'PASSED');
  assert.equal(work.visual.stage, 'V4');
  const v4State = resolve(fixture.repo, work.evidenceRoot, 'execution-state.json');
  const v4Bytes = await readFile(v4State);
  await rm(v4State);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V5' }), /Execution State/);
  await writeFile(v4State, v4Bytes);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V5' });

  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.visual.stage, 'V5');
  assert.equal(work.globalState, 'PROPOSAL');
  assert.equal(work.assetReviewRef.path, assetReviewPath);
  const runtimeReviewPath = '.workflow-control/reviews/home-runtime.json';
  const runtimeImage = await put(fixture.repo, 'visual/runtime.png', '合成运行画面');
  await putVisualReview(fixture.repo, runtimeReviewPath, reviewRecord({
    objectId: 'home-page', candidateId: 'direction-a', stage: 'V5', purpose: 'runtime-acceptance',
    userMessageRef: 'chat://home-runtime-inspected', targetRef: runtimeImage,
  }), work.workItemId, target);
  work.visual.reviews.V5 = await frozenReview(fixture.repo, runtimeReviewPath);
  await writeSingleDomainFixture(fixture.repo, work, 'V5');
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'V5');
  assert.equal(work.globalState, 'PASSED');
  const v5State = resolve(fixture.repo, work.evidenceRoot, 'execution-state.json');
  const v5Bytes = await readFile(v5State);
  await rm(v5State);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} }), /Execution State|V5 模块验收证据文件不存在：.*execution-state\.json/);
  await writeFile(v5State, v5Bytes);
  const complete = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  assert.ok(complete.stage.endsWith('/COMPLETE'));
  // 真实完成的页面再参与最终集成，来源必须通过控制器严格检查。
  const source = await readWork(fixture.repo, fixture.workPath);
  const integration = await initializeWork({ repo: fixture.repo, args: { id: 'home-final-integration', stack: 'flutter', type: 'INTEGRATION', objective: '验证页面正式组合', 'integration-purpose': 'final' } });
  const integrationFixture = { repo: fixture.repo, workPath: integration.metadata.workItemPath };
  const integrationWork = await readWork(fixture.repo, integrationFixture.workPath);
  integrationWork.globalState = 'REVIEW';
  integrationWork.gateStatus.F0 = integrationWork.gateStatus.F1 = integrationWork.gateStatus.F2 = 'PASS';
  const scopePath = 'docs/home-final-scope.json';
  const scope = {
    schemaVersion: '1.0', workItemId: integrationWork.workItemId, projectId: integrationWork.projectId, stack: integrationWork.stack,
    objects: [{ objectId: source.visual.objectId, workItemRef: await frozenReview(fixture.repo, fixture.workPath), functionBaselineRef: source.visual.functionBaselineRef }],
    cases: [{ caseId: 'home-navigation', objectIds: [source.visual.objectId] }],
  };
  // 当前页面与 V1 功能基线分别冻结过实施包，最终用例须覆盖两份来源。
  const sourcePacks = collectIntegrationSystemSources(fixture.repo, integrationWork, scope, () => ({ status: 'PASS' }));
  scope.systemCoverageMappings = coverageMappings(fixture.repo, scope, sourcePacks.map((entry) => ({ objectId: source.visual.objectId, packPath: entry.packRef.path })), { unitId: 'unit-1', command: 'node --version' });
  await putJson(fixture.repo, scopePath, scope);
  integrationWork.integrationScopeRef = await frozenReview(fixture.repo, scopePath);
  await putJson(fixture.repo, integrationFixture.workPath, integrationWork);
  await runEngineeringStage(integrationFixture, 'integration', { beforePassed: async (current) => {
    assert.equal(current.integrationPurpose, 'final');
    assert.equal(current.stageId, 'global-integration-validation');
    // 已执行但未提交回归结果不能通过；范围内容与引用也不能在执行后改变。
    await assert.rejects(transitionWork({ repo: fixture.repo, workItem: integrationFixture.workPath, to: 'PASSED', args: {} }), /最终集成回归证据/);
    const originalScope = await readFile(resolve(fixture.repo, scopePath));
    await putJson(fixture.repo, scopePath, { ...scope, cases: [{ caseId: 'other', objectIds: [source.visual.objectId] }] });
    await assert.rejects(transitionWork({ repo: fixture.repo, workItem: integrationFixture.workPath, to: 'PASSED', args: {} }), /最终集成范围.*内容已变化/);
    await writeFile(resolve(fixture.repo, scopePath), originalScope);
    const alternative = 'docs/home-final-alternative-scope.json';
    await putJson(fixture.repo, alternative, scope);
    const originalRef = current.integrationScopeRef;
    current.integrationScopeRef = await frozenReview(fixture.repo, alternative);
    await putJson(fixture.repo, integrationFixture.workPath, current);
    await assert.rejects(transitionWork({ repo: fixture.repo, workItem: integrationFixture.workPath, to: 'PASSED', args: {} }), /最终集成范围.*冻结/);
    current.integrationScopeRef = originalRef;
    await putJson(fixture.repo, integrationFixture.workPath, current);
    const casePath = `${current.evidenceRoot}/home-navigation.json`;
    const finalPack = JSON.parse(await readFile(resolve(fixture.repo, current.implementationPackageRef.path), 'utf8'));
    const finalUnit = finalPack.executionUnits[0];
    const unitResult = JSON.parse(await readFile(resolve(fixture.repo, finalUnit.resultPath), 'utf8'));
    await putJson(fixture.repo, casePath, { schemaVersion: '1.0', workItemId: current.workItemId, projectId: current.projectId, stack: current.stack, caseId: 'home-navigation', status: 'PASS', objectIds: [source.visual.objectId], unitId: finalUnit.unitId, command: unitResult.commandOutputs[0].command, exitCode: 0, outputRef: await frozenReview(fixture.repo, unitResult.commandOutputs[0].outputFile) });
    const resultPath = `${current.evidenceRoot}/final-integration.json`;
    await putJson(fixture.repo, resultPath, {
      schemaVersion: '1.0', workItemId: current.workItemId, projectId: current.projectId, stack: current.stack, status: 'PASS',
      objects: [{ objectId: source.visual.objectId, workItemRef: await frozenReview(fixture.repo, fixture.workPath), functionBaselineRef: source.visual.functionBaselineRef }],
      cases: [{ caseId: 'home-navigation', objectIds: [source.visual.objectId], evidenceRef: await frozenReview(fixture.repo, casePath) }],
    });
    const manifest = JSON.parse(await readFile(resolve(fixture.repo, current.evidenceRef.path), 'utf8'));
    manifest.items.push({ category: 'final-case', status: 'PASS', path: casePath }, { category: 'final-integration', status: 'PASS', path: resultPath });
    await putJson(fixture.repo, current.evidenceRef.path, manifest);
    current.integrationEvidenceRef = await frozenReview(fixture.repo, resultPath);
    await putJson(fixture.repo, integrationFixture.workPath, current);
  } });
  assert.ok((await transitionWork({ repo: fixture.repo, workItem: integrationFixture.workPath, to: 'COMPLETE', args: {} })).stage.endsWith('/COMPLETE'));
});

test('SCENE 从目标数组开始，不允许未规划目标或使用单目标字段推进', async (t) => {
  const fixture = await createFixture({ id: 'scene-targets', stack: 'cocos', type: 'SCENE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  assert.deepEqual(work.visual.targets, []);
  assert.equal(work.visual.reviews, undefined);
  work.visual.candidateId = 'single-old-target';
  await putJson(fixture.repo, fixture.workPath, work);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /禁止使用单目标/);
});

test('SCENE V2 推进必须逐目标验证真实领域合同及各自确认', async (t) => {
  const fixture = await createFixture({ id: 'scene-multiview', stack: 'cocos', type: 'SCENE' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.visual.objectId = 'main-gameplay';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  const baselineChecks = await createQualityChecks(fixture.repo, 'quality/baseline');
  const candidates = [];
  for (const candidateId of ['a', 'b', 'c']) {
    const path = await put(fixture.repo, `baseline/${candidateId}.txt`, candidateId);
    candidates.push({ candidateId, path, qualityChecks: candidateId === 'a' ? baselineChecks : qualityDimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })) });
  }
  const baselineReview = '.workflow-control/reviews/base.json';
  const baselineTarget = await frozenReview(fixture.repo, candidates[0].path);
  await putJson(fixture.repo, baselineReview, { ...reviewRecord({ objectId: 'base', candidateId: 'a', stage: 'BASELINE', purpose: 'visual-baseline', userMessageRef: 'user://base', qualityChecks: baselineChecks, targetRef: baselineTarget.path }), targetSha256: baselineTarget.sha256 });
  work.globalVisualBaselineRef = { path: 'baseline/selection.json' };
  await putJson(fixture.repo, work.globalVisualBaselineRef.path, { schemaVersion: '1.0', baselineId: 'base', projectId: work.projectId, stack: work.stack, candidates, selectedCandidateId: 'a', selectionReviewRef: await frozenReview(fixture.repo, baselineReview) }); work.globalVisualBaselineRef = await frozenReview(fixture.repo, work.globalVisualBaselineRef.path);
  const imagePath = 'evidence/visual/mockup.png';
  const image = minimalPng(390, 844);
  await put(fixture.repo, imagePath, image);
  const referenceTarget = { path: imagePath, sha256: createHash('sha256').update(image).digest('hex') };
  for (const [index, targetId] of ['near', 'far'].entries()) {
    const manifest = validManifest();
    // 目标确认属于 V2，不能沿用夹具默认的 V5 运行验收阶段。
    manifest.visualStageModel = 'function-first-v1';
    manifest.visualStage = 'V2';
    manifest.visualStageState = 'in-progress';
    manifest.workItemId = work.workItemId;
    manifest.candidateVersion = `candidate-${index + 1}`;
    await putJson(fixture.repo, manifest.scene_reconstruction_contract.layout_decomposition.layout_source.nodes_file, fixtureLayoutDocument(manifest.scene_reconstruction_contract));
    const domainPath = `docs/domain-${targetId}.json`;
    await putJson(fixture.repo, domainPath, manifest);
    const target = { targetId, candidateId: manifest.candidateVersion, sceneId: work.visual.objectId, stateId: 'default', viewport: { width: 390, height: 844 }, scope: targetId, referenceTarget, domainEvidenceRef: { path: domainPath }, reviews: {} };
    const reviewPath = `.workflow-control/reviews/${targetId}.json`;
    await putVisualReview(fixture.repo, reviewPath, reviewRecord({ objectId: work.visual.objectId, candidateId: target.candidateId, stage: 'V2', purpose: 'target', userMessageRef: `user://${targetId}`, targetRef: imagePath, qualityChecks: await createQualityChecks(fixture.repo, `quality/${targetId}`) }), work.workItemId, imagePath, null, targetId);
    target.reviews.V2 = await frozenReview(fixture.repo, reviewPath);
    work.visual.targets.push(target);
  }
  const snapshot = work.visual.targets.map(({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget: reference }) => ({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget: reference }));
  const coveragePath = 'docs/coverage.json';
  await putJson(fixture.repo, coveragePath, { workItemId: work.workItemId, sceneId: work.visual.objectId, status: 'CONFIRMED', userMessageRef: 'user://coverage', targetIds: ['near', 'far'], targets: snapshot });
  work.visual.coverageRef = { path: coveragePath, sha256: createHash('sha256').update(await readFile(resolve(fixture.repo, coveragePath))).digest('hex') };
  work.globalState = 'REVIEW';
  work.gateStatus.F2 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);

  const { plan } = await prepareFormalVisualFixture(fixture);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });
  const missing = await readWork(fixture.repo, fixture.workPath);
  const moduleDesignPath = 'docs/scene-module-design.json';
  await putJson(fixture.repo, moduleDesignPath, { schemaVersion: '1.0', workItemId: missing.workItemId,
    modulePlanRef: missing.visual.modulePlanRef, baselineRef: missing.globalVisualBaselineRef,
    entries: moduleDesignItems(plan).map((entry) => ({ ...entry, targetRef: referenceTarget })) });
  missing.visual.moduleDesignRef = await frozenReview(fixture.repo, moduleDesignPath);
  const moduleReviewPath = 'docs/scene-module-review.json';
  await putJson(fixture.repo, moduleReviewPath, { schemaVersion: '1.0', workItemId: missing.workItemId, stage: 'V2', decision: 'approved', userMessageRef: 'user://scene-design', subjectRef: missing.visual.moduleDesignRef });
  missing.visual.moduleDesignReviewRef = await frozenReview(fixture.repo, moduleReviewPath);
  delete missing.visual.targets[1].reviews.V2;
  await putJson(fixture.repo, fixture.workPath, missing);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' }), /缺少 V2 确认/);
  missing.visual.targets[1].reviews.V2 = await frozenReview(fixture.repo, '.workflow-control/reviews/far.json');
  await putJson(fixture.repo, fixture.workPath, missing);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' });
  assert.equal((await readWork(fixture.repo, fixture.workPath)).visual.stage, 'V3');
});

test('RELEASE 在 F4 未运行时可进入批准等待态，但未批准不得进入 RELEASING', async (t) => {
  const fixture = await createFixture({ id: 'release-no-approval', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readyForRelease(fixture);
  assert.equal(work.globalState, 'RELEASE_APPROVAL_REQUIRED');
  assert.equal(work.gateStatus.F4, 'NOT_RUN');
  const check = inspect({ repo: fixture.repo, workItem: fixture.workPath, check: true });
  assert.equal(check.status, 'BLOCKED');
  assert.ok(check.blocking.some((reason) => reason.includes('精确用户批准')));
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }),
    { code: 'APPROVAL_REQUIRED' },
  );
});

test('预先登记外部动作可完成本地准备，执行前按具体动作只读核对批准', async (t) => {
  const fixture = await createFixture({ id: 'external-preparation' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.action = { actionId: 'export-report', effects: ['external-write', 'upload'], target: 'remote-report' };
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BASELINE', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PROPOSAL', args: {} });
  work = await runEngineeringStage(fixture, 'external-preparation');
  assert.equal(work.globalState, 'PASSED');
  const action = { repo: fixture.repo, workItem: fixture.workPath, actionId: 'export-report', effect: 'external-write', target: 'remote-report' };
  assert.throws(() => checkProtectedAction(action), { code: 'APPROVAL_REQUIRED' });
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} }), { code: 'APPROVAL_REQUIRED' });
  work.action.approval = { workItemId: work.workItemId, stack: work.stack, stageId: work.stageId,
    actionId: work.action.actionId, effects: ['external-write', 'upload'], target: work.action.target, userMessageRef: 'chat://approval' };
  await putJson(fixture.repo, fixture.workPath, work);
  assert.throws(() => checkProtectedAction(action), { code: 'GATE_BLOCKED' });
  work.gateStatus.F4 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  const before = await readFile(resolve(fixture.repo, fixture.workPath));
  assert.equal(checkProtectedAction(action).status, 'PASS');
  assert.equal(checkProtectedAction({ ...action, effect: 'upload' }).status, 'PASS');
  assert.throws(() => checkProtectedAction({ ...action, target: 'other-target' }), { code: 'ACTION_MISMATCH' });
  assert.throws(() => checkProtectedAction({ ...action, actionId: 'other-action' }), { code: 'ACTION_MISMATCH' });
  assert.throws(() => checkProtectedAction({ ...action, effect: 'device' }), { code: 'ACTION_MISMATCH' });
  assert.throws(() => checkProtectedAction({ ...action, effect: 'local-write' }), { code: 'ACTION_MISMATCH' });
  assert.deepEqual(await readFile(resolve(fixture.repo, fixture.workPath)), before);
  const cli = spawnSync(process.execPath, [cliPath, 'check-action', '--repo', fixture.repo, '--work-item', fixture.workPath,
    '--action-id', action.actionId, '--effect', action.effect, '--target', action.target], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).changed, false);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BLOCKED', args: { reason: '需要处理阻断' } });
  assert.throws(() => checkProtectedAction(action), { code: 'ACTION_NOT_READY' });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: { 'return-resolution': '阻断已处理' } });
  work = await readWork(fixture.repo, fixture.workPath);
  work.action.approval.effects = ['external-write'];
  await putJson(fixture.repo, fixture.workPath, work);
  assert.throws(() => checkProtectedAction(action), { code: 'APPROVAL_REQUIRED' });
});

test('审批后改变发布目标会拒绝进入 RELEASING', async (t) => {
  const fixture = await createFixture({ id: 'release-target-change', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readyForRelease(fixture);
  approveRelease(work);
  work.action.target = 'different-store';
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }),
    { code: 'APPROVAL_REQUIRED' },
  );
});

test('审批后增加受保护动作会拒绝进入 RELEASING', async (t) => {
  const fixture = await createFixture({ id: 'release-effect-change', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readyForRelease(fixture);
  approveRelease(work);
  work.action.effects.push('upload');
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }),
    { code: 'APPROVAL_REQUIRED' },
  );
});

test('publish 即使有精确批准，F4 未通过也不能进入 RELEASING', async (t) => {
  const fixture = await createFixture({ id: 'release-no-f4', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readyForRelease(fixture);
  approveRelease(work);
  work.gateStatus.F4 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }),
    { code: 'GATE_BLOCKED' },
  );
});

test('发布批准后仍须在进入 RELEASING 与执行前重验 F3 和工程证据', async (t) => {
  const fixture = await createFixture({ id: 'release-stale-preparation', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readyForRelease(fixture);
  approveRelease(work);
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }), { code: 'GATE_BLOCKED' });

  work.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  const manifest = JSON.parse(await readFile(resolve(fixture.repo, work.evidenceRef.path), 'utf8'));
  const evidencePath = manifest.items[0].path;
  const evidenceAbsolute = resolve(fixture.repo, evidencePath);
  const original = await readFile(evidenceAbsolute);
  await rm(evidenceAbsolute);
  await assert.rejects(transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} }), { code: 'NOT_FOUND' });
  await writeFile(evidenceAbsolute, original);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} });

  work = await readWork(fixture.repo, fixture.workPath);
  const action = { repo: fixture.repo, workItem: fixture.workPath, actionId: work.action.actionId, effect: 'publish', target: work.action.target };
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  assert.throws(() => checkProtectedAction(action), { code: 'GATE_BLOCKED' });
  work.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  await rm(evidenceAbsolute);
  assert.throws(() => checkProtectedAction(action), { code: 'NOT_FOUND' });
  await writeFile(evidenceAbsolute, original);
  assert.equal(checkProtectedAction(action).status, 'PASS');
});

test('合成发布材料验证 RELEASING 绑定和 COMPLETE 结果门，不代表实际发布', async (t) => {
  const fixture = await createFixture({ id: 'release-approved', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readyForRelease(fixture);
  approveRelease(work);
  await putJson(fixture.repo, fixture.workPath, work);
  const releasing = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASING', args: {} });
  assert.ok(releasing.stage.endsWith('/RELEASING'));
  const check = inspect({ repo: fixture.repo, workItem: fixture.workPath, check: true });
  assert.equal(check.status, 'BLOCKED');
  assert.ok(check.blocking.some((reason) => reason.includes('release-result')));
  await assert.rejects(
    transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} }),
    { code: 'RELEASE_RESULT_REQUIRED' },
  );

  work = await readWork(fixture.repo, fixture.workPath);
  const evidencePath = await put(fixture.repo, `${work.evidenceRoot}/release-proof.txt`, '模拟外部发布回执内容\n');
  const resultPath = `${work.evidenceRoot}/release-result.json`;
  await putJson(fixture.repo, resultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    stageId: work.stageId, actionId: work.action.actionId, target: work.action.target,
    userMessageRef: work.action.approval.userMessageRef, releaseIdentifier: 'release-2026.10.26', evidencePath,
  });
  const manifest = JSON.parse(await readFile(resolve(fixture.repo, ...work.evidenceRef.path.split('/')), 'utf8'));
  manifest.items.push({ category: 'release-result', status: 'PASS', path: resultPath });
  await putJson(fixture.repo, work.evidenceRef.path, manifest);
  const complete = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  assert.ok(complete.stage.endsWith('/COMPLETE'));
});

test('RELEASING 可以转 BLOCKED 并再次加载工作项', async (t) => {
  const fixture = await createFixture({ id: 'blocked-releasing', type: 'RELEASE', releaseIntent: 'publish' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'RELEASING';
  work.action = { actionId: 'store-release', effects: ['publish'], target: 'production-store' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BLOCKED', args: { reason: '外部发布流程暂停' } });
  const blocked = await readWork(fixture.repo, fixture.workPath);
  assert.equal(blocked.globalState, 'BLOCKED');
  assert.equal(blocked.blockedRecord.returnState, 'RELEASING');
});
