import { Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform } from "cc";

/** 描述二维坐标。 */
interface Point { x: number; y: number }
/** 描述矩形或图集尺寸。 */
interface Rectangle extends Point { width: number; height: number }
/** 描述一帧在图集和逻辑画布中的位置。 */
interface AtlasFrame {
  id: string;
  page: number;
  rect: Rectangle;
  trimRect: Rectangle;
  offset: Point;
  packingRotation: number;
  durationMs: number;
  empty: boolean;
}
/** 描述运行时需要的图集清单字段。 */
export interface FrameAtlasManifest {
  schema: string;
  anchor: Point;
  loop: boolean;
  pages: Array<{ file: string; width: number; height: number }>;
  frames: AtlasFrame[];
}

/** 按清单和已加载的页纹理创建独立子节点播放器。 */
export function createFrameAtlasPlayer(parent: Node, manifest: FrameAtlasManifest, textures: Texture2D[]) {
  if (manifest?.schema !== "frame-atlas/1" || !manifest.frames?.length || textures.length !== manifest.pages.length) {
    throw new Error("帧动画清单或图集页无效");
  }
  const duration = manifest.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!Number.isFinite(duration) || duration <= 0 || manifest.frames.some((frame) =>
    !Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || !textures[frame.page]
    || ![0, 90].includes(frame.packingRotation))) throw new Error("帧时长、页号或排版旋转无效");
  if (textures.some((texture, index) => texture.width !== manifest.pages[index].width || texture.height !== manifest.pages[index].height)) {
    throw new Error("图集纹理尺寸不匹配");
  }
  // Cocos 旋转帧的 rect 宽高是旋转前的尺寸，x/y 则是打包后的左上角。
  const frames = manifest.frames.map((frame) => {
    const spriteFrame = new SpriteFrame();
    spriteFrame.reset({
      texture: textures[frame.page],
      rect: new Rect(frame.rect.x, frame.rect.y, frame.trimRect.width, frame.trimRect.height),
      originalSize: new Size(frame.trimRect.width, frame.trimRect.height),
      isRotate: frame.packingRotation === 90,
    });
    spriteFrame.packable = false;
    return spriteFrame;
  });
  const node = new Node("FrameAtlas");
  node.layer = parent.layer;
  parent.addChild(node);
  const transform = node.addComponent(UITransform);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  let elapsed = 0;
  let current = -1;

  /** Cocos 的 Y 轴向上，因此使用裁剪矩形中心并翻转 Y。 */
  function show(index: number): void {
    if (current === index) return;
    current = index;
    const frame = manifest.frames[index];
    const rect = frame.trimRect;
    sprite.spriteFrame = frames[index];
    sprite.enabled = !frame.empty;
    transform.setContentSize(rect.width, rect.height);
    node.setPosition(rect.x + frame.offset.x - manifest.anchor.x + rect.width / 2,
      -(rect.y + frame.offset.y - manifest.anchor.y + rect.height / 2));
  }

  /** 非循环动画保留最后一帧，deltaSeconds 为游戏时间。 */
  function update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("播放增量必须是非负秒数");
    elapsed += deltaSeconds * 1000;
    let time = manifest.loop ? elapsed % duration : Math.min(elapsed, duration);
    let index = 0;
    while (index < manifest.frames.length - 1 && time >= manifest.frames[index].durationMs) {
      time -= manifest.frames[index].durationMs;
      index += 1;
    }
    show(index);
  }

  /** 重置播放位置。 */
  function reset(): void {
    elapsed = 0;
    show(0);
  }

  /** 销毁播放器节点与所创建的帧，贴图由调用方负责释放。 */
  function dispose(): void {
    node.destroy();
    for (const frame of frames) frame.destroy();
  }

  show(0);
  return { node, update, reset, dispose };
}
