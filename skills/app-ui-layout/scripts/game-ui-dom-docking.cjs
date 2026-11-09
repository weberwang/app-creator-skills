"use strict";

const { validateGameUiPositionDriver } = require("./relative-layout-policy.cjs");

/** 判断原生计算样式中的有效非空文本。 */
function text(value) { return typeof value === "string" && value.trim().length > 0; }

/** 验证游戏 DOM HUD 的实际定位机制；数据必须由真实 DOM 回读，不能据此认证采集来源。 */
function validateGameDomDocking(node, snapshot, { grouped = false, label = "DOM HUD" } = {}) {
  const errors = [];
  const ui = node.ui_layout ?? {};
  const driver = node.layout_execution?.position_driver;
  const parentId = node.parent_layout_node_id ?? node.parentLayoutNodeId;
  const referenceId = node.layout_execution?.reference_id;
  const nativeParent = referenceId === parentId && !grouped;
  const baseDrivers = snapshot.renderer === "DOM" && nativeParent ? ["DOM_LAYOUT"] : ["SHARED"];
  if (ui.renderer !== undefined && ui.renderer !== snapshot.renderer) errors.push(`${label} 正式渲染路线与实际 DOM/HUD 快照不一致。`);
  errors.push(...validateGameUiPositionDriver({ driver, nativeDriver: snapshot.renderer === "DOM" ? "DOM_LAYOUT" : null, sharedAllowed: !nativeParent,
    behavior: ui.position_behavior, baseDrivers }, label));
  if (snapshot.renderer !== "DOM") {
    if (driver === "DOM_LAYOUT") errors.push(`${label} DOM_LAYOUT 必须来自实际 DOM 节点。`);
    return errors;
  }
  if (driver !== "DOM_LAYOUT") return errors;
  const actual = snapshot.dom_layout;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return [...errors, `${label} 缺少实际 dom_layout 计算样式。`];
  if (actual.parent_id !== parentId) errors.push(`${label} 原生 DOM 布局父级错绑。`);
  if (!["static", "relative", "absolute", "fixed", "sticky"].includes(actual.position)) errors.push(`${label} 缺少实际 CSS position。`);
  if (!text(actual.parent_display) || actual.parent_display === "none") errors.push(`${label} 缺少有效的实际父容器 display。`);
  if (["absolute", "fixed"].includes(actual.position)) {
    if (actual.containing_block_id !== parentId) errors.push(`${label} CSS 定位包含块必须绑定实际布局父级。`);
    const inset = actual.inset;
    // 固定边距可以是像素或百分比，但不能只靠绝对矩形反推定位规则。
    const edge = (value) => text(value) && /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)$/.test(value) && Number.isFinite(Number.parseFloat(value));
    if (!inset || ![["left", "right"], ["top", "bottom"]].every((axis) => axis.some((key) => edge(inset[key])))) errors.push(`${label} 原生定位必须具备双轴 inset 停靠依据。`);
  }
  return errors;
}

module.exports = { validateGameDomDocking };
