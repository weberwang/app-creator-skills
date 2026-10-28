import { randomUUID } from 'node:crypto';
import {
  closeSync, linkSync, lstatSync, mkdirSync, openSync, readdirSync, rmdirSync,
  readFileSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, posix } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { VERSION, VISUAL_STAGES } from './constants.mjs';
import { bindWorkSource, collectWorkReferencePaths, loadPackage, validateEvidence, validateUnitResult } from './artifacts.mjs';
import { atomicWriteJson, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { assertOwnedPath, loadProfile, pathMatch, validateWork } from './validation.mjs';
import { inspectPendingRegressionExecution, inspectWork, loadWork, response } from './workflow.mjs';
import { withWorkLock } from './work-lock.mjs';

const PLAN_FIELDS = new Set(['executionUnits', 'gateAssessments']);
const PLAN_UNIT_FIELDS = new Set(['unitId', 'owner', 'paths', 'acceptanceCommands', 'type', 'parallelGroup', 'dependsOn']);
const REPORT_FIELDS = new Set(['files', 'commandOutputs', 'evidence', 'hostId', 'layerType']);
const REPORT_COMMAND_FIELDS = new Set(['command', 'exitCode', 'outputFile']);
const REPORT_EVIDENCE_FIELDS = new Set(['category', 'path', 'targetId']);
const GATE_ASSESSMENT_FIELDS = new Set(['status', 'reason']);
const GATE_KEYS = ['F0', 'F1', 'F2'];
const UNIT_TYPES = ['SHARED', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'];
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;

/** 从显式计划生成与当前 Work Item 绑定的实施包和空证据清单。 */
export async function prepareWorkRecords({ repo, workItem, planPath }) {
  return withWorkLock(repo, workItem, () => prepareWorkRecordsLocked({ repo, workItem, planPath }));
}

/** 在 Work Item 锁内校验计划、暂存新记录并最后提交 Work Item 引用。 */
async function prepareWorkRecordsLocked({ repo, workItem, planPath }) {
  const work = loadWorkItem(repo, workItem);
  const workSourcePath = repoPath(repo, workItem, 'Work Item 路径').relative;
  const sourcePath = repoPath(repo, planPath, 'Work Plan 路径').relative;
  const plan = readJson(repo, sourcePath, 'Work Plan');
  validatePlanShape(plan);
  assertPlanningState(repo, work);

  if (!SAFE_ID.test(work.workItemId)) throw new WorkflowError('Work Item.workItemId 不能安全用于实施包文件名');
  const packagePath = `.workflow-control/implementation-packages/${work.workItemId}-r${work.revision + 1}.json`;
  const manifestPath = `${repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative}/manifest.json`;
  const outputPaths = [packagePath, manifestPath];
  assertDistinctPaths(outputPaths, '生成记录路径');
  if (samePath(sourcePath, workSourcePath) || outputPaths.some((path) => samePath(path, sourcePath))) {
    throw new WorkflowError('Work Plan 不能与 Work Item 或生成记录共用路径');
  }
  for (const path of outputPaths) assertPathAbsent(repo, path, '拒绝覆盖已有工作流记录');
  assertEvidenceRootAbsent(repo, work.evidenceRoot);
  assertNoPriorPackages(repo, work);

  const evidenceRoot = repoPath(repo, work.evidenceRoot).relative;
  const protectedPaths = [
    sourcePath,
    workSourcePath,
    packagePath,
    manifestPath,
    `${evidenceRoot}/execution-state.json`,
    ...collectWorkReferencePaths(work, repo).map((path) => repoPath(repo, path, '工作项保留引用').relative),
    ...plan.executionUnits.map((unit) => `${evidenceRoot}/unit-${unit.unitId}.json`),
  ];
  assertUnitPathsAvoidRecords(plan.executionUnits, protectedPaths);

  const profile = loadProfile(repo, work.stack);
  const narrowedPaths = [];
  const executionUnits = plan.executionUnits.map((entry, index) => {
    const paths = entry.paths.map((path) => assertOwnedPath(repo, work, profile, path));
    narrowedPaths.push(...paths);
    const unit = {
      unitId: entry.unitId,
      sequence: index + 1,
      type: entry.type ?? defaultUnitType(work.workItemType),
      owner: entry.owner,
      paths,
      resultPath: `${repoPath(repo, work.evidenceRoot).relative}/unit-${entry.unitId}.json`,
      acceptanceCommands: [...entry.acceptanceCommands],
      ...(entry.parallelGroup !== undefined ? { parallelGroup: entry.parallelGroup } : {}),
      ...(entry.dependsOn !== undefined ? { dependsOn: [...entry.dependsOn] } : {}),
    };
    return unit;
  });
  const pack = {
    schemaVersion: VERSION,
    workItemId: work.workItemId,
    stack: work.stack,
    workItemType: work.workItemType,
    ...(work.visual ? { visualStage: work.visual.stage } : {}),
    executionUnits,
  };
  const manifest = {
    schemaVersion: VERSION,
    workItemId: work.workItemId,
    stack: work.stack,
    implementationPackageRef: packagePath,
    ...(work.visual ? { visualStage: work.visual.stage } : {}),
    items: [],
  };
  const plannedWork = {
    ...work,
    allowedPaths: [...new Set(narrowedPaths)],
    implementationPackageRef: { path: packagePath },
    evidenceRef: { path: manifestPath },
    planningRef: { path: sourcePath },
    revision: work.revision + 1,
    gateStatus: { ...work.gateStatus },
  };
  for (const gate of GATE_KEYS) {
    if (plan.gateAssessments?.[gate]) plannedWork.gateStatus[gate] = plan.gateAssessments[gate].status;
  }
  validateWork(plannedWork, { repo });
  bindWorkSource(plannedWork, workSourcePath);

  const created = [];
  let createdEvidenceRoot = null;
  try {
    created.push(await createJsonFile(repo, packagePath, pack));
    createdEvidenceRoot = createEvidenceRootDirectory(repo, work.evidenceRoot);
    created.push(await createJsonFile(repo, manifestPath, manifest));
    // 使用正式加载器完成重复 ID、路径保留、单元顺序和并行所有权检查。
    loadPackage(repo, plannedWork);
    await atomicWriteJson(repo, workItem, plannedWork);
  } catch (error) {
    const rollbackErrors = rollbackCreatedFiles(repo, created);
    rollbackErrors.push(...rollbackEmptyEvidenceRoot(repo, createdEvidenceRoot));
    if (rollbackErrors.length) {
      throw new WorkflowError(`计划记录失败且新建文件回滚不完整：${error.message}; ${rollbackErrors.join('; ')}`, 'WRITE_FAILED');
    }
    throw error;
  }

  return response({
    status: 'PASS', work: plannedWork, changed: true,
    metadata: {
      workItemPath: workSourcePath,
      planningRef: sourcePath,
      implementationPackagePath: packagePath,
      evidenceManifestPath: manifestPath,
      unitIds: executionUnits.map((unit) => unit.unitId),
    },
  });
}

/** 根据当前活动批次的真实材料生成单元结果并合并证据清单。 */
export async function recordWorkResult({ repo, workItem, unitId, reportPath }) {
  return withWorkLock(repo, workItem, () => recordWorkResultLocked({ repo, workItem, unitId, reportPath }));
}

/** 在锁内校验执行事实、暂存结果和清单，并最后提交 Work Item 修订。 */
async function recordWorkResultLocked({ repo, workItem, unitId, reportPath }) {
  const work = loadWorkItem(repo, workItem);
  if (work.globalState !== 'IMPLEMENTING') throw new WorkflowError('record 只允许用于 IMPLEMENTING 状态');
  if (typeof unitId !== 'string' || !unitId.trim()) throw new WorkflowError('--unit 必须为非空单元 ID');
  if (!work.planningRef?.path) throw new WorkflowError('Work Item 缺少冻结计划来源 planningRef');

  const pack = loadPackage(repo, work);
  // 记录新回归时旧源码摘要可能已失效；最终阶段门仍会要求先刷新基线。
  const inspection = ['V4', 'V5'].includes(work.visual?.stage) ? inspectPendingRegressionExecution(repo, work) : inspectWork(repo, work);
  if (inspection.blocking.length) throw new WorkflowError(`Execution State 无效：${inspection.blocking[0]}`);
  const activeBatch = inspection.activeBatch;
  if (!Array.isArray(activeBatch) || !activeBatch.length) throw new WorkflowError('当前没有可登记结果的活动执行批次');
  const unit = pack.executionUnits.find((entry) => entry.unitId === unitId);
  if (!unit) throw new WorkflowError(`unitId 不在冻结计划中：${unitId}`);
  if (!activeBatch.includes(unit.unitId)) throw new WorkflowError(`执行单元不属于当前活动批次：${unit.unitId}`);

  const sourcePath = repoPath(repo, reportPath, 'Execution Report 路径').relative;
  const resultPath = repoPath(repo, unit.resultPath, 'Execution Result 路径').relative;
  const manifestPath = `${repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative}/manifest.json`;
  const workSourcePath = repoPath(repo, workItem, 'Work Item 路径').relative;
  if (work.evidenceRef?.path !== manifestPath) throw new WorkflowError('Work Item.evidenceRef 未绑定当前计划生成的 Evidence Manifest');
  assertDistinctPaths([
    sourcePath,
    resultPath,
    manifestPath,
    workSourcePath,
    work.implementationPackageRef.path,
    work.planningRef.path,
  ], 'Execution Report、结果和清单路径');
  assertPathAbsent(repo, resultPath, `拒绝覆盖已有单元结果：${unit.unitId}`);

  const report = readJson(repo, sourcePath, 'Execution Report');
  validateReportShape(report);
  if (work.workItemType === 'DISPLAY_LAYER' && (report.hostId !== work.visual.hostId || report.layerType !== work.visual.layerType)) throw new WorkflowError('显示层执行报告未绑定当前宿主及类型');
  if (work.workItemType !== 'DISPLAY_LAYER' && (report.hostId !== undefined || report.layerType !== undefined)) throw new WorkflowError('仅显示层执行报告可指定宿主及类型');
  const manifest = readJson(repo, manifestPath, 'Evidence Manifest');
  const initialManifestIdentity = fileIdentity(repo, manifestPath);
  const initialManifestContent = readFileSync(repoPath(repo, manifestPath).absolute);
  let initialManifestSnapshot;
  try { initialManifestSnapshot = JSON.parse(initialManifestContent.toString('utf8')); }
  catch { throw new WorkflowError('Evidence Manifest 在读取时发生并发变更', 'CONCURRENT_MODIFICATION'); }
  if (!isDeepStrictEqual(initialManifestSnapshot, manifest)) {
    throw new WorkflowError('Evidence Manifest 在读取时发生并发变更', 'CONCURRENT_MODIFICATION');
  }
  validateManifestBinding(work, pack, manifest);
  const forbiddenRecords = new Set([
    resultPath,
    manifestPath,
    workSourcePath,
    work.implementationPackageRef.path,
    work.planningRef.path,
    `${repoPath(repo, work.evidenceRoot).relative}/execution-state.json`,
    ...collectWorkReferencePaths(work, repo).map((path) => repoPath(repo, path, '工作项保留引用').relative),
    ...pack.executionUnits.map((entry) => entry.resultPath),
  ].map(pathKey));
  if (forbiddenRecords.has(pathKey(sourcePath))) throw new WorkflowError('Execution Report 不能复用 Work Item、计划、实施包、执行状态、结果或 manifest 路径');
  forbiddenRecords.add(pathKey(sourcePath));
  validateNoRecordSelfReferences(repo, report, forbiddenRecords);

  validateManifestNoSelfReferences(repo, manifest, forbiddenRecords, work.evidenceRoot);
  const normalizedEvidence = report.evidence.map((entry, index) => {
    const path = requireFile(repo, entry.path, `evidence[${index}].path`);
    if (!pathMatch(path, `${repoPath(repo, work.evidenceRoot).relative}/**`)) {
      throw new WorkflowError(`evidence[${index}] 必须位于当前 evidenceRoot：${path}`);
    }
    requireNonEmptyRegularFile(repo, path, `evidence[${index}].path`);
    if (forbiddenRecords.has(pathKey(path))) throw new WorkflowError(`evidence[${index}] 不能引用工作流记录本身：${path}`);
    if (entry.targetId && !work.visual?.targets?.some((target) => target.targetId === entry.targetId)) {
      throw new WorkflowError(`evidence[${index}].targetId 未绑定当前场景视觉目标：${entry.targetId}`);
    }
    return { category: entry.category, status: 'PASS', path, ...(entry.targetId ? { targetId: entry.targetId } : {}) };
  });
  assertUniqueEvidenceItems(normalizedEvidence);

  const result = {
    schemaVersion: VERSION,
    status: 'PASS',
    workItemId: work.workItemId,
    stack: work.stack,
    implementationPackageRef: work.implementationPackageRef.path,
    unitId: unit.unitId,
    sequence: unit.sequence,
    exitCode: 0,
    ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: report.hostId, layerType: report.layerType } : {}),
    files: [...report.files],
    commandOutputs: report.commandOutputs.map((entry) => ({ ...entry })),
  };
  // 正式校验器核对文件所有权、命令顺序、退出码和非空输出；这里不执行命令。
  validateUnitResult(repo, work, pack, unit, result);
  for (const path of result.files) {
    if (forbiddenRecords.has(pathKey(repoPath(repo, path, 'Execution Result.files').relative))) {
      throw new WorkflowError(`Execution Result.files 不能把控制器记录报告为变更文件：${path}`);
    }
  }
  const nextManifest = {
    ...manifest,
    items: mergeEvidenceItems(manifest.items, normalizedEvidence),
  };
  const plannedWork = { ...work, evidenceRef: { path: manifestPath }, revision: work.revision + 1 };
  validateWork(plannedWork, { repo });

  let createdResult = null;
  let manifestUpdate = null;
  try {
    createdResult = await createJsonFile(repo, resultPath, result);
    if (!sameIdentity(initialManifestIdentity, fileIdentity(repo, manifestPath)) ||
        !initialManifestContent.equals(readFileSync(repoPath(repo, manifestPath).absolute))) {
      throw new WorkflowError('Evidence Manifest 在提交前被其他写入修改', 'CONCURRENT_MODIFICATION');
    }
    await atomicWriteJson(repo, manifestPath, nextManifest);
    manifestUpdate = {
      path: manifestPath,
      before: manifest,
      afterIdentity: fileIdentity(repo, manifestPath),
      afterContent: readFileSync(repoPath(repo, manifestPath).absolute),
    };
    if (nextManifest.items.length) {
      // 允许部分证据清单，但已有条目仍须通过正式的 evidenceRoot/非空文件检查。
      validateEvidence(repo, plannedWork, { requireEngineering: false, requireVisual: false });
    }
    await atomicWriteJson(repo, workItem, plannedWork);
  } catch (error) {
    const rollbackErrors = await rollbackManifestUpdate(repo, manifestUpdate);
    if (createdResult) rollbackErrors.push(...rollbackCreatedFiles(repo, [createdResult]));
    if (rollbackErrors.length) {
      throw new WorkflowError(`结果记录失败且事务回滚不完整：${error.message}; ${rollbackErrors.join('; ')}`, 'WRITE_FAILED');
    }
    throw error;
  }

  return response({
    status: 'PASS', work: plannedWork, changed: true,
    metadata: {
      recordedUnit: unit.unitId,
      sequence: unit.sequence,
      resultPath,
      evidenceManifestPath: manifestPath,
      activeBatch,
    },
  });
}

/** 读取并验证 Work Item，同时保留后续保留路径检查所需的源文件绑定。 */
function loadWorkItem(repo, workItem) {
  return loadWork(repo, workItem);
}

/** 验证 Work Plan 仅包含可由调用者提供的计划字段。 */
function validatePlanShape(plan) {
  assertObjectFields(plan, PLAN_FIELDS, 'Work Plan');
  if (!Array.isArray(plan.executionUnits) || !plan.executionUnits.length) throw new WorkflowError('Work Plan.executionUnits 不能为空');
  for (const [index, unit] of plan.executionUnits.entries()) {
    assertObjectFields(unit, PLAN_UNIT_FIELDS, `executionUnits[${index}]`);
    requireSafeText(unit.unitId, `executionUnits[${index}].unitId`);
    if (!SAFE_ID.test(unit.unitId)) throw new WorkflowError(`executionUnits[${index}].unitId 不能安全用于结果文件名：${unit.unitId}`);
    requireSafeText(unit.owner, `executionUnits[${index}].owner`);
    requireStringArray(unit.paths, `executionUnits[${index}].paths`, { nonEmpty: true });
    requireStringArray(unit.acceptanceCommands, `executionUnits[${index}].acceptanceCommands`, { nonEmpty: true });
    if (unit.type !== undefined && !UNIT_TYPES.includes(unit.type)) throw new WorkflowError(`executionUnits[${index}].type 无效：${unit.type}`);
    if (unit.parallelGroup !== undefined) requireSafeText(unit.parallelGroup, `executionUnits[${index}].parallelGroup`);
    if (unit.dependsOn !== undefined) requireStringArray(unit.dependsOn, `executionUnits[${index}].dependsOn`);
  }
  if (plan.gateAssessments !== undefined) {
    assertObjectFields(plan.gateAssessments, new Set(GATE_KEYS), 'Work Plan.gateAssessments');
    for (const gate of GATE_KEYS) {
      const assessment = plan.gateAssessments[gate];
      if (assessment === undefined) continue;
      assertObjectFields(assessment, GATE_ASSESSMENT_FIELDS, `gateAssessments.${gate}`);
      if (!['PASS', 'FAIL', 'NOT_RUN'].includes(assessment.status)) throw new WorkflowError(`gateAssessments.${gate}.status 无效`);
      requireSafeText(assessment.reason, `gateAssessments.${gate}.reason`);
    }
  }
}

/** 确认所有计划前置状态均未冻结执行或证据记录。 */
function assertPlanningState(repo, work) {
  if (!['INTAKE', 'BASELINE', 'PROPOSAL', 'REVIEW'].includes(work.globalState)) {
    throw new WorkflowError(`当前状态不允许生成 Work Plan：${work.globalState}`);
  }
  if (work.implementationPackageRef || work.evidenceRef || work.planningRef) {
    throw new WorkflowError('Work Item 已绑定计划、实施包或证据，拒绝覆盖已有记录');
  }
  const evidenceRoot = repoPath(repo, work.evidenceRoot, 'Work Item.evidenceRoot').relative;
  assertPathAbsent(repo, evidenceRoot, '拒绝复用已有 evidenceRoot');
  assertPathAbsent(repo, `${evidenceRoot}/execution-state.json`, '拒绝复用已有 Execution State');
}

/** 按 Work Item 领域类型提供缺省执行单元类型。 */
function defaultUnitType(workItemType) {
  return ({
    PROJECT: 'SHARED',
    SCENE: 'SCENE',
    PAGE: 'PAGE',
    DISPLAY_LAYER: 'DISPLAY_LAYER',
    INTEGRATION: 'INTEGRATION',
    RELEASE: 'RELEASE',
  })[workItemType] ?? 'MODULE';
}

/** 验证执行报告只包含实现者可提交的真实运行字段。 */
function validateReportShape(report) {
  assertObjectFields(report, REPORT_FIELDS, 'Execution Report');
  if (report.hostId !== undefined) requireSafeText(report.hostId, 'Execution Report.hostId');
  if (report.layerType !== undefined) requireSafeText(report.layerType, 'Execution Report.layerType');
  requireStringArray(report.files, 'Execution Report.files', { nonEmpty: true });
  if (!Array.isArray(report.commandOutputs)) throw new WorkflowError('Execution Report.commandOutputs 必须为数组');
  for (const [index, entry] of report.commandOutputs.entries()) {
    assertObjectFields(entry, REPORT_COMMAND_FIELDS, `commandOutputs[${index}]`);
    requireSafeText(entry.command, `commandOutputs[${index}].command`);
    if (!Number.isSafeInteger(entry.exitCode)) throw new WorkflowError(`commandOutputs[${index}].exitCode 必须为整数`);
    requireSafeText(entry.outputFile, `commandOutputs[${index}].outputFile`);
  }
  if (!Array.isArray(report.evidence)) throw new WorkflowError('Execution Report.evidence 必须为数组');
  for (const [index, entry] of report.evidence.entries()) {
    assertObjectFields(entry, REPORT_EVIDENCE_FIELDS, `evidence[${index}]`);
    requireSafeText(entry.category, `evidence[${index}].category`);
    requireSafeText(entry.path, `evidence[${index}].path`);
    if (entry.targetId !== undefined) requireSafeText(entry.targetId, `evidence[${index}].targetId`);
  }
}

/** 确认既有 Evidence Manifest 仍绑定本次冻结计划。 */
function validateManifestBinding(work, pack, manifest) {
  assertObjectFields(manifest, new Set(['schemaVersion', 'workItemId', 'stack', 'implementationPackageRef', 'visualStage', 'items']), 'Evidence Manifest');
  if (manifest.schemaVersion !== VERSION || manifest.workItemId !== work.workItemId || manifest.stack !== work.stack ||
      manifest.implementationPackageRef !== work.implementationPackageRef.path) {
    throw new WorkflowError('Evidence Manifest 未绑定当前 Work Item 和 Implementation Package');
  }
  if (work.visual && manifest.visualStage !== pack.visualStage) throw new WorkflowError('Evidence Manifest.visualStage 与冻结计划不匹配');
  if (!work.visual && manifest.visualStage !== undefined) throw new WorkflowError('非视觉 Work Item 的 Evidence Manifest 不得注入 visualStage');
  if (!Array.isArray(manifest.items)) throw new WorkflowError('Evidence Manifest.items 必须为数组');
}

/** 拒绝把 Work Item、报告、计划、结果或清单本身伪装成原始文件。 */
function validateNoRecordSelfReferences(repo, report, forbiddenRecords) {
  const filePaths = report.files.map((path, index) => pathKey(repoPath(repo, path, `Execution Report.files[${index}]`).relative));
  const outputPaths = report.commandOutputs.map((entry, index) => pathKey(repoPath(repo, entry.outputFile, `commandOutputs[${index}].outputFile`).relative));
  const evidencePaths = new Set(report.evidence.map((entry, index) => pathKey(repoPath(repo, entry.path, `evidence[${index}].path`).relative)));
  if (new Set(filePaths).size !== filePaths.length) throw new WorkflowError('Execution Report.files 不能重复声明同一实现文件');
  if (new Set(outputPaths).size !== outputPaths.length) throw new WorkflowError('每条验收命令必须提供独立的非空输出文件');
  for (const [index, path] of report.files.entries()) {
    const normalized = repoPath(repo, path, `Execution Report.files[${index}]`).relative;
    if (forbiddenRecords.has(pathKey(normalized))) throw new WorkflowError(`Execution Report.files 不能引用工作流记录：${path}`);
    if (outputPaths.includes(pathKey(normalized)) || evidencePaths.has(pathKey(normalized))) {
      throw new WorkflowError(`Execution Report.files 不能把命令输出或 evidence 报告为实现文件：${path}`);
    }
  }
  for (const [index, entry] of report.commandOutputs.entries()) {
    const normalized = repoPath(repo, entry.outputFile, `commandOutputs[${index}].outputFile`).relative;
    if (forbiddenRecords.has(pathKey(normalized))) throw new WorkflowError(`commandOutputs[${index}] 不能把工作流记录作原始输出：${entry.outputFile}`);
  }
  for (const [index, entry] of report.evidence.entries()) {
    const normalized = repoPath(repo, entry.path, `evidence[${index}].path`).relative;
    if (forbiddenRecords.has(pathKey(normalized))) throw new WorkflowError(`evidence[${index}] 不能引用工作流记录：${entry.path}`);
  }
}

/** 校验冻结单元路径不会覆盖 Work Item、计划、结果和执行状态等控制记录。 */
function assertUnitPathsAvoidRecords(units, reservedPaths) {
  for (const unit of units) {
    for (const unitPath of unit.paths) {
      for (const reservedPath of reservedPaths) {
        if (pathsOverlap(unitPath, reservedPath)) {
          throw new WorkflowError(`执行单元路径不能覆盖工作流控制记录：${unit.unitId} (${unitPath}) / ${reservedPath}`);
        }
      }
    }
  }
}

/** 验证既有证据不会把记录文件本身充当实际材料。 */
function validateManifestNoSelfReferences(repo, manifest, forbiddenRecords, evidenceRoot) {
  const allowedItemFields = new Set(['category', 'status', 'path', 'targetId']);
  for (const [index, item] of manifest.items.entries()) {
    assertObjectFields(item, allowedItemFields, `Evidence Manifest.items[${index}]`);
    requireSafeText(item.category, `Evidence Manifest.items[${index}].category`);
    if (item.targetId !== undefined) requireSafeText(item.targetId, `Evidence Manifest.items[${index}].targetId`);
    if (item.status !== 'PASS') throw new WorkflowError(`Evidence Manifest.items[${index}].status 必须为 PASS`);
    const path = repoPath(repo, item.path, `Evidence Manifest.items[${index}].path`).relative;
    if (!pathMatch(path, `${repoPath(repo, evidenceRoot).relative}/**`)) throw new WorkflowError(`Evidence Manifest 条目越出当前 evidenceRoot：${path}`);
    if (forbiddenRecords.has(pathKey(path))) throw new WorkflowError(`Evidence Manifest 不能以工作流记录作为自身证据：${path}`);
  }
}

/** 将已有证据与新提交证据合并，并按类别和路径去重。 */
function mergeEvidenceItems(existing, incoming) {
  const merged = [];
  const seen = new Set();
  for (const item of [...existing, ...incoming]) {
    assertObjectFields(item, new Set(['category', 'status', 'path', 'targetId']), 'Evidence Manifest item');
    if (typeof item.category !== 'string' || !item.category.trim() || typeof item.path !== 'string' || !item.path.trim() || item.status !== 'PASS') {
      throw new WorkflowError('Evidence Manifest 已有条目格式无效');
    }
    if (item.targetId !== undefined) requireSafeText(item.targetId, 'Evidence Manifest item.targetId');
    // 同一证据可服务多个视图，但每个视图的绑定都必须保留。
    const key = `${item.category}\0${pathKey(item.path)}\0${item.targetId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ category: item.category, status: 'PASS', path: item.path, ...(item.targetId ? { targetId: item.targetId } : {}) });
  }
  return merged;
}

/** 拒绝一次结果报告中重复提交同类别、同路径的证据项。 */
function assertUniqueEvidenceItems(items) {
  const seen = new Set();
  for (const item of items) {
    const key = `${item.category}\0${pathKey(item.path)}\0${item.targetId ?? ''}`;
    if (seen.has(key)) throw new WorkflowError(`Execution Report.evidence 重复：${item.category} / ${item.path}`);
    seen.add(key);
  }
}

/** 校验 JSON 对象字段集合，避免身份或控制字段由报告注入。 */
function assertObjectFields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须为 JSON 对象`);
  for (const field of Object.keys(value)) if (!allowed.has(field)) throw new WorkflowError(`${label} 包含未知字段：${field}`);
}

/** 确认字符串非空并保留传入文字，不静默修剪证据引用。 */
function requireSafeText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label} 必须为非空字符串`);
}

/** 验证字符串数组的类型、非空约束及各项内容。 */
function requireStringArray(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && !value.length)) throw new WorkflowError(`${label} 必须为${nonEmpty ? '非空' : ''}字符串数组`);
  for (const [index, item] of value.entries()) requireSafeText(item, `${label}[${index}]`);
}

/** 确认一个相对路径尚未被文件、目录、符号链接或 Junction 占用。 */
function assertPathAbsent(repo, value, message) {
  const target = repoPath(repo, value, '记录输出路径');
  try {
    lstatSync(target.absolute);
    throw new WorkflowError(`${message}：${target.relative}`, 'ALREADY_EXISTS');
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (error.code !== 'ENOENT') throw new WorkflowError(`无法检查记录输出路径：${error.message}`);
  }
}

/** 验证计划证据根在 lstat 层面不存在，包含悬空链接。 */
function assertEvidenceRootAbsent(repo, value) {
  assertPathAbsent(repo, value, '拒绝复用已有 evidenceRoot');
}

/** 只放行 Work Item 明确作废并可验证归属的历史实施包。 */
function assertNoPriorPackages(repo, work) {
  const directory = '.workflow-control/implementation-packages';
  const target = repoPath(repo, directory, 'Implementation Package 目录');
  let stat;
  try { stat = lstatSync(target.absolute); }
  catch (error) {
    if (error.code === 'ENOENT') return;
    throw new WorkflowError(`无法检查 Implementation Package 目录：${error.message}`);
  }
  if (!stat.isDirectory()) throw new WorkflowError('Implementation Package 目录必须为普通目录');
  const prefix = `${work.workItemId}-r`;
  const candidates = readdirSync(target.absolute).filter((name) =>
    name === `${work.workItemId}.json` || (name.startsWith(prefix) && /^\d+\.json$/.test(name.slice(prefix.length))));
  for (const name of candidates) {
    const packagePath = `${directory}/${name}`;
    const pack = readJson(repo, packagePath, '历史 Implementation Package');
    if (pack.schemaVersion !== VERSION || pack.workItemId !== work.workItemId ||
        pack.stack !== work.stack || pack.workItemType !== work.workItemType || !Array.isArray(pack.executionUnits)) {
      throw new WorkflowError(`同名历史包身份无法验证，拒绝重新计划：${packagePath}`, 'ALREADY_EXISTS');
    }
    if (!isPackageInvalidated(repo, work, packagePath) && !hasVisualStageArchive(repo, work, pack, packagePath)) {
      throw new WorkflowError(`存在未登记或未作废的历史实施包：${packagePath}`, 'ALREADY_EXISTS');
    }
  }
}

/** 判断历史包路径是否出现在 Work Item 或 RETURN 记录的失效引用中。 */
function isPackageInvalidated(repo, work, packagePath) {
  const references = [
    ...(Array.isArray(work.invalidatedRefs) ? work.invalidatedRefs : []),
    ...(Array.isArray(work.returnRecord?.invalidatedRefs) ? work.returnRecord.invalidatedRefs : []),
  ];
  return references.some((reference) => {
    if (typeof reference?.state !== 'string' || !reference.state.trim() || typeof reference.path !== 'string') return false;
    try { return repoPath(repo, reference.path, 'invalidatedRefs.path').relative === packagePath; }
    catch { return false; }
  });
}

/** 仅接受同一 evidenceRoot 内、由已完成视觉阶段迁移生成的匹配归档。 */
function hasVisualStageArchive(repo, work, pack, packagePath) {
  if (!work.visual || !VISUAL_STAGES.includes(pack.visualStage) ||
      VISUAL_STAGES.indexOf(pack.visualStage) >= VISUAL_STAGES.indexOf(work.visual.stage) ||
      !Array.isArray(pack.executionUnits) || !pack.executionUnits.length) return false;
  const resultRoots = new Set(pack.executionUnits.map((unit) => {
    if (typeof unit.resultPath !== 'string') return null;
    try { return posix.dirname(repoPath(repo, unit.resultPath, '历史单元结果路径').relative); }
    catch { return null; }
  }));
  if (resultRoots.size !== 1 || resultRoots.has(null)) return false;
  const evidenceRoot = [...resultRoots][0];
  let entries;
  try { entries = readdirSync(repoPath(repo, evidenceRoot, '历史 evidenceRoot').absolute); }
  catch { return false; }
  const archivePrefix = `archive-${pack.visualStage}-`;
  for (const name of entries) {
    if (!name.startsWith(archivePrefix) || !/^\d+\.json$/.test(name.slice(archivePrefix.length))) continue;
    let archive;
    try { archive = readJson(repo, `${evidenceRoot}/${name}`, '视觉阶段归档'); }
    catch { continue; }
    if (archive.visualStage !== pack.visualStage || archive.implementationPackageRef?.path !== packagePath ||
        archive.evidenceRef?.path !== `${evidenceRoot}/manifest.json` || !Number.isSafeInteger(archive.revision)) continue;
    const archivedRevision = Number(name.slice(archivePrefix.length, -'.json'.length));
    if (archivedRevision !== archive.revision + 1) continue;
    const nextStage = VISUAL_STAGES[VISUAL_STAGES.indexOf(pack.visualStage) + 1];
    const matchedTransition = (work.transitionHistory ?? []).some((entry) =>
      entry.revision === archivedRevision && String(entry.from).split('/').at(-1) === pack.visualStage &&
      String(entry.to).split('/').at(-1) === nextStage);
    if (matchedTransition) return true;
  }
  return false;
}

/** 在已确认不存在的证据根内建立本次事务专属目录并保存其 inode。 */
function createEvidenceRootDirectory(repo, value) {
  const target = repoPath(repo, value, 'Evidence Root 输出路径');
  mkdirSync(dirname(target.absolute), { recursive: true });
  const safeTarget = repoPath(repo, target.relative, 'Evidence Root 输出路径');
  try { mkdirSync(safeTarget.absolute); }
  catch (error) {
    if (error.code === 'EEXIST') throw new WorkflowError(`拒绝复用并发创建的 evidenceRoot：${safeTarget.relative}`, 'ALREADY_EXISTS');
    throw new WorkflowError(`无法创建 evidenceRoot：${error.message}`, 'WRITE_FAILED');
  }
  return { path: safeTarget.relative, identity: directoryIdentity(repo, safeTarget.relative) };
}

/** 只在证据根 inode 仍属于本次事务且已经为空时删除它。 */
function rollbackEmptyEvidenceRoot(repo, created) {
  if (!created) return [];
  try {
    if (!sameIdentity(created.identity, directoryIdentity(repo, created.path))) {
      return [`${created.path}: evidenceRoot 已被其他写入替换，保留目录`];
    }
    if (readdirSync(repoPath(repo, created.path).absolute).length) {
      return [`${created.path}: evidenceRoot 含其他文件，保留目录`];
    }
    rmdirSync(repoPath(repo, created.path).absolute);
  } catch (error) {
    if (error.code !== 'ENOENT') return [`${created.path}: ${error.message}`];
  }
  return [];
}

/** 读取目录身份并拒绝链接或非目录路径。 */
function directoryIdentity(repo, value) {
  const stat = lstatSync(repoPath(repo, value, '目录身份路径').absolute);
  if (!stat.isDirectory()) throw new WorkflowError(`路径不是普通目录：${value}`);
  return { dev: stat.dev, ino: stat.ino };
}

/** 原子创建只允许新建的 JSON 文件，不覆盖其他工作项的同名记录。 */
async function createJsonFile(repo, value, data) {
  const target = repoPath(repo, value, '新建记录路径');
  mkdirSync(dirname(target.absolute), { recursive: true });
  const safeTarget = repoPath(repo, target.relative, '新建记录路径');
  const contents = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
  const temporary = `${safeTarget.absolute}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor;
  let linked = false;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, contents);
    closeSync(descriptor);
    descriptor = undefined;
    // 硬链接在目标已存在时失败且不会覆盖，避免并发 Work Item 抢写同名包。
    linkSync(temporary, safeTarget.absolute);
    linked = true;
    unlinkSync(temporary);
    return { path: safeTarget.relative, identity: fileIdentity(repo, safeTarget.relative), contents };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    try { unlinkSync(temporary); } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') throw cleanupError; }
    if (linked) {
      try { unlinkSync(safeTarget.absolute); } catch { /* 只清理本次刚建立的链接；调用方会报告创建失败。 */ }
    }
    if (error.code === 'EEXIST') throw new WorkflowError(`拒绝覆盖已有记录：${safeTarget.relative}`, 'ALREADY_EXISTS');
    throw new WorkflowError(`无法原子创建记录：${error.message}`, 'WRITE_FAILED');
  }
}

/** 只删除仍与本次创建内容和文件身份相同的文件。 */
function rollbackCreatedFiles(repo, created) {
  const errors = [];
  for (const file of [...created].reverse()) {
    try {
      if (!sameIdentity(file.identity, fileIdentity(repo, file.path))) continue;
      if (!readFileSync(repoPath(repo, file.path).absolute).equals(file.contents)) continue;
      unlinkSync(repoPath(repo, file.path).absolute);
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push(`${file.path}: ${error.message}`);
    }
  }
  return errors;
}

/** 仅在当前文件仍是本次替换版本时恢复原 Evidence Manifest。 */
async function rollbackManifestUpdate(repo, update) {
  if (!update) return [];
  try {
    if (!sameIdentity(update.afterIdentity, fileIdentity(repo, update.path))) return [`${update.path}: 文件已被其他写入替换，未执行回滚`];
    if (!readFileSync(repoPath(repo, update.path).absolute).equals(update.afterContent)) return [`${update.path}: 内容已被其他写入修改，未执行回滚`];
    // 恢复的是本控制器先前拥有的计划清单；Work Item 尚未提交新引用。
    await atomicWriteJson(repo, update.path, update.before);
  } catch (error) {
    return [`${update.path}: ${error.message}`];
  }
  return [];
}

/** 读取指定文件的稳定设备和 inode 身份，用于防止误删并发替换文件。 */
function fileIdentity(repo, value) {
  const stat = lstatSync(repoPath(repo, value, '文件身份路径').absolute);
  if (!stat.isFile()) throw new WorkflowError(`记录路径不是普通文件：${value}`);
  return { dev: stat.dev, ino: stat.ino };
}

/** 比较两次 lstat 结果是否仍指向同一普通文件。 */
function sameIdentity(left, right) {
  return Boolean(left && right && left.dev === right.dev && left.ino === right.ino);
}

/** 校验路径内容非空且目标不是链接或目录。 */
function requireNonEmptyRegularFile(repo, value, label) {
  const relative = requireFile(repo, value, label);
  if (lstatSync(repoPath(repo, relative).absolute).size === 0) throw new WorkflowError(`${label}必须为非空文件：${relative}`);
}

/** 比较路径时遵循当前平台的大小写规则。 */
function pathKey(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

/** 判断两个规范化文件路径是否相同。 */
function samePath(left, right) {
  return pathKey(left) === pathKey(right);
}

/** 判断文件、目录或声明模式是否可能覆盖保留的控制文件。 */
function pathsOverlap(left, right) {
  const normalize = (value) => {
    const path = String(value).replaceAll('\\', '/').replace(/\/+$/, '');
    return process.platform === 'win32' ? path.toLowerCase() : path;
  };
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return normalizedLeft === normalizedRight || normalizedLeft.startsWith(`${normalizedRight}/`) ||
    normalizedRight.startsWith(`${normalizedLeft}/`) || pathMatch(normalizedRight, normalizedLeft) ||
    pathMatch(normalizedLeft, normalizedRight);
}

/** 拒绝生成目标之间出现相同路径或父子文件冲突。 */
function assertDistinctPaths(values, label) {
  for (let index = 0; index < values.length; index += 1) {
    const current = pathKey(values[index]);
    for (let prior = 0; prior < index; prior += 1) {
      const previous = pathKey(values[prior]);
      if (current === previous || current.startsWith(`${previous}/`) || previous.startsWith(`${current}/`)) {
        throw new WorkflowError(`${label}存在路径冲突：${values[prior]} / ${values[index]}`);
      }
    }
  }
}
