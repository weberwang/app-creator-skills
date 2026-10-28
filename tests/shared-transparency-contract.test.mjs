/** 验证透明生产公共工厂与三栈原始合同的接口和行为一致。 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedTransparencyContractCapability } from '../scripts/migration/shared-transparency-contract.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const STACKS = Object.freeze({ cocos: 'cocos-game-workflow-control', phaser: 'phaser4-game-workflow-control', threejs: 'threejs-game-workflow-control' });
const NAMES = Object.freeze(['TRANSPARENT_EDGE_PROFILES', 'TRANSPARENT_ROUTES', 'validateTransparencyPreview', 'validateTransparencyRoute']);
const IMPORT = `import { ${NAMES.join(', ')} } from "./transparent-route-contract.mjs";`;

/** 从只读源仓库构造与迁移器一致的原始内容与独立目标。 */
function actualPlans(t) {
  const plans = [];
  for (const [stack, skill] of Object.entries(STACKS)) {
    const prefix = `skills/${skill}/scripts/`;
    const sourceRoot = resolve(ROOT, '..', `${stack}-skills`, prefix);
    const source = `${prefix}visual-transparent-background-contract.mjs`;
    const dependency = `${prefix}transparent-route-contract.mjs`;
    if (!existsSync(resolve(sourceRoot, 'visual-transparent-background-contract.mjs')) || !existsSync(resolve(sourceRoot, 'transparent-route-contract.mjs'))) {
      t.skip('需要三个只读源仓库中的透明生产合同与路线依赖');
      return null;
    }
    plans.push({ stack, sourceRoot, entries: new Map([
      [source, { destination: `skills/${stack}-domain-contracts/scripts/visual-transparent-background-contract.mjs` }],
      [dependency, { destination: `skills/${stack}-domain-contracts/scripts/transparent-route-contract.mjs` }],
    ]), sourceBuffers: new Map([
      [source, readFileSync(resolve(sourceRoot, 'visual-transparent-background-contract.mjs'))],
      [dependency, readFileSync(resolve(sourceRoot, 'transparent-route-contract.mjs'))],
    ]) });
  }
  return plans;
}

/** 只重基源实现的唯一依赖路径，保留其余完整源码和所有导出。 */
async function loadOriginal(plan, dependencyUrl) {
  const content = readFileSync(resolve(plan.sourceRoot, 'visual-transparent-background-contract.mjs'), 'utf8');
  const index = content.indexOf(IMPORT);
  assert.notEqual(index, -1, `${plan.stack} 源合同缺少路线导入`);
  assert.equal(content.indexOf(IMPORT, index + IMPORT.length), -1, `${plan.stack} 源合同重复路线导入`);
  const rebased = content.slice(0, index) + `import { ${NAMES.join(', ')} } from ${JSON.stringify(dependencyUrl)};` + content.slice(index + IMPORT.length);
  return import(`data:text/javascript;base64,${Buffer.from(rebased).toString('base64')}`);
}

/** 将同步调用的值或错误规范化，确保比较错误类型与中文原因。 */
function observed(fn, args) {
  try { return { value: fn(...args) }; }
  catch (error) { return { errorName: error.name, message: error.message }; }
}

test('公共透明合同与三栈原始源码的导出、成功及错误行为一致', async (t) => {
  const plans = actualPlans(t);
  if (!plans) return;
  const capability = buildSharedTransparencyContractCapability(plans);
  const create = (await import(`data:text/javascript;base64,${Buffer.from(capability.content).toString('base64')}`)).createTransparencyProductionContract;
  for (const plan of plans) {
    const target = resolve(ROOT, 'skills', `${plan.stack}-domain-contracts`, 'scripts', 'transparent-route-contract.mjs');
    const route = await import(pathToFileURL(target).href);
    const original = await loadOriginal(plan, pathToFileURL(target).href);
    const shared = create(Object.fromEntries(NAMES.map((name) => [name, route[name]])));
    assert.deepEqual(Object.keys(shared).sort(), Object.keys(original).sort(), plan.stack);
    assert.equal(shared.TRANSPARENT_BACKGROUND_STRATEGIES, route.TRANSPARENT_ROUTES);
    assert.equal(original.TRANSPARENT_BACKGROUND_STRATEGIES, route.TRANSPARENT_ROUTES);
    for (const [name, cases] of Object.entries({
      normalizeSourceBackgroundColor: [[], ['#aabbcc'], ['rgb(2, 3, 255)'], ['rgb(300,0,0)'], [null]],
      buildSolidBackgroundPrompt: [[], ['#123456'], ['invalid']],
      requiresTransparentBackgroundProduction: [[{ alpha: true }, { image_generation_required: true }], [{ alpha: false }, {}], [null, null]],
      isBackgroundRemovalProduction: [[], [{ transparency_strategy: 'background-removal' }], [null]],
      expressesSolidBackgroundProduction: [['opaque solid color #00ff00 no checkerboard'], ['', '#00FF00'], [null]],
      expressesBackgroundRemovalProduction: [['不透明纯色 #00FF00，禁止棋盘格'], [null]],
      expressesDirectAlphaProduction: [['真实透明，禁止棋盘格'], ['opaque'], [null]],
      validateTransparentExpectedAssetContract: [[{}, {}], [null, {}], [{ alpha: true }, { image_generation_required: true }]],
      validateTransparentBackgroundProductionRecord: [[{}, {}, {}], [null, null, {}], [{ transparency_strategy: 'direct-alpha' }, { alpha: true }, { image_generation_required: true }]],
      validateTransparentOutputMetadata: [[{}, {}, {}], [null, { alpha: true }, { image_generation_required: true }]],
      validateTransparentBackgroundContract: [[], [{}], [{ asset: {}, contract: {}, generation: {}, expectedAsset: {}, metadata: {} }], [{ asset: null, contract: { image_generation_required: true }, generation: {}, expectedAsset: { alpha: true } }]],
    })) for (const args of cases) assert.deepEqual(observed(shared[name], args), observed(original[name], args), `${plan.stack}/${name}`);
  }
});

test('任何来源、路线依赖或目标身份漂移均阻止生成', (t) => {
  let plans = actualPlans(t);
  if (!plans) return;
  const original = buildSharedTransparencyContractCapability(plans);
  assert.equal(original.sources.length, 3);
  assert.ok(original.sources.every((entry) => entry.adapterContent.includes('transparent-route-contract.mjs')));
  const sourcePath = `skills/${STACKS.cocos}/scripts/visual-transparent-background-contract.mjs`;
  plans[0].sourceBuffers.set(sourcePath, Buffer.concat([plans[0].sourceBuffers.get(sourcePath), Buffer.from('\n// 漂移')]));
  assert.throws(() => buildSharedTransparencyContractCapability(plans), /源字节漂移/);
  plans = actualPlans(t);
  const dependencyPath = `skills/${STACKS.phaser}/scripts/transparent-route-contract.mjs`;
  plans[1].sourceBuffers.set(dependencyPath, Buffer.concat([plans[1].sourceBuffers.get(dependencyPath), Buffer.from('\n// 漂移')]));
  assert.throws(() => buildSharedTransparencyContractCapability(plans), /路线依赖漂移/);
  plans = actualPlans(t);
  plans[2].entries.get(`skills/${STACKS.threejs}/scripts/transparent-route-contract.mjs`).destination = 'skills/cocos-domain-contracts/scripts/transparent-route-contract.mjs';
  assert.throws(() => buildSharedTransparencyContractCapability(plans), /目标路径无效/);
  plans = actualPlans(t);
  plans[1].sourceBuffers.delete(`skills/${STACKS.phaser}/scripts/visual-transparent-background-contract.mjs`);
  assert.throws(() => buildSharedTransparencyContractCapability(plans), /缺失/);
});
