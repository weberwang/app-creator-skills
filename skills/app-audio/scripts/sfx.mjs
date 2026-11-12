#!/usr/bin/env node
/** 渲染或检查本地 PCM16 音效；输出是技术事实，不作为听感验收。 */
import { closeSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPcm16 } from './pcm-wav.mjs';
import { createPresetRecipe, renderRecipe, validateRecipe } from './sfx-synthesis.mjs';

const USAGE = `游戏短音效本地工具

render --preset victory|collect|click|failure --out 文件.wav [--seed 整数] [--variant 0..7] [--recipe-out 文件.json]
render --recipe 配方.json --out 文件.wav
check --file 文件.wav

配方版本 sfx-recipe-v1：sampleRate 为 22050/44100/48000，channels 为 1/2，durationSeconds 为 0.05..10，
peakDbfs 为 -24..-1，seed 为 uint32，voices 为 1..32 个 tone/bell/noise 分层；echo 可选。
每层必须包含 kind、start、duration、gain、pan、attack、decay：start 不小于 0，duration 为 0.02 秒至总时长，
且 start + duration 不超过总时长；gain 为 0..1，pan 为 -1..1，attack 为 0.001 秒至该层时长，decay 为 0.005..10 秒。
tone/bell 必须有 frequency，可选 endFrequency，频率为 20 至 0.45 倍采样率；noise 禁止这两个频率字段。
echo 包含 delaySeconds（0.01..1 秒）和 gain（0..0.5）。
使用 --recipe-out 保存完整展开配方，再通过 --recipe 重现。文件使用独占创建，不覆盖已有路径。
技术检查只支持单声道或立体声 PCM16 WAVE，采样峰值/RMS 不等于 true peak/LUFS 或人工听感。`;

/** 命令选项只允许一个值且不容忍重复、未知或遗漏参数。 */
function parseOptions(args, allowed) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!key.startsWith('--') || !allowed.includes(key) || key in result ||
        !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`无效或重复的选项：${key}`);
    result[key] = args[index + 1];
  }
  return result;
}

/** 将命令行十进制数字严格解析为有界无符号整数。 */
function integer(value, fallback, max, name) {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new Error(`${name} 必须为 0 至 ${max} 的整数`);
  }
  return Number(value);
}

/** 限制配方或音频输入大小并读取真实文件，不把预期路径当作结果。 */
function readBounded(path, maxBytes) {
  const absolute = resolve(path);
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size < 1 || stat.size > maxBytes) throw new Error('输入必须是非空且大小受限的文件');
  return readFileSync(absolute);
}

/** 逐一独占创建本次产物；任一步失败时只撤销本次已创建文件。 */
function writeExclusive(outputs) {
  const created = [];
  try {
    for (const item of outputs) {
      const fd = openSync(item.path, 'wx');
      created.push(item.path);
      try { writeFileSync(fd, item.bytes); } finally { closeSync(fd); }
    }
  } catch (error) {
    for (const path of created.reverse()) {
      try { unlinkSync(path); } catch { /* 保留原始失败并交由调用者检查遗留文件。 */ }
    }
    throw error;
  }
}

/** 渲染配方、检查结果后才一次性交付文件，并返回完整再生产输入。 */
function render(options) {
  if (!options['--out'] || Boolean(options['--preset']) === Boolean(options['--recipe'])) {
    throw new Error('必须提供 --out，并且仅选择 --preset 或 --recipe 之一');
  }
  if (options['--recipe'] && (options['--seed'] !== undefined || options['--variant'] !== undefined)) {
    throw new Error('读取配方时不得指定 --seed 或 --variant；种子已保存在配方中');
  }
  const output = resolve(options['--out']);
  if (extname(output).toLowerCase() !== '.wav') throw new Error('输出音频必须使用 .wav 扩展名');
  const recipeOutput = options['--recipe-out'] ? resolve(options['--recipe-out']) : null;
  if (recipeOutput && extname(recipeOutput).toLowerCase() !== '.json') throw new Error('输出配方必须使用 .json 扩展名');
  // Windows 路径比较忽略大小写，避免产物别名绕过同路径检查。
  const comparable = (path) => process.platform === 'win32' ? path.toLowerCase() : path;
  if (recipeOutput && comparable(output) === comparable(recipeOutput)) throw new Error('音频与配方输出不能指向同一文件');
  const seed = options['--preset'] ? integer(options['--seed'], 0, 0xffffffff, '随机种子') : undefined;
  const variant = options['--preset'] ? integer(options['--variant'], 0, 7, '变体') : undefined;
  const recipe = options['--preset']
    ? createPresetRecipe(options['--preset'], seed, variant)
    : validateRecipe(JSON.parse(readBounded(options['--recipe'], 1024 * 1024).toString('utf8')));
  const audio = renderRecipe(recipe);
  const technical = inspectPcm16(audio);
  if (!technical.hasSignal || technical.saturatedSamples) throw new Error('合成结果静音或采样饱和');
  const outputs = [{ path: output, bytes: audio }];
  if (recipeOutput) outputs.push({ path: recipeOutput, bytes: Buffer.from(`${JSON.stringify(recipe, null, 2)}\n`) });
  writeExclusive(outputs);
  return {
    operation: 'render', output, recipeOutput,
    source: options['--preset'] ? { type: 'preset', preset: options['--preset'], seed, variant } : { type: 'recipe', path: resolve(options['--recipe']) },
    recipe, technical,
  };
}

/** 检查真实 PCM 文件并返回适用范围，采样饱和和静音视为技术失败。 */
function check(options) {
  if (!options['--file']) throw new Error('必须提供 --file');
  const file = resolve(options['--file']);
  const technical = inspectPcm16(readBounded(file, 128 * 1024 * 1024));
  return { operation: 'check', file, technicalStatus: technical.hasSignal && !technical.saturatedSamples ? 'PASS' : 'FAIL', technical };
}

/** 程序入口保持输出为结构化 JSON，失败写入标准错误并返回非零状态。 */
export function main(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const [command, ...rest] = args;
  let result;
  if (command === 'render') result = render(parseOptions(rest, ['--preset', '--recipe', '--out', '--seed', '--variant', '--recipe-out']));
  else if (command === 'check') result = check(parseOptions(rest, ['--file']));
  else throw new Error(`未知命令：${command ?? ''}\n${USAGE}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.technicalStatus === 'FAIL' ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
