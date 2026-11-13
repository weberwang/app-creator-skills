// 此文件由 UnitySdkBindings 根据官方 SDK 源生成；不要手工修改。
#if APP_CREATOR_CRAZYGAMES_SDK
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using CrazyGames;
namespace AppCreator.ChannelSdk
{
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.User 的官方公开方法。</summary>
    public sealed partial class CrazyGamesUserSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesUserSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>读取官方渠道属性 IsUserAccountAvailable。</summary>
        public bool IsUserAccountAvailable { get { ensureReady(); return global::CrazyGames.CrazySDK.User.IsUserAccountAvailable; } }
        /// <summary>调用官方 AddAuthListener，保留其原始参数、返回和回调语义。</summary>
        public void AddAuthListener(Action<PortalUser> listener) { ensureReady(); global::CrazyGames.CrazySDK.User.AddAuthListener(listener); }
        /// <summary>调用官方 AddScore，保留其原始参数、返回和回调语义。</summary>
        public void AddScore(float score) { ensureReady(); global::CrazyGames.CrazySDK.User.AddScore(score); }
        /// <summary>调用官方 GetUser，保留其原始参数、返回和回调语义。</summary>
        public void GetUser(Action<PortalUser> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.GetUser(callback); }
        /// <summary>调用官方 GetUserAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<PortalUser> GetUserAsync() { ensureReady(); return global::CrazyGames.CrazySDK.User.GetUserAsync(); }
        /// <summary>调用官方 GetUserToken，保留其原始参数、返回和回调语义。</summary>
        public void GetUserToken(Action<SdkError, string> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.GetUserToken(callback); }
        /// <summary>调用官方 GetUserToken，保留其原始参数、返回和回调语义。</summary>
        public void GetUserToken(InGameAuthSigningKeyType signingKeyType, Action<SdkError, string> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.GetUserToken(signingKeyType, callback); }
        /// <summary>调用官方 GetUserTokenAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<string> GetUserTokenAsync() { ensureReady(); return global::CrazyGames.CrazySDK.User.GetUserTokenAsync(); }
        /// <summary>调用官方 GetUserTokenAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<string> GetUserTokenAsync(InGameAuthSigningKeyType signingKeyType) { ensureReady(); return global::CrazyGames.CrazySDK.User.GetUserTokenAsync(signingKeyType); }
        /// <summary>调用官方 GetXsollaUserToken，保留其原始参数、返回和回调语义。</summary>
        public void GetXsollaUserToken(Action<SdkError, string> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.GetXsollaUserToken(callback); }
        /// <summary>调用官方 GetXsollaUserTokenAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<string> GetXsollaUserTokenAsync() { ensureReady(); return global::CrazyGames.CrazySDK.User.GetXsollaUserTokenAsync(); }
        /// <summary>调用官方 ListFriends，保留其原始参数、返回和回调语义。</summary>
        public void ListFriends(int page, int size, Action<SdkError, FriendsPage> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.ListFriends(page, size, callback); }
        /// <summary>调用官方 ListFriendsAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<FriendsPage> ListFriendsAsync(int page, int size) { ensureReady(); return global::CrazyGames.CrazySDK.User.ListFriendsAsync(page, size); }
        /// <summary>调用官方 RemoveAuthListener，保留其原始参数、返回和回调语义。</summary>
        public void RemoveAuthListener(Action<PortalUser> listener) { ensureReady(); global::CrazyGames.CrazySDK.User.RemoveAuthListener(listener); }
        /// <summary>调用官方 ShowAccountLinkPrompt，保留其原始参数、返回和回调语义。</summary>
        public void ShowAccountLinkPrompt(Action<SdkError, bool> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.ShowAccountLinkPrompt(callback); }
        /// <summary>调用官方 ShowAccountLinkPromptAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<bool> ShowAccountLinkPromptAsync() { ensureReady(); return global::CrazyGames.CrazySDK.User.ShowAccountLinkPromptAsync(); }
        /// <summary>调用官方 ShowAuthPrompt，保留其原始参数、返回和回调语义。</summary>
        public void ShowAuthPrompt(Action<SdkError, PortalUser> callback) { ensureReady(); global::CrazyGames.CrazySDK.User.ShowAuthPrompt(callback); }
        /// <summary>调用官方 ShowAuthPromptAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<PortalUser> ShowAuthPromptAsync() { ensureReady(); return global::CrazyGames.CrazySDK.User.ShowAuthPromptAsync(); }
        /// <summary>调用官方 SubmitScore，保留其原始参数、返回和回调语义。</summary>
        public void SubmitScore(string encryptedScore) { ensureReady(); global::CrazyGames.CrazySDK.User.SubmitScore(encryptedScore); }
        /// <summary>调用官方 SubmitScore，保留其原始参数、返回和回调语义。</summary>
        public void SubmitScore(string encryptedScore, double score) { ensureReady(); global::CrazyGames.CrazySDK.User.SubmitScore(encryptedScore, score); }
        /// <summary>调用官方 SubmitScore，保留其原始参数、返回和回调语义。</summary>
        public void SubmitScore(string encryptedScore, float score) { ensureReady(); global::CrazyGames.CrazySDK.User.SubmitScore(encryptedScore, score); }
        /// <summary>调用官方 SubmitScore，保留其原始参数、返回和回调语义。</summary>
        public void SubmitScore(string encryptedScore, long score) { ensureReady(); global::CrazyGames.CrazySDK.User.SubmitScore(encryptedScore, score); }
        /// <summary>调用官方 SyncUnityGameData，保留其原始参数、返回和回调语义。</summary>
        public void SyncUnityGameData() { ensureReady(); global::CrazyGames.CrazySDK.User.SyncUnityGameData(); }
    }
}
#endif
