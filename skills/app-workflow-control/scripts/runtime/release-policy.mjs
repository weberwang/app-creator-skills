import { WorkflowError } from './io.mjs';

/** 限制 RELEASE 意图与全局状态的组合，不改变共享迁移图。 */
export function assertReleaseTransition(work, { from, to, recoveryState } = {}) {
  if (work?.workItemType !== 'RELEASE') return to;
  if (!['prepare', 'publish'].includes(work.releaseIntent)) {
    throw new WorkflowError('RELEASE 工作项必须明确 releaseIntent=prepare|publish');
  }

  const requestedFrom = from ?? work.globalState;
  const effectiveFrom = requestedFrom === 'BLOCKED'
    ? recoveryState ?? work.blockedRecord?.returnState
    : requestedFrom;

  if (work.releaseIntent === 'prepare') {
    if (work.action?.effects?.includes('publish')) {
      throw new WorkflowError('releaseIntent=prepare 禁止包含 publish 动作');
    }
    if (['RELEASE_APPROVAL_REQUIRED', 'RELEASING'].includes(effectiveFrom) ||
        to === 'RELEASE_APPROVAL_REQUIRED' || to === 'RELEASING') {
      throw new WorkflowError('releaseIntent=prepare 不允许进入发布批准或发布中状态');
    }
    if (to === 'COMPLETE' && !['PASSED', 'INTEGRATING'].includes(effectiveFrom)) {
      throw new WorkflowError('准备完成只能从 PASSED 或 INTEGRATING 关闭');
    }
    return to;
  }

  if (to === 'COMPLETE' && effectiveFrom !== 'RELEASING') {
    throw new WorkflowError('releaseIntent=publish 只能从 RELEASING 进入 COMPLETE');
  }
  return to;
}
