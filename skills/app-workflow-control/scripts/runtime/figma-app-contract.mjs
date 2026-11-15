import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { readJson, repoPath, requireFile, fileIdentityKey, WorkflowError } from './io.mjs';

/** 非游戏 App 默认采用 Figma；ESP32 显式选择该路线，游戏及无界面服务保持原合同。 */
export function isFigmaApp(work) {
  return ['PAGE', 'DISPLAY_LAYER'].includes(work?.workItemType) &&
    (['flutter', 'expo'].includes(work.stack) || (work.stack === 'esp32' && work.visual?.designRoute === 'figma-app'));
}

/** 局部提案只交付选定设计，不能被解释为正式工程完成。 */
export function isDesignProposal(work) {
  return isFigmaApp(work) && work.visual?.designIntent === 'proposal';
}

/** 所有结构错误都阻止对应门，结构事实不产生人工视觉结论。 */
function insist(ok, message) {
  if (!ok) throw new WorkflowError(`Figma App 合同：${message}`);
}

/** 核对不可变本地证据，并以平台文件身份防止 RETURN 路径别名重绑。 */
export function figmaFile(repo, ref, label, work) {
  insist(ref && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 缺少路径和摘要`);
  const path = repoPath(repo, ref.path).relative;
  insist(path === ref.path, `${label} 路径不规范`);
  insist(!work?.invalidatedRefs?.some((item) => fileIdentityKey(repo, item.path) === fileIdentityKey(repo, path)), `${label} 使用 RETURN 已作废证据`);
  requireFile(repo, path, label);
  const bytes = readFileSync(repoPath(repo, path).absolute);
  insist(bytes.length && createHash('sha256').update(bytes).digest('hex') === ref.sha256, `${label} 内容已变化，须生成新冻结版本并重新确认受影响范围`);
  return path;
}

/** 冻结引用既比较文件身份也比较摘要，不接受仅保留 URL 的设计批准。 */
export function sameFigmaRef(repo, left, right) {
  return left && right && typeof left.path === 'string' && typeof right.path === 'string' && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path) && left.sha256 === right.sha256;
}

/** 解析结构化原始导出与交接资料。 */
function frozen(repo, ref, label, work) {
  return readJson(repo, figmaFile(repo, ref, label, work), label);
}

/** 数组身份须完整、唯一且无额外项，不能用一项关闭其他未完成项。 */
function ids(actual, expected, label) {
  insist(Array.isArray(actual) && new Set(actual).size === actual.length && isDeepStrictEqual([...actual].sort(), [...expected].sort()), `${label} 覆盖不完整或身份重复`);
}

/** 找到源节点的真实祖先，允许原生实现省略纯组织容器，禁止映到无关分支。 */
function containsNode(nodes, ancestorId, childId) {
  let current = nodes.find((node) => node.id === childId);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id); current = nodes.find((node) => node.id === current.parentId);
  }
  return false;
}

/** 导出供原生交接消费的实际样式事实，不能把这些计划值当作运行观测。 */
export function extractFigmaNodeStyle(node) {
  const result = {};
  for (const key of ['fill', 'spacing', 'radius', 'insets', 'colors', 'border', 'shape']) if (node.properties && Object.hasOwn(node.properties, key)) result[key] = node.properties[key];
  if (node.type === 'TEXT') result.typography = { family: node.font.platformFamily, size: node.font.size, ...(node.font.weight !== undefined ? { weight: node.font.weight } : {}), ...(node.font.lineHeight !== undefined ? { lineHeight: node.font.lineHeight } : {}), ...(node.font.letterSpacing !== undefined ? { letterSpacing: node.font.letterSpacing } : {}) };
  return result;
}

/** 将明确源事实与原生要求逐属性对照，避免旧代码规格仅换一个 nodeId 即通过。 */
function nativeFacts(repo, work, doc, handoff, approved, plan) {
  const used = new Set();
  const byId = new Map(handoff.mappings.map((mapping) => [mapping.designItemId, mapping]));
  for (const mapping of handoff.mappings) {
    const target = approved.find(({ ref }) => sameFigmaRef(repo, ref, mapping.figmaDesignRef ?? doc.figmaDesignRef));
    const node = target.snapshot.nodes.find((item) => item.id === mapping.nodeId);
    const key = `${target.ref.path}:${target.ref.sha256}:${node.id}`;
    insist(!used.has(key), '不同设计项不能全部指向同一个无关节点'); used.add(key);
    const element = plan.elements?.find((item) => item.id === mapping.designItemId);
    if (!element) {
      const native = plan.nodes.find((item) => item.id === mapping.designItemId);
      for (const property of ['x', 'y', 'width', 'height']) insist(native[property] === node[property], `原生布局 ${mapping.designItemId}.${property} 未按 Figma 节点还原`);
      const expectedStyle = extractFigmaNodeStyle(node);
      insist(isDeepStrictEqual(native.designProperties ?? mapping.nativeStyle, expectedStyle), `原生布局 ${mapping.designItemId} 字体、颜色或形态未从 Figma 提取`);
      if (native.parentId !== null) {
        const parent = byId.get(native.parentId);
        insist(parent && containsNode(target.snapshot.nodes, parent.nodeId, node.id), '原生父子关系未按 Figma 真实结构还原');
      }
      continue;
    }
    insist(sameFigmaRef(repo, element.targetRef, target.snapshot.previewRef), '原生设计项未绑定对应状态的 Figma 目标');
    if (element.parentId !== null) {
      const parent = byId.get(element.parentId);
      insist(parent && containsNode(target.snapshot.nodes, parent.nodeId, node.id), '原生设计项父子关系偏离 Figma');
    }
    const implementation = plan.implementations.find((item) => item.id === element.implementationId);
    insist(implementation, '设计项缺少真实原生实现');
    const requirements = implementation.requirements;
    const textNodes = target.snapshot.nodes.filter((item) => item.type === 'TEXT' && containsNode(target.snapshot.nodes, node.id, item.id));
    const text = mapping.textNodeId ? textNodes.find((item) => item.id === mapping.textNodeId) : textNodes.length === 1 ? textNodes[0] : null;
    const facts = { size: { width: node.width, height: node.height }, spacing: node.properties?.insets, typography: text ? {
      family: text.font.platformFamily, size: text.font.size, weight: text.font.weight, lineHeight: text.font.lineHeight, letterSpacing: text.font.letterSpacing,
    } : null, color: node.properties?.colors, border: node.properties?.border, shape: node.properties?.shape };
    for (const property of ['size', 'spacing', 'typography', 'color', 'border', 'shape']) {
      const expected = requirements[property];
      if (expected?.value?.applicable === false) {
        insist((property === 'typography' && !text) || (property === 'border' && node.properties?.border?.width === 0), `Figma ${property} 实际适用，不能以不适用绕过`);
        continue;
      }
      if (isDeepStrictEqual(expected?.value, facts[property])) continue;
      // 已有明确的局部变更决定可解释平台替代，不新增逐属性审批节点。
      const adaptation = mapping.adaptations?.find((item) => item.property === property);
      insist(expected?.basis === 'approved-change' && expected.approvalRef && adaptation && typeof adaptation.reason === 'string' && adaptation.reason.trim() && sameFigmaRef(repo, adaptation.approvalRef, expected.approvalRef), `Figma ${mapping.designItemId}.${property} 与原生要求不一致或缺少真实提取事实`);
      const decision = frozen(repo, adaptation.approvalRef, '已有设计变更决定', work);
      insist(decision.decision === 'APPROVED' && decision.userMessageRef?.trim() && Array.isArray(decision.scope?.designItemIds) && decision.scope.designItemIds.includes(element.id) && Array.isArray(decision.scope.properties) && decision.scope.properties.includes(property), '平台替代超出已有明确决定范围');
    }
    const layout = node.layoutMode ?? target.snapshot.nodes.find((item) => item.id === node.parentId)?.layoutMode;
    const relation = { VERTICAL: 'column', HORIZONTAL: 'row', GRID: 'grid', NONE: 'none' }[layout];
    insist(requirements.structure.value.layout === relation || (node.type === 'TEXT' && requirements.structure.value.layout === 'leaf'), '原生结构关系未从 Figma 自动布局提取');
    const conditionIds = element.conditionIds ?? [];
    insist(conditionIds.every((id) => {
      const condition = plan.conditions.find((item) => item.id === id);
      return condition && condition.stateId === target.snapshot.stateId && isDeepStrictEqual(condition.viewport, target.snapshot.viewport) && condition.language === target.snapshot.language && condition.textScale === target.snapshot.textScale;
    }), '原生适用状态、视口、语言或文字倍率未绑定 Figma');
  }
  for (const target of approved) for (const node of target.snapshot.nodes) {
    if (node.visible === false || !['TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE', 'BOOLEAN_OPERATION', 'INSTANCE'].includes(node.type)) continue;
    const covered = handoff.mappings.some((mapping) => {
      if (!sameFigmaRef(repo, mapping.figmaDesignRef ?? doc.figmaDesignRef, target.ref)) return false;
      if (mapping.nodeId === node.id) return true;
      const owner = target.snapshot.nodes.find((item) => item.id === mapping.nodeId);
      if (!containsNode(target.snapshot.nodes, owner.id, node.id)) return false;
      if (['COMPONENT', 'INSTANCE'].includes(owner.type)) return true;
      const element = plan.elements?.find((item) => item.id === mapping.designItemId);
      const implementation = element && plan.implementations.find((item) => item.id === element.implementationId);
      const texts = target.snapshot.nodes.filter((item) => item.type === 'TEXT' && containsNode(target.snapshot.nodes, owner.id, item.id));
      return node.type === 'TEXT' && implementation?.requirements.typography.value.applicable !== false && implementation && (mapping.textNodeId === node.id || (texts.length === 1 && texts[0].id === node.id));
    });
    insist(covered, `Figma 可见元素 ${node.id} 缺少原生设计项覆盖`);
  }
}

/** 核验真实内容与探索约束；已有代码仅作为实现条件，不默认冻结视觉。 */
function briefFor(repo, ref, work) {
  const brief = frozen(repo, ref, '设计输入', work);
  for (const key of ['targetUsers', 'primaryTask', 'context']) insist(typeof brief[key] === 'string' && brief[key].trim(), `设计输入缺少 ${key}`);
  insist(['explore', 'reproduce'].includes(brief.intent), '设计输入须区分探索与忠实还原');
  for (const key of ['realContent', 'hardConstraints', 'explorationSpace']) insist(Array.isArray(brief[key]), `设计输入缺少 ${key}`);
  insist(brief.realContent.length > 0, '不能以虚构内容或装饰面板填充提案');
  if (brief.intent === 'reproduce') figmaFile(repo, brief.existingVisualRef, '明确还原依据', work);
  return brief;
}

/** 从实际节点属性核验可编辑结构、字体和真实变量绑定，不分析预览图像。 */
export function readFigmaSnapshot(repo, ref, { projectId, stack, objectId, candidateId, work } = {}) {
  const snapshot = frozen(repo, ref, 'Figma 节点冻结', work);
  insist(snapshot.schemaVersion === '1.0' && snapshot.source === 'figma-mcp', '必须提供实际 MCP 节点导出');
  for (const [key, value] of Object.entries({ projectId, stack, objectId, candidateId })) if (value !== undefined) insist(snapshot[key] === value, `Figma ${key} 错绑`);
  insist(typeof snapshot.fileKey === 'string' && /^[A-Za-z0-9_-]+$/.test(snapshot.fileKey) && typeof snapshot.nodeId === 'string' && snapshot.nodeId.includes(':'), '缺少真实 fileKey/nodeId');
  let url;
  try { url = new URL(snapshot.nodeUrl); } catch { insist(false, '节点链接无效'); }
  const fileMatch = /^\/design\/([^/]+)(?:\/branch\/([^/]+))?\//.exec(url.pathname);
  insist(url.protocol === 'https:' && ['figma.com', 'www.figma.com'].includes(url.hostname) && (fileMatch?.[2] ?? fileMatch?.[1]) === snapshot.fileKey && url.searchParams.get('node-id')?.replaceAll('-', ':') === snapshot.nodeId, '节点链接与 fileKey/nodeId 不一致');
  insist(typeof snapshot.stateId === 'string' && snapshot.stateId.trim() && typeof snapshot.language === 'string' && snapshot.language.trim() && Number.isFinite(snapshot.textScale) && snapshot.textScale > 0, '目标状态/语言/文字倍率缺失');
  for (const key of ['width', 'height']) insist(Number.isFinite(snapshot.viewport?.[key]) && snapshot.viewport[key] > 0, '目标视口无效');
  figmaFile(repo, snapshot.previewRef, '真实预览快照', work);
  briefFor(repo, snapshot.briefRef, work);
  const raw = frozen(repo, snapshot.captureRef, 'MCP 原始结构采集', work);
  insist(raw.source === 'figma-mcp' && typeof raw.toolName === 'string' && raw.toolName.trim() && typeof raw.capturedAt === 'string' && Number.isFinite(Date.parse(raw.capturedAt)), '缺少实际工具和采集事实');
  for (const key of ['fileKey', 'nodeId', 'stateId', 'viewport', 'nodes', 'variables', 'assets']) insist(isDeepStrictEqual(raw[key], snapshot[key]), `原始采集 ${key} 与冻结事实不一致`);
  insist(Array.isArray(snapshot.nodes) && snapshot.nodes.length > 0 && Array.isArray(snapshot.variables) && Array.isArray(snapshot.assets), '节点、变量或独立素材范围缺失');
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  ids(snapshot.nodes.map((node) => node.id), [...nodes.keys()], 'Figma 节点');
  const root = nodes.get(snapshot.nodeId);
  insist(root && root.parentId === null && ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(root.type) && root.width === snapshot.viewport.width && root.height === snapshot.viewport.height, '设计根必须为目标视口的可编辑 Frame');
  const variables = new Map(snapshot.variables.map((item) => [item.id, item]));
  ids(snapshot.variables.map((item) => item.id), [...variables.keys()], 'Figma 变量');
  for (const variable of snapshot.variables) {
    insist(typeof variable.id === 'string' && variable.id.trim() && typeof variable.name === 'string' && variable.name.trim() && Object.hasOwn(variable, 'value'), '变量缺少真实名称或已解析值');
    if (variable.kind === 'color') insist((typeof variable.value === 'string' && variable.value.trim()) || (variable.value && ['r', 'g', 'b'].every((key) => Number.isFinite(variable.value[key]) && variable.value[key] >= 0 && variable.value[key] <= 1)), '颜色变量值类型无效');
    else insist(['spacing', 'radius'].includes(variable.kind) && Number.isFinite(variable.value) && variable.value >= 0, '尺寸变量值类型无效');
  }
  ids(snapshot.assets.map((asset) => asset.id), [...new Set(snapshot.assets.map((asset) => asset.id))], '独立素材');
  for (const asset of snapshot.assets) {
    insist(Array.isArray(asset.nodeIds) && asset.nodeIds.length > 0 && new Set(asset.nodeIds).size === asset.nodeIds.length && asset.nodeIds.every((id) => typeof id === 'string' && nodes.has(id)), '素材 nodeIds 必须是实际节点的唯一数组');
    figmaFile(repo, asset.sourceRef, '独立素材来源', work);
  }
  const usedVariables = new Set();
  const repeats = new Map();
  for (const node of snapshot.nodes) {
    insist(typeof node.id === 'string' && node.id.trim(), '实际图层必须有唯一节点 ID');
    insist(typeof node.name === 'string' && node.name.trim() && !/^(Frame|Rectangle|Group|Text)\s*\d*$/i.test(node.name), '图层必须按实际职责命名');
    insist(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE', 'GROUP', 'BOOLEAN_OPERATION'].includes(node.type), '设计不能由整页图片节点冒充可编辑界面');
    for (const key of ['x', 'y', 'width', 'height']) insist(Number.isFinite(node[key]) && (!['width', 'height'].includes(key) || node[key] > 0), `节点 ${node.id} 尺寸无效`);
    const seen = new Set([node.id]); let current = node;
    while (current !== root) { insist(nodes.has(current.parentId) && !seen.has(current.parentId), '节点父链脱离根或成环'); seen.add(current.parentId); current = nodes.get(current.parentId); }
    const children = snapshot.nodes.filter((item) => item.parentId === node.id);
    if (children.length > 1 && !['HORIZONTAL', 'VERTICAL', 'GRID'].includes(node.layoutMode)) insist(typeof node.positioningReason === 'string' && node.positioningReason.trim(), '有关联的内容容器须使用自动布局，特殊定位须有依据');
    if (node.type === 'TEXT') {
      insist(typeof node.characters === 'string' && node.characters.trim(), '文字必须保留可编辑内容');
      insist(node.font?.available === true && typeof node.font.family === 'string' && node.font.family.trim() && typeof node.font.platformFamily === 'string' && node.font.platformFamily.trim() && Number.isFinite(node.font.size) && node.font.size > 0, '字体不可用或缺少目标平台实现依据');
      if (node.font.platformFamily !== node.font.family) insist(typeof node.font.substitutionReason === 'string' && node.font.substitutionReason.trim(), '替代字体须明确说明');
    }
    if (node.repeatKey) { const group = repeats.get(node.repeatKey) ?? []; group.push(node); repeats.set(node.repeatKey, group); }
    for (const binding of node.bindings ?? []) {
      const variable = variables.get(binding.variableId);
      insist(typeof binding.field === 'string' && binding.field.trim() && node.properties && Object.hasOwn(node.properties, binding.field) && variable && isDeepStrictEqual(node.properties[binding.field], variable.value), '变量必须绑定到真实节点属性，不能只创建未使用 token');
      usedVariables.add(variable.id);
    }
    for (const image of node.imageFills ?? []) {
      const asset = snapshot.assets.find((item) => item.id === image.assetId);
      insist(asset && asset.nodeIds.includes(node.id) && ['illustration', 'photo', 'icon', 'texture', 'character'].includes(asset.role), '图片须属于独立素材范围，不能嵌入整页 UI 效果图');
      const independentFullImage = ['photo', 'texture'].includes(asset.role) && snapshot.nodes.some((other) => other !== node && ['TEXT', 'VECTOR', 'INSTANCE', 'COMPONENT'].includes(other.type));
      insist(node !== root && (node.width * node.height < root.width * root.height * 0.9 || independentFullImage), '整页图片不能冒充可编辑设计');
      figmaFile(repo, asset.sourceRef, '独立素材来源', work);
    }
  }
  for (const group of repeats.values()) if (group.length > 1) insist(group.every((node) => node.type === 'INSTANCE' && typeof node.componentId === 'string' && node.componentId === group[0].componentId), '重复元素须使用共享组件实例');
  for (const kind of ['color', 'spacing', 'radius']) insist(snapshot.variables.some((item) => item.kind === kind && usedVariables.has(item.id)), `${kind} 变量没有实际绑定`);
  for (const variable of snapshot.variables) insist(usedVariables.has(variable.id), '存在未绑定的装饰性变量');
  return snapshot;
}

/** 用户明确要求多方案时比较真实结构与排版，不能以换色凑数。 */
function directionKey(snapshot) {
  // 属性与节点返回顺序不构成新方向，比较可测的结构和排版事实。
  return JSON.stringify(snapshot.nodes.map((node) => ({ type: node.type, parent: snapshot.nodes.find((item) => item.id === node.parentId)?.type, x: node.x, y: node.y, width: node.width, height: node.height, layoutMode: node.layoutMode, font: node.font ? Object.fromEntries(Object.entries(node.font).sort(([left], [right]) => left.localeCompare(right))) : undefined, radius: node.properties?.radius })).map((item) => JSON.stringify(item)).sort());
}

/** 用户可选一个方向或明确组合；组合稿单独冻结，不计作额外探索候选。 */
export function selectedFigmaCandidate(record) {
  return record.combination?.candidateId === record.selectedCandidateId ? record.combination : record.candidates?.find((item) => item.candidateId === record.selectedCandidateId);
}

/** 非游戏默认单一精修方案，多方案必须有用户明确要求；游戏保留三候选。 */
export function validateFigmaBaseline(repo, work, record, visited = new Set()) {
  insist(record.designRoute === 'figma-app', '非游戏 App 基线必须声明 Figma 路线');
  const versionKey = createHash('sha256').update(JSON.stringify(record)).digest('hex');
  insist(visited.size < 64 && !visited.has(versionKey), '方向复用形成循环或来源过深'); visited.add(versionKey);
  const exploration = record.exploration;
  insist(exploration && ['initial', 'redesign', 'increment'].includes(exploration.kind), '缺少方向探索范围');
  let expected = 1;
  if (exploration.requestedCount !== undefined) {
    insist(Number.isInteger(exploration.requestedCount) && exploration.requestedCount > 0 && typeof exploration.userMessageRef === 'string' && exploration.userMessageRef.trim(), '自定义候选数量须来自用户明确指定');
    expected = exploration.requestedCount;
  }
  if (exploration.kind === 'increment') {
    const source = frozen(repo, exploration.sourceBaselineRef, '已确认方向来源', work);
    validateFigmaBaseline(repo, work, source, visited);
    const sourceReview = frozen(repo, source.selectionReviewRef, '来源方向人工确认', work);
    insist(source.projectId === record.projectId && source.stack === record.stack && sourceReview.decision === 'APPROVED' && sourceReview.userMessageRef?.trim(), '局部增量缺少有效的既有方向');
    expected = 1;
    const candidate = record.candidates?.[0];
    insist(record.candidates?.length === 1 && sameFigmaRef(repo, candidate.directionSourceRef ?? candidate.figmaSnapshotRef, selectedFigmaCandidate(source)?.figmaSnapshotRef), '局部增量必须沿用已确认方向，不得借复用引入新方向');
    if (!sameFigmaRef(repo, candidate.figmaSnapshotRef, candidate.directionSourceRef ?? candidate.figmaSnapshotRef)) insist(exploration.changeScope === 'local' && typeof exploration.changeReason === 'string' && exploration.changeReason.trim(), '新增局部目标须说明沿用方向的范围与依据');
  }
  insist(Array.isArray(record.candidates) && record.candidates.length === expected, `当前探索须提供 ${expected} 个方向`);
  ids(record.candidates.map((item) => item.candidateId), [...new Set(record.candidates.map((item) => item.candidateId))], '方向候选');
  const snapshots = record.candidates.map((candidate) => {
    const snapshot = readFigmaSnapshot(repo, candidate.figmaSnapshotRef, { projectId: work.projectId, stack: work.stack, candidateId: candidate.candidateId, work });
    insist(candidate.path === snapshot.previewRef.path, '候选预览未绑定实际 Figma 节点'); return snapshot;
  });
  if (exploration.kind !== 'increment' && snapshots.length > 1) {
    const first = snapshots[0];
    for (const snapshot of snapshots.slice(1)) insist(isDeepStrictEqual(snapshot.viewport, first.viewport) && snapshot.stateId === first.stateId && snapshot.language === first.language && snapshot.textScale === first.textScale && sameFigmaRef(repo, snapshot.briefRef, first.briefRef), '方向候选必须使用相同任务、内容及比较条件');
    insist(new Set(snapshots.map(directionKey)).size === snapshots.length, '方向候选不能只替换颜色');
  }
  const selected = selectedFigmaCandidate(record);
  insist(selected, '须选定一个方向或先形成用户明确选定的组合节点');
  let selectedSnapshot = snapshots[record.candidates.indexOf(selected)];
  if (selected === record.combination) {
    insist(exploration.kind !== 'increment' && typeof selected.userMessageRef === 'string' && selected.userMessageRef.trim(), '组合须有用户明确决定');
    insist(Array.isArray(selected.sourceCandidateIds) && selected.sourceCandidateIds.length > 0 && new Set(selected.sourceCandidateIds).size === selected.sourceCandidateIds.length && selected.sourceCandidateIds.every((id) => record.candidates.some((item) => item.candidateId === id)), '组合来源须精确绑定本轮候选');
    selectedSnapshot = readFigmaSnapshot(repo, selected.figmaSnapshotRef, { projectId: work.projectId, stack: work.stack, candidateId: selected.candidateId, work });
    insist(selected.path === selectedSnapshot.previewRef.path, '组合预览与实际节点错绑');
  }
  const review = frozen(repo, record.selectionReviewRef, '方向人工选择', work);
  insist(review.decision === 'APPROVED' && review.userMessageRef?.trim() && sameFigmaRef(repo, review.figmaDesignRef, selected.figmaSnapshotRef), '方向选择必须由真实用户消息绑定选定 Figma 节点');
  insist(sameFigmaRef(repo, { path: review.targetRef, sha256: review.targetSha256 }, selectedSnapshot.previewRef), '方向选择预览错绑');
}

/** Figma 设计与正式原生合同连接；已表达的结构直接交接，不再读取重复 V3 批准图。 */
export function validateFigmaAppStage(repo, work, stage, doc) {
  if (!isFigmaApp(work)) return null;
  const snapshot = readFigmaSnapshot(repo, doc.figmaDesignRef, { projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId, work });
  insist(sameFigmaRef(repo, snapshot.previewRef, doc.referenceTarget), '当前目标未绑定选定 Figma 节点的冻结预览');
  const review = frozen(repo, work.visual.reviews?.V2, 'V2 Figma 目标确认', work);
  insist(review.stage === 'V2' && review.purpose === 'target' && review.decision === 'APPROVED' && review.userMessageRef?.trim() && review.scope?.kind === 'full-object' && sameFigmaRef(repo, review.figmaDesignRef, doc.figmaDesignRef), 'V2 缺少当前完整 Figma 目标的人工选择');
  if (work.workItemType === 'DISPLAY_LAYER') insist(review.hostId === work.visual.hostId && review.layerType === work.visual.layerType, '设计确认未绑定显示层宿主');
  const approved = [{ ref: doc.figmaDesignRef, snapshot }];
  for (const extra of doc.additionalTargets ?? []) {
    const target = readFigmaSnapshot(repo, extra.figmaDesignRef, { projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId, work });
    insist(sameFigmaRef(repo, target.previewRef, extra.referenceTarget), '额外状态未绑定实际 Figma 预览');
    approved.push({ ref: extra.figmaDesignRef, snapshot: target });
  }
  if (approved.length > 1) ids(review.figmaTargetRefs?.map((ref) => `${ref.path}:${ref.sha256}`), approved.map(({ ref }) => `${ref.path}:${ref.sha256}`), '同稿状态授权');
  if (work.stack === 'esp32') for (const { snapshot } of approved) {
    const board = frozen(repo, doc.boardProfileRef, 'ESP32 实际硬件', work);
    const hardware = snapshot.hardware;
    insist(hardware && sameFigmaRef(repo, hardware.boardProfileRef, doc.boardProfileRef) && snapshot.viewport.width === board.screen?.width && snapshot.viewport.height === board.screen?.height && hardware.colorFormat === board.screen?.colorFormat, 'ESP32 设计必须绑定实际分辨率和色深');
    for (const key of ['inputMethods', 'fonts']) insist(Array.isArray(hardware[key]) && hardware[key].length && isDeepStrictEqual(hardware[key], board[key]), `ESP32 ${key} 必须来自实际板卡配置`);
    for (const key of ['flashBytes', 'ramBytes']) insist(Number.isFinite(board.resourceBudget?.[key]) && board.resourceBudget[key] > 0 && hardware.resourceBudget?.[key] === board.resourceBudget[key], 'ESP32 必须保留真实 Flash/RAM 预算');
    insist(isDeepStrictEqual(hardware.resourceBudget, board.resourceBudget), 'ESP32 不得虚构 PSRAM 或改变硬件预算');
    for (const node of snapshot.nodes.filter((item) => item.type === 'TEXT')) insist(board.fonts.includes(node.font.platformFamily), 'ESP32 实际文字字体不在设备可用字体范围');
  }
  if (stage === 'V2') return snapshot;
  if (work.stack === 'flutter') insist(doc.designReconstructionRef, '还原交接缺少 Flutter 设计拆解');
  const handoff = frozen(repo, doc.figmaHandoffRef, 'Figma 还原交接', work);
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) insist(handoff[key] === expected, `还原交接 ${key} 错绑`);
  if (work.workItemType === 'DISPLAY_LAYER') insist(handoff.hostId === work.visual.hostId && handoff.layerType === work.visual.layerType, '还原交接未绑定当前显示层宿主');
  insist(sameFigmaRef(repo, handoff.figmaDesignRef, doc.figmaDesignRef) && sameFigmaRef(repo, handoff.layoutSpecRef, doc.layoutSpecRef) && sameFigmaRef(repo, handoff.nativePlanRef, doc.designReconstructionRef ?? doc.layoutSpecRef), '还原交接未绑定当前设计和原生规格');
  figmaFile(repo, handoff.layoutSpecRef, '交接布局规格', work); figmaFile(repo, handoff.nativePlanRef, '交接原生规格', work);
  insist(Array.isArray(handoff.unresolved) && handoff.unresolved.length === 0 && Array.isArray(handoff.adaptationRules) && handoff.adaptationRules.length > 0 && handoff.adaptationRules.every((rule) => typeof rule === 'string' && rule.trim()), '必要交接存在未解决项或缺少适配规则');
  insist(Array.isArray(handoff.mappings) && handoff.mappings.length > 0, '还原交接缺少节点与实现映射');
  for (const mapping of handoff.mappings) {
    const target = approved.find(({ ref }) => sameFigmaRef(repo, ref, mapping.figmaDesignRef ?? doc.figmaDesignRef))?.snapshot;
    insist(target && typeof mapping.designItemId === 'string' && mapping.designItemId.trim() && target.nodes.some((node) => node.id === mapping.nodeId) && mapping.stateId === target.stateId && isDeepStrictEqual(mapping.viewport, target.viewport), '交接设计项、节点或状态/视口错绑');
  }
  if (doc.designReconstructionRef) {
    const plan = frozen(repo, doc.designReconstructionRef, 'Flutter 原生计划', work);
    ids(handoff.mappings.map((item) => item.designItemId), plan.elements.map((item) => item.id), '设计项交接');
    nativeFacts(repo, work, doc, handoff, approved, plan);
  } else {
    const layout = frozen(repo, handoff.nativePlanRef, '原生布局交接', work);
    ids(handoff.mappings.map((item) => item.designItemId), layout.nodes?.map((item) => item.id) ?? [], '原生布局节点交接');
    nativeFacts(repo, work, doc, handoff, approved, layout);
  }
  for (const name of ['V4', ...(stage === 'V5' ? ['V5'] : [])]) if (['V4', 'V5'].includes(stage)) {
    const actual = frozen(repo, work.visual.reviews?.[name], `${name} 当前组合确认`, work);
    insist(sameFigmaRef(repo, actual.figmaDesignRef, doc.figmaDesignRef), `${name} 确认未绑定当前 Figma 设计`);
  }
  return snapshot;
}
