import type { DirichletPort } from './contracts';

/** 注入 Capacitor 的实际运行时入口，未选中原生渠道时不导入或注册插件。 */
export interface DirichletCapacitorRuntime {
  isNativePlatform(): boolean;
  getPlatform(): string;
  registerPlugin<T>(name: string): T;
}

/** 仅在实际 Android Capacitor 宿主注册本工作流已交付的原生插件。 */
export function createDirichletCapacitorLoader(runtime: DirichletCapacitorRuntime): () => Promise<DirichletPort> {
  let plugin: DirichletPort | undefined;
  return async () => {
    if (!runtime.isNativePlatform() || runtime.getPlatform() !== 'android') throw new Error('Dirichlet 原生插件仅支持已核实的 Android 宿主');
    if (!plugin) plugin = runtime.registerPlugin<DirichletPort>('AppCreatorDirichlet');
    return plugin;
  };
}
