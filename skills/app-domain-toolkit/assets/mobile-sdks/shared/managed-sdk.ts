/** 移动 SDK 仅在经过确认的原生 Android／iOS 宿主运行。 */
export interface NativeSdkOptions {
  readonly platform: 'android' | 'ios';
  readonly verifiedNative: boolean;
  readonly initializationAllowed: boolean | (() => boolean);
  readonly timeoutMs: number;
}

/** 初始化状态只属于当前 SDK，不代表广告可展示或数据已送达服务端。 */
export type NativeSdkState = 'idle' | 'initializing' | 'ready' | 'failed' | 'disposed';

/** 为独立 SDK 复用初始化、超时和释放管理，不承载厂商业务 API。 */
export abstract class ManagedNativeSdk<TPlugin> {
  private phase: NativeSdkState = 'idle';
  private plugin: TPlugin | undefined;
  private task: Promise<void> | undefined;
  private source: Promise<TPlugin> | undefined;
  private cancel: (() => void) | undefined;
  private generation = 0;

  /** 构造只校验本地配置，不导入或启动 SDK。 */
  constructor(protected readonly options: NativeSdkOptions) {
    if (!options.verifiedNative || !['android', 'ios'].includes(options.platform)) throw new Error('移动 SDK 仅支持已核实的 Android/iOS 原生宿主');
    if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 2147483647) throw new Error('SDK 初始化超时配置无效');
  }

  /** 读取当前单 SDK 状态。 */
  get state(): NativeSdkState { return this.phase; }
  /** 释放和等待超时不能取消厂商内部操作，真实结束前禁止重建同一 SDK。 */
  get hasPendingInitialization(): boolean { return this.source !== undefined; }

  /** 具体 SDK 仅等待自己的官方前置和真实完成信号。 */
  protected abstract boot(isCurrent: () => boolean): Promise<TPlugin>;

  /** 具名业务方法在每次调用时确认当前 SDK 真实可用。 */
  protected requirePlugin(): TPlugin {
    if (this.phase !== 'ready') throw new Error('SDK 尚未就绪或已释放');
    return this.plugin as TPlugin;
  }

  /** 只用于检查本模块生命周期，不用来丢弃已受理奖励或交易的可信回调。 */
  protected isActive(): boolean { return this.phase !== 'disposed'; }

  /** 子模块清理自己注册的监听，不移除其他 SDK 或应用的监听。 */
  protected onDispose(): void {}

  /** 重复入口复用任务；失败可重试，但旧原生操作未结束时不能再次启动。 */
  initialize(): Promise<void> {
    if (this.phase === 'disposed') return Promise.reject(new Error('SDK 已释放'));
    if (this.phase === 'ready') return Promise.resolve();
    if (this.task) return this.task;
    if (this.source) return Promise.reject(new Error('旧 SDK 初始化仍在进行'));
    let allowed = false;
    try { allowed = (typeof this.options.initializationAllowed === 'function' ? this.options.initializationAllowed() : this.options.initializationAllowed) === true; } catch {}
    if (!allowed) { this.phase = 'failed'; return Promise.reject(new Error('SDK 初始化前置尚未满足')); }
    this.phase = 'initializing';
    const generation = ++this.generation;
    const isCurrent = (): boolean => this.phase === 'initializing' && this.generation === generation;
    const source = Promise.resolve().then(() => {
      if (!isCurrent()) throw new Error('SDK 初始化已失效');
      return this.boot(isCurrent);
    });
    this.source = source;
    void source.then(() => { if (this.source === source) this.source = undefined; }, () => { if (this.source === source) this.source = undefined; });
    let timer: ReturnType<typeof setTimeout>;
    const stop = new Promise<never>((_, reject) => {
      this.cancel = () => reject(new Error('SDK 等待已取消'));
      timer = setTimeout(() => reject(new Error('SDK 初始化超时，真实状态未确认')), this.options.timeoutMs);
    });
    const task = Promise.race([source, stop]).then((plugin) => {
      if (!isCurrent()) throw new Error('SDK 初始化已失效');
      this.plugin = plugin;
      this.phase = 'ready';
    }).catch((error: unknown) => {
      if (isCurrent()) { this.phase = 'failed'; ++this.generation; }
      throw error;
    }).finally(() => {
      clearTimeout(timer);
      if (this.task === task) { this.task = undefined; this.cancel = undefined; }
    });
    this.task = task;
    return task;
  }

  /** 禁止新的业务操作，已发给厂商的操作不能伪称被取消。 */
  dispose(): void {
    if (this.phase === 'disposed') return;
    this.phase = 'disposed';
    ++this.generation;
    this.plugin = undefined;
    this.cancel?.();
    this.onDispose();
  }
}
