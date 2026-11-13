package org.appcreator.mobilesdks;

import android.app.Activity;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import com.applovin.sdk.*;
import com.applovin.mediation.*;
import com.applovin.mediation.ads.*;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;

/** AppLovin MAX 原生广告实现，奖励使用一次性 placement 关联展示请求。 */
public final class MaxBridge {
    private static final int MAX_PENDING_REWARDS = 128;
    private static final MaxBridge OWNER = new MaxBridge();
    private final Map<String, MaxRewardedAd> rewarded = new HashMap<>();
    private final Map<String, MaxInterstitialAd> interstitial = new HashMap<>();
    private final Map<String, MaxAdView> banners = new HashMap<>();
    private final Map<String, Long> rewards = new HashMap<>();
    // 展示关闭与奖励是独立回调，先发奖励不能抹掉关闭事件身份。
    private final Map<String, Long> presentations = new HashMap<>();
    private final Map<String, String> presentationUnits = new HashMap<>();
    private final Map<String, String> rewardUnits = new HashMap<>();
    private final Map<String, MaxRewardedAd> retainedRewarded = new HashMap<>();
    private final Map<String, SdkBridge.Reply> showReplies = new HashMap<>();
    private final Map<String, SdkBridge.Reply> rewardLoads = new HashMap<>();
    private final Map<String, SdkBridge.Reply> interstitialLoads = new HashMap<>();
    private final Set<String> retiredLoads = new HashSet<>();
    private boolean ready;
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private MaxBridge() {}

    /** 在 Cocos Activity 创建后注册选中的 MAX 广告入口。 */
    public static void register(Activity activity) { SdkBridge.register(activity, "max", OWNER::handle); }

    /** 已配置实际授权和 MAX 隐私流程后才初始化，后续调用直接进入 MAX SDK。 */
    private void handle(Activity activity, String operation, JSONObject payload, SdkBridge.Reply reply) throws Exception {
        if (operation.equals("initialize")) {
            if (!payload.optBoolean("nonPersonalizedVerified") || !payload.optBoolean("maxFlowConfigured")) { reply.fail("ads-privacy-not-configured"); return; }
            if (ready) { reply.success(null); return; }
            String key = payload.getString("sdkKey");
            if (key.isEmpty()) { reply.fail("max-missing-key"); return; }
            AppLovinPrivacySettings.setHasUserConsent(payload.getBoolean("hasUserConsent"), activity);
            AppLovinSdkInitializationConfiguration config = AppLovinSdkInitializationConfiguration.builder(key).setMediationProvider(AppLovinMediationProvider.MAX).build();
            AppLovinSdk.getInstance(activity).initialize(config, status -> { ready = true; reply.success(null); });
            return;
        }
        if (!ready) { reply.fail("max-not-ready"); return; }
        String id = payload.getString("adUnitId");
        if (id.isEmpty()) { reply.fail("missing-ad-unit"); return; }
        switch (operation) {
            case "loadRewarded": {
                if (retiredLoads.contains(id)) { reply.fail("ad-previous-load-pending"); return; }
                if (rewardLoads.containsKey(id) || interstitialLoads.containsKey(id)) { reply.fail("ad-load-in-progress"); return; }
                rewardLoads.put(id, reply);
                MaxRewardedAd ad = rewarded.get(id);
                if (ad == null) { ad = MaxRewardedAd.getInstance(id, activity); rewarded.put(id, ad); }
                MaxRewardedAd target = ad;
                ad.setListener(new MaxRewardedAdListener() {
                    @Override public void onAdLoaded(MaxAd value) { if (retiredLoads.remove(id) || rewardLoads.get(id) != reply) return; rewardLoads.remove(id); reply.success(null); SdkBridge.event("max", "loaded", id, null, null); }
                    @Override public void onAdLoadFailed(String ignored, MaxError error) { if (retiredLoads.remove(id) || rewardLoads.get(id) != reply) return; rewardLoads.remove(id); reply.fail("ad-load-failed"); SdkBridge.event("max", "loadFailed", id, null, null); }
                    @Override public void onAdDisplayed(MaxAd value) { SdkBridge.Reply pending = showReplies.remove(value.getPlacement()); if (pending != null) pending.success(null); SdkBridge.event("max", "shown", id, rewards.get(value.getPlacement()), null); }
                    @Override public void onAdHidden(MaxAd value) { String token = value.getPlacement(); Long requestId = presentations.remove(token); presentationUnits.remove(token); SdkBridge.event("max", "closed", id, requestId, null); releaseRewardedIfSettled(id); }
                    @Override public void onAdClicked(MaxAd value) {}
                    @Override public void onAdDisplayFailed(MaxAd value, MaxError error) { String token = value.getPlacement(); SdkBridge.Reply pending = showReplies.remove(token); Long requestId = presentations.remove(token); rewards.remove(token); presentationUnits.remove(token); rewardUnits.remove(token); releaseRewardedIfSettled(id); if (pending != null) pending.fail("ad-show-failed"); SdkBridge.event("max", "showFailed", id, requestId, null); }
                    @Override public void onUserRewarded(MaxAd value, MaxReward reward) {
                        // 同一 token 只结算一次，迟到奖励仍按原展示关联，绝不借用当前请求。
                        Long requestId = rewards.remove(value.getPlacement());
                        rewardUnits.remove(value.getPlacement()); releaseRewardedIfSettled(id);
                        if (requestId != null) SdkBridge.event("max", "earned", id, requestId, null);
                    }
                });
                target.loadAd(); return;
            }
            case "showRewarded": {
                MaxRewardedAd ad = rewarded.get(id);
                if (ad == null || !ad.isReady()) { reply.fail("ad-not-ready"); return; }
                // 保留可能迟到的可信奖励；达到上限就拒绝新展示，不靠超时或关闭事件丢弃旧记录。
                if (rewards.size() >= MAX_PENDING_REWARDS || presentations.size() >= MAX_PENDING_REWARDS) { reply.fail("pending-reward-capacity-reached"); return; }
                String placement = UUID.randomUUID().toString(); rewards.put(placement, reply.id()); presentations.put(placement, reply.id()); presentationUnits.put(placement, id); rewardUnits.put(placement, id); showReplies.put(placement, reply);
                ad.showAd(placement); return;
            }
            case "loadInterstitial": {
                if (retiredLoads.contains(id)) { reply.fail("ad-previous-load-pending"); return; }
                if (interstitialLoads.containsKey(id) || rewardLoads.containsKey(id)) { reply.fail("ad-load-in-progress"); return; }
                interstitialLoads.put(id, reply);
                MaxInterstitialAd ad = interstitial.get(id);
                if (ad == null) { ad = new MaxInterstitialAd(id, activity); interstitial.put(id, ad); }
                ad.setListener(new MaxAdListener() {
                    @Override public void onAdLoaded(MaxAd value) { if (retiredLoads.remove(id) || interstitialLoads.get(id) != reply) return; interstitialLoads.remove(id); reply.success(null); SdkBridge.event("max", "loaded", id, null, null); }
                    @Override public void onAdLoadFailed(String ignored, MaxError error) { if (retiredLoads.remove(id) || interstitialLoads.get(id) != reply) return; interstitialLoads.remove(id); reply.fail("ad-load-failed"); SdkBridge.event("max", "loadFailed", id, null, null); }
                    @Override public void onAdDisplayed(MaxAd value) { SdkBridge.Reply pending = showReplies.remove(value.getPlacement()); if (pending != null) pending.success(null); SdkBridge.event("max", "shown", id, pending == null ? null : pending.id(), null); }
                    @Override public void onAdHidden(MaxAd value) { SdkBridge.event("max", "closed", id, presentations.remove(value.getPlacement()), null); }
                    @Override public void onAdClicked(MaxAd value) {}
                    @Override public void onAdDisplayFailed(MaxAd value, MaxError error) { SdkBridge.Reply pending = showReplies.remove(value.getPlacement()); Long requestId = presentations.remove(value.getPlacement()); if (pending != null) pending.fail("ad-show-failed"); SdkBridge.event("max", "showFailed", id, requestId, null); }
                }); ad.loadAd(); return;
            }
            case "showInterstitial": {
                MaxInterstitialAd ad = interstitial.get(id);
                if (ad == null || !ad.isReady()) { reply.fail("ad-not-ready"); return; }
                if (presentations.size() >= MAX_PENDING_REWARDS) { reply.fail("pending-presentation-capacity-reached"); return; }
                String placement = UUID.randomUUID().toString(); showReplies.put(placement, reply); presentations.put(placement, reply.id()); ad.showAd(placement); return;
            }
            case "createBanner": {
                if (banners.containsKey(id)) { reply.fail("banner-already-exists"); return; }
                String position = payload.getString("position");
                if (!position.equals("top") && !position.equals("bottom")) { reply.fail("invalid-banner-position"); return; }
                MaxAdView view = new MaxAdView(id, activity); banners.put(id, view);
                view.setListener(new MaxAdViewAdListener() {
                    @Override public void onAdLoaded(MaxAd value) { reply.success(null); SdkBridge.event("max", "loaded", id, null, null); }
                    @Override public void onAdLoadFailed(String ignored, MaxError error) { reply.fail("ad-load-failed"); SdkBridge.event("max", "loadFailed", id, null, null); }
                    @Override public void onAdDisplayed(MaxAd value) {}
                    @Override public void onAdHidden(MaxAd value) {}
                    @Override public void onAdClicked(MaxAd value) {}
                    @Override public void onAdDisplayFailed(MaxAd value, MaxError error) {}
                    @Override public void onAdExpanded(MaxAd value) {}
                    @Override public void onAdCollapsed(MaxAd value) {}
                });
                int height = (int) (50 * activity.getResources().getDisplayMetrics().density);
                activity.addContentView(view, new FrameLayout.LayoutParams(-1, height, Gravity.CENTER_HORIZONTAL | (position.equals("top") ? Gravity.TOP : Gravity.BOTTOM)));
                view.loadAd(); return;
            }
            case "showBanner": case "hideBanner": {
                MaxAdView view = banners.get(id);
                if (view == null) { reply.fail("banner-not-found"); return; }
                if (operation.equals("showBanner")) view.startAutoRefresh(); else view.stopAutoRefresh();
                view.setVisibility(operation.equals("showBanner") ? View.VISIBLE : View.GONE); reply.success(null); return;
            }
            case "destroyAd": {
                // 销毁后失效旧加载请求，迟到回调不能冒充新请求的结果。
                SdkBridge.Reply pendingReward = rewardLoads.remove(id); if (pendingReward != null) pendingReward.fail("ad-destroyed");
                SdkBridge.Reply pendingInterstitial = interstitialLoads.remove(id); if (pendingInterstitial != null) pendingInterstitial.fail("ad-destroyed");
                if (pendingReward != null || pendingInterstitial != null) retiredLoads.add(id);
                MaxRewardedAd r = rewarded.remove(id); if (r != null) { if (rewardUnits.containsValue(id) || presentationUnits.containsValue(id)) retainedRewarded.put(id, r); else r.destroy(); }
                MaxInterstitialAd i = interstitial.remove(id); if (i != null) i.destroy();
                MaxAdView b = banners.remove(id); if (b != null) { if (b.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup)b.getParent()).removeView(b); b.destroy(); }
                reply.success(null); return;
            }
            default: reply.fail("unsupported-max-operation");
        }
    }

    /** 销毁时仍有奖励待决就保留 SDK 对象，最后一笔可信结果到来后释放。 */
    private void releaseRewardedIfSettled(String id) {
        if (rewardUnits.containsValue(id) || presentationUnits.containsValue(id)) return;
        MaxRewardedAd ad = retainedRewarded.remove(id);
        if (ad != null && rewarded.get(id) != ad) ad.destroy();
    }
}
