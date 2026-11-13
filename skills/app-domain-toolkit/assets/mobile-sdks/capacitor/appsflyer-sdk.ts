import { ManagedNativeSdk, type NativeSdkOptions } from '../shared/managed-sdk';
import type { EventParameters } from '../shared/contracts';
import type { AppsFlyerPlugin } from './appsflyer-ports';

/** 实际配置由项目提供，不把 SDK key 或归因载荷写入诊断日志。 */
export interface AppsFlyerOptions extends NativeSdkOptions {
  readonly devKey: string;
  readonly appId?: string | null;
  readonly loadPlugin: () => Promise<AppsFlyerPlugin>;
  readonly onConversion?: (data: unknown) => void;
  readonly onConversionError?: (error: unknown) => void;
  readonly onDeepLink?: (data: unknown) => void;
  readonly onSessionError?: (error: unknown) => void;
}

/** AppsFlyer 7 的独立初始化、session-ready 启动与具名事件接口。 */
export class AppsFlyerSdk extends ManagedNativeSdk<AppsFlyerPlugin> {
  private native: AppsFlyerPlugin | undefined;
  private cancelWaiting: (() => void) | undefined;
  private session: Promise<void> | undefined;
  private epoch = 0;
  private stopped = false;
  private ownsDeepLink = false;
  private ownsConversion = false;
  private ownsSession = false;
  private cleanup: Promise<void> = Promise.resolve();
  private registrations: Promise<void>[] = [];

  /** 构造不加载插件，iOS 必须有项目真实 Apple 应用 ID。 */
  constructor(private readonly config: AppsFlyerOptions) {
    super(config);
  }

  /** 业务通知抛错不能破坏官方会话启动或内部监听清理。 */
  private deliver(callback: ((data: unknown) => void) | undefined, data: unknown): void { try { callback?.(data); } catch {} }

  /** 先记录登记任务再调用插件，覆盖插件同步回调中应用立即释放的情况。 */
  private register(action: () => Promise<void>): Promise<void> {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const task = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    this.registrations.push(task);
    try { void action().then(resolve, reject); } catch (error) { reject(error); }
    return task;
  }

  /** 首次真实 start 完成才就绪，后续原生前台 session 继续按官方回调启动。 */
  protected async boot(isCurrent: () => boolean): Promise<AppsFlyerPlugin> {
    if (!this.config.devKey || (this.config.platform === 'ios' && !this.config.appId)) throw new Error('AppsFlyer 配置不完整');
    const plugin = await this.config.loadPlugin();
    if (!isCurrent()) throw new Error('AppsFlyer 初始化已失效');
    this.native = plugin;
    this.registrations = [];
    const epoch = ++this.epoch;
    let invalid = false;
    const valid = (): boolean => !invalid && epoch === this.epoch && this.isActive() && !this.stopped && (isCurrent() || this.state === 'ready');
    if (this.config.onDeepLink) {
      this.ownsDeepLink = true;
      try {
        await this.register(() => plugin.registerDeepLinkListener({ onDeepLinking: (data) => { if (valid()) this.deliver(this.config.onDeepLink, data); } }));
        if (!isCurrent()) throw new Error('AppsFlyer 初始化已失效');
      } catch (error) { return this.failAfterCleanup(error); }
    }
    let resolveFirst!: () => void;
    let rejectFirst!: (error: unknown) => void;
    let firstResolved = false;
    const firstStart = new Promise<void>((resolve, reject) => { resolveFirst = resolve; rejectFirst = reject; });
    // 尚未发起 start 时可结束本地等待；已经发出的 init/register 仍须真实结束。
    this.cancelWaiting = () => { if (!this.session) resolveFirst(); };
    /** 注册失败后禁止迟到 session-ready 启动新的数据请求。 */
    const fail = (error: unknown): void => { invalid = true; rejectFirst(error); };
    const initialization = this.register(() => plugin.init({ devKey: this.config.devKey, appId: this.config.appId ?? null }));
    // 监听登记必须在 init Promise 结算前同步发起，不能放到 init.then 中。
    this.ownsConversion = true;
    const conversion = this.register(() => plugin.registerConversionListener({
      onConversionDataSuccess: (data) => { if (valid()) this.deliver(this.config.onConversion, data); },
      onConversionDataFail: (error) => { if (valid()) this.deliver(this.config.onConversionError, error); },
    }));
    this.ownsSession = true;
    const registration = this.register(() => plugin.registerSessionReadyListener(() => {
      if (!valid()) { resolveFirst(); return; }
      if (this.session) return;
      const work = initialization.then(async () => {
        if (!valid()) return;
        await plugin.start({ awaitResponse: true });
      });
      this.session = work;
      void work.then(() => {
        if (!firstResolved) { firstResolved = true; resolveFirst(); }
      }, (error) => {
        if (!firstResolved) fail(error);
        else this.deliver(this.config.onSessionError, error);
      }).finally(() => { if (this.session === work) this.session = undefined; });
    }));
    for (const pending of [initialization, conversion, registration]) void pending.catch(fail);
    const results = await Promise.allSettled([initialization, conversion, registration, firstStart]);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) return this.failAfterCleanup(failure.reason);
    return plugin;
  }

  /** 插件事件调用完成不代表归因已经回传或服务端已经消费。 */
  logEvent(eventName: string, eventValues: EventParameters = {}): Promise<void> {
    const plugin = this.requirePlugin();
    if (this.stopped) return Promise.reject(new Error('AppsFlyer 已停用'));
    if (!eventName || eventName.length > 45) return Promise.reject(new Error('AppsFlyer 事件名无效'));
    return plugin.logEvent({ eventName, eventValues });
  }
  /** UID 只返回给已获授权的业务，不自动记录或注入其他事件。 */
  getAppsFlyerUID(): Promise<string | null> {
    if (this.stopped) return Promise.reject(new Error('AppsFlyer 已停用'));
    return this.requirePlugin().getAppsFlyerUID();
  }
  /** 先阻止本地新事件，再请求官方停止；不把函数调用当网络已经停止。 */
  async stop(): Promise<void> {
    const plugin = this.requirePlugin();
    this.stopped = true;
    await plugin.stop({ shouldStop: true });
  }
  /** 只注销本管理器实际登记的 AppsFlyer 监听。 */
  private async detach(): Promise<void> {
    const plugin = this.native;
    if (!plugin) return;
    await Promise.allSettled(this.registrations);
    const operations: Promise<void>[] = [];
    if (this.ownsSession) { this.ownsSession = false; operations.push(plugin.unregisterSessionReadyListener()); }
    if (this.ownsConversion) { this.ownsConversion = false; operations.push(plugin.unregisterConversionListener()); }
    if (this.ownsDeepLink) { this.ownsDeepLink = false; operations.push(plugin.unregisterDeepLinkListener()); }
    const result = await Promise.allSettled(operations);
    if (result.some((item) => item.status === 'rejected')) throw new Error('AppsFlyer 监听清理未完成');
  }
  /** 初始化失败仍清理部分登记监听，原始失败和清理状态分别供调用方观察。 */
  private async failAfterCleanup(error: unknown): Promise<never> {
    this.cleanup = this.detach();
    try { await this.cleanup; } catch {}
    throw error;
  }
  /** 释放不伪称取消已发出的 start，停采集由业务显式调用 stop。 */
  protected onDispose(): void {
    ++this.epoch;
    this.cancelWaiting?.();
    this.cleanup = this.detach();
    void this.cleanup.catch(() => {});
  }
  /** 应用有序关闭时可观察监听清理，不作为其他 SDK 的启动屏障。 */
  waitForCleanup(): Promise<void> { return this.cleanup; }
}
