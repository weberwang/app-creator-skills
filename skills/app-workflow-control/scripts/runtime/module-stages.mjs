import { atomicWriteJson, fileIdentityKey, readJson, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { readModulePlan, samePlanRef } from './module-plan.mjs';
import { assertFoundationVisual } from './foundation-visual.mjs';
import { assertModuleDraftUnchanged, assertModuleVisualDesign } from './module-visual-design.mjs';
import { assertFunctionSnapshotFiles } from './function-baseline-files.mjs';

/** 冻结 V1 方案而非运行结果，后续仍可沿既有功能基线字段引用工作范围。 */
export async function freezeModulePlan(repo, work, fileDigest) {
  readModulePlan(repo, work);
  const path = `${work.evidenceRoot}/module-plan-r${work.revision + 1}.json`;
  await atomicWriteJson(repo, path, {
    schemaVersion: '1.0',
    mode: 'module-plan',
    workItemId: work.workItemId,
    projectId: work.projectId,
    stack: work.stack,
    workItemType: work.workItemType,
    objectId: work.visual.objectId,
    designRoute: work.visual.designRoute,
    hostId: work.visual.hostId,
    layerType: work.visual.layerType,
    productionScopeRef: work.productionScopeRef ?? null,
    productionBatchId: work.productionBatchId ?? null,
    evidenceRoot: work.evidenceRoot,
    modulePlanRef: work.visual.modulePlanRef,
  });
  return fileDigest(repo, path);
}

/** 通过 V5 后固定实际验收文件，防止整体验收重用被改写的命令输出。 */
export async function freezeModuleRuntime(repo, work, files, fileDigest) {
  if (work.visual?.stage !== 'V5' || !work.visual.modulePlanRef) return;
  const path = `${work.evidenceRoot}/module-runtime-r${work.revision + 1}.json`;
  const manifest = readJson(repo, work.evidenceRef.path, 'V5 证据清单');
  const evidence = [work.evidenceRef.path, ...manifest.items.filter((item) => item.status === 'PASS').map((item) => item.path)];
  await atomicWriteJson(repo, path, {
    schemaVersion: '1.0', workItemId: work.workItemId,
    planRef: work.visual.functionBaselineRef, designRef: work.visual.versionDesignSnapshotRef,
    evidenceRoot: work.evidenceRoot, files, evidence: [...new Set(evidence)].map((item) => fileDigest(repo, item)),
  });
  work.visual.moduleRuntimeRef = fileDigest(repo, path);
}

/** 历史来源允许继续演进交付源码，原始验收材料须保持冻结内容。 */
export function assertModuleRuntime(repo, work, { historical = false } = {}) {
  if (work.visual.stage !== 'V5') return;
  const ref = work.visual.moduleRuntimeRef;
  if (!ref && !['PASSED', 'INTEGRATING', 'COMPLETE'].includes(work.globalState)) return;
  const frozen = readJson(repo, productionIdentity(repo, ref, 'V5 模块运行冻结记录'), 'V5 模块运行冻结记录');
  if (frozen?.schemaVersion !== '1.0' || frozen.workItemId !== work.workItemId
    || !samePlanRef(repo, frozen.planRef, work.visual.functionBaselineRef)
    || !samePlanRef(repo, frozen.designRef, work.visual.versionDesignSnapshotRef)
    || fileIdentityKey(repo, frozen.evidenceRoot) !== fileIdentityKey(repo, work.evidenceRoot)) {
    throw new WorkflowError('V5 运行记录与当前模块方案、设计或证据目录不匹配');
  }
  if (!Array.isArray(frozen.evidence) || !frozen.evidence.some((item) => item?.path === work.evidenceRef?.path)) {
    throw new WorkflowError('V5 冻结记录缺少当前证据清单');
  }
  for (const item of frozen.evidence) productionIdentity(repo, item, 'V5 验收材料');
  assertFunctionSnapshotFiles(repo, work, frozen.files, { historical, label: 'V5 模块验收证据' });
}

/** 阶段四执行计划须引用同一份冻结清单，避免在 COMPLETE 后补登记另一份稿。 */
export function assertFoundationDesignPack(repo, work, pack) {
  if (!work.foundationVisualRef) return;
  const refs = pack.systemCoverage.modules.filter((module) => ['implement', 'reuse'].includes(module.status))
    .flatMap((module) => module.designRefs);
  if (!refs.some((ref) => samePlanRef(repo, ref, work.foundationVisualRef))) {
    throw new WorkflowError('基础工程实施包缺少当前全局视觉冻结清单');
  }
}

/** 视图复用与推进共享计划身份检查，宿主、技术栈或批次变化均需重新确认。 */
export function assertFrozenModulePlan(repo, work, snapshot) {
  const plan = readModulePlan(repo, work);
  const frozenPlan = snapshot ?? readJson(repo, productionIdentity(repo, work.visual.functionBaselineRef, 'V1 模块方案冻结记录'), 'V1 模块方案冻结记录');
  const scopeChanged = (frozenPlan?.productionScopeRef || work.productionScopeRef)
    && !samePlanRef(repo, frozenPlan?.productionScopeRef, work.productionScopeRef);
  if (frozenPlan?.schemaVersion !== '1.0' || frozenPlan.mode !== 'module-plan'
    || frozenPlan.workItemId !== work.workItemId || frozenPlan.projectId !== work.projectId
    || frozenPlan.stack !== work.stack || frozenPlan.workItemType !== work.workItemType
    || frozenPlan.objectId !== work.visual.objectId || frozenPlan.designRoute !== work.visual.designRoute
    || frozenPlan.hostId !== work.visual.hostId || frozenPlan.layerType !== work.visual.layerType
    || scopeChanged || frozenPlan.productionBatchId !== (work.productionBatchId ?? null)
    || !samePlanRef(repo, frozenPlan.modulePlanRef, work.visual.modulePlanRef)) {
    throw new WorkflowError('模块方案已变化或冻结记录错绑，须返回 V1');
  }
  return plan;
}

/** 校验 V1 冻结、当前全局方向和当前验收阶段的正式模块稿。 */
export function assertModuleStage(repo, work, { loadWork, validateGlobalBaseline, assertVisualReview, verifyFoundation }, { enteringV2 = false, confirmingV2 = false } = {}) {
  const source = assertFoundationVisual(repo, work, { loadWork, validateGlobalBaseline });
  if (source && work.workItemType !== 'FOUNDATION') verifyFoundation(repo, source.foundation);
  if (enteringV2 || work.workItemType === 'FOUNDATION') return;
  const plan = assertFrozenModulePlan(repo, work);
  if (work.visual.stage === 'V2') {
    if (confirmingV2) {
      assertVisualReview(repo, work, 'V2');
      assertModuleVisualDesign(repo, work, plan);
    }
    return;
  }

  // 原生领域合同可以随生产推进，稿件、覆盖矩阵和用户确认沿用 V2 归档。
  const path = productionIdentity(repo, work.visual.versionDesignSnapshotRef, 'V2 模块稿冻结记录');
  const { versionVisualSnapshot: frozen } = readJson(repo, path, 'V2 模块稿冻结记录');
  if (frozen?.visual?.stage !== 'V2' || frozen.workItemId !== work.workItemId || frozen.projectId !== work.projectId
    || frozen.stack !== work.stack || frozen.visual.objectId !== work.visual.objectId
    || !samePlanRef(repo, frozen.foundationVisualRef, work.foundationVisualRef)
    || !samePlanRef(repo, frozen.globalVisualBaselineRef, work.globalVisualBaselineRef)
    || !samePlanRef(repo, frozen.visual.modulePlanRef, work.visual.modulePlanRef)
    || !samePlanRef(repo, frozen.visual.moduleDesignRef, work.visual.moduleDesignRef)
    || !samePlanRef(repo, frozen.visual.moduleDesignReviewRef, work.visual.moduleDesignReviewRef)) {
    throw new WorkflowError('模块视觉稿或其确认已变化，须返回 V2');
  }
  assertVisualReview(repo, frozen, 'V2');
  assertModuleVisualDesign(repo, frozen, plan);
  // V3 刚进入时尚未编写新阶段封套，沿用 V2 封套可通过本检查，继续推进时再由 V3 原生门核对。
  assertModuleDraftUnchanged(repo, frozen, work);
}
