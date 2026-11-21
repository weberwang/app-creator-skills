import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

const TEXT_TARGET_FIELDS = [
  ['text_node_id', 'textNodeId', 'id'], ['region_id', 'regionId'], ['layout_node_id', 'layoutNodeId'],
  ['parent_layout_node_id', 'parentLayoutNodeId'],
  ['typography_target', 'typographyTarget', 'target_typography', 'targetTypography', 'typography'],
  ['target_bounds', 'targetBounds', 'bounds'], ['content', 'text', 'display_text', 'displayText'],
  ['content_source', 'contentSource', 'source', 'i18n_key', 'i18nKey'], ['dynamic'],
  ['localizable', 'localizable_text', 'localizableText'], ['content_cases', 'contentCases'], ['planned_test_id', 'plannedTestId'],
];

/** 提取 V3 已定的文字目标，不把 V4 资源或 V5 实测混入设计事实。 */
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

/** 核对当前领域清单没有重写或漏掉在 V3 确认的文字样式和适用节点。 */
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
}
