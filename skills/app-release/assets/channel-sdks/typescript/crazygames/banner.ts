import type { BannerRequest, CrazyGamesRuntime, ReadyCheck } from './types';

/** CrazyGames 内嵌横幅的具名 SDK 实现。 */
export class CrazyGamesBanner {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 请求指定固定尺寸的横幅。 */
  requestBanner(banner: BannerRequest): Promise<void> { this.ready(); return this.sdk.banner.requestBanner(banner); }
  /** 请求适合容器尺寸的响应式横幅。 */
  requestResponsiveBanner(id: string): Promise<void> { this.ready(); return this.sdk.banner.requestResponsiveBanner(id); }
  /** 清除指定容器中的横幅。 */
  clearBanner(id: string): void { this.ready(); this.sdk.banner.clearBanner(id); }
  /** 清除所有当前横幅。 */
  clearAllBanners(): void { this.ready(); this.sdk.banner.clearAllBanners(); }
}
