/** 验证控制器关于证据、路径、视觉身份和外部批准的关键边界。 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, win32 } from 'node:path';
import test from 'node:test';
import { validateEvidence, validateGlobalBaseline, validateHumanReview, validateUnitResult, hasPreciseApproval } from '../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { repoPath } from '../skills/app-workflow-control/scripts/runtime/io.mjs';
import { initializeWork } from '../skills/app-workflow-control/scripts/runtime/workflow.mjs';

/** 在独立临时项目中建立有效工作项，并在测试后清理。 */
async function fixture(t, { id = 'boundary', stack = 'flutter', projectId = 'shared-project', type = 'FOUNDATION' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'app-creator-boundary-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const created = await initializeWork({ repo, args: { id, stack, 'project-id': projectId, type, objective: '验证控制边界' } });
  const work = JSON.parse(readFileSync(join(repo, ...created.metadata.workItemPath.split('/')), 'utf8'));
  return { repo, work };
}

/** 建立父目录并保存合成材料；内容只供验证记录绑定，不表示真实运行证据。 */
function put(repo, path, content = '合成控制器测试材料\n') {
  const absolute = join(repo, ...path.split('/'));
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
  return path;
}

/** 为工作项写入与当前栈绑定的单元合同和非空工程文件。 */
function bindPackage(repo, work) {
  const source = put(repo, 'lib/main.dart');
  const packPath = `.workflow-control/implementation-packages/${work.workItemId}.json`;
  const unit = {
    unitId: 'unit-one', sequence: 1, type: 'MODULE', owner: 'tester', paths: ['lib/main.dart'],
    resultPath: `${work.evidenceRoot}/unit-one.json`, acceptanceCommands: ['fvm flutter analyze'],
  };
  put(repo, packPath, JSON.stringify({
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    workItemType: work.workItemType, executionUnits: [unit],
  }));
  work.implementationPackageRef = { path: packPath };
  return { source, packPath, unit };
}

/** 返回五项模拟检查结果，所写记录不用于视觉效果判定。 */
function qualityChecks(repo, prefix, status = 'PASS') {
  const checks = [];
  for (const [index, dimension] of ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].entries()) {
    const item = { dimension, status };
    if (status === 'PASS') item.evidenceRef = put(repo, `${prefix}/${index}-${dimension}.txt`);
    checks.push(item);
  }
  return checks;
}

test('空命令输出与空 PASS 证据不能作为验证通过材料', async (t) => {
  const { repo, work } = await fixture(t);
  const { source, packPath, unit } = bindPackage(repo, work);
  const commandOutput = put(repo, `${work.evidenceRoot}/empty-command.log`, '');
  const result = {
    schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, unitId: unit.unitId, sequence: unit.sequence,
    exitCode: 0, files: [source], commandOutputs: [{ command: unit.acceptanceCommands[0], exitCode: 0, outputFile: commandOutput }],
  };
  assert.throws(() => validateUnitResult(repo, work, { executionUnits: [unit] }, unit, result), /空文件/);

  const nonEmptyOutput = put(repo, `${work.evidenceRoot}/command.log`, 'exitCode=0\n');
  result.commandOutputs[0].outputFile = nonEmptyOutput;
  assert.equal(validateUnitResult(repo, work, { executionUnits: [unit] }, unit, result).status, 'PASS');

  const evidencePath = `.workflow-control/evidence/${work.workItemId}/manifest.json`;
  const emptyEvidence = put(repo, `${work.evidenceRoot}/empty-evidence.txt`, '');
  put(repo, evidencePath, JSON.stringify({
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath,
    items: [{ category: 'analyze', status: 'PASS', path: emptyEvidence }],
  }));
  work.evidenceRef = { path: evidencePath };
  assert.throws(() => validateEvidence(repo, work), /空文件/);
});

test('项目相对路径拒绝绝对路径、路径穿越及越出项目的目录链接', async (t) => {
  const { repo } = await fixture(t);
  assert.throws(() => repoPath(repo, '../outside.txt'), /不能包含/);
  assert.throws(() => repoPath(repo, win32.resolve(repo, 'outside.txt')), /必须使用 POSIX 项目相对路径/);

  const outside = mkdtempSync(join(tmpdir(), 'app-creator-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  put(outside, 'evidence.txt');
  symlinkSync(outside, join(repo, 'external'), 'junction');
  assert.throws(() => repoPath(repo, 'external/evidence.txt'), /经符号链接越出项目/);
});

test('同项目同技术栈视觉基线可跨工作项复用，错项目或错栈时阻断', async (t) => {
  const first = await fixture(t, { id: 'baseline-owner' });
  const reuse = await initializeWork({ repo: first.repo, args: {
    id: 'baseline-reuse', stack: first.work.stack, 'project-id': first.work.projectId,
    type: 'PAGE', objective: '复用已选方向的页面',
  } });
  const second = JSON.parse(readFileSync(join(first.repo, ...reuse.metadata.workItemPath.split('/')), 'utf8'));
  second.visualBaselineRequired = true;

  const dimensions = qualityChecks(first.repo, 'review/selected');
  const candidates = ['direction-a', 'direction-b', 'direction-c'].map((candidateId, index) => ({
    candidateId,
    path: put(first.repo, `visual/candidates/${candidateId}.png`),
    qualityChecks: index === 0 ? dimensions : ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'NOT_RUN' })),
  }));
  const selectionReview = '.workflow-control/reviews/selection.json';
  put(first.repo, selectionReview, JSON.stringify({
    schemaVersion: '1.0', objectId: 'visual-baseline-1', candidateId: 'direction-a',
    stage: 'BASELINE', purpose: 'visual-baseline', decision: 'APPROVED',
    userMessageRef: 'synthetic://selection', qualityChecks: dimensions,
  }));
  const baselinePath = '.workflow-control/visual/global-baseline.json';
  put(first.repo, baselinePath, JSON.stringify({
    schemaVersion: '1.0', baselineId: 'visual-baseline-1', projectId: first.work.projectId,
    stack: first.work.stack, candidates, selectedCandidateId: 'direction-a',
    selectionReviewRef: { path: selectionReview },
  }));
  second.globalVisualBaselineRef = { path: baselinePath };
  assert.doesNotThrow(() => validateGlobalBaseline(first.repo, second));

  assert.throws(() => validateGlobalBaseline(first.repo, { ...second, projectId: 'different-project' }), /项目或技术栈错绑/);
  assert.throws(() => validateGlobalBaseline(first.repo, { ...second, stack: 'unity' }), /项目或技术栈错绑/);
});

test('旧批准不能覆盖目标或副作用变化，人工确认必须绑定当前候选', async (t) => {
  const { repo, work } = await fixture(t);
  work.action = { actionId: 'release-one', target: 'store-a', effects: ['publish'] };
  work.action.approval = {
    workItemId: work.workItemId, stack: work.stack, stageId: work.stageId,
    actionId: 'release-one', target: 'store-a', effects: ['publish'], userMessageRef: 'synthetic://approval',
  };
  assert.equal(hasPreciseApproval(work), true);
  assert.equal(hasPreciseApproval({ ...work, action: { ...work.action, target: 'store-b' } }), false);
  assert.equal(hasPreciseApproval({ ...work, action: { ...work.action, effects: ['publish', 'payment'] } }), false);

  const candidatePath = put(repo, 'visual/candidate.png');
  const reviewPath = '.workflow-control/reviews/target.json';
  put(repo, reviewPath, JSON.stringify({
    schemaVersion: '1.0', objectId: 'page-home', candidateId: 'candidate-a',
    stage: 'V1', purpose: 'target', decision: 'APPROVED',
    userMessageRef: 'synthetic://candidate-a', targetRef: candidatePath,
  }));
  assert.throws(() => validateHumanReview(repo, { path: reviewPath }, {
    objectId: 'page-home', candidateId: 'candidate-b', stage: 'V1', purpose: 'target', requireTarget: true,
  }), /candidateId 未绑定/);
});

