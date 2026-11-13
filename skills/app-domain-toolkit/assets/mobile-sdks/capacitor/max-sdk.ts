import { ManagedNativeSdk } from '../shared/managed-sdk';
import { canRequestAds, createAdRequestId } from './ad-types';
import type { AdLoadResult, AdShowCallbacks, AdShowEvent, AdShowResult, AdsSdkOptions, BannerPosition, MobileAdsSdk, RewardedAdCallbacks } from './ad-types';
import type { MaxAdEvent, MaxCordovaPort, MaxEventTarget } from './ad-ports';

/** MAX 官方 Cordova 插件及项目已经核实的初始化前置。 */
export interface MaxSdkOptions extends AdsSdkOptions {
  readonly sdkKey: string;
  readonly eventTarget: MaxEventTarget;
  readonly hasUserConsent: boolean | null;
  readonly doNotSell: boolean;
  readonly termsFlowDisabledVerified: boolean;
  readonly nonPersonalizedRequestsVerified: boolean;
  readonly loadPlugin: () => Promise<MaxCordovaPort>;
  /** 待决奖励达到上限后拒绝新激励展示，不通过超时伪造结算。 */
  readonly maxPendingRewards?: number;
}

/** 单次展示持有唯一 SDK placement 和本地业务标识。 */
interface ShowRequest { readonly event: AdShowEvent; readonly callbacks: AdShowCallbacks | RewardedAdCallbacks; readonly unit: string; rewarded: boolean; closed: boolean }

/** MAX 具体调用与事件关联；不会在构造阶段加载 SDK 或广告。 */
export class MaxSdk extends ManagedNativeSdk<MaxCordovaPort> implements MobileAdsSdk {
  readonly provider = 'max' as const;
  private readonly listeners = new Map<string, EventListener>();
  private readonly rewards = new Map<string, ShowRequest>();
  private active: ShowRequest | undefined;
  private pending = new Map<string, { resolve: (result: AdLoadResult) => void; promise: Promise<AdLoadResult> }>();
  private banner = false;
  private bannerPosition: BannerPosition | undefined;
  private native: MaxCordovaPort | undefined;

  /** 保存项目配置，实际初始化由组合根显式发起。 */
  constructor(private readonly config: MaxSdkOptions) { super(config); }

  /** 按真实 MAX 初始化回调确认就绪，隐私与非个性化设置必须先核实。 */
  protected async boot(isCurrent: () => boolean): Promise<MaxCordovaPort> {
    if (!this.config.sdkKey || !this.config.termsFlowDisabledVerified || !this.config.nonPersonalizedRequestsVerified || !canRequestAds(this.config)) throw new Error('MAX 配置或隐私前置未满足');
    if (!Number.isSafeInteger(this.config.maxPendingRewards ?? 64) || (this.config.maxPendingRewards ?? 64) <= 0) throw new Error('MAX 待决奖励上限无效');
    const sdk = await this.config.loadPlugin();
    if (!isCurrent()) throw new Error('MAX 初始化已失效');
    this.native = sdk;
    if (!sdk.isInitialized()) {
      // 未提供新选择时保留插件已有真实状态，仅首次未知才使用 false。
      sdk.setHasUserConsent(this.config.hasUserConsent ?? sdk.hasUserConsent() ?? false);
      sdk.setDoNotSell(this.config.doNotSell);
      await new Promise<void>((resolve) => sdk.initialize(this.config.sdkKey, () => resolve()));
    }
    if (!isCurrent()) throw new Error('MAX 初始化已失效');
    this.listen('OnInterstitialLoadedEvent', (event) => this.loaded(event, 'interstitial', true));
    this.listen('OnInterstitialLoadFailedEvent', (event) => this.loaded(event, 'interstitial', false));
    this.listen('OnRewardedAdLoadedEvent', (event) => this.loaded(event, 'rewarded', true));
    this.listen('OnRewardedAdLoadFailedEvent', (event) => this.loaded(event, 'rewarded', false));
    this.listen('OnInterstitialHiddenEvent', (event) => this.closed(event, 'interstitial'));
    this.listen('OnRewardedAdHiddenEvent', (event) => this.closed(event, 'rewarded'));
    this.listen('OnInterstitialAdFailedToDisplayEvent', (event) => this.failed(event, 'interstitial'));
    this.listen('OnRewardedAdFailedToDisplayEvent', (event) => this.failed(event, 'rewarded'));
    this.listen('OnRewardedAdReceivedRewardEvent', (event) => this.reward(event));
    return sdk;
  }

  /** 只登记本实例监听，避免覆盖或移除应用其他监听。 */
  private listen(name: string, callback: (event: MaxAdEvent) => void): void {
    const listener: EventListener = (event) => callback(event as MaxAdEvent);
    this.listeners.set(name, listener);
    this.config.eventTarget.addEventListener(name, listener);
  }

  /** 广告加载结果必须匹配当前配置的广告位。 */
  private loaded(event: MaxAdEvent, format: 'interstitial' | 'rewarded', success: boolean): void {
    if (event.adUnitId !== this.config.units[format]) return;
    const request = this.pending.get(format);
    if (!request) return;
    this.pending.delete(format);
    request.resolve({ status: this.state === 'disposed' ? 'disposed' : success ? 'loaded' : 'error' });
  }

  /** 加载只投递原生请求，不把 void 调用当作成功。 */
  private load(format: 'interstitial' | 'rewarded'): Promise<AdLoadResult> {
    if (!canRequestAds(this.config)) return Promise.resolve({ status: 'restricted' });
    const unit = this.config.units[format];
    if (!unit) return Promise.resolve({ status: 'unconfigured' });
    const sdk = this.requirePlugin();
    if (this.isReady(format)) return Promise.resolve({ status: 'loaded' });
    const existing = this.pending.get(format);
    if (existing) return existing.promise;
    let resolve!: (result: AdLoadResult) => void;
    const promise = new Promise<AdLoadResult>((done) => { resolve = done; });
    this.pending.set(format, { resolve, promise });
    try { if (format === 'interstitial') sdk.loadInterstitial(unit); else sdk.loadRewardedAd(unit); }
    catch { this.pending.delete(format); resolve({ status: 'error' }); }
    return promise;
  }
  /** 后台加载插页。 */
  loadInterstitial(): Promise<AdLoadResult> { return this.load('interstitial'); }
  /** 后台加载激励视频。 */
  loadRewarded(): Promise<AdLoadResult> { return this.load('rewarded'); }
  /** 读取官方插件缓存的真实就绪状态。 */
  isReady(format: 'interstitial' | 'rewarded'): boolean {
    if (this.state !== 'ready' || !canRequestAds(this.config)) return false;
    const unit = this.config.units[format];
    if (!unit) return false;
    const sdk = this.requirePlugin();
    return format === 'interstitial' ? sdk.isInterstitialReady(unit) : sdk.isRewardedAdReady(unit);
  }

  /** 不等待展示或奖励，唯一随机 placement 用于区分迟到回调。 */
  private show(format: 'interstitial' | 'rewarded', callbacks: AdShowCallbacks | RewardedAdCallbacks, businessPlacement?: string): AdShowResult {
    if (!canRequestAds(this.config)) return { status: 'restricted' };
    const unit = this.config.units[format];
    if (!unit) return { status: 'unconfigured' };
    if (this.active) return { status: 'busy' };
    // 保留迟到奖励所需的关联，但拒绝无限积累未结算请求。
    if (format === 'rewarded' && this.rewards.size >= (this.config.maxPendingRewards ?? 64)) return { status: 'busy' };
    if (!this.isReady(format)) return { status: 'not-ready' };
    let requestId: string;
    try { requestId = createAdRequestId(); } catch { return { status: 'error' }; }
    const request: ShowRequest = { unit, event: { requestId, businessPlacement }, callbacks, rewarded: false, closed: false };
    this.active = request;
    if (format === 'rewarded') this.rewards.set(requestId, request);
    try {
      const sdk = this.requirePlugin();
      if (format === 'rewarded') sdk.showRewardedAd(unit, requestId); else sdk.showInterstitial(unit, requestId);
      return { status: 'requested', requestId };
    } catch { this.active = undefined; this.rewards.delete(requestId); return { status: 'error' }; }
  }
  /** 尝试展示插页。 */
  tryShowInterstitial(callbacks: AdShowCallbacks = {}, businessPlacement?: string): AdShowResult { return this.show('interstitial', callbacks, businessPlacement); }
  /** 尝试展示激励视频，奖励仅来自匹配的原生事件。 */
  tryShowRewarded(callbacks: RewardedAdCallbacks, businessPlacement?: string): AdShowResult { return this.show('rewarded', callbacks, businessPlacement); }

  /** 匹配 SDK 返回的 placement 与广告位，未知事件不能操作当前展示。 */
  private matches(event: MaxAdEvent, request: ShowRequest | undefined): request is ShowRequest { return !!request && event.adUnitId === request.unit && event.placement === request.event.requestId; }
  /** 平台关闭只通知关闭，不推断奖励。 */
  private closed(event: MaxAdEvent, format: 'interstitial' | 'rewarded'): void {
    const request = this.active;
    if (!this.matches(event, request) || request.unit !== this.config.units[format] || request.closed) return;
    request.closed = true;
    this.active = undefined;
    try { request.callbacks.onClosed?.(request.event); } catch {}
  }
  /** 展示失败不发奖并取消对应展示记录。 */
  private failed(event: MaxAdEvent, format: 'interstitial' | 'rewarded'): void {
    const request = this.active;
    if (!this.matches(event, request) || request.unit !== this.config.units[format]) return;
    this.active = undefined;
    this.rewards.delete(request.event.requestId);
    try { request.callbacks.onFailed?.({ ...request.event, code: 'display-failed' }); } catch {}
  }
  /** 允许关闭后的可信迟到奖励，重复或无法关联的通知不发奖。 */
  private reward(event: MaxAdEvent): void {
    if (!event.placement) return;
    const request = this.rewards.get(event.placement);
    if (!this.matches(event, request) || request.rewarded || typeof event.rewardAmount !== 'number' || !Number.isFinite(event.rewardAmount) || typeof event.rewardLabel !== 'string') return;
    request.rewarded = true;
    this.rewards.delete(event.placement);
    try { (request.callbacks as RewardedAdCallbacks).onReward({ ...request.event, reward: { amount: event.rewardAmount, type: event.rewardLabel } }); } catch {}
    if (this.state === 'disposed' && !this.rewards.size) this.removeListeners();
  }

  /** 布局安全且业务请求显示时才创建横幅。 */
  async showBanner(position: BannerPosition, layoutSafe: boolean): Promise<AdLoadResult> {
    if (!canRequestAds(this.config) || !layoutSafe) { await this.hideBanner(); return { status: 'restricted' }; }
    const unit = this.config.units.banner;
    if (!unit) return { status: 'unconfigured' };
    const sdk = this.requirePlugin();
    try {
      // 原生 Banner 创建后位置不会随 show 改变，位置变更时先销毁再按新位置创建。
      if (this.banner && this.bannerPosition !== position) { sdk.destroyBanner(unit); this.banner = false; }
      if (!this.banner) { sdk.createBanner(unit, position === 'top' ? 'top_center' : 'bottom_center'); this.banner = true; this.bannerPosition = position; }
      sdk.showBanner(unit); return { status: 'requested' };
    }
    catch { return { status: 'error' }; }
  }
  /** 隐藏已创建横幅，不改变游戏内容视口。 */
  async hideBanner(): Promise<void> { if (this.banner && this.config.units.banner) this.requirePlugin().hideBanner(this.config.units.banner); }
  /** 销毁当前横幅实例。 */
  async removeBanner(): Promise<void> { if (this.banner && this.config.units.banner) { this.requirePlugin().destroyBanner(this.config.units.banner); this.banner = false; } }
  /** 注销本实例监听。 */
  private removeListeners(): void { for (const [name, listener] of this.listeners) this.config.eventTarget.removeEventListener(name, listener); this.listeners.clear(); }
  /** 结束未完成加载；受理的奖励仍保留监听直至可信回调。 */
  protected onDispose(): void {
    for (const request of this.pending.values()) request.resolve({ status: 'disposed' });
    this.pending.clear();
    if (this.banner && this.native && this.config.units.banner) { try { this.native.destroyBanner(this.config.units.banner); } catch {} this.banner = false; }
    if (!this.rewards.size) this.removeListeners();
  }
}
