import { DirichletSdk } from '../../dirichlet/typescript/dirichlet-sdk';
import type { DirichletAds, DirichletSdkOptions } from '../../dirichlet/typescript/contracts';

/** Phaser 原生宿主使用的广告能力，与场景生命周期分别管理。 */
export interface PhaserDirichletAds extends DirichletAds {}

/** Phaser 应用装配入口注入真实原生插件加载器，不在模块导入时启动 SDK。 */
export function createPhaserDirichletAds(options: DirichletSdkOptions): PhaserDirichletAds { return new DirichletSdk(options); }
