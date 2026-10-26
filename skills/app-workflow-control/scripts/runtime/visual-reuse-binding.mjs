import { readJson, repoPath, WorkflowError } from './io.mjs';
import { requireOneOf, requireText, validateWork } from './validation.mjs';

const REVIEW_NAMES = Object.freeze({
  implementation: ['V1', 'V2Decomposition', 'V2Layout'],
  assets: ['V1', 'V2Decomposition', 'V2Layout'],
  layout: ['V1', 'V2Decomposition'],
  target: [],
});

/** 确认当前视觉引用仍绑定到可追溯的完成来源及允许复用的确认阶段。 */
export function assertVisualReuse(repo, work) {
  const reuse = work?.visual?.reuse;
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
  if (source.workItemId === work.workItemId) throw new WorkflowError('视觉复用来源必须是不同的 Work Item');
  if (source.globalState !== 'COMPLETE' || source.visual.stage !== 'V4') {
    throw new WorkflowError('视觉复用来源必须已完成全局流程及 V4 人工验收');
  }

  const sourceBaseline = source.globalVisualBaselineRef?.path;
  const targetBaseline = work.globalVisualBaselineRef?.path;
  if (!sourceBaseline || !targetBaseline || repoPath(repo, sourceBaseline).relative !== repoPath(repo, targetBaseline).relative) {
    throw new WorkflowError('视觉复用目标必须继续引用来源的全局视觉基线');
  }
  const baseline = readJson(repo, sourceBaseline, '视觉复用来源全局基线');
  if (baseline.schemaVersion !== source.schemaVersion || baseline.projectId !== work.projectId || baseline.stack !== work.stack) {
    throw new WorkflowError('视觉复用来源全局基线与当前项目或技术栈不匹配');
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
    if (!sourceRef?.path || !targetRef?.path ||
        repoPath(repo, sourceRef.path).relative !== repoPath(repo, targetRef.path).relative) {
      throw new WorkflowError(`visual.reviews.${name} 必须精确引用来源 Work Item 的同名确认记录`);
    }
  }

  // 未列入 lineage 的视觉引用不能悄悄指回来源，特别是 V3/V4 必须由当前项目重做。
  for (const name of ['V1', 'V2Decomposition', 'V2Layout', 'V3', 'V4']) {
    if (inherited.includes(name)) continue;
    const sourceRef = source.visual.reviews?.[name];
    const targetRef = work.visual.reviews?.[name];
    if (sourceRef?.path && targetRef?.path &&
        repoPath(repo, sourceRef.path).relative === repoPath(repo, targetRef.path).relative) {
      throw new WorkflowError(`visual.reviews.${name} 指向来源记录但未声明为可继承确认`);
    }
  }

  if (inherited.length && work.visual.candidateId !== source.visual.candidateId) {
    throw new WorkflowError('继承 V1/V2 确认时，目标 candidateId 必须与来源一致');
  }
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
