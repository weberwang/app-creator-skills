#if APP_CREATOR_ADMOB_SDK
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GoogleMobileAds.Api;
using GoogleMobileAds.Common;

namespace AppCreator.MobileSdk
{
    /// <summary>Google Mobile Ads Unity 8+ 的 AdMob 聚合实现。</summary>
    public sealed class AdMobManager : IMobileAds
    {
        private readonly MainThread thread;
        private readonly SdkInitialization initialization;
        private readonly AdUnits units;
        private AdPolicy policy;
        private BannerView banner;
        private bool bannerLoaded;
        private bool bannerVisible;
        private int bannerGeneration;
        private InterstitialAd interstitial;
        private RewardedAd rewarded;
        private readonly List<Action<AdLoad>> interstitialListeners = new List<Action<AdLoad>>();
        private readonly List<Action<AdLoad>> rewardedListeners = new List<Action<AdLoad>>();
        private bool interstitialLoading;
        private bool rewardedLoading;
        // 关闭但尚未收到奖励的原生对象必须有界保留，防止丢失可信迟到回调。
        private const int PendingRewardLimit = 128;
        private readonly HashSet<RewardedAd> pendingRewards = new HashSet<RewardedAd>();
        private bool fullScreenActive;
        private bool disposed;
        private int policyGeneration;

        /// <summary>只保存配置，不在构造期间初始化 SDK 或请求广告。</summary>
        internal AdMobManager(MainThread thread, int timeoutMilliseconds, AdUnits units, AdPolicy policy)
        { this.thread = thread; initialization = new SdkInitialization(timeoutMilliseconds); this.units = units; this.policy = policy; }
        /// <summary>当前聚合 SDK 的真实状态。</summary>
        public SdkState State => initialization.State;
        /// <summary>厂商初始化是否仍在进行。</summary>
        public bool InitializationPending => initialization.Pending;

        /// <summary>所有可能由 SDK 初始化触发的请求必须先满足项目已核实的策略。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            if (units == null || policy == null) return initialization.Start(() => throw new InvalidOperationException("AdMob 广告位或策略未配置。"));
            if (!policy.InitializationAllowed || !policy.NonPersonalizedNetworksConfigured) { initialization.Restrict(); throw new InvalidOperationException("AdMob 初始化前置或广告源非个性化配置未满足。"); }
            return initialization.Start(() => {
                var completion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                MobileAds.Initialize(status => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                    if (status == null) completion.TrySetException(new InvalidOperationException("AdMob 未返回初始化状态。"));
                    else completion.TrySetResult(true);
                }));
                return completion.Task;
            });
        }

        /// <summary>根据最新授权策略丢弃尚未展示的旧模式广告。</summary>
        public void UpdatePolicy(AdPolicy next)
        {
            thread.Require();
            policy = next ?? throw new ArgumentNullException(nameof(next));
            policyGeneration++;
            if (!CanRequest()) { interstitial?.Destroy(); interstitial = null; rewarded?.Destroy(); rewarded = null; DestroyBanner(); }
        }

        /// <summary>非个性化及用户授权条件共同决定是否可请求广告。</summary>
        private bool CanRequest() => !disposed && policy.InitializationAllowed && policy.RequestsAllowed && policy.NonPersonalizedNetworksConfigured;
        /// <summary>检查 SDK 与业务请求条件，不能以初始化完成代替隐私允许。</summary>
        private void RequireRequest() { thread.Require(); initialization.RequireReady(); if (!CanRequest()) throw new InvalidOperationException("广告请求当前受限。"); }
        /// <summary>每次请求都向 Google 显式提供非个性化参数；其他聚合源须有各自配置依据。</summary>
        private static AdRequest Request() => new AdRequest { Extras = new Dictionary<string, string> { { "npa", "1" } } };
        /// <summary>验证当前平台广告位，不能用占位 ID 请求。</summary>
        private static string Unit(string value) => !string.IsNullOrWhiteSpace(value) ? value : throw new InvalidOperationException("当前平台广告位未配置。");

        /// <summary>按当前授权后台加载插屏，重复加载共享一次在途请求。</summary>
        public void LoadInterstitial(Action<AdLoad> completed)
        {
            RequireRequest();
            if (interstitial != null && interstitial.CanShowAd()) { completed?.Invoke(AdLoad.Loaded); return; }
            if (completed != null) interstitialListeners.Add(completed);
            if (interstitialLoading) return;
            interstitialLoading = true;
            int attempt = policyGeneration;
            try {
                InterstitialAd.Load(Unit(units.Interstitial), Request(), (ad, error) => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                    interstitialLoading = false;
                    if (disposed || attempt != policyGeneration || !CanRequest()) { ad?.Destroy(); Notify(interstitialListeners, AdLoad.Failed); return; }
                    interstitial?.Destroy();
                    interstitial = error == null ? ad : null;
                    if (error != null) ad?.Destroy();
                    Notify(interstitialListeners, interstitial != null ? AdLoad.Loaded : AdLoad.Failed);
                }));
            } catch { interstitialLoading = false; Notify(interstitialListeners, AdLoad.Failed); }
        }

        /// <summary>展示已加载的插屏；没有填充时立即返回 false。</summary>
        public bool ShowInterstitial(Action<AdEnd> ended)
        {
            RequireRequest();
            if (fullScreenActive || interstitial == null || !interstitial.CanShowAd()) return false;
            InterstitialAd ad = interstitial;
            interstitial = null;
            fullScreenActive = true;
            bool closed = false;
            /** 同一次展示的关闭和失败最多通知一次。 */
            void Finish(AdEnd result) { if (closed) return; closed = true; fullScreenActive = false; try { ended?.Invoke(result); } finally { ad.Destroy(); } }
            ad.OnAdFullScreenContentClosed += () => MobileAdsEventExecutor.ExecuteInUpdate(() => Finish(AdEnd.Closed));
            ad.OnAdFullScreenContentFailed += error => MobileAdsEventExecutor.ExecuteInUpdate(() => Finish(AdEnd.Failed));
            try { ad.Show(); return true; }
            catch { Finish(AdEnd.Failed); return false; }
        }

        /// <summary>按当前授权后台加载激励广告。</summary>
        public void LoadRewarded(Action<AdLoad> completed)
        {
            RequireRequest();
            if (rewarded != null && rewarded.CanShowAd()) { completed?.Invoke(AdLoad.Loaded); return; }
            if (completed != null) rewardedListeners.Add(completed);
            if (rewardedLoading) return;
            rewardedLoading = true;
            int attempt = policyGeneration;
            try {
                RewardedAd.Load(Unit(units.Rewarded), Request(), (ad, error) => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                    rewardedLoading = false;
                    if (disposed || attempt != policyGeneration || !CanRequest()) { ad?.Destroy(); Notify(rewardedListeners, AdLoad.Failed); return; }
                    rewarded?.Destroy();
                    rewarded = error == null ? ad : null;
                    if (error != null) ad?.Destroy();
                    Notify(rewardedListeners, rewarded != null ? AdLoad.Loaded : AdLoad.Failed);
                }));
            } catch { rewardedLoading = false; Notify(rewardedListeners, AdLoad.Failed); }
        }

        /// <summary>奖励和关闭使用不同信号；广告关闭后仍保留该实例以接收可信迟到奖励。</summary>
        public bool ShowRewarded(string requestId, Action<string, AdReward> reward, Action<string, AdEnd> ended)
        {
            RequireRequest();
            if (string.IsNullOrWhiteSpace(requestId)) throw new ArgumentException("奖励请求必须有唯一身份。", nameof(requestId));
            if (fullScreenActive || pendingRewards.Count >= PendingRewardLimit || rewarded == null || !rewarded.CanShowAd()) return false;
            RewardedAd ad = rewarded;
            rewarded = null;
            pendingRewards.Add(ad);
            fullScreenActive = true;
            bool closed = false;
            bool earned = false;
            bool failed = false;
            /** 关闭只通知展示结束，不推断用户已获得奖励。 */
            void Finish(AdEnd result) {
                if (closed) return;
                closed = true;
                fullScreenActive = false;
                failed = result == AdEnd.Failed;
                try { ended?.Invoke(requestId, result); }
                finally { if ((result == AdEnd.Failed || earned) && pendingRewards.Remove(ad)) ad.Destroy(); }
            }
            ad.OnAdFullScreenContentClosed += () => MobileAdsEventExecutor.ExecuteInUpdate(() => Finish(AdEnd.Closed));
            ad.OnAdFullScreenContentFailed += error => MobileAdsEventExecutor.ExecuteInUpdate(() => Finish(AdEnd.Failed));
            try {
                ad.Show(value => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                    if (disposed || earned || failed || value == null) return;
                    earned = true;
                    try { reward?.Invoke(requestId, new AdReward(value.Type, value.Amount)); }
                    finally { if (closed && pendingRewards.Remove(ad)) ad.Destroy(); }
                }));
                return true;
            } catch { Finish(AdEnd.Failed); return false; }
        }

        /// <summary>按需创建横幅并隐藏；真实加载完成且仍需显示时才展示。</summary>
        public void ShowBanner(BannerAnchor anchor, Action<AdLoad> loaded)
        {
            RequireRequest();
            bannerVisible = true;
            if (banner != null) { if (bannerLoaded) { banner.Show(); loaded?.Invoke(AdLoad.Loaded); } return; }
            int attempt = ++bannerGeneration;
            banner = new BannerView(Unit(units.Banner), AdSize.Banner, anchor == BannerAnchor.Top ? AdPosition.Top : AdPosition.Bottom);
            BannerView current = banner;
            current.Hide();
            current.OnBannerAdLoaded += () => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                if (disposed || attempt != bannerGeneration || !CanRequest()) return;
                bannerLoaded = true;
                if (bannerVisible) current.Show();
                loaded?.Invoke(AdLoad.Loaded);
            });
            current.OnBannerAdLoadFailed += error => MobileAdsEventExecutor.ExecuteInUpdate(() => {
                if (disposed || attempt != bannerGeneration) return;
                bannerLoaded = false; loaded?.Invoke(AdLoad.Failed);
            });
            try { current.LoadAd(Request()); }
            catch { if (attempt == bannerGeneration) { DestroyBanner(); loaded?.Invoke(AdLoad.Failed); } }
        }

        /// <summary>隐藏横幅并取消待完成加载后的展示意图。</summary>
        public void HideBanner() { thread.Require(); bannerVisible = false; banner?.Hide(); }
        /// <summary>释放横幅并使旧加载回调失效。</summary>
        public void DestroyBanner() { thread.Require(); bannerVisible = false; bannerLoaded = false; bannerGeneration++; banner?.Destroy(); banner = null; }
        /// <summary>只结算当前批次加载监听，避免回调中再次请求时被意外清空。</summary>
        private static void Notify(List<Action<AdLoad>> listeners, AdLoad result)
        {
            Action<AdLoad>[] pending = listeners.ToArray(); listeners.Clear();
            foreach (Action<AdLoad> callback in pending) callback(result);
        }
        /// <summary>停止新请求并释放全部拥有的原生对象，释放后不再交付迟到奖励。</summary>
        public void Dispose()
        {
            thread.Require(); if (disposed) return;
            disposed = true; policyGeneration++; initialization.Dispose(); DestroyBanner();
            interstitial?.Destroy(); interstitial = null; rewarded?.Destroy(); rewarded = null;
            foreach (RewardedAd ad in pendingRewards) ad.Destroy();
            pendingRewards.Clear();
            interstitialListeners.Clear(); rewardedListeners.Clear();
        }
    }
}
#endif
