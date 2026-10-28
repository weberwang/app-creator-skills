/** 核对 Unity 原生计划、浮层定位例外和真实证据入口使用同一相对关系合同。 */
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import Ajv2020 from '../skills/app-skill-runtime/ajv2020.mjs';
import { adaptUnityRelativeLayout } from '../scripts/migration/unity-relative-layout-adapter.mjs';
import { seedUiHierarchyFixture } from '../migration/source-tests/unity/tests/node/helpers/ui-hierarchy-fixture.mjs';
import { makeUiLayoutMeasurementFixture } from '../migration/source-tests/unity/tests/node/helpers/ui-layout-fixture.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPTS = 'unity-development-workflow/scripts/';
const EVIDENCE_SOURCE = 'unity-game-workflow-control/scripts/runtime/ui-layout-evidence.mjs';

/** 在当前实际来源或已迁移产物上生成临时目标，避免单元测试依赖相邻源仓库。 */
function transformed(path, sourcePath, marker) {
  const text = readFileSync(resolve(ROOT, 'skills', path), 'utf8');
  if (text.includes(marker)) return text;
  return adaptUnityRelativeLayout(text, { stack: 'unity', sourcePath }).text;
}

/** 将经过适配的真实 Unity 模块放入独占临时目录，保留原始导入布局。 */
async function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'unity-relative-layout-'));
  const scope = relative(resolve(tmpdir()), resolve(temp));
  if (!scope || scope === '..' || scope.startsWith(`..${sep}`)) throw new Error('测试目录必须位于临时目录');
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const skills = join(temp, 'skills');
  /** 在隔离目录写入一份真实模块或其迁移结果。 */
  function put(path, content) {
    const target = join(skills, ...path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  }
  const scripted = [
    ['layout-plan-validation.mjs', 'relative-layout-policy.cjs'],
    ['layout-plan-shape.mjs', '"floatingRootKind"'],
    ['layout-geometry.mjs', 'body.layoutBinding.uiLayout.positioning'],
    ['layout-runtime-validation.mjs', '绝对定位只豁免已验证的浮层本体'],
  ];
  for (const [file, marker] of scripted) {
    const path = `${SCRIPTS}${file}`;
    put(path, transformed(path, path, marker));
  }
  for (const file of ['layout-plan-derive.mjs', 'layout-runtime-contract.mjs', 'layout-hierarchy-files.mjs',
    'layout-hierarchy-contract.mjs', 'nine-slice-contract.mjs']) {
    const path = `${SCRIPTS}${file}`;
    put(path, readFileSync(resolve(ROOT, 'skills', path)));
  }
  for (const file of ['evidence-files.mjs', 'io.mjs']) {
    const path = `unity-domain-contracts/scripts/runtime/${file}`;
    put(path, readFileSync(resolve(ROOT, 'skills', path)));
  }
  const evidencePath = 'unity-domain-contracts/scripts/runtime/ui-layout-evidence.mjs';
  put(evidencePath, transformed(evidencePath, EVIDENCE_SOURCE, '浮层本体类型必须绑定当前 DISPLAY_LAYER'));
  const shared = 'app-ui-layout/scripts/relative-layout-policy.cjs';
  const sharedTarget = join(skills, ...shared.split('/'));
  mkdirSync(dirname(sharedTarget), { recursive: true });
  copyFileSync(resolve(ROOT, 'skills', shared), sharedTarget);
  const templatePath = 'unity-development-workflow/templates/ui-layout-plan.json';
  const templateText = readFileSync(resolve(ROOT, 'skills', templatePath), 'utf8');
  const template = JSON.parse(templateText);
  const plan = template.nodes.every((node) => node.layoutBinding.uiLayout.positioning === 'relative')
    ? template : JSON.parse(adaptUnityRelativeLayout(templateText, { stack: 'unity', sourcePath: templatePath }).text);
  const validator = await import(pathToFileURL(join(skills, SCRIPTS, 'layout-plan-validation.mjs')).href);
  const derive = await import(pathToFileURL(join(skills, SCRIPTS, 'layout-plan-derive.mjs')).href);
  const runtime = await import(pathToFileURL(join(skills, SCRIPTS, 'layout-runtime-contract.mjs')).href);
  const evidence = await import(pathToFileURL(join(skills, evidencePath)).href);
  return { temp, plan, ...validator, ...derive, ...runtime, ...evidence };
}

/** 在既有三个原生节点上声明唯一浮层本体，内部节点继续使用实际父级。 */
function popupPlan(plan, uiSystem = 'UGUI') {
  const result = structuredClone(plan);
  result.displayLayerId = 'purchase-popup';
  result.uiSystem = uiSystem;
  result.coordinateSpace = uiSystem === 'UGUI' ? 'SCREEN_SPACE_PIXELS' : 'UI_TOOLKIT_LOGICAL_POINTS';
  const grandchild = structuredClone(result.nodes[2]);
  grandchild.id = 'count-badge';
  grandchild.decompositionElementId = 'count-badge-item';
  grandchild.parentElementId = 'purchase-icon';
  grandchild.semanticGrouping.rationale = '角标属于购买图标并随其定位。';
  grandchild.bounds = { x: 324, y: 224, width: 10, height: 10 };
  grandchild.layoutBinding.parentElementId = 'purchase-icon';
  grandchild.layoutBinding.positionReferenceId = 'purchase-icon';
  result.nodes.push(grandchild);
  for (const node of result.nodes) {
    node.layoutBinding.coordinateSpace = uiSystem === 'UGUI' ? 'CANVAS_LOCAL' : 'UI_TOOLKIT_PANEL';
    if (uiSystem === 'UI_TOOLKIT') {
      node.layoutBinding.uiLayout.positionDriver = 'UITOOLKIT_STYLE';
      node.layoutBinding.uiLayout.sizeDrivers = { width: 'UITOOLKIT_LAYOUT', height: 'UITOOLKIT_LAYOUT' };
      if (node.renderKind === 'SPRITE') node.layoutBinding.uiLayout.imageSizing = { mode: 'EXPLICIT', reason: '使用 UI Toolkit 样式尺寸。' };
    }
  }
  result.nodes[0].layoutBinding.uiLayout.positioning = 'absolute';
  result.nodes[0].layoutBinding.uiLayout.floatingRootKind = 'popup';
  result.nodes[0].layoutBinding.uiLayout.independentPosition = { x: result.nodes[0].bounds.x, y: result.nodes[0].bounds.y };
  return result;
}

test('UGUI 与 UI Toolkit 保留相对节点，只有浮层本体允许独立落位', async (t) => {
  const context = await fixture(t);
  assert.deepEqual(context.validateUiLayoutPlan(context.plan), []);
  for (const uiSystem of ['UGUI', 'UI_TOOLKIT']) {
    const plan = popupPlan(context.plan, uiSystem);
    assert.deepEqual(context.validateUiLayoutPlan(plan), []);
    const derived = context.deriveUiLayoutPlan(plan);
    assert.equal(derived.nodes[0].targetBounds.x, plan.nodes[0].bounds.x);
    assert.equal(derived.nodes[0].targetBounds.y, plan.nodes[0].bounds.y);
    const moved = structuredClone(plan);
    moved.nodes[0].layoutBinding.uiLayout.independentPosition.x += 20;
    moved.nodes[0].layoutBinding.uiLayout.independentPosition.y += 10;
    const result = context.deriveUiLayoutPlan(moved);
    for (const [index, node] of result.nodes.entries()) {
      assert.equal(node.targetBounds.x - derived.nodes[index].targetBounds.x, 20);
      assert.equal(node.targetBounds.y - derived.nodes[index].targetBounds.y, 10);
    }
  }
});

test('普通节点、浮层内部、错误本体和未知定位值不能冒用例外', async (t) => {
  const context = await fixture(t);
  const ordinary = structuredClone(context.plan);
  ordinary.nodes[0].layoutBinding.uiLayout.positioning = 'absolute';
  ordinary.nodes[0].layoutBinding.uiLayout.independentPosition = { x: 300, y: 200 };
  assert.match(context.validateUiLayoutPlan(ordinary).join('\n'), /普通 UI 必须相对布局/);

  const noBody = popupPlan(context.plan);
  delete noBody.nodes[0].layoutBinding.uiLayout.floatingRootKind;
  assert.match(context.validateUiLayoutPlan(noBody).join('\n'), /唯一浮层本体/);
  const child = popupPlan(context.plan);
  child.nodes[1].layoutBinding.uiLayout.positioning = 'absolute';
  child.nodes[1].layoutBinding.uiLayout.independentPosition = { x: 320, y: 220 };
  assert.match(context.validateUiLayoutPlan(child).join('\n'), /浮层内部 UI 必须相对布局/);
  const viewport = popupPlan(context.plan);
  viewport.nodes[2].layoutBinding.positionReferenceId = 'viewport';
  assert.match(context.validateUiLayoutPlan(viewport).join('\n'), /浮层内部定位参照.*逃出本体/);
  const spoof = popupPlan(context.plan);
  spoof.nodes[1].layoutBinding.uiLayout.floatingRootKind = 'toast';
  spoof.nodes[1].layoutBinding.uiLayout.positioning = 'absolute';
  spoof.nodes[1].layoutBinding.uiLayout.independentPosition = { x: 320, y: 220 };
  assert.match(context.validateUiLayoutPlan(spoof).join('\n'), /内部后代，不能再次声明本体/);
  const unknown = popupPlan(context.plan);
  unknown.nodes[1].layoutBinding.uiLayout.positioning = 'screen-absolute';
  assert.match(context.validateUiLayoutPlan(unknown).join('\n'), /positioning.*允许范围/);
  const outside = popupPlan(context.plan);
  outside.nodes[0].layoutBinding.uiLayout.independentPosition.x = 900;
  assert.match(context.validateUiLayoutPlan(outside).join('\n'), /超出 viewport/);
  const missingPosition = popupPlan(context.plan);
  delete missingPosition.nodes[0].layoutBinding.uiLayout.independentPosition;
  assert.match(context.validateUiLayoutPlan(missingPosition).join('\n'), /必须声明 independentPosition/);
  const relativePosition = popupPlan(context.plan);
  relativePosition.nodes[1].layoutBinding.uiLayout.independentPosition = { x: 0, y: 0 };
  assert.match(context.validateUiLayoutPlan(relativePosition).join('\n'), /只有绝对浮层本体可以声明/);
  for (const value of [null, undefined, '', 'screen-absolute']) {
    const invalid = popupPlan(context.plan);
    invalid.nodes[1].layoutBinding.uiLayout.positioning = value;
    assert.match(context.validateUiLayoutPlan(invalid).join('\n'), /positioning/);
  }
  for (const value of [null, undefined, '', 'button']) {
    const invalid = popupPlan(context.plan);
    invalid.nodes[0].layoutBinding.uiLayout.floatingRootKind = value;
    assert.match(context.validateUiLayoutPlan(invalid).join('\n'), /floatingRootKind/);
  }
  for (const value of [Number.NaN, Infinity, -Infinity]) {
    const invalid = popupPlan(context.plan);
    invalid.nodes[0].layoutBinding.uiLayout.independentPosition.x = value;
    assert.match(context.validateUiLayoutPlan(invalid).join('\n'), /NaN|无穷/);
  }
});

test('独立浮层模板只在本体声明绝对目标，内部保留相对节点', async (t) => {
  const context = await fixture(t);
  const template = JSON.parse(readFileSync(resolve(ROOT, 'scripts/migration/templates/unity-floating-layout-plan.source'), 'utf8'));
  assert.deepEqual(context.validateUiLayoutPlan(template), []);
  assert.equal(template.nodes.filter((node) => node.layoutBinding.uiLayout.positioning === 'absolute').length, 1);
  assert.equal(template.nodes[0].layoutBinding.uiLayout.floatingRootKind, 'popup');
  assert.ok(template.nodes.slice(1).every((node) => node.layoutBinding.uiLayout.positioning === 'relative'));
});

test('共同 JSON Schema 接纳真实浮层身份并拒绝不受支持的本体类型', async (t) => {
  const context = await fixture(t);
  const path = 'unity-development-workflow/schemas/common.schema.json';
  const original = readFileSync(resolve(ROOT, 'skills', path), 'utf8');
  const common = JSON.parse(original);
  const schema = common.$defs.layoutBinding.properties.uiLayout.properties.floatingRootKind
    ? common : JSON.parse(adaptUnityRelativeLayout(original, { stack: 'unity', sourcePath: path }).text);
  const planSchema = JSON.parse(readFileSync(resolve(ROOT, 'skills/unity-development-workflow/schemas/ui-layout-plan.schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addSchema(schema);
  ajv.addSchema(planSchema);
  const validate = ajv.getSchema('https://codex.local/unity-workflow/schemas/ui-layout-plan.schema.json');
  const valid = popupPlan(context.plan);
  assert.equal(validate(valid), true, JSON.stringify(validate.errors));
  valid.nodes[0].layoutBinding.uiLayout.floatingRootKind = 'button';
  assert.equal(validate(valid), false);
  assert.match(context.validateUiLayoutPlan(valid).join('\n'), /floatingRootKind.*允许范围/);
});

test('运行证据允许浮层本体偏离宿主中心，仍独立核验孙节点的实际居中关系', async (t) => {
  const context = await fixture(t);
  for (const uiSystem of ['UGUI', 'UI_TOOLKIT']) {
    const input = popupPlan(context.plan, uiSystem);
    input.nodes[0].layoutBinding.uiLayout.independentPosition = { x: 310, y: 225 };
    // 测试结构容器的真实引用关系；不伪造 Sprite 或图片导入证据。
    for (const node of input.nodes) {
      node.renderKind = 'STRUCTURE';
      node.layoutBinding.uiLayout.positionDriver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_STYLE';
      const sizeDriver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_LAYOUT';
      node.layoutBinding.uiLayout.sizeDrivers = { width: sizeDriver, height: sizeDriver };
      delete node.layoutBinding.uiLayout.imageSizing;
      delete node.layoutBinding.centerAlignment;
      if (node !== input.nodes[0]) node.layoutBinding.axisAlignment = { horizontal: 'left', vertical: 'top' };
    }
    input.nodes[3].layoutBinding.axisAlignment.horizontal = 'center';
    const plan = context.deriveUiLayoutPlan(input);
    const report = makeUiLayoutMeasurementFixture(plan);
    const actual = new Map(plan.nodes.map((node) => [node.id, node.targetBounds]));
    const path = (id) => uiSystem === 'UGUI' ? `Canvas/${id}` : id;
    report.measurements = plan.nodes.map((node) => {
      const measurement = makeUiLayoutMeasurementFixture({ ...plan, nodes: [node] }).measurements[0];
      const parent = node.parentElementId;
      const reference = node.layoutBinding.positionReferenceId ?? parent;
      measurement.objectPath = uiSystem === 'UGUI' ? path(node.id) : '';
      measurement.elementName = uiSystem === 'UI_TOOLKIT' ? path(node.id) : '';
      measurement.parentPath = actual.has(parent) ? path(parent) : 'SafeArea';
      measurement.parentRect = structuredClone(actual.get(parent) ?? plan.roots[parent]);
      measurement.referencePath = actual.has(reference) ? path(reference) : reference;
      measurement.referenceRect = structuredClone(actual.get(reference) ?? plan.roots[reference]);
      return measurement;
    });
    assert.deepEqual(context.validateUiLayoutRuntime(plan, report), [], uiSystem);

    // 本体运行时移动不必重写冻结目标；子孙的实测参照和矩形仍要一起随动。
    const moved = structuredClone(report);
    for (const row of moved.measurements) {
      row.actualRect.x += 7;
      row.actualRect.y += 3;
      row.targetRect = null;
      row.delta = null;
      row.tolerance = null;
    }
    const movedRects = new Map(moved.measurements.map((row) => [row.id, row.actualRect]));
    for (const row of moved.measurements) {
      const node = plan.nodes.find((item) => item.id === row.id);
      const parent = node.parentElementId;
      const reference = node.layoutBinding.positionReferenceId ?? parent;
      row.parentRect = structuredClone(movedRects.get(parent) ?? plan.roots[parent]);
      row.referenceRect = structuredClone(movedRects.get(reference) ?? plan.roots[reference]);
    }
    assert.deepEqual(context.validateUiLayoutRuntime(plan, moved), [], uiSystem);
    const leftBehind = structuredClone(moved);
    leftBehind.measurements.find((item) => item.id === 'count-badge').actualRect.x -= 7;
    assert.match(context.validateUiLayoutRuntime(plan, leftBehind).join('\n'), /count-badge.*中心未按声明策略对齐/);

    const invalid = structuredClone(report);
    const grandchild = invalid.measurements.find((item) => item.id === 'count-badge');
    grandchild.actualRect.x += 3;
    grandchild.targetRect = null;
    grandchild.delta = null;
    grandchild.tolerance = null;
    assert.match(context.validateUiLayoutRuntime(plan, invalid).join('\n'), /count-badge.*中心未按声明策略对齐/);
  }
});

test('浮层多级后代的边缘间距随移动及参照缩放复核', async (t) => {
  const context = await fixture(t);
  for (const uiSystem of ['UGUI', 'UI_TOOLKIT']) {
    for (const alignment of [{ horizontal: 'left', vertical: 'top' }, { horizontal: 'right', vertical: 'bottom' }]) {
      const input = popupPlan(context.plan, uiSystem);
      input.nodes[3].bounds = { x: 332, y: 232, width: 10, height: 10 };
      for (const node of input.nodes) {
        node.renderKind = 'STRUCTURE';
        node.layoutBinding.uiLayout.positionDriver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_STYLE';
        const sizeDriver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_LAYOUT';
        node.layoutBinding.uiLayout.sizeDrivers = { width: sizeDriver, height: sizeDriver };
        delete node.layoutBinding.uiLayout.imageSizing;
        delete node.layoutBinding.centerAlignment;
        if (node !== input.nodes[0]) node.layoutBinding.axisAlignment = node.id === 'count-badge'
          ? { ...alignment } : { horizontal: 'left', vertical: 'top' };
      }
      const plan = context.deriveUiLayoutPlan(input);
      const report = makeUiLayoutMeasurementFixture(plan);
      report.measurements = plan.nodes.map((node) => makeUiLayoutMeasurementFixture({ ...plan, nodes: [node] }).measurements[0]);
      const paths = (id) => uiSystem === 'UGUI' ? `Canvas/${id}` : id;
      // 位置参照和父框必须关联本批实测，而不是仅更新用于显示的目标值。
      const updateReferences = (current) => {
        const rects = new Map(current.measurements.map((row) => [row.id, row.actualRect]));
        for (const row of current.measurements) {
          const node = plan.nodes.find((item) => item.id === row.id);
          const parent = node.parentElementId;
          const reference = node.layoutBinding.positionReferenceId ?? parent;
          row.objectPath = uiSystem === 'UGUI' ? paths(node.id) : '';
          row.elementName = uiSystem === 'UI_TOOLKIT' ? paths(node.id) : '';
          row.parentPath = rects.has(parent) ? paths(parent) : 'SafeArea';
          row.parentRect = structuredClone(rects.get(parent) ?? plan.roots[parent]);
          row.referencePath = rects.has(reference) ? paths(reference) : reference;
          row.referenceRect = structuredClone(rects.get(reference) ?? plan.roots[reference]);
        }
      };
      updateReferences(report);
      assert.deepEqual(context.validateUiLayoutRuntime(plan, report), [], `${uiSystem} ${JSON.stringify(alignment)}`);
      const moved = structuredClone(report);
      for (const row of moved.measurements) {
        row.actualRect.x += 7;
        row.actualRect.y += 3;
        row.targetRect = row.delta = row.tolerance = null;
      }
      updateReferences(moved);
      assert.deepEqual(context.validateUiLayoutRuntime(plan, moved), []);
      const stale = structuredClone(moved);
      stale.measurements.find((row) => row.id === 'count-badge').actualRect.x -= 7;
      assert.match(context.validateUiLayoutRuntime(plan, stale).join('\n'), /count-badge.*相对锚点间距/);
      const staleVertical = structuredClone(moved);
      staleVertical.measurements.find((row) => row.id === 'count-badge').actualRect.y -= 3;
      assert.match(context.validateUiLayoutRuntime(plan, staleVertical).join('\n'), /count-badge.*相对锚点间距/);

      // 参照尺寸增长时，右下锚点跟随新边缘，左上锚点保持原间距。
      const resized = structuredClone(moved);
      const icon = resized.measurements.find((row) => row.id === 'purchase-icon');
      icon.actualRect.width += 4;
      icon.actualRect.height += 4;
      if (uiSystem === 'UGUI') {
        icon.componentSnapshot.rectTransform.localSize.width += 4;
        icon.componentSnapshot.rectTransform.localSize.height += 4;
      }
      const badge = resized.measurements.find((row) => row.id === 'count-badge');
      if (alignment.horizontal === 'right') badge.actualRect.x += 4;
      if (alignment.vertical === 'bottom') badge.actualRect.y += 4;
      updateReferences(resized);
      assert.deepEqual(context.validateUiLayoutRuntime(plan, resized), []);
      const badResize = structuredClone(resized);
      badResize.measurements.find((row) => row.id === 'count-badge').actualRect.x -= 1;
      assert.match(context.validateUiLayoutRuntime(plan, badResize).join('\n'), /count-badge.*相对锚点间距/);
    }
  }
});

test('实际 Implementation Package 读取入口验证浮层类型、来源与内部参照', async (t) => {
  const context = await fixture(t);
  const project = join(context.temp, 'project');
  mkdirSync(project);
  const derived = context.deriveUiLayoutPlan(popupPlan(context.plan));
  seedUiHierarchyFixture(project, derived);
  const planPath = 'Artifacts/UI/plan.json';
  mkdirSync(dirname(join(project, planPath)), { recursive: true });
  const writePlan = (plan) => writeFileSync(join(project, planPath), JSON.stringify(plan));
  writePlan(derived);
  const pkg = { uiLayoutPlanRef: { path: planPath } };
  const work = { workItemType: 'DISPLAY_LAYER', displayLayer: { hostSceneId: derived.sceneId,
    displayLayerId: derived.displayLayerId, type: 'popup', stage: 'V2' }, responsiveContract: { uiSystem: 'UGUI' } };
  assert.deepEqual(context.validateUiLayoutPackage(pkg, work, project), []);
  const wrongType = structuredClone(work);
  wrongType.displayLayer.type = 'toast';
  assert.match(context.validateUiLayoutPackage(pkg, wrongType, project).join('\n'), /真实类型/);

  // 拆解、Prefab 的完整 uiLayout 是同一事实，不能在确认后只篡改本体类型。
  const changedStructure = JSON.parse(readFileSync(join(project, derived.prefabStructureRef.path), 'utf8'));
  changedStructure.prefabs[0].nodes[0].layoutBinding.uiLayout.floatingRootKind = 'toast';
  writeFileSync(join(project, derived.prefabStructureRef.path), JSON.stringify(changedStructure));
  assert.match(context.validateUiLayoutPackage(pkg, work, project).join('\n'), /布局合同.*不一致/);
  seedUiHierarchyFixture(project, derived);
  const escaped = structuredClone(derived);
  escaped.nodes[2].layoutBinding.positionReferenceId = 'viewport';
  writePlan(escaped);
  assert.match(context.validateUiLayoutPackage(pkg, work, project).join('\n'), /浮层内部定位参照.*逃出本体/);
});
