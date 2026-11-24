import { isDeepStrictEqual } from 'node:util';
import { extractFigmaNodeStyle } from './figma-design-properties.mjs';
import { readJson, WorkflowError } from './io.mjs';
import { comparableTextFill, hasCompleteTextFill, isTextChannel } from './text-paint.mjs';
import { readV4TextRestoration } from './v4-text-restoration.mjs';

/** 将每个已确认文字条目绑定到自身填色与透明度，容器样式不能作为替代。 */
function requireAppearance(entry, label, { allowPending = false } = {}) {
  const pending = entry?.pending ?? {};
  if (!pending || typeof pending !== 'object' || Array.isArray(pending)) throw new WorkflowError(`${label} 的待确认属性必须逐项记录原因`);
  for (const [name, reason] of Object.entries(pending)) {
    if (typeof reason !== 'string' || !reason.trim()) throw new WorkflowError(`${label} 的 ${name} 待人工确认缺少原因`);
    if (entry[name] !== undefined && entry[name] !== null) throw new WorkflowError(`${label} 的 ${name} 已知值和待确认状态不能并存`);
    if (!allowPending) throw new WorkflowError(`${label} 的 ${name} 待人工确认：${reason}`);
  }
  if (!hasCompleteTextFill(entry?.textFill) && !pending.textFill) throw new WorkflowError(`${label} 缺少完整的字体颜色和填色 Alpha`);
  if (!isTextChannel(entry?.textOpacity) && !pending.textOpacity) throw new WorkflowError(`${label} 缺少有效的文字透明度`);
  if ((typeof entry?.fontFamily !== 'string' || !entry.fontFamily.trim()) && !pending.fontFamily) throw new WorkflowError(`${label} 的 fontFamily 目标缺失或待人工确认`);
  if ((!Number.isFinite(entry?.fontSize) || entry.fontSize <= 0) && !pending.fontSize) throw new WorkflowError(`${label} 的 fontSize 目标缺失或待人工确认`);
}

/** 从设计源保留可核实的文字属性，缺失字段不能由平台默认值补齐。 */
export function figmaTextStyle(node) {
  const font = node.font ?? {};
  const style = { fontFamily: font.platformFamily, fontSize: font.size };
  for (const [source, target] of [['weight', 'fontWeight'], ['style', 'fontStyle'], ['letterSpacing', 'letterSpacing'], ['lineHeight', 'lineHeight']]) {
    if (font[source] !== undefined && font[source] !== null) style[target] = font[source];
  }
  for (const name of ['textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'strokes', 'strokeWeight', 'effects']) {
    const value = node[name] ?? node.properties?.[name];
    if (value !== undefined && value !== null) style[name] = value;
  }
  return style;
}

/** 从 Flutter 已冻结的外观目标取得需要原生组件实测的文字属性。 */
export function flutterTextStyle(appearance) {
  if (!appearance?.raw?.textVisual && appearance?.raw?.nodeType !== 'TEXT' && !appearance?.normalized?.typography) return null;
  const normalized = appearance.normalized ?? {};
  const typography = normalized.typography ?? {};
  const result = { fontFamily: typography.family, fontSize: typography.size, textFill: normalized.textFill, textOpacity: normalized.textOpacity };
  for (const [source, target] of [['weight', 'fontWeight'], ['lineHeight', 'lineHeight'], ['letterSpacing', 'letterSpacing']]) {
    if (typography[source] !== undefined && typography[source] !== null) result[target] = typography[source];
  }
  const visual = appearance.raw?.textVisual ?? {};
  if (appearance.raw?.font?.style !== undefined) result.fontStyle = appearance.raw.font.style;
  for (const name of ['strokes', 'strokeWeight']) if (visual[name] !== undefined && visual[name] !== null) result[name] = visual[name];
  for (const name of ['textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'effects']) {
    const value = visual.other?.[name] ?? visual.properties?.[name];
    if (value !== undefined && value !== null) result[name] = value;
  }
  return result;
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
      const entry = { targetPath: ref.path, targetSha256: ref.sha256, stateId: snapshot.stateId, nodeId: node.id,
        ...figmaTextStyle(node), textFill: style.textFill, textOpacity: style.textOpacity?.value };
      requireAppearance(entry, `Figma 文字 ${node.id}`);
      result.push(entry);
    }
  }
  return result;
}

/** 非 Figma 路线沿用冻结布局节点，空值明确表示当前节点不渲染文字。 */
export function collectLayoutTextAppearance(layout, layoutRef, designRef, { allowPending = false } = {}) {
  return layout.nodes.flatMap((node) => {
    if (node.textAppearance === null) return [];
    const entry = { ...node.textAppearance, targetPath: layoutRef.path, targetSha256: layoutRef.sha256, nodeId: node.id };
    if (!isDeepStrictEqual(entry.sourceRef, designRef)) throw new WorkflowError(`布局文字 ${node.id} 缺少当前确认稿来源`);
    if (typeof entry.stateId !== 'string' || !entry.stateId.trim()) throw new WorkflowError(`布局文字 ${node.id} 缺少适用状态`);
    requireAppearance(entry, `布局文字 ${node.id}`, { allowPending });
    return [entry];
  });
}

/** 检查同次原生运行中节点的文字及整体可见性，防止只回读样式掩盖漏字。 */
export function validateTextPresence(actual, label) {
  if (typeof actual?.actualContent !== 'string' || !actual.actualContent.trim()) throw new WorkflowError(`${label} 的 actualContent 为空或缺失`);
  if (actual.visible !== true) throw new WorkflowError(`${label} 的 visible 必须为 true，包含父级可见状态`);
  // 整体透明度为零时文字及描边都不可见；单独填色 Alpha 不代表整体不可见。
  const opacity = actual.textOpacity ?? actual.values?.textOpacity;
  const opacityValue = typeof opacity === 'object' && opacity !== null ? opacity.value : opacity;
  if (opacityValue === 0) throw new WorkflowError(`${label} 的整体文字透明度为 0，实际不可见`);
  for (const name of ['actualContent', 'visible']) {
    const source = actual.propertySources?.[name];
    if (typeof source?.componentType !== 'string' || !source.componentType.trim()
      || typeof source.propertyPath !== 'string' || !source.propertyPath.trim()) {
      throw new WorkflowError(`${label} 的 ${name} 缺少实际组件或父级属性回读来源`);
    }
  }
}

/** 校验实际读取的文字颜色，且记录须属于同一次构建和运行。 */
export function validateNativeTextReadback(repo, runtime, expected, stack, identity) {
  if (!Array.isArray(expected)) throw new WorkflowError(`${stack} 运行校验缺少冻结的文字颜色和透明度目标`);
  if (expected.length === 0 && runtime.textReadbackRef === undefined) return;
  const report = readJson(repo, identity(repo, runtime.textReadbackRef, `${stack} 文字颜色实际读数`), '文字颜色实际读数');
  if (report?.schemaVersion !== '1.0' || report.source !== `${stack}-native` || report.visualStage === 'V4'
    || !isDeepStrictEqual(report.buildIdentityRef, runtime.buildIdentityRef)
    || !isDeepStrictEqual(report.runEvidenceRef, runtime.runEvidenceRef)
    || !Array.isArray(report.entries)) throw new WorkflowError(`${stack} 文字读数须绑定当前构建和运行`);
  validateNativeTextEntries(report.entries, expected, stack);
}

/** 试装与正式运行共用节点、内容、可见性和属性来源校验。 */
function validateNativeTextEntries(entries, expected, stack) {
  const observations = new Map();
  const nativeNodes = new Set();
  for (const observed of entries) {
    if (typeof observed?.runtimeNodeId !== 'string' || !observed.runtimeNodeId.trim()) throw new WorkflowError(`${stack} 文字读数缺少实际文字组件身份`);
    const key = JSON.stringify([observed?.targetPath, observed?.targetSha256, observed?.stateId, observed?.nodeId]);
    if (observations.has(key)) throw new WorkflowError(`${stack} 文字 ${observed.nodeId} 读数重复`);
    const nativeKey = JSON.stringify([observed.targetPath, observed.stateId, observed.runtimeNodeId]);
    if (nativeNodes.has(nativeKey)) throw new WorkflowError(`${stack} 同一文字组件不能代替多个文字节点`);
    nativeNodes.add(nativeKey);
    observations.set(key, observed);
  }
  for (const target of expected) {
    const key = JSON.stringify([target.targetPath, target.targetSha256, target.stateId, target.nodeId]);
    const label = `${stack} 文字 ${target.nodeId} 实际读数`;
    const observed = observations.get(key);
    requireAppearance(observed, label);
    validateTextPresence(observed, label);
    if (!isDeepStrictEqual(comparableTextFill(observed.textFill), comparableTextFill(target.textFill))) throw new WorkflowError(`${label} 的字体颜色或填色 Alpha 与确认稿不一致`);
    if (observed.textOpacity !== target.textOpacity) throw new WorkflowError(`${label} 的文字透明度与确认稿不一致`);
    // 每个可核实样式都要来自具体组件属性，单纯复制设计值无法代替回读。
    const fields = Object.keys(target).filter((name) => !['targetPath', 'targetSha256', 'stateId', 'nodeId', 'sourceRef', 'pending'].includes(name));
    for (const name of fields) {
      const source = observed.propertySources?.[name];
      if (!source || typeof source.componentType !== 'string' || !source.componentType.trim() || typeof source.propertyPath !== 'string' || !source.propertyPath.trim()) {
        throw new WorkflowError(`${label} 的 ${name} 缺少实际组件或材质属性回读来源`);
      }
      if (name !== 'textFill' && name !== 'textOpacity' && !isDeepStrictEqual(observed[name], target[name])) throw new WorkflowError(`${label} 的 ${name} 与确认稿不一致`);
    }
    observations.delete(key);
  }
  if (observations.size) throw new WorkflowError(`${stack} 文字读数包含未绑定设计的节点`);
}

/** V4 试装报告冻结实际批次和当前候选，并逐项对照设计文字。 */
export function validateV4NativeTextRestoration(repo, work, expected) {
  if (!Array.isArray(expected)) throw new WorkflowError(`${work.stack} V4 缺少冻结文字目标`);
  if (!expected.length) return;
  const { report } = readV4TextRestoration(repo, work, work.visual.candidateId);
  if (report.schemaVersion !== '1.0' || report.source !== `${work.stack}-native` || report.visualStage !== 'V4'
    || report.workItemId !== work.workItemId || report.candidateId !== work.visual.candidateId
    || typeof report.runId !== 'string' || !report.runId.trim() || !Array.isArray(report.entries)) {
    throw new WorkflowError(`${work.stack} V4 文字试装读数未绑定当前工作项、候选和采集批次`);
  }
  validateNativeTextEntries(report.entries, expected, work.stack);
}
