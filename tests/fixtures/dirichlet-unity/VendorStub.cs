using System;

namespace UnityEngine
{
    /// <summary>记录 Android 实际使用的 JNI 类、方法与非个性化参数。</summary>
    public sealed class AndroidJavaClass : IDisposable
    {
        public static int Calls;
        public static bool Fail;
        public static string Name, Method, Key, Value;
        /// <summary>记录待访问的原生类。</summary>
        public AndroidJavaClass(string name) { Name = name; }
        /// <summary>模拟原生静态调用并检查隐私配置的真实签名。</summary>
        public void CallStatic(string method, params object[] args)
        {
            Calls++; Method = method; Key = (string)args[0]; Value = (string)args[1];
            if (Fail) throw new InvalidOperationException();
        }
        /// <summary>模拟释放 Java 引用。</summary>
        public void Dispose() { }
    }
}

namespace Dirichlet.Mediation
{
    /// <summary>模拟官方媒体初始化结果。</summary>
    public sealed class DirichletInitResult { public bool Success; }
    /// <summary>模拟官方脱敏错误参数。</summary>
    public sealed class DirichletError { }
    /// <summary>模拟官方媒体配置构建器。</summary>
    public sealed class DirichletAdConfig
    {
        public long MediaId;
        public string MediaName, MediaKey;
        public bool Debug, Idfa, Shake;
        /// <summary>提供与官方同名的配置构建方法。</summary>
        public sealed class Builder
        {
            private readonly DirichletAdConfig config = new DirichletAdConfig();
            /// <summary>设置真实媒体 ID。</summary>
            public Builder WithMediaId(long value) { config.MediaId = value; return this; }
            /// <summary>设置媒体名称。</summary>
            public Builder WithMediaName(string value) { config.MediaName = value; return this; }
            /// <summary>设置媒体密钥。</summary>
            public Builder WithMediaKey(string value) { config.MediaKey = value; return this; }
            /// <summary>配置厂商调试日志。</summary>
            public Builder EnableDebug(bool value) { config.Debug = value; return this; }
            /// <summary>配置 iOS IDFA 使用。</summary>
            public Builder AllowIDFAAccess(bool value) { config.Idfa = value; return this; }
            /// <summary>配置摇一摇交互。</summary>
            public Builder ShakeEnabled(bool value) { config.Shake = value; return this; }
            /// <summary>返回构造好的配置。</summary>
            public DirichletAdConfig Build() => config;
        }
    }
    /// <summary>模拟官方静态初始化与延迟回调。</summary>
    public static class DirichletSdk
    {
        public static bool IsInitialized { get; private set; }
        public static int Calls;
        public static DirichletAdConfig Config;
        public static Action<DirichletInitResult> Success;
        public static Action<DirichletError> Failure;
        /// <summary>记录真正发起的初始化，等待测试驱动回调。</summary>
        public static void Init(DirichletAdConfig config, Action<DirichletInitResult> success, Action<DirichletError> failure)
        { Calls++; Config = config; Success = success; Failure = failure; }
        /// <summary>模拟厂商确认初始化完成。</summary>
        public static void Complete() { IsInitialized = true; Success(new DirichletInitResult { Success = true }); }
    }
    /// <summary>模拟官方请求及数字广告位构建器。</summary>
    public sealed class DirichletAdRequest
    {
        public long SpaceId;
        /// <summary>按官方签名创建广告请求。</summary>
        public sealed class Builder
        {
            private long id;
            /// <summary>设置数字广告位 ID。</summary>
            public Builder WithSpaceId(long value) { id = value; return this; }
            /// <summary>生成广告请求。</summary>
            public DirichletAdRequest Build() => new DirichletAdRequest { SpaceId = id };
        }
    }
    /// <summary>官方对象的加载、展示和资源事件。</summary>
    public abstract class DirichletAd
    {
        public bool IsLoaded { get; set; } = true;
        public bool IsValid { get; set; } = true;
        public bool ShowResult = true, Destroyed;
        public Action DuringShow;
        public event Action Closed;
        /// <summary>模拟展示发起及可能同步重入的事件。</summary>
        public virtual bool Show() { DuringShow?.Invoke(); return ShowResult; }
        /// <summary>记录释放；真实 SDK 会注销原生事件路由。</summary>
        public void Destroy() { Destroyed = true; IsValid = false; }
        /// <summary>主动触发官方关闭事件。</summary>
        public void Close() { Closed?.Invoke(); }
    }
    /// <summary>模拟官方真实奖励事件参数。</summary>
    public sealed class DirichletRewardVerificationEventArgs
    {
        public bool IsVerified { get; set; }
        public int RewardAmount { get; set; }
        public string RewardName { get; set; }
    }
    /// <summary>激励广告保留请求级奖励监听。</summary>
    public sealed class DirichletRewardVideoAd : DirichletAd
    {
        public event Action<DirichletRewardVerificationEventArgs> RewardVerified;
        /// <summary>发出真实或无效的奖励验证结果。</summary>
        public void Verify(bool verified, int amount = 1) => RewardVerified?.Invoke(new DirichletRewardVerificationEventArgs { IsVerified = verified, RewardAmount = amount, RewardName = "测试奖励" });
    }
    /// <summary>模拟官方插屏广告对象。</summary>
    public sealed class DirichletInterstitialAd : DirichletAd { }
    /// <summary>模拟官方横幅位置选项。</summary>
    public enum DirichletBannerAlignment { Top, Bottom }
    /// <summary>模拟官方横幅展示选项。</summary>
    public sealed class DirichletAdShowOptions { public DirichletBannerAlignment BannerAlignment; public int BannerOffset; }
    /// <summary>模拟官方横幅广告对象。</summary>
    public sealed class DirichletBannerAd : DirichletAd
    {
        public DirichletAdShowOptions Options;
        /// <summary>记录真实展示位置。</summary>
        public bool Show(DirichletAdShowOptions options) { Options = options; return base.Show(); }
    }
    /// <summary>模拟官方异步加载器，并由测试驱动真实形式的回调。</summary>
    public sealed class DirichletAdNative
    {
        public int RewardLoads, InterstitialLoads, BannerLoads;
        public Action<DirichletRewardVideoAd> RewardLoaded;
        public Action<DirichletInterstitialAd> InterstitialLoaded;
        public Action<DirichletBannerAd> BannerLoaded;
        public Action<DirichletError> RewardFailed, InterstitialFailed, BannerFailed;
        public DirichletAdRequest RewardRequest, InterstitialRequest, BannerRequest;
        /// <summary>记录激励加载和关联请求。</summary>
        public void LoadRewardVideoAd(DirichletAdRequest request, Action<DirichletRewardVideoAd> loaded, Action<DirichletError> failed)
        { RewardLoads++; RewardRequest = request; RewardLoaded = loaded; RewardFailed = failed; }
        /// <summary>记录插屏加载和关联请求。</summary>
        public void LoadInterstitialAd(DirichletAdRequest request, Action<DirichletInterstitialAd> loaded, Action<DirichletError> failed)
        { InterstitialLoads++; InterstitialRequest = request; InterstitialLoaded = loaded; InterstitialFailed = failed; }
        /// <summary>记录横幅加载和关联请求。</summary>
        public void LoadBannerAd(DirichletAdRequest request, Action<DirichletBannerAd> loaded, Action<DirichletError> failed)
        { BannerLoads++; BannerRequest = request; BannerLoaded = loaded; BannerFailed = failed; }
    }
    /// <summary>提供同一个模拟官方广告加载器。</summary>
    public static class DirichletAdManager
    {
        public static readonly DirichletAdNative Native = new DirichletAdNative();
        /// <summary>返回可控的真实接口替身。</summary>
        public static DirichletAdNative CreateAdNative() => Native;
    }
}
