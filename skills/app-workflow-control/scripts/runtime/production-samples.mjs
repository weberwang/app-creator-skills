import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { rawEvidence, runRecord, withinEvidenceRoot } from './scene-design-contract.mjs';
import { validateSceneCoverageRecord, validateSceneReviewRecord } from './multi-visual-contract.mjs';
import { validateSceneReuseCoverage, validateSceneReuseReview } from './visual-reuse-binding.mjs';
import { isWorld3D, readWorld3DProductionEnvelope, validateWorld3DProductionBasis, world3dFile } from './world3d-contract.mjs';
import { isWorldHudReturn } from './world3d-hud.mjs';
import { world3DModelReuse } from './world3d-model-reuse.mjs';
import { assertWorld3DModelProductionBasis } from './world3d-production-basis.mjs';

const FIELDS = ['sampleRole', 'sampleScopeIds', 'sampleBasisRef', 'sampleDecisionRequired'];

/** 使用统一诊断说明实际样本、当前依据或其依赖为何无效。 */
function insist(condition, message) {
  if (!condition) throw new WorkflowError(`代表样本：${message}`);
}

/** 验证范围身份，禁止空值、重复项和由隐式类型转换产生的身份。 */
function identifiers(items, label) {
  insist(Array.isArray(items) && items.length > 0, `${label} 必须为非空数组`);
  insist(items.every((item) => typeof item === 'string' && item.trim()), `${label} 必须包含非空字符串`);
  insist(new Set(items).size === items.length, `${label} 不能重复`);
}

/** 文件身份同时包含规范路径和摘要，不能仅凭旧路径或同一内容冒充当前版本。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256 && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 流式读取实际内容，避免为了冻结大型模型把整个文件载入内存。 */
function digestFile(path) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const fd = openSync(path, 'r');
  try {
    let count;
    while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count));
  } finally { closeSync(fd); }
  return hash.digest('hex');
}

/** 核对非空普通文件、SHA-256 和当前工作项已失效引用。 */
function frozenFile(repo, work, ref, label) {
  insist(ref && typeof ref === 'object' && !Array.isArray(ref) && Object.keys(ref).length === 2 && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 必须绑定路径和 SHA-256`);
  const path = repoPath(repo, ref.path, label).relative;
  insist(path === ref.path, `${label} 路径不规范`);
  const key = fileIdentityKey(repo, path);
  insist(!work.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === key), `${label} 已作废`);
  requireFile(repo, path, label);
  const absolute = repoPath(repo, path).absolute;
  insist(statSync(absolute).size > 0 && digestFile(absolute) === ref.sha256, `${label} 为空或内容已变化`);
  return { path, sha256: ref.sha256 };
}

/** 控制记录使用上限读取，避免把大型真实模型当作要解析的控制 JSON。 */
function frozenJson(repo, work, ref, label) {
  const path = frozenFile(repo, work, ref, label).path;
  insist(statSync(repoPath(repo, path).absolute).size <= 5 * 1024 * 1024, `${label} 结构过大`);
  return readJson(repo, path, label);
}

/** 从当前 V3 交接或已确认目标读取当前规格，不接收任意历史文件冒充制作依据。 */
function currentBasisRefs(work, world) {
  const visual = work.visual;
  if (!visual) return [];
  const refs = [];
  if (world) refs.push({ ref: world.contract.modelSpecRef });
  for (const target of [...(visual.targets ?? []), ...(visual.hud?.targets ?? [])]) {
    if (target?.reviews?.V3Layout) refs.push({ ref: target.reviews.V3Layout, target });
  }
  return refs.filter((entry) => entry.ref);
}

/** 复用场景原 V2/V3 人工确认链；3D HUD 不得跨工作项继承旧批准。 */
function validateTargetBasis(repo, work, target) {
  insist(target.sceneId === work.visual.objectId, '样本布局目标没有绑定当前宿主场景');
  const validateReuseReview = work.visual.designRoute === 'world-3d' ? undefined : validateSceneReuseReview;
  for (const name of ['V2', 'V3Decomposition', 'V3Layout']) validateSceneReviewRecord(repo, work, target, name, validateReuseReview);
}

/** 复用覆盖清单核验状态、视口和范围；HUD 投影仍绑定同一真实宿主。 */
function validateTargetCoverage(repo, work) {
  const hud = work.visual.designRoute === 'world-3d' ? work.visual.hud : null;
  const projected = hud ? { ...work, visual: { ...work.visual, coverageRef: hud.coverageRef } } : work;
  const targets = hud ? hud.targets : work.visual.targets;
  validateSceneCoverageRecord(repo, projected, targets, hud ? undefined : validateSceneReuseCoverage);
}

/** 高风险世界批次使用覆盖本批模型的一条首件线，额外的 HUD 样本仍按自己的布局依据。 */
function validateWorldModelPlan(repo, work, units, world) {
  const { contract, models } = world;
  const modelUnits = units.filter((unit) => sameRef(repo, contract.modelSpecRef, unit.sampleBasisRef));
  const hudReturn = isWorldHudReturn(work) && work.visual.modelBaselineRef;
  if (contract.productionRisk === 'low' || contract.modelReuseRef !== undefined || hudReturn) {
    insist(modelUnits.length === 0, '低风险导入、模型证据复用或仅 HUD 返修无需重新安排模型首件');
    if (contract.modelReuseRef !== undefined) world3DModelReuse(repo, work);
    return;
  }
  const samples = modelUnits.filter((unit) => unit.sampleRole === 'sample');
  insist(samples.length === 1, '高风险模型批次需要一个覆盖本批的首件单元');
  const assetIds = new Set(models.map((model) => model.assetId));
  for (const unit of modelUnits) {
    identifiers(unit.sampleScopeIds, `${unit.unitId}.sampleScopeIds`);
    insist(unit.sampleScopeIds.every((id) => assetIds.has(id)), `${unit.unitId} 范围必须属于当前模型规格`);
  }
  insist(samples[0].sampleScopeIds.length === assetIds.size, '高风险模型首件范围未覆盖本批模型');
  for (const unit of units) {
    const hudUnit = work.visual.hud?.targets?.some((target) => target.reviews?.V3Layout && sameRef(repo, target.reviews.V3Layout, unit.sampleBasisRef));
    if (!hudUnit) insist(modelUnits.includes(unit), `${unit.unitId} 高风险批次单元须声明首件或扩批依赖`);
  }
}

/** 高风险世界批次强制首件，其余路线仍在显式声明时启用样本依赖。 */
export function validateSamplePlan(repo, work, pack, { validateGlobalBaseline } = {}) {
  insist(Array.isArray(pack?.executionUnits), '实施包缺少执行单元');
  const units = pack.executionUnits;
  const declared = units.filter((unit) => FIELDS.some((field) => unit?.[field] !== undefined));
  if (isWorld3D(work) && work.visual.stage === 'V4' && !declared.length) {
    const contract = readWorld3DProductionEnvelope(repo, work);
    if (contract.productionRisk === 'low' && contract.modelReuseRef === undefined) {
      // 普通导入计划只需核对冻结分类，完整的空间、引擎和资源证据仍由阶段验收执行。
      insist(['V3', 'V4'].includes(contract.stage), '模型生产必须绑定 V3 或 V4 封套');
      assertWorld3DModelProductionBasis(repo, work, contract);
      world3dFile(repo, contract.modelSpecRef, 'V3 模型规格', work);
      return;
    }
  }
  const world = isWorld3D(work) && work.visual.stage === 'V4' ? validateWorld3DProductionBasis(repo, work) : null;
  if (world) validateWorldModelPlan(repo, work, units, world);
  if (!declared.length) return;
  insist(work.workItemType === 'SCENE' && ['world-2d', 'world-3d', 'game-ui'].includes(work.visual?.designRoute), '当前样本依赖只支持游戏 SCENE 的世界及 UI 路线');
  insist(typeof work.visual.objectId === 'string' && work.visual.objectId.trim(), '样本生产必须绑定当前真实视觉对象');
  insist(work.visual.stage === 'V4' && pack.visualStage === 'V4', '样本及正式批量生产必须绑定当前 V4');
  const bases = currentBasisRefs(work, world);
  const checked = new Set();
  let checkedCoverage = false;
  for (const unit of declared) {
    insist(['sample', 'batch'].includes(unit.sampleRole), `${unit.unitId} 缺少有效 sampleRole`);
    identifiers(unit.sampleScopeIds, `${unit.unitId}.sampleScopeIds`);
    frozenFile(repo, work, unit.sampleBasisRef, `${unit.unitId}.sampleBasisRef`);
    const basis = bases.find((entry) => sameRef(repo, entry.ref, unit.sampleBasisRef));
    insist(basis, `${unit.unitId} 未绑定当前 V3 制作或布局依据`);
    const key = fileIdentityKey(repo, unit.sampleBasisRef.path);
    if (basis.target && !checked.has(key)) {
      if (!checkedCoverage) {
        insist(typeof validateGlobalBaseline === 'function', '样本图片依据必须执行现有全局视觉基线校验');
        const hud = work.visual.designRoute === 'world-3d' ? work.visual.hud : null;
        const projected = hud ? { ...work, globalVisualBaselineRef: hud.globalVisualBaselineRef, visual: { ...work.visual, designRoute: 'game-ui' } } : work;
        validateGlobalBaseline(repo, projected, { required: true });
        validateTargetCoverage(repo, work);
        checkedCoverage = true;
      }
      validateTargetBasis(repo, work, basis.target);
      checked.add(key);
    }
    if (unit.sampleRole === 'sample') insist(typeof unit.sampleDecisionRequired === 'boolean', `${unit.unitId} 必须声明样本人工判断是否适用`);
    else insist(unit.sampleDecisionRequired === undefined, `${unit.unitId} 批量单元不能代替样本声明人工判断`);
  }
  for (const unit of declared.filter((entry) => entry.sampleRole === 'batch')) {
    insist(Array.isArray(unit.dependsOn) && unit.dependsOn.length > 0, `${unit.unitId} 批量单元缺少样本 dependsOn`);
    const matches = unit.dependsOn.map((id) => units.find((item) => item.unitId === id)).filter((item) => item?.sampleRole === 'sample');
    insist(matches.length > 0, `${unit.unitId} 未依赖样本单元`);
    const covered = new Set();
    for (const sample of matches) {
      insist(sample.sequence < unit.sequence && !(sample.parallelGroup && sample.parallelGroup === unit.parallelGroup), `${unit.unitId} 的样本必须属于更早批次`);
      insist(sameRef(repo, sample.sampleBasisRef, unit.sampleBasisRef), `${unit.unitId} 的样本制作依据版本不一致`);
      for (const id of sample.sampleScopeIds) covered.add(id);
    }
    insist(unit.sampleScopeIds.every((id) => covered.has(id)), `${unit.unitId} 的样本范围未覆盖批量范围`);
  }
}

/** 检查两个文件是否是同一路径或硬链接，防止控制文件改名冒充原始运行输出。 */
function samePhysicalFile(repo, left, right) {
  if (fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path)) return true;
  const a = statSync(repoPath(repo, left.path).absolute, { bigint: true });
  const b = statSync(repoPath(repo, right.path).absolute, { bigint: true });
  return a.ino !== 0n && b.ino !== 0n && a.dev === b.dev && a.ino === b.ino;
}

/** 控制文件即使通过硬链接换名，也不能登记为实际交付或原始运行证据。 */
export function assertNoSampleControlAliases(repo, outputPaths, controlPaths) {
  const existing = (path) => typeof path === 'string' && existsSync(repoPath(repo, path, '样本记录路径').absolute);
  for (const output of outputPaths.filter(existing)) for (const control of controlPaths.filter(existing)) {
    insist(!samePhysicalFile(repo, { path: output }, { path: control }), '样本控制记录不能作为交付、命令输出或原始证据');
  }
}

/** 验证已有人工消息覆盖当前样本范围及实际试接，不创建或推断批准。 */
function decisionRefs(repo, work, unit, sample, sources) {
  const ref = sample.humanDecisionRef;
  if (!ref) { insist(!unit.sampleDecisionRequired, '样本尚需真实人工判断'); return []; }
  const review = frozenJson(repo, work, ref, '样本人工确认');
  insist(review.schemaVersion === '1.0' && review.workItemId === sample.workItemId && review.objectId === sample.objectId && review.stage === 'V4', '样本人工确认身份或阶段错绑');
  insist(['representative-sample', 'imported-assets'].includes(review.purpose) && review.decision === 'APPROVED' && typeof review.userMessageRef === 'string' && review.userMessageRef.trim(), '样本人工判断未通过或缺少真实消息');
  const target = { path: review.targetRef, sha256: review.targetSha256 };
  frozenFile(repo, work, target, '样本人工确认展示文件');
  const explicitSource = [review.referenceTarget, target].some((value) => sources.some((source) => value?.path && sameRef(repo, value, source)));
  insist(explicitSource || (review.runtimeContextRef && sameRef(repo, review.runtimeContextRef, sample.runtimeRef)), '人工确认未绑定当前样本来源或试接');
  const scope = review.scope;
  if (scope?.kind !== 'full-object') {
    if (scope && ['representative-sample', 'design-items'].includes(scope.kind)) {
      insist(Array.isArray(scope.designItemIds) && unit.sampleScopeIds.every((id) => scope.designItemIds.includes(id)), '人工确认未覆盖样本范围');
    } else insist(explicitSource && unit.sampleScopeIds.length === 1, '人工确认缺少可核对的样本范围');
  }
  const refs = [ref, target];
  if (review.referenceTarget?.path) refs.push(review.referenceTarget);
  if (review.runtimeContextRef?.path) refs.push(review.runtimeContextRef);
  for (const item of refs) frozenFile(repo, work, item, '样本人工确认依据');
  return refs;
}

/** 核对真实试接输出或复用已有结构化引擎运行，并收集实际观测依据。 */
function runtimeRefs(repo, work, sample, sampleRef, forbidden, requireEngine) {
  frozenFile(repo, work, sample.runtimeRef, '样本运行记录');
  withinEvidenceRoot(repo, sample.runtimeRef.path, sample.evidenceRoot, '样本运行记录');
  for (const ref of forbidden) insist(!samePhysicalFile(repo, sample.runtimeRef, ref), '样本运行记录不能复用控制、规格或资源文件');
  let runtime = null;
  const absolute = repoPath(repo, sample.runtimeRef.path).absolute;
  if (statSync(absolute).size <= 5 * 1024 * 1024) {
    try { runtime = JSON.parse(readFileSync(absolute, 'utf8')); } catch { /* 原始文本输出不是 JSON 时仍可使用。 */ }
  }
  if (runtime?.phase === 'sample' && runtime?.executionMode === 'engine') {
    insist(sample.sceneRef?.path, '结构化试接缺少实际场景引用');
    const record = runRecord(repo, work, sample.runtimeRef, 'sample', sample.sceneRef, sample.evidenceRoot, forbidden, { producerWorkItemId: sample.workItemId });
    if (requireEngine) {
      const bindings = Array.isArray(record.modelBindings) ? record.modelBindings.filter((item) => item?.assetId === sample.assetId) : [];
      const binding = bindings[0];
      insist(bindings.length === 1 && typeof binding.nodeId === 'string' && binding.nodeId.trim()
        && sample.outputs.some((output) => sameRef(repo, output, binding.outputRef)), '目标引擎首件运行未绑定代表模型输出和消费节点');
    }
    const rawRefs = [record.commandEvidenceRef, ...record.checks.filter((item) => item.status === 'PASS').map((item) => item.evidenceRef)];
    for (const raw of rawRefs) for (const ref of [...forbidden, sample.runtimeRef, sample.sceneRef]) insist(!samePhysicalFile(repo, raw, ref), '试接原始输出不能复用控制、规格或资源文件');
    return [sample.runtimeRef, sample.sceneRef, ...rawRefs];
  }
  insist(!requireEngine, '高风险模型首件必须提交结构化的目标引擎运行记录');
  rawEvidence(repo, sample.runtimeRef, '样本原始运行输出', work, sample.evidenceRoot, [sampleRef, ...forbidden]);
  return [sample.runtimeRef];
}

/** 在记录或提交单元结果前核对实际样本，普通单元不引入任何新门。 */
export function validateSampleResult(repo, work, unit, result) {
  if (unit.sampleRole !== 'sample') {
    insist(result?.sampleEvidenceRef === undefined, '只有样本单元可引用试接结果');
    return [];
  }
  const sampleRef = result?.sampleEvidenceRef;
  const sample = frozenJson(repo, work, sampleRef, '样本试接记录');
  insist(sample.schemaVersion === '1.0' && sample.kind === 'production-sample' && typeof sample.workItemId === 'string' && sample.workItemId.trim(), '样本试接记录缺少有效身份');
  insist(sample.projectId === work.projectId && sample.stack === work.stack && sample.objectId === work.visual?.objectId, '样本项目、技术栈或宿主对象不一致');
  identifiers(sample.scopeIds, '样本 scopeIds');
  insist(unit.sampleScopeIds.every((id) => sample.scopeIds.includes(id)), '样本记录未覆盖计划范围');
  frozenFile(repo, work, sample.basisRef, '样本制作依据');
  insist(sameRef(repo, sample.basisRef, unit.sampleBasisRef), '样本未绑定当前制作依据版本');
  const contract = isWorld3D(work) && work.visual.stage === 'V4' ? readWorld3DProductionEnvelope(repo, work) : null;
  const modelSample = Boolean(contract && sameRef(repo, contract.modelSpecRef, unit.sampleBasisRef));
  if (modelSample) {
    insist(sample.phase === 'sample' && sample.candidateId === contract.candidateId && unit.sampleScopeIds.includes(sample.assetId), '高风险模型首件未绑定当前候选及代表模型');
    insist(Array.isArray(sample.outputs) && sample.outputs.length > 0, '高风险模型首件缺少正式模型输出');
    if (contract.sampleRef !== undefined) insist(sameRef(repo, contract.sampleRef, sampleRef), 'V4 封套首件与通过的执行结果不一致');
  }
  insist(typeof sample.evidenceRoot === 'string' && sample.evidenceRoot.trim(), '样本缺少试接证据根');
  if (modelSample && sample.workItemId === work.workItemId) insist(fileIdentityKey(repo, sample.evidenceRoot) === fileIdentityKey(repo, work.evidenceRoot), '当前首件证据根与 V4 不一致');
  withinEvidenceRoot(repo, sampleRef.path, sample.evidenceRoot, '样本试接记录');
  insist(Array.isArray(sample.sourceRefs) && sample.sourceRefs.length > 0, '样本缺少实际源文件');
  insist(sample.outputs === undefined || Array.isArray(sample.outputs), '样本 outputs 必须是数组');
  const sources = [...sample.sourceRefs, ...(sample.outputs ?? [])];
  for (const ref of sources) frozenFile(repo, work, ref, '样本来源或产物');
  const decision = decisionRefs(repo, work, unit, sample, sources);
  frozenFile(repo, work, sample.runtimeRef, '样本运行记录');
  for (const source of sources) for (const control of [sampleRef, sample.basisRef, sample.runtimeRef, sample.humanDecisionRef].filter(Boolean)) {
    insist(!samePhysicalFile(repo, source, control), '样本来源或产物不能复用控制、规格或运行记录');
  }
  const forbidden = [sampleRef, sample.basisRef, ...sources, sample.humanDecisionRef].filter(Boolean);
  const runtime = runtimeRefs(repo, work, sample, sampleRef, forbidden, modelSample);
  return [sampleRef, sample.basisRef, ...sources, ...runtime, ...decision].map((ref) => frozenFile(repo, work, ref, '样本冻结依据'));
}

/** 样本 PASS 时冻结结果与所有观察和确认的真实摘要，后续批次不能消费原地替换的内容。 */
export function freezeSampleResult(repo, work, unit, result) {
  const refs = validateSampleResult(repo, work, unit, result);
  if (unit.sampleRole !== 'sample') return null;
  const path = requireFile(repo, unit.resultPath, '样本单元结果');
  const resultRef = { path, sha256: digestFile(repoPath(repo, path).absolute) };
  const unique = new Map();
  for (const ref of refs) unique.set(fileIdentityKey(repo, ref.path), ref);
  return { schemaVersion: '1.0', resultRef, references: [...unique.values()].sort((a, b) => {
    const left = fileIdentityKey(repo, a.path);
    const right = fileIdentityKey(repo, b.path);
    return left < right ? -1 : left > right ? 1 : 0;
  }) };
}

/** 已通过样本在每次检查时重新校验冻结摘要及全部真实依据。 */
export function assertSampleResult(repo, work, unit, result, stateUnit) {
  if (unit.sampleRole !== 'sample') {
    insist(stateUnit?.sampleSnapshot === undefined, '非样本单元不能保存样本快照');
    validateSampleResult(repo, work, unit, result);
    return;
  }
  const actual = freezeSampleResult(repo, work, unit, result);
  insist(JSON.stringify(stateUnit?.sampleSnapshot) === JSON.stringify(actual), '样本结果或其冻结依据已变化，必须重新验证');
}

/** 解析当前引用的样本控制文件；原始资源和日志只收集路径，不当作控制 JSON。 */
function collectedReferences(repo, work, suppliedPack, suppliedState) {
  const all = new Map();
  const controls = new Map();
  const add = (ref, control = false) => {
    if (!ref?.path) return;
    const path = repoPath(repo, ref.path, '样本保留引用').relative;
    const key = fileIdentityKey(repo, path);
    all.set(key, path);
    if (control) controls.set(key, path);
  };
  let pack = suppliedPack;
  if (!pack && work.implementationPackageRef?.path && existsSync(repoPath(repo, work.implementationPackageRef.path).absolute)) pack = readJson(repo, work.implementationPackageRef.path, '样本实施包');
  if (!pack) return { all: [], controls: [] };
  // 普通任务没有样本责任时无需读取执行状态，保留原有状态材料校验与诊断顺序。
  if (!Array.isArray(pack.executionUnits) || !pack.executionUnits.some((unit) => FIELDS.some((field) => unit?.[field] !== undefined))) return { all: [], controls: [] };
  let state = suppliedState;
  const statePath = work.evidenceRoot ? `${work.evidenceRoot}/execution-state.json` : null;
  if (!state && statePath && existsSync(repoPath(repo, statePath).absolute)) state = readJson(repo, statePath, '样本执行状态');
  for (const unit of Array.isArray(pack.executionUnits) ? pack.executionUnits : []) {
    add(unit.sampleBasisRef, true);
    if (unit.sampleRole !== 'sample') continue;
    const saved = (Array.isArray(state?.units) ? state.units : []).find((item) => item.unitId === unit.unitId)?.sampleSnapshot;
    for (const ref of saved?.references ?? []) add(ref);
    if (!unit.resultPath || !existsSync(repoPath(repo, unit.resultPath).absolute)) continue;
    let result;
    try { result = readJson(repo, unit.resultPath, '样本执行结果'); } catch { continue; }
    const sampleRef = result.sampleEvidenceRef;
    if (!sampleRef?.path) continue;
    add(sampleRef, true);
    if (!existsSync(repoPath(repo, sampleRef.path).absolute)) continue;
    let sample;
    try {
      insist(statSync(repoPath(repo, sampleRef.path).absolute).size <= 5 * 1024 * 1024, '样本试接控制记录过大');
      sample = readJson(repo, sampleRef.path, '样本试接记录');
    } catch (error) { if (error instanceof WorkflowError && error.message.includes('控制记录过大')) throw error; continue; }
    add(sample.basisRef, true);
    for (const ref of [...(Array.isArray(sample.sourceRefs) ? sample.sourceRefs : []), ...(Array.isArray(sample.outputs) ? sample.outputs : [])]) add(ref);
    add(sample.sceneRef);
    add(sample.runtimeRef);
    add(sample.humanDecisionRef, true);
    for (const [ref, kind] of [[sample.runtimeRef, 'runtime'], [sample.humanDecisionRef, 'decision']]) {
      if (!ref?.path || !existsSync(repoPath(repo, ref.path).absolute)) continue;
      let value;
      try {
        const absolute = repoPath(repo, ref.path).absolute;
        if (statSync(absolute).size > 5 * 1024 * 1024) continue;
        value = readJson(repo, ref.path, '样本关联记录');
      } catch { continue; }
      if (kind === 'runtime' && value.phase === 'sample' && value.executionMode === 'engine') {
        add(ref, true); add(value.sceneRef); add(value.commandEvidenceRef);
        for (const check of value.checks ?? []) add(check?.evidenceRef);
      }
      if (kind === 'decision') {
        add(value.referenceTarget); add(value.runtimeContextRef); add(value.assetManifestRef);
        if (typeof value.targetRef === 'string') add({ path: value.targetRef });
      }
    }
  }
  return { all: [...all.values()], controls: [...controls.values()] };
}

/** 防止现有样本、依据和观察被后续结果输出覆盖。 */
export function collectSampleReferences(repo, work, pack, state) {
  return collectedReferences(repo, work, pack, state).all;
}

/** 原始运行输出仍可复用，只有控制记录应被排除为生产覆盖原始证据。 */
export function collectSampleControlReferences(repo, work, pack, state) {
  return collectedReferences(repo, work, pack, state).controls;
}
