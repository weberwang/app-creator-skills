using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace AppCreator.MobileSdk
{
    /// <summary>单个 SDK 的真实初始化阶段。</summary>
    public enum SdkState { Created, Initializing, Ready, Restricted, Failed, TimedOut, Disposed }
    /// <summary>唯一选择的顶层广告聚合；网络适配器仍由选中的聚合 SDK 管理。</summary>
    public enum AdProvider { Unspecified, AdMob, Max }
    /// <summary>广告展示结束原因；奖励结果通过单独的真实回调交付。</summary>
    public enum AdEnd { Closed, Failed }
    /// <summary>广告位加载结果。</summary>
    public enum AdLoad { Loaded, Failed }
    /// <summary>游戏业务可用的横幅放置方向。</summary>
    public enum BannerAnchor { Top, Bottom }

    /// <summary>广告真实奖励，不以关闭或展示成功推断。</summary>
    public readonly struct AdReward
    {
        /// <summary>由 SDK 返回的奖励标签。</summary>
        public readonly string Label;
        /// <summary>由 SDK 返回的奖励数量。</summary>
        public readonly double Amount;
        /// <summary>记录平台回调中实际给出的奖励。</summary>
        public AdReward(string label, double amount) { Label = label; Amount = amount; }
    }

    /// <summary>外部已有授权与平台配置的快照；各标记由项目按真实配置提供。</summary>
    public sealed class AdPolicy
    {
        /// <summary>SDK 初始化及其可能触发的预加载是否满足官方隐私前置。</summary>
        public bool InitializationAllowed { get; }
        /// <summary>当前业务是否允许请求和展示广告。</summary>
        public bool RequestsAllowed { get; }
        /// <summary>所有实际启用的广告源是否已分别验证非个性化配置。</summary>
        public bool NonPersonalizedNetworksConfigured { get; }
        /// <summary>MAX 内建隐私流程已按构建配置禁用或明确采用并完成官方前置。</summary>
        public bool MaxFlowConfigured { get; }
        /// <summary>来自真实授权来源的 MAX 信息共享选择；未知保持 null。</summary>
        public bool? MaxUserConsent { get; }

        /// <summary>只记录已有策略，不触发隐私界面或 SDK。</summary>
        public AdPolicy(bool initializationAllowed, bool requestsAllowed, bool nonPersonalizedNetworksConfigured, bool maxFlowConfigured, bool? maxUserConsent = null)
        { InitializationAllowed = initializationAllowed; RequestsAllowed = requestsAllowed; NonPersonalizedNetworksConfigured = nonPersonalizedNetworksConfigured; MaxFlowConfigured = maxFlowConfigured; MaxUserConsent = maxUserConsent; }
    }

    /// <summary>目标平台自己的广告位配置，不提供生产 ID 默认值。</summary>
    public sealed class AdUnits
    {
        /// <summary>横幅广告位。</summary>
        public string Banner { get; }
        /// <summary>插屏广告位。</summary>
        public string Interstitial { get; }
        /// <summary>激励广告位。</summary>
        public string Rewarded { get; }
        /// <summary>仅保存项目提供的当前平台广告位。</summary>
        public AdUnits(string banner, string interstitial, string rewarded)
        { Banner = banner; Interstitial = interstitial; Rewarded = rewarded; }
    }

    /// <summary>业务只依赖此广告能力，不直接绑定具体聚合 SDK。</summary>
    public interface IMobileAds : IDisposable
    {
        /// <summary>广告聚合的实际初始化状态。</summary>
        SdkState State { get; }
        /// <summary>当前初始化是否仍在厂商 SDK 内运行。</summary>
        bool InitializationPending { get; }
        /// <summary>仅初始化当前选中的聚合 SDK。</summary>
        Task InitializeAsync();
        /// <summary>应用已有的授权策略发生变化后更新请求门。</summary>
        void UpdatePolicy(AdPolicy policy);
        /// <summary>后台预加载插屏；失败不阻塞游戏。</summary>
        void LoadInterstitial(Action<AdLoad> completed);
        /// <summary>仅在已加载时发起展示，关闭与失败均明确通知。</summary>
        bool ShowInterstitial(Action<AdEnd> ended);
        /// <summary>后台预加载激励广告。</summary>
        void LoadRewarded(Action<AdLoad> completed);
        /// <summary>用户主动触发时展示；奖励与关闭分别通知。</summary>
        bool ShowRewarded(string requestId, Action<string, AdReward> rewarded, Action<string, AdEnd> ended);
        /// <summary>按需创建横幅，确认布局后显示。</summary>
        void ShowBanner(BannerAnchor anchor, Action<AdLoad> loaded);
        /// <summary>隐藏已创建的横幅。</summary>
        void HideBanner();
        /// <summary>释放当前横幅，离开页面无需保留原生视图。</summary>
        void DestroyBanner();
    }

    /// <summary>统计事件的强类型参数，不需要业务导入 Firebase 类型。</summary>
    public readonly struct AnalyticsValue
    {
        /// <summary>事件参数名。</summary>
        public readonly string Name;
        /// <summary>参数值，只接受字符串、整数或浮点数。</summary>
        public readonly object Value;
        /// <summary>构造可映射到 Firebase 的强类型参数。</summary>
        public AnalyticsValue(string name, string value) { Name = name; Value = value; }
        /// <summary>构造整数参数。</summary>
        public AnalyticsValue(string name, long value) { Name = name; Value = value; }
        /// <summary>构造浮点参数。</summary>
        public AnalyticsValue(string name, double value) { Name = name; Value = value; }
    }

    /// <summary>保持所有 Unity 和广告 SDK 方法在创建组合根的主线程执行。</summary>
    internal sealed class MainThread
    {
        private readonly int id = Thread.CurrentThread.ManagedThreadId;
        /// <summary>发现误用时立即拒绝，不在后台线程隐式调用厂商 SDK。</summary>
        internal void Require() { if (Thread.CurrentThread.ManagedThreadId != id) throw new InvalidOperationException("必须在 Unity 主线程调用 SDK。"); }
    }

    /// <summary>只在真实移动构建中启动 SDK，编辑器和普通 Web 不伪装为原生验证。</summary>
    internal static class MobilePlatform
    {
        /// <summary>构建平台不支持时返回明确错误。</summary>
        internal static void Require()
        {
#if !(UNITY_ANDROID || UNITY_IOS) || UNITY_EDITOR
            throw new PlatformNotSupportedException("仅 Android/iOS 原生构建支持移动 SDK。");
#endif
        }
    }
}
