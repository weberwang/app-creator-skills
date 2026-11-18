/** 复用真实控制器完成来源与合成当前场景，验证旧试接不能代替当前运行。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test, { after } from 'node:test';
import { validateWorld3DStage } from '../../skills/app-workflow-control/scripts/runtime/world3d-contract.mjs';
import { world3DModelReuse } from '../../skills/app-workflow-control/scripts/runtime/world3d-model-reuse.mjs';
import { inspect, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createCompletedWorld3D } from './world3d-completed-fixture.mjs';
import { attachWorld3DPhase, createWorld3DFixture, syntheticCallbacks } from './world3d-fixture.mjs';

// 完整来源只建立一次；各用例使用独立当前工作项，故障注入在本用例结束时恢复。
let sourcePromise;
let targetSequence = 0;
const sourceCleanups = [];
// 在文件级注册清理，避免异步初始化时把共享来源误绑定到首个用例的生命周期。
after(() => { for (const cleanup of sourceCleanups) cleanup(); });

/** 收集共享来源的清理动作，所有当前工作项验证完毕后统一执行。 */
function preserveSourceUntilFileEnds(cleanup) {
  sourceCleanups.push(cleanup);
}

/** 复用不可变的已完成测试来源，清理仍由节点测试文件的最终钩子负责。 */
function completedSource() {
  sourcePromise ??= createCompletedWorld3D({ after: preserveSourceUntilFileEnds });
  return sourcePromise;
}

/** 同一项目中的每个当前用例使用独立控制记录与执行证据目录。 */
function currentFixture(t, source) {
  const id = `world-next-${++targetSequence}`;
  return createWorld3DFixture(t, { repo: source.repo, stack: 'unity', workItemId: id, controlPrefix: id });
}

/** 当前批只声明模型复用；不创建新的样本运行或改写来源工作项。 */
function bindReuse(f, sourceRef, changes = {}) {
  const sample = f.write(`${f.work.evidenceRoot}/reused-sample.json`, {
    ...f.context, phase: 'sample', sourceWorkItemRef: sourceRef,
    reuseReason: '仅调整通道布局，模型及方向不变', ...changes,
  });
  const review = { ...f.read(f.work.assetReviewRef), modelSampleRef: sample };
  f.work.assetReviewRef = f.write(`${f.work.evidenceRoot}/reuse-review.json`, review);
  f.assetReviewRef = f.work.assetReviewRef;
  f.sampleRef = sample;
  f.contract = { ...f.contract, sampleRef: sample };
  f.work.visual.domainEvidenceRef = f.write('spec/reused-domain.json', f.contract);
}

/** 后批控制记录与原记录分离，实际模型和方向仍消费同一份源。 */
async function reuseFixture(t) {
  const source = await completedSource();
  const f = currentFixture(t, source);
  f.directionRef = source.fixture.directionRef;
  f.baselineRef = source.fixture.baselineRef;
  attachWorld3DPhase(f, 'V4');
  const assets = source.fixture.read(source.work.assetReviewRef).assets;
  const review = { ...f.read(f.work.assetReviewRef), assets: structuredClone(assets) };
  f.work.assetReviewRef = f.write(`${f.work.evidenceRoot}/reuse-review.json`, review);
  f.assetReviewRef = f.work.assetReviewRef;
  f.model = structuredClone(assets.find((asset) => asset.assetType === 'model'));
  bindReuse(f, source.ref);
  return { f, source };
}

test('同场景空间增量可复用旧模型与试接，当前 V5 仍需正式运行和模型绑定', async (t) => {
  const { f, source } = await reuseFixture(t);
  const before = readFileSync(resolve(f.repo, source.workPath));
  const sample = f.read(f.contract.sampleRef);
  assert.equal(sample.runtimeRef, undefined);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)));
  assert.deepEqual(readFileSync(resolve(f.repo, source.workPath)), before);
  attachWorld3DPhase(f, 'V5');
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)));
  const contract = structuredClone(f.contract);
  delete contract.formalRunRef;
  f.work.visual.domainEvidenceRef = f.write('spec/missing-current-run.json', contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /formalRunRef|SHA|路径/);
});

test('真实控制器当前批 V4 至 V5 接受模型复用，当前资源证据仍不可省略', async (t) => {
  const source = await completedSource();
  const f = currentFixture(t, source);
  f.directionRef = source.fixture.directionRef;
  f.baselineRef = source.fixture.baselineRef;
  const spec = f.read(f.contract.spatialSpecRef);
  spec.camera.position[0] = 2;
  f.contract.spatialSpecRef = f.write('spec/world-space.json', spec);
  f.work.visual.domainEvidenceRef = f.write('spec/world-V1.json', f.contract);
  let checkedCurrentImport = false;
  const current = await createCompletedWorld3D(t, { fixture: f, beforeEngineering: ({ fixture, work, stage }) => {
    if (stage === 'V4') {
      const review = { ...fixture.read(work.assetReviewRef), assets: source.fixture.read(source.work.assetReviewRef).assets };
      work.assetReviewRef = fixture.write(`${work.evidenceRoot}/reuse-review.json`, review);
      fixture.model = structuredClone(review.assets.find((asset) => asset.assetType === 'model'));
      bindReuse(fixture, source.ref);
    }
  }, beforePassed: async ({ fixture, context, work, stage }) => {
    if (stage !== 'V4') return;
    const manifest = fixture.read(work.evidenceRef);
    assert.ok(manifest.items.some((item) => item.category === 'asset-import'));
    fixture.write(work.evidenceRef.path, { ...manifest, items: manifest.items.filter((item) => item.category !== 'asset-import') });
    await assert.rejects(transitionWork({ repo: context.repo, workItem: context.workPath, to: 'PASSED', args: {} }), /asset-import|证据/);
    fixture.write(work.evidenceRef.path, manifest);
    checkedCurrentImport = true;
  } });
  assert.equal(inspect({ repo: current.repo, workItem: current.workPath, check: true }).status, 'PASS');
  const archive = f.read(current.work.visual.modelBaselineRef);
  const v4 = f.read(archive.world3dModelBaseline.domainEvidenceRef);
  assert.equal(f.read(v4.sampleRef).runtimeRef, undefined);
  assert.equal(checkedCurrentImport, true);
});

test('历史来源有效也不能放行当前正式场景或模型字节变化', async (t) => {
  const { f, source } = await reuseFixture(t);
  attachWorld3DPhase(f, 'V5');
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)));
  const formal = f.contract.formalSceneRef;
  const original = readFileSync(resolve(f.repo, formal.path));
  f.write(formal.path, '当前场景已变化');
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /内容已变化/);
  f.write(formal.path, original);
  const oldModel = readFileSync(resolve(f.repo, f.model.output));
  t.after(() => source.fixture.write(f.model.output, oldModel));
  source.fixture.write(f.model.output, '当前模型已变化');
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /内容已变化/);
});

test('模型规格、资源条目或方向变化必须回到当前样本路径', async (t) => {
  const { f, source } = await reuseFixture(t);
  const original = structuredClone(f.contract);
  const spec = f.read(original.modelSpecRef);
  spec.models[0].dimensions[0] += 1;
  f.contract.modelSpecRef = f.write('spec/changed-models.json', spec);
  f.work.visual.domainEvidenceRef = f.write('spec/changed-model-domain.json', f.contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /需要当前代表试接/);
  f.contract = original;
  bindReuse(f, source.ref);
  const review = f.read(f.work.assetReviewRef);
  review.assets[0].sourceKind = 'existing';
  f.work.assetReviewRef = f.write(`${f.work.evidenceRoot}/changed-asset-review.json`, review);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /资源版本或导入来源已变化/);
  f.work.globalVisualBaselineRef = f.write('spec/another-baseline.json', f.read(f.work.globalVisualBaselineRef));
  assert.throws(() => world3DModelReuse(f.repo, f.work), /全局视觉方向已变化/);
});

test('V5 不得在 V4 已验收后保留同一模型身份却更换尺寸或接口', async (t) => {
  const source = await completedSource();
  const f = source.fixture;
  const work = structuredClone(source.work);
  const contract = structuredClone(f.contract);
  const spec = f.read(contract.modelSpecRef);
  spec.models[0].dimensions[0] += 1;
  contract.modelSpecRef = f.write('mutations/unreviewed-models.json', spec);
  work.visual.domainEvidenceRef = f.write('mutations/unreviewed-v5.json', contract);
  assert.throws(() => validateWorld3DStage(f.repo, work, 'V5', syntheticCallbacks(f)), /模型规格|验收规格/);
});

test('正式模型绑定不能夹带未验收文件并获得可写资产身份', async (t) => {
  const source = await completedSource();
  const f = source.fixture;
  const work = structuredClone(source.work);
  const contract = structuredClone(f.contract);
  const run = f.read(contract.formalRunRef);
  run.modelBindings.push({ assetId: 'extra', nodeId: 'World/Extra', outputRef: f.identity('spec/world-direction.md') });
  contract.formalRunRef = f.write(`${work.evidenceRoot}/extra-binding-run.json`, run);
  const approval = { ...f.read(contract.displayApprovalRef), basisRefs: [contract.formalRunRef, work.assetReviewRef] };
  contract.displayApprovalRef = f.write('mutations/extra-binding-approval.json', approval);
  work.visual.domainEvidenceRef = f.write('mutations/extra-binding-v5.json', contract);
  assert.throws(() => validateWorld3DStage(f.repo, work, 'V5', syntheticCallbacks(f)), /已验收模型规格/);
});

test('复用样本仍须位于当前阶段证据根内', async (t) => {
  const { f } = await reuseFixture(t);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)));
  const outside = f.write('spec/outside-reuse.json', f.read(f.contract.sampleRef));
  const review = { ...f.read(f.work.assetReviewRef), modelSampleRef: outside };
  f.work.assetReviewRef = f.write(`${f.work.evidenceRoot}/outside-review.json`, review);
  f.contract.sampleRef = outside;
  f.work.visual.domainEvidenceRef = f.write('spec/outside-domain.json', f.contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /证据|evidenceRoot/);
});

test('模型复用来源必须是同项目同对象的真实已完成 V5，不能手写 COMPLETE 冒充', async (t) => {
  const { f, source } = await reuseFixture(t);
  const variants = [
    ['项目', (work) => { work.projectId = 'other-project'; }],
    ['技术栈', (work) => { work.stack = 'threejs'; }],
    ['对象', (work) => { work.visual.objectId = 'other-world'; }],
    ['工作项', (work) => { work.workItemId = f.work.workItemId; }],
    ['阶段', (work) => { work.visual.stage = 'V4'; }],
    ['完成状态', (work) => { work.globalState = 'PASSED'; }],
    ['真实执行', (work) => { work.implementationPackageRef = { path: 'missing-pack.json' }; }],
  ];
  for (const [label, mutate] of variants) {
    const changed = structuredClone(source.work);
    mutate(changed);
    const ref = source.fixture.write('sources/invalid-model-source.json', changed);
    bindReuse(f, ref);
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /模型复用|不存在|来源/, label);
  }
  bindReuse(f, source.ref);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)));
});

test('复用声明和冻结来源被篡改或缺少理由时不能通过，失败不会污染后续校验', async (t) => {
  const { f, source } = await reuseFixture(t);
  bindReuse(f, source.ref, { reuseReason: ' ' });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /非空复用理由/);
  bindReuse(f, { ...source.ref, sha256: '0'.repeat(64) });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /内容已变化/);
  bindReuse(f, source.ref);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)));
  const originalRun = readFileSync(resolve(f.repo, source.fixture.contract.formalRunRef.path));
  t.after(() => source.fixture.write(source.fixture.contract.formalRunRef.path, originalRun));
  source.fixture.write(source.fixture.contract.formalRunRef.path, '被改写的原始运行记录');
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /内容已变化|历史完成材料/);
});
