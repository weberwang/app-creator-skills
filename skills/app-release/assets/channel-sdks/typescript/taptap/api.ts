import { getRewardedController, type TapRewardedController } from './rewarded';
import { TapBanner, TapCloudSave, TapInterstitial, TapLeaderboard, TapUserButton } from './objects';
import type { TapCloudSaveManager, TapLeaderboardManager } from './services';
import type {
  TapAdOptions, TapAuthorizeOptions, TapBannerAd, TapBannerOptions, TapCheckSessionOptions,
  TapGameItemPayment, TapInterstitialAd, TapLoginOptions, TapRuntime, TapSettingOptions,
  TapShareboardHiddenOptions, TapShareboardOptions, TapShowEvent, TapUserInfoButton, TapUserInfoButtonOptions, TapUserInfoOptions,
} from './types';

export type * from './types';
export type * from './services';
export type { TapRewardedAttempt, TapRewardedOutcome } from './rewarded';

/** 已核实的 Tap 小游戏具名方法，原始回调与签名字符串直接交给宿主。 */
export class TaptapApi {
  /** 真实宿主对象仅由渠道管理器注入，保存调用时的接收者。 */
  constructor(private readonly runtime: TapRuntime, private readonly assertReady: () => void) {}

  /** 获取短期 code，由业务服务端交换用户会话。 */
  login(options: TapLoginOptions): void { this.assertReady(); if (!this.runtime.login) throw new Error('当前宿主没有登录接口'); this.runtime.login(options); }
  /** 查询当前小游戏宿主登录态。 */
  checkSession(options: TapCheckSessionOptions): void { this.assertReady(); if (!this.runtime.checkSession) throw new Error('当前宿主没有会话检查接口'); this.runtime.checkSession(options); }
  /** 向用户请求指定授权；scope.userInfo 需要官方用户信息按钮。 */
  authorize(options: TapAuthorizeOptions): void { this.assertReady(); if (!this.runtime.authorize) throw new Error('当前宿主没有授权接口'); this.runtime.authorize(options); }
  /** 查询已有授权，不自动发起授权窗口。 */
  getSetting(options: TapSettingOptions): void { this.assertReady(); if (!this.runtime.getSetting) throw new Error('当前宿主没有授权状态接口'); this.runtime.getSetting(options); }
  /** 读取用户资料前由业务确认授权，敏感数据不得进入日志。 */
  getUserInfo(options: TapUserInfoOptions): void { this.assertReady(); if (!this.runtime.getUserInfo) throw new Error('当前宿主没有用户资料接口'); this.runtime.getUserInfo(options); }
  /** 创建真实用户信息授权按钮；业务负责监听、定位和销毁。 */
  createUserInfoButton(options: TapUserInfoButtonOptions): TapUserInfoButton { this.assertReady(); if (!this.runtime.createUserInfoButton) throw new Error('当前宿主没有用户信息按钮'); return new TapUserButton(this.runtime.createUserInfoButton(options), this.assertReady); }
  /** 展示分享面板，success 只表示面板打开。 */
  showShareboard(options: TapShareboardOptions): void { this.assertReady(); if (!this.runtime.showShareboard) throw new Error('当前宿主没有分享面板接口'); this.runtime.showShareboard(options); }
  /** 设置宿主菜单中的分享入口是否隐藏。 */
  setShareboardHidden(options: TapShareboardHiddenOptions): void { this.assertReady(); if (!this.runtime.setShareboardHidden) throw new Error('当前宿主没有分享入口设置'); this.runtime.setShareboardHidden(options); }
  /** 注册前台事件，监听函数身份保持不变。 */
  onShow(listener: (event: TapShowEvent) => void): void { this.assertReady(); if (!this.runtime.onShow) throw new Error('当前宿主没有前台事件'); this.runtime.onShow(listener); }
  /** 只移除该监听，避免删除其他业务的监听。 */
  offShow(listener: (event: TapShowEvent) => void): void { if (!this.runtime.offShow) throw new Error('当前宿主没有前台事件移除接口'); this.runtime.offShow(listener); }
  /** 注册后台事件。 */
  onHide(listener: () => void): void { this.assertReady(); if (!this.runtime.onHide) throw new Error('当前宿主没有后台事件'); this.runtime.onHide(listener); }
  /** 只移除该后台事件监听。 */
  offHide(listener: () => void): void { if (!this.runtime.offHide) throw new Error('当前宿主没有后台事件移除接口'); this.runtime.offHide(listener); }
  /** 创建 Banner 对象；展示、回调和销毁由持有者负责。 */
  createBannerAd(options: TapBannerOptions): TapBannerAd { this.assertReady(); if (!this.runtime.createBannerAd) throw new Error('当前宿主没有 Banner 广告接口'); return new TapBanner(this.runtime.createBannerAd(options), this.assertReady); }
  /** 创建插屏对象；实际显示失败不阻断游戏。 */
  createInterstitialAd(options: TapAdOptions): TapInterstitialAd { this.assertReady(); if (!this.runtime.createInterstitialAd) throw new Error('当前宿主没有插屏广告接口'); return new TapInterstitial(this.runtime.createInterstitialAd(options), this.assertReady); }
  /** 获取宿主共享的激励广告，等待 onLoad 期间业务无需等待。 */
  prepareRewardedAd(options: TapAdOptions): TapRewardedController { return getRewardedController(this.runtime, options, this.assertReady); }
  /** 原样转发服务端签名；客户端成功回调不代表订单已验签和发货。 */
  requestPaymentGameItem(options: TapGameItemPayment): void { this.assertReady(); if (!this.runtime.requestPaymentGameItem) throw new Error('当前宿主没有道具支付接口'); this.runtime.requestPaymentGameItem(options); }
  /** 获取真实云存档管理器，业务负责存档冲突处理。 */
  getCloudSaveManager(): TapCloudSaveManager { this.assertReady(); if (!this.runtime.getCloudSaveManager) throw new Error('当前宿主没有云存档接口'); return new TapCloudSave(this.runtime.getCloudSaveManager(), this.assertReady); }
  /** 获取真实榜单管理器，好友榜仍需确认平台授权。 */
  getLeaderboardManager(): TapLeaderboardManager { this.assertReady(); if (!this.runtime.getLeaderboardManager) throw new Error('当前宿主没有排行榜接口'); return new TapLeaderboard(this.runtime.getLeaderboardManager(), this.assertReady); }
}
