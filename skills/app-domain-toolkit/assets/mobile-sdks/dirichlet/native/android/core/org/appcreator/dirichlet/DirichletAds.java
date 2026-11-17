package org.appcreator.dirichlet;

import java.util.HashMap;
import java.util.Map;

/** 独立管理聚合广告的授权、加载和展示；所有方法及厂商回调均由宿主主线程调用。 */
public final class DirichletAds {
    /** 每个原生调用只交付一次完成或脱敏错误。 */
    public interface Completion {
        /** 真实操作完成。 */
        void success();
        /** 返回脱敏错误类别。 */
        void fail(String code);
    }
    /** 加载成功只交付真实厂商广告对象。 */
    public interface Loaded<T> {
        /** 加载完成并交付广告对象。 */
        void success(T value);
        /** 加载失败。 */
        void fail(String code);
    }
    /** 把真实展示事件绑定至受理时的请求和业务所有者。 */
    public interface Events {
        /** 按原展示身份交付事件。 */
        void event(String kind, String format, String adUnitId, String requestId, boolean verified, String rewardType, int rewardAmount);
    }
    /** 已加载广告的最小生命周期。 */
    public interface Ad {
        /** 检查厂商对象是否有效。 */
        boolean isValid();
        /** 释放厂商对象。 */
        void destroy();
    }
    /** 激励广告实际展示及结果回调。 */
    public interface RewardAd extends Ad {
        /** 展示并接收官方激励回调。 */
        void show(RewardEvents events);
    }
    /** 插屏广告实际展示及关闭回调。 */
    public interface InterstitialAd extends Ad {
        /** 展示并接收关闭回调。 */
        void show(InterstitialEvents events);
    }
    /** 横幅广告视图生命周期。 */
    public interface BannerAd extends Ad {
        /** 在已确认的位置展示。 */
        void show(String position);
        /** 隐藏本对象视图。 */
        void hide();
    }
    /** 厂商真实激励验证与关闭信号。 */
    public interface RewardEvents {
        /** 展示已关闭。 */
        void closed();
        /** 交付真实奖励验证结果。 */
        void verified(boolean valid, int amount, String type);
    }
    /** 厂商真实插屏关闭信号。 */
    public interface InterstitialEvents {
        /** 插屏已关闭。 */
        void closed();
    }
    /** 厂商实现负责调用官方 SDK，测试使用可控对象重放回调。 */
    public interface Vendor {
        /** 在实际请求前恢复非个性化设置。 */
        void applyNonPersonalized();
        /** 初始化真实聚合 SDK。 */
        void initialize(long mediaId, String mediaName, String mediaKey, boolean debug, Completion completion);
        /** 异步加载真实激励对象。 */
        void loadRewarded(long adUnitId, Loaded<RewardAd> result);
        /** 异步加载真实插屏对象。 */
        void loadInterstitial(long adUnitId, Loaded<InterstitialAd> result);
        /** 异步加载真实横幅对象。 */
        void loadBanner(long adUnitId, Loaded<BannerAd> result);
    }

    /** 一次全屏展示在关闭之后仍可能收到有效奖励。 */
    private static final class Show {
        final String format, adUnitId, requestId;
        final Ad ad;
        final Events events;
        boolean closed, rewarded, failed;
        /** 将受理展示绑定至原业务所有者。 */
        Show(String format, String adUnitId, String requestId, Ad ad, Events events) {
            this.format = format; this.adUnitId = adUnitId; this.requestId = requestId; this.ad = ad; this.events = events;
        }
    }

    private static final int PENDING_LIMIT = 128;
    private final Vendor vendor;
    private final Map<String, Show> pendingRewards = new HashMap<>();
    private boolean initialized, initializing, allowed, disposed;
    private long mediaId;
    private String mediaName, mediaKey;
    private int epoch, bannerEpoch;
    private RewardAd reward;
    private String rewardUnit;
    private InterstitialAd interstitial;
    private String interstitialUnit;
    private BannerAd banner;
    private String bannerUnit;
    private boolean rewardLoading, interstitialLoading, bannerLoading;
    private Show active;

    /** 构造不初始化 SDK，也不触发广告或网络请求。 */
    public DirichletAds(Vendor vendor) {
        if (vendor == null) throw new IllegalArgumentException("vendor");
        this.vendor = vendor;
    }

    /** 初始化前应用聚合非个性化设置，独立核对用户授权与其他网络配置。 */
    public void initialize(String id, String name, String key, boolean initializationAllowed, boolean requestsAllowed,
                           boolean nonPersonalizedNetworksConfigured, boolean debug, Completion completion) {
        if (completion == null) throw new IllegalArgumentException("completion");
        if (disposed) { completion.fail("disposed"); return; }
        if (!initializationAllowed || !requestsAllowed || !nonPersonalizedNetworksConfigured) { completion.fail("privacy-not-configured"); return; }
        long parsed;
        try { parsed = positiveId(id); } catch (RuntimeException error) { completion.fail("invalid-media-id"); return; }
        if (empty(name) || empty(key)) { completion.fail("invalid-media-config"); return; }
        if (initializing) { completion.fail("initialization-pending"); return; }
        if (initialized) {
            if (mediaId != parsed || !name.equals(mediaName) || !key.equals(mediaKey)) { completion.fail("different-media-config"); return; }
            allowed = requestsAllowed; completion.success(); return;
        }
        try { vendor.applyNonPersonalized(); } catch (RuntimeException error) { completion.fail("privacy-configuration-failed"); return; }
        initializing = true;
        allowed = requestsAllowed;
        final int attempt = epoch;
        try {
            vendor.initialize(parsed, name, key, debug, new Completion() {
                /** SDK 实际返回后才标记初始化成功，失效回调不可恢复状态。 */
                public void success() {
                    if (!initializing) return;
                    initializing = false;
                    initialized = true; mediaId = parsed; mediaName = name; mediaKey = key;
                    if (disposed || attempt != epoch) { completion.fail("initialization-obsolete"); return; }
                    completion.success();
                }
                /** 不向 JS 返回 SDK 可能包含敏感内容的异常消息。 */
                public void fail(String code) {
                    if (!initializing) return;
                    initializing = false; completion.fail("initialization-failed");
                }
            });
        } catch (RuntimeException error) { initializing = false; completion.fail("initialization-failed"); }
    }

    /** 更新请求授权；撤回时废弃缓存及在途加载，已受理奖励仍保留原回调。 */
    public void setRequestsAllowed(boolean value) {
        if (disposed) return;
        allowed = value;
        if (!value) { epoch++; bannerEpoch++; clearCached(); }
    }

    /** 后台加载激励广告，不在展示入口中等待加载。 */
    public void loadRewarded(String unit, Completion completion) {
        if (!prepareLoad(unit, completion)) return;
        if (reward != null && unit.equals(rewardUnit) && reward.isValid()) { completion.success(); return; }
        if (rewardLoading) { completion.fail("load-pending"); return; }
        destroy(reward); reward = null; rewardUnit = null; rewardLoading = true;
        final int attempt = epoch;
        try { vendor.loadRewarded(positiveId(unit), new Loaded<RewardAd>() {
            private boolean finished;
            /** 仅在当前授权和代次仍有效时缓存加载结果。 */
            public void success(RewardAd ad) {
                if (finished) return; finished = true;
                rewardLoading = false;
                if (!current(attempt) || ad == null || !ad.isValid()) { destroy(ad); completion.fail("load-obsolete"); return; }
                reward = ad; rewardUnit = unit; completion.success();
            }
            /** 真实加载失败不会推断可以展示。 */
            public void fail(String code) { if (finished) return; finished = true; rewardLoading = false; completion.fail("load-failed"); }
        }); } catch (RuntimeException error) { rewardLoading = false; completion.fail("load-failed"); }
    }

    /** 后台加载插屏广告，重复的在途加载不会创建另一个实例。 */
    public void loadInterstitial(String unit, Completion completion) {
        if (!prepareLoad(unit, completion)) return;
        if (interstitial != null && unit.equals(interstitialUnit) && interstitial.isValid()) { completion.success(); return; }
        if (interstitialLoading) { completion.fail("load-pending"); return; }
        destroy(interstitial); interstitial = null; interstitialUnit = null; interstitialLoading = true;
        final int attempt = epoch;
        try { vendor.loadInterstitial(positiveId(unit), new Loaded<InterstitialAd>() {
            private boolean finished;
            /** 已撤回授权或释放的旧对象不得重新成为可展示状态。 */
            public void success(InterstitialAd ad) {
                if (finished) return; finished = true;
                interstitialLoading = false;
                if (!current(attempt) || ad == null || !ad.isValid()) { destroy(ad); completion.fail("load-obsolete"); return; }
                interstitial = ad; interstitialUnit = unit; completion.success();
            }
            /** 不暴露厂商错误原文。 */
            public void fail(String code) { if (finished) return; finished = true; interstitialLoading = false; completion.fail("load-failed"); }
        }); } catch (RuntimeException error) { interstitialLoading = false; completion.fail("load-failed"); }
    }

    /** 展示已加载的激励广告；奖励仅来自该对象的验证通过回调。 */
    public void showRewarded(String unit, String requestId, Events events, Completion completion) {
        if (!prepareShow(unit, requestId, events, completion)) return;
        if (pendingRewards.size() >= PENDING_LIMIT || pendingRewards.containsKey(requestId)) { completion.fail("reward-capacity"); return; }
        if (reward == null || !unit.equals(rewardUnit) || !reward.isValid()) { completion.fail("not-ready"); return; }
        RewardAd ad = reward; reward = null; rewardUnit = null;
        Show show = new Show("rewarded", unit, requestId, ad, events);
        pendingRewards.put(requestId, show); active = show;
        try {
            ad.show(new RewardEvents() {
                /** 关闭只释放全屏占用；未知奖励仍保留原对象等待迟到验证。 */
                public void closed() {
                    if (show.closed || show.failed) return;
                    show.closed = true; if (active == show) active = null;
                    emit(show, "closed", false, null, 0);
                    if (show.rewarded) settle(show);
                }
                /** 只有厂商明确验证通过才发奖，重复回调不会重复结算。 */
                public void verified(boolean valid, int amount, String type) {
                    if (!valid || show.failed || show.rewarded || amount <= 0) return;
                    show.rewarded = true; emit(show, "reward", true, type == null ? "" : type, amount);
                    if (show.closed) settle(show);
                }
            });
            completion.success();
        } catch (RuntimeException error) {
            // SDK 若已同步交付关闭或可信奖励，不能把真实展示回退为未受理。
            if (show.closed || show.rewarded) completion.success();
            else { failShow(show); completion.fail("show-failed"); }
        }
    }

    /** 展示已加载插屏，并与激励共用同一个全屏互斥状态。 */
    public void showInterstitial(String unit, String requestId, Events events, Completion completion) {
        if (!prepareShow(unit, requestId, events, completion)) return;
        if (interstitial == null || !unit.equals(interstitialUnit) || !interstitial.isValid()) { completion.fail("not-ready"); return; }
        InterstitialAd ad = interstitial; interstitial = null; interstitialUnit = null;
        Show show = new Show("interstitial", unit, requestId, ad, events); active = show;
        try {
            ad.show(() -> {
                if (show.closed || show.failed) return;
                show.closed = true; if (active == show) active = null;
                emit(show, "closed", false, null, 0); destroy(show.ad);
            });
            completion.success();
        } catch (RuntimeException error) {
            if (show.closed) completion.success();
            else { failShow(show); completion.fail("show-failed"); }
        }
    }

    /** 根据已确认的安全区域加载并展示横幅，离开时独立隐藏或销毁。 */
    public void showBanner(String unit, String position, Completion completion) {
        if (!prepareLoad(unit, completion)) return;
        if (!"top".equals(position) && !"bottom".equals(position)) { completion.fail("invalid-position"); return; }
        if (bannerLoading) { completion.fail("load-pending"); return; }
        if (banner != null && unit.equals(bannerUnit) && banner.isValid()) {
            try { banner.show(position); completion.success(); } catch (RuntimeException error) { completion.fail("show-failed"); }
            return;
        }
        destroy(banner); banner = null; bannerUnit = null; bannerLoading = true;
        final int attempt = epoch, bannerAttempt = bannerEpoch;
        try { vendor.loadBanner(positiveId(unit), new Loaded<BannerAd>() {
            private boolean finished;
            /** 加载完成后复核授权和页面意图，防止迟到横幅覆盖游戏。 */
            public void success(BannerAd ad) {
                if (finished) return; finished = true;
                bannerLoading = false;
                if (!current(attempt) || bannerAttempt != bannerEpoch || ad == null || !ad.isValid()) { destroy(ad); completion.fail("load-obsolete"); return; }
                banner = ad; bannerUnit = unit;
                try { ad.show(position); completion.success(); } catch (RuntimeException error) { destroy(ad); banner = null; bannerUnit = null; completion.fail("show-failed"); }
            }
            /** 不以横幅请求发出推断广告已经加载。 */
            public void fail(String code) { if (finished) return; finished = true; bannerLoading = false; completion.fail("load-failed"); }
        }); } catch (RuntimeException error) { bannerLoading = false; completion.fail("load-failed"); }
    }

    /** 隐藏横幅同时使尚未加载完成的展示意图失效。 */
    public void hideBanner() { bannerEpoch++; if (banner != null) banner.hide(); }
    /** 移除横幅只销毁本模块拥有的原生视图。 */
    public void removeBanner() { bannerEpoch++; destroy(banner); banner = null; bannerUnit = null; }
    /** 禁止新请求并释放缓存；已受理展示和原业务回调仍保留至实际结算。 */
    public void dispose() { if (disposed) return; disposed = true; allowed = false; epoch++; bannerEpoch++; clearCached(); }

    /** 请求前逐次设置平台非个性化，不能用上次初始化结果代替当前策略。 */
    private boolean prepareLoad(String unit, Completion completion) {
        if (!canRequest(completion)) return false;
        try { positiveId(unit); vendor.applyNonPersonalized(); return true; }
        catch (RuntimeException error) { completion.fail("invalid-ad-unit-or-privacy"); return false; }
    }
    /** 展示不触发加载；全屏未关闭时其他展示立即失败。 */
    private boolean prepareShow(String unit, String requestId, Events events, Completion completion) {
        if (!canRequest(completion)) return false;
        if (empty(unit) || empty(requestId) || events == null) { completion.fail("invalid-show"); return false; }
        if (active != null) { completion.fail("busy"); return false; }
        try { vendor.applyNonPersonalized(); return true; } catch (RuntimeException error) { completion.fail("privacy-configuration-failed"); return false; }
    }
    /** 每次业务调用复查 SDK 和请求授权状态。 */
    private boolean canRequest(Completion completion) {
        if (completion == null) throw new IllegalArgumentException("completion");
        if (disposed) { completion.fail("disposed"); return false; }
        if (!initialized) { completion.fail("not-ready"); return false; }
        if (!allowed) { completion.fail("restricted"); return false; }
        return true;
    }
    /** 仅允许真实正整数字符串，避免精度丢失或溢出。 */
    private static long positiveId(String value) {
        if (value == null || !value.matches("[0-9]+")) throw new IllegalArgumentException("id");
        long parsed = Long.parseLong(value); if (parsed <= 0) throw new IllegalArgumentException("id"); return parsed;
    }
    /** 判定配置是否为空白，不打印媒体密钥。 */
    private static boolean empty(String value) { return value == null || value.trim().isEmpty(); }
    /** 验证异步加载所属策略代次。 */
    private boolean current(int attempt) { return !disposed && allowed && initialized && attempt == epoch; }
    /** 释放广告资源的失败不影响其他格式与真实奖励回调。 */
    private static void destroy(Ad ad) { if (ad != null) try { ad.destroy(); } catch (RuntimeException ignored) {} }
    /** 仅清理未受理展示的缓存，不销毁正在展示或待结算的对象。 */
    private void clearCached() { destroy(reward); reward = null; rewardUnit = null; destroy(interstitial); interstitial = null; interstitialUnit = null; destroy(banner); banner = null; bannerUnit = null; }
    /** 通知业务事件时隔离观察者异常，避免丢失后续奖励或关闭。 */
    private static void emit(Show show, String kind, boolean verified, String type, int amount) {
        try { show.events.event(kind, show.format, show.adUnitId, show.requestId, verified, type, amount); } catch (RuntimeException ignored) {}
    }
    /** 奖励与关闭均已抵达，才释放该次广告对象。 */
    private void settle(Show show) { if (pendingRewards.get(show.requestId) == show) { pendingRewards.remove(show.requestId); destroy(show.ad); } }
    /** 同步展示失败只处理该次对象，不误操作后续展示。 */
    private void failShow(Show show) {
        if (show.failed || show.closed) return;
        show.failed = true; if (active == show) active = null;
        if (pendingRewards.get(show.requestId) == show) pendingRewards.remove(show.requestId);
        emit(show, "failed", false, null, 0); destroy(show.ad);
    }
}
