import { createMobileSdkScope, type MobileSdkConfig, type MobileSdkLoaders, type MobileSdkServices } from '../../capacitor/composition-root';

/** Three.js 原生项目注入业务的具名移动 SDK 能力接口。 */
export interface ThreejsMobileSdkServices extends Pick<MobileSdkServices, 'analytics' | 'crashlytics' | 'appsflyer' | 'ads' | 'advertisingProvider' | 'initialize' | 'dispose' | 'disposed'> {}
/** Three.js 应用唯一装配入口持有的原生 SDK 作用域。 */
export interface ThreejsMobileSdkScope { create(config: MobileSdkConfig, loaders: MobileSdkLoaders): ThreejsMobileSdkServices }
/** 引擎仅复用原生插件能力，不从普通浏览器环境推断平台支持。 */
export function createThreejsMobileSdkScope(): ThreejsMobileSdkScope { return createMobileSdkScope(); }
