import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, repoPath, requireFile, WorkflowError } from './io.mjs';
import { inspectProductionDependencySource } from './production-dependency-inspector.mjs';
import { isArchivedWorld3DSource } from './world3d-file-snapshots.mjs';

// 缓存仅存在于一次同步校验内；嵌套来源和并行工作项不能共享可变的复用结论。
const inspections = new AsyncLocalStorage();

/** 在同一校验链复用已核验来源，退出后立即丢弃缓存和循环检测状态。 */
export function withWorld3DModelReuse(callback) {
  return inspections.getStore() ? callback() : inspections.run({ checked: new Map(), visiting: new Set() }, callback);
}

/** 读取不可变的来源记录；历史业务文件的解析由严格来源检查负责。 */
function frozenJson(repo, ref, label) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) {
    throw new WorkflowError(`模型复用：${label} 必须绑定路径和 SHA-256`);
  }
  const path = requireFile(repo, ref.path, label);
  if (path !== ref.path) throw new WorkflowError(`模型复用：${label} 路径不规范`);
  const absolute = repoPath(repo, path).absolute;
  // 这里只读取控制 JSON，避免错误引用大型模型时无界载入；解析与哈希使用同一份字节。
  if (statSync(absolute).size > 5 * 1024 * 1024) throw new WorkflowError(`模型复用：${label} 超过控制记录读取上限`);
  const bytes = readFileSync(absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`模型复用：${label} 内容已变化或为空`);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch { throw new WorkflowError(`模型复用：${label} 不是有效 JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`模型复用：${label} 必须为 JSON 对象`);
  return value;
}

/** 同一份已确认方向必须保留文件身份，不能只凭文字近似继承模型试接。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256 && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 将不影响语义的清单顺序归一化，模型尺寸、接口和所有其他规格仍完整比较。 */
function modelDefinitions(spec) {
  if (!Array.isArray(spec?.models) || !spec.models.length) throw new WorkflowError('模型复用：缺少正式模型规格');
  return spec.models.map((model) => ({
    ...model,
    ...(Array.isArray(model.interfaces) ? { interfaces: [...model.interfaces].sort((left, right) => String(left.id).localeCompare(String(right.id))) } : {}),
  })).sort((left, right) => String(left.assetId).localeCompare(String(right.assetId)));
}

/** 高风险首件复用还要求当前白模及空间事实处于相同验证条件。 */
function spatialFacts(repo, ref) {
  const { schemaVersion, workItemId, projectId, stack, objectId, candidateId, ...facts } = frozenJson(repo, ref, '空间规格');
  return { ...facts, scopeIds: [...facts.scopeIds].sort(), regions: [...facts.regions].sort((left, right) => left.id.localeCompare(right.id)) };
}

/** 仅在已完成来源的归档内读取改版前的样本复用包装。 */
function reuseSourceRef(repo, work, contract) {
  if (contract.modelReuseRef !== undefined) return contract.modelReuseRef;
  if (contract.productionRisk !== undefined || !contract.sampleRef || !isArchivedWorld3DSource(repo, work)) return undefined;
  const sample = frozenJson(repo, contract.sampleRef, '历史样本记录');
  if (sample.sourceWorkItemRef === undefined) return undefined;
  if (sample.phase !== 'sample' || typeof sample.reuseReason !== 'string' || !sample.reuseReason.trim()) throw new WorkflowError('模型复用：历史样本缺少复用理由');
  for (const [field, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) {
    if (sample[field] !== expected) throw new WorkflowError(`模型复用：历史样本 ${field} 身份错绑`);
  }
  return sample.sourceWorkItemRef;
}

/** 历史复用包装本身没有运行，以链上实际执行首件的 V4 空间为准。 */
function firstItemBasis(repo, modelBasis) {
  let basis = modelBasis;
  for (let depth = 0; depth < 64; depth++) {
    if (basis.productionRisk !== undefined || !basis.sampleRef) return basis;
    const sample = frozenJson(repo, basis.sampleRef, '历史首件证据');
    if (!sample.sourceWorkItemRef) return basis;
    // 进入此处前，历史来源校验已检查整条证据链及同场景身份。
    const producer = frozenJson(repo, sample.sourceWorkItemRef, '历史首件来源');
    const archive = frozenJson(repo, producer.visual.modelBaselineRef, '历史首件的 V4 模型归档');
    basis = frozenJson(repo, archive.world3dModelBaseline?.domainEvidenceRef, '历史首件的 V4 场景合同');
  }
  throw new WorkflowError('模型复用：历史首件来源链过深');
}

/** 核对复用声明及原来源，不自动继承空间、方向或当前场景的人工验收。 */
function inspectReuse(repo, work) {
  if (!work.visual?.domainEvidenceRef?.path) return null;
  const contract = frozenJson(repo, work.visual.domainEvidenceRef, '当前场景领域合同');
  const sourceRef = reuseSourceRef(repo, work, contract);
  if (sourceRef === undefined) return null;
  if (!['V4', 'V5'].includes(work.visual.stage)) throw new WorkflowError('模型复用：仅 V4/V5 可引用来源工作项');
  const source = frozenJson(repo, sourceRef, '来源工作项');
  if (source.workItemId === work.workItemId || source.projectId !== work.projectId || source.stack !== work.stack || source.workItemType !== 'SCENE' || source.visual?.designRoute !== 'world-3d' || source.visual.objectId !== work.visual.objectId || source.visual.stage !== 'V5' || source.globalState !== 'COMPLETE') {
    throw new WorkflowError('模型复用：来源必须是同项目、同技术栈、同场景的另一已完成 V5 三维工作项');
  }
  if (!sameRef(repo, source.globalVisualBaselineRef, work.globalVisualBaselineRef)) throw new WorkflowError('模型复用：全局视觉方向已变化，需要当前导入验证');
  const result = inspectProductionDependencySource(repo, source, sourceRef.path);
  if (result?.status !== 'PASS' || result.blocking?.length) throw new WorkflowError('模型复用：来源历史完成材料未通过严格检查');
  const original = frozenJson(repo, source.visual.domainEvidenceRef, '来源场景领域合同');
  const archive = frozenJson(repo, source.visual.modelBaselineRef, '来源 V4 模型归档');
  const modelBasis = frozenJson(repo, archive.world3dModelBaseline?.domainEvidenceRef, '来源已验收模型合同');
  if (!sameRef(repo, original.modelSpecRef, modelBasis.modelSpecRef)) throw new WorkflowError('模型复用：来源 V5 已偏离 V4 验收规格');
  // 低风险常规导入能证明模型曾使用，高风险首件还必须覆盖本批接入风险。
  if (contract.productionRisk === 'high') {
    const firstItem = firstItemBasis(repo, modelBasis);
    const hasLegacySample = firstItem.productionRisk === undefined && firstItem.sampleRef?.path;
    if (firstItem.productionRisk !== 'high' && !hasLegacySample) throw new WorkflowError('模型复用：来源未通过高风险首件验证');
    if (firstItem.blockoutRef?.sha256 !== contract.blockoutRef?.sha256
      || !isDeepStrictEqual(spatialFacts(repo, firstItem.spatialSpecRef), spatialFacts(repo, contract.spatialSpecRef))) {
      throw new WorkflowError('模型复用：高风险首件的白模或空间条件已变化');
    }
  }
  const currentSpec = frozenJson(repo, contract.modelSpecRef, '当前模型规格');
  const originalSpec = frozenJson(repo, modelBasis.modelSpecRef, '来源模型规格');
  if (!sameRef(repo, original.directionRef, contract.directionRef) || currentSpec.units !== originalSpec.units || !isDeepStrictEqual(modelDefinitions(currentSpec), modelDefinitions(originalSpec))) {
    throw new WorkflowError('模型复用：模型、尺寸、接口、单位或方向已变化，需要当前导入验证');
  }
  const review = frozenJson(repo, source.assetReviewRef, '来源资源评审');
  if (!Array.isArray(review.assets)) throw new WorkflowError('模型复用：来源缺少已验收模型');
  return { review };
}

/** 每次重新读取引用身份，防止跨命令沿用旧 PASS 或复用链循环。 */
export function world3DModelReuse(repo, work) {
  return withWorld3DModelReuse(() => {
    const state = inspections.getStore();
    const key = JSON.stringify([resolve(repo), work.projectId, work.stack, work.workItemId, work.visual?.objectId, work.visual?.candidateId, work.visual?.domainEvidenceRef, work.assetReviewRef, work.globalVisualBaselineRef]);
    if (state.checked.has(key)) return state.checked.get(key);
    if (state.visiting.has(key) || state.visiting.size >= 64) throw new WorkflowError('模型复用：来源链循环或过深');
    state.visiting.add(key);
    try {
      const value = inspectReuse(repo, work);
      state.checked.set(key, value);
      return value;
    } finally { state.visiting.delete(key); }
  });
}

/** 仅复用完全相同的已验收模型条目，当前文件字节仍由调用方严格核验。 */
export function reusedWorld3DAsset(repo, work, asset) {
  const reuse = world3DModelReuse(repo, work);
  if (!reuse) return null;
  const matches = reuse.review.assets.filter((item) => item?.assetType === 'model' && item.assetId === asset.assetId);
  if (matches.length !== 1 || !isDeepStrictEqual(matches[0], asset)) throw new WorkflowError(`模型复用：${asset.assetId} 资源版本或导入来源已变化`);
  const original = matches[0];
  return {
    imported: frozenJson(repo, original.importEvidenceRef, `${asset.assetId} 来源导入证据`),
    consumer: frozenJson(repo, original.consumerEvidenceRef, `${asset.assetId} 来源消费者证据`),
  };
}
