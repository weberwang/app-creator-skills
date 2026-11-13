import { AdMobSdk, type AdMobSdkOptions } from './admob-sdk';
import { MaxSdk, type MaxSdkOptions } from './max-sdk';
import { FirebaseAnalyticsSdk, type FirebaseAnalyticsOptions } from './firebase-analytics-sdk';
import { FirebaseCrashlyticsSdk, type FirebaseCrashlyticsOptions } from './firebase-crashlytics-sdk';
import { AppsFlyerSdk, type AppsFlyerOptions } from './appsflyer-sdk';
import type { AdMobPort, MaxCordovaPort, MaxEventTarget } from './ad-ports';
import type { FirebaseAnalyticsPlugin, FirebaseCrashlyticsPlugin } from './firebase-ports';
import type { AppsFlyerPlugin } from './appsflyer-ports';
import type { NativeSdkOptions } from '../shared/managed-sdk';
import type { MobileAdsSdk } from './ad-types';

/** 保留各 SDK 自己的授权前置，平台和等待时间由唯一入口统一注入。 */
type SdkSettings<T> = Omit<T, 'platform' | 'verifiedNative' | 'timeoutMs' | 'loadPlugin'>;
/** 用互斥联合类型保证只选择一个顶层广告聚合。 */
export type AdvertisingSelection =
  | { readonly provider: 'admob'; readonly options: SdkSettings<AdMobSdkOptions> }
  | { readonly provider: 'max'; readonly options: Omit<SdkSettings<MaxSdkOptions>, 'eventTarget'> };

/** 移动宿主实际配置；未采用的统计、异常或归因不创建占位管理器。 */
export interface MobileSdkConfig {
  readonly platform: NativeSdkOptions['platform'];
  readonly verifiedNative: boolean;
  readonly timeoutMs: number;
  readonly analytics?: SdkSettings<FirebaseAnalyticsOptions>;
  readonly crashlytics?: SdkSettings<FirebaseCrashlyticsOptions>;
  readonly appsflyer?: SdkSettings<AppsFlyerOptions>;
  readonly advertising: AdvertisingSelection;
}

/** 安装脚本生成实际供应商加载器；未选广告供应商没有依赖导入。 */
export interface MobileSdkLoaders {
  readonly analytics?: () => Promise<FirebaseAnalyticsPlugin>;
  readonly crashlytics?: () => Promise<FirebaseCrashlyticsPlugin>;
  readonly appsflyer?: () => Promise<AppsFlyerPlugin>;
  readonly admob?: () => Promise<AdMobPort>;
  readonly max?: () => Promise<MaxCordovaPort>;
  readonly maxEvents?: MaxEventTarget;
}

/** 单个 SDK 初始化失败的通知，不向游戏入口抛出整批失败。 */
export type SdkFailureHandler = (name: 'analytics' | 'crashlytics' | 'appsflyer' | 'ads', error: unknown) => void;

/** 同一应用组合根拥有的具名服务集合。 */
export class MobileSdkServices {
  readonly analytics: FirebaseAnalyticsSdk | undefined;
  readonly crashlytics: FirebaseCrashlyticsSdk | undefined;
  readonly appsflyer: AppsFlyerSdk | undefined;
  readonly ads: MobileAdsSdk;
  readonly advertisingProvider: 'admob' | 'max';
  private closed = false;

  /** 只装配自有管理器；供应商模块导入在各自 initialize 内发生。 */
  constructor(config: MobileSdkConfig, loaders: MobileSdkLoaders) {
    if (!config.verifiedNative || !['android', 'ios'].includes(config.platform)) throw new Error('移动 SDK 需要真实 Android/iOS 原生宿主');
    if (!config.advertising || !['admob', 'max'].includes(config.advertising.provider)) throw new Error('必须在 AdMob 和 MAX 聚合中选择一个');
    const common = { platform: config.platform, verifiedNative: config.verifiedNative, timeoutMs: config.timeoutMs };
    if (config.analytics) this.analytics = new FirebaseAnalyticsSdk({ ...config.analytics, ...common, loadPlugin: () => {
      if (!loaders.analytics) return Promise.reject(new Error('缺少原生 Firebase Analytics 插件加载器'));
      return loaders.analytics();
    } });
    if (config.crashlytics) this.crashlytics = new FirebaseCrashlyticsSdk({ ...config.crashlytics, ...common, loadPlugin: () => {
      if (!loaders.crashlytics) return Promise.reject(new Error('缺少原生 Firebase Crashlytics 插件加载器'));
      return loaders.crashlytics();
    } });
    if (config.appsflyer) this.appsflyer = new AppsFlyerSdk({ ...config.appsflyer, ...common, loadPlugin: () => {
      if (!loaders.appsflyer) return Promise.reject(new Error('缺少官方 AppsFlyer 原生插件加载器'));
      return loaders.appsflyer();
    } });
    this.advertisingProvider = config.advertising.provider;
    this.ads = config.advertising.provider === 'admob'
      ? new AdMobSdk({ ...config.advertising.options, units: { ...config.advertising.options.units }, ...common, loadPlugin: () => {
        if (!loaders.admob) return Promise.reject(new Error('缺少 AdMob 原生插件加载器'));
        return loaders.admob();
      } })
      : new MaxSdk({ ...config.advertising.options, units: { ...config.advertising.options.units }, ...common, eventTarget: loaders.maxEvents as MaxEventTarget, loadPlugin: () => {
        if (!loaders.max) return Promise.reject(new Error('缺少官方 MAX Cordova 插件'));
        return loaders.max();
      } });
  }

  /** 各 SDK 独立投递并立即返回，不等待全体完成，不在初始化阶段加载广告。 */
  initialize(onFailure?: SdkFailureHandler): void {
    if (this.closed) throw new Error('移动 SDK 组合根已释放');
    const entries = [['analytics', this.analytics], ['crashlytics', this.crashlytics], ['appsflyer', this.appsflyer], ['ads', this.ads]] as const;
    for (const [name, sdk] of entries) {
      if (!sdk) continue;
      // 同步抛错和异步拒绝均局部报告，诊断自身失败也不能中断后续 SDK。
      const report = (error: unknown): void => { try { onFailure?.(name, error); } catch {} };
      try { void sdk.initialize().catch(report); } catch (error) { report(error); }
    }
  }

  /** 组合根释放后不在同一原生进程切换聚合或重新初始化全局 SDK。 */
  get disposed(): boolean { return this.closed; }

  /** 逐个释放，某个 SDK 清理抛错不能漏掉无关模块。 */
  dispose(onFailure?: SdkFailureHandler): void {
    if (this.closed) return;
    this.closed = true;
    for (const [name, sdk] of [['analytics', this.analytics], ['crashlytics', this.crashlytics], ['appsflyer', this.appsflyer], ['ads', this.ads]] as const) {
      try { sdk?.dispose(); } catch (error) { try { onFailure?.(name, error); } catch {} }
    }
  }
}

/** 应用只持有一个作用域；测试可为独立替身创建独立作用域。 */
export interface MobileSdkScope { create(config: MobileSdkConfig, loaders: MobileSdkLoaders): MobileSdkServices }

/** 比较有效配置，函数与事件目标按身份比较，不序列化 key 或产生秘密日志。 */
function same(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => same(value, right[index]));
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Object.getPrototypeOf(left) !== Object.prototype || Object.getPrototypeOf(right) !== Object.prototype) return false;
  const a = Object.keys(left);
  const b = Object.keys(right);
  return a.length === b.length && a.every((key) => Object.hasOwn(right, key) && same((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

/** 保存配置快照，防止调用方随后修改普通配置对象改变正在运行的 SDK。 */
function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return value.map((child) => snapshot(child)) as T;
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, snapshot(child)])) as T;
}

/** 复用同配置组合根，禁止在同一作用域装配两套顶层广告聚合。 */
export function createMobileSdkScope(): MobileSdkScope {
  let services: MobileSdkServices | undefined;
  let configSnapshot: MobileSdkConfig | undefined;
  let loaderSnapshot: MobileSdkLoaders | undefined;
  return {
    /** 校验重复入口一致性后返回相同实例，不重复创建或隐式启动 SDK。 */
    create(config, loaders): MobileSdkServices {
      if (services) {
        if (services.disposed) throw new Error('组合根已释放，更换 SDK 需开启新的原生应用生命周期');
        if (!same(configSnapshot, config) || !same(loaderSnapshot, loaders)) throw new Error('同一原生进程不得切换广告聚合或重建不同配置的 SDK');
        return services;
      }
      configSnapshot = snapshot(config);
      loaderSnapshot = snapshot(loaders);
      services = new MobileSdkServices(configSnapshot, loaderSnapshot);
      return services;
    },
  };
}
