import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

const REVIEW_STAGES = Object.freeze({ V2: ['V2'], V3: ['V2', 'V3Decomposition', 'V3Layout'], V4: ['V2', 'V3Decomposition', 'V3Layout', 'V4'], V5: ['V2', 'V3Decomposition', 'V3Layout', 'V4', 'V5'] });
const REVIEW_PURPOSES = Object.freeze({ V2: 'target', V3Decomposition: 'decomposition', V3Layout: 'layout', V4: 'imported-assets', V5: 'runtime-acceptance' });
const QUALITY_DIMENSIONS = Object.freeze(['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion']);

/** 校验非空文字，避免空标识在多个目标之间形成隐式绑定。 */
function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label} 必须为非空字符串`);
}

/** 按项目边界读取真实文件内容并校验冻结指纹。 */
function verifyFileIdentity(repo, identity, label) {
  if (!identity || typeof identity !== 'object') throw new WorkflowError(`${label} 必须绑定路径和 SHA-256`);
  requireText(identity.path, `${label}.path`);
  if (!/^[a-f0-9]{64}$/.test(identity.sha256 ?? '')) throw new WorkflowError(`${label}.sha256 必须为小写 SHA-256`);
  const path = requireFile(repo, identity.path, label);
  const absolute = repoPath(repo, path, label).absolute;
  if (!statSync(absolute).size) throw new WorkflowError(`${label} 不能为空`);
  if (createHash('sha256').update(readFileSync(absolute)).digest('hex') !== identity.sha256) throw new WorkflowError(`${label} 实际内容已变化，必须重新确认`);
  return path;
}

/** 根据同一内容身份判定两个目标引用，防止不同文件借用相同视觉对象身份。 */
function sameIdentity(repo, left, right) {
  return left && right && left.sha256 === right.sha256 && repoPath(repo, left.path).relative === repoPath(repo, right.path).relative;
}

/** 按冻结的目标清单核对全部视图，覆盖的视觉判断仍由用户确认。 */
function validateCoverage(repo, work, targets, validateReuseCoverage) {
  const reference = work.visual.coverageRef;
  verifyFileIdentity(repo, reference, '场景视图覆盖清单');
  const coverage = readJson(repo, reference.path, '场景视图覆盖清单');
  let coverageOwner = work.workItemId;
  if (coverage.workItemId !== work.workItemId) {
    if (typeof validateReuseCoverage !== 'function') throw new WorkflowError('场景覆盖清单不允许跨工作项复用');
    coverageOwner = validateReuseCoverage(repo, work, coverage);
    if (typeof coverageOwner !== 'string' || coverageOwner !== coverage.workItemId) throw new WorkflowError('场景覆盖清单复用来源身份无效');
  }
  if (coverage.workItemId !== coverageOwner || coverage.sceneId !== work.visual.objectId || coverage.status !== 'CONFIRMED') throw new WorkflowError('场景视图覆盖清单的工作项、场景或确认状态不匹配');
  requireText(coverage.userMessageRef, '场景视图覆盖清单.userMessageRef');
  const expected = targets.map((target) => target.targetId).sort();
  if (!Array.isArray(coverage.targetIds) || new Set(coverage.targetIds).size !== coverage.targetIds.length || JSON.stringify([...coverage.targetIds].sort()) !== JSON.stringify(expected)) {
    throw new WorkflowError('场景视图覆盖清单必须恰好列出所有目标，变更须重新确认');
  }
  // 锁定每个目标的实际范围和引用，防止保留 ID 却悄悄替换视口、状态或目标文件。
  if (!Array.isArray(coverage.targets) || coverage.targets.length !== targets.length) throw new WorkflowError('场景视图覆盖清单缺少冻结目标事实');
  for (const target of targets) {
    const matched = coverage.targets.filter((item) => item?.targetId === target.targetId);
    const item = matched[0];
    if (matched.length !== 1 || item.candidateId !== target.candidateId || item.sceneId !== target.sceneId || item.stateId !== target.stateId || item.scope !== target.scope || item.viewport?.width !== target.viewport.width || item.viewport?.height !== target.viewport.height || !sameIdentity(repo, item.referenceTarget, target.referenceTarget)) throw new WorkflowError(`${target.targetId} 目标范围或身份已变化，必须重新确认清单`);
  }
}

/** 验证人工确认真实绑定到对应目标、确认图内容及已确认的拆解记录。 */
function validateReview(repo, work, target, name, validateReuseReview) {
  const ref = target.reviews?.[name];
  if (!ref?.path) throw new WorkflowError(`${target.targetId} 缺少 ${name} 确认`);
  verifyFileIdentity(repo, ref, `${target.targetId} ${name} 确认记录`);
  const review = readJson(repo, ref.path, `${target.targetId} ${name} 确认`);
  const expectedStage = name.startsWith('V3') ? 'V3' : name;
  let reviewOwner = work.workItemId;
  if (review.workItemId !== work.workItemId) {
    // 来源确认只能由已验证的复用链证明，V4/V5 永远需要当前工作项重新验收。
    if (!['V2', 'V3Decomposition', 'V3Layout'].includes(name) || typeof validateReuseReview !== 'function') throw new WorkflowError(`${target.targetId} ${name} 不允许跨工作项复用`);
    reviewOwner = validateReuseReview(repo, work, target, name, ref, review);
    if (typeof reviewOwner !== 'string' || !reviewOwner || reviewOwner !== review.workItemId) throw new WorkflowError(`${target.targetId} ${name} 复用来源身份无效`);
  }
  if (review.schemaVersion !== '1.0' || review.workItemId !== reviewOwner || review.objectId !== work.visual.objectId || review.targetId !== target.targetId || review.candidateId !== target.candidateId || review.stage !== expectedStage || review.purpose !== REVIEW_PURPOSES[name] || review.decision !== 'APPROVED') throw new WorkflowError(`${target.targetId} ${name} 人工确认身份或状态错绑`);
  requireText(review.userMessageRef, `${target.targetId} ${name}.userMessageRef`);
  if (!sameIdentity(repo, review.referenceTarget, target.referenceTarget)) throw new WorkflowError(`${target.targetId} ${name} 未绑定当前目标图`);
  verifyFileIdentity(repo, review.referenceTarget, `${target.targetId} ${name} 目标图`);
  verifyFileIdentity(repo, { path: review.targetRef, sha256: review.targetSha256 }, `${target.targetId} ${name} 确认图`);
  if (name === 'V2' && repoPath(repo, review.targetRef).relative !== repoPath(repo, target.referenceTarget.path).relative) throw new WorkflowError(`${target.targetId} V2 确认图必须是目标图`);
  if (name === 'V2') {
    if (!Array.isArray(review.qualityChecks) || review.qualityChecks.length !== QUALITY_DIMENSIONS.length) throw new WorkflowError(`${target.targetId} V2 质量判断必须包含五个维度`);
    for (const dimension of QUALITY_DIMENSIONS) {
      const checks = review.qualityChecks.filter((item) => item?.dimension === dimension);
      if (checks.length !== 1 || checks[0].status !== 'PASS') throw new WorkflowError(`${target.targetId} V2 质量判断 ${dimension} 尚未通过`);
      const evidence = requireFile(repo, checks[0].evidenceRef, `${target.targetId} ${dimension} 证据`);
      if (!statSync(repoPath(repo, evidence).absolute).size) throw new WorkflowError(`${target.targetId} ${dimension} 证据不能为空`);
    }
  }
  if (name === 'V3Layout') {
    const decompositionPath = target.reviews?.V3Decomposition?.path;
    if (!decompositionPath || !review.decompositionReviewRef || repoPath(repo, review.decompositionReviewRef.path).relative !== repoPath(repo, decompositionPath).relative) throw new WorkflowError(`${target.targetId} 布局确认未绑定本目标拆解确认`);
    verifyFileIdentity(repo, review.decompositionReviewRef, `${target.targetId} 拆解确认记录`);
  }
  return review;
}

/** 逐目标核对工作项身份、已冻结图像及各阶段确认；栈专用合同由调用方注入校验。 */
export function validateMultiVisualStage(repo, work, stage, { validateDomainTarget, validateAssetReview, validateReuseReview, validateReuseCoverage, manifest, visualCategories } = {}) {
  if (work?.workItemType !== 'SCENE' || !work.visual) throw new WorkflowError('多目标视觉合同仅适用于 SCENE 工作项');
  if (!Object.hasOwn(REVIEW_STAGES, stage)) throw new WorkflowError(`不支持的视觉校验阶段：${stage}`);
  const targets = work.visual.targets;
  if (!Array.isArray(targets) || !targets.length) throw new WorkflowError('场景至少需要一个视觉目标');
  const targetIds = new Set();
  const candidateIds = new Set();
  for (const target of targets) {
    for (const field of ['targetId', 'candidateId', 'sceneId', 'stateId', 'scope']) requireText(target?.[field], `视觉目标.${field}`);
    if (target.sceneId !== work.visual.objectId) throw new WorkflowError(`${target.targetId} 未绑定当前场景`);
    if (targetIds.has(target.targetId) || candidateIds.has(target.candidateId)) throw new WorkflowError('场景目标及候选身份必须唯一');
    targetIds.add(target.targetId);
    candidateIds.add(target.candidateId);
    if (!Number.isInteger(target.viewport?.width) || target.viewport.width < 1 || !Number.isInteger(target.viewport?.height) || target.viewport.height < 1) throw new WorkflowError(`${target.targetId} viewport 必须为正整数尺寸`);
    verifyFileIdentity(repo, target.referenceTarget, `${target.targetId} 冻结目标`);
    const domainPath = requireFile(repo, target.domainEvidenceRef?.path, `${target.targetId} 领域证据`);
    if (!statSync(repoPath(repo, domainPath).absolute).size) throw new WorkflowError(`${target.targetId} 领域证据不能为空`);
    if (typeof validateDomainTarget !== 'function') throw new WorkflowError('场景目标必须执行当前技术栈领域合同校验');
    const domainResult = validateDomainTarget(repo, work, target, stage);
    if (domainResult && typeof domainResult.then === 'function') throw new WorkflowError('领域校验不能以未等待的异步结果通过');
    if (domainResult === false || (Array.isArray(domainResult) && domainResult.length > 0) || domainResult?.status === 'FAIL' || domainResult?.status === 'BLOCKED') throw new WorkflowError(`${target.targetId} 领域合同校验失败：${Array.isArray(domainResult) ? domainResult.join('；') : '未通过'}`);
    for (const name of REVIEW_STAGES[stage]) {
      const review = validateReview(repo, work, target, name, validateReuseReview);
      if (name === 'V4') {
        if (typeof validateAssetReview !== 'function') throw new WorkflowError('V4 必须执行目标素材评审');
        verifyFileIdentity(repo, target.assetReviewRef, `${target.targetId} 素材评审记录`);
        const asset = validateAssetReview(repo, work, target);
        if (!asset || asset.userMessageRef !== review.userMessageRef) throw new WorkflowError(`${target.targetId} V4 确认与目标素材评审消息不一致`);
      }
    }
  }
  validateCoverage(repo, work, targets, validateReuseCoverage);
  if (stage === 'V5') validateRuntimeEvidence(repo, work, targets, manifest, visualCategories);
  return targets;
}

/** 逐目标核对每类运行证据和整体衔接审阅，不能由单个画面冒充全部目标。 */
function validateRuntimeEvidence(repo, work, targets, manifest, visualCategories) {
  if (!manifest || manifest.workItemId !== work.workItemId || manifest.stack !== work.stack || manifest.visualStage !== 'V5' || !Array.isArray(manifest.items)) throw new WorkflowError('V5 运行证据未绑定当前工作项和阶段');
  if (!Array.isArray(visualCategories) || !visualCategories.length || visualCategories.some((category) => typeof category !== 'string' || !category.trim())) throw new WorkflowError('V5 必须提供当前技术栈的视觉证据类别');
  for (const target of targets) {
    for (const category of visualCategories) {
      const item = manifest.items.find((entry) => entry?.targetId === target.targetId && entry.category === category && entry.status === 'PASS');
      if (!item) throw new WorkflowError(`${target.targetId} 缺少 V5 运行证据 ${category}`);
      const file = requireFile(repo, item.path, `${target.targetId} ${category} 运行证据`);
      if (!statSync(repoPath(repo, file).absolute).size) throw new WorkflowError(`${target.targetId} ${category} 运行证据不能为空`);
    }
  }
  const integrationRef = work.visual.integrationEvidenceRef;
  if (!integrationRef?.path) throw new WorkflowError('V5 缺少场景目标衔接审阅');
  verifyFileIdentity(repo, integrationRef, '场景目标衔接审阅');
  const integration = readJson(repo, integrationRef.path, '场景目标衔接审阅');
  if (integration.workItemId !== work.workItemId || integration.sceneId !== work.visual.objectId || integration.status !== 'APPROVED') throw new WorkflowError('场景目标衔接审阅身份或确认状态不匹配');
  requireText(integration.userMessageRef, '场景目标衔接审阅.userMessageRef');
  const expected = targets.map((target) => target.targetId).sort();
  if (!Array.isArray(integration.targetIds) || new Set(integration.targetIds).size !== integration.targetIds.length || JSON.stringify([...integration.targetIds].sort()) !== JSON.stringify(expected)) throw new WorkflowError('场景目标衔接审阅未覆盖全部目标');
}
