"use strict";

const EPSILON = 1e-4;

/** 对源帧和同一逻辑单位的实际显示框分别检查，固定边宽以源帧像素计。 */
function validateNineSliceRuntime(input, label = "九宫格") {
  const { scale, sourceSize, border, displaySize } = input;
  const errors = [];
  // 有专用倍率的适配器须传回读值，空值和接近 1 的浮点值都不算通过。
  if (Object.hasOwn(input, "scale") && scale !== 1) errors.push(`${label} 像素倍率必须严格等于数字 1。`);
  if (![sourceSize?.width, sourceSize?.height].every((value) => Number.isSafeInteger(value) && value > 0)) {
    errors.push(`${label} 源帧宽高必须为正整数。`);
  }
  if (![displaySize?.width, displaySize?.height].every((value) => Number.isFinite(value) && value > 0)) {
    errors.push(`${label} 显示框必须有实际正宽高。`);
  }
  if (![border?.left, border?.right, border?.top, border?.bottom].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    errors.push(`${label} 四边切片必须为非负整数像素。`);
    return errors;
  }

  const horizontal = border.left + border.right;
  const vertical = border.top + border.bottom;
  if (sourceSize && (sourceSize.width <= horizontal || sourceSize.height <= vertical)) {
    errors.push(`${label} 源帧必须为可拉伸中心保留正宽高。`);
  }
  if (displaySize && (displaySize.width <= horizontal || displaySize.height <= vertical)) {
    errors.push(`${label} 显示框必须为可拉伸中心保留正宽高。`);
  }
  // 禁止以大图缩小适配九宫格显示框，必须使用紧凑小图经九宫格拉伸放大。
  if ([sourceSize?.width, sourceSize?.height, displaySize?.width, displaySize?.height].every((value) => Number.isFinite(value) && value > 0)
    && (sourceSize.width > displaySize.width + EPSILON || sourceSize.height > displaySize.height + EPSILON)) {
    errors.push(`${label} 源帧尺寸不得大于显示框，禁止大图缩小，请改用紧凑小图拉伸放大。`);
  }
  return errors;
}

module.exports = { validateNineSliceRuntime };
