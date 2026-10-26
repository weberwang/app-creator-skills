import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applySharedCapabilities, buildSharedVisualCapabilities } from '../scripts/migration/shared-modules.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STACKS = Object.freeze({
  cocos: { repository: 'cocos-skills', workflow: 'cocos-game-workflow-control', assets: 'cocos-game-asset-integration', domain: 'cocos-domain-contracts' },
  phaser: { repository: 'phaser-skills', workflow: 'phaser4-game-workflow-control', assets: 'phaser4-game-asset-integration', domain: 'phaser-domain-contracts' },
  threejs: { repository: 'threejs-skills', workflow: 'threejs-game-workflow-control', assets: 'threejs-game-asset-integration', domain: 'threejs-domain-contracts' },
});
const VISUAL_MODULES = Object.freeze([
  'visual-atomic-contract.mjs',
  'visual-imagegen-format.mjs',
  'visual-human-review-contract.mjs',
  'global-visual-consistency-contract.mjs',
  'orientation-validation-scope.mjs',
  'visual-file-gate.mjs',
  'path-matcher.mjs',
  'workflow-dpr-contract.mjs',
  'display-layer-planning-contract.mjs',
  'visual-validation-policy.mjs',
]);

/** 计算测试中用于断言来源和生成结果的 SHA-256。 */
function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** 以公共真源搭建隔离计划，默认测试不要求 checkout 五个外部源仓库。 */
function makePlans({ mutate } = {}) {
  return Object.entries(STACKS).map(([stack, paths]) => {
    const entries = new Map();
    const sourceBuffers = new Map();
    const filenames = [...VISUAL_MODULES, 'effect_image_font.mjs'];
    for (const filename of filenames) {
      const isFont = filename === 'effect_image_font.mjs';
      const sourcePrefix = isFont ? paths.assets : paths.workflow;
      const sourcePath = `skills/${sourcePrefix}/scripts/${filename}`;
      const adapterPrefix = isFont ? paths.assets : paths.domain;
      const adapterDestination = `skills/${adapterPrefix}/scripts/${filename}`;
      const canonicalPath = isFont
        ? 'skills/app-domain-toolkit/assets/effect-image-font.mjs'
        : `skills/app-domain-toolkit/scripts/visual/${filename}`;
      let sourceBuffer = readFileSync(resolve(REPOSITORY_ROOT, ...canonicalPath.split('/')));
      if (mutate?.stack === stack && mutate.filename === filename) sourceBuffer = Buffer.concat([sourceBuffer, Buffer.from('\n// drift')]);
      entries.set(sourcePath, { destination: adapterDestination, sourceSha256: null });
      sourceBuffers.set(sourcePath, sourceBuffer);
    }
    return { stack, entries, sourceBuffers };
  });
}

/** 创建只写临时目录的安全目标解析器，避免测试影响工作区或源仓库。 */
function temporaryWriter(root) {
  const resolveDestination = (destination) => {
    const target = resolve(root, ...destination.split('/'));
    const relativeTarget = relative(root, target);
    if (relativeTarget === '..' || relativeTarget.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(relativeTarget)) {
      throw new Error(`测试目标越出临时目录：${destination}`);
    }
    return target;
  };
  const destinationHash = (destination) => {
    const target = resolveDestination(destination);
    try { return digest(readFileSync(target)); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  return { resolveDestination, destinationHash };
}

test('三栈专业入口完整转发唯一公共真源的全部 API', async () => {
  const plans = makePlans();
  const capabilities = buildSharedVisualCapabilities(plans);
  assert.equal(capabilities.length, 11);
  assert.equal(new Set(capabilities.map((capability) => capability.implementation)).size, 11);
  assert.equal(capabilities.find((capability) => capability.id === 'browser-game-domain-path-matcher').reason.includes('授权路径匹配器'), true);
  assert.equal(capabilities.find((capability) => capability.id === 'workflow-dpr-contract').scope, 'browser-game');
  assert.equal(capabilities.find((capability) => capability.id === 'visual-validation-policy').scope, 'browser-game');

  for (const capability of capabilities) {
    const canonicalPath = resolve(REPOSITORY_ROOT, ...capability.implementation.split('/'));
    const canonical = await import(pathToFileURL(canonicalPath).href);
    for (const source of capability.sources) {
      const adapterPath = resolve(REPOSITORY_ROOT, ...source.adapterDestination.split('/'));
      const adapter = await import(pathToFileURL(adapterPath).href);
      assert.deepEqual(Object.keys(adapter).sort(), Object.keys(canonical).sort(), `${capability.id} 保留完整导出集`);
      for (const exportName of Object.keys(canonical)) assert.strictEqual(adapter[exportName], canonical[exportName], `${capability.id}.${exportName} 指向唯一公共实现`);
    }
  }

  const font = (await import(pathToFileURL(resolve(REPOSITORY_ROOT, 'skills/app-domain-toolkit/assets/effect-image-font.mjs')).href)).EFFECT_IMAGE_FONT_PROVENANCE;
  assert.equal(font.glyph_count, 7540);
  assert.equal(font.license, 'SIL Open Font License 1.1');
});

test('共享源字节漂移和对已生成真源的手改都会被拒绝', (t) => {
  assert.throws(() => buildSharedVisualCapabilities(makePlans({ mutate: { stack: 'phaser', filename: 'visual-file-gate.mjs' } })), /源字节不完全一致/);

  const plans = makePlans();
  const capabilities = buildSharedVisualCapabilities(plans);
  const root = mkdtempSync(join(tmpdir(), 'app-creator-shared-safety-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = [];
  for (const capability of capabilities) for (const source of capability.sources) {
    const original = Buffer.from(capability.content);
    const target = resolve(root, ...source.adapterDestination.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, original);
    files.push({ stack: source.stack, sourcePath: source.sourcePath, destination: source.adapterDestination, sourceSha256: source.sourceSha256, destinationSha256: digest(original), transforms: [] });
  }
  const writer = temporaryWriter(root);
  const first = applySharedCapabilities({ capabilities, files, previousHashes: new Map(), ...writer, sha256: digest });
  assert.equal(first.generatedFiles.length, 11);
  assert.equal(first.sharedCapabilities.length, 11);
  assert.ok(first.generatedFiles.every((record) => record.sourceOrigins.length === 3));
  assert.ok(first.sharedCapabilities.every((capability) => capability.sources.length === 3));
  const previousHashes = new Map(first.generatedFiles.map((record) => [record.path, record.destinationSha256]));
  const editedImplementation = resolve(root, ...capabilities[0].implementation.split('/'));
  writeFileSync(editedImplementation, Buffer.concat([capabilities[0].content, Buffer.from('\n// user edit') ]));
  assert.throws(
    () => applySharedCapabilities({ capabilities, files, previousHashes, ...writer, sha256: digest }),
    /拒绝覆盖/,
  );
});

test('技术栈原生渲染合同继续保留各自引擎的专业行为', async () => {
  const expectedEngineNames = { cocos: 'Cocos', phaser: 'Phaser', threejs: 'ThreeJS' };
  for (const [stack, paths] of Object.entries(STACKS)) {
    const path = resolve(REPOSITORY_ROOT, `skills/${paths.domain}/scripts/native-render-contract.mjs`);
    const module = await import(pathToFileURL(path).href);
    const errors = module.validateNativeRenderContract({}, {}).join('\n');
    assert.match(errors, new RegExp(expectedEngineNames[stack]));
  }
});
