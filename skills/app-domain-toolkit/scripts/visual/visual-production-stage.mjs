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
