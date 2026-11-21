import { isDeepStrictEqual } from 'node:util';
import { extractFigmaNodeStyle, extractFlutterNodeFacts, figmaNodeBounds } from './figma-design-properties.mjs';

/** 查找真实祖先，允许略过纯组织容器但不能跨无关分支。 */
function containsNode(nodes, ancestorId, childId) {
  let current = nodes.find((node) => node.id === childId);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id); current = nodes.find((node) => node.id === current.parentId);
  }
  return false;
}

/** 有独立可见表现的容器必须映射；没有绘制职责的组织容器可以省略。 */
function hasVisibleContainerStyle(node) {
  const shown = (value) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.some((item) => shown(item));
    if (typeof value === 'string') return Boolean(value.trim()) && !/^(transparent|#[0-9a-f]{6}00)$/i.test(value.trim());
    return typeof value === 'object' && value.visible !== false && value.opacity !== 0;
  };
  const opacity = node.opacity ?? node.properties?.opacity;
  if (opacity === 0) return false;
  return shown(node.fills ?? node.properties?.fill) || shown(node.strokes) || shown(node.effects) ||
    (Number.isFinite(node.properties?.border?.width) && node.properties.border.width > 0) ||
    (Number.isFinite(opacity) && opacity > 0 && opacity < 1);
}

/** 以实际描边范围生成直线的原生布局容器，并保留线条相对容器的原点。 */
export function extractFigmaLineLayout(nodes, line, parent, { pixelGrid = false } = {}) {
  if (line?.type !== 'LINE' || !parent) throw new Error('直线原生布局需要实际 LINE 与父节点');
  const painted = figmaNodeBounds(nodes, line); const base = figmaNodeBounds(nodes, parent);
  const preciseX = painted.x - base.x; const preciseY = painted.y - base.y;
  // ESP32 使用整数像素，向外包围保留源描边；容器尺寸不改变线条自身的厚度。
  const x = pixelGrid ? Math.floor(preciseX) : preciseX;
  const y = pixelGrid ? Math.floor(preciseY) : preciseY;
  const width = pixelGrid ? Math.ceil(preciseX + painted.width) - x : painted.width;
  const height = pixelGrid ? Math.ceil(preciseY + painted.height) - y : painted.height;
  let current = line; let startX = 0; let startY = 0; const seen = new Set();
  while (current?.parentId !== null) {
    if (!current || seen.has(current.id)) throw new Error(`节点 ${line.id} 的父链缺失或成环`);
    seen.add(current.id); startX += current.x; startY += current.y;
    current = nodes.find((item) => item.id === current.parentId);
  }
  if (!current) throw new Error(`节点 ${line.id} 的父链缺失`);
  return { x, y, width, height, origin: { x: startX - base.x - x, y: startY - base.y - y } };
}

/** 验证独立触控容器真实包含视觉轮廓，不能通过放大视觉尺寸伪造命中。 */
export function extractFigmaTouchTarget(nodes, node, mapping, assert) {
  if (!mapping.touchNodeId) return null;
  const touch = nodes.find((item) => item.id === mapping.touchNodeId);
  assert(touch && containsNode(nodes, touch.id, node.id), `设计项 ${mapping.designItemId} 的触控容器须为真实祖先`);
  // 旋转直线的本地高为零，必须比较真实绘制边界而不是未旋转的本地尺寸。
  const bounds = figmaNodeBounds(nodes, touch); const visual = figmaNodeBounds(nodes, node);
  assert(bounds.x <= visual.x && bounds.y <= visual.y && bounds.x + bounds.width >= visual.x + visual.width && bounds.y + bounds.height >= visual.y + visual.height,
    `设计项 ${mapping.designItemId} 的触控容器未包围视觉轮廓`);
  return { nodeId: touch.id, width: touch.width, height: touch.height, unit: 'logical-px' };
}

/** 将 Figma 实际属性与 Flutter 计划逐项比较，保留可追溯的源值和单位。 */
export function validateFigmaNativeFacts(repo, work, doc, handoff, approved, plan, { sameRef, readFrozen, assert }) {
  const used = new Set();
  const sourceAssets = new Map();
  const byId = new Map(handoff.mappings.map((mapping) => [mapping.designItemId, mapping]));
  for (const mapping of handoff.mappings) {
    const target = approved.find(({ ref }) => sameRef(repo, ref, mapping.figmaDesignRef ?? doc.figmaDesignRef));
    assert(target, `设计项 ${mapping.designItemId} 缺少 Figma 状态`);
    const node = target.snapshot.nodes.find((item) => item.id === mapping.nodeId);
    assert(node, `设计项 ${mapping.designItemId} 缺少实际节点`);
    const touchTarget = extractFigmaTouchTarget(target.snapshot.nodes, node, mapping, assert);
    const key = `${target.ref.path}:${target.ref.sha256}:${node.id}`;
    assert(!used.has(key), '不同设计项不能全部指向同一个无关节点'); used.add(key);
    const element = plan.elements?.find((item) => item.id === mapping.designItemId);
    if (!element) {
      const native = plan.nodes.find((item) => item.id === mapping.designItemId);
      let parentNode;
      if (native.parentId !== null) {
        const parent = byId.get(native.parentId);
        assert(parent && containsNode(target.snapshot.nodes, parent.nodeId, node.id), '原生父子关系未按 Figma 真实结构还原');
        parentNode = target.snapshot.nodes.find((item) => item.id === parent.nodeId);
      }
      // Figma LINE 的零高几何不能直接作为原生可绘制容器；保留源样式并核对推导边界。
      const bounds = node.type === 'LINE' ? extractFigmaLineLayout(target.snapshot.nodes, node, parentNode, { pixelGrid: work.stack === 'esp32' }) : node;
      for (const property of ['x', 'y', 'width', 'height']) assert(native[property] === bounds[property], `原生布局 ${mapping.designItemId}.${property} 未按 Figma 节点还原`);
      assert(isDeepStrictEqual(native.designProperties ?? mapping.nativeStyle, extractFigmaNodeStyle(node)), `原生布局 ${mapping.designItemId} 字体、颜色或形态未从 Figma 提取`);
      continue;
    }
    const sourceTarget = target.snapshot.reconstruction?.sourceTargetRef ?? target.referenceTarget ?? doc.referenceTarget;
    assert(sameRef(repo, element.targetRef, sourceTarget), '原生设计项未绑定对应状态的已确认源图');
    if (element.parentId !== null) {
      const parent = byId.get(element.parentId);
      assert(parent && containsNode(target.snapshot.nodes, parent.nodeId, node.id), '原生设计项父子关系偏离 Figma');
    }
    const implementation = plan.implementations.find((item) => item.id === element.implementationId);
    assert(implementation, '设计项缺少真实原生实现');
    assert(isDeepStrictEqual(element.region, figmaNodeBounds(target.snapshot.nodes, node)), `设计项 ${mapping.designItemId} 未保留源节点目标区域`);
    const assets = (target.snapshot.assets ?? []).filter((asset) => Array.isArray(asset.nodeIds) && asset.nodeIds.some((id) => containsNode(target.snapshot.nodes, node.id, id)));
    const expectedAssets = sourceAssets.get(implementation.id) ?? new Map();
    for (const asset of assets) {
      const previous = expectedAssets.get(asset.id);
      assert(!previous || isDeepStrictEqual(previous, asset), `素材 ${asset.id} 的来源不一致`);
      expectedAssets.set(asset.id, asset);
    }
    sourceAssets.set(implementation.id, expectedAssets);
    const requirements = implementation.requirements;
    assert(Boolean(requirements.touchTarget) === Boolean(touchTarget), `设计项 ${mapping.designItemId} 的触控容器计划与映射不一致`);
    if (touchTarget) assert(isDeepStrictEqual(requirements.touchTarget.value, touchTarget), `设计项 ${mapping.designItemId} 的触控尺寸与实际容器不一致`);
    const textNodes = target.snapshot.nodes.filter((item) => item.type === 'TEXT' && containsNode(target.snapshot.nodes, node.id, item.id));
    const text = mapping.textNodeId ? textNodes.find((item) => item.id === mapping.textNodeId) : textNodes.length === 1 ? textNodes[0] : null;
    const facts = extractFlutterNodeFacts(node, text);
    for (const property of ['size', 'spacing', 'typography', 'color', 'border', 'shape', 'appearance']) {
      const expected = requirements[property];
      if (isDeepStrictEqual(expected?.value, facts[property])) continue;
      // 已有明确的局部设计变更才能替代真实源属性，普通差异不能默认为适配。
      const adaptation = mapping.adaptations?.find((item) => item.property === property);
      assert(expected?.basis === 'approved-change' && expected.approvalRef && adaptation && typeof adaptation.reason === 'string' && adaptation.reason.trim() && sameRef(repo, adaptation.approvalRef, expected.approvalRef), `Figma ${mapping.designItemId}.${property} 与原生要求不一致或缺少真实提取事实`);
      const decision = readFrozen(repo, adaptation.approvalRef, '已有设计变更决定', work);
      assert(decision.decision === 'APPROVED' && decision.userMessageRef?.trim() && Array.isArray(decision.scope?.designItemIds) && decision.scope.designItemIds.includes(element.id) && Array.isArray(decision.scope.properties) && decision.scope.properties.includes(property), '平台替代超出已有明确决定范围');
    }
    const layout = node.layoutMode ?? target.snapshot.nodes.find((item) => item.id === node.parentId)?.layoutMode;
    const relation = { VERTICAL: 'column', HORIZONTAL: 'row', GRID: 'grid', NONE: 'none' }[layout];
    assert(requirements.structure.value.layout === relation || (node.type === 'TEXT' && requirements.structure.value.layout === 'leaf'), '原生结构关系未从 Figma 自动布局提取');
    const conditionIds = element.conditionIds ?? [];
    assert(conditionIds.every((id) => {
      const condition = plan.conditions.find((item) => item.id === id);
      return condition && condition.stateId === target.snapshot.stateId && isDeepStrictEqual(condition.viewport, target.snapshot.viewport) && condition.language === target.snapshot.language && condition.textScale === target.snapshot.textScale;
    }), '原生适用状态、视口、语言或文字倍率未绑定 Figma');
  }
  for (const implementation of plan.implementations ?? []) {
    const expectedAssets = [...(sourceAssets.get(implementation.id)?.values() ?? [])];
    const actualAssets = implementation.sourceAssets ?? [];
    assert(actualAssets.length === expectedAssets.length && expectedAssets.every((asset) => actualAssets.some((actual) => isDeepStrictEqual(actual, asset))), `实现 ${implementation.id} 的独立素材来源或消费者节点不一致`);
  }
  for (const target of approved) for (const node of target.snapshot.nodes) {
    if (node.visible === false) continue;
    if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'GROUP'].includes(node.type) && hasVisibleContainerStyle(node)) {
      assert(handoff.mappings.some((mapping) => sameRef(repo, mapping.figmaDesignRef ?? doc.figmaDesignRef, target.ref) && mapping.nodeId === node.id), `Figma 可见容器 ${node.id} 缺少自身样式映射`);
    }
    if (!['TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE', 'BOOLEAN_OPERATION', 'INSTANCE'].includes(node.type)) continue;
    const covered = handoff.mappings.some((mapping) => {
      if (!sameRef(repo, mapping.figmaDesignRef ?? doc.figmaDesignRef, target.ref)) return false;
      if (mapping.nodeId === node.id || mapping.touchNodeId === node.id) return true;
      const owner = target.snapshot.nodes.find((item) => item.id === mapping.nodeId);
      if (!owner || !containsNode(target.snapshot.nodes, owner.id, node.id)) return false;
      // 组件包含多个文字时，必须逐个建立文字交接，容器覆盖不能代替独立样式。
      if (node.type !== 'TEXT' && ['COMPONENT', 'INSTANCE'].includes(owner.type)) return true;
      const element = plan.elements?.find((item) => item.id === mapping.designItemId);
      const implementation = element && plan.implementations.find((item) => item.id === element.implementationId);
      const texts = target.snapshot.nodes.filter((item) => item.type === 'TEXT' && containsNode(target.snapshot.nodes, owner.id, item.id));
      return node.type === 'TEXT' && implementation?.requirements.typography.value.applicable !== false && implementation && (mapping.textNodeId === node.id || (texts.length === 1 && texts[0].id === node.id));
    });
    assert(covered, `Figma 可见元素 ${node.id} 缺少原生设计项覆盖`);
  }
}
