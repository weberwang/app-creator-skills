/** 验证 Roblox 视觉对象的布局、层级及坐标空间，不推断截图显示效果。 */
import { WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { instancePath, jsonIdentity, object, samePlace, sameRef, studioIdentity, text, workIdentity } from './common.mjs';
import { isScreenGuiClass, validateGuiCoordinateSpace, validateScreenPlan } from './screen-layout.mjs';

/** 位置和尺寸使用有限数值，避免 NaN、无穷和缺失维度逃过比较。 */
function vector(value, keys, label, { nonnegative = false } = {}) {
  object(value, label);
  for (const key of keys) if (!Number.isFinite(value[key]) || (nonnegative && value[key] < 0)) throw new WorkflowError(`${label}.${key} 必须是${nonnegative ? '非负' : ''}有限数值`);
}

/** 校验每个节点的实际坐标模型和父节点关系。 */
function validateNode(node, nodes, rootId, externalParent) {
  text(node.id, '布局节点 ID');
  text(node.className, '布局节点类型');
  const path = instancePath(node.instancePath, '布局节点实例路径');
  if (!['world-studs', 'screen-scale-offset'].includes(node.space)) throw new WorkflowError('布局节点必须明确世界或屏幕坐标空间');
  if (node.space === 'world-studs') {
    vector(node.position, ['x', 'y', 'z'], '世界坐标');
    vector(node.size, ['x', 'y', 'z'], '世界尺寸', { nonnegative: true });
  } else if (!isScreenGuiClass(node.className)) {
    vector(node.position, ['xScale', 'xOffset', 'yScale', 'yOffset'], '屏幕坐标');
    // UDim 的 offset 可为负值，例如填满父级再减去边距；不能逐分量拒绝。
    vector(node.size, ['xScale', 'xOffset', 'yScale', 'yOffset'], '屏幕尺寸');
  }
  if (node.id === rootId) {
    if (node.parentId !== null) throw new WorkflowError('布局根必须是唯一根节点');
    if (node.space === 'world-studs' && node.positionReferenceId !== 'world') throw new WorkflowError('布局根定位参照与坐标空间不一致');
    return;
  }
  const parent = nodes.get(node.parentId);
  if (!parent || node.parentId === node.id) throw new WorkflowError('布局节点缺少有效父节点');
  const parentPath = instancePath(parent.instancePath, '父节点实例路径');
  if (path.length !== parentPath.length + 1 || !parentPath.every((part, index) => part === path[index])) throw new WorkflowError('布局节点实例路径与实际父子关系不一致');
  if (parent.space !== node.space) text(node.coordinateBoundary, '跨坐标空间转换依据');
  // 独立界面可引用对象范围之外的真实宿主；宿主身份在屏幕合同中独立核对。
  if (node.space === 'screen-scale-offset' && node.positionReferenceId === externalParent?.id) return;
  if (!nodes.has(node.positionReferenceId)) throw new WorkflowError('布局节点定位参照不存在');
  // 定位参照只允许同级或祖先，避免出现循环或跨分支的隐式父级。
  let cursor = parent;
  const ancestorIds = new Set();
  while (cursor) {
    if (ancestorIds.has(cursor.id)) throw new WorkflowError('布局父子关系存在循环');
    ancestorIds.add(cursor.id);
    cursor = cursor.parentId == null ? null : nodes.get(cursor.parentId);
  }
  const reference = nodes.get(node.positionReferenceId);
  if (!ancestorIds.has(reference.id) && reference.parentId !== node.parentId) throw new WorkflowError('定位参照必须为同级或祖先节点');
  if (reference.id === node.id) throw new WorkflowError('节点不能引用自身定位');
}

/** 读取 V3 已确认的正式布局规格，检查身份、坐标和所有节点关系。 */
export function validateRobloxLayout(repo, work, doc) {
  const { doc: layout } = jsonIdentity(repo, doc.layoutSpecRef, 'Roblox 布局规格', work.evidenceRoot);
  if (layout.schemaVersion !== 'roblox-layout/1.0') throw new WorkflowError('Roblox 布局规格版本无效');
  workIdentity(layout, work, { visualStage: null, implementation: false });
  if (layout.objectId !== doc.objectId || layout.candidateId !== doc.candidateId || layout.targetId !== doc.targetId) throw new WorkflowError('Roblox 布局规格对象或目标错绑');
  studioIdentity(repo, layout.studio, '布局来源 Studio');
  samePlace(layout.studio.place, doc.studio.place);
  sameRef(repo, layout.studio.place.snapshotRef, doc.studio.place.snapshotRef, '当前布局正式源');
  if (layout.studio.studioId !== doc.studio.studioId) throw new WorkflowError('布局来源 Studio 实例错绑');
  if (!Array.isArray(layout.nodes) || !layout.nodes.length) throw new WorkflowError('Roblox 布局规格缺少节点');
  const nodes = new Map();
  const paths = new Set();
  for (const node of layout.nodes) {
    object(node, '布局节点'); text(node.id, '布局节点 ID');
    const key = JSON.stringify(instancePath(node.instancePath, '布局实例路径'));
    if (nodes.has(node.id) || paths.has(key)) throw new WorkflowError('布局节点 ID 或实例路径不唯一');
    nodes.set(node.id, node); paths.add(key);
  }
  if (!nodes.has(layout.rootId) || layout.rootId !== doc.objectId || layout.nodes.filter((node) => node.parentId === null).length !== 1) throw new WorkflowError('布局必须唯一绑定当前对象根');
  validateGuiCoordinateSpace(nodes);
  if (JSON.stringify(nodes.get(layout.rootId).instancePath) !== JSON.stringify(doc.object.instancePath)) throw new WorkflowError('布局根未绑定当前正式实例');
  if (nodes.get(layout.rootId).className !== doc.object.className) throw new WorkflowError('布局根的实例类型与当前正式对象不一致');
  for (const node of layout.nodes) validateNode(node, nodes, layout.rootId, layout.externalParent);
  validateScreenPlan(layout, nodes);
  for (const node of layout.nodes) {
    // 同级互相作为定位参照也会成环，须独立于父子链进行检查。
    const seen = new Set();
    let cursor = node;
    while (cursor && nodes.has(cursor.positionReferenceId)) {
      if (seen.has(cursor.id)) throw new WorkflowError('布局定位参照存在循环');
      seen.add(cursor.id);
      cursor = nodes.get(cursor.positionReferenceId);
    }
  }
  return { layout, nodes };
}
