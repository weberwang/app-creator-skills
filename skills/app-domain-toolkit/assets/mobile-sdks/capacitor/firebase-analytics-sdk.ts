import { ManagedNativeSdk, type NativeSdkOptions } from '../shared/managed-sdk';
import { validateEvent, type CollectionChange, type EventParameters } from '../shared/contracts';
import type { FirebaseAnalyticsPlugin } from './firebase-ports';

/** 采集策略由项目已有授权来源决定，不在 SDK 管理器中编排隐私界面。 */
export interface FirebaseAnalyticsOptions extends NativeSdkOptions {
  readonly collectionEnabled: boolean;
  readonly loadPlugin: () => Promise<FirebaseAnalyticsPlugin>;
}

/** Phaser／Three.js Android/iOS 的 Firebase 原生 Analytics 具体实现。 */
export class FirebaseAnalyticsSdk extends ManagedNativeSdk<FirebaseAnalyticsPlugin> {
  private manualCollection: boolean;
  private policyRevision = 0;
  /** 保存配置，不在构造阶段导入插件。 */
  constructor(private readonly config: FirebaseAnalyticsOptions) { super(config); this.manualCollection = config.collectionEnabled; }
  /** FirebaseApp 的原生配置由宿主提供，此处只在原生插件配置成功后开放业务调用。 */
  protected async boot(isCurrent: () => boolean): Promise<FirebaseAnalyticsPlugin> {
    const plugin = await this.config.loadPlugin();
    if (!isCurrent()) throw new Error('Analytics 初始化已失效');
    await plugin.setEnabled({ enabled: this.config.collectionEnabled });
    return plugin;
  }
  /** 拒绝受限状态下的手动数据写入，不把插件就绪当成授权。 */
  private collecting(): FirebaseAnalyticsPlugin {
    const plugin = this.requirePlugin();
    if (!this.manualCollection) throw new Error('Analytics 数据采集未获允许');
    return plugin;
  }
  /** 记录业务事件，不自动附加身份、广告 ID 或设备信息。 */
  logEvent(name: string, params: EventParameters = {}): Promise<void> {
    const plugin = this.collecting();
    validateEvent(name, params);
    return plugin.logEvent({ name, params });
  }
  /** 用户 ID 使用项目实际授权后的标识，null 用于清除。 */
  setUserId(userId: string | null): Promise<void> { return (userId === null ? this.requirePlugin() : this.collecting()).setUserId({ userId }); }
  /** 设置或清除单个统计属性。 */
  setUserProperty(key: string, value: string | null): Promise<void> { return (value === null ? this.requirePlugin() : this.collecting()).setUserProperty({ key, value }); }
  /** 将业务页面名称交给原生 Analytics，不从引擎场景自动采集。 */
  setCurrentScreen(screenName: string | null, screenClassOverride?: string | null): Promise<void> { return this.collecting().setCurrentScreen({ screenName, screenClassOverride }); }
  /** 按当前采集策略读取应用实例 ID，不记录到日志。 */
  async getAppInstanceId(): Promise<string | null> { return (await this.collecting().getAppInstanceId()).appInstanceId ?? null; }
  /** 清理统计数据是显式业务动作，不自动执行或暗示服务端数据已删除。 */
  resetAnalyticsData(): Promise<void> { return this.requirePlugin().resetAnalyticsData(); }
  /** 手动调用立即遵守本地关闭策略；自动采集是否立即生效按锁定插件核实。 */
  async setCollectionEnabled(enabled: boolean): Promise<CollectionChange> {
    const plugin = this.requirePlugin();
    const revision = ++this.policyRevision;
    if (!enabled) this.manualCollection = false;
    await plugin.setEnabled({ enabled });
    if (this.isActive() && revision === this.policyRevision) this.manualCollection = enabled;
    return { requestedEnabled: enabled, automaticCollection: 'sdk-configured-restart-may-be-required' };
  }
}
