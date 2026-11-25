/** 合成证据只验证九宫格机器合同，不代表 Unity 实际运行或视觉验收。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateNineSliceProduction } from './nine-slice-contract.mjs';
import { deriveUiLayoutPlan } from './layout-plan-derive.mjs';
import { validateUiLayoutPlan } from './layout-plan-validation.mjs';
import { validateUiLayoutRuntime } from './layout-runtime-validation.mjs';

/** 为生产与布局合同提供统一的紧凑小图源帧与切片边。 */
function nineSlice() {
  return { mode: 'stretch', reason: '固定边角', sourceSize: { width: 48, height: 48 }, border: [8, 8, 8, 8] };
}

/** 构造覆盖同一资源和真实消费者的九宫格跨阶段材料。 */
function productionFixture(presentation) {
  const decision = nineSlice();
  const importer = { textureType: 'Sprite', spriteMode: 'Single', border: decision.border };
  const item = { id: 'panel', resourceId: 'ui.panel', nineSlice: decision };
  const task = {
    id: 'task', resourceId: 'ui.panel', sourceVersion: 'v1', nineSlice: decision,
    output: { runtimeWidth: 48, runtimeHeight: 48 }, unityImport: importer,
  };
  const registration = { taskId: 'task', resourceId: 'ui.panel', sourceVersion: 'v1', assetGuid: 'guid', assetPath: 'Assets/panel.png', unityValidation: 'PASS', importer };
  const binding = { itemId: 'panel', resourceId: 'ui.panel', assetGuid: 'guid', assetPath: 'Assets/panel.png', nineSlice: decision, consumerNodeIds: ['node'] };
  const placement = { nodeId: 'node', measured: true, presentation, border: decision.border, size: { width: 100, height: 60 }, coordinateSpace: 'UNITY_LOGICAL_UNITS', borderPixelsToUnits: 1 };
  placement[presentation === 'UGUI_SLICED' ? 'pixelsPerUnitMultiplier' : 'sliceScale'] = 1;
  return { item, task, registration, binding, placements: [placement] };
}

/** 构造单节点布局计划源数据，用于 V3 计划和 V5 运行时测试。 */
function createPlanSource(uiSystem, sliced = true) {
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
  return source;
}

/** 从实际布局模板构造单节点计划与同批快照，默认紧凑小图经九宫格放大且单位缩放为 1。 */
function runtimeFixture(uiSystem, sliced = true) {
  const source = createPlanSource(uiSystem, sliced);
  const plan = deriveUiLayoutPlan(source);
  const derivedNode = plan.nodes[0];
  const node = source.nodes[0];
  const actualRect = { ...derivedNode.targetBounds };
  const driver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_LAYOUT';
  const snapshot = {
    active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: [driver], widthWriters: [driver], heightWriters: [driver],
    layoutGroup: null, parentLayoutGroup: null, contentSizeFitter: null, aspectRatioFitter: null,
    image: null, uiToolkit: null, externalWriters: [], rectTransform: null,
  };
  if (uiSystem === 'UGUI') {
    snapshot.rectTransform = {
      anchorMin: { ...node.layoutBinding.anchor.min }, anchorMax: { ...node.layoutBinding.anchor.max },
      pivot: { ...node.layoutBinding.pivot }, anchoredPosition: { x: 0, y: 0 },
      localScale: { x: 1, y: 1 }, effectiveScale: { x: 1, y: 1 },
      localSize: { width: actualRect.width, height: actualRect.height },
    };
    snapshot.image = {
      assetGuid: 'guid', localId: '1', assetPath: 'Assets/panel.png',
      sourceSize: { width: 48, height: 48 }, localSize: { width: actualRect.width, height: actualRect.height }, nativeSize: { width: 48, height: 48 },
      pixelsPerUnit: 100, imagePixelsPerUnit: 1, referencePixelsPerUnit: 100, pixelsPerUnitMultiplier: 1,
      type: sliced ? 'Sliced' : 'Simple', hasBorder: true, preserveAspect: false, border: [8, 8, 8, 8],
    };
  } else {
    snapshot.uiToolkit = {
      position: 'Relative', backgroundAssetGuid: 'guid', sliceLeft: sliced ? 8 : 0, sliceBottom: sliced ? 8 : 0,
      sliceRight: sliced ? 8 : 0, sliceTop: sliced ? 8 : 0, sliceScale: 1,
      localScale: { x: 1, y: 1 }, effectiveScale: { x: 1, y: 1 },
      width: actualRect.width, height: actualRect.height,
    };
  }
  const report = {
    measurementSource: 'UNITY_EDITOR_LOADED_SCENE', runId: 'synthetic', generatedAtUtc: '2026-11-09T00:00:00Z', frameCount: 1,
    includesComponentSnapshots: true, uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId, scenePath: plan.scenePath,
    status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{
      id: node.id, objectPath: 'Canvas/SafeArea/Panel', elementName: 'Panel', parentPath: 'Canvas/SafeArea', referenceId: 'safe-area', referencePath: 'safe-area',
      parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'], actualRect, targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot,
    }],
  };
  return { plan, report, snapshot };
}

for (const [presentation, field] of [['UGUI_SLICED', 'pixelsPerUnitMultiplier'], ['UITOOLKIT_SLICED', 'sliceScale']]) {
  test(`${presentation} 跨阶段检查只接受实测数字 1，禁止大图缩小与高 PPU 缩小`, () => {
    const fixture = productionFixture(presentation);
    assert.deepEqual(validateNineSliceProduction(fixture), []);
    for (const value of [undefined, null, '1', 0, -1, 2, NaN, Infinity, 1 + Number.EPSILON]) {
      fixture.placements[0][field] = value;
      assert.match(validateNineSliceProduction(fixture).join('\n'), new RegExp(`${field}.*严格等于数字 1`), String(value));
    }
    fixture.placements[0][field] = 1;

    // UNITY_LOGICAL_UNITS 下禁止提高 Sprite PPU 导致 borderPixelsToUnits < 1。
    fixture.placements[0].borderPixelsToUnits = 0.5;
    assert.match(validateNineSliceProduction(fixture).join('\n'), /borderPixelsToUnits 不能小于 1/);
    fixture.placements[0].borderPixelsToUnits = 1;

    // 逻辑单位下源图宽高不得大于显示框。
    fixture.placements[0].size = { width: 40, height: 60 };
    assert.match(validateNineSliceProduction(fixture).join('\n'), /禁止大图缩小/);

    // SCREEN_PIXELS 允许合法屏幕缩放换算，但换算后仍不得大于显示框。
    fixture.placements[0].coordinateSpace = 'SCREEN_PIXELS';
    fixture.placements[0].borderPixelsToUnits = 0.5;
    fixture.placements[0].size = { width: 100, height: 60 };
    assert.deepEqual(validateNineSliceProduction(fixture), []);
    fixture.placements[0].borderPixelsToUnits = 2;
    assert.match(validateNineSliceProduction(fixture).join('\n'), /禁止大图缩小/);
    fixture.placements[0].coordinateSpace = 'UNITY_LOGICAL_UNITS';
    fixture.placements[0].borderPixelsToUnits = 1;

    // task.output 尺寸必须与冻结九宫格小图 sourceSize 一致。
    fixture.task.output = { runtimeWidth: 200, runtimeHeight: 100 };
    assert.match(validateNineSliceProduction(fixture).join('\n'), /runtimeWidth\/runtimeHeight 必须与冻结 nineSlice\.sourceSize 一致/);
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

test('V3 布局计划检查 SLICED/nineSlice 一致性并拒绝大图缩小规划', () => {
  const valid = createPlanSource('UGUI', true);
  assert.deepEqual(validateUiLayoutPlan(valid), []);

  const oversizedBounds = createPlanSource('UGUI', true);
  oversizedBounds.nodes[0].nineSlice.sourceSize = { width: 180, height: 48 };
  assert.match(validateUiLayoutPlan(oversizedBounds).join('\n'), /禁止大图缩小/);

  const oversizedMinimum = createPlanSource('UGUI', true);
  oversizedMinimum.nodes[0].layoutBinding.uiLayout.minimumSize = { width: 40, height: 64 };
  assert.match(validateUiLayoutPlan(oversizedMinimum).join('\n'), /禁止大图缩小/);

  const missingSlice = createPlanSource('UGUI', true);
  delete missingSlice.nodes[0].nineSlice;
  assert.match(validateUiLayoutPlan(missingSlice).join('\n'), /SLICED imageSizing 必须绑定 mode=stretch/);

  const mismatchedSizing = createPlanSource('UGUI', false);
  mismatchedSizing.nodes[0].nineSlice = nineSlice();
  assert.match(validateUiLayoutPlan(mismatchedSizing).join('\n'), /必须与 SLICED imageSizing 一致/);
});

for (const [system, key, field] of [['UGUI', 'image', 'pixelsPerUnitMultiplier'], ['UI_TOOLKIT', 'uiToolkit', 'sliceScale']]) {
  test(`${system} 运行快照的九宫格倍率必须严格为 1`, () => {
    const { plan, report, snapshot } = runtimeFixture(system);
    assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
    for (const value of [undefined, null, '1', 0, -1, 2, NaN, Infinity, 1 + Number.EPSILON]) {
      snapshot[key][field] = value;
      assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${field}.*严格等于数字 1`), String(value));
    }
  });

  test(`${system} 运行快照拒绝大图缩小、高 PPU 缩小与非单位节点/祖先缩放`, () => {
    // 1. 源图宽高大于实际显示框（大图缩小）。
    {
      const { plan, report, snapshot } = runtimeFixture(system);
      plan.nodes[0].nineSlice.sourceSize = { width: 48, height: 80 };
      if (system === 'UGUI') {
        snapshot.image.sourceSize = { width: 48, height: 80 };
        snapshot.image.nativeSize = { width: 48, height: 80 };
      }
      assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /禁止大图缩小/);
    }

    // 2. 节点或祖先存在非 (1, 1) 缩放。
    for (const scaleField of ['localScale', 'effectiveScale']) {
      const { plan, report, snapshot } = runtimeFixture(system);
      const target = system === 'UGUI' ? snapshot.rectTransform : snapshot.uiToolkit;
      target[scaleField] = { x: 0.5, y: 1 };
      assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${scaleField}.*必须为 \\(1, 1\\)`));
      delete target[scaleField];
      assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${scaleField}.*必须为 \\(1, 1\\)`));
    }

    // 3. UGUI 专属 PPU 检查：禁止通过拉高 PPU 缩小大图，也禁止低 PPU 导致原生尺寸超出本地显示框。
    if (system === 'UGUI') {
      const highPpu = runtimeFixture('UGUI');
      highPpu.snapshot.image.pixelsPerUnit = 200;
      highPpu.snapshot.image.imagePixelsPerUnit = 2;
      highPpu.snapshot.image.nativeSize = { width: 24, height: 24 };
      assert.match(validateUiLayoutRuntime(highPpu.plan, highPpu.report).join('\n'), /imagePixelsPerUnit 大于 1/);

      const lowPpuOverflow = runtimeFixture('UGUI');
      lowPpuOverflow.snapshot.image.pixelsPerUnit = 50;
      lowPpuOverflow.snapshot.image.imagePixelsPerUnit = 0.5;
      lowPpuOverflow.snapshot.image.nativeSize = { width: 96, height: 96 };
      assert.match(validateUiLayoutRuntime(lowPpuOverflow.plan, lowPpuOverflow.report).join('\n'), /原生显示尺寸.*禁止大图缩小/);
    }
  });

  test(`${system} 实际切片不能通过 EXPLICIT 或缺省意图绕开倍率`, () => {
    const { plan, report, snapshot } = runtimeFixture(system, false);
    if (system === 'UGUI') snapshot.image.type = 'Sliced';
    else { snapshot.uiToolkit.sliceLeft = 8; snapshot.uiToolkit.backgroundAssetGuid = ''; }
    snapshot[key][field] = 2;
    assert.match(validateUiLayoutRuntime(plan, report).join('\n'), new RegExp(`${field}.*严格等于数字 1`));
    snapshot[key][field] = 1;
    assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /实际切片必须声明 SLICED/);
    snapshot[key][field] = 2;
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

  test(`${system} 常规运行检查使用实际局部显示框检查切片中心`, () => {
    const { plan, report, snapshot } = runtimeFixture(system);
    assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
    if (system === 'UGUI') {
      // 两侧各 8 像素，实际 Image PPU 为 1，因此宽 16 的本地框没有中心。
      snapshot.image.localSize.width = 16;
    } else {
      snapshot.uiToolkit.width = 16;
    }
    assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /九宫格实际显示框没有正尺寸中心/);
  });
}
