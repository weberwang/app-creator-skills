package org.appcreator.dirichlet;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.tapsdk.tapad.group.DirichletAdConfig;
import com.tapsdk.tapad.group.DirichletAdCustomController;
import com.tapsdk.tapad.group.DirichletAdManager;
import com.tapsdk.tapad.group.DirichletAdNative;
import com.tapsdk.tapad.group.DirichletAdRequest;
import com.tapsdk.tapad.group.DirichletSdk;
import com.tapsdk.tapad.group.ads.DirichletBannerAd;
import com.tapsdk.tapad.group.ads.DirichletInterstitialAd;
import com.tapsdk.tapad.group.ads.DirichletRewardVideoAd;
import com.tapsdk.tapad.group.constants.Constants;
import java.lang.ref.WeakReference;

/** 直接调用 TapADN Android 聚合 SDK 5.3.3.0，不依赖具体游戏引擎。 */
public final class DirichletAndroidVendor implements DirichletAds.Vendor {
    private final Handler main = new Handler(Looper.getMainLooper());
    private WeakReference<Activity> host = new WeakReference<>(null);
    private WeakReference<Activity> loaderHost = new WeakReference<>(null);
    private DirichletAdNative loader;

    /** 保存当前窗口的弱引用；窗口重建不重建 SDK 全局状态。 */
    public DirichletAndroidVendor(Activity activity) { attach(activity); }

    /** 更新真实宿主窗口，广告展示必须使用当前有效 Activity。 */
    public boolean attach(Activity activity) {
        if (activity == null) throw new IllegalArgumentException("activity");
        Activity previous = host.get();
        host = new WeakReference<>(activity);
        if (loaderHost.get() != activity) { loader = null; loaderHost = new WeakReference<>(activity); }
        return previous != null && previous != activity;
    }

    /** 每次进程启动和广告请求前恢复 SDK 自身的非个性化限制。 */
    @Override public void applyNonPersonalized() {
        DirichletSdk.putMediaGlobalSettings(Constants.Personalization.PERSONAL_ADS_TYPE, Constants.Personalization.PERSONAL_ADS_TYPE_LIMIT);
    }

    /** 根据项目配置初始化真实聚合 SDK，敏感标识不进入日志。 */
    @Override public void initialize(long id, String name, String key, boolean debug, DirichletAds.Completion completion) {
        Activity activity = activity();
        DirichletAdConfig config = new DirichletAdConfig.Builder()
            .withMediaId(id).withMediaName(name).withMediaKey(key).enableDebug(debug).shakeEnabled(false)
            // SDK 的采集开关默认开启；未收到独立用途授权时显式关闭。
            .withCustomController(new DirichletAdCustomController() {
                @Override public boolean isCanUseLocation() { return false; }
                @Override public boolean isCanUsePhoneState() { return false; }
                @Override public boolean isCanUseWifiState() { return false; }
                @Override public boolean isCanUsePhoneMacAddress() { return false; }
                @Override public boolean isCanUseBssid() { return false; }
                @Override public boolean isCanUseSsid() { return false; }
                @Override public boolean isCanUseSensor() { return false; }
                @Override public boolean isCanUseWriteExternal() { return false; }
                @Override public boolean isCanUseOaid() { return false; }
                @Override public boolean alist() { return false; }
                @Override public boolean isCanUseAndroidId() { return false; }
            }).build();
        DirichletSdk.init(activity.getApplicationContext(), config, new DirichletSdk.InitListener() {
            /** 厂商回调统一切回 Android 主线程。 */
            @Override public void onInitSuccess() { dispatch(completion::success); }
            /** 隐藏厂商消息，避免泄漏媒体信息。 */
            @Override public void onInitFail(int code, String message) { dispatch(() -> completion.fail("initialization-failed")); }
        });
    }

    /** 调用官方加载接口，只有真实加载回调才返回广告对象。 */
    @Override public void loadRewarded(long id, DirichletAds.Loaded<DirichletAds.RewardAd> result) {
        nativeLoader().loadRewardVideoAd(request(id), new DirichletAdNative.RewardVideoAdListener() {
            /** 包装当前真实广告实例，其回调只属于该次展示。 */
            @Override public void onRewardVideoAdLoad(DirichletRewardVideoAd ad) { dispatch(() -> result.success(ad == null ? null : new Reward(ad))); }
            /** 错误文本不传播到 JavaScript。 */
            @Override public void onError(int code, String message) { dispatch(() -> result.fail("load-failed")); }
        });
    }

    /** 调用官方插屏加载接口，不自动展示。 */
    @Override public void loadInterstitial(long id, DirichletAds.Loaded<DirichletAds.InterstitialAd> result) {
        nativeLoader().loadInterstitialAd(request(id), new DirichletAdNative.InterstitialAdListener() {
            /** 包装真实插屏对象。 */
            @Override public void onInterstitialAdLoad(DirichletInterstitialAd ad) { dispatch(() -> result.success(ad == null ? null : new Interstitial(ad))); }
            /** 错误文本不传播到 JavaScript。 */
            @Override public void onError(int code, String message) { dispatch(() -> result.fail("load-failed")); }
        });
    }

    /** 按宿主当前宽度和常用横幅高度请求官方横幅视图。 */
    @Override public void loadBanner(long id, DirichletAds.Loaded<DirichletAds.BannerAd> result) {
        Activity current = activity();
        WeakReference<Activity> owner = new WeakReference<>(current);
        float density = current.getResources().getDisplayMetrics().density;
        if (density <= 0) throw new IllegalStateException("display-density-unavailable");
        int width = Math.max(1, Math.round(current.getResources().getDisplayMetrics().widthPixels / density));
        DirichletAdRequest request = new DirichletAdRequest.Builder().withSpaceId(id).withExpressViewAcceptedSize(width, 50).build();
        nativeLoader().loadBannerAd(request, new DirichletAdNative.BannerAdListener() {
            /** 横幅视图只能在其真实宿主 Activity 中挂载。 */
            @Override public void onBannerAdLoad(DirichletBannerAd ad) { dispatch(() -> result.success(ad == null ? null : new Banner(ad, owner.get()))); }
            /** 错误文本不传播到 JavaScript。 */
            @Override public void onError(int code, String message) { dispatch(() -> result.fail("load-failed")); }
        });
    }

    /** 每个 Activity 按官方要求持有一个加载器，窗口重建后按需更换。 */
    private DirichletAdNative nativeLoader() {
        Activity activity = activity();
        if (loader == null || loaderHost.get() != activity) {
            loader = DirichletAdManager.get().createAdNative(activity);
            loaderHost = new WeakReference<>(activity);
        }
        if (loader == null) throw new IllegalStateException("loader-unavailable");
        return loader;
    }

    /** 验证窗口未失效，避免对销毁的 Activity 创建或展示广告。 */
    private Activity activity() {
        Activity activity = host.get();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) throw new IllegalStateException("activity-unavailable");
        return activity;
    }

    /** 保持广告事件的真实主线程顺序。 */
    private void dispatch(Runnable action) { if (Looper.myLooper() == Looper.getMainLooper()) action.run(); else main.post(action); }

    /** 创建带真实广告位的官方请求，不填造用户或奖励标识。 */
    private static DirichletAdRequest request(long id) { return new DirichletAdRequest.Builder().withSpaceId(id).build(); }

    /** 一个官方激励广告与其唯一展示结果的适配。 */
    private final class Reward implements DirichletAds.RewardAd {
        private final DirichletRewardVideoAd ad;
        /** 保存官方已加载对象。 */
        private Reward(DirichletRewardVideoAd ad) { this.ad = ad; }
        /** 就绪以官方对象的有效性为准。 */
        @Override public boolean isValid() { return ad.isValid(); }
        /** 展示前绑定此对象的回调，关闭不推断奖励。 */
        @Override public void show(DirichletAds.RewardEvents events) {
            ad.setRewardAdInteractionListener(new DirichletRewardVideoAd.RewardAdInteractionListener() {
                /** 展示通知不发放奖励。 */
                @Override public void onAdShow() {}
                /** 用户关闭后仍允许可信奖励迟到。 */
                @Override public void onAdClose() { dispatch(events::closed); }
                /** 奖励是否成立来自 SDK 的实际验证标志。 */
                @Override public void onRewardVerify(boolean valid, int amount, String type, int code, String message) { dispatch(() -> events.verified(valid, amount, type)); }
                /** 点击不代表奖励完成。 */
                @Override public void onAdClick() {}
            });
            ad.showRewardVideoAd(activity());
        }
        /** 所有者结算完成后释放厂商对象。 */
        @Override public void destroy() { ad.destroy(); }
    }

    /** 一个官方插屏广告与其关闭事件的适配。 */
    private final class Interstitial implements DirichletAds.InterstitialAd {
        private final DirichletInterstitialAd ad;
        /** 保存官方已加载对象。 */
        private Interstitial(DirichletInterstitialAd ad) { this.ad = ad; }
        /** 就绪以官方对象的有效性为准。 */
        @Override public boolean isValid() { return ad.isValid(); }
        /** 只将关闭映射为该对象的展示结束。 */
        @Override public void show(DirichletAds.InterstitialEvents events) {
            ad.setInteractionListener(new DirichletInterstitialAd.InterstitialAdInteractionListener() {
                /** 展示不等于关闭。 */
                @Override public void onAdShow() {}
                /** 将实际关闭事件投递给原所有者。 */
                @Override public void onAdClose() { dispatch(events::closed); }
                /** 点击不表示关闭。 */
                @Override public void onAdClick() {}
            });
            ad.show(activity());
        }
        /** 关闭或失败后释放厂商对象。 */
        @Override public void destroy() { ad.destroy(); }
    }

    /** 横幅只操作自己创建的容器，避免清空游戏页面或其他插件视图。 */
    private final class Banner implements DirichletAds.BannerAd {
        private final DirichletBannerAd ad;
        private final WeakReference<Activity> owner;
        private FrameLayout container;
        /** 绑定加载时的 Activity，防止旧视图挂到重建后的窗口。 */
        private Banner(DirichletBannerAd ad, Activity activity) { this.ad = ad; owner = new WeakReference<>(activity); }
        /** 原窗口失效时，横幅对象不可继续展示。 */
        @Override public boolean isValid() { return owner.get() != null && owner.get() == host.get() && ad.isValid(); }
        /** 将真实 SDK 视图挂到本模块独立容器。 */
        @Override public void show(String position) {
            Activity current = activity();
            if (owner.get() != current) throw new IllegalStateException("banner-activity-obsolete");
            View view = ad.getBannerView();
            if (view == null) throw new IllegalStateException("banner-view-unavailable");
            if (container == null) {
                if (view.getParent() != null) throw new IllegalStateException("banner-already-attached");
                container = new FrameLayout(current);
                FrameLayout.LayoutParams outer = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                    ("top".equals(position) ? Gravity.TOP : Gravity.BOTTOM) | Gravity.CENTER_HORIZONTAL);
                current.addContentView(container, outer);
                container.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
            } else {
                FrameLayout.LayoutParams outer = (FrameLayout.LayoutParams) container.getLayoutParams();
                outer.gravity = ("top".equals(position) ? Gravity.TOP : Gravity.BOTTOM) | Gravity.CENTER_HORIZONTAL;
                container.setLayoutParams(outer);
            }
            container.setVisibility(View.VISIBLE);
        }
        /** 隐藏自有容器，保留广告供原页面再次展示。 */
        @Override public void hide() { if (container != null) container.setVisibility(View.GONE); }
        /** 销毁前仅移除自己的容器和 SDK 对象。 */
        @Override public void destroy() {
            if (container != null && container.getParent() instanceof ViewGroup) ((ViewGroup) container.getParent()).removeView(container);
            container = null; ad.destroy();
        }
    }
}
