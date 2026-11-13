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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK 的官方公开方法。</summary>
    public sealed partial class CrazyGamesSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>取得 Ad 渠道能力。</summary>
        public CrazyGamesAdSdk Ad { get { ensureReady(); return new CrazyGamesAdSdk(ensureReady); } }
        /// <summary>取得 Analytics 渠道能力。</summary>
        public CrazyGamesAnalyticsSdk Analytics { get { ensureReady(); return new CrazyGamesAnalyticsSdk(ensureReady); } }
        /// <summary>取得 Banner 渠道能力。</summary>
        public CrazyGamesBannerSdk Banner { get { ensureReady(); return new CrazyGamesBannerSdk(ensureReady); } }
        /// <summary>取得 Data 渠道能力。</summary>
        public CrazyGamesDataSdk Data { get { ensureReady(); return new CrazyGamesDataSdk(ensureReady); } }
        /// <summary>取得 Game 渠道能力。</summary>
        public CrazyGamesGameSdk Game { get { ensureReady(); return new CrazyGamesGameSdk(ensureReady); } }
        /// <summary>取得 Store 渠道能力。</summary>
        public CrazyGamesStoreSdk Store { get { ensureReady(); return new CrazyGamesStoreSdk(ensureReady); } }
        /// <summary>取得 User 渠道能力。</summary>
        public CrazyGamesUserSdk User { get { ensureReady(); return new CrazyGamesUserSdk(ensureReady); } }
        /// <summary>读取当前官方 SDK 版本。</summary>
        public string Version { get { ensureReady(); return global::CrazyGames.CrazySDK.Version; } }
        /// <summary>读取官方渠道属性 IsInitialized。</summary>
        public bool IsInitialized { get { ensureReady(); return global::CrazyGames.CrazySDK.IsInitialized; } }
        /// <summary>读取官方渠道属性 IsShutDown。</summary>
        public bool IsShutDown { get { ensureReady(); return global::CrazyGames.CrazySDK.IsShutDown; } }
        /// <summary>读取官方渠道属性 Environment。</summary>
        public string Environment { get { ensureReady(); return global::CrazyGames.CrazySDK.Environment; } }
        /// <summary>读取官方渠道属性 IsAvailable。</summary>
        public bool IsAvailable { get { ensureReady(); return global::CrazyGames.CrazySDK.IsAvailable; } }
    }
}
#endif
