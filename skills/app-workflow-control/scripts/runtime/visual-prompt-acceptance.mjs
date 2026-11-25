import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, WorkflowError } from './io.mjs';
import { isVisualComponentPath, matchesVisualAcceptance, readV4AcceptanceDecision, readVisualAcceptanceFile, readVisualAcceptanceJson } from './visual-acceptance-evidence.mjs';
import { validateV4FormalIntegration } from './v4-text-restoration.mjs';
import { validateWebTextStage } from './web-text-stage.mjs';
import { readUnityImagePlacements } from './unity-image-acceptance.mjs';

/** 从实际生成收据读出原始提示词，逐项复核发送附件和原始 PNG。 */
function verifyGenerationReceipts(repo, work, target, asset, receiptRefs) {
  if (!Array.isArray(receiptRefs) || !receiptRefs.length || new Set(receiptRefs.map((ref) => ref?.path)).size !== receiptRefs.length
    || !isDeepStrictEqual(asset.generation_record?.receipt_refs, receiptRefs)) throw new WorkflowError(`${asset.id} 缺少唯一实际生成收据`);
  const records = receiptRefs.map((ref) => {
    const receipt = readVisualAcceptanceJson(repo, work, ref, '实际生图收据');
    const prompt = receipt.prompt ?? receipt.full_prompt;
    const raw = receipt.rawOutput ?? receipt.outputRaw ?? receipt.output;
    if (receipt.assetId !== asset.id || receipt.candidateId !== target.candidateId
      || typeof prompt !== 'string' || !prompt.trim()
      || (receipt.full_prompt !== undefined && receipt.full_prompt !== prompt)
      || !/^image_gen/i.test(receipt.tool ?? receipt.generator ?? '')
      || !Array.isArray(receipt.actualReferenceInputs)) throw new WorkflowError(`${asset.id} 生图收据与当前候选不符`);
    const attachments = receipt.actualReferenceInputs.map((entry) => ({ path: entry?.path, sha256: entry?.sha256 }));
    if (attachments.filter((item) => isDeepStrictEqual(item, target.referenceTarget)).length !== 1) {
      throw new WorkflowError(`${asset.id} 历史生图未使用唯一冻结参考原图`);
    }
    for (const attachment of attachments) {
      if (attachment.path === asset.output_file || attachment.path === asset.source_file) throw new WorkflowError(`${asset.id} 的参考输入复用了正式产物`);
      readVisualAcceptanceFile(repo, work, attachment, '真实参考附件');
    }
    readVisualAcceptanceFile(repo, work, raw, '真实生成原图');
    return { prompt, raw, attachments };
  });
  const primary = records[0];
  const generation = asset.generation_record;
  if (primary.raw.path !== generation.raw_source_file || !['prompt', 'actual_prompt', 'full_prompt'].every((field) => generation[field] === primary.prompt)
    || (generation.rawOutput && !matchesVisualAcceptance(primary.raw, generation.rawOutput))
    || (generation.actualReferenceInputs && !isDeepStrictEqual(primary.attachments, generation.actualReferenceInputs))) {
    throw new WorkflowError(`${asset.id} 的正式记录改写了原始提示词或原图`);
  }
  return createHash('sha256').update(primary.prompt, 'utf8').digest('hex');
}

/** Unity 的正式生成记录来自资源评审，转为共用收据校验所需的资产事实。 */
function readUnityGenerationAsset(repo, work, target, reviewed, runtime) {
  const generation = readVisualAcceptanceJson(repo, work, {
    path: reviewed.generationRecord, sha256: reviewed.generationRecordSha256,
  }, 'Unity 正式生成记录');
  const regionId = generation.region?.id;
  if (generation.assetId !== reviewed.assetId || generation.candidateId !== target.candidateId
    || fileIdentityKey(repo, generation.referenceTarget) !== fileIdentityKey(repo, target.referenceTarget.path)
    || fileIdentityKey(repo, generation.runtimePath) !== fileIdentityKey(repo, reviewed.output)
    || typeof regionId !== 'string' || !regionId.trim() || !Array.isArray(reviewed.designItemIds) || !reviewed.designItemIds.includes(regionId)
    || !Array.isArray(generation.actualReferenceInputs) || !generation.actualReferenceInputs.length) {
    throw new WorkflowError(`${reviewed.assetId} 的 Unity 生成记录未绑定当前设计、实际附件及正式输出`);
  }
  readVisualAcceptanceFile(repo, work, generation.rawOutput, 'Unity 实际生成原图');
  return {
    id: reviewed.assetId, source_file: reviewed.sourceRef, output_file: reviewed.output, sha256: runtime.sha256,
    generation_record: { receipt_refs: generation.receiptRefs, region_id: regionId, raw_source_file: generation.rawOutput.path,
      rawOutput: { path: generation.rawOutput.path, sha256: generation.rawOutput.sha256 },
      actualReferenceInputs: generation.actualReferenceInputs.map((entry) => ({ path: entry?.path, sha256: entry?.sha256 })),
      prompt: generation.prompt, actual_prompt: generation.prompt, full_prompt: generation.prompt },
  };
}

/** 对照各栈原始读回，Creator 另外保留实际导入元数据。 */
function readImportedAssets(repo, work, ref, identity, screenshot) {
  const captured = readVisualAcceptanceJson(repo, work, ref, '已确认试装的图片运行读回');
  const expected = work.stack === 'cocos'
    ? { workItemId: identity.workItemId, sceneId: identity.sceneId, stateId: identity.stateId,
      candidateId: identity.candidateId, referenceTarget: identity.referenceTarget, screenshotRef: screenshot }
    : { ...identity, schemaVersion: 'visual-image-readback/1.0', measurementSource: 'runtime-component', visualStage: 'V4', screenshotRef: screenshot };
  const creatorScreenshot = captured.labels?.screenshot;
  const actual = work.stack === 'cocos'
    ? { ...captured, screenshotRef: { path: creatorScreenshot?.path, sha256: creatorScreenshot?.sha256 } }
    : captured;
  if (!matchesVisualAcceptance(actual, expected) || !Array.isArray(captured.assets)) throw new WorkflowError('图片运行读回未绑定同一场景目标和已确认试装截图');
  const imported = new Map(captured.assets.map((asset) => [asset?.assetId, asset]));
  if (imported.size !== captured.assets.length || imported.has(undefined)) throw new WorkflowError('图片运行读回的素材身份缺失或重复');
  return { imported, integrationRef: captured.formalIntegrationRef };
}

/** 核对原始图片读回与 V3 冻结入口、同批实际消费者的对应关系。 */
function verifyPortableImageIntegration(repo, work, target, manifest, stage, review, ref, identity, screenshot) {
  const layoutReviewRef = target.reviews?.V3Layout;
  readVisualAcceptanceFile(repo, work, layoutReviewRef, 'V3 正式布局确认');
  const formalTarget = validateWebTextStage(repo, manifest, layoutReviewRef, target, { requireFormalTarget: true });
  const capture = readVisualAcceptanceJson(repo, work, ref, '同批正式图片接入采集');
  if (!matchesVisualAcceptance(capture, { ...identity, schemaVersion: 'visual-image-integration/1.0',
    visualStage: 'V4', measurementSource: 'runtime-component', screenshotRef: screenshot })
    || capture.formalIntegration?.rootComponentPath !== formalTarget.rootComponentPath) {
    throw new WorkflowError('图片接入采集未绑定同一试装截图及 V3 正式组件根');
  }
  validateV4FormalIntegration(repo, work, review, capture, { stage, entryPaths: [formalTarget.entryPath] });
  const root = formalTarget.rootComponentPath;
  if (capture.formalIntegration.images.some(({ componentPath }) => !isVisualComponentPath(componentPath)
    || (componentPath !== root && !componentPath.startsWith(`${root}/`)))) {
    throw new WorkflowError('正式图片消费者位于冻结组件根之外');
  }
  return capture.formalIntegration.images;
}

/** 由控制器逐图复核授权、原始生成记录和实际运行消费者。 */
export function loadHistoricalPromptApprovals(repo, work, target, manifest, stage, loadedReview = null) {
  if (!target?.assetReviewRef || !['V4', 'V5'].includes(stage)) return undefined;
  const assetReview = loadedReview ?? readVisualAcceptanceJson(repo, work, target.assetReviewRef, '正式素材评审');
  const ref = assetReview.promptAcceptanceRef;
  if (ref === undefined) return undefined;
  const { decision, identity, screenshot } = readV4AcceptanceDecision(repo, work, target, assetReview, ref, 'visual-prompt-acceptance/1.0');
  const { imported, integrationRef } = readImportedAssets(repo, work, decision.runtimeReadbackRef, identity, screenshot);
  let placements;
  if (work.stack === 'unity') placements = readUnityImagePlacements(repo, work, target, stage, assetReview, integrationRef, identity, screenshot);
  else if (work.stack !== 'cocos') placements = verifyPortableImageIntegration(repo, work, target, manifest, stage, assetReview, integrationRef, identity, screenshot);
  if (!Array.isArray(decision.assets) || !decision.assets.length) throw new WorkflowError('历史生图验收决议未列明适用产物');
  const assets = new Map((manifest?.assets ?? []).map((asset) => [asset.id, asset]));
  const approvals = new Map();
  for (const row of decision.assets) {
    const assetId = row?.assetId;
    // 独立清单入口同样须确认逐图授权属于正式评审中的资产。
    const reviewed = Array.isArray(assetReview.assets) ? assetReview.assets.filter((item) => item?.assetId === assetId) : [];
    if (!assetId || reviewed.length !== 1 || !matchesVisualAcceptance(reviewed[0], { assetType: 'image', sourceKind: 'ai-generated',
      sourceRef: row.source?.path, output: row.runtime?.path, visualReviewScope: 'combined-runtime-trial' })) {
      throw new WorkflowError(`${assetId ?? '图片'} 未列入同次试装的正式图片评审`);
    }
    readVisualAcceptanceFile(repo, work, row.source, '正式生图成品');
    readVisualAcceptanceFile(repo, work, row.runtime, '正式运行图片');
    const asset = work.stack === 'unity' ? readUnityGenerationAsset(repo, work, target, reviewed[0], row.runtime) : assets.get(assetId);
    const trial = imported.get(row?.assetId);
    if (!asset || !trial || approvals.has(row.assetId) || trial.source?.path !== asset.source_file || trial.runtime?.path !== asset.output_file
       || String(asset.sha256 ?? '').replace(/^sha256:/, '') !== trial.runtime?.sha256
       || !isDeepStrictEqual(row.source, trial.source) || !isDeepStrictEqual(row.runtime, trial.runtime)) {
      throw new WorkflowError(`${row?.assetId ?? '图片'} 的当前源图、运行图或运行读回偏离已确认试装`);
    }
    if (work.stack === 'cocos') readVisualAcceptanceFile(repo, work, trial.meta, 'Creator 实际导入元数据');
    else if (!placements.some(({ assetId, componentPath, outputRef }) => assetId === row.assetId
      && trial.componentPath === componentPath && isDeepStrictEqual(outputRef, row.runtime))) {
      throw new WorkflowError(`${row.assetId} 未绑定实际图片消费者`);
    }
    const fullPromptSha256 = verifyGenerationReceipts(repo, work, target, asset, row.receiptRefs);
    approvals.set(row.assetId, { assetId: row.assetId, candidateVersion: target.candidateId,
      regionId: asset.generation_record.region_id, referenceTarget: target.referenceTarget, fullPromptSha256,
      sourceFile: row.source.path, runtimeFile: row.runtime.path, runtimeSha256: row.runtime.sha256 });
  }
  return approvals;
}
