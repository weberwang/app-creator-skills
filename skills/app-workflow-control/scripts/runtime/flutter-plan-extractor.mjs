import { isDeepStrictEqual } from 'node:util';
import { extractFlutterNodeFacts, figmaNodeBounds } from './figma-design-properties.mjs';
import { extractFigmaTouchTarget } from './figma-native-facts.mjs';
import { flutterTextColorIssues } from './text-paint.mjs';

/** 有效源数据不足时保持阻断，不用推测值填满计划。 */
function insist(ok, message) {
  if (!ok) throw new Error(`Figma 原生计划提取：${message}`);
}

/** 将显式源值包装为现有 V3 要求格式，依据仅声明为采集测量。 */
function measured(value) {
  return { value, basis: 'measured', reason: '从当前冻结 Figma 节点采集并规范化' };
}

/** 将已冻结的独立 Figma 节点和实施映射转换为 Flutter 计划与交接映射。 */
export function extractFlutterPlan(snapshot, request) {
  const target = request.referenceTarget;
  insist(snapshot && Array.isArray(snapshot.nodes) && snapshot.nodes.length > 0, '缺少实际节点');
  insist(target?.path && /^[a-f0-9]{64}$/.test(target.sha256 ?? ''), '缺少已确认效果图与摘要');
  insist(isDeepStrictEqual(snapshot.reconstruction?.sourceTargetRef, target), '节点未绑定已确认的源效果图');
  for (const key of ['workItemId', 'objectId', 'candidateId']) insist(typeof request[key] === 'string' && request[key].trim(), `缺少 ${key}`);
  insist(request.figmaDesignRef?.path && /^[a-f0-9]{64}$/.test(request.figmaDesignRef.sha256 ?? ''), '缺少冻结节点身份');
  insist(Array.isArray(request.mappings) && request.mappings.length > 0, '缺少节点与原生消费者映射');
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  insist(nodes.size === snapshot.nodes.length, '节点身份重复');
  const seen = new Set();
  for (const mapping of request.mappings) {
    insist(typeof mapping.designItemId === 'string' && mapping.designItemId.trim() && !seen.has(mapping.designItemId), '设计项身份缺失或重复');
    seen.add(mapping.designItemId);
    insist(nodes.has(mapping.nodeId), `设计项 ${mapping.designItemId} 未找到真实节点`);
    for (const key of ['implementationId', 'label', 'widget', 'designReason', 'kind']) insist(typeof mapping[key] === 'string' && mapping[key].trim(), `设计项 ${mapping.designItemId} 缺少 ${key}`);
    insist(['native', 'image', 'shared-image', 'dynamic'].includes(mapping.kind), `设计项 ${mapping.designItemId} 的实现路线无效`);
    if (['image', 'shared-image'].includes(mapping.kind)) insist(mapping.production && typeof mapping.production === 'object', `设计项 ${mapping.designItemId} 缺少图片生产规格`);
    insist(Array.isArray(mapping.consumers) && mapping.consumers.length > 0, `设计项 ${mapping.designItemId} 缺少实际消费者`);
  }
  const conditionId = request.conditionId;
  insist(typeof conditionId === 'string' && conditionId.trim() && request.adaptation, '缺少条件及适配事实');
  insist(typeof request.stateRule === 'string' && request.stateRule.trim(), '缺少当前状态规则');
  const plan = {
    schemaVersion: '1.0', workItemId: request.workItemId, objectId: request.objectId, candidateId: request.candidateId,
    ...(request.hostId ? { hostId: request.hostId, layerType: request.layerType } : {}), referenceTarget: target,
    conditions: [{ id: conditionId, stateId: snapshot.stateId, viewport: snapshot.viewport, language: snapshot.language, textScale: snapshot.textScale, adaptation: request.adaptation }],
    elements: [], implementations: [],
  };
  /** 跳过中间组织容器时仍指向实际最近的已映射祖先。 */
  function mappedParent(node) {
    let ancestor = nodes.get(node.parentId); const seenParents = new Set([node.id]);
    while (ancestor) {
      insist(!seenParents.has(ancestor.id), `节点 ${node.id} 的父链成环`); seenParents.add(ancestor.id);
      const found = request.mappings.find((entry) => entry.nodeId === ancestor.id);
      if (found) return found;
      ancestor = nodes.get(ancestor.parentId);
    }
    return null;
  }
  /** 素材可以属于映射组件的子节点，须沿真实父链追溯其消费者。 */
  function under(nodeId, rootId) {
    let current = nodes.get(nodeId); const seenParents = new Set();
    while (current && !seenParents.has(current.id)) {
      if (current.id === rootId) return true;
      seenParents.add(current.id); current = nodes.get(current.parentId);
    }
    return false;
  }
  for (const mapping of request.mappings) {
    const node = nodes.get(mapping.nodeId);
    const textNodes = snapshot.nodes.filter((item) => item.type === 'TEXT' && under(item.id, node.id));
    const text = mapping.textNodeId ? nodes.get(mapping.textNodeId) : textNodes.length === 1 ? textNodes[0] : null;
    if (mapping.textNodeId) insist(text?.type === 'TEXT', `设计项 ${mapping.designItemId} 的文字节点无效`);
    const facts = extractFlutterNodeFacts(node, text);
    const colorIssues = flutterTextColorIssues(facts.appearance);
    insist(colorIssues.length === 0, `设计项 ${mapping.designItemId} ${colorIssues.join('；')}`);
    const touch = extractFigmaTouchTarget(snapshot.nodes, node, mapping, insist);
    // 跳过未映射的组织容器时仍保留最近映射祖先，区域则使用目标根的实际坐标。
    const parentMapping = mappedParent(node);
    const parentId = parentMapping?.designItemId ?? null;
    const layout = node.layoutMode ?? nodes.get(node.parentId)?.layoutMode;
    const relation = { VERTICAL: 'column', HORIZONTAL: 'row', GRID: 'grid', NONE: 'none' }[layout];
    insist(relation || node.type === 'TEXT', `节点 ${node.id} 缺少可提取的布局方式`);
    const children = request.mappings.filter((entry) => mappedParent(nodes.get(entry.nodeId))?.nodeId === node.id).map((entry) => entry.designItemId);
    const requirements = {
      structure: measured({ widget: mapping.widget, layout: relation ?? 'leaf', children }),
      ...Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, measured(value)])),
      ...(touch ? { touchTarget: measured(touch) } : {}),
      states: measured({ ids: [snapshot.stateId], rules: { [snapshot.stateId]: request.stateRule } }),
    };
    const sourceAssets = (snapshot.assets ?? []).filter((asset) => Array.isArray(asset.nodeIds) && asset.nodeIds.some((id) => under(id, node.id)));
    for (const image of node.imageFills ?? []) insist(sourceAssets.some((asset) => asset.id === image.assetId && asset.sourceRef?.path && /^[a-f0-9]{64}$/.test(asset.sourceRef.sha256 ?? '')), `设计项 ${mapping.designItemId} 缺少图片填充的真实素材来源`);
    if (['image', 'shared-image'].includes(mapping.kind)) insist(sourceAssets.length > 0, `设计项 ${mapping.designItemId} 缺少可追溯的独立图片素材`);
    plan.elements.push({ id: mapping.designItemId, label: mapping.label, targetRef: target,
      region: figmaNodeBounds(snapshot.nodes, node),
      conditionIds: [conditionId], parentId, layoutReference: parentId ?? 'viewport', implementationId: mapping.implementationId });
    const existing = plan.implementations.find((item) => item.id === mapping.implementationId);
    if (existing) {
      insist(mapping.kind === 'shared-image' && existing.kind === 'shared-image' && isDeepStrictEqual(existing.requirements, requirements) && isDeepStrictEqual(existing.production, mapping.production) && isDeepStrictEqual(existing.consumers, mapping.consumers), `共享实现 ${mapping.implementationId} 的规格或消费者不一致`);
      existing.designItemIds.push(mapping.designItemId);
      if (sourceAssets.length && !existing.sourceAssets) existing.sourceAssets = [];
      for (const asset of sourceAssets) if (!existing.sourceAssets.some((item) => item.id === asset.id)) existing.sourceAssets.push(asset);
    } else plan.implementations.push({ id: mapping.implementationId, kind: mapping.kind, designItemIds: [mapping.designItemId], consumers: mapping.consumers, designReason: mapping.designReason, requirements,
      ...(sourceAssets.length ? { sourceAssets: structuredClone(sourceAssets) } : {}), ...(mapping.production ? { production: structuredClone(mapping.production) } : {}) });
  }
  const mappings = request.mappings.map(({ designItemId, nodeId, textNodeId, touchNodeId }) => ({
    designItemId, nodeId, ...(textNodeId ? { textNodeId } : {}), ...(touchNodeId ? { touchNodeId } : {}),
    stateId: snapshot.stateId, viewport: snapshot.viewport, figmaDesignRef: request.figmaDesignRef,
  }));
  return { plan, mappings };
}
