import { readJson, fileIdentityKey, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { requireText } from './validation.mjs';

/** 未决模块设计需要先有用户路线选择，再确认实际方案。 */
export function assertModuleDesignDecisions(repo, work, record) {
  const decisions = Array.isArray(record.decisions) ? record.decisions : [];
  if (decisions.some((decision) => decision?.kind !== undefined && decision.kind !== 'module-design')) {
    throw new WorkflowError('Grilling 决策类型无效');
  }
  if (decisions.some((decision) => decision?.resolution !== undefined && decision.kind !== 'module-design')) {
    throw new WorkflowError('模块设计的方案确认须明确登记模块设计决策类型');
  }
  const designDecisions = decisions.filter((decision) => decision?.kind === 'module-design');
  if (!designDecisions.length) return;
  if (!work.visual || !['PAGE', 'SCENE', 'DISPLAY_LAYER'].includes(work.workItemType)) {
    throw new WorkflowError('模块设计决策只能绑定可视工作项');
  }
  if (record.status !== 'CLOSED') throw new WorkflowError('模块设计未决项须选择调研或人工调整并确认方案');
  if (!work.grillingRef.sha256) throw new WorkflowError('已关闭的模块设计决策须冻结 grillingRef 的 SHA-256');
  for (const [index, decision] of designDecisions.entries()) {
    const label = `模块设计决策 ${index + 1}`;
    const resolution = decision.resolution;
    if (!resolution || !['research', 'manual'].includes(resolution.approach)) {
      throw new WorkflowError(`${label} 须记录调研或人工调整路线`);
    }
    if (decision.answer !== resolution.approach) throw new WorkflowError(`${label} 路线须与用户选择一致`);
    requireText(resolution.choiceUserMessageRef, `${label}.choiceUserMessageRef`);
    requireText(resolution.confirmationUserMessageRef, `${label}.confirmationUserMessageRef`);
    if (resolution.choiceUserMessageRef !== decision.userMessageRef) {
      throw new WorkflowError(`${label} 路线选择须绑定该决策的用户答复`);
    }
    // 每次推进都复核被确认方案的文件身份，内容变更后需要重新确认。
    verifyDecisionFile(repo, work, resolution.proposalRef, `${label} 已确认方案`);
    if (resolution.approach === 'research') {
      if (!Array.isArray(resolution.referenceRefs) || !resolution.referenceRefs.length) {
        throw new WorkflowError(`${label} 调研路线缺少参考依据`);
      }
      for (const ref of resolution.referenceRefs) verifyDecisionFile(repo, work, ref, `${label} 调研参考`);
    } else if (resolution.referenceRefs !== undefined && !Array.isArray(resolution.referenceRefs)) {
      throw new WorkflowError(`${label} 调研参考必须为数组`);
    } else {
      for (const ref of resolution.referenceRefs ?? []) verifyDecisionFile(repo, work, ref, `${label} 调研参考`);
    }
  }
}

/** 冻结记录不能重新引用返修已撤销的方案或参考。 */
function verifyDecisionFile(repo, work, ref, label) {
  const path = productionIdentity(repo, ref, label);
  const identity = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((entry) => fileIdentityKey(repo, entry.path) === identity)) {
    throw new WorkflowError(`${label} 引用了已作废材料`);
  }
}

/** 为执行路径和证据保护收集所有决策依赖，不读取用户消息内容。 */
export function moduleDesignDecisionPaths(repo, work) {
  if (!work.grillingRef?.path) return [];
  const record = readJson(repo, work.grillingRef.path, 'Grilling Record');
  return (Array.isArray(record?.decisions) ? record.decisions : []).filter((decision) => decision?.kind === 'module-design')
    .flatMap(({ resolution }) => [resolution?.proposalRef, ...(Array.isArray(resolution?.referenceRefs) ? resolution.referenceRefs : [])])
    .map((ref) => ref?.path).filter((path) => typeof path === 'string' && path.trim());
}
