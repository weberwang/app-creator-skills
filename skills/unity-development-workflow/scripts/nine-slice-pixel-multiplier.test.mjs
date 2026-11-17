/** 合成证据只验证九宫格机器合同，不代表 Unity 实际运行或视觉验收。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateNineSliceProduction } from './nine-slice-contract.mjs';
import { deriveUiLayoutPlan } from './layout-plan-derive.mjs';
import { validateUiLayoutRuntime } from './layout-runtime-validation.mjs';

/** 为生产与布局合同提供相同的冻结源帧和切片边。 */
function nineSlice() {
  return { mode: 'stretch', reason: '固定边角', sourceSize: { width: 64, height: 64 }, border: [8, 8, 8, 8] };
}

/** 构造覆盖同一资源和真实消费者的九宫格跨阶段材料。 */
function productionFixture(presentation) {
  const decision = nineSlice();
  const importer = { textureType: 'Sprite', spriteMode: 'Single', border: decision.border };
  const item = { id: 'panel', resourceId: 'ui.panel', nineSlice: decision };
  const task = { id: 'task', resourceId: 'ui.panel', sourceVersion: 'v1', nineSlice: decision, unityImport: importer };
  const registration = { taskId: 'task', resourceId: 'ui.panel', sourceVersion: 'v1', assetGuid: 'guid', assetPath: 'Assets/panel.png', unityValidation: 'PASS', importer };
  const binding = { itemId: 'panel', resourceId: 'ui.panel', assetGuid: 'guid', assetPath: 'Assets/panel.png', nineSlice: decision, consumerNodeIds: ['node'] };
  const placement = { nodeId: 'node', measured: true, presentation, border: decision.border, size: { width: 100, height: 60 }, coordinateSpace: 'UNITY_LOGICAL_UNITS', borderPixelsToUnits: 0.5 };
  placement[presentation === 'UGUI_SLICED' ? 'pixelsPerUnitMultiplier' : 'sliceScale'] = 1;
  return { item, task, registration, binding, placements: [placement] };
}

/** 从实际布局模板构造单节点计划与同批快照，PPU 换算有意使用非 1。 */
function runtimeFixture(uiSystem, sliced = true) {
  const source = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  source.nodes = [source.nodes[0]];
  const node = source.nodes[0];
  node.layoutBinding.uiLayout.imageSizing = sliced ? { mode: 'SLICED' } : { mode: 'EXPLICIT', reason: '按组件需求显示' };
  if (sliced) node.nineSlice = nineSlice();
  if (uiSystem === 'UI_TOOLKIT') {
    source.uiSystem = uiSystem;
    source.coordinateSpace = 'UI_TOOLKIT_LOGICAL_POINTS';
    node.layoutBinding.coordinateSpace = 'UI_TOOLKIT_PANEL';
    node.layoutBinding.uiLayout.positionDriver = 'UITOOLKIT_LAYOUT';
    node.layoutBinding.uiLayout.sizeDrivers = { width: 'UITOOLKIT_LAYOUT', height: 'UITOOLKIT_LAYOUT' };
  }
  const plan = deriveUiLayoutPlan(source);
  const derivedNode = plan.nodes[0];
  const actualRect = { ...derivedNode.targetBounds };
  const driver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_LAYOUT';
  const snapshot = {
    active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: [driver], widthWriters: [driver], heightWriters: [driver],
    layoutGroup: null, parentLayoutGroup: null, contentSizeFitter: null, aspectRatioFitter: null,
    image: null, uiToolkit: null, externalWriters: [], rectTransform: null,
  };
  if (uiSystem === 'UGUI') {
    snapshot.rectTransform = { anchorMin: { ...node.layoutBinding.anchor.min }, anchorMax: { ...node.layoutBinding.anchor.max },
      pivot: { ...node.layoutBinding.pivot }, anchoredPosition: { x: 0, y: 0 }, localSize: { width: actualRect.width, height: actualRect.height } };
    snapshot.image = { assetGuid: 'guid', localId: '1', assetPath: 'Assets/panel.png',
      sourceSize: { width: 64, height: 64 }, localSize: { width: actualRect.width, height: actualRect.height }, nativeSize: { width: 32, height: 32 },
      pixelsPerUnit: 200, imagePixelsPerUnit: 2, referencePixelsPerUnit: 100, pixelsPerUnitMultiplier: 1,
      type: sliced ? 'Sliced' : 'Simple', hasBorder: true, preserveAspect: false, border: [8, 8, 8, 8] };
  } else {
    snapshot.uiToolkit = { position: 'Relative', backgroundAssetGuid: 'guid', sliceLeft: sliced ? 8 : 0, sliceBottom: sliced ? 8 : 0,
      sliceRight: sliced ? 8 : 0, sliceTop: sliced ? 8 : 0, sliceScale: 1 };
  }
  const report = { measurementSource: 'UNITY_EDITOR_LOADED_SCENE', runId: 'synthetic', generatedAtUtc: '2026-11-09T00:00:00Z', frameCount: 1,
    includesComponentSnapshots: true, uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId, scenePath: plan.scenePath,
    status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{ id: node.id, objectPath: 'Canvas/SafeArea/Panel', elementName: 'Panel', parentPath: 'Canvas/SafeArea', referenceId: 'safe-area', referencePath: 'safe-area',
      parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'], actualRect, targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot }] };
  return { plan, report, snapshot };
}

for (const [presentation, field] of [['UGUI_SLICED', 'pixelsPerUnitMultiplier'], ['UITOOLKIT_SLICED', 'sliceScale']]) {
  test(`${presentation} 跨阶段检查只接受实测数字 1，保留独立坐标换算`, () => {
    const fixture = productionFixture(presentation);
    assert.deepEqual(validateNineSliceProduction(fixture), []);
    for (const value of [undefined, null, '1', 0, -1, 2, NaN, Infinity, 1 + Number.EPSILON]) {
      fixture.placements[0][field] = value;
      assert.match(validateNineSliceProduction(fixture).join('\n'), new RegExp(`${field}.*严格等于数字 1`), String(value));
    }
  });

  test(`${presentation} 实际切片不能通过 not-applicable 声明绕过`, () => {
    const fixture = productionFixture(presentation);
    const decision = { mode: 'not-applicable', reason: '声明为普通图片' };
    fixture.item.nineSlice = decision;
    fixture.task.nineSlice = decision;
    fixture.binding.nineSlice = decision;
    fixture.task.unityImport.border = [0, 0, 0, 0];
    fixture.placements[0][field] = 2;
    assert.match(validateNineSliceProduction(fixture).join('\n'), /不适用九宫格.*实际切片呈现冲突/);
    // 即使倍率恢复为 1，实际使用切片与不适用的声明仍然矛盾。
    fixture.placements[0][field] = 1;
    assert.match(validateNineSliceProduction(fixture).join('\n'), /不适用九宫格.*实际切片呈现冲突/);
    fixture.placements[0].presentation = 'SIMPLE';
    assert.deepEqual(validateNineSliceProduction(fixture), []);
  });
}

for (const [system, key, field] of [['UGUI', 'image', 'pixelsPerUnitMultiplier'], ['UI_TOOLKIT', 'uiToolkit', 'sliceScale']]) {
  test(`${system} 运行快照的九宫格倍率必须严格为 1`, () => {
    const { plan, report, snapshot } = runtimeFixture(system);
    assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
    for (const value of [undefined, null, '1', 0, -1, 2, NaN, Infinity, 1 + Number.EPSILON]) {
      snapshot[key][field] = value;
      assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${field}.*严格等于数字 1`), String(value));
    }
  });

  test(`${system} 实际切片不能通过 EXPLICIT 或缺省意图绕开倍率`, () => {
    const { plan, report, snapshot } = runtimeFixture(system, false);
    if (system === 'UGUI') snapshot.image.type = 'Sliced';
    else { snapshot.uiToolkit.sliceLeft = 8; snapshot.uiToolkit.backgroundAssetGuid = ''; }
    snapshot[key][field] = 2;
    assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${field}.*严格等于数字 1`));
    // BACKGROUND 可省略尺寸意图，但真实切片仍须接受同一检查。
    plan.nodes[0].renderKind = 'BACKGROUND';
    delete plan.nodes[0].layoutBinding.uiLayout.imageSizing;
    assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${field}.*严格等于数字 1`));
  });

  test(`${system} 非九宫格不强制切片倍率`, () => {
    const { plan, report, snapshot } = runtimeFixture(system, false);
    snapshot[key][field] = 2;
    assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  });
}
