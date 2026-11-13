import { CocosSdkBridge, NativeSdkError, type NativeSdkRequest } from './bridge';

/** 每个 SDK 独立管理状态，不能把所有 SDK 捆成启动屏障。 */
export type NativeSdkState = 'idle' | 'initializing' | 'ready' | 'failed' | 'disposed';

/** 保留初始化时真实原生请求，超时或释放不会假装取消 SDK 内部操作。 */
export abstract class NativeSdkManager {
  private currentState: NativeSdkState = 'idle';
  private inFlight?: Promise<void>;
  private underlying?: Promise<unknown>;
  private generation = 0;
  /** 仅记录当前 SDK 的桥接通道与等待期限。 */
  protected constructor(protected readonly bridge: CocosSdkBridge, protected readonly service: string, private readonly timeoutMs: number) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) throw new Error('SDK 等待时间无效');
  }
  /** 当前 SDK 状态，与其他 SDK 相互独立。 */
  get state(): NativeSdkState { return this.currentState; }
  /** 真实原生初始化是否还未响应，供组合根安全处理重选。 */
  get hasPendingInitialization(): boolean { return this.underlying !== undefined; }
  /** 渠道具体实现给出自己的初始化参数。 */
  protected abstract configuration(): object;
  /** 初始化前置策略必须由项目确认，不能用默认值伪造授权。 */
  protected validateConfiguration(): void {}
  /** 重复调用复用请求，超时不当作成功，也不能重复启动仍在运行的 SDK。 */
  initialize(): Promise<void> {
    if (this.currentState === 'disposed') return Promise.reject(new NativeSdkError('disposed'));
    if (this.currentState === 'ready') return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    if (this.underlying) return Promise.reject(new NativeSdkError('initialization-still-pending'));
    try { this.validateConfiguration(); } catch (error) { return Promise.reject(error); }
    this.currentState = 'initializing';
    const attempt = ++this.generation;
    const native = this.bridge.request(this.service, 'initialize', this.configuration());
    this.underlying = native;
    void native.then(() => { if (this.underlying === native) this.underlying = undefined; }, () => { if (this.underlying === native) this.underlying = undefined; });
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NativeSdkError('initialization-timeout')), this.timeoutMs); });
    const task = Promise.race([native, timeout]).then(() => {
      if (this.generation !== attempt || this.currentState === 'disposed') throw new NativeSdkError('initialization-obsolete');
      this.currentState = 'ready';
    }).catch((error: unknown) => {
      if (this.generation === attempt && this.currentState !== 'disposed') { this.currentState = 'failed'; this.generation++; }
      throw error;
    }).finally(() => { clearTimeout(timer); if (this.inFlight === task) this.inFlight = undefined; });
    this.inFlight = task;
    return task;
  }
  /** 业务动作只允许在当前 SDK 的实际初始化成功之后发出。 */
  protected call<T>(operation: string, payload: object = {}): Promise<T> {
    if (this.currentState !== 'ready') return Promise.reject(new NativeSdkError('not-ready'));
    return this.bridge.request<T>(this.service, operation, payload);
  }
  /** 返回真实原生请求身份，用于业务关联异步回调。 */
  protected begin<T>(operation: string, payload: object = {}): NativeSdkRequest<T> {
    if (this.currentState !== 'ready') throw new NativeSdkError('not-ready');
    return this.bridge.begin<T>(this.service, operation, payload);
  }
  /** 只使当前 SDK 的新操作与旧初始化结果失效，不伪造撤销原生交易。 */
  dispose(): void { this.currentState = 'disposed'; this.generation++; }
}
