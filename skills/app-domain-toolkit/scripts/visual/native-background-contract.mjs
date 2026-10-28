/** 按真实画布和冻结焦点验证背景等比覆盖；DPR 不参与 CSS 几何。 */
export function checkNativeBackgroundSize({ sourceLogicalSize, logicalSize, canvasRect, backgroundRect, sourceFocus, targetPoint }) {
  const values = [sourceLogicalSize?.width, sourceLogicalSize?.height, logicalSize?.width, logicalSize?.height, canvasRect?.width, canvasRect?.height, backgroundRect?.width, backgroundRect?.height, canvasRect?.x, canvasRect?.y, backgroundRect?.x, backgroundRect?.y, sourceFocus?.x, sourceFocus?.y, targetPoint?.x, targetPoint?.y];
  if (values.some((value) => value == null)) return { status: 'unverified', reason: '缺少背景源帧逻辑资源尺寸、焦点或真实画布矩形' };
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value)) || values.slice(0, 8).some((value) => value <= 0) || values.slice(12).some((value) => value < 0 || value > 1)) return { status: 'fail', reason: '背景资源尺寸、矩形或焦点无效' };
  // 保留源帧宽高比，以同一比例映射到 CSS；分轴换算会掩盖非等比拉伸。
  const width = sourceLogicalSize.width;
  const height = sourceLogicalSize.height;
  const scale = Math.max(canvasRect.width / width, canvasRect.height / height);
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  /** 将焦点偏移限制在不暴露空隙的裁切范围内。 */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const expected = {
    x: canvasRect.x + clamp(canvasRect.width * targetPoint.x - displayWidth * sourceFocus.x, canvasRect.width - displayWidth, 0),
    y: canvasRect.y + clamp(canvasRect.height * targetPoint.y - displayHeight * sourceFocus.y, canvasRect.height - displayHeight, 0),
    width: displayWidth, height: displayHeight,
  };
  const actual = { x: backgroundRect.x, y: backgroundRect.y, width: backgroundRect.width, height: backgroundRect.height };
  const matches = Object.keys(expected).every((key) => Math.abs(actual[key] - expected[key]) <= 0.5);
  return { status: matches ? 'pass' : 'fail', expected, actual, reason: matches ? null : '背景覆盖矩形与源帧逻辑尺寸、焦点和等比缩放不一致' };
}
