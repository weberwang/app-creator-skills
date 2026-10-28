/** 覆盖 Flutter 实际合同、夹具及浮层例外，避免只验证公共纯函数。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import test from 'node:test';
import YAML from '../skills/app-skill-runtime/yaml.mjs';
import { adaptFlutterRelativeLayout } from '../scripts/migration/flutter-relative-layout-adapter.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, '../flutter-skills/adaptive-layout-implementation');
const TARGET = resolve(ROOT, 'skills/adaptive-layout-implementation');

/** 源仓库存在时验证真实迁移变换；独立仓库则验证随仓库交付的已生成文件。 */
function prepared(file) {
  const source = join(SOURCE, ...file.split('/'));
  if (!existsSync(source)) return readFileSync(join(TARGET, ...file.split('/')), 'utf8');
  const sourcePath = `adaptive-layout-implementation/${file}`;
  return adaptFlutterRelativeLayout(readFileSync(source, 'utf8'), { stack: 'flutter', sourcePath,
    destination: `skills/${sourcePath}` }).text;
}

/** 在真实安装目录的模块解析上下文中运行变换后的校验器，但不写入生成物。 */
function compileValidator() {
  const filename = join(TARGET, 'scripts/validate-layout-spec.js');
  const instance = new Module(filename);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(dirname(filename));
  instance._compile(prepared('scripts/validate-layout-spec.js'), filename);
  return instance.exports;
}

/** 从两阶段真实模板创建隔离规格，避免不同断言共享变更。 */
function specFor(phase) {
  const file = phase === 'fidelity' ? 'layout-spec-fidelity-template.yaml' : 'layout-spec-template.yaml';
  return YAML.parse(prepared(`assets/${file}`));
}

/** 添加独立本体及相对内部控件，主体位置不需要伪造相对锚点。 */
function addFloating(spec, kind) {
  const body = { id: 'dialog', role: kind, parent_id: 'safe_area', flutter_key: 'dialogKey',
    positioning: 'absolute', floating_root_kind: kind, size: {
      min: { width: 40, height: 40 }, preferred: { width: 80, height: 80 }, max: { width: 100, height: 100 },
    } };
  const child = { id: 'dialog_action', role: 'action', parent_id: 'dialog', flutter_key: 'dialogActionKey', positioning: 'relative',
    anchors: { horizontal: { center: { relation: 'centered', reference: 'dialog.center' } },
      vertical: { top: { relation: 'inset', reference: 'dialog.top' } } },
    size: { min: { width: 20, height: 20 }, preferred: { width: 30, height: 30 }, max: { width: 40, height: 40 } } };
  spec.regions.push(body, child);
  spec.overlays.push({ id: 'dialog', body_kind: kind, behavior: 'floating', occlusion: '遮挡底层',
    keyboard_fallback: '调整位置', narrow_height_fallback: '滚动内容', hit_target: { min_width: 48, min_height: 48 } });
  return { body, child };
}

test('两阶段真实模板均绑定区域父级、稳定 Widget key 和相对定位', () => {
  const { validate } = compileValidator();
  for (const phase of ['sketch', 'fidelity']) {
    const spec = specFor(phase);
    const [errors] = validate(spec);
    assert.deepEqual(errors, [], `${phase}: ${errors.join('; ')}`);
    assert.ok(spec.regions.every((region) => region.parent_id && region.flutter_key && region.positioning === 'relative'));
  }
});

test('三种浮层本体可独立落位，子孙仍须保持相对关系', () => {
  const { validate } = compileValidator();
  for (const kind of ['popup', 'floating', 'toast']) {
    const spec = specFor('sketch');
    const { child } = addFloating(spec, kind);
    assert.deepEqual(validate(spec)[0], [], `${kind} 本体不应要求伪造相对锚点`);
    child.positioning = 'absolute';
    assert.notEqual(validate(spec)[0].length, 0, `${kind} 内部不能使用独立定位`);
    child.positioning = 'relative';
    child.anchors.horizontal.center.reference = 'viewport.center';
    assert.notEqual(validate(spec)[0].length, 0, `${kind} 内部不能引用外部 viewport 绕过随动`);
    child.anchors.horizontal.center.reference = 'dialog.viewport';
    assert.notEqual(validate(spec)[0].length, 0, `${kind} 不能把未知子节点伪装为本体边界`);
    child.anchors.horizontal.center.reference = 'dialog.center';
    child.floating_root_kind = kind;
    child.role = kind;
    spec.overlays.push({ id: child.id, body_kind: kind, behavior: 'floating', occlusion: '无',
      keyboard_fallback: '滚动', narrow_height_fallback: '滚动', hit_target: { min_width: 48, min_height: 48 },
      anchor: { reference: 'dialog.top', relation: 'inset' } });
    assert.notEqual(validate(spec)[0].length, 0, `${kind} 子孙不能自称第二个本体逃逸`);
  }
});

test('多级浮层子孙不能通过外层祖先或安全区逃出浮层', () => {
  const { validate } = compileValidator();
  const spec = specFor('sketch');
  const { child } = addFloating(spec, 'popup');
  const container = structuredClone(child);
  container.id = 'dialog_group';
  container.flutter_key = 'dialogGroupKey';
  container.role = 'container';
  spec.regions.push(container);
  child.parent_id = container.id;
  child.anchors.horizontal.center.reference = 'dialog_group.center';
  child.anchors.vertical.top.reference = 'dialog_group.top';
  assert.deepEqual(validate(spec)[0], []);
  child.anchors.vertical.top.reference = 'safe_area.top';
  assert.notEqual(validate(spec)[0].length, 0, '多级后代不能引用本体外部安全区');
  child.anchors.vertical.top.reference = 'dialog_group.top';
  child.positioning = 'absolute';
  assert.notEqual(validate(spec)[0].length, 0, '多级后代不能使用本体的独立定位例外');
});

test('普通 UI、伪造 overlay、未知身份或无实际关系的实现信号均不能通过', () => {
  const { validate } = compileValidator();
  const absolute = specFor('sketch');
  absolute.regions.find((region) => region.id === 'primary-action').positioning = 'absolute';
  assert.notEqual(validate(absolute)[0].length, 0, '普通 docked 按钮不是浮层本体');

  const unknown = specFor('sketch');
  unknown.regions[0].positioning = 'screen-absolute';
  assert.notEqual(validate(unknown)[0].length, 0, '未知定位模式不能绕过');
  unknown.regions[0].positioning = 'relative';
  delete unknown.regions[0].parent_id;
  assert.notEqual(validate(unknown)[0].length, 0, '真实父级不能缺失');

  const fakeOverlay = specFor('sketch');
  fakeOverlay.overlays[0].id = 'missing-widget';
  assert.notEqual(validate(fakeOverlay)[0].length, 0, 'overlay 必须绑定实际区域');
  const forged = specFor('sketch');
  const button = forged.regions.find((region) => region.id === 'primary-action');
  button.positioning = 'absolute';
  button.floating_root_kind = 'popup';
  assert.notEqual(validate(forged)[0].length, 0, '只有浮层声明、没有对应本体身份不能通过');

  const signal = specFor('sketch');
  signal.implementation_signals.push({ signal: 'Positioned', reason: '真实叠层', boundary: 'viewport',
    viewport_scope: 'all', fallback: '重排', test_ids: ['content_header_relation'] });
  assert.notEqual(validate(signal)[0].length, 0, '仅靠自然语言 boundary 不能通过');
  const phantom = specFor('sketch');
  phantom.regions[0].anchors.horizontal.start.reference = 'missing-node.edge';
  assert.notEqual(validate(phantom)[0].length, 0, '位置参照必须绑定实际节点或固定根');
});

test('高保真测量不能冒用其他 Widget key 或未绑定参照', () => {
  const { validate } = compileValidator();
  const spec = specFor('fidelity');
  spec.critical_alignments[0].flutter_key = 'unrelatedKey';
  assert.notEqual(validate(spec)[0].length, 0);
  spec.critical_alignments[0].flutter_key = 'brandKey';
  spec.critical_alignments[0].reference_id = 'viewport';
  assert.notEqual(validate(spec)[0].length, 0);

  const independent = specFor('fidelity');
  addFloating(independent, 'popup');
  const alignment = independent.critical_alignments[0];
  alignment.element = 'dialog';
  alignment.flutter_key = 'dialogKey';
  alignment.reference_id = 'viewport';
  alignment.reference_flutter_key = 'viewportKey';
  alignment.relations.horizontal.target = 'dialog.centerX == viewport.centerX';
  alignment.relations.horizontal.flutter = 'dialog.centerX == viewport.centerX';
  alignment.relations.vertical.target = 'dialog.top == viewport.top + inset';
  alignment.relations.vertical.flutter = 'dialog.top == viewport.top + inset';
  assert.deepEqual(validate(independent)[0], [], '独立本体的屏幕测量不应要求实际相对布局锚点');
});

test('高保真关系式的两轴和两侧都必须使用已声明的真实节点', () => {
  const { validate } = compileValidator();
  for (const axis of ['horizontal', 'vertical']) for (const side of ['target', 'flutter']) {
    for (const illegal of ['viewport', 'missing_node', 'frame.viewport', 'viewport . top + frame']) {
      const spec = specFor('fidelity');
      const relation = spec.critical_alignments[0].relations[axis];
      relation[side] = `brand.centerX == ${illegal}.centerX + inset`;
      assert.notEqual(validate(spec)[0].length, 0, `${axis}.${side}: ${illegal} 不能被元数据掩盖`);
    }
    const absent = specFor('fidelity');
    absent.critical_alignments[0].relations[axis][side] = 'brand.centerX == inset';
    assert.notEqual(validate(absent)[0].length, 0, `${axis}.${side} 必须实际引用声明的参照`);
  }
});

test('高保真关系 DSL 拒绝索引、字符串、调用等语法并保留标量算术', () => {
  const { validate } = compileValidator();
  const unsupported = [
    'brand.centerX == frame.centerX + viewport["width"]',
    "brand.centerX == frame.centerX + 'viewport.width'",
    'brand.centerX == frame.centerX + `viewport.width`',
    'brand.centerX == frame.centerX + get(viewport.width)',
    'brand.centerX == frame.centerX; viewport.width',
    'brand.centerX == frame.centerX + viewport?.width',
  ];
  for (const axis of ['horizontal', 'vertical']) for (const side of ['target', 'flutter']) {
    for (const expression of unsupported) {
      const spec = specFor('fidelity');
      spec.critical_alignments[0].relations[axis][side] = expression;
      assert.notEqual(validate(spec)[0].length, 0, `${axis}.${side} 必须拒绝 ${expression}`);
    }
    const legal = specFor('fidelity');
    legal.critical_alignments[0].relations[axis][side] = 'brand.centerX == (frame.centerX + inset * 2) / 2';
    assert.deepEqual(validate(legal)[0], [], `${axis}.${side} 应允许括号算术和标量`);
  }
});

test('关系表达式支持无空格减法及包含连字符的真实节点', () => {
  const { validate } = compileValidator();
  for (const axis of ['horizontal', 'vertical']) for (const side of ['target', 'flutter']) {
    for (const expression of ['brand.centerX==frame.centerX-inset', 'brand.centerX==frame.centerX-10']) {
      const spec = specFor('fidelity');
      spec.critical_alignments[0].relations[axis][side] = expression;
      assert.deepEqual(validate(spec)[0], [], `${axis}.${side}: ${expression}`);
    }
    const spec = specFor('fidelity');
    const alignment = spec.critical_alignments[0];
    alignment.element = 'primary-action';
    alignment.flutter_key = 'primaryActionKey';
    alignment.reference_id = 'safe_area';
    alignment.reference_flutter_key = 'safeAreaKey';
    for (const direction of ['horizontal', 'vertical']) for (const kind of ['target', 'flutter']) {
      alignment.relations[direction][kind] = 'primary-action.centerX==safe_area.centerX-inset';
    }
    alignment.relations[axis][side] = 'primary-action.centerX==safe_area.centerX-10';
    assert.deepEqual(validate(spec)[0], [], `${axis}.${side}: 连字符节点应被完整识别`);
  }
});

test('高保真浮层内部关系式不能引用本体之外的节点', () => {
  const { validate } = compileValidator();
  for (const axis of ['horizontal', 'vertical']) for (const side of ['target', 'flutter']) {
    const spec = specFor('fidelity');
    addFloating(spec, 'popup');
    const alignment = spec.critical_alignments[0];
    alignment.element = 'dialog_action';
    alignment.flutter_key = 'dialogActionKey';
    alignment.reference_id = 'dialog';
    alignment.reference_flutter_key = 'dialogKey';
    alignment.relations.horizontal.target = 'dialog_action.centerX == dialog.centerX';
    alignment.relations.horizontal.flutter = 'dialog_action.centerX == dialog.centerX';
    alignment.relations.vertical.target = 'dialog_action.top == dialog.top + inset';
    alignment.relations.vertical.flutter = 'dialog_action.top == dialog.top + inset';
    assert.deepEqual(validate(spec)[0], [], '本体内部测量与区域关系一致');
    alignment.relations[axis][side] = 'dialog_action.top == dialog.top + viewport.top';
    assert.notEqual(validate(spec)[0].length, 0, `${axis}.${side} 不能额外引用屏幕`);
  }
});

test('源夹具的 48 个正负例保持原判断，合法 Positioned 使用头像父级', () => {
  const validator = compileValidator();
  const dir = mkdtempSync(join(tmpdir(), 'flutter-relative-layout-'));
  const fixtures = existsSync(join(SOURCE, 'scripts/fixtures')) ? join(SOURCE, 'scripts/fixtures') : join(TARGET, 'scripts/fixtures');
  const names = readdirSync(fixtures).filter((name) => name.endsWith('.yaml')).sort();
  const previousLog = console.log;
  const output = [];
  try {
    assert.equal(names.length, 48);
    mkdirSync(join(dir, 'assets'), { recursive: true });
    mkdirSync(join(dir, 'scripts/fixtures'), { recursive: true });
    for (const name of ['layout-spec-template.yaml', 'layout-spec-fidelity-template.yaml']) {
      writeFileSync(join(dir, 'assets', name), prepared(`assets/${name}`));
    }
    for (const name of names) writeFileSync(join(dir, 'scripts/fixtures', name), prepared(`scripts/fixtures/${name}`));
    const filename = join(TARGET, 'scripts/run-fixtures.js');
    const instance = new Module(filename);
    instance.filename = filename;
    instance.paths = Module._nodeModulePaths(dirname(filename));
    const requireOriginal = instance.require.bind(instance);
    instance.require = (id) => id === './validate-layout-spec.js' ? validator : requireOriginal(id);
    instance._compile(`${prepared('scripts/run-fixtures.js')}\nmodule.exports = { runFixture };\n`, filename);
    console.log = (...values) => output.push(values.join(' '));
    const failures = names.filter((name) => !instance.exports.runFixture(join(dir, 'scripts/fixtures', name)));
    assert.deepEqual(failures, [], output.join('\n'));
  } finally {
    console.log = previousLog;
    // 只清理测试自己创建且仍位于系统临时目录下的路径。
    const path = realpathSync(dir);
    const inside = relative(realpathSync(tmpdir()), path);
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside));
    rmSync(path, { recursive: true, force: true });
  }
});
