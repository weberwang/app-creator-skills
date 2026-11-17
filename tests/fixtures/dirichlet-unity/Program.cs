using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AppCreator.MobileSdk;
using Dirichlet.Mediation;

/// <summary>驱动官方接口替身，检查管理器的广告状态与结算边界。</summary>
internal static class Program
{
    /// <summary>检查测试条件。</summary>
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    /// <summary>同步观察测试任务。</summary>
    private static void Wait(Task task) => task.GetAwaiter().GetResult();
    /// <summary>创建代表实际请求权限的策略。</summary>
    private static AdPolicy Policy(bool allowed = true) => new AdPolicy(true, allowed, true, false);
    /// <summary>创建同一媒体的新管理器。</summary>
    private static DirichletManager Manager(Func<bool> privacy) => new DirichletManager(42, "测试媒体", "test-key", 1000, new AdUnits("11", "22", "33"), Policy(), privacy);
    /// <summary>模拟一次真实激励加载成功。</summary>
    private static DirichletRewardVideoAd LoadReward(DirichletManager manager)
    {
        AdLoad? status = null;
        manager.LoadRewarded(value => status = value);
        var ad = new DirichletRewardVideoAd();
        DirichletAdManager.Native.RewardLoaded(ad);
        Check(status == AdLoad.Loaded && DirichletAdManager.Native.RewardRequest.SpaceId == 33, "激励必须由真实加载回调及数字广告位就绪");
        return ad;
    }
    /// <summary>执行授权、初始化、对象生命周期和奖励去重场景。</summary>
    private static void Main()
    {
        bool privacy = false;
        int privacyCalls = 0;
        Func<bool> apply = () => { privacyCalls++; return privacy; };
        var manager = Manager(apply);
        try { manager.InitializeAsync(); throw new Exception("缺少网络隐私设置时不得初始化"); }
        catch (InvalidOperationException) { }
        Check(DirichletSdk.Calls == 0, "未满足隐私前置时未调用官方 SDK");
        privacy = true;
#if UNITY_ANDROID
        UnityEngine.AndroidJavaClass.Fail = true;
        try { manager.InitializeAsync(); throw new Exception("JNI 设置失败时不得初始化"); }
        catch (InvalidOperationException) { }
        Check(DirichletSdk.Calls == 0, "JNI 失败不能初始化");
        UnityEngine.AndroidJavaClass.Fail = false;
#endif
        Task first = manager.InitializeAsync();
        Task duplicate = manager.InitializeAsync();
        Check(ReferenceEquals(first, duplicate) && DirichletSdk.Calls == 1, "相同实例的初始化应复用");
        Check(DirichletSdk.Config.MediaId == 42 && !DirichletSdk.Config.Debug && !DirichletSdk.Config.Idfa && !DirichletSdk.Config.Shake, "按明确媒体配置初始化且默认关闭可选采集");
        manager.UpdatePolicy(Policy(false));
        DirichletSdk.Complete(); Wait(first);
        Check(manager.State == SdkState.Restricted && privacyCalls > 0, "初始化迟到回调不能覆盖已撤回的授权");
        manager.UpdatePolicy(Policy());
        Check(manager.State == SdkState.Ready, "真实初始化成功且恢复授权后才能就绪");
#if UNITY_ANDROID
        Check(UnityEngine.AndroidJavaClass.Name == "com.tapsdk.tapad.group.DirichletSdk" &&
              UnityEngine.AndroidJavaClass.Method == "putMediaGlobalSettings" &&
              UnityEngine.AndroidJavaClass.Key == "personal_ads_type" && UnityEngine.AndroidJavaClass.Value == "0", "Android 非个性化须调用真实聚合接口");
#endif
        var competing = Manager(apply);
        int beforeCompetition = privacyCalls;
        try { competing.InitializeAsync(); throw new Exception("第二个所有者应被拒绝"); }
        catch (InvalidOperationException) { }
        Check(privacyCalls == beforeCompetition, "拒绝其他所有者前不得修改全局隐私配置");
        competing.Dispose();

        int interstitialListeners = 0;
        manager.LoadInterstitial(_ => { interstitialListeners++; throw new Exception("业务错误"); });
        manager.LoadInterstitial(value => { Check(value == AdLoad.Loaded, "插屏结果"); interstitialListeners++; });
        Check(DirichletAdManager.Native.InterstitialLoads == 1 && DirichletAdManager.Native.InterstitialRequest.SpaceId == 22, "相同广告位共享在途加载");
        var interstitial = new DirichletInterstitialAd();
        DirichletAdManager.Native.InterstitialLoaded(interstitial);
        Check(interstitialListeners == 2, "一个业务回调异常不能影响其他监听");
        var reward = LoadReward(manager);
        int interstitialCloses = 0;
        Check(manager.ShowInterstitial(value => { Check(value == AdEnd.Closed, "插屏关闭"); interstitialCloses++; }), "已加载插屏可展示");
        Check(!manager.ShowRewarded("blocked", (_, _) => { }, (_, _) => { }), "全屏展示互斥");
        interstitial.Close(); interstitial.Close();
        Check(interstitialCloses == 1 && interstitial.Destroyed, "插屏只结束一次且释放官方对象");
        int granted = 0, rewardCloses = 0;
        Check(manager.ShowRewarded("not-verified", (_, _) => granted++, (_, _) => rewardCloses++), "激励应正常发起");
        reward.Verify(false); reward.Verify(true); reward.Close(); reward.Close();
        Check(granted == 0 && rewardCloses == 1 && reward.Destroyed, "验证失败和重复事件不能发奖");

        var rejected = LoadReward(manager);
        int rejectedCloses = 0;
        rejected.ShowResult = false;
        rejected.DuringShow = () => { rejected.Verify(true); rejected.Close(); };
        Check(!manager.ShowRewarded("rejected", (_, _) => granted++, (_, result) => { if (result == AdEnd.Failed) rejectedCloses++; }), "官方拒绝展示要立即返回失败");
        rejected.Verify(true);
        Check(granted == 0 && rejectedCloses == 1 && rejected.Destroyed, "同步奖励不能绕过未受理结果");

        AdLoad? revoked = null;
        manager.LoadRewarded(value => revoked = value);
        var obsoleteCallback = DirichletAdManager.Native.RewardLoaded;
        manager.UpdatePolicy(Policy(false));
        Check(revoked == AdLoad.Failed && !manager.ShowRewarded("revoked", (_, _) => granted++, (_, _) => { }), "撤回策略立即限制业务");
        manager.UpdatePolicy(Policy());
        var stale = new DirichletRewardVideoAd(); obsoleteCallback(stale);
        Check(stale.Destroyed && !manager.ShowRewarded("stale", (_, _) => granted++, (_, _) => { }), "旧加载完成不能恢复就绪");

        var privacyStale = LoadReward(manager);
        privacy = false;
        Check(!manager.ShowRewarded("privacy-withdrawn", (_, _) => granted++, (_, _) => { }) && privacyStale.Destroyed,
            "独立隐私配置失效时必须立刻销毁旧缓存");
        privacy = true;
        Check(!manager.ShowRewarded("privacy-restored", (_, _) => granted++, (_, _) => { }), "恢复授权不能复用旧缓存");

        AdLoad? bannerResult = null;
        manager.ShowBanner(BannerAnchor.Top, value => bannerResult = value);
        var bannerCallback = DirichletAdManager.Native.BannerLoaded;
        manager.HideBanner();
        var staleBanner = new DirichletBannerAd(); bannerCallback(staleBanner);
        Check(bannerResult == AdLoad.Failed && staleBanner.Destroyed, "隐藏后到达的横幅不得显示");
        manager.ShowBanner(BannerAnchor.Bottom, value => bannerResult = value);
        var visibleBanner = new DirichletBannerAd(); DirichletAdManager.Native.BannerLoaded(visibleBanner);
        Check(bannerResult == AdLoad.Loaded && visibleBanner.Options.BannerAlignment == DirichletBannerAlignment.Bottom, "横幅位置传入官方选项");
        manager.HideBanner(); Check(visibleBanner.Destroyed, "官方没有隐藏方法，隐藏必须销毁视图");

        var late = LoadReward(manager);
        Check(manager.ShowRewarded("old", (id, value) => { Check(id == "old" && value.Amount == 7, "迟到奖励关联原请求"); granted++; }, (_, _) => { }), "已加载激励可展示");
        late.Close(); manager.Dispose();
        Check(!late.Destroyed, "释放管理器不能丢弃待决真实奖励");
        var differentMedia = new DirichletManager(43, "不同媒体", "other-key", 1000, new AdUnits("11", "22", "33"), Policy(), apply);
        int beforeDifferentMedia = privacyCalls;
        try { differentMedia.InitializeAsync(); throw new Exception("进程内其他媒体配置不得复用已有 SDK"); }
        catch (InvalidOperationException) { }
        Check(privacyCalls == beforeDifferentMedia, "媒体身份冲突不能改写全局隐私配置");
        differentMedia.Dispose();
        var nextManager = Manager(apply); Wait(nextManager.InitializeAsync());
        var next = LoadReward(nextManager);
        int nextGranted = 0;
        Check(nextManager.ShowRewarded("new", (_, _) => nextGranted++, (_, _) => { }), "旧展示关闭后新所有者可独立工作");
        late.Verify(true, 7); late.Verify(true, 7);
        Check(granted == 1 && nextGranted == 0 && late.Destroyed, "旧奖励不能归入新展示且只交付一次");
        next.Verify(true); next.Close(); Check(nextGranted == 1, "新展示的真实奖励正常结算");

        var unresolved = new List<DirichletRewardVideoAd>();
        for (int index = 0; index < 128; index++)
        {
            var ad = LoadReward(nextManager); unresolved.Add(ad);
            Check(nextManager.ShowRewarded("pending-" + index, (_, _) => { }, (_, _) => { }), "未达上限时可发起");
            ad.Close();
        }
        var overflow = LoadReward(nextManager);
        Check(!nextManager.ShowRewarded("overflow", (_, _) => { }, (_, _) => { }), "待决奖励满额必须拒绝新展示");
        unresolved[0].Verify(false);
        Check(nextManager.ShowRewarded("after-capacity", (_, _) => { }, (_, _) => { }), "真实结果释放容量后才能继续展示");
        overflow.Close(); overflow.Verify(false);
        foreach (var item in unresolved) item.Verify(false);
        nextManager.Dispose();
        Check(privacyCalls > 4, "每次初始化和广告请求均需重新应用隐私策略");
        Console.WriteLine("PASS");
    }
}
