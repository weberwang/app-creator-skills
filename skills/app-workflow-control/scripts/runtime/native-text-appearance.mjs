import { isDeepStrictEqual } from 'node:util';
import { extractFigmaNodeStyle } from './figma-design-properties.mjs';
import { readJson, WorkflowError } from './io.mjs';
import { comparableTextFill, hasCompleteTextFill, isTextChannel } from './text-paint.mjs';

/** 将每个已确认文字条目绑定到自身填色与透明度，容器样式不能作为替代。 */
function requireAppearance(entry, label) {
  if (!hasCompleteTextFill(entry?.textFill)) throw new WorkflowError(`${label} 缺少完整的字体颜色和填色 Alpha`);
  if (!isTextChannel(entry.textOpacity)) throw new WorkflowError(`${label} 缺少有效的文字透明度`);
}

/** 对 Figma 路线从实际冻结节点枚举文字，包含同稿附加状态和组件内的标签。 */
export function collectFigmaTextAppearance(approved) {
  const result = [];
  for (const { ref, snapshot } of approved) {
    const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
    for (const node of snapshot.nodes) {
      if (node.type !== 'TEXT') continue;
      // 已校验的父链也可能隐藏文字，读数只覆盖当前状态实际可见的节点。
      let layer = node;
      while (layer && layer.visible !== false) layer = byId.get(layer.parentId);
      if (layer) continue;
      const style = extractFigmaNodeStyle(node).designFacts.normalized;
      const entry = { targetPath: ref.path, nodeId: node.id, textFill: style.textFill, textOpacity: style.textOpacity?.value };
      requireAppearance(entry, `Figma 文字 ${node.id}`);
      result.push(entry);
    }
  }
  return result;
}

/** 非 Figma 路线沿用冻结布局节点，空值明确表示当前节点不渲染文字。 */
export function collectLayoutTextAppearance(layout, layoutRef) {
  return layout.nodes.flatMap((node) => {
    if (node.textAppearance === null) return [];
    const entry = { ...node.textAppearance, targetPath: layoutRef.path, nodeId: node.id };
    requireAppearance(entry, `布局文字 ${node.id}`);
    return [entry];
  });
}

/** 校验实际读取的文字颜色，且记录须属于同一次构建和运行。 */
export function validateNativeTextReadback(repo, runtime, expected, stack, identity) {
  if (!Array.isArray(expected)) throw new WorkflowError(`${stack} 运行校验缺少冻结的文字颜色和透明度目标`);
  if (expected.length === 0 && runtime.textReadbackRef === undefined) return;
  const report = readJson(repo, identity(repo, runtime.textReadbackRef, `${stack} 文字颜色实际读数`), '文字颜色实际读数');
  if (report?.schemaVersion !== '1.0' || report.source !== `${stack}-native`
    || !isDeepStrictEqual(report.buildIdentityRef, runtime.buildIdentityRef)
    || !isDeepStrictEqual(report.runEvidenceRef, runtime.runEvidenceRef)
    || !Array.isArray(report.entries)) throw new WorkflowError(`${stack} 文字读数须绑定当前构建和运行`);
  const observations = new Map();
  const nativeNodes = new Set();
  for (const observed of report.entries) {
    if (typeof observed?.runtimeNodeId !== 'string' || !observed.runtimeNodeId.trim()) throw new WorkflowError(`${stack} 文字读数缺少实际文字组件身份`);
    const key = JSON.stringify([observed?.targetPath, observed?.nodeId]);
    if (observations.has(key)) throw new WorkflowError(`${stack} 文字 ${observed.nodeId} 读数重复`);
    const nativeKey = JSON.stringify([observed.targetPath, observed.runtimeNodeId]);
    if (nativeNodes.has(nativeKey)) throw new WorkflowError(`${stack} 同一文字组件不能代替多个文字节点`);
    nativeNodes.add(nativeKey);
    observations.set(key, observed);
  }
  for (const target of expected) {
    const key = JSON.stringify([target.targetPath, target.nodeId]);
    const label = `${stack} 文字 ${target.nodeId} 实际读数`;
    const observed = observations.get(key);
    requireAppearance(observed, label);
    if (!isDeepStrictEqual(comparableTextFill(observed.textFill), comparableTextFill(target.textFill))) throw new WorkflowError(`${label} 的字体颜色或填色 Alpha 与确认稿不一致`);
    if (observed.textOpacity !== target.textOpacity) throw new WorkflowError(`${label} 的文字透明度与确认稿不一致`);
    observations.delete(key);
  }
  if (observations.size) throw new WorkflowError(`${stack} 文字读数包含未绑定设计的节点`);
}
