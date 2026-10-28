import relativeLayoutPolicy from "../../app-ui-layout/scripts/relative-layout-policy.cjs";
const { validateRelativeLayoutNodes } = relativeLayoutPolicy;
import { validateCenterAlignmentNodes } from "./center-alignment.mjs";
import { isBackgroundDisplayNode, isLayoutContainer } from "./display-node-role.mjs";

const POSITION_DRIVERS = new Set(["WIDGET", "SHARED", "LAYOUT", "STATIC", "ANIMATION"]);
const SIZE_DRIVERS = new Set(["SPRITE_RAW", "FIXED", "WIDGET", "LAYOUT", "SHARED", "CONTENT"]);
const LAYOUT_TYPES = new Set(["NONE", "HORIZONTAL", "VERTICAL", "GRID"]);
const RESIZE_MODES = new Set(["NONE", "CHILDREN", "CONTAINER"]);
const STABLE_ROOTS = new Set(["viewport", "safe-area"]);
const EPSILON = 1e-6;
const WIDGET_FLAGS = Object.freeze([
  "is_align_left", "is_align_right", "is_align_top", "is_align_bottom",
  "is_align_horizontal_center", "is_align_vertical_center",
]);
const WIDGET_ABSOLUTES = Object.freeze({
  is_align_left: "is_absolute_left",
  is_align_right: "is_absolute_right",
  is_align_top: "is_absolute_top",
  is_align_bottom: "is_absolute_bottom",
  is_align_horizontal_center: "is_absolute_horizontal_center",
  is_align_vertical_center: "is_absolute_vertical_center",
});

/** 判断值是否为普通对象，数组不能冒充组件快照。 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 判断是否为非空节点 ID。 */
function isId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** 读取工作流已使用的蛇形或驼峰字段，不改写原节点。 */
function readField(value, snake, camel, fallback) {
  return value?.[snake] ?? value?.[camel] ?? fallback;
}

/** 比较有限数值时吸收矩阵计算中的浮点尾差。 */
function sameNumber(actual, expected) {
  return Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= EPSILON;
}

/** 判断运行时矩形是否具有有限坐标和正尺寸。 */
function isBounds(value) {
  return isRecord(value)
    && [value.x, value.y, value.width, value.height].every(Number.isFinite)
    && value.width > 0 && value.height > 0;
}

/** 比较运行时边界，容忍坐标转换留下的浮点尾差。 */
function sameBounds(actual, expected) {
  return isBounds(actual) && isBounds(expected)
    && ["x", "y", "width", "height"].every((key) => sameNumber(actual[key], expected[key]));
}

/** 比较 JSON 风格布局对象，字段顺序不影响结果。 */
function sameValue(actual, expected) {
  if (actual === expected) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected)
      && actual.length === expected.length
      && actual.every((value, index) => sameValue(value, expected[index]));
  }
  if (!isRecord(actual) || !isRecord(expected)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && sameValue(actual[key], expected[key]));
}

/** 为指定 Widget 对齐生成原生 flag 和偏移映射。 */
function expectedWidgetFields(planWidget) {
  if (!isRecord(planWidget) || !isRecord(planWidget.horizontal) || !isRecord(planWidget.vertical)) return null;
  const expected = Object.fromEntries(WIDGET_FLAGS.map((flag) => [flag, false]));
  const values = {};
  const set = (flag, valueField, value) => {
    expected[flag] = true;
    values[valueField] = value;
  };
  const horizontal = planWidget.horizontal;
  if (horizontal.alignment === "left") set("is_align_left", "left", horizontal.value);
  else if (horizontal.alignment === "right") set("is_align_right", "right", horizontal.value);
  else if (horizontal.alignment === "center") set("is_align_horizontal_center", "horizontal_center", horizontal.value);
  else if (horizontal.alignment === "stretch") {
    set("is_align_left", "left", horizontal.start);
    set("is_align_right", "right", horizontal.end);
  } else return null;

  const vertical = planWidget.vertical;
  if (vertical.alignment === "top") set("is_align_top", "top", vertical.value);
  else if (vertical.alignment === "bottom") set("is_align_bottom", "bottom", vertical.value);
  else if (vertical.alignment === "center") set("is_align_vertical_center", "vertical_center", vertical.value);
  else if (vertical.alignment === "stretch") {
    set("is_align_top", "top", vertical.start);
    set("is_align_bottom", "bottom", vertical.end);
  } else return null;
  if (Object.values(values).some((value) => !Number.isFinite(value))) return null;
  return { flags: expected, values };
}

/** 校验原生 Layout 快照的关键字段与可选 Grid 参数。 */
function validateLayout(value, label, errors) {
  if (value === null) return;
  if (!isRecord(value)) {
    errors.push(`${label} 必须是 null 或 Layout 快照对象`);
    return;
  }
  if (typeof value.enabled !== "boolean") errors.push(`${label}.enabled 必须是布尔值`);
  if (typeof value.type !== "string" || !LAYOUT_TYPES.has(value.type)) errors.push(`${label}.type 只支持 NONE、HORIZONTAL、VERTICAL 或 GRID`);
  if (typeof value.resize_mode !== "string" || !RESIZE_MODES.has(value.resize_mode)) errors.push(`${label}.resize_mode 只支持 NONE、CHILDREN 或 CONTAINER`);
  if (typeof value.align_horizontal !== "boolean") errors.push(`${label}.align_horizontal 必须是布尔值`);
  if (typeof value.align_vertical !== "boolean") errors.push(`${label}.align_vertical 必须是布尔值`);
  if (value.start_axis !== undefined && !["HORIZONTAL", "VERTICAL"].includes(value.start_axis)) errors.push(`${label}.start_axis 只支持 HORIZONTAL 或 VERTICAL`);
  if (value.type === "GRID" && !["HORIZONTAL", "VERTICAL"].includes(value.start_axis)) {
    errors.push(`${label}.start_axis 必须是 HORIZONTAL 或 VERTICAL 才能确定 Grid 布局尺寸行为`);
  }
  if (value.cell_size !== undefined && (!isRecord(value.cell_size)
    || !Number.isFinite(value.cell_size.width) || value.cell_size.width <= 0
    || !Number.isFinite(value.cell_size.height) || value.cell_size.height <= 0)) {
    errors.push(`${label}.cell_size 必须包含有限正数 width/height`);
  }
}

/** 校验仿射矩阵包含有限线性系数。 */
function validateMatrix(value, label, errors) {
  if (!isRecord(value) || ![value.a, value.b, value.c, value.d].every(Number.isFinite)) {
    errors.push(`${label} 必须包含有限 a/b/c/d 矩阵系数`);
    return false;
  }
  return true;
}

/** 判断变换路径是否保持单位缩放、无旋转/斜切。 */
function isIdentityMatrix(value) {
  return isRecord(value) && sameNumber(value.a, 1) && sameNumber(value.b, 0)
    && sameNumber(value.c, 0) && sameNumber(value.d, 1);
}

/** 将不同 Layout 实例的尺寸影响映射到宽高轴，检测交叉覆盖。 */
function layoutSizeAxes(layout, { parent = false } = {}) {
  if (!isRecord(layout) || layout.enabled !== true) return new Set();
  // Creator 的 NONE 不执行布局；Grid 容器只按起始轴决定自身内容尺寸的另一轴。
  if (layout.type === "NONE") return new Set();
  if (parent ? layout.resize_mode !== "CHILDREN" : layout.resize_mode !== "CONTAINER") return new Set();
  if (layout.type === "HORIZONTAL") return new Set(["width"]);
  if (layout.type === "VERTICAL") return new Set(["height"]);
  if (layout.type === "GRID") {
    if (!(["HORIZONTAL", "VERTICAL"].includes(layout.start_axis))) return new Set();
    if (parent) return new Set(["width", "height"]);
    return new Set([layout.start_axis === "HORIZONTAL" ? "height" : "width"]);
  }
  return new Set();
}

/** 按计划检查 RAW 尺寸、目标尺寸和普通图片变换路径。 */
function validateSprite(node, snapshot, label, errors, plan) {
  const geometry = node.sprite_geometry;
  const sprite = snapshot.sprite;
  const target = readField(node, "target_bounds", "targetBounds", node.bounds);
  const transform = snapshot.ui_transform;
  if (!isRecord(target) || ![target.width, target.height].every((value) => Number.isFinite(value) && value > 0)) {
    errors.push(`${label} 对应节点缺少有效 target_bounds`);
  }
  if (geometry == null) {
    if (sprite !== null) errors.push(`${label}.sprite 必须为 null，因为节点没有 sprite_geometry`);
    return;
  }
  if (!isRecord(geometry)) {
    errors.push(`${label} 对应节点 sprite_geometry 必须是对象`);
    return;
  }
  if (!isRecord(sprite)) {
    errors.push(`${label}.sprite 必须提供与 sprite_geometry 对应的 Sprite 快照`);
    return;
  }
  if (sprite.type !== geometry.type || sprite.size_mode !== geometry.size_mode) {
    errors.push(`${label}.sprite 的 type/size_mode 与节点 sprite_geometry 不一致`);
  }
  const original = sprite.original_size;
  if (!isRecord(original) || ![original.width, original.height].every((value) => Number.isFinite(value) && value > 0)) {
    errors.push(`${label}.sprite.original_size 必须包含有限正数 width/height`);
  }
  // 快照缺失或JSON结构损坏时由外层报告后停止本分支，避免读取 null.width 崩溃。
  if (!isRecord(transform)) return;

  const isRaw = geometry.type === "SIMPLE" && geometry.size_mode === "RAW";
  if (isRaw) {
    if (plan.size_driver !== "SPRITE_RAW") errors.push(`${label} 普通 RAW 图片的 size_driver 必须为 SPRITE_RAW`);
    if (!isRecord(original)) return;
    if (!sameNumber(transform.width, original.width) || !sameNumber(transform.height, original.height)) {
      errors.push(`${label} 普通图片的 UITransform 尺寸必须保持 SpriteFrame 原始 contentSize`);
    }
  }
}

/** 将 Widget 计划和运行时六个方向 flag、目标及偏移逐项对照。 */
function validateWidget(plan, snapshot, label, active, errors) {
  const widget = snapshot.widget;
  if (widget === null) {
    if (plan.position_driver === "WIDGET") errors.push(`${label}.widget 缺少计划要求的原生 Widget`);
    return { enabled: false, sizeAxes: new Set() };
  }
  if (!isRecord(widget)) {
    errors.push(`${label}.widget 必须是 null 或原生 Widget 快照对象`);
    return { enabled: false, sizeAxes: new Set() };
  }
  if (typeof widget.enabled !== "boolean") errors.push(`${label}.widget.enabled 必须是布尔值`);
  // 禁用组件也必须完整记录原生状态；ONCE 可被采集，但不能替代冻结的 Widget 驱动计划。
  if (!["ONCE", "ON_WINDOW_RESIZE", "ALWAYS"].includes(widget.align_mode)) {
    errors.push(`${label}.widget.align_mode 必须是 ONCE、ON_WINDOW_RESIZE 或 ALWAYS`);
  }
  for (const flag of WIDGET_FLAGS) {
    if (typeof widget[flag] !== "boolean") errors.push(`${label}.widget.${flag} 必须是布尔值`);
    const absoluteField = WIDGET_ABSOLUTES[flag];
    if (typeof widget[absoluteField] !== "boolean") errors.push(`${label}.widget.${absoluteField} 必须是布尔值`);
  }
  const activeWidget = active && widget.enabled === true;
  if (activeWidget && plan.position_driver !== "WIDGET") {
    errors.push(`${label} 实际启用了 Widget，但 layout_execution.position_driver=${plan.position_driver}，存在位置控制冲突`);
  }
  if (plan.position_driver !== "WIDGET") return { enabled: activeWidget, sizeAxes: new Set() };
  if (active && widget.enabled !== true) {
    errors.push(`${label}.widget.enabled 必须为 true，因为计划由 Widget 控制位置`);
  }
  const planWidget = plan.widget;
  const expected = expectedWidgetFields(planWidget);
  if (!expected) {
    errors.push(`${label}.layout_execution.widget 缺少可映射的 Widget 目标或九点对齐计划`);
    return { enabled: activeWidget, sizeAxes: new Set() };
  }
  if (!isId(planWidget.target_id) || !isId(widget.target_id)) errors.push(`${label}.widget.target_id 必须是非空节点 ID`);
  if (!isId(planWidget.align_mode) || !isId(widget.align_mode)) errors.push(`${label}.widget.align_mode 必须是非空模式`);
  if (widget.target_id !== planWidget.target_id) errors.push(`${label}.widget.target_id 与 layout_execution.widget.target_id 不一致`);
  if (widget.align_mode !== planWidget.align_mode || widget.align_mode === "ALWAYS") {
    errors.push(`${label}.widget.align_mode 必须与计划一致且不能使用 ALWAYS`);
  }
  let flagCountHorizontal = 0;
  let flagCountVertical = 0;
  for (const flag of WIDGET_FLAGS) {
    const enabled = widget[flag] === true;
    if (enabled !== expected.flags[flag]) errors.push(`${label}.widget.${flag} 与 Widget 布局计划不一致`);
    if (flag.startsWith("is_align_")) {
      if (flag === "is_align_left" || flag === "is_align_right" || flag === "is_align_horizontal_center") flagCountHorizontal += Number(enabled);
      else flagCountVertical += Number(enabled);
    }
    if (!enabled) continue;
    const valueField = flag === "is_align_left" ? "left"
      : flag === "is_align_right" ? "right"
        : flag === "is_align_top" ? "top"
          : flag === "is_align_bottom" ? "bottom"
            : flag === "is_align_horizontal_center" ? "horizontal_center" : "vertical_center";
    if (!Number.isFinite(widget[valueField])) errors.push(`${label}.widget.${valueField} 必须是有限偏移`);
    else if (!sameNumber(widget[valueField], expected.values[valueField])) errors.push(`${label}.widget.${valueField} 与冻结布局计划偏移不一致`);
    const absoluteField = WIDGET_ABSOLUTES[flag];
    if (widget[absoluteField] !== true) errors.push(`${label}.widget.${absoluteField} 必须为 true`);
  }
  const horizontalStretch = widget.is_align_left === true && widget.is_align_right === true;
  const verticalStretch = widget.is_align_top === true && widget.is_align_bottom === true;
  if ((flagCountHorizontal > 1 && !horizontalStretch) || (flagCountVertical > 1 && !verticalStretch)) {
    errors.push(`${label}.widget 同一轴只能启用一个对齐 flag；双边 flag 只允许用于计划中的该轴拉伸`);
  }
  const sizeAxes = new Set();
  if (activeWidget && horizontalStretch) sizeAxes.add("width");
  if (activeWidget && verticalStretch) sizeAxes.add("height");
  return { enabled: activeWidget, sizeAxes };
}

/** 校验单条全组件快照，并从实际组件推导位置、尺寸写入者。 */
function validateSnapshot(node, snapshot, label, parentSnapshot, errors) {
  if (!isRecord(snapshot)) {
    errors.push(`${label}.component_snapshot 必须是对象`);
    return;
  }
  if (typeof snapshot.active !== "boolean") errors.push(`${label}.component_snapshot.active 必须是布尔值`);
  const active = snapshot.active === true;
  const nodeId = readField(node, "layout_node_id", "layoutNodeId");
  const parentId = readField(node, "parent_layout_node_id", "parentLayoutNodeId", null);
  if (!isBounds(snapshot.layout_bounds)) {
    errors.push(`${label}.component_snapshot.layout_bounds 必须包含有限 x/y 和正数 width/height`);
  }
  if (!isBounds(snapshot.reference_bounds)) {
    errors.push(`${label}.component_snapshot.reference_bounds 必须包含有限 x/y 和正数 width/height`);
  }
  if (!(snapshot.parent_layout_node_id === null || isId(snapshot.parent_layout_node_id))) {
    errors.push(`${label}.component_snapshot.parent_layout_node_id 必须是节点 ID 或 null`);
  } else if (snapshot.parent_layout_node_id !== parentId) {
    errors.push(`${label}.component_snapshot.parent_layout_node_id 与节点实际父级不一致`);
  }
  if (!isRecord(node.layout_execution)) {
    errors.push(`${label} 对应节点缺少 layout_execution`);
    return;
  }
  const plan = node.layout_execution;
  if (!POSITION_DRIVERS.has(plan.position_driver)) errors.push(`${label} 对应节点 layout_execution.position_driver 无效`);
  if (!SIZE_DRIVERS.has(plan.size_driver)) errors.push(`${label} 对应节点 layout_execution.size_driver 无效`);

  validateLayout(snapshot.layout, `${label}.component_snapshot.layout`, errors);
  validateLayout(snapshot.parent_layout, `${label}.component_snapshot.parent_layout`, errors);
  const transform = snapshot.ui_transform;
  const transformValid = isRecord(transform) && [transform.width, transform.height].every((value) => Number.isFinite(value) && value > 0);
  if (!transformValid) {
    errors.push(`${label}.component_snapshot.ui_transform 必须包含有限正数 width/height`);
  }
  if (plan.size_driver === "FIXED") {
    const target = readField(node, "target_bounds", "targetBounds", node.bounds);
    if (transformValid && isRecord(target) && Number.isFinite(target.width) && Number.isFinite(target.height)
      && (!sameNumber(transform.width, target.width) || !sameNumber(transform.height, target.height))) {
      errors.push(`${label} 固定节点的 UITransform 尺寸必须等于冻结 target_bounds`);
    }
  }
  const nodeMatrixValid = validateMatrix(snapshot.node_to_layout, `${label}.component_snapshot.node_to_layout`, errors);
  const referenceMatrixValid = validateMatrix(snapshot.reference_to_layout, `${label}.component_snapshot.reference_to_layout`, errors);
  if (nodeMatrixValid && node.sprite_geometry != null && !(isBackgroundDisplayNode(node) && !isLayoutContainer(node))) {
    // 背景仅由独立背景节点执行 cover，其他图片的轴长不能因逻辑变换改变。
    const { a, b, c, d } = snapshot.node_to_layout;
    if (!sameNumber(Math.hypot(a, b), 1) || !sameNumber(Math.hypot(c, d), 1) || !sameNumber(a * c + b * d, 0)) errors.push(`${label} 图片节点及祖先的逻辑变换不得缩放或剪切；九宫格仅可改变切片显示框`);
  }
  if (plan.position_driver === "WIDGET") {
    if (nodeMatrixValid && !isIdentityMatrix(snapshot.node_to_layout)) errors.push(`${label} Widget 定位要求 node_to_layout 为单位矩阵`);
    if (referenceMatrixValid && !isIdentityMatrix(snapshot.reference_to_layout)) errors.push(`${label} Widget 定位要求 reference_to_layout 为单位矩阵`);
  }

  const widgetResult = validateWidget(plan, snapshot, label, active, errors);
  const layout = snapshot.layout;
  const parentLayout = snapshot.parent_layout;
  if (parentSnapshot && !sameValue(parentLayout, parentSnapshot.layout)) {
    errors.push(`${label}.component_snapshot.parent_layout 必须等于父节点 ${parentId} 的实际 Layout 快照`);
  }
  const parentIsActive = parentSnapshot ? parentSnapshot.active === true : true;
  const parentLayoutEnabled = active && parentIsActive && isRecord(parentLayout)
    && parentLayout.enabled === true && parentLayout.type !== "NONE";
  const parentChangesPosition = parentLayoutEnabled;
  if (parentChangesPosition && plan.position_driver !== "LAYOUT") {
    errors.push(`${label} 的父 Layout 会重排活动子项，position_driver 必须为 LAYOUT`);
  }
  if (active && plan.position_driver === "LAYOUT" && !parentChangesPosition) {
    errors.push(`${label} 声明 position_driver=LAYOUT，但父节点没有启用可排布子项的 Layout`);
  }

  const parentSizeAxes = parentLayoutEnabled ? layoutSizeAxes(parentLayout, { parent: true }) : new Set();
  const selfSizeAxes = active ? layoutSizeAxes(layout) : new Set();
  const widgetSizeAxes = widgetResult.sizeAxes;
  const layoutChangesSize = parentSizeAxes.size > 0 || selfSizeAxes.size > 0;
  if (active && plan.size_driver === "LAYOUT" && !layoutChangesSize) {
    errors.push(`${label} 声明 size_driver=LAYOUT，但没有活动的父 Layout.CHILDREN 或自身 Layout.CONTAINER`);
  }
  if (active && plan.size_driver === "WIDGET" && widgetSizeAxes.size === 0) {
    errors.push(`${label} 声明 size_driver=WIDGET，但实际 Widget 没有双边拉伸 flag`);
  }
  if (active && plan.size_driver !== "LAYOUT" && layoutChangesSize) {
    errors.push(`${label} 实际 Layout 会改变自身或子项尺寸，但 size_driver=${plan.size_driver}，存在尺寸控制冲突`);
  }
  if (active && plan.size_driver !== "WIDGET" && widgetSizeAxes.size > 0) {
    errors.push(`${label} 实际 Widget 双边对齐会改变尺寸，但 size_driver=${plan.size_driver}`);
  }

  for (const [firstName, firstAxes, secondName, secondAxes] of [
    ["父 Layout.CHILDREN", parentSizeAxes, "自身 Layout.CONTAINER", selfSizeAxes],
    ["父 Layout.CHILDREN", parentSizeAxes, "Widget", widgetSizeAxes],
    ["自身 Layout.CONTAINER", selfSizeAxes, "Widget", widgetSizeAxes],
  ]) {
    const overlap = [...firstAxes].filter((axis) => secondAxes.has(axis));
    if (overlap.length > 0) errors.push(`${label} 存在多个原生尺寸写入者：${firstName} 与 ${secondName} 同时控制 ${overlap.join("/")}`);
  }

  validateWriters(snapshot.position_writers, active, plan.position_driver, POSITION_DRIVERS, `${label}.component_snapshot.position_writers`, errors);
  validateWriters(snapshot.size_writers, active, plan.size_driver, SIZE_DRIVERS, `${label}.component_snapshot.size_writers`, errors);
  if (active) {
    const actualPositionWriters = [];
    if (widgetResult.enabled) actualPositionWriters.push("WIDGET");
    if (parentChangesPosition) actualPositionWriters.push("LAYOUT");
    if (actualPositionWriters.length > 1) errors.push(`${label} 存在多个原生位置写入者：${actualPositionWriters.join(", ")}`);
    if (actualPositionWriters.length === 1 && actualPositionWriters[0] !== plan.position_driver) {
      errors.push(`${label} 原生位置写入者 ${actualPositionWriters[0]} 与计划 ${plan.position_driver} 不一致`);
    }
    const actualSizeDrivers = new Set();
    if (widgetSizeAxes.size > 0) actualSizeDrivers.add("WIDGET");
    if (layoutChangesSize) actualSizeDrivers.add("LAYOUT");
    if (actualSizeDrivers.size > 1) errors.push(`${label} 存在多个原生尺寸写入者：${[...actualSizeDrivers].join(", ")}`);
    if (actualSizeDrivers.size === 1 && [...actualSizeDrivers][0] !== plan.size_driver) {
      errors.push(`${label} 原生尺寸写入者 ${[...actualSizeDrivers][0]} 与计划 ${plan.size_driver} 不一致`);
    }
  }

  validateSprite(node, snapshot, label, errors, plan);
  const isRaw = node.sprite_geometry?.type === "SIMPLE" && node.sprite_geometry?.size_mode === "RAW";
  if (isRaw && (parentSizeAxes.size > 0 || selfSizeAxes.size > 0 || widgetSizeAxes.size > 0)) {
    errors.push(`${label} 普通 RAW 图片不得由父 Layout.CHILDREN、自身 Layout.CONTAINER 或 Widget 拉伸改变尺寸`);
  }
  if (isId(nodeId) && snapshot.layout_node_id !== undefined && snapshot.layout_node_id !== nodeId) {
    errors.push(`${label}.component_snapshot.layout_node_id 与节点 ID 不一致`);
  }
}

/** 位置与尺寸写入记录必须逐节点恰好匹配计划，停用节点不保留有效写入者。 */
function validateWriters(value, active, expected, allowed, label, errors) {
  if (!Array.isArray(value) || value.some((writer) => typeof writer !== "string" || !allowed.has(writer))) {
    errors.push(`${label} 必须是受支持的写入者字符串数组`);
    return;
  }
  if (new Set(value).size !== value.length) errors.push(`${label} 不允许重复写入者`);
  if (!active) {
    if (value.length !== 0) errors.push(`${label} 对应节点 inactive 时必须为空数组`);
    return;
  }
  if (value.length !== 1 || value[0] !== expected) errors.push(`${label} 必须且只能记录计划中的单一写入者 ${expected}`);
}

/** 用真实快照边界重放中心合同，只报告偏差，不改写运行时几何。 */
function validateObservedCenterAlignment(nodesById, snapshotsById, label, errors) {
  const observedNodes = [];
  let allBoundsValid = true;
  const stableRootBounds = new Map();
  for (const [id, source] of nodesById) {
    const snapshot = snapshotsById.get(id)?.component_snapshot;
    if (!isRecord(snapshot)) {
      allBoundsValid = false;
      continue;
    }
    const actualBounds = snapshot.layout_bounds;
    const actualReferenceBounds = snapshot.reference_bounds;
    if (!isBounds(actualBounds) || !isBounds(actualReferenceBounds)) {
      allBoundsValid = false;
      continue;
    }

    const parentId = readField(source, "parent_layout_node_id", "parentLayoutNodeId", null);
    const explicitReferenceId = source.reference_id
      ?? source.ui_layout?.position_reference_id
      ?? source.uiLayout?.positionReferenceId;
    const referenceId = explicitReferenceId ?? parentId;
    if (!isId(referenceId)) {
      errors.push(`${label}.${id}.component_snapshot.reference_bounds 无法绑定定位参照 ID`);
      allBoundsValid = false;
      continue;
    }

    const referenceSnapshot = snapshotsById.get(referenceId)?.component_snapshot;
    if (nodesById.has(referenceId)) {
      if (!isRecord(referenceSnapshot) || !isBounds(referenceSnapshot.layout_bounds)) {
        errors.push(`${label}.${id}.component_snapshot.reference_bounds 缺少业务参照 ${referenceId} 的有效 layout_bounds`);
        allBoundsValid = false;
      } else if (!sameBounds(actualReferenceBounds, referenceSnapshot.layout_bounds)) {
        errors.push(`${label}.${id}.component_snapshot.reference_bounds 必须等于业务参照 ${referenceId} 的 layout_bounds`);
      }
    } else if (STABLE_ROOTS.has(referenceId)) {
      const existing = stableRootBounds.get(referenceId);
      if (existing && !sameBounds(existing, actualReferenceBounds)) {
        errors.push(`${label} 同一逻辑根 ${referenceId} 的 reference_bounds 必须在全部快照中一致`);
      } else if (!existing) {
        stableRootBounds.set(referenceId, actualReferenceBounds);
      }
    } else {
      errors.push(`${label}.${id}.component_snapshot.reference_bounds 引用了未知定位参照 ${referenceId}`);
      allBoundsValid = false;
    }

    const parentSnapshot = snapshotsById.get(parentId)?.component_snapshot;
    let parentBounds = isRecord(parentSnapshot) ? parentSnapshot.layout_bounds : undefined;
    if (!isBounds(parentBounds)) {
      parentBounds = parentId === referenceId
        ? actualReferenceBounds
        : readField(source, "parent_target_bounds", "parentTargetBounds");
    }
    const uiLayout = source.ui_layout ?? source.uiLayout ?? {};
    const axisAlignment = source.axis_alignment ?? source.axisAlignment ?? { horizontal: "left", vertical: "top" };
    const observed = {
      ...source,
      layout_node_id: id,
      parent_layout_node_id: isId(parentId) ? parentId : referenceId,
      ui_layout: { ...uiLayout, position_reference_id: referenceId },
      axis_alignment: { ...axisAlignment },
      target_bounds: actualBounds,
      reference_target_bounds: actualReferenceBounds,
      ...(isBounds(parentBounds) ? { parent_target_bounds: parentBounds } : {}),
    };
    if (Object.hasOwn(source, "bounds")) observed.bounds = actualBounds;
    observedNodes.push(observed);
  }
  if (allBoundsValid && observedNodes.length === nodesById.size) {
    validateCenterAlignmentNodes(observedNodes.map((node) => (node?.ui_layout ?? node?.uiLayout)?.positioning === "absolute" && ["popup", "floating", "toast"].includes((node?.ui_layout ?? node?.uiLayout)?.floating_root_kind) ? { ...node, axis_alignment: { horizontal: "left", vertical: "top" }, center_alignment: undefined } : node), errors, `${label}.observed_center_alignment`);
  }
}

/** 校验每个节点均有唯一、完整的运行时组件快照，不改变几何容差策略。 */
export function validateLayoutRuntimeSnapshots(nodes, measurements, errors = [], label = "layout_geometry.component_snapshots") {
  validateRelativeWebNodes(nodes, errors, label + ".layout_nodes", "nodes");
  if (!Array.isArray(nodes)) {
    errors.push(`${label} 校验需要 layout_nodes 数组`);
    return errors;
  }
  if (!Array.isArray(measurements)) {
    errors.push(`${label} 必须是组件快照数组`);
    return errors;
  }
  const nodesById = new Map();
  for (const [index, node] of nodes.entries()) {
    const id = readField(node, "layout_node_id", "layoutNodeId");
    if (!isRecord(node) || !isId(id)) {
      errors.push(`${label} 对应 layout_nodes[${index}] 必须有有效 layout_node_id`);
      continue;
    }
    if (nodesById.has(id)) errors.push(`${label} 的 layout_nodes 存在重复 ID：${id}`);
    else nodesById.set(id, node);
  }
  const snapshotsById = new Map();
  for (const [index, measurement] of measurements.entries()) {
    const itemLabel = `${label}[${index}]`;
    if (!isRecord(measurement)) {
      errors.push(`${itemLabel} 必须是包含 component_snapshot 的对象`);
      continue;
    }
    const id = readField(measurement, "layout_node_id", "layoutNodeId");
    if (!isId(id)) {
      errors.push(`${itemLabel} 缺少 layout_node_id，无法绑定 component_snapshot`);
      continue;
    }
    if (!nodesById.has(id)) errors.push(`${itemLabel} 的 layout_node_id=${id} 是未知或 extra 节点`);
    if (snapshotsById.has(id)) errors.push(`${label} 存在重复 component_snapshot 节点 ID：${id}`);
    else snapshotsById.set(id, measurement);
    if (!Object.hasOwn(measurement, "component_snapshot")) errors.push(`${itemLabel}.component_snapshot 缺失`);
  }
  for (const id of nodesById.keys()) {
    if (!snapshotsById.has(id)) errors.push(`${label} 缺少节点 ${id} 的 component_snapshot 运行时快照`);
  }
  for (const [id, node] of nodesById) {
    const measurement = snapshotsById.get(id);
    if (!measurement || !Object.hasOwn(measurement, "component_snapshot")) continue;
    const parentId = readField(node, "parent_layout_node_id", "parentLayoutNodeId", null);
    const parentMeasurement = isId(parentId) ? snapshotsById.get(parentId) : undefined;
    const parentSnapshot = parentMeasurement?.component_snapshot;
    const childSnapshot = measurement.component_snapshot;
    // active 表示 activeInHierarchy：业务父级已停用时，子节点不可能仍处于层级激活状态。
    if (parentSnapshot?.active === false && childSnapshot?.active === true) {
      errors.push(`${label}.${id}.component_snapshot.active 与父节点 ${parentId} 的 activeInHierarchy 矛盾`);
    }
    validateSnapshot(node, measurement.component_snapshot, `${label}.${id}`, parentSnapshot, errors);
  }
  validateFloatingRuntimeOffsets([...nodesById.values()], snapshotsById, errors, label, sameNumber, (item) => item?.component_snapshot);
  validateObservedCenterAlignment(nodesById, snapshotsById, label, errors);
  return errors;
}

/** 校验真实 UI 节点；浮层本体身份必须绑定实际容器和真实顶层 UI 根。 */
function validateRelativeWebNodes(input, errors, label, kind) {
  if (!Array.isArray(input)) return;
  const synthetic = (node) => node?.is_root_container === true && ["viewport", "safe-area"].includes(node.layout_node_id ?? node.layoutNodeId) && (node.parent_layout_node_id === null || node.parentLayoutNodeId === null);
  for (const node of input.filter(synthetic)) if (node.ui_layout?.floating_root_kind !== undefined || node.ui_layout?.positioning === "absolute") errors.push(label + " 合成视口根不能声明为浮层本体");
  const source = input.filter((node) => !synthetic(node));
  const ids = new Set(source.map((node) => kind === "regions" ? node?.id : kind === "elements" ? node?.element_id : (node?.layout_node_id ?? node?.layoutNodeId)));
  const byId = new Map(source.map((node) => [kind === "regions" ? node?.id : kind === "elements" ? node?.element_id : (node?.layout_node_id ?? node?.layoutNodeId), node]));
  const regionNodes = new Map();
  if (kind === "nodes") for (const node of source) { const group = regionNodes.get(node?.region_id) ?? []; group.push(node?.layout_node_id); regionNodes.set(node?.region_id, group); }
  const canonical = source.map((node) => {
    const layout = node?.ui_layout ?? node?.uiLayout ?? {};
    const id = kind === "regions" ? node?.id : kind === "elements" ? node?.element_id : (node?.layout_node_id ?? node?.layoutNodeId);
    const parentId = kind === "regions" ? node?.parent_id : kind === "elements" ? node?.parent_element_id : (node?.parent_layout_node_id ?? node?.parentLayoutNodeId ?? node?.parent_element_id ?? node?.parentElementId);
    let reference = kind === "regions" ? node?.reference_id : kind === "elements" ? (layout.position_reference_id ?? node?.position_reference_id ?? node?.reference_id ?? parentId) : (node?.reference_id ?? node?.referenceId ?? layout.position_reference_id ?? layout.positionReferenceId ?? node?.position_reference_id ?? node?.positionReferenceId ?? parentId);
    if (kind === "nodes" && !ids.has(reference) && !["viewport", "safe-area"].includes(reference)) { const matches = regionNodes.get(reference) ?? []; if (matches.length === 1) reference = matches[0]; }
    const mode = kind === "regions" ? node?.positioning : Object.hasOwn(layout, "positioning") ? layout.positioning : "relative";
    const owner = kind === "regions" ? (node ?? {}) : layout;
    const floatingKind = Object.hasOwn(owner, "floating_root_kind") ? owner.floating_root_kind : null;
    if (Object.hasOwn(owner, "floating_root_kind") && !["popup", "floating", "toast"].includes(floatingKind)) errors.push(label + "." + id + " floating_root_kind 必须为 popup/floating/toast");
    if (floatingKind !== null) {
      if (kind === "regions" && node?.semantic_role !== floatingKind) errors.push(label + "." + id + " 浮层本体类型必须与 semantic_role 一致");
      if (kind === "regions" && node?.is_container !== true) errors.push(label + "." + id + " 浮层本体必须显式声明实际容器");
      if (kind !== "regions" && node?.is_container !== true && node?.element_type !== "container") errors.push(label + "." + id + " 浮层本体必须是实际容器，普通叶子不能豁免");
      const parent = byId.get(parentId);
      const actualUiRoot = kind === "regions" ? ["ui-root", "screen-ui-root"].includes(parent?.semantic_role) : (parent?.is_container === true || parent?.element_type === "container") && [parent?.layout_role, parent?.role, parent?.semantic_role].some((role) => ["ui-root", "screen-ui-root"].includes(role));
      if (!["viewport", "safe-area"].includes(parentId) && !actualUiRoot) errors.push(label + "." + id + " 浮层本体必须直接归属稳定根或实际 UI 根");
    }
    // 独立浮层本体可以没有锚点；普通节点和浮层内部仍必须提供实际参照。
    const references = mode === "absolute" && ["popup", "floating", "toast"].includes(floatingKind) && reference === undefined ? [] : [reference];
    return { id, parentId, references, mode, floatingKind };
  });
  errors.push(...validateRelativeLayoutNodes(canonical, { label, roots: ["viewport", "safe-area"] }));
}

/** 依据冻结节点、同批参照实测和原生容差验证浮层内部锚点。 */
function validateFloatingRuntimeOffsets(nodes, snapshots, errors, label, sameNumber, getSnapshot) {
  const idOf = (node) => node?.layout_node_id ?? node?.layoutNodeId;
  const parentOf = (node) => node?.parent_layout_node_id ?? node?.parentLayoutNodeId;
  const byId = new Map(nodes.map((node) => [idOf(node), node]));
  const boundsOf = (node) => node?.target_bounds ?? node?.targetBounds ?? node?.bounds;
  const valid = (rect) => rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
  for (const node of nodes) {
    const id = idOf(node); let ancestor = byId.get(parentOf(node)); const visited = new Set([id]); let inside = false;
    while (ancestor && !visited.has(idOf(ancestor))) {
      visited.add(idOf(ancestor));
      if (["popup", "floating", "toast"].includes((ancestor.ui_layout ?? ancestor.uiLayout)?.floating_root_kind)) { inside = true; break; }
      ancestor = byId.get(parentOf(ancestor));
    }
    if (!inside) continue;
    const snapshot = getSnapshot(snapshots.get(id));
    if (!snapshot || snapshot.active === false) continue;
    const refId = node.reference_id ?? node.referenceId ?? node.ui_layout?.position_reference_id ?? node.uiLayout?.positionReferenceId ?? node.position_reference_id ?? node.positionReferenceId ?? parentOf(node);
    const original = boundsOf(node); const reference = boundsOf(byId.get(refId)) ?? node.reference_target_bounds ?? node.referenceTargetBounds;
    const actual = snapshot.layout_bounds ?? snapshot.actual_bounds; const actualRef = snapshot.reference_bounds;
    if (![original, reference, actual, actualRef].every(valid)) { errors.push(label + "." + id + " 浮层内部缺少原始或同批实际参照矩形"); continue; }
    const alignment = node.axis_alignment ?? node.axisAlignment ?? { horizontal: "left", vertical: "top" };
    for (const [axis, start, size, end] of [["horizontal", "x", "width", "right"], ["vertical", "y", "height", "bottom"]]) {
      if (alignment[axis] === "center") continue;
      const edge = (rect, ref, atEnd) => atEnd ? ref[start] + ref[size] - rect[start] - rect[size] : rect[start] - ref[start];
      const ends = alignment[axis] === "stretch" ? [false, true] : [alignment[axis] === end];
      if (ends.some((atEnd) => !sameNumber(edge(actual, actualRef, atEnd), edge(original, reference, atEnd)))) errors.push(label + "." + id + " 浮层内部 " + axis + " 相对锚点间距与冻结事实不一致");
    }
  }
}
