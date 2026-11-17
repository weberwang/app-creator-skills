package org.appcreator.dirichlet;

import android.app.Activity;
import org.json.JSONException;
import org.json.JSONObject;

/** 持有进程唯一的聚合 SDK 所有者，Cocos 与 Capacitor 只提供各自传输层。 */
public final class DirichletRuntime {
    /** 由实际宿主将广告事件交还给当前业务。 */
    public interface EventSink {
        /** 发送具有原展示身份的事件。 */
        void send(JSONObject event);
    }
    /** 将真实操作结果交还给调用方。 */
    public interface Result {
        /** 真实操作完成。 */
        void success();
        /** 返回脱敏错误类别。 */
        void fail(String code);
    }
    private static DirichletRuntime shared;
    private final DirichletAndroidVendor vendor;
    private final DirichletAds ads;

    /** SDK 的全局初始化只能由本所有者管理。 */
    private DirichletRuntime(Activity activity) { vendor = new DirichletAndroidVendor(activity); ads = new DirichletAds(vendor); }

    /** Activity 重建只更新宿主弱引用，不丢弃已受理展示或重新初始化 SDK。 */
    public static synchronized DirichletRuntime get(Activity activity) {
        if (shared == null) shared = new DirichletRuntime(activity);
        // 旧 Activity 的横幅视图不能由进程级单例持有，否则重建后会泄漏窗口。
        else if (shared.vendor.attach(activity)) shared.ads.removeBanner();
        return shared;
    }

    /** 在主线程将显式桥接操作映射至具名聚合 SDK 能力。 */
    public void invoke(String method, JSONObject options, EventSink sink, Result result) {
        if (method == null || options == null || result == null) throw new IllegalArgumentException("request");
        DirichletAds.Completion completion = new DirichletAds.Completion() {
            private boolean finished;
            /** 相同请求只回复一次，即使厂商错误回调重复到达。 */
            @Override public void success() { if (finished) return; finished = true; result.success(); }
            /** 仅返回稳定错误类别。 */
            @Override public void fail(String code) { if (finished) return; finished = true; result.fail(code); }
        };
        try {
            switch (method) {
                case "initialize":
                    ads.initialize(string(options, "mediaId"), string(options, "mediaName"), string(options, "mediaKey"),
                        bool(options, "initializationAllowed"), bool(options, "requestsAllowed"), bool(options, "nonPersonalizedNetworksConfigured"),
                        optionalDebug(options), completion); return;
                case "loadRewarded": ads.loadRewarded(string(options, "adUnitId"), completion); return;
                case "loadInterstitial": ads.loadInterstitial(string(options, "adUnitId"), completion); return;
                case "showRewarded": ads.showRewarded(string(options, "adUnitId"), string(options, "requestId"), events(sink), completion); return;
                case "showInterstitial": ads.showInterstitial(string(options, "adUnitId"), string(options, "requestId"), events(sink), completion); return;
                case "showBanner": ads.showBanner(string(options, "adUnitId"), string(options, "position"), completion); return;
                case "hideBanner": ads.hideBanner(); completion.success(); return;
                case "removeBanner": ads.removeBanner(); completion.success(); return;
                case "setRequestsAllowed": ads.setRequestsAllowed(bool(options, "allowed")); completion.success(); return;
                case "dispose": ads.dispose(); completion.success(); return;
                default: completion.fail("unsupported-operation");
            }
        } catch (JSONException | RuntimeException error) { completion.fail("invalid-request"); }
    }

    /** 将官方真实事件与受理时的 requestId 原样关联。 */
    private static DirichletAds.Events events(EventSink sink) {
        if (sink == null) throw new IllegalArgumentException("event-sink");
        return (kind, format, adUnitId, requestId, verified, type, amount) -> {
            JSONObject event = new JSONObject();
            try {
                event.put("kind", kind); event.put("format", format); event.put("adUnitId", adUnitId); event.put("requestId", requestId);
                if ("reward".equals(kind)) {
                    JSONObject reward = new JSONObject(); reward.put("type", type); reward.put("amount", amount);
                    event.put("reward", reward); event.put("verified", verified);
                }
                sink.send(event);
            } catch (JSONException ignored) { /* 无效事件不得转化成伪造的奖励。 */ }
        };
    }

    /** 严格要求字符串，避免自动转换导致广告位精度丢失。 */
    private static String string(JSONObject data, String key) throws JSONException {
        Object value = data.get(key); if (!(value instanceof String)) throw new JSONException("invalid-string"); return (String) value;
    }
    /** 所有授权字段必须显式为布尔值，缺失和字符串均不能当作同意。 */
    private static boolean bool(JSONObject data, String key) throws JSONException {
        Object value = data.get(key); if (!(value instanceof Boolean)) throw new JSONException("invalid-boolean"); return (Boolean) value;
    }
    /** 默认关闭调试；指定时也要求真实布尔值。 */
    private static boolean optionalDebug(JSONObject data) throws JSONException { return !data.has("debug") ? false : bool(data, "debug"); }
}
