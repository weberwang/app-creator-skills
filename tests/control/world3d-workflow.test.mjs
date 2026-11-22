/** 无图 3D 路线使用合成文件验证控制协议，不运行游戏或代替人工验收。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { advanceVisual, completeUnit, initializeWork, inspect, loadWork, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateWork } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';
import { validateWorld3DProductionBasis, validateWorld3DStage } from '../../skills/app-workflow-control/scripts/runtime/world3d-contract.mjs';
import { bindEvidence, bindImplementation, frozenReview, put, putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { attachWorld3DPhase, attachWorld3DPreflight, createWorld3DFixture, syntheticCallbacks } from './world3d-fixture.mjs';
import { attachWorldModuleDesign, prepareWorld3DStage, prepareWorldModule } from './world3d-completed-fixture.mjs';
import { finishWorldFoundation } from './module-world-fixture.mjs';
import { withModuleRules } from './module-rules-fixture.mjs';

/** 为图片路线建立真实基础工程与模块方案，供跨路线防护测试使用。 */
async function prepareImageModule(fixture, work) {
  const candidate = structuredClone(work);
  switchRoute(fixture, candidate, false);
  work.globalVisualBaselineRef = candidate.globalVisualBaselineRef;
  work.foundationVisualRef = await finishWorldFoundation(fixture, work.globalVisualBaselineRef, [], 'image');
  work.visual.modulePlanRef = fixture.write('spec/image-module-plan.json', withModuleRules({
    schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, dependencies: [],
    entries: ['function', 'state', 'step'].map((kind) => ({ kind, id: `${kind}-one`, description: `测试 ${kind}`,
      acceptance: '满足方案', requirementId: 'fixture-requirement-1', command: 'node --version' })),
  }));
}

/** 通过公共控制器接口执行合成工程证据；不启动引擎或执行用户验收。 */
async function runWorldEngineering({ repo, workPath }, stage) {
  let work = await readWork(repo, workPath);
  work.gateStatus.F2 = 'PASS';
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(repo, workPath, work);
  if (work.globalState === 'PROPOSAL') {
    await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
    work = await readWork(repo, workPath);
  }
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage, unitPaths: [`src/game/${stage}.ts`] });
  if (work.productionScopeRef) {
    const pack = JSON.parse(readFileSync(resolve(repo, packPath), 'utf8'));
    pack.productionScopeRef = work.productionScopeRef;
    pack.productionBatchId = work.productionBatchId;
    await putJson(repo, packPath, pack);
  }
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  await completeUnit({ repo, workItem: workPath, resultPath: units[0].resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage });
  if (work.productionScopeRef) {
    // 合成行为记录与输出分离，验证生产范围真实绑定而不冒充引擎运行。
    work = await readWork(repo, workPath);
    const rawPath = `${work.evidenceRoot}/production-case.log`;
    await put(repo, rawPath, '合成的生产行为输出');
    const rawRef = await frozenReview(repo, rawPath);
    const coveragePath = `${work.evidenceRoot}/production-coverage.json`;
    await putJson(repo, coveragePath, { schemaVersion: '1.0', scopeId: 'production', workItemId: work.workItemId,
      projectId: work.projectId, stack: work.stack, productionBatchId: 'first', implementationPackageRef: packPath,
      visualStage: stage, status: 'PASS', cases: [{ caseId: 'walk-case', objectIds: [work.visual.objectId],
        stepIds: ['walk'], stateIds: ['ready'], transitions: [], evidenceRef: rawRef }] });
    const manifest = JSON.parse(readFileSync(resolve(repo, work.evidenceRef.path), 'utf8'));
    manifest.items.push({ category: 'production-coverage', status: 'PASS', path: coveragePath },
      { category: 'tests', status: 'PASS', path: rawPath });
    await putJson(repo, work.evidenceRef.path, manifest);
  }
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
}

/** 经真实 V1 验证冻结旧路线，再将工作项置于返修前的合成 V4 状态。 */
async function prepareRouteBaseline(t, world) {
  const f = createWorld3DFixture(t);
  const result = await initializeWork({ repo: f.repo, args: {
    id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证返修不能改变路线',
    'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': world ? 'world-3d' : 'game-ui',
  } });
  const context = { repo: f.repo, workPath: result.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(context.repo, context.workPath, work);

  work = await readWork(context.repo, context.workPath);
  if (world) {
    work.visual.candidateId = f.context.candidateId;
    work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
    await prepareWorldModule(f, work);
    await putJson(context.repo, context.workPath, work);
  } else {
    await prepareImageModule(f, work);
    await putJson(context.repo, context.workPath, work);
  }
  await runWorldEngineering(context, 'V1');
  if (world) {
    work = await readWork(context.repo, context.workPath);
    attachWorld3DPreflight(f, work);
    await putJson(context.repo, context.workPath, work);
  }
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V2' });
  work = await readWork(context.repo, context.workPath);
  if (world) attachWorld3DPhase(f, 'V4', work);
  else {
    work.visual.stage = 'V4';
    work.visual.targets = [{ targetId: 'image-target' }];
  }
  work.globalState = 'REVIEW';
  await putJson(context.repo, context.workPath, work);
  return { f, context };
}

/** 只改路线外壳，以检验旧功能基线不会被借用或重签。 */
function switchRoute(f, work, targetWorld) {
  if (targetWorld) {
    work.visual.designRoute = 'world-3d';
    delete work.visual.targets;
    attachWorld3DPhase(f, 'V4', work);
    work.globalVisualBaselineRef = f.baselineRef;
  } else {
    work.visual.designRoute = 'game-ui';
    delete work.visual.domainEvidenceRef;
    delete work.visual.modelProductionBasisRef;
    delete work.visual.candidateId;
    delete work.visual.reviews;
    work.visual.targets = [{ targetId: 'image-target' }];
    // 用非空合成文本模拟图片路线的冻结候选，不生成任何图片文件。
    const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({
      dimension, status: 'PASS', evidenceRef: f.write(`image-baseline/${dimension}.txt`, '合成质量记录').path,
    }));
    const candidates = ['a', 'b', 'c'].map((candidateId) => ({ candidateId,
      path: f.write(`image-baseline/${candidateId}.txt`, '合成候选文件').path, qualityChecks }));
    const target = f.identity(candidates[0].path);
    const selectionReviewRef = f.write('image-baseline/review.json', {
      schemaVersion: '1.0', objectId: 'base', stage: 'BASELINE', purpose: 'visual-baseline',
      candidateId: 'a', decision: 'APPROVED', userMessageRef: 'test-only://image-baseline',
      targetRef: target.path, targetSha256: target.sha256, qualityChecks,
    });
    work.globalVisualBaselineRef = f.write('image-baseline/baseline.json', {
      schemaVersion: '1.0', baselineId: 'base', projectId: work.projectId, stack: work.stack,
      candidates, selectedCandidateId: 'a', selectionReviewRef,
    });
    work.assetReviewRef = null;
  }
}

/** 测试只能回收自身在系统临时目录创建的隔离项目。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'world3d-workflow-'));
  t.after(() => {
    assert.equal(dirname(resolve(repo)), resolve(tmpdir()));
    assert.ok(basename(repo).startsWith('world3d-workflow-'));
    rmSync(repo, { recursive: true, force: true });
  });
  return repo;
}

/** 经真实入口创建工作项；测试替身不会产生真实用户批准。 */
async function initialize(repo, stack, type, options = {}) {
  const args = { id: `${stack}-${type.toLowerCase()}`, stack, type, objective: '验证三维路线隔离', ...options };
  const result = await initializeWork({ repo, args });
  return loadWork(repo, result.metadata.workItemPath);
}

test('无图 3D 仅由五个游戏栈显式选择且限定为 SCENE', async (t) => {
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'roblox']) {
    const repo = fixture(t);
    const work = await initialize(repo, stack, 'SCENE', { 'design-route': 'world-3d' });
    assert.equal(work.visual.designRoute, 'world-3d');
    assert.equal(work.visual.stage, 'V1');
    assert.equal(work.workItemType, 'SCENE');
    assert.ok(!work.visual.targets?.length);
    assert.equal(work.visual.reviews, undefined);
    assert.doesNotThrow(() => validateWork(work, { repo }));
  }
});

test('错误栈、页面、显示层及仅设计提案在建立控制文件前被拒绝', async (t) => {
  for (const [stack, type, intent] of [
    ['unity', 'PAGE'], ['threejs', 'DISPLAY_LAYER'], ['cocos', 'MODULE'],
    ['flutter', 'PAGE'], ['expo', 'SCENE'], ['nodejs', 'SCENE'],
    ['unity', 'SCENE', 'proposal'],
  ]) {
    const repo = fixture(t);
    await assert.rejects(initialize(repo, stack, type, {
      'design-route': 'world-3d', ...(intent ? { 'design-intent': intent } : {}),
    }), /world-3d|游戏场景设计路线/);
    assert.equal(existsSync(join(repo, '.workflow-control')), false);
  }
});

test('游戏场景默认二维世界并保留图片目标，App 页面仍采用 Figma', async (t) => {
  const gameRepo = fixture(t);
  const game = await initialize(gameRepo, 'threejs', 'SCENE');
  assert.equal(game.visual.designRoute, 'world-2d');
  assert.deepEqual(game.visual.targets, []);
  assert.equal(game.visual.reviews, undefined);

  const appRepo = fixture(t);
  const app = await initialize(appRepo, 'flutter', 'PAGE');
  assert.equal(app.visual.designRoute, 'figma-app');
  assert.deepEqual(app.visual.reviews, {});
});

test('3D 路线不得夹带图片目标、旧确认、覆盖或复用记录', async (t) => {
  const repo = fixture(t);
  const base = await initialize(repo, 'threejs', 'SCENE', { 'design-route': 'world-3d' });
  for (const [field, value] of [
    ['targets', [{ targetId: 'image' }]],
    ['reviews', { V2: { path: 'other.json' } }],
    ['coverageRef', { path: 'coverage.json' }],
    ['integrationEvidenceRef', { path: 'integration.json' }],
    ['reuse', { sourceWorkItemRef: { path: 'old.json' }, impact: 'target', reason: '复用', inheritedReviews: [] }],
  ]) {
    const work = structuredClone(base);
    work.visual[field] = value;
    assert.throws(() => validateWork(work, { repo }), /world-3d/, field);
  }
});

test('工作项 Schema 与运行校验同时拒绝跨类型或跨栈伪装路线', async (t) => {
  const repo = fixture(t);
  const work = await initialize(repo, 'unity', 'SCENE', { 'design-route': 'world-3d' });
  const schema = JSON.parse(readFileSync(resolve('skills/app-workflow-control/schemas/work-item.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(work), true, JSON.stringify(validate.errors));
  for (const change of [{ stack: 'flutter' }, { workItemType: 'PAGE' }, { workItemType: 'DISPLAY_LAYER' }]) {
    const invalid = { ...structuredClone(work), ...change };
    assert.equal(validate(invalid), false, JSON.stringify(change));
    // 非游戏 SCENE 可能先被原有对象类型门拒绝；两种入口都必须无法通过。
    assert.throws(() => validateWork(invalid, { repo }), Error, JSON.stringify(change));
  }
});

for (const returnScope of ['visual:V5', 'implementation']) test(`无图片 3D 场景 V5 立即 ${returnScope} 返修后仍可完成`, async (t) => {
  const f = createWorld3DFixture(t);
  const result = await initializeWork({ repo: f.repo, args: {
    id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证合成三维协议',
    'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d',
  } });
  const context = { repo: f.repo, workPath: result.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await putJson(context.repo, context.workPath, work);

  work = await readWork(context.repo, context.workPath);
  work.visual.candidateId = f.context.candidateId;
  work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
  await prepareWorldModule(f, work);
  await putJson(context.repo, context.workPath, work);
  await runWorldEngineering(context, 'V1');
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPreflight(f, work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V2' });

  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V2', work);
  attachWorldModuleDesign(f, work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V3' });
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V3', work);
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V4' });

  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V4', work);
  assert.equal(f.contract.productionRisk, 'low');
  assert.equal(f.contract.sampleRef, undefined);
  assert.equal(f.read(work.assetReviewRef).modelSampleRef, undefined);
  const validReviewRef = work.assetReviewRef;
  const invalidReview = f.read(validReviewRef);
  invalidReview.assets[0].consumerEvidenceRef = { path: `${work.evidenceRoot}/missing-consumer.json`, sha256: '0'.repeat(64) };
  work.assetReviewRef = f.write('reviews/missing-consumer.json', invalidReview);
  assert.throws(() => validateWorld3DStage(f.repo, work, 'V4', syntheticCallbacks(f)), /不存在/);
  work.assetReviewRef = validReviewRef;
  await putJson(context.repo, context.workPath, work);
  await runWorldEngineering(context, 'V4');
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V5' });
  work = await readWork(context.repo, context.workPath);
  const priorArchive = work.visual.modelBaselineRef;
  const priorDomain = work.visual.domainEvidenceRef;
  assert.equal(f.read(priorDomain).stage, 'V4');
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'RETURN',
    args: { reason: '正式装配需要调整', 'affected-scope': returnScope } });
  work = await readWork(context.repo, context.workPath);
  assert.equal(work.visual.domainEvidenceRef, undefined);
  assert.deepEqual(work.visual.modelBaselineRef, priorArchive);
  assert.equal(work.invalidatedRefs.some((entry) => entry.path === priorDomain.path), false);
  assert.equal(work.invalidatedRefs.some((entry) => entry.path === priorArchive.path), false);
  attachWorld3DPhase(f, 'V5', work);
  work.gateStatus.F2 = 'PASS';
  await putJson(context.repo, context.workPath, work);
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW',
    args: { 'return-resolution': '重新绑定正式场景与运行验证' } });
  await runWorldEngineering(context, 'V5');
  await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'COMPLETE', args: {} });
  work = await readWork(context.repo, context.workPath);
  assert.equal(work.visual.stage, 'V5');
  assert.equal(work.globalState, 'COMPLETE');
  assert.equal(f.read(f.contract.formalRunRef).modelBindings[0].assetId, f.model.assetId);
  assert.equal(work.visual.targets, undefined);
  assert.equal(work.visual.reviews, undefined);
  assert.equal(f.paths.some((path) => /\.(?:png|jpe?g|webp)$/i.test(path)), false);
});

test('三维场景逐张确认独立二维稿后才能从 V3 进入 V4', async (t) => {
  const { repo, workPath, work, fixture: f } = await prepareWorld3DStage(t, 'V3', {
    stack: 'threejs',
    /** 将两张正式二维稿登记在真实的 V2 模块设计快照中。 */
    beforeEngineering({ fixture, work, stage }) {
      if (stage !== 'V2') return;
      const design = fixture.read(work.visual.moduleDesignRef);
      design.scene2dDesignRefs = [fixture.write('design/sprites.png', '合成二维精灵稿'), fixture.write('design/indicators.png', '合成场景指示稿')];
      design.entries[0].additionalTargets = design.scene2dDesignRefs.map((targetRef) => ({ targetRef }));
      work.visual.moduleDesignRef = fixture.write(work.visual.moduleDesignRef.path, design);
      const approval = fixture.read(work.visual.moduleDesignReviewRef);
      work.visual.moduleDesignReviewRef = fixture.write(work.visual.moduleDesignReviewRef.path, { ...approval, subjectRef: work.visual.moduleDesignRef });
    },
  });
  attachWorld3DPhase(f, 'V3', work);
  const [sprites, indicators] = f.read(work.visual.moduleDesignRef).scene2dDesignRefs;
  /** 写入每份合成稿件的独立拆解材料和用户确认记录。 */
  function confirmDecomposition(name, referenceTarget) {
    const artifact = f.write(`design/${name}-decomposition.json`, { elements: [name] });
    return f.write(`reviews/${name}-decomposition.json`, {
      schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, targetId: work.visual.objectId,
      candidateId: work.visual.candidateId, stage: 'V3', purpose: 'decomposition', decision: 'APPROVED',
      userMessageRef: 'test://draft-decomposition', referenceTarget, targetRef: artifact.path, targetSha256: artifact.sha256,
    });
  }
  work.visual.supplementalDecompositionReviews = [confirmDecomposition('sprites', sprites)];
  await putJson(repo, workPath, work);
  const savedV3 = readFileSync(resolve(repo, workPath));
  await assert.rejects(advanceVisual({ repo, workItem: workPath, to: 'V4' }), /缺少 V3 拆解确认：design\/indicators\.png/);
  assert.deepEqual(readFileSync(resolve(repo, workPath)), savedV3);
  work.visual.supplementalDecompositionReviews.push(confirmDecomposition('indicators', indicators));
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V4' });
  assert.equal(loadWork(repo, workPath).visual.stage, 'V4');
});

test('V3 高风险规格推进后不能通过重绑 V4 封套降级风险或更换模型规格', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity', productionRisk: 'high' });
  const { repo, work } = await prepareWorld3DStage(t, 'V4', { fixture });
  const archive = fixture.read(work.visual.modelProductionBasisRef);
  assert.equal(archive.visualStage, 'V3');
  const original = fixture.read(archive.world3dModelProductionBasis.domainEvidenceRef);
  assert.equal(original.productionRisk, 'high');
  assert.doesNotThrow(() => validateWorld3DProductionBasis(repo, work));
  work.visual.domainEvidenceRef = fixture.write('spec/downgraded-world-v4.json', { ...original, stage: 'V4', productionRisk: 'low' });
  assert.throws(() => validateWorld3DProductionBasis(repo, work), /生产风险.*V3/);
  const alternative = fixture.write('spec/other-models.json', fixture.read(original.modelSpecRef));
  work.visual.domainEvidenceRef = fixture.write('spec/changed-models-v4.json', { ...original, stage: 'V4', modelSpecRef: alternative });
  assert.throws(() => validateWorld3DProductionBasis(repo, work), /模型规格.*V3/);
});

test('图片路线通过的 V1 不能中途改成三维并继承功能基线', async (t) => {
  const f = createWorld3DFixture(t);
  const result = await initializeWork({ repo: f.repo, args: {
    id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证路线不可重绑',
    'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'game-ui',
  } });
  const context = { repo: f.repo, workPath: result.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(context.repo, context.workPath, work);

  await prepareImageModule(f, work);
  await putJson(context.repo, context.workPath, work);
  await runWorldEngineering(context, 'V1');
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V2' });
  work = await readWork(context.repo, context.workPath);
  work.visual.designRoute = 'world-3d';
  delete work.visual.targets;
  attachWorld3DPhase(f, 'V2', work);
  await putJson(context.repo, context.workPath, work);
  await assert.rejects(advanceVisual({ ...context, workItem: context.workPath, to: 'V3' }), /路线|基线/);
});

test('三维场景不得经旧图片复用入口继承确认', async (t) => {
  const repo = fixture(t);
  const init = async (id, world) => initializeWork({ repo, args: {
    id, stack: 'threejs', type: 'SCENE', objective: '验证跨路线复用', 'design-route': world ? 'world-3d' : 'game-ui',
  } });
  const world = await init('world', true);
  const image = await init('image', false);
  for (const [target, source] of [[world, image], [image, world]]) {
    await assert.rejects(reuseVisualReviews({ repo, workItem: target.metadata.workItemPath,
      sourceWorkItem: source.metadata.workItemPath, impact: 'implementation', reason: '不得跨路线继承' }), /world-3d|三维|3D/);
  }
});

test('三维 V2 进入 V3 前分别需要一次审查和人工空间确认', async (t) => {
  const f = createWorld3DFixture(t);
  const initialized = await initializeWork({ repo: f.repo, args: { id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证三维前置', 'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d' } });
  const context = { repo: f.repo, workPath: initialized.metadata.workItemPath };
  let work = await readWork(context.repo, context.workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  await putJson(context.repo, context.workPath, work);

  work = await readWork(context.repo, context.workPath);
  work.visual.candidateId = f.context.candidateId;
  work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
  await prepareWorldModule(f, work);
  await putJson(context.repo, context.workPath, work);
  await runWorldEngineering(context, 'V1');
  work = await readWork(context.repo, context.workPath);
  const v1Ref = work.visual.domainEvidenceRef;
  const v1 = f.read(v1Ref);
  const wrongSpace = { ...f.read(v1.spatialSpecRef), objectId: 'other-world' };
  work.visual.domainEvidenceRef = f.write('spec/v1-wrong-space.json', { ...v1, spatialSpecRef: f.write('spec/wrong-space.json', wrongSpace) });
  await putJson(context.repo, context.workPath, work);
  await assert.rejects(advanceVisual({ ...context, workItem: context.workPath, to: 'V2' }), /空间规格\.objectId.*不一致/);
  const run = f.read(v1.blockoutRunRef);
  run.sceneRef = f.write('src/game/wrong-blockout.ts', '// 测试错误的白模绑定\n');
  work.visual.domainEvidenceRef = f.write('spec/v1-wrong-run.json', { ...v1,
    blockoutRunRef: f.write(`${work.evidenceRoot}/wrong-run.json`, run) });
  await putJson(context.repo, context.workPath, work);
  await assert.rejects(advanceVisual({ ...context, workItem: context.workPath, to: 'V2' }), /错绑|不匹配/);
  work.visual.domainEvidenceRef = v1Ref;
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V2' });
  work = await readWork(context.repo, context.workPath);
  attachWorld3DPhase(f, 'V2', work);
  attachWorldModuleDesign(f, work);
  const approvedRef = work.visual.domainEvidenceRef;
  const noReview = f.read(approvedRef);
  delete noReview.reviewRef;
  work.visual.domainEvidenceRef = f.write('spec/no-review.json', noReview);
  await putJson(context.repo, context.workPath, work);
  await assert.rejects(advanceVisual({ ...context, workItem: context.workPath, to: 'V3' }), /review|审查|确认/i);
  const unapproved = f.read(approvedRef);
  delete unapproved.spaceApprovalRef;
  work.visual.domainEvidenceRef = f.write('spec/unapproved.json', unapproved);
  await putJson(context.repo, context.workPath, work);
  await assert.rejects(advanceVisual({ ...context, workItem: context.workPath, to: 'V3' }), /approval|确认/i);
  work.visual.domainEvidenceRef = approvedRef;
  await putJson(context.repo, context.workPath, work);
  await advanceVisual({ ...context, workItem: context.workPath, to: 'V3' });
  assert.equal((await readWork(context.repo, context.workPath)).visual.stage, 'V3');
});

test('三维方向 RETURN 保留空间审查和确认，但旧方向批准不能重新绑定', async (t) => {
  const f = createWorld3DFixture(t);
  const result = await initializeWork({ repo: f.repo, args: {
    id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证空间返修',
    'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d',
  } });
  const workPath = result.metadata.workItemPath;
  let work = await readWork(f.repo, workPath);
  work.globalState = 'REVIEW';
  work.gateStatus.F0 = work.gateStatus.F1 = work.gateStatus.F2 = 'PASS';
  const previous = attachWorld3DPhase(f, 'V2', work);
  await putJson(f.repo, workPath, work);
  await transitionWork({ repo: f.repo, workItem: workPath, to: 'RETURN',
    args: { reason: '正式方向需要修改', 'affected-scope': 'visual:V2' } });
  work = await readWork(f.repo, workPath);
  assert.equal(work.globalState, 'RETURN');
  assert.ok(!work.invalidatedRefs.some((entry) => entry.path === previous.reviewRef.path || entry.path === previous.spaceApprovalRef.path));
  assert.ok(work.invalidatedRefs.some((entry) => entry.path === previous.directionApprovalRef.path));
  work.visual.domainEvidenceRef = f.write('spec/rebound-after-return.json', previous);
  assert.throws(() => validateWorld3DStage(f.repo, work, 'V2'), /已作废引用/);
});

for (const oldWorld of [false, true]) {
  const route = oldWorld ? '3D→2D' : '2D→3D';
  test(`${route} 不能经 localRegression 刷新旧功能基线`, async (t) => {
    const { f, context } = await prepareRouteBaseline(t, oldWorld);
    const work = await readWork(context.repo, context.workPath);
    switchRoute(f, work, !oldWorld);
    work.globalState = 'IMPLEMENTING';
    await putJson(context.repo, context.workPath, work);
    await putJson(context.repo, 'spec/regression.json', { localRegression: true, visualImpact: 'none', reason: '合成重验' });
    await assert.rejects(refreshFunctionBaseline({ repo: context.repo, workItem: context.workPath, specPath: 'spec/regression.json' }), /V1 模块方案/);
  });

  test(`${route} 不能经 RETURN 恢复沿用旧功能基线`, async (t) => {
    const { f, context } = await prepareRouteBaseline(t, oldWorld);
    await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'RETURN',
      args: { reason: '修改场景实现', 'affected-scope': 'implementation' } });
    const work = await readWork(context.repo, context.workPath);
    switchRoute(f, work, !oldWorld);
    await putJson(context.repo, context.workPath, work);
    await assert.rejects(transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW',
      args: { 'return-resolution': '重新执行场景验证' } }), /设计路线已变化/);
  });
}

for (const destination of ['V2', 'V4']) {
  test(`生产范围绑定的 ${destination} 过渡允许状态查询与返修并保持严格验收`, async (t) => {
    const f = createWorld3DFixture(t);
    const result = await initializeWork({ repo: f.repo, args: {
      id: f.context.workItemId, stack: 'threejs', type: 'SCENE', objective: '验证跨阶段范围读取',
      'project-id': f.context.projectId, 'object-id': f.context.objectId, 'design-route': 'world-3d',
    } });
    const context = { repo: f.repo, workPath: result.metadata.workItemPath };
    let work = await readWork(context.repo, context.workPath);
    work.globalState = 'REVIEW';
    work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
    await putJson(context.repo, context.workPath, work);

    work = await readWork(context.repo, context.workPath);
    work.visual.candidateId = f.context.candidateId;
    work.visual.domainEvidenceRef = f.identity('spec/world-V1.json');
    await prepareWorldModule(f, work);
    await putJson(context.repo, context.workPath, work);
    const scope = {
      schemaVersion: '1.0', scopeId: 'production', projectId: work.projectId, stack: work.stack,
      objects: [{ objectId: f.context.objectId, workItemType: 'SCENE', targetIds: ['world-scope'] }],
      states: [{ stateId: 'ready', objectId: f.context.objectId, description: '准备' }],
      steps: [{ stepId: 'walk', objectIds: [f.context.objectId], stateIds: ['ready'],
        precondition: '准备', action: '行走', expectedResult: '移动', caseId: 'walk-case' }],
      transitions: [], batches: [{ batchId: 'first', objectIds: [f.context.objectId], stepIds: ['walk'], transitionIds: [] }],
    };
    work.productionScopeRef = f.write('spec/production.json', scope);
    work.productionBatchId = 'first';
    const plan = f.read(work.visual.modulePlanRef);
    plan.entries.find((entry) => entry.kind === 'state').id = 'ready';
    plan.entries.find((entry) => entry.kind === 'step').id = 'walk';
    work.visual.modulePlanRef = f.write('spec/production-module-plan.json', withModuleRules(plan));
    await putJson(context.repo, context.workPath, work);
    await runWorldEngineering(context, 'V1');
    work = await readWork(context.repo, context.workPath);
    attachWorld3DPreflight(f, work);
    await putJson(context.repo, context.workPath, work);
    await advanceVisual({ ...context, workItem: context.workPath, to: 'V2' });
    if (destination === 'V4') {
      work = await readWork(context.repo, context.workPath);
      attachWorld3DPhase(f, 'V2', work);
      attachWorldModuleDesign(f, work);
      await putJson(context.repo, context.workPath, work);
      await advanceVisual({ ...context, workItem: context.workPath, to: 'V3' });
      work = await readWork(context.repo, context.workPath);
      attachWorld3DPhase(f, 'V3', work);
      await putJson(context.repo, context.workPath, work);
      await advanceVisual({ ...context, workItem: context.workPath, to: 'V4' });
    }
    work = loadWork(context.repo, context.workPath);
    assert.equal(work.visual.stage, destination);
    assert.doesNotThrow(() => inspect({ repo: context.repo, workItem: context.workPath }));
    assert.throws(() => validateWorld3DStage(context.repo, work, destination), /阶段|错绑/);
    const rebound = structuredClone(work);
    attachWorld3DPhase(f, destination, rebound);
    assert.doesNotThrow(() => validateWorld3DStage(context.repo, rebound, destination, syntheticCallbacks(f)));
    // 当前阶段材料明确重绑后才可验收；未重绑前仍允许登记返修。
    await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'RETURN',
      args: { reason: '调整场景设计', 'affected-scope': `visual:${destination}` } });
    assert.equal((await readWork(context.repo, context.workPath)).globalState, 'RETURN');
  });
}
