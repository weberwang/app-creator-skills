import { createHash } from 'node:crypto';
import { encodePngRgba } from '../../skills/app-asset-workflow/scripts/png-raster.mjs';

/** 生成可实际解码的合成图；仅测试文件身份与尺寸，不代表生图或视觉验收。 */
export function syntheticDesignPng(label = 'fixture', width = 390, height = 844) {
  const color = createHash('sha256').update(label).digest();
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = color[0]; pixels[index + 1] = color[1]; pixels[index + 2] = color[2]; pixels[index + 3] = 255;
  }
  return encodePngRgba(width, height, pixels);
}
