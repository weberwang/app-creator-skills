import { CocosSdkBridge, NativeSdkError } from './bridge';
import { NativeSdkManager } from './sdk-manager';

/** 应用层提供的 Crashlytics 采集授权，不在 SDK 管理器中显示同意界面。 */
export interface CrashlyticsPolicy { allowCollection: boolean }
/** 可恢复异常的跨语言描述；项目应在调用前清除敏感内容。 */
export interface CrashReport { name: string; message: string; stack?: string }

/** 独立管理 Crashlytics 的异常、日志与自定义字段。 */
export class FirebaseCrashlyticsSdk extends NativeSdkManager {
  private enabled = false;
  private policyVersion = 0;
  /** 构造时不打开崩溃采集，也不触发崩溃测试。 */
  constructor(bridge: CocosSdkBridge, timeoutMs: number, private readonly policy: CrashlyticsPolicy) { super(bridge, 'firebase.crashlytics', timeoutMs); }
  /** 原生配置默认关闭自动采集；调用后仍需按官方行为核实何时生效。 */
  protected configuration(): object { return { collectionEnabled: false }; }
  /** 拒绝未经允许的上报操作。 */
  private ensureEnabled(): void { if (!this.enabled || !this.policy.allowCollection) throw new NativeSdkError('crashlytics-disabled'); }
  /** 开启需策略允许；撤销时立即阻止业务新上报。 */
  async setCollectionEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.policy.allowCollection) throw new NativeSdkError('crashlytics-not-authorized');
    const version = ++this.policyVersion;
    this.enabled = false;
    await this.call<void>('setCollectionEnabled', { enabled });
    if (version === this.policyVersion && enabled && this.policy.allowCollection) this.enabled = true;
  }
  /** 上报非致命异常，原生 SDK 保留该异常的实际处理结果。 */
  recordException(error: CrashReport): Promise<void> { this.ensureEnabled(); return this.call<void>('recordException', { error }); }
  /** 为后续报告记录一条项目已脱敏的诊断信息。 */
  log(message: string): Promise<void> { this.ensureEnabled(); return this.call<void>('log', { message }); }
  /** 设置指定报告字段，不自动读取设备身份或凭据。 */
  setCustomKey(key: string, value: string | number | boolean): Promise<void> { this.ensureEnabled(); return this.call<void>('setCustomKey', { key, value }); }
  /** 设置或清除项目已授权的用户标识。 */
  setUserId(userId: string): Promise<void> { this.ensureEnabled(); return this.call<void>('setUserId', { userId }); }
  /** 释放后停止新的业务异常与日志请求。 */
  override dispose(): void { this.enabled = false; this.policyVersion++; super.dispose(); }
}
