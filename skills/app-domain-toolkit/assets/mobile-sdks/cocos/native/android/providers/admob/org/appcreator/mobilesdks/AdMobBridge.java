package org.appcreator.mobilesdks;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.gms.ads.rewarded.*;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/** AdMob 原生广告实现，仅在项目选中 AdMob 时复制和注册。 */
public final class AdMobBridge {
    private static final AdMobBridge OWNER = new AdMobBridge();
    private final Map<String, RewardedAd> rewarded = new HashMap<>();
    private final Map<String, InterstitialAd> interstitial = new HashMap<>();
    private final Map<String, AdView> banners = new HashMap<>();
    private final Map<String, SdkBridge.Reply> pendingRewardLoads = new HashMap<>();
    private final Map<String, SdkBridge.Reply> pendingInterstitialLoads = new HashMap<>();
    private final Map<String, SdkBridge.Reply> pendingBanners = new HashMap<>();
    private boolean ready;
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private AdMobBridge() {}

    /** 在 Cocos Activity 创建后注册唯一广告提供方。 */
    public static void register(Activity activity) { SdkBridge.register(activity, "admob", OWNER::handle); }

    /** 每次请求显式使用非个性化参数，项目仍需验证全部聚合网络的隐私配置。 */
    private AdRequest request() {
        Bundle extras = new Bundle(); extras.putString("npa", "1");
        return new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class, extras).build();
    }

    /** 将已选广告操作直接映射到 Google Mobile Ads API。 */
    private void handle(Activity activity, String operation, JSONObject payload, SdkBridge.Reply reply) throws Exception {
        if (operation.equals("initialize")) {
            if (!payload.optBoolean("nonPersonalizedVerified")) { reply.fail("ads-privacy-not-configured"); return; }
            if (ready) { reply.success(null); return; }
            MobileAds.initialize(activity, status -> { ready = true; reply.success(null); });
            return;
        }
        if (!ready) { reply.fail("admob-not-ready"); return; }
        String id = payload.getString("adUnitId");
        if (id.isEmpty()) { reply.fail("missing-ad-unit"); return; }
        switch (operation) {
            case "loadRewarded":
                if (pendingRewardLoads.containsKey(id)) { reply.fail("ad-load-in-progress"); return; }
                pendingRewardLoads.put(id, reply);
                RewardedAd.load(activity, id, request(), new RewardedAdLoadCallback() {
                    @Override public void onAdLoaded(RewardedAd ad) { if (pendingRewardLoads.get(id) != reply) return; pendingRewardLoads.remove(id); rewarded.put(id, ad); reply.success(null); SdkBridge.event("admob", "loaded", id, null, null); }
                    @Override public void onAdFailedToLoad(LoadAdError error) { if (pendingRewardLoads.get(id) != reply) return; pendingRewardLoads.remove(id); reply.fail("ad-load-failed"); SdkBridge.event("admob", "loadFailed", id, null, null); }
                }); return;
            case "showRewarded": {
                RewardedAd ad = rewarded.remove(id);
                if (ad == null) { reply.fail("ad-not-ready"); return; }
                final long requestId = reply.id();
                final AtomicBoolean awarded = new AtomicBoolean();
                ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override public void onAdShowedFullScreenContent() { reply.success(null); SdkBridge.event("admob", "shown", id, requestId, null); }
                    @Override public void onAdDismissedFullScreenContent() { SdkBridge.event("admob", "closed", id, requestId, null); }
                    @Override public void onAdFailedToShowFullScreenContent(AdError error) { reply.fail("ad-show-failed"); SdkBridge.event("admob", "showFailed", id, requestId, null); }
                });
                // 只有 SDK 的奖励回调可以发放奖励，关闭回调不能用于结算。
                ad.show(activity, reward -> { if (awarded.compareAndSet(false, true)) SdkBridge.event("admob", "earned", id, requestId, null); }); return;
            }
            case "loadInterstitial":
                if (pendingInterstitialLoads.containsKey(id)) { reply.fail("ad-load-in-progress"); return; }
                pendingInterstitialLoads.put(id, reply);
                InterstitialAd.load(activity, id, request(), new InterstitialAdLoadCallback() {
                    @Override public void onAdLoaded(InterstitialAd ad) { if (pendingInterstitialLoads.get(id) != reply) return; pendingInterstitialLoads.remove(id); interstitial.put(id, ad); reply.success(null); SdkBridge.event("admob", "loaded", id, null, null); }
                    @Override public void onAdFailedToLoad(LoadAdError error) { if (pendingInterstitialLoads.get(id) != reply) return; pendingInterstitialLoads.remove(id); reply.fail("ad-load-failed"); SdkBridge.event("admob", "loadFailed", id, null, null); }
                }); return;
            case "showInterstitial": {
                InterstitialAd ad = interstitial.remove(id);
                if (ad == null) { reply.fail("ad-not-ready"); return; }
                long requestId = reply.id();
                ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override public void onAdShowedFullScreenContent() { reply.success(null); SdkBridge.event("admob", "shown", id, requestId, null); }
                    @Override public void onAdDismissedFullScreenContent() { SdkBridge.event("admob", "closed", id, requestId, null); }
                    @Override public void onAdFailedToShowFullScreenContent(AdError error) { reply.fail("ad-show-failed"); SdkBridge.event("admob", "showFailed", id, requestId, null); }
                }); ad.show(activity); return;
            }
            case "createBanner": {
                if (banners.containsKey(id)) { reply.fail("banner-already-exists"); return; }
                String position = payload.getString("position");
                if (!position.equals("top") && !position.equals("bottom")) { reply.fail("invalid-banner-position"); return; }
                AdView view = new AdView(activity); view.setAdUnitId(id); view.setAdSize(AdSize.BANNER);
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER_HORIZONTAL | (position.equals("top") ? Gravity.TOP : Gravity.BOTTOM));
                activity.addContentView(view, params); banners.put(id, view); pendingBanners.put(id, reply);
                view.setAdListener(new AdListener() {
                    @Override public void onAdLoaded() { if (banners.get(id) != view) return; pendingBanners.remove(id); reply.success(null); SdkBridge.event("admob", "loaded", id, null, null); }
                    @Override public void onAdFailedToLoad(LoadAdError error) { if (banners.get(id) != view) return; pendingBanners.remove(id); reply.fail("ad-load-failed"); SdkBridge.event("admob", "loadFailed", id, null, null); }
                }); view.loadAd(request()); return;
            }
            case "showBanner": case "hideBanner": {
                AdView view = banners.get(id);
                if (view == null) { reply.fail("banner-not-found"); return; }
                view.setVisibility(operation.equals("showBanner") ? View.VISIBLE : View.GONE); reply.success(null); return;
            }
            case "destroyAd": {
                // 销毁使旧加载请求失效；迟到回调不得重新放回缓存。
                SdkBridge.Reply pendingReward = pendingRewardLoads.remove(id); if (pendingReward != null) pendingReward.fail("ad-destroyed");
                SdkBridge.Reply pendingInterstitial = pendingInterstitialLoads.remove(id); if (pendingInterstitial != null) pendingInterstitial.fail("ad-destroyed");
                SdkBridge.Reply pendingBanner = pendingBanners.remove(id); if (pendingBanner != null) pendingBanner.fail("ad-destroyed");
                rewarded.remove(id); interstitial.remove(id); AdView view = banners.remove(id);
                if (view != null) { if (view.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup)view.getParent()).removeView(view); view.destroy(); }
                reply.success(null); return;
            }
            default: reply.fail("unsupported-admob-operation");
        }
    }
}
