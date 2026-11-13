import type { CrazyGamesRuntime, ReadyCheck } from './types';

/** CrazyGames 平台订单上报接口。 */
export class CrazyGamesAnalytics {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 上报 Xsolla 订单事件，不代替订单真实性验证。 */
  trackOrder(provider: 'xsolla', order: Record<string, unknown>): void { this.ready(); this.sdk.analytics.trackOrder(provider, order); }
}
