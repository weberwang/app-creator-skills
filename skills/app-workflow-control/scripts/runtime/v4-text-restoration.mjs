import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileIdentityKey, repoPath, requireFile, WorkflowError } from './io.mjs';

const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const ENTRY_EXTENSIONS = {
  unity: ['.unity', '.prefab', '.uxml'], cocos: ['.scene', '.prefab'],
  phaser: SCRIPT_EXTENSIONS, threejs: SCRIPT_EXTENSIONS, expo: SCRIPT_EXTENSIONS,
  flutter: ['.dart'], esp32: ['.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.ino'],
};

/** 统一核对冻结身份，避免阶段回退后复用作废证据。 */
function frozenPath(repo, work, ref, label) {
  if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label} 缺少路径或 SHA-256`);
  const path = repoPath(repo, ref.path, label).relative;
  const key = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((entry) => entry.path && fileIdentityKey(repo, entry.path) === key)) {
    throw new WorkflowError(`${label} 已作废：${path}`);
  }
  return { path, key };
}

/** 对正式文件读取实际字节，摘要与证据所指文件必须一致。 */
function frozenBytes(repo, ref, path, label) {
  const bytes = readFileSync(repoPath(repo, requireFile(repo, path, label), label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) {
    throw new WorkflowError(`${label} 实际内容与冻结摘要不符或文件为空`);
  }
  return bytes;
}

/** 资源评审和原生回读均从同一份已校验字节解析。 */
function frozenJson(repo, work, ref, label) {
  const { path } = frozenPath(repo, work, ref, label);
  const bytes = frozenBytes(repo, ref, path, label);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch { throw new WorkflowError(`${label} 不是有效 JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须是 JSON 对象`);
  return value;
}

/** 要求图像消费者与文字回读来自同一次采集，并绑定保存后的正式目标源。 */
function validateFormalIntegration(repo, work, review, report, { stage, entryPaths }) {
  const { entryRef, images } = report.formalIntegration ?? {};
  if (!entryRef || !Array.isArray(images)) throw new WorkflowError('V4 文字回读缺少 formalIntegration 同批正式图文接入证据');
  const entryLabel = 'V4 正式接入入口';
  const entry = frozenPath(repo, work, entryRef, entryLabel);
  const evidenceRoots = ['.workflow-control', 'evidence', 'output/intermediate', 'output/candidates', work.evidenceRoot].filter(Boolean);
  if (!ENTRY_EXTENSIONS[work.stack]?.includes(extname(entry.path).toLowerCase())
    || evidenceRoots.some((root) => entry.key.startsWith(`${fileIdentityKey(repo, root)}/`))
    || (entryPaths && !entryPaths.some((path) => fileIdentityKey(repo, path) === entry.key))) {
    throw new WorkflowError(`${entryLabel}必须绑定当前视觉单位的正式源文件`);
  }

  // V5 重读已冻结的 V4 采集报告；正式源码可能已随完整功能实现演进，由 V5 独立验证。
  if (stage === 'V4') frozenBytes(repo, entryRef, entry.path, entryLabel);
  if (!Array.isArray(review.assets) || !review.assets.length) throw new WorkflowError('V4 正式图文接入需要当前资源评审清单');
  const reviewedImages = review.assets.filter((asset) => asset?.assetType === 'image');
  const expected = new Map(reviewedImages.map((asset) => [asset.assetId, asset.output]));
  if (expected.size !== reviewedImages.length) throw new WorkflowError('V4 资源评审包含重复图片 ID');
  const consumers = new Map();
  for (const image of images) {
    const label = `V4 正式图片 ${image?.assetId ?? '(缺少 ID)'}`;
    const output = expected.get(image?.assetId);
    const file = frozenPath(repo, work, image?.outputRef, label);
    if (!output || typeof image.componentPath !== 'string' || !image.componentPath.trim()
      || fileIdentityKey(repo, output) !== file.key) {
      throw new WorkflowError(`${label}未绑定本批评审产物和正式组件消费者`);
    }
    // 同一张图可以在多个布局节点使用，每个实际消费者只计一次。
    const placements = consumers.get(image.assetId) ?? new Set();
    if (placements.has(image.componentPath)) throw new WorkflowError(`${label}重复记录同一组件消费者`);
    placements.add(image.componentPath);
    consumers.set(image.assetId, placements);
    if (stage === 'V4') frozenBytes(repo, image.outputRef, file.path, label);
  }
  if (consumers.size !== expected.size) throw new WorkflowError('V4 正式接入图片覆盖与本批资源评审不一致');
}

/** 读取同批正式图文接入原生报告，各栈继续按自身格式核对文字节点。 */
export function readV4TextRestoration(repo, work, candidateId, { stage, assetReviewRef = work.assetReviewRef, entryPaths }) {
  if (stage !== 'V4' && stage !== 'V5') throw new WorkflowError('正式图文接入证据仅用于 V4 或 V5');
  const review = frozenJson(repo, work, assetReviewRef, 'V4 文字还原的资源评审');
  const { textRestorationRef: ref } = review;
  if (review.workItemId !== work.workItemId || review.stack !== work.stack || review.candidateId !== candidateId
    || review.schemaVersion !== '1.0' || review.visualStage !== 'V4') {
    throw new WorkflowError('V4 文字还原的资源评审未绑定当前工作项、技术栈及候选');
  }
  const report = frozenJson(repo, work, ref, 'V4 资源评审 textRestorationRef 正式文字回读');
  validateFormalIntegration(repo, work, review, report, { stage, entryPaths });
  return { ref, report };
}
