using System;
using System.Threading.Tasks;

namespace AppCreator.MobileSdk
{
    /// <summary>项目启动时提供的真实平台配置；默认不启用采集。</summary>
    public sealed class MobileSdkConfig
    {
        /// <summary>选择唯一的顶层广告聚合。</summary>
        public AdProvider Advertising;
        /// <summary>当前平台广告位。</summary>
        public AdUnits Units;
        /// <summary>项目已有的广告授权和配置。</summary>
        public AdPolicy AdvertisingPolicy;
        /// <summary>MAX 控制台提供的 SDK Key；仅选择 MAX 时使用。</summary>
        public string MaxSdkKey;
        /// <summary>MAX 等待真实奖励回调的展示记录上限。</summary>
        public int MaxPendingRewards = 128;
        /// <summary>每个 SDK 独立等待的最长毫秒数。</summary>
        public int TimeoutMilliseconds = 15000;
#if APP_CREATOR_FIREBASE_SDK
        /// <summary>Firebase 初始化是否满足项目的隐私前置。</summary>
        public bool FirebaseInitializationAllowed;
        /// <summary>初始统计采集状态。</summary>
        public bool AnalyticsCollectionEnabled;
        /// <summary>初始异常采集状态。</summary>
        public bool CrashCollectionEnabled;
#endif
#if APP_CREATOR_APPSFLYER_SDK
        /// <summary>场景中持久存在的官方 AppsFlyer 组件。</summary>
        public AppsFlyerSDK.AppsFlyer AppsFlyerReceiver;
        /// <summary>项目的 AppsFlyer 开发者密钥。</summary>
        public string AppsFlyerDevKey;
        /// <summary>iOS 应用 ID，Android 按官方要求传入。</summary>
        public string AppsFlyerAppId;
        /// <summary>是否已经取得归因采集授权。</summary>
        public bool AppsFlyerTrackingAllowed;
#endif
    }

    /// <summary>唯一装配入口；应用启动时显式调用，各 SDK 独立启动。</summary>
    public sealed class MobileSdkRuntime : IDisposable
    {
        private static bool created;
        private readonly MainThread thread = new MainThread();
        private bool disposed;
        /// <summary>业务使用的统一广告能力。</summary>
        public IMobileAds Ads { get; }
#if APP_CREATOR_FIREBASE_SDK
        private readonly FirebaseDependencies dependencies;
        /// <summary>统计和业务事件能力。</summary>
        public FirebaseAnalyticsManager Analytics { get; }
        /// <summary>异常记录能力。</summary>
        public FirebaseCrashlyticsManager Crashlytics { get; }
#endif
#if APP_CREATOR_APPSFLYER_SDK
        /// <summary>归因和事件能力。</summary>
        public AppsFlyerManager Attribution { get; }
#endif
        /// <summary>按配置装配唯一广告聚合；不隐式初始化任何 SDK。</summary>
        public MobileSdkRuntime(MobileSdkConfig config)
        {
            MobilePlatform.Require();
            if (config == null) throw new ArgumentNullException(nameof(config));
            if (created) throw new InvalidOperationException("每个进程只允许创建一个移动 SDK 组合根。");
            if (config.TimeoutMilliseconds <= 0) throw new ArgumentOutOfRangeException(nameof(config.TimeoutMilliseconds));
            switch (config.Advertising)
            {
                case AdProvider.AdMob:
#if APP_CREATOR_ADMOB_SDK
                    Ads = new AdMobManager(thread, config.TimeoutMilliseconds, config.Units, config.AdvertisingPolicy); break;
#else
                    throw new InvalidOperationException("未安装或启用 AdMob Unity SDK。");
#endif
                case AdProvider.Max:
#if APP_CREATOR_MAX_SDK
                    Ads = new MaxManager(thread, config.TimeoutMilliseconds, config.Units, config.AdvertisingPolicy, config.MaxSdkKey, config.MaxPendingRewards); break;
#else
                    throw new InvalidOperationException("未安装或启用 MAX Unity SDK。");
#endif
                default: throw new ArgumentOutOfRangeException(nameof(config.Advertising));
            }
#if APP_CREATOR_FIREBASE_SDK
            dependencies = new FirebaseDependencies(thread, config.TimeoutMilliseconds);
            Analytics = new FirebaseAnalyticsManager(thread, dependencies, config.TimeoutMilliseconds, config.FirebaseInitializationAllowed, config.AnalyticsCollectionEnabled);
            Crashlytics = new FirebaseCrashlyticsManager(thread, dependencies, config.TimeoutMilliseconds, config.FirebaseInitializationAllowed, config.CrashCollectionEnabled);
#endif
#if APP_CREATOR_APPSFLYER_SDK
            Attribution = new AppsFlyerManager(thread, config.TimeoutMilliseconds, config.AppsFlyerReceiver, config.AppsFlyerDevKey, config.AppsFlyerAppId, config.AppsFlyerTrackingAllowed);
#endif
            created = true;
        }
        /// <summary>分别提交初始化；错误和超时只报告对应 SDK。</summary>
        public void Start(Action<string, Exception> failed)
        {
            thread.Require(); if (disposed) throw new ObjectDisposedException(nameof(MobileSdkRuntime));
            Launch("ads", Ads.InitializeAsync, failed);
#if APP_CREATOR_FIREBASE_SDK
            Launch("analytics", Analytics.InitializeAsync, failed);
            Launch("crashlytics", Crashlytics.InitializeAsync, failed);
#endif
#if APP_CREATOR_APPSFLYER_SDK
            Launch("appsflyer", Attribution.InitializeAsync, failed);
#endif
        }
        /// <summary>独立观察异步错误，避免某 SDK 失败阻塞其他启动。</summary>
        private static async void Launch(string name, Func<Task> start, Action<string, Exception> failed)
        {
            try { await start(); }
            catch (Exception error) {
                // 诊断回调不可信；其异常不能中断其他 SDK 投递或传播到游戏主循环。
                try { failed?.Invoke(name, error); } catch (Exception) { }
            }
        }
        /// <summary>停止新请求；已受理广告展示由管理器保留原始回调。</summary>
        public void Dispose()
        {
            thread.Require(); if (disposed) return; disposed = true; Ads.Dispose();
#if APP_CREATOR_FIREBASE_SDK
            Analytics.Dispose(); Crashlytics.Dispose(); dependencies.Dispose();
#endif
#if APP_CREATOR_APPSFLYER_SDK
            Attribution.Dispose();
#endif
        }
    }
}
