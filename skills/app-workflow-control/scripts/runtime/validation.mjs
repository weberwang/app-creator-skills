import { GATES, STACKS, VERSION, VISUAL_STAGES, WORK_ITEM_TYPES, STAGES, TRANSITIONS, workCategory } from './constants.mjs';
import { readFileSync } from 'node:fs';
import { repoPath, stackProfileLocation, WorkflowError } from './io.mjs';
import { assertWorkflowPolicy } from './task-policy.mjs';

/** 明确允许的 Work Item 字段，错误字段名应尽早中断。 */
const WORK_FIELDS = new Set([
  'schemaVersion', 'workItemId', 'projectId', 'stack', 'workItemType', 'stageId',
  'globalState', 'objective', 'allowedPaths', 'forbiddenPaths', 'gateStatus', 'revision',
  'implementationPackageRef', 'evidenceRef', 'globalVisualBaselineRef', 'assetReviewRef',
  'grillingRef', 'visual', 'visualBaselineRequired', 'evidenceRoot', 'action',
  'returnRecord', 'blockedRecord', 'invalidatedRefs', 'transitionHistory', 'category',
  'workflowMode', 'releaseIntent', 'planningRef', 'integrationPurpose', 'integrationScopeRef', 'integrationEvidenceRef',
]);

/** 确认值为非空字符串，错误中保留可定位字段名。 */
export function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${field}必须为非空字符串`);
}

/** 确认输入为唯一允许的枚举值。 */
export function requireOneOf(value, options, field) {
  if (!options.includes(value)) throw new WorkflowError(`${field} 值无效：${value}`);
}

/** 验证并加载技术 profile；控制器只消费通用字段。 */
export function loadProfile(repo, stack) {
  requireOneOf(stack, STACKS, 'stack');
  const location = stackProfileLocation(repo, stack);
  let profile;
  try { profile = JSON.parse(readFileSync(location.absolute, 'utf8')); }
  catch (error) { throw new WorkflowError(`无法读取 ${stack} 技术 profile：${error.message}`, 'PROFILE_INVALID'); }
  requireText(profile.id, 'profile.id');
  if (profile.id !== stack) throw new WorkflowError(`profile.id 与工作栈不匹配：${profile.id}`);
  requireText(profile.displayName, 'profile.displayName');
  if (!Array.isArray(profile.detectAny) || !profile.detectAny.length || profile.detectAny.some((item) => typeof item !== 'string' || !item)) {
    throw new WorkflowError('profile.detectAny 必须包含检测规则');
  }
  for (const field of ['frameworkPolicy', 'nativeRules']) {
    if (!Array.isArray(profile[field]) || !profile[field].length || profile[field].some((item) => typeof item !== 'string' || !item.trim())) {
      throw new WorkflowError(`技术 profile 必须包含可读的 ${field}`);
    }
  }
  const requirements = profile.evidenceRequirements;
  for (const kind of ['engineering', 'visual']) {
    if (!Array.isArray(requirements?.[kind]) || requirements[kind].some((item) => typeof item !== 'string' || !item)) {
      throw new WorkflowError(`profile.evidenceRequirements.${kind} 必须为字符串数组`);
    }
  }
  if (requirements.assetImport !== undefined && (!Array.isArray(requirements.assetImport) || requirements.assetImport.some((item) => typeof item !== 'string' || !item))) {
    throw new WorkflowError('profile.evidenceRequirements.assetImport 必须为字符串数组');
  }
  if (!Array.isArray(profile.runtimeRoots) || !profile.runtimeRoots.length) {
    throw new WorkflowError('profile.runtimeRoots 必须包含允许写入的项目相对目录');
  }
  for (const root of profile.runtimeRoots) repoPath(repo, root, 'profile.runtimeRoots');
  return profile;
}

/** 校验视觉对象的身份、类型与目前工作阶段。 */
function validateVisual(work) {
  if (!['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(work.workItemType)) {
    if (work.visual !== undefined) throw new WorkflowError('只有 SCENE/PAGE/DISPLAY_LAYER 可以绑定 visual');
    return;
  }
  if (!work.visual || typeof work.visual !== 'object') throw new WorkflowError('SCENE/PAGE/DISPLAY_LAYER 必须定义 visual 身份');
  if (work.visual.stageModel !== 'function-first-v1') throw new WorkflowError('视觉阶段缺少 function-first-v1 语义标记，旧工作项不能按新阶段解释');
  requireText(work.visual.objectId, 'visual.objectId');
  requireOneOf(work.visual.stage, VISUAL_STAGES, 'visual.stage');
  if (work.workItemType === 'SCENE') {
    // 场景统一使用目标数组，避免单图字段形成第二份相互冲突的真源。
    if (!Array.isArray(work.visual.targets) || (!['V0', 'V1', 'V2'].includes(work.visual.stage) && !work.visual.targets.length)) throw new WorkflowError('SCENE 必须提供目标数组，V3 起至少包含一个视觉目标');
    if (work.visual.candidateId !== undefined || work.visual.reviews !== undefined || work.assetReviewRef?.path) throw new WorkflowError('SCENE 禁止使用单目标候选、确认或资源评审字段');
    const identities = new Set();
    for (const target of work.visual.targets) {
      if (!target || typeof target !== 'object' || Array.isArray(target)) throw new WorkflowError('SCENE 视觉目标必须为对象');
      requireText(target?.targetId, 'visual.targets.targetId');
      if (identities.has(target.targetId)) throw new WorkflowError('SCENE 目标 ID 必须唯一');
      identities.add(target.targetId);
    }
  } else if (work.visual.targets !== undefined || work.visual.coverageRef !== undefined || work.visual.integrationEvidenceRef !== undefined) {
    throw new WorkflowError('只有 SCENE 可绑定多目标清单');
  }
  if (work.visual.candidateId !== undefined) requireText(work.visual.candidateId, 'visual.candidateId');
  if (work.visual.functionDependencies !== undefined && !Array.isArray(work.visual.functionDependencies)) throw new WorkflowError('visual.functionDependencies 必须为数组');
  if (work.visual.functionBaselineRef !== undefined && (!work.visual.functionBaselineRef?.path || !/^[a-f0-9]{64}$/.test(work.visual.functionBaselineRef.sha256 ?? ''))) throw new WorkflowError('功能基线引用必须包含路径和 SHA-256');
  if (work.visual.domainEvidenceRef != null && (!work.visual.domainEvidenceRef.path || !/^[a-f0-9]{64}$/.test(work.visual.domainEvidenceRef.sha256 ?? ''))) throw new WorkflowError('单目标领域证据必须包含路径和 SHA-256');
  if (work.workItemType === 'SCENE' && work.visual.domainEvidenceRef != null) throw new WorkflowError('SCENE 领域证据必须分别绑定各视觉目标');
  if (work.visual.reuse !== undefined) {
    const reuse = work.visual.reuse;
    if (!reuse || typeof reuse !== 'object' || Array.isArray(reuse)) throw new WorkflowError('visual.reuse 必须是复用来源记录');
    for (const name of Object.keys(reuse)) if (!['sourceWorkItemRef', 'impact', 'reason', 'inheritedReviews'].includes(name)) throw new WorkflowError(`visual.reuse 包含未知字段：${name}`);
    requireText(reuse.sourceWorkItemRef?.path, 'visual.reuse.sourceWorkItemRef.path');
    requireOneOf(reuse.impact, ['implementation', 'layout', 'assets', 'target'], 'visual.reuse.impact');
    requireText(reuse.reason, 'visual.reuse.reason');
    if (!Array.isArray(reuse.inheritedReviews) || new Set(reuse.inheritedReviews).size !== reuse.inheritedReviews.length || reuse.inheritedReviews.some((name) => !['V2', 'V3Decomposition', 'V3Layout'].includes(name))) throw new WorkflowError('visual.reuse.inheritedReviews 只能包含唯一的目标、拆解及布局确认');
  }
  if (work.stageId !== 'scene-production') throw new WorkflowError('SCENE/PAGE/DISPLAY_LAYER 必须处于 scene-production');
  if (work.workItemType === 'DISPLAY_LAYER') {
    requireText(work.visual.hostId, 'visual.hostId');
    requireOneOf(work.visual.layerType, ['modal', 'popup', 'drawer', 'toast'], 'visual.layerType');
  } else if (work.visual.hostId !== undefined || work.visual.layerType !== undefined) {
    throw new WorkflowError('只有 DISPLAY_LAYER 可以绑定宿主及层类型');
  }
}

/** 校验工作项外形及跨字段不变量。 */
export function validateWork(work, { repo, requireProfile = true } = {}) {
  if (!work || typeof work !== 'object' || Array.isArray(work)) throw new WorkflowError('Work Item 必须为 JSON 对象');
  for (const field of Object.keys(work)) if (!WORK_FIELDS.has(field)) throw new WorkflowError(`Work Item 包含未知字段：${field}`);
  if (work.schemaVersion !== VERSION) throw new WorkflowError(`Work Item.schemaVersion 必须为 ${VERSION}`);
  for (const field of ['workItemId', 'projectId', 'objective']) requireText(work[field], `Work Item.${field}`);
  requireOneOf(work.stack, STACKS, 'Work Item.stack');
  requireOneOf(work.workItemType, WORK_ITEM_TYPES, 'Work Item.workItemType');
  // 视觉类型必须对应实际可用的领域入口，避免工作项到 V2 才发现无法推进。
  if (work.workItemType === 'PAGE' && work.stack !== 'flutter') throw new WorkflowError('PAGE 领域合同仅支持 Flutter；游戏显示对象应使用真实 SCENE 或 DISPLAY_LAYER');
  if (work.workItemType === 'SCENE' && work.stack === 'flutter') throw new WorkflowError('Flutter 不支持 SCENE 领域合同；应用显示对象应使用 PAGE 或 DISPLAY_LAYER');
  if (work.workItemType === 'INTEGRATION') {
    requireOneOf(work.integrationPurpose, ['feature', 'final'], 'Work Item.integrationPurpose');
    if (work.integrationPurpose === 'feature' && (work.integrationScopeRef !== undefined || work.integrationEvidenceRef !== undefined)) throw new WorkflowError('早期功能集成不能声明最终集成范围或证据');
    if (work.integrationPurpose === 'final' && work.stageId !== 'global-integration-validation') throw new WorkflowError('最终集成必须处于 global-integration-validation');
    if (work.integrationPurpose === 'feature' && work.stageId !== 'foundation-engineering') throw new WorkflowError('早期功能集成必须处于 foundation-engineering');
    if (work.integrationEvidenceRef !== undefined && (!work.integrationEvidenceRef?.path || !/^[a-f0-9]{64}$/.test(work.integrationEvidenceRef.sha256 ?? ''))) throw new WorkflowError('最终集成证据必须包含路径和 SHA-256');
    if (work.integrationScopeRef !== undefined && (!work.integrationScopeRef?.path || !/^[a-f0-9]{64}$/.test(work.integrationScopeRef.sha256 ?? ''))) throw new WorkflowError('最终集成范围必须包含路径和 SHA-256');
  } else if (work.integrationPurpose !== undefined || work.integrationScopeRef !== undefined || work.integrationEvidenceRef !== undefined) throw new WorkflowError('只有 INTEGRATION 可以声明集成用途和证据');
  requireOneOf(work.stageId, STAGES, 'Work Item.stageId');
  requireOneOf(work.globalState, Object.keys(TRANSITIONS), 'Work Item.globalState');
  assertWorkflowPolicy(work);
  if (work.workItemType === 'RELEASE') {
    requireOneOf(work.releaseIntent, ['prepare', 'publish'], 'Work Item.releaseIntent');
    if (work.stageId !== 'release') throw new WorkflowError('RELEASE 必须处于 release 阶段');
    if (work.releaseIntent === 'prepare' && work.action?.effects?.includes('publish')) throw new WorkflowError('发布准备工作项不能声明 publish 动作');
  } else if (work.releaseIntent !== undefined) throw new WorkflowError('只有 RELEASE 可以声明 releaseIntent');
  if (!Number.isSafeInteger(work.revision) || work.revision < 0) throw new WorkflowError('Work Item.revision 必须为不小于 0 的整数');
  validatePathList(work.allowedPaths, 'Work Item.allowedPaths');
  validatePathList(work.forbiddenPaths, 'Work Item.forbiddenPaths');
  if (!work.gateStatus || typeof work.gateStatus !== 'object') throw new WorkflowError('Work Item.gateStatus 必须记录 F0–F4');
  for (const gate of GATES) requireOneOf(work.gateStatus[gate], ['PASS', 'FAIL', 'NOT_RUN'], `gateStatus.${gate}`);
  for (const name of ['implementationPackageRef', 'evidenceRef', 'globalVisualBaselineRef', 'assetReviewRef', 'grillingRef', 'planningRef']) {
    const ref = work[name];
    if (ref !== undefined && ref !== null) {
      if (typeof ref !== 'object' || Array.isArray(ref)) throw new WorkflowError(`Work Item.${name} 必须为含 path 的对象或 null`);
      requireText(ref.path, `Work Item.${name}.path`);
      if (repo) repoPath(repo, ref.path, `Work Item.${name}.path`);
    }
  }
  if (typeof work.visualBaselineRequired !== 'boolean') throw new WorkflowError('Work Item.visualBaselineRequired 必须显式为布尔值');
  if (work.globalVisualBaselineRef && !/^[a-f0-9]{64}$/.test(work.globalVisualBaselineRef.sha256 ?? '')) throw new WorkflowError('Work Item.globalVisualBaselineRef 必须绑定 SHA-256');
  // 可见对象的视觉方向必须经确认，不能通过修改工作项标志跳过阶段门。
  if (work.visual && !work.visualBaselineRequired) throw new WorkflowError('视觉工作项必须启用 visualBaselineRequired');
  if (repo) {
    if (typeof work.evidenceRoot !== 'string') throw new WorkflowError('Work Item.evidenceRoot 必须绑定当前证据目录');
    repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot');
    if (work.visual?.reuse) repoPath(repo, work.visual.reuse.sourceWorkItemRef.path, '视觉复用来源');
  }
  if (work.action && typeof work.action !== 'object') throw new WorkflowError('Work Item.action 必须为对象');
  if (work.action && (!Array.isArray(work.action.effects) || work.action.effects.some((item) => typeof item !== 'string'))) {
    throw new WorkflowError('Work Item.action.effects 必须为字符串数组');
  }
  if (work.action) {
    requireText(work.action.actionId, 'Work Item.action.actionId');
    if (work.action.effects.some((effect) => ['external-write', 'device', 'sign', 'upload', 'publish', 'payment', 'destructive'].includes(effect))) requireText(work.action.target, 'Work Item.action.target');
  }
  if (work.action && work.action.effects.some((item) => !['local-write', 'local-delete', 'external-write', 'device', 'sign', 'upload', 'publish', 'payment', 'destructive'].includes(item))) {
    throw new WorkflowError('Work Item.action.effects 含未知动作类型');
  }
  validateVisual(work);
  if (work.visual?.reviews !== undefined) {
    for (const [name, ref] of Object.entries(work.visual.reviews)) {
      requireOneOf(name, ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5'], 'visual.reviews key');
      if (ref === null) continue;
      if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`visual.reviews.${name} 必须绑定人工记录路径及 SHA-256`);
      if (repo) repoPath(repo, ref.path, `visual.reviews.${name}.path`);
    }
  }
  if (work.invalidatedRefs !== undefined && (!Array.isArray(work.invalidatedRefs) || work.invalidatedRefs.some((item) => typeof item?.path !== 'string'))) {
    throw new WorkflowError('Work Item.invalidatedRefs 必须由路径引用组成');
  }
  for (const field of ['implementationPackageRef', 'evidenceRef', 'assetReviewRef', 'globalVisualBaselineRef', 'planningRef']) {
    if (work[field]?.path && work.invalidatedRefs?.some((item) => item.path === work[field].path)) {
      throw new WorkflowError(`${field} 重新绑定了 RETURN 已作废引用`);
    }
  }
  for (const [name, ref] of Object.entries(work.visual?.reviews ?? {})) {
    if (ref?.path && work.invalidatedRefs?.some((item) => item.path === ref.path)) {
      throw new WorkflowError(`visual.reviews.${name} 重新绑定了 RETURN 已作废引用`);
    }
  }
  for (const target of work.visual?.targets ?? []) {
    if (target.assetReviewRef && !/^[a-f0-9]{64}$/.test(target.assetReviewRef.sha256 ?? '')) throw new WorkflowError(`visual.targets.${target.targetId}.assetReviewRef 必须绑定 SHA-256`);
    for (const [name, ref] of Object.entries(target.reviews ?? {})) {
      if (ref !== null && (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? ''))) throw new WorkflowError(`visual.targets.${target.targetId}.reviews.${name} 必须绑定人工记录路径及 SHA-256`);
    }
    for (const ref of [target.referenceTarget, target.domainEvidenceRef, target.assetReviewRef, ...Object.values(target.reviews ?? {})]) {
      if (ref?.path && repo) repoPath(repo, ref.path, 'visual.targets 引用');
      if (ref?.path && work.invalidatedRefs?.some((item) => item.path === ref.path)) throw new WorkflowError(`视觉目标重新绑定已作废引用：${ref.path}`);
    }
  }
  for (const ref of [work.visual?.coverageRef, work.visual?.integrationEvidenceRef, work.visual?.functionBaselineRef]) {
    if (ref && !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError('visual 场景证据引用必须绑定 SHA-256');
    if (ref?.path && repo) repoPath(repo, ref.path, 'visual 场景证据引用');
    if (ref?.path && work.invalidatedRefs?.some((item) => item.path === ref.path)) throw new WorkflowError(`视觉清单重新绑定已作废引用：${ref.path}`);
  }
  if (work.assetReviewRef && !/^[a-f0-9]{64}$/.test(work.assetReviewRef.sha256 ?? '')) throw new WorkflowError('assetReviewRef 必须绑定 SHA-256');
  if (work.transitionHistory !== undefined && !Array.isArray(work.transitionHistory)) throw new WorkflowError('Work Item.transitionHistory 必须为数组');
  if (work.returnRecord !== undefined) {
    if (!work.returnRecord || typeof work.returnRecord !== 'object' || typeof work.returnRecord.reason !== 'string' ||
        typeof work.returnRecord.affectedScope !== 'string' || !['BASELINE', 'PROPOSAL', 'REVIEW', 'IMPLEMENTING'].includes(work.returnRecord.returnState) ||
        !Array.isArray(work.returnRecord.invalidatedRefs)) throw new WorkflowError('Work Item.returnRecord 必须记录原因、范围、推导恢复点和失效引用');
    if (repo && typeof work.returnRecord.evidenceRoot === 'string') repoPath(repo, work.returnRecord.evidenceRoot, 'returnRecord.evidenceRoot');
    if (work.globalState === 'RETURN' && work.returnRecord.resolvedAt !== null) throw new WorkflowError('RETURN 状态的恢复记录必须尚未解决');
    if (work.globalState !== 'RETURN' && work.returnRecord.resolvedAt === null) throw new WorkflowError('未解决的 RETURN 不能通过 BLOCKED/其他状态绕过');
  }
  if (work.globalState === 'RETURN' && !work.returnRecord) throw new WorkflowError('RETURN 状态缺少 affected-scope 恢复记录');
  if (work.globalState === 'BLOCKED' && (!work.blockedRecord || work.blockedRecord.resolvedAt !== null)) throw new WorkflowError('BLOCKED 状态必须记录尚未解决的阻断入口');
  if (work.blockedRecord !== undefined && work.blockedRecord !== null) {
    if (typeof work.blockedRecord.reason !== 'string' || !['INTAKE', 'BASELINE', 'PROPOSAL', 'REVIEW', 'IMPLEMENTING', 'VALIDATING', 'PASSED', 'INTEGRATING', 'RELEASE_APPROVAL_REQUIRED', 'RELEASING'].includes(work.blockedRecord.returnState)) {
      throw new WorkflowError('Work Item.blockedRecord 无效');
    }
    if (work.globalState !== 'BLOCKED' && work.blockedRecord.resolvedAt === null) throw new WorkflowError('未解决的 BLOCKED 不能由其他状态绕过');
  }
  if (work.grillingRef && work.grillingRef.path === undefined) throw new WorkflowError('待决拷问必须绑定文件记录');
  if (requireProfile && repo) loadProfile(repo, work.stack);
  return work;
}

/** 验证资源路径数组及标准化结果。 */
export function validatePathList(paths, label) {
  if (!Array.isArray(paths)) throw new WorkflowError(`${label} 必须为数组`);
  for (const path of paths) requireText(path, label);
}

/** 检查路径声明同时符合工作范围、排除规则和技术栈允许目录。 */
export function assertOwnedPath(repo, work, profile, value) {
  const normalized = repoPath(repo, value, '实施路径').relative;
  const allowed = work.allowedPaths.some((pattern) => pathMatch(normalized, pattern));
  const forbidden = work.forbiddenPaths.some((pattern) => pathMatch(normalized, pattern));
  if (!allowed) throw new WorkflowError(`实施路径不在 allowedPaths：${normalized}`, 'PATH_OUT_OF_SCOPE');
  if (forbidden) throw new WorkflowError(`实施路径命中 forbiddenPaths：${normalized}`, 'FORBIDDEN_PATH');
  // profile.runtimeRoots 仅作为初始化默认范围；明确授权的其他路径由 Work Item 控制。
  return normalized;
}

/** 支持目录前缀、精确路径与 glob 星号，不启动 shell 解释器。 */
export function pathMatch(path, pattern) {
  const normalized = String(pattern).replaceAll('\\', '/').replace(/\/+$/, '');
  if (normalized === '**' || normalized === '*') return true;
  if (!normalized.includes('*')) return path === normalized || path.startsWith(`${normalized}/`);
  let expressionText = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '*' && normalized[index + 1] === '*') {
      index += 1;
      if (normalized[index + 1] === '/') { expressionText += '(?:.*/)?'; index += 1; }
      else expressionText += '.*';
    } else if (character === '*') expressionText += '[^/]*';
    else expressionText += escapeRegex(character);
  }
  const expression = new RegExp(`^${expressionText}(?:/.*)?$`);
  return expression.test(path);
}

/** 转义用户声明的 glob 片段以免将其解释为正则代码。 */
function escapeRegex(value) { return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }

/** 判断类型是否需要视觉目标和阶段确认。 */
export function needsVisual(work) { return ['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(work.workItemType); }

/** 为用户交付输出计算统一类别标签。 */
export function categoryOf(work) { return workCategory(work.workItemType); }
