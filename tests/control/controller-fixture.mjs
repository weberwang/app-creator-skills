import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { initializeWork, transitionWork, completeUnit } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';

const qualityDimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];

/** 构建隔离项目并通过正式 init 接口建立类型有效的 Work Item。 */
export async function createFixture({ id = 'sample', stack = 'flutter', type = 'FOUNDATION', releaseIntent, objective = '建立一项可验证交付' } = {}) {
  const repo = await mkdtemp(resolve(tmpdir(), 'app-workflow-'));
  const result = await initializeWork({ repo, args: { id, stack, type, objective, ...(releaseIntent ? { 'release-intent': releaseIntent } : {}) } });
  return { repo, workPath: result.metadata.workItemPath, result };
}

/** 在临时项目中写入合成阶段材料，供控制器验证路径与绑定关系。 */
export async function put(repo, path, content = '合成验证记录\n') {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return path;
}

/** 读取当前工作项并保存更改，便于测试只验证已记录的客观事实。 */
export async function readWork(repo, workPath) {
  return JSON.parse(await readFile(resolve(repo, ...workPath.split('/')), 'utf8'));
}

/** 写出机器可读记录，自动建立项目内父目录。 */
export async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

/** 生成五个模拟人工审阅结果及对应合成材料。 */
export async function createQualityChecks(repo, prefix, { pass = true } = {}) {
  const checks = [];
  for (const [index, dimension] of qualityDimensions.entries()) {
    const evidenceRef = `${prefix}/${index}-${dimension}.md`;
    await put(repo, evidenceRef, `${dimension} 的模拟审阅记录。\n`);
    checks.push({ dimension, status: pass ? 'PASS' : 'NOT_RUN', ...(pass ? { evidenceRef } : {}) });
  }
  return checks;
}

/** 返回绑定视觉对象与模拟人工记录消息引用的阶段确认材料。 */
export function reviewRecord({ objectId, stage, purpose, userMessageRef, targetRef, candidateId, qualityChecks }) {
  return {
    schemaVersion: '1.0', objectId, ...(candidateId ? { candidateId } : {}), stage,
    purpose, decision: 'APPROVED', userMessageRef,
    ...(targetRef ? { targetRef } : {}), ...(qualityChecks ? { qualityChecks } : {}),
  };
}

/** 将合成审阅与真实文件摘要绑定，模拟用户确认时冻结的目标和图像。 */
export async function putVisualReview(repo, path, review, workItemId, targetPath, decompositionPath, targetId = review.objectId) {
  const identity = async (value) => ({ path: value, sha256: createHash('sha256').update(await readFile(resolve(repo, ...value.split('/')))).digest('hex') });
  const target = await identity(review.targetRef);
  const referenceTarget = await identity(targetPath);
  return putJson(repo, path, { ...review, workItemId, targetId, targetSha256: target.sha256, referenceTarget,
    ...(decompositionPath ? { decompositionReviewRef: await identity(decompositionPath) } : {}) });
}

/** 对当前确认记录生成工作项中的冻结引用。 */
export async function frozenReview(repo, path) {
  return { path, sha256: createHash('sha256').update(await readFile(resolve(repo, ...path.split('/')))).digest('hex') };
}

/** 建立当前阶段的唯一实施包与执行结果路径。 */
export async function bindImplementation({ repo, work, workPath, stage, commands = ['node --version'], unitPaths = ['lib/sample.dart'], resultPaths }) {
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
export async function submitPassingUnits({ repo, work, workPath, packPath, units, declaredPaths }) {
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
export async function bindEvidence({ repo, work, workPath, packPath, stage, extraCategories = [] }) {
  const profile = loadProfile(repo, work.stack);
  const categories = [...new Set([
    ...profile.evidenceRequirements.engineering,
    ...(stage === 'V4' ? profile.evidenceRequirements.assetImport ?? [] : []),
    ...(stage === 'V5' ? profile.evidenceRequirements.visual : []),
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
export async function runEngineeringStage(context, stage, { beforePassed } = {}) {
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
  const unitPaths = work.stack === 'cocos' ? ['assets/sample.ts'] : ['lib/sample.dart'];
  const { packPath, units } = await bindImplementation({ repo: context.repo, work, workPath: context.workPath, stage, unitPaths });
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
  if (beforePassed) await beforePassed(await readWork(context.repo, context.workPath));
  const passed = await transitionWork({ repo: context.repo, workItem: context.workPath, to: 'PASSED', args: {} });
  assert.ok(passed.stage.endsWith('/PASSED'));
  return await readWork(context.repo, context.workPath);
}

/** 把 RELEASE 工作项推进到批准等待态，真实发布动作仍由人工流程执行。 */
export async function readyForRelease(fixture) {
  let work = await readWork(fixture.repo, fixture.workPath);
  // 提前声明发布目标，确保准备流程本身不要求尚未发生的批准。
  work.action = { actionId: 'store-release', effects: ['publish'], target: 'production-store' };
  work.gateStatus.F0 = 'PASS';
  work.gateStatus.F1 = 'PASS';
  work.gateStatus.F4 = 'NOT_RUN';
  await putJson(fixture.repo, fixture.workPath, work);
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'BASELINE', args: {} });
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'PROPOSAL', args: {} });
  work = await runEngineeringStage(fixture, 'release');
  await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'RELEASE_APPROVAL_REQUIRED', args: {} });
  return await readWork(fixture.repo, fixture.workPath);
}

/** 记录精确绑定当前发布动作与用户消息的审批材料。 */
export function approveRelease(work) {
  work.action.approval = {
    workItemId: work.workItemId, stack: work.stack, stageId: work.stageId,
    actionId: work.action.actionId, effects: ['publish'], target: work.action.target,
    userMessageRef: 'chat://release-approval',
  };
  work.gateStatus.F4 = 'PASS';
}

