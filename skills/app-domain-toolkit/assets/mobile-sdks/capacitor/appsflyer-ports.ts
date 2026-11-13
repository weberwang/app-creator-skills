import type { EventParameters } from '../shared/contracts';

/** 归因监听属于业务通知，不代表 SDK 启动或网络上报已经完成。 */
export interface ConversionCallbacks { onConversionDataSuccess(data: unknown): void; onConversionDataFail(error: unknown): void }
/** 深链监听在官方 init 之前登记，载荷由业务按实际合同校验。 */
export interface DeepLinkCallbacks { onDeepLinking(data: unknown): void }
/** 官方 Capacitor 7.0.4 / js-core 7.1.0 的具名调用端口。 */
export interface AppsFlyerPlugin {
  init(options: { devKey: string; appId?: string | null }): Promise<void>;
  start(options?: { awaitResponse?: boolean }): Promise<void>;
  stop(options: { shouldStop: boolean }): Promise<void>;
  logEvent(options: { eventName: string; eventValues: EventParameters }): Promise<void>;
  getAppsFlyerUID(): Promise<string | null>;
  registerConversionListener(callbacks: ConversionCallbacks): Promise<void>;
  unregisterConversionListener(): Promise<void>;
  registerDeepLinkListener(callbacks: DeepLinkCallbacks): Promise<void>;
  unregisterDeepLinkListener(): Promise<void>;
  registerSessionReadyListener(callback: () => void): Promise<void>;
  unregisterSessionReadyListener(): Promise<void>;
}
