/** 验证多目标累计批次的确认来源链；夹具不是实际用户验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { initializeWork, loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertVisualReuse, resolveReuseOwner, validateSceneReuseCoverage, validateSceneReuseReview } from '../../skills/app-workflow-control/scripts/runtime/visual-reuse-binding.mjs';
import { validateMultiVisualStage } from '../../skills/app-workflow-control/scripts/runtime/multi-visual-contract.mjs';

/** 在隔离项目写入测试材料并返回文件字节身份。 */
function put(repo, path, value) {
  const full = join(repo, ...path.split('/'));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof value === 'string' ? value : JSON.stringify(value));
  return { path, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') };
}

/** 创建带真实引用的两批合成数据，视觉质量仅用于校验协议而不代表用户确认。 */
async function fixture(t) {
  const root = realpathSync(tmpdir());
  const repo = mkdtempSync(join(root, 'incremental-visual-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), root);
    assert.ok(basename(actual).startsWith('incremental-visual-'));
    rmSync(actual, { recursive: true, force: true });
  });
  const args = { stack: 'cocos', type: 'SCENE', objective: '合成场景增量合同', 'project-id': 'project-a', 'object-id': 'scene' };
  const first = await initializeWork({ repo, args: { ...args, id: 'first' } });
  const second = await initializeWork({ repo, args: { ...args, id: 'second' } });
  const source = loadWork(repo, first.metadata.workItemPath);
  const work = loadWork(repo, second.metadata.workItemPath);
  source.globalState = 'COMPLETE';
  source.visual.stage = 'V5';
  work.visual.stage = 'V2';

  const baselineTarget = put(repo, 'baseline/image.txt', '合成视觉候选');
  const baselineReview = put(repo, 'baseline/review.json', { targetRef: baselineTarget.path, targetSha256: baselineTarget.sha256 });
  const baseline = put(repo, 'baseline/baseline.json', { schemaVersion: '1.0', projectId: source.projectId, stack: source.stack, selectedCandidateId: 'a', candidates: [{ candidateId: 'a', path: baselineTarget.path }], selectionReviewRef: baselineReview });
  source.globalVisualBaselineRef = baseline;
  work.globalVisualBaselineRef = baseline;
  const quality = put(repo, 'quality.txt', '合成质量检查');
  const checks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'PASS', evidenceRef: quality.path }));

  /** 按目标身份构造 V2/V3/V4/V5 合成确认。 */
  const target = (id, owner) => {
    const referenceTarget = put(repo, `targets/${id}.png`, `合成目标 ${id}`);
    const item = { targetId: id, candidateId: `candidate-${id}`, sceneId: 'scene', stateId: 'default', viewport: { width: 390, height: 844 }, scope: id, referenceTarget, domainEvidenceRef: { path: put(repo, `domain/${owner}-${id}.json`, '{}').path }, reviews: {} };
    for (const [name, stage, purpose] of [['V2', 'V2', 'target'], ['V3Decomposition', 'V3', 'decomposition'], ['V3Layout', 'V3', 'layout'], ['V4', 'V4', 'imported-assets'], ['V5', 'V5', 'runtime-acceptance']]) {
      const review = { schemaVersion: '1.0', workItemId: owner, objectId: 'scene', targetId: id, candidateId: item.candidateId, stage, purpose, decision: 'APPROVED', userMessageRef: `synthetic-${owner}`, referenceTarget, targetRef: referenceTarget.path, targetSha256: referenceTarget.sha256, ...(name === 'V2' ? { qualityChecks: checks } : {}) };
      if (name === 'V3Layout') review.decompositionReviewRef = item.reviews.V3Decomposition;
      item.reviews[name] = put(repo, `reviews/${owner}-${id}-${name}.json`, review);
    }
    return item;
  };
  source.visual.targets = ['a', 'b'].map((id) => target(id, source.workItemId));
  const old = source.visual.targets;
  source.visual.coverageRef = put(repo, 'coverage/old.json', { workItemId: source.workItemId, sceneId: 'scene', status: 'CONFIRMED', userMessageRef: 'synthetic-old', targetIds: old.map((item) => item.targetId), targets: old });
  work.visual.targets = [structuredClone(old[0]), target('b', work.workItemId), target('c', work.workItemId)];
  work.visual.targets[0].reviews = Object.fromEntries(['V2', 'V3Decomposition', 'V3Layout'].map((name) => [name, old[0].reviews[name]]));
  for (const item of work.visual.targets.slice(1)) delete item.reviews.V4;
  for (const item of work.visual.targets.slice(1)) delete item.reviews.V5;
  work.visual.reuse = { sourceWorkItemRef: { path: first.metadata.workItemPath }, impact: 'implementation', reason: '保留未变化目标', inheritedReviews: ['V2', 'V3Decomposition', 'V3Layout'], targetIds: ['a'] };
  const coverage = { workItemId: work.workItemId, sceneId: 'scene', status: 'CONFIRMED', userMessageRef: 'synthetic-current', targetIds: work.visual.targets.map((item) => item.targetId), targets: work.visual.targets };
  work.visual.coverageRef = put(repo, 'coverage/current.json', coverage);
  put(repo, first.metadata.workItemPath, source);
  const options = { validateDomainTarget() {}, validateReuseReview: validateSceneReuseReview, validateReuseCoverage: validateSceneReuseCoverage };
  return { repo, source, work, options, first, second, put: (path, value) => put(repo, path, value) };
}

test('累计场景保留旧目标确认并在同一 V2/V3 门核对新目标', async (t) => {
  const f = await fixture(t);
  assert.doesNotThrow(() => assertVisualReuse(f.repo, f.work));
  assert.equal(validateMultiVisualStage(f.repo, f.work, 'V2', f.options).length, 3);
  assert.equal(validateMultiVisualStage(f.repo, f.work, 'V3', f.options).length, 3);
  assert.equal(resolveReuseOwner(f.repo, f.work, f.source.workItemId, 'V2', 'a'), f.source.workItemId);
  assert.throws(() => resolveReuseOwner(f.repo, f.work, f.source.workItemId, 'V2', 'b'), /未声明为可继承目标/);
  f.source.invalidatedRefs = [{ path: f.source.visual.targets[0].reviews.V2.path }];
  f.put(f.first.metadata.workItemPath, f.source);
  assert.throws(() => assertVisualReuse(f.repo, f.work), /已作废引用/);
  delete f.source.invalidatedRefs;
  f.put(f.first.metadata.workItemPath, f.source);
  delete f.work.visual.targets[2].reviews.V2;
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /缺少 V2 确认/);
});

test('累计范围、目标身份、选择列表和不可继承阶段不能被绕过', async (t) => {
  const f = await fixture(t);
  const work = f.work;
  work.visual.coverageRef = f.source.visual.coverageRef;
  assert.throws(() => assertVisualReuse(f.repo, work), /不能复用来源覆盖清单/);
  assert.throws(() => validateSceneReuseCoverage(f.repo, work, { workItemId: f.source.workItemId }), /必须由当前工作项确认/);
  work.visual.coverageRef = f.put('coverage/current-again.json', { workItemId: work.workItemId });
  work.visual.targets[0].scope = '被篡改的区域';
  assert.throws(() => assertVisualReuse(f.repo, work), /与来源不一致/);
  work.visual.targets[0].scope = 'a';
  for (const field of ['candidateId', 'sceneId', 'stateId']) {
    const previous = work.visual.targets[0][field];
    work.visual.targets[0][field] = '被篡改的身份';
    assert.throws(() => assertVisualReuse(f.repo, work), /与来源不一致/);
    work.visual.targets[0][field] = previous;
  }
  work.visual.targets[0].viewport.width += 1;
  assert.throws(() => assertVisualReuse(f.repo, work), /与来源不一致/);
  work.visual.targets[0].viewport.width -= 1;
  const reference = work.visual.targets[0].referenceTarget;
  work.visual.targets[0].referenceTarget = f.put('targets/other.png', '不同参考');
  assert.throws(() => assertVisualReuse(f.repo, work), /与来源不一致/);
  work.visual.targets[0].referenceTarget = reference;
  work.visual.targets.pop();
  work.visual.targets.pop();
  assert.throws(() => assertVisualReuse(f.repo, work), /保留全部来源目标/);
  work.visual.targets.push(structuredClone(f.source.visual.targets[1]));
  work.visual.targets[1].reviews = {};
  work.visual.reuse.targetIds = ['a', 'a'];
  assert.throws(() => assertVisualReuse(f.repo, work), /非空唯一/);
  work.visual.reuse.targetIds = ['missing'];
  assert.throws(() => assertVisualReuse(f.repo, work), /不属于来源/);
  work.visual.reuse.targetIds = ['a'];
  work.visual.targets[1].reviews.V2 = f.source.visual.targets[1].reviews.V2;
  assert.throws(() => assertVisualReuse(f.repo, work), /不能复用来源确认/);
  work.visual.targets[1].reviews = {};
  work.visual.targets[0].reviews.V4 = f.source.visual.targets[0].reviews.V4;
  assert.throws(() => assertVisualReuse(f.repo, work), /不能复用来源确认/);
});

test('仅继承全局方向时目标重新生产并由新范围门约束', async (t) => {
  const f = await fixture(t);
  f.work.visual.reuse.impact = 'target';
  f.work.visual.reuse.inheritedReviews = [];
  delete f.work.visual.reuse.targetIds;
  f.work.visual.targets = [f.work.visual.targets[0]];
  for (const target of f.work.visual.targets) target.reviews = {};
  assert.doesNotThrow(() => assertVisualReuse(f.repo, f.work));
});
