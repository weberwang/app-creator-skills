import { CocosSdkBridge, NativeSdkError } from './bridge';
import { NativeSdkManager } from './sdk-manager';

/** AppsFlyer 原生 7.x 所需的项目配置与真实授权。 */
export interface AppsFlyerConfig { devKey: string; iosAppId?: string; allowAttribution: boolean }
/** SDK 的归因回调和错误由对应业务消费者决定如何处理。 */
export interface AttributionEvent { event: string; value?: unknown }

/** AppsFlyer 独立初始化与事件接口。 */
export class AppsFlyerSdk extends NativeSdkManager {
  private allowed: boolean;
  /** 配置只保存于内存，不能输出 key 或用户数据。 */
  constructor(bridge: CocosSdkBridge, timeoutMs: number, private readonly config: AppsFlyerConfig) { super(bridge, 'appsflyer', timeoutMs); this.allowed = config.allowAttribution; }
  /** SDK 7 需要先 init、注册 session-ready，再实际 start。 */
  protected configuration(): object { return { devKey: this.config.devKey, iosAppId: this.config.iosAppId ?? '', allowAttribution: this.allowed }; }
  /** 未获允许时不启动可能采集数据的归因 SDK。 */
  protected override validateConfiguration(): void {
    if (!this.allowed) throw new NativeSdkError('attribution-not-authorized');
    if (!this.config.devKey) throw new NativeSdkError('appsflyer-missing-key');
  }
  /** 发送 SDK 实际接收的应用事件，不假定请求受理等于平台归因成功。 */
  logEvent(name: string, values: Readonly<Record<string, string | number | boolean>> = {}): Promise<void> {
    if (!this.allowed) return Promise.reject(new NativeSdkError('attribution-not-authorized'));
    if (!name) return Promise.reject(new NativeSdkError('invalid-attribution-event'));
    return this.call<void>('logEvent', { name, values });
  }
  /** 订阅原生 SDK 的归因结果；释放函数只移除当前调用方监听。 */
  onAttribution(listener: (event: AttributionEvent) => void): () => void {
    return this.bridge.subscribe((event) => { if (event.source === 'appsflyer') listener({ event: event.event, value: event.value }); });
  }
  /** 授权撤回不等待初始化完成：先阻止新事件，再通知原生 SDK 停止。 */
  async setAttributionAllowed(allowed: boolean): Promise<void> {
    this.allowed = false;
    await this.bridge.request<void>('appsflyer', 'setAllowed', { allowed });
    this.allowed = allowed;
  }
}
