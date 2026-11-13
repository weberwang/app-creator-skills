import { CocosSdkBridge, NativeSdkError } from './bridge';
import { NativeSdkManager } from './sdk-manager';

/** Firebase 事件参数只使用 Android 和 iOS 共同支持的标量类型。 */
export type AnalyticsParameters = Readonly<Record<string, string | number>>;
/** 由项目现有授权来源明确提供采集策略。 */
export interface AnalyticsPolicy { allowCollection: boolean }

/** 独立持有 Firebase Analytics 采集与事件调用。 */
export class FirebaseAnalyticsSdk extends NativeSdkManager {
  private enabled = false;
  private policyVersion = 0;
  /** 不因创建管理器启动 Firebase 或发送事件。 */
  constructor(bridge: CocosSdkBridge, timeoutMs: number, private readonly policy: AnalyticsPolicy) { super(bridge, 'firebase.analytics', timeoutMs); }
  /** Firebase 默认配置需要由原生宿主提供，不由客户端硬编码密钥。 */
  protected configuration(): object { return { collectionEnabled: false }; }
  /** 采集关闭时不能通过便捷方法绕过项目策略。 */
  private ensureEnabled(): void { if (!this.enabled || !this.policy.allowCollection) throw new NativeSdkError('analytics-disabled'); }
  /** 明确控制采集；关闭立即阻止新业务事件，开启须先得到真实策略允许。 */
  async setCollectionEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.policy.allowCollection) throw new NativeSdkError('analytics-not-authorized');
    const version = ++this.policyVersion;
    this.enabled = false;
    await this.call<void>('setCollectionEnabled', { enabled });
    if (version === this.policyVersion && enabled && this.policy.allowCollection) this.enabled = true;
  }
  /** 发送具名统计事件及标量参数，不把调用受理冒充后台统计成功。 */
  logEvent(name: string, parameters: AnalyticsParameters = {}): Promise<void> {
    this.ensureEnabled();
    if (!name || Object.values(parameters).some((value) => typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value)))) return Promise.reject(new NativeSdkError('invalid-analytics-event'));
    return this.call<void>('logEvent', { name, parameters });
  }
  /** 按项目实际授权设置或移除 Firebase 用户标识。 */
  setUserId(userId: string | null): Promise<void> { this.ensureEnabled(); return this.call<void>('setUserId', { userId }); }
  /** 设置事件分析用户属性；传 null 表示清除。 */
  setUserProperty(name: string, value: string | null): Promise<void> { this.ensureEnabled(); return this.call<void>('setUserProperty', { name, value }); }
  /** 禁止释放后继续发送新统计事件。 */
  override dispose(): void { this.enabled = false; this.policyVersion++; super.dispose(); }
}
