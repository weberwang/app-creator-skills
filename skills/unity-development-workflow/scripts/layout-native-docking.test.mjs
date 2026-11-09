/** 合成 Unity 布局材料只验证合同，不能作为实际 Editor 运行或用户视觉验收。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { deriveUiLayoutPlan } from './layout-plan-derive.mjs';
import { validateUiLayoutPlan } from './layout-plan-validation.mjs';
import { validateUiLayoutRuntime } from './layout-runtime-validation.mjs';

/** 提取仓库真实模板中的单个普通容器，减少无关图片和子节点条件。 */
function createPlan() {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  plan.nodes = [plan.nodes[0]];
  plan.nodes[0].renderKind = 'STRUCTURE';
  delete plan.nodes[0].layoutBinding.uiLayout.imageSizing;
  return plan;
}

/** 模拟同批测量字段；所有数据仅供合同测试，未连接 Unity。 */
function createReport(plan) {
  const node = plan.nodes[0];
  const actualRect = { ...node.targetBounds };
  const snapshot = {
    active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: ['RECT_TRANSFORM'], widthWriters: ['RECT_TRANSFORM'], heightWriters: ['RECT_TRANSFORM'],
    layoutGroup: null, parentLayoutGroup: null, contentSizeFitter: null, aspectRatioFitter: null,
    image: null, uiToolkit: null, externalWriters: [],
    rectTransform: { anchorMin: { ...node.layoutBinding.anchor.min }, anchorMax: { ...node.layoutBinding.anchor.max },
      pivot: { ...node.layoutBinding.pivot }, anchoredPosition: { x: 0, y: 0 }, localSize: { width: actualRect.width, height: actualRect.height } },
  };
  return { measurementSource: 'UNITY_EDITOR_LOADED_SCENE', runId: 'synthetic', generatedAtUtc: '2026-11-09T00:00:00Z', frameCount: 1,
    includesComponentSnapshots: true, uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId, scenePath: plan.scenePath,
    status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{ id: node.id, objectPath: 'Canvas/SafeArea/Panel', parentPath: 'Canvas/SafeArea', referenceId: 'safe-area', referencePath: 'safe-area',
      parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'], actualRect, targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot }] };
}

test('普通 UI 使用真实 RectTransform 停靠，锚点和实际配置不能错绑', () => {
  const plan = deriveUiLayoutPlan(createPlan());
  const report = createReport(plan);
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  report.measurements[0].componentSnapshot.rectTransform.anchorMin.x = 0;
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /实际 RectTransform.anchorMin.*不一致/);
  const invalid = createPlan();
  invalid.nodes[0].layoutBinding.anchor.min.x = 0;
  assert.match(validateUiLayoutPlan(invalid).join('\n'), /停靠意图.*参照锚点不一致/);
});

test('普通 UI 缺少双轴、实际驱动或以脚本绕过原生停靠均被拒绝', () => {
  const plan = createPlan();
  delete plan.nodes[0].layoutBinding.axisAlignment.vertical;
  assert.match(validateUiLayoutPlan(plan).join('\n'), /vertical/);
  plan.nodes[0].layoutBinding.axisAlignment.vertical = 'center';
  delete plan.nodes[0].layoutBinding.uiLayout.positionDriver;
  assert.match(validateUiLayoutPlan(plan).join('\n'), /positionDriver/);
  plan.nodes[0].layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  plan.nodes[0].layoutBinding.uiLayout.nativeFallback = { kind: 'non-parent-reference', reason: '伪称不支持原生布局' };
  assert.match(validateUiLayoutPlan(plan).join('\n'), /参照是直接父级/);
  const frozen = deriveUiLayoutPlan(createPlan());
  const report = createReport(frozen);
  frozen.nodes[0].layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  frozen.nodes[0].layoutBinding.uiLayout.nativeFallback = { kind: 'non-parent-reference', reason: '伪称不支持原生布局' };
  assert.match(validateUiLayoutRuntime(frozen, report).join('\n'), /参照是直接父级/);
});

test('双边停靠不能借 RectTransform 拉伸普通图片', () => {
  const plan = createPlan();
  const node = plan.nodes[0];
  node.renderKind = 'SPRITE';
  node.layoutBinding.uiLayout.imageSizing = { mode: 'NATIVE' };
  node.layoutBinding.uiLayout.sizePolicy = 'STRETCH';
  node.layoutBinding.anchor.min.x = 0; node.layoutBinding.anchor.max.x = 1;
  assert.match(validateUiLayoutPlan(plan).join('\n'), /普通图片不能用 horizontal 双边锚点拉伸/);
});

test('完整图文组合使用父原生布局，不能伪称回退到脚本', () => {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateUiLayoutPlan(plan), []);
  const icon = plan.nodes.find((node) => node.id === 'purchase-icon');
  icon.layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  icon.layoutBinding.uiLayout.nativeFallback = { kind: 'partial-composite', reason: '合成例外' };
  assert.match(validateUiLayoutPlan(plan).join('\n'), /完整同级组合|不能由父级完整排布/);
});

test('RectTransform 不能冒充直接追踪兄弟节点的位置', () => {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  const label = plan.nodes.find((node) => node.id === 'purchase-label');
  label.layoutBinding.uiLayout.positionDriver = 'RECT_TRANSFORM';
  assert.match(validateUiLayoutPlan(plan).join('\n'), /只能原生参照直接父级/);
});

test('原生父布局允许组内后向引用相邻节点', () => {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  const icon = plan.nodes.find((node) => node.id === 'purchase-icon');
  const label = plan.nodes.find((node) => node.id === 'purchase-label');
  label.layoutBinding.centerAlignment = icon.layoutBinding.centerAlignment;
  label.layoutBinding.axisAlignment = { horizontal: 'center', vertical: 'center' };
  delete label.layoutBinding.positionReferenceId;
  delete icon.layoutBinding.centerAlignment;
  icon.layoutBinding.positionReferenceId = label.id;
  assert.deepEqual(validateUiLayoutPlan(plan), []);
});

test('普通弹窗相对宿主停靠，独立位置只用于声明范围与恢复的实际功能', () => {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-floating-layout-plan.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateUiLayoutPlan(plan), []);
  const layout = plan.nodes[0].layoutBinding.uiLayout;
  layout.positioning = 'absolute'; layout.independentPosition = { x: 300, y: 200 };
  assert.match(validateUiLayoutPlan(plan).join('\n'), /独立浮层位置必须有受控功能行为/);
  layout.positionDriver = 'SCRIPT';
  layout.positionBehavior = { kind: 'drag', property: 'position', reason: '玩家可拖拽弹窗', trigger: '拖动标题栏', coordinateSpace: 'CANVAS_LOCAL',
    range: { min: { x: -40, y: -30 }, max: { x: 40, y: 30 } }, restore: { driver: 'RECT_TRANSFORM', trigger: '关闭时恢复宿主居中' } };
  assert.deepEqual(validateUiLayoutPlan(plan), []);
});

test('拖拽行为必须声明范围与原生恢复，且活动时不能和父布局争写', () => {
  const plan = createPlan();
  const node = plan.nodes[0];
  node.layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  node.layoutBinding.uiLayout.positionBehavior = { kind: 'drag', property: 'position', reason: '玩家拖动', trigger: '按下并拖动', coordinateSpace: 'CANVAS_LOCAL',
    range: { min: { x: -40, y: -30 }, max: { x: 40, y: 30 } }, restore: { driver: 'RECT_TRANSFORM', trigger: '松开时交回原生停靠' } };
  const derived = deriveUiLayoutPlan(plan);
  const report = createReport(derived);
  const snapshot = report.measurements[0].componentSnapshot;
  snapshot.positionWriters = ['SCRIPT'];
  snapshot.externalWriters = [{ driver: 'SCRIPT', ownerType: 'DragController', ownerPath: 'Canvas/SafeArea/Panel', elementName: '', active: true, position: true, width: false, height: false }];
  assert.deepEqual(validateUiLayoutRuntime(derived, report), []);
  snapshot.rectTransform.anchoredPosition.x = 41;
  assert.match(validateUiLayoutRuntime(derived, report).join('\n'), /功能位置超出声明范围/);
  snapshot.rectTransform.anchoredPosition.x = 0;
  snapshot.rectTransform.anchorMin.x = 0;
  assert.match(validateUiLayoutRuntime(derived, report).join('\n'), /实际 RectTransform.anchorMin.*不一致/);
  snapshot.rectTransform.anchorMin.x = 0.5;
  snapshot.positionWriters.push('LAYOUT_GROUP');
  assert.match(validateUiLayoutRuntime(derived, report).join('\n'), /必须恰有一个实际写入者/);
  delete node.layoutBinding.uiLayout.positionBehavior.restore;
  assert.match(validateUiLayoutPlan(plan).join('\n'), /restore/);
});

test('恢复驱动必须满足当前节点的实际参照、父布局和属性归属', () => {
  const grouped = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  const label = grouped.nodes.find((node) => node.id === 'purchase-label');
  label.layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  label.layoutBinding.uiLayout.positionBehavior = { kind: 'drag', property: 'position', reason: '拖动标签', trigger: '按下时', coordinateSpace: 'CANVAS_LOCAL',
    range: { min: { x: -40, y: -30 }, max: { x: 40, y: 30 } }, restore: { driver: 'RECT_TRANSFORM', trigger: '松开时' } };
  assert.match(validateUiLayoutPlan(grouped).join('\n'), /恢复驱动 RECT_TRANSFORM 只能原生参照直接父级/);
  assert.match(validateUiLayoutRuntime(grouped, {}).join('\n'), /恢复驱动 RECT_TRANSFORM 只能原生参照直接父级/);
  label.layoutBinding.uiLayout.positionBehavior.restore.driver = 'LAYOUT_GROUP';
  assert.deepEqual(validateUiLayoutPlan(grouped), []);

  const source = createPlan();
  const layout = source.nodes[0].layoutBinding.uiLayout;
  layout.positionDriver = 'SCRIPT';
  layout.positionBehavior = { kind: 'drag', property: 'position', reason: '拖动面板', trigger: '按下时', coordinateSpace: 'CANVAS_LOCAL',
    range: { min: { x: -40, y: -30 }, max: { x: 40, y: 30 } }, restore: { driver: 'LAYOUT_GROUP', trigger: '松开时' } };
  assert.match(validateUiLayoutPlan(source).join('\n'), /恢复驱动 LAYOUT_GROUP 必须由实际父级承担布局归属/);
  layout.layoutOwner = 'PARENT';
  const plan = deriveUiLayoutPlan(source);
  const report = createReport(plan);
  const snapshot = report.measurements[0].componentSnapshot;
  snapshot.positionWriters = ['SCRIPT'];
  snapshot.externalWriters = [{ driver: 'SCRIPT', ownerType: 'DragController', ownerPath: 'Canvas/SafeArea/Panel', elementName: '', active: true, position: true, width: false, height: false }];
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /原生恢复驱动缺少实际父 LayoutGroup/);
  snapshot.parentLayoutGroup = { type: 'HorizontalLayoutGroup', enabled: false, childControlWidth: false, childControlHeight: false };
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
});

test('普通非居中 HUD 以声明边缘保持间距，父容器排布可以调整子项', () => {
  const source = createPlan();
  const node = source.nodes[0];
  node.layoutBinding.axisAlignment = { horizontal: 'right', vertical: 'top' };
  node.layoutBinding.anchor = { min: { x: 1, y: 1 }, max: { x: 1, y: 1 } };
  const plan = deriveUiLayoutPlan(source);
  const report = createReport(plan);
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  report.measurements[0].actualRect.x -= 5;
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /相对锚点间距/);
  node.layoutBinding.uiLayout.positionDriver = 'LAYOUT_GROUP';
  node.layoutBinding.uiLayout.layoutOwner = 'PARENT';
  const groupPlan = deriveUiLayoutPlan(source);
  const groupReport = createReport(groupPlan);
  groupReport.measurements[0].componentSnapshot.positionWriters = ['LAYOUT_GROUP'];
  groupReport.measurements[0].componentSnapshot.parentLayoutGroup = { type: 'HorizontalLayoutGroup', enabled: true, childControlWidth: false, childControlHeight: false };
  groupReport.measurements[0].actualRect.x -= 5;
  assert.deepEqual(validateUiLayoutRuntime(groupPlan, groupReport), []);
});

test('不可拆分的局部组合可以使用有结构证据的共享布局，普通父级参照不能冒充', () => {
  const plan = JSON.parse(readFileSync(new URL('../templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  const extra = structuredClone(plan.nodes[1]);
  extra.id = 'badge'; extra.decompositionElementId = 'badge-item';
  extra.bounds = { x: 304, y: 240, width: 16, height: 16 };
  delete extra.layoutBinding.centerAlignment;
  extra.layoutBinding.axisAlignment = { horizontal: 'left', vertical: 'top' };
  extra.layoutBinding.anchor = { min: { x: 0, y: 1 }, max: { x: 0, y: 1 } };
  extra.layoutBinding.uiLayout.positionDriver = 'RECT_TRANSFORM';
  extra.layoutBinding.uiLayout.layoutOwner = 'SELF';
  plan.nodes.push(extra);
  const icon = plan.nodes.find((node) => node.id === 'purchase-icon');
  icon.layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  icon.layoutBinding.uiLayout.nativeFallback = { kind: 'partial-composite', reason: '父级包含不参与此组合的独立徽章' };
  const label = plan.nodes.find((node) => node.id === 'purchase-label');
  label.layoutBinding.uiLayout.positionDriver = 'SCRIPT';
  label.layoutBinding.uiLayout.layoutOwner = 'SELF';
  label.layoutBinding.uiLayout.nativeFallback = { kind: 'non-parent-reference', reason: '价格跟随同组图标，父级还包含独立徽章' };
  assert.deepEqual(validateUiLayoutPlan(plan), []);
  icon.layoutBinding.uiLayout.nativeFallback.kind = 'non-parent-reference';
  assert.match(validateUiLayoutPlan(plan).join('\n'), /参照是直接父级/);
});

test('UI Toolkit 相对流使用原生布局；临时动画按当前状态交接并核对范围', () => {
  const source = createPlan();
  source.uiSystem = 'UI_TOOLKIT'; source.coordinateSpace = 'UI_TOOLKIT_LOGICAL_POINTS';
  const node = source.nodes[0];
  node.layoutBinding.coordinateSpace = 'UI_TOOLKIT_PANEL';
  node.layoutBinding.uiLayout.positionDriver = 'UITOOLKIT_LAYOUT';
  node.layoutBinding.uiLayout.sizeDrivers = { width: 'UITOOLKIT_LAYOUT', height: 'UITOOLKIT_LAYOUT' };
  let plan = deriveUiLayoutPlan(source);
  let report = createReport(plan);
  let row = report.measurements[0];
  row.elementName = 'Panel'; row.componentSnapshot.rectTransform = null;
  row.componentSnapshot.uiToolkit = { position: 'Relative' };
  row.componentSnapshot.positionWriters = ['UITOOLKIT_LAYOUT'];
  row.componentSnapshot.widthWriters = ['UITOOLKIT_LAYOUT']; row.componentSnapshot.heightWriters = ['UITOOLKIT_LAYOUT'];
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  node.layoutBinding.uiLayout.positionDriver = 'ANIMATION';
  node.layoutBinding.uiLayout.positionBehavior = { kind: 'transition', property: 'position', reason: '显示面板的入场过渡', trigger: '打开时', coordinateSpace: 'UI_TOOLKIT_PANEL',
    range: { min: { x: 300, y: 200 }, max: { x: 500, y: 400 } }, restore: { driver: 'UITOOLKIT_LAYOUT', trigger: '过渡结束' } };
  plan = deriveUiLayoutPlan(source); report = createReport(plan); row = report.measurements[0];
  row.elementName = 'Panel'; row.actualRect.x += 5; row.componentSnapshot.rectTransform = null; row.componentSnapshot.uiToolkit = { position: 'Absolute' };
  row.componentSnapshot.positionWriters = ['ANIMATION']; row.componentSnapshot.widthWriters = ['UITOOLKIT_LAYOUT']; row.componentSnapshot.heightWriters = ['UITOOLKIT_LAYOUT'];
  row.componentSnapshot.externalWriters = [{ driver: 'ANIMATION', ownerType: 'Animator', ownerPath: 'Canvas', elementName: 'Panel', active: true, position: true, width: false, height: false }];
  assert.deepEqual(validateUiLayoutRuntime(plan, report), []);
  row.componentSnapshot.externalWriters[0].elementName = 'OtherPanel';
  assert.match(validateUiLayoutRuntime(plan, report).join('\n'), /未绑定当前实际元素/);
  node.layoutBinding.uiLayout.positionBehavior.restore.driver = 'RECT_TRANSFORM';
  assert.match(validateUiLayoutPlan(source).join('\n'), /当前 UI 系统的原生恢复驱动/);
});

test('行为与回退字段被正式布局 schema 和实际入口同时接受，计划驱动不能省略', () => {
  const schema = JSON.parse(readFileSync(new URL('../schemas/ui-layout-plan.schema.json', import.meta.url), 'utf8'));
  const common = JSON.parse(readFileSync(new URL('../schemas/common.schema.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ strict: false }); addFormats(ajv); ajv.addSchema(common);
  const validate = ajv.compile(schema);
  const plan = createPlan();
  const layout = plan.nodes[0].layoutBinding.uiLayout;
  layout.positionDriver = 'ANIMATION';
  layout.positionBehavior = { kind: 'transition', property: 'position', reason: '进场过渡', trigger: '打开时', coordinateSpace: 'CANVAS_LOCAL',
    range: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } }, restore: { driver: 'RECT_TRANSFORM', trigger: '过渡结束' } };
  assert.equal(validate(plan), true, JSON.stringify(validate.errors));
  assert.deepEqual(validateUiLayoutPlan(plan), []);
  delete layout.positionDriver;
  assert.equal(validate(plan), false);
  assert.match(validateUiLayoutPlan(plan).join('\n'), /positionDriver/);
});
