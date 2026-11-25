import { isDeclaredTextNode } from './text-fidelity-contract.mjs';

/** 计划尺寸和 Alpha 写在 expected_assets，顶层这些字段表示真实产出。 */
const ACTUAL_OUTPUT_FIELDS = [
  "generation_record", "generationRecord", "runtime_consumption", "runtimeConsumption",
  "output_file", "outputFile", "runtime_output_file", "runtimeOutputFile",
  "width", "height", "alpha", "sha256", "output_sha256", "file_sha256",
  "normalization_record", "normalizationRecord", "output", "output_metadata", "outputMetadata",
];

/** V3 计划单元可以声明预定路径。提交实际生成、输出或运行事实后仍须完整核验。 */
export function isPlannedVisualAsset(asset, stage) {
  return stage === "V3" && asset?.status === "planned"
    && ACTUAL_OUTPUT_FIELDS.every((field) => asset[field] === undefined);
}
/** 从阶段和拆解识别必须由工作流完成正式文字验收的 V4 清单。 */
export function hasFormalV4Text(manifest, stage, layoutNodes = []) {
  const isV4 = [stage, manifest.visualStage, manifest.visual_stage].some((value) => String(value).toUpperCase() === 'V4')
    || [manifest.visualStageState, manifest.visual_stage_state].some((value) => String(value).startsWith('v4-'));
  if (!isV4) return false;
  const contract = manifest.scene_reconstruction_contract;
  const text = contract?.text_decomposition ?? contract?.textDecomposition;
  const nodes = text?.text_nodes ?? text?.textNodes;
  const layout = contract?.layout_decomposition ?? contract?.layoutDecomposition
    ?? contract?.layout_decomposition_contract ?? contract?.layoutDecompositionContract;
  return text?.applicability === 'has-text' || (Array.isArray(nodes) && nodes.length > 0)
    || [contract?.coverage_regions, manifest.coverage_audit?.regions, layout?.layout_nodes ?? layout?.layoutNodes, layoutNodes]
      .some((entries) => Array.isArray(entries) && entries.some(isDeclaredTextNode));
}
