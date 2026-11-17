#if APP_CREATOR_TAPTAP_CORE
using System;

namespace AppCreator.ChannelSdk
{
    /// <summary>更新、评价和资源置换能力均按所选官方包编译。</summary>
    public sealed partial class TapTapSdk
    {
#if APP_CREATOR_TAPTAP_UPDATE
        /// <summary>引导用户更新游戏，保留取消回调。</summary>
        public void UpdateGame(Action onCancel) { ensureReady(); TapSDK.Update.TapTapUpdate.UpdateGame(onCancel); }
        /// <summary>检查官方强制更新状态。</summary>
        public void CheckForceUpdate() { ensureReady(); TapSDK.Update.TapTapUpdate.CheckForceUpdate(); }
#endif
#if APP_CREATOR_TAPTAP_REVIEW
        /// <summary>打开 TapTap 评价页面。</summary>
        public void OpenReview() { ensureReady(); TapSDK.Review.TapTapReview.OpenReview(); }
#endif
#if APP_CREATOR_TAPTAP_REP
        /// <summary>打开已配置的资源置换链接，保留官方结果回调。</summary>
        public void OpenRep(string url, Action<int, string> callback) { ensureReady(); TapSDK.Rep.TapTapRep.Open(url, callback); }
#endif
    }
}
#endif
