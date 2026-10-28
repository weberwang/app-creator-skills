"use strict";

/** 所有技术栈共用实际 UI 节点的相对定位校验，不另建脱离原生节点的布局图。 */
const MODES = new Set(["relative", "absolute"]);
/** 浮层本体类型采用封闭集合；普通 overlay、HUD 或组件名称不构成豁免。 */
const FLOATING_KINDS = new Set(["popup", "floating", "toast"]);

/** 只接受稳定的非空身份，避免空白或隐式类型转换产生节点别名。 */
function isId(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

/** 检查父链中是否包含候选祖先；损坏或成环的图不允许无限遍历。 */
function hasAncestor(nodeId, ancestorId, byId) {
  const visited = new Set();
  let current = byId.get(nodeId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

/** 找到最近的浮层祖先；本体自身不属于自己内部，仍可引用宿主定位。 */
function floatingAncestor(node, byId) {
  const visited = new Set([node.id]);
  let current = byId.get(node.parentId);
  while (current && !visited.has(current.id)) {
    if (FLOATING_KINDS.has(current.floatingKind)) return current;
    visited.add(current.id);
    current = byId.get(current.parentId);
  }
  return null;
}

/** 合成根同名的真实节点优先，不能借根名称跳过实际父子和循环检查。 */
function referenceExists(id, byId, roots) {
  return byId.has(id) || roots.has(id);
}

/** 判断定位参照是否为实际父级、兄弟、祖先或稳定根。 */
function legalReference(node, referenceId, byId, roots) {
  if (!byId.has(referenceId)) return roots.has(referenceId);
  if (referenceId === node.parentId) return true;
  const reference = byId.get(referenceId);
  return reference.parentId === node.parentId || hasAncestor(node.id, referenceId, byId);
}

/** 用迭代深度优先遍历检查父级与参照联合图，长 UI 链也不依赖调用栈深度。 */
function hasDependencyCycle(byId) {
  const states = new Map();
  for (const id of byId.keys()) {
    if (states.get(id) === 2) continue;
    const pending = [{ id, leaving: false }];
    while (pending.length) {
      const step = pending.pop();
      if (step.leaving) { states.set(step.id, 2); continue; }
      const state = states.get(step.id);
      if (state === 1) return true;
      if (state === 2) continue;
      states.set(step.id, 1);
      pending.push({ id: step.id, leaving: true });
      const node = byId.get(step.id);
      const references = Array.isArray(node.references) ? node.references : [];
      const dependencies = new Set([node.parentId, ...references]);
      for (const dependency of dependencies) {
        if (byId.has(dependency)) pending.push({ id: dependency, leaving: false });
      }
    }
  }
  return false;
}

/**
 * 校验适配器从真实原生节点映射的布局关系，返回全部中文错误。
 * roots 由技术栈适配器固定提供，不能取自工件的任意“额外根”声明。
 */
function validateRelativeLayoutNodes(nodes, options = {}) {
  const errors = [];
  const label = typeof options?.label === "string" ? options.label : "relative_layout";
  const rootValues = options?.roots ?? ["viewport", "safe-area"];
  if (!Array.isArray(rootValues) || rootValues.length === 0 || rootValues.some((id) => !isId(id))
      || new Set(rootValues).size !== rootValues.length) return [`${label} 的稳定根配置无效。`];
  const roots = new Set(rootValues);
  if (!Array.isArray(nodes) || nodes.length === 0) return [`${label} 必须提供实际 UI 节点，不能用空图跳过相对布局校验。`];
  const byId = new Map();
  nodes.forEach((node, index) => {
    const at = `${label}[${index}]`;
    if (!node || typeof node !== "object" || Array.isArray(node) || !isId(node.id)) {
      errors.push(`${at} 必须绑定实际 UI 节点的非空 id。`);
      return;
    }
    if (byId.has(node.id)) errors.push(`${at} 节点身份重复：${node.id}。`);
    else byId.set(node.id, node);
    if (!isId(node.parentId)) errors.push(`${at} 必须声明实际 parentId，不能用定位参照代替父级。`);
    if (!MODES.has(node.mode)) errors.push(`${at} positioning 只允许 relative 或 absolute。`);
    if (node.floatingKind !== null && !FLOATING_KINDS.has(node.floatingKind)) {
      errors.push(`${at} floatingKind 必须为空或 popup、floating、toast 中的一种本体类型。`);
    }
    if (!Array.isArray(node.references) || node.references.some((id) => !isId(id))) {
      errors.push(`${at} 必须提供实际定位参照 references 数组。`);
    } else if (node.mode === "relative" && node.references.length === 0) {
      errors.push(`${at} 相对布局必须绑定父级或明确参照，不能只声明 relative。`);
    }
  });

  for (const node of byId.values()) {
    const at = `${label}.${node.id}`;
    if (node.parentId === node.id) errors.push(`${at} 实际父级不能是自身。`);
    else if (isId(node.parentId) && !referenceExists(node.parentId, byId, roots)) {
      errors.push(`${at} 实际父级不存在：${node.parentId}。`);
    }
    const isBody = FLOATING_KINDS.has(node.floatingKind);
    const body = floatingAncestor(node, byId);
    if (isBody && roots.has(node.id)) errors.push(`${at} 稳定视口或安全区不能声明为浮层本体。`);
    if (node.mode === "absolute" && !isBody) errors.push(`${at} 普通 UI 必须相对布局，只有显式浮层本体可独立定位。`);
    if (body && isBody) errors.push(`${at} 是浮层 ${body.id} 的内部后代，不能再次声明本体来继承豁免。`);
    if (body && node.mode !== "relative") errors.push(`${at} 浮层内部 UI 必须相对布局，本体豁免不向后代传递。`);
    for (const referenceId of new Set(Array.isArray(node.references) ? node.references : [])) {
      if (!isId(referenceId)) continue;
      if (referenceId === node.id) { errors.push(`${at} 定位参照不能是自身。`); continue; }
      if (!referenceExists(referenceId, byId, roots)) {
        errors.push(`${at} 定位参照不存在：${referenceId}。`);
        continue;
      }
      if (!legalReference(node, referenceId, byId, roots)) errors.push(`${at} 定位参照 ${referenceId} 必须为父级、兄弟、祖先或稳定根。`);
      // 只检查 relative 标志不够：内部节点引用 viewport 仍可能在本体移动时留在屏幕原位。
      if (body && referenceId !== body.id && !hasAncestor(referenceId, body.id, byId)) {
        errors.push(`${at} 浮层内部定位参照 ${referenceId} 逃出本体 ${body.id} 的子树。`);
      }
    }
  }
  if (hasDependencyCycle(byId)) errors.push(`${label} 的实际父级与定位参照联合形成循环。`);
  return errors;
}

module.exports = { validateRelativeLayoutNodes };
