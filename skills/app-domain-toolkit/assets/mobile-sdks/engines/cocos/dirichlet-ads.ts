import { CocosDirichletPort } from '../../dirichlet/typescript/cocos-port';
import { DirichletSdk } from '../../dirichlet/typescript/dirichlet-sdk';
import type { DirichletAds, DirichletSdkOptions } from '../../dirichlet/typescript/contracts';
import type { CocosJsbEvents } from '../../cocos/typescript/bridge';

/** Cocos 原生广告的独立业务接口，保留本引擎装配所有权。 */
export interface CocosDirichletAds extends DirichletAds {}
/** Cocos 已有 JSB 桥提供真实原生运行时，不接受网页替身作为宿主证明。 */
export interface CocosDirichletOptions extends Omit<DirichletSdkOptions, 'loadPlugin'> { readonly bridge: CocosJsbEvents }

/** 在应用唯一入口创建，之后向场景注入本引擎广告能力。 */
export function createCocosDirichletAds(options: CocosDirichletOptions): CocosDirichletAds {
  return new DirichletSdk({ ...options, loadPlugin: async () => CocosDirichletPort.forBridge(options.bridge) });
}
