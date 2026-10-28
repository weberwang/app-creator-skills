import { readJson, repoPath, WorkflowError } from './io.mjs';
import { requireOneOf, requireText, validateWork } from './validation.mjs';
import { readFrozenVisualBaseline } from './visual-baseline-identity.mjs';

const REVIEW_NAMES = Object.freeze({
  implementation: ['V2', 'V3Decomposition', 'V3Layout'],
  assets: ['V2', 'V3Decomposition', 'V3Layout'],
  layout: ['V2', 'V3Decomposition'],
  target: [],
});

/** 确认当前视觉引用仍绑定到可追溯的完成来源及允许复用的确认阶段。 */
export function assertVisualReuse(repo, work, visited = new Set()) {
  const reuse = work?.visual?.reuse;
  if (visited.has(work?.workItemId)) throw new WorkflowError('视觉复用来源链存在循环');
  visited.add(work?.workItemId);
  if (reuse === undefined) return;

  // 目标由调用方先行校验；RETURN 恢复中的内存过渡态会先解析记录、后写入新状态。
  if (!work || typeof work !== 'object' || Array.isArray(work) || !work.visual) {
    throw new WorkflowError('视觉复用绑定要求有效的目标 Work Item');
  }
  requireOneOf(reuse.impact, Object.keys(REVIEW_NAMES), 'visual.reuse.impact');
  requireText(reuse.reason, 'visual.reuse.reason');

  const sourcePath = repoPath(repo, reuse.sourceWorkItemRef?.path, 'visual.reuse.sourceWorkItemRef.path').relative;
  const source = readJson(repo, sourcePath, '视觉复用来源 Work Item');
  validateWork(source, { repo });
  assertSameVisualIdentity(work, source);
  // 每一跳都独立核验来源身份、允许继承的阶段和完成状态。
  assertVisualReuse(repo, source, visited);
  if (source.workItemId === work.workItemId) throw new WorkflowError('视觉复用来源必须是不同的 Work Item');
  if (source.globalState !== 'COMPLETE' || source.visual.stage !== 'V5') {
    throw new WorkflowError('视觉复用来源必须已完成全局流程及 V5 人工验收');
  }

  const sourceBaseline = source.globalVisualBaselineRef?.path;
  const targetBaseline = work.globalVisualBaselineRef?.path;
  if (!sourceBaseline || !targetBaseline || !sameFileIdentity(repo, source.globalVisualBaselineRef, work.globalVisualBaselineRef)) {
    throw new WorkflowError('视觉复用目标必须继续引用来源的全局视觉基线');
  }
  const baseline = readFrozenVisualBaseline(repo, source.globalVisualBaselineRef);
  if (baseline.schemaVersion !== source.schemaVersion || baseline.projectId !== work.projectId || baseline.stack !== work.stack) {
    throw new WorkflowError('视觉复用来源全局基线与当前项目或技术栈不匹配');
  }

  if (work.workItemType === 'SCENE') {
    assertSceneReuseBinding(repo, work, source, reuse);
    return;
  }

  const allowed = new Set(REVIEW_NAMES[reuse.impact]);
  const inherited = reuse.inheritedReviews;
  if (!Array.isArray(inherited) || new Set(inherited).size !== inherited.length) {
    throw new WorkflowError('visual.reuse.inheritedReviews 必须是无重复的阶段列表');
  }
  const boundPaths = [
    sourceBaseline,
    ...inherited.map((name) => source.visual.reviews?.[name]?.path).filter(Boolean),
    ...Object.values(work.visual.reviews ?? {}).map((reference) => reference?.path).filter(Boolean),
  ];
  assertNotInvalidated(repo, work, boundPaths);

  for (const name of inherited) {
    if (!allowed.has(name)) throw new WorkflowError(`visual.reuse 不允许继承 ${name} 确认`);
    const sourceRef = source.visual.reviews?.[name];
    const targetRef = work.visual.reviews?.[name];
    if (!sameFileIdentity(repo, sourceRef, targetRef)) {
      throw new WorkflowError(`visual.reviews.${name} 必须精确引用来源 Work Item 的同名确认记录`);
    }
  }

  // 未列入 lineage 的视觉引用不能悄悄指回来源，特别是 V4/V5 必须由当前项目重做。
  for (const name of ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5']) {
    if (inherited.includes(name)) continue;
    const sourceRef = source.visual.reviews?.[name];
    const targetRef = work.visual.reviews?.[name];
    if (sourceRef?.path && targetRef?.path &&
        repoPath(repo, sourceRef.path).relative === repoPath(repo, targetRef.path).relative) {
      throw new WorkflowError(`visual.reviews.${name} 指向来源记录但未声明为可继承确认`);
    }
  }

  if (inherited.length && work.visual.candidateId !== source.visual.candidateId) {
    throw new WorkflowError('继承 V2/V3 确认时，目标 candidateId 必须与来源一致');
  }
}

/** 验证场景内每个继承目标和来源引用，避免用局部目标冒充整场景复用。 */
function assertSceneReuseBinding(repo, work, source, reuse) {
  const allowed = new Set(REVIEW_NAMES[reuse.impact]);
  const inherited = reuse.inheritedReviews;
  if (!Array.isArray(inherited) || new Set(inherited).size !== inherited.length || inherited.some((name) => !allowed.has(name))) throw new WorkflowError('场景复用阶段与影响范围不匹配');
  if (!inherited.length) return;
  const targets = work.visual.targets;
  const originals = source.visual?.targets;
  if (!Array.isArray(targets) || !Array.isArray(originals) || targets.length !== originals.length || targets.length === 0) throw new WorkflowError('场景复用必须保留全部来源目标');
  if (!sameFileIdentity(repo, work.visual.coverageRef, source.visual.coverageRef)) throw new WorkflowError('场景复用必须引用来源的冻结视图清单');
  assertNotInvalidated(repo, work, [work.visual.coverageRef.path, work.globalVisualBaselineRef.path]);
  for (const target of targets) {
    const original = originals.find((item) => item.targetId === target.targetId);
    if (!original || target.candidateId !== original.candidateId || !sameFileIdentity(repo, target.referenceTarget, original.referenceTarget) || target.sceneId !== original.sceneId || target.stateId !== original.stateId || target.scope !== original.scope || target.viewport?.width !== original.viewport?.width || target.viewport?.height !== original.viewport?.height) throw new WorkflowError(`场景目标 ${target.targetId} 与来源不一致`);
    for (const name of inherited) if (!sameFileIdentity(repo, target.reviews?.[name], original.reviews?.[name])) throw new WorkflowError(`场景目标 ${target.targetId} 的 ${name} 确认未绑定来源`);
    for (const name of ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5']) {
      if (!inherited.includes(name) && target.reviews?.[name]?.path && samePath(repo, target.reviews[name].path, original.reviews?.[name]?.path)) throw new WorkflowError(`场景目标 ${target.targetId} 的 ${name} 不能复用来源确认`);
    }
    if (target.assetReviewRef?.path && samePath(repo, target.assetReviewRef.path, original.assetReviewRef?.path)) throw new WorkflowError(`场景目标 ${target.targetId} 不能复用来源资产评审`);
    assertNotInvalidated(repo, work, [target.referenceTarget.path, target.domainEvidenceRef?.path, target.assetReviewRef?.path, ...Object.values(target.reviews ?? {}).map((entry) => entry?.path)].filter(Boolean));
  }
}

/** 比较受项目路径约束的实际引用，不接受空路径。 */
function samePath(repo, left, right) {
  return Boolean(left && right && repoPath(repo, left).relative === repoPath(repo, right).relative);
}

/** 比较路径和内容指纹的共同身份。 */
function sameFileIdentity(repo, left, right) {
  return Boolean(left && right && left.sha256 === right.sha256 && samePath(repo, left.path, right.path));
}

/** 复验场景阶段确认的来源链，返回真实来源工作项身份。 */
export function validateSceneReuseReview(repo, work, target, name, reference, record) {
  if (!sameFileIdentity(repo, reference, target.reviews?.[name])) throw new WorkflowError('场景确认引用不匹配');
  return resolveReuseOwner(repo, work, record.workItemId, name, target.targetId);
}

/** 复验冻结覆盖清单确实来自同一场景的已确认复用来源。 */
export function validateSceneReuseCoverage(repo, work, record) {
  return resolveReuseOwner(repo, work, record.workItemId, null);
}

/** 沿逐跳验证的来源链定位真实确认拥有者，并要求每一跳声明相应继承阶段。 */
export function resolveReuseOwner(repo, work, ownerId, name, targetId = null) {
  assertVisualReuse(repo, work);
  const visited = new Set();
  let current = work;
  while (current.workItemId !== ownerId) {
    if (visited.has(current.workItemId)) throw new WorkflowError('视觉复用来源链存在循环');
    visited.add(current.workItemId);
    const reuse = current.visual.reuse;
    if (!reuse || (name ? !reuse.inheritedReviews?.includes(name) : !reuse.inheritedReviews?.length)) throw new WorkflowError('确认拥有者不在已声明的复用来源链中');
    const source = readJson(repo, reuse.sourceWorkItemRef.path, '视觉复用来源 Work Item');
    if (targetId && !source.visual.targets?.some((item) => item.targetId === targetId)) throw new WorkflowError('复用来源缺少场景目标');
    current = source;
  }
  return current.workItemId;
}

/** 校验来源与目标描述的是同一项目、技术栈及视觉对象。 */
function assertSameVisualIdentity(target, source) {
  for (const field of ['projectId', 'stack', 'workItemType']) {
    if (target[field] !== source[field]) throw new WorkflowError(`视觉复用来源的 ${field} 与目标不匹配`);
  }
  for (const field of ['objectId']) {
    if (target.visual?.[field] !== source.visual?.[field]) throw new WorkflowError(`视觉复用来源的 visual.${field} 与目标不匹配`);
  }
  if (target.workItemType === 'DISPLAY_LAYER' &&
      (target.visual.hostId !== source.visual.hostId || target.visual.layerType !== source.visual.layerType)) {
    throw new WorkflowError('DISPLAY_LAYER 视觉复用来源的宿主或层类型与目标不匹配');
  }
}

/** RETURN 作废记录可持续追溯，但任何已作废路径都不能继续作为继承引用。 */
function assertNotInvalidated(repo, work, paths) {
  const pathKey = (value) => {
    const normalized = repoPath(repo, value, '视觉复用引用').relative;
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };
  const invalidated = new Set([
    ...(work.invalidatedRefs ?? []),
    ...(work.returnRecord?.invalidatedRefs ?? []),
  ].map((reference) => pathKey(reference.path)));
  for (const path of paths) {
    if (invalidated.has(pathKey(path))) throw new WorkflowError(`视觉复用重新绑定了 RETURN 已作废引用：${path}`);
  }
}
