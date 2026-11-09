import { isBackgroundDisplayNode } from "./display-node-role.mjs";

const STABLE_ROOTS = new Set(["viewport", "safe-area"]);

/** 判断身份是否可作为实际节点索引键。 */
function isId(value) { return typeof value === "string" && value.trim().length > 0; }

/** 根据真实父链和定位意图判断 Widget 是否可表达，动画期可暂借外部位置控制。 */
export function describeWidgetAvailability(node, byId, centerMembers, label, { ignoreOwnership = false } = {}) {
  const uiLayout = node.ui_layout ?? node.uiLayout ?? {};
  const owner = uiLayout.layout_owner;
  const parentId = node.parent_layout_node_id ?? node.parentLayoutNodeId;
  const referenceId = node.reference_id ?? node.referenceId ?? uiLayout.position_reference_id ?? parentId;
  if (!isId(referenceId)) throw new TypeError(`${label}.reference_id/ui_layout.position_reference_id/parent_layout_node_id 必须是非空字符串`);
  const id = node.layout_node_id ?? node.layoutNodeId;
  const group = centerMembers.has(id);
  const background = isBackgroundDisplayNode(node);
  const overflow = uiLayout.overflow_policy;
  let ancestor = false;
  // 合成根不是 Creator Node，必须沿实际父链命中已存在的父级或祖先。
  if (!STABLE_ROOTS.has(referenceId)) {
    if (!isId(parentId)) throw new TypeError(`${label}.parent_layout_node_id 必须是非空字符串`);
    const visited = new Set();
    let currentId = parentId;
    while (isId(currentId) && !STABLE_ROOTS.has(currentId)) {
      if (visited.has(currentId)) throw new TypeError(`${label} 的实际父链存在循环：${currentId}`);
      visited.add(currentId);
      const parent = byId.get(currentId);
      if (!parent) break;
      if (currentId === referenceId) { ancestor = true; break; }
      currentId = parent.parent_layout_node_id ?? parent.parentLayoutNodeId;
    }
  }
  const ownerAllowed = owner === "SELF" || ignoreOwnership;
  const reason = group ? "虚拟图文组必须由共享布局按组合边界整体居中"
    : STABLE_ROOTS.has(referenceId) ? `定位参照 ${referenceId} 是逻辑稳定根，由共享布局映射，不假定它对应实际 Widget target Node`
      : !ancestor ? "定位参照不是实际父级或祖先，Widget 无法直接引用"
        : background ? "背景节点不承担普通 UI 子项的 Widget 定位"
          : !ownerAllowed ? `layout_owner=${owner ?? "未声明"} 不允许节点自身用 Widget 控制位置` : null;
  return { referenceId, parentId, owner, ancestor, group, background, overflow, reason };
}

/** 推导行为结束后可能恢复的布局驱动，组件实际状态仍须在 V5 回读。 */
export function positionBehaviorBaseDrivers(node, byId, centerMembers, label) {
  const availability = describeWidgetAvailability(node, byId, centerMembers, label, { ignoreOwnership: true });
  const baseDrivers = ["SHARED"];
  if (availability.reason === null) baseDrivers.push("WIDGET");
  if (!STABLE_ROOTS.has(availability.parentId) && byId.has(availability.parentId)
    && availability.referenceId === availability.parentId && !availability.group) baseDrivers.push("LAYOUT");
  return { availability, baseDrivers };
}
