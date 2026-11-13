import type { NativeSdkOptions, NativeSdkState } from '../shared/managed-sdk';

/** 三种实际广告格式；横幅只在请求显示时创建。 */
export type AdFormat = 'banner' | 'interstitial' | 'rewarded';
/** 同一聚合 SDK 内按格式配置官方广告位，未使用的格式无需配置。 */
export interface AdUnitIds { readonly banner?: string; readonly interstitial?: string; readonly rewarded?: string }
/** 显示请求仅表示本地已发起，不能推断原生广告已展示或已获得奖励。 */
export type AdShowResult =
  | { readonly status: 'requested'; readonly requestId: string }
  | { readonly status: 'not-ready' | 'busy' | 'restricted' | 'unconfigured' | 'error' };
/** 后台加载或横幅操作的实际结果，不把未响应当作加载成功。 */
export type AdLoadResult = { readonly status: 'loaded' | 'requested' | 'not-ready' | 'restricted' | 'unconfigured' | 'disposed' | 'error' };
/** 平台明确报告的奖励。 */
export interface AdReward { readonly type: string; readonly amount: number }
/** 展示生命周期通知；业务广告位只在本地传递，不作为 MAX 唯一关联标识上传。 */
export interface AdShowEvent { readonly requestId: string; readonly businessPlacement?: string }
/** 显示状态回调；关闭或错误不代表获得奖励。 */
export interface AdShowCallbacks {
  readonly onClosed?: (event: AdShowEvent) => void;
  readonly onFailed?: (event: AdShowEvent & { readonly code: 'display-failed' }) => void;
}
/** 激励回调只在官方真实奖励信号到达时通知一次。 */
export interface RewardedAdCallbacks extends AdShowCallbacks {
  readonly onReward: (event: AdShowEvent & { readonly reward: AdReward }) => void;
}
/** 支持的横幅位置，具体覆盖位置仍需由项目确认安全。 */
export type BannerPosition = 'top' | 'bottom';
/** 单个广告 SDK 的真实宿主、隐私前置与广告请求策略。 */
export interface AdsSdkOptions extends NativeSdkOptions {
  readonly units: AdUnitIds;
  /** 每次请求前读取当前实际授权；拒绝或读取失败时不发起新请求。 */
  readonly canRequestAds: () => boolean;
}
/** 项目对两种聚合服务使用的具名能力，不包含第二个厂商的 SDK 实现。 */
export interface MobileAdsSdk {
  readonly state: NativeSdkState;
  readonly hasPendingInitialization: boolean;
  initialize(): Promise<void>;
  isReady(format: 'interstitial' | 'rewarded'): boolean;
  loadInterstitial(): Promise<AdLoadResult>;
  loadRewarded(): Promise<AdLoadResult>;
  tryShowInterstitial(callbacks?: AdShowCallbacks, businessPlacement?: string): AdShowResult;
  tryShowRewarded(callbacks: RewardedAdCallbacks, businessPlacement?: string): AdShowResult;
  showBanner(position: BannerPosition, layoutSafe: boolean): Promise<AdLoadResult>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  dispose(): void;
}

/** 由安全随机数创建无设备、账号和业务订单信息的展示身份。 */
export function createAdRequestId(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前宿主缺少安全随机数，不能关联广告奖励');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return `ac_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** 授权策略读取异常按禁止处理，避免失败时继续请求广告。 */
export function canRequestAds(options: AdsSdkOptions): boolean {
  try { return options.canRequestAds() === true; } catch { return false; }
}
