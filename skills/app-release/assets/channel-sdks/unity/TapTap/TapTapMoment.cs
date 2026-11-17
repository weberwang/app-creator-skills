#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_MOMENT
using System;
using TapSDK.Moment;

namespace AppCreator.ChannelSdk
{
    /// <summary>内嵌动态社区的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>打开官方动态入口。</summary>
        public void OpenMoment() { ensureReady(); TapTapMoment.open(); }
        /// <summary>打开指定动态场景。</summary>
        public void OpenMomentScene(string id) { ensureReady(); TapTapMoment.OpenScene(id); }
        /// <summary>使用官方元数据发布动态。</summary>
        public void PublishMoment(PublishMetaData data) { ensureReady(); TapTapMoment.Publish(data); }
        /// <summary>关闭动态页面。</summary>
        public void CloseMoment() { Cleanup(TapTapMoment.Close); }
        /// <summary>显示关闭确认并使用指定标题和描述。</summary>
        public void CloseMomentWithTitle(string title, string description) { Cleanup(() => TapTapMoment.CloseWithTitle(title, description)); }
        /// <summary>请求未读动态通知。</summary>
        public void FetchMomentNotification() { ensureReady(); TapTapMoment.FetchNotification(); }
        /// <summary>设置官方动态回调；调用方负责生命周期内清理。</summary>
        public void SetMomentCallback(Action<int, string> callback) { ensureReady(); TapTapMoment.SetCallback(callback); }
    }
}
#endif
