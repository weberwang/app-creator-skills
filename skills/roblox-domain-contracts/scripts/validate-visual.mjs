/** Roblox V2–V5 阶段校验；公共目标确认与视觉判断继续由现有控制器负责。 */
import { readJson, repoPath, WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { captureRef, evidenceJson, fileIdentity, instancePath, jsonIdentity, object, sameRef, studioIdentity, text, workIdentity } from './common.mjs';
import { validateRobloxEngineering } from './validate-evidence.mjs';
import { validateRobloxLayout } from './layout.mjs';
import { validateRobloxAssets } from './assets.mjs';
import { validateRobloxRuntime } from './runtime.mjs';
import { validateScreenReadback } from './screen-layout.mjs';

/** 将公共冻结目标和原生领域记录绑定同一对象、候选及用户目标文件。 */
function validateIdentity(repo, work, stage, target, envelope, doc) {
  if (!['SCENE', 'DISPLAY_LAYER'].includes(work.workItemType) || !['V2', 'V3', 'V4', 'V5'].includes(stage)) throw new WorkflowError('Roblox 视觉合同只支持 SCENE/DISPLAY_LAYER 的 V2–V5');
  if (!work.visual || work.visual.stage !== stage || doc.schemaVersion !== 'roblox-visual/1.0') throw new WorkflowError('Roblox 视觉合同阶段或版本不匹配');
  workIdentity(doc, work, { implementation: false });
  const expected = {
    objectId: work.visual.objectId,
    targetId: work.workItemType === 'SCENE' ? target?.targetId : work.visual.objectId,
    candidateId: work.workItemType === 'SCENE' ? target?.candidateId : work.visual.candidateId,
  };
  for (const [key, value] of Object.entries(expected)) if (typeof value !== 'string' || !value || doc[key] !== value) throw new WorkflowError(`Roblox 视觉 ${key} 未绑定当前对象或目标`);
  if (work.workItemType === 'SCENE') {
    if (doc.sceneId !== target.sceneId || doc.stateId !== target.stateId || doc.viewport?.width !== target.viewport?.width || doc.viewport?.height !== target.viewport?.height) throw new WorkflowError('Roblox 场景状态、视口或场景身份错绑');
    sameRef(repo, doc.referenceTarget, target.referenceTarget, 'Roblox 冻结视觉目标');
  } else if (doc.hostId !== work.visual.hostId || doc.layerType !== work.visual.layerType) {
    throw new WorkflowError('Roblox 显示层宿主或类型错绑');
  }
  if (work.workItemType === 'DISPLAY_LAYER' && stage === 'V5') {
    text(envelope.stateId, '显示层运行状态');
    if (doc.stateId !== envelope.stateId || !Number.isFinite(envelope.viewport?.width) || !Number.isFinite(envelope.viewport?.height) || envelope.viewport.width <= 0 || envelope.viewport.height <= 0 || doc.viewport?.width !== envelope.viewport.width || doc.viewport?.height !== envelope.viewport.height) throw new WorkflowError('Roblox 显示层运行状态或视口错绑');
  }
  fileIdentity(repo, envelope.referenceTarget, '公共视觉目标');
  sameRef(repo, doc.referenceTarget, envelope.referenceTarget, 'Roblox 与公共冻结目标');
  object(doc.object, 'Roblox 正式对象');
  if (doc.object.id !== expected.objectId) throw new WorkflowError('Roblox 正式对象身份错绑');
  text(doc.object.className, 'Roblox 正式对象类型');
  instancePath(doc.object.instancePath, 'Roblox 正式对象路径');
  studioIdentity(repo, doc.studio);
  captureRef(repo, doc.editReadbackRef, work, doc.studio, { context: 'Edit', tools: ['inspect_instance', 'execute_luau'], targetPath: doc.object.instancePath, savedReadback: true });
}

/** 核对实际人工记录中的布局、资源或运行引用与原生资料一致。 */
function confirmedRef(repo, work, target, name, field, ref) {
  const review = work.workItemType === 'SCENE' ? target?.reviews?.[name] : work.visual.reviews?.[name];
  const { doc } = jsonIdentity(repo, review, `Roblox ${name} 人工确认`);
  if (doc.objectId !== work.visual.objectId || doc.candidateId !== (target?.candidateId ?? work.visual.candidateId) || doc.decision !== 'APPROVED') throw new WorkflowError(`Roblox ${name} 人工确认身份或状态错绑`);
  if (work.workItemType === 'SCENE' && doc.targetId !== target.targetId) throw new WorkflowError(`Roblox ${name} 人工确认目标错绑`);
  if (work.workItemType === 'DISPLAY_LAYER' && (doc.hostId !== work.visual.hostId || doc.layerType !== work.visual.layerType)) throw new WorkflowError(`Roblox ${name} 人工确认宿主错绑`);
  sameRef(repo, doc[field], ref, `Roblox ${name} 人工确认的 ${field}`);
}

/** V4/V5 的公共 PASS 类别必须引用本目标的原生记录，防止任意非空文件冒充。 */
function bindManifestCategory(repo, work, target, manifest, category, ref) {
  const targetId = work.workItemType === 'SCENE' ? target.targetId : work.visual.objectId;
  const candidates = (manifest.items ?? []).filter((item) => item?.category === category && item.status === 'PASS' &&
    (work.workItemType === 'SCENE' ? item.targetId === targetId : item.targetId === undefined || item.targetId === targetId));
  if (candidates.length !== 1 || repoPath(repo, candidates[0].path).relative !== repoPath(repo, ref.path).relative) throw new WorkflowError(`Roblox ${category} 公共证据未绑定当前原生记录或目标`);
  fileIdentity(repo, ref, `Roblox ${category} 原生记录`, work.evidenceRoot);
}

/** V4/V5 核对工程证据中的正式源与对象，沿用公共实施包和质量门。 */
function bindCurrentEngineering(repo, work, target, doc, stage) {
  const manifest = evidenceJson(repo, work.evidenceRef?.path, work, 'Roblox 公共证据清单');
  const pack = readJson(repo, work.implementationPackageRef?.path, 'Roblox 实施包');
  validateRobloxEngineering(repo, work, manifest, pack);
  const engineeringItem = manifest.items.find((item) => item.category === 'roblox-engineering' && item.status === 'PASS');
  const engineering = evidenceJson(repo, engineeringItem.path, work, 'Roblox 工程证据');
  sameRef(repo, doc.studio.place.snapshotRef, engineering.studio.place.snapshotRef, '当前工程正式源');
  if (doc.studio.studioId !== engineering.studio.studioId || doc.studio.place.placeKey !== engineering.studio.place.placeKey ||
      doc.object.id !== engineering.root.objectId || JSON.stringify(doc.object.instancePath) !== JSON.stringify(engineering.root.instancePath)) throw new WorkflowError('Roblox 视觉对象未绑定当前工程读取结果');
  bindManifestCategory(repo, work, target, manifest, 'asset-import', doc.assetManifestRef);
  if (stage === 'V5') bindManifestCategory(repo, work, target, manifest, 'roblox-runtime', doc.runtimeContextRef);
  return engineering;
}

/** 同步验证 Roblox 视觉阶段；实际创建、运行及人工判断均由外部流程完成。 */
export function validateRobloxVisual(repo, work, { stage, target, envelope } = {}) {
  object(envelope, 'Roblox 公共领域包装');
  const { doc } = jsonIdentity(repo, envelope.robloxEvidenceRef, 'Roblox 原生视觉证据', work.evidenceRoot);
  validateIdentity(repo, work, stage, target, envelope, doc);
  if (stage === 'V2') return { status: 'PASS', scope: 'record-consistency' };
  const { layout, nodes } = validateRobloxLayout(repo, work, doc);
  confirmedRef(repo, work, target, 'V3Layout', 'layoutSpecRef', doc.layoutSpecRef);
  if (stage === 'V3') return { status: 'PASS', scope: 'record-consistency' };
  const engineering = bindCurrentEngineering(repo, work, target, doc, stage);
  if ([...nodes.values()].some((node) => node.space === 'screen-scale-offset')) {
    // V4 起读取已保存的正式实例；V3 仍只冻结计划，不提前要求完成正式装配。
    const readback = captureRef(repo, layout.editObservationRef, work, layout.studio, { context: 'Edit', tools: ['execute_luau'], targetPath: doc.object.instancePath, savedReadback: true });
    validateScreenReadback(repo, layout, nodes, readback, { sources: engineering.sources });
  }
  const assets = validateRobloxAssets(repo, work, doc, nodes);
  confirmedRef(repo, work, target, 'V4', 'assetManifestRef', doc.assetManifestRef);
  if (stage === 'V5') {
    validateRobloxRuntime(repo, work, doc, nodes, assets, engineering.sources, layout);
    confirmedRef(repo, work, target, 'V5', 'runtimeContextRef', doc.runtimeContextRef);
  }
  return { status: 'PASS', scope: 'record-consistency' };
}
