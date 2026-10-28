/** 验证共享居中算法保留两栈根边界合同、导出与异常语义。 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedUiAlignmentCapability } from '../scripts/migration/shared-ui-alignment.mjs';

const STACKS = Object.freeze({ cocos: 'cocos-game-ui-layout', threejs: 'threejs-game-ui-layout' });
const SOURCE_ROOT = join(import.meta.dirname, '..', '..');

/** 读取真实的已审查源字节，并用改名后的目标模拟后续目录整合。 */
function loadPlans() {
  return Object.entries(STACKS).map(([stack, skill]) => {
    const entries = new Map();
    const sourceBuffers = new Map();
    for (const name of ['center-alignment', 'layout-root-bounds']) {
      const sourcePath = `skills/${skill}/scripts/${name}.mjs`;
      const sourceFile = join(SOURCE_ROOT, `${stack}-skills`, ...sourcePath.split('/'));
      entries.set(sourcePath, { destination: `skills/${stack}-domain-contracts/layout/${name}.mjs` });
      sourceBuffers.set(sourcePath, readFileSync(sourceFile));
    }
    return { stack, entries, sourceBuffers };
  });
}

/** 临时写入生成文件，不修改真实工作区与源仓库。 */
function writeOutput(root, relativePath, content) {
  const path = join(root, ...relativePath.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

/** 构造依赖安全区根边界的中心节点。 */
function safeAreaNode(snapshot = false) {
  return {
    layout_node_id: 'action', parent_layout_node_id: 'safe-area',
    axis_alignment: { horizontal: 'center', vertical: 'center' },
    target_bounds: { x: 0, y: 0, width: 20, height: 10 },
    ...(snapshot ? { parent_target_bounds: { x: 20, y: 10, width: 160, height: 80 } } : {}),
  };
}

test('缺少来源、目标越界与重复栈必须拒绝生成', () => {
  assert.throws(() => buildSharedUiAlignmentCapability([]), /来源或根边界依赖缺失/u);
  assert.throws(() => buildSharedUiAlignmentCapability([{ stack: 'cocos' }, { stack: 'cocos' }]), /重复/u);
  const sourcePath = 'skills/cocos-game-ui-layout/scripts/center-alignment.mjs';
  const invalid = { stack: 'cocos', entries: new Map([[sourcePath, { destination: 'skills/../../outside.mjs' }]]), sourceBuffers: new Map([[sourcePath, Buffer.from('source')]]) };
  assert.throws(() => buildSharedUiAlignmentCapability([invalid]), /目标路径无效/u);
});

test('两栈注入各自根边界并与原始行为一致', async (t) => {
  let plans;
  try { plans = loadPlans(); }
  catch (error) { if (error.code === 'ENOENT') { t.skip('未提供两份源仓库，无法运行真实源码对照'); return; } throw error; }
  const root = mkdtempSync(join(tmpdir(), 'shared-ui-alignment-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const capability = buildSharedUiAlignmentCapability(plans);
  assert.equal(capability.implementation, 'skills/app-domain-toolkit/scripts/layout/center-alignment.mjs');
  assert.doesNotMatch(capability.content, /(?:cocos|threejs)-/u);
  writeOutput(root, capability.implementation, capability.content);
  const modules = new Map();
  for (const source of capability.sources) {
    const skill = STACKS[source.stack];
    const rootSource = `skills/${skill}/scripts/layout-root-bounds.mjs`;
    const plan = plans.find((item) => item.stack === source.stack);
    writeOutput(root, plan.entries.get(rootSource).destination, plan.sourceBuffers.get(rootSource));
    const adapter = writeOutput(root, source.adapterDestination, source.adapterContent);
    const actual = await import(pathToFileURL(adapter).href);
    const original = await import(pathToFileURL(join(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/'))).href);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(original).sort());
    const canvas = { width: 200, height: 100 };
    const nodes = [safeAreaNode(true)];
    assert.deepEqual(actual.resolveCenteredLayoutNodes(nodes, canvas), original.resolveCenteredLayoutNodes(nodes, canvas));
    assert.deepEqual(actual.validateCenterAlignmentNodes(nodes, [], 'ui', canvas), original.validateCenterAlignmentNodes(nodes, [], 'ui', canvas));
    assert.deepEqual(actual.normalizeCenterAlignment({ horizontal: 'center', vertical: 'top' }, undefined), original.normalizeCenterAlignment({ horizontal: 'center', vertical: 'top' }, undefined));
    assert.throws(() => actual.normalizeCenterAlignment({ horizontal: 'left', vertical: 'top' }, { horizontal: { mode: 'strict' } }), TypeError);
    modules.set(source.stack, actual);
  }
  // Three.js 必须提供测量快照，Cocos 则允许使用完整视口：共享后不能抹平该差异。
  assert.doesNotThrow(() => modules.get('cocos').resolveCenteredLayoutNodes([safeAreaNode()], { width: 200, height: 100 }));
  assert.throws(() => modules.get('threejs').resolveCenteredLayoutNodes([safeAreaNode()], { width: 200, height: 100 }), /safe-area 根快照/u);
});

test('任何源算法或栈专有根边界漂移都阻止共享', (t) => {
  let plans;
  try { plans = loadPlans(); }
  catch (error) { if (error.code === 'ENOENT') { t.skip('未提供两份源仓库，无法检查真实摘要'); return; } throw error; }
  const center = 'skills/cocos-game-ui-layout/scripts/center-alignment.mjs';
  plans[0].sourceBuffers.set(center, Buffer.concat([plans[0].sourceBuffers.get(center), Buffer.from('\n// 修改\n')]));
  assert.throws(() => buildSharedUiAlignmentCapability(plans), /发生漂移/u);
  plans = loadPlans();
  const bounds = 'skills/threejs-game-ui-layout/scripts/layout-root-bounds.mjs';
  plans[1].sourceBuffers.set(bounds, Buffer.from('export function resolveLayoutRootBounds() {}'));
  assert.throws(() => buildSharedUiAlignmentCapability(plans), /发生漂移/u);
});
