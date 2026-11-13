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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Analytics 的官方公开方法。</summary>
    public sealed partial class CrazyGamesAnalyticsSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesAnalyticsSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>调用官方 TrackOrder，保留其原始参数、返回和回调语义。</summary>
        public void TrackOrder(PaymentProvider provider, object order) { ensureReady(); global::CrazyGames.CrazySDK.Analytics.TrackOrder(provider, order); }
    }
}
#endif
