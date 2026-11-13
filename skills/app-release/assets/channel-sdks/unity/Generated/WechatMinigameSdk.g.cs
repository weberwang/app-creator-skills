// 此文件由 UnitySdkBindings 根据官方 SDK 源生成；不要手工修改。
#if APP_CREATOR_WECHAT_SDK
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using WeChatWASM;
namespace AppCreator.ChannelSdk
{
    /// <summary>逐项封装 global::WeChatWASM.WX 的官方公开方法。</summary>
    public sealed partial class WechatMinigameSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal WechatMinigameSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>调用官方 AddCard，保留其原始参数、返回和回调语义。</summary>
        public void AddCard(AddCardOption callback) { ensureReady(); global::WeChatWASM.WX.AddCard(callback); }
        /// <summary>调用官方 AuthPrivateMessage，保留其原始参数、返回和回调语义。</summary>
        public void AuthPrivateMessage(AuthPrivateMessageOption callback) { ensureReady(); global::WeChatWASM.WX.AuthPrivateMessage(callback); }
        /// <summary>调用官方 Authorize，保留其原始参数、返回和回调语义。</summary>
        public void Authorize(AuthorizeOption callback) { ensureReady(); global::WeChatWASM.WX.Authorize(callback); }
        /// <summary>调用官方 CheckIsAddedToMyMiniProgram，保留其原始参数、返回和回调语义。</summary>
        public void CheckIsAddedToMyMiniProgram(CheckIsAddedToMyMiniProgramOption callback) { ensureReady(); global::WeChatWASM.WX.CheckIsAddedToMyMiniProgram(callback); }
        /// <summary>调用官方 CheckIsSupportFacialRecognition，保留其原始参数、返回和回调语义。</summary>
        public void CheckIsSupportFacialRecognition(CheckIsSupportFacialRecognitionOption callback) { ensureReady(); global::WeChatWASM.WX.CheckIsSupportFacialRecognition(callback); }
        /// <summary>调用官方 CheckIsSupportMidasPayment，保留其原始参数、返回和回调语义。</summary>
        public void CheckIsSupportMidasPayment(CheckIsSupportMidasPaymentOption callback) { ensureReady(); global::WeChatWASM.WX.CheckIsSupportMidasPayment(callback); }
        /// <summary>调用官方 CheckSession，保留其原始参数、返回和回调语义。</summary>
        public void CheckSession(CheckSessionOption callback) { ensureReady(); global::WeChatWASM.WX.CheckSession(callback); }
        /// <summary>调用官方 CreateBannerAd，保留其原始参数、返回和回调语义。</summary>
        public WechatBannerAd CreateBannerAd(WXCreateBannerAdParam param) { ensureReady(); var value = global::WeChatWASM.WX.CreateBannerAd(param); return value == null ? null : new WechatBannerAd(value, ensureReady); }
        /// <summary>调用官方 CreateCustomAd，保留其原始参数、返回和回调语义。</summary>
        public WechatCustomAd CreateCustomAd(WXCreateCustomAdParam param) { ensureReady(); var value = global::WeChatWASM.WX.CreateCustomAd(param); return value == null ? null : new WechatCustomAd(value, ensureReady); }
        /// <summary>调用官方 CreateFeedbackButton，保留其原始参数、返回和回调语义。</summary>
        public WechatFeedbackButton CreateFeedbackButton(CreateOpenSettingButtonOption option) { ensureReady(); var value = global::WeChatWASM.WX.CreateFeedbackButton(option); return value == null ? null : new WechatFeedbackButton(value, ensureReady); }
        /// <summary>调用官方 CreateFixedBottomMiddleBannerAd，保留其原始参数、返回和回调语义。</summary>
        public WechatBannerAd CreateFixedBottomMiddleBannerAd(string adUnitId, int adIntervals, int height) { ensureReady(); var value = global::WeChatWASM.WX.CreateFixedBottomMiddleBannerAd(adUnitId, adIntervals, height); return value == null ? null : new WechatBannerAd(value, ensureReady); }
        /// <summary>调用官方 CreateGameClubButton，保留其原始参数、返回和回调语义。</summary>
        public WechatGameClubButton CreateGameClubButton(WXCreateGameClubButtonParam param) { ensureReady(); var value = global::WeChatWASM.WX.CreateGameClubButton(param); return value == null ? null : new WechatGameClubButton(value, ensureReady); }
        /// <summary>调用官方 CreateInterstitialAd，保留其原始参数、返回和回调语义。</summary>
        public WechatInterstitialAd CreateInterstitialAd(WXCreateInterstitialAdParam param) { ensureReady(); var value = global::WeChatWASM.WX.CreateInterstitialAd(param); return value == null ? null : new WechatInterstitialAd(value, ensureReady); }
        /// <summary>调用官方 CreatePageManager，保留其原始参数、返回和回调语义。</summary>
        public WechatPageManager CreatePageManager() { ensureReady(); var value = global::WeChatWASM.WX.CreatePageManager(); return value == null ? null : new WechatPageManager(value, ensureReady); }
        /// <summary>调用官方 CreateRewardedVideoAd，保留其原始参数、返回和回调语义。</summary>
        public WechatRewardedVideoAd CreateRewardedVideoAd(WXCreateRewardedVideoAdParam param) { ensureReady(); var value = global::WeChatWASM.WX.CreateRewardedVideoAd(param); return value == null ? null : new WechatRewardedVideoAd(value, ensureReady); }
        /// <summary>调用官方 CreateUserInfoButton，保留其原始参数、返回和回调语义。</summary>
        public WechatUserInfoButton CreateUserInfoButton(int x, int y, int width, int height, string lang, bool withCredentials) { ensureReady(); var value = global::WeChatWASM.WX.CreateUserInfoButton(x, y, width, height, lang, withCredentials); return value == null ? null : new WechatUserInfoButton(value, ensureReady); }
        /// <summary>调用官方 EnterChatToolMode，保留其原始参数、返回和回调语义。</summary>
        public void EnterChatToolMode(EnterChatToolModeOption callback) { ensureReady(); global::WeChatWASM.WX.EnterChatToolMode(callback); }
        /// <summary>调用官方 ExitChatTool，保留其原始参数、返回和回调语义。</summary>
        public void ExitChatTool(ExitChatToolOption callback) { ensureReady(); global::WeChatWASM.WX.ExitChatTool(callback); }
        /// <summary>调用官方 ExitMiniProgram，保留其原始参数、返回和回调语义。</summary>
        public void ExitMiniProgram(ExitMiniProgramOption callback) { ensureReady(); global::WeChatWASM.WX.ExitMiniProgram(callback); }
        /// <summary>调用官方 GetAccountInfoSync，保留其原始参数、返回和回调语义。</summary>
        public AccountInfo GetAccountInfoSync() { ensureReady(); return global::WeChatWASM.WX.GetAccountInfoSync(); }
        /// <summary>调用官方 GetChannelsLiveInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetChannelsLiveInfo(GetChannelsLiveInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetChannelsLiveInfo(callback); }
        /// <summary>调用官方 GetChannelsLiveNoticeInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetChannelsLiveNoticeInfo(GetChannelsLiveNoticeInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetChannelsLiveNoticeInfo(callback); }
        /// <summary>调用官方 GetChatToolInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetChatToolInfo(GetChatToolInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetChatToolInfo(callback); }
        /// <summary>调用官方 GetDirectAdStatusSync，保留其原始参数、返回和回调语义。</summary>
        public DirectAdStatusInfo GetDirectAdStatusSync() { ensureReady(); return global::WeChatWASM.WX.GetDirectAdStatusSync(); }
        /// <summary>调用官方 GetEnterOptionsSync，保留其原始参数、返回和回调语义。</summary>
        public EnterOptionsGame GetEnterOptionsSync() { ensureReady(); return global::WeChatWASM.WX.GetEnterOptionsSync(); }
        /// <summary>调用官方 GetExptInfoSync，保留其原始参数、返回和回调语义。</summary>
        public Dictionary<string, string> GetExptInfoSync(string[] keys) { ensureReady(); return global::WeChatWASM.WX.GetExptInfoSync(keys); }
        /// <summary>调用官方 GetGameClubData，保留其原始参数、返回和回调语义。</summary>
        public void GetGameClubData(GetGameClubDataOption callback) { ensureReady(); global::WeChatWASM.WX.GetGameClubData(callback); }
        /// <summary>调用官方 GetGameExptInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetGameExptInfo(GetGameExptInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetGameExptInfo(callback); }
        /// <summary>调用官方 GetGroupEnterInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetGroupEnterInfo(GetGroupEnterInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetGroupEnterInfo(callback); }
        /// <summary>调用官方 GetGroupMembersInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetGroupMembersInfo(GetGroupMembersInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetGroupMembersInfo(callback); }
        /// <summary>调用官方 GetLaunchOperaHandler，保留其原始参数、返回和回调语义。</summary>
        public WechatLaunchOpera GetLaunchOperaHandler() { ensureReady(); var value = global::WeChatWASM.WX.GetLaunchOperaHandler(); return value == null ? null : new WechatLaunchOpera(value, ensureReady); }
        /// <summary>调用官方 GetLaunchOptionsSync，保留其原始参数、返回和回调语义。</summary>
        public LaunchOptionsGame GetLaunchOptionsSync() { ensureReady(); return global::WeChatWASM.WX.GetLaunchOptionsSync(); }
        /// <summary>调用官方 GetOpenDataContext，保留其原始参数、返回和回调语义。</summary>
        public WechatOpenDataContext GetOpenDataContext(OpenDataContextOption option = null) { ensureReady(); var value = global::WeChatWASM.WX.GetOpenDataContext(option); return value == null ? null : new WechatOpenDataContext(value, ensureReady); }
        /// <summary>调用官方 GetPhoneNumber，保留其原始参数、返回和回调语义。</summary>
        public void GetPhoneNumber(GetPhoneNumberOption callback) { ensureReady(); global::WeChatWASM.WX.GetPhoneNumber(callback); }
        /// <summary>调用官方 GetPrivacySetting，保留其原始参数、返回和回调语义。</summary>
        public void GetPrivacySetting(GetPrivacySettingOption callback) { ensureReady(); global::WeChatWASM.WX.GetPrivacySetting(callback); }
        /// <summary>调用官方 GetRankManager，保留其原始参数、返回和回调语义。</summary>
        public WechatRankManager GetRankManager() { ensureReady(); var value = global::WeChatWASM.WX.GetRankManager(); return value == null ? null : new WechatRankManager(value, ensureReady); }
        /// <summary>调用官方 GetSetting，保留其原始参数、返回和回调语义。</summary>
        public void GetSetting(GetSettingOption callback) { ensureReady(); global::WeChatWASM.WX.GetSetting(callback); }
        /// <summary>调用官方 GetShareInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetShareInfo(GetShareInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetShareInfo(callback); }
        /// <summary>调用官方 GetShowSplashAdStatus，保留其原始参数、返回和回调语义。</summary>
        public void GetShowSplashAdStatus(GetShowSplashAdStatusOption callback) { ensureReady(); global::WeChatWASM.WX.GetShowSplashAdStatus(callback); }
        /// <summary>调用官方 GetUserInfo，保留其原始参数、返回和回调语义。</summary>
        public void GetUserInfo(GetUserInfoOption callback) { ensureReady(); global::WeChatWASM.WX.GetUserInfo(callback); }
        /// <summary>调用官方 GetUserInteractiveStorage，保留其原始参数、返回和回调语义。</summary>
        public void GetUserInteractiveStorage(GetUserInteractiveStorageOption callback) { ensureReady(); global::WeChatWASM.WX.GetUserInteractiveStorage(callback); }
        /// <summary>调用官方 GetWeRunData，保留其原始参数、返回和回调语义。</summary>
        public void GetWeRunData(GetWeRunDataOption callback) { ensureReady(); global::WeChatWASM.WX.GetWeRunData(callback); }
        /// <summary>调用官方 HideShareMenu，保留其原始参数、返回和回调语义。</summary>
        public void HideShareMenu(HideShareMenuOption callback) { ensureReady(); global::WeChatWASM.WX.HideShareMenu(callback); }
        /// <summary>调用官方 IsChatTool，保留其原始参数、返回和回调语义。</summary>
        public void IsChatTool() { ensureReady(); global::WeChatWASM.WX.IsChatTool(); }
        /// <summary>调用官方 Login，保留其原始参数、返回和回调语义。</summary>
        public void Login(LoginOption callback) { ensureReady(); global::WeChatWASM.WX.Login(callback); }
        /// <summary>调用官方 NotifyGroupMembers，保留其原始参数、返回和回调语义。</summary>
        public void NotifyGroupMembers(NotifyGroupMembersOption callback) { ensureReady(); global::WeChatWASM.WX.NotifyGroupMembers(callback); }
        /// <summary>调用官方 OffAddToFavorites，保留其原始参数、返回和回调语义。</summary>
        public void OffAddToFavorites(Action<Action<OnAddToFavoritesListenerResult>> callback = null) { ensureReady(); global::WeChatWASM.WX.OffAddToFavorites(callback); }
        /// <summary>调用官方 OffCopyUrl，保留其原始参数、返回和回调语义。</summary>
        public void OffCopyUrl(Action<Action<OnCopyUrlListenerResult>> callback = null) { ensureReady(); global::WeChatWASM.WX.OffCopyUrl(callback); }
        /// <summary>调用官方 OffDirectAdStatusChange，保留其原始参数、返回和回调语义。</summary>
        public void OffDirectAdStatusChange(Action<OnDirectAdStatusChangeListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OffDirectAdStatusChange(result); }
        /// <summary>调用官方 OffHandoff，保留其原始参数、返回和回调语义。</summary>
        public void OffHandoff(Action<Action<OnHandoffListenerResult>> callback = null) { ensureReady(); global::WeChatWASM.WX.OffHandoff(callback); }
        /// <summary>调用官方 OffHide，保留其原始参数、返回和回调语义。</summary>
        public void OffHide(Action<GeneralCallbackResult> res) { ensureReady(); global::WeChatWASM.WX.OffHide(res); }
        /// <summary>调用官方 OffInteractiveStorageModified，保留其原始参数、返回和回调语义。</summary>
        public void OffInteractiveStorageModified(Action<string> res) { ensureReady(); global::WeChatWASM.WX.OffInteractiveStorageModified(res); }
        /// <summary>调用官方 OffShareMessageToFriend，保留其原始参数、返回和回调语义。</summary>
        public void OffShareMessageToFriend(Action<OnShareMessageToFriendListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OffShareMessageToFriend(result); }
        /// <summary>调用官方 OffShareTimeline，保留其原始参数、返回和回调语义。</summary>
        public void OffShareTimeline(Action<Action<OnShareTimelineListenerResult>> callback = null) { ensureReady(); global::WeChatWASM.WX.OffShareTimeline(callback); }
        /// <summary>调用官方 OffShow，保留其原始参数、返回和回调语义。</summary>
        public void OffShow(Action<OnShowListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OffShow(result); }
        /// <summary>调用官方 OnAddToFavorites，保留其原始参数、返回和回调语义。</summary>
        public void OnAddToFavorites(Action<Action<OnAddToFavoritesListenerResult>> callback) { ensureReady(); global::WeChatWASM.WX.OnAddToFavorites(callback); }
        /// <summary>调用官方 OnCopyUrl，保留其原始参数、返回和回调语义。</summary>
        public void OnCopyUrl(Action<Action<OnCopyUrlListenerResult>> callback) { ensureReady(); global::WeChatWASM.WX.OnCopyUrl(callback); }
        /// <summary>调用官方 OnDirectAdStatusChange，保留其原始参数、返回和回调语义。</summary>
        public void OnDirectAdStatusChange(Action<OnDirectAdStatusChangeListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OnDirectAdStatusChange(result); }
        /// <summary>调用官方 OnHandoff，保留其原始参数、返回和回调语义。</summary>
        public void OnHandoff(Action<Action<OnHandoffListenerResult>> callback) { ensureReady(); global::WeChatWASM.WX.OnHandoff(callback); }
        /// <summary>调用官方 OnHide，保留其原始参数、返回和回调语义。</summary>
        public void OnHide(Action<GeneralCallbackResult> res) { ensureReady(); global::WeChatWASM.WX.OnHide(res); }
        /// <summary>调用官方 OnInteractiveStorageModified，保留其原始参数、返回和回调语义。</summary>
        public void OnInteractiveStorageModified(Action<string> res) { ensureReady(); global::WeChatWASM.WX.OnInteractiveStorageModified(res); }
        /// <summary>调用官方 OnLaunchProgress，保留其原始参数、返回和回调语义。</summary>
        public void OnLaunchProgress(Action<LaunchEvent> action = null) { ensureReady(); global::WeChatWASM.WX.OnLaunchProgress(action); }
        /// <summary>调用官方 OnMessage，保留其原始参数、返回和回调语义。</summary>
        public void OnMessage(Action<string> res) { ensureReady(); global::WeChatWASM.WX.OnMessage(res); }
        /// <summary>调用官方 OnNeedPrivacyAuthorization，保留其原始参数、返回和回调语义。</summary>
        public void OnNeedPrivacyAuthorization(Action<string> res) { ensureReady(); global::WeChatWASM.WX.OnNeedPrivacyAuthorization(res); }
        /// <summary>调用官方 OnShareAppMessage，保留其原始参数、返回和回调语义。</summary>
        public void OnShareAppMessage(WXShareAppMessageParam defaultParam, Action<Action<WXShareAppMessageParam>> action = null) { ensureReady(); global::WeChatWASM.WX.OnShareAppMessage(defaultParam, action); }
        /// <summary>调用官方 OnShareMessageToFriend，保留其原始参数、返回和回调语义。</summary>
        public void OnShareMessageToFriend(Action<OnShareMessageToFriendListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OnShareMessageToFriend(result); }
        /// <summary>调用官方 OnShareTimeline，保留其原始参数、返回和回调语义。</summary>
        public void OnShareTimeline(Action<Action<OnShareTimelineListenerResult>> callback) { ensureReady(); global::WeChatWASM.WX.OnShareTimeline(callback); }
        /// <summary>调用官方 OnShow，保留其原始参数、返回和回调语义。</summary>
        public void OnShow(Action<OnShowListenerResult> result) { ensureReady(); global::WeChatWASM.WX.OnShow(result); }
        /// <summary>调用官方 OpenCard，保留其原始参数、返回和回调语义。</summary>
        public void OpenCard(OpenCardOption callback) { ensureReady(); global::WeChatWASM.WX.OpenCard(callback); }
        /// <summary>调用官方 OpenChannelsActivity，保留其原始参数、返回和回调语义。</summary>
        public void OpenChannelsActivity(OpenChannelsActivityOption callback) { ensureReady(); global::WeChatWASM.WX.OpenChannelsActivity(callback); }
        /// <summary>调用官方 OpenChannelsEvent，保留其原始参数、返回和回调语义。</summary>
        public void OpenChannelsEvent(OpenChannelsEventOption callback) { ensureReady(); global::WeChatWASM.WX.OpenChannelsEvent(callback); }
        /// <summary>调用官方 OpenChannelsLive，保留其原始参数、返回和回调语义。</summary>
        public void OpenChannelsLive(OpenChannelsLiveOption callback) { ensureReady(); global::WeChatWASM.WX.OpenChannelsLive(callback); }
        /// <summary>调用官方 OpenChannelsUserProfile，保留其原始参数、返回和回调语义。</summary>
        public void OpenChannelsUserProfile(OpenChannelsUserProfileOption callback) { ensureReady(); global::WeChatWASM.WX.OpenChannelsUserProfile(callback); }
        /// <summary>调用官方 OpenChatTool，保留其原始参数、返回和回调语义。</summary>
        public void OpenChatTool(OpenChatToolOption callback) { ensureReady(); global::WeChatWASM.WX.OpenChatTool(callback); }
        /// <summary>调用官方 OpenCustomerServiceChat，保留其原始参数、返回和回调语义。</summary>
        public void OpenCustomerServiceChat(OpenCustomerServiceChatOption callback) { ensureReady(); global::WeChatWASM.WX.OpenCustomerServiceChat(callback); }
        /// <summary>调用官方 OpenCustomerServiceConversation，保留其原始参数、返回和回调语义。</summary>
        public void OpenCustomerServiceConversation(OpenCustomerServiceConversationOption callback) { ensureReady(); global::WeChatWASM.WX.OpenCustomerServiceConversation(callback); }
        /// <summary>调用官方 OpenPrivacyContract，保留其原始参数、返回和回调语义。</summary>
        public void OpenPrivacyContract(OpenPrivacyContractOption callback) { ensureReady(); global::WeChatWASM.WX.OpenPrivacyContract(callback); }
        /// <summary>调用官方 OpenSetting，保留其原始参数、返回和回调语义。</summary>
        public void OpenSetting(OpenSettingOption callback) { ensureReady(); global::WeChatWASM.WX.OpenSetting(callback); }
        /// <summary>调用官方 PrivacyAuthorizeResolve，保留其原始参数、返回和回调语义。</summary>
        public void PrivacyAuthorizeResolve(PrivacyAuthorizeResolveOption res) { ensureReady(); global::WeChatWASM.WX.PrivacyAuthorizeResolve(res); }
        /// <summary>调用官方 RemoveUserCloudStorage，保留其原始参数、返回和回调语义。</summary>
        public void RemoveUserCloudStorage(RemoveUserCloudStorageOption callback) { ensureReady(); global::WeChatWASM.WX.RemoveUserCloudStorage(callback); }
        /// <summary>调用官方 ReportEvent，保留其原始参数、返回和回调语义。</summary>
        public void ReportEvent(string eventId, Dictionary<string, string> data) { ensureReady(); global::WeChatWASM.WX.ReportEvent(eventId, data); }
        /// <summary>调用官方 ReportMonitor，保留其原始参数、返回和回调语义。</summary>
        public void ReportMonitor(string name, double value) { ensureReady(); global::WeChatWASM.WX.ReportMonitor(name, value); }
        /// <summary>调用官方 ReportScene，保留其原始参数、返回和回调语义。</summary>
        public void ReportScene(ReportSceneOption callback) { ensureReady(); global::WeChatWASM.WX.ReportScene(callback); }
        /// <summary>调用官方 ReportUserBehaviorBranchAnalytics，保留其原始参数、返回和回调语义。</summary>
        public void ReportUserBehaviorBranchAnalytics(ReportUserBehaviorBranchAnalyticsOption option) { ensureReady(); global::WeChatWASM.WX.ReportUserBehaviorBranchAnalytics(option); }
        /// <summary>调用官方 ReportUserBehaviorBranchAnalytics，保留其原始参数、返回和回调语义。</summary>
        public void ReportUserBehaviorBranchAnalytics(string branchId, string branchDim, int eventType) { ensureReady(); global::WeChatWASM.WX.ReportUserBehaviorBranchAnalytics(branchId, branchDim, eventType); }
        /// <summary>调用官方 RequestFacialRecognition，保留其原始参数、返回和回调语义。</summary>
        public void RequestFacialRecognition(RequestFacialRecognitionOption callback) { ensureReady(); global::WeChatWASM.WX.RequestFacialRecognition(callback); }
        /// <summary>调用官方 RequestFacialVerify，保留其原始参数、返回和回调语义。</summary>
        public void RequestFacialVerify(RequestFacialVerifyOption callback) { ensureReady(); global::WeChatWASM.WX.RequestFacialVerify(callback); }
        /// <summary>调用官方 RequestMidasFriendPayment，保留其原始参数、返回和回调语义。</summary>
        public void RequestMidasFriendPayment(RequestMidasFriendPaymentOption callback) { ensureReady(); global::WeChatWASM.WX.RequestMidasFriendPayment(callback); }
        /// <summary>调用官方 RequestMidasPayment，保留其原始参数、返回和回调语义。</summary>
        public void RequestMidasPayment(RequestMidasPaymentOption callback) { ensureReady(); global::WeChatWASM.WX.RequestMidasPayment(callback); }
        /// <summary>调用官方 RequestMidasPaymentGameItem，保留其原始参数、返回和回调语义。</summary>
        public void RequestMidasPaymentGameItem(RequestMidasPaymentGameItemOption callback) { ensureReady(); global::WeChatWASM.WX.RequestMidasPaymentGameItem(callback); }
        /// <summary>调用官方 RequestSubscribeMessage，保留其原始参数、返回和回调语义。</summary>
        public void RequestSubscribeMessage(RequestSubscribeMessageOption callback) { ensureReady(); global::WeChatWASM.WX.RequestSubscribeMessage(callback); }
        /// <summary>调用官方 RequestSubscribeSystemMessage，保留其原始参数、返回和回调语义。</summary>
        public void RequestSubscribeSystemMessage(RequestSubscribeSystemMessageOption callback) { ensureReady(); global::WeChatWASM.WX.RequestSubscribeSystemMessage(callback); }
        /// <summary>调用官方 RequestVirtualPayment，保留其原始参数、返回和回调语义。</summary>
        public void RequestVirtualPayment(RequestVirtualPaymentOption option) { ensureReady(); global::WeChatWASM.WX.RequestVirtualPayment(option); }
        /// <summary>调用官方 RequirePrivacyAuthorize，保留其原始参数、返回和回调语义。</summary>
        public void RequirePrivacyAuthorize(RequirePrivacyAuthorizeOption callback) { ensureReady(); global::WeChatWASM.WX.RequirePrivacyAuthorize(callback); }
        /// <summary>调用官方 ReserveChannelsLive，保留其原始参数、返回和回调语义。</summary>
        public void ReserveChannelsLive(ReserveChannelsLiveOption option) { ensureReady(); global::WeChatWASM.WX.ReserveChannelsLive(option); }
        /// <summary>调用官方 RestartMiniProgram，保留其原始参数、返回和回调语义。</summary>
        public void RestartMiniProgram(RestartMiniProgramOption callback) { ensureReady(); global::WeChatWASM.WX.RestartMiniProgram(callback); }
        /// <summary>调用官方 SelectGroupMembers，保留其原始参数、返回和回调语义。</summary>
        public void SelectGroupMembers(SelectGroupMembersOption callback) { ensureReady(); global::WeChatWASM.WX.SelectGroupMembers(callback); }
        /// <summary>调用官方 SetHandoffQuery，保留其原始参数、返回和回调语义。</summary>
        public bool SetHandoffQuery(string query) { ensureReady(); return global::WeChatWASM.WX.SetHandoffQuery(query); }
        /// <summary>调用官方 SetMessageToFriendQuery，保留其原始参数、返回和回调语义。</summary>
        public bool SetMessageToFriendQuery(SetMessageToFriendQueryOption option) { ensureReady(); return global::WeChatWASM.WX.SetMessageToFriendQuery(option); }
        /// <summary>调用官方 SetUserCloudStorage，保留其原始参数、返回和回调语义。</summary>
        public void SetUserCloudStorage(SetUserCloudStorageOption callback) { ensureReady(); global::WeChatWASM.WX.SetUserCloudStorage(callback); }
        /// <summary>调用官方 ShareAppMessage，保留其原始参数、返回和回调语义。</summary>
        public void ShareAppMessage(ShareAppMessageOption option) { ensureReady(); global::WeChatWASM.WX.ShareAppMessage(option); }
        /// <summary>调用官方 ShareAppMessageToGroup，保留其原始参数、返回和回调语义。</summary>
        public void ShareAppMessageToGroup(ShareAppMessageToGroupOption callback) { ensureReady(); global::WeChatWASM.WX.ShareAppMessageToGroup(callback); }
        /// <summary>调用官方 ShareEmojiToGroup，保留其原始参数、返回和回调语义。</summary>
        public void ShareEmojiToGroup(ShareEmojiToGroupOption callback) { ensureReady(); global::WeChatWASM.WX.ShareEmojiToGroup(callback); }
        /// <summary>调用官方 ShareImageToGroup，保留其原始参数、返回和回调语义。</summary>
        public void ShareImageToGroup(ShareImageToGroupOption callback) { ensureReady(); global::WeChatWASM.WX.ShareImageToGroup(callback); }
        /// <summary>调用官方 ShareTextToGroup，保留其原始参数、返回和回调语义。</summary>
        public void ShareTextToGroup(ShareTextToGroupOption callback) { ensureReady(); global::WeChatWASM.WX.ShareTextToGroup(callback); }
        /// <summary>调用官方 ShareVideoToGroup，保留其原始参数、返回和回调语义。</summary>
        public void ShareVideoToGroup(ShareVideoToGroupOption callback) { ensureReady(); global::WeChatWASM.WX.ShareVideoToGroup(callback); }
        /// <summary>调用官方 ShowShareImageMenu，保留其原始参数、返回和回调语义。</summary>
        public void ShowShareImageMenu(ShowShareImageMenuOption callback) { ensureReady(); global::WeChatWASM.WX.ShowShareImageMenu(callback); }
        /// <summary>调用官方 ShowShareMenu，保留其原始参数、返回和回调语义。</summary>
        public void ShowShareMenu(ShowShareMenuOption callback) { ensureReady(); global::WeChatWASM.WX.ShowShareMenu(callback); }
        /// <summary>调用官方 UpdateShareMenu，保留其原始参数、返回和回调语义。</summary>
        public void UpdateShareMenu(UpdateShareMenuOption callback) { ensureReady(); global::WeChatWASM.WX.UpdateShareMenu(callback); }
    }
}
#endif
