/** Unity 原生只读合同校验器；保留专业输入约束，不承担公共流程状态迁移。 */
import { isAbsolute, relative, resolve } from 'node:path';
import process from 'node:process';
import { ACTION_LEVEL, GATES, SCENE_STAGES, STATES, STAGES, UNIT_TYPES, approvalSnapshot, canonicalizePosixPath, enumValue, fail, gateStatuses, knownObject, normalizePattern, pathMatches, schemaVersion, stringArray } from './runtime/control-primitives.mjs';
import { assertVisibleContract, validateUnitDependencies, validateUnityOwnershipShape, validateVisibleEvidenceContract, validateVisibleImplementationPackage, validateVisibleWorkItemContract } from './runtime/visible-contract.mjs';
import { validateStageReviewsShape } from './runtime/stage-confirmation.mjs';
import { validateRiggingDeliveryEvidenceShape, validateRiggingDeliveryWorkItem } from './runtime/rigging-delivery-contract.mjs';
import { assertActiveReferences, validateReturnRecord } from './runtime/return-disposition.mjs';
import { validateResourceHandoffPackage } from './runtime/resource-handoff-evidence.mjs';

/** 校验并返回 Work Item 的只读规范化视图。 */
export function validateWorkItem(work) {
  const allowed = new Set(['schemaVersion', 'workItemId', 'projectId', 'workItemType', 'visualStageModel', 'moduleIds', 'domain', 'stageId', 'globalState', 'scene', 'displayLayer', 'responsiveContract', 'stageReviews', 'globalVisualBaselineSelectionRef', 'baselineId', 'baselineVersion', 'baselineHash', 'revision', 'objective', 'userOriginalText', 'inScope', 'outOfScope', 'approvedRequirements', 'allowedActions', 'allowedActionLevels', 'explicitApprovalActionLevels', 'prohibitedActions', 'allowedPaths', 'forbiddenPaths', 'allowedExternalTargets', 'protectedExternalTargets', 'requiredGates', 'gateStatus', 'assignedAgent', 'delegatedAgents', 'expectedOutputs', 'validationPlan', 'exitCriteria', 'nextGate', 'evidenceRoot', 'implementationPackage', 'implementationPackagePath', 'evidenceManifest', 'evidenceManifestPath', 'actionLevel', 'actionType', 'sideEffects', 'userDecisionRequired', 'decisionId', 'editorWriter', 'pendingApproval', 'approval', 'returnRecord', 'metadata', 'riggingDelivery']);
  knownObject(work, allowed, 'Work Item');
  schemaVersion(work, 'Work Item');
  for (const field of ['workItemId', 'projectId', 'baselineHash', 'objective']) if (typeof work[field] !== 'string' || !work[field].trim()) fail(`Work Item.${field} 必须为非空字符串`);
  if (!Number.isSafeInteger(work.revision) || work.revision < 0) fail('Work Item.revision 必须为不小于 0 的安全整数');
  enumValue(work.stageId, STAGES, 'Work Item.stageId');
  enumValue(work.globalState, STATES, 'Work Item.globalState');
  const moduleIds = stringArray(work.moduleIds, 'Work Item.moduleIds');
  const allowedPaths = stringArray(work.allowedPaths, 'Work Item.allowedPaths', true).map(normalizePattern);
  const forbiddenPaths = stringArray(work.forbiddenPaths, 'Work Item.forbiddenPaths').map(normalizePattern);
  for (const field of ['inScope', 'outOfScope', 'approvedRequirements', 'allowedActions', 'prohibitedActions', 'allowedExternalTargets', 'protectedExternalTargets', 'delegatedAgents', 'expectedOutputs', 'validationPlan', 'exitCriteria', 'sideEffects']) stringArray(work[field], `Work Item.${field}`);
  if (work.editorWriter !== undefined && (typeof work.editorWriter !== 'string' || !work.editorWriter.trim())) fail('Work Item.editorWriter 必须为非空字符串');
  const actionLists = [...stringArray(work.allowedActions, 'Work Item.allowedActions'), ...stringArray(work.prohibitedActions, 'Work Item.prohibitedActions')];
  for (const action of actionLists) {
    if (!/^unity-[a-z0-9-]+$/.test(action) || !ACTION_LEVEL[action]) fail(`未受控 Unity 动作：${action}`);
  }
  const actionLevelLists = stringArray(work.allowedActionLevels, 'Work Item.allowedActionLevels');
  const explicitLevels = stringArray(work.explicitApprovalActionLevels, 'Work Item.explicitApprovalActionLevels');
  for (const level of actionLevelLists) enumValue(level, ['A0', 'A1', 'A2', 'A3'], 'Work Item.allowedActionLevels');
  for (const level of explicitLevels) enumValue(level, ['A4', 'A5', 'A6'], 'Work Item.explicitApprovalActionLevels');
  const gates = gateStatuses(work.gateStatus, 'Work Item.gateStatus');
  const snapshot = approvalSnapshot(work);
  if (work.globalVisualBaselineSelectionRef !== undefined) {
    knownObject(work.globalVisualBaselineSelectionRef, new Set(['path']), 'globalVisualBaselineSelectionRef');
    canonicalizePosixPath(work.globalVisualBaselineSelectionRef.path, 'globalVisualBaselineSelectionRef.path');
  }
  const riggingErrors = validateRiggingDeliveryWorkItem(work, snapshot.actionType);
  if (riggingErrors.length) fail(riggingErrors[0], 2, { errorCode: 'RIGGING_DELIVERY_INVALID' });
  enumValue(snapshot.actionLevel, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], 'Work Item.actionLevel');
  if (ACTION_LEVEL[snapshot.actionType] && ACTION_LEVEL[snapshot.actionType] !== snapshot.actionLevel) fail(`动作等级与动作类型不一致：${snapshot.actionType} 只能使用 ${ACTION_LEVEL[snapshot.actionType]}`);
  if (work.allowedActions?.length && !work.allowedActions.includes(snapshot.actionType)) fail('当前 pending actionType 不在 Work Item.allowedActions 内');
  if (work.prohibitedActions?.includes(snapshot.actionType)) fail('当前 pending actionType 命中 prohibitedActions');
  if (work.scene !== undefined) {
    knownObject(work.scene, new Set(['sceneId', 'stage', 'status']), 'Work Item.scene');
    enumValue(work.scene.stage, SCENE_STAGES, 'Work Item.scene.stage');
    if (work.scene.status !== undefined) enumValue(work.scene.status, ['NOT_STARTED', 'IN_PROGRESS', 'PASS', 'FAIL', 'NOT_RUN'], 'Work Item.scene.status');
  }
  const stageReviewErrors = validateStageReviewsShape(work);
  if (stageReviewErrors.length) fail(stageReviewErrors[0], 2, { errorCode: 'STAGE_REVIEW_INVALID' });
  assertVisibleContract(validateVisibleWorkItemContract(work), fail);
  const approvalContext = { ...work, actionType: snapshot.actionType, actionLevel: snapshot.actionLevel };
  if (work.pendingApproval !== undefined) validateApprovalShape(work.pendingApproval, 'Work Item.pendingApproval', approvalContext, { pending: true });
  if (work.approval !== undefined) validateApprovalShape(work.approval, 'Work Item.approval', approvalContext);
  if (work.globalState === 'RETURN') validateReturnRecord(work.returnRecord, 'Work Item.returnRecord');
  if (work.returnRecord?.resolvedAt === null && work.globalState !== 'RETURN') fail('未解决的 RETURN 记录不能经其他状态绕过恢复入口');
  return {
    ...work,
    evidenceRoot: canonicalizePosixPath(work.evidenceRoot ?? `.workflow-control/evidence/${work.workItemId}`, 'Work Item.evidenceRoot'),
    moduleIds,
    allowedPaths,
    forbiddenPaths,
    gateStatus: gates,
    actionLevel: snapshot.actionLevel,
    actionType: snapshot.actionType,
    // 没有待审批动作时不把推导快照持久化为 approval 对象，避免 A0-A3 被误判为缺少 approvalId。
    ...(work.pendingApproval !== undefined ? { pendingApproval: snapshot } : {}),
    sideEffects: Array.isArray(work.sideEffects) ? [...work.sideEffects] : [],
  };
}

/** 校验待审批或已批准对象；两者合同分离，避免把意向误当成真实批准。 */
function validateApprovalShape(approval, label, context = null, options = {}) {
  const pending = options.pending === true;
  const allowed = new Set(['approvalId', 'workItemId', 'baselineHash', 'stageId', 'actionLevel', 'gate', 'actionType', 'object', 'impact', 'target', ...(pending ? [] : ['approvedAt', 'approvedBy'])]);
  knownObject(approval, allowed, label);
  for (const field of ['approvalId', 'workItemId', 'baselineHash', 'stageId', 'actionType', 'object']) if (typeof approval[field] !== 'string' || !approval[field].trim()) fail(`${label}.${field} 必须为非空字符串`);
  if (!pending) for (const field of ['approvedAt', 'approvedBy']) if (typeof approval[field] !== 'string' || !approval[field].trim()) fail(`${label}.${field} 必须为非空字符串`);
  enumValue(approval.actionLevel, ['A4', 'A5', 'A6'], `${label}.actionLevel`);
  if (approval.gate !== 'F4') fail(`${label}.gate 必须为 F4`);
  stringArray(approval.impact, `${label}.impact`, true);
  stringArray(approval.target, `${label}.target`, true);
  if (!ACTION_LEVEL[approval.actionType] || ACTION_LEVEL[approval.actionType] !== approval.actionLevel) fail(`${label}.actionType 与 actionLevel 不一致`);
  if (context) {
    for (const field of ['workItemId', 'baselineHash', 'stageId']) if (approval[field] !== context[field]) fail(`${label}.${field} 未绑定当前 Work Item`);
    if (approval.actionType !== context.actionType || approval.actionLevel !== context.actionLevel) fail(`${label} 动作未绑定当前 pending action`);
  }
}

/** 判断路径是否在允许模式内且没有命中禁止模式。 */
export function assertPathOwnership(path, allowed, forbidden, label = '文件') {
  const normalized = normalizePattern(path);
  if (forbidden.some((pattern) => pathMatches(normalized, pattern))) fail(`${label} 命中 forbiddenPaths：${normalized}`, 2, { errorCode: 'FORBIDDEN_PATH', path: normalized });
  if (!allowed.some((pattern) => pathMatches(normalized, pattern))) fail(`${label} 不在 allowedPaths：${normalized}`, 2, { errorCode: 'PATH_OUT_OF_SCOPE', path: normalized });
  return normalized;
}

/** 将单元中声明的所有文件展平并去重。 */
function packageFiles(pkg) {
  const files = [...(Array.isArray(pkg.expectedFiles) ? pkg.expectedFiles : [])];
  for (const unit of pkg.executionUnits ?? []) files.push(...(unit.files ?? []));
  return [...new Set(files.map(normalizePattern))].sort();
}

/** 保守判断实施包路径模式是否只能收窄 Work Item 模式。 */
function pathPatternSubset(child, parent) {
  const nested = normalizePattern(child);
  const scope = normalizePattern(parent);
  if (scope === '**') return true;
  if (nested === scope || (!nested.includes('*') && !nested.includes('?') && pathMatches(nested, scope))) return true;
  if (scope.endsWith('/**')) {
    const prefix = scope.slice(0, -3);
    return nested === prefix || nested.startsWith(`${prefix}/`);
  }
  return false;
}

/** Unity 工程级共享路径必须由 SHARED/INTEGRATION 单元串行持有。 */
function isSharedUnityPath(file) {
  const normalized = normalizePattern(file);
  const lower = normalized.toLowerCase();
  const sharedAsmdef = lower.endsWith('.asmdef') && (lower.includes('/shared/') || lower.endsWith('/shared.asmdef') || lower.includes('shared'));
  return normalized.startsWith('ProjectSettings/') || normalized.startsWith('Packages/') || normalized.startsWith('Build/') || normalized.startsWith('BuildSettings/') || normalized.includes('/AddressableAssetsData/') || normalized.startsWith('Assets/AddressableAssetsData/') || sharedAsmdef;
}

/** 校验 Unity 实施包、路径所有权、.meta/GUID/Importer 和单写者约束。 */
export function validateImplementationPackage(pkg, work, repo = process.cwd()) {
  assertActiveReferences(work, { pkg });
  const allowed = new Set(['schemaVersion', 'packageId', 'workItemId', 'workItemType', 'baselineHash', 'stageId', 'approvedRequirements', 'allowedPaths', 'forbiddenPaths', 'editorWriter', 'fileOwnership', 'unityOwnership', 'responsiveContractRef', 'uiLayoutPlanRef', 'resourceHandoff', 'expectedFiles', 'executionUnits', 'packageStatus', 'visualBaselineRequired', 'metadata']);
  knownObject(pkg, allowed, 'Implementation Package');
  schemaVersion(pkg, 'Implementation Package');
  for (const field of ['packageId', 'workItemId', 'baselineHash']) if (typeof pkg[field] !== 'string' || !pkg[field].trim()) fail(`Implementation Package.${field} 必须为非空字符串`);
  if (pkg.editorWriter !== undefined && (typeof pkg.editorWriter !== 'string' || !pkg.editorWriter.trim())) fail('Implementation Package.editorWriter 必须为非空字符串');
  enumValue(pkg.packageStatus, ['FROZEN', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED'], 'Implementation Package.packageStatus');
  if (pkg.visualBaselineRequired !== undefined && typeof pkg.visualBaselineRequired !== 'boolean') fail('visualBaselineRequired 必须为布尔值');
  if (pkg.workItemId !== work.workItemId || pkg.baselineHash !== work.baselineHash) fail('Implementation Package 未绑定当前 Work Item 或基线');
  if (pkg.stageId !== undefined && pkg.stageId !== work.stageId) fail('Implementation Package.stageId 与 Work Item 不一致');
  if (!Array.isArray(pkg.executionUnits) || pkg.executionUnits.length === 0) fail('Implementation Package.executionUnits 不能为空');
  if (!pkg.fileOwnership || typeof pkg.fileOwnership !== 'object' || Array.isArray(pkg.fileOwnership) || !Object.keys(pkg.fileOwnership).length) fail('Implementation Package.fileOwnership 必须为非空对象');
  for (const [file, owner] of Object.entries(pkg.fileOwnership)) if (typeof owner !== 'string' || !owner.trim()) fail(`fileOwnership 所有者无效：${file}`);
  validateUnityOwnershipShape(pkg.unityOwnership, { knownObject, stringArray, fail });
  const packageAllowed = stringArray(pkg.allowedPaths, 'Implementation Package.allowedPaths');
  if (pkg.allowedPaths !== undefined && packageAllowed.length === 0) fail('Implementation Package.allowedPaths 显式提供时必须为非空数组');
  const allowedPaths = packageAllowed.length ? packageAllowed.map(normalizePattern) : work.allowedPaths;
  const packageForbidden = stringArray(pkg.forbiddenPaths, 'Implementation Package.forbiddenPaths');
  const forbiddenPaths = packageForbidden.map(normalizePattern);
  for (const pattern of packageAllowed) if (!work.allowedPaths.some((scope) => pathPatternSubset(pattern, scope))) fail(`Implementation Package.allowedPaths 不能扩大 Work Item 范围：${pattern}`, 2, { errorCode: 'PACKAGE_PATH_SCOPE_EXPANDED' });
  const units = [];
  const unitIds = new Set();
  const fileOwners = new Map();
  const editorOwners = new Set();
  const specialParallel = new Set();
  for (const unit of pkg.executionUnits) {
    const unitAllowed = new Set(['unitId', 'unitType', 'scopeId', 'moduleId', 'sceneId', 'displayLayerId', 'hostSceneId', 'owner', 'files', 'status', 'parallelGroup', 'editorWrite', 'serial', 'dependsOn', 'acceptanceCommands']);
    knownObject(unit, unitAllowed, 'Implementation Package.executionUnit');
    for (const field of ['unitId', 'moduleId', 'owner']) if (typeof unit[field] !== 'string' || !unit[field].trim()) fail(`实施单元.${field} 必须为非空字符串`);
    if (unitIds.has(unit.unitId)) fail(`实施单元 ID 重复：${unit.unitId}`);
    unitIds.add(unit.unitId);
    enumValue(unit.unitType, UNIT_TYPES, `实施单元 ${unit.unitId}.unitType`);
    enumValue(unit.status, ['PLANNED', 'READY', 'IMPLEMENTING', 'COMPLETE', 'BLOCKED', 'NOT_RUN'], `实施单元 ${unit.unitId}.status`);
    if (work.moduleIds.length && !work.moduleIds.includes(unit.moduleId)) fail(`实施单元 ${unit.unitId} 的 moduleId 不属于 Work Item`);
    const files = stringArray(unit.files, `实施单元 ${unit.unitId}.files`, true);
    const acceptanceCommands = stringArray(unit.acceptanceCommands, `实施单元 ${unit.unitId}.acceptanceCommands`, true);
    if (new Set(acceptanceCommands).size !== acceptanceCommands.length) fail('acceptanceCommands 不得重复');
    const sharedFiles = files.filter(isSharedUnityPath);
    if (sharedFiles.length && !['SHARED', 'INTEGRATION'].includes(unit.unitType)) fail(`工程级 Unity 文件必须归 SHARED/INTEGRATION 单元：${unit.unitId}`, 2, { errorCode: 'UNITY_SHARED_UNIT_REQUIRED' });
    if (sharedFiles.length && unit.editorWrite === false) fail(`工程级 Unity 文件必须声明正式 Editor 写入：${unit.unitId}`);
    const formalEditorWrite = unit.editorWrite !== false && (['SHARED', 'MODULE', 'SCENE', 'DISPLAY_LAYER', 'INTEGRATION'].includes(unit.unitType) || sharedFiles.length > 0);
    if (formalEditorWrite) editorOwners.add(unit.owner);
    if (['SHARED', 'INTEGRATION', 'RELEASE'].includes(unit.unitType)) {
      if (unit.parallelGroup !== undefined && unit.parallelGroup !== null) fail(`${unit.unitType} 单元必须串行，不能声明 parallelGroup`);
      if (unit.serial === false) fail(`${unit.unitType} 单元不能关闭 serial`);
    }
    if (['SHARED', 'INTEGRATION', 'RELEASE'].includes(unit.unitType) && unit.parallelGroup) specialParallel.add(unit.parallelGroup);
    for (const file of files) {
      const normalized = assertPathOwnership(file, work.allowedPaths, work.forbiddenPaths, `实施单元 ${unit.unitId} Work Item 文件`);
      if (packageAllowed.length) assertPathOwnership(normalized, allowedPaths, forbiddenPaths, `实施单元 ${unit.unitId} Package 文件`);
      else if (packageForbidden.some((pattern) => pathMatches(normalized, pattern))) fail(`Package forbiddenPaths 命中：${normalized}`);
      const absolute = resolve(repo, normalized);
      const relativeToRepo = relative(resolve(repo), absolute);
      if (!relativeToRepo || relativeToRepo === '..' || relativeToRepo.startsWith('..\\') || relativeToRepo.startsWith('../') || isAbsolute(relativeToRepo)) fail(`实施包文件越出仓库：${normalized}`);
      const declaredOwner = pkg.fileOwnership[normalized] ?? pkg.fileOwnership[file];
      if (!declaredOwner) fail(`缺少文件所有权：${normalized}`, 2, { errorCode: 'FILE_OWNERSHIP_MISSING', path: normalized });
      if (declaredOwner !== unit.owner) fail(`文件所有者与实施单元不一致：${normalized}`);
      if (fileOwners.has(normalized) && fileOwners.get(normalized) !== unit.owner) fail(`文件被多个所有者声明：${normalized}`);
      fileOwners.set(normalized, unit.owner);
    }
    units.push({ ...unit, acceptanceCommands, files: files.map(normalizePattern), formalEditorWrite, dependsOn: stringArray(unit.dependsOn, `实施单元 ${unit.unitId}.dependsOn`) });
  }
  validateUnitDependencies(units, { stringArray, fail });
  if (pkg.packageStatus === 'COMPLETE' && units.some((unit) => unit.status !== 'COMPLETE')) fail('packageStatus=COMPLETE 时所有实施单元必须为 COMPLETE', 2, { errorCode: 'PACKAGE_STATUS_INCONSISTENT' });
  const declaredOwnership = Object.entries(pkg.fileOwnership);
  for (const [file, owner] of declaredOwnership) {
    const normalized = assertPathOwnership(file, work.allowedPaths, work.forbiddenPaths, 'fileOwnership Work Item 文件');
    if (packageAllowed.length) assertPathOwnership(normalized, allowedPaths, forbiddenPaths, 'fileOwnership Package 文件');
    else if (packageForbidden.some((pattern) => pathMatches(normalized, pattern))) fail(`Package forbiddenPaths 命中：${normalized}`);
    if (!fileOwners.has(normalized)) fail(`fileOwnership 未绑定任何实施单元：${normalized}`);
    if (fileOwners.get(normalized) !== owner) fail(`fileOwnership 所有者不一致：${normalized}`);
  }
  const files = packageFiles(pkg);
  for (const file of files) if (!fileOwners.has(file)) fail(`实施包文件未绑定所有者：${file}`);
  if (editorOwners.size > 1) fail(`同一 Unity 项目的正式 Editor 写入必须单写者：${[...editorOwners].sort().join(', ')}`, 2, { errorCode: 'UNITY_SINGLE_WRITER' });
  if (pkg.editorWriter !== undefined && editorOwners.size && (!editorOwners.has(pkg.editorWriter) || editorOwners.size !== 1)) fail('Implementation Package.editorWriter 与正式 Editor 写入所有者不一致');
  if (work.editorWriter !== undefined) {
    if (pkg.editorWriter !== work.editorWriter) fail('Work Item.editorWriter 与 Implementation Package.editorWriter 不一致');
    if (editorOwners.size !== 1 || !editorOwners.has(work.editorWriter)) fail('Work Item.editorWriter 未覆盖唯一正式 Editor 写入者');
  }
  assertVisibleContract(validateVisibleImplementationPackage(pkg, work, repo), fail);
  const resourceErrors = validateResourceHandoffPackage(pkg, repo);
  if (resourceErrors.length) fail(resourceErrors[0], 2, { errorCode: 'RESOURCE_HANDOFF_INVALID' });
  if (specialParallel.size) fail('共享设置、集成和发布单元不得使用并行组');
  validateUnityOwnership(pkg, files, packageAllowed.length ? allowedPaths : work.allowedPaths, packageForbidden);
  return { ...pkg, executionUnits: units, expectedFiles: files, allowedPaths, forbiddenPaths, fileOwners };
}

/** 校验 Unity 资产的 .meta、GUID/Importer、序列化资源和工程设置覆盖。 */
function validateUnityOwnership(pkg, files, allowedPaths, forbiddenPaths) {
  const ownership = pkg.unityOwnership ?? {};
  const metaPairs = new Map();
  for (const pair of ownership.metaPairs ?? []) {
    knownObject(pair, new Set(['asset', 'meta']), 'unityOwnership.metaPairs');
    const asset = normalizePattern(pair.asset);
    const meta = normalizePattern(pair.meta);
    if (meta !== `${asset}.meta`) fail(`.meta 配对不正确：${asset} ↔ ${meta}`);
    metaPairs.set(asset, meta);
  }
  const guidImporter = new Set((ownership.guidImporter ?? []).map(normalizePattern));
  const serialized = new Set([...(ownership.serializedAssets ?? []), ...(ownership.scenePrefabScriptableObject ?? [])].map(normalizePattern));
  const projectConfig = new Set((ownership.projectSettingsPackagesBuildSettings ?? []).map(normalizePattern));
  for (const file of files) {
    if (file.startsWith('Assets/')) {
      if (file.endsWith('.meta')) continue;
      if (!files.includes(`${file}.meta`)) fail(`Unity 资产缺少 .meta 配对：${file}`);
      if (!metaPairs.has(file)) fail(`Unity 资产缺少 metaPairs 所有权：${file}`);
      if (!guidImporter.has(file)) fail(`Unity 资产缺少 GUID/Importer 所有权：${file}`);
      if (/\.(unity|prefab|asset)$/i.test(file) && !serialized.has(file)) fail(`序列化 Unity 资源缺少 Scene/Prefab/ScriptableObject 所有权：${file}`);
    }
    if (file.startsWith('ProjectSettings/') || file.startsWith('Packages/') || /^Build(Settings)?\//i.test(file)) {
      if (!projectConfig.has(file)) fail(`工程设置/Packages/Build Settings 缺少所有权：${file}`);
    }
    assertPathOwnership(file, allowedPaths, forbiddenPaths, 'Unity 所有权文件');
  }
  for (const [asset, meta] of metaPairs) {
    if (!files.includes(asset) || !files.includes(meta)) fail(`metaPairs 未覆盖实施包文件：${asset}`);
  }
}

/** 校验证据清单结构并绑定当前 Work Item 与实施包。 */
export function validateEvidence(evidence, work, pkg = null, repo = process.cwd()) {
  assertActiveReferences(work, { evidence });
  const allowed = new Set(['schemaVersion', 'evidenceId', 'workItemId', 'packageId', 'workItemType', 'visualStageModel', 'visualStage', 'contractVersions', 'baselineHash', 'recordedAt', 'verdict', 'gateResults', 'unityEvidence', 'responsiveEvidence', 'uiLayoutMeasurementRef', 'resourceHandoffInspectionRef', 'productionContractAudit', 'candidateId', 'candidateVersion', 'artExperienceAcceptanceRef', 'artifacts', 'approval', 'metadata', 'riggingDelivery']);
  knownObject(evidence, allowed, 'Evidence Manifest');
  if (evidence.resourceHandoffInspectionRef !== undefined) {
    knownObject(evidence.resourceHandoffInspectionRef, new Set(['path']), 'Evidence Manifest.resourceHandoffInspectionRef');
    canonicalizePosixPath(evidence.resourceHandoffInspectionRef.path, 'Evidence Manifest.resourceHandoffInspectionRef.path');
  }
  if (evidence.uiLayoutMeasurementRef !== undefined) {
    knownObject(evidence.uiLayoutMeasurementRef, new Set(['path']), 'Evidence Manifest.uiLayoutMeasurementRef');
    canonicalizePosixPath(evidence.uiLayoutMeasurementRef.path, 'Evidence Manifest.uiLayoutMeasurementRef.path');
    if (!['SCENE', 'DISPLAY_LAYER'].includes(work.workItemType)) fail('非可见工作项不得携带布局运行证据');
  }
  schemaVersion(evidence, 'Evidence Manifest');
  for (const field of ['evidenceId', 'workItemId', 'packageId', 'baselineHash', 'recordedAt']) if (typeof evidence[field] !== 'string' || !evidence[field].trim()) fail(`Evidence Manifest.${field} 必须为非空字符串`);
  if (evidence.workItemId !== work.workItemId || evidence.baselineHash !== work.baselineHash) fail('Evidence Manifest 未绑定当前 Work Item 或基线');
  if (evidence.riggingDelivery !== undefined) {
    if (!work.riggingDelivery) fail('Evidence Manifest 含骨骼交付信息，但 Work Item 未声明 riggingDelivery', 2, { errorCode: 'RIGGING_DELIVERY_INVALID' });
    const riggingErrors = validateRiggingDeliveryEvidenceShape(evidence.riggingDelivery);
    if (riggingErrors.length) fail(riggingErrors[0], 2, { errorCode: 'RIGGING_DELIVERY_INVALID' });
  }
  if (pkg && evidence.packageId !== pkg.packageId) fail('Evidence Manifest 未绑定当前 Implementation Package');
  enumValue(evidence.verdict, ['PASS', 'FAIL', 'NOT_RUN'], 'Evidence Manifest.verdict');
  // 骨骼门禁不依赖 validationPlan 文本，仍要求现有 F3 的 PlayMode 证据实际通过。
  if (work.riggingDelivery && evidence.verdict === 'PASS' && statusOf(evidence.unityEvidence?.playMode) !== 'PASS') fail('骨骼资产 PASS 证据要求 unityEvidence.playMode 为 PASS', 2, { errorCode: 'RIGGING_UNITY_PLAYMODE_REQUIRED' });
  const gates = evidence.gateResults;
  knownObject(gates, new Set(GATES), 'Evidence Manifest.gateResults');
  for (const gate of GATES) {
    if (!gates[gate] || typeof gates[gate] !== 'object') fail(`Evidence Manifest.gateResults.${gate} 必须存在`);
    knownObject(gates[gate], new Set(['status', 'summary', 'evidenceRefs']), `Evidence Manifest.gateResults.${gate}`);
    enumValue(gates[gate].status, ['PASS', 'FAIL', 'NOT_RUN'], `Evidence Manifest.gateResults.${gate}.status`);
  }
  if (evidence.unityEvidence !== undefined) validateUnityEvidence(evidence.unityEvidence);
  if (evidence.approval !== undefined) {
    const pending = approvalSnapshot(work);
    validateApprovalShape(evidence.approval, 'Evidence Manifest.approval', { ...work, actionType: pending.actionType, actionLevel: pending.actionLevel });
  }
  assertVisibleContract(validateVisibleEvidenceContract(evidence, work, repo), fail);
  if (evidence.verdict === 'PASS' && GATES.slice(0, 4).some((gate) => gates[gate].status !== 'PASS')) fail('Evidence Manifest.verdict=PASS 必须使 F0-F3 全部 PASS');
  if (evidence.verdict === 'PASS' && gates.F4.status === 'FAIL') fail('Evidence Manifest.verdict=PASS 不能包含 FAIL 的 F4 门');
  if (evidence.verdict === 'PASS' && evidence.unityEvidence) {
    for (const [field, value] of Object.entries(evidence.unityEvidence)) {
      if (statusOf(value) === 'FAIL') fail(`Evidence Manifest.verdict=PASS 不能包含 FAIL 的 Unity 子证据：${field}`);
    }
  }
  if (evidence.verdict === 'PASS') validateImplementationEvidence(evidence, work);
  // 设备和发布是外部结果；没有当前精确批准时，禁止把 NOT_RUN 伪造成 PASS。
  for (const field of ['device', 'release']) {
    if (evidence.unityEvidence && statusOf(evidence.unityEvidence[field]) === 'PASS' && (evidence.gateResults.F4.status !== 'PASS' || !evidence.approval || !approvalMatches(work, evidence.approval))) fail(`unityEvidence.${field}=PASS 缺少当前 F4 精确批准`);
  }
  return { ...evidence, gateResults: { ...gates } };
}

/** 校验 Unity 证据字段的状态值。 */
function validateUnityEvidence(value) {
  knownObject(value, new Set(['editorStable', 'compile', 'domainReload', 'console', 'editMode', 'playMode', 'scenePrefabImporterGuid', 'build', 'device', 'release']), 'Evidence Manifest.unityEvidence');
  for (const item of Object.values(value)) {
    const status = statusOf(item);
    enumValue(status, ['PASS', 'FAIL', 'NOT_RUN'], 'Unity evidence status');
  }
}

/** A2-A4 的实现/集成证据必须覆盖稳定 Editor、编译、域重载、Console 和资源绑定。 */
function validateImplementationEvidence(evidence, work) {
  if (!['A2', 'A3', 'A4'].includes(work.actionLevel)) return;
  const unity = evidence.unityEvidence;
  if (!unity) fail(`${work.actionLevel} PASS 证据缺少 unityEvidence`);
  for (const field of ['editorStable', 'compile', 'domainReload', 'console', 'scenePrefabImporterGuid']) if (statusOf(unity[field]) !== 'PASS') fail(`${work.actionLevel} PASS 证据 ${field} 必须为 PASS`);
  const plan = (work.validationPlan ?? []).join(' ').toLowerCase();
  if (/(editmode|edit mode|编辑模式)/.test(plan) && statusOf(unity.editMode) !== 'PASS') fail('validationPlan 声明 EditMode，但 unityEvidence.editMode 不是 PASS');
  if (/(playmode|play mode|播放模式)/.test(plan) && statusOf(unity.playMode) !== 'PASS') fail('validationPlan 声明 PlayMode，但 unityEvidence.playMode 不是 PASS');
  if (/(build|构建)/.test(plan) && statusOf(unity.build) !== 'PASS') fail('validationPlan 声明 build，但 unityEvidence.build 不是 PASS');
}

/** 将布尔、字符串或带 status 的证据值规范化。 */
export function statusOf(value) {
  if (value === true) return 'PASS';
  if (value === false) return 'FAIL';
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.status;
  return 'NOT_RUN';
}

/** 判断 Work Item 当前动作是否需要 F4 精确批准。 */
export function requiresExactApproval(work) {
  const pending = work.pendingApproval ?? approvalSnapshot(work);
  if (pending.actionLevel === 'A5' || pending.actionLevel === 'A6') return true;
  if (pending.actionLevel === 'A4') return Boolean(pending.approvalId || work.sideEffects?.length || work.approval || work.userDecisionRequired);
  return false;
}

/** 逐字段比较当前 pending 与批准，避免“批准其他动作”被复用。 */
export function approvalMatches(work, approval) {
  const pending = work.pendingApproval ?? approvalSnapshot(work);
  const candidate = approval ?? work.approval ?? null;
  if (!candidate || !pending.approvalId) return false;
  validateApprovalShape(candidate, 'Approval', { ...work, actionType: pending.actionType, actionLevel: pending.actionLevel });
  for (const field of ['approvalId', 'workItemId', 'baselineHash', 'stageId', 'actionType', 'actionLevel', 'gate', 'object']) if (candidate[field] !== (field === 'workItemId' ? work.workItemId : field === 'baselineHash' ? work.baselineHash : field === 'stageId' ? work.stageId : pending[field])) return false;
  if (JSON.stringify(candidate.impact) !== JSON.stringify(pending.impact)) return false;
  if (JSON.stringify(candidate.target) !== JSON.stringify(pending.target)) return false;
  return Boolean(candidate.approvedAt && candidate.approvedBy);
}
