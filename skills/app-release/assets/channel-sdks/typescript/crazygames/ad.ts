import type { CrazyAdCallbacks, CrazyAdType, CrazyGamesError, CrazyGamesRuntime, ReadyCheck, RewardedAdResult } from './types';

/** CrazyGames 广告 SDK 的具名方法及激励结果处理。 */
export class CrazyGamesAd {
  private rewardPending = false;
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 按官方语义请求广告；回调顺序和错误由 SDK 决定。 */
  requestAd(type: CrazyAdType, callbacks?: CrazyAdCallbacks): void { this.ready(); this.sdk.ad.requestAd(type, callbacks); }
  /** 按 SDK 实际结果检查广告拦截器。 */
  hasAdblock(): Promise<boolean> { this.ready(); return this.sdk.ad.hasAdblock(); }
  /** 将激励广告的真实结束与失败区分，并保证重复回调只结算一次。 */
  showRewardedAd(onStarted?: () => void): Promise<RewardedAdResult> {
    this.ready();
    if (this.rewardPending) return Promise.resolve({ status: 'error', error: { code: 'requestInProgress', message: '激励广告请求尚未结束' } });
    this.rewardPending = true;
    return new Promise((resolve) => {
      let settled = false;
      let started = false;
      let startHandlerFailed = false;
      let onStartedError: unknown;
      // 已受理的广告结算不随场景退出被丢弃；只有平台完成回调才允许发奖。
      const finish = (result: RewardedAdResult): void => {
        if (settled) return;
        settled = true;
        this.rewardPending = false;
        resolve(startHandlerFailed ? { ...result, onStartedError } : result);
      };
      try {
        this.sdk.ad.requestAd('rewarded', {
          adStarted: () => {
            if (settled || started) return;
            started = true;
            // 业务暂停回调发生异常时，仍需接收平台最终完成或失败结果。
            try { onStarted?.(); } catch (error) { startHandlerFailed = true; onStartedError = error; }
          },
          adFinished: () => finish({ status: 'completed' }),
          adError: (error: CrazyGamesError) => finish({ status: error?.code === 'adsDisabled' ? 'unsupported' : 'error', error }),
        });
      } catch (error) { finish({ status: 'error', error }); }
    });
  }
}
