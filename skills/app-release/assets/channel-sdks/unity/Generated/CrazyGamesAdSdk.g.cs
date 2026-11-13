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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Ad 的官方公开方法。</summary>
    public sealed partial class CrazyGamesAdSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesAdSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>读取官方渠道属性 AdblockStatus。</summary>
        public AdblockStatus AdblockStatus { get { ensureReady(); return global::CrazyGames.CrazySDK.Ad.AdblockStatus; } }
        /// <summary>调用官方 HasAdblock，保留其原始参数、返回和回调语义。</summary>
        public void HasAdblock(Action<bool> callback) { ensureReady(); global::CrazyGames.CrazySDK.Ad.HasAdblock(callback); }
        /// <summary>调用官方 HasAdblockAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<bool> HasAdblockAsync() { ensureReady(); return global::CrazyGames.CrazySDK.Ad.HasAdblockAsync(); }
        /// <summary>调用官方 RequestAd，保留其原始参数、返回和回调语义。</summary>
        public void RequestAd(CrazyAdType adType, Action adStarted, Action<SdkError> adError, Action adFinished) { ensureReady(); global::CrazyGames.CrazySDK.Ad.RequestAd(adType, adStarted, adError, adFinished); }
    }
}
#endif
