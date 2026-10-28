/** 使用真实 PNG 与来源清单验证三栈共享图集工厂的按需预览交付。 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { buildSharedFrameAtlasCapability } from '../scripts/migration/shared-frame-atlas.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const execute = promisify(execFile);
const STACKS = { cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' };

/** 构造真实来源计划，使临时测试始终调用本次生成的工厂而不是旧仓库产物。 */
function sourcePlans() {
  return Object.entries(STACKS).map(([stack, skill]) => {
    const prefix = `skills/${skill}/scripts/`;
    const names = ['images-to-atlas.mjs', 'frame-atlas-core.mjs', 'image-frame-source.mjs'];
    const entries = new Map(names.map((name) => [prefix + name, { destination: `skills/${stack}-domain-contracts/resources/frame-animation/scripts/${name}` }]));
    const sourceFile = resolve(ROOT, '..', `${stack}-skills`, prefix, names[0]);
    if (!existsSync(sourceFile)) throw new Error(`缺少只读图集来源：${stack}`);
    return { stack, entries, sourceBuffers: new Map([[prefix + names[0], readFileSync(sourceFile)]]) };
  });
}

/** 隔离模块依赖仍指向实际已安装的原生 codec；工厂入口单独指向临时产物。 */
function rebaseImports(text, original, select) {
  return text.replace(/\bfrom\s+(["'])(\.\.?\/[^"']+)\1/g, (_match, quote, name) => {
    const target = select(name) ?? pathToFileURL(resolve(dirname(original), name)).href;
    return `from ${quote}${target}${quote}`;
  });
}

/** 将真实输出测试附到原生来源夹具，复用已验证的 PNG 和完整 manifest。 */
function packerCase(stack) {
  const binding = stack === 'threejs' ? ', runtimeBinding: { kind: "public", deployment_base: "/" }' : '';
  return `
test("真实图片图集默认无网页，显式播放时生成并绑定 HTML", async () => {
  const fixture = await createFixtureRoot();
  try {
    const directory = dirname(join(fixture.root, fixture.contract.spritesheet.file));
    const outputSheet = join(directory, "default-atlas.png");
    const outputReport = join(fixture.root, "reports/default-atlas.json");
    const common = {
      sourceManifest: join(fixture.root, fixture.sourceManifestFile), projectRoot: fixture.root,
      outputSheet, outputReport, width: 4, height: 4, removeBackground: false,
      region: fixture.contract.settings.region, anchor: fixture.contract.settings.anchor,
      animationKey: "hero-loop", textureKey: "hero-loop-texture"${binding}
    };
    const first = await imagesToAtlas(common);
    assert.equal(Object.hasOwn(first.artifacts, "preview"), false);
    assert.deepEqual((await readFile(outputSheet)).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(Object.hasOwn(JSON.parse(await readFile(outputReport, "utf8")).artifacts, "preview"), false);
    await assert.rejects(readFile(join(directory, "default-atlas.html")), (error) => error.code === "ENOENT");
    const outputPreview = join(fixture.root, "reports/animation-preview.html");
    const playbackReport = join(fixture.root, "reports/playback-atlas.json");
    const second = await imagesToAtlas({ ...common, outputSheet: join(directory, "playback-atlas.png"), outputReport: playbackReport, outputPreview });
    assert.equal(second.artifacts.preview.file, outputPreview);
    assert.equal(JSON.parse(await readFile(playbackReport, "utf8")).artifacts.preview.file, outputPreview);
    assert.match(await readFile(outputPreview, "utf8"), /<html\\b/i);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
`;
}

for (const [stack, prefix] of Object.entries({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' })) {
  test(`${stack} 使用真实来源图与 codec 按需生成播放页`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), `optional-image-atlas-${stack}-`));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const capability = buildSharedFrameAtlasCapability(sourcePlans());
    const factoryPath = join(directory, 'shared-images-to-atlas.mjs');
    await writeFile(factoryPath, capability.content);
    const adapterPath = join(directory, 'native-images-to-atlas.mjs');
    const adapter = capability.sources.find((item) => item.stack === stack);
    const nativePath = join(ROOT, adapter.adapterDestination);
    let factoryImports = 0;
    const adapterText = rebaseImports(adapter.adapterContent, nativePath, (name) => {
      if (!name.endsWith('/app-domain-toolkit/scripts/animation/images-to-atlas.mjs')) return null;
      factoryImports += 1;
      return pathToFileURL(factoryPath).href;
    });
    assert.equal(factoryImports, 1);
    await writeFile(adapterPath, adapterText);
    const testPath = join(directory, 'packer.test.mjs');
    const originalTest = join(ROOT, `skills/${prefix}-game-asset-integration/scripts/image-frame-animation-workflow-contract.test.mjs`);
    const source = await readFile(originalTest, 'utf8');
    let packerImports = 0;
    const rebased = rebaseImports(source, originalTest, (name) => {
      if (!name.endsWith('/frame-animation/scripts/images-to-atlas.mjs')) return null;
      packerImports += 1;
      return pathToFileURL(adapterPath).href;
    });
    assert.equal(packerImports, 1);
    await writeFile(testPath, `${rebased.trimEnd()}\n${packerCase(stack)}`);
    // 子进程是独立测试，不继承父 Node test 的私有上下文。
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const { stdout } = await execute(process.execPath, ['--test', '--test-reporter=spec', '--test-name-pattern=真实图片图集默认无网页', testPath], { windowsHide: true, env: childEnv, maxBuffer: 4 * 1024 * 1024 });
    assert.match(stdout, /真实图片图集默认无网页/);
    assert.match(stdout, /fail 0/);
  });
}
