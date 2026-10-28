/** 验证帧来源共享计划保留三个技术栈的输入合同及懒加载行为。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedFrameSourceCapability } from '../scripts/migration/shared-frame-source.mjs';
import { adaptImageFrameSourceTest } from '../scripts/migration/source-test-adapter.mjs';

const SPECS = {
  cocos: { skill: 'cocos-frame-animation', schema: 'cocos-image-frame-source/1', sourceSharp: '../../cocos-game-workflow-control/scripts/runtime/image-runtime.mjs' },
  phaser: { skill: 'phaser4-frame-animation', schema: 'phaser4-image-frame-source/1', sourceSharp: 'sharp' },
  threejs: { skill: 'threejs-frame-animation', schema: 'threejs-image-frame-source/1', sourceSharp: 'sharp' },
};

/** 构建小型可执行源，避免测试依赖外部源仓库和实际游戏工程。 */
function sourceFixture(spec) {
  return Buffer.from([
    'import { createHash } from "node:crypto";',
    'import { readFile, realpath, stat } from "node:fs/promises";',
    'import { isAbsolute, relative, resolve, sep } from "node:path";',
    '',
    '/** 图片帧来源清单的稳定 schema 标识。 */',
    `export const IMAGE_FRAME_SOURCE_SCHEMA = "${spec.schema}";`,
    'export function imageFrameTimeMatches(actual, expected) { return Math.abs(actual - expected) < 0.001; }',
    'export function validateImageFrameSource(source) { return source.schema === IMAGE_FRAME_SOURCE_SCHEMA ? [] : [`schema 必须是 ${IMAGE_FRAME_SOURCE_SCHEMA}`]; }',
    'export class ImageFrameSourceError extends Error {}',
    `export async function readImageFrameSource() { return (await import("${spec.sourceSharp}")).default; }`,
    '',
  ].join('\n'));
}

/** 以变化后的栈目录构造计划，确保生成器不依赖历史技能目录。 */
function plansFor(buffers = null) {
  return Object.entries(SPECS).map(([stack, spec]) => {
    const sourcePath = `skills/${spec.skill}/scripts/image-frame-source.mjs`;
    return { stack, entries: new Map([[sourcePath, { destination: `skills/${stack}-domain-contracts/animation/image-frame-source.mjs` }]]), sourceBuffers: new Map([[sourcePath, buffers?.[stack] ?? sourceFixture(spec)]]) };
  });
}

/** 写出模拟迁移产物到临时目录，不触及仓库工作区。 */
function writeOutput(root, relative, content) {
  const file = join(root, ...relative.split('/'));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

test('逐栈绑定 schema、公开 API 和懒加载桥，目标路径可以改变', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'shared-frame-source-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const capability = buildSharedFrameSourceCapability(plansFor());
  assert.equal(capability.implementation, 'skills/app-domain-toolkit/scripts/animation/image-frame-source.mjs');
  writeOutput(root, capability.implementation, capability.content);
  // 静态导入时故意不创建任一 Sharp 桥，以确认依赖仍在实际读取时才加载。
  for (const source of capability.sources) {
    const output = writeOutput(root, source.adapterDestination, source.adapterContent);
    const module = await import(pathToFileURL(output).href);
    assert.deepEqual(Object.keys(module).sort(), ['IMAGE_FRAME_SOURCE_SCHEMA', 'ImageFrameSourceError', 'imageFrameTimeMatches', 'readImageFrameSource', 'validateImageFrameSource'].sort());
    assert.equal(module.IMAGE_FRAME_SOURCE_SCHEMA, SPECS[source.stack].schema);
    assert.deepEqual(module.validateImageFrameSource({ schema: SPECS[source.stack].schema }), []);
    assert.match(module.validateImageFrameSource({ schema: 'wrong' })[0], /schema/u);
    assert.equal(module.imageFrameTimeMatches(10, 10.0005), true);
    await assert.rejects(module.readImageFrameSource(), /Cannot find module|找不到模块/u);
  }
});

test('拒绝来源缺失、重复技术栈及 schema 或其他算法漂移', () => {
  const missing = plansFor();
  missing[1].sourceBuffers.clear();
  assert.throws(() => buildSharedFrameSourceCapability(missing), /缺少已登记/u);
  assert.throws(() => buildSharedFrameSourceCapability([...plansFor(), plansFor()[0]]), /重复/u);
  const drift = plansFor();
  const [path, bytes] = [...drift[2].sourceBuffers.entries()][0];
  drift[2].sourceBuffers.set(path, Buffer.from(`${bytes}\n// 意外行为变动\n`));
  assert.throws(() => buildSharedFrameSourceCapability(drift), /以外的差异/u);
  const changedSchema = plansFor();
  const [schemaPath, schemaBytes] = [...changedSchema[0].sourceBuffers.entries()][0];
  changedSchema[0].sourceBuffers.set(schemaPath, Buffer.from(schemaBytes.toString().replace(SPECS.cocos.schema, 'unexpected/1')));
  assert.throws(() => buildSharedFrameSourceCapability(changedSchema), /schema/u);
});

test('旧来源测试精确适配公共依赖并拒绝测试结构漂移', (t) => {
  const sourceRoot = join(import.meta.dirname, '..', '..');
  const root = mkdtempSync(join(tmpdir(), 'shared-frame-source-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const capability = buildSharedFrameSourceCapability(plansFor());
  writeOutput(root, capability.implementation, capability.content);
  for (const source of capability.sources) {
    let original;
    try {
      original = readFileSync(join(sourceRoot, `${source.stack}-skills`, 'skills', SPECS[source.stack].skill, 'scripts/image-frame-source.test.mjs'), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') { t.skip('源仓库不在此安装环境'); return; }
      throw error;
    }
    const adapted = adaptImageFrameSourceTest(original);
    assert.equal((adapted.match(/^test\(/gm) ?? []).length, (original.match(/^test\(/gm) ?? []).length);
    assert.match(adapted, /const isolatedFactory = resolve\(dirname\(isolatedModule\), specifier\)/u);
    assert.throws(() => adaptImageFrameSourceTest(original.replace('"image-frame-source.mjs");', '"drifted.mjs");')), /必须恰好出现一次/u);
    const isolatedCase = adapted.match(/test\("静态导入图片来源合同不要求安装 Sharp", async \(t\) => \{[\s\S]*?\r?\n\}\);/u)?.[0];
    assert.ok(isolatedCase, '源测试中的无 Sharp 隔离用例必须保留');
    const output = writeOutput(root, source.adapterDestination, source.adapterContent);
    const testcase = join(dirname(output), 'isolation.test.mjs');
    writeFileSync(testcase, [
      'import assert from "node:assert/strict";',
      'import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";',
      'import { tmpdir } from "node:os";',
      'import { dirname, join, resolve } from "node:path";',
      'import { spawnSync } from "node:child_process";',
      'import { pathToFileURL } from "node:url";',
      'import test from "node:test";',
      isolatedCase,
      '',
    ].join('\n'));
    // 只复制公共工厂，不创建 Sharp 桥，以实际子进程确认静态导入不会加载它。
    const run = spawnSync(process.execPath, ['--test', testcase], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.equal(run.status, 0, `${source.stack}: ${run.stdout}\n${run.stderr}`);
  }
});

test('本机存在三源时，生成器核对真实源算法并保持原始 schema', async (t) => {
  const sourceRoot = join(import.meta.dirname, '..', '..');
  const buffers = {};
  try {
    for (const [stack, spec] of Object.entries(SPECS)) buffers[stack] = readFileSync(join(sourceRoot, `${stack}-skills`, 'skills', spec.skill, 'scripts/image-frame-source.mjs'));
  } catch (error) {
    if (error.code === 'ENOENT') { t.skip('源仓库不在此安装环境'); return; }
    throw error;
  }
  const root = mkdtempSync(join(tmpdir(), 'shared-frame-real-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const capability = buildSharedFrameSourceCapability(plansFor(buffers));
  writeOutput(root, capability.implementation, capability.content);
  const sharpBridge = new URL('../skills/app-skill-runtime/sharp.mjs', import.meta.url).href;
  writeOutput(root, 'skills/app-skill-runtime/sharp.mjs', `export { default } from ${JSON.stringify(sharpBridge)};\n`);
  writeOutput(root, 'skills/cocos-domain-contracts/scripts/runtime/image-runtime.mjs', `export { default } from ${JSON.stringify(sharpBridge)};\n`);
  const sharp = (await import(sharpBridge)).default;
  const image = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  const changedImage = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 30, g: 20, b: 10, alpha: 1 } } }).png().toBuffer();
  const digest = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  for (const source of capability.sources) {
    const output = writeOutput(root, source.adapterDestination, source.adapterContent);
    const result = await import(pathToFileURL(output).href);
    const originalFile = join(sourceRoot, `${source.stack}-skills`, ...source.sourcePath.split('/'));
    const original = await import(pathToFileURL(originalFile).href);
    assert.deepEqual(Object.keys(result).sort(), Object.keys(original).sort());
    for (const candidate of [{}, { schema: SPECS[source.stack].schema }, { schema: 'wrong', frames: [] }]) {
      assert.deepEqual(result.validateImageFrameSource(candidate), original.validateImageFrameSource(candidate));
    }
    assert.equal(result.imageFrameTimeMatches(333.333333, 1000 / 3), original.imageFrameTimeMatches(333.333333, 1000 / 3));
    const project = join(root, `project-${source.stack}`);
    const frames = [];
    const imageRefs = [0, 1].map((index) => ({ file: `art/${index}.png`, sha256: digest(image) }));
    for (let index = 0; index < 2; index += 1) {
      writeOutput(project, imageRefs[index].file, image);
      const parents = index ? [{ index: 0, ...imageRefs[0] }] : [];
      const record = Buffer.from(JSON.stringify({ prompt: `生成第 ${index} 帧`, reference_images: parents.map(({ file, sha256 }) => ({ file, sha256 })), output_image: imageRefs[index] }));
      const recordPath = `records/${index}.json`;
      writeOutput(project, recordPath, record);
      frames.push({ index, game_time_ms: index * 500, kind: 'endpoint', parents, source_image: imageRefs[index], image: imageRefs[index], generation_record: { file: recordPath, sha256: digest(record) } });
    }
    const manifest = { schema: SPECS[source.stack].schema, canvas: { width: 2, height: 2 }, duration_ms: 1000, fps: 2, loop: false, frames };
    const manifestFile = writeOutput(project, 'source.json', JSON.stringify(manifest));
    assert.deepEqual(result.validateImageFrameSource(manifest), []);
    const loaded = await result.readImageFrameSource(manifestFile, { projectRoot: project });
    assert.equal(loaded.source.frames.length, 2);
    assert.deepEqual(loaded.files.get('art/0.png').bytes, image);
    writeOutput(project, imageRefs[0].file, changedImage);
    // 旧合同不把陈旧摘要当成拒绝条件；安全边界由实际图片读取与项目路径约束控制。
    const reread = await result.readImageFrameSource(manifestFile, { projectRoot: project });
    assert.deepEqual(reread.files.get('art/0.png').bytes, changedImage);
    const traversal = structuredClone(manifest);
    traversal.frames[0].image.file = '../outside.png';
    assert.match(result.validateImageFrameSource(traversal).join('\n'), /相对路径|目录跳转|项目目录/u);
  }
});
