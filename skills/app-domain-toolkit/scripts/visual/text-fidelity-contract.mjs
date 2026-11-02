/** 三栈共享的文本目标、运行测量和逐属性容差校验，不替代真实运行采集。 */
import { isDeepStrictEqual } from "node:util";

/** 判断非空字符串。 */
const text = (value) => typeof value === "string" && value.trim().length > 0;
/** 判断普通对象。 */
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** 判断两个合同事实是否完全一致。 */
const equal = (a, b) => isDeepStrictEqual(a, b);

/** 只接受可真实复核的标量或非空结构，空对象和非有限数不能作为排版证据。 */
function validStyle(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return text(value);
  if (Array.isArray(value)) return value.length > 0 && value.every(validStyle);
  if (object(value)) return Object.keys(value).length > 0 && Object.values(value).every(validStyle);
  return false;
}

/** 字号和行高无论以标量还是带单位对象记录，都必须是同一空间的有效正数。 */
function validMeasure(value, unit) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return object(value) && Number.isFinite(value.value) && value.value > 0
    && (value.unit === undefined || value.unit === unit);
}

/** 差异例外只允许同结构的真实值，不允许变更字段类型、漏字段或单位。 */
function sameShape(target, actual, key = "") {
  if (key === "unit") return text(target) && target === actual;
  if (typeof target === "number") return Number.isFinite(target) && typeof actual === "number" && Number.isFinite(actual);
  if (typeof target === "string") return text(target) && text(actual);
  if (typeof target === "boolean") return typeof actual === "boolean";
  if (Array.isArray(target)) return Array.isArray(actual) && target.length === actual.length && target.every((item, index) => sameShape(item, actual[index]));
  if (!object(target) || !object(actual) || Object.keys(target).length === 0 || !equal(Object.keys(target).sort(), Object.keys(actual).sort())) return false;
  return Object.keys(target).every((name) => sameShape(target[name], actual[name], name));
}

/** 基线差异可以有例外，但布尔值、缺字段和非有限读数不是有效测量。 */
function validBaselinePair(target, actual) {
  return !Array.isArray(target) && typeof target !== "boolean" && sameShape(target, actual);
}

/** 识别实际字体资源；通用 texture 只有在位图字体来源明确且唯一时才视为字体纹理。 */
function fontResourcePaths(declaredResources, errors) {
  const regular = new Set(["font", "font-file", "font_asset", "font-asset", "typeface"]);
  const descriptors = new Set(["bitmap-font-descriptor", "bitmap_descriptor", "bitmap-font-data", "font-descriptor", "fnt"]);
  const textures = new Set(["bitmap-font-texture", "bitmap_texture", "font-texture"]);
  const selected = declaredResources.filter((resource) => regular.has(resource?.kind) || descriptors.has(resource?.kind) || textures.has(resource?.kind));
  if (selected.some((resource) => descriptors.has(resource.kind)) && !selected.some((resource) => textures.has(resource.kind))) {
    const genericTextures = declaredResources.filter((resource) => resource?.kind === "texture");
    if (genericTextures.length === 1) selected.push(genericTextures[0]);
    else errors.push("位图字体必须明确唯一的字体纹理，不能混用效果 texture");
  }
  return selected.map((resource) => resource.path);
}

/** 检查可执行容差：单位必须与当前测量维度一致，禁止复用其他属性的阈值。 */
function limit(rule, unit, label, errors) {
  if (rule === undefined) return 0;
  if (!object(rule) || !Number.isFinite(rule.value) || rule.value < 0 || rule.unit !== unit) {
    errors.push(`${label} 容差必须包含非负 value 和匹配单位 ${unit}`);
    return null;
  }
  return rule.value;
}

/** 对比完整结构；对象必须拥有相同字段，数字只使用该字段专属容差。 */
function compare(target, actual, tolerance, path, differences) {
  if (typeof target === "number" && typeof actual === "number") {
    if (!Number.isFinite(target) || !Number.isFinite(actual) || Math.abs(target - actual) > tolerance) differences.push(path);
    return;
  }
  if (Array.isArray(target) && Array.isArray(actual)) {
    if (target.length !== actual.length) { differences.push(path); return; }
    target.forEach((item, index) => compare(item, actual[index], tolerance, `${path}[${index}]`, differences));
    return;
  }
  if (object(target) && object(actual)) {
    const keys = new Set([...Object.keys(target), ...Object.keys(actual)]);
    for (const key of keys) {
      if (!(key in target) || !(key in actual)) differences.push(`${path}.${key}`);
      else compare(target[key], actual[key], tolerance, `${path}.${key}`, differences);
    }
    return;
  }
  if (!equal(target, actual)) differences.push(path);
}

/** 核对运行报告中的可选镜像，镜像不得更改冻结目标或实际测量。 */
function validateMirrors(raw, pairs, errors) {
  for (const container of [raw, raw.measurement, raw.runtime_measurement, raw.runtimeMeasurement, raw.comparison, raw.fidelity, raw.fidelity_measurement, raw.fidelityMeasurement].filter(object)) {
    for (const [name, expected] of pairs) {
      if (Object.hasOwn(container, name) && !equal(container[name], expected)) errors.push(`${name} 未绑定冻结目标或实际测量`);
    }
    for (const name of ["target_measurement", "targetMeasurement", "candidate_measurement", "candidateMeasurement", "target_fact", "targetFact", "candidate_fact", "candidateFact"]) {
      if (Object.hasOwn(container, name)) errors.push(`${name} 不得替换验证器构造的比较事实`);
    }
  }
}

/** 冻结的案例同时绑定语言、输入和内容来源，避免运行报告自定预期文案。 */
export function validateTextContentCases(node) {
  const errors = [];
  const needsCases = node.dynamic === true || node.localizable === true || !text(node.content);
  if (!needsCases) return errors;
  if (!text(node.content_source) && !(object(node.content_source) && Object.keys(node.content_source).length > 0)) errors.push("动态或本地化文本必须冻结 content_source");
  if (!Array.isArray(node.content_cases) || node.content_cases.length === 0) return [...errors, "动态或本地化文本必须冻结非空 content_cases"];
  const ids = new Set();
  for (const item of node.content_cases) {
    if (!object(item) || !text(item.case_id) || !text(item.locale) || !object(item.inputs) || !text(item.expected_content) || !equal(item.content_source, node.content_source)) {
      errors.push("content_cases 必须包含唯一 case_id、locale、inputs、expected_content 与绑定的 content_source");
      continue;
    }
    if (ids.has(item.case_id)) errors.push("content_cases.case_id 不能重复");
    ids.add(item.case_id);
  }
  return errors;
}

/** 几何单位由测量坐标系决定，世界字号投影到视口后不能沿用世界单位。 */
export function validateTextGeometrySpace(node) {
  const typography = node.typography_target ?? {};
  const space = typography.logical_coordinate_space;
  const unit = typography.geometry_unit;
  const known = { "viewport-logical": "logical-px", "css-px": "css-px", world: "world-unit" };
  const errors = [];
  if (!text(space) || !["logical-px", "css-px", "world-unit"].includes(unit)) return ["geometry_unit 和 logical_coordinate_space 必须明确声明有效几何坐标单位"];
  if (Object.hasOwn(known, space)) {
    if (unit !== known[space]) errors.push(`${space} 的 geometry_unit 必须为 ${known[space]}`);
  }
  const fontUnit = ["logical", "game-px"].includes(typography.font_size_unit) ? "logical-px" : typography.font_size_unit;
  if (!Object.hasOwn(known, space) || fontUnit !== unit || typography.geometry_mapping !== undefined) {
    const mapping = typography.geometry_mapping;
    const evidence = mapping?.evidence;
    const hasEvidence = text(evidence) || (Array.isArray(evidence) && evidence.length > 0 && evidence.every(text));
    if (!object(mapping) || mapping.coordinate_space !== space || mapping.unit !== unit || !text(mapping.basis) || !hasEvidence) {
      errors.push("跨单位或未预定义坐标空间必须提供匹配的 geometry_mapping.coordinate_space、unit、basis 和 evidence");
    }
  }
  return errors;
}

/** 核对文本运行输入与冻结用例，返回对应的预期内容。 */
function expectedContent(node, read, errors) {
  if (node.dynamic !== true && node.localizable !== true && text(node.content)) return node.content;
  const matches = (Array.isArray(node.content_cases) ? node.content_cases : []).filter((item) => item?.case_id === read("content_case_id"));
  if (matches.length !== 1) { errors.push("content_case_id 必须绑定唯一冻结用例"); return undefined; }
  const item = matches[0];
  if (read("actual_locale") !== item.locale || !equal(read("actual_inputs"), item.inputs) || !equal(read("actual_content_source"), item.content_source)) {
    errors.push("实际语言、输入及内容来源必须绑定冻结 content_case");
  }
  return item.expected_content;
}

/** 检查 V5 三栈共用目标与实际事实；返回错误供调用者附加场景上下文。 */
export function validateTextFidelity({ node, raw, read, route, region, toleranceDefinitions, actualBounds, actualGlyphBounds, actualBaseline }) {
  const errors = [];
  const typography = node.typography_target ?? {};
  const declaredResources = Array.isArray(node.required_resources) ? node.required_resources : [];
  const frozenBounds = node.target_bounds;
  const targetGlyph = typography.target_glyph_bounds;
  const targetBaseline = typography.baseline;
  const toleranceId = node.tolerance_reference ?? region?.tolerance_reference;
  const runtimeToleranceId = read("tolerance_reference");
  if (!text(toleranceId) || !toleranceDefinitions.has(toleranceId)) errors.push("冻结文本必须引用预声明 tolerance");
  if (runtimeToleranceId !== undefined && runtimeToleranceId !== toleranceId) errors.push("运行 tolerance_reference 必须与冻结引用一致");
  const rules = toleranceDefinitions.get(toleranceId)?.rules ?? {};
  const geometryLimit = limit(rules.geometry, typography.geometry_unit, "geometry", errors);
  if (rules.geometry === undefined) errors.push("冻结 tolerance 必须声明 geometry 规则及单位");
  if (read("actual_geometry_unit") !== typography.geometry_unit || read("actual_coordinate_space") !== typography.logical_coordinate_space) {
    errors.push("实际几何单位和坐标空间必须绑定冻结 geometry_unit 与 logical_coordinate_space");
  }

  // 例外仅覆盖真正的目标差异；来源身份、字段有效性和输入绑定不可被例外豁免。
  const nodeExceptions = node.approved_exception_ids ?? [];
  const regionExceptions = region?.approved_exception_ids ?? [];
  if (!Array.isArray(nodeExceptions) || !Array.isArray(regionExceptions)) errors.push("冻结 approved_exception_ids 必须是数组");
  const approved = new Set([...(Array.isArray(nodeExceptions) ? nodeExceptions : []), ...(Array.isArray(regionExceptions) ? regionExceptions : [])]);
  const exceptionIds = read("exception_ids") ?? [];
  if (!Array.isArray(exceptionIds) || exceptionIds.some((id) => !text(id) || !approved.has(id))) errors.push("exception ID 未被合同批准");
  const exception = Array.isArray(exceptionIds) && exceptionIds.length > 0 && exceptionIds.every((id) => text(id) && approved.has(id));

  validateMirrors(raw, [
    ["target_bounds", frozenBounds], ["candidate_bounds", actualBounds],
    ["target_glyph_bounds", targetGlyph], ["candidate_glyph_bounds", actualGlyphBounds],
    ["target_baseline", targetBaseline], ["candidate_baseline", actualBaseline],
    ["targetBounds", frozenBounds], ["candidateBounds", actualBounds],
    ["targetGlyphBounds", targetGlyph], ["candidateGlyphBounds", actualGlyphBounds],
    ["targetBaseline", targetBaseline], ["candidateBaseline", actualBaseline],
  ], errors);

  const differences = [];
  if (geometryLimit !== null) compare(frozenBounds, actualBounds, geometryLimit, "bounds", differences);
  if (route !== "image-text" && geometryLimit !== null) {
    compare(targetGlyph, actualGlyphBounds, geometryLimit, "glyph_bounds", differences);
    if (!validBaselinePair(targetBaseline, actualBaseline)) errors.push("baseline 必须具有与冻结目标相同的有效类型和结构");
    else compare(targetBaseline, actualBaseline, geometryLimit, "baseline", differences);
  }
  if (route === "image-text" && actualGlyphBounds !== undefined && geometryLimit !== null) {
    // 图片没有字形排版，但如果采集了可见内容框，仍应核对冻结目标。
    compare(targetGlyph, actualGlyphBounds, geometryLimit, "glyph_bounds", differences);
  }

  if (route === "image-text") {
    const paths = declaredResources.filter((resource) => ["image", "image-text", "raster-image", "sprite"].includes(resource?.kind)).map((resource) => resource.path);
    if (!text(read("actual_image_path")) || !paths.includes(read("actual_image_path"))) errors.push("actual_image_path 必须绑定冻结图片资源");
    if (!equal(read("actual_semantic"), node.accessible_semantic)) errors.push("actual_semantic 必须绑定冻结可访问语义");
  } else {
    const expected = expectedContent(node, read, errors);
    if (!text(read("actual_content")) || read("actual_content") !== expected) errors.push("actual_content 必须与冻结用例预期内容一致");
    const resources = fontResourcePaths(declaredResources, errors);
    const usedFonts = read("actual_font_resources");
    if (!Array.isArray(usedFonts) || usedFonts.length === 0 || new Set(usedFonts).size !== usedFonts.length || usedFonts.some((path) => !text(path) || !resources.includes(path))
        || resources.some((path) => !usedFonts.includes(path))) {
      errors.push("actual_font_resources 必须完整绑定冻结字体或位图字体资源");
    }
    const actual = read("actual_typography");
    if (!object(actual)) errors.push("缺少 actual_typography 实际排版事实");
    else {
      const identity = typography.font_identity ?? {};
      const family = identity.status === "resolved" ? identity.family : node.font_resolution?.family;
      if (!text(family) || !text(actual.font_family)) errors.push("字体身份或冻结替代方案缺少 family");
      else if (actual.font_family !== family) differences.push("font_family");
      const fields = ["font_size", "font_size_unit", "font_weight", "font_style", "line_height", "letter_spacing", "alignment", "fill", "stroke", "shadow", "wrap", "line_count"];
      const numericFields = new Set(["font_size", "font_weight", "line_height", "letter_spacing", "line_count"]);
      if (rules.typography !== undefined && !object(rules.typography)) errors.push("typography 容差必须为按属性声明的对象");
      if (object(rules.typography)) for (const name of Object.keys(rules.typography)) {
        if (!numericFields.has(name)) errors.push(`typography.${name} 不支持数值容差`);
      }
      for (const name of fields) {
        const target = name === "line_count" ? typography.expected_line_count : typography[name];
        if (target === undefined || !validStyle(actual[name]) || !sameShape(target, actual[name])
            || (name === "line_count" && (!Number.isInteger(actual[name]) || actual[name] < 1))
            || (name === "font_size_unit" && actual[name] !== target)
            || (["font_size", "line_height"].includes(name) && (!validMeasure(target, typography.font_size_unit) || !validMeasure(actual[name], typography.font_size_unit)))) {
          errors.push(`actual_typography.${name} 缺失或无效`); continue;
        }
        const unit = name === "font_weight" ? "weight" : name === "line_count" ? "count" : typography.font_size_unit;
        const allowed = limit(rules.typography?.[name], unit, `typography.${name}`, errors);
        if (allowed !== null) compare(target, actual[name], allowed, name, differences);
      }
    }
    if (route === "hybrid") {
      const images = declaredResources.filter((resource) => ["image", "image-text", "raster-image", "sprite", "visual-effect", "effect"].includes(resource?.kind)).map((resource) => resource.path);
      if (!text(read("actual_image_path")) || !images.includes(read("actual_image_path"))) errors.push("hybrid 的 actual_image_path 必须绑定冻结视觉资源");
    }
  }
  if (differences.length && !exception) errors.push(`文本 target/candidate 差异超出预声明 tolerance 或存在未批准差异: ${differences.join(", ")}`);
  return errors;
}
