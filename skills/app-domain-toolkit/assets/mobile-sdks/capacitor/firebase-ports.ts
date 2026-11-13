import type { EventParameters } from '../shared/contracts';

/** Capawesome 原生 Analytics 插件实际使用的具名 API。 */
export interface FirebaseAnalyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  setUserId(options: { userId: string | null }): Promise<void>;
  setUserProperty(options: { key: string; value: string | null }): Promise<void>;
  setCurrentScreen(options: { screenName: string | null; screenClassOverride?: string | null }): Promise<void>;
  logEvent(options: { name: string; params?: EventParameters }): Promise<void>;
  getAppInstanceId(): Promise<{ appInstanceId?: string | null }>;
  resetAnalyticsData(): Promise<void>;
}

/** Crashlytics 接受的 JavaScript 栈帧，不把整段 Error.stack 冒充结构化栈。 */
export interface ExceptionStackFrame { lineNumber?: number; fileName?: string; functionName?: string }
/** Crashlytics 的原生键值类型与值同时提供，避免自动猜测数值精度。 */
export interface CrashCustomKey { key: string; value: string | number | boolean; type: 'string' | 'boolean' | 'long' | 'double' | 'int' | 'float' }
/** 非致命异常信息；iOS 提供 stacktrace 时部分字段按官方插件合同忽略。 */
export interface RecordedException { message: string; code?: number; domain?: string; keysAndValues?: CrashCustomKey[]; stacktrace?: ExceptionStackFrame[] }
/** Capawesome 原生 Crashlytics 插件的具名 API。 */
export interface FirebaseCrashlyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  setUserId(options: { userId: string }): Promise<void>;
  setCustomKey(options: CrashCustomKey): Promise<void>;
  log(options: { message: string }): Promise<void>;
  recordException(options: RecordedException): Promise<void>;
  didCrashOnPreviousExecution(): Promise<{ crashed: boolean }>;
  sendUnsentReports(): Promise<void>;
  deleteUnsentReports(): Promise<void>;
}
