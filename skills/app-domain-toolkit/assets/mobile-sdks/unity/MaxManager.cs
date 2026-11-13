#if APP_CREATOR_MAX_SDK
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AppCreator.MobileSdk
{
    /// <summary>AppLovin MAX Unity 聚合，奖励使用平台回传的 placement 区分展示。</summary>
    public sealed class MaxManager : IMobileAds
    {
        /// <summary>单次展示的回调；隐藏和奖励可能以任意顺序到达。</summary>
        private sealed class RewardRequest
        {
            internal string Id;
            internal Action<string, AdReward> Reward;
            internal Action<string, AdEnd> End;
            internal bool Closed, Earned, Failed;
        }

        private readonly MainThread thread;
        private readonly SdkInitialization initialization;
        private readonly AdUnits units;
        private readonly string sdkKey;
        private readonly int pendingLimit;
        private readonly Dictionary<string, RewardRequest> requests = new Dictionary<string, RewardRequest>();
        private readonly List<Action<AdLoad>> interstitialWaiters = new List<Action<AdLoad>>(), rewardedWaiters = new List<Action<AdLoad>>();
        private AdPolicy policy;
        private bool disposed, subscribed, interstitialLoading, rewardedLoading, interstitialLoaded, rewardedLoaded, bannerCreated, bannerVisible, bannerReady;
        private int generation, interstitialGeneration, rewardedGeneration;
        // 以真实 placement 识别持锁展示，旧回调不能释放后续广告。
        private string activeShow;
        private Action<AdEnd> interstitialEnd;
        private Action<AdLoad> bannerLoaded;

        /// <summary>仅保存配置；构造时不触发广告 SDK。</summary>
        internal MaxManager(MainThread thread, int timeoutMilliseconds, AdUnits units, AdPolicy policy, string sdkKey, int pendingLimit)
        { this.thread = thread; initialization = new SdkInitialization(timeoutMilliseconds); this.units = units; this.policy = policy; this.sdkKey = sdkKey; this.pendingLimit = pendingLimit; }
        /// <summary>初始化状态。</summary>
        public SdkState State => initialization.State;
        /// <summary>厂商初始化是否仍在运行。</summary>
        public bool InitializationPending => initialization.Pending;
        /// <summary>检查真实隐私策略与广告源配置。</summary>
        private bool Allowed() => !disposed && policy.InitializationAllowed && policy.RequestsAllowed && policy.NonPersonalizedNetworksConfigured && policy.MaxFlowConfigured;
        /// <summary>业务必须在主线程及 SDK 就绪后请求广告。</summary>
        private void RequireRequest() { thread.Require(); initialization.RequireReady(); if (!Allowed()) throw new InvalidOperationException("MAX 广告请求当前受限。"); }
        /// <summary>拒绝空广告位。</summary>
        private static string Unit(string id) => !string.IsNullOrWhiteSpace(id) ? id : throw new InvalidOperationException("当前平台广告位未配置。");

        /// <summary>先完成构建期流程配置检查，再监听并启动唯一 MAX 实例。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            if (units == null || policy == null) return initialization.Start(() => throw new InvalidOperationException("MAX 广告位或策略未配置。"));
            if (!policy.InitializationAllowed || !policy.NonPersonalizedNetworksConfigured || !policy.MaxFlowConfigured)
            { initialization.Restrict(); throw new InvalidOperationException("MAX 初始化前置未满足。"); }
            return initialization.Start(() => {
                if (string.IsNullOrWhiteSpace(sdkKey)) throw new InvalidOperationException("MAX SDK Key 未配置。");
                if (pendingLimit <= 0) throw new InvalidOperationException("MAX 待决奖励记录上限必须大于零。");
                MaxSdk.SetSdkKey(sdkKey);
                Subscribe();
                if (policy.MaxUserConsent.HasValue) MaxSdk.SetHasUserConsent(policy.MaxUserConsent.Value);
                else if (!MaxSdk.IsUserConsentSet()) MaxSdk.SetHasUserConsent(false);
                if (MaxSdk.IsInitialized()) return Task.CompletedTask;
                var done = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                Action<MaxSdkBase.SdkConfiguration> handler = null;
                handler = config => { MaxSdkCallbacks.OnSdkInitializedEvent -= handler; if (config == null) done.TrySetException(new InvalidOperationException("MAX 未返回初始化配置。")); else done.TrySetResult(true); };
                MaxSdkCallbacks.OnSdkInitializedEvent += handler;
                try { MaxSdk.InitializeSdk(); }
                catch { MaxSdkCallbacks.OnSdkInitializedEvent -= handler; throw; }
                return done.Task;
            });
        }

        /// <summary>策略变化使旧缓存和在途加载失效；不改变未提供的真实同意状态。</summary>
        public void UpdatePolicy(AdPolicy next)
        {
            thread.Require(); policy = next ?? throw new ArgumentNullException(nameof(next)); generation++;
            interstitialLoaded = rewardedLoaded = false;
            if (!Allowed()) DestroyBanner();
            if (State == SdkState.Ready && next.MaxUserConsent.HasValue) MaxSdk.SetHasUserConsent(next.MaxUserConsent.Value);
        }
        /// <summary>注册广告回调；所有 MAX 调用由主线程执行。</summary>
        private void Subscribe()
        {
            if (subscribed) return; subscribed = true;
            MaxSdkCallbacks.Interstitial.OnAdLoadedEvent += InterstitialLoaded;
            MaxSdkCallbacks.Interstitial.OnAdLoadFailedEvent += InterstitialFailed;
            MaxSdkCallbacks.Interstitial.OnAdHiddenEvent += InterstitialHidden;
            MaxSdkCallbacks.Interstitial.OnAdDisplayFailedEvent += InterstitialDisplayFailed;
            MaxSdkCallbacks.Rewarded.OnAdLoadedEvent += RewardedLoaded;
            MaxSdkCallbacks.Rewarded.OnAdLoadFailedEvent += RewardedFailed;
            MaxSdkCallbacks.Rewarded.OnAdHiddenEvent += RewardedHidden;
            MaxSdkCallbacks.Rewarded.OnAdDisplayFailedEvent += RewardedDisplayFailed;
            MaxSdkCallbacks.Rewarded.OnAdReceivedRewardEvent += RewardedReceived;
            MaxSdkCallbacks.Banner.OnAdLoadedEvent += BannerLoaded;
            MaxSdkCallbacks.Banner.OnAdLoadFailedEvent += BannerFailed;
        }
        /// <summary>移除广告回调；展示中的奖励仍需保留直到厂商回调。</summary>
        private void Unsubscribe()
        {
            if (!subscribed) return; subscribed = false;
            MaxSdkCallbacks.Interstitial.OnAdLoadedEvent -= InterstitialLoaded;
            MaxSdkCallbacks.Interstitial.OnAdLoadFailedEvent -= InterstitialFailed;
            MaxSdkCallbacks.Interstitial.OnAdHiddenEvent -= InterstitialHidden;
            MaxSdkCallbacks.Interstitial.OnAdDisplayFailedEvent -= InterstitialDisplayFailed;
            MaxSdkCallbacks.Rewarded.OnAdLoadedEvent -= RewardedLoaded;
            MaxSdkCallbacks.Rewarded.OnAdLoadFailedEvent -= RewardedFailed;
            MaxSdkCallbacks.Rewarded.OnAdHiddenEvent -= RewardedHidden;
            MaxSdkCallbacks.Rewarded.OnAdDisplayFailedEvent -= RewardedDisplayFailed;
            MaxSdkCallbacks.Rewarded.OnAdReceivedRewardEvent -= RewardedReceived;
            MaxSdkCallbacks.Banner.OnAdLoadedEvent -= BannerLoaded;
            MaxSdkCallbacks.Banner.OnAdLoadFailedEvent -= BannerFailed;
        }
        /// <summary>调用批次监听器前清空，允许监听器发起新请求。</summary>
        private static void Notify(List<Action<AdLoad>> callbacks, AdLoad value)
        { var copy = callbacks.ToArray(); callbacks.Clear(); foreach (var callback in copy) callback(value); }
        /// <summary>加载插屏并合并并发监听。</summary>
        public void LoadInterstitial(Action<AdLoad> completed)
        {
            RequireRequest(); if (interstitialLoaded && MaxSdk.IsInterstitialReady(Unit(units.Interstitial))) { completed?.Invoke(AdLoad.Loaded); return; }
            if (completed != null) interstitialWaiters.Add(completed); if (interstitialLoading) return;
            interstitialGeneration = generation; interstitialLoading = true;
            try { MaxSdk.LoadInterstitial(Unit(units.Interstitial)); } catch { interstitialLoading = false; Notify(interstitialWaiters, AdLoad.Failed); }
        }
        /// <summary>真实加载事件决定缓存可否使用。</summary>
        private void InterstitialLoaded(string id, MaxSdkBase.AdInfo info)
        { if (id != units.Interstitial || !interstitialLoading) return; interstitialLoading = false; interstitialLoaded = Allowed() && generation == interstitialGeneration; Notify(interstitialWaiters, interstitialLoaded ? AdLoad.Loaded : AdLoad.Failed); }
        /// <summary>加载失败不伪造填充。</summary>
        private void InterstitialFailed(string id, MaxSdkBase.ErrorInfo error)
        { if (id != units.Interstitial || !interstitialLoading) return; interstitialLoading = interstitialLoaded = false; Notify(interstitialWaiters, AdLoad.Failed); }
        /// <summary>展示单次插屏。</summary>
        public bool ShowInterstitial(Action<AdEnd> ended)
        {
            RequireRequest(); if (activeShow != null || !interstitialLoaded || interstitialEnd != null || !MaxSdk.IsInterstitialReady(Unit(units.Interstitial))) return false;
            interstitialLoaded = false; interstitialEnd = ended ?? (_ => { }); activeShow = Guid.NewGuid().ToString("N");
            try { MaxSdk.ShowInterstitial(units.Interstitial, activeShow); return true; } catch { EndInterstitial(AdEnd.Failed); return false; }
        }
        /// <summary>只交付一次结束事件。</summary>
        private void EndInterstitial(AdEnd result) { var callback = interstitialEnd; interstitialEnd = null; activeShow = null; callback?.Invoke(result); }
        /// <summary>插屏真实关闭。</summary>
        private void InterstitialHidden(string id, MaxSdkBase.AdInfo info) { if (id == units.Interstitial && info?.Placement == activeShow && interstitialEnd != null) EndInterstitial(AdEnd.Closed); }
        /// <summary>插屏展示失败。</summary>
        private void InterstitialDisplayFailed(string id, MaxSdkBase.ErrorInfo error, MaxSdkBase.AdInfo info) { if (id == units.Interstitial && info?.Placement == activeShow && interstitialEnd != null) EndInterstitial(AdEnd.Failed); }
        /// <summary>加载激励广告并共享在途请求。</summary>
        public void LoadRewarded(Action<AdLoad> completed)
        {
            RequireRequest(); if (rewardedLoaded && MaxSdk.IsRewardedAdReady(Unit(units.Rewarded))) { completed?.Invoke(AdLoad.Loaded); return; }
            if (completed != null) rewardedWaiters.Add(completed); if (rewardedLoading) return;
            rewardedGeneration = generation; rewardedLoading = true;
            try { MaxSdk.LoadRewardedAd(Unit(units.Rewarded)); } catch { rewardedLoading = false; Notify(rewardedWaiters, AdLoad.Failed); }
        }
        /// <summary>验证激励填充与授权代次。</summary>
        private void RewardedLoaded(string id, MaxSdkBase.AdInfo info)
        { if (id != units.Rewarded || !rewardedLoading) return; rewardedLoading = false; rewardedLoaded = Allowed() && generation == rewardedGeneration; Notify(rewardedWaiters, rewardedLoaded ? AdLoad.Loaded : AdLoad.Failed); }
        /// <summary>激励加载失败。</summary>
        private void RewardedFailed(string id, MaxSdkBase.ErrorInfo error)
        { if (id != units.Rewarded || !rewardedLoading) return; rewardedLoading = rewardedLoaded = false; Notify(rewardedWaiters, AdLoad.Failed); }
        /// <summary>随机 placement 用于真实 SDK 回调关联，绝不传入业务订单。</summary>
        public bool ShowRewarded(string requestId, Action<string, AdReward> reward, Action<string, AdEnd> ended)
        {
            RequireRequest(); if (string.IsNullOrWhiteSpace(requestId)) throw new ArgumentException("奖励请求必须有唯一身份。", nameof(requestId));
            // 不删除未决记录猜测结算结果；达到上限时拒绝新的展示。
            if (activeShow != null || requests.Count >= pendingLimit || !rewardedLoaded || !MaxSdk.IsRewardedAdReady(Unit(units.Rewarded))) return false;
            string token = Guid.NewGuid().ToString("N"); rewardedLoaded = false;
            var request = new RewardRequest { Id = requestId, Reward = reward, End = ended }; requests.Add(token, request); activeShow = token;
            try { MaxSdk.ShowRewardedAd(units.Rewarded, token); return true; }
            catch { requests.Remove(token); activeShow = null; request.End?.Invoke(request.Id, AdEnd.Failed); return false; }
        }
        /// <summary>根据 SDK 原始 placement 查找展示；未知或缺失 placement 不发奖。</summary>
        private RewardRequest Find(string id, MaxSdkBase.AdInfo info)
        { return id == units.Rewarded && info != null && info.Placement != null && requests.TryGetValue(info.Placement, out var value) ? value : null; }
        /// <summary>关闭不推断奖励，保留记录处理迟到奖励。</summary>
        private void RewardedHidden(string id, MaxSdkBase.AdInfo info)
        { var r = Find(id, info); if (r == null || r.Closed) return; r.Closed = true; if (activeShow == info.Placement) activeShow = null; r.End?.Invoke(r.Id, AdEnd.Closed); if (r.Earned) requests.Remove(info.Placement); if (disposed && requests.Count == 0) Unsubscribe(); }
        /// <summary>展示失败不发放奖励。</summary>
        private void RewardedDisplayFailed(string id, MaxSdkBase.ErrorInfo error, MaxSdkBase.AdInfo info)
        { var r = Find(id, info); if (r == null || r.Closed) return; r.Closed = r.Failed = true; if (activeShow == info.Placement) activeShow = null; requests.Remove(info.Placement); r.End?.Invoke(r.Id, AdEnd.Failed); if (disposed && requests.Count == 0) Unsubscribe(); }
        /// <summary>只依据官方奖励事件发奖并确保每次最多一次。</summary>
        private void RewardedReceived(string id, MaxSdkBase.Reward reward, MaxSdkBase.AdInfo info)
        { var r = Find(id, info); if (r == null || r.Earned || r.Failed) return; r.Earned = true; r.Reward?.Invoke(r.Id, new AdReward(reward.Label, reward.Amount)); if (r.Closed) requests.Remove(info.Placement); if (disposed && requests.Count == 0) Unsubscribe(); }
        /// <summary>创建横幅时 SDK 会开始加载，必须先检查请求授权。</summary>
        public void ShowBanner(BannerAnchor anchor, Action<AdLoad> loaded)
        {
            RequireRequest(); bannerVisible = true; bannerLoaded = loaded;
            if (!bannerCreated) {
                bannerCreated = true;
                try { MaxSdk.CreateBanner(Unit(units.Banner), new MaxSdkBase.AdViewConfiguration(anchor == BannerAnchor.Top ? MaxSdkBase.AdViewPosition.TopCenter : MaxSdkBase.AdViewPosition.BottomCenter)); }
                catch { bannerCreated = false; bannerLoaded = null; loaded?.Invoke(AdLoad.Failed); }
            } else if (bannerReady) { MaxSdk.ShowBanner(units.Banner); bannerLoaded = null; loaded?.Invoke(AdLoad.Loaded); }
        }
        /// <summary>报告 SDK 横幅加载成功。</summary>
        private void BannerLoaded(string id, MaxSdkBase.AdInfo info) { if (id == units.Banner && bannerCreated && Allowed()) { bannerReady = true; if (bannerVisible) MaxSdk.ShowBanner(id); var callback = bannerLoaded; bannerLoaded = null; callback?.Invoke(AdLoad.Loaded); } }
        /// <summary>报告 SDK 横幅加载失败。</summary>
        private void BannerFailed(string id, MaxSdkBase.ErrorInfo error) { if (id == units.Banner && bannerCreated) { bannerReady = false; var callback = bannerLoaded; bannerLoaded = null; callback?.Invoke(AdLoad.Failed); } }
        /// <summary>隐藏横幅。</summary>
        public void HideBanner() { thread.Require(); bannerVisible = false; if (bannerCreated) MaxSdk.HideBanner(units.Banner); }
        /// <summary>销毁横幅和其自动刷新。</summary>
        public void DestroyBanner() { thread.Require(); bannerVisible = false; bannerReady = false; bannerLoaded = null; if (bannerCreated) { MaxSdk.DestroyBanner(units.Banner); bannerCreated = false; } }
        /// <summary>释放未展示资源；保留已受理的真实奖励回调。</summary>
        public void Dispose() { thread.Require(); if (disposed) return; disposed = true; generation++; initialization.Dispose(); DestroyBanner(); if (requests.Count == 0) Unsubscribe(); }
    }
}
#endif
