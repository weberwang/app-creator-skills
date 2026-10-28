/** 对比真实三栈源码与公共工厂的进程、输出、异常和 CLI 行为。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import sharp from '../skills/app-skill-runtime/sharp.mjs';
import { buildSharedVideoAtlasCapability } from '../scripts/migration/shared-video-atlas.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKILLS = Object.freeze({ cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' });

/** 实际源字节和迁移目标独立提供，避免测试用实现自身生成测试输入。 */
async function actualPlans(t) {
  const plans = [];
  for (const [stack, skill] of Object.entries(SKILLS)) {
    const prefix = `skills/${skill}/scripts/`;
    const file = resolve(ROOT, '..', `${stack}-skills`, prefix, 'video-to-atlas.mjs');
    if (!existsSync(file)) { t.skip('需要三个只读源仓库'); return null; }
    plans.push({ stack, entries: new Map(['video-to-atlas.mjs', 'frame-atlas-core.mjs'].map((name) => [prefix + name, { destination: `skills/${stack}-domain-contracts/resources/frame-animation/scripts/${name}` }])), sourceBuffers: new Map([[prefix + 'video-to-atlas.mjs', await readFile(file)], [prefix + 'frame-atlas-core.mjs', await readFile(resolve(ROOT, '..', `${stack}-skills`, prefix, 'frame-atlas-core.mjs'))]]) });
  }
  return plans;
}

/** 对真实源只重基两个技术依赖；保留原始导出、CLI 和执行守卫。 */
function rebaseOriginal(source, stack, coreUrl, sharpUrl) {
  const sharpImport = stack === 'cocos' ? '../../cocos-game-workflow-control/scripts/runtime/image-runtime.mjs' : 'sharp';
  const core = 'from "./frame-atlas-core.mjs";';
  const image = `from "${sharpImport}";`;
  for (const token of [core, image]) assert.equal(source.split(token).length, 2, `源依赖必须唯一：${token}`);
  return source.replace(core, `from ${JSON.stringify(coreUrl)};`).replace(image, `from ${JSON.stringify(sharpUrl)};`);
}

/** 构造不启动 ffmpeg 的运行器，但实际写入 PNG 以覆盖图集处理和清理。 */
function fakeRunner(png) {
  return async (command, args) => {
    if (command === 'probe') return { exitCode: 0, stdout: JSON.stringify({ streams: [{ codec_type: 'video', width: 2, height: 2, duration: '0.2', avg_frame_rate: '10/1' }] }) };
    if (command === 'frames') {
      await writeFile(args.at(-1).replace('%08d', '00000000'), png);
      await writeFile(args.at(-1).replace('%08d', '00000001'), png);
      return { exitCode: 0, stdout: '' };
    }
    throw new Error(`意外的模拟命令：${command}`);
  };
}

test('三栈真实源与共享适配的全部公开 API、视频结果及进程错误一致', async (t) => {
  const plans = await actualPlans(t);
  if (!plans) return;
  const capability = buildSharedVideoAtlasCapability(plans);
  const directory = await mkdtemp(join(tmpdir(), 'shared-video-atlas-'));
  t.after(async () => await rm(directory, { recursive: true, force: true }));
  const factoryPath = join(directory, 'factory.mjs');
  await writeFile(factoryPath, capability.content);
  const factoryUrl = pathToFileURL(factoryPath).href;
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ff0000' } }).png().toBuffer();

  for (const [index, [stack]] of Object.entries(SKILLS).entries()) {
    const targetDir = resolve(ROOT, `skills/${stack}-domain-contracts/resources/frame-animation/scripts`);
    const coreUrl = pathToFileURL(join(targetDir, 'frame-atlas-core.mjs')).href;
    const entryUrl = pathToFileURL(resolve(ROOT, 'skills/app-skill-runtime/direct-entry.mjs')).href;
    const sharpPath = stack === 'cocos' ? 'skills/cocos-domain-contracts/scripts/runtime/image-runtime.mjs' : 'skills/app-skill-runtime/sharp.mjs';
    const sharpUrl = pathToFileURL(resolve(ROOT, sharpPath)).href;
    const originalPath = join(directory, `${stack}-original.mjs`);
    const adapterPath = join(directory, `${stack}-adapter.mjs`);
    const source = plans[index].sourceBuffers.values().next().value.toString('utf8');
    await writeFile(originalPath, rebaseOriginal(source, stack, coreUrl, sharpUrl));
    let adapter = capability.sources[index].adapterContent;
    for (const [suffix, target] of [['/direct-entry.mjs', entryUrl], ['/frame-atlas-core.mjs', coreUrl], ['/image-runtime.mjs', sharpUrl], ['/sharp.mjs', sharpUrl], ['/video-to-atlas.mjs', factoryUrl]]) {
      const matches = [...adapter.matchAll(/from "([^"]+)";/g)].filter((match) => match[1].endsWith(suffix));
      if (!matches.length) continue;
      assert.equal(matches.length, 1, `适配器依赖必须唯一：${suffix}`);
      adapter = adapter.replace(matches[0][0], `from ${JSON.stringify(target)};`);
    }
    await writeFile(adapterPath, adapter);
    const original = await import(pathToFileURL(originalPath).href);
    const shared = await import(pathToFileURL(adapterPath).href);
    assert.deepEqual(Object.keys(shared).sort(), Object.keys(original).sort(), stack);
    const contractName = { cocos: 'createCocosVideoAtlasContract', phaser: 'createPhaserVideoAtlasContract', threejs: 'createThreeJSVideoAtlasContract' }[stack];
    assert.equal(shared[contractName].name, original[contractName].name);
    assert.equal(shared[contractName].length, original[contractName].length);
    assert.match(shared.videoAtlasHelp(), /按需生成播放网页/);
    const oldCli = spawnSync(process.execPath, [originalPath, '--help'], { encoding: 'utf8', windowsHide: true });
    const newCli = spawnSync(process.execPath, [adapterPath, '--help'], { encoding: 'utf8', windowsHide: true });
    assert.equal(newCli.status, oldCli.status);
    assert.match(newCli.stdout, /按需生成播放网页/, `${stack} 命令行帮助`);
    assert.equal(newCli.stderr, oldCli.stderr);
    assert.deepEqual(shared.parseVideoAtlasArgs(['--fps', '10', '--no-loop']), original.parseVideoAtlasArgs(['--fps', '10', '--no-loop']));
    for (const input of [null, {}, { inputVideo: 'x', outputSheet: 'x.jpg' }]) {
      assert.throws(() => shared.normalizeVideoAtlasOptions(input), (error) => {
        try { original.normalizeVideoAtlasOptions(input); return false; } catch (expected) { return error.constructor === expected.constructor && error.message === expected.message; }
      });
    }
    const successArgs = ['-e', 'process.stdout.write("ok")'];
    const oldSuccess = await original.runExternalCommand(process.execPath, successArgs);
    const newSuccess = await shared.runExternalCommand(process.execPath, successArgs);
    assert.equal(newSuccess.stdout.toString(), oldSuccess.stdout.toString());
    assert.equal(newSuccess.exitCode, oldSuccess.exitCode);
    for (const args of [['-e', 'process.stderr.write("fail");process.exit(3)'], ['-e', 'throw new Error("failed")'], ['-e', 'process.kill(process.pid, "SIGTERM")']]) {
      const oldError = await original.runExternalCommand(process.execPath, args).then(() => null, (error) => error);
      const newError = await shared.runExternalCommand(process.execPath, args).then(() => null, (error) => error);
      assert.equal(newError.message, oldError.message);
      assert.equal(newError.constructor, oldError.constructor);
    }
    const invalidCommand = join(directory, `不存在的命令-${stack}`);
    const oldSpawnError = await original.runExternalCommand(invalidCommand, []).then(() => null, (error) => error);
    const newSpawnError = await shared.runExternalCommand(invalidCommand, []).then(() => null, (error) => error);
    assert.equal(newSpawnError.constructor, oldSpawnError.constructor);
    assert.equal(newSpawnError.message, oldSpawnError.message);
    const inputVideo = join(directory, `${stack}.mp4`);
    const outputSheet = join(directory, `${stack}.png`);
    const outputReport = join(directory, `${stack}.json`);
    const outputPreview = join(directory, `${stack}.html`);
    await writeFile(inputVideo, 'fake-video');
    const options = { inputVideo, outputSheet, outputReport, outputPreview, projectRoot: directory, fps: 10, commandRunner: fakeRunner(png), ffmpegPath: 'frames', ffprobePath: 'probe' };
    const oldReport = await original.videoToAtlas(options);
    const oldBytes = await Promise.all([outputSheet, outputReport, outputPreview].map((path) => readFile(path)));
    for (const path of [outputSheet, outputReport, outputPreview]) await rm(path);
    const newReport = await shared.videoToAtlas(options);
    assert.deepEqual(newReport, oldReport, `${stack} 完整报告`);
    const newBytes = await Promise.all([outputSheet, outputReport, outputPreview].map((path) => readFile(path)));
    assert.deepEqual(newBytes, oldBytes, `${stack} 三项产物`);
    for (const path of [outputSheet, outputReport, outputPreview]) await rm(path);
    const { outputPreview: ignored, ...withoutPreview } = options;
    const noPreview = await shared.videoToAtlas(withoutPreview);
    assert.equal(Object.hasOwn(noPreview.artifacts, 'preview'), false);
    assert.equal(existsSync(outputSheet), true);
    assert.equal(existsSync(outputReport), true);
    assert.equal(existsSync(outputPreview), false, `${stack} 默认不创建 HTML`);
    for (const invalid of ['', null, undefined]) assert.throws(() => shared.normalizeVideoAtlasOptions({ ...withoutPreview, outputPreview: invalid }), /非空路径/);
    // 抽帧失败后必须清理临时目录，且不得产生正式产物。
    for (const path of [outputSheet, outputReport]) await rm(path);
    for (const module of [original, shared]) {
      let frameDirectory;
      const failingRunner = async (command, args) => {
        if (command === 'probe') return { exitCode: 0, stdout: JSON.stringify({ streams: [{ codec_type: 'video', width: 2, height: 2, duration: '0.2' }] }) };
        frameDirectory = dirname(args.at(-1));
        await writeFile(args.at(-1).replace('%08d', '00000000'), png);
        throw new Error('模拟抽帧失败');
      };
      await assert.rejects(module.videoToAtlas({ ...options, commandRunner: failingRunner }), /模拟抽帧失败/);
      assert.ok(frameDirectory);
      assert.equal(existsSync(frameDirectory), false, `${stack} 失败后清除临时帧目录`);
      assert.equal(existsSync(outputSheet), false, `${stack} 失败后不写入正式图集`);
    }
  }
});

test('任何单栈或全栈源码漂移以及非法目标都会阻止共享', async (t) => {
  const plans = await actualPlans(t);
  if (!plans) return;
  const altered = plans.map((plan) => ({ ...plan, sourceBuffers: new Map(plan.sourceBuffers) }));
  const first = altered[0].sourceBuffers.keys().next().value;
  altered[0].sourceBuffers.set(first, Buffer.concat([altered[0].sourceBuffers.get(first), Buffer.from('\nexport const extra = 1;')]));
  assert.throws(() => buildSharedVideoAtlasCapability(altered), /源摘要漂移/);
  for (const plan of plans) {
    const key = plan.sourceBuffers.keys().next().value;
    plan.sourceBuffers.set(key, Buffer.concat([plan.sourceBuffers.get(key), Buffer.from('\nconst newGlobal = true;')]));
  }
  assert.throws(() => buildSharedVideoAtlasCapability(plans), /源摘要漂移/);
  const unsafe = await actualPlans(t);
  unsafe[0].entries.values().next().value.destination = 'skills/../outside.mjs';
  assert.throws(() => buildSharedVideoAtlasCapability(unsafe), /不能绑定其他技术栈领域资源/);
  const wrongStack = await actualPlans(t);
  wrongStack[0].entries.get('skills/cocos-frame-animation/scripts/frame-atlas-core.mjs').destination = 'skills/phaser-domain-contracts/resources/frame-animation/scripts/frame-atlas-core.mjs';
  assert.throws(() => buildSharedVideoAtlasCapability(wrongStack), /不能绑定其他技术栈领域资源/);
  const brokenContract = await actualPlans(t);
  const corePath = 'skills/phaser4-frame-animation/scripts/frame-atlas-core.mjs';
  brokenContract[1].sourceBuffers.set(corePath, Buffer.from(brokenContract[1].sourceBuffers.get(corePath).toString('utf8').replace('export function normalizeCommonAtlasOptions', 'function normalizeCommonAtlasOptions')));
  assert.throws(() => buildSharedVideoAtlasCapability(brokenContract), /不再导出 normalizeCommonAtlasOptions/);
});
