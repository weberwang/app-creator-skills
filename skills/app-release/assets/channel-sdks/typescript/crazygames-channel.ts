import { ChannelBase } from './channel-base';
import type { InitializationOptions } from './contracts';
import { loadCrazyGamesSdk } from './crazygames-loader';
import { CrazyGamesApi, type CrazyGamesRuntime } from './crazygames/api';

/** CrazyGames 的加载器只在渠道已选定后调用。 */
export interface CrazyGamesOptions extends InitializationOptions {
  readonly loadSdk?: () => Promise<object>;
  readonly allowLocalTesting?: boolean;
}

/** 使用 CrazyGames 官方 HTML5 SDK 的完整运行时对象。 */
export class CrazyGamesChannel extends ChannelBase<CrazyGamesApi> {
  readonly platform = 'crazygames' as const;

  /** 不在构造期间加载脚本或初始化 SDK。 */
  constructor(private readonly config: CrazyGamesOptions) { super(config); }

  /** 创建真实具名 SDK 能力实现，SDK 初始化仍由此渠道统一管理。 */
  protected createApi(sdk: object, assertReady: () => void): CrazyGamesApi {
    return new CrazyGamesApi(sdk as CrazyGamesRuntime, assertReady);
  }

  /** 等待官方初始化和环境结果，禁止将 local 测试环境误当正式环境。 */
  protected async load(isCurrent: () => boolean): Promise<object> {
    // 入口刚投递后即被释放时，不应触碰 DOM 或启动任何加载器。
    if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
    const sdk = await (this.config.loadSdk ? this.config.loadSdk() : loadCrazyGamesSdk(this.config.timeoutMs));
    if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
    if (!sdk || (typeof sdk !== 'object' && typeof sdk !== 'function')) throw new Error('CrazyGames SDK 不可用');
    const runtime = sdk as Partial<CrazyGamesRuntime> & { init?: () => Promise<void> };
    if (typeof runtime.init !== 'function') throw new Error('CrazyGames SDK 缺少初始化接口');
    await runtime.init();
    if (!isCurrent()) throw new Error('渠道 SDK 初始化已失效');
    const environment = runtime.environment;
    if (environment !== 'crazygames' && !(environment === 'local' && this.config.allowLocalTesting === true)) {
      throw new Error('CrazyGames SDK 环境不可用');
    }
    return sdk;
  }
}
