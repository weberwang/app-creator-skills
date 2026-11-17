import type { CocosJsbEvents } from '../../cocos/typescript/bridge';
import type { PluginListenerHandle } from '../../capacitor/ad-ports';
import type { DirichletAdEvent, DirichletInitialization, DirichletPort } from './contracts';

/** 与同一原生桥共享单调递增身份，旧结果不能命中新管理器的请求。 */
const ports = new WeakMap<object, CocosDirichletPort>();
/** 一条等待真实原生响应的调用，不以桥消息发送成功推断业务成功。 */
interface Pending { resolve(): void; reject(error: Error): void }
/** 只允许已实现的具名原生方法进入消息桥。 */
type Method = 'initialize' | 'loadRewarded' | 'loadInterstitial' | 'showRewarded' | 'showInterstitial' | 'showBanner' | 'hideBanner' | 'removeBanner' | 'setRequestsAllowed' | 'dispose';

/** Cocos 独立 JSB 通道，原生层由 DirichletCocosBridge 对接真实聚合 SDK。 */
export class CocosDirichletPort implements DirichletPort {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Set<(event: DirichletAdEvent) => void>();
  /** 接收本通道响应，过滤无效 JSON 和未发送过的请求身份。 */
  private readonly response = (raw: string): void => {
    let value: { id: number; ok: boolean };
    try { value = JSON.parse(raw) as typeof value; } catch { return; }
    if (!value || !Number.isSafeInteger(value.id) || typeof value.ok !== 'boolean') return;
    const pending = this.pending.get(value.id);
    if (!pending) return;
    this.pending.delete(value.id);
    if (value.ok) pending.resolve();
    else pending.reject(new Error('Dirichlet 原生操作失败'));
  };
  /** 广告事件继续交由管理器校验展示身份，不输出原始 SDK 错误或凭据。 */
  private readonly event = (raw: string): void => {
    let event: DirichletAdEvent;
    try { event = JSON.parse(raw) as DirichletAdEvent; } catch { return; }
    for (const listener of this.listeners) { try { listener(event); } catch { /* 单个业务观察者不能中断奖励分发。 */ } }
  };

  /** 每个真实 JSB 桥只注册一次专有通道，不覆盖已有游戏事件。 */
  private constructor(private readonly bridge: CocosJsbEvents) {
    bridge.addNativeEventListener('appcreator.dirichlet.response', this.response);
    bridge.addNativeEventListener('appcreator.dirichlet.event', this.event);
  }
  /** 复用应用级桥，避免页面重建产生重号或多份原生广告管理器。 */
  static forBridge(bridge: CocosJsbEvents): CocosDirichletPort {
    let port = ports.get(bridge);
    if (!port) { port = new CocosDirichletPort(bridge); ports.set(bridge, port); }
    return port;
  }
  /** 初始化媒体配置，完成仅依据真实 SDK 回调。 */
  initialize(options: DirichletInitialization): Promise<void> { return this.send('initialize', options); }
  /** 预加载激励广告。 */
  loadRewarded(options: { adUnitId: string }): Promise<void> { return this.send('loadRewarded', options); }
  /** 预加载插屏。 */
  loadInterstitial(options: { adUnitId: string }): Promise<void> { return this.send('loadInterstitial', options); }
  /** 尝试展示已经加载的激励，不在原生层等待填充。 */
  showRewarded(options: { adUnitId: string; requestId: string }): Promise<void> { return this.send('showRewarded', options); }
  /** 尝试展示已经加载的插屏。 */
  showInterstitial(options: { adUnitId: string; requestId: string }): Promise<void> { return this.send('showInterstitial', options); }
  /** 按当前确认位置加载并展示横幅。 */
  showBanner(options: { adUnitId: string; position: 'top' | 'bottom' }): Promise<void> { return this.send('showBanner', options); }
  /** 隐藏自己的横幅。 */
  hideBanner(): Promise<void> { return this.send('hideBanner'); }
  /** 销毁自己的横幅。 */
  removeBanner(): Promise<void> { return this.send('removeBanner'); }
  /** 将应用已有授权同步到原生请求门。 */
  setRequestsAllowed(options: { allowed: boolean }): Promise<void> { return this.send('setRequestsAllowed', options); }
  /** 停止新请求，已受理的可信回调仍由原生对象继续交付。 */
  dispose(): Promise<void> { return this.send('dispose'); }
  /** 只移除自己注册的监听，不清空其他 SDK 或业务监听。 */
  async addListener(name: 'adEvent', listener: (event: DirichletAdEvent) => void): Promise<PluginListenerHandle> {
    if (name !== 'adEvent') throw new Error('未知 Dirichlet 事件');
    this.listeners.add(listener);
    return { remove: async () => { this.listeners.delete(listener); } };
  }
  /** 消息身份用于响应关联；不对未知展示结果做超时失败推断。 */
  private send(method: Method, options: object = {}): Promise<void> {
    if (this.pending.size >= 256 || !Number.isSafeInteger(this.nextId)) return Promise.reject(new Error('Dirichlet 在途操作达到上限'));
    const id = this.nextId++;
    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try { this.bridge.dispatchEventToNative('appcreator.dirichlet.request', JSON.stringify({ id, method, options })); }
      catch { this.pending.delete(id); reject(new Error('Dirichlet 原生桥不可用')); }
    });
  }
}
