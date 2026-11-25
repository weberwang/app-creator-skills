import { readFileSync } from 'node:fs';
import { deriveUiLayoutPlan } from '../../skills/unity-development-workflow/scripts/layout-plan-derive.mjs';

/** 生成与实际 Game View 原生输出同形的同帧采集凭据。 */
export function unityGameViewCaptureFixture(save, screenshot, layoutRef, report, screenshotSize) {
  return save(`${screenshot.path}.json`, { schemaVersion: '1.0', status: 'PASS', captureScope: 'EDITOR_GAME_VIEW_END_OF_FRAME',
    taskId: report.taskId, candidateId: report.candidateId, scenePath: report.scenePath,
    screenshot: { ...screenshot, sizeBytes: screenshotSize, frameCount: report.frameCount },
    layoutMeasurement: { ...layoutRef, runId: report.runId, frameCount: report.frameCount } });
}

/** 生成绑定目标和状态的合成 Unity 布局计划，供公共阶段门测试使用。 */
export function unityLayoutFixture(write, target, { prefix, sceneId = target.sceneId, displayLayerId, withText = false } = {}) {
  const source = JSON.parse(readFileSync(new URL('../../skills/unity-development-workflow/templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  source.sceneId = sceneId;
  source.stateId = target.stateId;
  source.scenePath = 'Assets/Main.unity';
  source.splitPlanRef = { path: `${prefix}-split.json` };
  source.prefabStructureRef = { path: `${prefix}-structure.json` };
  source.prefabAssemblyRef = { path: `${prefix}-assembly.json` };
  source.nodes = [source.nodes[0]];
  const node = source.nodes[0];
  node.renderKind = withText ? 'TEXT' : 'STRUCTURE';
  delete node.layoutBinding.uiLayout.imageSizing;
  if (displayLayerId) {
    source.displayLayerId = displayLayerId;
    node.layoutBinding.uiLayout.floatingRootKind = 'popup';
  }
  if (withText) {
    node.textStyle = { source: target.referenceTarget.path, attributes: [
      { name: 'font', componentType: 'Example.Text', propertyPath: 'font', expectedValue: 'Assets/Fonts/Actual.asset' },
      { name: 'fontSize', componentType: 'Example.Text', propertyPath: 'size', expectedValue: '24' },
      { name: 'fill', componentType: 'Example.Text', propertyPath: 'color', expectedValue: '#FFFFFFFF' },
      { name: 'content', componentType: 'Example.Text', propertyPath: 'text', expectedValue: '确认' },
      { name: 'visible', componentType: 'Example.Text', propertyPath: 'visible', expectedValue: 'true' },
    ] };
  }
  const splitRef = write(source.splitPlanRef.path, {
    sourceImage: { path: target.referenceTarget.path },
    items: [{ id: node.decompositionElementId, targetPrefabNodeIds: [node.id], stateVariants: [{ id: source.stateId }], visualRouteAnalysis: { elementType: withText ? 'text' : 'group' } }],
  });
  source.splitPlanSha256 = splitRef.sha256;
  const plan = deriveUiLayoutPlan(source);
  const planRef = write(`${prefix}-layout.json`, plan);
  return { plan, planRef };
}

/** 生成同一工作项、候选和计划的组件实测；该数据仅用于自动化测试。 */
export function unityLayoutMeasurement(plan, planRef, { workItemId, candidateId, outputPath }) {
  const node = plan.nodes[0];
  const actualRect = { ...node.targetBounds };
  const snapshot = {
    active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: ['RECT_TRANSFORM'], widthWriters: ['RECT_TRANSFORM'], heightWriters: ['RECT_TRANSFORM'],
    layoutGroup: null, parentLayoutGroup: null, contentSizeFitter: null, aspectRatioFitter: null,
    image: null, uiToolkit: null, externalWriters: [],
    rectTransform: { anchorMin: node.layoutBinding.anchor.min, anchorMax: node.layoutBinding.anchor.max,
      pivot: node.layoutBinding.pivot, anchoredPosition: { x: 0, y: 0 }, localSize: { width: actualRect.width, height: actualRect.height } },
  };
  if (node.textStyle) snapshot.textStyle = node.textStyle.attributes.map(({ expectedValue, ...attribute }) => ({
    ...attribute, status: 'MEASURED', actualValue: expectedValue,
  }));
  return {
    measurementSource: 'UNITY_EDITOR_LOADED_SCENE', taskId: workItemId, candidateId, layoutPlanSha256: planRef.sha256,
    outputPath, runId: 'synthetic-run', generatedAtUtc: '2026-11-20T00:00:00Z', frameCount: 1,
    includesComponentSnapshots: true, uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId,
    scenePath: plan.scenePath, status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{ id: node.id, objectPath: 'Canvas/SafeArea/Panel', parentPath: 'Canvas/SafeArea', referenceId: 'safe-area',
      referencePath: 'safe-area', parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'], actualRect,
      targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot }],
  };
}
