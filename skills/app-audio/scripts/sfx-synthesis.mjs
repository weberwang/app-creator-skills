/** 使用有限长度的分层振荡、噪声和短延迟制作可复现的游戏提示音。 */
import { encodePcm16 } from './pcm-wav.mjs';

/** 仅接收明确声明的字段，避免拼错参数却得到错误声音。 */
function fields(value, required, optional, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} 必须是对象`);
  for (const key of Object.keys(value)) {
    if (!required.includes(key) && !optional.includes(key)) throw new Error(`${name} 存在未知字段：${key}`);
  }
  for (const key of required) if (!(key in value)) throw new Error(`${name} 缺少字段：${key}`);
}

/** 检查有限数和上下界，避免超量内存分配和非有限采样。 */
function bounded(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} 必须在 ${min} 至 ${max} 之间`);
  }
}

/** 校验可保存的音效配方及各层时间、采样率和 Nyquist 频率边界。 */
export function validateRecipe(recipe) {
  fields(recipe, ['schemaVersion', 'sampleRate', 'channels', 'durationSeconds', 'peakDbfs', 'seed', 'voices'], ['echo'], '配方');
  if (recipe.schemaVersion !== 'sfx-recipe-v1') throw new Error('不支持的配方版本');
  if (![22050, 44100, 48000].includes(recipe.sampleRate)) throw new Error('采样率须为 22050、44100 或 48000');
  if (![1, 2].includes(recipe.channels)) throw new Error('声道数须为 1 或 2');
  bounded(recipe.durationSeconds, 0.05, 10, '总时长');
  bounded(recipe.peakDbfs, -24, -1, '目标采样峰值');
  bounded(recipe.seed, 0, 0xffffffff, '随机种子');
  if (!Number.isInteger(recipe.seed)) throw new Error('随机种子须为整数');
  if (!Array.isArray(recipe.voices) || recipe.voices.length < 1 || recipe.voices.length > 32) {
    throw new Error('声部数须为 1 至 32');
  }
  for (const [index, voice] of recipe.voices.entries()) {
    const name = `声部 ${index + 1}`;
    fields(voice, ['kind', 'start', 'duration', 'gain', 'pan', 'attack', 'decay'], ['frequency', 'endFrequency'], name);
    if (!['tone', 'bell', 'noise'].includes(voice.kind)) throw new Error(`${name} 的类型无效`);
    bounded(voice.start, 0, recipe.durationSeconds, `${name} 起点`);
    bounded(voice.duration, 0.02, recipe.durationSeconds, `${name} 时长`);
    if (voice.start + voice.duration > recipe.durationSeconds + 1e-9) throw new Error(`${name} 超出总时长`);
    bounded(voice.gain, 0, 1, `${name} 增益`);
    bounded(voice.pan, -1, 1, `${name} 声像`);
    bounded(voice.attack, 0.001, voice.duration, `${name} 起音`);
    bounded(voice.decay, 0.005, 10, `${name} 衰减`);
    if (voice.kind === 'noise') {
      if ('frequency' in voice || 'endFrequency' in voice) throw new Error(`${name} 噪声不支持频率字段`);
    } else {
      bounded(voice.frequency, 20, recipe.sampleRate * 0.45, `${name} 频率`);
      if ('endFrequency' in voice) bounded(voice.endFrequency, 20, recipe.sampleRate * 0.45, `${name} 结束频率`);
    }
  }
  if (recipe.voices.every((voice) => voice.gain === 0)) throw new Error('所有声部增益为零');
  if (recipe.echo !== undefined) {
    fields(recipe.echo, ['delaySeconds', 'gain'], [], '回声');
    bounded(recipe.echo.delaySeconds, 0.01, 1, '回声延迟');
    bounded(recipe.echo.gain, 0, 0.5, '回声增益');
  }
  return recipe;
}

/** 使用固定的 32 位生成器保证同一配方跨次渲染一致。 */
function randomGenerator(seed) {
  let state = (seed ^ 0x6d2b79f5) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 将预设音高转换成频率；按种子和变体施加很小的受控变化。 */
function note(midi, random) {
  return 440 * 2 ** ((midi - 69 + (random() - 0.5) * 0.12) / 12);
}

/** 构造一个具体配方，全部旋律、包络及随机状态都可保存后重新渲染。 */
export function createPresetRecipe(preset, seed = 0, variant = 0) {
  if (!['victory', 'collect', 'click', 'failure'].includes(preset)) throw new Error(`未知预设：${preset}`);
  bounded(seed, 0, 0xffffffff, '随机种子');
  bounded(variant, 0, 7, '变体');
  if (!Number.isInteger(seed) || !Number.isInteger(variant)) throw new Error('随机种子和变体须为整数');
  const random = randomGenerator((seed ^ Math.imul(variant + 1, 2654435761)) >>> 0);
  const definitions = {
    victory: { duration: 2.35, notes: [[0.025, 72, 0.50], [0.155, 76, 0.46], [0.285, 79, 0.45], [0.465, 84, 0.55], [0.48, 76, 0.17], [0.5, 79, 0.15]] },
    collect: { duration: 0.8, notes: [[0.015, 81, 0.50], [0.085, 88, 0.37]] },
    click: { duration: 0.32, notes: [[0.005, 76, 0.45]] },
    failure: { duration: 1.25, notes: [[0.015, 72, 0.44], [0.21, 68, 0.40], [0.43, 65, 0.34]] },
  };
  const definition = definitions[preset];
  const voices = definition.notes.map(([start, midi, gain], index) => {
    const duration = Math.min(definition.duration - start, preset === 'click' ? 0.23 : preset === 'victory' && index >= 3 ? 1.25 : 0.60);
    return {
      kind: 'bell', start, duration, frequency: note(midi, random), gain,
      pan: (random() - 0.5) * 0.3, attack: 0.003, decay: Math.min(duration, preset === 'click' ? 0.055 : 0.29),
    };
  });
  if (preset === 'click') voices.push({ kind: 'noise', start: 0.005, duration: 0.035, gain: 0.08, pan: 0, attack: 0.001, decay: 0.01 });
  return validateRecipe({
    schemaVersion: 'sfx-recipe-v1', sampleRate: 48000, channels: 2, durationSeconds: definition.duration,
    peakDbfs: -3, seed, voices, echo: { delaySeconds: 0.11, gain: preset === 'click' ? 0.04 : 0.10 },
  });
}

/** 渲染各音色并在单向短延迟后统一归一化；不模拟真实空间声学。 */
export function renderRecipe(recipe) {
  validateRecipe(recipe);
  const { sampleRate, channels } = recipe;
  const frames = Math.round(recipe.durationSeconds * sampleRate);
  const samples = new Float64Array(frames * channels);
  const random = randomGenerator(recipe.seed);
  for (const voice of recipe.voices) {
    const offset = Math.round(voice.start * sampleRate);
    const count = Math.min(frames - offset, Math.round(voice.duration * sampleRate));
    const leftGain = channels === 1 ? 1 : Math.sqrt((1 - voice.pan) / 2);
    const rightGain = channels === 1 ? 0 : Math.sqrt((1 + voice.pan) / 2);
    let phase = 0;
    for (let index = 0; index < count; index++) {
      const t = index / sampleRate;
      const fadeOut = Math.min(1, Math.max(0, (count - 1 - index) / (sampleRate * 0.01)));
      const envelope = (1 - Math.exp(-t / voice.attack)) * Math.exp(-t / voice.decay) * fadeOut * voice.gain;
      let value;
      if (voice.kind === 'noise') {
        value = random() * 2 - 1;
      } else {
        const frequency = voice.frequency + ((voice.endFrequency ?? voice.frequency) - voice.frequency) * index / Math.max(1, count - 1);
        phase += Math.PI * 2 * frequency / sampleRate;
        value = Math.sin(phase);
        if (voice.kind === 'bell') {
          // 高频泛音只在低于 Nyquist 时叠加，减少折叠失真。
          if (frequency * 2.01 < sampleRate / 2) value += 0.24 * Math.exp(-t / (voice.decay * 0.5)) * Math.sin(phase * 2.01);
          if (frequency * 3.9 < sampleRate / 2) value += 0.06 * Math.exp(-t / (voice.decay * 0.3)) * Math.sin(phase * 3.9);
        }
      }
      samples[(offset + index) * channels] += value * envelope * leftGain;
      if (channels === 2) samples[(offset + index) * channels + 1] += value * envelope * rightGain;
    }
  }
  if (recipe.echo && recipe.echo.gain > 0) {
    const dry = samples.slice();
    const shift = Math.round(recipe.echo.delaySeconds * sampleRate);
    for (let frame = shift; frame < frames; frame++) {
      for (let channel = 0; channel < channels; channel++) {
        const sourceChannel = channels === 2 ? 1 - channel : 0;
        samples[frame * channels + channel] += dry[(frame - shift) * channels + sourceChannel] * recipe.echo.gain;
      }
    }
  }
  let peak = 0;
  for (let frame = 0; frame < frames; frame++) {
    // 总尾部淡出覆盖回声，避免文件边界截断造成点击。
    const fade = Math.min(1, (frames - 1 - frame) / Math.max(1, sampleRate * 0.02));
    for (let channel = 0; channel < channels; channel++) {
      const index = frame * channels + channel;
      samples[index] *= fade;
      peak = Math.max(peak, Math.abs(samples[index]));
    }
  }
  if (!Number.isFinite(peak) || peak < 1e-12) throw new Error('配方生成了静音或无效信号');
  const scale = 10 ** (recipe.peakDbfs / 20) / peak;
  for (let index = 0; index < samples.length; index++) samples[index] *= scale;
  return encodePcm16(samples, sampleRate, channels);
}
