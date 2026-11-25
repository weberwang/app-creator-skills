import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkedPath, inspectFile } from '../verification/file-identities.mjs';

/** 复用同一正式转换记录版本，要求所有转换记录携带源稿确认。 */
export const SVG_RASTERIZATION_VERSION = 'svg-rasterization/2.0';

/** 校验人工确认文件引用的路径和摘要结构。 */
export function isSvgSourceReviewRef(ref) {
  return typeof ref?.path === 'string' && Boolean(ref.path.trim())
    && typeof ref.sha256 === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256);
}

/** 确认当前源稿已获人工批准，并核对实际读取的记录与冻结版本一致。 */
export function readSvgSourceReview(projectRoot, reviewPath, { sourcePath, sourceSha256, reviewSha256, assetId, workItemId, candidateId }) {
  if (typeof reviewPath !== 'string' || !reviewPath.trim()) throw new Error('转换正式图片前必须提供 SVG 源稿人工确认');
  const label = 'SVG 源稿人工确认';
  let identity;
  try { identity = inspectFile(projectRoot, reviewPath, label); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label}记录不存在，须等待用户确认`);
    throw error;
  }
  const bytes = readFileSync(checkedPath(projectRoot, identity.path, label).absolute);
  // 用已检查的同一份字节读取批准内容，拒绝文件在解析前被改写。
  if (createHash('sha256').update(bytes).digest('hex') !== identity.sha256
    || (reviewSha256 !== undefined && reviewSha256 !== identity.sha256)) throw new Error(`${label}记录与冻结摘要不一致`);
  let review;
  try { review = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`${label}不是有效 JSON`); }
  if (review?.schemaVersion !== '1.0' || review.stage !== 'V4' || review.purpose !== 'svg-source'
    || review.decision !== 'APPROVED' || !['userMessageRef', 'objectId', 'workItemId', 'candidateId']
      .every((key) => typeof review[key] === 'string' && review[key].trim())) {
    throw new Error(`${label}未批准或缺少用户消息及资产身份`);
  }
  if (review.targetRef !== sourcePath || review.targetSha256 !== sourceSha256 || !/^[a-f0-9]{64}$/.test(review.targetSha256 ?? '')) {
    throw new Error('当前 SVG 源稿与人工确认的路径或摘要不一致，须重新审阅');
  }
  for (const [key, expected] of Object.entries({ objectId: assetId, workItemId, candidateId })) {
    if (expected !== undefined && review[key] !== expected) throw new Error(`${label}未绑定当前资产、工作项或候选`);
  }
  return { path: identity.path, sha256: identity.sha256 };
}
