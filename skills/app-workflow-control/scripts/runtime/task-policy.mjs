import { PROTECTED_ACTIONS } from './constants.mjs';
import { WorkflowError } from './io.mjs';

/** 未选择轻量模式时采用普通流程，模式只控制编排成本，不授予执行权限。 */
export function workflowMode(work) {
  return work.workflowMode ?? 'standard';
}

/** 轻量任务必须是单个本地工程工作项，保留完整的范围门、质量门和真实执行证据。 */
export function assertWorkflowPolicy(work, pack = null) {
  const mode = workflowMode(work);
  if (!['light', 'standard'].includes(mode)) throw new WorkflowError('workflowMode 必须是 light 或 standard');
  if (mode !== 'light') return;
  if (!['FOUNDATION', 'MODULE'].includes(work.workItemType) || work.visual || work.visualBaselineRequired) {
    throw new WorkflowError('light 仅适用于无视觉生产的 FOUNDATION/MODULE 本地任务');
  }
  if (Array.isArray(work.action?.effects) && work.action.effects.some((effect) => PROTECTED_ACTIONS.has(effect))) {
    throw new WorkflowError('light 不适用于发布、设备或其他受保护外部动作');
  }
  if (pack && (pack.executionUnits.length !== 1 || pack.executionUnits.some((unit) => unit.parallelGroup || unit.dependsOn?.length))) {
    throw new WorkflowError('light 只能包含一个独立执行单元，不接受并行或跨单元依赖');
  }
}
