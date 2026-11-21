import { statSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { isFigmaApp } from './figma-app-contract.mjs';

/** 比较冻结文件的路径和摘要，路径的大小写规则与项目控制面一致。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256
    && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 防止可选引用缺失时把一个缺失值与实际引用误判为相等。 */
function sameOptionalRef(repo, left, right) {
  return !left && !right || sameRef(repo, left, right);
}

/** 读取已冻结的结构化设计记录。 */
function frozenJson(repo, ref, label) {
  productionIdentity(repo, ref, label);
  return readJson(repo, ref.path, label);
}

/** 将当前对象已经经过原生阶段门确认的目标整理为实际设计对。 */
function approvedDesigns(repo, work) {
  const visual = work.visual;
  if (visual.designRoute === 'world-3d') {
    const contract = frozenJson(repo, visual.domainEvidenceRef, '三维场景合同');
    const world = [contract.directionRef, contract.spatialSpecRef].filter(Boolean)
      .map((targetRef) => ({ targetRef, world: true }));
    const hud = (visual.hud?.targets ?? []).map((target) => ({ targetRef: target.referenceTarget }));
    return [...world, ...hud];
  }
  if (work.workItemType === 'SCENE') {
    return (visual.targets ?? []).map((target) => ({ targetRef: target.referenceTarget }));
  }
  const review = frozenJson(repo, visual.reviews?.V2, 'V2 目标确认');
  if (isFigmaApp(work)) {
    const contract = frozenJson(repo, visual.domainEvidenceRef, 'Figma 领域合同');
    return [contract, ...(contract.additionalTargets ?? [])].map((target) => ({
      targetRef: target.referenceTarget,
      designRef: target.figmaDesignRef,
    }));
  }
  return [review.referenceTarget, ...(review.approvedTargetRefs ?? [])]
    .map((targetRef) => ({ targetRef }));
}

/** 判断清单条目是否绑定了一个完整的已确认目标。 */
function matchesDesign(repo, entry, design) {
  if (sameRef(repo, entry.targetRef, design.targetRef)) {
    if (design.world) return Boolean(entry.designRef);
    return sameOptionalRef(repo, entry.designRef, design.designRef);
  }
  // 直接选择 Figma 可编辑稿时，该稿本身可承担画面与设计两种用途。
  return Boolean(design.designRef && sameRef(repo, entry.targetRef, design.designRef)
    && (!entry.designRef || sameRef(repo, entry.designRef, design.designRef)));
}

/** 三维状态规格必须是独立设计工件，控制记录不能冒充画面或时序。 */
function assertWorldStateArtifact(repo, work, entry) {
  const path = productionIdentity(repo, entry.designRef, '三维状态设计');
  const actual = statSync(repoPath(repo, path).absolute, { bigint: true });
  const contract = frozenJson(repo, work.visual.domainEvidenceRef, '三维场景合同');
  const reserved = [entry.targetRef, work.visual.modulePlanRef, work.globalVisualBaselineRef, work.foundationVisualRef,
    work.visual.functionBaselineRef, contract.blockoutRunRef,
    work.visual.moduleDesignRef, work.visual.moduleDesignReviewRef, work.visual.domainEvidenceRef,
    contract.directionRef, contract.spatialSpecRef, contract.reviewRef,
    contract.spaceApprovalRef, contract.directionApprovalRef].filter(Boolean);
  for (const ref of reserved) {
    productionIdentity(repo, ref, '三维状态设计来源');
    const source = statSync(repoPath(repo, ref.path).absolute, { bigint: true });
    if (actual.dev === source.dev && actual.ino === source.ino) throw new WorkflowError('三维状态设计不能引用控制记录、确认记录或目标自身');
  }
  let record;
  try { record = readJson(repo, path, '三维状态设计'); } catch { return; }
  if (record && typeof record === 'object' && !Array.isArray(record)
    && ((typeof record.decision === 'string' && typeof record.userMessageRef === 'string')
      || (typeof record.workItemId === 'string' && ['PASS', 'FAIL', 'NOT_RUN'].includes(record.status)))) {
    throw new WorkflowError('三维状态设计不能使用确认或执行结果记录');
  }
}

/** V2 的模块稿按 V1 全部状态和流程项目逐项核对并绑定用户确认。 */
export function assertModuleVisualDesign(repo, work, plan) {
  const visual = work.visual;
  const design = frozenJson(repo, visual?.moduleDesignRef, '模块设计稿清单');
  const review = frozenJson(repo, visual?.moduleDesignReviewRef, '模块设计稿人工确认');
  productionIdentity(repo, visual?.modulePlanRef, '模块方案');
  productionIdentity(repo, work.globalVisualBaselineRef, '全局视觉基线');
  if (design?.schemaVersion !== '1.0' || design.workItemId !== work.workItemId
    || !sameRef(repo, design.modulePlanRef, visual.modulePlanRef)
    || !sameRef(repo, design.baselineRef, work.globalVisualBaselineRef)
    || !Array.isArray(design.entries)) throw new WorkflowError('模块设计稿未绑定当前工作项、模块方案和全局视觉基线');
  if (review?.schemaVersion !== '1.0' || review.workItemId !== work.workItemId
    || review.stage !== 'V2' || review.decision !== 'approved'
    || typeof review.userMessageRef !== 'string' || !review.userMessageRef.trim()
    || !sameRef(repo, review.subjectRef, visual.moduleDesignRef)) throw new WorkflowError('模块设计稿缺少绑定当前清单的 V2 用户确认');
  if (!Array.isArray(plan?.entries)) throw new WorkflowError('模块方案缺少条目');
  const kinds = new Set(['state', 'step', 'transition', 'progress']);
  const expected = new Set(plan.entries.filter((entry) => kinds.has(entry.kind))
    .map((entry) => JSON.stringify([entry.kind, entry.id])));
  const seen = new Set();
  const designs = approvedDesigns(repo, work);
  if (!designs.length) throw new WorkflowError('V2 尚无已确认的设计目标');
  for (const item of design.entries) {
    const key = JSON.stringify([item?.kind, item?.id]);
    if (!expected.has(key) || seen.has(key)) throw new WorkflowError('模块设计稿条目重复或超出模块方案');
    productionIdentity(repo, item.targetRef, '模块设计目标');
    if (item.designRef) productionIdentity(repo, item.designRef, '模块状态设计');
    const matching = designs.find((candidate) => matchesDesign(repo, item, candidate));
    if (!matching) throw new WorkflowError('模块设计目标未绑定 V2 已确认的实际稿件');
    if (matching.world) assertWorldStateArtifact(repo, work, item);
    seen.add(key);
  }
  if (seen.size !== expected.size) throw new WorkflowError('模块设计稿未覆盖全部状态、步骤、转换及进度');
  // 逐目标反查清单，避免确认了额外状态稿却没有交接任何适用项目。
  if (designs.some((candidate) => !design.entries.some((entry) => matchesDesign(repo, entry, candidate)))) {
    throw new WorkflowError('V2 已确认的设计稿未登记模块方案用途');
  }
  return design;
}

/** 对照 V2 快照的场景及 HUD 稿件集合，禁止在拆解时替换。 */
function assertTargetsUnchanged(repo, previous, current, label) {
  const before = previous ?? [];
  const after = current ?? [];
  if (before.length !== after.length || before.some((item) => {
    const target = after.find((candidate) => candidate.targetId === item.targetId);
    return !target || ['candidateId', 'sceneId', 'stateId', 'scope'].some((field) => item[field] !== target[field])
      || item.viewport?.width !== target.viewport?.width || item.viewport?.height !== target.viewport?.height
      || !sameRef(repo, item.referenceTarget, target.referenceTarget)
      || !sameRef(repo, item.reviews?.V2, target.reviews?.V2);
  })) throw new WorkflowError(`${label}已变化，必须重新确认模块稿`);
}

/** 对照已确认的 Figma 主稿和全部附加状态稿。 */
function assertFigmaUnchanged(repo, before, after) {
  const original = frozenJson(repo, before, 'V2 Figma 领域合同');
  const current = frozenJson(repo, after, '当前 Figma 领域合同');
  const sameTarget = (left, right) => sameRef(repo, left?.referenceTarget, right?.referenceTarget)
    && sameRef(repo, left?.figmaDesignRef, right?.figmaDesignRef);
  if (!sameTarget(original, current)) throw new WorkflowError('Figma 主稿与 V2 确认稿不一致');
  const oldTargets = original.additionalTargets ?? [];
  const newTargets = current.additionalTargets ?? [];
  if (!Array.isArray(oldTargets) || !Array.isArray(newTargets) || oldTargets.length !== newTargets.length
    || oldTargets.some((target) => !newTargets.some((candidate) => sameTarget(target, candidate)))) {
    throw new WorkflowError('Figma 状态稿与 V2 确认稿不一致');
  }
}

/** 原生场景封套可随阶段更新，但空间设计及人工确认的文件身份不能变化。 */
function assertSceneBasisUnchanged(repo, beforeRef, afterRef, fields, label) {
  const before = frozenJson(repo, beforeRef, `V2 ${label}合同`);
  const after = frozenJson(repo, afterRef, `当前${label}合同`);
  for (const field of fields) {
    if (!sameOptionalRef(repo, before[field], after[field])) throw new WorkflowError(`${label}依据 ${field} 已变化`);
    if (before[field]) productionIdentity(repo, before[field], `${label}依据 ${field}`);
  }
  const beforeScope = before.scopeIds ?? [];
  const afterScope = after.scopeIds ?? [];
  if (!Array.isArray(beforeScope) || !Array.isArray(afterScope)
    || JSON.stringify([...beforeScope].sort()) !== JSON.stringify([...afterScope].sort())) {
    throw new WorkflowError(`${label}空间范围已变化`);
  }
}

/** V3 及后续阶段只允许继续使用 V2 已确认的同一组模块稿。 */
export function assertModuleDraftUnchanged(repo, frozenWork, work) {
  if (frozenWork.workItemId !== work.workItemId || frozenWork.projectId !== work.projectId
    || frozenWork.stack !== work.stack || frozenWork.visual?.objectId !== work.visual?.objectId
    || frozenWork.visual?.candidateId !== work.visual?.candidateId
    || frozenWork.visual?.designRoute !== work.visual?.designRoute
    || !sameRef(repo, frozenWork.globalVisualBaselineRef, work.globalVisualBaselineRef)
    || !sameRef(repo, frozenWork.visual.modulePlanRef, work.visual.modulePlanRef)
    || !sameRef(repo, frozenWork.visual.moduleDesignRef, work.visual.moduleDesignRef)
    || !sameRef(repo, frozenWork.visual.moduleDesignReviewRef, work.visual.moduleDesignReviewRef)) {
    throw new WorkflowError('模块方案、视觉基线或 V2 确认稿已变化');
  }
  if (!sameOptionalRef(repo, frozenWork.visual.reviews?.V2, work.visual.reviews?.V2)) throw new WorkflowError('V2 目标确认已变化');
  assertTargetsUnchanged(repo, frozenWork.visual.targets, work.visual.targets, '场景设计目标');
  assertTargetsUnchanged(repo, frozenWork.visual.hud?.targets, work.visual.hud?.targets, 'HUD 设计目标');
  if (!sameOptionalRef(repo, frozenWork.visual.hud?.globalVisualBaselineRef, work.visual.hud?.globalVisualBaselineRef)) throw new WorkflowError('HUD 全局视觉基线已变化');
  if (isFigmaApp(work)) assertFigmaUnchanged(repo, frozenWork.visual.domainEvidenceRef, work.visual.domainEvidenceRef);
  if (work.visual.designRoute === 'world-2d') {
    assertSceneBasisUnchanged(repo, frozenWork.visual.sceneDesignRef, work.visual.sceneDesignRef,
      ['spatialSpecRef', 'layoutRef', 'layoutRunRef', 'reviewRef', 'spaceApprovalRef'], '二维空间');
  }
  if (work.visual.designRoute === 'world-3d') {
    assertSceneBasisUnchanged(repo, frozenWork.visual.domainEvidenceRef, work.visual.domainEvidenceRef,
      ['directionRef', 'spatialSpecRef', 'blockoutRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionApprovalRef'], '三维空间');
  }
}
