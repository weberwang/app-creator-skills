import { createHash } from "node:crypto";

/** 判断身份字段是否包含有效文字。 */
function nonEmptyString(value) { return typeof value === "string" && value.trim().length > 0; }

/** 和控制器使用相同的平台大小写规则，区分大小写敏感系统中的同名资产。 */
function normalizePath(value) {
  if (!nonEmptyString(value)) return "";
  const path = value.trim().replaceAll("\\", "/").replace(/\/+/g, "/").replace(/^\.\//, "");
  return process.platform === "win32" ? path.toLowerCase() : path;
}

/** 逐项核对控制器已核实的历史生成记录，避免授权被转用于其他资产或提示词。 */
export function hasVerifiedHistoricalPromptApproval(asset, generation, context = {}, options = {}) {
  const id = asset?.id ?? asset?.asset_id;
  const approval = options.verifiedHistoricalPromptApprovals instanceof Map
    ? options.verifiedHistoricalPromptApprovals.get(id) : null;
  const region = options.region ?? context.region ?? context.coverage_region ?? context.coverageRegion;
  const regionId = region?.region_id ?? region?.regionId ?? region?.id;
  const candidate = options.candidateVersion ?? options.candidate_version ?? context.candidateVersion ?? context.candidate_version;
  const reference = options.referenceOriginalFile ?? options.reference_original_file;
  const referenceSha = String(options.referenceOriginalSha256 ?? "").replace(/^sha256:/, "");
  const outputSha = String(asset?.sha256 ?? "").replace(/^sha256:/, "");
  const stage = String(options.stage ?? context.stage ?? "").toUpperCase();
  const prompt = generation?.full_prompt ?? generation?.actual_prompt ?? generation?.prompt;
  const sentFields = [generation?.full_prompt, generation?.actual_prompt, generation?.prompt].filter(nonEmptyString);
  if (!approval || !["V4", "V5"].includes(stage) || !nonEmptyString(id) || !nonEmptyString(candidate) || !nonEmptyString(regionId)
    || !nonEmptyString(reference) || !/^[a-f0-9]{64}$/.test(referenceSha) || !/^[a-f0-9]{64}$/.test(outputSha)
    || !nonEmptyString(prompt) || sentFields.some((item) => item !== prompt)) return false;
  const digest = createHash("sha256").update(prompt).digest("hex");
  return approval.assetId === id && approval.regionId === regionId && approval.candidateVersion === candidate
    && generation?.asset_id === id && generation?.region_id === regionId && generation?.candidate_version === candidate
    && approval.referenceTarget?.sha256 === referenceSha && normalizePath(approval.referenceTarget.path) === normalizePath(reference)
    && approval.fullPromptSha256 === digest && approval.runtimeSha256 === outputSha
    && normalizePath(approval.sourceFile) !== "" && normalizePath(approval.sourceFile) === normalizePath(asset.source_file)
    && normalizePath(approval.sourceFile) === normalizePath(generation.source_file)
    && normalizePath(approval.runtimeFile) !== "" && normalizePath(approval.runtimeFile) === normalizePath(asset.output_file)
    && normalizePath(approval.runtimeFile) === normalizePath(generation.runtime_file);
}
