import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { extractFigmaNodeStyle, validateFigmaNodeProperties } from '../../skills/app-workflow-control/scripts/runtime/figma-design-properties.mjs';
import { extractFlutterPlan } from '../../skills/app-workflow-control/scripts/runtime/flutter-plan-extractor.mjs';
import { validateFigmaNativeFacts } from '../../skills/app-workflow-control/scripts/runtime/figma-native-facts.mjs';

/** 构造独立源节点；先有 Figma 属性，再通过生产提取器生成原生要求。 */
function fixture() {
  const sourceTargetRef = { path: 'art/selected.png', sha256: 'a'.repeat(64) };
  const nodes = [
    { id: '1:1', name: '页面', type: 'FRAME', parentId: null, x: 0, y: 0, width: 390, height: 844, layoutMode: 'VERTICAL', properties: {} },
    { id: '1:2', name: '触控容器', type: 'FRAME', parentId: '1:1', x: 16, y: 20, width: 200, height: 48, layoutMode: 'VERTICAL', properties: {} },
    { id: '1:3', name: '输入框视觉轮廓', type: 'FRAME', parentId: '1:2', x: 0, y: 2, width: 200, height: 44, layoutMode: 'HORIZONTAL',
      rectangleCornerRadii: [20, 20, 0, 0], opacity: 0.6, strokeWeight: 2,
      strokes: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3 }, opacity: 0.8 }],
      fills: [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 1, g: 1, b: 1, a: 0.5 } }], gradientTransform: [[1, 0, 0], [0, 1, 0]] }],
      imageFills: [{ assetId: 'illustration', scaleMode: 'FILL', imageTransform: [[0.5, 0, 0.1], [0, 0.5, 0.2]] }],
      properties: { shape: { kind: 'rectangle' }, insets: { top: 2, right: 8, bottom: 2, left: 8 }, colors: { background: '#ffffff', foreground: '#222222' }, border: { width: 2, color: '#223344' } } },
    { id: '1:4', name: '输入文字', type: 'TEXT', parentId: '1:3', x: 8, y: 10, width: 120, height: 24, characters: '真实文本',
      font: { family: 'Noto Sans', platformFamily: 'Noto Sans', available: true, size: 24, weight: 500, lineHeight: { unit: 'PIXELS', value: 30 }, letterSpacing: { unit: 'PERCENT', value: 10 } },
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.4 } }], opacity: 0.75, properties: {} },
  ];
  const snapshot = { nodes, assets: [{ id: 'illustration', role: 'illustration', nodeIds: ['1:3'], sourceRef: { path: 'art/illustration.png', sha256: 'c'.repeat(64) } }], stateId: 'default', viewport: { width: 390, height: 844 }, language: 'zh-CN', textScale: 1, reconstruction: { sourceTargetRef } };
  const request = { workItemId: 'wi', objectId: 'home', candidateId: 'a', referenceTarget: sourceTargetRef,
    figmaDesignRef: { path: 'snapshot.json', sha256: 'b'.repeat(64) }, conditionId: 'phone', stateRule: '可输入',
    adaptation: { platform: 'android', orientation: 'portrait', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, keyboard: 'hidden' },
    mappings: [{ designItemId: 'input', nodeId: '1:3', textNodeId: '1:4', touchNodeId: '1:2', implementationId: 'input-impl', label: '输入框', widget: 'TextField', kind: 'native', designReason: '输入控件的可访问实现', consumers: [{ id: 'input', sourcePath: 'lib/input.dart', symbol: 'Input' }] }] };
  const { plan, mappings } = extractFlutterPlan(snapshot, request);
  return { snapshot, request, plan, mappings };
}

/** 以真实快照与生成计划调用正式比对模块，所有授权材料由本地测试替身限定。 */
function validate(f) {
  const doc = { referenceTarget: f.request.referenceTarget, figmaDesignRef: f.request.figmaDesignRef };
  const approved = [{ ref: f.request.figmaDesignRef, snapshot: f.snapshot }];
  validateFigmaNativeFacts('.', {}, doc, { mappings: f.mappings }, approved, f.plan, {
    sameRef: (_repo, left, right) => isDeepStrictEqual(left, right),
    readFrozen: () => { throw new Error('当前测试未授权修改设计'); },
    assert: (ok, message) => { if (!ok) throw new Error(message); },
  });
}

test('独立 Figma 源完整提取混合圆角、字体单位、渐变、图片、边框和触控范围', () => {
  const f = fixture(); const req = f.plan.implementations[0].requirements;
  const schema = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/references/design-reconstruction.schema.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false }); const check = ajv.compile(schema);
  assert.equal(check(f.plan), true, JSON.stringify(check.errors));
  assert.deepEqual(req.shape.value.corners, { topLeft: 20, topRight: 20, bottomRight: 0, bottomLeft: 0, unit: 'logical-px' });
  assert.deepEqual(req.shape.value.flutter, { constructor: 'BorderRadius.only', topLeft: 20, topRight: 20, bottomRight: 0, bottomLeft: 0 });
  assert.deepEqual(req.typography.value.lineHeight, { sourceUnit: 'PIXELS', sourceValue: 30, flutterHeight: 1.25 });
  assert.deepEqual(req.typography.value.letterSpacing, { sourceUnit: 'PERCENT', sourceValue: 10, value: 2.4, unit: 'logical-px' });
  assert.equal(req.appearance.value.raw.fills[0].gradientStops[1].position, 1);
  assert.deepEqual(req.appearance.value.normalized.fill[0].gradientStops[1].position, { value: 1, unit: 'ratio' });
  assert.deepEqual(req.appearance.value.normalized.fill[0].gradientTransform, [[1, 0, 0], [0, 1, 0]]);
  assert.deepEqual(req.appearance.value.normalized.imageFills[0].imageTransform, [[0.5, 0, 0.1], [0, 0.5, 0.2]]);
  assert.equal(req.appearance.value.normalized.imageFills[0].scaleMode, 'FILL');
  assert.equal(req.appearance.value.normalized.opacity.value, 0.6);
  assert.equal(req.appearance.value.raw.textVisual.fills[0].color.r, 0.2);
  assert.equal(req.appearance.value.normalized.textFill[0].color.r, 0.2);
  assert.equal(req.appearance.value.normalized.textOpacity.value, 0.75);
  assert.equal(req.appearance.value.normalized.border.width.value, 2);
  assert.deepEqual(req.size.value, { width: 200, height: 44 });
  assert.deepEqual(f.plan.elements[0].region, { x: 16, y: 22, width: 200, height: 44, unit: 'px' });
  assert.deepEqual(req.touchTarget.value, { nodeId: '1:2', width: 200, height: 48, unit: 'logical-px' });
  assert.equal(f.plan.implementations[0].sourceAssets[0].sourceRef.path, 'art/illustration.png');
  assert.doesNotThrow(() => validate(f));
});

test('原始或规范化属性被篡改时，Figma 与原生计划比对拒绝', () => {
  for (const mutate of [
    (req) => { req.appearance.value.raw.fills[0].gradientStops[0].position = 0.4; },
    (req) => { req.appearance.value.raw.textVisual.fills[0].color.r = 0.4; },
    (req) => { req.appearance.value.normalized.shape.corners.bottomLeft = 20; },
    (req) => { req.appearance.value.normalized.imageFills[0].scaleMode = 'FIT'; },
    (req) => { req.typography.value.lineHeight.flutterHeight = 30; },
    (req) => { req.shape.value.flutter.topLeft = 0; },
    (req) => { req.touchTarget.value.height = 44; },
  ]) {
    const f = fixture(); mutate(f.plan.implementations[0].requirements);
    assert.throws(() => validate(f), /不一致|触控尺寸/);
  }
});

test('有渐变和描边的容器仅映射其文字时不能通过还原检查', () => {
  const f = fixture();
  f.request.mappings = [{ designItemId: 'text', nodeId: '1:4', implementationId: 'text-impl', label: '输入文字', widget: 'Text', kind: 'native', designReason: '文字可编辑', consumers: [{ id: 'text', sourcePath: 'lib/text.dart', symbol: 'TextView' }] }];
  const result = extractFlutterPlan(f.snapshot, f.request); f.plan = result.plan; f.mappings = result.mappings;
  assert.throws(() => validate(f), /可见容器 1:3 缺少自身样式映射/);
});

test('AUTO 与百分比行高保留源单位，不把数值误当 Flutter 倍率', () => {
  const f = fixture(); const text = f.snapshot.nodes[3];
  text.font.lineHeight = { unit: 'AUTO' };
  assert.deepEqual(extractFigmaNodeStyle(text).designFacts.normalized.typography.lineHeight, { sourceUnit: 'AUTO', sourceValue: null, flutterHeight: null });
  text.font.lineHeight = { unit: 'PERCENT', value: 150 };
  assert.equal(extractFigmaNodeStyle(text).designFacts.normalized.typography.lineHeight.flutterHeight, 1.5);
});

test('椭圆和矢量按真实类型提取，不能被自动归为矩形', () => {
  const f = fixture();
  const ellipse = { id: '5:1', name: '椭圆头像', type: 'ELLIPSE', parentId: '1:1', x: 12, y: 36, width: 40, height: 30, properties: {} };
  f.snapshot.nodes = [f.snapshot.nodes[0], ellipse]; f.snapshot.assets = [];
  f.request.mappings = [{ designItemId: 'ellipse', nodeId: ellipse.id, implementationId: 'ellipse-impl', label: '椭圆头像', widget: 'ClipOval', kind: 'native', designReason: '真实椭圆轮廓', consumers: [{ id: 'avatar', sourcePath: 'lib/avatar.dart', symbol: 'Avatar' }] }];
  let result = extractFlutterPlan(f.snapshot, f.request);
  f.plan = result.plan; f.mappings = result.mappings;
  const shape = f.plan.implementations[0].requirements.shape.value;
  assert.deepEqual(shape, { kind: 'ellipse', flutter: { constructor: 'ClipOval' } });
  assert.equal(f.plan.implementations[0].requirements.appearance.value.raw.nodeType, 'ELLIPSE');
  const schema = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/references/design-reconstruction.schema.json', import.meta.url), 'utf8'));
  const check = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(check(f.plan), true, JSON.stringify(check.errors));
  assert.doesNotThrow(() => validate(f));
  const vector = { ...ellipse, id: '5:2', name: '可编辑图标', type: 'VECTOR', vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 20 20' }] };
  const vectorStyle = extractFigmaNodeStyle(vector).designFacts;
  assert.equal(vectorStyle.raw.nodeType, 'VECTOR');
  assert.equal(vectorStyle.normalized.shape.kind, 'path');
  assert.equal(vectorStyle.normalized.shape.flutter.geometry.vectorPaths[0].data, 'M 0 0 L 20 20');
  assert.throws(() => extractFigmaNodeStyle({ ...vector, vectorPaths: [] }), /5:2.*缺少可编辑矢量路径/);
});

test('水平及旋转直线的局部尺寸和实际描边区域贯穿提取、Schema 与原生核验', () => {
  const schema = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/references/design-reconstruction.schema.json', import.meta.url), 'utf8'));
  const check = new Ajv2020({ strict: false }).compile(schema);
  for (const [rotation, region] of [[0, { x: 200, y: 199.5, width: 100, height: 1, unit: 'px' }], [90, { x: 199.5, y: 100, width: 1, height: 100, unit: 'px' }]]) {
    const f = fixture();
    // LineNode 的本地高度恒为零，垂直效果来自实际旋转及描边。
    const line = { id: '5:3', name: '分隔线', type: 'LINE', parentId: '1:1', x: 200, y: 200, width: 100, height: 0, rotation, strokeWeight: 1, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] };
    f.snapshot.nodes = [f.snapshot.nodes[0], line]; f.snapshot.assets = [];
    f.request.mappings = [{ designItemId: 'line', nodeId: line.id, implementationId: 'line-impl', label: '分隔线', widget: 'CustomPaint', kind: 'native', designReason: '保留真实直线', consumers: [{ id: 'line', sourcePath: 'lib/line.dart', symbol: 'LineView' }] }];
    const extracted = extractFlutterPlan(f.snapshot, f.request); f.plan = extracted.plan; f.mappings = extracted.mappings;
    const req = f.plan.implementations[0].requirements;
    assert.deepEqual(req.size.value, { width: 100, height: 0 });
    assert.deepEqual(f.plan.elements[0].region, region);
    assert.equal(req.appearance.value.raw.other.rotation, rotation);
    assert.equal(req.shape.value.flutter.geometry.rotation.value, rotation);
    assert.equal(req.shape.value.flutter.geometry.basis, 'derived-from-figma-line');
    assert.equal(check(f.plan), true, JSON.stringify(check.errors));
    assert.doesNotThrow(() => validate(f));
    req.shape.value.kind = 'path';
    assert.equal(check(f.plan), false, '非 LINE 形态不能借用零高度例外');
  }
});

test('直线特殊线帽与效果使用实际渲染边界，缺少依据或旋转祖先时不伪造范围', () => {
  const f = fixture();
  const root = f.snapshot.nodes[0]; root.absoluteBoundingBox = { x: 300, y: 400, width: 390, height: 844 };
  const line = { id: '5:4', name: '带效果直线', type: 'LINE', parentId: root.id, x: 100, y: 120, width: 100, height: 0, rotation: 0,
    strokeWeight: 1, strokeCap: 'ARROW_LINES', strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    effects: [{ type: 'DROP_SHADOW', visible: true }], absoluteRenderBounds: { x: 397, y: 516, width: 106, height: 8 } };
  f.snapshot.nodes = [root, line]; f.snapshot.assets = [];
  f.request.mappings = [{ designItemId: 'line', nodeId: line.id, implementationId: 'line-impl', label: '带效果直线', widget: 'CustomPaint', kind: 'native', designReason: '保留真实渲染边界', consumers: [{ id: 'line', sourcePath: 'lib/line.dart', symbol: 'LineView' }] }];
  let extracted = extractFlutterPlan(f.snapshot, f.request); f.plan = extracted.plan; f.mappings = extracted.mappings;
  assert.deepEqual(f.plan.elements[0].region, { x: 97, y: 116, width: 106, height: 8, unit: 'px' });
  assert.doesNotThrow(() => validate(f));
  delete line.absoluteRenderBounds;
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /线帽.*实际渲染边界/);
  line.strokeCap = 'NONE';
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /可见效果需要实际渲染边界/);
  line.effects = [];
  const strokes = line.strokes; line.strokes = [];
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /缺少可核验的中心描边/);
  line.strokes = strokes;
  root.rotation = 10;
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /1:1 含旋转/);
});

test('直线的触控容器按旋转后的绘制边界核对', () => {
  const f = fixture();
  const touch = { id: '2:1', name: '可操作线条范围', type: 'FRAME', parentId: '1:1', x: 100, y: 100, width: 40, height: 120, layoutMode: 'VERTICAL', properties: {} };
  const line = { id: '2:2', name: '旋转线条', type: 'LINE', parentId: touch.id, x: 20, y: 110, width: 100, height: 0, rotation: 90, strokeWeight: 1, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] };
  f.snapshot.nodes = [f.snapshot.nodes[0], touch, line]; f.snapshot.assets = [];
  f.request.mappings = [{ designItemId: 'line', nodeId: line.id, touchNodeId: touch.id, implementationId: 'line-impl', label: '线条', widget: 'CustomPaint', kind: 'native', designReason: '触控线条', consumers: [{ id: 'line', sourcePath: 'lib/line.dart', symbol: 'LineView' }] }];
  const extracted = extractFlutterPlan(f.snapshot, f.request); f.plan = extracted.plan; f.mappings = extracted.mappings;
  assert.doesNotThrow(() => validate(f));
  touch.height = 50;
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /触控容器未包围视觉轮廓/);
});

test('独立插画保留真实素材与图片生产路线，缺来源时阻断', () => {
  const f = fixture(); const mapping = f.request.mappings[0]; mapping.kind = 'image';
  mapping.production = { identity: 'independent', consumerIds: ['input'], sourceRegion: { x: 16, y: 22, width: 200, height: 44, unit: 'px' }, outputPath: 'assets/input.png', outputSize: { width: 200, height: 44 }, displaySize: { width: 200, height: 44 }, density: 1, background: 'transparent', transparentInsets: { top: 0, right: 0, bottom: 0, left: 0 }, edgePolicy: '保留透明边缘' };
  const { plan, mappings } = extractFlutterPlan(f.snapshot, f.request);
  assert.equal(plan.implementations[0].kind, 'image');
  assert.equal(plan.implementations[0].production.outputPath, 'assets/input.png');
  assert.equal(plan.implementations[0].sourceAssets[0].role, 'illustration');
  f.plan = plan; f.mappings = mappings; assert.doesNotThrow(() => validate(f));
  f.snapshot.assets = [];
  assert.throws(() => extractFlutterPlan(f.snapshot, f.request), /缺少图片填充的真实素材来源/);
});

test('略过组织容器时保留最近映射祖先及目标根坐标', () => {
  const f = fixture();
  f.request.mappings.unshift({ designItemId: 'page', nodeId: '1:1', implementationId: 'page-impl', label: '页面', widget: 'Column', kind: 'native', designReason: '原生页面容器', consumers: [{ id: 'page', sourcePath: 'lib/page.dart', symbol: 'Page' }] });
  const { plan, mappings } = extractFlutterPlan(f.snapshot, f.request);
  const input = plan.elements.find((item) => item.id === 'input');
  assert.equal(input.parentId, 'page');
  assert.deepEqual(input.region, { x: 16, y: 22, width: 200, height: 44, unit: 'px' });
  assert.deepEqual(plan.implementations.find((item) => item.id === 'page-impl').requirements.structure.value.children, ['input']);
  f.plan = plan; f.mappings = mappings; assert.doesNotThrow(() => validate(f));
});

test('触控区域必须真实包含视觉节点；零尺寸路径按节点定位阻断', () => {
  const f = fixture(); f.snapshot.nodes[1].height = 40;
  assert.throws(() => validate(f), /触控容器未包围/);
  assert.throws(() => validateFigmaNodeProperties({ id: '3:9', name: '问题图标路径', type: 'VECTOR', width: 0, height: 20 }), /3:9.*问题图标路径.*width/);
});

test('本地提取命令核验冻结摘要且拒绝覆盖现有计划', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'figma-extract-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const f = fixture(); const input = join(dir, 'snapshot.json'); const requestPath = join(dir, 'request.json');
  const output = join(dir, 'plan.json'); const mappings = join(dir, 'mappings.json');
  const bytes = Buffer.from(JSON.stringify(f.snapshot)); writeFileSync(input, bytes);
  f.request.figmaDesignRef = { path: input, sha256: createHash('sha256').update(bytes).digest('hex') };
  writeFileSync(requestPath, JSON.stringify(f.request));
  const script = resolve('skills/flutter-domain-contracts/scripts/extract-figma-plan.mjs');
  const run = () => spawnSync(process.execPath, [script, input, requestPath, output, mappings], { encoding: 'utf8', windowsHide: true });
  assert.equal(run().status, 0);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).implementations[0].requirements.shape.value.corners.topLeft, 20);
  assert.match(run().stderr, /输出已存在/);
});
