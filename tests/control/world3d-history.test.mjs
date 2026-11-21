/** 三维历史版本测试使用隔离的合成证据，不运行引擎或代替用户验收。 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { captureWorld3DFileSnapshots, collectWorld3DMutableSourcePaths, withWorld3DFileSnapshots } from '../../skills/app-workflow-control/scripts/runtime/world3d-file-snapshots.mjs';
import { collectWorld3DReferences, validateWorld3DStage, world3dFile } from '../../skills/app-workflow-control/scripts/runtime/world3d-contract.mjs';
import { inspectProductionDependencySource } from '../../skills/app-workflow-control/scripts/runtime/production-dependency-inspector.mjs';
import { assertModuleRuntime } from '../../skills/app-workflow-control/scripts/runtime/module-stages.mjs';
import { advanceVisual, assertFunctionBaseline, completeUnit, refreshFunctionBaseline, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { bindEvidence, bindImplementation, putJson, readWork, submitPassingUnits } from './controller-fixture.mjs';
import { attachWorld3DPhase, createWorld3DFixture, syntheticCallbacks } from './world3d-fixture.mjs';
import { createCompletedWorld3D, prepareWorld3DStage, runWorld3DEngineering } from './world3d-completed-fixture.mjs';

/** 为不同阶段提供同一隔离执行状态；正式流程由控制器创建该文件。 */
function stateFixture(fixture) {
  fixture.write(`${fixture.work.evidenceRoot}/execution-state.json`, {
    schemaVersion: '1.0', workItemId: fixture.work.workItemId, stack: fixture.work.stack,
  });
}

/** 恢复当前工作项的 V4 封套，验证模型阶段的真实旧版本可被 V5 引用。 */
function archivedV4Work(fixture) {
  const archive = fixture.read(fixture.work.visual.modelBaselineRef);
  const work = structuredClone(fixture.work);
  work.visual.stage = 'V4';
  work.visual.domainEvidenceRef = archive.world3dModelBaseline.domainEvidenceRef;
  work.assetReviewRef = archive.world3dModelBaseline.assetReviewRef;
  return work;
}

/** 准备 V1、V4 与 V5 的不同阶段快照，阶段记录和人工消息均为合成材料。 */
async function completedFixture(t, { productionRisk = 'low' } = {}) {
  const fixture = createWorld3DFixture(t, { stack: 'unity', productionRisk });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  attachWorld3DPhase(fixture, 'V5');
  await captureWorld3DFileSnapshots(fixture.repo, archivedV4Work(fixture));
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  return fixture;
}

test('同一路径更新白模后，仅历史上下文可以验证真实 V1 版本', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity' });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  fixture.write(fixture.contract.blockoutRef.path, '后续阶段的正式场景');
  assert.throws(() => validateWorld3DStage(fixture.repo, fixture.work, 'V1'), /内容已变化/);
  assert.doesNotThrow(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] },
    () => validateWorld3DStage(fixture.repo, fixture.work, 'V1')));
});

test('复用先前生产者的首件时，V5 可使用已验收的本批 V4 场景快照', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity', productionRisk: 'high' });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  attachWorld3DPhase(fixture, 'V4');
  const sample = fixture.read(fixture.sampleRef);
  const run = fixture.read(sample.runtimeRef);
  const producer = 'previous-high-risk-producer';
  const root = `.workflow-control/evidence/${producer}`;
  // 保留原始观测字节，以更早生产者的证据根和身份登记同一场景与正式模型。
  const commandEvidenceRef = fixture.write(`${root}/command.txt`, readFileSync(resolve(fixture.repo, run.commandEvidenceRef.path)));
  const runtimeRef = fixture.write(`${root}/run.json`, {
    ...run, workItemId: producer, commandEvidenceRef,
    checks: run.checks.map((check) => ({ ...check, evidenceRef: commandEvidenceRef })),
  });
  fixture.sampleRef = fixture.write(`${root}/sample.json`, { ...sample, workItemId: producer, evidenceRoot: root, runtimeRef });
  fixture.assetReviewRef = fixture.write('reviews/reused-first-item.json', {
    ...fixture.read(fixture.assetReviewRef), modelSampleRef: fixture.sampleRef,
  });
  attachWorld3DPhase(fixture, 'V5');
  await captureWorld3DFileSnapshots(fixture.repo, archivedV4Work(fixture));
  fixture.write(sample.sceneRef.path, 'V4 首件场景路径后续已有新版本');
  assert.doesNotThrow(() => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture)));
});

test('正式场景与模型更新后，旧 V5 仍核验当时版本而当前 V5 必须失败', async (t) => {
  for (const target of ['scene', 'model']) {
    const fixture = await completedFixture(t);
    assert.doesNotThrow(() => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture)));
    const path = target === 'scene' ? fixture.contract.formalSceneRef.path : fixture.model.output;
    fixture.write(path, `后批更新的${target}`);
    assert.throws(() => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture)), /内容已变化/);
    assert.doesNotThrow(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1', 'V4', 'V5'] },
      () => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture))));
  }
});

test('快照丢失或篡改及审批记录变化均阻断历史检查', async (t) => {
  for (const failure of ['missing', 'tampered', 'approval']) {
    const fixture = await completedFixture(t);
    const state = fixture.read({ path: `${fixture.work.evidenceRoot}/execution-state.json` });
    const snapshotPath = state.world3dFileSnapshots.V5[0].snapshotPath;
    if (failure === 'missing') unlinkSync(resolve(fixture.repo, snapshotPath));
    if (failure === 'tampered') writeFileSync(resolve(fixture.repo, snapshotPath), '被篡改的快照');
    if (failure === 'approval') fixture.write(fixture.contract.spaceApprovalRef.path, '被篡改的审批');
    assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1', 'V4', 'V5'] },
      () => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture))), /快照|内容已变化/);
  }
});

test('另一工作项不能借用当前历史上下文的同路径旧文件', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity' });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  const ref = structuredClone(fixture.contract.blockoutRef);
  const other = structuredClone(fixture.work);
  other.workItemId = 'other-work';
  fixture.write(ref.path, '其他工作项的当前场景');
  assert.doesNotThrow(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] },
    () => world3dFile(fixture.repo, ref, '本工作项白模', fixture.work)));
  assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] },
    () => world3dFile(fixture.repo, ref, '其他工作项白模', other)), /内容已变化/);
});

test('不能向执行状态注入审批或原始日志快照掩盖历史记录变化', async (t) => {
  for (const target of ['approval', 'log']) {
    const fixture = await completedFixture(t);
    const ref = target === 'approval' ? fixture.contract.spaceApprovalRef : fixture.logs.command;
    const statePath = `${fixture.work.evidenceRoot}/execution-state.json`;
    const state = fixture.read({ path: statePath });
    const snapshotPath = `${fixture.work.evidenceRoot}/world3d-file-snapshots/${ref.sha256}`;
    fixture.write(snapshotPath, readFileSync(resolve(fixture.repo, ref.path)));
    state.world3dFileSnapshots.V5.push({ ...ref, snapshotPath });
    fixture.write(statePath, state);
    assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1', 'V4', 'V5'] },
      () => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture))), /快照.*(?:无效|业务来源)/);
  }
});

test('已完成阶段缺失 V5 快照时，当前源恰好未改变也不能冒充历史版本', async (t) => {
  const fixture = await completedFixture(t);
  fixture.work.globalState = 'COMPLETE';
  const statePath = `${fixture.work.evidenceRoot}/execution-state.json`;
  const state = fixture.read({ path: statePath });
  delete state.world3dFileSnapshots.V5;
  fixture.write(statePath, state);
  assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1', 'V4', 'V5'] },
    () => validateWorld3DStage(fixture.repo, fixture.work, 'V5', syntheticCallbacks(fixture))), /快照缺少阶段版本/);
});

test('V1 与 V4 完成后不得因当前源未改变而掩盖阶段快照缺失', async (t) => {
  for (const stage of ['V1', 'V4']) {
    const fixture = createWorld3DFixture(t, { stack: 'unity' });
    stateFixture(fixture);
    if (stage === 'V4') attachWorld3DPhase(fixture, stage);
    await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
    fixture.work.globalState = 'PASSED';
    const statePath = `${fixture.work.evidenceRoot}/execution-state.json`;
    const state = fixture.read({ path: statePath });
    delete state.world3dFileSnapshots[stage];
    fixture.write(statePath, state);
    assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: [stage] }, () => {}), /快照缺少阶段版本/);
  }
});

test('已绑定的快照文件及其执行状态受到工作项引用保护', async (t) => {
  const fixture = await completedFixture(t);
  const statePath = `${fixture.work.evidenceRoot}/execution-state.json`;
  const state = fixture.read({ path: statePath });
  const paths = collectWorld3DReferences(fixture.repo, fixture.work);
  assert.ok(paths.includes(statePath));
  for (const entries of Object.values(state.world3dFileSnapshots)) for (const entry of entries) assert.ok(paths.includes(entry.snapshotPath));
});

test('场景规划只把受控业务源列为可编辑，不放宽审批、消费证据和快照路径', async (t) => {
  const fixture = await completedFixture(t);
  const mutable = collectWorld3DMutableSourcePaths(fixture.repo, fixture.work);
  for (const path of [fixture.contract.blockoutRef.path, fixture.contract.formalSceneRef.path, fixture.model.sourceRef, fixture.model.output]) assert.ok(mutable.includes(path), path);
  for (const path of [fixture.contract.spaceApprovalRef.path, fixture.model.consumerEvidenceRef.path, fixture.contract.formalRunRef.path]) assert.ok(!mutable.includes(path), path);
  const state = fixture.read({ path: `${fixture.work.evidenceRoot}/execution-state.json` });
  assert.ok(!mutable.includes(state.world3dFileSnapshots.V5[0].snapshotPath));
});

test('额外试接材料与正式运行绑定不能自动获得规划写入权限', async (t) => {
  const fixture = await completedFixture(t, { productionRisk: 'high' });
  const sample = fixture.read(fixture.contract.sampleRef);
  sample.sourceRefs = [fixture.write('Assets/extra-source.bin', '额外来源')];
  sample.outputs = [fixture.write('Assets/extra-output.bin', '额外产物')];
  fixture.contract.sampleRef = fixture.write('spec/extra-sample.json', sample);
  const run = fixture.read(fixture.contract.formalRunRef);
  run.modelBindings.push({ assetId: '未验收模型', outputRef: fixture.write('Assets/extra-model.bin', '额外模型') });
  fixture.contract.formalRunRef = fixture.write('spec/extra-formal-run.json', run);
  fixture.work.visual.domainEvidenceRef = fixture.write('spec/extra-contract.json', fixture.contract);
  const mutable = collectWorld3DMutableSourcePaths(fixture.repo, fixture.work);
  for (const path of ['Assets/extra-source.bin', 'Assets/extra-output.bin', 'Assets/extra-model.bin', sample.sceneRef.path]) assert.ok(!mutable.includes(path), path);
});

test('同一检查链缓存已验证清单，后续独立检查和快照字节仍重新核验', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity' });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  const statePath = `${fixture.work.evidenceRoot}/execution-state.json`;
  const state = fixture.read({ path: statePath });
  const snapshotPath = state.world3dFileSnapshots.V1[0].snapshotPath;
  const snapshotBytes = readFileSync(resolve(fixture.repo, snapshotPath));
  withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] }, () => {
    delete state.world3dFileSnapshots.V1;
    fixture.write(statePath, state);
    assert.doesNotThrow(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] },
      () => world3dFile(fixture.repo, fixture.contract.blockoutRef, '白模', fixture.work)));
    writeFileSync(resolve(fixture.repo, snapshotPath), '损坏的快照');
    assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] },
      () => world3dFile(fixture.repo, fixture.contract.blockoutRef, '白模', fixture.work)), /内容已变化/);
    writeFileSync(resolve(fixture.repo, snapshotPath), snapshotBytes);
  });
  fixture.work.globalState = 'PASSED';
  assert.throws(() => withWorld3DFileSnapshots(fixture.repo, fixture.work, { historical: true, stages: ['V1'] }, () => {}), /缺少阶段版本/);
});

test('发布冲突失败后只清理本次临时文件，修复冲突可重试', async (t) => {
  const fixture = createWorld3DFixture(t, { stack: 'unity' });
  stateFixture(fixture);
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
  const state = fixture.read({ path: `${fixture.work.evidenceRoot}/execution-state.json` });
  const snapshot = state.world3dFileSnapshots.V1[0].snapshotPath;
  writeFileSync(resolve(fixture.repo, snapshot), '已损坏的既有副本');
  await assert.rejects(captureWorld3DFileSnapshots(fixture.repo, fixture.work), /内容已变化/);
  assert.ok(readdirSync(resolve(fixture.repo, fixture.work.evidenceRoot, 'world3d-file-snapshots')).every((name) => !name.endsWith('.tmp')));
  unlinkSync(resolve(fixture.repo, snapshot));
  await captureWorld3DFileSnapshots(fixture.repo, fixture.work);
});

test('V1 模块方案的实现返修保留白模身份并拒绝旧功能基线刷新', async (t) => {
  const { repo, workPath, fixture } = await prepareWorld3DStage(t, 'V5');
  let work = await readWork(repo, workPath);
  const original = fixture.read(work.visual.functionBaselineRef);
  fixture.write(original.world3dBlockoutRefs.blockoutRef.path, '同一白模路径的正式装配');
  await transitionWork({ repo, workItem: workPath, to: 'RETURN', args: { reason: '局部功能返修', 'affected-scope': 'implementation' } });
  work = await readWork(repo, workPath);
  assert.ok(!work.visual.domainEvidenceRef);
  // 恢复迁移需要临时提供合同；功能重验时可独立撤下该封套。
  attachWorld3DPhase(fixture, 'V5', work);
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '已完成分析' } });
  work = await readWork(repo, workPath);
  const path = `Assets/Scripts/${work.workItemId}-V1.cs`;
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'V5', unitPaths: [path] });
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  for (const unit of units) await completeUnit({ repo, workItem: workPath, resultPath: unit.resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage: 'V5' });
  work = await readWork(repo, workPath);
  delete work.visual.domainEvidenceRef;
  await putJson(repo, workPath, work);
  const spec = fixture.write('spec/local-function-regression.json', { localRegression: true, visualImpact: 'none', reason: '功能返修不影响视觉' });
  await assert.rejects(refreshFunctionBaseline({ repo, workItem: workPath, specPath: spec.path }), /V1 模块方案/);
  work = await readWork(repo, workPath);
  const baseline = fixture.read(work.visual.functionBaselineRef);
  assert.equal(baseline.mode, 'module-plan');
  assert.deepEqual(baseline.world3dBlockoutRefs, original.world3dBlockoutRefs);
  assert.doesNotThrow(() => assertFunctionBaseline(repo, work));
});

test('控制器 HUD 返修复用同路径正式装配前的 V4 消费场景快照', async (t) => {
  const options = {
    /** 模拟白模、消费场景和正式装配先后写入同一场景路径。 */
    beforeEngineering: ({ fixture: f, work, stage }) => {
      if (stage === 'V1') {
        const contract = structuredClone(f.contract);
        const blockoutRef = f.write('Assets/Scenes/shared-world.unity', '同路径的 V1 白模');
        const run = f.read(contract.blockoutRunRef);
        run.sceneRef = blockoutRef;
        Object.assign(contract, { blockoutRef, blockoutRunRef: f.write(`${work.evidenceRoot}/shared-blockout-run.json`, run) });
        f.contract = contract;
        work.visual.domainEvidenceRef = f.write('spec/shared-v1.json', contract);
        return;
      }
      if (stage === 'V4') {
        const contract = structuredClone(f.contract);
        const sceneRef = f.write(contract.blockoutRef.path, '同路径的 V4 消费场景');
        const consumer = f.read(f.model.consumerEvidenceRef);
        consumer.sceneRef = sceneRef;
        f.model.consumerEvidenceRef = f.write(`${work.evidenceRoot}/shared-consumer.json`, consumer);
        const review = f.read(work.assetReviewRef);
        review.assets = [f.model];
        f.assetReviewRef = f.write('reviews/shared-models.json', review);
        work.assetReviewRef = f.assetReviewRef;
        f.contract = contract;
        work.visual.domainEvidenceRef = f.write('spec/shared-v4.json', contract);
        return;
      }
      if (stage !== 'V5') return;
      const contract = structuredClone(f.contract);
      const consumer = f.read(f.model.consumerEvidenceRef);
      const previousRun = contract.formalRunRef;
      const formalSceneRef = f.write(consumer.sceneRef.path, '同路径的 V5 正式装配');
      const run = f.read(previousRun);
      run.sceneRef = formalSceneRef;
      const formalRunRef = f.write(`${work.evidenceRoot}/same-path-formal-run.json`, run);
      const approval = f.read(contract.displayApprovalRef);
      approval.subjectRef = formalSceneRef;
      approval.basisRefs = approval.basisRefs.map((ref) => ref.path === previousRun.path ? formalRunRef : ref);
      Object.assign(contract, { formalSceneRef, formalRunRef, displayApprovalRef: f.write('reviews/same-path-formal.json', approval) });
      f.contract = contract;
      work.visual.domainEvidenceRef = f.write('spec/same-path-formal.json', contract);
    },
  };
  const { repo, workPath, fixture } = await prepareWorld3DStage(t, 'V5', options);
  let work = await readWork(repo, workPath);
  attachWorld3DPhase(fixture, 'V5', work);
  options.beforeEngineering({ fixture, work, stage: 'V5' });
  await putJson(repo, workPath, work);
  await runWorld3DEngineering({ repo, workPath }, 'V5');
  work = await readWork(repo, workPath);
  const archiveRef = structuredClone(work.visual.modelBaselineRef);
  const archive = fixture.read(archiveRef).world3dModelBaseline;
  // 此处只需 HUD 容器触发真实 RETURN，HUD 自身验收由既有 HUD 控制器测试覆盖。
  work.visual.hud = { scopeIds: ['test-hud'] };
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'RETURN', args: { reason: '仅调整 HUD', 'affected-scope': 'hud:V4' } });
  work = await readWork(repo, workPath);
  assert.equal(work.visual.stage, 'V4');
  assert.deepEqual(work.visual.modelBaselineRef, archiveRef);
  delete work.visual.hud;
  work.visual.domainEvidenceRef = archive.domainEvidenceRef;
  assert.doesNotThrow(() => validateWorld3DStage(repo, work, 'V4', syntheticCallbacks(fixture)));
  await captureWorld3DFileSnapshots(repo, work);
  const state = fixture.read({ path: `${archive.evidenceRoot}/execution-state.json` });
  const oldScene = fixture.read(fixture.model.consumerEvidenceRef).sceneRef;
  const snapshot = state.world3dFileSnapshots.V4.find((entry) => entry.path === oldScene.path && entry.sha256 === oldScene.sha256);
  assert.ok(snapshot);
  fixture.write(fixture.model.output, '后续模型变化必须重验');
  assert.throws(() => validateWorld3DStage(repo, work, 'V4', syntheticCallbacks(fixture)), /内容已变化/);
  fixture.write(fixture.model.output, readFileSync(resolve(repo, state.world3dFileSnapshots.V4.find((entry) => entry.path === fixture.model.output).snapshotPath)));
  work.gateStatus.F2 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: { 'return-resolution': '重新验证 HUD 实现' } });
  // 返修实施包和证据必须使用新路径，避免覆盖上一轮 V4 的已作废控制记录。
  work = await readWork(repo, workPath);
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'V4-repair', unitPaths: ['Assets/Scripts/hud-repair.cs'] });
  const pack = fixture.read({ path: packPath });
  pack.visualStage = 'V4';
  fixture.write(packPath, pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await submitPassingUnits({ repo, work, workPath, packPath, units });
  for (const unit of units) await completeUnit({ repo, workItem: workPath, resultPath: unit.resultPath });
  work = await readWork(repo, workPath);
  const requirements = loadProfile(repo, work.stack).evidenceRequirements;
  const categories = [...new Set([...requirements.engineering, ...(requirements.assetImport ?? [])])];
  const items = categories.map((category) => ({ category, status: 'PASS', path: fixture.write(`${work.evidenceRoot}/repair-${category}.txt`, `合成证据：${category}`).path }));
  work.evidenceRef = fixture.write(`${work.evidenceRoot}/repair-manifest.json`, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: packPath, visualStage: 'V4', items });
  work.gateStatus.F3 = 'PASS';
  await putJson(repo, workPath, work);
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  await advanceVisual({ repo, workItem: workPath, to: 'V5' });
  work = await readWork(repo, workPath);
  const updated = fixture.read(work.visual.modelBaselineRef).world3dModelBaseline;
  assert.equal(updated.evidenceRoot, archive.evidenceRoot);
  assert.equal(work.visual.stage, 'V5');
  writeFileSync(resolve(repo, snapshot.snapshotPath), '旧消费场景快照被篡改');
  assert.throws(() => withWorld3DFileSnapshots(repo, work, { stages: ['V4'] }, () => {}), /快照.*内容已变化/);
});

test('控制器实际阶段流保留同路径白模与正式场景，并允许后批修改而不降低当前验收', async (t) => {
  const completed = await createCompletedWorld3D(t, {
    v1UnitPaths: ({ fixture }) => [fixture.contract.blockoutRef.path, 'Assets/Scripts/v1-logic.cs'],
    /** 在真实 V5 执行前模拟场景装配，原白模路径身份保持不变。 */
    beforeEngineering: ({ fixture, work, stage }) => {
      if (stage === 'V1') {
        const contract = structuredClone(fixture.contract);
        const blockoutRef = fixture.write('Assets/Scenes/world.unity', '同一正式场景的 V1 白模版本');
        const run = fixture.read(contract.blockoutRunRef);
        run.sceneRef = blockoutRef;
        const blockoutRunRef = fixture.write(`${work.evidenceRoot}/same-scene-blockout-run.json`, run);
        Object.assign(contract, { blockoutRef, blockoutRunRef });
        fixture.contract = contract;
        work.visual.domainEvidenceRef = fixture.write('spec/same-scene-v1.json', contract);
        return;
      }
      if (stage !== 'V5') return;
      const contract = structuredClone(fixture.contract);
      const originalRun = contract.formalRunRef;
      const formalSceneRef = fixture.write(contract.blockoutRef.path, '同一正式场景的 V5 装配版本');
      const run = fixture.read(originalRun);
      run.sceneRef = formalSceneRef;
      const formalRunRef = fixture.write(`${work.evidenceRoot}/same-scene-formal-run.json`, run);
      const approval = fixture.read(contract.displayApprovalRef);
      approval.subjectRef = formalSceneRef;
      approval.basisRefs = approval.basisRefs.map((ref) => ref.path === originalRun.path ? formalRunRef : ref);
      const displayApprovalRef = fixture.write('reviews/same-scene-display.json', approval);
      Object.assign(contract, { formalSceneRef, formalRunRef, displayApprovalRef });
      fixture.contract = contract;
      work.visual.domainEvidenceRef = fixture.write('spec/same-scene-formal.json', contract);
    },
  });
  const { fixture, repo, work, workPath } = completed;
  assert.equal(inspectProductionDependencySource(repo, work, workPath).status, 'PASS');
  const logicPath = `Assets/Scripts/${work.workItemId}-V5.cs`;
  const originalLogic = readFileSync(resolve(repo, logicPath));
  fixture.write(logicPath, '功能代码改动必须重验');
  assert.throws(() => assertModuleRuntime(repo, work), /验收证据已变化/);
  assert.doesNotThrow(() => assertModuleRuntime(repo, work, { historical: true }));
  fixture.write(logicPath, originalLogic);
  fixture.write(fixture.contract.formalSceneRef.path, '后批在同一场景增加湿地');
  fixture.write(fixture.model.output, '后批更新模型');
  const historical = inspectProductionDependencySource(repo, work, workPath);
  assert.equal(historical.status, 'PASS', historical.blocking?.join('\n'));
  assert.throws(() => validateWorld3DStage(repo, work, 'V5', syntheticCallbacks(fixture)), /内容已变化/);
  unlinkSync(resolve(repo, fixture.contract.formalSceneRef.path));
  unlinkSync(resolve(repo, fixture.model.output));
  const removed = inspectProductionDependencySource(repo, work, workPath);
  assert.equal(removed.status, 'PASS', removed.blocking?.join('\n'));
  assert.throws(() => validateWorld3DStage(repo, work, 'V5', syntheticCallbacks(fixture)), /不存在/);
});
