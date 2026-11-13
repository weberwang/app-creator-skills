import { ManagedNativeSdk } from '../shared/managed-sdk';
import { canRequestAds, createAdRequestId } from './ad-types';
import type { AdFormat, AdLoadResult, AdShowCallbacks, AdShowEvent, AdShowResult, AdsSdkOptions, BannerPosition, MobileAdsSdk, RewardedAdCallbacks } from './ad-types';
import type { AdMobInitializationOptions, AdMobPort, PluginListenerHandle } from './ad-ports';

/** AdMob 官方社区 Capacitor 插件的受控初始化和广告位配置。 */
export interface AdMobSdkOptions extends AdsSdkOptions {
  readonly loadPlugin: () => Promise<AdMobPort>;
  /** 平台隐私配置和初始化可能触发的预加载已按项目的非个性化要求核实。 */
  readonly nonPersonalizedInitializationVerified: boolean;
  readonly initialization?: AdMobInitializationOptions;
  readonly isTesting?: boolean;
}

/** 本地持有一次展示身份，插件事件不包含广告位或请求身份。 */
interface ActiveShow {
  readonly format: 'interstitial' | 'rewarded';
  readonly event: AdShowEvent;
  readonly callbacks: AdShowCallbacks | RewardedAdCallbacks;
  failed: boolean;
  closed: boolean;
  rewarded: boolean;
}

/** 调用业务观察者不应破坏 SDK 的后续关闭或奖励处理。 */
function notify(callback: (() => void) | undefined): void {
  try { callback?.(); } catch { /* 业务回调自行处理持久化与错误。 */ }
}

/** AdMob 聚合器：具名调用官方插件，并独立管理加载、展示和奖励。 */
export class AdMobSdk extends ManagedNativeSdk<AdMobPort> implements MobileAdsSdk {
  readonly provider = 'admob' as const;
  private initialization: { readonly plugin: AdMobPort; readonly task: Promise<void> } | undefined;
  private handles: PluginListenerHandle[] = [];
  private cleanupPlugin: AdMobPort | undefined;
  private interstitialId: string | undefined;
  private rewardedId: string | undefined;
  private interstitialLoad: Promise<AdLoadResult> | undefined;
  private rewardedLoad: Promise<AdLoadResult> | undefined;
  private active: ActiveShow | undefined;
  private bannerCreated = false;
  private bannerPosition: BannerPosition | undefined;
  private bannerDesired = false;
  private bannerRemoved = false;
  private bannerEpoch = 0;
  private bannerQueue: Promise<void> = Promise.resolve();

  /** 保存真实配置和延迟加载器；构造阶段不触碰插件。 */
  constructor(private readonly config: AdMobSdkOptions) { super(config); }

  /** 初始化前确认真实隐私前置，成功只依据插件返回的完成 Promise。 */
  protected async boot(isCurrent: () => boolean): Promise<AdMobPort> {
    if (!this.config.nonPersonalizedInitializationVerified || !canRequestAds(this.config)) throw new Error('AdMob 初始化的隐私或非个性化前置未满足');
    let attempt = this.initialization;
    if (!attempt) {
      const plugin = await this.config.loadPlugin();
      if (!isCurrent()) throw new Error('AdMob 初始化已失效');
      const task = plugin.initialize(this.config.initialization);
      attempt = { plugin, task };
      this.initialization = attempt;
    }
    try { await attempt.task; } catch (error) { if (this.initialization === attempt) this.initialization = undefined; throw error; }
    if (!isCurrent()) throw new Error('AdMob 初始化已失效');
    const handles: PluginListenerHandle[] = [];
    try {
      // 原生插件事件不带展示 ID，同一时刻只允许一个全屏请求。
      handles.push(await attempt.plugin.addListener('interstitialAdDismissed', () => this.close('interstitial')));
      handles.push(await attempt.plugin.addListener('interstitialAdFailedToShow', () => this.fail('interstitial')));
      handles.push(await attempt.plugin.addListener('onRewardedVideoAdDismissed', () => this.close('rewarded')));
      handles.push(await attempt.plugin.addListener('onRewardedVideoAdFailedToShow', () => this.fail('rewarded')));
      if (!isCurrent()) throw new Error('AdMob 监听注册已失效');
      this.handles = handles;
      this.cleanupPlugin = attempt.plugin;
      return attempt.plugin;
    } catch (error) {
      for (const handle of handles) void handle.remove().catch(() => {});
      throw error;
    }
  }

  /** 读取已完成加载的广告对象；未经授权或未就绪不显示。 */
  isReady(format: 'interstitial' | 'rewarded'): boolean {
    return this.state === 'ready' && canRequestAds(this.config) && Boolean(format === 'interstitial' ? this.interstitialId : this.rewardedId);
  }

  /** 在后台加载插页，同一格式的重复加载复用已有任务。 */
  loadInterstitial(): Promise<AdLoadResult> {
    if (this.interstitialLoad) return this.interstitialLoad;
    if (this.state !== 'ready') return Promise.resolve({ status: 'not-ready' });
    if (!canRequestAds(this.config)) return Promise.resolve({ status: 'restricted' });
    if (!this.config.units.interstitial) return Promise.resolve({ status: 'unconfigured' });
    const plugin = this.requirePlugin();
    const task = plugin.prepareInterstitial({ adId: this.config.units.interstitial, npa: true, isTesting: this.config.isTesting })
      .then((info): AdLoadResult => {
        if (!this.isActive()) return { status: 'disposed' };
        if (!canRequestAds(this.config)) return { status: 'restricted' };
        if (!info?.adUnitId) return { status: 'error' };
        this.interstitialId = info.adUnitId;
        return { status: 'loaded' };
      }, (): AdLoadResult => ({ status: this.isActive() ? 'error' : 'disposed' }))
      .finally(() => { if (this.interstitialLoad === task) this.interstitialLoad = undefined; });
    this.interstitialLoad = task;
    return task;
  }

  /** 在后台加载激励视频，测试模式按 SDK 实际返回的广告位进行展示。 */
  loadRewarded(): Promise<AdLoadResult> {
    if (this.rewardedLoad) return this.rewardedLoad;
    if (this.state !== 'ready') return Promise.resolve({ status: 'not-ready' });
    if (!canRequestAds(this.config)) return Promise.resolve({ status: 'restricted' });
    if (!this.config.units.rewarded) return Promise.resolve({ status: 'unconfigured' });
    const plugin = this.requirePlugin();
    const task = plugin.prepareRewardVideoAd({ adId: this.config.units.rewarded, npa: true, isTesting: this.config.isTesting })
      .then((info): AdLoadResult => {
        if (!this.isActive()) return { status: 'disposed' };
        if (!canRequestAds(this.config)) return { status: 'restricted' };
        if (!info?.adUnitId) return { status: 'error' };
        this.rewardedId = info.adUnitId;
        return { status: 'loaded' };
      }, (): AdLoadResult => ({ status: this.isActive() ? 'error' : 'disposed' }))
      .finally(() => { if (this.rewardedLoad === task) this.rewardedLoad = undefined; });
    this.rewardedLoad = task;
    return task;
  }

  /** 向业务立即返回展示请求受理结果，不等待插页关闭。 */
  tryShowInterstitial(callbacks: AdShowCallbacks = {}, businessPlacement?: string): AdShowResult {
    const prepared = this.prepareShow('interstitial', callbacks, businessPlacement);
    if ('status' in prepared) return prepared;
    const { active, plugin } = prepared;
    const adId = this.interstitialId;
    this.interstitialId = undefined;
    try {
      void plugin.showInterstitial({ adId }).catch(() => this.failRecord(active));
      return { status: 'requested', requestId: active.event.requestId };
    } catch { this.failRecord(active); return { status: 'error' }; }
  }

  /** 仅官方奖励 Promise 返回有效奖励才通知业务；关闭事件本身不发奖。 */
  tryShowRewarded(callbacks: RewardedAdCallbacks, businessPlacement?: string): AdShowResult {
    const prepared = this.prepareShow('rewarded', callbacks, businessPlacement);
    if ('status' in prepared) return prepared;
    const { active, plugin } = prepared;
    const adId = this.rewardedId;
    this.rewardedId = undefined;
    try {
      // Promise 与本次调用绑定，因此即使关闭或渠道释放后才到达也不会归到新请求。
      void plugin.showRewardVideoAd({ adId }).then((reward) => {
        if (active.rewarded || active.failed || !reward || typeof reward.type !== 'string' || !Number.isFinite(reward.amount)) return;
        active.rewarded = true;
        notify(() => callbacks.onReward({ ...active.event, reward: { type: reward.type, amount: reward.amount } }));
      }, () => this.failRecord(active));
      return { status: 'requested', requestId: active.event.requestId };
    } catch { this.failRecord(active); return { status: 'error' }; }
  }

  /** 首次请求才创建横幅；切换位置时先删除旧原生视图。 */
  showBanner(position: BannerPosition, layoutSafe: boolean): Promise<AdLoadResult> {
    if (this.state !== 'ready') return Promise.resolve({ status: 'not-ready' });
    if (!this.config.units.banner) return Promise.resolve({ status: 'unconfigured' });
    if (!layoutSafe || !canRequestAds(this.config)) { void this.hideBanner(); return Promise.resolve({ status: 'restricted' }); }
    this.bannerDesired = true;
    this.bannerRemoved = false;
    const epoch = ++this.bannerEpoch;
    const plugin = this.requirePlugin();
    const operation = this.bannerQueue.then(async (): Promise<AdLoadResult> => {
      if (!this.isActive() || !this.bannerDesired || epoch !== this.bannerEpoch || !canRequestAds(this.config)) return { status: 'restricted' };
      try {
        if (this.bannerCreated && this.bannerPosition !== position) { await plugin.removeBanner(); this.bannerCreated = false; }
        if (this.bannerCreated) await plugin.resumeBanner();
        else {
          await plugin.showBanner({ adId: this.config.units.banner as string, npa: true, isTesting: this.config.isTesting, position: position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER', adSize: 'ADAPTIVE_BANNER' });
          this.bannerCreated = true;
          this.bannerPosition = position;
        }
        // 加载期间若页面退出或授权撤回，再次隐藏/销毁迟到的原生视图。
        if (!this.isActive() || !this.bannerDesired || epoch !== this.bannerEpoch || !canRequestAds(this.config)) {
          if (this.bannerRemoved || !this.isActive()) { await plugin.removeBanner(); this.bannerCreated = false; }
          else await plugin.hideBanner();
          return { status: this.isActive() ? 'restricted' : 'disposed' };
        }
        return { status: 'requested' };
      } catch { this.bannerCreated = false; return { status: this.isActive() ? 'error' : 'disposed' }; }
    });
    this.bannerQueue = operation.then(() => {}, () => {});
    return operation;
  }

  /** 立即取消可见意图；排队后再次隐藏可能迟到的视图。 */
  hideBanner(): Promise<void> {
    this.bannerDesired = false;
    ++this.bannerEpoch;
    if (this.state !== 'ready') return Promise.resolve();
    const plugin = this.requirePlugin();
    void plugin.hideBanner().catch(() => {});
    const operation = this.bannerQueue.then(async () => { if (this.bannerCreated) await plugin.hideBanner(); });
    this.bannerQueue = operation.catch(() => {});
    return operation;
  }

  /** 销毁本实例的横幅，不触碰其他 SDK 的视图。 */
  removeBanner(): Promise<void> {
    this.bannerDesired = false;
    this.bannerRemoved = true;
    ++this.bannerEpoch;
    if (this.state !== 'ready') return Promise.resolve();
    const plugin = this.requirePlugin();
    void plugin.removeBanner().catch(() => {});
    const operation = this.bannerQueue.then(async () => { if (this.bannerCreated) await plugin.removeBanner(); this.bannerCreated = false; });
    this.bannerQueue = operation.catch(() => {});
    return operation;
  }

  /** 释放只移除本实例监听和横幅；已受理的奖励 Promise 仍属于原业务请求。 */
  protected onDispose(): void {
    this.bannerDesired = false;
    this.bannerRemoved = true;
    ++this.bannerEpoch;
    this.interstitialId = undefined;
    this.rewardedId = undefined;
    for (const handle of this.handles.splice(0)) void handle.remove().catch(() => {});
    if (this.cleanupPlugin) void this.cleanupPlugin.removeBanner().catch(() => {});
  }

  /** 统一检查就绪、授权和单全屏锁，保持业务调用同步返回。 */
  private prepareShow(format: 'interstitial' | 'rewarded', callbacks: AdShowCallbacks | RewardedAdCallbacks, businessPlacement?: string): { active: ActiveShow; plugin: AdMobPort } | AdShowResult {
    if (this.state !== 'ready') return { status: 'not-ready' };
    if (!canRequestAds(this.config)) return { status: 'restricted' };
    if (!this.config.units[format]) return { status: 'unconfigured' };
    if (this.active) return { status: 'busy' };
    if (!this.isReady(format)) return { status: 'not-ready' };
    let requestId: string;
    try { requestId = createAdRequestId(); } catch { return { status: 'error' }; }
    const active: ActiveShow = { format, event: { requestId, businessPlacement }, callbacks, failed: false, closed: false, rewarded: false };
    this.active = active;
    return { active, plugin: this.requirePlugin() };
  }

  /** 插件关闭事件只结束当前对应格式，不推断激励成功。 */
  private close(format: ActiveShow['format']): void {
    const current = this.active;
    if (!current || current.format !== format || current.closed) return;
    current.closed = true;
    this.active = undefined;
    notify(() => current.callbacks.onClosed?.(current.event));
  }

  /** 插件失败事件只结束当前格式。 */
  private fail(format: ActiveShow['format']): void {
    const current = this.active;
    if (current && current.format === format) this.failRecord(current);
  }

  /** 原生拒绝只通知原请求，不会清掉随后已经开始的另一请求。 */
  private failRecord(current: ActiveShow): void {
    if (current.failed || current.closed) return;
    current.failed = true;
    if (this.active === current) this.active = undefined;
    notify(() => current.callbacks.onFailed?.({ ...current.event, code: 'display-failed' }));
  }
}
