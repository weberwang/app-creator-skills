import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { readFrozenVisualBaseline } from '../../skills/app-workflow-control/scripts/runtime/visual-baseline-identity.mjs';

/** 写入合成材料并返回其实际文件身份。 */
async function save(repo, path, value) {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  await writeFile(resolve(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

test('基线、确认和候选逐层冻结，同时替换不得冒充旧确认', async (t) => {
  const repo = await mkdtemp(resolve(tmpdir(), 'baseline-identity-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const candidate = await save(repo, 'candidate.txt', '原始候选');
  const review = { targetRef: candidate.path, targetSha256: candidate.sha256, userMessageRef: 'test://original' };
  const reviewRef = await save(repo, 'review.json', review);
  const baseline = { selectedCandidateId: 'a', candidates: [{ candidateId: 'a', path: candidate.path }], selectionReviewRef: reviewRef };
  const baselineRef = await save(repo, 'baseline.json', baseline);
  assert.equal(readFrozenVisualBaseline(repo, baselineRef).selectedCandidateId, 'a');
  const newCandidate = await save(repo, candidate.path, '修改后的候选');
  const newReviewRef = await save(repo, reviewRef.path, { ...review, targetSha256: newCandidate.sha256 });
  assert.throws(() => readFrozenVisualBaseline(repo, baselineRef), /选择确认.*内容已变化/);
  await save(repo, baselineRef.path, { ...baseline, selectionReviewRef: newReviewRef });
  assert.throws(() => readFrozenVisualBaseline(repo, baselineRef), /全局视觉基线.*内容已变化/);
  assert.notEqual((await readFile(resolve(repo, baselineRef.path), 'utf8')), JSON.stringify(baseline));
});
