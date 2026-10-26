import { GATES, PROTECTED_ACTIONS, STAGES, TRANSITIONS, VERSION, VISUAL_STAGES } from './constants.mjs';
import { statSync } from 'node:fs';
import { readJson, requireFile, repoPath, WorkflowError } from './io.mjs';
import { assertOwnedPath, loadProfile, pathMatch, requireOneOf, requireText } from './validation.mjs';
import { buildExecutionBatches } from './execution-batches.mjs';
import { assertWorkflowPolicy } from './task-policy.mjs';
import { assertVisualReuse } from './visual-reuse-binding.mjs';

const WORK_SOURCE_PATHS = new WeakMap();
const PACKAGE_FIELDS = new Set(['schemaVersion', 'workItemId', 'stack', 'workItemType', 'visualStage', 'executionUnits']);
const UNIT_FIELDS = new Set(['unitId', 'sequence', 'type', 'owner', 'paths', 'resultPath', 'acceptanceCommands', 'parallelGroup', 'dependsOn']);

/** 跨栈美术检查记录的固定维度，便于直接比较候选和实装资源。 */
export const ART_QUALITY_DIMENSIONS = Object.freeze([
  'themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion',
]);
/** AI 位图生产记录需要逐项回应的生成瑕疵查漏维度。 */
const ANTI_AI_DIMENSIONS = Object.freeze([
  'structure-fidelity', 'intentional-detail', 'material-lighting', 'series-consistency',
  'ui-specificity', 'product-character', 'edge-quality', 'integration-cohesion',
]);

/** 在内存中登记已验证 Work Item 的真实文件位置，不扩展持久化 Work schema。 */
export function bindWorkSource(work, relativePath) {
  if (work && typeof work === 'object') WORK_SOURCE_PATHS.set(work, relativePath);
  return work;
}

/** 要求项目引用存在且与当前工作栈、实施包绑定。 */
export function loadPackage(repo, work) {
  if (!work.implementationPackageRef?.path) throw new WorkflowError('尚未绑定 implementationPackageRef');
  const pack = readJson(repo, work.implementationPackageRef.path, 'Implementation Package');
  assertAllowedFields(pack, PACKAGE_FIELDS, 'Implementation Package');
  if (pack.schemaVersion !== VERSION || pack.workItemId !== work.workItemId || pack.stack !== work.stack || pack.workItemType !== work.workItemType) {
    throw new WorkflowError('Implementation Package 版本、工作项或技术栈错绑');
  }
  if (work.visual && pack.visualStage !== work.visual.stage) throw new WorkflowError('Implementation Package.visualStage 与当前视觉阶段不匹配');
  if (!Array.isArray(pack.executionUnits) || !pack.executionUnits.length) throw new WorkflowError('Implementation Package.executionUnits 不能为空');
  const profile = loadProfile(repo, work.stack);
  const seen = new Set();
  pack.executionUnits.forEach((unit, index) => {
    assertAllowedFields(unit, UNIT_FIELDS, `executionUnits[${index}]`);
    requireText(unit.unitId, `executionUnits[${index}].unitId`);
    requireText(unit.owner, `executionUnits[${index}].owner`);
    if (seen.has(unit.unitId)) throw new WorkflowError(`executionUnits.unitId 重复：${unit.unitId}`);
    seen.add(unit.unitId);
    if (unit.sequence !== index + 1) throw new WorkflowError(`executionUnits[${index}] sequence 必须从 1 开始连续递增`);
    requireOneOf(unit.type, ['SHARED', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'], `executionUnits[${index}].type`);
    if (!Array.isArray(unit.paths) || !unit.paths.length) throw new WorkflowError(`executionUnits[${index}].paths 不能为空`);
    unit.paths = unit.paths.map((path) => assertOwnedPath(repo, work, profile, path));
    if (!Array.isArray(unit.acceptanceCommands) || !unit.acceptanceCommands.length) throw new WorkflowError(`executionUnits[${index}].acceptanceCommands 不能为空`);
    unit.acceptanceCommands.forEach((command) => requireText(command, `executionUnits[${index}].acceptanceCommands`));
    const resultPath = repoPath(repo, unit.resultPath, `executionUnits[${index}].resultPath`).relative;
    unit.resultPath = resultPath;
    const evidenceRoot = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
    if (!pathMatch(resultPath, `${evidenceRoot}/**`)) throw new WorkflowError(`executionUnits[${index}].resultPath 必须位于 evidenceRoot`);
  });
  const typed = new Set(pack.executionUnits.map((unit) => unit.type).filter((type) => ['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(type)));
  if (typed.size > 1) throw new WorkflowError('SCENE/PAGE/DISPLAY_LAYER 不能混入同一实施包');
  assertUniqueResultPaths(repo, pack.executionUnits);
  assertResultPathsAvoidReservedFiles(repo, work, pack.executionUnits);
  buildExecutionBatches(pack.executionUnits, { repo });
  assertWorkflowPolicy(work, pack);
  return pack;
}

/** 拒绝 Schema additionalProperties=false 范围以外的隐式旧字段或拼写错误。 */
function assertAllowedFields(value, allowedFields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须为对象`);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) throw new WorkflowError(`${label} 包含不支持字段：${field}`);
  }
}

/** 规范化所有结果路径，并拒绝同文件、父子路径或 Windows 大小写别名。 */
function assertUniqueResultPaths(repo, units) {
  const results = [];
  for (const unit of units) {
    const path = repoPath(repo, unit.resultPath, `executionUnits.${unit.unitId}.resultPath`).relative;
    const key = process.platform === 'win32' ? path.toLowerCase() : path;
    for (const prior of results) {
      if (pathsOverlap(key, prior.key)) {
        throw new WorkflowError(`执行单元结果路径冲突：${prior.unitId} (${prior.path}) 与 ${unit.unitId} (${path})`);
      }
    }
    results.push({ unitId: unit.unitId, path, key });
  }
}

/** 防止单元结果覆盖 Work、实施包、证据引用或控制器执行状态文件。 */
function assertResultPathsAvoidReservedFiles(repo, work, units) {
  const evidenceRoot = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
  const reserved = [`${evidenceRoot}/execution-state.json`];
  const workSource = WORK_SOURCE_PATHS.get(work);
  if (workSource) reserved.push(workSource);
  for (const path of collectWorkReferencePaths(work)) reserved.push(path);

  const normalizedReserved = reserved.map((path) => ({
    path: repoPath(repo, path, 'Work Item 保留文件引用').relative,
  }));
  for (const unit of units) {
    const resultPath = repoPath(repo, unit.resultPath, `executionUnits.${unit.unitId}.resultPath`).relative;
    const resultKey = process.platform === 'win32' ? resultPath.toLowerCase() : resultPath;
    for (const entry of normalizedReserved) {
      const reservedKey = process.platform === 'win32' ? entry.path.toLowerCase() : entry.path;
      if (pathsOverlap(resultKey, reservedKey)) {
        throw new WorkflowError(`执行单元结果路径与保留控制文件冲突：${unit.unitId} (${resultPath}) / ${entry.path}`);
      }
    }
  }
}

/** 收集 Work Item 当前引用和失效记录中的文件路径，避免结果覆写被引用文件。 */
function collectWorkReferencePaths(work) {
  const paths = [];
  const collect = (reference) => {
    if (typeof reference?.path === 'string' && reference.path.trim()) paths.push(reference.path);
  };
  for (const name of ['implementationPackageRef', 'evidenceRef', 'globalVisualBaselineRef', 'assetReviewRef', 'grillingRef', 'planningRef']) {
    collect(work[name]);
  }
  for (const reference of Object.values(work.visual?.reviews ?? {})) collect(reference);
  for (const reference of work.invalidatedRefs ?? []) collect(reference);
  for (const reference of work.returnRecord?.invalidatedRefs ?? []) collect(reference);
  return paths;
}

/** 检查两个文件路径是否相同或存在父子文件冲突。 */
function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

/** 校验候选工作项的执行单元结果、命令输出及证据归属。 */
export function validateUnitResult(repo, work, pack, unit, result) {
  if (!result || result.schemaVersion !== VERSION || result.status !== 'PASS') throw new WorkflowError('执行结果必须绑定 schemaVersion 1.0 且真实状态 PASS');
  for (const [field, expected] of Object.entries({
    workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: work.implementationPackageRef.path,
    unitId: unit.unitId, sequence: unit.sequence,
  })) if (result[field] !== expected) throw new WorkflowError(`执行结果.${field} 未绑定当前工作项和单元`);
  if (result.exitCode !== 0) throw new WorkflowError('执行单元退出码必须为 0');
  if (!Array.isArray(result.files) || !result.files.length) throw new WorkflowError('执行结果必须列出实际变更文件');
  const profile = loadProfile(repo, work.stack);
  result.files.forEach((path) => {
    const normalized = assertOwnedPath(repo, work, profile, path);
    if (!unit.paths.some((owned) => pathMatch(normalized, owned))) throw new WorkflowError(`执行结果越过单元 ${unit.unitId} 的文件所有权：${normalized}`, 'UNIT_PATH_OUT_OF_SCOPE');
    requireFile(repo, path, '执行结果中报告的交付文件');
  });
  if (!Array.isArray(result.commandOutputs) || result.commandOutputs.length !== unit.acceptanceCommands.length) {
    throw new WorkflowError('验收命令实际输出必须与声明命令一一对应');
  }
  for (const [index, entry] of result.commandOutputs.entries()) {
    if (entry.command !== unit.acceptanceCommands[index]) throw new WorkflowError(`第 ${index + 1} 项验收命令与 Implementation Package 不匹配`);
    if (entry.exitCode !== 0) throw new WorkflowError(`第 ${index + 1} 项验收命令失败`);
    requireText(entry.outputFile, `commandOutputs[${index}].outputFile`);
    const path = requireNonEmptyFile(repo, entry.outputFile, '验收命令真实输出文件');
    const root = repoPath(repo, work.evidenceRoot).relative;
    if (!pathMatch(path, `${root}/**`)) throw new WorkflowError('验收命令输出文件必须保存在当前 evidenceRoot');
  }
  return result;
}

/** 校验证据文件和 profile 对应的机器证据类别是否真正存在。 */
export function validateEvidence(repo, work, { requireEngineering = true, requireVisual = false } = {}) {
  if (!work.evidenceRef?.path) throw new WorkflowError('尚未绑定 evidenceRef');
  const manifest = readJson(repo, work.evidenceRef.path, 'Evidence Manifest');
  const pack = loadPackage(repo, work);
  if (manifest.schemaVersion !== VERSION || manifest.workItemId !== work.workItemId || manifest.stack !== work.stack) {
    throw new WorkflowError('Evidence Manifest 版本、工作项或技术栈错绑');
  }
  if (manifest.implementationPackageRef !== work.implementationPackageRef.path) throw new WorkflowError('Evidence Manifest 实施包错绑');
  if (work.visual && manifest.visualStage !== work.visual.stage) throw new WorkflowError('Evidence Manifest.visualStage 与当前视觉阶段不匹配');
  if (!Array.isArray(manifest.items)) throw new WorkflowError('Evidence Manifest.items 必须为数组');
  const profile = loadProfile(repo, work.stack);
  const validItems = manifest.items.filter((item) => {
    if (!item || item.status !== 'PASS' || typeof item.category !== 'string' || typeof item.path !== 'string') return false;
    assertEvidenceRoot(repo, work, item.path);
    return true;
  });
  if (!validItems.length) throw new WorkflowError('Evidence Manifest 必须包含真实存在的 PASS 证据文件');
  if (requireEngineering) requireKinds(profile.evidenceRequirements.engineering, validItems, 'engineering');
  if (requireVisual) requireKinds(profile.evidenceRequirements.visual, validItems, 'visual');
  if (work.visual?.stage === 'V3' && profile.evidenceRequirements.assetImport?.length) {
    requireKinds(profile.evidenceRequirements.assetImport, validItems, 'assetImport');
  }
  return { manifest, pack };
}

/** 检查 Evidence item 的路径必须位于 evidenceRoot 且真实存在。 */
function assertEvidenceRoot(repo, work, value) {
  const path = requireNonEmptyFile(repo, value);
  const root = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
  if (!pathMatch(path, `${root}/**`)) throw new WorkflowError(`Evidence 路径越出 evidenceRoot：${path}`);
}

/** profile 声明的每一类证据均需有 PASS 文件，不认空壳记录。 */
function requireKinds(required, items, label) {
  for (const category of required) {
    const found = items.some((item) => item.category === category);
    if (!found) throw new WorkflowError(`${label} 缺少 profile 要求的证据类别：${category}`);
  }
}

/** 校验人工验收记录绑定唯一对象、阶段与用户消息来源。 */
export function validateHumanReview(repo, ref, { objectId, stage, purpose, candidateId, requireTarget = false, requireQuality = false } = {}) {
  if (!ref?.path) throw new WorkflowError(`${purpose} 尚未记录人工验收`);
  const record = readJson(repo, ref.path, `${purpose}人工记录`);
  if (record.schemaVersion !== VERSION || record.objectId !== objectId || record.stage !== stage || record.purpose !== purpose) {
    throw new WorkflowError(`${purpose} 人工记录身份或阶段错绑`);
  }
  requireOneOf(record.decision, ['APPROVED', 'REJECTED'], `${purpose}.decision`);
  requireText(record.userMessageRef, `${purpose}.userMessageRef`);
  if (candidateId !== undefined && record.candidateId !== candidateId) throw new WorkflowError(`${purpose}.candidateId 未绑定已选候选`);
  if (requireQuality || record.qualityChecks !== undefined) validateQualityChecks(repo, record.qualityChecks, `${purpose}.qualityChecks`);
  if (record.decision !== 'APPROVED') throw new WorkflowError(`${purpose} 未获用户确认`);
  if (requireTarget) {
    requireText(record.targetRef, `${purpose}.targetRef`);
    requireNonEmptyFile(repo, record.targetRef, `${purpose} 已确认目标`);
  }
  return record;
}

/** 确保未决 grilling 对象不会经状态或证据门绕过。 */
export function assertNoOpenGrilling(repo, work) {
  if (!work.grillingRef?.path) return;
  const record = readJson(repo, work.grillingRef.path, 'Grilling Record');
  if (record.schemaVersion !== VERSION || record.workItemId !== work.workItemId) throw new WorkflowError('Grilling Record 版本或工作项错绑');
  if (record.status === 'OPEN') throw new WorkflowError('存在未决拷问，受影响工作停止');
  if (!['CLOSED', 'NOT_REQUIRED'].includes(record.status)) throw new WorkflowError('Grilling Record.status 必须为 OPEN/CLOSED/NOT_REQUIRED');
  if (record.status === 'CLOSED') {
    requireText(record.userMessageRef, 'Grilling Record.userMessageRef');
    if (!Array.isArray(record.decisions) || !record.decisions.length) throw new WorkflowError('Grilling Record.CLOSED 必须记录用户已经回答的实质决策');
    for (const [index, decision] of record.decisions.entries()) {
      requireText(decision.question, `Grilling decisions[${index}].question`);
      requireText(decision.answer, `Grilling decisions[${index}].answer`);
      requireText(decision.userMessageRef, `Grilling decisions[${index}].userMessageRef`);
    }
  }
}

/** 校验正式资源的技术导入和人工视觉评审都已完成。 */
export function assertAssetReview(repo, work) {
  if (!work.assetReviewRef?.path) throw new WorkflowError('V3/V4 需要绑定 assetReviewRef');
  const record = readJson(repo, work.assetReviewRef.path, 'Asset Review');
  if (record.schemaVersion !== VERSION || record.workItemId !== work.workItemId || record.stack !== work.stack || record.visualStage !== 'V3' || record.candidateId !== work.visual.candidateId) {
    throw new WorkflowError('Asset Review 版本、工作项、技术栈或视觉阶段错绑');
  }
  for (const field of ['technicalStatus', 'humanStatus']) {
    if (record[field] !== 'PASS') throw new WorkflowError(`Asset Review.${field} 必须通过`);
  }
  requireText(record.userMessageRef, 'Asset Review.userMessageRef');
  requireText(record.candidateId, 'Asset Review.candidateId');
  validateQualityChecks(repo, record.qualityChecks, 'Asset Review.qualityChecks');
  if (!Array.isArray(record.assets) || !record.assets.length) throw new WorkflowError('Asset Review.assets 必须包含最终资源或原生组件');
  for (const asset of record.assets) {
    requireText(asset.assetId, 'Asset Review asset.assetId');
    if (asset.assetType === 'native-component') {
      requireText(asset.output, '原生组件产物');
      requireNonEmptyFile(repo, asset.output, '原生组件产物');
      requireText(asset.componentEvidenceRef, '原生组件检查证据');
      requireNonEmptyFile(repo, asset.componentEvidenceRef, '原生组件检查证据');
      continue;
    }
    if (asset.assetType !== 'image') throw new WorkflowError(`未知 Asset Review assetType：${asset.assetType}`);
    requireText(asset.output, 'Asset Review asset.output');
    requireNonEmptyFile(repo, asset.output, '正式图片资源');
    requireText(asset.sourceRef, 'Asset Review asset.sourceRef');
    requireOneOf(asset.sourceKind, ['ai-generated', 'hand-authored', 'licensed', 'existing'], 'Asset Review asset.sourceKind');
    if (asset.sourceKind === 'ai-generated') {
      requireText(asset.generationRecord, 'AI 图片生成记录');
      requireNonEmptyFile(repo, asset.generationRecord, 'AI 图片生成记录');
      validateAntiAiChecks(repo, asset.antiAiChecks, asset.assetId);
    }
  }
  return record;
}

/** 技术成果和人的风格检查各有自己的证据，不能以生成成功推断审美通过。 */
export function validateGlobalBaseline(repo, work) {
  if (!work.globalVisualBaselineRef?.path) {
    if (work.visualBaselineRequired) throw new WorkflowError('当前工作项要求视觉基线但没有 globalVisualBaselineRef');
    return;
  }
  const record = readJson(repo, work.globalVisualBaselineRef.path, 'Global Visual Baseline');
  if (record.schemaVersion !== VERSION || record.baselineId === undefined || record.projectId !== work.projectId || record.stack !== work.stack) throw new WorkflowError('视觉基线版本、项目或技术栈错绑');
  if (!Array.isArray(record.candidates) || record.candidates.length !== 3) throw new WorkflowError('首次全局视觉基线必须有三张候选');
  if (new Set(record.candidates.map((candidate) => candidate.candidateId)).size !== 3) throw new WorkflowError('三张视觉候选必须各自有唯一身份');
  for (const candidate of record.candidates) {
    requireText(candidate.candidateId, '候选ID');
    requireNonEmptyFile(repo, candidate.path, '视觉候选');
    validateQualityChecks(repo, candidate.qualityChecks, `视觉候选 ${candidate.candidateId}.qualityChecks`, {
      requirePass: candidate.candidateId === record.selectedCandidateId,
    });
  }
  const chosen = record.candidates.filter((candidate) => candidate.candidateId === record.selectedCandidateId);
  if (chosen.length !== 1) throw new WorkflowError('视觉基线必须唯一选择候选');
  requireText(record.baselineId, 'Global Visual Baseline.baselineId');
  validateHumanReview(repo, record.selectionReviewRef, { objectId: record.baselineId, stage: 'BASELINE', purpose: 'visual-baseline', candidateId: record.selectedCandidateId, requireQuality: true });
}

/** 五项视觉质量维度均需明确 PASS 并附真实可读取的证据文件。 */
function validateQualityChecks(repo, checks, label, { requirePass = true } = {}) {
  if (!Array.isArray(checks) || checks.length !== ART_QUALITY_DIMENSIONS.length) throw new WorkflowError(`${label} 必须恰好包含五项视觉质量维度`);
  for (const [index, dimension] of ART_QUALITY_DIMENSIONS.entries()) {
    const check = checks.find((item) => item.dimension === dimension);
    if (!check || !['PASS', 'FAIL', 'NOT_RUN'].includes(check.status)) throw new WorkflowError(`${label} 缺少视觉维度状态 ${dimension}`);
    if (requirePass && check.status !== 'PASS') throw new WorkflowError(`${label}.${dimension} 尚未 PASS`);
    if (check.status === 'PASS' || check.evidenceRef) requireNonEmptyFile(repo, check.evidenceRef, `${label}.${dimension}.evidenceRef`);
  }
}

/** 核对 AI 图片审阅的查漏清单、适用理由与外部记录文件。 */
function validateAntiAiChecks(repo, checks, assetId) {
  if (!Array.isArray(checks) || checks.length !== ANTI_AI_DIMENSIONS.length) throw new WorkflowError(`${assetId} 必须逐项记录八项生成瑕疵检查`);
  for (const id of ANTI_AI_DIMENSIONS) {
    const check = checks.find((item) => item.id === id);
    if (!check || !['PASS', 'NOT_APPLICABLE'].includes(check.status)) throw new WorkflowError(`${assetId} 的 ${id} 检查尚未通过`);
    if (check.status === 'PASS') requireNonEmptyFile(repo, check.evidenceRef, `${assetId} ${id} 检查证据`);
    else requireText(check.reason, `${assetId} ${id} 不适用原因`);
  }
}

/** 图片、截图或命令输出需要非空，避免以空文件伪装有效证据。 */
function requireNonEmptyFile(repo, value, label) {
  const path = requireFile(repo, value, label);
  const size = statSync(repoPath(repo, path).absolute).size;
  if (size === 0) throw new WorkflowError(`${label} 是空文件：${path}`, 'EMPTY_EVIDENCE');
  return path;
}

/** 记录已授权动作的精确用户决策引用；并不执行动作或验证用户身份。 */
export function hasPreciseApproval(work) {
  const action = work.action;
  if (!action?.effects?.some((effect) => PROTECTED_ACTIONS.has(effect))) return true;
  const approval = action.approval;
  if (!approval || approval.workItemId !== work.workItemId || approval.stack !== work.stack || approval.stageId !== work.stageId ||
      approval.actionId !== action.actionId || approval.target !== action.target || !approval.userMessageRef) return false;
  const expectedEffects = [...action.effects].filter((effect) => PROTECTED_ACTIONS.has(effect)).sort();
  const approvedEffects = Array.isArray(approval.effects) ? [...approval.effects].sort() : [];
  return JSON.stringify(expectedEffects) === JSON.stringify(approvedEffects);
}

/** 校验六阶段、对象类型、拷问、基线及审批的共同迁移边界。 */
export function assertTransitionInputs(repo, work, to) {
  requireOneOf(to, Object.keys(TRANSITIONS).concat(['RETURN']), '目标全局状态');
  assertNoOpenGrilling(repo, work);
  validateGlobalBaseline(repo, work);
  assertVisualReuse(repo, work);
  if (to !== 'RELEASE_APPROVAL_REQUIRED' && work.action?.effects?.some((effect) => PROTECTED_ACTIONS.has(effect)) && !hasPreciseApproval(work)) {
    throw new WorkflowError('外部写入、设备、签名、上传、发布、付费或破坏性动作需要当前对象的明确用户批准引用', 'APPROVAL_REQUIRED');
  }
  if (to === 'RELEASE_APPROVAL_REQUIRED' && (!work.action?.effects?.includes('publish') || !work.action?.target)) {
    throw new WorkflowError('发布流程必须先绑定具体发布动作与目标；该状态会等待用户批准', 'APPROVAL_REQUIRED');
  }
  if (STAGES.indexOf(work.stageId) < 0) throw new WorkflowError('Work Item.stageId 无效');
  return to;
}

/** F0-F3 通过才可越过生产实现阶段，F4 专用于明确受控副作用。 */
export function assertGates(work, gates) {
  const missing = gates.filter((gate) => !GATES.includes(gate) || work.gateStatus[gate] !== 'PASS');
  if (missing.length) throw new WorkflowError(`状态迁移缺少已通过的质量门：${missing.join(', ')}`, 'GATE_BLOCKED');
}

/** 视觉人工确认按唯一对象与阶段绑定，V2 拆解和布局必须分别确认。 */
export function assertVisualReview(repo, work, stage) {
  if (!work.visual) return;
  const reviews = work.visual.reviews ?? {};
  if (stage === 'V1') {
    requireText(work.visual.candidateId, 'visual.candidateId');
    validateHumanReview(repo, reviews.V1, { objectId: work.visual.objectId, stage: 'V1', purpose: 'target', candidateId: work.visual.candidateId, requireTarget: true, requireQuality: true });
  }
  if (stage === 'V2') {
    validateHumanReview(repo, reviews.V2Decomposition, { objectId: work.visual.objectId, stage: 'V2', purpose: 'decomposition', candidateId: work.visual.candidateId, requireTarget: true });
    validateHumanReview(repo, reviews.V2Layout, { objectId: work.visual.objectId, stage: 'V2', purpose: 'layout', candidateId: work.visual.candidateId, requireTarget: true });
  }
  if (stage === 'V3') {
    const assetRecord = assertAssetReview(repo, work);
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: false });
    const review = validateHumanReview(repo, reviews.V3, { objectId: work.visual.objectId, stage: 'V3', purpose: 'imported-assets', candidateId: work.visual.candidateId });
    if (review.userMessageRef !== assetRecord.userMessageRef) throw new WorkflowError('V3 阶段确认必须绑定资产评审已记录的用户消息');
  }
  if (stage === 'V4') {
    assertAssetReview(repo, work);
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: true });
    validateHumanReview(repo, reviews.V4, { objectId: work.visual.objectId, stage: 'V4', purpose: 'runtime-acceptance', candidateId: work.visual.candidateId });
  }
}

/** 根据当前门禁判定产品质量和证据是否允许完成。 */
export function assertReadyToPass(repo, work) {
  assertVisualReuse(repo, work);
  if (work.visual && ['V0', 'V1', 'V2'].includes(work.visual.stage)) {
    assertGates(work, ['F0', 'F1']);
    if (work.visual.stage === 'V1') assertVisualReview(repo, work, 'V1');
    if (work.visual.stage === 'V2') assertVisualReview(repo, work, 'V2');
    validateGlobalBaseline(repo, work);
    return;
  }
  assertGates(work, ['F0', 'F1', 'F2', 'F3']);
  if (work.visual && work.visual.stage === 'V3') {
    assertVisualReview(repo, work, 'V3');
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: false });
  } else {
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: Boolean(work.visual) });
    if (work.visual) assertVisualReview(repo, work, 'V4');
  }
  validateGlobalBaseline(repo, work);
}

/** 最终整项关闭必须完成所有用户可见对象的 V4 展示与人工验收。 */
export function assertFinalCompletion(repo, work) {
  if (work.visual && work.visual.stage !== 'V4') throw new WorkflowError('最终关闭前，可见 PAGE/SCENE/DISPLAY_LAYER 必须到达 V4');
  assertReadyToPass(repo, work);
  if (work.workItemType === 'RELEASE') {
    if (work.releaseIntent === 'prepare') assertReleasePreparation(repo, work);
    else if (work.releaseIntent === 'publish') assertReleaseResult(repo, work);
    else throw new WorkflowError('RELEASE 工作项必须明确 releaseIntent=prepare|publish');
  }
}

/** 准备模式以独立材料证明发布就绪，不把准备记录等同于实际发布。 */
function assertReleasePreparation(repo, work) {
  const { manifest, pack } = validateEvidence(repo, work, { requireEngineering: true });
  const matches = manifest.items.filter((entry) => entry.category === 'release-preparation' && entry.status === 'PASS');
  if (matches.length !== 1) throw new WorkflowError('Evidence Manifest 必须唯一包含 PASS 的 release-preparation 结果', 'RELEASE_PREPARATION_REQUIRED');

  const resultPath = requireNonEmptyFile(repo, matches[0].path, 'Release Preparation');
  const result = readJson(repo, resultPath, 'Release Preparation');
  for (const [field, expected] of Object.entries({
    schemaVersion: VERSION, status: 'PASS', workItemId: work.workItemId,
    stack: work.stack, stageId: 'release',
  })) {
    if (result[field] !== expected) throw new WorkflowError(`Release Preparation.${field} 未绑定当前准备工作项`);
  }

  requireText(result.deliverablePath, 'Release Preparation.deliverablePath');
  requireText(result.evidencePath, 'Release Preparation.evidencePath');
  const deliverable = requireNonEmptyFile(repo, result.deliverablePath, '发布准备交付材料');
  const evidence = requireNonEmptyFile(repo, result.evidencePath, '发布准备检查证据');
  const evidenceRoot = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
  const manifestPath = repoPath(repo, work.evidenceRef.path, 'Evidence Manifest').relative;
  const key = (path) => process.platform === 'win32' ? path.toLowerCase() : path;
  const reservedMaterials = new Set([key(resultPath), key(manifestPath)]);
  const workSource = WORK_SOURCE_PATHS.get(work);
  if (workSource) reservedMaterials.add(key(repoPath(repo, workSource, 'Work Item 源文件').relative));
  reservedMaterials.add(key(repoPath(repo, `${evidenceRoot}/execution-state.json`, '执行状态文件').relative));
  for (const path of collectWorkReferencePaths(work)) {
    reservedMaterials.add(key(repoPath(repo, path, 'Work Item 保留引用').relative));
  }
  for (const unit of pack.executionUnits) {
    reservedMaterials.add(key(repoPath(repo, unit.resultPath, `executionUnits.${unit.unitId}.resultPath`).relative));
  }

  if (!pathMatch(deliverable, `${evidenceRoot}/**`) || !pathMatch(evidence, `${evidenceRoot}/**`)) {
    throw new WorkflowError('发布准备交付材料和检查证据都必须位于当前 evidenceRoot');
  }
  if (key(deliverable) === key(evidence) || reservedMaterials.has(key(deliverable)) || reservedMaterials.has(key(evidence))) {
    throw new WorkflowError('发布准备材料不能使用 Work Item、控制记录、manifest、机器执行状态或单元结果文件');
  }
}

/** 发布完成必须有绑定当前动作、目标、批准消息和实际结果材料的证据。 */
function assertReleaseResult(repo, work) {
  if (work.globalState !== 'RELEASING' && work.globalState !== 'COMPLETE') {
    throw new WorkflowError('RELEASE 工作项只能在记录 RELEASING 后完成');
  }
  if (!work.action?.effects?.includes('publish') || !hasPreciseApproval(work)) {
    throw new WorkflowError('发布结果缺少当前发布动作的精确用户批准', 'APPROVAL_REQUIRED');
  }
  const { manifest } = validateEvidence(repo, work, { requireEngineering: true });
  const item = manifest.items.find((entry) => entry.category === 'release-result' && entry.status === 'PASS');
  if (!item) throw new WorkflowError('Evidence Manifest 缺少当前 release-result 发布结果', 'RELEASE_RESULT_REQUIRED');
  const result = readJson(repo, item.path, 'Release Result');
  const approval = work.action.approval;
  for (const [field, expected] of Object.entries({
    schemaVersion: VERSION, status: 'PASS', workItemId: work.workItemId, stack: work.stack,
    stageId: work.stageId, actionId: work.action.actionId, target: work.action.target,
    userMessageRef: approval.userMessageRef,
  })) {
    if (result[field] !== expected) throw new WorkflowError(`Release Result.${field} 未绑定当前已批准发布`);
  }
  requireText(result.releaseIdentifier, 'Release Result.releaseIdentifier');
  const resultEvidence = requireNonEmptyFile(repo, result.evidencePath, '发布完成证据');
  const evidenceRoot = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
  if (!pathMatch(resultEvidence, `${evidenceRoot}/**`) || resultEvidence === repoPath(repo, item.path).relative) {
    throw new WorkflowError('发布完成证据必须是 evidenceRoot 中独立的非空文件');
  }
}
