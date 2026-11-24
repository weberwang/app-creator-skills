import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileIdentityKey, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 从同一文件读取已冻结的资源评审或实际试装报告，避免阶段回退后复用作废证据。 */
function frozenJson(repo, work, ref, label) {
  if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label} 缺少路径或 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  const key = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((entry) => entry.path && fileIdentityKey(repo, entry.path) === key)) {
    throw new WorkflowError(`${label} 已作废：${path}`);
  }
  const bytes = readFileSync(repoPath(repo, path).absolute);
  if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label} 实际内容与冻结摘要不符`);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch { throw new WorkflowError(`${label} 不是有效 JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须是 JSON 对象`);
  return value;
}

/** V4 使用当前资源评审冻结的试装读数，各栈仍按自己的原生格式核对节点。 */
export function readV4TextRestoration(repo, work, candidateId, assetReviewRef = work.assetReviewRef) {
  const review = frozenJson(repo, work, assetReviewRef, 'V4 文字还原的资源评审');
  const { textRestorationRef: ref } = review;
  if (review.workItemId !== work.workItemId || review.stack !== work.stack || review.candidateId !== candidateId
    || review.schemaVersion !== '1.0' || review.visualStage !== 'V4') {
    throw new WorkflowError('V4 文字还原的资源评审未绑定当前工作项、技术栈及候选');
  }
  const report = frozenJson(repo, work, ref, 'V4 资源评审 textRestorationRef 文字试装读数');
  return { ref, report };
}
