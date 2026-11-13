/** 一个应用只选择一个顶层广告聚合服务，聚合网络不在此枚举。 */
export type AdProvider = 'admob' | 'max';
/** 业务埋点限定可跨 Firebase 原生接口传递的标量，避免静默丢弃对象或非法数值。 */
export type EventParameters = Readonly<Record<string, string | number>>;
/** 采集开关请求完成不等于当前进程自动采集已立即改变。 */
export interface CollectionChange { readonly requestedEnabled: boolean; readonly automaticCollection: 'sdk-configured-restart-may-be-required' }

/** 拦截明显错误参数，保留合法业务事件的值，不自动添加身份或设备信息。 */
export function validateEvent(name: string, parameters: EventParameters): void {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name) || /^(firebase_|google_|ga_)/.test(name)) throw new Error('事件名称不符合 Firebase 原生合同');
  for (const value of Object.values(parameters)) if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('事件参数必须为字符串或有限数值');
}
