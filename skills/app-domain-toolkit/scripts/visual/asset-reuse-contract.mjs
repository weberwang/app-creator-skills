import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { normalizeProductionExpectedAssets } from "./visual-atomic-contract.mjs";

/** 复用快照及逐位置兼容证据的合同版本。 */
export const REUSE_SCHEMA = "asset-reuse-snapshot/1.0";
export const REUSE_COMPATIBILITY_SCHEMA = "asset-reuse-compatibility/1.0";

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const BOUNDS_FIELDS = ["x", "y", "width", "height"];
const STYLE_FIELDS = ["silhouette", "material", "lighting", "palette", "ornament"];
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG_MAGIC = Buffer.from([255, 216, 255]);

/** 判断复用记录是否为具名字段对象。 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 拒绝空白文字冒充稳定身份。 */
function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** 检查内容摘要是否采用三栈的标准格式。 */
function isDigest(value) {
  return typeof value === "string" && SHA256.test(value);
}

/** 比较声明路径，统一 Windows 路径分隔符及大小写规则。 */
function pathKey(value) {
  if (!hasText(value)) return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

/** 检查路径在真实工程根内，防止快照通过软链接指向其他工程。 */
function isInside(root, file) {
  const subpath = relative(root, file);
  return Boolean(subpath && subpath !== ".." && !subpath.startsWith(`..${sep}`) && !isAbsolute(subpath));
}

/** 读取文件实际字节，同时复算约定版本，目录或空证据不能放行。 */
function readProjectFile(root, path, field, errors, digest) {
  try {
    if (!hasText(root) || !hasText(path) || /^(?:[\\/]|[a-z]:)/i.test(path)) throw new Error("须使用项目相对路径");
    const absoluteRoot = resolve(root);
    const absolutePath = resolve(absoluteRoot, path.replaceAll("\\", "/"));
    if (!isInside(absoluteRoot, absolutePath)) throw new Error("文件路径越界");
    const realFile = realpathSync(absolutePath);
    if (!isInside(realpathSync(absoluteRoot), realFile) || !statSync(realFile).isFile()) throw new Error("须为项目内普通文件");
    const bytes = readFileSync(realFile);
    if (!bytes.length) throw new Error("文件为空");
    if (digest && `sha256:${createHash("sha256").update(bytes).digest("hex")}` !== digest) {
      errors.push(`${field} 实际 SHA-256 与冻结版本不一致`);
      return null;
    }
    return bytes;
  } catch (error) {
    errors.push(`${field} 无法读取：${error.message}`);
    return null;
  }
}

/** 解析刚刚核对过的同一份字节，拒绝空对象之外的原始 JSON 类型。 */
function readRecord(root, path, field, errors, digest) {
  const bytes = readProjectFile(root, path, field, errors, digest);
  if (!bytes) return null;
  try {
    const record = JSON.parse(bytes.toString("utf8"));
    if (!isRecord(record)) throw new Error("必须是 JSON 对象");
    return record;
  } catch (error) {
    errors.push(`${field} 无效：${error.message}`);
    return null;
  }
}

/** 验证冻结资源与两份证据均有明确的文件身份。 */
export function validateReuseSnapshot(snapshot) {
  if (!isRecord(snapshot)) return ["reuse-existing 必须携带 asset-reuse-snapshot/1.0"];
  const errors = [];
  if (snapshot.schema !== REUSE_SCHEMA) errors.push(`reuse_snapshot.schema 必须为 ${REUSE_SCHEMA}`);
  for (const field of ["source_asset_id", "source_file", "source_manifest_file", "compatibility_evidence_file"]) {
    if (!hasText(snapshot[field])) errors.push(`reuse_snapshot.${field} 必须为非空字符串`);
  }
  for (const field of ["source_sha256", "source_manifest_sha256", "compatibility_evidence_sha256"]) {
    if (!isDigest(snapshot[field])) errors.push(`reuse_snapshot.${field} 必须为有效的 SHA-256`);
  }
  if (!/\.(?:png|jpe?g)$/i.test(snapshot.source_file ?? "")) errors.push("reuse_snapshot.source_file 必须是 PNG/JPG 位图");
  if (hasText(snapshot.source_manifest_file) && basename(pathKey(snapshot.source_manifest_file)).toLowerCase() === "visual-assets.json") {
    errors.push("reuse_snapshot.source_manifest_file 必须指向冻结的来源记录，不能引用当前 visual-assets.json");
  }
  if (snapshot.source_status !== "accepted") errors.push("reuse_snapshot.source_status 必须为 accepted");
  if (!hasText(snapshot.accepted_at) || Number.isNaN(Date.parse(snapshot.accepted_at))) errors.push("reuse_snapshot.accepted_at 必须是有效时间");
  return errors;
}

/** 核对 V3 路线分析引用的是当前区域的同一份结构化比较证据。 */
export function validateReuseSuitability(analysis, region) {
  const suitability = analysis?.reuse_suitability;
  if (!isRecord(suitability)) return ["visual_route_analysis.reuse_suitability 必须是对象"];
  if (typeof suitability.eligible !== "boolean") return ["reuse_suitability.eligible 必须是布尔值"];
  if (analysis.production_method === "reuse" && !suitability.eligible) return ["production_method=reuse 必须通过明确的复用资格分析"];
  if (!suitability.eligible) return [];
  const snapshot = region?.reuse_snapshot;
  const { exact_asset_identity: identity, evidence } = suitability;
  const errors = validateReuseSnapshot(snapshot);
  if (!isRecord(identity) || !hasText(identity.asset_id) || !isDigest(identity.source_sha256)
      || identity.asset_id !== snapshot?.source_asset_id || identity.source_sha256 !== snapshot?.source_sha256) {
    errors.push("reuse_suitability.exact_asset_identity 必须绑定当前快照的精确资产 ID 与源 SHA-256");
  }
  if (!isRecord(evidence) || !hasText(evidence.path) || !isDigest(evidence.sha256)
      || pathKey(evidence.path) !== pathKey(snapshot?.compatibility_evidence_file) || evidence.sha256 !== snapshot?.compatibility_evidence_sha256) {
    errors.push("reuse_suitability.evidence 必须绑定当前快照的结构化兼容证据路径与 SHA-256");
  }
  return errors;
}

/** 统一读取现有生产合同支持的绑定，保留会影响复用判断的切片规格。 */
function readExpectedAssets(region) {
  const production = region.production_contract ?? region.productionContract;
  const raw = region.expected_assets ?? region.expectedAssets ?? production?.expected_assets ?? production?.expectedAssets;
  return normalizeProductionExpectedAssets(raw).map((asset, index) => ({
    ...asset,
    nine_slice: raw[index]?.nine_slice,
    atlas_slice: raw[index]?.atlas_slice ?? raw[index]?.atlasSlice,
  }));
}

/** 从实际覆盖区域读取当前位置，兼容记录不能自行声明目标。 */
function targetIdentity(region, manifest, snapshot, expectedAssets, errors) {
  const production = region.production_contract ?? region.productionContract;
  const ids = region.asset_ids ?? region.assetIds;
  if (ids !== undefined && !Array.isArray(ids)) errors.push("复用区域的 asset_ids 必须为列表");
  const assetIds = new Set([region.asset_id ?? region.assetId ?? production?.asset_id ?? production?.assetId,
    ...(Array.isArray(ids) ? ids : []), ...expectedAssets.map((asset) => asset.asset_id)].filter(hasText));
  if (assetIds.size !== 1 || !assetIds.has(snapshot.source_asset_id)) {
    errors.push("复用区域必须绑定同一个已验收资产 ID；不同图片需要各自的复用证据");
  }
  const bounds = region.bounds ?? region.target_bounds;
  if (!isRecord(bounds) || BOUNDS_FIELDS.some((key) => !Number.isFinite(bounds[key]))
      || bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0) errors.push("当前复用区域缺少有效位置和尺寸 bounds");
  return {
    scene_id: region.scene_id ?? region.sceneId,
    state_id: region.state_id ?? region.stateId,
    region_id: region.region_id ?? region.regionId ?? region.id,
    asset_id: snapshot.source_asset_id,
    bounds,
    target_sha256: manifest?.reference_target?.target_sha256,
    visual_baseline_id: manifest?.visual_baseline?.id,
    visual_baseline_version: manifest?.visual_baseline?.version,
  };
}

/** 对照已验收来源和原许可记录，状态字样本身不能作为素材版本。 */
function validateAcceptedSource(record, snapshot, target, projectRoot, errors) {
  if (!record) return;
  const expected = {
    status: "accepted",
    asset_id: snapshot.source_asset_id,
    source_sha256: snapshot.source_sha256,
    accepted_at: snapshot.accepted_at,
    visual_baseline_id: target.visual_baseline_id,
    visual_baseline_version: target.visual_baseline_version,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (!hasText(record[field]) || record[field] !== value) errors.push(`复用 source manifest 的 ${field} 与冻结来源或当前基线不一致`);
  }
  if (pathKey(record.source_file) !== pathKey(snapshot.source_file)) errors.push("复用 source manifest 的 source_file 与快照不一致");
  readProjectFile(projectRoot, record.license_ref, "source manifest.license_ref", errors);
}

/** 兼容性只接受逐项核对结果，保留说明文字供人工审阅。 */
function validateCompatibility(record, snapshot, target, expectedAssets, errors) {
  if (!record) return;
  if (record.schema !== REUSE_COMPATIBILITY_SCHEMA) errors.push(`复用 compatibility evidence.schema 必须为 ${REUSE_COMPATIBILITY_SCHEMA}`);
  if (record.status !== "passed") errors.push("复用 compatibility evidence.status 必须为 passed");
  if (record.source_asset_id !== snapshot.source_asset_id || pathKey(record.source_file) !== pathKey(snapshot.source_file)
      || record.source_sha256 !== snapshot.source_sha256) errors.push("复用兼容证据须绑定同一已验收资产 ID、source_file 和源 SHA-256");
  for (const [field, value] of Object.entries(target)) {
    if (field === "bounds") {
      if (BOUNDS_FIELDS.some((key) => value?.[key] !== record.target?.bounds?.[key])) errors.push("复用兼容证据 target.bounds 与当前使用位置不一致");
    } else if (value !== record.target?.[field]) errors.push(`复用兼容证据 target.${field} 与当前使用位置或视觉依据不一致`);
  }
  const checks = record.checks;
  for (const field of ["purpose", "state", "size"]) {
    if (checks?.[field] !== "match") errors.push(`复用兼容证据 checks.${field} 必须为 match`);
  }
  const required = {
    alpha: expectedAssets.some((asset) => asset.alpha === true),
    slicing: expectedAssets.some((asset) => asset.nine_slice?.mode === "stretch" || isRecord(asset.atlas_slice)),
  };
  for (const [field, applicable] of Object.entries(required)) {
    if (checks?.[field] !== "match" && (applicable || checks?.[field] !== "not-applicable")) errors.push(`复用兼容证据 checks.${field} 须与当前规格相符`);
  }
  for (const field of STYLE_FIELDS) {
    // 同功能也可能承担不同的视觉语义，任何关键样式明显不同都要独立制作。
    if (!["match", "minor-difference"].includes(checks?.style?.[field])) errors.push(`复用兼容证据 checks.style.${field} 缺少兼容结论或存在明显样式差异`);
  }
}

/** 同一文件门用于标注、实施包、清单和运行审计，防止较弱入口提前放行。 */
export function validateReuseProductionGate(region = {}, context = {}, options = {}) {
  const production = region?.production_contract ?? region?.productionContract;
  const method = region?.production_method ?? region?.productionMethod ?? production?.production_method ?? production?.productionMethod;
  const mode = (region?.implementation_plan ?? region?.implementationPlan)?.mode;
  if (method !== "reuse" && mode !== "reuse-existing") return [];
  const stage = context.stage ?? "V4";
  const annotation = region.annotation_number ?? context.annotation_number ?? "?";
  const id = region.region_id ?? region.id ?? context.region_id ?? "?";
  /** 让所有入口用同一阶段和区域身份定位失败。 */
  const report = (messages) => messages.map((message) => `[${stage}] annotation_number=${annotation} region_id=${id} expected_method=reuse observed_method=${method ?? "missing"} ${message}`);
  if (method !== "reuse" || mode !== "reuse-existing") return report(["production_method=reuse 必须与 implementation_plan.mode=reuse-existing 一一对应"]);

  const snapshot = region.reuse_snapshot;
  const errors = validateReuseSnapshot(snapshot);
  if (errors.length) return report(errors);
  if (options.checkFiles !== true) return [];
  const { projectRoot, reuseManifest: manifest } = options;
  const expectedAssets = readExpectedAssets(region);
  const target = targetIdentity(region, manifest, snapshot, expectedAssets, errors);
  for (const field of ["scene_id", "state_id", "region_id", "visual_baseline_id", "visual_baseline_version"]) {
    if (!hasText(target[field])) errors.push(`当前复用目标缺少 ${field}`);
  }
  if (!isDigest(target.target_sha256)) errors.push("当前复用目标缺少有效 target_sha256");
  if (errors.length) return report(errors);

  const source = readProjectFile(projectRoot, snapshot.source_file, "source_file", errors, snapshot.source_sha256);
  if (source && !source.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) && !source.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    errors.push("复用 source_file 必须是真实 PNG/JPEG 文件");
  }
  readProjectFile(projectRoot, manifest.reference_target.original_file, "reference_target.original_file", errors, target.target_sha256);
  const accepted = readRecord(projectRoot, snapshot.source_manifest_file, "source_manifest_file", errors, snapshot.source_manifest_sha256);
  const evidence = readRecord(projectRoot, snapshot.compatibility_evidence_file, "compatibility_evidence_file", errors, snapshot.compatibility_evidence_sha256);
  validateAcceptedSource(accepted, snapshot, target, projectRoot, errors);

  validateCompatibility(evidence, snapshot, target, expectedAssets, errors);
  const runtimePaths = new Set();
  for (const asset of expectedAssets) {
    if (pathKey(asset.source_file) !== pathKey(snapshot.source_file)) errors.push("当前 expected_assets.source_file 须指向复用快照的正式源图片");
    if (hasText(asset.runtime_file)) runtimePaths.add(asset.runtime_file);
  }
  // 标注阶段允许尚未装配，接入及运行验收必须仍消费同版本的图片。
  if (["V4", "V5"].includes(stage)) {
    if (!runtimePaths.size || expectedAssets.some((asset) => !hasText(asset.runtime_file))) errors.push("复用区域须声明实际消费的 expected_assets.runtime_file");
    for (const path of runtimePaths) readProjectFile(projectRoot, path, `runtime_file ${path}`, errors, snapshot.source_sha256);
  }
  return report(errors);
}
