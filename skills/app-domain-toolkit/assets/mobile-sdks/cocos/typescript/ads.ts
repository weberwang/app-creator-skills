import { CocosSdkBridge, NativeSdkError, type NativeSdkEvent } from './bridge';
import { NativeSdkManager } from './sdk-manager';

/** 一次仅选一个业务聚合入口，MAX 中的 AdMob 网络适配器不属于第二入口。 */
export type AdProvider = 'admob' | 'max';
/** 由现有授权来源和平台规则共同确定广告是否允许请求。 */
export interface AdsConfig { allowAds: boolean; sdkKey?: string; hasUserConsent: boolean; nonPersonalizedVerified: boolean; maxFlowConfigured?: boolean; layoutSafe: boolean }
/** 原生广告回调；奖励只能由 earned 事件结算，closed 不表示奖励完成。 */
export interface AdEvent { provider: AdProvider; event: string; adUnitId: string; requestId?: number; value?: unknown }

/** 立即返回的展示受理状态；请求已发出不表示广告已展示或已产生奖励。 */
export type AdShowResult = { status: 'requested'; requestId: number } | { status: 'not-ready' | 'restricted' | 'busy' | 'unconfigured' | 'error' };
/** 仅在原生桥失败时通知调用方，不能把请求受理当成展示成功。 */
export type AdShowFailureHandler = (error: unknown) => void;
/** 在同步桥回调也可能重入时，暂存同一次展示的身份。 */
interface ActiveShow { id?: number; events: NativeSdkEvent[] }
/** 各格式单独保存真实加载完成的广告。 */
type FullScreenFormat = 'rewarded' | 'interstitial';

/** 统一广告业务接口，实际调用由选中的原生 SDK 具体类完成。 */
export class MobileAdsSdk extends NativeSdkManager {
  private readonly ready = { rewarded: new Set<string>(), interstitial: new Set<string>() };
  private readonly loading = new Map<string, Promise<void>>();
  private readonly versions = new Map<string, number>();
  private activeShow?: ActiveShow;
  private readonly unsubscribe: () => void;
  /** 持有唯一顶层聚合选择，不同时初始化两个提供方。 */
  constructor(bridge: CocosSdkBridge, timeoutMs: number, readonly provider: AdProvider, private readonly config: AdsConfig) {
    super(bridge, provider, timeoutMs);
    if (provider !== 'admob' && provider !== 'max') throw new NativeSdkError('invalid-ad-provider');
    this.unsubscribe = this.bridge.subscribe((event) => this.observeShowEvent(event));
  }
  /** 提供当前聚合所需配置，不自动发起广告请求。 */
  protected configuration(): object { return { sdkKey: this.config.sdkKey ?? '', hasUserConsent: this.config.hasUserConsent, nonPersonalizedVerified: this.config.nonPersonalizedVerified, maxFlowConfigured: this.config.maxFlowConfigured === true }; }
  /** 广告初始化可能触发网络预加载，必须先满足真实授权前置。 */
  protected override validateConfiguration(): void {
    if (!this.config.allowAds) throw new NativeSdkError('ads-not-authorized');
    if (!this.config.nonPersonalizedVerified) throw new NativeSdkError('ads-privacy-not-configured');
    if (this.provider === 'max' && !this.config.sdkKey) throw new NativeSdkError('max-missing-key');
    if (this.provider === 'max' && !this.config.maxFlowConfigured) throw new NativeSdkError('max-privacy-flow-not-configured');
  }
  /** 订阅平台原始广告状态并保留广告位和请求身份。 */
  onAdEvent(listener: (event: AdEvent) => void): () => void {
    return this.bridge.subscribe((event) => {
      if (event.source !== this.provider || !event.adUnitId) return;
      listener({ provider: this.provider, event: event.event, adUnitId: event.adUnitId, requestId: event.requestId, value: event.value });
    });
  }
  /** 加载激励广告；最终结果来自该广告位的 SDK 回调。 */
  loadRewarded(adUnitId: string): Promise<void> { return this.load('rewarded', adUnitId); }
  /** 后台预加载激励广告，不把加载完成设为游戏继续的条件。 */
  preloadRewarded(adUnitId: string, onFailure?: AdShowFailureHandler): void { this.preload('rewarded', adUnitId, onFailure); }
  /** 只展示已经加载的激励广告，未就绪时立即返回，奖励监听独立处理。 */
  tryShowRewarded(adUnitId: string, onFailure?: AdShowFailureHandler): AdShowResult { return this.tryShow('rewarded', adUnitId, onFailure); }
  /** 加载插屏广告。 */
  loadInterstitial(adUnitId: string): Promise<void> { return this.load('interstitial', adUnitId); }
  /** 后台预加载插屏广告，失败仅通知当前广告业务。 */
  preloadInterstitial(adUnitId: string, onFailure?: AdShowFailureHandler): void { this.preload('interstitial', adUnitId, onFailure); }
  /** 在自然中断点立即尝试插屏，不等待加载、展示或关闭。 */
  tryShowInterstitial(adUnitId: string, onFailure?: AdShowFailureHandler): AdShowResult { return this.tryShow('interstitial', adUnitId, onFailure); }
  /** 创建并加载覆盖式 Banner，位置由项目明确选择。 */
  createBanner(adUnitId: string, position: 'top' | 'bottom'): Promise<void> { if (!this.config.layoutSafe) return Promise.reject(new NativeSdkError('banner-layout-not-confirmed')); return this.adCall('createBanner', adUnitId, { position }); }
  /** 显示已创建的 Banner。 */
  showBanner(adUnitId: string): Promise<void> { return this.adCall('showBanner', adUnitId); }
  /** 隐藏 Banner，内容区域不因此重排。 */
  hideBanner(adUnitId: string): Promise<void> { return this.cleanup('hideBanner', adUnitId); }
  /** 释放指定广告对象，已受理奖励由业务所有者处理。 */
  destroyAd(adUnitId: string): Promise<void> {
    for (const format of ['rewarded', 'interstitial'] as const) { const key = `${format}:${adUnitId}`; this.versions.set(key, (this.versions.get(key) ?? 0) + 1); this.ready[format].delete(adUnitId); }
    return this.cleanup('destroyAd', adUnitId);
  }
  /** 接收当前授权状态，撤回时立即使缓存失效；无需等待隐私流程。 */
  setAdsAllowed(allowed: boolean): void {
    this.config.allowAds = allowed;
    if (allowed) return;
    for (const format of ['rewarded', 'interstitial'] as const) {
      this.ready[format].clear();
      for (const key of this.loading.keys()) if (key.startsWith(`${format}:`)) this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    }
  }
  /** 启动后台加载并隔离同步错误及失败通知，调用者不等待其结果。 */
  private preload(format: FullScreenFormat, adUnitId: string, onFailure?: AdShowFailureHandler): void {
    void Promise.resolve().then(() => this.load(format, adUnitId)).catch((error: unknown) => { try { onFailure?.(error); } catch {} });
  }
  /** 预加载结果仅影响广告自身状态，不把未完成的请求作为游戏屏障。 */
  private load(format: FullScreenFormat, adUnitId: string): Promise<void> {
    if (!this.config.allowAds) return Promise.reject(new NativeSdkError('ads-not-authorized'));
    if (!adUnitId) return Promise.reject(new NativeSdkError('missing-ad-unit'));
    const key = `${format}:${adUnitId}`;
    const existing = this.loading.get(key);
    if (existing) return existing;
    this.ready[format].delete(adUnitId);
    const version = this.versions.get(key) ?? 0;
    const task = this.adCall(format === 'rewarded' ? 'loadRewarded' : 'loadInterstitial', adUnitId).then(() => {
      if (this.state !== 'ready' || !this.config.allowAds || (this.versions.get(key) ?? 0) !== version) throw new NativeSdkError('ad-load-obsolete');
      this.ready[format].add(adUnitId);
    }).finally(() => { if (this.loading.get(key) === task) this.loading.delete(key); });
    this.loading.set(key, task);
    return task;
  }
  /** 跨格式只允许一个全屏展示；真实关闭、失败或原生拒绝时才释放占用。 */
  private tryShow(format: FullScreenFormat, adUnitId: string, onFailure?: AdShowFailureHandler): AdShowResult {
    if (!adUnitId) return { status: 'unconfigured' };
    if (!this.config.allowAds) return { status: 'restricted' };
    if (this.activeShow) return { status: 'busy' };
    if (this.state !== 'ready' || !this.ready[format].has(adUnitId)) return { status: 'not-ready' };
    this.ready[format].delete(adUnitId);
    const active: ActiveShow = { events: [] }; this.activeShow = active;
    try {
      const request = this.begin<void>(format === 'rewarded' ? 'showRewarded' : 'showInterstitial', { adUnitId });
      active.id = request.id;
      for (const event of active.events) this.observeShowEvent(event);
      active.events.length = 0;
      // 调用方无需等待桥响应；异步拒绝仅释放本次占用并通知对应业务。
      void request.result.catch((error: unknown) => { if (this.activeShow === active) this.activeShow = undefined; try { onFailure?.(error); } catch {} });
      return { status: 'requested', requestId: request.id };
    } catch (error) {
      if (this.activeShow === active) this.activeShow = undefined;
      try { onFailure?.(error); } catch {}
      return { status: 'error' };
    }
  }
  /** 只认当前展示自己的真实关闭/失败事件，避免旧回调释放新展示。 */
  private observeShowEvent(event: NativeSdkEvent): void {
    const active = this.activeShow;
    if (!active || event.source !== this.provider || (event.event !== 'closed' && event.event !== 'showFailed')) return;
    if (active.id === undefined) { active.events.push(event); return; }
    if (event.requestId === active.id) this.activeShow = undefined;
  }
  /** 释放自有监听与就绪缓存，业务注册的回调由业务自行注销。 */
  override dispose(): void { this.unsubscribe(); this.ready.rewarded.clear(); this.ready.interstitial.clear(); super.dispose(); }
  /** 撤回授权后仍允许释放资源，不能阻止 Banner 停止刷新。 */
  private cleanup(operation: string, adUnitId: string): Promise<void> {
    if (!adUnitId) return Promise.reject(new NativeSdkError('missing-ad-unit'));
    return this.call<void>(operation, { adUnitId });
  }
  /** 避免把空广告位传入真实 SDK，并在每次操作前重查策略。 */
  private adCall(operation: string, adUnitId: string, extra: object = {}): Promise<void> {
    if (!this.config.allowAds) return Promise.reject(new NativeSdkError('ads-not-authorized'));
    if (!adUnitId) return Promise.reject(new NativeSdkError('missing-ad-unit'));
    return this.call<void>(operation, { adUnitId, ...extra });
  }
}
