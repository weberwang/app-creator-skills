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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Banner 的官方公开方法。</summary>
    public sealed partial class CrazyGamesBannerSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesBannerSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>读取官方渠道属性 Banners。</summary>
        public List<CrazyBanner> Banners { get { ensureReady(); return global::CrazyGames.CrazySDK.Banner.Banners; } }
        /// <summary>调用官方 RefreshBanners，保留其原始参数、返回和回调语义。</summary>
        public void RefreshBanners() { ensureReady(); global::CrazyGames.CrazySDK.Banner.RefreshBanners(); }
        /// <summary>调用官方 RegisterBanner，保留其原始参数、返回和回调语义。</summary>
        public void RegisterBanner(CrazyBanner banner) { ensureReady(); global::CrazyGames.CrazySDK.Banner.RegisterBanner(banner); }
        /// <summary>调用官方 UnregisterBanner，保留其原始参数、返回和回调语义。</summary>
        public void UnregisterBanner(CrazyBanner banner) { ensureReady(); global::CrazyGames.CrazySDK.Banner.UnregisterBanner(banner); }
    }
}
#endif
