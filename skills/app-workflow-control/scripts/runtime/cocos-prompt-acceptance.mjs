import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, repoPath, WorkflowError } from './io.mjs';
import { validateSceneReviewRecord } from './multi-visual-contract.mjs';

/** 读取已冻结的项目文件，拒绝越界、空文件、作废引用和摘要不符。 */
function verifiedFile(repo, work, ref, label) {
  if (typeof ref?.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}缺少冻结文件身份`);
  const file = repoPath(repo, ref.path, label);
  if (work.invalidatedRefs?.some((item) => fileIdentityKey(repo, item.path) === fileIdentityKey(repo, file.relative))) throw new WorkflowError(`${label}已作废`);
  const bytes = readFileSync(file.absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}与已确认摘要不符`);
  return bytes;
}

/** 校验来源并解析证据对象，维持生成记录和运行证据各自的身份。 */
function frozenJson(repo, work, ref, label) {
  const result = JSON.parse(verifiedFile(repo, work, ref, label).toString('utf8'));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new WorkflowError(`${label}必须是 JSON 对象`);
  return result;
}

/** 从实际生成收据读出原始提示词，逐项复核发送附件和原始 PNG。 */
function verifyGenerationReceipts(repo, work, target, asset, receiptRefs) {
  if (!Array.isArray(receiptRefs) || !receiptRefs.length || new Set(receiptRefs.map((ref) => ref.path)).size !== receiptRefs.length
    || !isDeepStrictEqual(asset.generation_record?.receipt_refs, receiptRefs)) throw new WorkflowError(`${asset.id} 缺少唯一实际生成收据`);
  const records = receiptRefs.map((ref) => {
    const receipt = frozenJson(repo, work, ref, '实际生图收据');
    const prompt = receipt.prompt ?? receipt.full_prompt;
    const raw = receipt.rawOutput ?? receipt.outputRaw ?? receipt.output;
    if (receipt.assetId !== asset.id || receipt.candidateId !== target.candidateId
      || typeof prompt !== 'string' || !prompt.trim()
      || (receipt.full_prompt !== undefined && receipt.full_prompt !== prompt)
      || !/^image_gen/i.test(receipt.tool ?? receipt.generator ?? '')
      || !Array.isArray(receipt.actualReferenceInputs)) throw new WorkflowError(`${asset.id} 生图收据与当前候选不符`);
    const attachments = receipt.actualReferenceInputs.map(({ path, sha256 }) => ({ path, sha256 }));
    if (attachments.filter((item) => isDeepStrictEqual(item, target.referenceTarget)).length !== 1) {
      throw new WorkflowError(`${asset.id} 历史生图未使用唯一冻结参考原图`);
    }
    for (const attachment of attachments) {
      if (attachment.path === asset.output_file || attachment.path === asset.source_file) throw new WorkflowError(`${asset.id} 的参考输入复用了正式产物`);
      verifiedFile(repo, work, attachment, '真实参考附件');
    }
    verifiedFile(repo, work, { path: raw?.path, sha256: raw?.sha256 }, '真实生成原图');
    return { prompt, rawPath: raw.path };
  });
  const primary = records[0];
  const generation = asset.generation_record;
  if (primary.rawPath !== generation.raw_source_file || !['prompt', 'actual_prompt', 'full_prompt'].every((field) => generation[field] === primary.prompt)) {
    throw new WorkflowError(`${asset.id} 的正式记录改写了原始提示词或原图`);
  }
  return createHash('sha256').update(primary.prompt, 'utf8').digest('hex');
}

/** 资源和文字采用同一个专项授权，视觉确认消息不能自行改变验收方法。 */
export function verifyCocosV4RuleApproval(repo, work, target, ref, reviewMessageRef) {
  const consent = frozenJson(repo, work, ref, '用户规则调整授权');
  if (consent.schemaVersion !== '1.0' || consent.workItemId !== work.workItemId || consent.candidateId !== target.candidateId
    || consent.scope !== 'verify-cocos-v4-original-prompts-and-approved-trial'
    || consent.decision !== 'APPROVED' || !isDeepStrictEqual(consent.reviewRef, target.reviews.V4)
    || !/^chat:[a-z0-9-]+\/message:[a-z0-9-]+$/i.test(consent.userMessageRef ?? '')
    || consent.userMessageRef === reviewMessageRef) throw new WorkflowError('历史产物验收需要独立于视觉确认的用户授权');
}

/** 从已确认的同一张 Cocos 试装截图和专项用户授权加载历史提示词核验资格。 */
export function loadCocosHistoricalPromptApprovals(repo, work, target, manifest, stage, loadedReview = null) {
  if (!target.assetReviewRef || !['V4', 'V5'].includes(stage)) return undefined;
  const assetReview = loadedReview ?? frozenJson(repo, work, target.assetReviewRef, '正式素材评审');
  if (assetReview.promptAcceptanceRef === undefined) return undefined;
  if (work.stack !== 'cocos' || work.workItemType !== 'SCENE') throw new WorkflowError('历史生图提示词验收仅适用于 Cocos SCENE');
  verifiedFile(repo, work, target.reviews?.V4, '正式试装人工确认');
  const review = validateSceneReviewRecord(repo, work, target, 'V4');
  const acceptance = frozenJson(repo, work, assetReview.promptAcceptanceRef, '历史生图验收决议');
  const screenshot = { path: review.targetRef, sha256: review.targetSha256 };
  const identity = { workItemId: work.workItemId, sceneId: target.sceneId, stateId: target.stateId,
    candidateId: target.candidateId, referenceTarget: target.referenceTarget, reviewRef: target.reviews.V4,
    acceptedScreenshot: screenshot, userMessageRef: review.userMessageRef };
  if (acceptance.schemaVersion !== 'cocos-prompt-acceptance/1.0'
    || Object.entries(identity).some(([key, value]) => !isDeepStrictEqual(acceptance[key], value))
    || assetReview.userMessageRef !== review.userMessageRef || assetReview.humanStatus !== 'PASS') {
    throw new WorkflowError('历史生图验收决议未绑定当前候选和已确认试装');
  }
  verifyCocosV4RuleApproval(repo, work, target, acceptance.ruleApprovalRef, review.userMessageRef);
  const captured = frozenJson(repo, work, acceptance.creatorReadbackRef, 'Creator 已确认试装读回');
  if (captured.workItemId !== work.workItemId || captured.candidateId !== target.candidateId
    || captured.sceneId !== target.sceneId || captured.stateId !== target.stateId
    || !isDeepStrictEqual(captured.referenceTarget, target.referenceTarget)
    || captured.labels?.screenshot?.sha256 !== screenshot.sha256 || !Array.isArray(captured.assets)) {
    throw new WorkflowError('Creator 生图绑定未消费同一张已确认试装截图');
  }
  if (!Array.isArray(acceptance.assets) || !acceptance.assets.length) throw new WorkflowError('历史生图验收决议未列明适用产物');
  const assets = new Map((manifest.assets ?? []).map((asset) => [asset.id, asset]));
  const imported = new Map(captured.assets.map((asset) => [asset.assetId, asset]));
  const approvals = new Map();
  for (const row of acceptance.assets) {
    const asset = assets.get(row.assetId);
    const trial = imported.get(row.assetId);
    if (!asset || !trial || approvals.has(row.assetId) || trial.source.path !== asset.source_file || trial.runtime.path !== asset.output_file
       || asset.sha256 !== trial.runtime.sha256 || !isDeepStrictEqual(row.source, trial.source) || !isDeepStrictEqual(row.runtime, trial.runtime)) {
      throw new WorkflowError(`${row.assetId} 的当前源图、运行图或导入读回偏离已确认试装`);
    }
    verifiedFile(repo, work, row.source, '正式生图成品');
    verifiedFile(repo, work, row.runtime, 'Creator 实际导入图片');
    verifiedFile(repo, work, trial.meta, 'Creator 实际导入元数据');
    const fullPromptSha256 = verifyGenerationReceipts(repo, work, target, asset, row.receiptRefs);
    approvals.set(row.assetId, { assetId: row.assetId, candidateVersion: target.candidateId,
      regionId: asset.generation_record.region_id, referenceTarget: target.referenceTarget, fullPromptSha256,
      sourceFile: row.source.path, runtimeFile: row.runtime.path, runtimeSha256: row.runtime.sha256 });
  }
  return approvals;
}
