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

/** 产出供 CLI 和工具稳定解析的结果，同时保留当前生产批次身份。 */
export function response({ status, work = null, changed = false, blocking = [], next = [], metadata = {} }) {
  return {
    status,
    stage: work ? `${work.stageId}/${work.globalState}` : null,
    changed,
    blocking,
    next,
    metadata: {
      workflowView: work ? {
        phaseId: work.stageId, phaseLabel: STAGE_LABELS[work.stageId],
        visualStage: work.visual?.stage ?? null, workItemType: work.workItemType,
        workflowMode: workflowMode(work), releaseIntent: work.releaseIntent ?? null,
        completionKind: completionKind(work),
        ...(work.productionScopeRef ? { productionScopeRef: work.productionScopeRef, productionBatchId: work.productionBatchId ?? null } : {}),
      } : null,
      ...metadata,
    },
  };
}
