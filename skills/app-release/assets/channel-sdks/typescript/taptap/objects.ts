import type {
  TapAdError, TapBannerAd, TapInterstitialAd, TapMessage, TapUserInfoButton, TapUserInfoResponse,
} from './types';
import type {
  TapArchiveDeleteOptions, TapArchiveDownloadOptions, TapArchiveListOptions, TapCloudSaveManager,
  TapCreateArchiveOptions, TapCurrentRankOptions, TapLeaderboardManager, TapOpenLeaderboardOptions,
  TapRankPageOptions, TapSubmitScoresOptions, TapUpdateArchiveOptions,
} from './services';

/** 云存档句柄沿用渠道有效期，不暴露绕过检查的宿主对象。 */
export class TapCloudSave implements TapCloudSaveManager {
  /** 保留宿主对象的接收者及渠道校验。 */
  constructor(private readonly source: TapCloudSaveManager, private readonly assertReady: () => void) {}
  /** 创建前检查渠道状态。 */
  createArchive(options: TapCreateArchiveOptions): void { this.assertReady(); this.source.createArchive(options); }
  /** 更新前检查渠道状态。 */
  updateArchive(options: TapUpdateArchiveOptions): void { this.assertReady(); this.source.updateArchive(options); }
  /** 查询存档列表。 */
  getArchiveList(options: TapArchiveListOptions): void { this.assertReady(); this.source.getArchiveList(options); }
  /** 下载存档文件。 */
  getArchiveData(options: TapArchiveDownloadOptions): void { this.assertReady(); this.source.getArchiveData(options); }
  /** 下载存档封面。 */
  getArchiveCover(options: TapArchiveDownloadOptions): void { this.assertReady(); this.source.getArchiveCover(options); }
  /** 删除存档。 */
  deleteArchive(options: TapArchiveDeleteOptions): void { this.assertReady(); this.source.deleteArchive(options); }
}

/** 排行榜句柄沿用渠道有效期，并保留官方 callback 约定。 */
export class TapLeaderboard implements TapLeaderboardManager {
  /** 保留宿主榜单管理器和渠道校验。 */
  constructor(private readonly source: TapLeaderboardManager, private readonly assertReady: () => void) {}
  /** 打开榜单页面。 */
  openLeaderboard(options: TapOpenLeaderboardOptions): void { this.assertReady(); this.source.openLeaderboard(options); }
  /** 提交玩家分数。 */
  submitScores(options: TapSubmitScoresOptions): void { this.assertReady(); this.source.submitScores(options); }
  /** 分页查询分数。 */
  loadLeaderboardScores(options: TapRankPageOptions): void { this.assertReady(); this.source.loadLeaderboardScores(options); }
  /** 查询当前玩家分数。 */
  loadCurrentPlayerLeaderboardScore(options: TapCurrentRankOptions): void { this.assertReady(); this.source.loadCurrentPlayerLeaderboardScore(options); }
}

/** Banner 句柄保证释放后只能执行隐藏、注销监听和销毁。 */
export class TapBanner implements TapBannerAd {
  /** 持有真实宿主横幅和渠道校验。 */
  constructor(private readonly source: TapBannerAd, private readonly assertReady: () => void) {}
  /** 展示前检查渠道状态。 */
  show(): Promise<void> { this.assertReady(); return this.source.show(); }
  /** 隐藏是清理操作，释放后仍可执行。 */
  hide(): void { this.source.hide(); }
  /** 销毁原生对象，释放后仍可执行。 */
  destroy(): void { this.source.destroy(); }
  /** 添加加载监听。 */
  onLoad(listener: () => void): void { this.assertReady(); this.source.onLoad(listener); }
  /** 原样注销该监听，不影响其他业务监听。 */
  offLoad(listener: () => void): void { this.source.offLoad(listener); }
  /** 添加错误监听。 */
  onError(listener: (error: TapAdError) => void): void { this.assertReady(); this.source.onError(listener); }
  /** 原样注销错误监听。 */
  offError(listener: (error: TapAdError) => void): void { this.source.offError(listener); }
  /** 添加尺寸变化监听。 */
  onResize(listener: (size: { width: number; height: number }) => void): void { this.assertReady(); this.source.onResize(listener); }
  /** 原样注销尺寸监听。 */
  offResize(listener: (size: { width: number; height: number }) => void): void { this.source.offResize(listener); }
}

/** 插屏句柄在渠道释放后保留清理能力。 */
export class TapInterstitial implements TapInterstitialAd {
  /** 持有真实宿主插屏和渠道校验。 */
  constructor(private readonly source: TapInterstitialAd, private readonly assertReady: () => void) {}
  /** 展示插屏。 */
  show(): Promise<void> { this.assertReady(); return this.source.show(); }
  /** 加载插屏。 */
  load(): Promise<void> { this.assertReady(); return this.source.load(); }
  /** 销毁原生对象。 */
  destroy(): void { this.source.destroy(); }
  /** 添加加载监听。 */
  onLoad(listener: () => void): void { this.assertReady(); this.source.onLoad(listener); }
  /** 移除指定加载监听。 */
  offLoad(listener: () => void): void { this.source.offLoad(listener); }
  /** 添加错误监听。 */
  onError(listener: (error: TapAdError) => void): void { this.assertReady(); this.source.onError(listener); }
  /** 移除指定错误监听。 */
  offError(listener: (error: TapAdError) => void): void { this.source.offError(listener); }
  /** 添加关闭监听。 */
  onClose(listener: () => void): void { this.assertReady(); this.source.onClose(listener); }
  /** 移除指定关闭监听。 */
  offClose(listener: () => void): void { this.source.offClose(listener); }
}

/** 用户资料按钮沿用渠道有效期，清理操作保留原监听身份。 */
export class TapUserButton implements TapUserInfoButton {
  /** 持有真实宿主按钮与渠道校验。 */
  constructor(private readonly source: TapUserInfoButton, private readonly assertReady: () => void) {}
  /** 显示按钮。 */
  show(): void { this.assertReady(); this.source.show(); }
  /** 隐藏按钮。 */
  hide(): void { this.source.hide(); }
  /** 销毁按钮。 */
  destroy(): void { this.source.destroy(); }
  /** 添加点击监听。 */
  onTap(listener: (result: TapUserInfoResponse | TapMessage) => void): void { this.assertReady(); this.source.onTap(listener); }
  /** 原样移除点击监听。 */
  offTap(listener: (result: TapUserInfoResponse | TapMessage) => void): void { this.source.offTap(listener); }
}
