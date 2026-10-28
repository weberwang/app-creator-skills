import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 验证已冻结文件引用，确保后续修改无法沿用原始人工确认。 */
function verifyIdentity(repo, identity, label) {
  if (!identity || !/^[a-f0-9]{64}$/.test(identity.sha256 ?? '')) throw new WorkflowError(`${label} 必须绑定路径和 SHA-256`);
  const path = requireFile(repo, identity.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== identity.sha256) throw new WorkflowError(`${label} 内容已变化，必须重新确认`);
  return path;
}

/** 逐级复核工作项、基线及用户确认，防止同时替换图像和确认文件绕过冻结。 */
export function readFrozenVisualBaseline(repo, ref) {
  const path = verifyIdentity(repo, ref, '全局视觉基线');
  const record = readJson(repo, path, 'Global Visual Baseline');
  const reviewPath = verifyIdentity(repo, record.selectionReviewRef, '全局视觉基线选择确认');
  const review = readJson(repo, reviewPath, 'Global Visual Baseline 选择确认');
  const selected = Array.isArray(record.candidates) ? record.candidates.filter((candidate) => candidate?.candidateId === record.selectedCandidateId) : [];
  if (selected.length !== 1 || !review.targetRef || repoPath(repo, review.targetRef).relative !== repoPath(repo, selected[0].path).relative) throw new WorkflowError('视觉基线确认图必须绑定已选择的候选');
  verifyIdentity(repo, { path: review.targetRef, sha256: review.targetSha256 }, '视觉基线已确认候选');
  return record;
}
