import { ChannelBase } from './channel-base';
import type { InitializationOptions } from './contracts';
import { WechatApi } from './wechat/api';
import type { Wechat } from './wechat/types.generated';

/** 微信小游戏的真实宿主能力由已核实的引擎导出环境提供。 */
export interface WechatMinigameOptions extends InitializationOptions {
  readonly verifiedMinigame: boolean;
  readonly getWechatSdk?: () => object;
}

/** 使用微信宿主提供的完整 wx API，不额外注入或启动其他 SDK。 */
export class WechatMinigameChannel extends ChannelBase<WechatApi> {
  readonly platform = 'wechat-minigame' as const;

  /** 仅保存配置，不在构造时读取宿主或初始化 SDK。 */
  constructor(private readonly config: WechatMinigameOptions) { super(config); }

  /** 创建微信渠道能力封装，业务无需直接使用 wx 全局对象。 */
  protected createApi(sdk: object, assertReady: () => void): WechatApi {
    return new WechatApi(sdk as Wechat.Runtime, assertReady);
  }

  /** 真实小游戏环境由引擎与入口共同确认，不能仅凭 wx 全局对象判断。 */
  protected async load(isCurrent: () => boolean): Promise<object> {
    if (!this.config.verifiedMinigame) throw new Error('微信小游戏宿主未经确认');
    if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
    const sdk = this.config.getWechatSdk ? this.config.getWechatSdk() : (globalThis as unknown as { wx?: object }).wx;
    if (!sdk || (typeof sdk !== 'object' && typeof sdk !== 'function')) throw new Error('微信小游戏 SDK 不可用');
    return sdk;
  }
}
