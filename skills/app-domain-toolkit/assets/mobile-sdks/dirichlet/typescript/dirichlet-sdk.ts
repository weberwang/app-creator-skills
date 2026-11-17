import { ManagedNativeSdk } from '../../shared/managed-sdk';
import { canRequestAds, createAdRequestId } from '../../capacitor/ad-types';
import type { AdLoadResult, AdShowCallbacks, AdShowEvent, AdShowResult, BannerPosition, MobileAdsSdk, RewardedAdCallbacks } from '../../capacitor/ad-types';
import type { PluginListenerHandle } from '../../capacitor/ad-ports';
import type { DirichletAdEvent, DirichletFormat, DirichletPort, DirichletSdkOptions } from './contracts';

/** 只登记已受理展示，关闭与奖励分别结算。 */
interface Presentation {
  readonly format: DirichletFormat;
  readonly adUnitId: string;
  readonly event: AdShowEvent;
  readonly callbacks: AdShowCallbacks | RewardedAdCallbacks;
  closed: boolean;
  rewarded: boolean;
  failed: boolean;
}

/** 同一原生插件只能有一个有效管理器，防止全局 SDK 回调串入新实例。 */
const owners = new WeakMap<object, DirichletSdk>();
/** 不删除未结算旧请求来给新展示腾位置，达到上限即回退到正常玩法。 */
const MAX_PENDING = 128;

/** 业务观察者的异常不能中断 SDK 资源释放或其他真实回调。 */
function notify(callback: (() => void) | undefined): void {
  try { callback?.(); } catch { /* 业务自行记录和恢复结算错误。 */ }
}

/** 校验原生 long 标识；使用字符串避免 JavaScript 大整数精度损失。 */
function validId(value: string): boolean {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

/** 真实 Dirichlet 聚合管理器，供各引擎接口共享无引擎依赖的具体行为。 */
export class DirichletSdk extends ManagedNativeSdk<DirichletPort> implements MobileAdsSdk {
  readonly provider = 'dirichlet' as const;
  private port: DirichletPort | undefined;
  private listener: PluginListenerHandle | undefined;
  private policyEpoch = 0;
  private ready = new Set<DirichletFormat>();
  private readonly loading = new Map<DirichletFormat, Promise<AdLoadResult>>();
  private readonly presentations = new Map<string, Presentation>();
  private active: Presentation | undefined;
  private bannerDesired = false;
  private bannerEpoch = 0;
  private bannerQueue: Promise<void> = Promise.resolve();

  /** 仅检查已选宿主与配置，不在构造期间下载、初始化或请求广告。 */
  constructor(private readonly config: DirichletSdkOptions) {
    super(config);
    if (config.platform !== 'android') throw new Error('当前原生壳适配仅交付 Android，iOS 需真实原生插件');
    if (!validId(config.mediaId) || !config.mediaName.trim() || !config.mediaKey.trim()) throw new Error('Dirichlet 媒体配置无效');
    for (const unit of Object.values(config.units)) if (unit !== undefined && !validId(unit)) throw new Error('Dirichlet 广告位必须为正整数标识');
  }

  /** 网络隐私配置与应用授权共同决定请求资格，读取异常按禁止处理。 */
  private allowed(): boolean {
    try {
      const initializationAllowed = typeof this.config.initializationAllowed === 'function' ? this.config.initializationAllowed() : this.config.initializationAllowed;
      return this.isActive() && initializationAllowed === true && this.config.nonPersonalizedNetworksConfigured && canRequestAds(this.config);
    } catch { return false; }
  }

  /** 注册真实事件后启动官方 SDK，超时或释放不得被迟到初始化恢复。 */
  protected async boot(isCurrent: () => boolean): Promise<DirichletPort> {
    if (!this.allowed()) throw new Error('Dirichlet 隐私与非个性化前置未满足');
    const port = await this.config.loadPlugin();
    if (!isCurrent()) throw new Error('Dirichlet 初始化已失效');
    if (owners.has(port) && owners.get(port) !== this) throw new Error('Dirichlet 原生插件已有管理器');
    owners.set(port, this);
    this.port = port;
    try {
      const listener = await port.addListener('adEvent', (event) => this.observe(event));
      this.listener = listener;
      if (!isCurrent() || !this.allowed()) throw new Error('Dirichlet 初始化前置已失效');
      await port.initialize({ mediaId: this.config.mediaId, mediaName: this.config.mediaName, mediaKey: this.config.mediaKey,
        initializationAllowed: true, requestsAllowed: true, nonPersonalizedNetworksConfigured: true, debug: this.config.debug === true });
      if (!isCurrent() || !this.allowed()) throw new Error('Dirichlet 初始化结果已失效');
      return port;
    } catch {
      void port.setRequestsAllowed({ allowed: false }).catch(() => {});
      const listener = this.listener;
      this.listener = undefined;
      if (listener) void listener.remove().catch(() => {});
      throw new Error('Dirichlet 初始化未完成');
    }
  }

  /** 授权变化时立即清空旧就绪状态，并通知原生停止加载和横幅刷新。 */
  async refreshPolicy(): Promise<void> {
    ++this.policyEpoch;
    this.ready.clear();
    if (!this.allowed()) { this.bannerDesired = false; ++this.bannerEpoch; }
    const port = this.port;
    if (!port) return;
    await port.setRequestsAllowed({ allowed: this.allowed() });
    if (!this.allowed()) await port.removeBanner();
  }

  /** 只读取真实加载完成且仍获准使用的广告，不在查询中初始化 SDK。 */
  isReady(format: DirichletFormat): boolean { return this.state === 'ready' && this.allowed() && this.ready.has(format); }
  /** 后台加载插屏；同格式重复请求复用在途任务。 */
  loadInterstitial(): Promise<AdLoadResult> { return this.load('interstitial'); }
  /** 后台加载激励，不把预加载挂到过关或继续游戏的等待链上。 */
  loadRewarded(): Promise<AdLoadResult> { return this.load('rewarded'); }

  /** 加载只消费原生真实完成 Promise，策略变化使旧结果失效。 */
  private load(format: DirichletFormat): Promise<AdLoadResult> {
    if (this.state !== 'ready') return Promise.resolve({ status: this.isActive() ? 'not-ready' : 'disposed' });
    if (!this.allowed()) return Promise.resolve({ status: 'restricted' });
    if (!this.config.units[format]) return Promise.resolve({ status: 'unconfigured' });
    const previous = this.loading.get(format);
    if (previous) return previous;
    if (this.ready.has(format)) return Promise.resolve({ status: 'loaded' });
    const epoch = this.policyEpoch;
    const port = this.requirePlugin();
    const task = Promise.resolve().then(async (): Promise<AdLoadResult> => {
      await port.setRequestsAllowed({ allowed: this.allowed() });
      if (!this.allowed() || epoch !== this.policyEpoch) return { status: 'restricted' };
      const options = { adUnitId: this.config.units[format] as string };
      if (format === 'rewarded') await port.loadRewarded(options);
      else await port.loadInterstitial(options);
      if (!this.isActive()) return { status: 'disposed' };
      if (!this.allowed() || epoch !== this.policyEpoch) return { status: 'restricted' };
      this.ready.add(format);
      return { status: 'loaded' };
    }).catch((): AdLoadResult => ({ status: this.isActive() ? 'error' : 'disposed' })).finally(() => {
      if (this.loading.get(format) === task) this.loading.delete(format);
    });
    this.loading.set(format, task);
    return task;
  }

  /** 即时尝试展示插屏，不等待加载或关闭。 */
  tryShowInterstitial(callbacks: AdShowCallbacks = {}, businessPlacement?: string): AdShowResult {
    return this.show('interstitial', callbacks, businessPlacement);
  }
  /** 激励只在官方验证成功回调后通知原请求的奖励所有者。 */
  tryShowRewarded(callbacks: RewardedAdCallbacks, businessPlacement?: string): AdShowResult {
    return this.show('rewarded', callbacks, businessPlacement);
  }

  /** 展示前登记身份以支持同步原生事件，原生受理不等于广告播放成功。 */
  private show(format: DirichletFormat, callbacks: AdShowCallbacks | RewardedAdCallbacks, businessPlacement?: string): AdShowResult {
    if (this.state !== 'ready') return { status: 'not-ready' };
    if (!this.allowed()) return { status: 'restricted' };
    if (!this.config.units[format]) return { status: 'unconfigured' };
    if (this.active || this.presentations.size >= MAX_PENDING) return { status: 'busy' };
    if (!this.ready.has(format)) return { status: 'not-ready' };
    let requestId: string;
    try { requestId = createAdRequestId(); } catch { return { status: 'error' }; }
    const record: Presentation = { format, adUnitId: this.config.units[format] as string, event: { requestId, businessPlacement }, callbacks, closed: false, rewarded: false, failed: false };
    this.presentations.set(requestId, record);
    this.active = record;
    this.ready.delete(format);
    try {
      const options = { adUnitId: record.adUnitId, requestId };
      const result = format === 'rewarded' ? this.requirePlugin().showRewarded(options) : this.requirePlugin().showInterstitial(options);
      void result.catch(() => this.fail(record));
      return { status: 'requested', requestId };
    } catch { this.fail(record); return { status: 'error' }; }
  }

  /** 只接受与已受理对象身份、格式和广告位全部一致的事件。 */
  private observe(event: DirichletAdEvent): void {
    if (!event || typeof event.requestId !== 'string') return;
    const record = this.presentations.get(event.requestId);
    if (!record || record.adUnitId !== event.adUnitId || record.format !== event.format || record.failed) return;
    if (event.kind === 'failed') { this.fail(record); return; }
    if (event.kind === 'closed' && !record.closed) {
      record.closed = true;
      if (this.active === record) this.active = undefined;
      notify(() => record.callbacks.onClosed?.(record.event));
    } else if (event.kind === 'reward' && record.format === 'rewarded' && !record.rewarded && event.verified === true) {
      const value = event.reward;
      if (!value || typeof value.type !== 'string' || !Number.isFinite(value.amount) || value.amount <= 0) return;
      record.rewarded = true;
      notify(() => (record.callbacks as RewardedAdCallbacks).onReward({ ...record.event, reward: { type: value.type, amount: value.amount } }));
    }
    if (record.closed && (record.format === 'interstitial' || record.rewarded)) this.presentations.delete(record.event.requestId);
    this.removeListenerWhenSettled();
  }

  /** 原生明确拒绝展示才结算失败；不得凭本地计时器推断其已关闭。 */
  private fail(record: Presentation): void {
    if (record.failed || !this.presentations.has(record.event.requestId)) return;
    record.failed = true;
    if (this.active === record) this.active = undefined;
    this.presentations.delete(record.event.requestId);
    notify(() => record.callbacks.onFailed?.({ ...record.event, code: 'display-failed' }));
    this.removeListenerWhenSettled();
  }

  /** 横幅操作串行执行，页面隐藏或策略撤回后不会被旧加载再次显示。 */
  showBanner(position: BannerPosition, layoutSafe: boolean): Promise<AdLoadResult> {
    if (this.state !== 'ready') return Promise.resolve({ status: 'not-ready' });
    if (!this.config.units.banner) return Promise.resolve({ status: 'unconfigured' });
    if (!layoutSafe || !this.allowed()) { void this.hideBanner().catch(() => {}); return Promise.resolve({ status: 'restricted' }); }
    if (position !== 'top' && position !== 'bottom') return Promise.resolve({ status: 'error' });
    this.bannerDesired = true;
    const epoch = ++this.bannerEpoch;
    const port = this.requirePlugin();
    const task = this.bannerQueue.then(async (): Promise<AdLoadResult> => {
      if (!this.bannerDesired || !this.allowed() || epoch !== this.bannerEpoch) return { status: 'restricted' };
      await port.setRequestsAllowed({ allowed: true });
      if (!this.bannerDesired || !this.allowed() || epoch !== this.bannerEpoch) return { status: 'restricted' };
      await port.showBanner({ adUnitId: this.config.units.banner as string, position });
      if (!this.bannerDesired || !this.allowed() || epoch !== this.bannerEpoch) {
        await port.removeBanner();
        return { status: this.isActive() ? 'restricted' : 'disposed' };
      }
      return { status: 'loaded' };
    }).catch((): AdLoadResult => ({ status: this.isActive() ? 'error' : 'disposed' }));
    this.bannerQueue = task.then(() => {});
    return task;
  }

  /** 隐藏立即撤销展示意图，原生隐藏不等待旧加载结束。 */
  hideBanner(): Promise<void> { return this.clearBanner(false); }
  /** 移除自己的原生横幅，释放不受广告授权撤回限制。 */
  removeBanner(): Promise<void> { return this.clearBanner(true); }
  /** 清理既立即投递，也在在途加载后再次执行，覆盖迟到原生视图。 */
  private clearBanner(remove: boolean): Promise<void> {
    this.bannerDesired = false;
    ++this.bannerEpoch;
    const port = this.port;
    if (!port) return Promise.resolve();
    const clean = (): Promise<void> => remove ? port.removeBanner() : port.hideBanner();
    void clean().catch(() => {});
    const task = this.bannerQueue.then(clean);
    this.bannerQueue = task.catch(() => {});
    return task;
  }

  /** 页面释放只停止新操作，已受理的真实奖励仍通知原结算所有者。 */
  protected onDispose(): void {
    ++this.policyEpoch;
    this.ready.clear();
    this.bannerDesired = false;
    ++this.bannerEpoch;
    const port = this.port;
    if (port) {
      void port.setRequestsAllowed({ allowed: false }).catch(() => {});
      void port.removeBanner().catch(() => {});
      void port.dispose().catch(() => {});
    }
    this.removeListenerWhenSettled();
  }

  /** 仅在没有待结算展示时注销本实例监听，不能清空其他插件的监听。 */
  private removeListenerWhenSettled(): void {
    if ((this.isActive() && this.state !== 'failed') || this.presentations.size) return;
    const handle = this.listener;
    this.listener = undefined;
    if (handle) void handle.remove().catch(() => {});
  }
}
