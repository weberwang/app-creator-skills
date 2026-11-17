import { DirichletSdk } from '../../dirichlet/typescript/dirichlet-sdk';
import type { DirichletAds, DirichletSdkOptions } from '../../dirichlet/typescript/contracts';

/** Three.js 原生宿主的明确广告能力，渲染循环不等待其初始化或加载。 */
export interface ThreejsDirichletAds extends DirichletAds {}

/** Three.js 应用唯一入口注入当前已选聚合的真实插件。 */
export function createThreejsDirichletAds(options: DirichletSdkOptions): ThreejsDirichletAds { return new DirichletSdk(options); }
