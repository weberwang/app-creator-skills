import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readJson, repoPath, requireFile, fileIdentityKey, WorkflowError } from './io.mjs';
import { dependencyPath } from './feature-dependencies.mjs';
import { bindWorkSource } from './work-source.mjs';
import { validateProductionScope } from './production-scope.mjs';
import { collectSystemCoverageReferences } from './system-coverage.mjs';

/** 收集最终范围的冻结输入，不能把来源包或其需求设计当作本次交付改写。 */
export function collectIntegrationScopeReferences(repo, work) {
  if (!work.integrationScopeRef?.path) return [];
  const scope = readJson(repo, work.integrationScopeRef.path, '最终范围保留引用');
  const paths = [];
  /** 只收集实际声明的文件，具体身份和完整性继续由最终范围门核验。 */
  const add = (ref) => { if (typeof ref?.path === 'string' && ref.path.trim()) paths.push(ref.path); };
  for (const object of scope.objects ?? []) {
    for (const name of ['workItemRef', 'functionBaselineRef', 'implementationPackageRef', 'evidenceRef']) add(object[name]);
    for (const ref of object.deliverableRefs ?? []) add(ref);
  }
  for (const source of [...(scope.systemSources ?? []), ...(scope.productionSources ?? [])]) add(source.workItemRef);
  for (const mapping of scope.systemCoverageMappings ?? []) {
    add(mapping.sourcePackageRef);
    if (mapping.sourcePackageRef?.path) {
      const pack = readJson(repo, mapping.sourcePackageRef.path, '最终系统来源保留引用');
      paths.push(...collectSystemCoverageReferences(pack));
    }
  }
  return [...new Set(paths)];
}

/** 读取同一份字节并固定身份，不将哈希检查与后续解析拆成两次读盘。 */
function frozenJson(repo, ref, label) {
  const path = requireFile(repo, ref?.path, label);
  const bytes = readFileSync(repoPath(repo, path).absolute);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (!bytes.length || (ref.sha256 !== undefined && ref.sha256 !== sha256)) throw new WorkflowError(`${label}内容已变化或为空`);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`${label}不是有效 JSON：${error.message}`); }
  return { ref: { path, sha256 }, value };
}

/** 保留功能重验前已登记的系统身份，避免 V4/V5 返修包覆盖最初 V1 需求。 */
export function functionCoverageOrigins(repo, snapshot) {
  const refs = [...(snapshot.systemCoverageOrigins ?? [])];
  const originals = [snapshot.work ? { work: snapshot.work, files: snapshot.files } : null,
    ...(snapshot.sources ?? []).map((source) => ({ work: source, files: source.files }))].filter(Boolean);
  for (const original of originals) {
    const path = original.work.implementationPackageRef?.path;
    if (!path) continue;
    const frozen = original.files?.find((entry) => fileIdentityKey(repo, entry.path) === fileIdentityKey(repo, path));
    if (!frozen?.sha256) throw new WorkflowError('功能基线缺少系统来源实施包的冻结身份');
    refs.push(frozen);
  }
  const result = new Map();
  for (const ref of refs) {
    if (!/^[a-f0-9]{64}$/.test(ref?.sha256 ?? '')) throw new WorkflowError('功能系统来源必须绑定 SHA-256');
    const loaded = frozenJson(repo, ref, '功能系统来源实施包');
    result.set(fileIdentityKey(repo, loaded.ref.path), loaded.ref);
  }
  return [...result.values()];
}

/** 从最终对象及其真实功能／生产前批追溯系统设计；局部功能旧包保留独立身份。 */
export function collectIntegrationSystemSources(repo, work, scope, inspectSource) {
  if (typeof inspectSource !== 'function') throw new WorkflowError('最终集成必须严格检查参与对象');
  const packages = new Map();
  const completedBatches = new Map();
  const active = new Set();
  const checked = new Set();

  /** 合并同一来源的消费对象，要求每份不同阶段的需求都参与最终映射。 */
  function addPackage(ref, source, objectId, origin = false) {
    const loaded = frozenJson(repo, ref, '最终系统来源实施包');
    const pack = loaded.value;
    if (pack.schemaVersion !== '1.0' || pack.stack !== work.stack || (!origin && (pack.workItemId !== source.workItemId || pack.workItemType !== source.workItemType))) throw new WorkflowError('最终系统来源实施包身份不匹配');
    const key = fileIdentityKey(repo, loaded.ref.path);
    const prior = packages.get(key);
    if (prior && prior.packRef.sha256 !== loaded.ref.sha256) throw new WorkflowError('最终系统来源在检查期间被改写');
    if (!prior) packages.set(key, { packRef: loaded.ref, pack, objectIds: [] });
    const entry = packages.get(key);
    if (!entry.objectIds.includes(objectId)) entry.objectIds.push(objectId);
  }

  /** 每个消费上下文都遍历依赖，避免共享模块只验证第一个页面或场景。 */
  function visit(ref, objectId, historical = false) {
    const loaded = frozenJson(repo, ref, '最终系统来源工作项');
    const key = `${fileIdentityKey(repo, loaded.ref.path)}:${loaded.ref.sha256}:${objectId}`;
    const checkedKey = `${key}:${historical ? 'historical' : 'current'}`;
    if (active.has(key)) throw new WorkflowError('最终系统来源依赖存在循环');
    if (checked.has(checkedKey)) return;
    const source = bindWorkSource(loaded.value, loaded.ref.path);
    if (source.workItemId === work.workItemId || source.projectId !== work.projectId || source.stack !== work.stack) throw new WorkflowError('最终系统来源项目、技术栈或工作项身份不匹配');
    if (source.visual && (source.visual.designIntent === 'proposal' || source.visual.stage !== 'V5' || source.globalState !== 'COMPLETE')) throw new WorkflowError('最终系统的视觉来源必须完成实际 V5，不能采用仅设计提案');
    if (!['PASSED', 'COMPLETE'].includes(source.globalState)) throw new WorkflowError('最终系统来源尚未完成实际验证');
    active.add(key);
    try {
      const result = inspectSource(repo, source, { strict: true, historical });
      if (!result || typeof result.then === 'function' || result.status !== 'PASS' || result.blocking?.length) throw new WorkflowError(`参与对象 ${objectId} 严格检查未通过`);
      if (source.productionScopeRef && source.globalState === 'COMPLETE') {
        const production = validateProductionScope(repo, source);
        if (production?.batch) {
          const batchKey = `${fileIdentityKey(repo, source.productionScopeRef.path)}:${source.productionScopeRef.sha256}:${source.productionBatchId}`;
          const covered = completedBatches.get(batchKey) ?? new Set();
          // 视觉来源只证明自身对象；不能把下游消费者或声明数组当作已验证的整批范围。
          const represented = source.visual ? [source.visual.objectId] : ['MODULE', 'INTEGRATION'].includes(source.workItemType) ? production.batch.objectIds : [];
          for (const id of represented) covered.add(id);
          completedBatches.set(batchKey, covered);
        }
      }
      addPackage(source.implementationPackageRef, source, objectId);
      for (const dependency of source.visual?.functionDependencies ?? []) visit({ ...dependency.workItemRef, path: dependencyPath(repo, dependency.workItemRef.path) }, objectId, historical);
      for (const dependency of source.productionDependencies ?? []) visit(dependency.workItemRef, objectId, true);
      if (source.visual?.functionBaselineRef?.path) {
        const snapshot = frozenJson(repo, source.visual.functionBaselineRef, '最终功能系统基线').value;
        for (const origin of functionCoverageOrigins(repo, snapshot)) addPackage(origin, source, objectId, true);
        for (const dependency of snapshot.dependencies ?? []) visit({ ...dependency.workItemRef, path: dependencyPath(repo, dependency.workItemRef.path) }, objectId, historical);
      }
      checked.add(checkedKey);
    } finally { active.delete(key); }
  }

  for (const object of scope.objects) visit(object.workItemRef, object.objectId);
  if (!Array.isArray(scope.systemSources ?? [])) throw new WorkflowError('最终集成独立系统来源必须为数组');
  const explicitSources = new Set();
  const objectIds = new Set(scope.objects.map((object) => object.objectId));
  for (const entry of scope.systemSources ?? []) {
    if (!entry || Object.keys(entry).some((key) => !['workItemRef', 'objectIds'].includes(key)) || !/^[a-f0-9]{64}$/.test(entry.workItemRef?.sha256 ?? '') || !Array.isArray(entry.objectIds) || !entry.objectIds.length || new Set(entry.objectIds).size !== entry.objectIds.length || entry.objectIds.some((id) => !objectIds.has(id))) throw new WorkflowError('最终集成独立系统来源必须冻结工作项并关联实际消费对象');
    const sourcePath = fileIdentityKey(repo, entry.workItemRef.path);
    if (explicitSources.has(sourcePath)) throw new WorkflowError('最终集成独立系统来源不能重复');
    explicitSources.add(sourcePath);
    const source = frozenJson(repo, entry.workItemRef, '独立系统来源工作项').value;
    if (!['FOUNDATION', 'MODULE', 'INTEGRATION'].includes(source.workItemType) || source.visual || (source.workItemType === 'INTEGRATION' && source.integrationPurpose !== 'feature')) throw new WorkflowError('独立系统来源必须是基础能力、模块或早期功能集成');
    for (const objectId of entry.objectIds) visit(entry.workItemRef, objectId);
  }
  const production = validateProductionScope(repo, work);
  if (!Array.isArray(scope.productionSources ?? [])) throw new WorkflowError('最终集成生产批次来源必须为数组');
  const unscopedSourcePaths = new Set();
  const unscopedWorkIds = new Set();
  for (const entry of scope.productionSources ?? []) {
    if (!entry || Object.keys(entry).some((key) => !['workItemRef', 'objectIds'].includes(key)) || !/^[a-f0-9]{64}$/.test(entry.workItemRef?.sha256 ?? '') || !Array.isArray(entry.objectIds) || !entry.objectIds.length || new Set(entry.objectIds).size !== entry.objectIds.length || entry.objectIds.some((id) => !objectIds.has(id))) throw new WorkflowError('生产批次来源必须冻结工作项并关联总范围内对象');
    const loaded = frozenJson(repo, entry.workItemRef, '生产批次来源工作项');
    const source = loaded.value;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new WorkflowError('生产批次来源工作项必须为对象');
    if (production) {
      const batch = production.batches.get(source.productionBatchId);
      if (source.globalState !== 'COMPLETE' || !batch || source.productionScopeRef?.sha256 !== work.productionScopeRef.sha256 || fileIdentityKey(repo, source.productionScopeRef?.path) !== fileIdentityKey(repo, work.productionScopeRef.path) || entry.objectIds.some((id) => !batch.objectIds.includes(id))) throw new WorkflowError('生产批次来源未完成或与当前冻结总范围或批次对象不匹配');
      if (source.visual && entry.objectIds.some((id) => id !== source.visual.objectId)) throw new WorkflowError('单个视觉来源不能代表同一批次的其他对象');
    } else {
      // 未绑定总范围时只接受显式登记的同类型、同对象历史批次。
      const sourcePath = fileIdentityKey(repo, loaded.ref.path);
      if (unscopedSourcePaths.has(sourcePath) || unscopedWorkIds.has(source.workItemId)) throw new WorkflowError('未绑定总范围的历史对象来源不能重复');
      const object = scope.objects.find((item) => item.objectId === entry.objectIds[0]);
      const current = frozenJson(repo, object.workItemRef, '当前对象工作项').value;
      const sameObject = entry.objectIds.length === 1 && ['SCENE', 'PAGE'].includes(source.workItemType) && current?.workItemType === source.workItemType &&
        source.visual?.objectId === entry.objectIds[0] && current.visual?.objectId === entry.objectIds[0];
      const sameProject = source.projectId === work.projectId && current?.projectId === work.projectId && source.stack === work.stack && current?.stack === work.stack;
      const distinctWork = typeof source.workItemId === 'string' && source.workItemId.trim() && typeof current?.workItemId === 'string' && current.workItemId.trim() && source.workItemId !== current.workItemId;
      const validHistory = source.productionScopeRef === undefined && current?.productionScopeRef === undefined && source.globalState === 'COMPLETE' && source.visual?.stage === 'V5' && source.visual?.designIntent !== 'proposal';
      if (!sameObject || !sameProject || !distinctWork || !validHistory) throw new WorkflowError('未绑定总范围的历史来源必须是同项目、同对象已完成的不同 SCENE 或 PAGE 工作项');
      unscopedSourcePaths.add(sourcePath);
      unscopedWorkIds.add(source.workItemId);
    }
    for (const objectId of entry.objectIds) visit(entry.workItemRef, objectId, true);
  }
  if (production) {
    for (const batch of production.batches.values()) for (const objectId of batch.objectIds) {
      const key = `${fileIdentityKey(repo, work.productionScopeRef.path)}:${work.productionScopeRef.sha256}:${batch.batchId}`;
      if (!completedBatches.get(key)?.has(objectId)) {
        throw new WorkflowError(`最终集成缺少生产批次系统来源：${batch.batchId} / ${objectId}`);
      }
    }
  }
  return [...packages.values()];
}
