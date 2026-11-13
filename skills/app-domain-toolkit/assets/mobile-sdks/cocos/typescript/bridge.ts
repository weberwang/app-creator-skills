/** Cocos Creator 3.8 的官方按事件 JSB 桥接能力。 */
export interface CocosJsbEvents {
  addNativeEventListener(event: string, listener: (data: string) => void): void;
  removeNativeEventListener(event: string, listener: (data: string) => void): void;
  dispatchEventToNative(event: string, data?: string): void;
}

/** SDK 返回的脱敏错误，避免把原生异常或凭据写入日志。 */
export class NativeSdkError extends Error {
  /** 记录可供业务判断的错误类别。 */
  constructor(readonly code: string) { super(`原生 SDK 操作失败：${code}`); }
}

/** 原生响应必须关联请求，桥接发出本身不表示 SDK 已完成。 */
interface NativeResponse { id: number; ok: boolean; value?: unknown; error?: string }
/** 保存一个仍在等待原生真实回调的操作。 */
interface PendingRequest { resolve(value: unknown): void; reject(error: Error): void }
/** 允许业务将真实展示回调与同一次请求关联，而不是按广告位猜测奖励。 */
export interface NativeSdkRequest<T> { readonly id: number; readonly result: Promise<T> }

/** 同一 Cocos JSB 实例在进程生命周期内只能创建一次桥，避免迟到奖励命中新请求编号。 */
const activeBridges = new WeakSet<object>();

/** 只负责本工作流事件的多路复用，不占用或清空项目其他桥接监听。 */
export class CocosSdkBridge {
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<(event: NativeSdkEvent) => void>();
  private nextId = 1;
  private closed = false;
  private readonly responseListener = (data: string): void => {
    let response: NativeResponse;
    try { response = JSON.parse(data) as NativeResponse; } catch { return; }
    if (!Number.isSafeInteger(response.id) || typeof response.ok !== 'boolean') return;
    const request = this.pending.get(response.id);
    if (!request) return;
    this.pending.delete(response.id);
    if (response.ok) request.resolve(response.value);
    else request.reject(new NativeSdkError(typeof response.error === 'string' ? response.error : 'native-error'));
  };
  private readonly eventListener = (data: string): void => {
    let event: NativeSdkEvent;
    try { event = JSON.parse(data) as NativeSdkEvent; } catch { return; }
    if (!event || typeof event.source !== 'string' || typeof event.event !== 'string') return;
    // 单个业务监听器异常不能阻断其他监听器接收真实奖励。
    for (const listener of this.listeners) { try { listener(event); } catch { /* 由业务自行处理监听错误。 */ } }
  };

  /** 显式创建时才注册本工作流监听，不在模块加载时改写全局回调。 */
  constructor(private readonly bridge: CocosJsbEvents) {
    if (activeBridges.has(bridge)) throw new NativeSdkError('bridge-already-active');
    activeBridges.add(bridge);
    bridge.addNativeEventListener('appcreator.mobile.response', this.responseListener);
    bridge.addNativeEventListener('appcreator.mobile.event', this.eventListener);
  }

  /** 发送已知服务的具体操作，并等待与请求 ID 对应的真实原生响应。 */
  request<T>(service: string, operation: string, payload: object = {}): Promise<T> {
    if (this.closed) return Promise.reject(new NativeSdkError('bridge-closed'));
    return this.begin<T>(service, operation, payload).result;
  }

  /** 返回请求身份和完成 Promise，供激励广告将迟到奖励关联至正确展示。 */
  begin<T>(service: string, operation: string, payload: object = {}): NativeSdkRequest<T> {
    if (this.closed) throw new NativeSdkError('bridge-closed');
    const id = this.nextId++;
    const result = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      try { this.bridge.dispatchEventToNative(`appcreator.mobile.${service}`, JSON.stringify({ id, operation, payload })); }
      catch { this.pending.delete(id); reject(new NativeSdkError('bridge-dispatch-failed')); }
    });
    return { id, result };
  }

  /** 订阅广告与归因事件，调用方使用返回函数只移除自己的监听。 */
  subscribe(listener: (event: NativeSdkEvent) => void): () => void {
    if (this.closed) throw new NativeSdkError('bridge-closed');
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** 等待中的原生操作仍有真实结果时不得关闭桥，否则会丢失交易与奖励。 */
  close(): void {
    if (this.closed) return;
    if (this.pending.size || this.listeners.size) throw new NativeSdkError('native-operations-or-listeners-active');
    this.closed = true;
    this.bridge.removeNativeEventListener('appcreator.mobile.response', this.responseListener);
    this.bridge.removeNativeEventListener('appcreator.mobile.event', this.eventListener);
    this.listeners.clear();
  }
}

/** 原生 SDK 主动通知；广告奖励和归因回调与请求响应分开处理。 */
export interface NativeSdkEvent {
  source: string;
  event: string;
  adUnitId?: string;
  requestId?: number;
  value?: unknown;
}
