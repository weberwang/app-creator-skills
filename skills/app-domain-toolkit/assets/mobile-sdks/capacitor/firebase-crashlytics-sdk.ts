import { ManagedNativeSdk, type NativeSdkOptions } from '../shared/managed-sdk';
import type { CollectionChange } from '../shared/contracts';
import type { CrashCustomKey, FirebaseCrashlyticsPlugin, RecordedException } from './firebase-ports';

/** 原生宿主必须在启动前按官方配置禁用未获授权的自动崩溃收集。 */
export interface FirebaseCrashlyticsOptions extends NativeSdkOptions {
  readonly collectionEnabled: boolean;
  readonly loadPlugin: () => Promise<FirebaseCrashlyticsPlugin>;
}

/** 原生 Crashlytics 具名调用，不能用 Firebase Web SDK 代替。 */
export class FirebaseCrashlyticsSdk extends ManagedNativeSdk<FirebaseCrashlyticsPlugin> {
  private manualCollection: boolean;
  private policyRevision = 0;
  /** 构造不触发插件加载或异常上报。 */
  constructor(private readonly config: FirebaseCrashlyticsOptions) { super(config); this.manualCollection = config.collectionEnabled; }
  /** 原生 Firebase 配置有效后通过实际插件设置采集策略。 */
  protected async boot(isCurrent: () => boolean): Promise<FirebaseCrashlyticsPlugin> {
    const plugin = await this.config.loadPlugin();
    if (!isCurrent()) throw new Error('Crashlytics 初始化已失效');
    await plugin.setEnabled({ enabled: this.config.collectionEnabled });
    return plugin;
  }
  /** 拒绝未允许的数据记录和主动上传，不把本地缓冲当成无采集。 */
  private collecting(): FirebaseCrashlyticsPlugin {
    const plugin = this.requirePlugin();
    if (!this.manualCollection) throw new Error('Crashlytics 数据采集未获允许');
    return plugin;
  }
  /** 记录可恢复异常，不主动制造崩溃。 */
  recordException(options: RecordedException): Promise<void> { return this.collecting().recordException(options); }
  /** 记录与后续崩溃报告关联的应用日志。 */
  log(message: string): Promise<void> { return this.collecting().log({ message }); }
  /** 将键值类型明确传给原生插件。 */
  setCustomKey(options: CrashCustomKey): Promise<void> { return this.collecting().setCustomKey(options); }
  /** 空字符串用于清除已有用户关联。 */
  setUserId(userId: string): Promise<void> { return (userId ? this.collecting() : this.requirePlugin()).setUserId({ userId }); }
  /** 查询上次启动是否发生崩溃，不推断报告已上传。 */
  async didCrashOnPreviousExecution(): Promise<boolean> { return (await this.requirePlugin().didCrashOnPreviousExecution()).crashed; }
  /** 上传未发送报告仍需要当前采集许可。 */
  sendUnsentReports(): Promise<void> { return this.collecting().sendUnsentReports(); }
  /** 仅在业务明确要求清理时删除设备上的未发送报告。 */
  deleteUnsentReports(): Promise<void> { return this.requirePlugin().deleteUnsentReports(); }
  /** 立即关闭本适配器的手动写入，不宣称 SDK 的自动发送已立刻停止。 */
  async setCollectionEnabled(enabled: boolean): Promise<CollectionChange> {
    const plugin = this.requirePlugin();
    const revision = ++this.policyRevision;
    if (!enabled) this.manualCollection = false;
    await plugin.setEnabled({ enabled });
    if (this.isActive() && revision === this.policyRevision) this.manualCollection = enabled;
    return { requestedEnabled: enabled, automaticCollection: 'sdk-configured-restart-may-be-required' };
  }
}
