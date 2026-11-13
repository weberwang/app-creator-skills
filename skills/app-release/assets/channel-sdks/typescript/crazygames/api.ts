import { CrazyGamesAd } from './ad';
import { CrazyGamesAnalytics } from './analytics';
import { CrazyGamesBanner } from './banner';
import { CrazyGamesData } from './data';
import { CrazyGamesGame } from './game';
import { CrazyGamesStore } from './store';
import { CrazyGamesUser } from './user';
import type { CrazyGamesEnvironment, CrazyGamesRuntime, ReadyCheck } from './types';

export type * from './types';

/** CrazyGames 平台专属能力的具名接口集合。 */
export class CrazyGamesApi {
  readonly game: CrazyGamesGame;
  readonly ad: CrazyGamesAd;
  readonly banner: CrazyGamesBanner;
  readonly user: CrazyGamesUser;
  readonly data: CrazyGamesData;
  readonly analytics: CrazyGamesAnalytics;
  readonly store: CrazyGamesStore;

  /** 初始化各模块包装器，不触发任何官方 SDK 业务调用。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {
    this.game = new CrazyGamesGame(sdk, ready);
    this.ad = new CrazyGamesAd(sdk, ready);
    this.banner = new CrazyGamesBanner(sdk, ready);
    this.user = new CrazyGamesUser(sdk, ready);
    this.data = new CrazyGamesData(sdk, ready);
    this.analytics = new CrazyGamesAnalytics(sdk, ready);
    this.store = new CrazyGamesStore(sdk, ready);
  }

  /** 读取官方环境；本地模拟与正式渠道分别处理。 */
  get environment(): CrazyGamesEnvironment { this.ready(); return this.sdk.environment; }
  /** 判断是否运行在平台 QA 工具内。 */
  get isQaTool(): boolean { this.ready(); return this.sdk.isQaTool; }
}
