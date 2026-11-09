"use strict";

/** 读取本栈已验证节点的稳定身份与布局矩形。 */
function idOf(node) { return node?.layout_node_id ?? node?.layoutNodeId; }
/** 读取冻结布局中的原始几何，不使用当前活动位置反填基准。 */
function boundsOf(node) { return node?.target_bounds ?? node?.targetBounds ?? node?.bounds; }
/** 判断位置比较所需的有限矩形。 */
function bounds(value) { return value && [value.x, value.y, value.width, value.height].every(Number.isFinite) && value.width > 0 && value.height > 0; }

/** 仅从通过本栈计划/快照校验的唯一活动写入者确定接管轴，字段存在本身不构成豁免。 */
function activePositionAxes(node, snapshot) {
  if (snapshot?.active !== true || node?.layout_execution?.position_driver !== "ANIMATION") return [];
  const writers = snapshot.position_writers ?? snapshot.position_writes?.map((write) => write?.driver);
  if (!Array.isArray(writers) || writers.length !== 1 || writers[0] !== "ANIMATION") return [];
  const properties = (node.ui_layout ?? node.uiLayout)?.position_behavior?.properties;
  if (!Array.isArray(properties) || !properties.length || properties.some((name) => !["x", "y"].includes(name))) return [];
  return [...new Set(properties.map((name) => name === "x" ? "horizontal" : "vertical"))];
}

/** 暂缓活动轴的静态居中；冻结计划不变，组合中未接管成员仍保持基准参照关系。 */
function projectActivePositionCentering(actualNodes, sourceNodes, snapshots, errors, label, sameNumber) {
  const byId = new Map(sourceNodes.map((node) => [idOf(node), node]));
  const active = new Map(sourceNodes.map((node) => [idOf(node), new Set(activePositionAxes(node, snapshots.get(idOf(node))))]));
  const disabled = new Map([...active].map(([id, axes]) => [id, new Set(axes)]));
  for (const leader of sourceNodes) {
    const members = leader.center_alignment?.member_ids;
    if (!Array.isArray(members)) continue;
    for (const [axis, start, size] of [["horizontal", "x", "width"], ["vertical", "y", "height"]]) {
      if (!members.some((id) => active.get(id)?.has(axis))) continue;
      for (const id of members) {
        const member = byId.get(id); const snapshot = snapshots.get(id);
        if (!member || !snapshot || snapshot.active === false) continue;
        if (!disabled.has(id)) disabled.set(id, new Set());
        disabled.get(id).add(axis);
        if (active.get(id)?.has(axis)) continue;
        const parentId = member.parent_layout_node_id ?? member.parentLayoutNodeId;
        const referenceId = member.reference_id ?? member.referenceId ?? member.ui_layout?.position_reference_id ?? parentId;
        const original = boundsOf(member);
        const reference = boundsOf(byId.get(referenceId)) ?? member.reference_target_bounds ?? member.referenceTargetBounds
          ?? (referenceId === parentId ? member.parent_target_bounds ?? member.parentTargetBounds : undefined);
        const actual = snapshot.layout_bounds ?? snapshot.actual_bounds;
        const actualReference = snapshot.reference_bounds;
        if (![original, reference, actual, actualReference].every(bounds)) { errors.push(`${label}.${id} 活动组合的未接管成员缺少基准或实际参照。`); continue; }
        const center = (rect) => rect[start] + rect[size] / 2;
        if (!sameNumber(center(actual) - center(actualReference), center(original) - center(reference))) errors.push(`${label}.${id} 未接管的组合 ${axis} 位置偏离基准关系。`);
      }
    }
  }
  return actualNodes.map((node) => {
    const axes = disabled.get(idOf(node));
    if (!axes?.size) return node;
    const alignment = { ...(node.axis_alignment ?? node.axisAlignment) };
    const center = node.center_alignment ? { ...node.center_alignment } : {};
    for (const axis of axes) {
      if (alignment[axis] === "center") alignment[axis] = axis === "horizontal" ? "left" : "top";
      delete center[axis];
    }
    if (!["horizontal", "vertical"].some((axis) => alignment[axis] === "center")) delete center.member_ids;
    return { ...node, axis_alignment: alignment, center_alignment: Object.keys(center).length ? center : undefined };
  });
}

module.exports = { activePositionAxes, projectActivePositionCentering };
