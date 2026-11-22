import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { readJson, repoPath, WorkflowError } from './io.mjs';
import { productionIdentity, validateProductionScope } from './production-scope.mjs';
import { getWorkSource } from './work-source.mjs';
import { isWorld3D, world3dScopeIds, collectWorld3DReferences } from './world3d-contract.mjs';
import { isWorld2D, collectSceneDesignReferences } from './scene-design-contract.mjs';
import { collectWorldHudReferences } from './world3d-hud.mjs';
import { collectSampleReferences, collectSampleControlReferences } from './production-samples.mjs';
import { dependencyPath } from './feature-dependencies.mjs';
import { supplementalDecompositionReferencePaths } from './module-design-targets.mjs';
import { collectVisualResearchPaths } from './visual-research.mjs';
import { moduleDesignDecisionPaths } from './grilling-design.mjs';

/** 规范化项目相对路径，避免 Windows 大小写差异改变证据身份。 */
function pathKey(repo, path) {
  const value = repoPath(repo, path, '生产覆盖证据路径').relative;
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

/** 将集合排序比较，确保顺序调整不会虚构缺失或重复覆盖。 */
function equalIds(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length && JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

/** 将同一真实用例负责的步骤、状态、对象及转移合并，避免重复强制执行。 */
function addCase(cases, caseId, objectIds, stateIds, stepId, transition) {
  const current = cases.get(caseId) ?? { objectIds: new Set(), stateIds: new Set(), stepIds: new Set(), transitions: new Map(), paths: new Map() };
  objectIds.forEach((id) => current.objectIds.add(id));
  stateIds.forEach((id) => current.stateIds.add(id));
  if (stepId) current.stepIds.add(stepId);
  if (transition) current.transitions.set(transition.transitionId, { transitionId: transition.transitionId, fromStateId: transition.fromStateId, toStateId: transition.toStateId });
  cases.set(caseId, current);
}

/** 从事先冻结的总范围推导本批或完整组合的必要行为，不从结果反推范围。 */
function expectedCases(result, { batch, objectId } = {}) {
  const cases = new Map();
  const stepIds = batch ? batch.stepIds : [...result.steps.keys()];
  const transitionIds = batch ? batch.transitionIds : [...result.transitions.keys()];
  for (const id of stepIds) {
    const step = result.steps.get(id);
    if (objectId && !step.objectIds.includes(objectId)) continue;
    addCase(cases, step.caseId, step.objectIds, step.stateIds, step.stepId, null);
  }
  for (const id of transitionIds) {
    const transition = result.transitions.get(id);
    const stateIds = [...new Set([transition.fromStateId, transition.toStateId])];
    const objectIds = [...new Set(stateIds.map((stateId) => result.states.get(stateId).objectId))];
    if (objectId && !objectIds.includes(objectId)) continue;
    addCase(cases, transition.caseId, objectIds, stateIds, null, transition);
  }
  const pathIds = batch ? batch.pathIds ?? [] : [...result.paths.keys()];
  for (const id of pathIds) {
    const path = result.paths.get(id);
    const steps = path.stepIds.map((stepId) => result.steps.get(stepId));
    const objectIds = [...new Set(steps.flatMap((step) => step.objectIds))];
    if (objectId && !objectIds.includes(objectId)) continue;
    const stateIds = [...new Set(steps.flatMap((step) => step.stateIds))];
    for (const stepId of path.stepIds) addCase(cases, path.caseId, objectIds, stateIds, stepId, null);
    cases.get(path.caseId).paths.set(path.pathId, [...path.stepIds]);
  }
  return cases;
}

/** 控制记录和确认材料不能作为运行原始输出重复登记。 */
function reservedEvidencePaths(repo, work) {
  const paths = [];
  const add = (value) => { if (typeof value === 'string' && value.trim()) paths.push(value); };
  add(getWorkSource(work));
  for (const key of ['evidenceRef', 'implementationPackageRef', 'planningRef', 'productionScopeRef', 'integrationScopeRef', 'integrationEvidenceRef', 'globalVisualBaselineRef', 'assetReviewRef', 'grillingRef']) add(work[key]?.path);
  if (work.evidenceRoot) {
    add(`${work.evidenceRoot}/manifest.json`);
    add(`${work.evidenceRoot}/execution-state.json`);
  }
  for (const dependency of work.productionDependencies ?? []) add(dependency.workItemRef?.path);
  for (const path of collectSampleControlReferences(repo, work)) add(path);
  const visual = work.visual;
  for (const key of ['coverageRef', 'integrationEvidenceRef', 'functionBaselineRef', 'modulePlanRef', 'moduleDesignRef', 'moduleDesignReviewRef', 'moduleRuntimeRef', 'versionDesignSnapshotRef', 'modelBaselineRef', 'modelProductionBasisRef', 'sceneDesignRef', 'domainEvidenceRef']) add(visual?.[key]?.path);
  const versionVisual = work.productionScopeRef ? validateProductionScope(repo, work)?.scope.versionVisual : null;
  if (versionVisual) {
    versionVisual.workItemPaths.forEach(add);
  }
  for (const ref of Object.values(visual?.reviews ?? {})) add(ref?.path);
  for (const path of supplementalDecompositionReferencePaths(work, repo)) add(path);
  for (const path of [
    ...collectVisualResearchPaths(repo, work.globalVisualBaselineRef),
    ...collectVisualResearchPaths(repo, visual?.hud?.globalVisualBaselineRef),
    ...moduleDesignDecisionPaths(repo, work),
  ]) add(path);
  const controlReferences = [...collectWorldHudReferences(repo, work), ...collectSampleReferences(repo, work)];
  if (isWorld3D(work) || isWorld2D(work)) controlReferences.push(...(isWorld3D(work) ? collectWorld3DReferences(repo, work) : collectSceneDesignReferences(repo, work)));
  if (controlReferences.length) {
    // 嵌套审查、确认和观测封套不能再登记成原始日志，真实引擎原始输出仍可复用。
    for (const path of controlReferences) {
      try {
        const absolute = repoPath(repo, path).absolute;
        // 控制记录不限扩展名；大场景和模型不在这里整份解析，控制封套的上限由遍历器校验。
        if (!existsSync(absolute) || statSync(absolute).size > 5 * 1024 * 1024) continue;
        const value = readJson(repo, path, '空间引用');
        if (isProductionControlValue(value)) add(path);
      } catch { /* 缺失记录由对应阶段门拒绝，不能扩大原始证据授权。 */ }
    }
  }
  for (const key of ['globalVisualBaselineRef', 'coverageRef', 'integrationEvidenceRef']) add(visual?.hud?.[key]?.path);
  for (const target of [...(visual?.targets ?? []), ...(visual?.hud?.targets ?? [])]) {
    for (const key of ['referenceTarget', 'domainEvidenceRef', 'assetReviewRef']) add(target[key]?.path);
    for (const ref of Object.values(target.reviews ?? {})) add(ref?.path);
  }
  const packPath = work.implementationPackageRef?.path;
  if (packPath && existsSync(repoPath(repo, packPath).absolute)) {
    const pack = readJson(repo, packPath, '实施包');
    for (const unit of pack.executionUnits ?? []) add(unit.resultPath);
  }
  return paths;
}

/** 空间、样本与人工决定只说明控制事实，不能充当独立运行原始输出。 */
function isProductionControlValue(value) {
  return value?.schemaVersion === '1.0' && Boolean(
    ['world-2d', 'world-3d'].includes(value.designRoute) ||
    ['scene-design-review', 'world-3d-design-review', 'production-sample'].includes(value.kind) ||
    value.subjectRef || value.commandEvidenceRef || (value.userMessageRef && (value.decision || value.humanStatus)) ||
    [2, 3].includes(value.dimension) || Array.isArray(value.models),
  );
}

/** 识别完整控制记录结构，同时保留普通 JSON 应用日志和命令输出。 */
function isControlRecord(path) {
  const fd = openSync(path, 'r');
  const prefix = Buffer.alloc(256);
  let length;
  try { length = readSync(fd, prefix, 0, prefix.length, 0); } finally { closeSync(fd); }
  if (!prefix.subarray(0, length).toString('utf8').trimStart().startsWith('{')) return false;
  let value;
  try { value = JSON.parse(readFileSync(path, 'utf8')); } catch { return false; }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== '1.0' || typeof value.workItemId !== 'string') return false;
  const work = typeof value.globalState === 'string' && typeof value.workItemType === 'string' && typeof value.projectId === 'string';
  const manifest = Array.isArray(value.items) && typeof value.implementationPackageRef === 'string' && typeof value.stack === 'string';
  const execution = typeof value.implementationPackageRef === 'string' && Array.isArray(value.units) && value.executionPlan && typeof value.executionPlan === 'object';
  const result = typeof value.implementationPackageRef === 'string' && typeof value.unitId === 'string' && Number.isInteger(value.sequence) && Array.isArray(value.files) && Array.isArray(value.commandOutputs);
  return Boolean(work || manifest || execution || result || isProductionControlValue(value));
}

/** 只接受当前工作项证据根内登记为 PASS 的真实、非空原始文件。 */
function rawEvidence(repo, work, manifest, ref, excludedPaths, label) {
  const path = productionIdentity(repo, ref, label);
  const key = pathKey(repo, path);
  const root = `${pathKey(repo, work.evidenceRoot)}/`;
  // Windows 文件 ID 可能超过安全整数范围，必须保留完整精度避免误判不同文件。
  const actual = statSync(repoPath(repo, path).absolute, { bigint: true });
  const reserved = [...excludedPaths, ...reservedEvidencePaths(repo, work)];
  // 文件名不同的硬链接仍指向同一控制记录，不能借别名自证执行结果。
  const conflicts = reserved.some((item) => {
    if (pathKey(repo, item) === key) return true;
    const candidate = repoPath(repo, item).absolute;
    if (!existsSync(candidate)) return false;
    const current = statSync(candidate, { bigint: true });
    return current.isFile() && actual.dev === current.dev && actual.ino === current.ino;
  });
  if (!key.startsWith(root) || conflicts || isControlRecord(repoPath(repo, path).absolute)) throw new WorkflowError(`${label}必须位于当前证据目录并独立于控制记录`);
  if (!manifest.items.some((item) => item?.status === 'PASS' && typeof item.path === 'string' && pathKey(repo, item.path) === key)) throw new WorkflowError(`${label}必须列入当前 PASS 证据清单`);
}

/** 核对步骤及实际转移身份；原始输出仍须由执行者如实提供。 */
function validateCase(repo, work, manifest, actual, expected, excludedPaths, label) {
  if (!actual || !equalIds(actual.stepIds, expected.stepIds) || !equalIds(actual.stateIds, expected.stateIds)) throw new WorkflowError(`${label}的步骤或状态覆盖与冻结范围不一致`);
  if (!Array.isArray(actual.transitions) || actual.transitions.length !== expected.transitions.size) throw new WorkflowError(`${label}缺少实际状态转移`);
  const seen = new Set();
  for (const transition of actual.transitions) {
    const wanted = expected.transitions.get(transition?.transitionId);
    if (!wanted || seen.has(transition.transitionId) || transition.fromStateId !== wanted.fromStateId || transition.toStateId !== wanted.toStateId) throw new WorkflowError(`${label}的状态转移身份或前后状态不匹配`);
    seen.add(transition.transitionId);
  }
  const paths = actual.paths ?? [];
  if (!Array.isArray(paths) || paths.length !== expected.paths.size) throw new WorkflowError(`${label}缺少业务路径运行顺序`);
  const pathIds = new Set();
  for (const path of paths) {
    const ordered = expected.paths.get(path?.pathId);
    if (!ordered || pathIds.has(path.pathId) || !Array.isArray(path.stepIds) || JSON.stringify(path.stepIds) !== JSON.stringify(ordered)) throw new WorkflowError(`${label}的路径步骤顺序或重复次数不匹配`);
    pathIds.add(path.pathId);
  }
  rawEvidence(repo, work, manifest, actual.evidenceRef, excludedPaths, `${label}原始输出`);
}

/** 跨模块功能来源必须逐行为证明本批当前对象的步骤、状态、转移与路径。 */
export function validateVersionFunctionCoverage(repo, work, definition, verified) {
  const batch = definition.batches.get(work.productionBatchId);
  if (!batch) throw new WorkflowError('版本功能来源缺少当前生产批次');
  const expected = expectedCases(definition, { batch, objectId: work.visual.objectId });
  if (!expected.size) throw new WorkflowError('版本功能来源未声明当前对象的必要行为');
  for (const [caseId, wanted] of expected) {
    const result = verified.find((entry) => entry.caseId === caseId);
    const dependency = work.visual.functionDependencies.find((entry) => entry.caseId === caseId);
    if (!result || !dependency) throw new WorkflowError(`版本功能依赖缺少必要行为 ${caseId}`);
    if (!equalIds(result.objectIds, [...wanted.objectIds])) throw new WorkflowError(`版本功能依赖 ${caseId} 的对象覆盖不匹配`);
    const source = readJson(repo, dependencyPath(repo, dependency.workItemRef.path), '功能来源工作项');
    if (source.workItemId !== result.workItemId) throw new WorkflowError(`版本功能依赖 ${caseId} 的来源已变化`);
    const manifest = readJson(repo, source.evidenceRef.path, '功能来源证据清单');
    const evidence = readJson(repo, dependencyPath(repo, result.evidenceRef.path), '功能行为证据');
    validateCase(repo, source, manifest, evidence.production, wanted, [result.evidenceRef.path], `版本功能行为 ${caseId}`);
  }
}

/** 核对本批当前实施包及 V1/V5 的实际覆盖，V2–V4 不要求未来运行结果。 */
export function validateProductionBatchEvidence(repo, work, manifest) {
  const result = validateProductionScope(repo, work);
  if (!result || !result.batch) return;
  if (work.visual && !['V1', 'V5'].includes(work.visual.stage)) return;
  // V1 可验证局部风险，整批实际覆盖在 V5 核对。
  if (work.visual?.stage === 'V1' && work.visual.modulePlanRef) return;
  if (!work.visual && !['MODULE', 'INTEGRATION'].includes(work.workItemType)) return;
  if (!manifest || !Array.isArray(manifest.items)) throw new WorkflowError('生产批次缺少证据清单');
  const records = manifest.items.filter((item) => item?.category === 'production-coverage' && item.status === 'PASS');
  if (records.length !== 1) throw new WorkflowError('生产批次必须提供唯一 PASS 的 production-coverage 证据');
  const recordPath = repoPath(repo, records[0].path, '生产批次覆盖记录').relative;
  const root = `${pathKey(repo, work.evidenceRoot)}/`;
  if (!pathKey(repo, recordPath).startsWith(root)) throw new WorkflowError('生产批次覆盖记录必须位于当前证据目录');
  const coverage = readJson(repo, recordPath, '生产批次覆盖记录');
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', scopeId: result.scope.scopeId, workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, productionBatchId: work.productionBatchId, status: 'PASS' })) {
    if (coverage[key] !== expected) throw new WorkflowError(`生产批次覆盖记录 ${key} 与工作项不匹配`);
  }
  if (!work.implementationPackageRef?.path || !coverage.implementationPackageRef || pathKey(repo, coverage.implementationPackageRef) !== pathKey(repo, work.implementationPackageRef.path)) throw new WorkflowError('生产批次覆盖记录未绑定当前实施包');
  if (work.visual ? coverage.visualStage !== work.visual.stage : coverage.visualStage !== undefined) throw new WorkflowError('生产批次覆盖记录的视觉阶段不匹配');
  const expected = expectedCases(result, { batch: result.batch, objectId: work.visual?.objectId });
  if (!expected.size || !Array.isArray(coverage.cases) || coverage.cases.length !== expected.size) throw new WorkflowError('生产批次覆盖记录未覆盖本批必要行为');
  const seen = new Set();
  for (const actual of coverage.cases) {
    const wanted = expected.get(actual?.caseId);
    if (!wanted || seen.has(actual.caseId) || !equalIds(actual.objectIds, wanted.objectIds)) throw new WorkflowError('生产批次行为或对象覆盖不匹配');
    seen.add(actual.caseId);
    validateCase(repo, work, manifest, actual, wanted, [recordPath], `生产批次行为 ${actual.caseId}`);
  }
}

/** 在执行前核对最终集成范围与事先冻结的生产总范围。 */
export function validateProductionIntegrationScope(repo, work, integrationScope) {
  const result = validateProductionScope(repo, work);
  if (!result) return null;
  if (work.workItemType !== 'INTEGRATION' || work.integrationPurpose !== 'final') throw new WorkflowError('生产总范围的整体检查只能用于最终集成');
  const frozen = integrationScope.productionScopeRef;
  if (!frozen?.path || frozen.sha256 !== work.productionScopeRef.sha256 || pathKey(repo, frozen.path) !== pathKey(repo, work.productionScopeRef.path)) throw new WorkflowError('最终集成范围未绑定当前冻结的生产总范围');
  const expectedCasesMap = expectedCases(result);
  const scopeObjects = new Map(integrationScope.objects.map((entry) => [entry.objectId, entry]));
  for (const object of result.objects.values()) {
    const sourceEntry = scopeObjects.get(object.objectId);
    if (!sourceEntry) throw new WorkflowError(`最终集成缺少生产对象 ${object.objectId}`);
    const sourcePath = productionIdentity(repo, sourceEntry.workItemRef, `生产对象 ${object.objectId} 工作项`);
    const source = readJson(repo, sourcePath, '生产对象当前工作项');
    if (source.projectId !== work.projectId || source.stack !== work.stack || source.workItemType !== object.workItemType || source.visual?.objectId !== object.objectId) throw new WorkflowError(`生产对象 ${object.objectId} 与当前工作项不一致`);
    if (object.workItemType === 'DISPLAY_LAYER' && (source.visual.hostId !== object.hostId || source.visual.layerType !== object.layerType)) throw new WorkflowError(`生产对象 ${object.objectId} 的宿主或类型与总范围不一致`);
    if (!source.productionScopeRef || source.productionScopeRef.sha256 !== work.productionScopeRef.sha256 || pathKey(repo, source.productionScopeRef.path) !== pathKey(repo, work.productionScopeRef.path)) throw new WorkflowError(`生产对象 ${object.objectId} 未绑定当前冻结的生产总范围`);
    if (object.workItemType === 'SCENE' && !equalIds(isWorld3D(source) ? world3dScopeIds(repo, source) : source.visual?.targets?.map((item) => item.targetId), object.targetIds)) throw new WorkflowError(`生产对象 ${object.objectId} 的累计目标未覆盖总范围`);
  }
  const scopeCases = new Map(integrationScope.cases.map((entry) => [entry.caseId, entry]));
  for (const [caseId, wanted] of expectedCasesMap) {
    const entry = scopeCases.get(caseId);
    if (!entry || [...wanted.objectIds].some((id) => !entry.objectIds?.includes(id))) throw new WorkflowError(`最终集成缺少生产行为 ${caseId} 或其必要对象`);
  }
  return { result, expectedCasesMap };
}

/** 在最终组合中对照预先冻结的总范围，拒绝遗漏对象、目标、步骤或状态转移。 */
export function validateProductionIntegration(repo, work, integrationScope, manifest) {
  const checked = validateProductionIntegrationScope(repo, work, integrationScope);
  if (!checked) return;
  const { expectedCasesMap } = checked;
  const evidence = readJson(repo, productionIdentity(repo, work.integrationEvidenceRef, '最终集成回归证据'), '最终集成回归证据');
  const casePaths = (evidence.cases ?? []).map((item) => item?.evidenceRef?.path).filter(Boolean);
  for (const [caseId, wanted] of expectedCasesMap) {
    const entry = evidence.cases?.find((item) => item.caseId === caseId);
    if (!entry) throw new WorkflowError(`最终集成缺少生产行为 ${caseId} 的实际结果`);
    const path = productionIdentity(repo, entry.evidenceRef, `生产行为 ${caseId} 实际记录`);
    const actual = readJson(repo, path, `生产行为 ${caseId} 实际记录`);
    validateCase(repo, work, manifest, actual.production, wanted, [path, work.integrationEvidenceRef.path, ...casePaths], `最终生产行为 ${caseId}`);
  }
}
