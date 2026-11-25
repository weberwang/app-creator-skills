import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, repoPath, requireFile, WorkflowError } from './io.mjs';
import { validateSceneReviewRecord } from './multi-visual-contract.mjs';

const ADAPTED_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs']);
const APPROVAL_SCOPE_BY_DECISION = Object.freeze({
  'visual-prompt-acceptance/1.0': 'verify-v4-original-prompts',
  'visual-text-acceptance/1.0': 'accept-v4-text-trial',
});

/** 仅由已接入运行证据校验的场景使用验收决议。 */
export function assertVisualAcceptanceTarget(work, target) {
  if (work?.workItemType !== 'SCENE' || !work.visual?.objectId || !target?.targetId || !ADAPTED_STACKS.has(work.stack)) {
    throw new WorkflowError('当前工作项没有适用的场景验收证据校验器');
  }
}

/** 投影各阶段资料必须共同绑定的目标身份。 */
export function visualAcceptanceIdentity(work, target) {
  return { stack: work.stack, workItemId: work.workItemId, targetId: target.targetId, candidateId: target.candidateId,
    sceneId: target.sceneId, stateId: target.stateId, referenceTarget: target.referenceTarget };
}

/** 核对一个记录必须具备的字段和准确身份。 */
export function matchesVisualAcceptance(record, identity) {
  return Object.entries(identity).every(([key, value]) => isDeepStrictEqual(record?.[key], value));
}

/** 组件路径按已保存目标的原生层级记录，禁止以相对段跳转到其他目标。 */
export function isVisualComponentPath(path) {
  return typeof path === 'string' && !path.includes('\\')
    && path.split('/').every((part) => part.trim() && part !== '.' && part !== '..');
}

/** 读取仍有效的冻结证据并从同一组字节计算摘要。 */
export function readVisualAcceptanceFile(repo, work, ref, label) {
  if (typeof ref?.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}缺少冻结文件身份`);
  const path = requireFile(repo, ref.path, label);
  const key = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((entry) => entry.path && fileIdentityKey(repo, entry.path) === key)) throw new WorkflowError(`${label}已作废`);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}与已确认摘要不符`);
  return bytes;
}

/** 解析冻结证据，拒绝损坏 JSON 和非对象记录。 */
export function readVisualAcceptanceJson(repo, work, ref, label) {
  const bytes = readVisualAcceptanceFile(repo, work, ref, label);
  let record;
  try { record = JSON.parse(bytes.toString('utf8')); }
  catch { throw new WorkflowError(`${label}不是有效 JSON`); }
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new WorkflowError(`${label}必须是 JSON 对象`);
  return record;
}

/** 主动改变验收依据须取得绑定同一场景目标且独立于视觉确认的用户授权。 */
function verifyV4RuleApproval(repo, work, target, ref, reviewMessageRef, requiredScope) {
  const consent = readVisualAcceptanceJson(repo, work, ref, '用户规则调整授权');
  const identity = { schemaVersion: '1.0', stack: work.stack, workItemId: work.workItemId, targetId: target.targetId,
    candidateId: target.candidateId, reviewRef: target.reviews.V4, decision: 'APPROVED' };
  if (consent.scope !== requiredScope && consent.scope !== 'verify-v4-original-prompts-and-approved-trial') {
    throw new WorkflowError('用户规则调整授权不涵盖当前验收能力');
  }
  if (!matchesVisualAcceptance(consent, identity) || !/^chat:[a-z0-9-]+\/message:[a-z0-9-]+$/i.test(consent.userMessageRef ?? '')
    || consent.userMessageRef === reviewMessageRef) throw new WorkflowError('历史产物或文字试装验收需要独立于视觉确认的用户授权');
}

/** 统一验证素材评审、用户确认、截图和专项授权之间的身份链。 */
export function readV4AcceptanceDecision(repo, work, target, assetReview, ref, schemaVersion) {
  assertVisualAcceptanceTarget(work, target);
  const identity = visualAcceptanceIdentity(work, target);
  const reviewRef = target.reviews?.V4;
  readVisualAcceptanceFile(repo, work, reviewRef, 'V4 人工确认');
  const review = validateSceneReviewRecord(repo, work, target, 'V4');
  const screenshot = { path: review.targetRef, sha256: review.targetSha256 };
  readVisualAcceptanceFile(repo, work, screenshot, 'V4 已确认试装截图');
  readVisualAcceptanceFile(repo, work, target.referenceTarget, 'V4 冻结参考');
  const decision = readVisualAcceptanceJson(repo, work, ref, 'V4 验收决议');
  if (!matchesVisualAcceptance(assetReview, { schemaVersion: '1.0', stack: work.stack, workItemId: work.workItemId,
    candidateId: target.candidateId, visualStage: 'V4', technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: review.userMessageRef })
    || !matchesVisualAcceptance(decision, { ...identity, schemaVersion, reviewRef, userMessageRef: review.userMessageRef })) {
    throw new WorkflowError('V4 验收决议、资源评审或用户确认身份不一致');
  }
  if (!isDeepStrictEqual(decision.acceptedScreenshot, screenshot)) throw new WorkflowError('V4 验收决议未绑定用户确认的试装截图');
  verifyV4RuleApproval(repo, work, target, decision.ruleApprovalRef, review.userMessageRef, APPROVAL_SCOPE_BY_DECISION[schemaVersion]);
  return { decision, identity, screenshot };
}
