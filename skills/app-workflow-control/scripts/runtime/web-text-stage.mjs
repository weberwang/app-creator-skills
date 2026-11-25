import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { readTargetRuntimeLayoutRef } from './runtime-layout-evidence.mjs';
import { readV4TextRestoration } from './v4-text-restoration.mjs';
import { verifyCocosV4RuleApproval } from './cocos-prompt-acceptance.mjs';

const TEXT_TARGET_FIELDS = [
  ['text_node_id', 'textNodeId', 'id'], ['region_id', 'regionId'], ['layout_node_id', 'layoutNodeId'],
  ['parent_layout_node_id', 'parentLayoutNodeId'],
  ['typography_target', 'typographyTarget', 'target_typography', 'targetTypography', 'typography'],
  ['target_bounds', 'targetBounds', 'bounds'], ['content', 'text', 'display_text', 'displayText'],
  ['content_source', 'contentSource', 'source', 'i18n_key', 'i18nKey'], ['dynamic'],
  ['localizable', 'localizable_text', 'localizableText'], ['content_cases', 'contentCases'], ['planned_test_id', 'plannedTestId'],
];

/** 提取 V3 已定的文字目标，试装与正式实测属于各自的交付阶段。 */
function textTargets(manifest) {
  const contract = manifest.scene_reconstruction_contract;
  const decomposition = contract?.text_decomposition ?? contract?.textDecomposition;
  const nodes = decomposition?.text_nodes ?? decomposition?.textNodes;
  if (!Array.isArray(nodes)) return new Map();
  return new Map(nodes.map((node) => {
    const fields = TEXT_TARGET_FIELDS.map((names) => [names[0], node?.[names.find((name) => Object.hasOwn(node ?? {}, name))]]);
    return [fields[0][1], Object.fromEntries(fields)];
  }));
}

/** 组件路径使用原生层级，拒绝用相对段指向正式根以外的对象。 */
function isComponentPath(path) {
  return typeof path === 'string' && !path.includes('\\')
    && path.split('/').every((part) => part.trim() && part !== '.' && part !== '..');
}

/** 核对正式目标的一次采集同时覆盖图片与可见文字组件。 */
function assertWebTrial(report, identity, targets, root) {
  if (report.schemaVersion !== 'web-native-text-readback/1.0' || report.measurementSource !== 'runtime-component'
    || report.visualStage !== 'V4' || typeof report.runId !== 'string' || !report.runId.trim()
    || Object.entries(identity).some(([key, value]) => !isDeepStrictEqual(report[key], value))
    || !Array.isArray(report.nodes)) {
    throw new WorkflowError('V4 文字试装未绑定当前工作项、候选、场景、状态和确认稿');
  }
  const actual = new Map(report.nodes.map((node) => [node?.textNodeId, node]));
  const paths = new Set();
  /** 文字和图片必须位于同一个已冻结的原生目标根。 */
  const withinRoot = (path) => isComponentPath(path) && (path === root || path.startsWith(`${root}/`));
  if (report.formalIntegration.rootComponentPath !== root
    || report.formalIntegration.images.some((image) => !withinRoot(image.componentPath))) {
    throw new WorkflowError('V4 图片消费者未绑定 V3 冻结的正式目标根');
  }
  if (actual.size !== report.nodes.length || actual.size !== targets.size) throw new WorkflowError('V4 文字试装的节点范围与冻结目标不一致');
  for (const [nodeId, target] of targets) {
    const node = actual.get(nodeId);
    const measurement = node?.measurement;
    if (node?.layoutNodeId !== target.layout_node_id || !withinRoot(node?.componentPath)
      || paths.has(node.componentPath) || measurement?.actual_visible !== true
      || ![measurement.actual_content, measurement.actual_image_path].some((value) => typeof value === 'string' && value.trim())) {
      throw new WorkflowError(`V4 文字节点 ${nodeId} 缺少本次试装的可见内容或实际组件`);
    }
    paths.add(node.componentPath);
  }
}

/** 补核领域清单已登记给当前目标的图像，防止资源评审漏列仍能通过。 */
function verifyDomainImageCoverage(repo, manifest, target, images) {
  const regions = Array.isArray(manifest.coverage_audit?.regions) ? manifest.coverage_audit.regions : [];
  const regionAssets = new Set(regions.filter((region) => region?.scene_id === target.sceneId && region.state_id === target.stateId)
    .flatMap((region) => region.asset_ids ?? [region.asset_id]));
  const captured = new Set(images.map(({ outputRef }) => fileIdentityKey(repo, outputRef.path)));
  for (const asset of Array.isArray(manifest.assets) ? manifest.assets : []) {
    if (!asset || (asset.state_id && asset.state_id !== target.stateId)) continue;
    const scopedToScene = asset.scene_id === target.sceneId && !asset.coverage_region_ids?.length;
    if (!scopedToScene && !regionAssets.has(asset.id)) continue;
    const files = [asset.output_file, ...(Array.isArray(asset.runtime_outputs) ? asset.runtime_outputs : [])];
    for (const file of files) {
      if (typeof file === 'string' && /\.(?:png|webp|jpe?g|gif|avif|svg|bmp|ktx2)$/i.test(file)
        && !captured.has(fileIdentityKey(repo, file))) throw new WorkflowError(`V4 正式图文回读缺少当前领域清单图片 ${file}`);
    }
  }
}

/** 核对受用户确认的试装身份，并从冻结的原生报告提取逐案例对比目标。 */
function readApprovedTextTrial(repo, work, target, restored, targets, manifest) {
  const assetReview = readJson(repo, target.assetReviewRef.path, 'V4 资源评审');
  const ref = assetReview.textAcceptanceRef;
  if (!ref) return null;
  if (work.stack !== 'cocos') throw new WorkflowError('文字试装决议只适用于 Cocos');
  /** 读取冻结文件并校验内容摘要与作废记录。 */
  function frozen(reference, label) {
    if (!reference?.path || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw new WorkflowError(`${label} 缺少文件身份`);
    const path = requireFile(repo, reference.path, label);
    if (work.invalidatedRefs?.some((entry) => fileIdentityKey(repo, entry.path) === fileIdentityKey(repo, path))) throw new WorkflowError(`${label} 已作废`);
    const bytes = readFileSync(repoPath(repo, path).absolute);
    if (createHash('sha256').update(bytes).digest('hex') !== reference.sha256) throw new WorkflowError(`${label} 摘要不一致`);
    return bytes;
  }
  const decision = JSON.parse(frozen(ref, '文字试装决议'));
  const reviewRef = target.reviews?.V4;
  if (!isDeepStrictEqual(decision.reviewRef, reviewRef) || !isDeepStrictEqual(decision.textRestorationRef, restored.ref)) {
    throw new WorkflowError('文字试装决议未绑定当前资源确认及原生读数');
  }
  const review = JSON.parse(frozen(reviewRef, 'V4 人工确认'));
  const identity = { workItemId: work.workItemId, sceneId: target.sceneId, stateId: target.stateId,
    candidateId: target.candidateId, referenceTarget: target.referenceTarget };
  if (decision.schemaVersion !== 'cocos-text-acceptance/1.0' || Object.entries(identity).some(([key, value]) => !isDeepStrictEqual(decision[key], value))
    || review.schemaVersion !== '1.0' || review.stage !== 'V4' || review.purpose !== 'imported-assets' || review.decision !== 'APPROVED'
    || review.workItemId !== work.workItemId || review.objectId !== target.sceneId || review.targetId !== target.targetId
    || review.candidateId !== target.candidateId || !isDeepStrictEqual(review.referenceTarget, target.referenceTarget)
    || !decision.userMessageRef || decision.userMessageRef !== review.userMessageRef || decision.userMessageRef !== assetReview.userMessageRef) {
    throw new WorkflowError('文字试装决议的目标或用户确认身份不一致');
  }
  verifyCocosV4RuleApproval(repo, work, target, decision.ruleApprovalRef, review.userMessageRef);
  const screenshot = { path: review.targetRef, sha256: review.targetSha256 };
  if (!isDeepStrictEqual(decision.acceptedScreenshot, screenshot) || !isDeepStrictEqual(restored.report.acceptedScreenshot, screenshot)) {
    throw new WorkflowError('文字试装决议未绑定用户确认的试装截图');
  }
  frozen(screenshot, '文字试装截图');
  const raw = JSON.parse(frozen(restored.report.rawReadback, 'Creator 原始试装读数'));
  if (!['cocos-native-text-trial/1.0', 'lobby-v4-native-trial/1.0'].includes(raw.schemaVersion) || raw.measurementSource !== 'runtime-component'
    || raw.runId !== restored.report.runId || raw.workItemId !== work.workItemId || raw.sceneId !== target.sceneId
    || raw.stateId !== target.stateId || raw.candidateId !== target.candidateId
    || !isDeepStrictEqual(raw.referenceTarget, target.referenceTarget) || raw.labels?.screenshot?.sha256 !== screenshot.sha256
    || !isDeepStrictEqual(raw.formalIntegration, restored.report.formalIntegration)) {
    throw new WorkflowError('Creator 原始试装读数与已确认截图或目标不一致');
  }
  if (!Array.isArray(restored.report.fontResources) || restored.report.fontResources.length !== 2
    || !isDeepStrictEqual(restored.report.fontResources, [raw.font, raw.fontTexture])) throw new WorkflowError('试装字体资源未绑定原始读数');
  for (const resource of restored.report.fontResources) frozen(resource, '试装字体资源');
  const approved = new Map();
  for (const [id, frozenTarget] of targets) {
    const node = restored.report.nodes.find((item) => item.textNodeId === id);
    const declaration = manifest.scene_reconstruction_contract.text_decomposition.text_nodes.find((item) => item.text_node_id === id);
    const required = declaration?.required_resources?.map((item) => item.path).sort();
    if (!required || !isDeepStrictEqual([...restored.report.fontResources.map((entry) => entry.path)].sort(), required)) {
      throw new WorkflowError(`文字节点 ${id} 的试装字体资源未绑定声明`);
    }
    if (!Array.isArray(node?.cases)) throw new WorkflowError(`文字节点 ${id} 缺少试装用例`);
    const ids = new Set();
    for (const item of node.cases) {
      if (!item?.content_case_id || ids.has(item.content_case_id)) throw new WorkflowError(`文字节点 ${id} 的试装用例重复或缺少身份`);
      ids.add(item.content_case_id);
      const source = raw.labels.results.find((entry) => entry.textNodeId === id)?.measurements.find((entry) => entry.caseId === item.content_case_id);
      if (!source || source.content !== item.actual_content || source.locale !== item.actual_locale
        || !isDeepStrictEqual(source.inputs, item.actual_inputs) || !isDeepStrictEqual(source.fixtureContentSource, item.actual_content_source)
        || !isDeepStrictEqual(source.actualBounds, item.actual_bounds) || !isDeepStrictEqual(source.glyphBounds, item.glyph_bounds)
        || !isDeepStrictEqual(source.baseline, item.baseline) || source.fontLoaded !== item.font_loaded
        || source.fallbackDetected !== item.fallback_detected || source.visible !== item.actual_visible
        || item.renderer !== 'bitmap-text' || item.actual_geometry_unit !== 'logical-px' || item.actual_coordinate_space !== 'viewport-logical'
        || item.actual_test_id !== frozenTarget.planned_test_id
        || !isDeepStrictEqual(item.actual_font_resources, restored.report.fontResources.map((entry) => entry.path))) {
        throw new WorkflowError(`文字节点 ${id} 的用例 ${item.content_case_id} 未绑定原始读数`);
      }
      const style = source.actualTypography;
      const actual = item.actual_typography;
      const familyWeight = /semibold/i.test(style?.fontFamily ?? '') ? 'semibold'
        : /bold/i.test(style?.fontFamily ?? '') ? 'bold'
          : /medium/i.test(style?.fontFamily ?? '') ? 'medium' : 'normal';
      if (!style || !actual || style.fontFamily !== actual.font_family || style.renderedFontSize !== actual.font_size
        || style.fontSizeUnit !== actual.font_size_unit || style.lineHeight !== actual.line_height || style.letterSpacing !== actual.letter_spacing
        || actual.font_weight !== familyWeight || style.isBold !== false
        || style.fill !== actual.fill || style.wrap !== actual.wrap || style.lineCount !== actual.line_count
        || actual.font_style !== (style.isItalic ? 'italic' : 'normal') || actual.stroke !== (style.outlineEnabled ? 'enabled' : 'none')
        || actual.shadow !== (style.shadowEnabled ? 'enabled' : 'none') || style.horizontalAlign !== 1 || style.verticalAlign !== 1
        || !isDeepStrictEqual(actual.alignment, { horizontal: 'center', vertical: 'center' })) {
        throw new WorkflowError(`文字节点 ${id} 的用例 ${item.content_case_id} 排版未绑定原始读数`);
      }
    }
    for (const item of frozenTarget.content_cases ?? []) {
      const result = node.cases.find((entry) => entry.content_case_id === item.case_id);
      if (!result || result.actual_content !== item.expected_content || result.actual_locale !== item.locale
        || !isDeepStrictEqual(result.actual_inputs, item.inputs) || !isDeepStrictEqual(result.actual_content_source, item.content_source)
        || result.font_loaded !== true || result.fallback_detected !== false || result.actual_visible !== true) {
        throw new WorkflowError(`文字节点 ${id} 的试装用例 ${item.case_id} 不完整`);
      }
    }
    if (!node.cases.some((item) => isDeepStrictEqual(item, node.measurement))) throw new WorkflowError(`文字节点 ${id} 的主要读数未绑定试装用例`);
    approved.set(id, { cases: node.cases });
  }
  return approved;
}

/** V4 文字与图片共用正式接入回读，V5 另取完整运行的公共布局证据。 */
export function webTextReadbackOptions(repo, work, manifest, target, stage) {
  const { targetId, sceneId, stateId, candidateId, referenceTarget, assetReviewRef } = target;
  const targets = textTargets(manifest);
  const hasText = targets.size > 0;
  const contract = manifest.scene_reconstruction_contract;
  const declaredText = contract?.text_decomposition ?? contract?.textDecomposition;
  if (stage === 'V4' && !hasText && declaredText?.applicability === 'has-text') throw new WorkflowError('V4 已声明的文字缺少逐节点还原范围');
  const formalTarget = validateWebTextStage(repo, manifest, target.reviews?.V3Layout, target);
  const trial = stage === 'V4' && hasText;
  const identity = { stack: work.stack, workItemId: work.workItemId, sceneId, stateId, candidateId, referenceTarget };
  const restored = hasText && ['V4', 'V5'].includes(stage)
    ? readV4TextRestoration(repo, work, candidateId, {
      stage, entryPaths: [formalTarget.entryPath], assetReviewRef: work.workItemType === 'SCENE' ? assetReviewRef ?? null : work.assetReviewRef,
    })
    : null;
  if (restored) assertWebTrial(restored.report, identity, targets, formalTarget.rootComponentPath);
  if (trial) verifyDomainImageCoverage(repo, manifest, target, restored.report.formalIntegration.images);
  const approvedTextTrial = restored && work.workItemType === 'SCENE' ? readApprovedTextTrial(repo, work, target, restored, targets, manifest) : null;
  const runtimeEvidenceRef = trial ? restored.ref
    : stage === 'V5' ? readTargetRuntimeLayoutRef(repo, work, targetId) : null;
  if (stage === 'V5' && approvedTextTrial) {
    const path = requireFile(repo, runtimeEvidenceRef?.path, 'V5 文字运行读数');
    const bytes = readFileSync(repoPath(repo, path).absolute);
    if (createHash('sha256').update(bytes).digest('hex') !== runtimeEvidenceRef.sha256) throw new WorkflowError('V5 文字运行读数摘要不一致');
    const current = JSON.parse(bytes.toString('utf8'));
    if (current.runId === restored.report.runId || current.visualStage === 'V4' || current.measurementSource !== 'runtime-component') {
      throw new WorkflowError('V5 必须独立采集正式运行文字');
    }
    const fields = ['renderer', 'font_loaded', 'fallback_detected', 'actual_visible', 'actual_bounds', 'glyph_bounds', 'baseline',
      'actual_geometry_unit', 'actual_coordinate_space', 'actual_test_id', 'actual_content', 'actual_font_resources',
      'content_case_id', 'actual_locale', 'actual_inputs', 'actual_content_source', 'actual_typography'];
    for (const [id, approved] of approvedTextTrial) {
      const cases = current.nodes?.find((entry) => entry.textNodeId === id)?.cases;
      for (const expected of approved.cases) {
        const matches = cases?.filter((item) => item.content_case_id === expected.content_case_id) ?? [];
        if (matches.length !== 1 || fields.some((key) => expected[key] === undefined || !isDeepStrictEqual(matches[0][key], expected[key]))) {
          throw new WorkflowError(`V5 文字节点 ${id} 的用例 ${expected.content_case_id} 未复验已确认试装`);
        }
      }
    }
  }
  return {
    requireNativeTextReadback: trial || stage === 'V5',
    ...(approvedTextTrial ? { approvedTextTrial } : {}),
    textTrialRunId: stage === 'V5' ? restored?.report?.runId : undefined,
    textReadbackIdentity: {
      ...identity,
      ...(trial ? { visualStage: 'V4' } : {}), runtimeEvidenceRef,
    },
  };
}

/** 核对 V3 冻结的接入目标、文字样式及适用节点。 */
export function validateWebTextStage(repo, manifest, layoutReviewRef, { candidateId, sceneId, stateId, referenceTarget }) {
  const current = textTargets(manifest);
  if (!layoutReviewRef?.path && !current.size) return;
  const review = readJson(repo, layoutReviewRef?.path, 'V3 文字布局确认');
  const reference = review.layoutSpecRef;
  if (!reference && !current.size) return;
  if (!reference?.path || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw new WorkflowError('V3 文字布局确认须用 layoutSpecRef 冻结目标清单');
  const path = requireFile(repo, reference.path, 'V3 文字目标清单');
  const bytes = readFileSync(repoPath(repo, path).absolute);
  if (createHash('sha256').update(bytes).digest('hex') !== reference.sha256) throw new WorkflowError('V3 文字目标清单摘要已变化');
  const frozen = JSON.parse(bytes.toString('utf8'));
  const upstream = textTargets(frozen);
  if (!upstream.size && !current.size) return;
  const target = frozen.reference_target;
  const conditions = frozen.scene_reconstruction_contract?.target_conditions;
  if (frozen.visualStage !== 'V3' || frozen.candidateVersion !== candidateId || target?.original_file !== referenceTarget.path
    || String(target?.target_sha256 ?? '').replace(/^sha256:/, '') !== referenceTarget.sha256
    || conditions?.scene_id !== sceneId || (stateId !== undefined && conditions?.state_id !== stateId)) {
    throw new WorkflowError('V3 文字目标清单未绑定当前候选、场景、状态和已确认目标');
  }
  const differences = [];
  for (const nodeId of new Set([...upstream.keys(), ...current.keys()])) {
    const before = upstream.get(nodeId);
    const after = current.get(nodeId);
    if (!before || !after) differences.push(`文字节点 ${nodeId} 缺少 V3 目标或当前交接`);
    else for (const [field, value] of Object.entries(before)) {
      if (!isDeepStrictEqual(value, after[field])) differences.push(`文字节点 ${nodeId} 的 ${field} 已偏离 V3 冻结目标`);
    }
  }
  if (differences.length) throw new WorkflowError(differences.join('；'));
  const formalTarget = frozen.formalTarget;
  if (typeof formalTarget?.entryPath !== 'string' || !isComponentPath(formalTarget.rootComponentPath)) {
    throw new WorkflowError('V3 文字布局规格缺少 formalTarget 正式入口和组件根');
  }
  repoPath(repo, formalTarget.entryPath, 'V3 正式视觉入口');
  return formalTarget;
}
