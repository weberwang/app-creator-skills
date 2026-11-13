import { CocosSdkBridge, type CocosJsbEvents } from './bridge';
import { FirebaseAnalyticsSdk, type AnalyticsPolicy } from './firebase-analytics';
import { FirebaseCrashlyticsSdk, type CrashlyticsPolicy } from './firebase-crashlytics';
import { AppsFlyerSdk, type AppsFlyerConfig } from './appsflyer';
import { MobileAdsSdk, type AdProvider, type AdsConfig } from './ads';

export type * from './bridge';
export type * from './firebase-analytics';
export type * from './firebase-crashlytics';
export type * from './appsflyer';
export type * from './ads';

/** Cocos 移动端的显式 SDK 配置；项目按授权与实际 ID 提供，不内置凭据。 */
export interface CocosMobileSdkConfig {
  timeoutMs: number;
  adProvider: AdProvider;
  analytics: AnalyticsPolicy;
  crashlytics: CrashlyticsPolicy;
  appsflyer: AppsFlyerConfig;
  ads: AdsConfig;
}

/** 单个 SDK 失败时通知业务，错误不会传播到游戏入口。 */
export type CocosSdkFailureHandler = (name: 'analytics' | 'crashlytics' | 'appsflyer' | 'ads' | 'bridge', error: unknown) => void;

/** 提供彼此独立的 SDK 管理器，不等待全部 SDK 才能进入游戏。 */
export class CocosMobileSdks {
  readonly bridge: CocosSdkBridge;
  readonly analytics: FirebaseAnalyticsSdk;
  readonly crashlytics: FirebaseCrashlyticsSdk;
  readonly appsflyer: AppsFlyerSdk;
  readonly ads: MobileAdsSdk;

  /** 应用组合根传入真实的 native.jsbBridgeWrapper；构造不初始化 SDK。 */
  constructor(port: CocosJsbEvents, config: CocosMobileSdkConfig) {
    if (config.adProvider !== 'admob' && config.adProvider !== 'max') throw new Error('必须选择一种广告聚合');
    if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0 || config.timeoutMs > 2147483647) throw new Error('SDK 等待时间无效');
    this.bridge = new CocosSdkBridge(port);
    this.analytics = new FirebaseAnalyticsSdk(this.bridge, config.timeoutMs, config.analytics);
    this.crashlytics = new FirebaseCrashlyticsSdk(this.bridge, config.timeoutMs, config.crashlytics);
    this.appsflyer = new AppsFlyerSdk(this.bridge, config.timeoutMs, config.appsflyer);
    this.ads = new MobileAdsSdk(this.bridge, config.timeoutMs, config.adProvider, config.ads);
  }
  /** 分别投递 SDK 启动，立即返回；单项异常和失败回调异常均不影响其他任务。 */
  initialize(onFailure?: CocosSdkFailureHandler): void {
    for (const [name, sdk] of [['analytics', this.analytics], ['crashlytics', this.crashlytics], ['appsflyer', this.appsflyer], ['ads', this.ads]] as const) {
      void Promise.resolve().then(() => sdk.initialize()).catch((error: unknown) => { try { onFailure?.(name, error); } catch {} });
    }
  }
  /** 独立释放各管理器；原生请求仍在途时报告桥暂不能关闭，不向游戏流程抛错。 */
  dispose(onFailure?: CocosSdkFailureHandler): void {
    for (const [name, sdk] of [['analytics', this.analytics], ['crashlytics', this.crashlytics], ['appsflyer', this.appsflyer], ['ads', this.ads]] as const) {
      try { sdk.dispose(); } catch (error) { try { onFailure?.(name, error); } catch {} }
    }
    // 在途原生回调需要桥继续接收；稍后可再次调用 dispose 尝试安全关闭。
    try { this.bridge.close(); } catch (error) { try { onFailure?.('bridge', error); } catch {} }
  }
}
