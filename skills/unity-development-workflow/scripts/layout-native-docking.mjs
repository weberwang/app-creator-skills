/** 校验 Unity UI 停靠的原生位置驱动与明确的功能交接边界。 */

const EPSILON = 1e-4;
const NATIVE_BY_SYSTEM = Object.freeze({
  UGUI: new Set(["RECT_TRANSFORM", "LAYOUT_GROUP", "ASPECT_RATIO_FITTER"]),
  UI_TOOLKIT: new Set(["UITOOLKIT_LAYOUT", "UITOOLKIT_STYLE"]),
});
const BEHAVIOR_KINDS = new Set(["drag", "pointer-follow", "world-follow", "transition"]);

/** 判断显式说明是否包含可审阅的非空内容。 */
function hasText(value) { return typeof value === "string" && value.trim().length > 0; }

/** 只把完整、等间距且同一横排或竖排的兄弟集合认定为可由父布局表达。 */
function canUseNativeGroup(plan, node) {
  const siblings = plan.nodes.filter((entry) => entry.parentElementId === node.parentElementId);
  if (siblings.length < 2) return false;
  const siblingIds = new Set(siblings.map((entry) => entry.id));
  for (const leader of siblings) {
    const members = leader.layoutBinding.centerAlignment?.memberIds;
    if (members && (members.length !== siblings.length || members.some((id) => !siblingIds.has(id)))) return false;
  }
  return [["x", "width", "y", "height"], ["y", "height", "x", "width"]].some(([main, extent, cross, crossExtent]) => {
    const ordered = [...siblings].sort((a, b) => a.bounds[main] - b.bounds[main]);
    for (let index = 0; index < ordered.length; index += 1) {
      const entry = ordered[index];
      const reference = entry.layoutBinding.positionReferenceId ?? entry.parentElementId;
      // 从左到右与从右到左的组都可能引用相邻项，不能把排列方向误当成回退理由。
      if (reference !== entry.parentElementId && reference !== ordered[index - 1]?.id && reference !== ordered[index + 1]?.id) return false;
    }
    const gaps = ordered.slice(1).map((entry, index) => entry.bounds[main] - ordered[index].bounds[main] - ordered[index].bounds[extent]);
    if (gaps.some((gap) => gap < -EPSILON || Math.abs(gap - gaps[0]) > EPSILON)) return false;
    return [0, 0.5, 1].some((anchor) => {
      const first = ordered[0].bounds[cross] + ordered[0].bounds[crossExtent] * anchor;
      return ordered.every((entry) => Math.abs(entry.bounds[cross] + entry.bounds[crossExtent] * anchor - first) <= EPSILON);
    });
  });
}

/** 沿已确认父子结构查找节点所属的虚拟居中组及其实际兄弟。 */
function compositeFor(plan, node) {
  const leader = plan.nodes.find((entry) => entry.layoutBinding.centerAlignment?.memberIds?.includes(node.id));
  if (!leader) return null;
  const members = leader.layoutBinding.centerAlignment.memberIds;
  const siblings = plan.nodes.filter((entry) => entry.parentElementId === node.parentElementId).map((entry) => entry.id);
  return { members, siblings, complete: siblings.length === members.length && siblings.every((id) => members.includes(id)) };
}

/** 验证功能性位置行为限定于当前节点，并声明有限范围和原生驱动的恢复入口。 */
function validateBehavior(plan, node, behavior, errors) {
  const label = `节点 ${node.id} 的 positionBehavior`;
  if (!behavior || typeof behavior !== "object" || Array.isArray(behavior)) { errors.push(`${label} 缺少功能控制和恢复说明。`); return; }
  if (!BEHAVIOR_KINDS.has(behavior.kind) || behavior.property !== "position") errors.push(`${label} 必须声明有效功能类型及当前节点的 position 属性。`);
  for (const name of ["reason", "trigger"]) if (!hasText(behavior[name])) errors.push(`${label}.${name} 必须提供具体说明。`);
  if (behavior.coordinateSpace !== node.layoutBinding.coordinateSpace) errors.push(`${label} 必须绑定当前节点的布局坐标空间。`);
  const { min, max } = behavior.range ?? {};
  if (![min?.x, min?.y, max?.x, max?.y].every(Number.isFinite) || min.x > max.x || min.y > max.y) errors.push(`${label} 必须声明有效的双轴位置范围。`);
  const restore = behavior.restore;
  if (!restore || !NATIVE_BY_SYSTEM[plan.uiSystem]?.has(restore.driver) || !hasText(restore.trigger)) errors.push(`${label} 必须声明当前 UI 系统的原生恢复驱动与交接触发条件。`);
  else validateNativeDriver(plan, node, restore.driver, errors, true);
}

/** 校验脚本回退是否可由现有实际参照或不可拆分组合证明。 */
function validateFallback(plan, node, fallback, errors) {
  const label = `节点 ${node.id} 的 nativeFallback`;
  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback) || !hasText(fallback.reason)) { errors.push(`${label} 必须说明实际原生限制。`); return; }
  const reference = node.layoutBinding.positionReferenceId ?? node.parentElementId;
  const composite = compositeFor(plan, node);
  const nativeGroup = canUseNativeGroup(plan, node);
  if (nativeGroup) errors.push(`${label} 的完整同级组合可由父级原生布局管理。`);
  if (fallback.kind === "non-parent-reference") {
    if (reference === node.parentElementId) errors.push(`${label} 的参照是直接父级，应使用原生停靠。`);
  } else if (fallback.kind === "partial-composite") {
    if (!composite || composite.complete) errors.push(`${label} 必须绑定不能由父级完整排布的已有虚拟组合。`);
  } else if (fallback.kind === "complex-composite") {
    if (!composite?.complete || nativeGroup) errors.push(`${label} 必须绑定原生父布局无法表达的完整虚拟组合。`);
  } else errors.push(`${label}.kind 必须是可由当前结构验证的回退类型。`);
}

/** 当前原生驱动和功能恢复驱动必须通过同一父参照、布局归属与锚点资格检查。 */
function validateNativeDriver(plan, node, driver, errors, restoring = false) {
  const layout = node.layoutBinding.uiLayout;
  const reference = node.layoutBinding.positionReferenceId ?? node.parentElementId;
  const label = `节点 ${node.id} 的${restoring ? "恢复驱动 " : " "}${driver}`;
  // RectTransform、AspectRatioFitter 与 UITK 绝对样式均不能直接追踪独立兄弟参照。
  if (["RECT_TRANSFORM", "ASPECT_RATIO_FITTER", "UITOOLKIT_STYLE"].includes(driver) && reference !== node.parentElementId) {
    errors.push(`${label} 只能原生参照直接父级，不能冒充独立位置参照。`);
  }
  if (driver === "LAYOUT_GROUP" && layout.layoutOwner !== "PARENT") errors.push(`${label} 必须由实际父级承担布局归属。`);
  if (["LAYOUT_GROUP", "UITOOLKIT_LAYOUT"].includes(driver)) {
    const composite = compositeFor(plan, node);
    if ((reference !== node.parentElementId || composite) && !canUseNativeGroup(plan, node)) {
      errors.push(`${label} 无法通过当前父级原生布局表达该参照或虚拟组合。`);
    }
  }
  if (driver === "ASPECT_RATIO_FITTER" && ["horizontal", "vertical"].some((axis) => node.layoutBinding.axisAlignment[axis] !== "center")) {
    errors.push(`${label} 的父级适配位置只能表达双轴居中。`);
  }
  if (plan.uiSystem !== "UGUI" || driver !== "RECT_TRANSFORM") return;
  // Pivot 仅是自身原点；恢复时同样不能以原生名称掩盖错误的参照锚点。
  const anchor = node.layoutBinding.anchor;
  for (const [axis, dimension, edges] of [["horizontal", "x", { left: 0, center: 0.5, right: 1 }], ["vertical", "y", { top: 1, center: 0.5, bottom: 0 }]]) {
    const min = anchor.min[dimension]; const max = anchor.max[dimension];
    const expected = edges[node.layoutBinding.axisAlignment[axis]];
    const fixed = Math.abs(min - expected) <= EPSILON && Math.abs(max - expected) <= EPSILON;
    const stretch = Math.abs(min) <= EPSILON && Math.abs(max - 1) <= EPSILON && layout.sizePolicy === "STRETCH";
    if (stretch && node.renderKind === "SPRITE" && layout.imageSizing?.mode !== "SLICED") errors.push(`节点 ${node.id} 的普通图片不能用 ${axis} 双边锚点拉伸，必须保持原尺寸或使用已确认九宫格。`);
    if (!fixed && !stretch) errors.push(`节点 ${node.id} 的 ${axis} 停靠意图与 RectTransform 参照锚点不一致。`);
  }
}

/** 根据所选 UI 系统核对位置控制：普通节点优先原生，行为与结构回退分别声明。 */
export function validateNativePositionPlan(plan, errors) {
  for (const node of plan.nodes) {
    const layout = node.layoutBinding.uiLayout;
    const driver = layout.positionDriver;
    const behavior = layout.positionBehavior;
    const fallback = layout.nativeFallback;
    if (layout.positioning === "absolute" && !behavior) errors.push(`节点 ${node.id} 的独立浮层位置必须有受控功能行为，普通弹窗应相对宿主停靠。`);
    if (behavior && fallback) errors.push(`节点 ${node.id} 的 positionBehavior 与 nativeFallback 不能同时声明。`);
    if (NATIVE_BY_SYSTEM[plan.uiSystem]?.has(driver)) {
      if (behavior || fallback) errors.push(`节点 ${node.id} 的原生位置驱动不能附带脚本/动画例外。`);
      validateNativeDriver(plan, node, driver, errors);
    } else if (driver === "SCRIPT" || driver === "ANIMATION") {
      if (behavior) validateBehavior(plan, node, behavior, errors);
      else if (driver === "SCRIPT") validateFallback(plan, node, fallback, errors);
      else errors.push(`节点 ${node.id} 的动画位置驱动必须声明 positionBehavior。`);
    } else errors.push(`节点 ${node.id} 必须使用 ${plan.uiSystem} 的原生位置驱动，或声明可核实的受控例外。`);
  }
}

/** 核对真实 RectTransform 与冻结配置，运行中动画及父布局管理不误认成静态锚点。 */
export function validateNativePositionSnapshot(node, snapshot, uiSystem, errors, measurement) {
  const layout = node.layoutBinding.uiLayout;
  // 采集器按目标元素筛选登记；不同元素的写入者不能借同一 Panel 报告串用。
  const expectedElement = uiSystem === "UGUI" ? "" : measurement?.elementName;
  if (Array.isArray(snapshot.externalWriters)) {
    for (const writer of snapshot.externalWriters) if (writer?.elementName !== expectedElement) errors.push(`节点 ${node.id} 的外部位置写入者未绑定当前实际元素。`);
  }
  if (uiSystem === "UGUI" && (layout.positionDriver === "RECT_TRANSFORM" || layout.positionBehavior?.restore?.driver === "RECT_TRANSFORM")) {
    const actual = snapshot.rectTransform;
    for (const [name, expected] of [["anchorMin", node.layoutBinding.anchor.min], ["anchorMax", node.layoutBinding.anchor.max], ["pivot", node.layoutBinding.pivot]]) {
      if (!actual?.[name] || !["x", "y"].every((axis) => Number.isFinite(actual[name][axis]) && Math.abs(actual[name][axis] - expected[axis]) <= EPSILON)) errors.push(`节点 ${node.id} 的实际 RectTransform.${name} 与停靠计划不一致。`);
    }
  }
  const restore = layout.positionBehavior?.restore;
  if (restore?.driver === "LAYOUT_GROUP" && (!hasText(snapshot.parentLayoutGroup?.type) || typeof snapshot.parentLayoutGroup?.enabled !== "boolean")) errors.push(`节点 ${node.id} 的原生恢复驱动缺少实际父 LayoutGroup。`);
  if (restore?.driver === "ASPECT_RATIO_FITTER" && !["FitInParent", "EnvelopeParent"].includes(snapshot.aspectRatioFitter?.aspectMode)) errors.push(`节点 ${node.id} 的原生恢复驱动缺少可控制位置的实际 AspectRatioFitter。`);
  const behavior = layout.positionBehavior;
  if (behavior && snapshot.active === true) {
    // 仅在能从同批快照映射到声明坐标系时检查范围，不能把屏幕像素冒充局部坐标。
    const position = uiSystem === "UGUI" && behavior.coordinateSpace === "CANVAS_LOCAL"
      ? snapshot.rectTransform?.anchoredPosition
      : ["SCREEN_SAFE_AREA", "UI_TOOLKIT_PANEL"].includes(behavior.coordinateSpace) ? measurement?.actualRect : null;
    if (!position || ![position.x, position.y].every(Number.isFinite)) errors.push(`节点 ${node.id} 的功能位置缺少对应坐标空间的实际测量。`);
    else if (["x", "y"].some((axis) => position[axis] < behavior.range.min[axis] - EPSILON || position[axis] > behavior.range.max[axis] + EPSILON)) errors.push(`节点 ${node.id} 的功能位置超出声明范围。`);
  }
}
