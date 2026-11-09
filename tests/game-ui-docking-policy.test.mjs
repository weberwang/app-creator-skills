/** 用纯合同数据验证游戏停靠与实际原生机制，不代表引擎或视觉验收。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import policy from '../skills/app-ui-layout/scripts/relative-layout-policy.cjs';
import domPolicy from '../skills/app-ui-layout/scripts/game-ui-dom-docking.cjs';

const { validateGameUiPositionDriver: validateDriver, validateGameUiDockingOffsets: validateOffsets } = policy;
const { validateGameDomDocking: validateDom } = domPolicy;

/** 创建有边界和原生布局恢复方式的单节点行为。 */
function behavior() {
  return { kind: 'drag', reason: '拖动当前按钮', trigger: '按下后拖动，释放结束', properties: ['x', 'y'], restore_driver: 'REFLOW', restore_rule: '释放后交回父容器停靠' };
}

test('普通游戏 UI 拒绝静态坐标和无依据绕过原生方案', () => {
  assert.match(validateDriver({ driver: 'STATIC' }).join(), /必须相对停靠/);
  assert.match(validateDriver({ driver: 'SHARED', nativeDriver: 'DOM_LAYOUT' }).join(), /必须使用 DOM_LAYOUT/);
  assert.deepEqual(validateDriver({ driver: 'SHARED', nativeDriver: 'DOM_LAYOUT', sharedAllowed: true }), []);
  assert.deepEqual(validateDriver({ driver: 'DOM_LAYOUT', nativeDriver: 'DOM_LAYOUT' }), []);
});

test('位置行为仅接管限定属性，并必须交回基础布局', () => {
  const input = { driver: 'ANIMATION', baseDrivers: ['REFLOW'], behavior: behavior() };
  assert.deepEqual(validateDriver(input), []);
  assert.match(validateDriver({ ...input, behavior: undefined }).join(), /必须提供/);
  for (const change of [{ properties: ['width'] }, { restore_driver: 'STATIC' }, { kind: '静态摆放' }, { trigger: '' }]) {
    assert.notEqual(validateDriver({ ...input, behavior: { ...behavior(), ...change } }).length, 0);
  }
  assert.notEqual(validateDriver({ ...input, driver: 'REFLOW' }).length, 0);
  const dom = { ...input, nativeDriver: 'DOM_LAYOUT', baseDrivers: ['DOM_LAYOUT', 'SHARED'], behavior: { ...behavior(), restore_driver: 'SHARED' } };
  assert.match(validateDriver(dom).join(), /恢复布局.*DOM_LAYOUT/);
});

test('DOM 原生停靠核对父级、包含块与双轴计算样式', () => {
  const node = { parent_layout_node_id: 'panel', layout_execution: { position_driver: 'DOM_LAYOUT', reference_id: 'panel' } };
  const snapshot = { renderer: 'DOM', dom_layout: { parent_id: 'panel', containing_block_id: 'panel', position: 'absolute', parent_display: 'block', inset: { right: '24px', bottom: '24px', top: 'auto', left: 'auto' } } };
  assert.deepEqual(validateDom(node, snapshot), []);
  assert.match(validateDom(node, { renderer: 'HUD' }).join(), /实际 DOM/);
  assert.match(validateDom(node, { renderer: 'DOM' }).join(), /计算样式/);
  for (const change of [{ parent_id: 'other' }, { containing_block_id: 'other' }, { inset: { left: 'foo', top: 'auto' } }]) {
    assert.notEqual(validateDom(node, { ...snapshot, dom_layout: { ...snapshot.dom_layout, ...change } }).length, 0);
  }
  assert.deepEqual(validateDom(node, { ...snapshot, dom_layout: { parent_id: 'panel', position: 'static', parent_display: 'flex' } }), []);
  assert.match(validateDom({ ...node, layout_execution: { ...node.layout_execution, position_driver: 'SHARED' } }, snapshot).join(), /必须使用/);
});

test('普通右下停靠在父容器移动和增大后保持边距，漂移会被拒绝', () => {
  const nodes = [{ layout_node_id: 'button', parent_layout_node_id: 'panel', target_bounds: { x: 156, y: 126, width: 20, height: 30 }, reference_target_bounds: { x: 0, y: 0, width: 200, height: 180 }, axis_alignment: { horizontal: 'right', vertical: 'bottom' }, ui_layout: { layout_owner: 'SELF' } }];
  const snapshot = { active: true, actual_bounds: { x: 256, y: 166, width: 20, height: 30 }, reference_bounds: { x: 50, y: 10, width: 250, height: 210 } };
  const errors = [];
  validateOffsets(nodes, new Map([['button', snapshot]]), errors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  assert.deepEqual(errors, []);
  snapshot.actual_bounds.x += 5;
  validateOffsets(nodes, new Map([['button', snapshot]]), errors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  assert.match(errors.join(), /普通 UI horizontal/);
  nodes[0].ui_layout.layout_owner = 'PARENT';
  for (const value of [24, '24', 'whatever']) {
    nodes[0].offset = { x: value, y: 24 };
    const invalid = [];
    validateOffsets(nodes, new Map([['button', snapshot]]), invalid, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
    assert.notEqual(invalid.length, 0, '父级标签或偏移字符串不能掩盖实际漂移');
  }
  nodes[0].offset = { x: 24, y: 24 };
  nodes[0].layout_execution = { position_driver: 'ANIMATION' };
  nodes[0].ui_layout.position_behavior = { properties: ['x'] };
  snapshot.position_writers = ['ANIMATION'];
  const activeErrors = [];
  validateOffsets(nodes, new Map([['button', snapshot]]), activeErrors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  assert.deepEqual(activeErrors, []);
  snapshot.actual_bounds.y += 1;
  validateOffsets(nodes, new Map([['button', snapshot]]), activeErrors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  assert.match(activeErrors.join(), /vertical/);
});
