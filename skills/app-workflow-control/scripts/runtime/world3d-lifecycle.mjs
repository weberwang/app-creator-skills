import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VISUAL_STAGES } from './constants.mjs';
import { repoPath, requireFile, fileIdentityKey, WorkflowError } from './io.mjs';
import { isWorld3D } from './world3d-contract.mjs';
import { assertFrozenWorldHud, invalidateWorldHud } from './world3d-hud.mjs';

/** 历史引用可能已损坏，回退只尽力追踪，不因文件错误阻止登记失效。 */
function historicalJson(repo, ref) {
  try {
    requireFile(repo, ref.path, '历史三维记录');
    const bytes = readFileSync(repoPath(repo, ref.path).absolute);
    if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) return null;
    return JSON.parse(bytes.toString('utf8'));
  } catch { return null; }
}

/** 按最早影响阶段作废审查、批准及运行观测，保留可复用的真实源资源。 */
export function invalidateWorld3DEvidence(repo, work, invalidatedRefs, earliestStage) {
  const ref = work.visual.domainEvidenceRef;
  const contract = historicalJson(repo, ref);
  const cutoff = VISUAL_STAGES.indexOf(earliestStage);
  const stageNumber = cutoff + 1;
  const seen = new Set();
  /** 原始观测失效需追到底，源文件和上游确认依据不因下游重验被重复作废。 */
  function mark(reference) {
    if (!reference?.path) return;
    let path;
    try { path = repoPath(repo, reference.path).relative; } catch { return; }
    const key = fileIdentityKey(repo, path);
    if (seen.has(key)) return;
    seen.add(key);
    invalidatedRefs.push({ path, state: earliestStage });
    const record = historicalJson(repo, reference);
    if (!record || typeof record !== 'object') return;
    for (const name of ['commandEvidenceRef', 'runtimeRef']) mark(record[name]);
    for (const check of record.checks ?? []) mark(check?.evidenceRef);
  }
  // 推进后可能仍暂挂上一阶段封套；下游返修不能作废模型基线仍引用的上游事实。
  if (ref?.path && (!contract || !VISUAL_STAGES.includes(contract.stage) || VISUAL_STAGES.indexOf(contract.stage) >= cutoff)) invalidatedRefs.push({ path: ref.path, state: work.visual.stage });
  // 依据链已在上游冻结；不递归 basisRefs，避免 V5 返修误伤空间确认或正式模型。
  // 正式方向返修不重开未受影响的空间审查或确认，真实空间变化仍须回 V1。
  const stages = { blockoutRunRef: 1, reviewRef: 1, spaceApprovalRef: 1, directionApprovalRef: 2, modelSpecRef: 3, sampleRef: 4, formalRunRef: 5, displayApprovalRef: 5 };
  for (const [name, stage] of Object.entries(stages)) if (stage >= stageNumber) mark(contract?.[name]);
  if (stageNumber <= 3 && work.visual.modelProductionBasisRef) {
    // 规格返修必须重新冻结 V3，HUD 局部返修只作废 V5 因而保留该依据。
    mark(work.visual.modelProductionBasisRef);
    delete work.visual.modelProductionBasisRef;
  }
  if (stageNumber <= 4 && work.visual.modelBaselineRef) {
    mark(work.visual.modelBaselineRef);
    delete work.visual.modelBaselineRef;
  }
  if (stageNumber <= 4 && work.assetReviewRef?.path) {
    const assets = historicalJson(repo, work.assetReviewRef);
    mark(work.assetReviewRef);
    for (const asset of assets?.assets ?? []) {
      mark(asset.importEvidenceRef);
      mark(asset.consumerEvidenceRef);
    }
    work.assetReviewRef = null;
  }
  delete work.visual.domainEvidenceRef;
}

/** 无图世界沿同一 RETURN 状态机回退，不创建或继承图片确认数组。 */
export function invalidateWorld3DVisual(repo, work, scope, invalidatedRefs) {
  const hudScope = scope.match(/^hud:(V[2-5])$/i);
  if (hudScope) {
    const earliest = VISUAL_STAGES[Math.min(VISUAL_STAGES.indexOf(work.visual.stage), VISUAL_STAGES.indexOf(hudScope[1].toUpperCase()))];
    if (VISUAL_STAGES.indexOf(earliest) < VISUAL_STAGES.indexOf('V2')) throw new WorkflowError('HUD 返工不能早于 V2，整体范围变化应回 V1');
    invalidateWorldHud(repo, work, invalidatedRefs, earliest);
    // 正式组合变化须重验 V5；不撤销已确认的世界空间、方向和模型。
    invalidateWorld3DEvidence(repo, work, invalidatedRefs, 'V5');
    work.visual.stage = earliest;
    return earliest;
  }
  const name = scope.startsWith('stage:') ? scope.slice(6) : scope;
  const baseline = ['commercial-initiation', 'requirements', 'requirements-scope', 'global-baseline'].includes(name);
  const matched = scope.match(/^visual(?::(V[1-5]))?$/i);
  const implementation = ['implementation', 'engineering'].includes(name);
  if (!baseline && !matched && !implementation && name !== 'function' && !scope.startsWith('scene:')) return null;
  const requested = baseline ? 'V1' : implementation ? 'V5' : name === 'function' ? 'V1' : matched?.[1]?.toUpperCase() ?? 'V2';
  const earliest = VISUAL_STAGES[Math.min(VISUAL_STAGES.indexOf(work.visual.stage), VISUAL_STAGES.indexOf(requested))];
  invalidateWorld3DEvidence(repo, work, invalidatedRefs, earliest);
  if (baseline && work.globalVisualBaselineRef?.path) {
    const global = historicalJson(repo, work.globalVisualBaselineRef);
    for (const ref of [work.globalVisualBaselineRef, global?.selectionReviewRef]) if (ref?.path) invalidatedRefs.push({ path: ref.path, state: 'V1' });
    work.globalVisualBaselineRef = null;
  }
  work.visual.stage = earliest;
  return earliest;
}

/** 功能快照锁定设计路线，禁止中途把已通过的二维功能改标为三维白模验证。 */
export function assertFunctionDesignRoute(work, snapshot) {
  const source = snapshot.designRoute ?? snapshot.work?.visual?.designRoute;
  if ((source ?? null) !== (work.visual?.designRoute ?? null)) throw new WorkflowError('功能基线设计路线已变化，必须重新验证 V1');
  if (isWorld3D(work) && snapshot.mode === 'dependencies') throw new WorkflowError('3D 世界须核对本场景空间依据，不能仅用非视觉模块依赖替代');
  if (isWorld3D(work) && snapshot.mode !== 'module-plan') assertFrozenWorldHud(work, snapshot);
}
