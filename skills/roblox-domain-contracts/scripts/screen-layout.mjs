/** Roblox 屏幕 GUI 的原生停靠、布局所有权和结构化回读合同。 */
import relativeLayoutPolicy from '../../app-ui-layout/scripts/relative-layout-policy.cjs';
import { WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { fileIdentity, instancePath, object, observedNode, text } from './common.mjs';

const { validateRelativeLayoutNodes } = relativeLayoutPolicy;
const CONTROLLERS = new Set(['UIListLayout', 'UIGridLayout']);
const SCREEN_INSETS = new Set(['None', 'DeviceSafeInsets', 'CoreUISafeInsets', 'TopbarSafeInsets']);
const SIZE_WRITERS = new Set(['UDIM2', 'LAYOUT', 'AUTOMATIC']);
const POSITION_WRITERS = new Set(['UDIM2', 'UIListLayout', 'UIGridLayout', 'SHARED']);
const GUI_OBJECT_CLASSES = new Set(['Frame', 'CanvasGroup', 'ScrollingFrame', 'VideoFrame', 'ViewportFrame', 'ImageButton', 'TextButton', 'ImageLabel', 'TextLabel', 'TextBox', 'InputActionLabel']);
const SIZE_CONSTRAINTS = new Set(['RelativeXY', 'RelativeXX', 'RelativeYY']);

/** ScreenGui 的已知原生子类同样使用屏幕容器合同。 */
export function isScreenGuiClass(className) { return className === 'ScreenGui' || className === 'GuiMain'; }

/** 真实 GuiObject 位于自身 GUI 容器的二维空间，世界宿主仍保持世界坐标。 */
export function validateGuiCoordinateSpace(nodes) {
  for (const node of nodes.values()) {
    if ((isScreenGuiClass(node.className) || GUI_OBJECT_CLASSES.has(node.className)) && node.space !== 'screen-scale-offset') throw new WorkflowError('原生屏幕 GUI 必须使用其容器的 screen-scale-offset 坐标空间');
  }
}

/** 只接受真实有限二维参数，避免不完整对象或字符串冒充原生数值。 */
function vector(value, keys, label) {
  object(value, label);
  for (const key of keys) if (!Number.isFinite(value[key]) || !Number.isFinite(Math.fround(value[key]))) throw new WorkflowError(`${label}.${key} 必须是原生范围内的有限数值`);
}

/** 校验归一化 UDim2；offset 为负数可表达相对右侧或底部的边距。 */
function udim2(value, label) { vector(value, ['xScale', 'xOffset', 'yScale', 'yOffset'], label); }

/** 校验声明的坐标原点；Roblox 原点可处在自身矩形以外。 */
function anchor(value, label) { vector(value, ['x', 'y'], label); }

/** 判断真实直接父路径，避免将定位参照错当成实例父级。 */
function directChild(parent, child) {
  return child.length === parent.length + 1 && parent.every((part, index) => child[index] === part);
}

/** 原生布局容器须明确实际实例和双轴排布配置，而非仅声称父级控制。 */
function validateController(controller, node) {
  if (controller === undefined) return;
  object(controller, '原生布局控制器');
  if (!CONTROLLERS.has(controller.className)) throw new WorkflowError('屏幕 UI 原生布局只接受 UIListLayout 或 UIGridLayout');
  if (!directChild(instancePath(node.instancePath), instancePath(controller.instancePath))) throw new WorkflowError('原生布局控制器必须是实际容器的直接子实例');
  for (const name of ['fillDirection', 'horizontalAlignment', 'verticalAlignment', 'sortOrder']) text(controller[name], `原生布局控制器 ${name}`);
  if (!['Horizontal', 'Vertical'].includes(controller.fillDirection) || !['Left', 'Center', 'Right'].includes(controller.horizontalAlignment) || !['Top', 'Center', 'Bottom'].includes(controller.verticalAlignment)) throw new WorkflowError('原生布局方向或双轴对齐无效');
  if (controller.className === 'UIListLayout') {
    vector(controller.padding, ['scale', 'offset'], '列表间距');
    if (typeof controller.wraps !== 'boolean') throw new WorkflowError('列表布局必须明确是否换行');
    for (const name of ['horizontalFlex', 'verticalFlex', 'itemLineAlignment']) text(controller[name], `列表布局 ${name}`);
  } else {
    udim2(controller.cellSize, '网格单元尺寸');
    udim2(controller.cellPadding, '网格单元间距');
    if (!Number.isFinite(controller.fillDirectionMaxCells) || controller.fillDirectionMaxCells < 0) throw new WorkflowError('网格每行最大单元数无效');
    text(controller.startCorner, '网格起始角');
  }
}

/** 记录动态例外的范围和恢复条件，不能用“功能需要”替代具体规则。 */
function validateBehavior(behavior) {
  if (behavior === undefined) return;
  object(behavior, '位置行为');
  for (const key of ['reason', 'trigger', 'recovery']) text(behavior[key], `位置行为 ${key}`);
  if (!Array.isArray(behavior.properties) || behavior.properties.length !== 1 || behavior.properties[0] !== 'Position') throw new WorkflowError('位置行为只能声明受控 Position 属性');
  if (behavior.ownership !== 'EXCLUSIVE') throw new WorkflowError('位置行为必须声明活动期间的独占控制权');
}

/** 未实现的尺寸修饰器不得被当作不存在，否则无法判断实际尺寸影响。 */
function validateSizeModifiers(modifiers) {
  if (!Array.isArray(modifiers)) throw new WorkflowError('屏幕 GUI 必须声明尺寸修饰器列表');
  if (modifiers.length) throw new WorkflowError('当前尺寸修饰器尚未受此合同验证，需保留未验证');
}

/** 显式绑定单个列表子项的原生 Flex 组件，避免运行时悄然改变尺寸所有者。 */
function validateFlexItem(item, node) {
  if (item === undefined) return;
  object(item, '原生 Flex 子项');
  if (!directChild(instancePath(node.instancePath), instancePath(item.instancePath))) throw new WorkflowError('UIFlexItem 必须是对应 GUI 的直接子实例');
  if (!['None', 'Grow', 'Shrink', 'Fill', 'Custom'].includes(item.flexMode)) throw new WorkflowError('UIFlexItem FlexMode 无效');
  if (![item.growRatio, item.shrinkRatio].every((value) => Number.isFinite(value) && value >= 0)) throw new WorkflowError('UIFlexItem 权重必须为有限非负值');
  text(item.itemLineAlignment, 'UIFlexItem 对齐');
}

/** 原生网格、列表 Flex 与单项 Flex 的实际尺寸权限按轴区分。 */
function validateSizeOwnership(node, parent, writer) {
  object(node.sizeWriters, 'GUI 尺寸控制者');
  for (const axis of ['horizontal', 'vertical']) {
    const sizeWriter = node.sizeWriters[axis];
    if (!SIZE_WRITERS.has(sizeWriter)) throw new WorkflowError(`GUI ${axis} 尺寸必须声明唯一控制者`);
    if (sizeWriter === 'LAYOUT' && !CONTROLLERS.has(writer)) throw new WorkflowError('非布局子项不能声明布局尺寸控制');
    if (writer === 'UIGridLayout' && sizeWriter !== 'LAYOUT') throw new WorkflowError('UIGridLayout 子项的双轴尺寸由网格控制');
  }
  if (writer !== 'UIListLayout') return;
  const controller = parent.layoutController;
  const main = controller.fillDirection === 'Horizontal' ? 'horizontal' : 'vertical';
  const cross = main === 'horizontal' ? 'vertical' : 'horizontal';
  const flex = main === 'horizontal' ? controller.horizontalFlex : controller.verticalFlex;
  const alignment = node.flexItem?.itemLineAlignment && node.flexItem.itemLineAlignment !== 'Automatic' ? node.flexItem.itemLineAlignment : controller.itemLineAlignment;
  if ((flex === 'Fill' || (node.flexItem && node.flexItem.flexMode !== 'None')) && node.sizeWriters[main] !== 'LAYOUT') throw new WorkflowError('列表 Flex 控制主轴尺寸时不能声明其他最终尺寸控制者');
  if (alignment === 'Stretch' && node.sizeWriters[cross] !== 'LAYOUT') throw new WorkflowError('列表 Stretch 控制交叉轴尺寸时不能声明其他最终尺寸控制者');
}

/** 共享定位只有在真实非父级参照下可用，并需可验证的源文件和双轴关系。 */
function validateShared(node, parentId) {
  if (node.positionReferenceId === parentId) throw new WorkflowError('真实父级参照可由原生 UDim2 表达，不能退回共享位置驱动');
  text(node.sharedReason, '共享定位的原生能力限制');
  object(node.sharedSourceRef, '共享定位正式脚本引用');
  text(node.sharedSourceRef.path, '共享定位正式脚本路径');
  if (!/^[a-f0-9]{64}$/.test(node.sharedSourceRef.sha256 ?? '')) throw new WorkflowError('共享定位正式脚本缺少 SHA-256');
  object(node.sharedDocking, '共享定位双轴约束');
  for (const axis of ['horizontal', 'vertical']) {
    const relation = object(node.sharedDocking[axis], `共享定位 ${axis}`);
    vector(relation, ['self', 'reference', 'offset', 'tolerance'], `共享定位 ${axis}`);
    if (relation.tolerance < 0) throw new WorkflowError('共享定位容差不能为负数');
    text(relation.toleranceReason, `共享定位 ${axis} 容差依据`);
  }
}

/** 将真实屏幕节点投影到既有公共关系校验器，不将世界空间节点当作屏幕 UI。 */
export function validateScreenPlan(layout, nodes) {
  const screen = [...nodes.values()].filter((node) => node.space === 'screen-scale-offset');
  if (!screen.length) return;
  const external = layout.externalParent;
  const roots = new Set(['viewport', 'safe-area']);
  for (const node of nodes.values()) if (node.space === 'world-studs') roots.add(node.id);
  if (external !== undefined) {
    object(external, '屏幕布局外部父级');
    text(external.id, '屏幕布局外部父级 ID');
    text(external.className, '屏幕布局外部父级类型');
    instancePath(external.instancePath, '屏幕布局外部父级路径');
    if (nodes.has(external.id) || roots.has(external.id)) throw new WorkflowError('屏幕布局外部父级 ID 冲突');
    if (isScreenGuiClass(external.className) && (!SCREEN_INSETS.has(external.screenInsets) || typeof external.clipToDeviceSafeArea !== 'boolean')) throw new WorkflowError('外部 ScreenGui 必须声明实际安全区配置');
    if (isScreenGuiClass(nodes.get(layout.rootId)?.className)) throw new WorkflowError('ScreenGui 根不能伪造额外外部父容器');
    validateSizeModifiers(external.sizeModifiers);
    if (GUI_OBJECT_CLASSES.has(external.className) && !SIZE_CONSTRAINTS.has(external.sizeConstraint)) throw new WorkflowError('外部 GUI 必须声明实际 SizeConstraint');
    validateController(external.layoutController, external);
    roots.add(external.id);
  }
  const canonical = [];
  for (const node of screen) {
    const isRoot = node.parentId === null;
    const parent = isRoot ? external : nodes.get(node.parentId);
    validateSizeModifiers(node.sizeModifiers);
    if (isScreenGuiClass(node.className)) {
      if (!isRoot) throw new WorkflowError('ScreenGui 必须是屏幕布局根');
      if (!SCREEN_INSETS.has(node.screenInsets)) throw new WorkflowError('ScreenGui 必须声明实际 ScreenInsets');
      if (typeof node.clipToDeviceSafeArea !== 'boolean') throw new WorkflowError('ScreenGui 必须声明实际 ClipToDeviceSafeArea');
      const boundary = node.screenInsets === 'None' ? 'viewport' : 'safe-area';
      if (node.positionReferenceId !== boundary) throw new WorkflowError('ScreenGui 参照必须匹配实际 ScreenInsets');
      validateController(node.layoutController, node);
      canonical.push({ id: node.id, parentId: boundary, references: [boundary], mode: 'relative', floatingKind: null });
      continue;
    }
    if (isRoot && (!external || !directChild(instancePath(external.instancePath), instancePath(node.instancePath)))) throw new WorkflowError('独立 GUI 根必须绑定真实外部父级');
    const parentId = isRoot ? external.id : node.parentId;
    if (!parent || !node.positionReferenceId) throw new WorkflowError('屏幕 GUI 必须声明实际父级和定位参照');
    if (parent.space === 'world-studs') {
      validateController(parent.layoutController, parent);
      validateSizeModifiers(parent.sizeModifiers);
    }
    anchor(node.anchorPoint, 'GUI AnchorPoint');
    udim2(node.position, 'GUI Position');
    udim2(node.size, 'GUI Size');
    if (!SIZE_CONSTRAINTS.has(node.sizeConstraint)) throw new WorkflowError('GUI 必须声明实际 SizeConstraint');
    if (!Array.isArray(node.positionWriters) || node.positionWriters.length !== 1 || !POSITION_WRITERS.has(node.positionWriters[0])) throw new WorkflowError('屏幕 GUI 必须有唯一的原生或共享位置控制者');
    const writer = node.positionWriters[0];
    if (CONTROLLERS.has(writer)) {
      if (parent.layoutController?.className !== writer || node.positionReferenceId !== parentId) throw new WorkflowError('GUI 父布局控制者与实际父级或定位参照不一致');
      if (node.behavior !== undefined) throw new WorkflowError('原生父布局控制位置时，位置行为不能同时争写');
    } else if (parent.layoutController !== undefined) {
      throw new WorkflowError('原生父布局已经控制位置，不能由其他控制者争写');
    } else if (writer === 'UDIM2') {
      if (node.positionReferenceId !== parentId) throw new WorkflowError('UDim2 原生定位只能以实际父级为参照');
    } else {
      validateShared(node, parentId);
    }
    validateFlexItem(node.flexItem, node);
    validateSizeOwnership(node, parent, writer);
    validateBehavior(node.behavior);
    validateController(node.layoutController, node);
    canonical.push({ id: node.id, parentId, references: [node.positionReferenceId], mode: 'relative', floatingKind: null });
  }
  const errors = validateRelativeLayoutNodes(canonical, { label: 'Roblox 屏幕 GUI', roots: [...roots] });
  if (errors.length) throw new WorkflowError(errors.join('；'));
}

/** 对同一轴比较实际原生字段，避免用其他节点的值或全局字符串代替。 */
function compareVector(actual, expected, keys, label) {
  vector(actual, keys, label);
  // Roblox 的 Vector2 和 UDim scale 以单精度保存；offset 保持精确整数语义。
  if (keys.some((key) => /offset/i.test(key) ? actual[key] !== expected[key] : Math.fround(actual[key]) !== Math.fround(expected[key]))) throw new WorkflowError(`${label} 与当前布局规格不一致`);
}

/** 从父实例的实际子项列举布局组件，确认当前位置控制者唯一。 */
function validateObservedController(observation, path, expected, capture) {
  const controllers = observation.properties.LayoutControllers;
  if (!Array.isArray(controllers)) throw new WorkflowError('实际父容器缺少原生布局组件列表');
  if (controllers.length > 1) throw new WorkflowError('同一父容器存在多个原生布局组件，位置所有权不唯一');
  if (!expected) {
    if (controllers.length) throw new WorkflowError('实际父容器存在未声明的原生布局组件');
    return;
  }
  const actual = controllers[0];
  const expectedPath = [...path, expected.instancePath.at(-1)];
  if (!actual || actual.className !== expected.className || JSON.stringify(actual.instancePath) !== JSON.stringify(expectedPath)) throw new WorkflowError('实际父布局组件与当前规格错绑');
  const readback = observedNode(capture, expectedPath, '原生布局组件回读');
  if (readback.className !== expected.className) throw new WorkflowError('原生布局组件实际类型不一致');
  for (const [property, key] of [['FillDirection', 'fillDirection'], ['HorizontalAlignment', 'horizontalAlignment'], ['VerticalAlignment', 'verticalAlignment'], ['SortOrder', 'sortOrder']]) {
    if (readback.properties[property] !== expected[key]) throw new WorkflowError(`原生布局组件 ${property} 与布局规格不一致`);
  }
  if (expected.className === 'UIListLayout') {
    compareVector(readback.properties.Padding, expected.padding, ['scale', 'offset'], '列表实际 Padding');
    for (const [property, key] of [['Wraps', 'wraps'], ['HorizontalFlex', 'horizontalFlex'], ['VerticalFlex', 'verticalFlex'], ['ItemLineAlignment', 'itemLineAlignment']]) {
      if (readback.properties[property] !== expected[key]) throw new WorkflowError(`原生列表组件 ${property} 与布局规格不一致`);
    }
  } else {
    for (const [property, key] of [['CellSize', 'cellSize'], ['CellPadding', 'cellPadding']]) compareVector(readback.properties[property], expected[key], ['xScale', 'xOffset', 'yScale', 'yOffset'], `网格实际 ${property}`);
    if (readback.properties.FillDirectionMaxCells !== expected.fillDirectionMaxCells || readback.properties.StartCorner !== expected.startCorner) throw new WorkflowError('原生网格最大单元数或起始角与布局规格不一致');
  }
}

/** 从实际 GUI 子项读取 UIFlexItem 及其原生参数，拒绝计划外的尺寸修改器。 */
function validateObservedFlexItem(observation, path, expected, capture) {
  const items = observation.properties.FlexItems;
  if (!Array.isArray(items)) throw new WorkflowError('实际 GUI 缺少 UIFlexItem 组件列表');
  if (items.length > 1) throw new WorkflowError('同一 GUI 存在多个 UIFlexItem，尺寸所有权不唯一');
  if (!expected) {
    if (items.length) throw new WorkflowError('实际 GUI 存在未声明的 UIFlexItem');
    return;
  }
  const expectedPath = [...path, expected.instancePath.at(-1)];
  if (items.length !== 1 || items[0].className !== 'UIFlexItem' || JSON.stringify(items[0].instancePath) !== JSON.stringify(expectedPath)) throw new WorkflowError('实际 UIFlexItem 与当前规格错绑');
  const actual = observedNode(capture, expectedPath, '原生 Flex 子项回读');
  if (actual.className !== 'UIFlexItem') throw new WorkflowError('实际 Flex 子项类型不一致');
  for (const [property, key] of [['FlexMode', 'flexMode'], ['GrowRatio', 'growRatio'], ['ShrinkRatio', 'shrinkRatio'], ['ItemLineAlignment', 'itemLineAlignment']]) {
    if (actual.properties[property] !== expected[key]) throw new WorkflowError(`实际 UIFlexItem ${property} 与布局规格不一致`);
  }
}

/** 原生读回须列出尺寸修饰器；存在未知组件时不推断最终尺寸已验证。 */
function validateObservedSizeModifiers(observation) {
  const modifiers = observation.properties.SizeModifiers;
  if (!Array.isArray(modifiers)) throw new WorkflowError('实际 GUI 缺少尺寸修饰器列表');
  if (modifiers.length) throw new WorkflowError('实际 GUI 含尚未验证的尺寸修饰器');
}

/** 检查共享布局在实际运行时与参照对象保持双轴关系；旋转时不能套用轴对齐公式。 */
function validateSharedPosition(node, actual, reference) {
  for (const item of [actual, reference]) {
    vector(item.properties.AbsolutePosition, ['x', 'y'], '共享定位实际位置');
    vector(item.properties.AbsoluteSize, ['x', 'y'], '共享定位实际尺寸');
    if (item.properties.AbsoluteRotation !== 0) throw new WorkflowError('旋转场景的共享定位需要实际坐标转换证据');
  }
  for (const [axis, key] of [['horizontal', 'x'], ['vertical', 'y']]) {
    const rule = node.sharedDocking[axis];
    const actualPoint = actual.properties.AbsolutePosition[key] + actual.properties.AbsoluteSize[key] * rule.self;
    const referencePoint = reference.properties.AbsolutePosition[key] + reference.properties.AbsoluteSize[key] * rule.reference + rule.offset;
    if (Math.abs(actualPoint - referencePoint) > rule.tolerance) throw new WorkflowError(`共享定位 ${axis} 的实际位置未满足双轴关系`);
  }
}

/** 逐节点核对 Edit 保存回读或 Client 实例；结果只证明采集记录一致。 */
export function validateScreenReadback(repo, layout, nodes, capture, { runtime = false, runtimePaths, sources } = {}) {
  const screen = [...nodes.values()].filter((node) => node.space === 'screen-scale-offset');
  if (!screen.length) return;
  const paths = runtimePaths ?? new Map(screen.map((node) => [node.id, node.instancePath]));
  const observations = new Map();
  const root = nodes.get(layout.rootId);
  if (layout.externalParent && root?.space === 'screen-scale-offset' && !isScreenGuiClass(root.className)) {
    // 独立 Frame 的真实父级在工作项之外，仍须回读其容器及原生布局组件。
    const path = runtime ? instancePath(paths.get(root.id)).slice(0, -1) : instancePath(layout.externalParent.instancePath);
    const actual = observedNode(capture, path, '屏幕 GUI 外部父级回读');
    if (actual.className !== layout.externalParent.className || actual.properties.IsGuiBase2d !== true) throw new WorkflowError('屏幕 GUI 外部父级实际类型不一致');
    if (isScreenGuiClass(actual.className) && (actual.properties.ScreenInsets !== layout.externalParent.screenInsets || actual.properties.ClipToDeviceSafeArea !== layout.externalParent.clipToDeviceSafeArea)) throw new WorkflowError('外部 ScreenGui 实际安全区配置不一致');
    if (GUI_OBJECT_CLASSES.has(actual.className) && actual.properties.SizeConstraint !== layout.externalParent.sizeConstraint) throw new WorkflowError('外部 GUI 实际 SizeConstraint 不一致');
    validateObservedController(actual, path, layout.externalParent.layoutController, capture);
    validateObservedSizeModifiers(actual);
    observations.set(layout.externalParent.id, actual);
  }
  for (const node of screen) {
    const parent = nodes.get(node.parentId);
    if (!parent || parent.space !== 'world-studs' || observations.has(parent.id)) continue;
    // 世界宿主内部的 GUI 仍需证明真实容器，不把世界几何当作屏幕控件。
    const path = runtime ? instancePath(paths.get(parent.id)) : instancePath(parent.instancePath);
    const actual = observedNode(capture, path, '世界宿主 GUI 父级回读');
    if (actual.className !== parent.className || actual.properties.IsGuiBase2d !== true) throw new WorkflowError('跨坐标空间父级必须是实际 GUI 容器');
    validateController(parent.layoutController, parent);
    validateSizeModifiers(parent.sizeModifiers);
    validateObservedController(actual, path, parent.layoutController, capture);
    validateObservedSizeModifiers(actual);
    observations.set(parent.id, actual);
  }
  for (const node of screen) {
    const path = instancePath(paths.get(node.id), '屏幕 GUI 实际路径');
    const actual = observedNode(capture, path, '屏幕 GUI 实际回读');
    if (actual.className !== node.className) throw new WorkflowError('屏幕 GUI 实际类型与布局规格不一致');
    observations.set(node.id, actual);
    validateObservedController(actual, path, node.layoutController, capture);
    validateObservedSizeModifiers(actual);
    if (isScreenGuiClass(node.className)) {
      if (actual.properties.ScreenInsets !== node.screenInsets || actual.properties.ClipToDeviceSafeArea !== node.clipToDeviceSafeArea) throw new WorkflowError('ScreenGui 实际 ScreenInsets 或 ClipToDeviceSafeArea 与布局规格不一致');
      continue;
    }
    if (actual.properties.IsGuiObject !== true) throw new WorkflowError('屏幕节点实际类型不是 GuiObject');
    validateObservedFlexItem(actual, path, node.flexItem, capture);
    if (actual.properties.SizeConstraint !== node.sizeConstraint) throw new WorkflowError('GUI 实际 SizeConstraint 与布局规格不一致');
    compareVector(actual.properties.AnchorPoint, node.anchorPoint, ['x', 'y'], 'GUI 实际 AnchorPoint');
    udim2(actual.properties.Position, 'GUI 实际 Position');
    udim2(actual.properties.Size, 'GUI 实际 Size');
    if (!runtime || node.positionWriters[0] === 'UDIM2') compareVector(actual.properties.Position, node.position, ['xScale', 'xOffset', 'yScale', 'yOffset'], 'GUI 实际 Position');
    const automatic = actual.properties.AutomaticSize;
    if (!['None', 'X', 'Y', 'XY'].includes(automatic)) throw new WorkflowError('GUI 实际 AutomaticSize 无效');
    for (const [axis, letter, keys] of [['horizontal', 'X', ['xScale', 'xOffset']], ['vertical', 'Y', ['yScale', 'yOffset']]]) {
      const writer = node.sizeWriters[axis];
      const automaticAxis = automatic === letter || automatic === 'XY';
      if ((writer === 'AUTOMATIC' && !automaticAxis) || (writer === 'UDIM2' && automaticAxis)) throw new WorkflowError(`GUI ${axis} 的 AutomaticSize 与尺寸控制者冲突`);
      if (!runtime || writer === 'UDIM2') compareVector(actual.properties.Size, node.size, keys, `GUI ${axis} 实际 Size`);
    }
    if (node.positionWriters[0] === 'SHARED') {
      fileIdentity(repo, node.sharedSourceRef, '共享定位正式脚本');
      if (!Array.isArray(sources) || !sources.some((source) => source.ref?.path === node.sharedSourceRef.path && source.ref?.sha256 === node.sharedSourceRef.sha256 && /\.luau$/i.test(source.ref.path))) throw new WorkflowError('共享定位脚本未绑定当前正式源');
    }
  }
  if (runtime) for (const node of screen) if (node.positionWriters?.[0] === 'SHARED') {
    const reference = observations.get(node.positionReferenceId);
    if (!reference) throw new WorkflowError('共享定位运行观察缺少实际参照节点');
    validateSharedPosition(node, observations.get(node.id), reference);
  }
}
