import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { withinEvidenceRoot, rawEvidence, runRecord, validateSceneReview, validateSceneApproval } from './scene-design-contract.mjs';
import { assertFrozenWorldHud, isWorldHudReturn } from './world3d-hud.mjs';
import { reusedWorld3DAsset, withWorld3DModelReuse, world3DModelReuse } from './world3d-model-reuse.mjs';
import { collectWorld3DFileSnapshotPaths, hasWorld3DFileSnapshot, withLiveWorld3DFiles, withoutWorld3DFileSnapshots, withWorld3DFileSnapshots } from './world3d-file-snapshots.mjs';

// 路线仅服务真实游戏世界；声明本身不证明场景已搭建或运行。
const GAME_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);
const STAGES = ['V1', 'V2', 'V3', 'V4', 'V5'];
const CONTRACT_FIELDS = new Set([
  'schemaVersion', 'designRoute', 'workItemId', 'projectId', 'stack', 'objectId', 'candidateId', 'stage', 'scopeIds',
  'spatialSpecRef', 'blockoutRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionRef',
  'directionApprovalRef', 'functionBaselineRef', 'modelSpecRef', 'sampleRef', 'formalSceneRef', 'formalRunRef',
  'displayApprovalRef',
]);

/** 判断路线声明；实际对象和技术栈是否合法由形状检查负责。 */
export function isWorld3D(work) {
  return work?.visual?.designRoute === 'world-3d';
}

/** 构造统一的合同错误，避免将缺少事实误认为审核通过。 */
function insist(condition, message) {
  if (!condition) throw new WorkflowError(`无图 3D 合同：${message}`);
}

/** 只接受非空文字，防止对象和候选身份隐式缺失。 */
function text(value, label) {
  insist(typeof value === 'string' && value.trim().length > 0, `${label} 必须为非空字符串`);
  return value;
}

/** 校验有限三维坐标；尺度和尺寸还必须大于零。 */
function vector(value, label, positive = false) {
  insist(Array.isArray(value) && value.length === 3 && value.every((item) => Number.isFinite(item) && (!positive || item > 0)), `${label} 必须为${positive ? '正数' : '有限数'}三维向量`);
}

/** 非空且不重复的身份集合不能遗漏或重复覆盖范围。 */
function identifiers(value, label) {
  insist(Array.isArray(value) && value.length > 0, `${label} 不能为空`);
  value.forEach((item) => text(item, label));
  insist(new Set(value).size === value.length, `${label} 不能重复`);
}

/** 比较两个冻结引用的规范路径及摘要。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256 && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 限制 3D 声明只能用于游戏 SCENE，避免借路线名称让页面绕过原门禁。 */
export function assertWorld3DShape(work) {
  insist(isWorld3D(work), '缺少 world-3d 路线声明');
  insist(GAME_STACKS.has(work.stack) && work.workItemType === 'SCENE', '仅游戏 SCENE 可使用该路线');
  const visual = work.visual;
  insist(visual.designIntent === undefined || visual.designIntent === 'implementation', '不支持仅设计提案');
  insist(visual.targets === undefined || (Array.isArray(visual.targets) && visual.targets.length === 0), '不能混入图片目标');
  insist(visual.reviews === undefined || (visual.reviews && typeof visual.reviews === 'object' && !Array.isArray(visual.reviews) && Object.keys(visual.reviews).length === 0), '不能混入图片阶段确认');
  for (const name of ['coverageRef', 'integrationEvidenceRef', 'reuse']) insist(visual[name] == null, `不能混入 ${name}`);
  if (['V2', 'V3', 'V4', 'V5'].includes(visual.stage)) {
    text(visual.candidateId, 'visual.candidateId');
    insist(visual.domainEvidenceRef?.path && /^[a-f0-9]{64}$/.test(visual.domainEvidenceRef.sha256 ?? ''), '缺少冻结的领域合同引用');
  }
  return true;
}

/** 核对项目内真实文件、摘要和失效记录，不接受越界或重绑旧版本。 */
export function world3dFile(repo, ref, label, work) {
  insist(ref && typeof ref === 'object' && !Array.isArray(ref) && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 必须绑定路径和 SHA-256`);
  const normalized = repoPath(repo, ref.path, label).relative;
  insist(normalized === ref.path, `${label} 路径不规范`);
  const key = fileIdentityKey(repo, normalized);
  insist(!work?.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === key), `${label} 使用了已作废引用`);
  if (!hasWorld3DFileSnapshot(repo, ref, label, work)) {
    requireFile(repo, normalized, label);
    const bytes = readFileSync(repoPath(repo, normalized, label).absolute);
    insist(bytes.length > 0 && createHash('sha256').update(bytes).digest('hex') === ref.sha256, `${label} 为空或内容已变化`);
  }
  return normalized;
}

/** 读取经过冻结校验的 JSON，保证内容和工作项引用是同一版本。 */
function frozenJson(repo, ref, label, work) {
  return withoutWorld3DFileSnapshots(() => readJson(repo, world3dFile(repo, ref, label, work), label));
}

/** 将领域记录绑定当前项目、场景和候选，避免其他工作项的结果冒用。 */
function identity(record, work, label) {
  insist(record && typeof record === 'object' && !Array.isArray(record), `${label} 必须为对象`);
  for (const [field, expected] of Object.entries({
    schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId,
    stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId,
  })) {
    text(expected, `工作项 ${field}`);
    insist(record[field] === expected, `${label}.${field} 与当前工作项不一致`);
  }
}

/** 读取冻结封套的静态身份和范围，不把阶段推进当作验收通过。 */
function readWorld3DEnvelope(repo, work) {
  assertWorld3DShape(work);
  text(work.visual.candidateId, 'visual.candidateId');
  const record = frozenJson(repo, work.visual.domainEvidenceRef, '场景领域合同', work);
  identity(record, work, '场景领域合同');
  insist(record.designRoute === 'world-3d' && STAGES.includes(record.stage), '场景领域合同路线或阶段错绑');
  for (const key of Object.keys(record)) insist(CONTRACT_FIELDS.has(key), `场景领域合同不支持字段 ${key}`);
  identifiers(record.scopeIds, 'scopeIds');
  return record;
}

/** 从冻结封套读取当前阶段合同；未知字段不能偷偷引入第二套状态。 */
export function readWorld3DContract(repo, work, stage) {
  insist(STAGES.includes(stage), `不支持阶段 ${stage}`);
  insist(work.visual.stage === stage, '请求校验的阶段与当前工作项阶段不一致');
  const record = readWorld3DEnvelope(repo, work);
  insist(record.stage === stage, '场景领域合同路线或阶段错绑');
  const required = ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef'];
  if (STAGES.indexOf(stage) >= 1) required.push('reviewRef', 'spaceApprovalRef', 'directionRef', 'directionApprovalRef', 'functionBaselineRef');
  if (STAGES.indexOf(stage) >= 2) required.push('modelSpecRef');
  if (STAGES.indexOf(stage) >= 3) required.push('sampleRef');
  if (STAGES.indexOf(stage) >= 4) required.push('formalSceneRef', 'formalRunRef', 'displayApprovalRef');
  for (const field of required) {
    const check = () => world3dFile(repo, record[field], `场景领域合同.${field}`, work);
    // 当前正式场景不能借 V1 白模快照隐藏后续修改；历史整项检查保留原版本。
    if (field === 'formalSceneRef') withLiveWorld3DFiles(check);
    else check();
  }
  return record;
}

/** 读取结构化空间事实，验证是真实三维范围而非空的路线标签。 */
function spatialSpec(repo, work, contract) {
  const spec = frozenJson(repo, contract.spatialSpecRef, '空间规格', work);
  identity(spec, work, '空间规格');
  insist(spec.dimension === 3, '空间规格必须声明三维世界');
  text(spec.units, '空间规格.units');
  identifiers(spec.scopeIds, '空间规格.scopeIds');
  insist(JSON.stringify([...spec.scopeIds].sort()) === JSON.stringify([...contract.scopeIds].sort()), '空间规格与合同覆盖范围不一致');
  insist(Array.isArray(spec.regions) && spec.regions.length > 0, '空间规格必须包含区域');
  identifiers(spec.regions.map((region) => region?.id), '空间区域 id');
  vector(spec.camera?.position, '镜头位置');
  vector(spec.camera?.target, '镜头目标');
  insist(spec.camera.position.some((value, index) => value !== spec.camera.target[index]), '镜头位置与目标不能重合');
  vector(spec.playerScale, '角色尺度', true);
  return spec;
}

/** 从控制器冻结的功能基线提取原 V1 证据根，后续阶段不得自行声明历史路径。 */
function blockoutEvidenceRoot(repo, work, contract, stage) {
  if (stage === 'V1') return work.evidenceRoot;
  insist(sameRef(repo, contract.functionBaselineRef, work.visual.functionBaselineRef), '未绑定当前功能基线');
  const snapshot = frozenJson(repo, contract.functionBaselineRef, '功能基线', work);
  insist(snapshot.schemaVersion === '1.0' && snapshot.workItemId === work.workItemId && snapshot.projectId === work.projectId && snapshot.stack === work.stack && snapshot.objectId === work.visual.objectId, '功能基线身份错绑');
  insist(snapshot.designRoute === 'world-3d' && ['local', 'local-regression'].includes(snapshot.mode), '功能基线不是本场景的 3D 本地运行');
  const original = snapshot.work;
  insist(original?.workItemId === work.workItemId && original.projectId === work.projectId && original.stack === work.stack && original.workItemType === 'SCENE' && original.visual?.objectId === work.visual.objectId && original.visual?.candidateId === work.visual.candidateId && original.visual?.designRoute === 'world-3d', '功能基线原工作项身份或路线错绑');
  assertFrozenWorldHud(work, snapshot);
  // 白模的三个冻结依据必须与功能验证时一致，变更后应返回 V1 重验。
  for (const field of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef']) {
    insist(sameRef(repo, snapshot.world3dBlockoutRefs?.[field], contract[field]), `功能基线白模依据 ${field} 已变化`);
  }
  const root = text(snapshot.world3dBlockoutEvidenceRoot, '功能基线.world3dBlockoutEvidenceRoot');
  if (snapshot.mode === 'local') {
    insist(original.visual.stage === 'V1' && original.globalState === 'PASSED' && fileIdentityKey(repo, original.evidenceRoot) === fileIdentityKey(repo, root), '功能基线不是已完成的 V1 白模');
  } else {
    insist(['V4', 'V5'].includes(original.visual.stage) && ['IMPLEMENTING', 'VALIDATING'].includes(original.globalState), '功能重验记录的阶段或状态错误');
  }
  return repoPath(repo, root, 'V1 白模证据根').relative;
}

/** 从冻结的 V4 资源评审提取试接阶段根，V5 不信任新合同自报的历史目录。 */
function modelEvidenceRoot(repo, work) {
  const review = frozenJson(repo, work.assetReviewRef, '模型资源评审', work);
  insist(review.schemaVersion === '1.0' && review.workItemId === work.workItemId && review.stack === work.stack && review.candidateId === work.visual.candidateId && review.visualStage === 'V4', '模型资源评审身份错绑');
  const root = text(review.evidenceRoot, '模型资源评审.evidenceRoot');
  repoPath(repo, root, '模型资源证据根');
  // 只有存在旧归档时才走 HUD 返修复用；尚未到过 V4 的首次制作继续验证当前根。
  const reuseArchive = isWorldHudReturn(work) && work.visual.modelBaselineRef !== undefined;
  if (work.visual.stage === 'V4' && !reuseArchive) insist(fileIdentityKey(repo, root) === fileIdentityKey(repo, work.evidenceRoot), 'V4 模型资源证据根与当前阶段不一致');
  else {
    // V5 只信任控制器冻结的 V4 归档，不能接受资源评审自报历史证据根。
    const snapshot = frozenJson(repo, work.visual.modelBaselineRef, 'V4 模型基线', work);
    const baseline = snapshot.world3dModelBaseline;
    insist(snapshot.visualStage === 'V4' && baseline && typeof baseline === 'object', '模型基线不是 V4 归档');
    for (const [field, expected] of Object.entries({ workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) {
      insist(baseline[field] === expected, `模型基线 ${field} 身份错绑`);
    }
    insist(fileIdentityKey(repo, text(baseline.evidenceRoot, '模型基线.evidenceRoot')) === fileIdentityKey(repo, root), '模型基线证据根错绑');
    insist(sameRef(repo, baseline.assetReviewRef, work.assetReviewRef), '模型基线资源评审错绑');
    const oldContract = frozenJson(repo, baseline.domainEvidenceRef, 'V4 场景领域合同', work);
    identity(oldContract, work, 'V4 场景领域合同');
    insist(oldContract.designRoute === 'world-3d' && oldContract.stage === 'V4' && sameRef(repo, oldContract.sampleRef, review.modelSampleRef), '模型基线代表模块错绑');
    if (work.visual.stage === 'V5') {
      // 正式场景不能保留模型身份却换掉试接时的尺寸、接口或方向依据。
      const current = readWorld3DEnvelope(repo, work);
      insist(current.stage === 'V5', '正式模型必须绑定当前 V5 封套');
      insist(sameRef(repo, oldContract.modelSpecRef, current.modelSpecRef) && sameRef(repo, oldContract.directionRef, current.directionRef), 'V5 不能更换 V4 已验收的模型规格或方向');
    }
    if (work.visual.stage === 'V4') {
      // 仅 HUD 返修可重用历史模型；换模型规格或试接记录仍须重新经过 V4。
      // 推进归档时不在白模快照上下文中；这里只比较封套身份，完整合同已由阶段检查验证。
      const current = readWorld3DEnvelope(repo, work);
      insist(current.stage === 'V4', 'HUD 返修模型必须绑定当前 V4 封套');
      insist(sameRef(repo, oldContract.modelSpecRef, current.modelSpecRef) && sameRef(repo, oldContract.sampleRef, current.sampleRef), 'HUD 返修不能更换世界模型规格或试接');
    }
  }
  world3dFile(repo, review.modelSampleRef, '模型资源评审代表模块', work);
  return { root, review };
}

/** 归档沿用经过核验的真实模型证据根，不能将 HUD 返修包冒充旧试接。 */
export function world3dModelArchiveEvidenceRoot(repo, work) {
  return modelEvidenceRoot(repo, work).root;
}

/** 三维联合审查沿用世界场景的共同核验规则。 */
function designReview(repo, work, contract) {
  validateSceneReview(repo, work, contract.reviewRef, [contract.spatialSpecRef, contract.blockoutRef, contract.blockoutRunRef], 'world-3d-design-review');
}

/** 三维人工决定沿用世界场景的共同核验规则。 */
function approval(repo, work, ref, options) {
  return validateSceneApproval(repo, work, ref, options);
}

/** 确定模型清单、物理尺寸和局部连接接口，作为实际资产替换依据。 */
function modelSpec(repo, work, contract, units) {
  const spec = frozenJson(repo, contract.modelSpecRef, '模型规格', work);
  identity(spec, work, '模型规格');
  insist(spec.units === units, '模型规格与场景单位不一致');
  insist(Array.isArray(spec.models) && spec.models.length > 0, '模型规格必须包含正式模型');
  identifiers(spec.models.map((model) => model?.assetId), '模型规格 assetId');
  for (const model of spec.models) {
    vector(model.dimensions, `${model.assetId}.dimensions`, true);
    vector(model.pivot, `${model.assetId}.pivot`);
    insist(Array.isArray(model.interfaces), `${model.assetId}.interfaces 必须为数组`);
    const ids = new Set();
    for (const item of model.interfaces) {
      const id = text(item?.id, `${model.assetId}.interface.id`);
      insist(!ids.has(id), `${model.assetId} 接口身份重复`);
      ids.add(id);
      vector(item.position, `${model.assetId}.${id}.position`);
    }
  }
  return spec;
}

/** 验证模型源、正式文件、导入及消费者真实记录，拒绝以组件身份伪装模型。 */
export function validateWorld3DModel(repo, work, asset) {
  return withWorld3DModelReuse(() => validateWorld3DModelInContext(repo, work, asset));
}

/** 模型来源可复用已完成试接，但当前业务文件与资源评审仍须逐项有效。 */
function validateWorld3DModelInContext(repo, work, asset) {
  assertWorld3DShape(work);
  insist(asset?.assetType === 'model', '模型必须声明 model 类型');
  const id = text(asset.assetId, '模型 assetId');
  insist(['ai-generated', 'hand-authored', 'licensed', 'existing'].includes(asset.sourceKind), `${id} 来源类型无效`);
  const source = { path: asset.sourceRef, sha256: asset.sourceSha256 };
  const output = { path: asset.output, sha256: asset.outputSha256 };
  const { root } = modelEvidenceRoot(repo, work);
  withLiveWorld3DFiles(() => {
    world3dFile(repo, source, `${id} 模型来源`, work);
    world3dFile(repo, output, `${id} 模型产物`, work);
  });
  const reused = reusedWorld3DAsset(repo, work, asset);
  if (reused) return { source, output, consumer: reused.consumer };
  if (asset.sourceKind === 'ai-generated') {
    world3dFile(repo, { path: asset.generationRecord, sha256: asset.generationRecordSha256 }, `${id} 生成记录`, work);
  }
  const imported = frozenJson(repo, asset.importEvidenceRef, `${id} 导入证据`, work);
  withinEvidenceRoot(repo, asset.importEvidenceRef.path, root, `${id} 导入证据`);
  identity(imported, work, `${id} 导入证据`);
  insist(imported.assetId === id && imported.status === 'PASS', `${id} 导入记录身份或状态错误`);
  text(imported.importer, `${id}.importer`);
  withLiveWorld3DFiles(() => world3dFile(repo, imported.outputRef, `${id} 导入模型`, work));
  insist(sameRef(repo, imported.outputRef, output), `${id} 导入记录未绑定当前模型`);
  rawEvidence(repo, imported.commandEvidenceRef, `${id} 导入原始记录`, work, root, [source, output, asset.importEvidenceRef, asset.consumerEvidenceRef, work.visual.domainEvidenceRef]);
  const consumer = frozenJson(repo, asset.consumerEvidenceRef, `${id} 消费者证据`, work);
  withinEvidenceRoot(repo, asset.consumerEvidenceRef.path, root, `${id} 消费者证据`);
  identity(consumer, work, `${id} 消费者证据`);
  insist(consumer.assetId === id && consumer.status === 'PASS', `${id} 消费记录身份或状态错误`);
  text(consumer.nodeId, `${id}.nodeId`);
  withWorld3DFileSnapshots(repo, work, { stages: ['V4'] }, () => world3dFile(repo, consumer.sceneRef, `${id} 消费场景`, work));
  withLiveWorld3DFiles(() => world3dFile(repo, consumer.outputRef, `${id} 消费模型`, work));
  insist(sameRef(repo, consumer.outputRef, output), `${id} 消费记录未绑定当前模型`);
  return { source, output, consumer };
}

/** 在已确认空间内验证代表模块、实际导入及试接记录。 */
function sampleRecord(repo, work, contract, models, assets, root) {
  const sample = frozenJson(repo, contract.sampleRef, '代表模块试接', work);
  withinEvidenceRoot(repo, contract.sampleRef.path, root, '代表模块试接');
  identity(sample, work, '代表模块试接');
  insist(sample.phase === 'sample', '代表模块试接阶段错误');
  // 复用包装保留当前身份和证据根，旧试接事实由冻结来源的完整历史检查证明。
  if (world3DModelReuse(repo, work)) return sample;
  const asset = assets.find((item) => item.assetType === 'model' && item.assetId === sample.assetId);
  insist(asset && models.some((item) => item.assetId === sample.assetId), '代表模块不属于当前模型规格与验收清单');
  world3dFile(repo, sample.sceneRef, '代表模块场景', work);
  const runtime = runRecord(repo, work, sample.runtimeRef, 'sample', sample.sceneRef, root, [contract.sampleRef]);
  insist(Array.isArray(sample.sourceRefs) && sample.sourceRefs.length > 0 && Array.isArray(sample.outputs) && sample.outputs.length > 0, '代表模块缺少来源或输出');
  sample.sourceRefs.forEach((ref) => world3dFile(repo, ref, '代表模块来源', work));
  sample.outputs.forEach((ref) => world3dFile(repo, ref, '代表模块输出', work));
  insist(sample.sourceRefs.some((ref) => sameRef(repo, ref, { path: asset.sourceRef, sha256: asset.sourceSha256 })), '代表模块未绑定已验收模型来源');
  insist(sample.outputs.some((ref) => sameRef(repo, ref, { path: asset.output, sha256: asset.outputSha256 })), '代表模块未绑定已验收模型产物');
  const consumer = validateWorld3DModel(repo, work, asset).consumer;
  insist(sameRef(repo, consumer.sceneRef, sample.sceneRef), '代表模块消费者未绑定试接场景');
  return runtime;
}

/** 单个方向基线绑定真实来源和用户消息，不制造图片候选或美术完成结论。 */
export function validateWorld3DBaseline(repo, work, record) {
  assertWorld3DShape(work);
  insist(record?.schemaVersion === '1.0' && record.designRoute === 'world-3d', '全局方向路线或版本错误');
  insist(record.projectId === work.projectId && record.stack === work.stack, '全局方向项目或技术栈错绑');
  text(record.baselineId, '全局方向 baselineId');
  world3dFile(repo, record.directionRef, '全局方向依据', work);
  const review = frozenJson(repo, record.selectionReviewRef, '全局方向人工确认', work);
  insist(review.schemaVersion === '1.0' && review.projectId === work.projectId && review.stack === work.stack && review.objectId === record.baselineId, '全局方向确认身份错绑');
  insist(review.stage === 'BASELINE' && review.purpose === 'visual-baseline' && review.decision === 'APPROVED', '全局方向尚未获得人工确认');
  text(review.userMessageRef, '全局方向确认.userMessageRef');
  world3dFile(repo, review.subjectRef, '全局方向确认对象', work);
  insist(sameRef(repo, review.subjectRef, record.directionRef), '全局方向确认未绑定当前依据');
  return record;
}

/** 验证世界设计前置；样本准备与正式阶段共同消费同一套确认和模型规格。 */
function validateWorld3DUpstream(repo, work, contract, stage) {
  const spatial = spatialSpec(repo, work, contract);
  const blockoutRoot = blockoutEvidenceRoot(repo, work, contract, stage);
  runRecord(repo, work, contract.blockoutRunRef, 'blockout', contract.blockoutRef, blockoutRoot, [contract.spatialSpecRef]);
  if (STAGES.indexOf(stage) >= 1) {
    // 空间工作项和全局方向须消费同一份冻结依据，防止选定方向被其他文件悄然替换。
    const baseline = frozenJson(repo, work.globalVisualBaselineRef, '全局方向基线', work);
    validateWorld3DBaseline(repo, work, baseline);
    insist(sameRef(repo, contract.directionRef, baseline.directionRef), '场景视觉方向与已确认全局方向不一致');
    designReview(repo, work, contract);
    approval(repo, work, contract.spaceApprovalRef, {
      stage: 'V2', purpose: 'space-baseline', subjectRef: contract.spatialSpecRef,
      basisRefs: [contract.blockoutRef, contract.blockoutRunRef, contract.reviewRef],
    });
    approval(repo, work, contract.directionApprovalRef, {
      stage: 'V2', purpose: 'visual-direction', subjectRef: contract.directionRef, basisRefs: [contract.spaceApprovalRef],
    });
  }
  const models = STAGES.indexOf(stage) >= 2 ? modelSpec(repo, work, contract, spatial.units).models : undefined;
  return { spatial, models };
}

/** V4 样本准备前校验现有 V3 世界依据，不依赖尚未产生的 V4 资源评审。 */
export function validateWorld3DProductionBasis(repo, work) {
  return withWorld3DFileSnapshots(repo, work, {}, () => validateWorld3DProductionBasisInContext(repo, work));
}

/** 在已绑定的 V1 白模版本内检查当前样本生产依据。 */
function validateWorld3DProductionBasisInContext(repo, work) {
  insist(work.visual?.stage === 'V4', '模型样本准备需要 V4 工作项');
  const contract = readWorld3DEnvelope(repo, work);
  insist(['V3', 'V4'].includes(contract.stage), '模型样本须引用当前 V3 或 V4 封套');
  for (const field of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionRef', 'directionApprovalRef', 'functionBaselineRef', 'modelSpecRef']) {
    world3dFile(repo, contract[field], `场景领域合同.${field}`, work);
  }
  validateWorld3DUpstream(repo, work, contract, 'V3');
  return contract;
}

/** 校验当前阶段的空间、人工确认、模型与实际运行链，不替代引擎或人的判断。 */
export function validateWorld3DStage(repo, work, stage, { validateEvidence, validateAssetReview } = {}) {
  return withWorld3DModelReuse(() => withWorld3DFileSnapshots(repo, work, {}, () => validateWorld3DStageInContext(repo, work, stage, { validateEvidence, validateAssetReview })));
}

/** 维持各阶段真实来源，同时只为上游白模和试接使用其冻结字节。 */
function validateWorld3DStageInContext(repo, work, stage, { validateEvidence, validateAssetReview }) {
  const contract = readWorld3DContract(repo, work, stage);
  const { models } = validateWorld3DUpstream(repo, work, contract, stage);
  let assets;
  if (STAGES.indexOf(stage) >= 3) {
    insist(typeof validateEvidence === 'function' && typeof validateAssetReview === 'function', '必须执行当前工程证据与资源评审');
    validateEvidence(repo, work, { requireEngineering: true, requireVisual: stage === 'V5' });
    const reviewed = validateAssetReview(repo, work);
    insist(reviewed && Array.isArray(reviewed.assets), '缺少实际资源评审');
    const { root, review } = modelEvidenceRoot(repo, work);
    insist(sameRef(repo, review.modelSampleRef, contract.sampleRef), '资源评审未绑定当前代表模块试接');
    assets = reviewed.assets;
    for (const model of models) {
      const matches = assets.filter((item) => item?.assetId === model.assetId && item.assetType === 'model');
      insist(matches.length === 1, `${model.assetId} 缺少唯一模型验收`);
      validateWorld3DModel(repo, work, matches[0]);
    }
    if (stage === 'V5' || (isWorldHudReturn(work) && work.visual.modelBaselineRef)) withWorld3DFileSnapshots(repo, work, { stages: ['V4'] }, () => sampleRecord(repo, work, contract, models, assets, root));
    else sampleRecord(repo, work, contract, models, assets, root);
  }
  if (stage === 'V5') {
    return withLiveWorld3DFiles(() => validateFormalWorld3D(repo, work, contract, models, assets));
  }
  return contract;
}

/** 正式组合只读取当前场景和当前模型，历史来源由外层历史上下文保留。 */
function validateFormalWorld3D(repo, work, contract, models, assets) {
  const run = runRecord(repo, work, contract.formalRunRef, 'formal', contract.formalSceneRef, work.evidenceRoot, [contract.spatialSpecRef, contract.blockoutRef]);
  insist(Array.isArray(run.modelBindings), '正式运行记录缺少模型消费绑定');
  identifiers(run.modelBindings.map((item) => item?.assetId), '正式运行模型绑定');
  insist(run.modelBindings.length === models.length && run.modelBindings.every((item) => models.some((model) => model.assetId === item.assetId)), '正式运行模型绑定与已验收模型规格不一致');
  for (const model of models) {
    const matches = run.modelBindings.filter((item) => item?.assetId === model.assetId);
    insist(matches.length === 1, `${model.assetId} 正式场景消费记录缺失或重复`);
    text(matches[0].nodeId, `${model.assetId} 正式场景节点`);
    world3dFile(repo, matches[0].outputRef, `${model.assetId} 正式消费模型`, work);
    const asset = assets.find((item) => item.assetType === 'model' && item.assetId === model.assetId);
    insist(sameRef(repo, matches[0].outputRef, { path: asset.output, sha256: asset.outputSha256 }), `${model.assetId} 正式场景模型版本错绑`);
  }
  approval(repo, work, contract.displayApprovalRef, {
    stage: 'V5', purpose: 'runtime-acceptance', subjectRef: contract.formalSceneRef,
    basisRefs: [contract.formalRunRef, work.assetReviewRef],
  });
  return contract;
}

/** V1 功能验证完成后核验已有联合审查和空间确认，不依赖 V2 视觉方向。 */
export function validateWorld3DDesignPreflight(repo, work) {
  insist(work.visual?.stage === 'V1', '空间设计前置核验需要 V1 工作项');
  const contract = validateWorld3DStage(repo, work, 'V1');
  designReview(repo, work, contract);
  approval(repo, work, contract.spaceApprovalRef, {
    stage: 'V2', purpose: 'space-baseline', subjectRef: contract.spatialSpecRef,
    basisRefs: [contract.blockoutRef, contract.blockoutRunRef, contract.reviewRef],
  });
  return contract;
}

/** 返回冻结的空间覆盖身份；调用方仍须先校验该阶段的完整人工与工程证据。 */
export function world3dScopeIds(repo, work) {
  const contract = readWorld3DEnvelope(repo, work);
  const current = STAGES.indexOf(work.visual.stage);
  const previous = STAGES.indexOf(contract.stage);
  // 阶段刚推进时仍引用上一阶段封套；不能用未来或过旧封套冒充当前范围。
  insist(current >= 0 && (previous === current || previous === current - 1), '场景范围封套阶段错绑');
  spatialSpec(repo, work, contract);
  return [...contract.scopeIds];
}

/** 遍历合同、确认、运行、资源及基线的嵌套引用，保护真实文件并支持回退失效。 */
export function collectWorld3DReferences(repo, work) {
  if (!isWorld3D(work)) return [];
  const found = new Map();
  for (const path of collectWorld3DFileSnapshotPaths(repo, work)) found.set(fileIdentityKey(repo, path), path);
  const scanned = new Set();
  const queued = [work.visual?.domainEvidenceRef, work.visual?.modelBaselineRef, work.assetReviewRef, work.globalVisualBaselineRef].map((ref) => ({ ref, control: true }));
  const stringPaths = new Set(['sourceRef', 'output', 'generationRecord', 'evidenceRef']);
  // 只有控制记录需要递归解析；原始场景、模型和运行日志可能是很大的 JSON。
  const controlKeys = new Set(['domainEvidenceRef', 'modelBaselineRef', 'assetReviewRef', 'globalVisualBaselineRef', 'spatialSpecRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionApprovalRef', 'functionBaselineRef', 'modelSpecRef', 'sampleRef', 'formalRunRef', 'displayApprovalRef', 'runtimeRef', 'importEvidenceRef', 'consumerEvidenceRef', 'selectionReviewRef', 'modelSampleRef', 'sourceWorkItemRef']);
  /** 迭代读取 JSON 嵌套记录，避免较深的真实工程记录造成递归栈溢出。 */
  function collect(value) {
    const pending = [{ value, key: '' }];
    let examined = 0;
    while (pending.length) {
      const current = pending.pop();
      if (++examined > 100000) throw new WorkflowError('无图 3D 合同：嵌套引用结构过大');
      if (typeof current.value === 'string' && stringPaths.has(current.key)) { queued.push({ ref: { path: current.value }, control: false }); continue; }
      if (!current.value || typeof current.value !== 'object') continue;
      if (typeof current.value.path === 'string') queued.push({ ref: current.value, control: controlKeys.has(current.key) });
      for (const [childKey, child] of Object.entries(current.value)) if (childKey !== 'path') pending.push({ value: child, key: childKey });
    }
  }
  while (queued.length) {
    if (found.size >= 100000) throw new WorkflowError('无图 3D 合同：冻结文件引用过多');
    const { ref, control } = queued.shift();
    if (!ref?.path) continue;
    try {
      const normalized = repoPath(repo, ref.path).relative;
      const key = fileIdentityKey(repo, normalized);
      found.set(key, normalized);
      if (!control || scanned.has(key)) continue;
      scanned.add(key);
      const absolute = repoPath(repo, normalized).absolute;
      // 控制记录按内容解析，不能让任意扩展名绕过嵌套引用保护。
      if (!existsSync(absolute)) continue;
      const stat = lstatSync(absolute);
      if (!stat.isFile()) continue;
      if (stat.size > 5 * 1024 * 1024) throw new WorkflowError('无图 3D 合同：控制记录超过安全读取上限');
      collect(JSON.parse(readFileSync(absolute, 'utf8')));
    } catch (error) {
      if (error instanceof WorkflowError && /(?:嵌套引用结构过大|冻结文件引用过多|控制记录超过安全读取上限)/.test(error.message)) throw error;
      // RETURN 保留能识别的旧路径；缺失、非法或已损坏的嵌套文件不阻断登记。
    }
  }
  return [...found.values()];
}
