#if APP_CREATOR_WECHAT_SDK
using System;
using WeChatWASM;

namespace AppCreator.ChannelSdk
{
    /// <summary>微信广告对象共有的方法，保留官方展示和事件回调。</summary>
    public abstract class WechatAd
    {
        private readonly WXBaseAd native;
        private readonly Action ensureReady;
        /// <summary>绑定官方对象与当前渠道生命周期，不发起广告请求。</summary>
        protected WechatAd(WXBaseAd native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>读取微信分配的广告实例标识。</summary>
        public string InstanceId { get { ensureReady(); return native.instanceId; } }
        /// <summary>展示广告；成功回调仅代表展示请求结果。</summary>
        public void Show(Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) { ensureReady(); native.Show(success, failed); }
        /// <summary>按微信提供的分支参数展示广告。</summary>
        public void Show(string branchId, string branchDim, Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) { ensureReady(); native.Show(branchId, branchDim, success, failed); }
        /// <summary>监听加载完成。</summary>
        public void OnLoad(Action<WXADLoadResponse> action) { ensureReady(); native.OnLoad(action); }
        /// <summary>使用注册时相同回调取消加载监听。</summary>
        public void OffLoad(Action<WXADLoadResponse> action) { ensureReady(); native.OffLoad(action); }
        /// <summary>监听广告错误。</summary>
        public void OnError(Action<WXADErrorResponse> action) { ensureReady(); native.OnError(action); }
        /// <summary>使用注册时相同回调取消错误监听。</summary>
        public void OffError(Action<WXADErrorResponse> action) { ensureReady(); native.OffError(action); }
        /// <summary>由持有者在广告不再使用时销毁对象。</summary>
        public void Destroy() { ensureReady(); native.Destroy(); }
    }

    /// <summary>微信横幅广告及尺寸事件。</summary>
    public sealed class WechatBannerAd : WechatAd
    {
        private readonly WXBannerAd native;
        private readonly Action ensureReady;
        /// <summary>包装微信横幅对象。</summary>
        internal WechatBannerAd(WXBannerAd native, Action ensureReady) : base(native, ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>读取或更新微信横幅样式。</summary>
        public WXAdBaseStyle Style { get { ensureReady(); return native.style; } set { ensureReady(); native.style = value; } }
        /// <summary>监听横幅尺寸。</summary>
        public void OnResize(Action<WXADResizeResponse> action) { ensureReady(); native.OnResize(action); }
        /// <summary>移除横幅尺寸监听。</summary>
        public void OffResize(Action<WXADResizeResponse> action) { ensureReady(); native.OffResize(action); }
        /// <summary>隐藏横幅。</summary>
        public void Hide() { ensureReady(); native.Hide(); }
    }

    /// <summary>微信自定义广告及显示生命周期。</summary>
    public sealed class WechatCustomAd : WechatAd
    {
        private readonly WXCustomAd native;
        private readonly Action ensureReady;
        /// <summary>包装微信自定义广告对象。</summary>
        internal WechatCustomAd(WXCustomAd native, Action ensureReady) : base(native, ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>读取或更新微信自定义广告样式。</summary>
        public WXAdCustomStyle Style { get { ensureReady(); return native.style; } set { ensureReady(); native.style = value; } }
        /// <summary>隐藏自定义广告。</summary>
        public void Hide(Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) { ensureReady(); native.Hide(success, failed); }
        /// <summary>监听广告关闭。</summary>
        public void OnClose(Action action) { ensureReady(); native.OnClose(action); }
        /// <summary>取消关闭监听。</summary>
        public void OffClose(Action action) { ensureReady(); native.OffClose(action); }
        /// <summary>监听广告隐藏。</summary>
        public void OnHide(Action action) { ensureReady(); native.OnHide(action); }
        /// <summary>取消隐藏监听。</summary>
        public void OffHide(Action action) { ensureReady(); native.OffHide(action); }
    }

    /// <summary>微信插屏广告及关闭事件。</summary>
    public sealed class WechatInterstitialAd : WechatAd
    {
        private readonly WXInterstitialAd native;
        private readonly Action ensureReady;
        /// <summary>包装微信插屏对象。</summary>
        internal WechatInterstitialAd(WXInterstitialAd native, Action ensureReady) : base(native, ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>加载插屏广告。</summary>
        public void Load(Action<WXTextResponse> success = null, Action<WXADErrorResponse> failed = null) { ensureReady(); native.Load(success, failed); }
        /// <summary>监听插屏关闭。</summary>
        public void OnClose(Action action) { ensureReady(); native.OnClose(action); }
        /// <summary>取消插屏关闭监听。</summary>
        public void OffClose(Action action) { ensureReady(); native.OffClose(action); }
    }

    /// <summary>微信激励视频广告；奖励由业务根据真实关闭结果核验。</summary>
    public sealed class WechatRewardedVideoAd : WechatAd
    {
        private readonly WXRewardedVideoAd native;
        private readonly Action ensureReady;
        /// <summary>包装微信激励视频对象。</summary>
        internal WechatRewardedVideoAd(WXRewardedVideoAd native, Action ensureReady) : base(native, ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>加载激励视频。</summary>
        public void Load(Action<WXTextResponse> success = null, Action<WXADErrorResponse> failed = null) { ensureReady(); native.Load(success, failed); }
        /// <summary>监听包含完整观看状态的关闭结果。</summary>
        public void OnClose(Action<WXRewardedVideoAdOnCloseResponse> action) { ensureReady(); native.OnClose(action); }
        /// <summary>使用相同回调取消关闭监听。</summary>
        public void OffClose(Action<WXRewardedVideoAdOnCloseResponse> action) { ensureReady(); native.OffClose(action); }
        /// <summary>按微信合同报告广告分享行为。</summary>
        public WXRewardedVideoAdReportShareBehaviorResponse ReportShareBehavior(RequestAdReportShareBehaviorParam param) { ensureReady(); return native.ReportShareBehavior(param); }
    }

    /// <summary>微信开放数据域消息接口。</summary>
    public sealed class WechatOpenDataContext
    {
        private readonly WXOpenDataContext native;
        private readonly Action ensureReady;
        /// <summary>包装当前开放数据域。</summary>
        internal WechatOpenDataContext(WXOpenDataContext native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>向开放数据域投递消息。</summary>
        public void PostMessage(string message) { ensureReady(); native.PostMessage(message); }
    }

    /// <summary>微信排行榜与挑战管理。</summary>
    public sealed class WechatRankManager
    {
        private readonly WXRankManager native;
        private readonly Action ensureReady;
        /// <summary>包装微信排行榜对象。</summary>
        internal WechatRankManager(WXRankManager native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>更新中途排名。</summary>
        public void MiddleUpdate(RankOption option) { ensureReady(); native.MiddleUpdate(option); }
        /// <summary>更新排名。</summary>
        public void Update(RankOption option) { ensureReady(); native.Update(option); }
        /// <summary>创建挑战。</summary>
        public void CreateChallenge(RankOption option) { ensureReady(); native.CreateChallenge(option); }
        /// <summary>中止挑战。</summary>
        public void Abort(RankOption option) { ensureReady(); native.Abort(option); }
        /// <summary>监听挑战开始。</summary>
        public void OnChallengeStart(Action<RankManagerStartEventResult> listener) { ensureReady(); native.OnChallengeStart(listener); }
        /// <summary>取消挑战开始监听。</summary>
        public void OffChallengeStart(Action<RankManagerStartEventResult> listener) { ensureReady(); native.OffChallengeStart(listener); }
    }

    /// <summary>微信用户资料授权按钮。</summary>
    public sealed class WechatUserInfoButton
    {
        private readonly WXUserInfoButton native;
        private readonly Action ensureReady;
        /// <summary>包装微信用户资料按钮。</summary>
        internal WechatUserInfoButton(WXUserInfoButton native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>监听用户点击及授权结果。</summary>
        public void OnTap(Action<WXUserInfoResponse> action) { ensureReady(); native.OnTap(action); }
        /// <summary>取消用户点击监听。</summary>
        public void OffTap() { ensureReady(); native.OffTap(); }
        /// <summary>显示按钮。</summary>
        public void Show() { ensureReady(); native.Show(); }
        /// <summary>隐藏按钮。</summary>
        public void Hide() { ensureReady(); native.Hide(); }
        /// <summary>释放按钮对象。</summary>
        public void Destroy() { ensureReady(); native.Destroy(); }
    }

    /// <summary>微信反馈按钮及其样式。</summary>
    public sealed class WechatFeedbackButton
    {
        private readonly WXFeedbackButton native;
        private readonly Action ensureReady;
        /// <summary>包装微信反馈按钮。</summary>
        internal WechatFeedbackButton(WXFeedbackButton native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>按钮样式。</summary>
        public OptionStyle Style { get { ensureReady(); return native.style; } set { ensureReady(); native.style = value; } }
        /// <summary>按钮类型。</summary>
        public string Type { get { ensureReady(); return native.type; } set { ensureReady(); native.type = value; } }
        /// <summary>按钮图片。</summary>
        public string Image { get { ensureReady(); return native.image; } set { ensureReady(); native.image = value; } }
        /// <summary>按钮文案。</summary>
        public string Text { get { ensureReady(); return native.text; } set { ensureReady(); native.text = value; } }
        /// <summary>显示按钮。</summary>
        public void Show() { ensureReady(); native.Show(); }
        /// <summary>隐藏按钮。</summary>
        public void Hide() { ensureReady(); native.Hide(); }
        /// <summary>释放按钮。</summary>
        public void Destroy() { ensureReady(); native.Destroy(); }
        /// <summary>监听点击。</summary>
        public void OnTap(Action<GeneralCallbackResult> action) { ensureReady(); native.OnTap(action); }
        /// <summary>移除点击监听。</summary>
        public void OffTap() { ensureReady(); native.OffTap(); }
    }

    /// <summary>微信游戏圈按钮及其样式。</summary>
    public sealed class WechatGameClubButton
    {
        private readonly WXGameClubButton native;
        private readonly Action ensureReady;
        /// <summary>包装微信游戏圈按钮。</summary>
        internal WechatGameClubButton(WXGameClubButton native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>读取微信分配的游戏圈按钮实例标识。</summary>
        public string InstanceId { get { ensureReady(); return native.instanceId; } }
        /// <summary>按钮图标。</summary>
        public GameClubButtonIcon Icon { get { ensureReady(); return native.icon; } set { ensureReady(); native.icon = value; } }
        /// <summary>按钮类型。</summary>
        public GameClubButtonType Type { get { ensureReady(); return native.type; } set { ensureReady(); native.type = value; } }
        /// <summary>按钮样式。</summary>
        public WXGameClubButtonStyle Style { get { ensureReady(); return native.styleObj; } set { ensureReady(); native.styleObj = value; } }
        /// <summary>读取或更新 SDK 暴露的底层样式字段。</summary>
        public WXGameClubButtonStyle StyleData { get { ensureReady(); return native.style; } set { ensureReady(); native.style = value; } }
        /// <summary>按钮文案。</summary>
        public string Text { get { ensureReady(); return native.text; } set { ensureReady(); native.text = value; } }
        /// <summary>按钮图片。</summary>
        public string Image { get { ensureReady(); return native.image; } set { ensureReady(); native.image = value; } }
        /// <summary>显示按钮。</summary>
        public void Show() { ensureReady(); native.Show(); }
        /// <summary>隐藏按钮。</summary>
        public void Hide() { ensureReady(); native.Hide(); }
        /// <summary>释放按钮。</summary>
        public void Destroy() { ensureReady(); native.Destroy(); }
        /// <summary>监听用户点击。</summary>
        public void OnTap(Action action) { ensureReady(); native.OnTap(action); }
        /// <summary>移除用户点击监听。</summary>
        public void OffTap(Action action) { ensureReady(); native.OffTap(action); }
    }

    /// <summary>微信平台页面管理能力。</summary>
    public sealed class WechatPageManager
    {
        private readonly WXPageManager native;
        private readonly Action ensureReady;
        /// <summary>包装微信页面管理器。</summary>
        internal WechatPageManager(WXPageManager native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>加载页面。</summary>
        public void Load(LoadOption option) { ensureReady(); native.Load(option); }
        /// <summary>展示页面。</summary>
        public void Show(ShowOption option) { ensureReady(); native.Show(option); }
        /// <summary>订阅页面事件。</summary>
        public void On(string name, Action<PageManagerEventResult> callback) { ensureReady(); native.On(name, callback); }
        /// <summary>取消页面事件订阅。</summary>
        public void Off(string name) { ensureReady(); native.Off(name); }
        /// <summary>销毁页面管理器。</summary>
        public void Destroy() { ensureReady(); native.Destroy(); }
    }

    /// <summary>微信启动剧情生命周期和变量。</summary>
    public sealed class WechatLaunchOpera
    {
        private readonly WXLaunchOpera native;
        private readonly Action ensureReady;
        /// <summary>包装微信启动剧情对象。</summary>
        internal WechatLaunchOpera(WXLaunchOpera native, Action ensureReady) { this.native = native; this.ensureReady = ensureReady; }
        /// <summary>更新进度。</summary>
        public void SetPercentage(double value) { ensureReady(); native.SetPercentage(value); }
        /// <summary>查询是否运行中。</summary>
        public bool GetRunning() { ensureReady(); return native.GetRunning(); }
        /// <summary>结束剧情。</summary>
        public void End() { ensureReady(); native.End(); }
        /// <summary>监听结束事件。</summary>
        public void OnEnd(Action<bool> action) { ensureReady(); native.onEnd(action); }
        /// <summary>取消结束监听。</summary>
        public void OffEnd(Action<bool> action) { ensureReady(); native.offEnd(action); }
        /// <summary>设置剧情变量。</summary>
        public void SetGlobalVar(string key, string value) { ensureReady(); native.SetGlobalVar(key, value); }
        /// <summary>读取剧情变量。</summary>
        public string GetGlobalVar(string key) { ensureReady(); return native.GetGlobalVar(key); }
        /// <summary>查询剧情线是否播放。</summary>
        public bool IsPlayStoryLine(string key) { ensureReady(); return native.IsPlayStoryLine(key); }
    }

}
#endif
