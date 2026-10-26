import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { advanceVisual, completeUnit, initializeWork, inspect } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertOwnedPath, loadProfile, pathMatch } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { transitionWork, inferReturnState } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { WorkflowError } from '../../skills/app-workflow-control/scripts/runtime/io.mjs';

const cliPath = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

/** 构建隔离项目并通过正式 init 接口建立类型有效的 Work Item。 */
async function createFixture({ id = 'sample', stack = 'flutter', type = 'FOUNDATION', releaseIntent, objective = '建立一项可验证交付' } = {}) {
  const repo = await mkdtemp(resolve(tmpdir(), 'app-workflow-'));
  const result = await initializeWork({ repo, args: { id, stack, type, objective, ...(releaseIntent ? { 'release-intent': releaseIntent } : {}) } });
  return { repo, workPath: result.metadata.workItemPath, result };
}

/** 在临时项目中写入合成阶段材料，供控制器验证路径与绑定关系。 */
async function put(repo, path, content = '合成验证记录\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return path;
}

/** 读取当前工作项并保存更改，便于测试只验证已记录的客观事实。 */
async function readWork(repo, workPath) {
  return JSON.parse(await readFile(resolve(repo, ...workPath.split('/')), 'utf8'));
}

/** 写出机器可读记录，自动建立项目内父目录。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 生成五个模拟人工审阅结果及对应合成材料。 */
async function createQualityChecks(repo, prefix, { pass = true } = {}) {
  const checks = [];
  for (const [index, dimension] of qualityDimensions.entries()) {
    const evidenceRef = `${prefix}/${index}-${dimension}.md`;
    await put(repo, evidenceRef, `${dimension} 的模拟审阅记录。\n`);
    checks.push({ dimension, status: pass ? 'PASS' : 'NOT_RUN', ...(pass ? { evidenceRef } : {}) });
  }
  return checks;
}

/** 返回绑定视觉对象与模拟人工记录消息引用的阶段确认材料。 */
function reviewRecord({ objectId, stage, purpose, userMessageRef, targetRef, candidateId, qualityChecks }) {
  return {
    schemaVersion: '1.0', objectId, ...(candidateId ? { candidateId } : {}), stage,
    purpose, decision: 'APPROVED', userMessageRef,
    ...(targetRef ? { targetRef } : {}), ...(qualityChecks ? { qualityChecks } : {}),
  };
}

/** 建立当前阶段的唯一实施包与执行结果路径。 */
async function bindImplementation({ repo, work, workPath, stage, commands = ['node --version'], unitPaths = ['lib/sample.dart'], resultPaths }) {
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}-${stage}.json`;
  const units = unitPaths.map((path, index) => ({
    unitId: `unit-${index + 1}`, sequence: index + 1,
    type: work.workItemType === 'PAGE' ? 'PAGE' : work.workItemType === 'SCENE' ? 'SCENE' : 'MODULE',
    owner: 'test-owner', paths: [path], resultPath: resultPaths?.[index] ?? `${work.evidenceRoot}/${stage}-unit-${index + 1}.json`,
    acceptanceCommands: commands,
  }));
  await putJson(repo, packPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    workItemType: work.workItemType, ...(work.visual ? { visualStage: stage } : {}), executionUnits: units,
  });
  work.implementationPackageRef = { path: packPath };
  await putJson(repo, workPath, work);
  return { packPath, units };
}

/** 按实施计划写出非空命令输出和与计划逐项一致的结果。 */
async function submitPassingUnits({ repo, work, workPath, packPath, units, declaredPaths }) {
  const results = [];
  for (const [index, unit] of units.entries()) {
    const files = declaredPaths?.[index] ?? unit.paths;
    for (const path of files) await put(repo, path);
    const commandOutputs = [];
    for (const [commandIndex, command] of unit.acceptanceCommands.entries()) {
      const outputFile = `${work.evidenceRoot}/command-${unit.unitId}-${commandIndex + 1}.txt`;
      await put(repo, outputFile, `exitCode=0\n${command}\n`);
      commandOutputs.push({ command, exitCode: 0, outputFile });
    }
    const resultPath = unit.resultPath;
    await putJson(repo, resultPath, {
      schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
      implementationPackageRef: packPath, unitId: unit.unitId, sequence: unit.sequence,
      exitCode: 0, files, commandOutputs,
    });
    results.push(resultPath);
  }
  return results;
}

/** 绑定包含 profile 要求类别的合成非空证据材料。 */
async function bindEvidence({ repo, work, workPath, packPath, stage, extraCategories = [] }) {
  const profile = loadProfile(repo, work.stack);
  const categories = [...new Set([
    ...profile.evidenceRequirements.engineering,
    ...(stage === 'V3' ? profile.evidenceRequirements.assetImport ?? [] : []),
    ...(stage === 'V4' ? profile.evidenceRequirements.visual : []),
    ...extraCategories,
  ])];
  const items = [];
  for (const [index, category] of categories.entries()) {
    const path = `${work.evidenceRoot}/${stage}-${category}.txt`;
    await put(repo, path, `${category}：此固定文件只作为合同测试夹具。\n`);
    items.push({ category, status: 'PASS', path });
  }
  const manifestPath = `.workflow-control/evidence/${work.workItemId}/${stage}-manifest.json`;
  await putJson(repo, manifestPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, ...(work.visual ? { visualStage: stage } : {}), items,
  });
  work.evidenceRef = { path: manifestPath };
  work.gateStatus.F3 = 'PASS';
  await putJson(repo, workPath, work);
}

/** 在临时项目执行一个已冻结的 Flutter 单元及 evidence 门。 */
async function runEngineeringStage(context, stage) {
  let work = await readWork(context.repo, context.workPath);
  work.gateStatus.F2 = 'PASS';
  work.gateStatus.F3 = 'NOT_RUN';
  await putJson(context.repo, context.workPath, work);
  if (work.globalState === 'PROPOSAL') {
    const moved = await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW', args: {} });
    assert.equal(moved.status, 'PASS');
    work = await readWork(context.repo, context.workPath);
  }
  await putJson(context.repo, context.workPath, work);
  const { packPath, units } = await bindImplementation({ repo: context.repo, work, workPath: context.workPath, stage });
  const started = await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'IMPLEMENTING', args: {} });
  assert.ok(started.stage.endsWith('/IMPLEMENTING'));
  work = await readWork(context.repo, context.workPath);
  await submitPassingUnits({ repo: context.repo, work, workPath: context.workPath, packPath, units });
  work = await readWork(context.repo, context.workPath);
  await completeUnit({ repo: context.repo, workItem: context.workPath, resultPath: units[0].resultPath });
  work = await readWork(context.repo, context.workPath);
  await bindEvidence({ repo: context.repo, work, workPath: context.workPath, packPath, stage });
  const validating = await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'VALIDATING', args: {} });
  assert.ok(validating.stage.endsWith('/VALIDATING'));
  const passed = await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'PASSED', args: {} });
  assert.ok(passed.stage.endsWith('/PASSED'));
  return await readWork(context.repo, context.workPath);
}

/** 把 RELEASE 工作项推进到批准等待态，真实发布动作仍由人工流程执行。 */
async function readyForRelease(fixture) {
  let work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'PROPOSAL';
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.gateStatus.F4 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'release');
  work.action = { actionId: 'store-release', effects: ['publish'], target: 'production-store' };
  work.gateStatus.F4 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASE_APPROVAL_REQUIRED', args: {} });
  return await readWork(fixture.repo, fixture.workPath);
}

/** 记录精确绑定当前发布动作与用户消息的审批材料。 */
function approveRelease(work) {
  work.action.approval = {
    workItemId: work.workItemId, stack: work.stack, stageId: work.stageId,
    actionId: work.action.actionId, effects: ['publish'], target: work.action.target,
    userMessageRef: 'chat://release-approval',
  };
  work.gateStatus.F4 = 'PASS';
}

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
    repo: fixture.repo, work, workPath: fixture.workPath, stage: 'V0',
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
  const pack = await bindImplementation({ repo: fixture.repo, work, workPath: fixture.workPath, stage: 'V0' });
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
  work.visual.stage = 'V4';
  work.visual.candidateId = 'direction-a';
  work.visual.reviews = {
    V1: { path: 'reviews/v1.json' },
    V2Decomposition: { path: 'reviews/v2-decomposition.json' },
    V2Layout: { path: 'reviews/v2-layout.json' },
    V3: { path: 'reviews/v3.json' }, V4: { path: 'reviews/v4.json' },
  };
  work.globalVisualBaselineRef = { path: 'reviews/global-baseline.json' };
  work.assetReviewRef = { path: 'reviews/assets.json' };
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '布局方向变更', 'affected-scope': 'visual:V2' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V2');
  assert.equal(returned.visual.reviews.V1.path, 'reviews/v1.json');
  assert.equal(returned.visual.reviews.V2Decomposition, undefined);
  assert.equal(returned.visual.reviews.V2Layout, undefined);
  assert.equal(returned.visual.reviews.V3, undefined);
  assert.equal(returned.visual.reviews.V4, undefined);
  assert.equal(returned.globalVisualBaselineRef.path, 'reviews/global-baseline.json');
  assert.equal(returned.assetReviewRef, null);
  assert.equal(returned.gateStatus.F2, 'NOT_RUN');
  assert.equal(returned.gateStatus.F3, 'NOT_RUN');
  returned.visual.reviews.V2Layout = { path: 'reviews/v2-layout.json' };
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /visual\.reviews\.V2Layout 重新绑定了 RETURN 已作废引用/);
  returned.visual.reviews.V2Layout = undefined;
  returned.assetReviewRef = { path: 'reviews/assets.json' };
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /assetReviewRef 重新绑定了 RETURN 已作废引用/);
});

test('全局基线 RETURN 后不能重绑旧选择记录', async (t) => {
  const fixture = await createFixture({ id: 'baseline-return', type: 'PAGE', objective: '更新全局视觉基线' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.globalVisualBaselineRef = { path: 'reviews/global-baseline.json' };
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '视觉基线变更', 'affected-scope': 'visual:V0' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.globalVisualBaselineRef, null);
  assert.equal(returned.visual.stage, 'V0');
  returned.globalVisualBaselineRef = { path: 'reviews/global-baseline.json' };
  await putJson(fixture.repo, fixture.workPath, returned);
  assert.throws(() => inspect({ repo: fixture.repo, workItem: fixture.workPath }), /globalVisualBaselineRef 重新绑定了 RETURN 已作废引用/);
});

test('实现返修 RETURN 保留仍有效的 V1–V3 确认与素材评审', async (t) => {
  const fixture = await createFixture({ id: 'implementation-return', type: 'PAGE', objective: '修复页面实现' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.globalState = 'REVIEW';
  work.visual.stage = 'V4';
  work.visual.candidateId = 'direction-a';
  work.visual.reviews = {
    V1: { path: 'reviews/v1.json' }, V2Decomposition: { path: 'reviews/v2-decomposition.json' },
    V2Layout: { path: 'reviews/v2-layout.json' }, V3: { path: 'reviews/v3.json' }, V4: { path: 'reviews/v4.json' },
  };
  work.assetReviewRef = { path: 'reviews/assets.json' };
  work.implementationPackageRef = { path: 'packages/old.json' };
  work.evidenceRef = { path: 'evidence/old.json' };
  work.gateStatus = { F0: 'PASS', F1: 'PASS', F2: 'PASS', F3: 'PASS', F4: 'PASS' };
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RETURN', args: { reason: '修复实现问题', 'affected-scope': 'implementation' } });
  const returned = await readWork(fixture.repo, fixture.workPath);
  assert.equal(returned.visual.stage, 'V4');
  assert.equal(returned.visual.reviews.V1.path, 'reviews/v1.json');
  assert.equal(returned.visual.reviews.V2Decomposition.path, 'reviews/v2-decomposition.json');
  assert.equal(returned.visual.reviews.V2Layout.path, 'reviews/v2-layout.json');
  assert.equal(returned.visual.reviews.V3.path, 'reviews/v3.json');
  assert.equal(returned.visual.reviews.V4, undefined);
  assert.equal(returned.assetReviewRef.path, 'reviews/assets.json');
  assert.equal(returned.implementationPackageRef, null);
  assert.equal(returned.evidenceRef, null);
});

test('RETURN 和 BLOCKED 期间不能推进视觉阶段', async (t) => {
  const fixture = await createFixture({ id: 'blocked-visual-stage', type: 'PAGE', objective: '验证视觉阶段恢复边界' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  const work = await readWork(fixture.repo, fixture.workPath);
  work.visual.stage = 'V2';
  work.globalState = 'BLOCKED';
  work.blockedRecord = { reason: '等待解决', returnState: 'REVIEW', resolvedAt: null };
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' }), /未解决前不能推进视觉阶段/);
  work.globalState = 'RETURN';
  work.blockedRecord = null;
  work.returnRecord = { reason: '等待解决', affectedScope: 'visual:V2', returnState: 'REVIEW', resolvedAt: null, invalidatedRefs: [], evidenceRoot: work.evidenceRoot };
  await putJson(fixture.repo, fixture.workPath, work);
  await assert.rejects(advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' }), /未解决前不能推进视觉阶段/);
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

test('模拟阶段材料与人工记录驱动 PAGE 从 V0 到 V4 的控制器闭环', async (t) => {
  const fixture = await createFixture({ id: 'home-page', type: 'PAGE', objective: '交付首页页面视觉及运行体验' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  let work = await readWork(fixture.repo, fixture.workPath);
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.globalVisualBaselineRef = { path: 'visual/global-baseline.json' };
  const selectedChecks = await createQualityChecks(fixture.repo, 'visual/reviews/baseline-selected');
  const baselineCandidates = [];
  for (const candidateId of ['direction-a', 'direction-b', 'direction-c']) {
    const path = await put(fixture.repo, `visual/candidates/${candidateId}.png`, `${candidateId} 的合成设计候选材料`);
    baselineCandidates.push({
      candidateId, path,
      qualityChecks: candidateId === 'direction-a' ? selectedChecks : qualityDimensions.map((dimension) => ({ dimension, status: 'NOT_RUN' })),
    });
  }
  const baselinePath = '.workflow-control/reviews/global-selection.json';
  await putJson(fixture.repo, baselinePath, reviewRecord({
    objectId: 'project-baseline-1', candidateId: 'direction-a', stage: 'BASELINE', purpose: 'visual-baseline',
    userMessageRef: 'chat://baseline-selection', qualityChecks: selectedChecks,
  }));
  await putJson(fixture.repo, work.globalVisualBaselineRef.path, {
    schemaVersion: '1.0', baselineId: 'project-baseline-1', projectId: work.projectId,
    stack: work.stack, candidates: baselineCandidates, selectedCandidateId: 'direction-a',
    selectionReviewRef: { path: baselinePath },
  });
  await putJson(fixture.repo, fixture.workPath, work);

  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V1' });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.implementationPackageRef, null);
  assert.equal(work.evidenceRef, null);
  assert.equal(work.globalState, 'INTAKE');
  work.visual.candidateId = 'direction-a';
  const target = await put(fixture.repo, 'visual/home-target.png', '合成 V1 目标材料');
  const v1ReviewPath = '.workflow-control/reviews/home-target.json';
  const v1Checks = await createQualityChecks(fixture.repo, 'visual/reviews/v1');
  await putJson(fixture.repo, v1ReviewPath, reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V1', purpose: 'target', userMessageRef: 'chat://home-target', targetRef: target, qualityChecks: v1Checks }));
  work.visual.reviews.V1 = { path: v1ReviewPath };
  await putJson(fixture.repo, fixture.workPath, work);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V2' });

  work = await readWork(fixture.repo, fixture.workPath);
  const decomposition = await put(fixture.repo, 'visual/home-decomposition.png', '编号拆解图');
  const layout = await put(fixture.repo, 'visual/home-layout.png', '独立布局图');
  const decompositionPath = '.workflow-control/reviews/home-decomposition.json';
  const layoutPath = '.workflow-control/reviews/home-layout.json';
  await putJson(fixture.repo, decompositionPath, reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V2', purpose: 'decomposition', userMessageRef: 'chat://home-decomposition', targetRef: decomposition }));
  await putJson(fixture.repo, layoutPath, reviewRecord({ objectId: 'home-page', candidateId: 'direction-a', stage: 'V2', purpose: 'layout', userMessageRef: 'chat://home-layout', targetRef: layout }));
  work.visual.reviews.V2Decomposition = { path: decompositionPath };
  work.visual.reviews.V2Layout = { path: layoutPath };
  await putJson(fixture.repo, fixture.workPath, work);
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V3' });
  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.globalState, 'PROPOSAL');
  assert.equal(work.visual.stage, 'V3');
  assert.equal(work.implementationPackageRef, null);

  const component = await put(fixture.repo, 'lib/features/home/home_view.dart', 'class HomeView {}\n');
  const componentCheck = await put(fixture.repo, `${work.evidenceRoot}/v3-components.txt`, 'Creator-native Widget tree was inspected.\n');
  const assetReviewPath = '.workflow-control/reviews/home-assets.json';
  const assetUserMessage = 'chat://home-assets-reviewed';
  await putJson(fixture.repo, assetReviewPath, {
    schemaVersion: '1.0', workItemId: 'home-page', stack: 'flutter', visualStage: 'V3',
    candidateId: 'direction-a', technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: assetUserMessage,
    qualityChecks: await createQualityChecks(fixture.repo, 'visual/reviews/asset'),
    assets: [{ assetId: 'home-native-component', assetType: 'native-component', output: component, componentEvidenceRef: componentCheck }],
  });
  work.assetReviewRef = { path: assetReviewPath };
  work.visual.reviews.V3 = { path: '.workflow-control/reviews/home-v3.json' };
  await putJson(fixture.repo, work.visual.reviews.V3.path, reviewRecord({
    objectId: 'home-page', candidateId: 'direction-a', stage: 'V3', purpose: 'imported-assets',
    userMessageRef: assetUserMessage,
  }));
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'V3');
  assert.equal(work.globalState, 'PASSED');
  assert.equal(work.visual.stage, 'V3');
  await advanceVisual({ repo: fixture.repo, workItem: fixture.workPath, to: 'V4' });

  work = await readWork(fixture.repo, fixture.workPath);
  assert.equal(work.visual.stage, 'V4');
  assert.equal(work.globalState, 'PROPOSAL');
  assert.equal(work.assetReviewRef.path, assetReviewPath);
  const runtimeReviewPath = '.workflow-control/reviews/home-runtime.json';
  await putJson(fixture.repo, runtimeReviewPath, reviewRecord({
    objectId: 'home-page', candidateId: 'direction-a', stage: 'V4', purpose: 'runtime-acceptance',
    userMessageRef: 'chat://home-runtime-inspected',
  }));
  work.visual.reviews.V4 = { path: runtimeReviewPath };
  await putJson(fixture.repo, fixture.workPath, work);
  work = await runEngineeringStage(fixture, 'V4');
  assert.equal(work.globalState, 'PASSED');
  const complete = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  assert.ok(complete.stage.endsWith('/COMPLETE'));
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
