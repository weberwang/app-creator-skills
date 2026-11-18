/** 通道必须是有效的归一化数值，完全透明也是合法值。 */
export function isTextChannel(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }

/** 检查颜色通道和 Alpha；纯色可在画笔中单独声明 Alpha。 */
export function hasCompleteTextFill(fill) {
  /** 渐变的每个颜色停靠点都要保留独立 Alpha。 */
  function color(value, alphaRequired) {
    return value && ['r', 'g', 'b'].every((key) => isTextChannel(value[key]))
      && (!alphaRequired || isTextChannel(value.a)) && (value.a === undefined || isTextChannel(value.a));
  }
  /** 明确颜色和 Alpha 的表示才能用于逐状态核对。 */
  function paint(value) {
    if (typeof value === 'string') return /^#[0-9A-Fa-f]{8}$/.test(value);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (value.opacity !== undefined && !isTextChannel(value.opacity)) return false;
    if (value.type === 'SOLID') return color(value.color, value.opacity === undefined);
    if (['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'].includes(value.type)) {
      return Array.isArray(value.gradientStops) && value.gradientStops.length >= 2
        && value.gradientStops.every((stop) => stop?.position?.unit === 'ratio' && isTextChannel(stop.position.value) && color(stop.color, true));
    }
    return false;
  }
  const fills = Array.isArray(fill) ? fill : [fill];
  return fills.length > 0 && fills.every(paint);
}

/** 比较文字通道时排除编辑器专属的画笔元数据，并统一十六进制颜色和分量表示。 */
export function comparableTextFill(fill) {
  const fills = Array.isArray(fill) ? fill : [fill];
  return fills.map((paint) => {
    if (typeof paint === 'string') {
      const channels = paint.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16) / 255);
      return { type: 'SOLID', channels };
    }
    const opacity = paint.opacity ?? 1;
    if (paint.type === 'SOLID') {
      const { r, g, b, a = 1 } = paint.color;
      return { type: 'SOLID', channels: [r, g, b, a * opacity] };
    }
    // 色标存原位置及合成后的色值，单独的文字透明度由外层合同检查。
    return { type: paint.type, stops: paint.gradientStops.map(({ position, color: { r, g, b, a } }) => ({ position: position.value, channels: [r, g, b, a * opacity] })) };
  });
}

/** 验证 Flutter 文字目标包含可比较的填色及独立透明度。 */
export function flutterTextColorIssues(appearance) {
  const normalized = appearance?.normalized;
  const raw = appearance?.raw;
  if (!normalized?.typography && raw?.nodeType !== 'TEXT' && !raw?.textVisual) return [];
  const issues = [];
  const opacity = normalized?.textOpacity;
  if (opacity?.unit !== 'ratio' || !isTextChannel(opacity.value)) issues.push('文字透明度 textOpacity 必须提供 0 到 1 的实际比例');
  if (!hasCompleteTextFill(normalized?.textFill)) issues.push('文字颜色 textFill 缺少明确颜色或 Alpha');
  return issues;
}
