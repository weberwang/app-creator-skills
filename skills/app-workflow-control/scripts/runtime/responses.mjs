import { STAGE_LABELS } from './constants.mjs';
import { workflowMode } from './task-policy.mjs';

/** 区分本批交付、总范围集成和实际发布，避免任务完成被解释为产品整体完成。 */
function completionKind(work) {
  if (work.globalState !== 'COMPLETE') return null;
  if (work.workItemType === 'RELEASE') return 'release-' + (work.releaseIntent === 'prepare' ? 'prepared' : 'published');
  if (work.productionScopeRef) return work.workItemType === 'INTEGRATION' && work.integrationPurpose === 'final'
    ? 'production-scope-complete' : 'production-batch-complete';
  return 'task-complete';
}

/** 世界场景在 V1 向执行者交接设计任务，停在返修或阻断态时等恢复后再交接。 */
function sceneDesignTask(work) {
  const visual = work?.visual;
  if (work?.workItemType !== 'SCENE' || visual?.stage !== 'V1'
    || !['world-2d', 'world-3d'].includes(visual.designRoute)
    || ['COMPLETE', 'RETURN', 'BLOCKED'].includes(work.globalState)) return null;
  return { stage: 'V1', workItemId: work.workItemId, objectId: visual.objectId, designRoute: visual.designRoute };
}

/** 产出供 CLI 和工具稳定解析的结果，同时保留当前生产批次身份。 */
export function response({ status, work = null, changed = false, blocking = [], next = [], metadata = {} }) {
  const task = sceneDesignTask(work);
  return {
    status,
    stage: work ? `${work.stageId}/${work.globalState}` : null,
    changed,
    blocking,
    next: task ? ['尝试开展场景／关卡设计。按本轮范围核对可复用方案，必要时在 V1 新增或修订。', ...next] : next,
    metadata: {
      workflowView: work ? {
        phaseId: work.stageId, phaseLabel: STAGE_LABELS[work.stageId],
        visualStage: work.visual?.stage ?? null, workItemType: work.workItemType,
        workflowMode: workflowMode(work), releaseIntent: work.releaseIntent ?? null,
        completionKind: completionKind(work),
        ...(work.productionScopeRef ? { productionScopeRef: work.productionScopeRef, productionBatchId: work.productionBatchId ?? null } : {}),
      } : null,
      ...(task && { sceneDesignTask: task }),
      ...metadata,
    },
  };
}
