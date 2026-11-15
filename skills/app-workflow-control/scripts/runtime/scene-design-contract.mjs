import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { VISUAL_STAGES } from './constants.mjs';

const GAME_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);
const CHECKS = ['camera', 'navigation', 'collision', 'interaction'];
const WORLD_2D_FIELDS = new Set(['schemaVersion', 'workItemId', 'projectId', 'stack', 'objectId', 'designRoute', 'scopeIds', 'spatialSpecRef', 'layoutRef', 'layoutRunRef', 'reviewRef', 'spaceApprovalRef']);

/** 识别二维世界；UI 场景仍走原图片合同。 */
export function isWorld2D(work) {
  return work?.workItemType === 'SCENE' && work.visual?.designRoute === 'world-2d';
}

/** 为合同缺失或错绑提供一致的诊断。 */
function insist(condition, message) {
  if (!condition) throw new WorkflowError(`场景设计合同：${message}`);
}

/** 标识符与人工消息必须是非空文本。 */
function text(value, label) {
  insist(typeof value === 'string' && value.trim(), `${label} 必须为非空字符串`);
  return value;
}

/** 范围与区域身份按集合比较前必须唯一。 */
function identifiers(items, label) {
  insist(Array.isArray(items) && items.length > 0, `${label} 不能为空`);
  items.forEach((item) => text(item, label));
  insist(new Set(items).size === items.length, `${label} 不能重复`);
}

/** 规范路径及摘要共同标识一个冻结版本。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256 && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 冻结的真实文件不得越界、为空、改变内容或重新绑定已失效版本。 */
function sceneFile(repo, ref, label, work) {
  insist(ref && typeof ref === 'object' && !Array.isArray(ref) && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 必须绑定路径和 SHA-256`);
  const path = repoPath(repo, ref.path, label).relative;
  insist(path === ref.path, `${label} 路径不规范`);
  const key = fileIdentityKey(repo, path);
  insist(!work?.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === key), `${label} 使用了已作废引用`);
  requireFile(repo, path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  insist(bytes.length > 0 && createHash('sha256').update(bytes).digest('hex') === ref.sha256, `${label} 为空或内容已变化`);
  return path;
}

/** 读取冻结 JSON，避免由相同路径换绑内容。 */
function frozenJson(repo, ref, label, work) {
  return readJson(repo, sceneFile(repo, ref, label, work), label);
}

/** 二维世界无根候选；三维世界仍需核对当前候选。 */
function identity(record, work, label) {
  insist(record && typeof record === 'object' && !Array.isArray(record), `${label} 必须为对象`);
  const expected = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId };
  if (work.visual.designRoute === 'world-3d') expected.candidateId = work.visual.candidateId;
  for (const [field, value] of Object.entries(expected)) {
    text(value, `工作项 ${field}`);
    insist(record[field] === value, `${label}.${field} 与当前工作项不一致`);
  }
}

/** 审查或确认必须精确绑定本轮全部依据。 */
function basis(repo, actual, expected, label, work) {
  insist(Array.isArray(actual) && actual.length === expected.length, `${label} 依据数量不一致`);
  const keys = (items) => items.map((ref) => {
    sceneFile(repo, ref, label, work);
    return `${fileIdentityKey(repo, ref.path)}:${ref.sha256}`;
  });
  const actualKeys = keys(actual);
  const expectedKeys = keys(expected);
  insist(new Set(actualKeys).size === actualKeys.length && new Set(expectedKeys).size === expectedKeys.length, `${label} 依据不能重复`);
  insist(actualKeys.sort().every((value, index) => value === expectedKeys.sort()[index]), `${label} 未绑定当前全部依据`);
}

/** 只接受在冻结证据根下的阶段观测，排除相似前缀路径。 */
export function withinEvidenceRoot(repo, path, root, label) {
  const normalizedRoot = repoPath(repo, root, `${label} 证据根`).relative;
  const key = fileIdentityKey(repo, path);
  const rootKey = fileIdentityKey(repo, normalizedRoot);
  insist(key.startsWith(`${rootKey}/`), `${label} 必须位于其冻结阶段的 evidenceRoot`);
}

/** 原始引擎输出不能使用控制、人工决定或空间规格记录自证。 */
export function rawEvidence(repo, ref, label, work, root, forbiddenRefs = []) {
  const path = sceneFile(repo, ref, label, work);
  withinEvidenceRoot(repo, path, root, label);
  const key = fileIdentityKey(repo, path);
  insist(!forbiddenRefs.filter(Boolean).some((item) => item.path && fileIdentityKey(repo, item.path) === key), `${label} 不能引用合同、场景或资产自身`);
  const content = readFileSync(repoPath(repo, path).absolute, 'utf8').trim();
  let parsed;
  try {
    if (/^[\[{]/.test(content)) parsed = JSON.parse(content);
    else insist(!path.toLowerCase().endsWith('.json'), `${label} 的 JSON 内容无效`);
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    insist(!path.toLowerCase().endsWith('.json'), `${label} 的 JSON 内容无效`);
    return path;
  }
  if (parsed === undefined) return path;
  // 保留真实 JSON 引擎输出；完整控制身份、人工决定或规格不能冒充观测。
  const queue = [parsed];
  let examined = 0;
  while (queue.length) {
    const value = queue.pop();
    if (!value || typeof value !== 'object') continue;
    insist(++examined <= 100000, `${label} 结构过大`);
    if (Array.isArray(value)) {
      insist(value.length <= 100000 && queue.length + value.length <= 100000, `${label} 结构过大`);
      for (const item of value) queue.push(item);
      continue;
    }
    const isApproval = typeof value.userMessageRef === 'string' && ('decision' in value || 'purpose' in value);
    const isControllerRecord = value.schemaVersion !== undefined && typeof value.workItemId === 'string' && (typeof value.stack === 'string' || typeof value.projectId === 'string');
    const isSpatialSpec = [2, 3].includes(value.dimension) && Array.isArray(value.regions) && Array.isArray(value.scopeIds);
    const isModelSpec = Array.isArray(value.models) && typeof value.units === 'string';
    const isBaseline = typeof value.baselineId === 'string' && (value.directionRef || value.selectionReviewRef);
    insist(!isApproval && !isControllerRecord && !isSpatialSpec && !isModelSpec && !isBaseline, `${label} 不能使用控制、审批或规格 JSON 自证`);
    const children = Object.values(value);
    insist(queue.length + children.length <= 100000, `${label} 结构过大`);
    for (const child of children) queue.push(child);
  }
  return path;
}

/** 二维布局和三维白模共用运行记录规则，不据文件宣称真实引擎已执行。 */
export function runRecord(repo, work, ref, phase, sceneRef, root, forbiddenRefs = []) {
  const record = frozenJson(repo, ref, `${phase} 运行记录`, work);
  withinEvidenceRoot(repo, ref.path, root, `${phase} 运行记录`);
  identity(record, work, `${phase} 运行记录`);
  insist(record.phase === phase && record.executionMode === 'engine', `${phase} 必须绑定引擎运行记录`);
  text(record.engineSessionId, `${phase}.engineSessionId`);
  const start = Date.parse(record.startedAt);
  const end = Date.parse(record.completedAt);
  insist(typeof record.startedAt === 'string' && typeof record.completedAt === 'string' && Number.isFinite(start) && Number.isFinite(end) && end >= start, `${phase} 运行时间无效`);
  sceneFile(repo, record.sceneRef, `${phase}.sceneRef`, work);
  insist(sameRef(repo, record.sceneRef, sceneRef), `${phase} 运行场景错绑`);
  const noSelf = [ref, sceneRef, work.visual.domainEvidenceRef, work.visual.sceneDesignRef, ...forbiddenRefs].filter(Boolean);
  rawEvidence(repo, record.commandEvidenceRef, `${phase}.commandEvidenceRef`, work, root, noSelf);
  insist(Array.isArray(record.checks) && record.checks.length === CHECKS.length, `${phase} 运行检查不完整`);
  for (const id of CHECKS) {
    const matches = record.checks.filter((item) => item?.id === id);
    insist(matches.length === 1, `${phase} 检查 ${id} 必须唯一`);
    const item = matches[0];
    insist(['PASS', 'NOT_APPLICABLE'].includes(item.status), `${phase} 检查 ${id} 尚未通过`);
    if (item.status === 'PASS') rawEvidence(repo, item.evidenceRef, `${phase}.${id} 证据`, work, root, noSelf);
    else { insist(id !== 'camera', '实际镜头检查不可省略'); text(item.reason, `${phase}.${id} 不适用原因`); }
  }
  return record;
}

/** 只验证一轮已有联合审查，不把该结果当作人工确认。 */
export function validateSceneReview(repo, work, ref, basisRefs, kind) {
  const review = frozenJson(repo, ref, '联合单次审查', work);
  identity(review, work, '联合单次审查');
  insist(review.kind === kind && review.rounds === 1 && review.status === 'COMPLETE', '联合审查必须完成且只记录一轮');
  basis(repo, review.basisRefs, basisRefs, '联合审查', work);
  insist(Array.isArray(review.issues), '联合审查缺少问题记录');
  for (const issue of review.issues) {
    text(issue?.id, '审查问题.id');
    insist(typeof issue.blocking === 'boolean' && ['RESOLVED', 'DEFERRED', 'UNRESOLVED'].includes(issue.status), '审查问题状态无效');
    if (issue.blocking) insist(issue.status === 'RESOLVED', `阻断问题 ${issue.id} 尚未解决`);
    if (issue.status !== 'RESOLVED') text(issue.reason, '未解决问题原因');
  }
  insist(new Set(review.issues.map((item) => item.id)).size === review.issues.length, '审查问题身份重复');
}

/** 读取既有人工消息及其冻结的对象和依据，不生成新的批准。 */
export function validateSceneApproval(repo, work, ref, { stage, purpose, subjectRef, basisRefs }) {
  const record = frozenJson(repo, ref, `${purpose} 人工确认`, work);
  identity(record, work, `${purpose} 人工确认`);
  insist(record.stage === stage && record.purpose === purpose && record.decision === 'APPROVED', `${purpose} 尚未人工确认`);
  text(record.userMessageRef, `${purpose}.userMessageRef`);
  sceneFile(repo, record.subjectRef, `${purpose} 确认对象`, work);
  insist(sameRef(repo, record.subjectRef, subjectRef), `${purpose} 确认对象错绑`);
  basis(repo, record.basisRefs, basisRefs, `${purpose} 确认`, work);
}

/** 读取当前二维世界封套；它记录现有事实而不是第二套状态机。 */
function world2dEnvelope(repo, work) {
  insist(isWorld2D(work) && GAME_STACKS.has(work.stack), 'world-2d 仅用于游戏世界 SCENE');
  const contract = frozenJson(repo, work.visual.sceneDesignRef, '二维场景设计依据', work);
  identity(contract, work, '二维场景设计依据');
  insist(contract.designRoute === 'world-2d', '二维场景路线错绑');
  for (const key of Object.keys(contract)) insist(WORLD_2D_FIELDS.has(key), `二维场景设计依据不支持字段 ${key}`);
  identifiers(contract.scopeIds, 'scopeIds');
  for (const field of ['spatialSpecRef', 'layoutRef', 'layoutRunRef']) sceneFile(repo, contract[field], `二维场景.${field}`, work);
  return contract;
}

/** 结构化二维事实可对应平面、拓扑、Tilemap 或其他适用布局。 */
function world2dSpatialSpec(repo, work, contract) {
  const spec = frozenJson(repo, contract.spatialSpecRef, '二维空间规格', work);
  identity(spec, work, '二维空间规格');
  insist(spec.dimension === 2, '空间规格必须声明二维世界');
  text(spec.units, '二维空间规格.units');
  identifiers(spec.scopeIds, '二维空间规格.scopeIds');
  insist(JSON.stringify([...spec.scopeIds].sort()) === JSON.stringify([...contract.scopeIds].sort()), '二维空间规格与合同覆盖范围不一致');
  insist(Array.isArray(spec.regions) && spec.regions.length > 0, '二维空间规格必须包含区域');
  identifiers(spec.regions.map((region) => region?.id), '二维空间区域 id');
  insist(Array.isArray(spec.playerScale) && spec.playerScale.length === 2 && spec.playerScale.every((item) => Number.isFinite(item) && item > 0), '角色尺度必须是二维正数向量');
  insist(Number.isFinite(spec.viewport?.width) && spec.viewport.width > 0 && Number.isFinite(spec.viewport?.height) && spec.viewport.height > 0, '目标视口尺寸必须为正数');
  return spec;
}

/** 校验功能基线中冻结的二维空间、范围和证据根。 */
function frozenWorld2DRoot(repo, work, snapshot, contract) {
  insist(snapshot?.schemaVersion === '1.0' && snapshot.workItemId === work.workItemId && snapshot.projectId === work.projectId && snapshot.stack === work.stack && snapshot.objectId === work.visual.objectId && snapshot.designRoute === 'world-2d', '功能基线身份或二维路线错绑');
  const saved = snapshot.sceneDesignRefs;
  for (const field of ['spatialSpecRef', 'layoutRef', 'layoutRunRef']) insist(sameRef(repo, saved?.[field], contract[field]), `功能基线二维空间依据 ${field} 已变化`);
  identifiers(saved?.scopeIds, '功能基线 scopeIds');
  insist(JSON.stringify([...saved.scopeIds].sort()) === JSON.stringify([...contract.scopeIds].sort()), '功能基线二维范围已变化');
  return repoPath(repo, text(snapshot.sceneDesignEvidenceRoot, '功能基线.sceneDesignEvidenceRoot'), '二维布局证据根').relative;
}

/** 校验二维空间依据、布局运行及适用的审查与人工确认。 */
function validate2D(repo, work, requireConfirmation, snapshot) {
  const contract = world2dEnvelope(repo, work);
  world2dSpatialSpec(repo, work, contract);
  let root = work.evidenceRoot;
  if (!['V0', 'V1'].includes(work.visual.stage) || snapshot) {
    const frozen = snapshot ?? frozenJson(repo, work.visual.functionBaselineRef, '功能基线', work);
    root = frozenWorld2DRoot(repo, work, frozen, contract);
  }
  runRecord(repo, work, contract.layoutRunRef, 'layout', contract.layoutRef, root, [contract.spatialSpecRef]);
  if (requireConfirmation) {
    validateSceneReview(repo, work, contract.reviewRef, [contract.spatialSpecRef, contract.layoutRef, contract.layoutRunRef], 'scene-design-review');
    validateSceneApproval(repo, work, contract.spaceApprovalRef, { stage: 'V2', purpose: 'space-baseline', subjectRef: contract.spatialSpecRef, basisRefs: [contract.layoutRef, contract.layoutRunRef, contract.reviewRef] });
  }
  return contract;
}

/** 公开阶段检查；布局通过不自动完成审查或人工确认。 */
export function validateWorld2DDesign(repo, work, { requireConfirmation = false } = {}) {
  if (isWorld2D(work) && work.visual.stage === 'V0' && !work.visual.sceneDesignRef && !requireConfirmation) return null;
  return validate2D(repo, work, requireConfirmation);
}

/** 功能基线固定当前布局来源，后续重新绑定外层记录不得换掉空间依据。 */
export function freezeWorld2DDesign(repo, work) {
  const contract = validateWorld2DDesign(repo, work, { requireConfirmation: true });
  return { sceneDesignEvidenceRoot: work.evidenceRoot, sceneDesignRefs: { spatialSpecRef: contract.spatialSpecRef, layoutRef: contract.layoutRef, layoutRunRef: contract.layoutRunRef, scopeIds: [...contract.scopeIds] } };
}

/** 复用、后续阶段与重验都重新检查已冻结的空间版本及人工事实。 */
export function assertFrozenWorld2DDesign(repo, work, snapshot) {
  return validate2D(repo, work, true, snapshot);
}

/** 历史记录只在摘要仍匹配时用于失效追溯。 */
function historicalJson(repo, ref) {
  try {
    requireFile(repo, ref.path, '历史空间记录');
    const bytes = readFileSync(repoPath(repo, ref.path).absolute);
    if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) return null;
    return JSON.parse(bytes.toString('utf8'));
  } catch { return null; }
}

/** 按影响阶段失效二维运行、审查和确认；保留未变化的空间源文件。 */
export function invalidateSceneDesign(repo, work, invalidatedRefs, earliestStage) {
  if (!isWorld2D(work)) return;
  const cutoff = VISUAL_STAGES.indexOf(earliestStage);
  // V2 只重做正式方向；空间依据未变时保留本轮联合审查及已有空间确认。
  if (cutoff < 0 || cutoff > 1) return;
  const ref = work.visual.sceneDesignRef;
  const contract = historicalJson(repo, ref);
  const seen = new Set();
  /** 深入运行观测，不把作为来源的空间规格一起作废。 */
  function mark(reference) {
    if (!reference?.path) return;
    let path;
    try { path = repoPath(repo, reference.path).relative; } catch { return; }
    const key = fileIdentityKey(repo, path);
    if (seen.has(key)) return;
    seen.add(key);
    invalidatedRefs.push({ path, state: earliestStage });
    const record = historicalJson(repo, reference);
    if (!record || typeof record !== 'object') return;
    for (const name of ['commandEvidenceRef', 'runtimeRef']) mark(record[name]);
    for (const check of record.checks ?? []) mark(check?.evidenceRef);
  }
  mark(ref);
  mark(contract?.layoutRunRef);
  mark(contract?.reviewRef);
  mark(contract?.spaceApprovalRef);
  delete work.visual.sceneDesignRef;
}

/** 遍历二维控制记录的嵌套引用，保护输出路径免于覆盖真实依据。 */
export function collectSceneDesignReferences(repo, work) {
  if (!isWorld2D(work)) return [];
  const found = new Map();
  const scanned = new Set();
  const queued = [work.visual?.sceneDesignRef, work.visual?.functionBaselineRef].map((ref) => ({ ref, control: true }));
  const controlKeys = new Set(['sceneDesignRef', 'spatialSpecRef', 'layoutRunRef', 'reviewRef', 'spaceApprovalRef', 'functionBaselineRef', 'runtimeRef']);
  const stringPaths = new Set(['sourceRef', 'output', 'generationRecord', 'evidenceRef']);
  while (queued.length) {
    insist(found.size < 100000, '冻结文件引用过多');
    const { ref, control } = queued.shift();
    if (!ref?.path) continue;
    try {
      const path = repoPath(repo, ref.path).relative;
      const key = fileIdentityKey(repo, path);
      found.set(key, path);
      if (!control || scanned.has(key)) continue;
      scanned.add(key);
      const absolute = repoPath(repo, path).absolute;
      if (!existsSync(absolute)) continue;
      const stat = lstatSync(absolute);
      if (!stat.isFile()) continue;
      insist(stat.size <= 5 * 1024 * 1024, '控制记录超过安全读取上限');
      const pending = [{ value: JSON.parse(readFileSync(absolute, 'utf8')), key: '' }];
      let examined = 0;
      while (pending.length) {
        insist(++examined <= 100000, '嵌套引用结构过大');
        const current = pending.pop();
        if (typeof current.value === 'string' && stringPaths.has(current.key)) { queued.push({ ref: { path: current.value }, control: false }); continue; }
        if (!current.value || typeof current.value !== 'object') continue;
        if (typeof current.value.path === 'string') queued.push({ ref: current.value, control: controlKeys.has(current.key) });
        for (const [childKey, child] of Object.entries(current.value)) if (childKey !== 'path') pending.push({ value: child, key: childKey });
      }
    } catch (error) {
      if (error instanceof WorkflowError && /冻结文件引用过多|控制记录超过安全读取上限|嵌套引用结构过大/.test(error.message)) throw error;
      // 无法追溯的历史内容不阻止 RETURN，当前阶段校验仍会拒绝无效文件。
    }
  }
  return [...found.values()];
}
