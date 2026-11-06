import { PROTECTED_ACTIONS } from './constants.mjs';

/** 记录已授权动作的精确用户决策引用；并不执行动作或验证用户身份。 */
export function hasPreciseApproval(work) {
  const action = work.action;
  if (!action?.effects?.some((effect) => PROTECTED_ACTIONS.has(effect))) return true;
  const approval = action.approval;
  if (!approval || approval.workItemId !== work.workItemId || approval.stack !== work.stack || approval.stageId !== work.stageId ||
      approval.actionId !== action.actionId || approval.target !== action.target || !approval.userMessageRef) return false;
  const expectedEffects = [...action.effects].filter((effect) => PROTECTED_ACTIONS.has(effect)).sort();
  const approvedEffects = Array.isArray(approval.effects) ? [...approval.effects].sort() : [];
  return JSON.stringify(expectedEffects) === JSON.stringify(approvedEffects);
}
