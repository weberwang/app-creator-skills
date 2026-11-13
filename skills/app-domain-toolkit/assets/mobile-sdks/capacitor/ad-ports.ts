/** Capacitor 插件自己返回的单个监听器句柄；只清理本实例注册的监听。 */
export interface PluginListenerHandle { remove(): Promise<void> }
/** AdMob v8.2.0 的平台错误；适配层不把消息或广告账户信息写入日志。 */
export interface AdMobError { readonly code: number; readonly message: string }
/** Google Mobile Ads 返回的真实加载对象，测试模式下广告位可能是平台测试 ID。 */
export interface AdMobLoadInfo { readonly adUnitId: string }
/** Google Mobile Ads 返回的真实激励结果。 */
export interface AdMobRewardItem { readonly type: string; readonly amount: number }
/** AdMob 初始化前确认的官方请求配置。 */
export interface AdMobInitializationOptions {
  readonly initializeForTesting?: boolean;
  readonly testingDevices?: string[];
  readonly tagForChildDirectedTreatment?: boolean;
  readonly tagForUnderAgeOfConsent?: boolean;
  readonly maxAdContentRating?: 'General' | 'ParentalGuidance' | 'Teen' | 'MatureAudience';
}
/** AdMob v8.2.0 当前实际使用的方法；不导入供应商包以避免未选聚合被加载。 */
export interface AdMobPort {
  initialize(options?: AdMobInitializationOptions): Promise<void>;
  prepareInterstitial(options: { adId: string; npa: true; isTesting?: boolean }): Promise<AdMobLoadInfo>;
  showInterstitial(options?: { adId?: string }): Promise<void>;
  prepareRewardVideoAd(options: { adId: string; npa: true; isTesting?: boolean }): Promise<AdMobLoadInfo>;
  showRewardVideoAd(options?: { adId?: string }): Promise<AdMobRewardItem>;
  showBanner(options: { adId: string; npa: true; isTesting?: boolean; position?: 'TOP_CENTER' | 'BOTTOM_CENTER'; adSize?: 'ADAPTIVE_BANNER' }): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  addListener(name: 'interstitialAdDismissed', listener: () => void): Promise<PluginListenerHandle>;
  addListener(name: 'interstitialAdFailedToShow', listener: (error: AdMobError) => void): Promise<PluginListenerHandle>;
  addListener(name: 'onRewardedVideoAdDismissed', listener: () => void): Promise<PluginListenerHandle>;
  addListener(name: 'onRewardedVideoAdFailedToShow', listener: (error: AdMobError) => void): Promise<PluginListenerHandle>;
}
/** MAX Cordova 插件 2.1.0 由 `window.applovin` 暴露的实际具名方法。 */
export interface MaxCordovaPort {
  initialize(sdkKey: string, callback: (configuration: unknown) => void): void;
  isInitialized(): boolean;
  hasUserConsent(): boolean | null;
  setHasUserConsent(value: boolean): void;
  setDoNotSell(value: boolean): void;
  loadInterstitial(adUnitId: string): void;
  isInterstitialReady(adUnitId: string): boolean;
  showInterstitial(adUnitId: string, placement?: string): void;
  loadRewardedAd(adUnitId: string): void;
  isRewardedAdReady(adUnitId: string): boolean;
  showRewardedAd(adUnitId: string, placement: string): void;
  createBanner(adUnitId: string, position: 'top_center' | 'bottom_center'): void;
  showBanner(adUnitId: string): void;
  hideBanner(adUnitId: string): void;
  destroyBanner(adUnitId: string): void;
}
/** Cordova 原生事件直接附带广告位、placement 与奖励字段。 */
export interface MaxAdEvent extends Event {
  readonly adUnitId?: string;
  readonly placement?: string;
  readonly rewardLabel?: string;
  readonly rewardAmount?: number;
  readonly errorCode?: string;
}
/** MAX 插件使用 window 事件，不得移除其他模块的监听。 */
export interface MaxEventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}
