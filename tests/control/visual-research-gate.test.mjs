import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { collectWorkReferencePaths } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { prepareWorkRecords } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { completeUnit, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createFixture, createQualityChecks, frozenReview, put, putJson, readWork, reviewRecord } from './controller-fixture.mjs';
import { visualResearchFixture } from './visual-research-fixture.mjs';

/** 创建原有全局图片方向证据，缺失项只来自被测调研合同。 */
async function prepareBaseline(repo, work) {
  const checks = await createQualityChecks(repo, 'research-test/quality');
  const candidates = await Promise.all(['a', 'b', 'c'].map(async (candidateId) => ({
    candidateId, path: await put(repo, `research-test/candidate-${candidateId}.png`, `合成候选 ${candidateId}`), qualityChecks: checks,
  })));
  const selected = await frozenReview(repo, candidates[0].path);
  const reviewPath = await putJson(repo, 'research-test/selection.json', {
    ...reviewRecord({ objectId: 'direction', stage: 'BASELINE', purpose: 'visual-baseline', userMessageRef: 'test://selected',
      targetRef: selected.path, candidateId: 'a', qualityChecks: checks }),
    targetSha256: selected.sha256,
  });
  return { schemaVersion: '1.0', baselineId: 'direction', projectId: work.projectId, stack: work.stack,
    candidates, selectedCandidateId: 'a', selectionReviewRef: await frozenReview(repo, reviewPath) };
}

/** 在正常控制器迁移入口绑定基础视觉清单，模拟选稿之后的冻结检查。 */
async function fixture(t) {
  const { repo, workPath } = await createFixture({ id: 'research-foundation', stack: 'cocos' });
  t.after(() => rm(repo, { recursive: true, force: true }));
  const work = await readWork(repo, workPath);
  work.globalState = 'BASELINE';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  const baseline = await prepareBaseline(repo, work);
  /** 每个负例只更换调研记录，其余基线保持可验。 */
  async function bind(document, path = 'research-test/baseline.json') {
    const baselinePath = await putJson(repo, path, document);
    const manifestPath = await putJson(repo, 'research-test/foundation.json', {
      schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, foundationWorkItemPath: workPath,
      baselines: [{ route: 'image', ref: await frozenReview(repo, baselinePath) }],
    });
    work.foundationVisualRef = await frozenReview(repo, manifestPath);
    await putJson(repo, workPath, work);
  }
  /** 验证拒绝门禁时不前进、不写工作项。 */
  async function reject(expected) {
    const before = await readFile(resolve(repo, workPath));
    await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} }), expected);
    assert.deepEqual(await readFile(resolve(repo, workPath)), before);
  }
  return { repo, workPath, work, baseline, bind, reject };
}

test('全局视觉的公开推进门禁分别拒绝缺调研、缺参考和错项目', async (t) => {
  const f = await fixture(t);
  const { repo, work, baseline } = f;
  await f.bind(baseline);
  await f.reject(/全局视觉产品调研与美术参考.*路径/);
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  for (const [document, expected] of [
    [{ ...research, productResearch: { market: research.productResearch.market } }, /产品调研 competitor 结论/],
    [{ ...research, artReferences: [] }, /缺少美术设定参考/],
    [{ ...research, projectId: 'wrong-project' }, /项目、技术栈或版本/],
    [{ ...research, artReferences: [{ ...research.artReferences[0], applicability: ' ' }] }, /当前适用依据/],
    [{ ...research, artReferences: [{ ...research.artReferences[0], source: { url: 'file:///result.png' } }] }, /必须引用公开来源链接或冻结文件/],
  ]) {
    const path = await putJson(repo, 'research-test/incomplete.json', document);
    await f.bind({ ...baseline, visualResearchRef: await frozenReview(repo, path) });
    await f.reject(expected);
  }
  // 准备和执行入口先核对已绑定的调研，再读取或写入实施记录。
  await assert.rejects(prepareWorkRecords({ repo, workItem: f.workPath, planPath: 'missing-plan.json' }), /美术设定参考/);
  f.work.globalState = 'IMPLEMENTING';
  await putJson(repo, f.workPath, f.work);
  await assert.rejects(completeUnit({ repo, workItem: f.workPath, resultPath: 'missing-result.json' }), /美术设定参考/);
});

test('新全局方向可复用现有研究和美术参考，引用失效会重新阻断', async (t) => {
  const f = await fixture(t);
  const { repo, workPath, work, baseline } = f;
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  const referencePath = await put(repo, 'research-test/art-reference.md', '合成素材造型的观察记录');
  const fileRef = await frozenReview(repo, referencePath);
  research.artReferences[0].source = { fileRef };
  const researchPath = await putJson(repo, 'research-test/research.json', research);
  const researchRef = await frozenReview(repo, researchPath);
  const originalBaselinePath = await putJson(repo, 'research-test/earlier-baseline.json', { ...baseline, visualResearchRef: researchRef });
  const earlier = await readWork(repo, originalBaselinePath);
  // 新版本引用此前已经冻结的调研清单，当前仍按实际本地内容复核。
  await f.bind({ ...baseline, visualResearchRef: earlier.visualResearchRef }, 'research-test/current-baseline.json');
  assert(collectWorkReferencePaths(work, repo).includes(referencePath));
  await put(repo, referencePath, '修改后的来源');
  await f.reject(/美术设定参考第 1 项来源.*重新冻结/);
  await put(repo, referencePath, '合成素材造型的观察记录');
  await transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} });
  assert.equal((await readWork(repo, workPath)).globalState, 'PROPOSAL');
});
