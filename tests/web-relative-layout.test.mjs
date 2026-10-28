/** 通过三栈真实校验入口验证相对布局与浮层本体豁免，使用隔离副本而不修改迁移产物。 */
import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { adaptWebRelativeLayout } from '../scripts/migration/web-relative-layout-adapter.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIXES = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const TEMP_ROOT = realpathSync(tmpdir());
let sandbox;

/** 只清理系统临时目录下刚创建的真实子目录，不能递归删除其他路径或链接。 */
after(() => {
  if (!sandbox) return;
  const name = relative(TEMP_ROOT, sandbox);
  assert.ok(name.startsWith('.web-relative-test-') && !name.includes('..') && !name.includes('/') && !name.includes('\\'));
  assert.ok(lstatSync(sandbox).isDirectory() && !lstatSync(sandbox).isSymbolicLink());
  assert.equal(realpathSync(sandbox), sandbox);
  rmSync(sandbox, { recursive: true, force: true });
});

/** 将目标文件在隔离副本中按源身份适配；重新生成后的工作区无需再次适配。 */
function adaptCopy(stack, sourcePath) {
  const target = join(sandbox, ...sourcePath.split('/'));
  const text = readFileSync(target, 'utf8');
  if (sourcePath.endsWith('.yaml')) {
    const document = JSON.parse(text);
    if (!document.regions || document.regions.every((region) => Object.hasOwn(region, 'parent_id'))) return;
  } else if (text.includes('function validateRelativeWebNodes(') || text.includes('const FIELDS = new Set(["positioning", "floating_root_kind",')
    || text.includes('node?.uiLayout)?.floating_root_kind')) return;
  const result = adaptWebRelativeLayout(text, { stack, sourcePath, destination: sourcePath });
  if (result.transforms.length) writeFileSync(target, result.text);
}

/** 复制安装所需闭包后仅在测试目录执行适配与导入，不启动引擎或服务。 */
function fixture() {
  if (sandbox) return sandbox;
  sandbox = mkdtempSync(join(TEMP_ROOT, '.web-relative-test-'));
  cpSync(join(ROOT, 'skills'), join(sandbox, 'skills'), { recursive: true });
  // 测试副本复用仓库依赖加载器，原生模块和公共策略仍在隔离副本中执行。
  writeFileSync(join(sandbox, 'skills/app-skill-runtime/dependencies.cjs'), `module.exports = require(${JSON.stringify(join(ROOT, 'skills/app-skill-runtime/dependencies.cjs'))});\n`);
  assert.ok(existsSync(join(sandbox, 'skills/app-ui-layout/scripts/relative-layout-policy.cjs')));
  for (const [stack, prefix] of Object.entries(PREFIXES)) {
    const layout = `skills/${prefix}-game-ui-layout`;
    const assets = `skills/${prefix}-game-asset-integration`;
    const files = [
      `${layout}/scripts/validate_ui_layout_contract.mjs`,
      `${layout}/assets/ui-layout-contract-template.yaml`,
      `${assets}/scripts/ui-layout-organization.mjs`,
      `${assets}/scripts/decomposition-elements.mjs`,
    ];
    if (stack === 'cocos') files.push(`${layout}/assets/ordinary-ui-layout-contract-template.yaml`, `${layout}/scripts/widget-runtime.mjs`);
    if (stack === 'phaser') files.push(`${layout}/scripts/layout-runtime.mjs`, `${layout}/scripts/layout-runtime-evidence.mjs`);
    if (stack === 'threejs') files.push(`${layout}/scripts/layout-runtime.mjs`);
    for (const file of files) adaptCopy(stack, file);
  }
  return sandbox;
}

/** 从实际原生合同入口与经过适配的普通模板创建独占用例。 */
async function ordinary(stack) {
  const root = fixture();
  const folder = join(root, 'skills', `${PREFIXES[stack]}-game-ui-layout`);
  const name = stack === 'cocos' ? 'ordinary-ui-layout-contract-template.yaml' : 'ui-layout-contract-template.yaml';
  const template = JSON.parse(readFileSync(join(folder, 'assets', name), 'utf8'));
  const { validateContract } = await import(pathToFileURL(join(folder, 'scripts/validate_ui_layout_contract.mjs')).href);
  return { template, validateContract, folder };
}

/** 通过真实合同入口检查特定诊断，不能只测试公共算法自身。 */
function mustFail(validate, document, phrase) {
  const result = validate(document);
  assert.equal(result.status, 'failed', JSON.stringify(result));
  assert.ok(result.errors.some((error) => error.includes(phrase)), JSON.stringify(result.errors));
}

test('三栈普通模板拒绝绝对定位、缺失真实父级、伪造浮层及未知定位方式', async () => {
  for (const stack of Object.keys(PREFIXES)) {
    const { template, validateContract } = await ordinary(stack);
    assert.equal(validateContract(template).status, 'passed', stack);
    const mutate = (callback) => { const document = structuredClone(template); callback(document); return document; };
    mustFail(validateContract, mutate((doc) => { doc.regions[2].positioning = 'absolute'; }), '普通 UI 必须相对布局');
    mustFail(validateContract, mutate((doc) => { doc.regions[2].positioning = 'screen-absolute'; }), 'positioning 只允许');
    mustFail(validateContract, mutate((doc) => { delete doc.regions[2].parent_id; }), 'parentId');
    mustFail(validateContract, mutate((doc) => { const node = doc.regions.find((item) => item.id === 'primary-action'); node.positioning = 'absolute'; }), '普通 UI 必须相对布局');
    mustFail(validateContract, mutate((doc) => { const node = doc.regions.find((item) => item.id === 'primary-action'); node.positioning = 'absolute'; node.floating_root_kind = 'popup'; node.is_container = true; }), 'semantic_role');
    mustFail(validateContract, mutate((doc) => { const node = doc.regions.find((item) => item.id === 'primary-action'); node.positioning = 'absolute'; node.floating_root_kind = 'popup'; node.semantic_role = 'popup'; }), '实际容器');
    mustFail(validateContract, mutate((doc) => { doc.regions[2].floating_root_kind = null; }), 'floating_root_kind');
  }
});

test('三栈只豁免弹窗本体，子孙必须相对且参照不能逃出本体', async () => {
  for (const stack of Object.keys(PREFIXES)) {
    const { template, validateContract } = await ordinary(stack);
    const document = structuredClone(template);
    const body = document.regions.find((item) => item.id === 'primary-action');
    Object.assign(body, { positioning: 'absolute', floating_root_kind: 'popup', semantic_role: 'popup', is_container: true });
    const child = document.regions.find((item) => item.id === 'scroll-content');
    Object.assign(child, { parent_id: body.id, reference_id: body.id, positioning: 'relative' });
    assert.equal(validateContract(document).status, 'passed', `${stack}: ${JSON.stringify(validateContract(document))}`);
    for (const kind of ['popup', 'floating', 'toast']) {
      const independent = structuredClone(document);
      const target = independent.regions.find((item) => item.id === body.id);
      Object.assign(target, { floating_root_kind: kind, semantic_role: kind });
      delete target.reference_id;
      delete target.anchors;
      assert.equal(validateContract(independent).status, 'passed', `${stack}/${kind}: ${JSON.stringify(validateContract(independent))}`);
    }
    const absoluteChild = structuredClone(document);
    absoluteChild.regions.find((item) => item.id === child.id).positioning = 'absolute';
    mustFail(validateContract, absoluteChild, '豁免不向后代传递');
    const escaped = structuredClone(document);
    escaped.regions.find((item) => item.id === child.id).reference_id = 'viewport';
    mustFail(validateContract, escaped, '逃出本体');
    const forgedChild = structuredClone(document);
    Object.assign(forgedChild.regions.find((item) => item.id === child.id), { positioning: 'absolute', floating_root_kind: 'toast', semantic_role: 'toast', is_container: true });
    mustFail(validateContract, forgedChild, '不能再次声明本体');
  }
});

test('Phaser/Three 效果图节点的公共身份投影包含浮层声明，内部绝对定位和外部参照均失败', async () => {
  for (const stack of ['phaser', 'threejs']) {
    const { template, validateContract } = await ordinary(stack);
    const document = structuredClone(template);
    document.fidelity = { applicability: 'frozen-target', status: 'specified' };
    document.effect_image_reconstruction = { applicability: 'effect-image' };
    document.scene_reconstruction_binding = { target_viewport: { width: 390, height: 844 } };
    const body = structuredClone(document.layout_node_example);
    Object.assign(body, { layout_node_id: 'body', parent_layout_node_id: 'viewport', reference_id: 'viewport', element_type: 'container', is_container: true });
    Object.assign(body.ui_layout, { positioning: 'absolute', floating_root_kind: 'popup' });
    const child = structuredClone(document.layout_node_example);
    Object.assign(child, { layout_node_id: 'child', parent_layout_node_id: 'body', reference_id: 'body', element_type: 'component', is_container: false });
    child.ui_layout.positioning = 'relative';
    document.layout_nodes = [body, child];
    let result = validateContract(document);
    assert.ok(!result.errors.some((error) => /普通 UI 必须相对布局|豁免不向后代传递|逃出本体/.test(error)), JSON.stringify(result.errors));
    child.ui_layout.positioning = 'absolute';
    result = validateContract(document);
    assert.ok(result.errors.some((error) => error.includes('豁免不向后代传递')), JSON.stringify(result.errors));
    child.ui_layout.positioning = 'relative';
    child.reference_id = 'viewport';
    result = validateContract(document);
    assert.ok(result.errors.some((error) => error.includes('逃出本体')), JSON.stringify(result.errors));
    child.reference_id = 'body';
    child.ui_layout.positioning = null;
    result = validateContract(document);
    assert.ok(result.errors.some((error) => error.includes('positioning 只允许')), JSON.stringify(result.errors));
    child.ui_layout.positioning = 'relative';
    child.ui_layout.floating_root_kind = null;
    result = validateContract(document);
    assert.ok(result.errors.some((error) => error.includes('floating_root_kind 必须')), JSON.stringify(result.errors));
    const geometry = await import(pathToFileURL(join(fixture(), 'skills', `${stack}-domain-contracts/scripts/layout-node-parent-geometry.mjs`)).href);
    assert.equal(geometry.layoutNodeIdentityProjection(body).ui_layout.floating_root_kind, 'popup');
    assert.equal(geometry.layoutNodeIdentityProjection(body).ui_layout.positioning, 'absolute');
  }
});

test('Cocos V2 从真实场景引用解析布局节点后执行相对定位校验', async () => {
  const { folder, validateContract } = await ordinary('cocos');
  const assets = join(fixture(), 'skills/cocos-game-asset-integration/scripts');
  const { deriveAutomaticLayoutFacts } = await import(pathToFileURL(join(assets, 'layout_annotation_contract.mjs')).href);
  const { buildLayoutNodesDocument } = await import(pathToFileURL(join(assets, 'layout_review_bundle.mjs')).href);
  const viewport = { width: 390, height: 844 };
  const sha = `sha256:${'a'.repeat(64)}`;
  const nodes = [{ layout_node_id: 'button-base', element_id: 'button-base', parent_layout_node_id: 'viewport', element_type: 'image', layout_role: 'leaf', role: 'icon', owner_type: 'fixed-production-visual', render_kind: 'sprite', sprite_geometry: { type: 'SIMPLE', size_mode: 'RAW', content_size: null }, ui_layout: { grouping_basis: ['POSITION'], layout_owner: 'SELF', size_policy: 'FIXED', overflow_policy: 'KEEP_VISIBLE', safe_area_policy: 'INSIDE_SAFE_AREA', interaction_policy: 'NONE' }, axis_alignment: { horizontal: 'center', vertical: 'center' }, target_bounds: { x: 135, y: 394, width: 120, height: 56 } }];
  const facts = deriveAutomaticLayoutFacts(nodes, viewport, { sceneId: 'main-menu', stateId: 'default' });
  const nodeDocument = buildLayoutNodesDocument(facts, { viewport, sceneId: 'main-menu', stateId: 'default', decompositionConfirmationId: 'decomposition-1', layoutDecisionId: 'layout-decision-1', targetSha256: sha });
  const contract = JSON.parse(readFileSync(join(folder, 'assets/ui-layout-contract-template.yaml'), 'utf8'));
  const policy = JSON.parse(readFileSync(join(folder, 'assets/project-ui-layout-policy-template.yaml'), 'utf8'));
  const nodePath = 'evidence/v2/layout-nodes.json';
  const scene = { contract_version: '1.0.0', effect_image_reconstruction: { applicability: 'effect-image' }, reference_target: { original_file: 'evidence/target.png', target_sha256: sha }, target_conditions: { scene_id: 'main-menu', state_id: 'default', viewport, target_sha256: sha, visual_baseline_version: '1.0.0', layout_decomposition_version: 'layout-decomposition-1' }, layout_decomposition: { layout_source: { nodes_file: nodePath }, layout_annotation: { layout_nodes_file: nodePath, decomposition_confirmation_id: 'decomposition-1', layout_decision_id: 'layout-decision-1' }, layout_annotation_confirmation: { layout_nodes_file: nodePath, decomposition_confirmation_id: 'decomposition-1' }, layout_binding: { target_sha256: sha, scene_id: 'main-menu', state_id: 'default', viewport, visual_baseline_version: '1.0.0', layout_contract_version: '1.0.0', layout_contract_sha256: sha, layout_decomposition_version: 'layout-decomposition-1' } } };
  const localization = JSON.parse(readFileSync(join(folder, 'assets/ordinary-ui-layout-contract-template.yaml'), 'utf8'));
  const sources = new Map([[contract.project_policy_file, policy], [contract.scene_contract_file, scene], [contract.localization_contract_file, localization], [nodePath, nodeDocument]]);
  const check = () => validateContract(contract, { stage: 'V2', layoutSourceDocuments: sources });
  assert.ok(!check().errors.some((error) => error.includes('普通 UI 必须相对布局')), JSON.stringify(check()));
  nodeDocument.layout_nodes[0].ui_layout.positioning = 'absolute';
  assert.ok(check().errors.some((error) => error.includes('普通 UI 必须相对布局')), JSON.stringify(check()));
});

test('Three.js 运行快照允许浮层本体独立移动，仍校验内部相对居中', async () => {
  fixture();
  const directory = join(sandbox, 'skills/threejs-game-ui-layout/scripts');
  const { deriveLayoutExecutionPlans } = await import(pathToFileURL(join(directory, 'layout-execution.mjs')).href);
  const { layoutRuntimeFixture } = await import(pathToFileURL(join(directory, 'layout-runtime-test-fixtures.mjs')).href);
  const { validateLayoutRuntimeSnapshots } = await import(pathToFileURL(join(directory, 'layout-runtime.mjs')).href);
  const layout = { grouping_basis: ['POSITION'], layout_owner: 'SELF', size_policy: 'FIXED', overflow_policy: 'KEEP_VISIBLE' };
  const nodes = deriveLayoutExecutionPlans([
    { layout_node_id: 'body', parent_layout_node_id: 'viewport', element_type: 'container', is_container: true, axis_alignment: { horizontal: 'center', vertical: 'center' }, target_bounds: { x: 70, y: 40, width: 100, height: 40 }, ui_layout: { ...layout, positioning: 'absolute', floating_root_kind: 'popup' } },
    { layout_node_id: 'child', parent_layout_node_id: 'body', element_type: 'container', axis_alignment: { horizontal: 'center', vertical: 'top' }, target_bounds: { x: 110, y: 50, width: 20, height: 10 }, ui_layout: { ...layout, positioning: 'relative' } },
    { layout_node_id: 'left-top', parent_layout_node_id: 'child', axis_alignment: { horizontal: 'left', vertical: 'top' }, target_bounds: { x: 112, y: 51, width: 2, height: 2 }, ui_layout: { ...layout, positioning: 'relative' } },
    { layout_node_id: 'right-bottom', parent_layout_node_id: 'child', axis_alignment: { horizontal: 'right', vertical: 'bottom' }, target_bounds: { x: 124, y: 56, width: 2, height: 2 }, ui_layout: { ...layout, positioning: 'relative' } },
  ]);
  const geometry = layoutRuntimeFixture(nodes, { viewport_bounds: { x: 0, y: 0, width: 300, height: 200 } });
  const check = () => validateLayoutRuntimeSnapshots(nodes, geometry);
  assert.deepEqual(check(), []);
  const body = geometry.component_snapshots.find((item) => item.layout_node_id === 'body').component_snapshot;
  const child = geometry.component_snapshots.find((item) => item.layout_node_id === 'child').component_snapshot;
  body.layout_bounds.x += 10;
  child.layout_bounds.x += 10;
  child.reference_bounds.x += 10;
  for (const id of ['left-top', 'right-bottom']) {
    const item = geometry.component_snapshots.find((entry) => entry.layout_node_id === id).component_snapshot;
    item.layout_bounds.x += 10;
    item.reference_bounds.x += 10;
  }
  assert.deepEqual(check(), []);
  for (const id of ['left-top', 'right-bottom']) {
    const item = geometry.component_snapshots.find((entry) => entry.layout_node_id === id).component_snapshot;
    item.layout_bounds.x -= 7;
    assert.ok(check().some((error) => error.includes('相对锚点间距')), `${id} 留在旧屏幕位置必须被拒绝`);
    item.layout_bounds.x += 7;
  }
  child.layout_bounds.x += 10;
  assert.ok(check().length > 0, '子节点偏离本体后必须报错');
});

test('Cocos 运行快照拒绝浮层内部非中心孙节点停留在旧位置', async () => {
  fixture();
  const directory = join(sandbox, 'skills/cocos-game-ui-layout/scripts');
  const { attachLayoutRuntimeSnapshots } = await import(pathToFileURL(join(directory, 'widget-runtime-test-fixtures.mjs')).href);
  const { validateLayoutRuntimeSnapshots } = await import(pathToFileURL(join(directory, 'widget-runtime.mjs')).href);
  const make = (id, parent, bounds, axis) => ({ layout_node_id: id, parent_layout_node_id: parent, target_bounds: bounds, axis_alignment: axis, layout_execution: { position_driver: 'STATIC', size_driver: 'FIXED', widget: null }, ui_layout: {} });
  const nodes = [
    { ...make('body', 'viewport', { x: 20, y: 20, width: 100, height: 80 }, { horizontal: 'left', vertical: 'top' }), element_type: 'container', is_container: true, ui_layout: { positioning: 'absolute', floating_root_kind: 'popup' } },
    { ...make('child', 'body', { x: 30, y: 30, width: 70, height: 50 }, { horizontal: 'left', vertical: 'top' }), element_type: 'container' },
    make('left-top', 'child', { x: 40, y: 40, width: 10, height: 10 }, { horizontal: 'left', vertical: 'top' }),
    make('right-bottom', 'child', { x: 70, y: 60, width: 10, height: 10 }, { horizontal: 'right', vertical: 'bottom' }),
  ];
  const rows = attachLayoutRuntimeSnapshots(nodes, nodes.map((node) => ({ layout_node_id: node.layout_node_id })));
  const check = () => validateLayoutRuntimeSnapshots(nodes, rows, []);
  assert.deepEqual(check(), []);
  for (const item of rows) { item.component_snapshot.layout_bounds.x += 7; item.component_snapshot.layout_bounds.y += 3; if (item.layout_node_id !== 'body') { item.component_snapshot.reference_bounds.x += 7; item.component_snapshot.reference_bounds.y += 3; } }
  assert.deepEqual(check(), []);
  for (const id of ['left-top', 'right-bottom']) {
    const item = rows.find((row) => row.layout_node_id === id).component_snapshot;
    item.layout_bounds.x -= 7;
    item.layout_bounds.y -= 3;
    assert.ok(check().some((error) => error.includes('相对锚点间距')), id);
    item.layout_bounds.x += 7;
    item.layout_bounds.y += 3;
  }
});

test('Phaser 运行采集拒绝浮层内部非中心孙节点停留在旧位置', async () => {
  fixture();
  const directory = join(sandbox, 'skills/phaser4-game-ui-layout/scripts');
  const { makeRuntimeTestSetup, makeRuntimeTestObject } = await import(pathToFileURL(join(directory, 'layout-runtime-fixtures.mjs')).href);
  const { collectPhaserLayoutSnapshot } = await import(pathToFileURL(join(directory, 'phaser-layout-capture.mjs')).href);
  const { validateLayoutRuntimeSnapshots } = await import(pathToFileURL(join(directory, 'layout-runtime.mjs')).href);
  const setup = makeRuntimeTestSetup();
  const panel = setup.nodes.find((item) => item.layout_node_id === 'panel');
  panel.ui_layout = { ...panel.ui_layout, positioning: 'absolute', floating_root_kind: 'popup' };
  const middle = makeRuntimeTestObject(setup.scene, { type: 'Container', x: 10, y: 10, width: 100, height: 70, parentContainer: setup.panel });
  const second = makeRuntimeTestObject(setup.scene, { x: 70, y: 40, width: 24, height: 24, parentContainer: middle });
  setup.icon.parentContainer = middle;
  setup.icon.x = 20; setup.icon.y = 20;
  setup.panel.list = [middle]; middle.list = [setup.icon, second];
  setup.objects_by_id.set('middle', middle); setup.objects_by_id.set('right-bottom', second);
  const child = setup.nodes.find((item) => item.layout_node_id === 'icon');
  Object.assign(child, { parent_layout_node_id: 'middle', position_reference_id: 'middle', axis_alignment: { horizontal: 'left', vertical: 'top' } });
  setup.nodes.push({ ...structuredClone(panel), layout_node_id: 'middle', parent_layout_node_id: 'panel', position_reference_id: 'panel', ui_layout: { layout_owner: 'SELF', size_policy: 'FIXED' }, axis_alignment: { horizontal: 'left', vertical: 'top' } });
  setup.nodes.push({ ...structuredClone(child), layout_node_id: 'right-bottom', axis_alignment: { horizontal: 'right', vertical: 'bottom' } });
  setup.runtime_registry.set('middle', { position_writes: [{ driver: 'REFLOW', writer_id: 'reflow:middle' }], size_writes: [{ driver: 'FIXED', writer_id: 'fixed:middle' }], layout_bounds_space: 'object-local', layout_bounds: { x: 0, y: 0, width: 100, height: 70 } });
  setup.runtime_registry.set('right-bottom', { position_writes: [{ driver: 'REFLOW', writer_id: 'reflow:right-bottom' }], size_writes: [{ driver: 'FIXED', writer_id: 'fixed:right-bottom' }] });
  const capture = () => collectPhaserLayoutSnapshot({ ...setup, world_to_layout: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } });
  const baseline = capture();
  for (const node of setup.nodes.filter((item) => item.is_root_container !== true)) node.target_bounds = structuredClone(baseline.component_snapshots.find((item) => item.layout_node_id === node.layout_node_id).actual_bounds);
  const check = () => { const errors = []; validateLayoutRuntimeSnapshots(setup.nodes, capture(), errors, 'layout_geometry', { scene_id: 'main', state_id: 'default', viewport: setup.runtime_context.viewport }); return errors; };
  assert.deepEqual(check(), []);
  setup.panel.x += 7; setup.panel.y += 3;
  assert.deepEqual(check(), []);
  for (const object of [setup.icon, second]) {
    object.x -= 7; object.y -= 3;
    assert.ok(check().some((error) => error.includes('相对锚点间距')));
    object.x += 7; object.y += 3;
  }
});
