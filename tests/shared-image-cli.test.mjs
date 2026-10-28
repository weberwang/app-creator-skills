import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedCliPlan } from '../scripts/migration/shared-cli-modules.mjs';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const STACKS = Object.freeze({
  cocos: Object.freeze({ assetSkill: 'cocos-game-asset-integration', frameSkill: 'cocos-frame-animation', frameRoot: 'cocos-domain-contracts', technologyName: 'Cocos', schema: 'cocos-image-inbetween-plan/1' }),
  phaser: Object.freeze({ assetSkill: 'phaser4-game-asset-integration', frameSkill: 'phaser4-frame-animation', frameRoot: 'phaser-domain-contracts', technologyName: 'Phaser', schema: 'phaser4-image-inbetween-plan/1' }),
  threejs: Object.freeze({ assetSkill: 'threejs-game-asset-integration', frameSkill: 'threejs-frame-animation', frameRoot: 'threejs-domain-contracts', technologyName: 'ThreeJS', schema: 'threejs-image-inbetween-plan/1' }),
});
const CAPABILITY_PATHS = Object.freeze([
  'skills/app-domain-toolkit/scripts/image/transparent-raster.mjs',
  'skills/app-domain-toolkit/scripts/image/remove-background-local.mjs',
  'skills/app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs',
]);

/** 列出真实仓库中缺失的共享产物或专业入口，行为测试不通过源代码回退。 */
function missingPublicRuntimeFiles() {
  const required = [
    ...CAPABILITY_PATHS,
    ...Object.values(STACKS).flatMap((stack) => [
      `skills/${stack.assetSkill}/scripts/transparent-raster.mjs`,
      `skills/${stack.assetSkill}/scripts/remove-background-local.mjs`,
      `skills/${stack.frameRoot}/resources/frame-animation/scripts/image-inbetween-plan.mjs`,
    ]),
    'skills/app-asset-workflow/scripts/png-raster.mjs',
  ];
  return required.filter((file) => !existsSync(path.join(REPOSITORY_ROOT, file)));
}

/** 判断本机是否具备迁移源，以便在发布产物环境跳过仅需源仓库的生成器校验。 */
function hasSourceFixtures() {
  const sourceRoot = path.resolve(REPOSITORY_ROOT, '..');
  return Object.entries(STACKS).every(([stackName, stack]) => (
    existsSync(path.join(sourceRoot, `${stackName}-skills`, 'skills', stack.assetSkill, 'scripts', 'transparent-raster.mjs'))
    && existsSync(path.join(sourceRoot, `${stackName}-skills`, 'skills', stack.assetSkill, 'scripts', 'remove-background-local.mjs'))
    && existsSync(path.join(sourceRoot, `${stackName}-skills`, 'skills', stack.frameSkill, 'scripts', 'image-inbetween-plan.mjs'))
  ));
}

/** 将平台无关的相对产物路径解析为本地绝对路径。 */
function runtimePath(root, relativePath) {
  return path.join(root, ...relativePath.split('/'));
}

/** 使用 Node 子进程验证旧专业入口仍保留直执行 CLI 行为。 */
function runCli(scriptPath, args, cwd) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8', windowsHide: true });
}

/** 创建具有纯色硬边外框与单像素主体的可预测 RGBA 测试 PNG。 */
function createHardEdgePixels(width = 3, height = 3) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = 0;
    pixels[offset + 1] = 255;
    pixels[offset + 2] = 0;
    pixels[offset + 3] = 255;
  }
  const center = ((height >> 1) * width + (width >> 1)) * 4;
  pixels[center] = 220;
  pixels[center + 1] = 30;
  pixels[center + 2] = 40;
  return pixels;
}

test('三栈图片工具共用真实算法并保留专业入口差异', async (t) => {
  const missing = missingPublicRuntimeFiles();
  assert.deepEqual(missing, [], `真实公共实现或专业入口缺失：${missing.join(', ')}`);
  const root = REPOSITORY_ROOT;
  const codec = await import(pathToFileURL(runtimePath(root, 'skills/app-asset-workflow/scripts/png-raster.mjs')).href);
  await t.test('透明度像素统计与深浅预览保持原有产物字段', async () => {
      const modules = await Promise.all(Object.values(STACKS).map(async (stack) => import(pathToFileURL(runtimePath(root, `skills/${stack.assetSkill}/scripts/transparent-raster.mjs`)).href)));
      const expectedExports = [
        'assertTransparencyPreviewPathsAvailable',
        'assertTransparencyPreviewPathsSafe',
        'inspectTransparencyPixels',
        'writeTransparencyPreviews',
      ].sort();
      for (const module of modules) assert.deepEqual(Object.keys(module).sort(), expectedExports);
      const image = { width: 2, height: 2, pixels: Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 255, 255, 255, 255]) };
      const stats = modules[0].inspectTransparencyPixels(image);
      assert.deepEqual(stats, { transparent_pixels: 2, partial_alpha_pixels: 1, visible_pixels: 3, bounds: { x: 0, y: 0, width: 2, height: 2 } });
      for (const module of modules.slice(1)) assert.deepEqual(module.inspectTransparencyPixels(image), stats);

      const directory = mkdtempSync(path.join(tmpdir(), 'transparent-raster-'));
      try {
        const sourceFile = path.join(directory, 'candidate.png');
        const previewDirectory = path.join(directory, 'previews');
        writeFileSync(sourceFile, codec.encodePngRgba(image.width, image.height, image.pixels));
        const preview = await modules[0].writeTransparencyPreviews({ sourceFile, previewDirectory, candidateSha256: 'sha256:candidate', reservedPaths: [] });
        assert.equal(preview.candidate_sha256, 'sha256:candidate');
        assert.equal(preview.source_file, sourceFile);
        assert.equal(preview.light.background_color, '#F2E9DF');
        assert.equal(preview.dark.background_color, '#16202E');
        assert.equal(codec.decodePngRgba(readFileSync(preview.light.file)).pixels[3], 255);
        assert.equal(codec.decodePngRgba(readFileSync(preview.dark.file)).pixels[3], 255);
        const collidingPreview = path.join(previewDirectory, 'candidate.light.png');
        assert.throws(() => modules[0].assertTransparencyPreviewPathsSafe({ sourceFile, previewDirectory, reservedPaths: [collidingPreview] }), /透明预览路径不得覆盖/);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    await t.test('Web 去背 pipeline 保留硬边门禁、专业报告字段与三栈技术名', async () => {
      const directory = mkdtempSync(path.join(tmpdir(), 'background-removal-'));
      const publicApi = await import(pathToFileURL(runtimePath(root, 'skills/app-asset-workflow/scripts/remove-background-local.mjs')).href);
      try {
        const sourceFile = path.join(directory, 'source.png');
        writeFileSync(sourceFile, codec.encodePngRgba(3, 3, createHardEdgePixels()));
        for (const [stackName, stack] of Object.entries(STACKS)) {
          const scriptPath = runtimePath(root, `skills/${stack.assetSkill}/scripts/remove-background-local.mjs`);
          const module = await import(pathToFileURL(scriptPath).href);
          assert.deepEqual(Object.keys(module).sort(), [
            'BackgroundRemovalError',
            'LOCAL_BACKGROUND_REMOVAL_OPERATION',
            'LOCAL_BACKGROUND_REMOVAL_SCHEMA',
            'LOCAL_BACKGROUND_REMOVAL_TOOL',
            'LOCAL_BACKGROUND_REMOVAL_TOOL_VERSION',
            'LOCAL_DIRECT_ALPHA_OPERATION',
            'countAlphaPixels',
            'parseBackgroundColor',
            'parseColorTolerance',
            'removeBackgroundLocal',
            'removeConnectedBackground',
            'runRemoveBackgroundCli',
            'sha256Bytes',
          ].sort());
          for (const name of ['BackgroundRemovalError', 'sha256Bytes', 'parseBackgroundColor', 'countAlphaPixels']) {
            assert.equal(module[name], publicApi[name], `${stackName} ${name} 应直接来自公共真源`);
          }
          assert.notEqual(module.parseColorTolerance, publicApi.parseColorTolerance, 'Web 64 容差规则必须独立于公共通用容差');
          assert.notEqual(module.removeConnectedBackground, publicApi.removeConnectedBackground, 'Web API 需保留 64 容差策略薄 wrapper');
          assert.throws(() => module.parseColorTolerance(65), /0 到 64/);
          assert.equal(publicApi.parseColorTolerance(65), 65);
          const pixelImage = { width: 1, height: 1, pixels: Buffer.from([0, 255, 0, 255]) };
          assert.throws(() => module.removeConnectedBackground(pixelImage, { backgroundColor: '#00FF00', tolerance: 65 }), /0 到 64/);
          const sharedPixelOutput = module.removeConnectedBackground(pixelImage, { backgroundColor: '#00FF00', tolerance: 24 });
          const publicPixelOutput = publicApi.removeConnectedBackground(pixelImage, { backgroundColor: '#00FF00', tolerance: 24 });
          assert.deepEqual(sharedPixelOutput, publicPixelOutput);
          const outputFile = path.join(directory, `${stackName}-output.png`);
          const recordFile = path.join(directory, `${stackName}-record.json`);
          const previewDirectory = path.join(directory, `${stackName}-previews`);
          const args = [
            '--source', sourceFile,
            '--output', outputFile,
            '--background-color', '#00FF00',
            '--tolerance', '0',
            '--edge-profile', 'hard-edge',
            '--color-separation-verified',
            '--record', recordFile,
            '--preview-dir', previewDirectory,
            '--candidate-sha256', `sha256:${stackName}`,
          ];
          const help = runCli(scriptPath, ['--help'], root);
          assert.equal(help.status, 0, help.stderr);
          assert.match(help.stdout, /用法：node remove-background-local\.mjs/);

          const result = runCli(scriptPath, args, root);
          assert.equal(result.status, 0, result.stderr || result.stdout);
          const record = JSON.parse(result.stdout);
          assert.equal(record.schema, 'background-removal-local/1');
          assert.equal(record.status, 'PASS');
          assert.equal(record.edge_profile, 'hard-edge');
          assert.equal(record.color_separation_verified, true);
          assert.equal(record.solid_background_check.status, 'passed');
          assert.equal(record.transparency_preview.candidate_sha256, `sha256:${stackName}`);
          assert.match(record.limitation, new RegExp(`${stack.technologyName} 特效路线`));
          assert.equal(JSON.parse(readFileSync(recordFile, 'utf8')).output_sha256, record.output_sha256);
          const decoded = codec.decodePngRgba(readFileSync(outputFile));
          assert.equal(decoded.width, 3);
          assert.equal(decoded.height, 3);
          assert.equal(decoded.pixels[3], 0);
          assert.equal(decoded.pixels[(4 * 4) + 3], 255);

          const invalidOutput = path.join(directory, `${stackName}-invalid.png`);
          const invalid = runCli(scriptPath, [
            '--source', sourceFile,
            '--output', invalidOutput,
            '--background-color', '#00FF00',
            '--tolerance', '0',
            '--color-separation-verified',
          ], root);
          assert.equal(invalid.status, 1);
          assert.match(invalid.stderr, /edge_profile='hard-edge'/);
          assert.equal(existsSync(invalidOutput), false);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    await t.test('补帧算法一致，schema、帮助和直接 CLI 按栈保留', async () => {
      let baseline;
      const directory = mkdtempSync(path.join(tmpdir(), 'image-inbetween-plan-'));
      try {
        for (const [stackName, stack] of Object.entries(STACKS)) {
          const module = await import(pathToFileURL(runtimePath(root, `skills/${stack.frameRoot}/resources/frame-animation/scripts/image-inbetween-plan.mjs`)).href);
          assert.deepEqual(Object.keys(module).sort(), [
            'createImageInbetweenPlan',
            'imageInbetweenPlanHelp',
            'parseImageInbetweenPlanArgs',
          ].sort());
          const options = { durationMs: 1000, fps: 4, loop: true, keyframes: [2, 1] };
          const plan = module.createImageInbetweenPlan(options);
          assert.equal(plan.schema, stack.schema);
          const { schema, ...body } = plan;
          if (baseline) assert.deepEqual(body, baseline);
          else baseline = body;
          assert.equal(plan.frame_count, 4);
          assert.equal(plan.steps.find((step) => step.index === 4).reference_only, true);
          assert.throws(() => module.createImageInbetweenPlan({ durationMs: 25_002_500, fps: 4 }), /2\.\.100000/);
          assert.throws(() => module.createImageInbetweenPlan({ ...options, keyframes: [1, 1] }), /关键帧索引重复/);
          assert.match(module.imageInbetweenPlanHelp(), new RegExp(stack.schema));

          const scriptPath = runtimePath(root, `skills/${stack.frameRoot}/resources/frame-animation/scripts/image-inbetween-plan.mjs`);
          const help = runCli(scriptPath, ['--help'], root);
          assert.equal(help.status, 0, help.stderr);
          assert.match(help.stdout, new RegExp(stack.schema));
          const outputPlan = path.join(directory, `${stackName}.json`);
          const args = ['--duration-ms', '1000', '--fps', '4', '--loop', '--keyframes', '1', '--output-plan', outputPlan];
          const success = runCli(scriptPath, args, root);
          assert.equal(success.status, 0, success.stderr || success.stdout);
          assert.equal(JSON.parse(readFileSync(outputPlan, 'utf8')).schema, stack.schema);
          const duplicate = runCli(scriptPath, args, root);
          assert.equal(duplicate.status, 1);
          assert.match(duplicate.stderr, /输出计划已存在，拒绝覆盖/);
          const invalid = runCli(scriptPath, ['--duration-ms', '1000', '--fps', '4', '--bad-flag'], root);
          assert.equal(invalid.status, 1);
          assert.match(invalid.stderr, /未知参数/);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

});

test('迁移计划复用已核验的像素真源并对源漂移拒绝生成', {
  skip: hasSourceFixtures() ? false : '源仓库缺失；此附加测试仅验证迁移生成器，公共产物行为测试仍必须运行',
}, () => {
  const sourceRoot = path.resolve(REPOSITORY_ROOT, '..');
  const plan = buildSharedCliPlan({ sourceRoot, repositoryRoot: REPOSITORY_ROOT });
  assert.equal(plan.capabilities.length, 3);
  const backgroundCapability = plan.capabilities.find((capability) => capability.id === 'web-background-removal');
  assert.ok(backgroundCapability.dependencies.includes('skills/app-asset-workflow/scripts/remove-background-local.mjs'));
  assert.match(backgroundCapability.reason, /共享像素填充算法与完全等价的公共纯 API/);
  assert.match(backgroundCapability.content, /sharedRemoveConnectedBackground\(image, \{ backgroundColor, tolerance \}\)/);
  assert.match(backgroundCapability.content, /tolerance 必须是 0 到 64 之间的有限数字/);
  assert.doesNotMatch(backgroundCapability.content, /const queue = new Int32Array\(total\)/);
  const temporarySources = mkdtempSync(path.join(tmpdir(), 'shared-image-source-drift-'));
  try {
    for (const capability of plan.capabilities) {
      assert.deepEqual(capability.stacks, Object.keys(STACKS));
      assert.equal(capability.sources.length, 3);
      for (const source of capability.sources) {
        const original = path.join(sourceRoot, `${source.stack}-skills`, ...source.sourcePath.split('/'));
        const sourceBytes = readFileSync(original);
        assert.equal(source.sourceSha256, createHash('sha256').update(sourceBytes).digest('hex'));
        assert.ok(source.adapterContent.endsWith('\n'));
        const destination = path.join(temporarySources, `${source.stack}-skills`, ...source.sourcePath.split('/'));
        mkdirSync(path.dirname(destination), { recursive: true });
        copyFileSync(original, destination);
      }
    }
    const changed = path.join(temporarySources, 'phaser-skills', 'skills', STACKS.phaser.assetSkill, 'scripts', 'remove-background-local.mjs');
    const originalChangedSource = readFileSync(changed, 'utf8');
    writeFileSync(changed, `${originalChangedSource}\n// unauthorized drift\n`);
    assert.throws(() => buildSharedCliPlan({ sourceRoot: temporarySources, repositoryRoot: REPOSITORY_ROOT }), /remove-background-local 三栈源码存在超出 limitation 技术名的差异/);
    writeFileSync(changed, originalChangedSource);

    const temporaryRepository = mkdtempSync(path.join(tmpdir(), 'shared-image-public-drift-'));
    try {
      const publicSource = path.join(REPOSITORY_ROOT, 'skills', 'app-asset-workflow', 'scripts', 'remove-background-local.mjs');
      const publicFixture = path.join(temporaryRepository, 'skills', 'app-asset-workflow', 'scripts', 'remove-background-local.mjs');
      mkdirSync(path.dirname(publicFixture), { recursive: true });
      const publicText = readFileSync(publicSource, 'utf8');
      writeFileSync(publicFixture, publicText.replace('this.name = "BackgroundRemovalError";', 'this.name = "ChangedBackgroundRemovalError";'));
      assert.throws(() => buildSharedCliPlan({ sourceRoot: temporarySources, repositoryRoot: temporaryRepository }), /BackgroundRemovalError 与公共去背真源不等价/);
    } finally {
      rmSync(temporaryRepository, { recursive: true, force: true });
    }
  } finally {
    rmSync(temporarySources, { recursive: true, force: true });
  }
});
