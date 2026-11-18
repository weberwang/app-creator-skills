import assert from 'node:assert/strict';
import test from 'node:test';
import policy from '../skills/app-ui-layout/scripts/nine-slice-runtime.cjs';

const { validateNineSliceRuntime } = policy;

/** 不对称边距覆盖两轴和接近最小尺寸的边界情况。 */
function sample(overrides = {}) {
  return { scale: 1, sourceSize: { width: 20, height: 30 }, border: { left: 2, right: 7, top: 3, bottom: 8 }, displaySize: { width: 10, height: 12 }, ...overrides };
}

test('九宫格专用倍率须为严格的数字 1', () => {
  assert.deepEqual(validateNineSliceRuntime(sample()), []);
  for (const scale of [undefined, '1', 0, 1 - Number.EPSILON, 1 + Number.EPSILON, Infinity]) {
    assert.match(validateNineSliceRuntime(sample({ scale })).join('\n'), /严格等于数字 1/);
  }
  const noDedicatedScale = sample();
  delete noDedicatedScale.scale;
  assert.deepEqual(validateNineSliceRuntime(noDedicatedScale), []);
});

test('源帧和实际显示框的可拉伸中心均须两轴为正', () => {
  assert.deepEqual(validateNineSliceRuntime(sample({ displaySize: { width: 9.25, height: 11.25 } })), []);
  assert.match(validateNineSliceRuntime(sample({ displaySize: { width: 9, height: 15 } })).join('\n'), /显示框.*正宽高/);
  assert.match(validateNineSliceRuntime(sample({ displaySize: { width: 15, height: 11 } })).join('\n'), /显示框.*正宽高/);
  assert.match(validateNineSliceRuntime(sample({ sourceSize: { width: 9, height: 15 } })).join('\n'), /源帧.*正宽高/);
  assert.match(validateNineSliceRuntime(sample({ displaySize: undefined })).join('\n'), /实际正宽高/);
});
