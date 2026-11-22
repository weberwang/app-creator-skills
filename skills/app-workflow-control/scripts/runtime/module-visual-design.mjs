import { statSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { moduleDesignInputRefs, moduleDesignTargets } from './module-design-targets.mjs';
import { isFigmaApp } from './figma-app-contract.mjs';
import { world3dFile } from './world3d-contract.mjs';
import { withWorld3DFileSnapshots, world3DFileIdentity } from './world3d-file-snapshots.mjs';

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
function approvedDesigns(repo, work, worldContract, manifest) {
  const visual = work.visual;
  if (worldContract) {
    const world = [worldContract.directionRef, worldContract.spatialSpecRef].filter(Boolean)
      .map((targetRef) => ({ targetRef, world: true }));
    const hud = (visual.hud?.targets ?? []).map((target) => ({ targetRef: target.referenceTarget }));
    // 整组 V2 用户确认已绑定清单摘要，同一文件兼作 HUD 与场景二维稿时登记一个目标即可。
    const scene2d = (manifest.scene2dDesignRefs ?? [])
      .filter((ref) => !hud.some(({ targetRef }) => sameRef(repo, ref, targetRef)))
      .map((targetRef) => ({ targetRef }));
    return [...world, ...hud, ...scene2d];
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

/** 取出未由场景目标或单目标主稿确认链接管的实际设计稿。 */
function supplementalDecompositionTargets(repo, work) {
  const { visual } = work;
  if (visual.designRoute === 'world-3d') {
    if (!visual.moduleDesignRef) return [];
    const design = frozenJson(repo, visual.moduleDesignRef, '模块设计稿清单');
    return (design.scene2dDesignRefs ?? [])
      .filter((ref) => !visual.hud?.targets?.some(({ referenceTarget }) => sameRef(repo, ref, referenceTarget)))
      .map((targetRef) => ({ targetRef }));
  }
  if (work.workItemType === 'SCENE') return [];
  const designs = approvedDesigns(repo, work);
  // Figma 多稿可以共用交接文件，以各自的可编辑节点稿区分确认范围。
  if (isFigmaApp(work)) return designs.length > 1 ? designs : [];
  return designs.slice(1);
}

/** 核对每张补充稿的拆解确认与冻结证据，按路径和摘要识别对应稿件。 */
export function assertSupplementalDecompositionReviews(repo, work, validateHumanReview) {
  const { visual } = work;
  const pending = supplementalDecompositionTargets(repo, work);
  const refs = visual.supplementalDecompositionReviews ?? [];
  if (!pending.length && !refs.length) return;
  const figma = pending.some(({ designRef }) => designRef);
  const handoff = figma ? frozenJson(repo, visual.domainEvidenceRef, 'Figma 领域合同').figmaHandoffRef : null;
  const frozenInputs = [...refs, ...Object.values(visual.reviews ?? {}), ...pending.flatMap(({ targetRef, designRef }) => [targetRef, designRef])].filter(Boolean);
  if (visual.moduleDesignRef) frozenInputs.push(...moduleDesignInputRefs(frozenJson(repo, visual.moduleDesignRef, '模块设计稿清单')));
  const seen = new Set();
  for (const ref of refs) {
    const label = `V3 拆解确认 ${ref.path}`;
    const path = fileIdentityKey(repo, productionIdentity(repo, ref, label));
    if (seen.has(path)) throw new WorkflowError(`${label} 重复登记`);
    seen.add(path);
    const review = validateHumanReview(repo, ref, {
      objectId: visual.objectId, candidateId: visual.candidateId, stage: 'V3', purpose: 'decomposition', requireTarget: true,
    });
    if (review.workItemId !== work.workItemId || review.targetId !== visual.objectId
      || review.hostId !== visual.hostId || review.layerType !== visual.layerType) {
      throw new WorkflowError(`${label} 未绑定当前工作项、对象及宿主`);
    }
    const index = pending.findIndex(({ targetRef, designRef }) => sameRef(repo, targetRef, review.referenceTarget)
      && sameOptionalRef(repo, designRef, review.figmaDesignRef));
    if (index === -1) throw new WorkflowError(`${label} 重复或未绑定 V2 已确认的设计稿`);
    const artifact = { path: review.targetRef, sha256: review.targetSha256 };
    const artifactPath = fileIdentityKey(repo, productionIdentity(repo, artifact, `${label} 的拆解材料`));
    // 冻结原稿或确认记录的副本都不能代替实际拆解材料。
    if (frozenInputs.some((input) => input.sha256 === artifact.sha256 || fileIdentityKey(repo, input.path) === artifactPath)) {
      throw new WorkflowError(`${label} 的拆解材料必须与 V2 原稿及确认记录独立`);
    }
    if (figma && !sameRef(repo, handoff, artifact)) throw new WorkflowError(`${label} 未绑定当前 Figma 拆解交接`);
    pending.splice(index, 1);
  }
  if (pending.length) {
    throw new WorkflowError(`以下 V2 设计稿缺少 V3 拆解确认：${pending.map(({ targetRef, designRef }) => (designRef ?? targetRef).path).join('、')}`);
  }
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

/** 空间、方向及审批是设计依据，不能登记为独立视角稿。 */
function worldControlRefs(work, contract) {
  return [work.visual.modulePlanRef, work.globalVisualBaselineRef, work.foundationVisualRef,
    work.visual.functionBaselineRef, contract.blockoutRunRef,
    work.visual.moduleDesignRef, work.visual.moduleDesignReviewRef, work.visual.domainEvidenceRef,
    contract.directionRef, contract.spatialSpecRef, contract.reviewRef,
    contract.spaceApprovalRef, contract.directionApprovalRef].filter(Boolean);
}

/** 三维状态规格必须是独立设计工件，控制记录不能冒充画面或时序。 */
function assertWorldStateArtifact(repo, work, contract, entry) {
  const path = productionIdentity(repo, entry.designRef, '三维状态设计');
  const actual = statSync(repoPath(repo, path).absolute, { bigint: true });
  const reserved = [entry.targetRef, ...worldControlRefs(work, contract)];
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

/** 相机采用可对照场景的三维坐标，拒绝非数值或指向自身的机位。 */
function cameraPoint(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

/** 核对设计文件并保留其物理身份，以便识别重复使用和控制记录别名。 */
function assertIndependentWorldDesign(repo, ref, label, reservedFiles) {
  const path = productionIdentity(repo, ref, label);
  const file = world3DFileIdentity(repo, path);
  if (reservedFiles.has(file)) throw new WorkflowError(`${label}须绑定独立设计稿`);
  reservedFiles.add(file);
}

/** 二维内容可独立出稿；世界上下文预览按需登记并核对适用的共享 HUD。 */
function assertWorldSupplementalDesigns(repo, work, contract, design) {
  const { worldViews = [], scene2dDesignRefs = [], hudSourceRef } = design;
  if (!Array.isArray(worldViews)) throw new WorkflowError('三维 V2 上下文预览 worldViews 必须为数组');
  if (!Array.isArray(scene2dDesignRefs)) throw new WorkflowError('三维场景二维内容设计稿 scene2dDesignRefs 必须为数组');
  if (!worldViews.length && !scene2dDesignRefs.length && hudSourceRef === undefined) return;
  const hud = work.visual.hud;
  const hudTargets = hud?.targets ?? [];
  const controlRefs = [...worldControlRefs(work, contract), contract.blockoutRef, hud?.globalVisualBaselineRef, hud?.coverageRef,
    ...hudTargets.flatMap((target) => [target.domainEvidenceRef, ...Object.values(target.reviews ?? {})])];
  const reservedFiles = new Set(controlRefs.filter(Boolean).map((ref) => world3DFileIdentity(repo, ref.path)).filter(Boolean));
  const needsHudSource = hud && (worldViews.length > 0 || hudSourceRef !== undefined);
  const hudSource = needsHudSource ? world3DFileIdentity(repo, productionIdentity(repo, hudSourceRef, '三维共用 HUD 源')) : undefined;
  if (hudSource && reservedFiles.has(hudSource)) throw new WorkflowError('三维共用 HUD 必须引用独立界面源');
  if (!hud && hudSourceRef !== undefined) throw new WorkflowError('没有常驻 HUD 的三维场景不能登记 HUD 源');
  // 同一张二维设计可以覆盖 HUD 与游戏元素；机位预览仍须引用自己的世界层文件。
  for (const ref of scene2dDesignRefs) assertIndependentWorldDesign(repo, ref, '三维场景二维内容设计稿', reservedFiles);
  if (hudSource) reservedFiles.add(hudSource);
  const viewIds = new Set();
  for (const target of hudTargets) reservedFiles.add(world3DFileIdentity(repo, target.referenceTarget.path));
  const hudByState = new Map();
  for (const view of worldViews) {
    const { viewId, camera, scopeIds, stateId, viewport, designRef, hudTargetId } = view ?? {};
    if (typeof viewId !== 'string' || !viewId.trim() || viewIds.has(viewId)) throw new WorkflowError('三维机位 viewId 必须非空且唯一');
    viewIds.add(viewId);
    if (!cameraPoint(camera?.position) || !cameraPoint(camera?.target) || camera.position.every((coordinate, index) => coordinate === camera.target[index])) {
      throw new WorkflowError(`三维机位 ${viewId} 需要有效的相机位置和目标`);
    }
    if (!Array.isArray(scopeIds) || !scopeIds.length || new Set(scopeIds).size !== scopeIds.length || scopeIds.some((id) => !contract.scopeIds?.includes(id))) {
      throw new WorkflowError(`三维机位 ${viewId} 必须绑定当前场景范围`);
    }
    const { width, height } = viewport ?? {};
    if (typeof stateId !== 'string' || !stateId.trim() || ![width, height].every((value) => Number.isInteger(value) && value > 0)) {
      throw new WorkflowError(`三维机位 ${viewId} 缺少实际状态或视口`);
    }
    assertIndependentWorldDesign(repo, designRef, `三维机位 ${viewId} 设计稿`, reservedFiles);
    if (!hud) {
      if (hudTargetId !== undefined) throw new WorkflowError('没有常驻 HUD 的三维机位不能登记 HUD 目标');
      continue;
    }
    const target = hudTargets.find((item) => item.targetId === hudTargetId);
    if (!target || target.stateId !== stateId || target.viewport?.width !== width || target.viewport?.height !== height) {
      throw new WorkflowError(`三维机位 ${viewId} 的 HUD 目标必须匹配当前状态与视口`);
    }
    // 同一状态和视口下，机位变化只改变世界取景，界面须复用同一目标。
    const state = JSON.stringify([stateId, width, height]);
    if (hudByState.has(state) && hudByState.get(state) !== hudTargetId) throw new WorkflowError('同状态同视口的三维机位必须共用同一 HUD 目标');
    hudByState.set(state, hudTargetId);
  }
}

/** V2 的模块稿按冻结的 V1 要素、机制、状态和流程逐项核对并绑定用户确认。 */
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
  if (!Array.isArray(plan?.entries) || !Array.isArray(plan.rules?.flows) || !plan.rules.flows.length) {
    throw new WorkflowError('V1 模块方案缺少条目或流程');
  }
  // 流程作为整体交接，逐步覆盖之外还要有对应流程稿，流程顺序以冻结方案为准。
  const plannedItems = [...plan.entries, ...plan.rules.flows.map(({ id }) => ({ kind: 'flow', id }))];
  const pending = new Map(plannedItems.map(({ kind, id }) => [JSON.stringify([kind, id]), `${kind}:${id}`]));
  const worldContract = visual.designRoute === 'world-3d' ? frozenJson(repo, visual.domainEvidenceRef, '三维场景合同') : null;
  if (worldContract) assertWorldSupplementalDesigns(repo, work, worldContract, design);
  const designs = approvedDesigns(repo, work, worldContract, design);
  if (!designs.length) throw new WorkflowError('V2 尚无已确认的设计目标');
  const usedDesigns = new Set();
  for (const item of design.entries) {
    const key = JSON.stringify([item?.kind, item?.id]);
    if (!pending.delete(key)) throw new WorkflowError(`模块设计稿条目重复或超出 V1 模块方案：${key}`);
    const label = `${item.kind}:${item.id}`;
    if (item.additionalTargets !== undefined && !Array.isArray(item.additionalTargets)) {
      throw new WorkflowError(`V2 条目 ${label} 的附加目标 additionalTargets 必须为数组`);
    }
    // 同一条目可以跨多张确认稿表达，仍只占据 V1 清单中的一个位置。
    const usedByItem = new Set();
    for (const target of moduleDesignTargets(item)) {
      productionIdentity(repo, target?.targetRef, '模块设计目标');
      if (target.designRef !== undefined) productionIdentity(repo, target.designRef, '模块状态设计');
      const matches = designs.filter((candidate) => matchesDesign(repo, target, candidate));
      if (!matches.length) throw new WorkflowError(`模块设计目标未绑定 V2 已确认的实际稿件：${label}`);
      if (matches.every((candidate) => usedByItem.has(candidate))) throw new WorkflowError(`V2 条目 ${label} 重复引用同一设计稿`);
      if (matches.some((candidate) => candidate.world)) {
        if (item.kind === 'element') throw new WorkflowError(`V2 二维要素 ${item.id} 须绑定已确认的 HUD 或场景二维稿`);
        assertWorldStateArtifact(repo, work, worldContract, target);
      }
      for (const candidate of matches) {
        usedByItem.add(candidate);
        usedDesigns.add(candidate);
      }
    }
  }
  if (pending.size) throw new WorkflowError(`V2 模块设计稿遗漏 V1 条目：${[...pending.values()].join('、')}`);
  // 逐目标反查清单，避免确认了额外状态稿却没有交接任何适用项目。
  const unused = designs.filter((candidate) => !usedDesigns.has(candidate));
  if (unused.length) throw new WorkflowError(`V2 已确认的设计稿未登记模块方案用途：${unused.map(({ targetRef }) => targetRef.path).join('、')}`);
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
function assertSceneBasisUnchanged(repo, beforeRef, afterRef, fields, label, world) {
  const before = frozenJson(repo, beforeRef, `V2 ${label}合同`);
  const after = frozenJson(repo, afterRef, `当前${label}合同`);
  for (const field of fields) {
    if (!sameOptionalRef(repo, before[field], after[field])) throw new WorkflowError(`${label}依据 ${field} 已变化`);
    if (!before[field]) continue;
    if (world && field === 'blockoutRef') {
      // 仅白模可按冻结字节交接；空间规格、审批和运行记录继续核验原文件。
      withWorld3DFileSnapshots(repo, world, {}, () => world3dFile(repo, before[field], `${label}依据 ${field}`, world));
    } else productionIdentity(repo, before[field], `${label}依据 ${field}`);
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
      ['directionRef', 'spatialSpecRef', 'blockoutRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionApprovalRef'], '三维空间', work);
  }
}
