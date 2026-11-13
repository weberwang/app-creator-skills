import { createMobileSdkScope, type MobileSdkConfig, type MobileSdkLoaders, type MobileSdkServices } from '../../capacitor/composition-root';

/** Phaser 原生项目注入业务的具名移动 SDK 能力接口。 */
export interface PhaserMobileSdkServices extends Pick<MobileSdkServices, 'analytics' | 'crashlytics' | 'appsflyer' | 'ads' | 'advertisingProvider' | 'initialize' | 'dispose' | 'disposed'> {}
/** Phaser 应用唯一装配入口持有的原生 SDK 作用域。 */
export interface PhaserMobileSdkScope { create(config: MobileSdkConfig, loaders: MobileSdkLoaders): PhaserMobileSdkServices }
/** Phaser Web 不创建原生管理器，只有实际 Capacitor Android/iOS 宿主可以接入。 */
export function createPhaserMobileSdkScope(): PhaserMobileSdkScope { return createMobileSdkScope(); }
