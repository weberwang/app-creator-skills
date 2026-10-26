import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { assertVisualReuse } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse-binding.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { completeUnit, initializeWork, inspectWork, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { reuseVisualReviews } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse.mjs';

const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];
const expectedReviews = {
  implementation: ['V1', 'V2Decomposition', 'V2Layout'],
  assets: ['V1', 'V2Decomposition', 'V2Layout'],
  layout: ['V1', 'V2Decomposition'],
  target: [],
};
const expectedStages = { implementation: 'V2', assets: 'V2', layout: 'V1', target: 'V0' };

/** 创建隔离的合成协议夹具；夹具记录不代表真实用户审阅或视觉验收。 */
async function createFixture({ id, stack = 'flutter', type = 'PAGE', projectId = 'project-a', objectId = 'object-a', hostId, layerType } = {}) {
  const repo = await mkdtemp(resolve(tmpdir(), 'visual-reuse-'));
  const args = { id, stack, type, objective: `验证 ${id} 的视觉控制协议`, 'project-id': projectId, 'object-id': objectId };
  if (type === 'DISPLAY_LAYER') Object.assign(args, { 'host-id': hostId ?? 'host-a', 'layer-type': layerType ?? 'modal' });
  const result = await initializeWork({ repo, args });
  return { repo, workPath: result.metadata.workItemPath };
}

/** 写入合成测试材料，验证项目内相对路径约束与读取流程。 */
async function put(repo, path, content = '合成协议测试材料\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return path;
}

/** 序列化 Work Item 或人工记录等 JSON 测试材料。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 为一项合成审阅生成非空的五维校验文件。 */
async function qualityChecks(repo, prefix) {
  const checks = [];
  for (const [index, dimension] of qualityDimensions.entries()) {
    const evidenceRef = `${prefix}/${index}-${dimension}.txt`;
    await put(repo, evidenceRef, `${dimension} 合成测试证据\n`);
    checks.push({ dimension, status: 'PASS', evidenceRef });
  }
  return checks;
}

/** 构造只用于控制器合同的人工记录形状，不伪装成真实审批。 */
function humanRecord({ objectId, stage, purpose, candidateId, targetRef, userMessageRef, checks }) {
  return {
    schemaVersion: '1.0', objectId, candidateId, stage, purpose,
    decision: 'APPROVED', userMessageRef,
    ...(targetRef ? { targetRef } : {}), ...(checks ? { qualityChecks: checks } : {}),
  };
}

/** 为来源构造完整的合成 V4 材料，覆盖真实校验器读取的绑定字段。 */
async function completeVisualSource(fixture) {
  const work = loadWork(fixture.repo, fixture.workPath);
  const baseChecks = await qualityChecks(fixture.repo, 'proof/baseline');
  const candidates = [];
  for (const candidateId of ['direction-a', 'direction-b', 'direction-c']) {
    const path = await put(fixture.repo, `proof/candidates/${candidateId}.txt`, `${candidateId} 合成候选\n`);
    candidates.push({
      candidateId, path,
      qualityChecks: candidateId === 'direction-a' ? baseChecks : qualityDimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })),
    });
  }
  const baselineReviewPath = '.workflow-control/reviews/baseline-review.json';
  await putJson(fixture.repo, baselineReviewPath, humanRecord({
    objectId: 'baseline-a', candidateId: 'direction-a', stage: 'BASELINE', purpose: 'visual-baseline',
    userMessageRef: 'test-message://baseline', checks: baseChecks,
  }));
  const baselinePath = '.workflow-control/visual/global-baseline.json';
  await putJson(fixture.repo, baselinePath, {
    schemaVersion: '1.0', baselineId: 'baseline-a', projectId: work.projectId, stack: work.stack,
    candidates, selectedCandidateId: 'direction-a', selectionReviewRef: { path: baselineReviewPath },
  });

  work.globalState = 'REVIEW';
  work.globalVisualBaselineRef = { path: baselinePath };
  work.visual.stage = 'V4';
  work.visual.candidateId = 'direction-a';
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'NOT_RUN', F4: 'NOT_RUN' };

  const targetRef = await put(fixture.repo, 'proof/target.txt', 'V1 合成目标\n');
  const v1Checks = await qualityChecks(fixture.repo, 'proof/v1');
  const v1Path = '.workflow-control/reviews/v1.json';
  await putJson(fixture.repo, v1Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V1', purpose: 'target',
    targetRef, userMessageRef: 'test-message://v1', checks: v1Checks,
  }));
  work.visual.reviews.V1 = { path: v1Path };

  const decompositionRef = await put(fixture.repo, 'proof/decomposition.txt', 'V2 合成拆解\n');
  const decompositionPath = '.workflow-control/reviews/v2-decomposition.json';
  await putJson(fixture.repo, decompositionPath, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'decomposition',
    targetRef: decompositionRef, userMessageRef: 'test-message://v2-decomposition',
  }));
  work.visual.reviews.V2Decomposition = { path: decompositionPath };

  const layoutRef = await put(fixture.repo, 'proof/layout.txt', 'V2 合成布局\n');
  const layoutPath = '.workflow-control/reviews/v2-layout.json';
  await putJson(fixture.repo, layoutPath, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'layout',
    targetRef: layoutRef, userMessageRef: 'test-message://v2-layout',
  }));
  work.visual.reviews.V2Layout = { path: layoutPath };

  const v3Path = '.workflow-control/reviews/v3-imported-assets.json';
  await putJson(fixture.repo, v3Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V3', purpose: 'imported-assets',
    userMessageRef: 'test-message://v3',
  }));
  work.visual.reviews.V3 = { path: v3Path };
  const v4Path = '.workflow-control/reviews/v4-runtime.json';
  await putJson(fixture.repo, v4Path, humanRecord({
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V4', purpose: 'runtime-acceptance',
    userMessageRef: 'test-message://v4',
  }));
  work.visual.reviews.V4 = { path: v4Path };

  const assetChecks = await qualityChecks(fixture.repo, 'proof/assets');
  const componentOutput = await put(fixture.repo, 'proof/final-component.txt', '合成原生组件文件\n');
  const componentEvidence = await put(fixture.repo, 'proof/component-check.txt', '合成组件导入检查\n');
  const assetReviewPath = '.workflow-control/reviews/assets.json';
  await putJson(fixture.repo, assetReviewPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V3',
    candidateId: work.visual.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS',
    userMessageRef: 'test-message://assets', qualityChecks: assetChecks,
    assets: [{ assetId: 'component-a', assetType: 'native-component', output: componentOutput, componentEvidenceRef: componentEvidence }],
  });
  work.assetReviewRef = { path: assetReviewPath };

  const profile = loadProfile(fixture.repo, work.stack);
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-v4.json`;
  const unit = {
    unitId: 'unit-v4', sequence: 1, type: work.workItemType, owner: 'test-fixture',
    paths: ['lib/fixture.dart'], resultPath: `${work.evidenceRoot}/unit-result.json`, acceptanceCommands: ['node --version'],
  };
  await putJson(fixture.repo, packPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType,
    visualStage: 'V4', executionUnits: [unit],
  });
  work.implementationPackageRef = { path: packPath };
  const items = [];
  for (const category of [...profile.evidenceRequirements.engineering, ...profile.evidenceRequirements.visual]) {
    const path = `${work.evidenceRoot}/v4-${category}.txt`;
    await put(fixture.repo, path, `${category} 合成测试证据\n`);
    items.push({ category, status: 'PASS', path });
  }
  const evidencePath = `.workflow-control/evidence/${work.workItemId}/v4-manifest.json`;
  await putJson(fixture.repo, evidencePath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, visualStage: 'V4', items,
  });
  work.evidenceRef = { path: evidencePath };
  await putJson(fixture.repo, fixture.workPath, work);

  // 使用正式状态迁移和 unit-check 接口生成执行状态；命令输出仍是协议测试夹具。
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'IMPLEMENTING', args: {} });
  const outputFile = `${work.evidenceRoot}/command-unit-v4-1.txt`;
  await put(fixture.repo, unit.paths[0], '合成实施单元产物\n');
  await put(fixture.repo, outputFile, 'exitCode=0\nnode --version\n');
  await putJson(fixture.repo, unit.resultPath, {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, unitId: unit.unitId, sequence: unit.sequence,
    exitCode: 0, files: [...unit.paths],
    commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile }],
  });
  await completeUnit({ repo: fixture.repo, workItem: fixture.workPath, resultPath: unit.resultPath });
  const implementing = loadWork(fixture.repo, fixture.workPath);
  implementing.gateStatus.F3 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, implementing);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PASSED', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  const completed = loadWork(fixture.repo, fixture.workPath);
  assert.equal(inspectWork(fixture.repo, completed, { strict: true }).status, 'PASS');
  return completed;
}

/** 在清理前保存来源记录字节，核验复用命令只建立引用、不改原始记录。 */
async function readSourceReviewBytes(repo, source) {
  const references = [source.globalVisualBaselineRef, source.assetReviewRef, source.implementationPackageRef, source.evidenceRef,
    ...Object.values(source.visual.reviews)];
  const entries = [];
  for (const reference of references) entries.push([reference.path, await readFile(resolve(repo, ...reference.path.split('/')))]);
  return entries;
}

/** 同时创建具备同源和同目标身份的完成来源与待复用目标。 */
async function createPair(t, { impactId = 'implementation', type = 'PAGE', targetState = 'INTAKE', ...options } = {}) {
  const repoFixture = await createFixture({ id: `source-${impactId}`, type, ...options });
  t.after(() => rm(repoFixture.repo, { recursive: true, force: true }));
  const targetArgs = {
    id: `target-${impactId}`, type, stack: options.stack ?? 'flutter', projectId: options.projectId ?? 'project-a',
    objectId: options.objectId ?? 'object-a', hostId: options.hostId, layerType: options.layerType,
  };
  const targetResult = await initializeWork({
    repo: repoFixture.repo,
    args: {
      id: targetArgs.id, stack: targetArgs.stack, type: targetArgs.type,
      objective: `验证 ${targetArgs.id} 的视觉控制协议`, 'project-id': targetArgs.projectId, 'object-id': targetArgs.objectId,
      ...(type === 'DISPLAY_LAYER' ? { 'host-id': targetArgs.hostId, 'layer-type': targetArgs.layerType } : {}),
    },
  });
  const targetPath = targetResult.metadata.workItemPath;
  const source = await completeVisualSource(repoFixture);
  let target = loadWork(repoFixture.repo, targetPath);
  target.globalState = targetState;
  target.visual.objectId = source.visual.objectId;
  if (type === 'DISPLAY_LAYER') {
    target.visual.hostId = source.visual.hostId;
    target.visual.layerType = source.visual.layerType;
  }
  await putJson(repoFixture.repo, targetPath, target);
  return { ...repoFixture, targetPath, source, target };
}

test('四种影响范围只继承各自允许的基线与 V1/V2 确认', async (t) => {
  for (const impact of Object.keys(expectedReviews)) {
    await t.test(impact, async (st) => {
      const fixture = await createPair(st, { impactId: impact });
      const beforeBytes = await readSourceReviewBytes(fixture.repo, fixture.source);
      const beforeTarget = loadWork(fixture.repo, fixture.targetPath);
      const result = await reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact, reason: '同一个已批准视觉对象的变化只发生在本轮流程的后续阶段',
      });
      const target = loadWork(fixture.repo, fixture.targetPath);

      assert.equal(result.status, 'PASS');
      assert.equal(target.visual.stage, expectedStages[impact]);
      assert.equal(target.visual.reuse.sourceWorkItemRef.path, fixture.workPath);
      assert.equal(target.visual.reuse.impact, impact);
      assert.deepEqual(target.visual.reuse.inheritedReviews, expectedReviews[impact]);
      assert.deepEqual(Object.keys(target.visual.reviews).sort(), [...expectedReviews[impact]].sort());
      assert.equal(target.globalVisualBaselineRef.path, fixture.source.globalVisualBaselineRef.path);
      assert.equal(target.visual.candidateId, impact === 'target' ? beforeTarget.visual.candidateId : fixture.source.visual.candidateId);
      assert.equal(target.implementationPackageRef, null);
      assert.equal(target.evidenceRef, null);
      assert.equal(target.assetReviewRef, null);
      assert.deepEqual(target.gateStatus, beforeTarget.gateStatus);
      assert.equal(target.evidenceRoot, beforeTarget.evidenceRoot);
      assert.deepEqual(result.metadata.reusedReviews, expectedReviews[impact]);
      assert.ok(result.metadata.remainingChecks.length > 0);
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, target));

      for (const [path, bytes] of beforeBytes) {
        assert.deepEqual(await readFile(resolve(fixture.repo, ...path.split('/'))), bytes, `${path} 应保持原字节`);
      }
    });
  }
});

test('target 影响不复制来源 candidateId，保持 V0 并要求新 V1', async (t) => {
  const fixture = await createPair(t, { impactId: 'new-target' });
  const result = await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '同一产品内新增一个独立目标',
  });
  const target = loadWork(fixture.repo, fixture.targetPath);
  assert.equal(target.visual.stage, 'V0');
  assert.equal(target.visual.candidateId, undefined);
  assert.deepEqual(result.metadata.remainingChecks[0], '为新目标完成 V1 候选与目标人工确认');
});

test('拒绝不同项目、栈、对象及显示层宿主', async (t) => {
  const mismatches = [
    { label: 'project', sourceChange: (work) => { work.projectId = 'project-b'; } },
    { label: 'stack', sourceChange: (work) => { work.stack = 'unity'; } },
    { label: 'object', sourceChange: (work) => { work.visual.objectId = 'object-b'; } },
  ];
  for (const mismatch of mismatches) {
    await t.test(mismatch.label, async (st) => {
      const fixture = await createPair(st, { impactId: mismatch.label });
      mismatch.sourceChange(fixture.source);
      await putJson(fixture.repo, fixture.workPath, fixture.source);
      await assert.rejects(reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact: 'implementation', reason: '应拒绝不匹配来源',
      }));
    });
  }

  const layer = await createPair(t, { impactId: 'layer-host', type: 'DISPLAY_LAYER', hostId: 'host-a', layerType: 'modal' });
  const target = loadWork(layer.repo, layer.targetPath);
  target.visual.hostId = 'host-b';
  await putJson(layer.repo, layer.targetPath, target);
  await assert.rejects(reuseVisualReviews({
    repo: layer.repo, workItem: layer.targetPath, sourceWorkItem: layer.workPath,
    impact: 'implementation', reason: '不能跨宿主继承确认',
  }), /宿主或层类型/);

  const layerType = await createPair(t, { impactId: 'layer-type', type: 'DISPLAY_LAYER', hostId: 'host-a', layerType: 'modal' });
  const layerTypeTarget = loadWork(layerType.repo, layerType.targetPath);
  layerTypeTarget.visual.layerType = 'popup';
  await putJson(layerType.repo, layerType.targetPath, layerTypeTarget);
  await assert.rejects(reuseVisualReviews({
    repo: layerType.repo, workItem: layerType.targetPath, sourceWorkItem: layerType.workPath,
    impact: 'implementation', reason: '不能跨显示层类型继承确认',
  }), /宿主或层类型/);
});

test('拒绝候选冲突、未完成来源、目标旧确认及已失效来源引用', async (t) => {
  const candidate = await createPair(t, { impactId: 'candidate' });
  const candidateTarget = loadWork(candidate.repo, candidate.targetPath);
  candidateTarget.visual.candidateId = 'other-direction';
  await putJson(candidate.repo, candidate.targetPath, candidateTarget);
  await assert.rejects(reuseVisualReviews({
    repo: candidate.repo, workItem: candidate.targetPath, sourceWorkItem: candidate.workPath,
    impact: 'assets', reason: '候选冲突必须失败',
  }), /candidateId/);

  const unfinished = await createPair(t, { impactId: 'unfinished' });
  const unfinishedSource = loadWork(unfinished.repo, unfinished.workPath);
  unfinishedSource.globalState = 'PASSED';
  await putJson(unfinished.repo, unfinished.workPath, unfinishedSource);
  await assert.rejects(reuseVisualReviews({
    repo: unfinished.repo, workItem: unfinished.targetPath, sourceWorkItem: unfinished.workPath,
    impact: 'layout', reason: '未完成来源必须失败',
  }), /来源必须完成全局流程/);

  const existing = await createPair(t, { impactId: 'existing-review' });
  const existingTarget = loadWork(existing.repo, existing.targetPath);
  existingTarget.visual.reviews.V1 = { path: 'new/review.json' };
  await putJson(existing.repo, existing.targetPath, existingTarget);
  await assert.rejects(reuseVisualReviews({
    repo: existing.repo, workItem: existing.targetPath, sourceWorkItem: existing.workPath,
    impact: 'implementation', reason: '不能覆盖目标确认',
  }), /拒绝覆盖目标已有/);

  const invalidated = await createPair(t, { impactId: 'invalidated' });
  const invalidatedTarget = loadWork(invalidated.repo, invalidated.targetPath);
  invalidatedTarget.invalidatedRefs = [{ path: invalidated.source.visual.reviews.V1.path, state: 'V1' }];
  await putJson(invalidated.repo, invalidated.targetPath, invalidatedTarget);
  await assert.rejects(reuseVisualReviews({
    repo: invalidated.repo, workItem: invalidated.targetPath, sourceWorkItem: invalidated.workPath,
    impact: 'implementation', reason: '目标已作废的路径不能重新绑定',
  }));
});

test('拒绝源 Work Item 中伪造或身份错绑的 V1 确认', async (t) => {
  const fixture = await createPair(t, { impactId: 'fake-review' });
  const fakePath = '.workflow-control/reviews/fake-v1.json';
  await putJson(fixture.repo, fakePath, humanRecord({
    objectId: 'someone-else', candidateId: 'direction-a', stage: 'V1', purpose: 'target',
    targetRef: 'proof/target.txt', userMessageRef: 'test-message://fake',
    checks: await qualityChecks(fixture.repo, 'proof/fake-v1'),
  }));
  fixture.source.visual.reviews.V1 = { path: fakePath };
  await putJson(fixture.repo, fixture.workPath, fixture.source);
  await assert.rejects(reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'implementation', reason: '身份错绑记录不能被继承',
  }), /身份或阶段错绑/);
});

test('拒绝缺少 Execution State 或仍有未闭合单元的来源', async (t) => {
  await t.test('Execution State 缺失', async (st) => {
    const fixture = await createPair(st, { impactId: 'missing-execution-state' });
    await rm(resolve(fixture.repo, ...`${fixture.source.evidenceRoot}/execution-state.json`.split('/')), { force: true });
    await assert.rejects(reuseVisualReviews({
      repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
      impact: 'implementation', reason: '缺少正式执行状态的来源不可复用',
    }), { code: 'SOURCE_NOT_COMPLETE' });
  });

  await t.test('Execution Unit 未闭合', async (st) => {
    const fixture = await createPair(st, { impactId: 'pending-execution-unit' });
    const statePath = `${fixture.source.evidenceRoot}/execution-state.json`;
    const absolute = resolve(fixture.repo, ...statePath.split('/'));
    const state = JSON.parse(await readFile(absolute, 'utf8'));
    state.units[0].status = 'PENDING';
    state.activeBatch = [state.units[0].unitId];
    await writeFile(absolute, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await assert.rejects(reuseVisualReviews({
      repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
      impact: 'assets', reason: '尚未闭合实施单元的来源不可复用',
    }), { code: 'SOURCE_NOT_COMPLETE' });
  });
});

test('绑定校验拒绝未列入继承清单的来源 V3/V4 确认', async (t) => {
  const fixture = await createPair(t, { impactId: 'unlisted-review' });
  await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '新目标只继承项目视觉基线',
  });
  const target = loadWork(fixture.repo, fixture.targetPath);
  target.visual.reviews.V3 = { path: fixture.source.visual.reviews.V3.path };
  await putJson(fixture.repo, fixture.targetPath, target);
  assert.throws(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)), /未声明为可继承确认/);
});

test('绑定校验拒绝元数据已错绑项目或技术栈的来源基线', async (t) => {
  const fixture = await createPair(t, { impactId: 'baseline-metadata' });
  await reuseVisualReviews({
    repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
    impact: 'target', reason: '新目标复用同项目的全局方向',
  });
  const baselinePath = fixture.source.globalVisualBaselineRef.path;
  const baseline = JSON.parse(await readFile(resolve(fixture.repo, ...baselinePath.split('/')), 'utf8'));
  baseline.stack = 'unity';
  await putJson(fixture.repo, baselinePath, baseline);
  assert.throws(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)), /项目或技术栈不匹配/);
});

test('RETURN visual:V1/V2 清理失效继承后，恢复 REVIEW 仍可验证来源绑定', async (t) => {
  const cases = [
    { stage: 'V1', impact: 'target', inherited: [], retained: [], invalidatedReview: 'V1' },
    { stage: 'V2', impact: 'layout', inherited: ['V1'], retained: ['V1'], invalidatedReview: 'V2Decomposition' },
  ];
  for (const scenario of cases) {
    await t.test(scenario.stage, async (st) => {
      const fixture = await createPair(st, { impactId: `return-${scenario.stage}`, targetState: 'REVIEW' });
      const target = loadWork(fixture.repo, fixture.targetPath);
      target.gateStatus.F1 = 'PASS';
      target.gateStatus.F2 = 'PASS';
      await putJson(fixture.repo, fixture.targetPath, target);
      await reuseVisualReviews({
        repo: fixture.repo, workItem: fixture.targetPath, sourceWorkItem: fixture.workPath,
        impact: 'implementation', reason: 'RETURN 同步测试来源确认保留边界',
      });
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, loadWork(fixture.repo, fixture.targetPath)));

      await transitionWork({
        repo: fixture.repo, workItem: fixture.targetPath, to: 'RETURN',
        args: { reason: '视觉阶段发生变化', 'affected-scope': `visual:${scenario.stage}` },
      });
      let returned = loadWork(fixture.repo, fixture.targetPath);
      assert.equal(returned.visual.reuse.impact, scenario.impact);
      assert.deepEqual(returned.visual.reuse.inheritedReviews, scenario.inherited);
      assert.deepEqual(Object.keys(returned.visual.reviews).sort(), [...scenario.retained].sort());
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, returned));

      returned.visual.reviews[scenario.invalidatedReview] = { path: fixture.source.visual.reviews[scenario.invalidatedReview].path };
      assert.throws(() => assertVisualReuse(fixture.repo, returned), /RETURN 已作废引用/);
      delete returned.visual.reviews[scenario.invalidatedReview];
      returned.gateStatus.F2 = 'PASS';
      await putJson(fixture.repo, fixture.targetPath, returned);

      await transitionWork({
        repo: fixture.repo, workItem: fixture.targetPath, to: 'REVIEW',
        args: { 'return-resolution': '重新确认受影响的视觉阶段后继续当前工作项' },
      });
      const recovered = loadWork(fixture.repo, fixture.targetPath);
      assert.equal(recovered.globalState, 'REVIEW');
      assert.deepEqual(recovered.visual.reuse.inheritedReviews, scenario.inherited);
      assert.deepEqual(Object.keys(recovered.visual.reviews).sort(), [...scenario.retained].sort());
      assert.doesNotThrow(() => assertVisualReuse(fixture.repo, recovered));
    });
  }
});
