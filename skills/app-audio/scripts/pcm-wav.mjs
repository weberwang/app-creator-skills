/** 对有限长度的 PCM16 WAVE 编解码并计算可复现的客观采样统计。
 * RIFF 奇数块需要字节填充，PCM 对齐与字节率按 WAVEFORMATEX：
 * https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-
 * https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatex
 */

/** 将已归一化的交错采样写成标准小端 PCM16 WAVE。 */
export function encodePcm16(samples, sampleRate, channels) {
  if (!(samples instanceof Float64Array) || ![1, 2].includes(channels) ||
      !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
      samples.length === 0 || samples.length % channels !== 0) {
    throw new Error('PCM 参数无效');
  }
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index++) {
    const value = samples[index];
    if (!Number.isFinite(value) || value < -1 || value > 1) throw new Error('PCM 采样超界或不是有限数');
    buffer.writeInt16LE(Math.round(value < 0 ? value * 32768 : value * 32767), 44 + index * 2);
  }
  return buffer;
}

/** 根据 RIFF 声明边界逐块读取 PCM16；额外元数据块可以出现任意位置。 */
export function inspectPcm16(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('不是 RIFF/WAVE 文件');
  const end = buffer.readUInt32LE(4) + 8;
  if (end < 12 || end > buffer.length) throw new Error('RIFF 数据截断');
  let format = null;
  let data = null;
  for (let offset = 12; offset < end;) {
    if (offset + 8 > end) throw new Error('WAVE 块头截断');
    const id = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const begin = offset + 8;
    const next = begin + length + (length % 2);
    if (begin + length > end || next > end) throw new Error('WAVE 块数据或填充截断');
    if (id === 'fmt ') {
      if (format || length < 16) throw new Error('WAVE 格式块重复或不完整');
      format = {
        encoding: buffer.readUInt16LE(begin), channels: buffer.readUInt16LE(begin + 2),
        sampleRate: buffer.readUInt32LE(begin + 4), byteRate: buffer.readUInt32LE(begin + 8),
        blockAlign: buffer.readUInt16LE(begin + 12), bitsPerSample: buffer.readUInt16LE(begin + 14),
      };
    } else if (id === 'data') {
      if (data) throw new Error('WAVE 数据块重复');
      data = buffer.subarray(begin, begin + length);
    }
    offset = next;
  }
  if (!format || !data) throw new Error('WAVE 缺少格式块或数据块');
  const { channels, sampleRate, blockAlign, bitsPerSample, byteRate } = format;
  if (format.encoding !== 1 || bitsPerSample !== 16 || ![1, 2].includes(channels) ||
      sampleRate < 8000 || sampleRate > 192000 || blockAlign !== channels * 2 ||
      byteRate !== sampleRate * blockAlign || data.length === 0 || data.length % blockAlign !== 0) {
    throw new Error('仅支持格式一致且非空的单声道或立体声 PCM16 WAVE');
  }
  let peak = 0;
  let sumSquares = 0;
  let saturatedSamples = 0;
  const dc = Array(channels).fill(0);
  const sampleCount = data.length / 2;
  for (let index = 0; index < sampleCount; index++) {
    const value = data.readInt16LE(index * 2);
    const amplitude = Math.abs(value);
    peak = Math.max(peak, amplitude);
    sumSquares += value * value;
    dc[index % channels] += value;
    if (value === 32767 || value === -32768) saturatedSamples++;
  }
  const frames = sampleCount / channels;
  const rms = Math.sqrt(sumSquares / sampleCount) / 32768;
  /** 静音没有有限分贝值，使用 null 避免将负无穷伪装成测量结果。 */
  const db = (amplitude) => amplitude ? 20 * Math.log10(amplitude) : null;
  return {
    format: 'PCM16', sampleRate, channels, frames, durationSeconds: frames / sampleRate,
    samplePeakDbfs: db(peak / 32768), rmsDbfs: db(rms), saturatedSamples,
    hasSignal: peak > 0, dcOffset: dc.map((value) => value / frames / 32768),
    firstFrame: Array.from({ length: channels }, (_, channel) => data.readInt16LE(channel * 2)),
    lastFrame: Array.from({ length: channels }, (_, channel) => data.readInt16LE((sampleCount - channels + channel) * 2)),
    limitations: ['采样峰值与 RMS 不等同于真峰值或 LUFS', '检查不评估听感、游戏运行或设备播放'],
  };
}
