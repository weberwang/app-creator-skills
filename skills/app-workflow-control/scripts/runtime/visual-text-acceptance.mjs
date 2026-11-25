import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, WorkflowError } from './io.mjs';
import { matchesVisualAcceptance, readV4AcceptanceDecision, readVisualAcceptanceFile, readVisualAcceptanceJson } from './visual-acceptance-evidence.mjs';

const CASE_FIELDS = ['renderer', 'font_loaded', 'fallback_detected', 'actual_visible', 'actual_bounds', 'glyph_bounds', 'baseline',
  'actual_geometry_unit', 'actual_coordinate_space', 'actual_test_id', 'actual_content', 'actual_font_resources',
  'content_case_id', 'actual_locale', 'actual_inputs', 'actual_content_source', 'actual_typography'];

/** 同时核对原始读数、试装报告与正式运行所需的全部文字事实。 */
function sameMeasurement(actual, expected) {
  return CASE_FIELDS.every((name) => expected?.[name] !== undefined && isDeepStrictEqual(actual?.[name], expected[name]));
}

/** Creator 原始读回保留实际位图字体绑定及来源属性，再由共用规则核对用例。 */
function verifyCocosReadback(repo, work, target, report, raw, targets, declarations, screenshot) {
  const nativeScreenshot = raw.labels?.screenshot;
  if (raw.schemaVersion !== 'cocos-native-text-trial/1.0' || raw.measurementSource !== 'runtime-component'
    || raw.runId !== report.runId || raw.workItemId !== work.workItemId || raw.sceneId !== target.sceneId
    || raw.stateId !== target.stateId || raw.candidateId !== target.candidateId
    || !isDeepStrictEqual(raw.referenceTarget, target.referenceTarget) || !matchesVisualAcceptance(nativeScreenshot, screenshot)
    || !isDeepStrictEqual(raw.formalIntegration, report.formalIntegration)) {
    throw new WorkflowError('Creator 原始试装读数与已确认截图或目标不一致');
  }
  if (!Array.isArray(report.fontResources) || report.fontResources.length !== 2
    || !isDeepStrictEqual(report.fontResources, [raw.font, raw.fontTexture])) throw new WorkflowError('试装字体资源未绑定原始读数');
  for (const resource of report.fontResources) readVisualAcceptanceFile(repo, work, resource, '试装字体资源');
  const sourceNodes = Array.isArray(raw.labels?.results) ? raw.labels.results : [];
  for (const [id, frozenTarget] of targets) {
    const node = report.nodes.find((item) => item.textNodeId === id);
    const declaration = declarations.get(id);
    const required = declaration?.required_resources?.map((item) => item.path).sort();
    if (!required || !isDeepStrictEqual([...report.fontResources.map((entry) => entry.path)].sort(), required)) {
      throw new WorkflowError(`文字节点 ${id} 的试装字体资源未绑定声明`);
    }
    const sources = sourceNodes.filter((entry) => entry?.textNodeId === id);
    const measurements = sources.length === 1 && Array.isArray(sources[0].measurements) ? sources[0].measurements : [];
    for (const item of node.cases) {
      const matches = measurements.filter((entry) => entry?.caseId === item.content_case_id);
      const source = matches.length === 1 ? matches[0] : null;
      if (!source || source.content !== item.actual_content || source.locale !== item.actual_locale
        || !isDeepStrictEqual(source.inputs, item.actual_inputs) || !isDeepStrictEqual(source.fixtureContentSource, item.actual_content_source)
        || !isDeepStrictEqual(source.actualBounds, item.actual_bounds) || !isDeepStrictEqual(source.glyphBounds, item.glyph_bounds)
        || !isDeepStrictEqual(source.baseline, item.baseline) || source.fontLoaded !== item.font_loaded
        || source.fallbackDetected !== item.fallback_detected || source.visible !== item.actual_visible
        || item.renderer !== 'bitmap-text' || item.actual_geometry_unit !== 'logical-px' || item.actual_coordinate_space !== 'viewport-logical'
        || item.actual_test_id !== frozenTarget.planned_test_id
        || !isDeepStrictEqual(item.actual_font_resources, report.fontResources.map((entry) => entry.path))) {
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
  }
}

/** 按用例核对冻结内容和可见性，防止试装决议改写 V3 文字预期。 */
function collectApprovedCases(report, targets) {
  const approved = new Map();
  for (const [id, target] of targets) {
    const node = report.nodes.find((item) => item.textNodeId === id);
    if (!Array.isArray(node?.cases) || !node.cases.length) throw new WorkflowError(`文字节点 ${id} 缺少试装用例`);
    const cases = new Map(node.cases.map((item) => [item?.content_case_id, item]));
    if (cases.size !== node.cases.length || node.cases.some((item) => !item?.content_case_id || CASE_FIELDS.some((field) => item[field] === undefined)
      || item.actual_test_id !== target.planned_test_id || item.font_loaded !== true || item.fallback_detected !== false || item.actual_visible !== true)) {
      throw new WorkflowError(`文字节点 ${id} 的试装用例重复或实际读数不完整`);
    }
    for (const item of target.content_cases ?? []) {
      const actual = cases.get(item.case_id);
      if (!actual || actual.actual_content !== item.expected_content || actual.actual_locale !== item.locale
        || !isDeepStrictEqual(actual.actual_inputs, item.inputs) || !isDeepStrictEqual(actual.actual_content_source, item.content_source)) {
        throw new WorkflowError(`文字节点 ${id} 的试装用例 ${item.case_id} 未绑定冻结内容`);
      }
    }
    if (!node.cases.some((item) => sameMeasurement(node.measurement, item))) throw new WorkflowError(`文字节点 ${id} 的主要读数未绑定试装用例`);
    approved.set(id, { cases: node.cases });
  }
  return approved;
}

/** 通用原始格式逐节点核对运行消费者、字体及原始读数。 */
function verifyPortableReadback(repo, work, report, raw, identity, screenshot, declarations) {
  if (!matchesVisualAcceptance(raw, { ...identity, schemaVersion: 'visual-text-readback/1.0', visualStage: 'V4',
    measurementSource: 'runtime-component', runId: report.runId, screenshotRef: screenshot,
    formalIntegration: report.formalIntegration, fontResources: report.fontResources })
    || !Array.isArray(raw.nodes) || !Array.isArray(report.fontResources)) throw new WorkflowError('原始试装读数未绑定同次运行和确认截图');
  const nodes = new Map(raw.nodes.map((node) => [node?.textNodeId, node]));
  if (nodes.size !== raw.nodes.length || nodes.size !== report.nodes.length) throw new WorkflowError('原始试装读数的文字节点范围不一致');
  const fontKeys = new Set();
  for (const font of report.fontResources) {
    readVisualAcceptanceFile(repo, work, font, '试装字体资源');
    const key = fileIdentityKey(repo, font.path);
    if (fontKeys.has(key)) throw new WorkflowError('试装字体资源重复');
    fontKeys.add(key);
  }
  for (const node of report.nodes) {
    const id = node.textNodeId;
    const source = nodes.get(id);
    if (source?.layoutNodeId !== node.layoutNodeId || source?.componentPath !== node.componentPath || !Array.isArray(source?.cases)) {
      throw new WorkflowError(`文字节点 ${id} 未绑定原始读数的正式组件`);
    }
    const rawCases = new Map(source.cases.map((item) => [item?.content_case_id, item]));
    if (rawCases.size !== source.cases.length || rawCases.size !== node.cases.length) throw new WorkflowError(`文字节点 ${id} 的原始读数用例范围不一致`);
    const declaration = declarations.get(id);
    const required = declaration?.required_resources ?? declaration?.requiredResources ?? [];
    if (!Array.isArray(required)) throw new WorkflowError(`文字节点 ${id} 的字体资源声明无效`);
    const declaredKeys = required.map((item) => fileIdentityKey(repo, item?.path)).sort();
    for (const item of node.cases) {
      if (!sameMeasurement(rawCases.get(item.content_case_id), item)) throw new WorkflowError(`文字节点 ${id} 的用例 ${item.content_case_id} 未绑定原始读数`);
      if (!Array.isArray(item.actual_font_resources)) throw new WorkflowError(`文字节点 ${id} 的字体资源读数无效`);
      const actualKeys = item.actual_font_resources.map((path) => fileIdentityKey(repo, path)).sort();
      if (new Set(actualKeys).size !== actualKeys.length || !isDeepStrictEqual(actualKeys, declaredKeys) || actualKeys.some((key) => !fontKeys.has(key))) {
        throw new WorkflowError(`文字节点 ${id} 的试装字体资源未绑定声明`);
      }
    }
  }
}

/** 载入共用文字决议，并验证已绑定的原始证据可供 V5 直接复验。 */
export function readApprovedTextTrial(repo, work, target, restored, targets, manifest) {
  const { review, report } = restored;
  const ref = review.textAcceptanceRef;
  if (ref === undefined) return null;
  const { decision, identity, screenshot } = readV4AcceptanceDecision(repo, work, target, review, ref, 'visual-text-acceptance/1.0');
  if (!isDeepStrictEqual(decision.textRestorationRef, restored.ref) || !isDeepStrictEqual(report.acceptedScreenshot, screenshot)) {
    throw new WorkflowError('文字试装决议未绑定同一份回读报告和已确认截图');
  }
  const raw = readVisualAcceptanceJson(repo, work, report.rawReadback, '原始试装读数');
  const decomposition = manifest.scene_reconstruction_contract;
  const text = decomposition?.text_decomposition ?? decomposition?.textDecomposition;
  const declarations = new Map((text?.text_nodes ?? text?.textNodes ?? []).map((node) => [node.text_node_id ?? node.textNodeId ?? node.id, node]));
  const approved = collectApprovedCases(report, targets);
  if (work.stack === 'cocos') verifyCocosReadback(repo, work, target, report, raw, targets, declarations, screenshot);
  else verifyPortableReadback(repo, work, report, raw, identity, screenshot, declarations);
  return approved;
}

/** V5 必须从同一目标的新运行批次复验每个已确认文字用例。 */
export function verifyApprovedTextRuntime(repo, work, identity, trialRunId, runtimeRef, approved) {
  const current = readVisualAcceptanceJson(repo, work, runtimeRef, 'V5 文字运行读数');
  if (!matchesVisualAcceptance(current, { ...identity, visualStage: 'V5', measurementSource: 'runtime-component' })
    || typeof current.runId !== 'string' || !current.runId.trim() || current.runId === trialRunId || !Array.isArray(current.nodes)) {
    throw new WorkflowError('V5 必须独立采集同一目标的正式运行文字');
  }
  for (const [id, trial] of approved) {
    const nodes = current.nodes.filter((entry) => entry?.textNodeId === id);
    const cases = nodes.length === 1 && Array.isArray(nodes[0].cases) ? nodes[0].cases : [];
    for (const expected of trial.cases) {
      const matches = cases.filter((item) => item?.content_case_id === expected.content_case_id);
      if (matches.length !== 1 || !sameMeasurement(matches[0], expected)) {
        throw new WorkflowError(`V5 文字节点 ${id} 的用例 ${expected.content_case_id} 未复验已确认试装`);
      }
    }
  }
}
