import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTextStyle } from './text-style-validation.mjs';
import { deriveUiLayoutPlan } from './layout-plan-derive.mjs';
import { validateUiLayoutRuntime } from './layout-runtime-validation.mjs';

/** 构造绑定确认稿与实际组件路径的文字测试数据。 */
function fixture() {
  const node = {
    id: 'price',
    textStyle: {
      source: 'Assets/Design/price.json#text',
      attributes: [
        { name: 'font', componentType: 'Example.Text', propertyPath: 'font', expectedValue: 'Assets/Fonts/Price.asset' },
        { name: 'fontSize', componentType: 'Example.Text', propertyPath: 'size', expectedValue: '24' },
        { name: 'fontWeight', componentType: 'Example.Text', propertyPath: 'weight', expectedValue: '400' },
        { name: 'lineHeight', componentType: 'Example.Text', propertyPath: 'lineHeight', expectedValue: '28' },
        { name: 'letterSpacing', componentType: 'Example.Text', propertyPath: 'letterSpacing', expectedValue: '0' },
        { name: 'alignment', componentType: 'Example.Text', propertyPath: 'alignment', expectedValue: 'center' },
        { name: 'wrap', componentType: 'Example.Text', propertyPath: 'wrap', expectedValue: 'false' },
        { name: 'fill', componentType: 'Example.Text', propertyPath: 'color', expectedValue: '#FFFFFFFF' },
      ],
    },
  };
  const observations = node.textStyle.attributes.map(({ expectedValue, ...attribute }) => ({
    ...attribute, status: 'MEASURED', actualValue: expectedValue,
  }));
  return { node, observations };
}

test('确认稿目标与真实属性相符时通过', () => {
  const { node, observations } = fixture();
  assert.deepEqual(validateTextStyle(node, observations), []);
});

test('缺少目标、实际数据或实际属性路径变化时保持未验证', () => {
  const { node, observations } = fixture();
  assert.match(validateTextStyle({ id: 'price' }, observations).join('\n'), /缺少绑定确认稿/);
  assert.match(validateTextStyle(node, undefined).join('\n'), /缺少真实组件/);
  observations[0].propertyPath = 'different';
  assert.match(validateTextStyle(node, observations).join('\n'), /font.*未验证/);
  observations[0].propertyPath = 'font';
  observations[0].status = 'UNAVAILABLE';
  assert.match(validateTextStyle(node, observations).join('\n'), /font.*未验证/);
});

test('字体、字号和其他适用样式偏差不可通过', () => {
  const { node, observations } = fixture();
  for (const observation of observations) {
    const original = observation.actualValue;
    observation.actualValue = 'different';
    assert.match(validateTextStyle(node, observations).join('\n'), new RegExp(`${observation.name}.*不一致`));
    observation.actualValue = original;
  }
  node.textStyle.attributes = node.textStyle.attributes.filter(({ name }) => name !== 'fontSize');
  assert.match(validateTextStyle(node, observations).join('\n'), /缺少 fontSize/);
});

test('字体颜色必须有确认稿目标和实际 RGBA 回读', () => {
  const { node, observations } = fixture();
  const color = observations.find(({ name }) => name === 'fill');
  color.actualValue = '#FEFFFFFF';
  assert.match(validateTextStyle(node, observations).join('\n'), /fill.*不一致/);
  color.actualValue = '#FFFFFF80';
  assert.match(validateTextStyle(node, observations).join('\n'), /fill.*不一致/);
  assert.match(validateTextStyle(node, observations.filter(({ name }) => name !== 'fill')).join('\n'), /fill.*未验证/);
  node.textStyle.attributes = node.textStyle.attributes.filter(({ name }) => name !== 'fill');
  assert.match(validateTextStyle(node, observations).join('\n'), /缺少 fill/);
});

test('V5 布局入口对活动文字节点校验样式回读', () => {
  const { node: styleNode, observations } = fixture();
  const template = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  template.nodes = [template.nodes[0]];
  const target = template.nodes[0];
  target.renderKind = 'TEXT';
  target.textStyle = styleNode.textStyle;
  delete target.layoutBinding.uiLayout.imageSizing;
  const fill = target.textStyle.attributes.find(({ name }) => name === 'fill');
  fill.expectedValue = '#FFFFFF';
  assert.throws(() => deriveUiLayoutPlan(template), /expectedValue/);
  fill.expectedValue = '#FFFFFFFF';
  const plan = deriveUiLayoutPlan(template);
  const actualRect = { ...plan.nodes[0].targetBounds };
  const snapshot = {
    active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: ['RECT_TRANSFORM'], widthWriters: ['RECT_TRANSFORM'], heightWriters: ['RECT_TRANSFORM'],
    layoutGroup: null, parentLayoutGroup: null, contentSizeFitter: null, aspectRatioFitter: null,
    image: null, uiToolkit: null, externalWriters: [], textStyle: observations,
    rectTransform: { anchorMin: target.layoutBinding.anchor.min, anchorMax: target.layoutBinding.anchor.max,
      pivot: target.layoutBinding.pivot, anchoredPosition: { x: 0, y: 0 }, localSize: { width: actualRect.width, height: actualRect.height } },
  };
  const report = {
    measurementSource: 'UNITY_EDITOR_LOADED_SCENE', runId: 'synthetic', generatedAtUtc: '2026-11-09T00:00:00Z', frameCount: 1,
    includesComponentSnapshots: true, uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId,
    scenePath: plan.scenePath, status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{ id: target.id, objectPath: 'Canvas/SafeArea/Panel', parentPath: 'Canvas/SafeArea', referenceId: 'safe-area',
      referencePath: 'safe-area', parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'], actualRect,
      targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot }],
  };
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  snapshot.textStyle[1].actualValue = '22';
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /fontSize.*不一致/);
  snapshot.textStyle = [];
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /font.*未验证/);
  const evidence = {
    measurementSource: report.measurementSource, runId: report.runId, frameCount: report.frameCount,
    scenePath: report.scenePath, stateId: report.stateId, uiSystem: report.uiSystem,
    measurements: [{ id: target.id, objectPath: 'Canvas/SafeArea/Panel', textStyle: observations }],
  };
  observations[1].actualValue = '24';
  assert.deepEqual(validateUiLayoutRuntime(plan, report, { textStyleEvidence: evidence }), []);
  evidence.runId = 'another-run';
  assert.match(validateUiLayoutRuntime(plan, report, { textStyleEvidence: evidence }).join('\n'), /补充文字证据.*runId/);
  evidence.runId = report.runId;
  evidence.measurements[0].objectPath = 'Canvas/Other';
  assert.match(validateUiLayoutRuntime(plan, report, { textStyleEvidence: evidence }).join('\n'), /对象路径/);
  evidence.measurements[0].objectPath = 'Canvas/SafeArea/Panel';
  snapshot.textStyle = [{ ...observations[0], actualValue: 'another-font' }];
  assert.match(validateUiLayoutRuntime(plan, report, { textStyleEvidence: evidence }).join('\n'), /与已有实测冲突/);
});
