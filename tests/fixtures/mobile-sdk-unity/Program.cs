using System;
using System.Threading.Tasks;
using AppCreator.MobileSdk;

/// <summary>离线替身场景，仅验证包装代码的可执行行为。</summary>
internal static class Program
{
    /// <summary>断言测试条件。</summary>
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    /// <summary>同步观察任务结果，避免引入额外后台服务。</summary>
    private static void Wait(Task task) => task.GetAwaiter().GetResult();
    /// <summary>执行授权、隔离、奖励与参数场景。</summary>
    private static void Main()
    {
        // 同步失败、诊断回调抛错以及永不完成的 SDK 均不能阻止下一项投递。
        var launch = typeof(MobileSdkRuntime).GetMethod("Launch", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        int diagnostics = 0, started = 0;
        var stalled = new TaskCompletionSource<bool>();
        launch.Invoke(null, new object[] { "failed", (Func<Task>)(() => throw new InvalidOperationException()), (Action<string, Exception>)((_, _) => { diagnostics++; throw new Exception("诊断失败"); }) });
        launch.Invoke(null, new object[] { "stalled", (Func<Task>)(() => stalled.Task), null });
        launch.Invoke(null, new object[] { "next", (Func<Task>)(() => { started++; return Task.CompletedTask; }), null });
        Check(diagnostics == 1 && started == 1 && !stalled.Task.IsCompleted, "SDK 错误或挂起不能阻断后续启动");
        stalled.SetResult(true);
        var init = new SdkInitialization(10);
        var late = new TaskCompletionSource<bool>();
        try { Wait(init.Start(() => late.Task)); throw new Exception("超时应失败"); } catch (TimeoutException) { }
        Check(init.Pending && init.State == SdkState.TimedOut, "超时保留真实待决状态");
        try { init.Start(() => Task.CompletedTask); throw new Exception("待决期间不可重试"); } catch (InvalidOperationException) { }
        late.SetResult(true);
        Check(init.State == SdkState.TimedOut, "迟到结果不可自动恢复");
        Wait(init.Start(() => Task.CompletedTask));
        Check(init.State == SdkState.Ready, "真实任务结束后可重试");
        var units = new AdUnits("banner", "interstitial", "rewarded");
        var policy = new AdPolicy(true, true, true, true);
#if APP_CREATOR_MAX_SDK
        var invalidAds = new MaxManager(new MainThread(), 1000, units, policy, null, 1);
        try { Wait(invalidAds.InitializeAsync()); throw new Exception("缺少 MAX 密钥应失败"); } catch (InvalidOperationException) { }
        Check(invalidAds.State == SdkState.Failed, "MAX 配置错误必须只影响自身状态");
        invalidAds.Dispose();
#else
        var invalidAds = new AdMobManager(new MainThread(), 1000, null, policy);
        try { Wait(invalidAds.InitializeAsync()); throw new Exception("缺少广告位应失败"); } catch (InvalidOperationException) { }
        Check(invalidAds.State == SdkState.Failed, "AdMob 配置错误必须只影响自身状态");
        invalidAds.Dispose();
#endif
        var config = new MobileSdkConfig { Units = units, AdvertisingPolicy = policy, FirebaseInitializationAllowed = true,
            AnalyticsCollectionEnabled = true, CrashCollectionEnabled = true, AppsFlyerTrackingAllowed = true, MaxSdkKey = "test-key", MaxPendingRewards = 1 };
#if APP_CREATOR_ADMOB_SDK
        config.Advertising = AdProvider.AdMob;
#else
        config.Advertising = AdProvider.Max;
#endif
        var runtime = new MobileSdkRuntime(config);
        var blocked = new FirebaseAnalyticsManager(new MainThread(), new FirebaseDependencies(new MainThread(), 1000), 1000, false, true);
        try { Wait(blocked.InitializeAsync()); throw new Exception("授权前不能初始化 Firebase"); } catch (InvalidOperationException) { }
        Check(Firebase.FirebaseApp.Checks == 0, "未授权不能检查 Firebase 依赖");
        // 错误的 AppsFlyer 配置只能影响该 SDK，不得阻断其它初始化。
        try { Wait(runtime.Attribution.InitializeAsync()); throw new Exception("缺失归因配置应失败"); } catch (ArgumentNullException) { }
        Wait(runtime.Analytics.InitializeAsync()); Wait(runtime.Crashlytics.InitializeAsync());
        Check(Firebase.FirebaseApp.Checks == 1, "Firebase 依赖检查应复用");
        runtime.Analytics.LogEvent("event", new AnalyticsValue("text", "x"), new AnalyticsValue("number", 3L), new AnalyticsValue("decimal", 1.5));
        bool rejectedThread = Task.Run(() => { try { runtime.Analytics.LogEvent("wrong-thread"); return false; } catch (InvalidOperationException) { return true; } }).GetAwaiter().GetResult();
        Check(rejectedThread, "非主线程调用必须拒绝");
        var values = Firebase.Analytics.FirebaseAnalytics.Last;
        Check(values.Length == 3 && values[0].Value is string && values[1].Value is long && values[2].Value is double, "Firebase 参数类型");
        runtime.Analytics.SetInitializationAllowed(false);
        Check(!Firebase.Analytics.FirebaseAnalytics.Enabled && Firebase.Crashlytics.Crashlytics.IsCrashlyticsCollectionEnabled, "Firebase 模块授权应独立");
        Wait(runtime.Ads.InitializeAsync()); Wait(runtime.Ads.InitializeAsync());
#if APP_CREATOR_MAX_SDK
        Check(MaxSdk.Key == "test-key", "MAX SDK Key");
#endif
        int rewards = 0, closes = 0;
        runtime.Ads.LoadInterstitial(value => Check(value == AdLoad.Loaded, "插屏加载"));
        Check(runtime.Ads.ShowInterstitial(null), "插屏展示");
        runtime.Ads.LoadRewarded(value => Check(value == AdLoad.Loaded, "激励加载"));
        Check(!runtime.Ads.ShowRewarded("blocked", null, null), "插屏展示时不能展示激励");
#if APP_CREATOR_ADMOB_SDK
        GoogleMobileAds.Api.InterstitialAd.Last.Close();
#else
        MaxSdkCallbacks.Interstitial.Closed("interstitial", MaxSdk.Placement);
#endif
        Check(runtime.Ads.ShowRewarded("private-order", (id, value) => { Check(id == "private-order", "请求身份"); rewards++; }, (id, value) => closes++), "激励展示");
#if APP_CREATOR_ADMOB_SDK
        var firstRewardAd = GoogleMobileAds.Api.RewardedAd.Last;
#endif
        runtime.Ads.LoadInterstitial(null);
        Check(!runtime.Ads.ShowInterstitial(null), "激励展示时不能展示插屏");
        runtime.Ads.LoadRewarded(null);
        Check(!runtime.Ads.ShowRewarded("blocked-again", null, null), "激励展示时不能重复展示");
#if APP_CREATOR_ADMOB_SDK
        Check(GoogleMobileAds.Api.RewardedAd.Request.Extras["npa"] == "1", "AdMob 非个性化参数");
        firstRewardAd.Close();
        Check(rewards == 0 && closes == 1, "关闭不能发奖");
        firstRewardAd.RewardCallback(new GoogleMobileAds.Api.Reward());
        firstRewardAd.RewardCallback(new GoogleMobileAds.Api.Reward());
#else
        Check(MaxSdk.Placement != "private-order" && MaxSdk.Placement.Length == 32, "MAX placement 不能泄露业务身份");
        MaxSdkCallbacks.Rewarded.Closed("rewarded", MaxSdk.Placement);
        MaxSdkCallbacks.Rewarded.Earned("rewarded", "wrong");
        Check(rewards == 0 && closes == 1, "关闭或错误 placement 不能发奖");
        runtime.Ads.LoadRewarded(null);
        Check(!runtime.Ads.ShowRewarded("another", null, null), "待决记录达到上限时拒绝新的展示");
        MaxSdkCallbacks.Rewarded.Earned("rewarded", MaxSdk.Placement);
        MaxSdkCallbacks.Rewarded.Earned("rewarded", MaxSdk.Placement);
        Check(runtime.Ads.ShowRewarded("another", null, null), "真实奖励释放记录后可再次展示");
#endif
        Check(rewards == 1 && closes == 1, "真实奖励必须唯一交付");
#if APP_CREATOR_ADMOB_SDK
        Check(firstRewardAd.Destroyed, "收到迟到奖励后销毁原对象");
        for (int i = 0; i < 128; i++) {
            runtime.Ads.LoadRewarded(null);
            Check(runtime.Ads.ShowRewarded("pending-" + i, null, null), "未到上限应允许展示");
            GoogleMobileAds.Api.RewardedAd.Last.Close();
        }
        var pending = GoogleMobileAds.Api.RewardedAd.Last;
        runtime.Ads.LoadRewarded(null);
        Check(!runtime.Ads.ShowRewarded("overflow", null, null), "待决对象达到上限时拒绝");
        runtime.Ads.Dispose();
        Check(pending.Destroyed, "释放时销毁待决对象");
#endif
        var attribution = new AppsFlyerManager(new MainThread(), 1000, new AppsFlyerSDK.AppsFlyer(), "key", "app", true);
        var attributionInit = attribution.InitializeAsync();
#if UNITY_ANDROID
        Check(!attributionInit.IsCompleted && AppsFlyerSDK.AppsFlyer.Starts == 0, "未收到真实会话时不能伪造启动");
        // 模拟宿主自然进入前台后的 SDK 会话通知，不跳转 Activity。
        AppsFlyerSDK.AppsFlyer.TriggerSession();
#endif
        Wait(attributionInit); Wait(attribution.InitializeAsync());
        Check(AppsFlyerSDK.AppsFlyer.Starts == 1 && !AppsFlyerSDK.AppsFlyer.StartArgument, "AppsFlyer start(false) 与幂等");
        attribution.Dispose(); runtime.Dispose();
        Console.WriteLine("PASS");
    }
}
