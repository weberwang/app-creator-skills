/** Roblox 工程与视觉合同共用的只读路径、文件身份及工具记录校验。 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { repoPath, WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { pathMatch } from '../../app-workflow-control/scripts/runtime/validation.mjs';
import { PROTECTED_ACTIONS } from '../../app-workflow-control/scripts/runtime/constants.mjs';
import { hasPreciseApproval } from '../../app-workflow-control/scripts/runtime/approval.mjs';

const EFFECTS = new Set(['local-write', 'local-delete', ...PROTECTED_ACTIONS]);
const TOOL_NAMES = new Set(['list_roblox_studios', 'get_studio_state', 'search_game_tree', 'inspect_instance', 'script_read', 'multi_edit', 'execute_luau', 'start_stop_play', 'get_console_output', 'screen_capture', 'character_navigation', 'user_keyboard_input', 'user_mouse_input', 'search_asset', 'insert_asset', 'generate_mesh', 'generate_material', 'generate_procedural_model', 'wait_job_finished', 'open_cloud_invoke', 'upload_image']);
const CONTEXTS = new Set(['Edit', 'Client', 'Server']);

/** 拒绝数组、空值和非普通对象，保证后续字段读取不会隐式通过。 */
export function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须为对象`);
  return value;
}

/** 验证非空文本，明确所有身份字段和操作依据。 */
export function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label} 必须为非空字符串`);
  return value;
}

/** 校验结构化路径片段，避免名称包含分隔符时将不同实例错误合并。 */
export function instancePath(value, label = '实例路径') {
  if (!Array.isArray(value) || value.length < 2 || value[0] !== 'game' || value.some((part) => typeof part !== 'string' || !part.trim())) {
    throw new WorkflowError(`${label} 必须以 game 开头并逐级列出非空实例名称`);
  }
  return value;
}

/** 逐级拒绝路径链接，项目内链接也不能用于替换已冻结证据。 */
function rejectLinks(repo, value, label) {
  const target = repoPath(repo, value, label);
  const root = resolve(repo);
  let cursor = root;
  for (const part of relative(root, target.absolute).split(sep)) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor) || lstatSync(cursor).isSymbolicLink()) throw new WorkflowError(`${label} 不存在或包含链接：${value}`);
  }
  if (!lstatSync(target.absolute).isFile()) throw new WorkflowError(`${label} 必须是普通文件：${value}`);
  return target;
}

/** 按文件实际字节验证非空与摘要；证据引用可额外限定工作项目录。 */
export function fileIdentity(repo, ref, label, evidenceRoot) {
  object(ref, label);
  if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label} 缺少小写 SHA-256`);
  const target = rejectLinks(repo, ref.path, label);
  if (evidenceRoot) {
    const root = repoPath(repo, evidenceRoot, 'evidenceRoot').relative;
    if (!pathMatch(target.relative, `${root}/**`)) throw new WorkflowError(`${label} 必须位于当前 evidenceRoot`);
  }
  const bytes = readFileSync(target.absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label} 为空或 SHA-256 不匹配`);
  return { ...target, bytes };
}

/** 读取已校验身份的 JSON 文件，返回内容及实际文件位置。 */
export function jsonIdentity(repo, ref, label, evidenceRoot) {
  const file = fileIdentity(repo, ref, label, evidenceRoot);
  let doc;
  try { doc = JSON.parse(file.bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`${label} 不是有效 JSON：${error.message}`); }
  return { ...file, doc: object(doc, label) };
}

/** 读取公共证据清单只提供路径的 JSON，仍拒绝越界、链接与空文件。 */
export function evidenceJson(repo, path, work, label) {
  const file = rejectLinks(repo, path, label);
  const root = repoPath(repo, work.evidenceRoot, 'evidenceRoot').relative;
  if (!pathMatch(file.relative, `${root}/**`)) throw new WorkflowError(`${label} 必须位于当前 evidenceRoot`);
  const bytes = readFileSync(file.absolute);
  if (!bytes.length) throw new WorkflowError(`${label} 不能为空`);
  let doc;
  try { doc = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`${label} 不是有效 JSON：${error.message}`); }
  return object(doc, label);
}

/** 只比较已经验证的规范路径及文件摘要，不接受相同哈希的不同文件。 */
export function sameRef(repo, left, right, label = '文件引用') {
  if (!left || !right || typeof left.path !== 'string' || typeof right.path !== 'string' || left.sha256 !== right.sha256 ||
      repoPath(repo, left.path, label).relative !== repoPath(repo, right.path, label).relative) {
    throw new WorkflowError(`${label} 与当前绑定不一致`);
  }
}

/** 检查项目、工作项和实施包身份，防止复用其他任务材料。 */
export function workIdentity(doc, work, { visualStage = work.visual?.stage, implementation = true } = {}) {
  object(doc, 'Roblox 证据');
  for (const [key, expected] of Object.entries({ workItemId: work.workItemId, projectId: work.projectId, stack: 'roblox', workItemType: work.workItemType })) {
    if (typeof expected !== 'string' || !expected || doc[key] !== expected) throw new WorkflowError(`Roblox 证据 ${key} 未绑定当前工作项`);
  }
  if (work.stack !== 'roblox') throw new WorkflowError('Roblox 证据不能用于其他技术栈');
  if (visualStage !== undefined && visualStage !== null && doc.visualStage !== visualStage) throw new WorkflowError('Roblox 证据视觉阶段错绑');
  if (visualStage === undefined && doc.visualStage !== undefined) throw new WorkflowError('非视觉工作项不能声明视觉阶段');
  if (implementation && (!work.implementationPackageRef?.path || doc.implementationPackageRef !== work.implementationPackageRef.path)) {
    throw new WorkflowError('Roblox 证据未绑定当前实施包');
  }
}

/** 验证可追溯的 Studio 和 Place 身份；未发布时允许没有远程 ID。 */
export function studioIdentity(repo, studio, label = 'Studio') {
  object(studio, label);
  text(studio.studioId, `${label}.studioId`);
  const place = object(studio.place, `${label}.place`);
  text(place.placeKey, `${label}.place.placeKey`);
  if (!['local', 'published'].includes(place.kind)) throw new WorkflowError(`${label}.place.kind 必须为 local 或 published`);
  if (place.kind === 'published') {
    for (const key of ['placeId', 'universeId']) if (!/^\d+$/.test(place[key] ?? '')) throw new WorkflowError(`${label}.place.${key} 必须为已发布 ID`);
  } else if (place.placeId != null || place.universeId != null) throw new WorkflowError('未发布 Place 不能伪造远程 ID');
  fileIdentity(repo, place.snapshotRef, `${label} 正式 Place`);
  if (!/\.rbxlx?$/i.test(place.snapshotRef.path)) throw new WorkflowError('正式 Place 快照必须是 .rbxl 或 .rbxlx');
  if (typeof place.savedAt !== 'string' || !Number.isFinite(Date.parse(place.savedAt))) throw new WorkflowError('正式 Place 必须记录保存时间');
  return studio;
}

/** 比较项目内稳定 Place 身份；快照变化不应误认为同一个文件仍未变化。 */
export function samePlace(first, second) {
  if (first?.placeKey !== second?.placeKey || first?.kind !== second?.kind ||
      (first?.kind === 'published' && (first.placeId !== second.placeId || first.universeId !== second.universeId))) {
    throw new WorkflowError('不同阶段的 Place 身份错绑');
  }
}

/** 将 Studio 工具记录和当前工程身份及正式源快照绑定。 */
function captureIdentity(repo, capture, work, studio) {
  object(capture, 'MCP 工具记录');
  if (capture.schemaVersion !== 'roblox-mcp-capture/1.0' || capture.origin !== 'studio-mcp' || capture.execution !== 'actual' || capture.synthetic === true) throw new WorkflowError('MCP 工具记录必须声明真实 Studio 调用，不能使用离线或合成结果');
  for (const [key, expected] of Object.entries({ workItemId: work.workItemId, projectId: work.projectId, studioId: studio.studioId })) {
    if (capture[key] !== expected) throw new WorkflowError(`MCP 工具记录 ${key} 与当前工作项或 Studio 错绑`);
  }
  if (!CONTEXTS.has(capture.context)) throw new WorkflowError('MCP 工具记录缺少 Edit/Client/Server 上下文');
  if (capture.context === 'Client') text(capture.clientId, 'Client 工具记录的客户端身份');
  if (!TOOL_NAMES.has(capture.toolName)) throw new WorkflowError('MCP 工具名称不在支持的实际 Studio 工具范围');
  if (['character_navigation', 'user_keyboard_input', 'user_mouse_input'].includes(capture.toolName) && capture.context !== 'Client') throw new WorkflowError('玩家输入工具只能用于 Client 上下文');
  if (!Number.isFinite(Date.parse(capture.observedAt ?? ''))) throw new WorkflowError('MCP 工具记录缺少实际时间');
  if (Date.parse(capture.observedAt) < Date.parse(studio.place.savedAt)) throw new WorkflowError('MCP 工具记录早于正式源保存');
  sameRef(repo, capture.placeSnapshotRef, studio.place.snapshotRef, 'MCP 工具记录的 Place 快照');
  object(capture.request, 'MCP 请求');
  if (capture.request.studio_id !== studio.studioId) throw new WorkflowError('MCP 请求 studio_id 错绑');
  if (capture.toolName === 'execute_luau' && capture.request.datamodel_type !== capture.context) throw new WorkflowError('Luau 调用的 datamodel_type 与实际上下文不一致');
  // 具体参数名由当前 Studio 工具提供，但空请求不能伪装成一次 Luau 执行。
  if (capture.toolName === 'execute_luau' && !Object.entries(capture.request).some(([key, value]) => !['studio_id', 'datamodel_type'].includes(key) && typeof value === 'string' && value.trim())) throw new WorkflowError('Luau 请求缺少实际代码或执行负载');
  if (capture.toolName === 'multi_edit' && (capture.context !== 'Edit' || capture.request.datamodel_type !== 'Edit')) throw new WorkflowError('脚本编辑只能记录 Edit 上下文');
  const response = object(capture.response, 'MCP 原始响应');
  if (response.isError === true || capture.status !== 'PASS') throw new WorkflowError('MCP 工具调用失败，不能作为通过证据');
  const blocks = Array.isArray(response.content) ? response.content : [];
  const contents = blocks.filter((block) => (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) || (block?.type === 'image' && typeof block.data === 'string' && block.data));
  if (!contents.length && (!response.structuredContent || !Object.keys(object(response.structuredContent, 'MCP 结构化响应')).length)) throw new WorkflowError('MCP 原始响应为空');
  return capture;
}

/** 复用既有动作批准机制；工具名本身不能决定运行代码或试玩的实际副作用。 */
function validateEffects(repo, capture, work, studio) {
  if (!Array.isArray(capture.effects) || new Set(capture.effects).size !== capture.effects.length || capture.effects.some((effect) => !EFFECTS.has(effect))) throw new WorkflowError('MCP 工具记录须明确声明实际 effects');
  if (['execute_luau', 'start_stop_play', 'open_cloud_invoke'].includes(capture.toolName)) text(capture.effectsBasis, '执行代码或试玩的副作用核查依据');
  if (capture.toolName === 'upload_image' && !capture.effects.includes('upload')) throw new WorkflowError('图片上传必须声明 upload 效果');
  if (capture.toolName === 'open_cloud_invoke') {
    const method = text(capture.request.method, 'Open Cloud 请求方法').toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new WorkflowError('Open Cloud 请求方法无效');
    if (method !== 'GET' && !capture.effects.includes('external-write')) throw new WorkflowError('Open Cloud 写入必须声明 external-write');
  }
  const allowed = work.action?.effects ?? [];
  for (const effect of capture.effects) {
    if (effect === 'local-write' && !work.action) continue;
    if (!allowed.includes(effect)) throw new WorkflowError(`MCP 工具效果未在当前工作项声明：${effect}`);
  }
  if (capture.effects.some((effect) => PROTECTED_ACTIONS.has(effect))) {
    if (!hasPreciseApproval(work)) throw new WorkflowError('MCP 外部副作用缺少当前工作项的精确批准');
    if (capture.actionId !== work.action.actionId || capture.actionTarget !== work.action.target) throw new WorkflowError('MCP 外部副作用的 actionId 或目标与当前批准不一致');
    validateProtectedScope(repo, capture, work, studio);
  }
}

/** 校验标准化作用域及可解析的 Open Cloud 请求目标，拒绝跨目标借用批准。 */
function validateProtectedScope(repo, capture, work, studio) {
  const match = /^(universe|place|asset):([1-9]\d*)$/.exec(work.action.target ?? '');
  if (!match) throw new WorkflowError('Roblox 受保护动作目标必须为 universe:<ID>、place:<ID> 或 asset:<ID>');
  const [, kind, id] = match;
  const scope = object(capture.targetScope, 'MCP 受保护目标范围');
  if (scope.kind !== kind || scope.id !== id) throw new WorkflowError('MCP 声明的目标范围与批准对象不一致');
  if (kind !== 'asset') {
    if (studio.place.kind !== 'published' || (kind === 'universe' ? studio.place.universeId : studio.place.placeId) !== id) throw new WorkflowError('受保护动作目标与当前 Studio 的已发布 Place 不一致');
  }
  let operation = capture.toolName;
  const identified = [];
  if (capture.toolName === 'open_cloud_invoke') {
    const endpoint = text(capture.request.endpoint, 'Open Cloud 请求端点');
    if (!endpoint.startsWith('/') || endpoint.startsWith('//') || /[\u0000-\u001f\\]/.test(endpoint)) throw new WorkflowError('Open Cloud 端点必须是规范化的相对路径');
    let decoded;
    try { decoded = decodeURIComponent(endpoint.split('?')[0]); } catch { throw new WorkflowError('Open Cloud 端点编码无效'); }
    if (/%[\da-f]{2}/i.test(decoded) || decoded.split('/').some((part) => part === '.' || part === '..')) throw new WorkflowError('Open Cloud 端点不能包含二次编码或路径跳转');
    operation = `${capture.request.method.toUpperCase()} ${decoded}`;
    const pattern = /(?:^|\/)(universes?|places?|assets?)\/([1-9]\d*)(?=\/|$)/gi;
    for (const part of decoded.matchAll(pattern)) identified.push({ kind: part[1].toLowerCase().replace(/s$/, ''), id: part[2] });
    const scoped = identified.filter((item) => item.kind === kind);
    if (scoped.some((item) => item.id !== id)) throw new WorkflowError('Open Cloud 端点中的目标 ID 与批准对象不一致');
    if (studio.place.kind === 'published') {
      if (identified.some((item) => item.kind === 'universe' && item.id !== studio.place.universeId)) throw new WorkflowError('Open Cloud 端点的 Experience 与当前 Studio 不一致');
      if (kind === 'place' && identified.some((item) => item.kind === 'place' && item.id !== studio.place.placeId)) throw new WorkflowError('Open Cloud 端点的 Place 与当前 Studio 不一致');
    }
  }
  if (!Array.isArray(scope.allowedOperations) || !scope.allowedOperations.includes(operation)) throw new WorkflowError('目标范围未明确允许当前工具和端点');
  const direct = identified.some((item) => item.kind === kind && item.id === id);
  if (!direct) {
    // 端点未给出目标时，只接受同 Studio 的真实只读上下文记录，不能靠自述目标推断。
    const proof = jsonIdentity(repo, capture.scopeEvidenceRef, '受保护目标上下文', work.evidenceRoot).doc;
    if (!Array.isArray(proof.effects) || proof.effects.length) throw new WorkflowError('目标上下文证明必须来自无副作用读取');
    captureIdentity(repo, proof, work, studio);
    if (!['execute_luau', 'get_studio_state', 'inspect_instance'].includes(proof.toolName)) throw new WorkflowError('目标上下文必须来自 Studio 原生读取');
    if (proof.toolName === 'execute_luau') text(proof.effectsBasis, '上下文读取副作用依据');
    const key = kind === 'universe' ? 'universeId' : kind === 'place' ? 'placeId' : 'assetId';
    const matches = responseObjects(proof.response).filter((item) => String(item[key] ?? '') === id);
    if (matches.length !== 1) throw new WorkflowError('原始上下文响应不能唯一证明当前目标');
    for (const item of identified.filter((entry) => entry.kind !== kind)) {
      const foreignKey = item.kind === 'universe' ? 'universeId' : item.kind === 'place' ? 'placeId' : 'assetId';
      if (String(matches[0][foreignKey] ?? '') !== item.id) throw new WorkflowError('原始上下文不能证明端点内其他对象属于已批准目标');
    }
  }
}

/** 验证并返回实际 MCP 原始结果；工具输出只证明其所报告的上下文与内容。 */
export function captureRef(repo, ref, work, studio, { context, tools, targetPath, savedReadback = false } = {}) {
  const { doc } = jsonIdentity(repo, ref, 'MCP 工具记录', work.evidenceRoot);
  captureIdentity(repo, doc, work, studio);
  validateEffects(repo, doc, work, studio);
  if (context && doc.context !== context) throw new WorkflowError(`MCP 工具记录需要 ${context} 上下文`);
  if (tools && !tools.includes(doc.toolName)) throw new WorkflowError('MCP 工具记录类型不符合该检查');
  if (targetPath && JSON.stringify(instancePath(doc.targetPath, 'MCP 目标路径')) !== JSON.stringify(instancePath(targetPath))) throw new WorkflowError('MCP 工具记录目标实例错绑');
  if (savedReadback && doc.sourceState !== 'saved-readback') throw new WorkflowError('正式源读取必须标明已保存并重新读取');
  return doc;
}

/** 仅允许当前实施包中真实声明的正式源，避免报告或图片冒充工程产物。 */
export function sourceRefs(repo, work, pack, sources, placeRef, studio) {
  if (!Array.isArray(pack?.executionUnits) || !pack.executionUnits.length || !Array.isArray(sources) || !sources.length) throw new WorkflowError('Roblox 正式源必须绑定实施单元');
  const paths = new Set();
  let placeFound = false;
  for (const item of sources) {
    object(item, '正式源');
    const matches = pack.executionUnits.filter((unit) => unit?.unitId === item.unitId);
    if (matches.length !== 1) throw new WorkflowError('正式源未绑定唯一实施单元');
    const file = fileIdentity(repo, item.ref, '正式源文件');
    if (!/\.(?:luau|rbxlx?)$/i.test(file.relative)) throw new WorkflowError('正式源只能是 .luau、.rbxl 或 .rbxlx');
    if (!Array.isArray(matches[0].paths) || !matches[0].paths.some((pattern) => pathMatch(file.relative, pattern))) throw new WorkflowError('正式源不在实施单元 paths');
    if (!Array.isArray(work.allowedPaths) || !work.allowedPaths.some((pattern) => pathMatch(file.relative, pattern)) || (work.forbiddenPaths ?? []).some((pattern) => pathMatch(file.relative, pattern))) throw new WorkflowError('正式源越过工作项文件所有权');
    if (paths.has(file.relative)) throw new WorkflowError('正式源路径不能重复');
    paths.add(file.relative);
    if (/\.luau$/i.test(file.relative)) {
      const targetPath = instancePath(item.instancePath, 'Luau 正式脚本实例路径');
      const readback = captureRef(repo, item.readbackRef, work, studio, { context: 'Edit', tools: ['script_read', 'execute_luau'], targetPath, savedReadback: true });
      // Studio 和磁盘换行可以由系统规范化，但正文必须完全一致，避免旧对象冒充已同步源码。
      const diskSource = normalizeSource(file.bytes.toString('utf8'));
      const blocks = (readback.response.content ?? []).filter((block) => block?.type === 'text').flatMap((block) => responseStrings(block.text));
      const structured = responseStrings(readback.response.structuredContent);
      if (![...blocks, ...structured].some((value) => normalizeSource(value) === diskSource)) throw new WorkflowError('Luau 磁盘源码与 Studio 编辑态脚本回读不一致');
    }
    if (file.relative === repoPath(repo, placeRef.path).relative && item.ref.sha256 === placeRef.sha256) placeFound = true;
  }
  if (!placeFound) throw new WorkflowError('正式 Place 快照必须属于实施单元的真实源文件');
  return paths;
}

/** 只规范化 BOM 与行结束符，保留代码内容的其他可见差异。 */
function normalizeSource(value) { return value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); }

/** 兼容原始文本和工具以 JSON 包装的多行字符串，不以片段命中代替全文相等。 */
function responseStrings(value, depth = 0) {
  if (depth > 10 || value == null) return [];
  if (typeof value === 'string') {
    const found = [value];
    try { found.push(...responseStrings(JSON.parse(value), depth + 1)); } catch { /* 原始 Luau 无需作为 JSON 解析。 */ }
    return found;
  }
  if (Array.isArray(value)) return value.flatMap((item) => responseStrings(item, depth + 1));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => responseStrings(item, depth + 1));
  return [];
}

/** 从原始 MCP 文本或结构化响应中提取 JSON 对象，用于核对明确字段而非关键词。 */
export function responseObjects(response) {
  const result = [];
  /** 对 JSON 字符串、数组及对象递归展开，避免对相同结构重复推断。 */
  function visit(value, depth = 0) {
    if (depth > 10 || value == null) return;
    if (typeof value === 'string') {
      try { visit(JSON.parse(value), depth + 1); } catch { /* 非 JSON 文本不提供可机读对象。 */ }
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    if (typeof value !== 'object') return;
    result.push(value);
    for (const child of Object.values(value)) visit(child, depth + 1);
  }
  if (response?.structuredContent) visit(response.structuredContent);
  for (const block of response?.content ?? []) if (block?.type === 'text') visit(block.text);
  return result;
}

/** 只接受原始工具响应中唯一的节点结构，避免名称或全局字符串误匹配。 */
export function observedNode(capture, path, label) {
  const key = JSON.stringify(instancePath(path, label));
  const matches = responseObjects(capture.response).filter((item) => Array.isArray(item.instancePath) && JSON.stringify(item.instancePath) === key && typeof item.className === 'string' && item.properties && typeof item.properties === 'object' && !Array.isArray(item.properties));
  if (matches.length !== 1) throw new WorkflowError(`${label} 必须在原始 MCP 响应中有唯一的路径、类型和属性记录`);
  return matches[0];
}

/** 每次运行和交互都应引用当前完整正式源集合，防止使用旧脚本运行记录。 */
export function bindSourceBundle(repo, capture, sources) {
  if (!Array.isArray(capture.sourceRefs) || capture.sourceRefs.length !== sources.length) throw new WorkflowError('运行记录未绑定完整正式源集合');
  const used = new Set();
  for (const source of sources) {
    const path = repoPath(repo, source.ref.path, '正式源').relative;
    const matches = capture.sourceRefs.filter((ref) => ref?.path && repoPath(repo, ref.path, '运行来源').relative === path && ref.sha256 === source.ref.sha256);
    if (matches.length !== 1 || used.has(path)) throw new WorkflowError('运行记录的正式源路径或摘要错绑');
    used.add(path);
  }
}

/** 验证能在工具原始文本或结构化响应中查到实际观察值。 */
export function observedInCapture(capture, value, label) {
  text(value, label);
  const searchable = [...(capture.response.content ?? []).filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text), JSON.stringify(capture.response.structuredContent ?? {})].join('\n');
  if (!searchable.includes(value)) throw new WorkflowError(`${label} 未出现在 MCP 原始响应中`);
}
