/** 核对运行期受控轴投影，合成几何不能代表真实引擎或视觉验收。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import behaviorPolicy from '../skills/app-ui-layout/scripts/game-ui-behavior.cjs';
import { validateCenterAlignmentNodes } from '../skills/phaser4-game-ui-layout/scripts/center-alignment.mjs';

const { activePositionAxes, projectActivePositionCentering } = behaviorPolicy;

/** 构造一个只有第二成员水平移动的已知虚拟组合。 */
function fixture() {
  const reference = { x: 0, y: 0, width: 100, height: 100 };
  const nodes = ['a', 'b'].map((id, index) => ({ layout_node_id: id, parent_layout_node_id: 'viewport', reference_target_bounds: reference, target_bounds: { x: 40 + index * 10, y: 20, width: 10, height: 10 }, axis_alignment: { horizontal: 'center', vertical: 'top' }, ui_layout: index ? { position_behavior: { properties: ['x'] } } : {}, layout_execution: { position_driver: index ? 'ANIMATION' : 'REFLOW' } }));
  nodes[0].center_alignment = { horizontal: { mode: 'strict' }, member_ids: ['a', 'b'] };
  const snapshots = new Map(nodes.map((node) => [node.layout_node_id, { active: true, actual_bounds: { ...node.target_bounds, x: node.target_bounds.x + (node.layout_node_id === 'b' ? 15 : 0) }, reference_bounds: reference, position_writes: [{ driver: node.layout_execution.position_driver, writer_id: node.layout_node_id }] }]));
  return { nodes, snapshots };
}

test('虚拟组活动轴暂缓整体居中，未接管成员仍保持其基准参照', () => {
  const { nodes, snapshots } = fixture();
  const before = JSON.stringify(nodes);
  const actual = nodes.map((node) => ({ ...node, target_bounds: snapshots.get(node.layout_node_id).actual_bounds }));
  const errors = [];
  const projected = projectActivePositionCentering(actual, nodes, snapshots, errors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  validateCenterAlignmentNodes(projected, errors, 'projected', { width: 100, height: 100 });
  assert.deepEqual(errors, []);
  assert.equal(JSON.stringify(nodes), before);
  snapshots.get('a').actual_bounds.x += 2;
  projectActivePositionCentering(actual, nodes, snapshots, errors, 'fixture', (a, b) => Math.abs(a - b) < 1e-6);
  assert.match(errors.join(), /未接管的组合/);
});

test('仅声明行为、非活动或多写入者都不能获得活动轴豁免', () => {
  const { nodes, snapshots } = fixture();
  const moving = nodes[1]; const actual = snapshots.get('b');
  assert.deepEqual(activePositionAxes(moving, actual), ['horizontal']);
  assert.deepEqual(activePositionAxes(moving, { ...actual, active: false }), []);
  assert.deepEqual(activePositionAxes(moving, { ...actual, position_writes: [{ driver: 'ANIMATION' }, { driver: 'REFLOW' }] }), []);
  assert.deepEqual(activePositionAxes({ ...moving, layout_execution: { position_driver: 'REFLOW' } }, actual), []);
});
