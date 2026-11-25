import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, WorkflowError } from './io.mjs';
import { isVisualComponentPath, matchesVisualAcceptance, readVisualAcceptanceFile, readVisualAcceptanceJson } from './visual-acceptance-evidence.mjs';
import { readTargetRuntimeLayoutRef } from './runtime-layout-evidence.mjs';
import { validateV4FormalIntegration } from './v4-text-restoration.mjs';
import { verifyUnityTrialCapture } from './unity-trial-capture-evidence.mjs';

const require = createRequire(import.meta.url);

/** 校验 Unity 冻结布局并读取同一计划、状态和场景的原生组件快照。 */
function readUnityLayout(repo, work, target, plan, planRef, layoutRef) {
  const report = readVisualAcceptanceJson(repo, work, layoutRef, 'Unity 图片布局采集');
  // 仅 Unity 工作项加载原生依赖，其他技术栈可以独立安装。
  const { verifyUiLayoutMeasurement } = require('../../../unity-domain-contracts/scripts/runtime/ui-layout-evidence.mjs');
  try {
    verifyUiLayoutMeasurement(plan, report, {
      candidateId: target.candidateId, path: layoutRef.path,
      taskId: work.workItemId, layoutPlanSha256: planRef.sha256,
    });
  } catch (error) {
    throw new WorkflowError(`Unity 图片布局采集未通过：${error.message}`);
  }
  return report;
}

/** 解析冻结的 Unity 导入元数据，核对 UI Toolkit 实际背景资源 GUID。 */
function requireToolkitImage(repo, work, placement, snapshot) {
  const ref = placement.importMetadataRef;
  const expectedPath = `${placement.outputRef.path}.meta`;
  if (!ref?.path || fileIdentityKey(repo, ref.path) !== fileIdentityKey(repo, expectedPath)) {
    throw new WorkflowError(`Unity 图片 ${placement.assetId} 缺少对应资源的导入元数据`);
  }
  const data = readVisualAcceptanceFile(repo, work, ref, 'Unity 图片导入元数据').toString('utf8');
  const guids = [...data.matchAll(/^guid:\s*([a-f0-9]{32})\s*$/gmi)];
  if (guids.length !== 1 || guids[0][1].toLowerCase() !== String(snapshot.uiToolkit?.backgroundAssetGuid ?? '').toLowerCase()) {
    throw new WorkflowError(`Unity 图片 ${placement.assetId} 的实际背景资源 GUID 与导入元数据不符`);
  }
}

/** 按冻结布局逐图匹配实际启用的 Unity 原生组件与正式资源。 */
function verifyImagePlacements(repo, work, plan, report, placements, root) {
  const planned = new Map(plan.nodes.filter((node) => ['SPRITE', 'BACKGROUND'].includes(node.renderKind)
    && node.expectedActive !== false).map((node) => [node.id, node]));
  if (!Array.isArray(report.measurements)) throw new WorkflowError('Unity 图片采集缺少实际组件测量');
  const used = new Set();
  const sprites = new Map();
  for (const placement of placements) {
    const componentPath = placement.componentPath;
    if (!isVisualComponentPath(componentPath)
      || (plan.uiSystem === 'UGUI' && componentPath !== root && !componentPath.startsWith(`${root}/`))) {
      throw new WorkflowError(`Unity 图片 ${placement.assetId} 的实际组件不属于正式根`);
    }
    const matches = report.measurements.filter((row) => (plan.uiSystem === 'UGUI' ? row?.objectPath : row?.elementName) === componentPath);
    const row = matches.length === 1 ? matches[0] : null;
    const snapshot = row?.componentSnapshot;
    if (!row || !planned.has(row.id) || snapshot?.active !== true || used.has(componentPath)) {
      throw new WorkflowError(`Unity 图片 ${placement.assetId} 未绑定唯一活动的冻结布局组件`);
    }
    used.add(componentPath);
    if (plan.uiSystem === 'UGUI') {
      const assetPath = snapshot.image?.assetPath;
      if (!assetPath || fileIdentityKey(repo, assetPath) !== fileIdentityKey(repo, placement.outputRef.path)) {
        throw new WorkflowError(`Unity 图片 ${placement.assetId} 的实际 Image 资源与正式输出不符`);
      }
      sprites.set(componentPath, { assetGuid: snapshot.image.assetGuid, localId: snapshot.image.localId });
    } else {
      // UI Toolkit 的实际标识同时包含 UIDocument 对象路径和元素名称。
      if (row.objectPath !== root) throw new WorkflowError(`Unity 图片 ${placement.assetId} 未绑定同一正式 UIDocument 组件`);
      requireToolkitImage(repo, work, placement, snapshot);
    }
  }
  return sprites;
}

/** 用 Unity 原生布局证据绑定 V4 图片试装，并在 V5 独立复验实际消费者。 */
export function readUnityImagePlacements(repo, work, target, stage, review, integrationRef, identity, screenshot) {
  if (work?.stack !== 'unity' || work.workItemType !== 'SCENE' || !['V4', 'V5'].includes(stage)) {
    throw new WorkflowError('Unity 图片试装必须绑定当前场景和 V4/V5 阶段');
  }
  const capture = readVisualAcceptanceJson(repo, work, integrationRef, 'Unity 同批图片正式接入采集');
  if (!matchesVisualAcceptance(capture, { ...identity, schemaVersion: 'visual-image-integration/1.0',
    visualStage: 'V4', measurementSource: 'runtime-component', screenshotRef: screenshot })
    || typeof capture.runId !== 'string' || !capture.runId.trim()) {
    throw new WorkflowError('Unity 图片接入采集未绑定已确认截图和运行批次');
  }
  const layoutReview = readVisualAcceptanceJson(repo, work, target.reviews?.V3Layout, 'Unity V3 正式布局确认');
  const planRef = layoutReview.layoutSpecRef;
  const plan = readVisualAcceptanceJson(repo, work, planRef, 'Unity V3 冻结布局计划');
  if (!['UGUI', 'UI_TOOLKIT'].includes(plan.uiSystem) || plan.sceneId !== target.sceneId || plan.stateId !== target.stateId
    || !plan.scenePath || plan.displayLayerId !== undefined) {
    throw new WorkflowError('Unity V3 布局计划未绑定当前屏幕场景和状态');
  }
  const root = capture.formalIntegration?.rootComponentPath;
  if (!isVisualComponentPath(root)) throw new WorkflowError('Unity 图片试装缺少有效的正式组件根');
  if (review.textAcceptanceRef !== undefined && !isDeepStrictEqual(capture.nativeLayoutRef, review.textRestorationRef)) {
    throw new WorkflowError('Unity 图片与文字试装决议须绑定同一份原生采集报告');
  }
  validateV4FormalIntegration(repo, work, review, capture, { stage, entryPaths: [plan.scenePath] });
  if (!capture.formalIntegration.images.length) throw new WorkflowError('Unity 图片试装未登记正式图片消费者');
  const report = readUnityLayout(repo, work, target, plan, planRef, capture.nativeLayoutRef);
  if (report.runId !== capture.runId) throw new WorkflowError('Unity 图片原生布局与已确认采集批次不一致');
  verifyUnityTrialCapture(repo, work, target, screenshot, capture.nativeLayoutRef, report, capture.gameViewCaptureRef);
  const placements = capture.formalIntegration.images;
  const trialSprites = verifyImagePlacements(repo, work, plan, report, placements, root);
  if (stage === 'V5') {
    const currentRef = readTargetRuntimeLayoutRef(repo, work, target.targetId);
    const current = readUnityLayout(repo, work, target, plan, planRef, currentRef);
    if (current.runId === report.runId) throw new WorkflowError('Unity V5 图片运行不能复用 V4 试装采集批次');
    const currentSprites = verifyImagePlacements(repo, work, plan, current, placements, root);
    if (!isDeepStrictEqual(currentSprites, trialSprites)) throw new WorkflowError('Unity V5 图片未复验同一 Sprite 子资源');
  }
  return placements;
}
