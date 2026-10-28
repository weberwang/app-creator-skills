/** 验证共用相对布局策略的本体边界、真实父链及参照逃逸，避免各栈重复实现。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import policy from '../skills/app-ui-layout/scripts/relative-layout-policy.cjs';

const { validateRelativeLayoutNodes: validate } = policy;

/** 创建由实际父级决定默认参照的测试节点。 */
function node(id, parentId, changes = {}) {
  return { id, parentId, references: [parentId], mode: 'relative', floatingKind: null, ...changes };
}

/** 本体之外有真实宿主，方便检查内部节点能否逃回宿主或屏幕根。 */
function floating(kind = 'popup') {
  return [node('host', 'viewport'), node('body', 'host', { mode: 'absolute', floatingKind: kind, references: [] }),
    node('content', 'body'), node('button', 'content'), node('label', 'button')];
}

test('实际 safe-area 节点优先于同名稳定根，正常父级和兄弟相对关系可用', () => {
  const nodes = [node('safe-area', 'viewport'), node('root', 'safe-area'), node('title', 'root'),
    node('content', 'root', { references: ['title'] })];
  assert.deepEqual(validate(nodes), []);
  nodes[0].references = ['content'];
  assert.match(validate(nodes).join('\n'), /联合形成循环/);
});

test('三种浮层仅本体可独立，内部完整父链与相对参照仍通过', () => {
  for (const kind of ['popup', 'floating', 'toast']) assert.deepEqual(validate(floating(kind)), []);
  const nodes = floating();
  nodes[1].mode = 'relative';
  nodes[1].references = ['host'];
  assert.deepEqual(validate(nodes), []);
  nodes[3].references = ['label'];
  assert.match(validate(nodes).join('\n'), /联合形成循环/);
});

test('普通 absolute、未知模式、缺参照和未知本体类型均不能放行', () => {
  assert.match(validate([node('button', 'viewport', { mode: 'absolute' })]).join('\n'), /普通 UI 必须相对/);
  assert.match(validate([node('button', 'viewport', { mode: 'screen-absolute' })]).join('\n'), /只允许 relative 或 absolute/);
  assert.match(validate([node('button', 'viewport', { references: [] })]).join('\n'), /不能只声明 relative/);
  assert.match(validate([node('button', 'viewport', { floatingKind: 'overlay' })]).join('\n'), /本体类型/);
  assert.match(validate([node('safe-area', 'viewport', { mode: 'absolute', floatingKind: 'popup' })]).join('\n'), /安全区不能声明为浮层本体/);
});

test('浮层后代不能 absolute、再次声明本体或引用屏幕与外部祖先', () => {
  const absolute = floating();
  absolute[4].mode = 'absolute';
  assert.match(validate(absolute).join('\n'), /豁免不向后代传递/);
  for (const kind of ['popup', 'floating', 'toast']) {
    const nested = floating();
    nested[4].floatingKind = kind;
    nested[4].mode = 'absolute';
    assert.match(validate(nested).join('\n'), /不能再次声明本体/);
  }
  for (const reference of ['viewport', 'safe-area', 'host']) {
    const escaped = floating();
    escaped[4].references = [reference];
    assert.match(validate(escaped).join('\n'), /逃出本体/);
  }
});

test('内部合法兄弟和本体参照不会误判，外部分支仍拒绝', () => {
  const nodes = floating();
  nodes.push(node('counter', 'button', { references: ['label', 'body'] }));
  assert.deepEqual(validate(nodes), []);
  nodes.push(node('external', 'host'));
  nodes[5].references = ['external'];
  assert.match(validate(nodes).join('\n'), /逃出本体/);
});

test('缺失、重复与自引用真实节点不能用虚构父级或空图绕过', () => {
  assert.match(validate([]).join('\n'), /空图/);
  assert.match(validate([node('a', 'missing')]).join('\n'), /实际父级不存在/);
  assert.match(validate([node('a', 'viewport'), node('a', 'viewport')]).join('\n'), /身份重复/);
  assert.match(validate([node('a', 'a')]).join('\n'), /实际父级不能是自身/);
  assert.match(validate([node('a', 'viewport', { references: ['missing'] })]).join('\n'), /定位参照不存在/);
});

test('Flutter 固定合成根可由适配器提供，任意无效根配置拒绝', () => {
  assert.deepEqual(validate([node('page', 'safe_area')], { roots: ['viewport', 'safe_area'] }), []);
  assert.match(validate([node('page', 'safe_area')]).join('\n'), /实际父级不存在/);
  assert.match(validate([node('page', 'viewport')], { roots: ['viewport', 'viewport'] }).join('\n'), /稳定根配置无效/);
});
