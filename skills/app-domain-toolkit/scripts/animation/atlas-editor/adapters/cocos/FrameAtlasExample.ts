import { _decorator, Component, JsonAsset, Texture2D } from "cc";
import { createFrameAtlasPlayer } from "./frame-atlas";
import type { FrameAtlasManifest } from "./frame-atlas";
const { ccclass, property } = _decorator;

/** 将清单与按顺序排列的纹理绑定到节点，即可播放动画。 */
@ccclass("FrameAtlasExample")
export class FrameAtlasExample extends Component {
  @property(JsonAsset)
  manifest: JsonAsset | null = null;

  @property([Texture2D])
  textures: Texture2D[] = [];

  private player: ReturnType<typeof createFrameAtlasPlayer> | null = null;

  /** 读取资源并建立播放器。 */
  start(): void {
    if (!this.manifest) throw new Error("请绑定 animation.json");
    this.player = createFrameAtlasPlayer(this.node, this.manifest.json as FrameAtlasManifest, this.textures);
  }

  /** 使用引擎的帧间隔驱动播放。 */
  update(deltaTime: number): void {
    this.player?.update(deltaTime);
  }

  /** 卸载时释放播放器持有的对象。 */
  onDestroy(): void {
    this.player?.dispose();
    this.player = null;
  }
}
