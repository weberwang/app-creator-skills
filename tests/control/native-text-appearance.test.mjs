import test from 'node:test';
import assert from 'node:assert/strict';
import { collectFigmaTextAppearance, collectLayoutTextAppearance, flutterTextStyle, validateNativeTextReadback } from '../../skills/app-workflow-control/scripts/runtime/native-text-appearance.mjs';

test('无文字的设计和布局跳过原生文字回读', () => {
  const design = { nodes: [{ id: 'root', type: 'FRAME', parentId: null }], stateId: 'default' };
  const source = { path: 'design.json', sha256: 'a'.repeat(64) };
  assert.deepEqual(collectFigmaTextAppearance([{ ref: source, snapshot: design }]), []);
  assert.deepEqual(collectLayoutTextAppearance({ nodes: [{ id: 'icon', textAppearance: null }] }, source, source), []);
  assert.equal(flutterTextStyle({ raw: { nodeType: 'FRAME', textVisual: null }, normalized: { typography: null } }), null);
  assert.doesNotThrow(() => validateNativeTextReadback('', {}, [], 'esp32', () => { throw new Error('不应读取证据'); }));
});

test('即使文字原始字段遗漏，显式排版目标仍须进行运行回读', () => {
  const target = flutterTextStyle({ raw: { nodeType: 'FRAME', textVisual: null }, normalized: { typography: { family: 'Example', size: { value: 18, unit: 'logical-px' } }, textFill: '#000000FF', textOpacity: { value: 1, unit: 'ratio' } } });
  assert.equal(target.fontFamily, 'Example');
  assert.deepEqual(target.fontSize, { value: 18, unit: 'logical-px' });
});

test('位图来源的待人工确认属性不冒充已冻结规格', () => {
  const source = { path: 'design.png', sha256: 'a'.repeat(64) };
  const layout = { nodes: [{ id: 'title', textAppearance: { sourceRef: source, stateId: 'default', fontFamily: 'Example', fontSize: 18,
    textFill: '#000000FF', textOpacity: 1, pending: { shadow: '位图无法核实阴影参数' } } }] };
  assert.throws(() => collectLayoutTextAppearance(layout, source, source), /title.*shadow.*位图无法核实/);
  assert.equal(collectLayoutTextAppearance(layout, source, source, { allowPending: true }).length, 1);
  layout.nodes[0].textAppearance.shadow = '猜测阴影';
  assert.throws(() => collectLayoutTextAppearance(layout, source, source, { allowPending: true }), /title.*shadow.*不能并存/);
  delete layout.nodes[0].textAppearance.shadow;
  layout.nodes[0].textAppearance.pending.shadow = '';
  assert.throws(() => collectLayoutTextAppearance(layout, source, source, { allowPending: true }), /title.*shadow.*缺少原因/);
  delete layout.nodes[0].textAppearance.pending;
  assert.equal(collectLayoutTextAppearance(layout, source, source).length, 1);
  layout.nodes[0].textAppearance.sourceRef = { path: 'old.png', sha256: 'b'.repeat(64) };
  assert.throws(() => collectLayoutTextAppearance(layout, source, source), /title.*确认稿来源/);
});
