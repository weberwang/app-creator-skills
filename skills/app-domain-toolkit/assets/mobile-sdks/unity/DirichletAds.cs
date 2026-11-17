#if APP_CREATOR_DIRICHLET_SDK
using System;
using System.Collections.Generic;
using Dirichlet.Mediation;

namespace AppCreator.MobileSdk
{
    /// <summary>管理官方广告对象及其真实回调。</summary>
    public sealed partial class DirichletManager
    {
        /// <summary>一次原生加载保留独立代次和合并的业务回调。</summary>
        private sealed class LoadAttempt<T> where T : DirichletAd
        {
            internal readonly int Generation;
            internal readonly List<Action<AdLoad>> Waiters = new List<Action<AdLoad>>();
            internal bool Done;
            internal T Returned;
            /// <summary>捕获当前隐私策略代次。</summary>
            internal LoadAttempt(int generation) { Generation = generation; }
        }

        /// <summary>保存一次激励展示和可能迟到的官方奖励结果。</summary>
        private sealed class RewardSession
        {
            internal DirichletRewardVideoAd Ad;
            internal string Id;
            internal Action<string, AdReward> Reward;
            internal Action<string, AdEnd> End;
            internal int Accepted;
            internal bool Closed, EndNotified, RewardReceived, RewardNotified, Released;
            internal DirichletRewardVerificationEventArgs RewardResult;
        }

        /// <summary>保存一次插屏展示，隔离同步关闭与展示结果。</summary>
        private sealed class InterstitialSession
        {
            internal DirichletInterstitialAd Ad;
            internal Action<AdEnd> End;
            internal int Accepted;
            internal bool Closed, Notified, Released;
        }

        private DirichletRewardVideoAd rewarded;
        private DirichletInterstitialAd interstitial;
        private DirichletBannerAd banner;
        private LoadAttempt<DirichletRewardVideoAd> rewardLoading;
        private LoadAttempt<DirichletInterstitialAd> interstitialLoading;
        private LoadAttempt<DirichletBannerAd> bannerLoading;
        private readonly HashSet<RewardSession> rewards = new HashSet<RewardSession>();
        private object activeShow;
        private int bannerGeneration;
        private BannerAnchor bannerAnchor;
        private bool bannerVisible;

        /// <summary>展示占用由当前具体对象持有，迟到关闭不能释放后续展示。</summary>
        private bool HasActiveShow => activeShow != null;

        /// <summary>检查原生广告真实就绪；原生异常视为不可展示。</summary>
        private static bool Ready(DirichletAd ad)
        {
            try { return ad != null && ad.IsLoaded && ad.IsValid; } catch { return false; }
        }

        /// <summary>安全释放当前对象，不让原生销毁异常阻断其他清理。</summary>
        private static void Destroy(DirichletAd ad) { try { ad?.Destroy(); } catch { } }

        /// <summary>先移除当前批次，再逐个通知，允许业务在回调中发起新请求。</summary>
        private static void NotifyWaiters<T>(LoadAttempt<T> attempt, AdLoad result) where T : DirichletAd
        {
            var pending = attempt.Waiters.ToArray(); attempt.Waiters.Clear();
            foreach (var waiter in pending) Notify(() => waiter(result));
        }

        /// <summary>未完成的旧代次不能加入新监听；同代次请求复用同一次加载。</summary>
        private bool Join<T>(LoadAttempt<T> attempt, Action<AdLoad> completed) where T : DirichletAd
        {
            if (attempt == null) return false;
            if (attempt.Generation != policyGeneration) Notify(() => completed?.Invoke(AdLoad.Failed));
            else if (completed != null) attempt.Waiters.Add(completed);
            return true;
        }

        /// <summary>仅对真实就绪且策略允许的实例后台加载插屏。</summary>
        public void LoadInterstitial(Action<AdLoad> completed)
        {
            thread.Require();
            if (!CanRequest()) { Notify(() => completed?.Invoke(AdLoad.Failed)); return; }
            if (Join(interstitialLoading, completed)) return;
            if (Ready(interstitial)) { Notify(() => completed?.Invoke(AdLoad.Loaded)); return; }
            Destroy(interstitial); interstitial = null;
            var loader = Loader();
            if (loader == null) { Notify(() => completed?.Invoke(AdLoad.Failed)); return; }
            var attempt = new LoadAttempt<DirichletInterstitialAd>(policyGeneration);
            if (completed != null) attempt.Waiters.Add(completed);
            interstitialLoading = attempt;
            try
            {
                loader.LoadInterstitialAd(Request(units.Interstitial), ad =>
                {
                    if (attempt.Done) { if (!ReferenceEquals(ad, attempt.Returned)) Destroy(ad); return; }
                    attempt.Done = true; attempt.Returned = ad;
                    if (ReferenceEquals(interstitialLoading, attempt)) interstitialLoading = null;
                    bool valid = !disposed && attempt.Generation == policyGeneration && CanRequest() && Ready(ad);
                    if (valid) interstitial = ad; else Destroy(ad);
                    NotifyWaiters(attempt, valid ? AdLoad.Loaded : AdLoad.Failed);
                }, error => FailInterstitialLoad(attempt));
            }
            catch { FailInterstitialLoad(attempt); }
        }

        /// <summary>加载失败仅结束该次尝试，不清除新代次的状态。</summary>
        private void FailInterstitialLoad(LoadAttempt<DirichletInterstitialAd> attempt)
        {
            if (attempt.Done) return;
            attempt.Done = true;
            if (ReferenceEquals(interstitialLoading, attempt)) interstitialLoading = null;
            NotifyWaiters(attempt, AdLoad.Failed);
        }

        /// <summary>立即尝试展示已加载插屏；厂商拒绝展示时释放本次资源。</summary>
        public bool ShowInterstitial(Action<AdEnd> ended)
        {
            thread.Require();
            if (!CanRequest() || activeShow != null || !Ready(interstitial)) return false;
            var session = new InterstitialSession { Ad = interstitial, End = ended };
            interstitial = null; activeShow = session;
            session.Ad.Closed += () => CloseInterstitial(session);
            bool accepted;
            try { accepted = session.Ad.Show(); } catch { accepted = false; }
            session.Accepted = accepted ? 1 : -1;
            if (!accepted) FinishInterstitial(session, AdEnd.Failed);
            else if (session.Closed) FinishInterstitial(session, AdEnd.Closed);
            return accepted;
        }

        /// <summary>同步关闭先暂存，避免厂商 Show 返回失败后误报关闭成功。</summary>
        private void CloseInterstitial(InterstitialSession session)
        {
            if (session.Released || session.Closed) return;
            session.Closed = true;
            if (session.Accepted == 1) FinishInterstitial(session, AdEnd.Closed);
        }

        /// <summary>只结束对应插屏，并释放其官方对象。</summary>
        private void FinishInterstitial(InterstitialSession session, AdEnd result)
        {
            if (session.Released) return;
            session.Released = true;
            if (ReferenceEquals(activeShow, session)) activeShow = null;
            if (!session.Notified) { session.Notified = true; Notify(() => session.End?.Invoke(result)); }
            Destroy(session.Ad);
        }

        /// <summary>后台加载激励广告并合并同代次加载请求。</summary>
        public void LoadRewarded(Action<AdLoad> completed)
        {
            thread.Require();
            if (!CanRequest()) { Notify(() => completed?.Invoke(AdLoad.Failed)); return; }
            if (Join(rewardLoading, completed)) return;
            if (Ready(rewarded)) { Notify(() => completed?.Invoke(AdLoad.Loaded)); return; }
            Destroy(rewarded); rewarded = null;
            var loader = Loader();
            if (loader == null) { Notify(() => completed?.Invoke(AdLoad.Failed)); return; }
            var attempt = new LoadAttempt<DirichletRewardVideoAd>(policyGeneration);
            if (completed != null) attempt.Waiters.Add(completed);
            rewardLoading = attempt;
            try
            {
                loader.LoadRewardVideoAd(Request(units.Rewarded), ad =>
                {
                    if (attempt.Done) { if (!ReferenceEquals(ad, attempt.Returned)) Destroy(ad); return; }
                    attempt.Done = true; attempt.Returned = ad;
                    if (ReferenceEquals(rewardLoading, attempt)) rewardLoading = null;
                    bool valid = !disposed && attempt.Generation == policyGeneration && CanRequest() && Ready(ad);
                    if (valid) rewarded = ad; else Destroy(ad);
                    NotifyWaiters(attempt, valid ? AdLoad.Loaded : AdLoad.Failed);
                }, error => FailRewardLoad(attempt));
            }
            catch { FailRewardLoad(attempt); }
        }

        /// <summary>只失败当前激励加载，不伪造广告就绪。</summary>
        private void FailRewardLoad(LoadAttempt<DirichletRewardVideoAd> attempt)
        {
            if (attempt.Done) return;
            attempt.Done = true;
            if (ReferenceEquals(rewardLoading, attempt)) rewardLoading = null;
            NotifyWaiters(attempt, AdLoad.Failed);
        }

        /// <summary>即时发起已加载激励；原始广告对象持有唯一请求身份和真实奖励回调。</summary>
        public bool ShowRewarded(string requestId, Action<string, AdReward> reward, Action<string, AdEnd> ended)
        {
            thread.Require();
            if (string.IsNullOrWhiteSpace(requestId)) throw new ArgumentException("奖励请求必须有唯一身份。", nameof(requestId));
            if (!CanRequest() || activeShow != null || !Ready(rewarded)) return false;
            lock (OwnerGate)
            {
                // 原生未提供奖励终态超时；容量满时拒绝新展示，不能删除旧记录后猜测归属。
                if (pendingRewards >= PendingRewardLimit) return false;
                pendingRewards++;
            }
            var session = new RewardSession { Ad = rewarded, Id = requestId, Reward = reward, End = ended };
            rewarded = null; rewards.Add(session); activeShow = session;
            session.Ad.Closed += () => CloseReward(session);
            session.Ad.RewardVerified += result => VerifyReward(session, result);
            bool accepted;
            try { accepted = session.Ad.Show(); } catch { accepted = false; }
            session.Accepted = accepted ? 1 : -1;
            if (!accepted) { Notify(() => session.End?.Invoke(session.Id, AdEnd.Failed)); ReleaseReward(session); }
            else DeliverRewardEvents(session);
            return accepted;
        }

        /// <summary>关闭只代表展示结束，奖励可能在关闭后真实到达。</summary>
        private void CloseReward(RewardSession session)
        {
            if (session.Released || session.Closed) return;
            session.Closed = true;
            if (session.Accepted == 1) DeliverRewardEvents(session);
        }

        /// <summary>按官方 IsVerified 判断奖励，忽略同一展示的重复验证事件。</summary>
        private void VerifyReward(RewardSession session, DirichletRewardVerificationEventArgs result)
        {
            if (session.Released || session.RewardReceived || result == null) return;
            session.RewardReceived = true; session.RewardResult = result;
            if (session.Accepted == 1) DeliverRewardEvents(session);
        }

        /// <summary>分别投递真实关闭和奖励；页面释放不会丢失已受理展示的迟到奖励。</summary>
        private void DeliverRewardEvents(RewardSession session)
        {
            if (session.Released || session.Accepted != 1) return;
            if (session.Closed && !session.EndNotified)
            {
                session.EndNotified = true;
                if (ReferenceEquals(activeShow, session)) activeShow = null;
                Notify(() => session.End?.Invoke(session.Id, AdEnd.Closed));
            }
            if (session.RewardReceived && !session.RewardNotified)
            {
                session.RewardNotified = true;
                if (session.RewardResult.IsVerified)
                    Notify(() => session.Reward?.Invoke(session.Id, new AdReward(session.RewardResult.RewardName, session.RewardResult.RewardAmount)));
            }
            if (session.Closed && session.RewardReceived) ReleaseReward(session);
        }

        /// <summary>只有该展示关闭且奖励终态已知，或展示未受理时才注销原生对象。</summary>
        private void ReleaseReward(RewardSession session)
        {
            if (session.Released) return;
            session.Released = true;
            if (ReferenceEquals(activeShow, session)) activeShow = null;
            if (rewards.Remove(session)) lock (OwnerGate) pendingRewards--;
            Destroy(session.Ad);
        }

        /// <summary>按需加载横幅；隐藏通过销毁实现，避免不存在的官方 Hide 接口。</summary>
        public void ShowBanner(BannerAnchor anchor, Action<AdLoad> loaded)
        {
            thread.Require();
            if (!CanRequest()) { Notify(() => loaded?.Invoke(AdLoad.Failed)); return; }
            if (bannerVisible && banner != null && bannerAnchor == anchor) { Notify(() => loaded?.Invoke(AdLoad.Loaded)); return; }
            if (bannerLoading != null)
            {
                if (bannerAnchor == anchor && bannerLoading.Generation == policyGeneration)
                { if (loaded != null) bannerLoading.Waiters.Add(loaded); }
                else Notify(() => loaded?.Invoke(AdLoad.Failed));
                return;
            }
            DestroyBanner();
            var loader = Loader();
            if (loader == null) { Notify(() => loaded?.Invoke(AdLoad.Failed)); return; }
            bannerVisible = true; bannerAnchor = anchor;
            int epoch = bannerGeneration;
            var attempt = new LoadAttempt<DirichletBannerAd>(policyGeneration);
            if (loaded != null) attempt.Waiters.Add(loaded);
            bannerLoading = attempt;
            try
            {
                loader.LoadBannerAd(Request(units.Banner), ad =>
                {
                    if (attempt.Done) { if (!ReferenceEquals(ad, attempt.Returned)) Destroy(ad); return; }
                    attempt.Done = true; attempt.Returned = ad;
                    if (ReferenceEquals(bannerLoading, attempt)) bannerLoading = null;
                    bool valid = !disposed && bannerVisible && epoch == bannerGeneration && attempt.Generation == policyGeneration &&
                        CanRequest() && Ready(ad);
                    if (valid)
                    {
                        banner = ad;
                        ad.Closed += () => { if (ReferenceEquals(banner, ad)) { banner = null; bannerVisible = false; Destroy(ad); } };
                        try { valid = ad.Show(new DirichletAdShowOptions { BannerAlignment = anchor == BannerAnchor.Top ? DirichletBannerAlignment.Top : DirichletBannerAlignment.Bottom, BannerOffset = 0 }); }
                        catch { valid = false; }
                    }
                    if (!valid) { if (ReferenceEquals(banner, ad)) banner = null; Destroy(ad); }
                    NotifyWaiters(attempt, valid ? AdLoad.Loaded : AdLoad.Failed);
                }, error => FailBannerLoad(attempt));
            }
            catch { FailBannerLoad(attempt); }
        }

        /// <summary>失败后清理当前横幅加载状态，不改变更新的展示意图。</summary>
        private void FailBannerLoad(LoadAttempt<DirichletBannerAd> attempt)
        {
            if (attempt.Done) return;
            attempt.Done = true;
            if (ReferenceEquals(bannerLoading, attempt)) bannerLoading = null;
            NotifyWaiters(attempt, AdLoad.Failed);
        }

        /// <summary>隐藏横幅并释放原生视图，避免继续刷新。</summary>
        public void HideBanner() { DestroyBanner(); }

        /// <summary>使在途横幅加载失效，旧回调到达后只销毁其对象。</summary>
        public void DestroyBanner()
        {
            thread.Require();
            bannerVisible = false; bannerGeneration++;
            if (bannerLoading != null) NotifyWaiters(bannerLoading, AdLoad.Failed);
            Destroy(banner); banner = null;
        }

        /// <summary>释放策略变更前的未展示缓存并通知等待中的加载调用方。</summary>
        private void InvalidateUnshown()
        {
            Destroy(interstitial); interstitial = null;
            Destroy(rewarded); rewarded = null;
            if (interstitialLoading != null) NotifyWaiters(interstitialLoading, AdLoad.Failed);
            if (rewardLoading != null) NotifyWaiters(rewardLoading, AdLoad.Failed);
            DestroyBanner();
        }
    }
}
#endif
