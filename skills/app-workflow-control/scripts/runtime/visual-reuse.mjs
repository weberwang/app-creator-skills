import { validateGlobalBaseline } from './artifacts.mjs';
import { atomicWriteJson, readJson, repoPath, WorkflowError } from './io.mjs';
import { requireOneOf, requireText, validateWork } from './validation.mjs';
import { assertFunctionBaseline, inspectVisualReuseSource, loadWork, response } from './workflow.mjs';
import { withWorkLock } from './work-lock.mjs';
import { assertVisualReuse } from './visual-reuse-binding.mjs';

const IMPACT_REVIEWS = Object.freeze({
  implementation: ['V2', 'V3Decomposition', 'V3Layout'],
  assets: ['V2', 'V3Decomposition', 'V3Layout'],
  layout: ['V2', 'V3Decomposition'],
  target: [],
});
const IMPACT_STAGE = Object.freeze({ implementation: 'V3', assets: 'V3', layout: 'V2', target: 'V2' });

/** 在目标工作项锁内，安全复用同项目同视觉对象已完成人工确认的前置阶段。 */
export async function reuseVisualReviews({ repo, workItem, sourceWorkItem, impact, reason }) {
  requireText(workItem, '--work-item');
  requireText(sourceWorkItem, '--source-work-item');
  requireText(reason, '--reason');
  requireOneOf(impact, Object.keys(IMPACT_REVIEWS), '--impact');

  const targetPath = repoPath(repo, workItem, 'Work Item 路径').relative;
  const sourcePath = repoPath(repo, sourceWorkItem, '来源 Work Item 路径').relative;
  if (targetPath === sourcePath) throw new WorkflowError('不能将 Work Item 自身作为视觉复用来源');

  return withWorkLock(repo, targetPath, async () => {
    const work = loadWork(repo, targetPath);
    const source = loadWork(repo, sourcePath);
    assertVisualReuse(repo, source);
    validateSource(work, source, sourcePath, targetPath);
    assertFunctionBaseline(repo, work);
    assertSourceReviews(repo, source, impact);

    const inheritedReviews = [...IMPACT_REVIEWS[impact]];
    const sceneTargets = work.workItemType === 'SCENE' && impact !== 'target';
    const inheritedPaths = [source.globalVisualBaselineRef.path, ...(sceneTargets
      ? [source.visual.coverageRef?.path, ...source.visual.targets.flatMap((target) => inheritedReviews.map((name) => target.reviews?.[name]?.path))].filter(Boolean)
      : inheritedReviews.map((name) => source.visual.reviews[name].path))];
    assertReferencesAvailable(repo, work, inheritedPaths);
    if (work.globalVisualBaselineRef?.path &&
        (repoPath(repo, work.globalVisualBaselineRef.path).relative !== repoPath(repo, source.globalVisualBaselineRef.path).relative || work.globalVisualBaselineRef.sha256 !== source.globalVisualBaselineRef.sha256)) {
      throw new WorkflowError('目标已绑定不同的全局视觉基线，拒绝覆盖');
    }
    if (!sceneTargets && impact !== 'target' && work.visual.candidateId && work.visual.candidateId !== source.visual.candidateId) {
      throw new WorkflowError('目标 candidateId 与来源确认候选冲突，拒绝复用');
    }

    work.globalVisualBaselineRef = { path: repoPath(repo, source.globalVisualBaselineRef.path).relative, sha256: source.globalVisualBaselineRef.sha256 };
    if (sceneTargets) {
      // 目标保留新工作项自己的领域合同；只继承来源已确认的视图与指定阶段记录。
      if (!Array.isArray(work.visual.targets) || work.visual.targets.length !== source.visual.targets?.length || !work.visual.targets.length) throw new WorkflowError('场景复用前必须建立对应来源的目标与当前领域合同');
      work.visual.coverageRef = { ...source.visual.coverageRef };
      for (const target of work.visual.targets) {
        const original = source.visual.targets.find((item) => item.targetId === target.targetId);
        if (!original) throw new WorkflowError(`来源缺少目标 ${target.targetId}`);
        target.reviews ??= {};
        for (const name of inheritedReviews) target.reviews[name] = { path: repoPath(repo, original.reviews[name].path).relative, sha256: original.reviews[name].sha256 };
      }
    } else if (work.workItemType !== 'SCENE') {
      for (const name of inheritedReviews) work.visual.reviews[name] = { path: repoPath(repo, source.visual.reviews[name].path).relative, sha256: source.visual.reviews[name].sha256 };
      if (impact !== 'target') work.visual.candidateId = source.visual.candidateId;
    }
    work.visual.stage = IMPACT_STAGE[impact];
    work.visual.reuse = {
      sourceWorkItemRef: { path: sourcePath }, impact, reason, inheritedReviews,
    };
    work.revision += 1;
    work.transitionHistory ??= [];
    work.transitionHistory.push({
      from: `${work.globalState}/${'V2'}`,
      to: `${work.globalState}/${work.visual.stage}`,
      revision: work.revision,
      reason: `复用已完成来源的视觉阶段（未新增人工确认）：${reason}`,
    });
    // 在提交前验证已变更的完整工作项、视觉基线和继承绑定。
    validateWork(work, { repo });
    validateGlobalBaseline(repo, work);
    assertVisualReuse(repo, work);
    await atomicWriteJson(repo, targetPath, work);

    return response({
      status: 'PASS', work, changed: true,
      metadata: {
        reusedReviews: inheritedReviews,
        remainingChecks: remainingChecks(impact),
        sourceWorkItem: sourcePath,
      },
    });
  });
}

/** 拒绝未完成来源、跨项目或跨对象复用，且验证所有将被继承的原始记录。 */
function validateSource(target, source, sourcePath, targetPath) {
  if (sourcePath === targetPath || source.workItemId === target.workItemId) throw new WorkflowError('视觉复用来源必须是不同的 Work Item');
  if (!['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(target.workItemType)) throw new WorkflowError('仅 SCENE/PAGE/DISPLAY_LAYER 支持视觉复用');
  if (!target.visual || !source.visual || source.workItemType !== target.workItemType) throw new WorkflowError('视觉复用来源与目标的工作项类型不匹配');
  for (const field of ['projectId', 'stack']) {
    if (source[field] !== target[field]) throw new WorkflowError(`视觉复用来源的 ${field} 与目标不匹配`);
  }
  if (source.visual.objectId !== target.visual.objectId) throw new WorkflowError('视觉复用来源的 visual.objectId 与目标不匹配');
  if (target.workItemType === 'DISPLAY_LAYER' &&
      (source.visual.hostId !== target.visual.hostId || source.visual.layerType !== target.visual.layerType)) {
    throw new WorkflowError('DISPLAY_LAYER 视觉复用来源的宿主或层类型与目标不匹配');
  }
  if (target.globalState !== 'PROPOSAL' || target.visual.stage !== 'V2' || !target.visual.functionBaselineRef?.path) {
    throw new WorkflowError('目标必须先完成 V1 功能验证，并处于 PROPOSAL/V2');
  }
  if (target.implementationPackageRef?.path || target.evidenceRef?.path || target.assetReviewRef?.path) {
    throw new WorkflowError('目标已存在实施包、工程证据或素材评审，不能复用');
  }
  if (Object.keys(target.visual.reviews ?? {}).length || target.visual.reuse !== undefined || (target.visual.targets ?? []).some((item) => Object.keys(item.reviews ?? {}).length || item.assetReviewRef)) {
    throw new WorkflowError('拒绝覆盖目标已有的视觉确认或复用记录');
  }
  if (source.globalState !== 'COMPLETE' || source.visual.stage !== 'V5') {
    throw new WorkflowError('来源必须完成全局流程并到达 V5');
  }
}

/** 验证来源基线和实际将继承的 V2/V3 确认记录。 */
function assertSourceReviews(repo, source, impact) {
  // 完成态包含历史确认；每个来源只按当前阶段校验，避免旧阶段误读最新领域证据。
  const visited = new Set();
  let current = source;
  while (current) {
    if (visited.has(current.workItemId)) throw new WorkflowError('视觉复用来源链存在循环');
    visited.add(current.workItemId);
    const sourceCheck = inspectVisualReuseSource(repo, current);
    if (sourceCheck.status !== 'PASS') throw new WorkflowError(`来源 Work Item 严格检查未通过：${sourceCheck.blocking.join('；')}`, 'SOURCE_NOT_COMPLETE');
    validateGlobalBaseline(repo, current);
    current = current.visual.reuse ? readJson(repo, current.visual.reuse.sourceWorkItemRef.path, '视觉复用来源') : null;
  }
}

/** 防止从来源继承的基线或人工记录命中目标的 RETURN 失效清单。 */
function assertReferencesAvailable(repo, work, paths) {
  const key = (path) => {
    const normalized = repoPath(repo, path, '视觉复用引用').relative;
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };
  const invalidated = new Set((work.invalidatedRefs ?? []).map((entry) => key(entry.path)));
  for (const path of paths) if (invalidated.has(key(path))) throw new WorkflowError(`目标已将来源引用标记为失效：${path}`);
}

/** 将复用后的人工与工程必做项明确返回给调用方。 */
function remainingChecks(impact) {
  if (impact === 'target') return ['为新目标完成 V2 候选与目标人工确认', '当前项目完成 V3 拆解与布局确认', '当前项目完成 V4 素材导入证据与人工确认', '当前项目完成 V5 运行时人工验收'];
  if (impact === 'layout') return ['在 V3 为当前项目重新确认布局', '当前项目完成 V4 素材导入证据与人工确认', '当前项目完成 V5 运行时人工验收'];
  return ['当前项目完成 V4 素材导入证据与人工确认', '当前项目完成 V5 运行时人工验收'];
}
