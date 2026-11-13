// 自动生成：由 generate-wechat-bindings.mjs 维护，基础引擎 API 不在此清单。

import type { Wechat } from './types.generated';

/** 微信渠道专属能力的具体具名实现。 */
export class WechatPlatformApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.Runtime, protected readonly assertReady: () => void) {}
  /** 调用微信平台 setHandoffQuery，保留官方参数与回调合同。 */
  setHandoffQuery(query: string): boolean;
  /** 直接调用当前官方对象的 setHandoffQuery，不使用通用 API 转发。 */
  setHandoffQuery(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.setHandoffQuery !== 'function') throw new Error('微信渠道能力不可用：setHandoffQuery');
    return (this.runtime.setHandoffQuery as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getAccountInfoSync，保留官方参数与回调合同。 */
  getAccountInfoSync(): Wechat.AccountInfo;
  /** 直接调用当前官方对象的 getAccountInfoSync，不使用通用 API 转发。 */
  getAccountInfoSync(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getAccountInfoSync !== 'function') throw new Error('微信渠道能力不可用：getAccountInfoSync');
    return (this.runtime.getAccountInfoSync as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getDirectAdStatusSync，保留官方参数与回调合同。 */
  getDirectAdStatusSync(): Wechat.DirectAdStatusInfo;
  /** 直接调用当前官方对象的 getDirectAdStatusSync，不使用通用 API 转发。 */
  getDirectAdStatusSync(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getDirectAdStatusSync !== 'function') throw new Error('微信渠道能力不可用：getDirectAdStatusSync');
    return (this.runtime.getDirectAdStatusSync as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getEnterOptionsSync，保留官方参数与回调合同。 */
  getEnterOptionsSync(): Wechat.EnterOptionsGame;
  /** 直接调用当前官方对象的 getEnterOptionsSync，不使用通用 API 转发。 */
  getEnterOptionsSync(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getEnterOptionsSync !== 'function') throw new Error('微信渠道能力不可用：getEnterOptionsSync');
    return (this.runtime.getEnterOptionsSync as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getExptInfoSync，保留官方参数与回调合同。 */
  getExptInfoSync(keys?: string[]): Wechat.IAnyObject;
  /** 直接调用当前官方对象的 getExptInfoSync，不使用通用 API 转发。 */
  getExptInfoSync(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getExptInfoSync !== 'function') throw new Error('微信渠道能力不可用：getExptInfoSync');
    return (this.runtime.getExptInfoSync as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getLaunchOptionsSync，保留官方参数与回调合同。 */
  getLaunchOptionsSync(): Wechat.LaunchOptionsGame;
  /** 直接调用当前官方对象的 getLaunchOptionsSync，不使用通用 API 转发。 */
  getLaunchOptionsSync(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getLaunchOptionsSync !== 'function') throw new Error('微信渠道能力不可用：getLaunchOptionsSync');
    return (this.runtime.getLaunchOptionsSync as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 createAdSkipCard，保留官方参数与回调合同。 */
  createAdSkipCard(): WechatAdSkipCardApi;
  /** 直接调用当前官方对象的 createAdSkipCard，不使用通用 API 转发。 */
  createAdSkipCard(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createAdSkipCard !== 'function') throw new Error('微信渠道能力不可用：createAdSkipCard');
    return new WechatAdSkipCardApi((this.runtime.createAdSkipCard as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.AdSkipCard, this.assertReady);
  }
  /** 调用微信平台 createBannerAd，保留官方参数与回调合同。 */
  createBannerAd(option: Wechat.CreateBannerAdOption): WechatBannerAdApi;
  /** 直接调用当前官方对象的 createBannerAd，不使用通用 API 转发。 */
  createBannerAd(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createBannerAd !== 'function') throw new Error('微信渠道能力不可用：createBannerAd');
    return new WechatBannerAdApi((this.runtime.createBannerAd as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.BannerAd, this.assertReady);
  }
  /** 调用微信平台 createCustomAd，保留官方参数与回调合同。 */
  createCustomAd(option: Wechat.CreateCustomAdOption): WechatCustomAdApi;
  /** 直接调用当前官方对象的 createCustomAd，不使用通用 API 转发。 */
  createCustomAd(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createCustomAd !== 'function') throw new Error('微信渠道能力不可用：createCustomAd');
    return new WechatCustomAdApi((this.runtime.createCustomAd as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.CustomAd, this.assertReady);
  }
  /** 调用微信平台 createFeedbackButton，保留官方参数与回调合同。 */
  createFeedbackButton(option: Wechat.CreateOpenSettingButtonOption): WechatFeedbackButtonApi;
  /** 直接调用当前官方对象的 createFeedbackButton，不使用通用 API 转发。 */
  createFeedbackButton(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createFeedbackButton !== 'function') throw new Error('微信渠道能力不可用：createFeedbackButton');
    return new WechatFeedbackButtonApi((this.runtime.createFeedbackButton as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.FeedbackButton, this.assertReady);
  }
  /** 调用微信平台 createGameClubButton，保留官方参数与回调合同。 */
  createGameClubButton(option: Wechat.CreateGameClubButtonOption): WechatGameClubButtonApi;
  /** 直接调用当前官方对象的 createGameClubButton，不使用通用 API 转发。 */
  createGameClubButton(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createGameClubButton !== 'function') throw new Error('微信渠道能力不可用：createGameClubButton');
    return new WechatGameClubButtonApi((this.runtime.createGameClubButton as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.GameClubButton, this.assertReady);
  }
  /** 调用微信平台 createGridAd，保留官方参数与回调合同。 */
  createGridAd(option: Wechat.CreateGridAdOption): WechatGridAdApi;
  /** 直接调用当前官方对象的 createGridAd，不使用通用 API 转发。 */
  createGridAd(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createGridAd !== 'function') throw new Error('微信渠道能力不可用：createGridAd');
    return new WechatGridAdApi((this.runtime.createGridAd as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.GridAd, this.assertReady);
  }
  /** 调用微信平台 createInterstitialAd，保留官方参数与回调合同。 */
  createInterstitialAd(option: Wechat.CreateInterstitialAdOption): WechatInterstitialAdApi;
  /** 直接调用当前官方对象的 createInterstitialAd，不使用通用 API 转发。 */
  createInterstitialAd(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createInterstitialAd !== 'function') throw new Error('微信渠道能力不可用：createInterstitialAd');
    return new WechatInterstitialAdApi((this.runtime.createInterstitialAd as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.InterstitialAd, this.assertReady);
  }
  /** 调用微信平台 getOpenDataContext，保留官方参数与回调合同。 */
  getOpenDataContext(option?: Wechat.GetOpenDataContextOption): WechatOpenDataContextApi;
  /** 直接调用当前官方对象的 getOpenDataContext，不使用通用 API 转发。 */
  getOpenDataContext(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getOpenDataContext !== 'function') throw new Error('微信渠道能力不可用：getOpenDataContext');
    return new WechatOpenDataContextApi((this.runtime.getOpenDataContext as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.OpenDataContext, this.assertReady);
  }
  /** 调用微信平台 createOpenSettingButton，保留官方参数与回调合同。 */
  createOpenSettingButton(option: Wechat.CreateOpenSettingButtonOption): WechatOpenSettingButtonApi;
  /** 直接调用当前官方对象的 createOpenSettingButton，不使用通用 API 转发。 */
  createOpenSettingButton(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createOpenSettingButton !== 'function') throw new Error('微信渠道能力不可用：createOpenSettingButton');
    return new WechatOpenSettingButtonApi((this.runtime.createOpenSettingButton as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.OpenSettingButton, this.assertReady);
  }
  /** 调用微信平台 createPageManager，保留官方参数与回调合同。 */
  createPageManager(): WechatPageManagerApi;
  /** 直接调用当前官方对象的 createPageManager，不使用通用 API 转发。 */
  createPageManager(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createPageManager !== 'function') throw new Error('微信渠道能力不可用：createPageManager');
    return new WechatPageManagerApi((this.runtime.createPageManager as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.PageManager, this.assertReady);
  }
  /** 调用微信平台 getRankManager，保留官方参数与回调合同。 */
  getRankManager(): WechatRankManagerApi;
  /** 直接调用当前官方对象的 getRankManager，不使用通用 API 转发。 */
  getRankManager(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getRankManager !== 'function') throw new Error('微信渠道能力不可用：getRankManager');
    return new WechatRankManagerApi((this.runtime.getRankManager as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.RankManager, this.assertReady);
  }
  /** 调用微信平台 createRewardedVideoAd，保留官方参数与回调合同。 */
  createRewardedVideoAd(option: Wechat.CreateRewardedVideoAdOption): WechatRewardedVideoAdApi;
  /** 直接调用当前官方对象的 createRewardedVideoAd，不使用通用 API 转发。 */
  createRewardedVideoAd(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createRewardedVideoAd !== 'function') throw new Error('微信渠道能力不可用：createRewardedVideoAd');
    return new WechatRewardedVideoAdApi((this.runtime.createRewardedVideoAd as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.RewardedVideoAd, this.assertReady);
  }
  /** 调用微信平台 createStoreGift，保留官方参数与回调合同。 */
  createStoreGift(option: Wechat.CreateStoreGiftOption): WechatStoreGiftApi;
  /** 直接调用当前官方对象的 createStoreGift，不使用通用 API 转发。 */
  createStoreGift(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createStoreGift !== 'function') throw new Error('微信渠道能力不可用：createStoreGift');
    return new WechatStoreGiftApi((this.runtime.createStoreGift as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.StoreGift, this.assertReady);
  }
  /** 调用微信平台 createUserInfoButton，保留官方参数与回调合同。 */
  createUserInfoButton(option: Wechat.CreateUserInfoButtonOption): WechatUserInfoButtonApi;
  /** 直接调用当前官方对象的 createUserInfoButton，不使用通用 API 转发。 */
  createUserInfoButton(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createUserInfoButton !== 'function') throw new Error('微信渠道能力不可用：createUserInfoButton');
    return new WechatUserInfoButtonApi((this.runtime.createUserInfoButton as unknown as (...args: unknown[]) => unknown)(...args) as Wechat.UserInfoButton, this.assertReady);
  }
  /** 调用微信平台 setMessageToFriendQuery，保留官方参数与回调合同。 */
  setMessageToFriendQuery(option: Wechat.SetMessageToFriendQueryOption): boolean;
  /** 直接调用当前官方对象的 setMessageToFriendQuery，不使用通用 API 转发。 */
  setMessageToFriendQuery(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.setMessageToFriendQuery !== 'function') throw new Error('微信渠道能力不可用：setMessageToFriendQuery');
    return (this.runtime.setMessageToFriendQuery as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 addCard，保留官方参数与回调合同。 */
  addCard<T extends Wechat.AddCardOption = Wechat.AddCardOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.AddCardOption>;
  /** 直接调用当前官方对象的 addCard，不使用通用 API 转发。 */
  addCard(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.addCard !== 'function') throw new Error('微信渠道能力不可用：addCard');
    return (this.runtime.addCard as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 authPrivateMessage，保留官方参数与回调合同。 */
  authPrivateMessage(option?: Wechat.AuthPrivateMessageOption): void;
  /** 直接调用当前官方对象的 authPrivateMessage，不使用通用 API 转发。 */
  authPrivateMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.authPrivateMessage !== 'function') throw new Error('微信渠道能力不可用：authPrivateMessage');
    return (this.runtime.authPrivateMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 authorize，保留官方参数与回调合同。 */
  authorize<T extends Wechat.AuthorizeOption = Wechat.AuthorizeOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.AuthorizeOption>;
  /** 直接调用当前官方对象的 authorize，不使用通用 API 转发。 */
  authorize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.authorize !== 'function') throw new Error('微信渠道能力不可用：authorize');
    return (this.runtime.authorize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 checkHandoffEnabled，保留官方参数与回调合同。 */
  checkHandoffEnabled(option?: Wechat.CheckHandoffEnabledOption): void;
  /** 直接调用当前官方对象的 checkHandoffEnabled，不使用通用 API 转发。 */
  checkHandoffEnabled(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.checkHandoffEnabled !== 'function') throw new Error('微信渠道能力不可用：checkHandoffEnabled');
    return (this.runtime.checkHandoffEnabled as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 checkIsAddedToMyMiniProgram，保留官方参数与回调合同。 */
  checkIsAddedToMyMiniProgram(option: Wechat.CheckIsAddedToMyMiniProgramOption): void;
  /** 直接调用当前官方对象的 checkIsAddedToMyMiniProgram，不使用通用 API 转发。 */
  checkIsAddedToMyMiniProgram(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.checkIsAddedToMyMiniProgram !== 'function') throw new Error('微信渠道能力不可用：checkIsAddedToMyMiniProgram');
    return (this.runtime.checkIsAddedToMyMiniProgram as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 checkIsSupportFacialRecognition，保留官方参数与回调合同。 */
  checkIsSupportFacialRecognition(option?: Wechat.CheckIsSupportFacialRecognitionOption): void;
  /** 直接调用当前官方对象的 checkIsSupportFacialRecognition，不使用通用 API 转发。 */
  checkIsSupportFacialRecognition(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.checkIsSupportFacialRecognition !== 'function') throw new Error('微信渠道能力不可用：checkIsSupportFacialRecognition');
    return (this.runtime.checkIsSupportFacialRecognition as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 checkIsSupportMidasPayment，保留官方参数与回调合同。 */
  checkIsSupportMidasPayment(option: Wechat.CheckIsSupportMidasPaymentOption): void;
  /** 直接调用当前官方对象的 checkIsSupportMidasPayment，不使用通用 API 转发。 */
  checkIsSupportMidasPayment(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.checkIsSupportMidasPayment !== 'function') throw new Error('微信渠道能力不可用：checkIsSupportMidasPayment');
    return (this.runtime.checkIsSupportMidasPayment as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 checkSession，保留官方参数与回调合同。 */
  checkSession<T extends Wechat.CheckSessionOption = Wechat.CheckSessionOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.CheckSessionOption>;
  /** 直接调用当前官方对象的 checkSession，不使用通用 API 转发。 */
  checkSession(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.checkSession !== 'function') throw new Error('微信渠道能力不可用：checkSession');
    return (this.runtime.checkSession as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 enterChatToolMode，保留官方参数与回调合同。 */
  enterChatToolMode(option: Wechat.EnterChatToolModeOption): void;
  /** 直接调用当前官方对象的 enterChatToolMode，不使用通用 API 转发。 */
  enterChatToolMode(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.enterChatToolMode !== 'function') throw new Error('微信渠道能力不可用：enterChatToolMode');
    return (this.runtime.enterChatToolMode as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 exitChatTool，保留官方参数与回调合同。 */
  exitChatTool(option?: Wechat.ExitChatToolOption): void;
  /** 直接调用当前官方对象的 exitChatTool，不使用通用 API 转发。 */
  exitChatTool(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.exitChatTool !== 'function') throw new Error('微信渠道能力不可用：exitChatTool');
    return (this.runtime.exitChatTool as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getChannelsLiveInfo，保留官方参数与回调合同。 */
  getChannelsLiveInfo(option: Wechat.GetChannelsLiveInfoOption): void;
  /** 直接调用当前官方对象的 getChannelsLiveInfo，不使用通用 API 转发。 */
  getChannelsLiveInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getChannelsLiveInfo !== 'function') throw new Error('微信渠道能力不可用：getChannelsLiveInfo');
    return (this.runtime.getChannelsLiveInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getChannelsLiveNoticeInfo，保留官方参数与回调合同。 */
  getChannelsLiveNoticeInfo(option: Wechat.GetChannelsLiveNoticeInfoOption): void;
  /** 直接调用当前官方对象的 getChannelsLiveNoticeInfo，不使用通用 API 转发。 */
  getChannelsLiveNoticeInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getChannelsLiveNoticeInfo !== 'function') throw new Error('微信渠道能力不可用：getChannelsLiveNoticeInfo');
    return (this.runtime.getChannelsLiveNoticeInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getChatToolInfo，保留官方参数与回调合同。 */
  getChatToolInfo<T extends Wechat.GetChatToolInfoOption = Wechat.GetChatToolInfoOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.GetChatToolInfoOption>;
  /** 直接调用当前官方对象的 getChatToolInfo，不使用通用 API 转发。 */
  getChatToolInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getChatToolInfo !== 'function') throw new Error('微信渠道能力不可用：getChatToolInfo');
    return (this.runtime.getChatToolInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getFriendCloudStorage，保留官方参数与回调合同。 */
  getFriendCloudStorage(option: Wechat.GetFriendCloudStorageOption): void;
  /** 直接调用当前官方对象的 getFriendCloudStorage，不使用通用 API 转发。 */
  getFriendCloudStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getFriendCloudStorage !== 'function') throw new Error('微信渠道能力不可用：getFriendCloudStorage');
    return (this.runtime.getFriendCloudStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getFriendSendGiftStatus，保留官方参数与回调合同。 */
  getFriendSendGiftStatus(option: Wechat.GetFriendSendGiftStatusOption): void;
  /** 直接调用当前官方对象的 getFriendSendGiftStatus，不使用通用 API 转发。 */
  getFriendSendGiftStatus(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getFriendSendGiftStatus !== 'function') throw new Error('微信渠道能力不可用：getFriendSendGiftStatus');
    return (this.runtime.getFriendSendGiftStatus as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGameClubData，保留官方参数与回调合同。 */
  getGameClubData(option: Wechat.GetGameClubDataOption): void;
  /** 直接调用当前官方对象的 getGameClubData，不使用通用 API 转发。 */
  getGameClubData(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGameClubData !== 'function') throw new Error('微信渠道能力不可用：getGameClubData');
    return (this.runtime.getGameClubData as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGameExptInfo，保留官方参数与回调合同。 */
  getGameExptInfo(options: Wechat.GetGameExptInfoOption): void;
  /** 直接调用当前官方对象的 getGameExptInfo，不使用通用 API 转发。 */
  getGameExptInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGameExptInfo !== 'function') throw new Error('微信渠道能力不可用：getGameExptInfo');
    return (this.runtime.getGameExptInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGroupCloudStorage，保留官方参数与回调合同。 */
  getGroupCloudStorage(option: Wechat.GetGroupCloudStorageOption): void;
  /** 直接调用当前官方对象的 getGroupCloudStorage，不使用通用 API 转发。 */
  getGroupCloudStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGroupCloudStorage !== 'function') throw new Error('微信渠道能力不可用：getGroupCloudStorage');
    return (this.runtime.getGroupCloudStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGroupEnterInfo，保留官方参数与回调合同。 */
  getGroupEnterInfo(option: Wechat.GetGroupEnterInfoOption): void;
  /** 直接调用当前官方对象的 getGroupEnterInfo，不使用通用 API 转发。 */
  getGroupEnterInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGroupEnterInfo !== 'function') throw new Error('微信渠道能力不可用：getGroupEnterInfo');
    return (this.runtime.getGroupEnterInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGroupInfo，保留官方参数与回调合同。 */
  getGroupInfo(option: Wechat.GetGroupInfoOption): void;
  /** 直接调用当前官方对象的 getGroupInfo，不使用通用 API 转发。 */
  getGroupInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGroupInfo !== 'function') throw new Error('微信渠道能力不可用：getGroupInfo');
    return (this.runtime.getGroupInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getGroupMembersInfo，保留官方参数与回调合同。 */
  getGroupMembersInfo(option: Wechat.GetGroupMembersInfoOption): void;
  /** 直接调用当前官方对象的 getGroupMembersInfo，不使用通用 API 转发。 */
  getGroupMembersInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getGroupMembersInfo !== 'function') throw new Error('微信渠道能力不可用：getGroupMembersInfo');
    return (this.runtime.getGroupMembersInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getPhoneNumber，保留官方参数与回调合同。 */
  getPhoneNumber(option: Wechat.GetPhoneNumberOption): void;
  /** 直接调用当前官方对象的 getPhoneNumber，不使用通用 API 转发。 */
  getPhoneNumber(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getPhoneNumber !== 'function') throw new Error('微信渠道能力不可用：getPhoneNumber');
    return (this.runtime.getPhoneNumber as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getPotentialFriendList，保留官方参数与回调合同。 */
  getPotentialFriendList(option?: Wechat.GetPotentialFriendListOption): void;
  /** 直接调用当前官方对象的 getPotentialFriendList，不使用通用 API 转发。 */
  getPotentialFriendList(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getPotentialFriendList !== 'function') throw new Error('微信渠道能力不可用：getPotentialFriendList');
    return (this.runtime.getPotentialFriendList as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getPrivacySetting，保留官方参数与回调合同。 */
  getPrivacySetting(option: Wechat.GetPrivacySettingOption): void;
  /** 直接调用当前官方对象的 getPrivacySetting，不使用通用 API 转发。 */
  getPrivacySetting(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getPrivacySetting !== 'function') throw new Error('微信渠道能力不可用：getPrivacySetting');
    return (this.runtime.getPrivacySetting as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getRelationFriendList，保留官方参数与回调合同。 */
  getRelationFriendList(option?: Wechat.GetRelationFriendListOption): void;
  /** 直接调用当前官方对象的 getRelationFriendList，不使用通用 API 转发。 */
  getRelationFriendList(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getRelationFriendList !== 'function') throw new Error('微信渠道能力不可用：getRelationFriendList');
    return (this.runtime.getRelationFriendList as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getSetting，保留官方参数与回调合同。 */
  getSetting<T extends Wechat.GetSettingOption = Wechat.GetSettingOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.GetSettingOption>;
  /** 直接调用当前官方对象的 getSetting，不使用通用 API 转发。 */
  getSetting(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getSetting !== 'function') throw new Error('微信渠道能力不可用：getSetting');
    return (this.runtime.getSetting as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getShareInfo，保留官方参数与回调合同。 */
  getShareInfo<T extends Wechat.GetShareInfoOption = Wechat.GetShareInfoOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.GetShareInfoOption>;
  /** 直接调用当前官方对象的 getShareInfo，不使用通用 API 转发。 */
  getShareInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getShareInfo !== 'function') throw new Error('微信渠道能力不可用：getShareInfo');
    return (this.runtime.getShareInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getShowSplashAdStatus，保留官方参数与回调合同。 */
  getShowSplashAdStatus(option?: Wechat.GetShowSplashAdStatusOption): void;
  /** 直接调用当前官方对象的 getShowSplashAdStatus，不使用通用 API 转发。 */
  getShowSplashAdStatus(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getShowSplashAdStatus !== 'function') throw new Error('微信渠道能力不可用：getShowSplashAdStatus');
    return (this.runtime.getShowSplashAdStatus as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getUserCloudStorage，保留官方参数与回调合同。 */
  getUserCloudStorage(option: Wechat.GetUserCloudStorageOption): void;
  /** 直接调用当前官方对象的 getUserCloudStorage，不使用通用 API 转发。 */
  getUserCloudStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getUserCloudStorage !== 'function') throw new Error('微信渠道能力不可用：getUserCloudStorage');
    return (this.runtime.getUserCloudStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getUserCloudStorageKeys，保留官方参数与回调合同。 */
  getUserCloudStorageKeys(option?: Wechat.GetUserCloudStorageKeysOption): void;
  /** 直接调用当前官方对象的 getUserCloudStorageKeys，不使用通用 API 转发。 */
  getUserCloudStorageKeys(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getUserCloudStorageKeys !== 'function') throw new Error('微信渠道能力不可用：getUserCloudStorageKeys');
    return (this.runtime.getUserCloudStorageKeys as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getUserInfo，保留官方参数与回调合同。 */
  getUserInfo<T extends Wechat.GetUserInfoOption = Wechat.GetUserInfoOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.GetUserInfoOption>;
  /** 直接调用当前官方对象的 getUserInfo，不使用通用 API 转发。 */
  getUserInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getUserInfo !== 'function') throw new Error('微信渠道能力不可用：getUserInfo');
    return (this.runtime.getUserInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getUserInteractiveStorage，保留官方参数与回调合同。 */
  getUserInteractiveStorage<T extends Wechat.GetUserInteractiveStorageOption = Wechat.GetUserInteractiveStorageOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.GetUserInteractiveStorageOption>;
  /** 直接调用当前官方对象的 getUserInteractiveStorage，不使用通用 API 转发。 */
  getUserInteractiveStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getUserInteractiveStorage !== 'function') throw new Error('微信渠道能力不可用：getUserInteractiveStorage');
    return (this.runtime.getUserInteractiveStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getWeRunData，保留官方参数与回调合同。 */
  getWeRunData<T extends Wechat.GetWeRunDataOption = Wechat.GetWeRunDataOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.GetWeRunDataOption>;
  /** 直接调用当前官方对象的 getWeRunData，不使用通用 API 转发。 */
  getWeRunData(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getWeRunData !== 'function') throw new Error('微信渠道能力不可用：getWeRunData');
    return (this.runtime.getWeRunData as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hideShareMenu，保留官方参数与回调合同。 */
  hideShareMenu<T extends Wechat.HideShareMenuOption = Wechat.HideShareMenuOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.HideShareMenuOption>;
  /** 直接调用当前官方对象的 hideShareMenu，不使用通用 API 转发。 */
  hideShareMenu(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hideShareMenu !== 'function') throw new Error('微信渠道能力不可用：hideShareMenu');
    return (this.runtime.hideShareMenu as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 isChatTool，保留官方参数与回调合同。 */
  isChatTool(): void;
  /** 直接调用当前官方对象的 isChatTool，不使用通用 API 转发。 */
  isChatTool(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.isChatTool !== 'function') throw new Error('微信渠道能力不可用：isChatTool');
    return (this.runtime.isChatTool as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 login，保留官方参数与回调合同。 */
  login<T extends Wechat.LoginOption = Wechat.LoginOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.LoginOption>;
  /** 直接调用当前官方对象的 login，不使用通用 API 转发。 */
  login(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.login !== 'function') throw new Error('微信渠道能力不可用：login');
    return (this.runtime.login as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 modifyFriendInteractiveStorage，保留官方参数与回调合同。 */
  modifyFriendInteractiveStorage(option: Wechat.ModifyFriendInteractiveStorageOption): void;
  /** 直接调用当前官方对象的 modifyFriendInteractiveStorage，不使用通用 API 转发。 */
  modifyFriendInteractiveStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.modifyFriendInteractiveStorage !== 'function') throw new Error('微信渠道能力不可用：modifyFriendInteractiveStorage');
    return (this.runtime.modifyFriendInteractiveStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 notifyGroupMembers，保留官方参数与回调合同。 */
  notifyGroupMembers<T extends Wechat.NotifyGroupMembersOption = Wechat.NotifyGroupMembersOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.NotifyGroupMembersOption>;
  /** 直接调用当前官方对象的 notifyGroupMembers，不使用通用 API 转发。 */
  notifyGroupMembers(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.notifyGroupMembers !== 'function') throw new Error('微信渠道能力不可用：notifyGroupMembers');
    return (this.runtime.notifyGroupMembers as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offAddToFavorites，保留官方参数与回调合同。 */
  offAddToFavorites(): void;
  /** 直接调用当前官方对象的 offAddToFavorites，不使用通用 API 转发。 */
  offAddToFavorites(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offAddToFavorites !== 'function') throw new Error('微信渠道能力不可用：offAddToFavorites');
    return (this.runtime.offAddToFavorites as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offAddToSchedule，保留官方参数与回调合同。 */
  offAddToSchedule(): void;
  /** 直接调用当前官方对象的 offAddToSchedule，不使用通用 API 转发。 */
  offAddToSchedule(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offAddToSchedule !== 'function') throw new Error('微信渠道能力不可用：offAddToSchedule');
    return (this.runtime.offAddToSchedule as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offCopyUrl，保留官方参数与回调合同。 */
  offCopyUrl(): void;
  /** 直接调用当前官方对象的 offCopyUrl，不使用通用 API 转发。 */
  offCopyUrl(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offCopyUrl !== 'function') throw new Error('微信渠道能力不可用：offCopyUrl');
    return (this.runtime.offCopyUrl as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offDirectAdStatusChange，保留官方参数与回调合同。 */
  offDirectAdStatusChange(listener?: Wechat.OffDirectAdStatusChangeCallback): void;
  /** 直接调用当前官方对象的 offDirectAdStatusChange，不使用通用 API 转发。 */
  offDirectAdStatusChange(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offDirectAdStatusChange !== 'function') throw new Error('微信渠道能力不可用：offDirectAdStatusChange');
    return (this.runtime.offDirectAdStatusChange as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offHandoff，保留官方参数与回调合同。 */
  offHandoff(): void;
  /** 直接调用当前官方对象的 offHandoff，不使用通用 API 转发。 */
  offHandoff(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offHandoff !== 'function') throw new Error('微信渠道能力不可用：offHandoff');
    return (this.runtime.offHandoff as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offHide，保留官方参数与回调合同。 */
  offHide(listener?: Wechat.OffHideCallback): void;
  /** 直接调用当前官方对象的 offHide，不使用通用 API 转发。 */
  offHide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offHide !== 'function') throw new Error('微信渠道能力不可用：offHide');
    return (this.runtime.offHide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offInteractiveStorageModified，保留官方参数与回调合同。 */
  offInteractiveStorageModified(callback?: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 offInteractiveStorageModified，不使用通用 API 转发。 */
  offInteractiveStorageModified(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offInteractiveStorageModified !== 'function') throw new Error('微信渠道能力不可用：offInteractiveStorageModified');
    return (this.runtime.offInteractiveStorageModified as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offShareAppMessage，保留官方参数与回调合同。 */
  offShareAppMessage(listener?: Wechat.OffShareAppMessageCallback): void;
  /** 直接调用当前官方对象的 offShareAppMessage，不使用通用 API 转发。 */
  offShareAppMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offShareAppMessage !== 'function') throw new Error('微信渠道能力不可用：offShareAppMessage');
    return (this.runtime.offShareAppMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offShareMessageToFriend，保留官方参数与回调合同。 */
  offShareMessageToFriend(listener?: Wechat.OffShareMessageToFriendCallback): void;
  /** 直接调用当前官方对象的 offShareMessageToFriend，不使用通用 API 转发。 */
  offShareMessageToFriend(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offShareMessageToFriend !== 'function') throw new Error('微信渠道能力不可用：offShareMessageToFriend');
    return (this.runtime.offShareMessageToFriend as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offShareTimeline，保留官方参数与回调合同。 */
  offShareTimeline(listener?: Wechat.OffShareTimelineCallback): void;
  /** 直接调用当前官方对象的 offShareTimeline，不使用通用 API 转发。 */
  offShareTimeline(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offShareTimeline !== 'function') throw new Error('微信渠道能力不可用：offShareTimeline');
    return (this.runtime.offShareTimeline as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offShow，保留官方参数与回调合同。 */
  offShow(listener?: Wechat.OffShowCallback): void;
  /** 直接调用当前官方对象的 offShow，不使用通用 API 转发。 */
  offShow(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offShow !== 'function') throw new Error('微信渠道能力不可用：offShow');
    return (this.runtime.offShow as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onAddToFavorites，保留官方参数与回调合同。 */
  onAddToFavorites(listener: Wechat.OnAddToFavoritesCallback): void;
  /** 直接调用当前官方对象的 onAddToFavorites，不使用通用 API 转发。 */
  onAddToFavorites(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onAddToFavorites !== 'function') throw new Error('微信渠道能力不可用：onAddToFavorites');
    return (this.runtime.onAddToFavorites as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onAddToSchedule，保留官方参数与回调合同。 */
  onAddToSchedule(listener: Wechat.OnAddToScheduleCallback): void;
  /** 直接调用当前官方对象的 onAddToSchedule，不使用通用 API 转发。 */
  onAddToSchedule(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onAddToSchedule !== 'function') throw new Error('微信渠道能力不可用：onAddToSchedule');
    return (this.runtime.onAddToSchedule as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onCopyUrl，保留官方参数与回调合同。 */
  onCopyUrl(listener: Wechat.OnCopyUrlCallback): void;
  /** 直接调用当前官方对象的 onCopyUrl，不使用通用 API 转发。 */
  onCopyUrl(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onCopyUrl !== 'function') throw new Error('微信渠道能力不可用：onCopyUrl');
    return (this.runtime.onCopyUrl as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onDirectAdStatusChange，保留官方参数与回调合同。 */
  onDirectAdStatusChange(listener: Wechat.OnDirectAdStatusChangeCallback): void;
  /** 直接调用当前官方对象的 onDirectAdStatusChange，不使用通用 API 转发。 */
  onDirectAdStatusChange(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onDirectAdStatusChange !== 'function') throw new Error('微信渠道能力不可用：onDirectAdStatusChange');
    return (this.runtime.onDirectAdStatusChange as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onHandoff，保留官方参数与回调合同。 */
  onHandoff(listener: Wechat.OnHandoffCallback): void;
  /** 直接调用当前官方对象的 onHandoff，不使用通用 API 转发。 */
  onHandoff(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onHandoff !== 'function') throw new Error('微信渠道能力不可用：onHandoff');
    return (this.runtime.onHandoff as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onHide，保留官方参数与回调合同。 */
  onHide(listener: Wechat.OnHideCallback): void;
  /** 直接调用当前官方对象的 onHide，不使用通用 API 转发。 */
  onHide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onHide !== 'function') throw new Error('微信渠道能力不可用：onHide');
    return (this.runtime.onHide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onInteractiveStorageModified，保留官方参数与回调合同。 */
  onInteractiveStorageModified(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 onInteractiveStorageModified，不使用通用 API 转发。 */
  onInteractiveStorageModified(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onInteractiveStorageModified !== 'function') throw new Error('微信渠道能力不可用：onInteractiveStorageModified');
    return (this.runtime.onInteractiveStorageModified as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onMessage，保留官方参数与回调合同。 */
  onMessage(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 onMessage，不使用通用 API 转发。 */
  onMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onMessage !== 'function') throw new Error('微信渠道能力不可用：onMessage');
    return (this.runtime.onMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onNeedPrivacyAuthorization，保留官方参数与回调合同。 */
  onNeedPrivacyAuthorization(listener: Wechat.OnNeedPrivacyAuthorizationCallback): void;
  /** 直接调用当前官方对象的 onNeedPrivacyAuthorization，不使用通用 API 转发。 */
  onNeedPrivacyAuthorization(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onNeedPrivacyAuthorization !== 'function') throw new Error('微信渠道能力不可用：onNeedPrivacyAuthorization');
    return (this.runtime.onNeedPrivacyAuthorization as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onShareAppMessage，保留官方参数与回调合同。 */
  onShareAppMessage(listener: Wechat.OnShareAppMessageCallback): void;
  /** 直接调用当前官方对象的 onShareAppMessage，不使用通用 API 转发。 */
  onShareAppMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onShareAppMessage !== 'function') throw new Error('微信渠道能力不可用：onShareAppMessage');
    return (this.runtime.onShareAppMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onShareMessageToFriend，保留官方参数与回调合同。 */
  onShareMessageToFriend(listener: Wechat.OnShareMessageToFriendCallback): void;
  /** 直接调用当前官方对象的 onShareMessageToFriend，不使用通用 API 转发。 */
  onShareMessageToFriend(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onShareMessageToFriend !== 'function') throw new Error('微信渠道能力不可用：onShareMessageToFriend');
    return (this.runtime.onShareMessageToFriend as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onShareTimeline，保留官方参数与回调合同。 */
  onShareTimeline(listener: Wechat.OnShareTimelineCallback): void;
  /** 直接调用当前官方对象的 onShareTimeline，不使用通用 API 转发。 */
  onShareTimeline(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onShareTimeline !== 'function') throw new Error('微信渠道能力不可用：onShareTimeline');
    return (this.runtime.onShareTimeline as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onShow，保留官方参数与回调合同。 */
  onShow(listener: Wechat.OnShowCallback): void;
  /** 直接调用当前官方对象的 onShow，不使用通用 API 转发。 */
  onShow(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onShow !== 'function') throw new Error('微信渠道能力不可用：onShow');
    return (this.runtime.onShow as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openCard，保留官方参数与回调合同。 */
  openCard<T extends Wechat.OpenCardOption = Wechat.OpenCardOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.OpenCardOption>;
  /** 直接调用当前官方对象的 openCard，不使用通用 API 转发。 */
  openCard(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openCard !== 'function') throw new Error('微信渠道能力不可用：openCard');
    return (this.runtime.openCard as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openChannelsActivity，保留官方参数与回调合同。 */
  openChannelsActivity(option: Wechat.OpenChannelsActivityOption): void;
  /** 直接调用当前官方对象的 openChannelsActivity，不使用通用 API 转发。 */
  openChannelsActivity(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openChannelsActivity !== 'function') throw new Error('微信渠道能力不可用：openChannelsActivity');
    return (this.runtime.openChannelsActivity as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openChannelsEvent，保留官方参数与回调合同。 */
  openChannelsEvent(option: Wechat.OpenChannelsEventOption): void;
  /** 直接调用当前官方对象的 openChannelsEvent，不使用通用 API 转发。 */
  openChannelsEvent(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openChannelsEvent !== 'function') throw new Error('微信渠道能力不可用：openChannelsEvent');
    return (this.runtime.openChannelsEvent as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openChannelsLive，保留官方参数与回调合同。 */
  openChannelsLive(option: Wechat.OpenChannelsLiveOption): void;
  /** 直接调用当前官方对象的 openChannelsLive，不使用通用 API 转发。 */
  openChannelsLive(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openChannelsLive !== 'function') throw new Error('微信渠道能力不可用：openChannelsLive');
    return (this.runtime.openChannelsLive as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openChannelsUserProfile，保留官方参数与回调合同。 */
  openChannelsUserProfile(option: Wechat.OpenChannelsUserProfileOption): void;
  /** 直接调用当前官方对象的 openChannelsUserProfile，不使用通用 API 转发。 */
  openChannelsUserProfile(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openChannelsUserProfile !== 'function') throw new Error('微信渠道能力不可用：openChannelsUserProfile');
    return (this.runtime.openChannelsUserProfile as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openChatTool，保留官方参数与回调合同。 */
  openChatTool<T extends Wechat.OpenChatToolOption = Wechat.OpenChatToolOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.OpenChatToolOption>;
  /** 直接调用当前官方对象的 openChatTool，不使用通用 API 转发。 */
  openChatTool(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openChatTool !== 'function') throw new Error('微信渠道能力不可用：openChatTool');
    return (this.runtime.openChatTool as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openCustomerServiceChat，保留官方参数与回调合同。 */
  openCustomerServiceChat(option: Wechat.OpenCustomerServiceChatOption): void;
  /** 直接调用当前官方对象的 openCustomerServiceChat，不使用通用 API 转发。 */
  openCustomerServiceChat(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openCustomerServiceChat !== 'function') throw new Error('微信渠道能力不可用：openCustomerServiceChat');
    return (this.runtime.openCustomerServiceChat as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openCustomerServiceConversation，保留官方参数与回调合同。 */
  openCustomerServiceConversation<T extends Wechat.OpenCustomerServiceConversationOption = Wechat.OpenCustomerServiceConversationOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.OpenCustomerServiceConversationOption>;
  /** 直接调用当前官方对象的 openCustomerServiceConversation，不使用通用 API 转发。 */
  openCustomerServiceConversation(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openCustomerServiceConversation !== 'function') throw new Error('微信渠道能力不可用：openCustomerServiceConversation');
    return (this.runtime.openCustomerServiceConversation as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openPrivacyContract，保留官方参数与回调合同。 */
  openPrivacyContract(option: Wechat.OpenPrivacyContractOption): void;
  /** 直接调用当前官方对象的 openPrivacyContract，不使用通用 API 转发。 */
  openPrivacyContract(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openPrivacyContract !== 'function') throw new Error('微信渠道能力不可用：openPrivacyContract');
    return (this.runtime.openPrivacyContract as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 openSetting，保留官方参数与回调合同。 */
  openSetting<T extends Wechat.OpenSettingOption = Wechat.OpenSettingOption>(option?: T): Wechat.PromisifySuccessResult<T, Wechat.OpenSettingOption>;
  /** 直接调用当前官方对象的 openSetting，不使用通用 API 转发。 */
  openSetting(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.openSetting !== 'function') throw new Error('微信渠道能力不可用：openSetting');
    return (this.runtime.openSetting as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 removeUserCloudStorage，保留官方参数与回调合同。 */
  removeUserCloudStorage<T extends Wechat.RemoveUserCloudStorageOption = Wechat.RemoveUserCloudStorageOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.RemoveUserCloudStorageOption>;
  /** 直接调用当前官方对象的 removeUserCloudStorage，不使用通用 API 转发。 */
  removeUserCloudStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.removeUserCloudStorage !== 'function') throw new Error('微信渠道能力不可用：removeUserCloudStorage');
    return (this.runtime.removeUserCloudStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 reportEvent，保留官方参数与回调合同。 */
  reportEvent(eventId: string, data?: Wechat.IAnyObject): void;
  /** 直接调用当前官方对象的 reportEvent，不使用通用 API 转发。 */
  reportEvent(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.reportEvent !== 'function') throw new Error('微信渠道能力不可用：reportEvent');
    return (this.runtime.reportEvent as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 reportMonitor，保留官方参数与回调合同。 */
  reportMonitor(name: string, value: number): void;
  /** 直接调用当前官方对象的 reportMonitor，不使用通用 API 转发。 */
  reportMonitor(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.reportMonitor !== 'function') throw new Error('微信渠道能力不可用：reportMonitor');
    return (this.runtime.reportMonitor as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 reportScene，保留官方参数与回调合同。 */
  reportScene(option: Wechat.ReportSceneOption): void;
  /** 直接调用当前官方对象的 reportScene，不使用通用 API 转发。 */
  reportScene(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.reportScene !== 'function') throw new Error('微信渠道能力不可用：reportScene');
    return (this.runtime.reportScene as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 reportUserBehaviorBranchAnalytics，保留官方参数与回调合同。 */
  reportUserBehaviorBranchAnalytics(option: Wechat.ReportUserBehaviorBranchAnalyticsOption): void;
  /** 直接调用当前官方对象的 reportUserBehaviorBranchAnalytics，不使用通用 API 转发。 */
  reportUserBehaviorBranchAnalytics(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.reportUserBehaviorBranchAnalytics !== 'function') throw new Error('微信渠道能力不可用：reportUserBehaviorBranchAnalytics');
    return (this.runtime.reportUserBehaviorBranchAnalytics as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestFacialRecognition，保留官方参数与回调合同。 */
  requestFacialRecognition(option?: Wechat.RequestFacialRecognitionOption): void;
  /** 直接调用当前官方对象的 requestFacialRecognition，不使用通用 API 转发。 */
  requestFacialRecognition(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestFacialRecognition !== 'function') throw new Error('微信渠道能力不可用：requestFacialRecognition');
    return (this.runtime.requestFacialRecognition as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestFacialVerify，保留官方参数与回调合同。 */
  requestFacialVerify(option: Wechat.RequestFacialVerifyOption): void;
  /** 直接调用当前官方对象的 requestFacialVerify，不使用通用 API 转发。 */
  requestFacialVerify(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestFacialVerify !== 'function') throw new Error('微信渠道能力不可用：requestFacialVerify');
    return (this.runtime.requestFacialVerify as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestMidasFriendPayment，保留官方参数与回调合同。 */
  requestMidasFriendPayment(option: Wechat.RequestMidasFriendPaymentOption): void;
  /** 直接调用当前官方对象的 requestMidasFriendPayment，不使用通用 API 转发。 */
  requestMidasFriendPayment(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestMidasFriendPayment !== 'function') throw new Error('微信渠道能力不可用：requestMidasFriendPayment');
    return (this.runtime.requestMidasFriendPayment as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestMidasPayment，保留官方参数与回调合同。 */
  requestMidasPayment<T extends Wechat.RequestMidasPaymentOption = Wechat.RequestMidasPaymentOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.RequestMidasPaymentOption>;
  /** 直接调用当前官方对象的 requestMidasPayment，不使用通用 API 转发。 */
  requestMidasPayment(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestMidasPayment !== 'function') throw new Error('微信渠道能力不可用：requestMidasPayment');
    return (this.runtime.requestMidasPayment as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestMidasPaymentGameItem，保留官方参数与回调合同。 */
  requestMidasPaymentGameItem(option: Wechat.RequestMidasPaymentGameItemOption): void;
  /** 直接调用当前官方对象的 requestMidasPaymentGameItem，不使用通用 API 转发。 */
  requestMidasPaymentGameItem(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestMidasPaymentGameItem !== 'function') throw new Error('微信渠道能力不可用：requestMidasPaymentGameItem');
    return (this.runtime.requestMidasPaymentGameItem as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestSubscribeMessage，保留官方参数与回调合同。 */
  requestSubscribeMessage<T extends Wechat.RequestSubscribeMessageOption = Wechat.RequestSubscribeMessageOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.RequestSubscribeMessageOption>;
  /** 直接调用当前官方对象的 requestSubscribeMessage，不使用通用 API 转发。 */
  requestSubscribeMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestSubscribeMessage !== 'function') throw new Error('微信渠道能力不可用：requestSubscribeMessage');
    return (this.runtime.requestSubscribeMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requestSubscribeSystemMessage，保留官方参数与回调合同。 */
  requestSubscribeSystemMessage<T extends Wechat.RequestSubscribeSystemMessageOption = Wechat.RequestSubscribeSystemMessageOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.RequestSubscribeSystemMessageOption>;
  /** 直接调用当前官方对象的 requestSubscribeSystemMessage，不使用通用 API 转发。 */
  requestSubscribeSystemMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requestSubscribeSystemMessage !== 'function') throw new Error('微信渠道能力不可用：requestSubscribeSystemMessage');
    return (this.runtime.requestSubscribeSystemMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 requirePrivacyAuthorize，保留官方参数与回调合同。 */
  requirePrivacyAuthorize(option: Wechat.RequirePrivacyAuthorizeOption): void;
  /** 直接调用当前官方对象的 requirePrivacyAuthorize，不使用通用 API 转发。 */
  requirePrivacyAuthorize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.requirePrivacyAuthorize !== 'function') throw new Error('微信渠道能力不可用：requirePrivacyAuthorize');
    return (this.runtime.requirePrivacyAuthorize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 reserveChannelsLive，保留官方参数与回调合同。 */
  reserveChannelsLive(option: Wechat.ReserveChannelsLiveOption): void;
  /** 直接调用当前官方对象的 reserveChannelsLive，不使用通用 API 转发。 */
  reserveChannelsLive(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.reserveChannelsLive !== 'function') throw new Error('微信渠道能力不可用：reserveChannelsLive');
    return (this.runtime.reserveChannelsLive as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 selectGroupMembers，保留官方参数与回调合同。 */
  selectGroupMembers<T extends Wechat.SelectGroupMembersOption = Wechat.SelectGroupMembersOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.SelectGroupMembersOption>;
  /** 直接调用当前官方对象的 selectGroupMembers，不使用通用 API 转发。 */
  selectGroupMembers(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.selectGroupMembers !== 'function') throw new Error('微信渠道能力不可用：selectGroupMembers');
    return (this.runtime.selectGroupMembers as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 sendGiftToFriend，保留官方参数与回调合同。 */
  sendGiftToFriend(option: Wechat.SendGiftToFriendOption): void;
  /** 直接调用当前官方对象的 sendGiftToFriend，不使用通用 API 转发。 */
  sendGiftToFriend(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.sendGiftToFriend !== 'function') throw new Error('微信渠道能力不可用：sendGiftToFriend');
    return (this.runtime.sendGiftToFriend as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 setUserCloudStorage，保留官方参数与回调合同。 */
  setUserCloudStorage<T extends Wechat.SetUserCloudStorageOption = Wechat.SetUserCloudStorageOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.SetUserCloudStorageOption>;
  /** 直接调用当前官方对象的 setUserCloudStorage，不使用通用 API 转发。 */
  setUserCloudStorage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.setUserCloudStorage !== 'function') throw new Error('微信渠道能力不可用：setUserCloudStorage');
    return (this.runtime.setUserCloudStorage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareAppMessage，保留官方参数与回调合同。 */
  shareAppMessage(option: Wechat.ShareAppMessageOption): void;
  /** 直接调用当前官方对象的 shareAppMessage，不使用通用 API 转发。 */
  shareAppMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareAppMessage !== 'function') throw new Error('微信渠道能力不可用：shareAppMessage');
    return (this.runtime.shareAppMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareAppMessageToGroup，保留官方参数与回调合同。 */
  shareAppMessageToGroup<T extends Wechat.ShareAppMessageToGroupOption = Wechat.ShareAppMessageToGroupOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShareAppMessageToGroupOption>;
  /** 直接调用当前官方对象的 shareAppMessageToGroup，不使用通用 API 转发。 */
  shareAppMessageToGroup(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareAppMessageToGroup !== 'function') throw new Error('微信渠道能力不可用：shareAppMessageToGroup');
    return (this.runtime.shareAppMessageToGroup as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareEmojiToGroup，保留官方参数与回调合同。 */
  shareEmojiToGroup<T extends Wechat.ShareEmojiToGroupOption = Wechat.ShareEmojiToGroupOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShareEmojiToGroupOption>;
  /** 直接调用当前官方对象的 shareEmojiToGroup，不使用通用 API 转发。 */
  shareEmojiToGroup(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareEmojiToGroup !== 'function') throw new Error('微信渠道能力不可用：shareEmojiToGroup');
    return (this.runtime.shareEmojiToGroup as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareImageToGroup，保留官方参数与回调合同。 */
  shareImageToGroup<T extends Wechat.ShareImageToGroupOption = Wechat.ShareImageToGroupOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShareImageToGroupOption>;
  /** 直接调用当前官方对象的 shareImageToGroup，不使用通用 API 转发。 */
  shareImageToGroup(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareImageToGroup !== 'function') throw new Error('微信渠道能力不可用：shareImageToGroup');
    return (this.runtime.shareImageToGroup as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareMessageToFriend，保留官方参数与回调合同。 */
  shareMessageToFriend(option: Wechat.ShareMessageToFriendOption): void;
  /** 直接调用当前官方对象的 shareMessageToFriend，不使用通用 API 转发。 */
  shareMessageToFriend(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareMessageToFriend !== 'function') throw new Error('微信渠道能力不可用：shareMessageToFriend');
    return (this.runtime.shareMessageToFriend as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareTextToGroup，保留官方参数与回调合同。 */
  shareTextToGroup(option: Wechat.ShareTextToGroupOption): void;
  /** 直接调用当前官方对象的 shareTextToGroup，不使用通用 API 转发。 */
  shareTextToGroup(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareTextToGroup !== 'function') throw new Error('微信渠道能力不可用：shareTextToGroup');
    return (this.runtime.shareTextToGroup as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 shareVideoToGroup，保留官方参数与回调合同。 */
  shareVideoToGroup<T extends Wechat.ShareVideoToGroupOption = Wechat.ShareVideoToGroupOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShareVideoToGroupOption>;
  /** 直接调用当前官方对象的 shareVideoToGroup，不使用通用 API 转发。 */
  shareVideoToGroup(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.shareVideoToGroup !== 'function') throw new Error('微信渠道能力不可用：shareVideoToGroup');
    return (this.runtime.shareVideoToGroup as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 showShareImageMenu，保留官方参数与回调合同。 */
  showShareImageMenu<T extends Wechat.ShowShareImageMenuOption = Wechat.ShowShareImageMenuOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShowShareImageMenuOption>;
  /** 直接调用当前官方对象的 showShareImageMenu，不使用通用 API 转发。 */
  showShareImageMenu(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.showShareImageMenu !== 'function') throw new Error('微信渠道能力不可用：showShareImageMenu');
    return (this.runtime.showShareImageMenu as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 showShareMenu，保留官方参数与回调合同。 */
  showShareMenu<T extends Wechat.ShowShareMenuOption = Wechat.ShowShareMenuOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.ShowShareMenuOption>;
  /** 直接调用当前官方对象的 showShareMenu，不使用通用 API 转发。 */
  showShareMenu(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.showShareMenu !== 'function') throw new Error('微信渠道能力不可用：showShareMenu');
    return (this.runtime.showShareMenu as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 startHandoff，保留官方参数与回调合同。 */
  startHandoff(option?: Wechat.StartHandoffOption): void;
  /** 直接调用当前官方对象的 startHandoff，不使用通用 API 转发。 */
  startHandoff(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.startHandoff !== 'function') throw new Error('微信渠道能力不可用：startHandoff');
    return (this.runtime.startHandoff as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 updateShareMenu，保留官方参数与回调合同。 */
  updateShareMenu<T extends Wechat.UpdateShareMenuOption = Wechat.UpdateShareMenuOption>(option: T): Wechat.PromisifySuccessResult<T, Wechat.UpdateShareMenuOption>;
  /** 直接调用当前官方对象的 updateShareMenu，不使用通用 API 转发。 */
  updateShareMenu(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.updateShareMenu !== 'function') throw new Error('微信渠道能力不可用：updateShareMenu');
    return (this.runtime.updateShareMenu as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信AdSkipCard平台对象的具体具名实现。 */
export class WechatAdSkipCardApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.AdSkipCard, protected readonly assertReady: () => void) {}
  /** 调用微信平台 offClose，保留官方参数与回调合同。 */
  offClose(callback: Wechat.AdSkipCardCloseCallback): void;
  /** 直接调用当前官方对象的 offClose，不使用通用 API 转发。 */
  offClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offClose !== 'function') throw new Error('微信渠道能力不可用：offClose');
    return (this.runtime.offClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(callback: Wechat.AdSkipCardErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offShow，保留官方参数与回调合同。 */
  offShow(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 offShow，不使用通用 API 转发。 */
  offShow(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offShow !== 'function') throw new Error('微信渠道能力不可用：offShow');
    return (this.runtime.offShow as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offUse，保留官方参数与回调合同。 */
  offUse(callback: Wechat.AdSkipCardUseCallback): void;
  /** 直接调用当前官方对象的 offUse，不使用通用 API 转发。 */
  offUse(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offUse !== 'function') throw new Error('微信渠道能力不可用：offUse');
    return (this.runtime.offUse as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onClose，保留官方参数与回调合同。 */
  onClose(callback: Wechat.AdSkipCardCloseCallback): void;
  /** 直接调用当前官方对象的 onClose，不使用通用 API 转发。 */
  onClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onClose !== 'function') throw new Error('微信渠道能力不可用：onClose');
    return (this.runtime.onClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(callback: Wechat.AdSkipCardErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onShow，保留官方参数与回调合同。 */
  onShow(callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 onShow，不使用通用 API 转发。 */
  onShow(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onShow !== 'function') throw new Error('微信渠道能力不可用：onShow');
    return (this.runtime.onShow as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onUse，保留官方参数与回调合同。 */
  onUse(callback: Wechat.AdSkipCardUseCallback): void;
  /** 直接调用当前官方对象的 onUse，不使用通用 API 转发。 */
  onUse(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onUse !== 'function') throw new Error('微信渠道能力不可用：onUse');
    return (this.runtime.onUse as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 load，保留官方参数与回调合同。 */
  load(): Promise<any>;
  /** 直接调用当前官方对象的 load，不使用通用 API 转发。 */
  load(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.load !== 'function') throw new Error('微信渠道能力不可用：load');
    return (this.runtime.load as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信BannerAd平台对象的具体具名实现。 */
export class WechatBannerAdApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.BannerAd, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.BannerAdStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.BannerAdStyle) { this.assertReady(); this.runtime.style = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(listener?: Wechat.GridAdOffErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(listener?: Wechat.OffLoadCallback): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offResize，保留官方参数与回调合同。 */
  offResize(listener?: Wechat.OffResizeCallback): void;
  /** 直接调用当前官方对象的 offResize，不使用通用 API 转发。 */
  offResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offResize !== 'function') throw new Error('微信渠道能力不可用：offResize');
    return (this.runtime.offResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(listener: Wechat.GridAdOnErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(listener: Wechat.OnLoadCallback): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onResize，保留官方参数与回调合同。 */
  onResize(listener: Wechat.OnResizeCallback): void;
  /** 直接调用当前官方对象的 onResize，不使用通用 API 转发。 */
  onResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onResize !== 'function') throw new Error('微信渠道能力不可用：onResize');
    return (this.runtime.onResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信CustomAd平台对象的具体具名实现。 */
export class WechatCustomAdApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.CustomAd, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.CustomAdStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.CustomAdStyle) { this.assertReady(); this.runtime.style = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offClose，保留官方参数与回调合同。 */
  offClose(listener?: Wechat.UDPSocketOffCloseCallback): void;
  /** 直接调用当前官方对象的 offClose，不使用通用 API 转发。 */
  offClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offClose !== 'function') throw new Error('微信渠道能力不可用：offClose');
    return (this.runtime.offClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(listener?: Wechat.CustomAdOffErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offHide，保留官方参数与回调合同。 */
  offHide(listener?: Wechat.OffHideCallback): void;
  /** 直接调用当前官方对象的 offHide，不使用通用 API 转发。 */
  offHide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offHide !== 'function') throw new Error('微信渠道能力不可用：offHide');
    return (this.runtime.offHide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(listener?: Wechat.OffLoadCallback): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offResize，保留官方参数与回调合同。 */
  offResize(listener?: Wechat.OffResizeCallback): void;
  /** 直接调用当前官方对象的 offResize，不使用通用 API 转发。 */
  offResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offResize !== 'function') throw new Error('微信渠道能力不可用：offResize');
    return (this.runtime.offResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onClose，保留官方参数与回调合同。 */
  onClose(listener: Wechat.UDPSocketOnCloseCallback): void;
  /** 直接调用当前官方对象的 onClose，不使用通用 API 转发。 */
  onClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onClose !== 'function') throw new Error('微信渠道能力不可用：onClose');
    return (this.runtime.onClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(listener: Wechat.CustomAdOnErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onHide，保留官方参数与回调合同。 */
  onHide(listener: Wechat.OnHideCallback): void;
  /** 直接调用当前官方对象的 onHide，不使用通用 API 转发。 */
  onHide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onHide !== 'function') throw new Error('微信渠道能力不可用：onHide');
    return (this.runtime.onHide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(listener: Wechat.OnLoadCallback): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onResize，保留官方参数与回调合同。 */
  onResize(listener: Wechat.OnResizeCallback): void;
  /** 直接调用当前官方对象的 onResize，不使用通用 API 转发。 */
  onResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onResize !== 'function') throw new Error('微信渠道能力不可用：onResize');
    return (this.runtime.onResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): Promise<any>;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 isShow，保留官方参数与回调合同。 */
  isShow(): boolean;
  /** 直接调用当前官方对象的 isShow，不使用通用 API 转发。 */
  isShow(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.isShow !== 'function') throw new Error('微信渠道能力不可用：isShow');
    return (this.runtime.isShow as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信GridAd平台对象的具体具名实现。 */
export class WechatGridAdApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.GridAd, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 adTheme 属性。 */
  get adTheme(): string { this.assertReady(); return this.runtime.adTheme; }
  /** 更新平台对象公开可写的 adTheme 属性。 */
  set adTheme(value: string) { this.assertReady(); this.runtime.adTheme = value; }
  /** 读取平台对象公开的 gridCount 属性。 */
  get gridCount(): number { this.assertReady(); return this.runtime.gridCount; }
  /** 更新平台对象公开可写的 gridCount 属性。 */
  set gridCount(value: number) { this.assertReady(); this.runtime.gridCount = value; }
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.GridAdStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.GridAdStyle) { this.assertReady(); this.runtime.style = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(listener?: Wechat.GridAdOffErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(listener?: Wechat.OffLoadCallback): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offResize，保留官方参数与回调合同。 */
  offResize(listener?: Wechat.OffResizeCallback): void;
  /** 直接调用当前官方对象的 offResize，不使用通用 API 转发。 */
  offResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offResize !== 'function') throw new Error('微信渠道能力不可用：offResize');
    return (this.runtime.offResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(listener: Wechat.GridAdOnErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(listener: Wechat.OnLoadCallback): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onResize，保留官方参数与回调合同。 */
  onResize(listener: Wechat.OnResizeCallback): void;
  /** 直接调用当前官方对象的 onResize，不使用通用 API 转发。 */
  onResize(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onResize !== 'function') throw new Error('微信渠道能力不可用：onResize');
    return (this.runtime.onResize as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信InterstitialAd平台对象的具体具名实现。 */
export class WechatInterstitialAdApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.InterstitialAd, protected readonly assertReady: () => void) {}
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offClose，保留官方参数与回调合同。 */
  offClose(listener?: Wechat.UDPSocketOffCloseCallback): void;
  /** 直接调用当前官方对象的 offClose，不使用通用 API 转发。 */
  offClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offClose !== 'function') throw new Error('微信渠道能力不可用：offClose');
    return (this.runtime.offClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(listener?: Wechat.InterstitialAdOffErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(listener?: Wechat.OffLoadCallback): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onClose，保留官方参数与回调合同。 */
  onClose(listener: Wechat.UDPSocketOnCloseCallback): void;
  /** 直接调用当前官方对象的 onClose，不使用通用 API 转发。 */
  onClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onClose !== 'function') throw new Error('微信渠道能力不可用：onClose');
    return (this.runtime.onClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(listener: Wechat.InterstitialAdOnErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(listener: Wechat.OnLoadCallback): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 load，保留官方参数与回调合同。 */
  load(): Promise<any>;
  /** 直接调用当前官方对象的 load，不使用通用 API 转发。 */
  load(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.load !== 'function') throw new Error('微信渠道能力不可用：load');
    return (this.runtime.load as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信RewardedVideoAd平台对象的具体具名实现。 */
export class WechatRewardedVideoAdApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.RewardedVideoAd, protected readonly assertReady: () => void) {}
  /** 调用微信平台 load，保留官方参数与回调合同。 */
  load(): Promise<any>;
  /** 直接调用当前官方对象的 load，不使用通用 API 转发。 */
  load(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.load !== 'function') throw new Error('微信渠道能力不可用：load');
    return (this.runtime.load as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offClose，保留官方参数与回调合同。 */
  offClose(listener?: Wechat.RewardedVideoAdOffCloseCallback): void;
  /** 直接调用当前官方对象的 offClose，不使用通用 API 转发。 */
  offClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offClose !== 'function') throw new Error('微信渠道能力不可用：offClose');
    return (this.runtime.offClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offError，保留官方参数与回调合同。 */
  offError(listener?: Wechat.GridAdOffErrorCallback): void;
  /** 直接调用当前官方对象的 offError，不使用通用 API 转发。 */
  offError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offError !== 'function') throw new Error('微信渠道能力不可用：offError');
    return (this.runtime.offError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offLoad，保留官方参数与回调合同。 */
  offLoad(listener?: Wechat.OffLoadCallback): void;
  /** 直接调用当前官方对象的 offLoad，不使用通用 API 转发。 */
  offLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offLoad !== 'function') throw new Error('微信渠道能力不可用：offLoad');
    return (this.runtime.offLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onClose，保留官方参数与回调合同。 */
  onClose(listener: Wechat.RewardedVideoAdOnCloseCallback): void;
  /** 直接调用当前官方对象的 onClose，不使用通用 API 转发。 */
  onClose(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onClose !== 'function') throw new Error('微信渠道能力不可用：onClose');
    return (this.runtime.onClose as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onError，保留官方参数与回调合同。 */
  onError(listener: Wechat.GridAdOnErrorCallback): void;
  /** 直接调用当前官方对象的 onError，不使用通用 API 转发。 */
  onError(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onError !== 'function') throw new Error('微信渠道能力不可用：onError');
    return (this.runtime.onError as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onLoad，保留官方参数与回调合同。 */
  onLoad(listener: Wechat.OnLoadCallback): void;
  /** 直接调用当前官方对象的 onLoad，不使用通用 API 转发。 */
  onLoad(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onLoad !== 'function') throw new Error('微信渠道能力不可用：onLoad');
    return (this.runtime.onLoad as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信UserInfoButton平台对象的具体具名实现。 */
export class WechatUserInfoButtonApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.UserInfoButton, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.OptionStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.OptionStyle) { this.assertReady(); this.runtime.style = value; }
  /** 读取平台对象公开的 type 属性。 */
  get type(): 'text' | 'image' { this.assertReady(); return this.runtime.type; }
  /** 更新平台对象公开可写的 type 属性。 */
  set type(value: 'text' | 'image') { this.assertReady(); this.runtime.type = value; }
  /** 读取平台对象公开的 image 属性。 */
  get image(): string | undefined { this.assertReady(); return this.runtime.image; }
  /** 更新平台对象公开可写的 image 属性。 */
  set image(value: string | undefined) { this.assertReady(); this.runtime.image = value; }
  /** 读取平台对象公开的 text 属性。 */
  get text(): string | undefined { this.assertReady(); return this.runtime.text; }
  /** 更新平台对象公开可写的 text 属性。 */
  set text(value: string | undefined) { this.assertReady(); this.runtime.text = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offTap，保留官方参数与回调合同。 */
  offTap(listener?: Wechat.UserInfoButtonOffTapCallback): void;
  /** 直接调用当前官方对象的 offTap，不使用通用 API 转发。 */
  offTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offTap !== 'function') throw new Error('微信渠道能力不可用：offTap');
    return (this.runtime.offTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onTap，保留官方参数与回调合同。 */
  onTap(listener: Wechat.UserInfoButtonOnTapCallback): void;
  /** 直接调用当前官方对象的 onTap，不使用通用 API 转发。 */
  onTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onTap !== 'function') throw new Error('微信渠道能力不可用：onTap');
    return (this.runtime.onTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): void;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信FeedbackButton平台对象的具体具名实现。 */
export class WechatFeedbackButtonApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.FeedbackButton, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.OptionStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.OptionStyle) { this.assertReady(); this.runtime.style = value; }
  /** 读取平台对象公开的 type 属性。 */
  get type(): 'text' | 'image' { this.assertReady(); return this.runtime.type; }
  /** 更新平台对象公开可写的 type 属性。 */
  set type(value: 'text' | 'image') { this.assertReady(); this.runtime.type = value; }
  /** 读取平台对象公开的 image 属性。 */
  get image(): string | undefined { this.assertReady(); return this.runtime.image; }
  /** 更新平台对象公开可写的 image 属性。 */
  set image(value: string | undefined) { this.assertReady(); this.runtime.image = value; }
  /** 读取平台对象公开的 text 属性。 */
  get text(): string | undefined { this.assertReady(); return this.runtime.text; }
  /** 更新平台对象公开可写的 text 属性。 */
  set text(value: string | undefined) { this.assertReady(); this.runtime.text = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offTap，保留官方参数与回调合同。 */
  offTap(listener?: Wechat.GameClubButtonOffTapCallback): void;
  /** 直接调用当前官方对象的 offTap，不使用通用 API 转发。 */
  offTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offTap !== 'function') throw new Error('微信渠道能力不可用：offTap');
    return (this.runtime.offTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onTap，保留官方参数与回调合同。 */
  onTap(listener: Wechat.GameClubButtonOnTapCallback): void;
  /** 直接调用当前官方对象的 onTap，不使用通用 API 转发。 */
  onTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onTap !== 'function') throw new Error('微信渠道能力不可用：onTap');
    return (this.runtime.onTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): void;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信GameClubButton平台对象的具体具名实现。 */
export class WechatGameClubButtonApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.GameClubButton, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 icon 属性。 */
  get icon(): 'green' | 'white' | 'dark' | 'light' { this.assertReady(); return this.runtime.icon; }
  /** 更新平台对象公开可写的 icon 属性。 */
  set icon(value: 'green' | 'white' | 'dark' | 'light') { this.assertReady(); this.runtime.icon = value; }
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.OptionStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.OptionStyle) { this.assertReady(); this.runtime.style = value; }
  /** 读取平台对象公开的 type 属性。 */
  get type(): 'text' | 'image' { this.assertReady(); return this.runtime.type; }
  /** 更新平台对象公开可写的 type 属性。 */
  set type(value: 'text' | 'image') { this.assertReady(); this.runtime.type = value; }
  /** 读取平台对象公开的 image 属性。 */
  get image(): string | undefined { this.assertReady(); return this.runtime.image; }
  /** 更新平台对象公开可写的 image 属性。 */
  set image(value: string | undefined) { this.assertReady(); this.runtime.image = value; }
  /** 读取平台对象公开的 text 属性。 */
  get text(): string | undefined { this.assertReady(); return this.runtime.text; }
  /** 更新平台对象公开可写的 text 属性。 */
  set text(value: string | undefined) { this.assertReady(); this.runtime.text = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offTap，保留官方参数与回调合同。 */
  offTap(listener?: Wechat.GameClubButtonOffTapCallback): void;
  /** 直接调用当前官方对象的 offTap，不使用通用 API 转发。 */
  offTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offTap !== 'function') throw new Error('微信渠道能力不可用：offTap');
    return (this.runtime.offTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onTap，保留官方参数与回调合同。 */
  onTap(listener: Wechat.GameClubButtonOnTapCallback): void;
  /** 直接调用当前官方对象的 onTap，不使用通用 API 转发。 */
  onTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onTap !== 'function') throw new Error('微信渠道能力不可用：onTap');
    return (this.runtime.onTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): void;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信OpenSettingButton平台对象的具体具名实现。 */
export class WechatOpenSettingButtonApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.OpenSettingButton, protected readonly assertReady: () => void) {}
  /** 读取平台对象公开的 style 属性。 */
  get style(): Wechat.OptionStyle { this.assertReady(); return this.runtime.style; }
  /** 更新平台对象公开可写的 style 属性。 */
  set style(value: Wechat.OptionStyle) { this.assertReady(); this.runtime.style = value; }
  /** 读取平台对象公开的 type 属性。 */
  get type(): 'text' | 'image' { this.assertReady(); return this.runtime.type; }
  /** 更新平台对象公开可写的 type 属性。 */
  set type(value: 'text' | 'image') { this.assertReady(); this.runtime.type = value; }
  /** 读取平台对象公开的 image 属性。 */
  get image(): string | undefined { this.assertReady(); return this.runtime.image; }
  /** 更新平台对象公开可写的 image 属性。 */
  set image(value: string | undefined) { this.assertReady(); this.runtime.image = value; }
  /** 读取平台对象公开的 text 属性。 */
  get text(): string | undefined { this.assertReady(); return this.runtime.text; }
  /** 更新平台对象公开可写的 text 属性。 */
  set text(value: string | undefined) { this.assertReady(); this.runtime.text = value; }
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 hide，保留官方参数与回调合同。 */
  hide(): void;
  /** 直接调用当前官方对象的 hide，不使用通用 API 转发。 */
  hide(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.hide !== 'function') throw new Error('微信渠道能力不可用：hide');
    return (this.runtime.hide as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offTap，保留官方参数与回调合同。 */
  offTap(listener?: Wechat.GameClubButtonOffTapCallback): void;
  /** 直接调用当前官方对象的 offTap，不使用通用 API 转发。 */
  offTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offTap !== 'function') throw new Error('微信渠道能力不可用：offTap');
    return (this.runtime.offTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onTap，保留官方参数与回调合同。 */
  onTap(listener: Wechat.GameClubButtonOnTapCallback): void;
  /** 直接调用当前官方对象的 onTap，不使用通用 API 转发。 */
  onTap(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onTap !== 'function') throw new Error('微信渠道能力不可用：onTap');
    return (this.runtime.onTap as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(): void;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信StoreGift平台对象的具体具名实现。 */
export class WechatStoreGiftApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.StoreGift, protected readonly assertReady: () => void) {}
  /** 调用微信平台 getOrderInfo，保留官方参数与回调合同。 */
  getOrderInfo(): Promise<Wechat.OrderInfo>;
  /** 直接调用当前官方对象的 getOrderInfo，不使用通用 API 转发。 */
  getOrderInfo(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getOrderInfo !== 'function') throw new Error('微信渠道能力不可用：getOrderInfo');
    return (this.runtime.getOrderInfo as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 open，保留官方参数与回调合同。 */
  open(): Promise<Wechat.IAnyObject>;
  /** 直接调用当前官方对象的 open，不使用通用 API 转发。 */
  open(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.open !== 'function') throw new Error('微信渠道能力不可用：open');
    return (this.runtime.open as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 isSupported，保留官方参数与回调合同。 */
  isSupported(): boolean;
  /** 直接调用当前官方对象的 isSupported，不使用通用 API 转发。 */
  isSupported(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.isSupported !== 'function') throw new Error('微信渠道能力不可用：isSupported');
    return (this.runtime.isSupported as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信RankManager平台对象的具体具名实现。 */
export class WechatRankManagerApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.RankManager, protected readonly assertReady: () => void) {}
  /** 调用微信平台 abort，保留官方参数与回调合同。 */
  abort(params?: Wechat.AbortParams): void;
  /** 直接调用当前官方对象的 abort，不使用通用 API 转发。 */
  abort(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.abort !== 'function') throw new Error('微信渠道能力不可用：abort');
    return (this.runtime.abort as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 createChallenge，保留官方参数与回调合同。 */
  createChallenge(params: Wechat.CreateChallengeParams): void;
  /** 直接调用当前官方对象的 createChallenge，不使用通用 API 转发。 */
  createChallenge(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.createChallenge !== 'function') throw new Error('微信渠道能力不可用：createChallenge');
    return (this.runtime.createChallenge as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 getScore，保留官方参数与回调合同。 */
  getScore(params: Wechat.GetScoreParams): void;
  /** 直接调用当前官方对象的 getScore，不使用通用 API 转发。 */
  getScore(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.getScore !== 'function') throw new Error('微信渠道能力不可用：getScore');
    return (this.runtime.getScore as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 middleUpdate，保留官方参数与回调合同。 */
  middleUpdate(params: Wechat.MiddleUpdateParams): void;
  /** 直接调用当前官方对象的 middleUpdate，不使用通用 API 转发。 */
  middleUpdate(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.middleUpdate !== 'function') throw new Error('微信渠道能力不可用：middleUpdate');
    return (this.runtime.middleUpdate as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 offChallengeStart，保留官方参数与回调合同。 */
  offChallengeStart(callback?: Wechat.ChallengeStartCallback): void;
  /** 直接调用当前官方对象的 offChallengeStart，不使用通用 API 转发。 */
  offChallengeStart(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.offChallengeStart !== 'function') throw new Error('微信渠道能力不可用：offChallengeStart');
    return (this.runtime.offChallengeStart as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 onChallengeStart，保留官方参数与回调合同。 */
  onChallengeStart(callback: Wechat.ChallengeStartCallback): void;
  /** 直接调用当前官方对象的 onChallengeStart，不使用通用 API 转发。 */
  onChallengeStart(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.onChallengeStart !== 'function') throw new Error('微信渠道能力不可用：onChallengeStart');
    return (this.runtime.onChallengeStart as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 update，保留官方参数与回调合同。 */
  update(params: Wechat.UpdateParams): void;
  /** 直接调用当前官方对象的 update，不使用通用 API 转发。 */
  update(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.update !== 'function') throw new Error('微信渠道能力不可用：update');
    return (this.runtime.update as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信OpenDataContext平台对象的具体具名实现。 */
export class WechatOpenDataContextApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.OpenDataContext, protected readonly assertReady: () => void) {}
  /** 调用微信平台 postMessage，保留官方参数与回调合同。 */
  postMessage(message: Wechat.IAnyObject): void;
  /** 直接调用当前官方对象的 postMessage，不使用通用 API 转发。 */
  postMessage(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.postMessage !== 'function') throw new Error('微信渠道能力不可用：postMessage');
    return (this.runtime.postMessage as unknown as (...args: unknown[]) => unknown)(...args);
  }
}

/** 微信PageManager平台对象的具体具名实现。 */
export class WechatPageManagerApi {
  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */
  constructor(protected readonly runtime: Wechat.PageManager, protected readonly assertReady: () => void) {}
  /** 调用微信平台 destroy，保留官方参数与回调合同。 */
  destroy(): void;
  /** 直接调用当前官方对象的 destroy，不使用通用 API 转发。 */
  destroy(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.destroy !== 'function') throw new Error('微信渠道能力不可用：destroy');
    return (this.runtime.destroy as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 off，保留官方参数与回调合同。 */
  off(eventName: string, callback?: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 off，不使用通用 API 转发。 */
  off(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.off !== 'function') throw new Error('微信渠道能力不可用：off');
    return (this.runtime.off as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 on，保留官方参数与回调合同。 */
  on(eventName: string, callback: (...args: any[]) => any): void;
  /** 直接调用当前官方对象的 on，不使用通用 API 转发。 */
  on(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.on !== 'function') throw new Error('微信渠道能力不可用：on');
    return (this.runtime.on as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 load，保留官方参数与回调合同。 */
  load(option: Wechat.LoadOption): Promise<any>;
  /** 直接调用当前官方对象的 load，不使用通用 API 转发。 */
  load(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.load !== 'function') throw new Error('微信渠道能力不可用：load');
    return (this.runtime.load as unknown as (...args: unknown[]) => unknown)(...args);
  }
  /** 调用微信平台 show，保留官方参数与回调合同。 */
  show(option?: Wechat.ShowOption): Promise<any>;
  /** 直接调用当前官方对象的 show，不使用通用 API 转发。 */
  show(...args: unknown[]): unknown {
    this.assertReady();
    if (typeof this.runtime.show !== 'function') throw new Error('微信渠道能力不可用：show');
    return (this.runtime.show as unknown as (...args: unknown[]) => unknown)(...args);
  }
}
