import { ChannelBase } from './channel-base';
import type { InitializationOptions } from './contracts';
import { TaptapApi } from './taptap/api';
import type { TapRuntime } from './taptap/types';

/** 真实 Tap 小游戏宿主由导出入口验证，不能仅凭 H5 全局变量识别。 */
export interface TaptapMinigameOptions extends InitializationOptions {
  readonly verifiedMinigame: boolean;
  readonly getTapSdk?: () => object;
}

/** Tap 小游戏 API 由宿主提供，不重复初始化或加载其他 SDK。 */
export class TaptapMinigameChannel extends ChannelBase<TaptapApi> {
  readonly platform = 'taptap-minigame' as const;

  /** 只保存配置，构造时不读取宿主。 */
  constructor(private readonly config: TaptapMinigameOptions) { super(config); }

  /** 将真实宿主与当前渠道生命周期共同交给具名 API。 */
  protected createApi(sdk: object, assertReady: () => void): TaptapApi {
    return new TaptapApi(sdk as TapRuntime, assertReady);
  }

  /** 只有已确认的小游戏构建才能读取平台对象。 */
  protected async load(isCurrent: () => boolean): Promise<object> {
    if (!this.config.verifiedMinigame) throw new Error('Tap 小游戏宿主未经确认');
    if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
    const sdk = this.config.getTapSdk ? this.config.getTapSdk() : (globalThis as unknown as { tap?: object }).tap;
    if (!sdk || (typeof sdk !== 'object' && typeof sdk !== 'function')) throw new Error('Tap 小游戏 SDK 不可用');
    return sdk;
  }
}
