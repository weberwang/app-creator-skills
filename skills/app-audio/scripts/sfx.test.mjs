/** 从公开 CLI 验证短音效文件、复现、参数边界与防覆盖行为。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CLI = fileURLToPath(new URL('./sfx.mjs', import.meta.url));

/** 使用测试专属临时目录，并在删除前验证目标没有越界。 */
function workspace(t) {
  const path = mkdtempSync(join(tmpdir(), 'sfx-tool-'));
  t.after(() => {
    assert.equal(dirname(resolve(path)), resolve(tmpdir()));
    assert.ok(basename(path).startsWith('sfx-tool-'));
    rmSync(path, { recursive: true, force: true });
  });
  return path;
}

/** 调用实际入口，保留状态和原始输出以便失败时定位。 */
function run(...args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  return result;
}

/** 手工读取固定布局的 WAV 测试夹具，避免将生产解码器当作独立验证。 */
function readGenerated(path) {
  const wav = readFileSync(path);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(4), wav.length - 8);
  assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  assert.equal(wav.readUInt32LE(40), wav.length - 44);
  const values = [];
  for (let position = 44; position < wav.length; position += 2) values.push(wav.readInt16LE(position));
  assert.ok(values.some((value) => value !== 0));
  assert.ok(values.every((value) => value > -32768 && value < 32767));
  return { wav, channels: wav.readUInt16LE(22), sampleRate: wav.readUInt32LE(24), values };
}

/** 生成所有预设并通过真实文件检查接口与独立 WAV 字段核对。 */
test('四种预设导出可检查的非静音 PCM16，配方能逐字节复现', (t) => {
  const dir = workspace(t);
  const firstSamples = new Set();
  for (const preset of ['victory', 'collect', 'click', 'failure']) {
    const file = join(dir, `${preset}.wav`);
    const recipe = join(dir, `${preset}.json`);
    const result = run('render', '--preset', preset, '--out', file, '--seed', '42', '--variant', '1', '--recipe-out', recipe);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const decoded = readGenerated(file);
    assert.equal(decoded.channels, 2);
    assert.equal(decoded.sampleRate, 48000);
    assert.equal(report.technical.frames, decoded.values.length / 2);
    assert.equal(report.source.preset, preset);
    assert.equal(report.source.seed, 42);
    assert.deepEqual(JSON.parse(readFileSync(recipe, 'utf8')), report.recipe);
    assert.ok(report.technical.limitations.some((text) => text.includes('听感')));
    firstSamples.add(decoded.wav.toString('base64'));
    const verify = run('check', '--file', file);
    assert.equal(verify.status, 0, verify.stderr);
    assert.equal(JSON.parse(verify.stdout).technicalStatus, 'PASS');
    const reproduced = join(dir, `${preset}-reproduced.wav`);
    const rerender = run('render', '--recipe', recipe, '--out', reproduced);
    assert.equal(rerender.status, 0, rerender.stderr);
    assert.deepEqual(readFileSync(reproduced), decoded.wav);
  }
  assert.equal(firstSamples.size, 4);
});

/** 使用相同预设和随机种子时受控变体可复现，同时确实改变生成信号。 */
test('变体有界且可复现，配方声部可以表达单声道扫频及噪声', (t) => {
  const dir = workspace(t);
  const first = join(dir, 'first.wav');
  const repeated = join(dir, 'repeated.wav');
  const other = join(dir, 'other.wav');
  for (const [path, variant] of [[first, '2'], [repeated, '2'], [other, '3']]) {
    const result = run('render', '--preset', 'click', '--out', path, '--seed', '17', '--variant', variant);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.deepEqual(readFileSync(first), readFileSync(repeated));
  assert.notDeepEqual(readFileSync(first), readFileSync(other));

  const recipe = {
    schemaVersion: 'sfx-recipe-v1', sampleRate: 22050, channels: 1, durationSeconds: 0.4, peakDbfs: -6, seed: 123,
    voices: [
      { kind: 'tone', start: 0, duration: 0.3, frequency: 400, endFrequency: 700, gain: 0.3, pan: 0, attack: 0.004, decay: 0.15 },
      { kind: 'noise', start: 0.02, duration: 0.08, gain: 0.05, pan: 0, attack: 0.002, decay: 0.03 },
    ],
    echo: { delaySeconds: 0.04, gain: 0.1 },
  };
  const input = join(dir, 'custom.json');
  const output = join(dir, 'mono.wav');
  writeFileSync(input, JSON.stringify(recipe));
  const result = run('render', '--recipe', input, '--out', output);
  assert.equal(result.status, 0, result.stderr);
  const audio = readGenerated(output);
  assert.equal(audio.channels, 1);
  assert.equal(audio.sampleRate, 22050);
  assert.equal(audio.values.length, 8820);
});

/** 无效参数或任一目标文件已存在时，绝不覆盖并回滚本次创建的文件。 */
test('非法选项、配方及已存在目标拒绝写入', (t) => {
  const dir = workspace(t);
  const existing = join(dir, 'existing.wav');
  const marker = Buffer.from('保留原文件');
  writeFileSync(existing, marker);
  let result = run('render', '--preset', 'victory', '--out', existing);
  assert.notEqual(result.status, 0);
  assert.deepEqual(readFileSync(existing), marker);

  const newAudio = join(dir, 'new.wav');
  const existingRecipe = join(dir, 'existing.json');
  writeFileSync(existingRecipe, marker);
  result = run('render', '--preset', 'victory', '--out', newAudio, '--recipe-out', existingRecipe);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(newAudio), false);
  assert.deepEqual(readFileSync(existingRecipe), marker);
  for (const args of [
    ['--preset', 'unknown'], ['--preset', 'victory', '--variant', '8'],
    ['--preset', 'victory', '--seed', '-1'], ['--preset', 'victory', '--seed', '0', '--seed', '1'],
    ['--preset', 'victory', '--unknown', '1'],
  ]) {
    result = run('render', ...args, '--out', newAudio);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.equal(existsSync(newAudio), false);
  }
  const recipe = join(dir, 'invalid.json');
  const valid = { schemaVersion: 'sfx-recipe-v1', sampleRate: 48000, channels: 2,
    durationSeconds: 0.4, peakDbfs: -3, seed: 1, voices: [
      { kind: 'tone', start: 0, duration: 0.2, frequency: 440, gain: 0.3, pan: 0, attack: 0.003, decay: 0.1 },
    ] };
  for (const invalid of [
    { ...valid, unexpected: true },
    { ...valid, durationSeconds: 1e9 },
    { ...valid, sampleRate: 11025 },
    { ...valid, seed: 0.5 },
    { ...valid, voices: [] },
    { ...valid, voices: [{ ...valid.voices[0], frequency: 23000 }] },
    { ...valid, voices: [{ ...valid.voices[0], attack: 0 }] },
    { ...valid, voices: [{ ...valid.voices[0], start: 0.3 }] },
    { ...valid, voices: [{ ...valid.voices[0], kind: 'noise' }] },
  ]) {
    writeFileSync(recipe, JSON.stringify(invalid));
    result = run('render', '--recipe', recipe, '--out', newAudio);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(newAudio), false);
  }
});

/** PCM 校验按 RIFF 块和奇数字节填充解析，不接受截断或非 PCM 文件。 */
test('检查器支持合法附加块并拒绝截断、非 PCM、静音和饱和', (t) => {
  const dir = workspace(t);
  const source = join(dir, 'source.wav');
  assert.equal(run('render', '--preset', 'collect', '--out', source).status, 0);
  const original = readFileSync(source);
  const junk = Buffer.alloc(12);
  junk.write('JUNK', 0, 'ascii');
  junk.writeUInt32LE(3, 4);
  junk.write('abc', 8, 'ascii');
  const extended = Buffer.concat([original.subarray(0, 12), junk, original.subarray(12)]);
  extended.writeUInt32LE(extended.length - 8, 4);
  const withJunk = join(dir, 'junk.wav');
  writeFileSync(withJunk, extended);
  assert.equal(run('check', '--file', withJunk).status, 0);

  const truncated = join(dir, 'truncated.wav');
  writeFileSync(truncated, original.subarray(0, original.length - 1));
  assert.notEqual(run('check', '--file', truncated).status, 0);
  const invalidFormat = Buffer.from(original);
  invalidFormat.writeUInt16LE(3, 20);
  const nonPcm = join(dir, 'non-pcm.wav');
  writeFileSync(nonPcm, invalidFormat);
  assert.notEqual(run('check', '--file', nonPcm).status, 0);

  const silence = Buffer.from(original);
  silence.fill(0, 44);
  const silentFile = join(dir, 'silent.wav');
  writeFileSync(silentFile, silence);
  const silentResult = run('check', '--file', silentFile);
  assert.notEqual(silentResult.status, 0);
  assert.equal(JSON.parse(silentResult.stdout).technical.hasSignal, false);
  assert.equal(JSON.parse(silentResult.stdout).technical.samplePeakDbfs, null);
  const saturated = Buffer.from(original);
  saturated.writeInt16LE(32767, 44);
  const saturatedFile = join(dir, 'saturated.wav');
  writeFileSync(saturatedFile, saturated);
  const saturatedResult = run('check', '--file', saturatedFile);
  assert.notEqual(saturatedResult.status, 0);
  assert.equal(JSON.parse(saturatedResult.stdout).technical.saturatedSamples, 1);
});

/** 存在 FFmpeg 时独立解码实际文件，避免生产编码器与检查器共享错误而相互误判。 */
test('实际 WAV 可由 FFmpeg 独立解码', (t) => {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error?.code === 'ENOENT') return t.skip('环境未安装 FFmpeg');
  assert.ifError(probe.error);
  assert.equal(probe.status, 0, probe.stderr);
  const dir = workspace(t);
  const file = join(dir, 'independent.wav');
  const generated = run('render', '--preset', 'victory', '--seed', '42', '--out', file);
  assert.equal(generated.status, 0, generated.stderr);
  const decoded = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-nostdin', '-i', file, '-f', 'null', '-'], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(decoded.error);
  assert.equal(decoded.status, 0, decoded.stderr);
});
