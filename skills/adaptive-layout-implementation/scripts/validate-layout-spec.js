#!/usr/bin/env node
"use strict";

/** 确定性验证两阶段布局规格的结构、关系复算和证据元数据。 */

const fs = require("node:fs");
const YAML = require("../../app-skill-runtime/dependencies.cjs")("yaml");

const COMMON_FIELDS = [
  "phase", "page", "regions", "breakpoints", "content", "system_avoidance",
  "scroll", "text_behavior", "overlays", "implementation", "invariants",
  "implementation_signals", "evidence_matrix",
];
const SIGNALS = new Set(["Stack", "Positioned", "fixed_width", "fixed_height", "floating", "single_line_truncation", "handwritten_breakpoint"]);
const H_TYPES = new Set(["start", "end", "center", "intentionally-offset"]);
const V_TYPES = new Set(["top", "bottom", "center", "intentionally-offset"]);
const ABSOLUTE_RELATION = /^\s*[xy]\s*=/;
const RELATION_OPERATOR = /(?:==|<=|>=|<|>)/;
const SEMANTIC_REFERENCE = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/;
const COORDINATE_REFERENCE = /^\s*(?:left|top|right|bottom|x|y)\s*:/i;
const SHA256 = /^[0-9a-f]{64}$/;
const CODE_SHA = /^[0-9a-f]{40,64}$/;
const ORIENTATIONS = new Set(["portrait", "landscape"]);
const LOCALES = new Set(["default", "longest_copy"]);
const SAFE_AREAS = new Set(["zero", "nonzero"]);
const ACTION_STATES = new Set(["default", "disabled", "submitting"]);
const OVERLAY_BEHAVIORS = new Set(["fixed", "floating", "pinned", "docked"]);
const TEXT_FALLBACK_ORDER = ["widen-container", "reflow-parent", "grow-height", "semantic-wrap"];

/** 累积错误，保证一次验证能返回全部确定性缺口。 */
class ValidationErrors {
  /** 初始化错误列表。 */
  constructor() {
    this.items = [];
  }

  /** 条件失败时记录错误。 */
  require(condition, message) {
    if (!condition) {
      this.items.push(message);
    }
  }
}

/** 把未知 YAML 节点安全收窄为映射。 */
function mapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** 把未知 YAML 节点安全收窄为列表。 */
function sequence(value) {
  return Array.isArray(value) ? value : [];
}

/** 判断字段是否为非空文本。 */
function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** 判断字段是否为有限数值且排除布尔值。 */
function number(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** 按原验证器的相对与绝对容差语义比较两个有限数值。 */
function isClose(left, right, absTolerance = 0, relativeTolerance = 1e-9) {
  return Math.abs(left - right) <= Math.max(
    relativeTolerance * Math.max(Math.abs(left), Math.abs(right)),
    absTolerance,
  );
}

/** 判断左侧集合是否为右侧集合的子集。 */
function isSubset(left, right) {
  return [...left].every((value) => right.has(value));
}

/** 判断关系式是否引用语义节点/边界并包含可比较运算符。 */
function semanticRelation(value) {
  return text(value) && value.includes(".") && RELATION_OPERATOR.test(value) && !ABSOLUTE_RELATION.test(value);
}

/** 验证锚点使用语义参照，而不是裸坐标或空映射。 */
function validateAnchor(value, path, errors) {
  const anchor = mapping(value);
  errors.require(text(anchor.relation), `${path}.relation is required`);
  const reference = anchor.reference;
  errors.require(
    typeof reference === "string"
      && SEMANTIC_REFERENCE.test(reference.trim())
      && !COORDINATE_REFERENCE.test(reference),
    `${path}.reference must be a stable semantic identifier or dotted boundary`,
  );
}

/** 验证页面区域及双轴锚点。 */
function validateRegions(spec, errors) {
  const regions = sequence(spec.regions);
  errors.require(regions.length > 0, "regions must be non-empty");
  regions.forEach((raw, index) => {
    const region = mapping(raw);
    const path = `regions[${index}]`;
    errors.require(text(region.id), `${path}.id is required`);
    errors.require(text(region.role), `${path}.role is required`);
    const anchors = mapping(region.anchors);
    for (const axis of ["horizontal", "vertical"]) {
      const axisAnchors = mapping(anchors[axis]);
      errors.require(Object.keys(axisAnchors).length > 0, `${path}.anchors.${axis} is required`);
      for (const [name, anchor] of Object.entries(axisAnchors)) {
        validateAnchor(anchor, `${path}.anchors.${axis}.${name}`, errors);
      }
    }
    const sizes = mapping(region.size);
    errors.require(Object.keys(sizes).length > 0, `${path}.size is required`);
    for (const tier of ["min", "preferred", "max"]) {
      const size = mapping(sizes[tier]);
      errors.require("width" in size && "height" in size, `${path}.size.${tier} requires width and height`);
    }
    for (const dimension of ["width", "height"]) {
      const values = ["min", "preferred", "max"].map((tier) => mapping(sizes[tier])[dimension]);
      if (values.every(number)) {
        errors.require(values[0] <= values[1] && values[1] <= values[2], `${path}.size.${dimension} must satisfy min <= preferred <= max`);
      }
    }
  });
}

/** 验证不同文本角色的断行语义、反规避约束及压力测试绑定。 */
function validateTextLineBreak(textBehavior, errors) {
  errors.require(!("wrap" in textBehavior), "text_behavior.wrap is obsolete; use text_behavior.line_break");
  const contract = mapping(textBehavior.line_break);
  errors.require(Object.keys(contract).length > 0, "text_behavior.line_break must be a non-empty mapping");
  const checks = [
    ["width_constraint", contract.width_constraint, "bounded-by-parent"],
    ["body.strategy", mapping(contract.body).strategy, "natural-soft-wrap"],
    ["heading.strategy", mapping(contract.heading).strategy, "phrase-aware"],
    ["heading.orphan_control", mapping(contract.heading).orphan_control, "prevent"],
    ["critical_copy.strategy", mapping(contract.critical_copy).strategy, "phrase-aware"],
    ["critical_copy.orphan_control", mapping(contract.critical_copy).orphan_control, "prevent"],
    ["control_label.breaking", mapping(contract.control_label).breaking, "forbidden"],
    ["control_label.fallback", mapping(contract.control_label).fallback, "expand-parent-or-reflow"],
    ["atomic_text.breaking", mapping(contract.atomic_text).breaking, "forbidden"],
    ["dynamic_container.fixed_height", mapping(contract.dynamic_container).fixed_height, "forbidden"],
    ["dynamic_container.truncation", mapping(contract.dynamic_container).truncation, "forbidden"],
    ["anti_hacks.manual_line_breaks", mapping(contract.anti_hacks).manual_line_breaks, "forbidden"],
    ["anti_hacks.fitted_box", mapping(contract.anti_hacks).fitted_box, "forbidden"],
    ["anti_hacks.font_shrink", mapping(contract.anti_hacks).font_shrink, "forbidden"],
  ];
  for (const [path, actual, expected] of checks) {
    errors.require(actual === expected, `text_behavior.line_break.${path} must be ${expected}`);
  }
  const fallbackOrder = sequence(contract.fallback_order);
  errors.require(
    fallbackOrder.length === TEXT_FALLBACK_ORDER.length
      && fallbackOrder.every((value, index) => value === TEXT_FALLBACK_ORDER[index]),
    `text_behavior.line_break.fallback_order must equal ['widen-container', 'reflow-parent', 'grow-height', 'semantic-wrap']`,
  );
  const testIds = sequence(contract.test_ids);
  errors.require(testIds.length > 0 && testIds.every(text), "text_behavior.line_break.test_ids must be a non-empty string list");
  return new Set(testIds.filter(text));
}

/** 验证 sketch 与 fidelity 共用的结构合同。 */
function validateCommon(spec, errors) {
  for (const field of COMMON_FIELDS) {
    errors.require(field in spec, `${field} is required`);
  }
  const page = mapping(spec.page);
  errors.require(text(page.id), "page.id is required");
  for (const field of ["min_width", "max_width", "min_height", "max_height"]) {
    errors.require(number(page[field]) && page[field] > 0, `page.${field} must be positive`);
  }
  if (["min_width", "max_width"].every((field) => number(page[field]))) {
    errors.require(page.min_width <= page.max_width, "page width range is invalid");
  }
  if (["min_height", "max_height"].every((field) => number(page[field]))) {
    errors.require(page.min_height <= page.max_height, "page height range is invalid");
  }
  const pageOrientations = new Set(sequence(page.orientations));
  errors.require(isSubset(new Set(["portrait", "landscape"]), pageOrientations), "page.orientations must include portrait and landscape");
  validateRegions(spec, errors);

  const breakpoints = sequence(spec.breakpoints);
  errors.require(breakpoints.length > 0, "breakpoints must be non-empty");
  const breakpointById = new Map();
  breakpoints.forEach((raw, index) => {
    const item = mapping(raw);
    for (const field of ["id", "axis", "reason", "change", "fallback"]) {
      errors.require(text(item[field]), `breakpoints[${index}].${field} is required`);
    }
    errors.require(item.axis === "width" || item.axis === "height", `breakpoints[${index}].axis must be width or height`);
    errors.require(number(item.value) && item.value > 0, `breakpoints[${index}].value must be positive`);
    errors.require(sequence(item.preserves).length > 0, `breakpoints[${index}].preserves must be non-empty`);
    if (text(item.id)) {
      errors.require(!breakpointById.has(item.id), `duplicate breakpoint id: ${item.id}`);
      breakpointById.set(item.id, item);
    }
  });

  for (const field of ["content", "system_avoidance", "scroll", "text_behavior", "implementation"]) {
    errors.require(Object.keys(mapping(spec[field])).length > 0, `${field} must be a non-empty mapping`);
  }
  const content = mapping(spec.content);
  errors.require(number(content.max_width) && content.max_width > 0, "content.max_width must be positive");
  const columns = mapping(content.columns);
  for (const field of ["min", "preferred", "max", "min_item_width"]) {
    errors.require(number(columns[field]) && columns[field] > 0, `content.columns.${field} must be positive`);
  }
  if (["min", "preferred", "max"].every((field) => number(columns[field]))) {
    errors.require(columns.min <= columns.preferred && columns.preferred <= columns.max, "content.columns must satisfy min <= preferred <= max");
  }
  for (const group of ["gutter", "margins"]) {
    const values = mapping(content[group]);
    for (const field of ["min", "preferred", "max"]) {
      errors.require(number(values[field]) && values[field] > 0, `content.${group}.${field} must be positive`);
    }
    if (["min", "preferred", "max"].every((field) => number(values[field]))) {
      errors.require(values.min <= values.preferred && values.preferred <= values.max, `content.${group} must satisfy min <= preferred <= max`);
    }
  }
  errors.require(text(content.insufficient_width_fallback), "content.insufficient_width_fallback is required");

  const avoidance = mapping(spec.system_avoidance);
  for (const field of ["safe_area", "system_bars", "keyboard", "fold", "split"]) {
    errors.require(Object.keys(mapping(avoidance[field])).length > 0, `system_avoidance.${field} is required`);
  }
  const scroll = mapping(spec.scroll);
  for (const axis of ["vertical", "horizontal"]) {
    const axisScroll = mapping(scroll[axis]);
    for (const field of ["owner", "semantics", "narrow_height_fallback"]) {
      errors.require(text(axisScroll[field]), `scroll.${axis}.${field} is required`);
    }
  }

  const textBehavior = mapping(spec.text_behavior);
  errors.require(
    isSubset(new Set(["default", "longest_copy"]), new Set(sequence(textBehavior.localization))),
    "text_behavior.localization must include default and longest_copy",
  );
  for (const field of ["rtl", "growth"]) {
    errors.require(text(textBehavior[field]), `text_behavior.${field} is required`);
  }
  const declaredLineBreakTests = validateTextLineBreak(textBehavior, errors);
  const textScale = mapping(textBehavior.text_scale);
  const defaultScale = textScale.default;
  const largeScale = textScale.large;
  errors.require(number(defaultScale) && defaultScale > 0, "text_behavior.text_scale.default must be positive");
  errors.require(number(largeScale) && largeScale > 1, "text_behavior.text_scale.large must be greater than 1");
  if (number(defaultScale) && number(largeScale)) {
    errors.require(!isClose(defaultScale, largeScale), "text_behavior text scales must differ");
  }
  errors.require(textBehavior.critical_actions_allow_truncation === false, "critical actions must not allow truncation");

  sequence(spec.overlays).forEach((raw, index) => {
    const overlay = mapping(raw);
    const path = `overlays[${index}]`;
    for (const field of ["id", "behavior", "occlusion", "keyboard_fallback", "narrow_height_fallback"]) {
      errors.require(text(overlay[field]), `${path}.${field} is required`);
    }
    errors.require(OVERLAY_BEHAVIORS.has(overlay.behavior), `${path}.behavior must be fixed, floating, pinned, or docked`);
    validateAnchor(overlay.anchor, `${path}.anchor`, errors);
    const hitTarget = mapping(overlay.hit_target);
    for (const field of ["min_width", "min_height"]) {
      errors.require(number(hitTarget[field]) && hitTarget[field] > 0, `${path}.hit_target.${field} must be positive`);
    }
  });

  const implementation = mapping(spec.implementation);
  for (const field of ["breakpoint_resolver", "root_layout"]) {
    errors.require(text(implementation[field]), `implementation.${field} is required`);
  }
  const primitives = sequence(implementation.constraint_primitives);
  errors.require(primitives.length > 0 && primitives.every(text), "implementation.constraint_primitives must be a non-empty string list");

  const invariants = sequence(spec.invariants);
  errors.require(invariants.length > 0, "invariants must be non-empty");
  const invariantTests = new Set();
  invariants.forEach((raw, index) => {
    const item = mapping(raw);
    errors.require(text(item.id) && text(item.relation), `invariants[${index}] requires id and relation`);
    const tests = sequence(item.test_ids);
    errors.require(tests.length > 0 && tests.every(text), `invariants[${index}].test_ids must be non-empty`);
    tests.filter(text).forEach((testId) => invariantTests.add(testId));
  });

  const cases = sequence(mapping(spec.evidence_matrix).cases);
  errors.require(cases.length > 0, "evidence_matrix.cases must be non-empty");
  const executed = new Set();
  const edgeOffsets = new Map();
  const matrixValues = new Map();
  const heightsByWidth = new Map();
  const lineBreakStressTests = new Set();
  for (const field of ["orientation", "locale", "safe_area", "action_state", "text_scale"]) {
    matrixValues.set(field, new Set());
  }
  cases.forEach((raw, index) => {
    const evidenceCase = mapping(raw);
    const path = `evidence_matrix.cases[${index}]`;
    for (const field of ["id", "orientation", "locale", "safe_area", "action_state"]) {
      errors.require(text(evidenceCase[field]), `${path}.${field} is required`);
    }
    errors.require(ORIENTATIONS.has(evidenceCase.orientation), `${path}.orientation is invalid`);
    errors.require(LOCALES.has(evidenceCase.locale), `${path}.locale is invalid`);
    errors.require(SAFE_AREAS.has(evidenceCase.safe_area), `${path}.safe_area is invalid`);
    errors.require(ACTION_STATES.has(evidenceCase.action_state), `${path}.action_state is invalid`);
    for (const field of ["width", "height", "text_scale"]) {
      errors.require(number(evidenceCase[field]), `${path}.${field} must be numeric`);
    }
    for (const field of ["orientation", "locale", "safe_area", "action_state", "text_scale"]) {
      matrixValues.get(field).add(evidenceCase[field]);
    }
    if (number(evidenceCase.width) && number(evidenceCase.height)) {
      const heights = heightsByWidth.get(evidenceCase.width) ?? new Set();
      heights.add(evidenceCase.height);
      heightsByWidth.set(evidenceCase.width, heights);
    }
    const tests = sequence(evidenceCase.test_ids);
    errors.require(tests.length > 0 && tests.every(text), `${path}.test_ids must be a non-empty string list`);
    tests.filter(text).forEach((testId) => executed.add(testId));
    if (evidenceCase.locale === "longest_copy" && evidenceCase.text_scale === largeScale) {
      tests.filter(text).forEach((testId) => lineBreakStressTests.add(testId));
    }
    const edge = mapping(evidenceCase.breakpoint_edge);
    if (text(edge.id) && [-1, 0, 1].includes(edge.offset)) {
      const offsets = edgeOffsets.get(edge.id) ?? new Set();
      offsets.add(edge.offset);
      edgeOffsets.set(edge.id, offsets);
      const breakpoint = breakpointById.get(edge.id);
      errors.require(breakpoint !== undefined, `${path}.breakpoint_edge.id is unknown`);
      if (breakpoint !== undefined && number(breakpoint.value)) {
        const axis = breakpoint.axis;
        errors.require(axis === "width" || axis === "height", `breakpoint ${edge.id} axis must be width or height`);
        if ((axis === "width" || axis === "height") && number(evidenceCase[axis])) {
          const expected = breakpoint.value + edge.offset;
          errors.require(isClose(evidenceCase[axis], expected, 1e-9), `${path}.${axis} must equal breakpoint value + offset (${expected})`);
        }
      }
    }
  });
  errors.require(isSubset(invariantTests, executed), "every invariant test_id must execute in evidence_matrix");
  errors.require(isSubset(declaredLineBreakTests, invariantTests), "every text line-break test_id must be declared by invariants");
  errors.require(isSubset(declaredLineBreakTests, lineBreakStressTests), "every text line-break test_id must execute with longest_copy and large text scale");
  errors.require(isSubset(new Set(["portrait", "landscape"]), matrixValues.get("orientation")), "evidence_matrix must cover portrait and landscape");
  errors.require(isSubset(new Set(["default", "longest_copy"]), matrixValues.get("locale")), "evidence_matrix must cover default and longest_copy");
  errors.require(isSubset(new Set(["zero", "nonzero"]), matrixValues.get("safe_area")), "evidence_matrix must cover zero and nonzero safe areas");
  errors.require(isSubset(new Set(["default", "disabled", "submitting"]), matrixValues.get("action_state")), "evidence_matrix must cover all critical action states");
  if (number(defaultScale) && number(largeScale)) {
    errors.require(isSubset(new Set([defaultScale, largeScale]), matrixValues.get("text_scale")), "evidence_matrix must cover declared default and large text scales");
  }
  errors.require([...heightsByWidth.values()].some((heights) => heights.size > 1), "evidence_matrix must cover same width with different heights");
  for (const raw of sequence(spec.breakpoints)) {
    const breakpoint = mapping(raw);
    const identifier = breakpoint.id;
    errors.require(text(identifier), "every breakpoint requires id");
    if (text(identifier)) {
      const offsets = edgeOffsets.get(identifier) ?? new Set();
      errors.require(offsets.size === 3 && [-1, 0, 1].every((value) => offsets.has(value)), `breakpoint ${identifier} requires b-1/b/b+1 evidence`);
    }
  }
  return [invariantTests, executed];
}

/** 验证几何中心、可见光学中心及偏移证据。 */
function validateOptical(optical, path, errors) {
  for (const field of ["offset_x", "offset_y"]) {
    errors.require(number(optical[field]), `${path}.${field} must be numeric`);
  }
  errors.require(text(optical.node_or_container_center), `${path}.node_or_container_center is required`);
  errors.require(text(optical.visible_optical_center), `${path}.visible_optical_center is required`);
  errors.require(optical.unresolved === false, `${path}.unresolved must be false`);
  const nonzero = ["offset_x", "offset_y"].some((field) => number(optical[field]) && !isClose(optical[field], 0, 1e-9));
  if (nonzero) {
    errors.require(text(optical.evidence), `${path}.evidence is required for non-zero optical offset`);
  }
}

/** 验证 target/Flutter 边界并复算中心。 */
function validateGeometry(geometry, path, errors) {
  for (const side of ["target", "flutter"]) {
    const item = mapping(geometry[side]);
    for (const field of ["x", "y", "width", "height", "center_x", "center_y", "reference_center_x", "reference_center_y"]) {
      errors.require(number(item[field]), `${path}.${side}.${field} must be numeric`);
    }
    for (const field of ["width", "height"]) {
      errors.require(number(item[field]) && item[field] > 0, `${path}.${side}.${field} must be positive`);
    }
    if (["x", "width", "center_x"].every((field) => number(item[field]))) {
      errors.require(isClose(item.center_x, item.x + item.width / 2, 1e-6), `${path}.${side}.center_x must be recomputable`);
    }
    if (["y", "height", "center_y"].every((field) => number(item[field]))) {
      errors.require(isClose(item.center_y, item.y + item.height / 2, 1e-6), `${path}.${side}.center_y must be recomputable`);
    }
  }
}

/** 验证 fidelity 的 target↔Flutter 关键对齐合同。 */
function validateAlignments(spec, errors) {
  const alignments = sequence(spec.critical_alignments);
  errors.require(alignments.length > 0, "fidelity critical_alignments must be non-empty");
  const testIds = new Set();
  const identifiers = new Set();
  const flutterKeys = new Set();
  alignments.forEach((raw, index) => {
    const item = mapping(raw);
    const path = `critical_alignments[${index}]`;
    for (const field of ["id", "element", "flutter_key", "reference", "reference_flutter_key"]) {
      errors.require(text(item[field]), `${path}.${field} is required`);
    }
    if (text(item.id)) {
      errors.require(!identifiers.has(item.id), `duplicate critical alignment id: ${item.id}`);
      identifiers.add(item.id);
    }
    if (text(item.flutter_key)) {
      errors.require(!flutterKeys.has(item.flutter_key), `duplicate critical alignment flutter_key: ${item.flutter_key}`);
      flutterKeys.add(item.flutter_key);
    }
    const relations = mapping(item.relations);
    for (const [axis, accepted] of [["horizontal", H_TYPES], ["vertical", V_TYPES]]) {
      const relation = mapping(relations[axis]);
      errors.require(accepted.has(relation.type), `${path}.relations.${axis}.type is invalid`);
      for (const side of ["target", "flutter"]) {
        errors.require(semanticRelation(relation[side]), `${path}.relations.${axis}.${side} must contain a semantic boundary expression and relation operator`);
      }
    }
    const geometry = mapping(item.geometry);
    validateGeometry(geometry, `${path}.geometry`, errors);
    const delta = mapping(item.delta);
    const tolerance = item.tolerance_logical_px;
    errors.require(number(tolerance) && tolerance >= 0 && tolerance <= 1, `${path}.tolerance_logical_px must be between 0 and 1`);
    const target = mapping(geometry.target);
    const flutter = mapping(geometry.flutter);
    for (const [axis, center, reference] of [["horizontal", "center_x", "reference_center_x"], ["vertical", "center_y", "reference_center_y"]]) {
      errors.require(number(delta[axis]), `${path}.delta.${axis} must be numeric`);
      const fields = [target[center], target[reference], flutter[center], flutter[reference], delta[axis]];
      if (fields.every(number)) {
        const expected = (fields[2] - fields[3]) - (fields[0] - fields[1]);
        errors.require(isClose(fields[4], expected, 1e-6), `${path}.delta.${axis} must equal Flutter/target relative-center difference`);
        if (number(tolerance)) {
          errors.require(Math.abs(fields[4]) <= tolerance, `${path}.delta.${axis} exceeds tolerance`);
        }
      }
    }
    validateOptical(mapping(item.optical), `${path}.optical`, errors);
    const evidence = mapping(item.evidence);
    for (const field of ["target_screenshot", "flutter_screenshot", "actual_measurement_output"]) {
      errors.require(text(evidence[field]), `${path}.evidence.${field} is required`);
    }
    const ids = sequence(item.test_ids);
    errors.require(ids.length > 0 && ids.every(text), `${path}.test_ids must be non-empty`);
    ids.filter(text).forEach((value) => testIds.add(value));
    const parityIds = sequence(item.parity_case_ids);
    errors.require(parityIds.length > 0 && parityIds.every(text), `${path}.parity_case_ids must be non-empty`);
  });
  return testIds;
}

/** 验证视觉 parity case 对单一冻结目标及候选快照的绑定。 */
function validateParity(spec, errors) {
  const cases = sequence(spec.parity_cases);
  errors.require(cases.length > 0, "fidelity parity_cases must be non-empty");
  const identifiers = new Set();
  cases.forEach((raw, index) => {
    const item = mapping(raw);
    const path = `parity_cases[${index}]`;
    for (const field of ["id", "state", "orientation", "target_sha256", "candidate_code_sha", "target_screenshot", "flutter_screenshot"]) {
      errors.require(text(item[field]), `${path}.${field} is required`);
    }
    errors.require(typeof item.target_sha256 === "string" && SHA256.test(item.target_sha256), `${path}.target_sha256 must be a 64-character lowercase SHA-256`);
    errors.require(typeof item.candidate_code_sha === "string" && CODE_SHA.test(item.candidate_code_sha), `${path}.candidate_code_sha must be a 40-64 character lowercase commit/content SHA`);
    errors.require(item.orientation === "portrait" || item.orientation === "landscape", `${path}.orientation must be portrait or landscape`);
    const viewport = mapping(item.viewport);
    errors.require(number(viewport.width) && viewport.width > 0, `${path}.viewport.width must be positive`);
    errors.require(number(viewport.height) && viewport.height > 0, `${path}.viewport.height must be positive`);
    if (text(item.id)) {
      errors.require(!identifiers.has(item.id), `duplicate parity case id: ${item.id}`);
      identifiers.add(item.id);
    }
  });
  return identifiers;
}

/** 验证实现信号，并返回需人工关注的信号名称。 */
function validateSignals(spec, invariantTests, executed, errors) {
  const attention = new Set();
  sequence(spec.implementation_signals).forEach((raw, index) => {
    const item = mapping(raw);
    const signal = item.signal;
    errors.require(SIGNALS.has(signal), `implementation_signals[${index}].signal is invalid`);
    for (const field of ["reason", "boundary", "fallback"]) {
      errors.require(text(item[field]), `implementation_signals[${index}].${field} is required`);
    }
    const testIds = sequence(item.test_ids);
    errors.require(testIds.length > 0 && testIds.every(text), `implementation_signals[${index}].test_ids is required`);
    const declared = new Set(testIds.filter(text));
    errors.require(isSubset(declared, invariantTests), `implementation_signals[${index}].test_ids must be declared by invariants`);
    errors.require(isSubset(declared, executed), `implementation_signals[${index}].test_ids must execute in evidence_matrix`);
    if (signal === "Positioned") {
      errors.require(text(item.viewport_scope), `implementation_signals[${index}].viewport_scope is required`);
    }
    if (SIGNALS.has(signal)) {
      attention.add(signal);
    }
  });
  return attention;
}

/** 执行完整验证并返回错误与实现关注信号。 */
function validate(spec) {
  const errors = new ValidationErrors();
  const [invariantTests, commonExecuted] = validateCommon(spec, errors);
  let executed = commonExecuted;
  const phase = spec.phase;
  errors.require(phase === "sketch" || phase === "fidelity", "phase must be sketch or fidelity");
  if (phase === "sketch") {
    // sketch 不得预填未来视觉证据，避免把尚未发生的 parity 伪装为已验证事实。
    errors.require(!("critical_alignments" in spec), "sketch must not contain critical_alignments");
    errors.require(!("parity_cases" in spec), "sketch must not contain parity_cases");
  } else if (phase === "fidelity") {
    const alignmentTests = validateAlignments(spec, errors);
    const parityIds = validateParity(spec, errors);
    executed = new Set(
      sequence(mapping(spec.evidence_matrix).cases)
        .flatMap((evidenceCase) => sequence(mapping(evidenceCase).test_ids))
        .filter(text),
    );
    errors.require(isSubset(alignmentTests, executed), "every critical alignment test_id must execute in evidence_matrix");
    sequence(spec.critical_alignments).forEach((raw, index) => {
      const bound = new Set(sequence(mapping(raw).parity_case_ids));
      errors.require(bound.size > 0 && isSubset(bound, parityIds), `critical_alignments[${index}] references unknown parity case`);
    });
  }
  const attention = validateSignals(spec, invariantTests, executed, errors);
  return [errors.items, attention];
}

/** 输出命令行用法，与原 argparse 的单参数入口保持一致。 */
function printUsage(stream) {
  stream.write("usage: validate-layout-spec.js [-h] spec\n");
}

/** 读取 YAML、运行验证并输出 CI 可用结果。 */
function main(argv = process.argv.slice(2)) {
  if (argv.includes("-h") || argv.includes("--help")) {
    printUsage(process.stdout);
    process.stdout.write("\npositional arguments:\n  spec        layout-spec.yaml path\n");
    return 0;
  }
  if (argv.length !== 1) {
    printUsage(process.stderr);
    process.stderr.write(`validate-layout-spec.js: error: ${argv.length === 0 ? "the following arguments are required: spec" : "unrecognized arguments or too many paths"}\n`);
    return 2;
  }
  const specPath = argv[0];
  let loaded;
  try {
    loaded = YAML.parse(fs.readFileSync(specPath, "utf8"));
  } catch (error) {
    console.log(`[FAIL] cannot read ${specPath}: ${error.message}`);
    return 1;
  }
  if (mapping(loaded) !== loaded) {
    console.log("[FAIL] specification root must be a mapping");
    return 1;
  }
  const [errors, attention] = validate(loaded);
  if (errors.length > 0) {
    errors.forEach((error) => console.log(`[FAIL] ${error}`));
    return 1;
  }
  console.log(`[PASS] ${specPath}`);
  if (attention.size > 0) {
    console.log(`implementation_attention=${[...attention].sort().join(",")}`);
  }
  return 0;
}

module.exports = { validate };

if (require.main === module) {
  process.exitCode = main();
}
