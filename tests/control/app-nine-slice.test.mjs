import assert from 'node:assert/strict';
import test from 'node:test';
import { collectAppNineSliceNodes, validateAppLayoutNineSlices, validateAppNineSliceMeasurements, validateAppNineSliceMinimums, validateAppNineSlicePlan } from '../../skills/app-workflow-control/scripts/runtime/app-nine-slice.mjs';

/** 制作真实值形状的协议数据，避免把测试样本当成实际采集。 */
function fixture() {
  const slice = { implementation: 'custom', sourcePath: 'assets/panel.png', sourceSize: { width: 30, height: 24 }, border: { left: 4, right: 5, top: 3, bottom: 4 }, minimumSize: { width: 20, height: 16 } };
  const target = { nodeId: 'panel', conditionId: 'phone', slice };
  const sample = { nodeId: 'panel', conditionId: 'phone', runtimeNodeId: 'screen.panel', sourcePath: slice.sourcePath, sourceSize: slice.sourceSize, border: slice.border, scale: 1, transformScaleX: 1, transformScaleY: 1, displaySize: { width: 20, height: 16 } };
  return { slice, target, sample };
}

test('九宫格实际倍率必须严格为数字 1，源帧与显示框的中心必须为正', () => {
  const { slice, target, sample } = fixture();
  assert.doesNotThrow(() => validateAppNineSlicePlan(slice, slice.sourcePath, '计划'));
  assert.doesNotThrow(() => validateAppNineSliceMeasurements([target], [sample], '运行'));
  for (const scale of [undefined, '1', 1.000000001, 0.5, 2]) {
    assert.throws(() => validateAppNineSliceMeasurements([target], [{ ...sample, scale }], '运行'), /倍率/);
  }
  for (const displaySize of [{ width: 9, height: 16 }, { width: 20, height: 7 }]) {
    assert.throws(() => validateAppNineSliceMeasurements([target], [{ ...sample, displaySize }], '运行'), /中心/);
  }
  assert.throws(() => validateAppNineSliceMeasurements([target], [{ ...sample, transformScaleX: 2 }], '运行'), /变换倍率/);
  assert.throws(() => validateAppNineSliceMeasurements([target], [{ ...sample, border: { ...sample.border, left: 3 } }], '运行'), /不一致/);
});

test('各消费者必须有最小宽高的实际样本，普通节点无需切片', () => {
  const { slice, sample } = fixture();
  const entries = collectAppNineSliceNodes({ nodes: [{ id: 'content' }, { id: 'panel', nineSlice: slice }] }, '项目');
  assert.equal(entries.length, 1);
  assert.doesNotThrow(() => validateAppLayoutNineSlices(entries, [sample], '运行'));
  assert.throws(() => validateAppLayoutNineSlices(entries, [], '运行'), /缺少实际运行读数/);
  assert.throws(() => validateAppNineSliceMinimums(entries, [{ ...sample, displaySize: { width: 21, height: 17 } }], '运行'), /最小显示框/);
  assert.throws(() => validateAppLayoutNineSlices(entries, [{ ...sample, displaySize: { width: 19, height: 16 } }], '运行'), /小于冻结的最小尺寸/);
  const narrow = { ...sample, displaySize: { width: 20, height: 21 } };
  const short = { ...sample, conditionId: 'landscape', displaySize: { width: 30, height: 16 } };
  assert.doesNotThrow(() => validateAppLayoutNineSlices(entries, [narrow, short], '运行'));
  const wrong = { ...sample, conditionId: 'other', nodeId: 'other' };
  assert.throws(() => validateAppLayoutNineSlices(entries, [wrong], '运行'), /未绑定/);
});
