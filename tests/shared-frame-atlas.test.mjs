/** 对照三栈原始图片图集实现，验证共享执行算法及原生合同边界。 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildSharedFrameAtlasCapability } from '../scripts/migration/shared-frame-atlas.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const STACKS = { cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' };

/** 从只读源仓库构造与真实迁移一致的最小计划。 */
function actualPlans() {
  return Object.entries(STACKS).map(([stack, skill]) => {
    const prefix = `skills/${skill}/scripts/`;
    const entries = new Map(['images-to-atlas.mjs', 'frame-atlas-core.mjs', 'image-frame-source.mjs'].map((name) => [prefix + name, { destination: `skills/${stack}-domain-contracts/resources/frame-animation/scripts/${name}` }]));
    const path = resolve(ROOT, '..', `${stack}-skills`, prefix, 'images-to-atlas.mjs');
    return { stack, entries, sourceBuffers: new Map([[`${prefix}images-to-atlas.mjs`, readFileSync(path)]]) };
  });
}

/** 提供纯内存的图像和输出依赖，既能比较报告也不会写入用户项目。 */
function createFixture(stack, optionsCapture) {
  class VideoAtlasError extends Error {}
  const writes = [];
  const source = { fps: 10, duration_ms: 200, loop: true, canvas: { width: 2, height: 2 }, frames: [0, 1].map((index) => ({ index, game_time_ms: index * 100, image: { file: `${index}.png` } })) };
  const files = new Map(source.frames.map(({ image }) => [image.file, { absolutePath: image.file, bytes: Buffer.from('frame') }]));
  const core = {
    VideoAtlasError, isObject: (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)), nonEmptyString: (value) => typeof value === 'string' && value.trim().length > 0,
    samePath: (a, b) => a === b,
    normalizeCommonAtlasOptions: (_input, defaults) => { optionsCapture.push(defaults); return { width: 2, height: 2, region: null, anchor: null, maxAtlasWidth: 100, maxAtlasHeight: 100, animationKey: 'walk', textureKey: 'hero', loop: true, removeBackground: false, runtimeBinding: { file: 'bound.png' }, runtimeUrl: '/hero.png' }; },
    preflightAtlasOutputs: async () => {}, processAtlasFrame: async () => ({ contentRect: { x: 0, y: 0, width: 2, height: 2 }, image: Buffer.from('image') }),
    requireStableContentRect: () => {}, composeHorizontalAtlas: async () => Buffer.from('atlas'), sha256Bytes: () => 'sha', relativeUrl: () => 'sheet.png', renderAtlasPreview: () => 'preview', writeAtlasOutputs: async (items) => { writes.push(items); },
    createCocosAtlasContract: () => ({ technology: 'cocos' }), createPhaserAtlasContract: () => ({ technology: 'phaser' }), createThreeJSAtlasContract: () => ({ technology: 'threejs' }),
  };
  return { core, writes, readImageFrameSource: async () => ({ manifestPath: `manifest-${stack}.json`, manifestSha256: 'sha', source, files }) };
}

/** 只重定向原始源码的两个技术依赖，真实算法本身不变。 */
async function loadOriginal(bytes, fixture, stack) {
  const key = `__frame_atlas_test_${stack}`;
  globalThis[key] = fixture;
  const names = Object.keys(fixture.core);
  const coreText = names.map((name) => `export const ${name} = globalThis[${JSON.stringify(key)}].core[${JSON.stringify(name)}];`).join('\n');
  const sourceText = `export const readImageFrameSource = globalThis[${JSON.stringify(key)}].readImageFrameSource;`;
  const coreUrl = `data:text/javascript;base64,${Buffer.from(coreText).toString('base64')}`;
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(sourceText).toString('base64')}`;
  const raw = bytes.toString('utf8').replace(/\r\n/g, '\n');
  const guardPath = 'const currentFile = resolve(fileURLToPath(import.meta.url));';
  const guardInvoked = 'const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;';
  assert.equal(raw.split(guardPath).length, 2, '原始 CLI 路径检查必须唯一');
  assert.equal(raw.split(guardInvoked).length, 2, '原始 CLI 调用检查必须唯一');
  assert.equal(raw.split('} from "./frame-atlas-core.mjs";').length, 2);
  assert.equal(raw.split('from "./image-frame-source.mjs";').length, 2);
  // data URL 不能用 fileURLToPath；只替换守卫变量，完整保留文件尾部和所有可观察导出。
  const rewritten = raw.replace(guardPath, 'const currentFile = "__isolated_source__";').replace(guardInvoked, 'const invokedFile = null;')
    .replace('} from "./frame-atlas-core.mjs";', `} from ${JSON.stringify(coreUrl)};`).replace('from "./image-frame-source.mjs";', `from ${JSON.stringify(sourceUrl)};`);
  return import(`data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`);
}

/** 隔离适配器只替换真实依赖位置，验证栈专属 CLI 和公共工厂共同工作。 */
async function loadAdapter(content, fixture, factory, stack) {
  const key = `__frame_atlas_adapter_${stack}`;
  globalThis[key] = { fixture, factory };
  const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const core = moduleUrl(Object.keys(fixture.core).map((name) => `export const ${name} = globalThis[${JSON.stringify(key)}].fixture.core[${JSON.stringify(name)}];`).join('\n'));
  const source = moduleUrl(`export const readImageFrameSource = globalThis[${JSON.stringify(key)}].fixture.readImageFrameSource;`);
  const factoryUrl = moduleUrl(`export const createImageAtlasTools = globalThis[${JSON.stringify(key)}].factory;`);
  const direct = moduleUrl('export const isDirectEntry = () => false;');
  let rewritten = content;
  for (const [suffix, target] of [['/direct-entry.mjs', direct], ['/frame-atlas-core.mjs', core], ['/image-frame-source.mjs', source], ['/images-to-atlas.mjs', factoryUrl]]) {
    const matches = [...rewritten.matchAll(/from "([^"]+)";/g)].filter((match) => match[1].endsWith(suffix));
    assert.equal(matches.length, 1, `适配器必须唯一引用 ${suffix}`);
    rewritten = rewritten.replace(matches[0][0], `from ${JSON.stringify(target)};`);
  }
  const guardPath = 'const currentFile = resolve(fileURLToPath(import.meta.url));';
  const guardInvoked = 'const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;';
  assert.equal(rewritten.split(guardPath).length, 2, '适配入口路径检查必须唯一');
  assert.equal(rewritten.split(guardInvoked).length, 2, '适配入口调用检查必须唯一');
  rewritten = rewritten.replace(guardPath, 'const currentFile = "__isolated_source__";').replace(guardInvoked, 'const invokedFile = null;');
  return import(moduleUrl(rewritten));
}

test('三栈真实来源与共享执行在成功和异常路径上保持一致', async (t) => {
  if (Object.entries(STACKS).some(([stack, skill]) => !existsSync(resolve(ROOT, '..', `${stack}-skills`, 'skills', skill, 'scripts/images-to-atlas.mjs')))) return t.skip('需要三个只读源仓库');
  const plans = actualPlans();
  const capability = buildSharedFrameAtlasCapability(plans);
  const shared = await import(`data:text/javascript;base64,${Buffer.from(capability.content).toString('base64')}`);
  for (const [index, [stack]] of Object.entries(STACKS).entries()) {
    const oldOptions = []; const newOptions = [];
    const oldFixture = createFixture(stack, oldOptions); const newFixture = createFixture(stack, newOptions);
    const source = plans[index].sourceBuffers.values().next().value;
    const oldModule = await loadOriginal(source, oldFixture, stack);
    const contract = { cocos: ['createCocosAtlasContract', 'cc', 'cocos-images-to-atlas', 'cocos-image-atlas/2'], phaser: ['createPhaserAtlasContract', 'phaser', 'phaser4-images-to-atlas', 'phaser4-image-atlas/1'], threejs: ['createThreeJSAtlasContract', 'threejs', 'threejs-images-to-atlas', 'threejs-image-atlas/1'] }[stack];
    const tools = shared.createImageAtlasTools({ ...newFixture, contractMethod: contract[0], contractKey: contract[1], toolName: contract[2], schema: contract[3], temporaryPrefix: `${stack}-image-atlas-`, includeRuntimeBinding: stack === 'threejs' });
    const adapter = await loadAdapter(capability.sources[index].adapterContent, newFixture, shared.createImageAtlasTools, stack);
    const input = { projectRoot: ROOT, sourceManifest: 'source.json', outputSheet: 'atlas.png', outputPreview: 'atlas.html' };
    assert.deepEqual(await tools.imagesToAtlas(input), await oldModule.imagesToAtlas(input), stack);
    assert.deepEqual(newOptions, oldOptions, `${stack} 选项及项目根`);
    assert.deepEqual(newFixture.writes, oldFixture.writes, `${stack} 图集、报告和预览输出`);
    assert.deepEqual(Object.keys(adapter).sort(), Object.keys(oldModule).sort(), `${stack} 公开 API`);
    assert.match(adapter.imagesAtlasHelp(), /按需生成播放网页/, `${stack} CLI 帮助`);
    assert.deepEqual(adapter.parseImagesAtlasArgs(['--width', '24', '--no-remove-background']), oldModule.parseImagesAtlasArgs(['--width', '24', '--no-remove-background']));
    assert.deepEqual(await adapter.imagesToAtlas(input), await oldModule.imagesToAtlas(input), `${stack} 完整适配器报告`);
    assert.deepEqual(newFixture.writes, oldFixture.writes, `${stack} 完整适配器输出`);
    const { outputPreview, ...withoutPreview } = input;
    const report = await adapter.imagesToAtlas(withoutPreview);
    assert.equal(Object.hasOwn(report.artifacts, 'preview'), false, `${stack} 默认不声明预览`);
    assert.equal(newFixture.writes.at(-1).length, 2, `${stack} 默认只输出图集和报告`);
    for (const invalid of ['', null, undefined]) await assert.rejects(adapter.imagesToAtlas({ ...withoutPreview, outputPreview: invalid }), /非空路径/);
    for (const invalid of [null, {}, { sourceManifest: 'source.json' }, { ...input, outputSheet: 'invalid.jpeg' }]) {
      const actualError = await tools.imagesToAtlas(invalid).then(() => null, (error) => error);
      const originalError = await oldModule.imagesToAtlas(invalid).then(() => null, (error) => error);
      assert.equal(actualError?.constructor, newFixture.core.VideoAtlasError);
      assert.equal(originalError?.constructor, oldFixture.core.VideoAtlasError);
      assert.equal(actualError.message, originalError.message, `${stack} 错误信息`);
    }
    delete globalThis[`__frame_atlas_test_${stack}`];
    delete globalThis[`__frame_atlas_adapter_${stack}`];
  }
});

test('任何未审核源差异与无效目标均拒绝生成', async (t) => {
  if (Object.entries(STACKS).some(([stack, skill]) => !existsSync(resolve(ROOT, '..', `${stack}-skills`, 'skills', skill, 'scripts/images-to-atlas.mjs')))) return t.skip('需要三个只读源仓库');
  const plans = actualPlans();
  const capability = buildSharedFrameAtlasCapability(plans);
  assert.equal(capability.sources.length, 3);
  assert.ok(capability.sources.every((source) => source.adapterContent.length < 8000));
  const changed = plans[1].sourceBuffers.keys().next().value;
  plans[1].sourceBuffers.set(changed, Buffer.from(plans[1].sourceBuffers.get(changed).toString('utf8').replace('source.frames', 'source.otherFrames')));
  assert.throws(() => buildSharedFrameAtlasCapability(plans), /未经审核差异/);
  const simultaneous = actualPlans();
  for (const plan of simultaneous) {
    const key = plan.sourceBuffers.keys().next().value;
    const source = plan.sourceBuffers.get(key).toString('utf8').replace('basename, dirname, extname, join, resolve', 'basename, dirname, extname, join, resolve, sep');
    plan.sourceBuffers.set(key, Buffer.from(source));
  }
  assert.throws(() => buildSharedFrameAtlasCapability(simultaneous), /导入或前缀声明/);
  const declaration = actualPlans();
  for (const plan of declaration) {
    const key = plan.sourceBuffers.keys().next().value;
    const source = plan.sourceBuffers.get(key).toString('utf8').replace('function normalizeImageAtlasPaths(', 'const injected = true;\nfunction normalizeImageAtlasPaths(');
    plan.sourceBuffers.set(key, Buffer.from(source));
  }
  assert.throws(() => buildSharedFrameAtlasCapability(declaration), /导入或前缀声明/);
  const singleExtra = actualPlans();
  const firstKey = singleExtra[0].sourceBuffers.keys().next().value;
  const extra = '\nexport function newSourceFeature() { return "present"; }\n';
  singleExtra[0].sourceBuffers.set(firstKey, Buffer.concat([singleExtra[0].sourceBuffers.get(firstKey), Buffer.from(extra)]));
  assert.throws(() => buildSharedFrameAtlasCapability(singleExtra), /公开导出|CLI 尾部/);
  const fixture = createFixture('cocos', []);
  const original = await loadOriginal(singleExtra[0].sourceBuffers.get(firstKey), fixture, 'cocos');
  assert.equal(original.newSourceFeature(), 'present', '原始对照必须保留文件尾部新增的可观察导出');
  delete globalThis.__frame_atlas_test_cocos;
  const allExtra = actualPlans();
  for (const plan of allExtra) {
    const key = plan.sourceBuffers.keys().next().value;
    plan.sourceBuffers.set(key, Buffer.concat([plan.sourceBuffers.get(key), Buffer.from(extra)]));
  }
  assert.throws(() => buildSharedFrameAtlasCapability(allExtra), /公开导出|CLI 尾部/);
  const tailDeclaration = actualPlans();
  for (const plan of tailDeclaration) {
    const key = plan.sourceBuffers.keys().next().value;
    plan.sourceBuffers.set(key, Buffer.concat([plan.sourceBuffers.get(key), Buffer.from('\nconst newSourceTail = true;\n')]));
  }
  assert.throws(() => buildSharedFrameAtlasCapability(tailDeclaration), /CLI 尾部/);
  const unsafe = actualPlans();
  unsafe[0].entries.values().next().value.destination = 'skills/../outside.mjs';
  assert.throws(() => buildSharedFrameAtlasCapability(unsafe), /路径无效/);
});

test('CLI 保留全部源导入，公共算法拒绝依赖模块上下文', async (t) => {
  if (Object.entries(STACKS).some(([stack, skill]) => !existsSync(resolve(ROOT, '..', `${stack}-skills`, 'skills', skill, 'scripts/images-to-atlas.mjs')))) return t.skip('需要三个只读源仓库');
  const plans = actualPlans();
  // 三栈同时增加对既有导入的使用，适配器必须与原始 CLI 返回完全一致。
  for (const plan of plans) {
    const key = plan.sourceBuffers.keys().next().value;
    const source = plan.sourceBuffers.get(key).toString('utf8').replace('export function imagesAtlasHelp() {', 'export function imagesAtlasHelp() { if (!nonEmptyString(basename("/tmp/scene.png")) || currentFile !== "__isolated_source__" || invokedFile !== null) throw new Error("missing import"); return basename("/tmp/scene.png");');
    plan.sourceBuffers.set(key, Buffer.from(source));
  }
  const capability = buildSharedFrameAtlasCapability(plans);
  const shared = await import(`data:text/javascript;base64,${Buffer.from(capability.content).toString('base64')}`);
  for (const [index, [stack]] of Object.entries(STACKS).entries()) {
    const fixture = createFixture(stack, []);
    const original = await loadOriginal(plans[index].sourceBuffers.values().next().value, fixture, stack);
    const adapter = await loadAdapter(capability.sources[index].adapterContent, fixture, shared.createImageAtlasTools, stack);
    assert.equal(original.imagesAtlasHelp(), 'scene.png');
    assert.equal(adapter.imagesAtlasHelp(), original.imagesAtlasHelp(), `${stack} CLI 原导入`);
    delete globalThis[`__frame_atlas_test_${stack}`];
    delete globalThis[`__frame_atlas_adapter_${stack}`];
  }
  for (const expression of ['fileURLToPath(import.meta.url)', 'import.meta.url', 'import("./dependent.mjs")', '__dirname', '__filename', 'currentFile', 'invokedFile']) {
    const changed = actualPlans();
    for (const plan of changed) {
      const key = plan.sourceBuffers.keys().next().value;
      const source = plan.sourceBuffers.get(key).toString('utf8').replace('export async function imagesToAtlas(input = {}) {', `export async function imagesToAtlas(input = {}) { const context = ${expression};`);
      plan.sourceBuffers.set(key, Buffer.from(source));
    }
    assert.throws(() => buildSharedFrameAtlasCapability(changed), /模块上下文/, expression);
  }
});
