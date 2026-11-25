import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { readTargetRuntimeLayoutRef } from './runtime-layout-evidence.mjs';
import { readV4TextRestoration } from './v4-text-restoration.mjs';

const TEXT_TARGET_FIELDS = [
  ['text_node_id', 'textNodeId', 'id'], ['region_id', 'regionId'], ['layout_node_id', 'layoutNodeId'],
  ['parent_layout_node_id', 'parentLayoutNodeId'],
  ['typography_target', 'typographyTarget', 'target_typography', 'targetTypography', 'typography'],
  ['target_bounds', 'targetBounds', 'bounds'], ['content', 'text', 'display_text', 'displayText'],
  ['content_source', 'contentSource', 'source', 'i18n_key', 'i18nKey'], ['dynamic'],
  ['localizable', 'localizable_text', 'localizableText'], ['content_cases', 'contentCases'], ['planned_test_id', 'plannedTestId'],
];

/** 提取 V3 已定的文字目标，试装与正式实测属于各自的交付阶段。 */
function textTargets(manifest) {
  const contract = manifest.scene_reconstruction_contract;
  const decomposition = contract?.text_decomposition ?? contract?.textDecomposition;
  const nodes = decomposition?.text_nodes ?? decomposition?.textNodes;
  if (!Array.isArray(nodes)) return new Map();
  return new Map(nodes.map((node) => {
    const fields = TEXT_TARGET_FIELDS.map((names) => [names[0], node?.[names.find((name) => Object.hasOwn(node ?? {}, name))]]);
    return [fields[0][1], Object.fromEntries(fields)];
  }));
}

/** 组件路径使用原生层级，拒绝用相对段指向正式根以外的对象。 */
function isComponentPath(path) {
  return typeof path === 'string' && !path.includes('\\')
    && path.split('/').every((part) => part.trim() && part !== '.' && part !== '..');
}

/** 核对正式目标的一次采集同时覆盖图片与可见文字组件。 */
function assertWebTrial(report, identity, targets, root) {
  if (report.schemaVersion !== 'web-native-text-readback/1.0' || report.measurementSource !== 'runtime-component'
    || report.visualStage !== 'V4' || typeof report.runId !== 'string' || !report.runId.trim()
    || Object.entries(identity).some(([key, value]) => !isDeepStrictEqual(report[key], value))
    || !Array.isArray(report.nodes)) {
    throw new WorkflowError('V4 文字试装未绑定当前工作项、候选、场景、状态和确认稿');
  }
  const actual = new Map(report.nodes.map((node) => [node?.textNodeId, node]));
  const paths = new Set();
  /** 文字和图片必须位于同一个已冻结的原生目标根。 */
  const withinRoot = (path) => isComponentPath(path) && (path === root || path.startsWith(`${root}/`));
  if (report.formalIntegration.rootComponentPath !== root
    || report.formalIntegration.images.some((image) => !withinRoot(image.componentPath))) {
    throw new WorkflowError('V4 图片消费者未绑定 V3 冻结的正式目标根');
  }
  if (actual.size !== report.nodes.length || actual.size !== targets.size) throw new WorkflowError('V4 文字试装的节点范围与冻结目标不一致');
  for (const [nodeId, target] of targets) {
    const node = actual.get(nodeId);
    const measurement = node?.measurement;
    if (node?.layoutNodeId !== target.layout_node_id || !withinRoot(node?.componentPath)
      || paths.has(node.componentPath) || measurement?.actual_visible !== true
      || ![measurement.actual_content, measurement.actual_image_path].some((value) => typeof value === 'string' && value.trim())) {
      throw new WorkflowError(`V4 文字节点 ${nodeId} 缺少本次试装的可见内容或实际组件`);
    }
    paths.add(node.componentPath);
  }
}

/** 补核领域清单已登记给当前目标的图像，防止资源评审漏列仍能通过。 */
function verifyDomainImageCoverage(repo, manifest, target, images) {
  const regions = Array.isArray(manifest.coverage_audit?.regions) ? manifest.coverage_audit.regions : [];
  const regionAssets = new Set(regions.filter((region) => region?.scene_id === target.sceneId && region.state_id === target.stateId)
    .flatMap((region) => region.asset_ids ?? [region.asset_id]));
  const captured = new Set(images.map(({ outputRef }) => fileIdentityKey(repo, outputRef.path)));
  for (const asset of Array.isArray(manifest.assets) ? manifest.assets : []) {
    if (!asset || (asset.state_id && asset.state_id !== target.stateId)) continue;
    const scopedToScene = asset.scene_id === target.sceneId && !asset.coverage_region_ids?.length;
    if (!scopedToScene && !regionAssets.has(asset.id)) continue;
    const files = [asset.output_file, ...(Array.isArray(asset.runtime_outputs) ? asset.runtime_outputs : [])];
    for (const file of files) {
      if (typeof file === 'string' && /\.(?:png|webp|jpe?g|gif|avif|svg|bmp|ktx2)$/i.test(file)
        && !captured.has(fileIdentityKey(repo, file))) throw new WorkflowError(`V4 正式图文回读缺少当前领域清单图片 ${file}`);
    }
  }
}

/** V4 文字与图片共用正式接入回读，V5 另取完整运行的公共布局证据。 */
export function webTextReadbackOptions(repo, work, manifest, target, stage) {
  const { targetId, sceneId, stateId, candidateId, referenceTarget, assetReviewRef } = target;
  const targets = textTargets(manifest);
  const hasText = targets.size > 0;
  const contract = manifest.scene_reconstruction_contract;
  const declaredText = contract?.text_decomposition ?? contract?.textDecomposition;
  if (stage === 'V4' && !hasText && declaredText?.applicability === 'has-text') throw new WorkflowError('V4 已声明的文字缺少逐节点还原范围');
  const formalTarget = validateWebTextStage(repo, manifest, target.reviews?.V3Layout, target);
  const trial = stage === 'V4' && hasText;
  const identity = { stack: work.stack, workItemId: work.workItemId, sceneId, stateId, candidateId, referenceTarget };
  const restored = hasText && ['V4', 'V5'].includes(stage)
    ? readV4TextRestoration(repo, work, candidateId, {
      stage, entryPaths: [formalTarget.entryPath], assetReviewRef: work.workItemType === 'SCENE' ? assetReviewRef ?? null : work.assetReviewRef,
    })
    : null;
  if (restored) assertWebTrial(restored.report, identity, targets, formalTarget.rootComponentPath);
  if (trial) verifyDomainImageCoverage(repo, manifest, target, restored.report.formalIntegration.images);
  const runtimeEvidenceRef = trial ? restored.ref
    : stage === 'V5' ? readTargetRuntimeLayoutRef(repo, work, targetId) : null;
  return {
    requireNativeTextReadback: trial || stage === 'V5',
    textTrialRunId: stage === 'V5' ? restored?.report?.runId : undefined,
    textReadbackIdentity: {
      ...identity,
      ...(trial ? { visualStage: 'V4' } : {}), runtimeEvidenceRef,
    },
  };
}

/** 核对 V3 冻结的接入目标、文字样式及适用节点。 */
export function validateWebTextStage(repo, manifest, layoutReviewRef, { candidateId, sceneId, stateId, referenceTarget }) {
  const current = textTargets(manifest);
  if (!layoutReviewRef?.path && !current.size) return;
  const review = readJson(repo, layoutReviewRef?.path, 'V3 文字布局确认');
  const reference = review.layoutSpecRef;
  if (!reference && !current.size) return;
  if (!reference?.path || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw new WorkflowError('V3 文字布局确认须用 layoutSpecRef 冻结目标清单');
  const path = requireFile(repo, reference.path, 'V3 文字目标清单');
  const bytes = readFileSync(repoPath(repo, path).absolute);
  if (createHash('sha256').update(bytes).digest('hex') !== reference.sha256) throw new WorkflowError('V3 文字目标清单摘要已变化');
  const frozen = JSON.parse(bytes.toString('utf8'));
  const upstream = textTargets(frozen);
  if (!upstream.size && !current.size) return;
  const target = frozen.reference_target;
  const conditions = frozen.scene_reconstruction_contract?.target_conditions;
  if (frozen.visualStage !== 'V3' || frozen.candidateVersion !== candidateId || target?.original_file !== referenceTarget.path
    || String(target?.target_sha256 ?? '').replace(/^sha256:/, '') !== referenceTarget.sha256
    || conditions?.scene_id !== sceneId || (stateId !== undefined && conditions?.state_id !== stateId)) {
    throw new WorkflowError('V3 文字目标清单未绑定当前候选、场景、状态和已确认目标');
  }
  const differences = [];
  for (const nodeId of new Set([...upstream.keys(), ...current.keys()])) {
    const before = upstream.get(nodeId);
    const after = current.get(nodeId);
    if (!before || !after) differences.push(`文字节点 ${nodeId} 缺少 V3 目标或当前交接`);
    else for (const [field, value] of Object.entries(before)) {
      if (!isDeepStrictEqual(value, after[field])) differences.push(`文字节点 ${nodeId} 的 ${field} 已偏离 V3 冻结目标`);
    }
  }
  if (differences.length) throw new WorkflowError(differences.join('；'));
  const formalTarget = frozen.formalTarget;
  if (typeof formalTarget?.entryPath !== 'string' || !isComponentPath(formalTarget.rootComponentPath)) {
    throw new WorkflowError('V3 文字布局规格缺少 formalTarget 正式入口和组件根');
  }
  repoPath(repo, formalTarget.entryPath, 'V3 正式视觉入口');
  return formalTarget;
}
