import type { ChannelCapabilities, ChannelPlatform, ChannelState, InitializationOptions } from './contracts';

/** 独立维护单个渠道的初始化、超时和 SDK 句柄生命周期。 */
export abstract class ChannelBase<TApi extends object> implements ChannelCapabilities<TApi> {
  abstract readonly platform: ChannelPlatform;
  private currentState: ChannelState = 'idle';
  private currentApi: TApi | undefined;
  private task: Promise<void> | undefined;
  private pendingSource: Promise<object> | undefined;
  private cancelPending: (() => void) | undefined;
  private generation = 0;

  /** 接收由项目决定的有限等待时间。 */
  constructor(private readonly options: InitializationOptions) {
    if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 2147483647) throw new Error('SDK 初始化超时必须在有效范围内');
  }

  /** 只暴露适配器自身状态。 */
  get state(): ChannelState { return this.currentState; }

  /** 向同作用域的选择器暴露底层操作是否确实结束。 */
  get hasPendingInitialization(): boolean { return this.pendingSource !== undefined; }

  /** SDK 尚未真实就绪或已释放时禁止调用。 */
  get api(): TApi {
    this.assertReady();
    return this.currentApi as TApi;
  }

  /** 实际加载宿主 SDK 并按其合同等待初始化。 */
  protected abstract load(isCurrent: () => boolean): Promise<object>;

  /** 由具体渠道创建具名方法实现，生命周期层不处理 SDK 业务接口。 */
  protected abstract createApi(sdk: object, assertReady: () => void): TApi;

  /** 校验渠道句柄没有被超时、重试或释放替换。 */
  private assertReady = (): void => {
    if (this.currentState !== 'ready') throw new Error('渠道 SDK 尚未就绪或已释放');
  };

  /** 幂等复用当前任务；超时后旧 SDK 仍在运行时避免重复初始化。 */
  initialize(): Promise<void> {
    if (this.currentState === 'disposed') return Promise.reject(new Error('渠道 SDK 已释放'));
    if (this.currentState === 'ready') return Promise.resolve();
    if (this.task) return this.task;
    if (this.pendingSource) return Promise.reject(new Error('上一次 SDK 初始化尚未结束'));
    this.currentState = 'initializing';
    const generation = ++this.generation;
    const isCurrent = (): boolean => this.generation === generation && this.currentState === 'initializing';
    const source = Promise.resolve().then(() => this.load(isCurrent));
    this.pendingSource = source;
    // 等待超时并不取消厂商内部操作；旧任务结束前不能再启动同一 SDK。
    void source.then(() => { if (this.pendingSource === source) this.pendingSource = undefined; }, () => { if (this.pendingSource === source) this.pendingSource = undefined; });
    let timer: ReturnType<typeof setTimeout>;
    const stop = new Promise<never>((_, reject) => {
      this.cancelPending = () => reject(new Error('渠道 SDK 初始化已取消'));
      timer = setTimeout(() => reject(new Error('渠道 SDK 初始化超时')), this.options.timeoutMs);
    });
    const task = Promise.race([source, stop]).then((sdk) => {
      if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
      this.currentApi = this.createApi(sdk, this.assertReady);
      this.currentState = 'ready';
    }).catch((error: unknown) => {
      if (isCurrent()) { this.currentState = 'failed'; ++this.generation; }
      throw error;
    }).finally(() => {
      clearTimeout(timer);
      if (this.task === task) { this.task = undefined; this.cancelPending = undefined; }
    });
    this.task = task;
    return task;
  }

  /** 释放后立即使全部已有句柄和迟到初始化结果失效。 */
  dispose(): void {
    if (this.currentState === 'disposed') return;
    this.currentState = 'disposed';
    ++this.generation;
    this.currentApi = undefined;
    this.cancelPending?.();
  }
}
