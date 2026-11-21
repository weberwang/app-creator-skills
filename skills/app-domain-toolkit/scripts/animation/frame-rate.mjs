/** 帧动画最终采样和播放帧率的统一上限。 */
export const MAX_FRAME_ANIMATION_FPS = 24;

/** 源视频帧率独立记录，此检查只用于输出动画的采样和播放。 */
export function isValidFrameAnimationFps(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= MAX_FRAME_ANIMATION_FPS;
}
