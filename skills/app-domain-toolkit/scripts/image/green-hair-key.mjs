import { parseBackgroundColor } from "../../../app-asset-workflow/scripts/remove-background-local.mjs";

/** 校验解码后的 RGBA 图像及其像素长度。 */
function validateImage(image, label) {
  if (!image || !Number.isSafeInteger(image.width) || image.width <= 0 ||
      !Number.isSafeInteger(image.height) || image.height <= 0 ||
      !Buffer.isBuffer(image.pixels) ||
      image.pixels.length !== image.width * image.height * 4) {
    throw new TypeError(`${label} 必须是有效的 RGBA 图像`);
  }
}

/** 遮罩只使用不透明灰度像素，避免误把 PNG 自身的 Alpha 当作蒙版。 */
function validateMask(mask, image, label) {
  if (mask === undefined) return;
  validateImage(mask, label);
  if (mask.width !== image.width || mask.height !== image.height) {
    throw new RangeError(`${label} 尺寸必须与原图一致`);
  }
  for (let index = 0; index < mask.pixels.length; index += 4) {
    if (mask.pixels[index] !== mask.pixels[index + 1] ||
        mask.pixels[index] !== mask.pixels[index + 2] ||
        mask.pixels[index + 3] !== 255) {
      throw new TypeError(`${label} 必须是不透明的灰度图`);
    }
  }
}

/** 限制透明度和反解颜色在可编码的字节范围内。 */
function toByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * 处理不透明绿底图。阈值使用 0–255 的绿幕分离分值，
 * 默认背景阈值 0、前景阈值 255，中间值产生渐变 Alpha。
 * alphaMask 灰度直接指定 Alpha，protectMask 以灰度下限保护主体，
 * 白色保护区保留原图颜色与不透明度，灰色保护区按比例抑制去溢色。
 */
export function keyGreenHair(image, {
  backgroundColor = "#00FF00",
  backgroundTolerance = 0,
  foregroundTolerance = 255,
  protectMask,
  alphaMask,
} = {}) {
  validateImage(image, "原图");
  validateMask(protectMask, image, "保护遮罩");
  validateMask(alphaMask, image, "透明度遮罩");
  const background = parseBackgroundColor(backgroundColor);
  const screenGreen = background[1] - Math.max(background[0], background[2]);
  if (screenGreen <= 0) throw new RangeError("背景色必须以绿色为主");
  if (!Number.isFinite(backgroundTolerance) || !Number.isFinite(foregroundTolerance) ||
      backgroundTolerance < 0 || foregroundTolerance > 255 ||
      backgroundTolerance >= foregroundTolerance) {
    throw new RangeError("背景和前景阈值必须满足 0 ≤ 背景阈值 < 前景阈值 ≤ 255");
  }

  const output = Buffer.alloc(image.pixels.length);
  for (let index = 0; index < image.pixels.length; index += 4) {
    const red = image.pixels[index];
    const green = image.pixels[index + 1];
    const blue = image.pixels[index + 2];
    if (image.pixels[index + 3] !== 255) throw new TypeError("绿底原图必须完全不透明");
    const separation = 255 * (screenGreen - (green - Math.max(red, blue))) / screenGreen;
    const estimatedAlpha = toByte(255 * (separation - backgroundTolerance) /
      (foregroundTolerance - backgroundTolerance));
    const maskAlpha = alphaMask ? alphaMask.pixels[index] : estimatedAlpha;
    const protection = protectMask ? protectMask.pixels[index] : 0;
    const alpha = Math.max(maskAlpha, protection);
    output[index + 3] = alpha;

    // 半透明像素按已知绿幕颜色反解前景，保护区按比例保留源色。
    if (alpha > 0 && alpha < 255) {
      const opacity = alpha / 255;
      const protectionWeight = protection / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        const source = image.pixels[index + channel];
        const foreground = toByte((source - (1 - opacity) * background[channel]) / opacity);
        output[index + channel] = toByte(foreground * (1 - protectionWeight) + source * protectionWeight);
      }
    } else if (alpha === 255) {
      output[index] = red;
      output[index + 1] = green;
      output[index + 2] = blue;
    }
  }
  return { width: image.width, height: image.height, pixels: output };
}
