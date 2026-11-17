import type { AdsSdkOptions, AdReward, MobileAdsSdk } from '../../capacitor/ad-types';
import type { PluginListenerHandle } from '../../capacitor/ad-ports';

/** 原生聚合媒体配置；只有项目已有授权与网络配置满足时才可初始化。 */
export interface DirichletInitialization {
  readonly mediaId: string;
  readonly mediaName: string;
  readonly mediaKey: string;
  readonly initializationAllowed: boolean;
  readonly requestsAllowed: boolean;
  readonly nonPersonalizedNetworksConfigured: boolean;
  readonly debug: boolean;
}

/** 原生回调携带本次展示身份，不能按广告位推断奖励归属。 */
export interface DirichletAdEvent {
  readonly kind: 'closed' | 'failed' | 'reward';
  readonly format: 'interstitial' | 'rewarded';
  readonly adUnitId: string;
  readonly requestId: string;
  readonly verified?: boolean;
  readonly reward?: AdReward;
}

/** 实际原生插件的具名方法；加载完成只能由厂商成功回调确认。 */
export interface DirichletPort {
  initialize(options: DirichletInitialization): Promise<void>;
  loadRewarded(options: { adUnitId: string }): Promise<void>;
  loadInterstitial(options: { adUnitId: string }): Promise<void>;
  showRewarded(options: { adUnitId: string; requestId: string }): Promise<void>;
  showInterstitial(options: { adUnitId: string; requestId: string }): Promise<void>;
  showBanner(options: { adUnitId: string; position: 'top' | 'bottom' }): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  setRequestsAllowed(options: { allowed: boolean }): Promise<void>;
  dispose(): Promise<void>;
  addListener(name: 'adEvent', listener: (event: DirichletAdEvent) => void): Promise<PluginListenerHandle>;
}

/** 一个实际 Android 聚合实例的配置；构造时不会加载厂商 SDK。 */
export interface DirichletSdkOptions extends AdsSdkOptions {
  readonly mediaId: string;
  readonly mediaName: string;
  readonly mediaKey: string;
  readonly nonPersonalizedNetworksConfigured: boolean;
  readonly debug?: boolean;
  readonly loadPlugin: () => Promise<DirichletPort>;
}

/** 本地有界记录只存请求身份，避免将媒体密钥或账号信息写入事件。 */
export type DirichletFormat = 'interstitial' | 'rewarded';

/** 注入游戏业务的能力接口，不要求业务引用原生插件或具体管理器。 */
export interface DirichletAds extends MobileAdsSdk {
  readonly provider: 'dirichlet';
  refreshPolicy(): Promise<void>;
}
