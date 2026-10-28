/** 将 Unity 原生布局输入接入公共相对关系校验，迁移时保留源文件追溯。 */
const ROOT = 'unity-development-workflow/';
const EVIDENCE = 'unity-game-workflow-control/scripts/runtime/ui-layout-evidence.mjs';

/** 仅替换经审阅的唯一源码锚点，来源漂移时拒绝猜测新结构。 */
function replaceOnce(text, before, after, label) {
  const start = text.indexOf(before);
  if (start < 0 || text.indexOf(before, start + before.length) >= 0) throw new Error(`Unity 相对布局${label}已变化，须重新审查`);
  return text.slice(0, start) + after + text.slice(start + before.length);
}

/** 共同 Schema 被拆解、Prefab 和布局计划引用，新增字段只能定义一次。 */
function adaptCommonSchema(text) {
  const schema = JSON.parse(text);
  const layout = schema?.$defs?.layoutBinding?.properties?.uiLayout;
  if (!layout || layout.additionalProperties !== false || !layout.properties
      || Object.hasOwn(layout.properties, 'positioning') || Object.hasOwn(layout.properties, 'floatingRootKind')
      || Object.hasOwn(layout.properties, 'independentPosition') || layout.allOf !== undefined) {
    throw new Error('Unity 共同布局 Schema 的字段边界已变化，须重新审查');
  }
  layout.properties.positioning = { enum: ['relative', 'absolute'], default: 'relative',
    description: '默认依节点父级或位置参照布局；absolute 仅允许独立浮层本体。' };
  layout.properties.floatingRootKind = { enum: ['popup', 'floating', 'toast'],
    description: '仅独立显示层的实际本体根节点声明，内部子节点不得继承。' };
  layout.properties.independentPosition = { $ref: '#/$defs/vector2',
    description: '绝对浮层本体当前目标位置；原始 bounds 仍是后代相对关系的基准。' };
  layout.allOf = [{ if: { properties: { positioning: { const: 'absolute' } }, required: ['positioning'] },
    then: { required: ['floatingRootKind', 'independentPosition'] }, else: { not: { required: ['independentPosition'] } } }];
  return `${JSON.stringify(schema, null, 2)}\n`;
}

/** 普通场景模板显式声明相对定位，实际父级与锚点仍是同一份原生事实。 */
function adaptTemplate(text) {
  const plan = JSON.parse(text);
  if (!Array.isArray(plan.nodes) || !plan.nodes.length) throw new Error('Unity 布局模板缺少实际节点');
  for (const node of plan.nodes) {
    const layout = node?.layoutBinding?.uiLayout;
    if (!layout || typeof layout !== 'object' || Object.hasOwn(layout, 'positioning')) throw new Error('Unity 模板布局字段已变化，须重新审查');
    layout.positioning = 'relative';
  }
  return `${JSON.stringify(plan, null, 2)}\n`;
}

/** 同步原生手写形状检查与共同 Schema，未知定位值不能绕过共享检查。 */
function adaptShape(text) {
  let result = replaceOnce(text, '    "interactionPolicy", "visualOverflow", "independentContainerReason", "minimumSize",',
    '    "interactionPolicy", "visualOverflow", "independentContainerReason", "minimumSize", "positioning", "floatingRootKind", "independentPosition",', '形状字段白名单');
  const anchor = '  checkString(value.layoutOwner, `${path}.layoutOwner`, errors, new Set(["PARENT", "SELF", "NONE"]));';
  result = replaceOnce(result, anchor, `${anchor}\n  // 仅字段真正省略时采用相对默认；显式 null、undefined 或无效枚举必须失败。\n  if (Object.hasOwn(value, "positioning")) checkString(value.positioning, \`${'${path}'}.positioning\`, errors, new Set(["relative", "absolute"]));\n  if (Object.hasOwn(value, "floatingRootKind")) checkString(value.floatingRootKind, \`${'${path}'}.floatingRootKind\`, errors, new Set(["popup", "floating", "toast"]));\n  if (Object.hasOwn(value, "independentPosition")) checkVector2(value.independentPosition, \`${'${path}'}.independentPosition\`, errors);\n  if (value.positioning === "absolute" && !Object.hasOwn(value, "independentPosition")) addError(errors, path, "绝对浮层本体必须声明 independentPosition");\n  if (value.positioning !== "absolute" && Object.hasOwn(value, "independentPosition")) addError(errors, path, "只有绝对浮层本体可以声明 independentPosition");`, '形状枚举');
  return result;
}

/** 从同一份原生计划节点提取父级、定位参照和本体身份，不采信额外平行关系图。 */
function adaptPlanValidator(text) {
  let result = replaceOnce(text, 'import { validateUiLayoutPlanShape } from "./layout-plan-shape.mjs";',
    'import { validateUiLayoutPlanShape } from "./layout-plan-shape.mjs";\nimport relativeLayoutPolicy from "../../app-ui-layout/scripts/relative-layout-policy.cjs";\n\nconst { validateRelativeLayoutNodes } = relativeLayoutPolicy;', '公共校验导入');
  const anchor = '    validatePlanSemantics(plan, errors);';
  const check = [
    '    // 相对关系从原生节点直接读取；独立浮层只放宽本体，不放宽内部节点。',
    '    const floatingBodies = plan.nodes.filter((node) => node.layoutBinding.uiLayout.floatingRootKind !== undefined);',
    '    if (plan.displayLayerId !== undefined && floatingBodies.length !== 1) errors.push("独立 displayLayerId 必须绑定唯一浮层本体节点。");',
    '    if (plan.displayLayerId === undefined && floatingBodies.length) errors.push("浮层本体必须属于独立 displayLayerId，不能伪装成普通场景 UI。");',
    '    for (const body of floatingBodies) if (!ROOT_IDS.has(body.parentElementId)) errors.push(`浮层本体 ${body.id} 必须直接挂载 viewport 或 safe-area。`);',
    '    const relativeNodes = plan.nodes.map((node) => {',
    '      const layout = node.layoutBinding.uiLayout;',
    '      const mode = layout.positioning ?? "relative";',
    '      return { id: node.id, parentId: node.parentElementId,',
    '        references: mode === "absolute" && layout.floatingRootKind ? [] : [positionReference(node)],',
    '        mode, floatingKind: layout.floatingRootKind ?? null };',
    '    });',
    '    errors.push(...validateRelativeLayoutNodes(relativeNodes, { label: "Unity UI", roots: ["viewport", "safe-area"] }));',
    '    for (const node of plan.nodes) {',
    '      if (node.layoutBinding.uiLayout.positioning !== "absolute") continue;',
    '      if (node.layoutBinding.centerAlignment) errors.push(`独立浮层本体 ${node.id} 不得声明居中策略。`);',
    '      if (plan.nodes.some((leader) => leader.layoutBinding.centerAlignment?.memberIds?.includes(node.id))) errors.push(`独立浮层本体 ${node.id} 不得加入居中成员组。`);',
    '    }',
    anchor,
  ].join('\n');
  result = replaceOnce(result, anchor, check, '计划关系接线');
  const geometry = '  validateGeometry(plan, nodesById, errors);\n}';
  const withAbsolute = '  validateGeometry(plan, nodesById, errors);\n  // 未派生的输入也要检查浮层目标落位，不能等到生成 targetBounds 才发现越界。\n  if (errors.length === 0 && plan.nodes.some((node) => node.layoutBinding.uiLayout.positioning === "absolute")) {\n    validateGeometry(plan, nodesById, errors, computeTargetBounds(plan));\n  }\n}';
  result = replaceOnce(result, geometry, withAbsolute, '浮层目标安全区检查');
  return result;
}

/** 保留独立浮层的实际目标位置；其他节点仍从父框和参照递归派生。 */
function adaptGeometry(text) {
  const anchor = '    if (cache.has(id)) return cache.get(id);\n    const group = groupByMember.get(id);';
  const replacement = [
    '    if (cache.has(id)) return cache.get(id);',
    '    const body = nodesById.get(id);',
    '    // 浮层本体由其状态决定落位；子节点仍使用本体的实际派生框。',
    '    if (body.layoutBinding.uiLayout.positioning === "absolute") {',
    '      const value = body.layoutBinding.uiLayout.independentPosition[axis === "horizontal" ? "x" : "y"];',
    '      cache.set(id, value);',
    '      return value;',
    '    }',
    '    const group = groupByMember.get(id);',
  ].join('\n');
  return replaceOnce(text, anchor, replacement, '目标位置派生');
}

/** 仅本体可不按父参照居中；内部节点和活动状态仍执行原有实测约束。 */
function adaptRuntime(text) {
  const start = text.indexOf('function validateActualCentering(');
  const end = text.indexOf('/** 合并多个活动成员矩形', start);
  if (start < 0 || end < 0) throw new Error('Unity 运行居中校验边界已变化');
  const section = text.slice(start, end);
  const before = '  for (const node of plan.nodes) {\n    const measurement = measurements.get(node.id);';
  const after = '  for (const node of plan.nodes) {\n    // 绝对定位只豁免已验证的浮层本体；后代仍逐个核验实际参照。\n    if (node.layoutBinding.uiLayout.positioning === "absolute") continue;\n    const measurement = measurements.get(node.id);';
  let updated = replaceOnce(section, before, after, '运行居中范围');
  const loopAnchor = '      if (!strategy && !aligned) continue;';
  const edgeCheck = [
    '      // 浮层内部非中心轴按原始锚点间距对照同批实际参照，不能依赖可空 targetRect。',
    '      if (!strategy && !aligned && isFloatingDescendant(node, nodesById)) {',
    '        const sourceReference = nodesById.get(referenceId)?.bounds ?? plan.roots[referenceId];',
    '        if (!observedReference || !sourceReference) {',
    '          errors.push(`节点 ${node.id} 的 ${axis} 相对定位缺少实际位置参照矩形。`);',
    '          continue;',
    '        }',
    '        const alignment = node.layoutBinding.axisAlignment[axis];',
    '        const gap = edgeCoordinate(node.bounds, axis, alignment) - edgeCoordinate(sourceReference, axis, alignment);',
    '        const actualGap = edgeCoordinate(rect, axis, alignment) - edgeCoordinate(observedReference, axis, alignment);',
    '        if (Math.abs(actualGap - gap) > EPSILON) errors.push(`节点 ${node.id} 的实际 ${axis} 相对锚点间距与计划不一致。`);',
    '        continue;',
    '      }',
    loopAnchor,
  ].join('\n');
  updated = replaceOnce(updated, loopAnchor, edgeCheck, '运行边缘锚点');
  updated = replaceOnce(updated, '  const groupByMemberAndAxis = new Map();',
    '  const nodesById = new Map(plan.nodes.map((node) => [node.id, node]));\n  const groupByMemberAndAxis = new Map();', '运行节点索引');
  const helpers = [
    '/** 沿已校验的父链识别浮层后代，本体自身不享有后代检查。 */',
    'function isFloatingDescendant(node, nodesById) {',
    '  let parent = nodesById.get(node.parentElementId);',
    '  while (parent) {',
    '    if (parent.layoutBinding.uiLayout.floatingRootKind) return true;',
    '    parent = nodesById.get(parent.parentElementId);',
    '  }',
    '  return false;',
    '}',
    '',
    '/** 与计划派生一致地读取左右或上下边缘，尺寸变化时仍保留原始间距。 */',
    'function edgeCoordinate(rect, axis, alignment) {',
    '  if (axis === "horizontal") return rect.x + (alignment === "right" ? rect.width : 0);',
    '  return rect.y + (alignment === "bottom" ? rect.height : 0);',
    '}',
    '',
  ].join('\n');
  return text.slice(0, start) + helpers + updated + text.slice(end);
}

/** 将本体身份绑定到当前独立显示层和实际类型，不能仅凭组件自报类型取得豁免。 */
function adaptEvidence(text) {
  const anchor = "  const uiSystem = work.responsiveContract.uiSystem === 'UGUI' ? 'UGUI' : 'UI_TOOLKIT';";
  const binding = [
    "  if (work.workItemType === 'DISPLAY_LAYER') {",
    '    const body = plan.nodes.find((node) => node.layoutBinding.uiLayout.floatingRootKind !== undefined);',
    "    const allowed = { popup: ['popup', 'modal'], floating: ['popup', 'modal', 'drawer'], toast: ['toast'] };",
    "    if (!body || !allowed[body.layoutBinding.uiLayout.floatingRootKind]?.includes(work.displayLayer.type)) throw new Error('浮层本体类型必须绑定当前 DISPLAY_LAYER 的真实类型');",
    '  }',
    anchor,
  ].join('\n');
  return replaceOnce(text, anchor, binding, '显示层身份绑定');
}

/** 返回可追溯的原生变换；不读取、覆盖或移动五个源仓库的文件。 */
export function adaptUnityRelativeLayout(text, { stack, sourcePath } = {}) {
  if (stack !== 'unity') return { text, transforms: [] };
  const routes = new Map([
    [`${ROOT}schemas/common.schema.json`, adaptCommonSchema],
    [`${ROOT}templates/ui-layout-plan.json`, adaptTemplate],
    [`${ROOT}scripts/layout-plan-shape.mjs`, adaptShape],
    [`${ROOT}scripts/layout-plan-validation.mjs`, adaptPlanValidator],
    [`${ROOT}scripts/layout-geometry.mjs`, adaptGeometry],
    [`${ROOT}scripts/layout-runtime-validation.mjs`, adaptRuntime],
    [EVIDENCE, adaptEvidence],
  ]);
  const transform = routes.get(sourcePath);
  if (!transform) return { text, transforms: [] };
  if (typeof text !== 'string') throw new TypeError('Unity 相对布局来源必须是文本');
  return { text: transform(text.replaceAll('\r\n', '\n')), transforms: ['enforce-unity-relative-ui-layout'] };
}
