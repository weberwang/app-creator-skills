import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { atomicWriteJson, fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { isWorldHudReturn } from './world3d-hud.mjs';

// 异步调用上下文按工作项隔离；历史来源嵌套检查不能把其他项目的旧文件带入当前候选。
const context = new AsyncLocalStorage();
const STAGES = ['V1', 'V4', 'V5'];

/** 验证引用及内容摘要，快照文件与真实引用使用相同的 SHA-256。 */
function bytesFor(repo, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}必须绑定路径和 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  if (path !== ref.path) throw new WorkflowError(`${label}路径不规范`);
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const fd = openSync(repoPath(repo, path, label).absolute, 'r');
  let total = 0;
  try {
    let count;
    while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0) { hash.update(buffer.subarray(0, count)); total += count; }
  } finally { closeSync(fd); }
  if (!total || hash.digest('hex') !== ref.sha256) throw new WorkflowError(`${label}为空或内容已变化`);
}

/** 控制目录和当前阶段证据根不属于允许用业务快照替代的范围。 */
function controlPath(repo, work, path) {
  const key = fileIdentityKey(repo, path);
  const controller = fileIdentityKey(repo, '.workflow-control');
  const evidence = work.evidenceRoot ? fileIdentityKey(repo, work.evidenceRoot) : null;
  return key === controller || key.startsWith(`${controller}/`) || (evidence && (key === evidence || key.startsWith(`${evidence}/`)));
}

/** 从已通过的三维阶段提取真实业务文件，控制记录和运行日志保持原文件校验。 */
function sourceRefs(repo, work, { mutableOnly = false } = {}) {
  const contract = frozenJson(repo, work.visual.domainEvidenceRef, '世界场景合同');
  const protectedPaths = new Set(Object.entries(contract).filter(([name]) => !['blockoutRef', 'formalSceneRef'].includes(name))
    .map(([, ref]) => ref?.path).filter(Boolean));
  for (const ref of [work.visual.domainEvidenceRef, work.visual.functionBaselineRef, work.visual.modelProductionBasisRef, work.visual.modelBaselineRef,
    work.globalVisualBaselineRef, work.assetReviewRef, work.evidenceRef, work.implementationPackageRef, work.planningRef]) {
    if (ref?.path) protectedPaths.add(ref.path);
  }
  const refs = [];
  if (work.visual.stage === 'V1') refs.push(contract.blockoutRef);
  if (work.visual.stage === 'V4') {
    const sample = contract.sampleRef === undefined ? null : frozenJson(repo, contract.sampleRef, '高风险模型首件');
    const review = frozenJson(repo, work.assetReviewRef, '模型资源评审');
    const spec = frozenJson(repo, contract.modelSpecRef, '模型规格');
    const modelIds = new Set((spec.models ?? []).map((item) => item.assetId));
    if (sample && !mutableOnly) refs.push(sample.sceneRef, ...(sample.sourceRefs ?? []), ...(sample.outputs ?? []));
    if (sample?.runtimeRef?.path) protectedPaths.add(sample.runtimeRef.path);
    const legacyReuse = contract.productionRisk === undefined && sample?.sourceWorkItemRef;
    if (legacyReuse?.path) protectedPaths.add(legacyReuse.path);
    for (const asset of review.assets ?? []) {
      if (asset.assetType !== 'model' || !modelIds.has(asset.assetId)) continue;
      refs.push({ path: asset.sourceRef, sha256: asset.sourceSha256 }, { path: asset.output, sha256: asset.outputSha256 });
      for (const ref of [asset.importEvidenceRef, asset.consumerEvidenceRef]) if (ref?.path) protectedPaths.add(ref.path);
      if (asset.generationRecord) protectedPaths.add(asset.generationRecord);
      const consumer = frozenJson(repo, asset.consumerEvidenceRef, '模型消费者证据');
      // 复用时旧消费者场景由来源快照核验，当前阶段仍冻结每个实际交付的模型版本。
      if (!mutableOnly && contract.modelReuseRef === undefined && !legacyReuse) refs.push(consumer.sceneRef, consumer.outputRef);
    }
  }
  if (work.visual.stage === 'V5') {
    const run = frozenJson(repo, contract.formalRunRef, '正式运行记录');
    const spec = frozenJson(repo, contract.modelSpecRef, '模型规格');
    const modelIds = new Set((spec.models ?? []).map((item) => item.assetId));
    refs.push(contract.formalSceneRef, ...(!mutableOnly ? (run.modelBindings ?? []).filter((item) => modelIds.has(item.assetId)).map((item) => item.outputRef) : []));
  }
  const protectedKeys = new Set([...protectedPaths].map((path) => fileIdentityKey(repo, path)));
  const unique = new Map();
  for (const ref of refs.filter(Boolean)) {
    const path = repoPath(repo, ref.path, '三维业务文件').relative;
    if (path !== ref.path) throw new WorkflowError('三维业务文件路径不规范');
    // 控制目录中的文件属于不可变材料，不能借场景或素材身份从副本替代。
    if (controlPath(repo, work, path) || protectedKeys.has(fileIdentityKey(repo, path))) continue;
    const key = `${fileIdentityKey(repo, path)}:${ref.sha256}`;
    unique.set(key, { path, sha256: ref.sha256 });
  }
  return [...unique.values()];
}

/** V1 白模身份由功能基线直接冻结，后续局部重验的 work 不一定仍有场景封套。 */
function blockoutSourceRefs(repo, work, refs) {
  if (!refs || typeof refs !== 'object') throw new WorkflowError('功能基线缺少冻结的 V1 白模依据');
  for (const name of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef']) {
    const ref = refs[name];
    if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`功能基线白模依据 ${name} 无效`);
    if (repoPath(repo, ref.path, `功能基线白模依据 ${name}`).relative !== ref.path) throw new WorkflowError(`功能基线白模依据 ${name} 路径不规范`);
  }
  const candidate = refs.blockoutRef;
  const protectedRefs = [refs.spatialSpecRef, refs.blockoutRunRef, work.visual?.domainEvidenceRef,
    work.visual?.functionBaselineRef, work.visual?.modelProductionBasisRef, work.visual?.modelBaselineRef, work.globalVisualBaselineRef,
    work.assetReviewRef, work.evidenceRef, work.implementationPackageRef, work.planningRef];
  const identity = fileIdentityKey(repo, candidate.path);
  // 不能因白模路径与控制记录别名重叠而允许历史快照覆盖审批或运行证据。
  if (controlPath(repo, work, candidate.path) || protectedRefs.some((ref) => ref?.path && fileIdentityKey(repo, ref.path) === identity)) return [];
  return [{ path: candidate.path, sha256: candidate.sha256 }];
}

/** 通过阶段时将已验证业务字节保存到该执行证据根，幂等重试不覆盖已有文件。 */
export async function captureWorld3DFileSnapshots(repo, work) {
  if (work.visual?.designRoute !== 'world-3d' || !STAGES.includes(work.visual.stage)) return;
  if (work.visual.stage === 'V4' && isWorldHudReturn(work) && work.visual.modelBaselineRef) {
    // HUD 返修沿用原 V4 试接归档；当前同路径场景可能已是正式版，不能重新复制冒充旧试接。
    return withWorld3DFileSnapshots(repo, work, { stages: ['V4'] }, () => undefined);
  }
  const statePath = `${work.evidenceRoot}/execution-state.json`;
  const state = readJson(repo, statePath, 'Execution State');
  if (state.workItemId !== work.workItemId || state.stack !== work.stack) throw new WorkflowError('三维文件快照未绑定当前执行状态');
  const prefix = `${repoPath(repo, work.evidenceRoot, '证据根').relative}/world3d-file-snapshots`;
  const snapshots = [];
  for (const ref of sourceRefs(repo, work)) {
    bytesFor(repo, ref, '三维业务文件');
    const snapshotPath = `${prefix}/${ref.sha256}`;
    const destination = repoPath(repo, snapshotPath, '三维文件快照').absolute;
    mkdirSync(dirname(destination), { recursive: true });
    // 再次解析路径，避免创建目录期间已有符号链接改变目标边界。
    repoPath(repo, snapshotPath, '三维文件快照');
    // 先校验独占临时副本，再以硬链接原子发布；源文件写入期间失败不会污染摘要命名的最终文件。
    const temporaryPath = `${snapshotPath}.${randomUUID()}.tmp`;
    const temporary = repoPath(repo, temporaryPath, '三维快照临时文件').absolute;
    let created = false;
    try {
      closeSync(openSync(temporary, 'wx'));
      created = true;
      copyFileSync(repoPath(repo, ref.path).absolute, temporary);
      bytesFor(repo, { path: temporaryPath, sha256: ref.sha256 }, '三维文件快照临时副本');
      try { linkSync(temporary, destination); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    } finally { if (created) unlinkSync(temporary); }
    bytesFor(repo, { path: snapshotPath, sha256: ref.sha256 }, '三维文件快照');
    snapshots.push({ path: ref.path, sha256: ref.sha256, snapshotPath });
  }
  state.world3dFileSnapshots ??= {};
  const previous = state.world3dFileSnapshots[work.visual.stage];
  if (previous && JSON.stringify(previous) !== JSON.stringify(snapshots)) throw new WorkflowError('已冻结的三维文件快照不能被重绑');
  state.world3dFileSnapshots[work.visual.stage] = snapshots;
  await atomicWriteJson(repo, statePath, state);
}

/** 读取单个阶段的自动快照；已声明的快照缺失、篡改或越界均立即阻断。 */
function snapshotsForRoot(repo, work, root, stage, { required = false, expectedRefs } = {}) {
  if (!root) return new Map();
  const normalizedRoot = repoPath(repo, root, '三维快照证据根').relative;
  const statePath = `${normalizedRoot}/execution-state.json`;
  if (!existsSync(repoPath(repo, statePath).absolute)) {
    if (required) throw new WorkflowError('三维文件快照缺少冻结的执行状态');
    return new Map();
  }
  const state = readJson(repo, statePath, 'Execution State');
  if (state.workItemId !== work.workItemId || state.stack !== work.stack) throw new WorkflowError('三维文件快照工作项或技术栈错绑');
  const entries = state.world3dFileSnapshots?.[stage];
  if (entries === undefined) {
    if (required) throw new WorkflowError('三维文件快照缺少阶段版本');
    return new Map();
  }
  if (!Array.isArray(entries) || entries.length > 100000) throw new WorkflowError('三维文件快照清单无效');
  // 依据冻结合同重新推导允许快照的业务身份，不能信任可编辑执行状态自报的路径。
  const expected = new Set((expectedRefs ?? sourceRefs(repo, work)).map((ref) => `${fileIdentityKey(repo, ref.path)}:${ref.sha256}`));
  const prefix = `${normalizedRoot}/world3d-file-snapshots/`;
  const keys = new Map();
  for (const item of entries) {
    if (!item || Object.keys(item).sort().join(',') !== 'path,sha256,snapshotPath' || !/^[a-f0-9]{64}$/.test(item.sha256 ?? '')) throw new WorkflowError('三维文件快照身份无效');
    const path = repoPath(repo, item.path, '三维快照原路径').relative;
    if (path !== item.path || controlPath(repo, work, path)) throw new WorkflowError('三维快照原路径无效');
    if (item.snapshotPath !== `${prefix}${item.sha256}`) throw new WorkflowError('三维文件快照不属于当前证据根');
    const key = `${fileIdentityKey(repo, path)}:${item.sha256}`;
    if (keys.has(key) || !expected.has(key)) throw new WorkflowError('三维文件快照身份重复或不属于阶段业务来源');
    keys.set(key, item);
    bytesFor(repo, { path: item.snapshotPath, sha256: item.sha256 }, '三维文件快照');
  }
  if (keys.size !== expected.size) throw new WorkflowError('三维文件快照未覆盖全部阶段业务来源');
  return keys;
}

/** 读取已冻结 JSON 引用，不能用变化后的基线或模型归档注入快照。 */
function frozenJson(repo, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}必须绑定路径和 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  if (path !== ref.path) throw new WorkflowError(`${label}路径不规范`);
  const absolute = repoPath(repo, path, label).absolute;
  if (lstatSync(absolute).size > 5 * 1024 * 1024) throw new WorkflowError(`${label}控制记录超过安全读取上限`);
  // 摘要与 JSON 解析消费同一份字节，避免检查后替换控制记录造成身份错绑。
  const bytes = readFileSync(absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}为空或内容已变化`);
  try { return JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`${label}不是有效 JSON：${error.message}`); }
}

/** 在同一工作项内叠加指定阶段的快照；不同工作项及仓库始终隔离。 */
export function withWorld3DFileSnapshots(repo, work, { historical = false, stages = ['V1'] } = {}, callback) {
  if (work.visual?.designRoute !== 'world-3d') return callback();
  const identity = `${resolve(repo)}:${work.projectId}:${work.stack}:${work.workItemId}`;
  const active = context.getStore();
  const prior = active?.identity === identity ? active : null;
  let files = prior?.files ?? new Map();
  let merged = prior?.merged ?? new Set();
  // 缓存只存在于本次调用链，嵌套复验共享清单，具体快照使用时仍逐文件复核摘要。
  const verified = prior?.verified ?? new Map();
  const variants = prior?.variants ?? new WeakMap();
  const v1 = work.visual.functionBaselineRef?.path ? frozenJson(repo, work.visual.functionBaselineRef, '功能基线') : null;
  const v4 = work.visual.modelBaselineRef?.path ? frozenJson(repo, work.visual.modelBaselineRef, '模型阶段归档').world3dModelBaseline : null;
  const history = historical || Boolean(prior?.historical);
  for (const stage of stages) {
    // 当前正在验收的阶段始终读取真实源；仅历史检查可引用其已完成快照。
    const root = stage === 'V1' ? (v1?.world3dBlockoutEvidenceRoot ?? (history && work.visual.stage === 'V1' ? work.evidenceRoot : null))
      : stage === 'V4' ? (v4?.evidenceRoot ?? (history && work.visual.stage === 'V4' ? work.evidenceRoot : null)) : (history ? work.evidenceRoot : null);
    const stageWork = stage === 'V1' && v1 ? { ...work, evidenceRoot: root, visual: { ...work.visual, stage: 'V1' } } : stage === 'V4' && v4 ? {
      ...work, evidenceRoot: v4.evidenceRoot, assetReviewRef: v4.assetReviewRef, visual: { ...work.visual, stage: 'V4', domainEvidenceRef: v4.domainEvidenceRef },
    } : work;
    const completedStage = history && work.visual.stage === stage && ['PASSED', 'COMPLETE'].includes(work.globalState);
    const required = stage === 'V1' ? v1?.world3dSnapshotVersion === '1.0' || completedStage
      : stage === 'V4' ? v4?.snapshotVersion === '1.0' || completedStage : completedStage;
    const expectedRefs = stage === 'V1' && v1?.world3dBlockoutRefs ? blockoutSourceRefs(repo, stageWork, v1.world3dBlockoutRefs) : undefined;
    const cacheKey = JSON.stringify([stage, root, required, stageWork, expectedRefs]);
    let entries = verified.get(cacheKey);
    if (!entries) {
      entries = snapshotsForRoot(repo, stageWork, root, stage, { required, expectedRefs });
      verified.set(cacheKey, entries);
    }
    // 同一阶段在调用链内只合并一次；不可修改父上下文的映射以免并发分支串用。
    if (!merged.has(cacheKey)) {
      let choices = variants.get(files);
      if (!choices) { choices = new Map(); variants.set(files, choices); }
      let combined = choices.get(cacheKey);
      if (!combined) {
        combined = { files: new Map([...files, ...entries]), merged: new Set([...merged, cacheKey]) };
        choices.set(cacheKey, combined);
      }
      ({ files, merged } = combined);
    }
  }
  return context.run({ identity, historical: history, files, verified, merged, variants }, callback);
}

/** 当前正式场景必须读取真实源；历史完成检查保留对应的历史版本。 */
export function withLiveWorld3DFiles(callback) {
  const active = context.getStore();
  if (!active || active.historical) return callback();
  return context.run({ ...active, files: new Map(), merged: new Set() }, callback);
}

/** 旧版首件只在严格检查已完成来源时被解释，当前制作不能省略风险分流。 */
export function isArchivedWorld3DSource(repo, work) {
  const active = context.getStore();
  const identity = `${resolve(repo)}:${work.projectId}:${work.stack}:${work.workItemId}`;
  return Boolean(active?.historical && active.identity === identity && work.globalState === 'COMPLETE'
    && work.visual?.stage === 'V5' && work.visual.modelBaselineRef?.path);
}

/** 控制记录与原始日志无论是否检查历史都必须读取原文件。 */
export function withoutWorld3DFileSnapshots(callback) {
  const active = context.getStore();
  return active ? context.run({ ...active, files: new Map(), merged: new Set() }, callback) : callback();
}

/** 若有合法的同路径同摘要快照则核验它，否则由调用者继续核验真实文件。 */
export function hasWorld3DFileSnapshot(repo, ref, label, work) {
  const active = context.getStore();
  const identity = `${resolve(repo)}:${work?.projectId}:${work?.stack}:${work?.workItemId}`;
  if (!active || active.identity !== identity || !ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) return false;
  const item = active.files.get(`${fileIdentityKey(repo, ref.path)}:${ref.sha256}`);
  if (!item) return false;
  const source = repoPath(repo, ref.path, label);
  if (existsSync(source.absolute) && !lstatSync(source.absolute).isFile()) throw new WorkflowError(`${label}不是普通文件`);
  bytesFor(repo, { path: item.snapshotPath, sha256: ref.sha256 }, '三维文件快照');
  return true;
}

/** 原始执行结果只记录文件路径；调用前须先由已冻结功能快照核对其摘要。 */
export function hasWorld3DFileSnapshotPath(repo, path, work) {
  const active = context.getStore();
  const identity = `${resolve(repo)}:${work?.projectId}:${work?.stack}:${work?.workItemId}`;
  if (!active || active.identity !== identity) return false;
  const key = fileIdentityKey(repo, path);
  for (const item of active.files.values()) {
    if (fileIdentityKey(repo, item.path) === key && hasWorld3DFileSnapshot(repo, item, '三维业务交付', work)) return true;
  }
  return false;
}

/** 保护已绑定证据根中的快照与状态文件；无效旧记录不阻止登记 RETURN。 */
export function collectWorld3DFileSnapshotPaths(repo, work) {
  if (work.visual?.designRoute !== 'world-3d') return [];
  const roots = new Set([work.evidenceRoot].filter(Boolean));
  try { if (work.visual.functionBaselineRef?.path) roots.add(frozenJson(repo, work.visual.functionBaselineRef, '功能基线').world3dBlockoutEvidenceRoot); } catch { /* 旧记录无效时保留已知路径。 */ }
  try { if (work.visual.modelBaselineRef?.path) roots.add(frozenJson(repo, work.visual.modelBaselineRef, '模型阶段归档').world3dModelBaseline?.evidenceRoot); } catch { /* 当前阶段检查仍拒绝无效记录。 */ }
  const found = new Set();
  for (const root of roots) {
    if (!root) continue;
    try {
      const normalized = repoPath(repo, root, '三维快照证据根').relative;
      const statePath = `${normalized}/execution-state.json`;
      if (!existsSync(repoPath(repo, statePath).absolute)) continue;
      found.add(statePath);
      const state = readJson(repo, statePath, 'Execution State');
      for (const entries of Object.values(state.world3dFileSnapshots ?? {})) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          const path = entry?.snapshotPath;
          if (typeof path === 'string' && path.startsWith(`${normalized}/world3d-file-snapshots/`)) found.add(repoPath(repo, path).relative);
        }
      }
    } catch { /* 损坏的旧快照不会取消其他仍可识别路径的保护。 */ }
  }
  return [...found];
}

/** 显式区分可继续编辑的正式场景/模型与必须保护的控制、审批及日志记录。 */
export function collectWorld3DMutableSourcePaths(repo, work) {
  if (work.visual?.designRoute !== 'world-3d' || !work.visual.domainEvidenceRef?.path) return [];
  const contract = frozenJson(repo, work.visual.domainEvidenceRef, '世界场景合同');
  const stages = ['V1'];
  const archive = work.visual.modelBaselineRef?.path ? frozenJson(repo, work.visual.modelBaselineRef, '模型阶段归档').world3dModelBaseline : null;
  // V4 规划可先声明复用来源，资源评审绑定后才有可编辑模型路径可提取。
  if (['V4', 'V5'].includes(contract.stage) && (work.assetReviewRef || archive?.assetReviewRef)) stages.push('V4');
  if (contract.stage === 'V5') stages.push('V5');
  const paths = new Map();
  for (const stage of stages) {
    const stageWork = { ...work, evidenceRoot: stage === 'V4' && archive?.evidenceRoot ? archive.evidenceRoot : work.evidenceRoot,
      assetReviewRef: stage === 'V4' && archive?.assetReviewRef ? archive.assetReviewRef : work.assetReviewRef,
      visual: { ...work.visual, stage, ...(stage === 'V4' && archive?.domainEvidenceRef ? { domainEvidenceRef: archive.domainEvidenceRef } : {}) } };
    for (const ref of sourceRefs(repo, stageWork, { mutableOnly: true })) paths.set(fileIdentityKey(repo, ref.path), ref.path);
  }
  return [...paths.values()];
}
