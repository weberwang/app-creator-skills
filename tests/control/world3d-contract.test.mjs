/** 这些测试验证无图三维合同及冻结身份；合成记录不声称真实运行或人工确认。 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import {
  collectWorld3DReferences, readWorld3DContract, validateWorld3DBaseline,
  validateWorld3DModel, validateWorld3DStage, world3dScopeIds,
} from '../../skills/app-workflow-control/scripts/runtime/world3d-contract.mjs';
import { createWorld3DFixture, attachWorld3DPhase, syntheticCallbacks } from './world3d-fixture.mjs';
import { validateProductionScope } from '../../skills/app-workflow-control/scripts/runtime/production-scope.mjs';
import { validateProductionIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/production-coverage.mjs';
import { invalidateWorld3DVisual } from '../../skills/app-workflow-control/scripts/runtime/world3d-lifecycle.mjs';
import { collectWorkReferencePaths } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';

/** 以新文件重新冻结修改后的封套，避免仅测出封套本身的摘要变化。 */
function rebind(fixture, contract) {
  fixture.sequence += 1;
  fixture.work.visual.domainEvidenceRef = fixture.write(`mutations/contract-${fixture.sequence}.json`, contract);
}

/** 构造指向当前测试版本的人工确认变更，单独检查决定本身是否有效。 */
function changeApproval(fixture, field, change) {
  const contract = structuredClone(fixture.contract);
  const approval = { ...fixture.read(contract[field]), ...change };
  fixture.sequence += 1;
  contract[field] = fixture.write(`mutations/approval-${fixture.sequence}.json`, approval);
  rebind(fixture, contract);
}

test('V1 三维白模和真实文件引用可独立通过合同检查，无需图片', (t) => {
  const f = createWorld3DFixture(t);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V1'));
  assert.deepEqual(world3dScopeIds(f.repo, f.work), ['world-scope']);
  assert.ok(f.paths.every((path) => !/\.(?:png|jpe?g|webp)$/i.test(path)));
  assert.equal(f.work.visual.targets, undefined);
  assert.equal(f.work.visual.reviews, undefined);
});

test('V1 不能以空间声明、模块功能或自填状态代替白模与实际运行材料', (t) => {
  for (const field of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef']) {
    const f = createWorld3DFixture(t);
    const contract = structuredClone(f.contract);
    delete contract[field];
    rebind(f, contract);
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /路径|SHA|合同/, field);
  }
  const f = createWorld3DFixture(t);
  const run = { ...f.run, executionMode: 'simulation' };
  const contract = { ...f.contract, blockoutRunRef: f.write(`${f.work.evidenceRoot}/simulated-run.json`, run) };
  rebind(f, contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /引擎运行记录/);
});

test('白模源、实际运行场景和命令证据必须绑定当前内容', (t) => {
  const f = createWorld3DFixture(t);
  const original = readFileSync(resolve(f.repo, f.contract.blockoutRef.path));
  writeFileSync(resolve(f.repo, f.contract.blockoutRef.path), '替换过的场景内容');
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /内容已变化/);
  writeFileSync(resolve(f.repo, f.contract.blockoutRef.path), original);

  const run = { ...f.run, sceneRef: f.write('src/game/other-scene.ts', '// 不同场景') };
  rebind(f, { ...f.contract, blockoutRunRef: f.write(`${f.work.evidenceRoot}/other-run.json`, run) });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /运行场景错绑/);
});

test('范围、三维空间与运行检查不得缺失或伪装', (t) => {
  for (const change of [
    { dimension: 2 }, { scopeIds: ['unapproved-region'] }, { regions: [] },
    { playerScale: [0, 1, 1] }, { camera: { position: [1, 1, 1], target: [1, 1, 1] } },
  ]) {
    const f = createWorld3DFixture(t);
    const spatial = { ...f.read(f.contract.spatialSpecRef), ...change };
    rebind(f, { ...f.contract, spatialSpecRef: f.write('mutations/spatial.json', spatial) });
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /空间|区域|尺度|镜头/, JSON.stringify(change));
  }
  const f = createWorld3DFixture(t);
  const checks = f.run.checks.map((item) => item.id === 'camera' ? { id: 'camera', status: 'NOT_APPLICABLE', reason: '无' } : item);
  rebind(f, { ...f.contract, blockoutRunRef: f.write(`${f.work.evidenceRoot}/no-camera.json`, { ...f.run, checks }) });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /镜头检查不可省略/);
});

test('合同和空间记录必须绑定当前项目、工作项、场景和候选', (t) => {
  for (const field of ['projectId', 'workItemId', 'objectId', 'candidateId', 'stack']) {
    const f = createWorld3DFixture(t);
    rebind(f, { ...f.contract, [field]: 'wrong-identity' });
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /不一致/, field);
  }
  const f = createWorld3DFixture(t);
  rebind(f, { ...f.contract, stage: 'V2' });
  assert.throws(() => readWorld3DContract(f.repo, f.work, 'V1'), /阶段错绑/);
});

test('V2 必须有一次联合审查、整体空间人工确认和方向人工确认', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V2');
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V2'));
  const baseline = f.read(f.baselineRef);
  assert.equal(baseline.candidates, undefined);
  assert.doesNotThrow(() => validateWorld3DBaseline(f.repo, f.work, baseline));
  for (const field of ['reviewRef', 'spaceApprovalRef', 'directionApprovalRef', 'functionBaselineRef']) {
    const missing = { ...f.contract };
    delete missing[field];
    rebind(f, missing);
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /合同|功能基线/, field);
  }
});

test('未确认、拒绝、缺用户消息或错绑候选都不能进入正式生产', (t) => {
  for (const [field, change] of [
    ['spaceApprovalRef', { decision: 'PENDING' }],
    ['spaceApprovalRef', { decision: 'REJECTED' }],
    ['spaceApprovalRef', { userMessageRef: '' }],
    ['spaceApprovalRef', { candidateId: 'other-candidate' }],
    ['directionApprovalRef', { decision: 'PENDING' }],
    ['directionApprovalRef', { userMessageRef: '' }],
  ]) {
    const f = createWorld3DFixture(t);
    attachWorld3DPhase(f, 'V2');
    changeApproval(f, field, change);
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /确认|不一致|userMessageRef/, `${field} ${JSON.stringify(change)}`);
  }
});

test('同一轮审查必须完整绑定白模依据，阻断问题未解决不得确认', (t) => {
  for (const change of [
    { rounds: 2 }, { status: 'PENDING' }, { basisRefs: [] },
    { issues: [{ id: 'blocked-route', blocking: true, status: 'UNRESOLVED', reason: '尚未解决' }] },
  ]) {
    const f = createWorld3DFixture(t);
    attachWorld3DPhase(f, 'V2');
    const review = { ...f.read(f.contract.reviewRef), ...change };
    rebind(f, { ...f.contract, reviewRef: f.write('mutations/review.json', review) });
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /审查|依据|尚未解决/, JSON.stringify(change));
  }
});

test('V3 使用真实模型规格，不要求图片目标或两项拆图确认', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V3');
  assert.equal(f.work.visual.targets, undefined);
  assert.equal(f.work.visual.reviews, undefined);
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V3'));
  const contract = { ...f.contract };
  delete contract.modelSpecRef;
  rebind(f, contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V3'), /合同|路径|SHA/);
});

test('V4 必须执行工程证据门并核对模型来源、导入、消费者及代表模块', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V4');
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)));
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4'), /工程证据与资源评审/);

  for (const field of ['sourceSha256', 'outputSha256', 'importEvidenceRef', 'consumerEvidenceRef']) {
    const asset = { ...f.model };
    delete asset[field];
    assert.throws(() => validateWorld3DModel(f.repo, f.work, asset), /路径|SHA|证据/, field);
  }
  const review = f.read(f.assetReviewRef);
  review.assets[0].assetType = 'native-component';
  f.work.assetReviewRef = f.write('mutations/pretend-component.json', review);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V4', syntheticCallbacks(f)), /缺少唯一模型验收/);
});

test('V5 必须绑定正式场景、已验收模型、运行记录和人工显示确认', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V5');
  assert.doesNotThrow(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)));
  for (const field of ['formalSceneRef', 'formalRunRef', 'displayApprovalRef']) {
    const contract = { ...f.contract };
    delete contract[field];
    rebind(f, contract);
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /合同|路径|SHA/, field);
  }
  rebind(f, f.contract);
  const run = f.read(f.contract.formalRunRef);
  run.modelBindings = [];
  rebind(f, { ...f.contract, formalRunRef: f.write(`${f.work.evidenceRoot}/no-model-binding.json`, run) });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /正式场景消费记录/);
  rebind(f, f.contract);
  changeApproval(f, 'displayApprovalRef', { decision: 'PENDING' });
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /尚未人工确认/);
});

test('回退作废的场景或确认材料不能靠更换封套重新绑定', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V2');
  f.work.invalidatedRefs = [{ path: f.contract.spaceApprovalRef.path, state: 'V2' }];
  rebind(f, f.contract);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /已作废引用/);
  assert.ok(collectWorld3DReferences(f.repo, f.work).includes(f.contract.spaceApprovalRef.path));
});

test('合同 Schema 的阶段必需项与实际无图记录一致', (t) => {
  const f = createWorld3DFixture(t);
  const schema = JSON.parse(readFileSync(resolve('skills/app-workflow-control/schemas/world3d-scene.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  for (const stage of ['V1', 'V2', 'V3', 'V4', 'V5']) {
    const contract = stage === 'V1' ? f.contract : attachWorld3DPhase(f, stage);
    assert.equal(validate(contract), true, `${stage}: ${JSON.stringify(validate.errors)}`);
    const missing = { ...contract };
    delete missing[stage === 'V1' ? 'blockoutRunRef' : stage === 'V2' ? 'spaceApprovalRef' : stage === 'V3' ? 'modelSpecRef' : stage === 'V4' ? 'sampleRef' : 'displayApprovalRef'];
    assert.equal(validate(missing), false, `${stage} 不应接受缺失前置`);
  }
});

test('生产范围使用三维空间 scopeIds，不接受未列入范围的场景区域', (t) => {
  const f = createWorld3DFixture(t);
  const scope = {
    schemaVersion: '1.0', scopeId: 'production', projectId: f.work.projectId, stack: f.work.stack,
    objects: [{ objectId: f.context.objectId, workItemType: 'SCENE', targetIds: ['world-scope'] }],
    states: [{ stateId: 'ready', objectId: f.context.objectId, description: '准备' }],
    steps: [{ stepId: 'walk', objectIds: [f.context.objectId], stateIds: ['ready'],
      precondition: '准备', action: '行走', expectedResult: '移动', caseId: 'walk-case' }],
    transitions: [], batches: [{ batchId: 'first', objectIds: [f.context.objectId], stepIds: ['walk'], transitionIds: [] }],
  };
  f.work.productionBatchId = 'first';
  f.work.productionScopeRef = f.write('spec/production.json', scope);
  assert.doesNotThrow(() => validateProductionScope(f.repo, f.work));
  scope.objects[0].targetIds = ['other-scope'];
  f.work.productionScopeRef = f.write('spec/production-other.json', scope);
  assert.throws(() => validateProductionScope(f.repo, f.work), /空间覆盖超出生产总范围/);
});

test('原始运行日志不能用阶段目录外文件或控制记录冒充', (t) => {
  for (const useControlRecord of [false, true]) {
    const f = createWorld3DFixture(t);
    const commandEvidenceRef = useControlRecord
      ? f.write(`${f.work.evidenceRoot}/fake-command.json`, f.read(f.contract.spatialSpecRef))
      : f.write(`${f.work.evidenceRoot}-sibling/command.log`, '错误目录的运行输出');
    const run = { ...f.run, commandEvidenceRef };
    const blockoutRunRef = f.write(`${f.work.evidenceRoot}/changed-run.json`, run);
    rebind(f, { ...f.contract, blockoutRunRef });
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V1'), /证据|原始|控制|evidenceRoot/);
  }
});

test('已冻结的用户确认文件被篡改后不能继续作为空间依据', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V2');
  const approval = f.read(f.contract.spaceApprovalRef);
  approval.decision = 'REJECTED';
  f.write(f.contract.spaceApprovalRef.path, approval);
  assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /内容已变化/);
});

test('V5 局部返修作废运行与显示确认，保留空间和模型依据', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V5');
  const old = structuredClone(f.contract);
  const invalidated = [];
  assert.equal(invalidateWorld3DVisual(f.repo, f.work, 'visual:V5', invalidated), 'V5');
  const paths = new Set(invalidated.map((entry) => entry.path));
  assert.ok(paths.has(old.formalRunRef.path));
  assert.ok(paths.has(old.displayApprovalRef.path));
  for (const ref of [old.spatialSpecRef, old.blockoutRef, old.spaceApprovalRef, old.modelSpecRef, old.sampleRef]) {
    assert.equal(paths.has(ref.path), false, ref.path);
  }
  assert.equal(f.work.assetReviewRef.path, f.assetReviewRef.path);
});

test('V4 返修仍须作废当前 V4 封套和模型评审', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V4');
  const contractRef = f.work.visual.domainEvidenceRef;
  const invalidated = [];
  assert.equal(invalidateWorld3DVisual(f.repo, f.work, 'visual:V4', invalidated), 'V4');
  const paths = new Set(invalidated.map((item) => item.path));
  assert.ok(paths.has(contractRef.path));
  assert.ok(paths.has(f.assetReviewRef.path));
});

test('非 JSON 后缀的控制封套仍保护嵌套文件，超限同样拒绝', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V4');
  f.work.visual.domainEvidenceRef = f.write('spec/world.contract', f.contract);
  f.work.assetReviewRef = f.write('reviews/assets.txt', f.read(f.assetReviewRef));
  const paths = collectWorkReferencePaths(f.work, f.repo);
  const sample = f.read(f.sampleRef);
  for (const path of [f.contract.blockoutRef.path, sample.sceneRef.path, f.model.sourceRef, f.model.output]) {
    assert.ok(paths.includes(path), `${path} 未受保护`);
  }
  const tooLarge = 'x'.repeat(5 * 1024 * 1024 + 1);
  for (const field of ['domainEvidenceRef', 'assetReviewRef']) {
    const original = field === 'domainEvidenceRef' ? f.work.visual[field] : f.work[field];
    const oversized = f.write(`spec/${field}.txt`, { payload: tooLarge });
    if (field === 'domainEvidenceRef') f.work.visual[field] = oversized;
    else f.work[field] = oversized;
    assert.throws(() => collectWorkReferencePaths(f.work, f.repo), /控制记录超过安全读取上限/);
    if (field === 'domainEvidenceRef') f.work.visual[field] = original;
    else f.work[field] = original;
  }
});

test('最终集成要求三维空间范围与冻结生产目标精确相等', (t) => {
  for (const [actualIds, expectedIds, shouldPass] of [
    [['world-scope'], ['world-scope'], true],
    [['world-scope'], ['world-scope', 'missing'], false],
    [['world-scope', 'extra'], ['world-scope'], false],
  ]) {
    const f = createWorld3DFixture(t);
    const spatial = { ...f.read(f.contract.spatialSpecRef), scopeIds: actualIds };
    const spatialSpecRef = f.write('spec/integration-spatial.json', spatial);
    f.work.visual.domainEvidenceRef = f.write('spec/integration-contract.json', { ...f.contract, scopeIds: actualIds, spatialSpecRef });
    const scope = {
      schemaVersion: '1.0', scopeId: 'production', projectId: f.work.projectId, stack: f.work.stack,
      objects: [{ objectId: f.context.objectId, workItemType: 'SCENE', targetIds: expectedIds }],
      states: [{ stateId: 'ready', objectId: f.context.objectId, description: '准备' }],
      steps: [{ stepId: 'walk', objectIds: [f.context.objectId], stateIds: ['ready'],
        precondition: '准备', action: '行走', expectedResult: '移动', caseId: 'walk-case' }],
      transitions: [], batches: [{ batchId: 'first', objectIds: [f.context.objectId], stepIds: ['walk'], transitionIds: [] }],
    };
    const productionScopeRef = f.write('spec/integration-production.json', scope);
    f.work.productionScopeRef = productionScopeRef;
    const sourceRef = f.write('spec/integration-source.json', f.work);
    const integrationWork = { projectId: f.work.projectId, stack: f.work.stack,
      workItemType: 'INTEGRATION', integrationPurpose: 'final', productionScopeRef };
    const integration = { productionScopeRef, objects: [{ objectId: f.context.objectId, workItemRef: sourceRef }],
      cases: [{ caseId: 'walk-case', objectIds: [f.context.objectId] }] };
    if (shouldPass) assert.doesNotThrow(() => validateProductionIntegrationScope(f.repo, integrationWork, integration));
    else assert.throws(() => validateProductionIntegrationScope(f.repo, integrationWork, integration), /累计目标未覆盖总范围/);
  }
});

test('超五兆领域合同或资源评审拒绝读取，不能漏过结果路径保护', (t) => {
  const f = createWorld3DFixture(t);
  attachWorld3DPhase(f, 'V4');
  const largeValue = 'x'.repeat(5 * 1024 * 1024 + 1);
  const protectedBlockout = f.write(`${f.work.evidenceRoot}/protected-blockout.txt`, '合成白模源');
  const protectedOutput = f.write(`${f.work.evidenceRoot}/protected-model.txt`, '合成模型输出');
  const protectedSource = f.write(`${f.work.evidenceRoot}/protected-source.txt`, '合成模型来源');
  const previousContract = f.work.visual.domainEvidenceRef;
  f.work.visual.domainEvidenceRef = f.write('spec/large-contract.json', {
    ...f.contract, scopeIds: [largeValue], blockoutRef: protectedBlockout,
  });
  assert.throws(() => collectWorkReferencePaths(f.work, f.repo), /控制记录超过安全读取上限/);
  f.work.visual.domainEvidenceRef = previousContract;
  const review = f.read(f.assetReviewRef);
  review.assets[0].sourceRef = protectedSource.path;
  review.assets[0].output = protectedOutput.path;
  review.assets[0].padding = largeValue;
  f.work.assetReviewRef = f.write('reviews/large-assets.json', review);
  assert.throws(() => collectWorkReferencePaths(f.work, f.repo), /控制记录超过安全读取上限/);
  // 缩小后仍须识别嵌套的模型源和输出，确认上限不是简单跳过记录。
  delete review.assets[0].padding;
  f.work.assetReviewRef = f.write('reviews/small-assets.json', review);
  const protectedPaths = collectWorkReferencePaths(f.work, f.repo);
  for (const ref of [protectedSource, protectedOutput]) assert.ok(protectedPaths.includes(ref.path), ref.path);
});

test('V2 不能在功能基线之后重绑空间、白模或白模运行', (t) => {
  for (const field of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef']) {
    const f = createWorld3DFixture(t);
    attachWorld3DPhase(f, 'V2');
    const previous = f.contract[field];
    const value = field === 'blockoutRef' ? '合成的另一版白模' : f.read(previous);
    const next = f.write(`${f.work.evidenceRoot}/changed-${field}.${field === 'blockoutRef' ? 'txt' : 'json'}`, value);
    rebind(f, { ...f.contract, [field]: next });
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V2'), /功能基线白模依据/);
  }
});

test('V5 不能重绑 V4 模型评审、证据根或代表模块', (t) => {
  for (const changed of ['review', 'root', 'sample']) {
    const f = createWorld3DFixture(t);
    attachWorld3DPhase(f, 'V5');
    if (changed === 'sample') {
      const sample = f.write(`${f.work.evidenceRoot}/different-sample.json`, f.read(f.contract.sampleRef));
      rebind(f, { ...f.contract, sampleRef: sample });
    } else {
      const review = f.read(f.assetReviewRef);
      if (changed === 'root') review.evidenceRoot = `${review.evidenceRoot}-different`;
      f.work.assetReviewRef = f.write(`reviews/rebound-${changed}.json`, review);
    }
    assert.throws(() => validateWorld3DStage(f.repo, f.work, 'V5', syntheticCallbacks(f)), /模型基线|代表模块/);
  }
});
