package org.appcreator.mobilesdks;

import android.app.Activity;
import com.google.firebase.analytics.FirebaseAnalytics;
import org.json.JSONObject;

/** 直接调用 Firebase Android Analytics，独立维护采集开关。 */
public final class FirebaseAnalyticsBridge {
    private FirebaseAnalytics analytics;
    private boolean enabled;
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private FirebaseAnalyticsBridge() {}
    /** 在 Activity 组合根中显式注册，注册本身不初始化 SDK。 */
    public static void register(Activity activity) {
        FirebaseAnalyticsBridge owner = new FirebaseAnalyticsBridge();
        SdkBridge.register(activity, "firebase.analytics", owner::handle);
    }
    /** 每个分支直接执行指定 Firebase 方法，并区分 SDK 受理和平台统计结果。 */
    private void handle(Activity activity, String operation, JSONObject payload, SdkBridge.Reply reply) throws Exception {
        if (operation.equals("initialize")) {
            FirebaseAppProvider.get(activity.getApplicationContext());
            analytics = FirebaseAnalytics.getInstance(activity.getApplicationContext());
            analytics.setAnalyticsCollectionEnabled(false);
            enabled = false;
            reply.success(null);
            return;
        }
        if (analytics == null) { reply.fail("firebase-analytics-not-ready"); return; }
        if (operation.equals("setCollectionEnabled")) {
            enabled = payload.getBoolean("enabled"); analytics.setAnalyticsCollectionEnabled(enabled); reply.success(null); return;
        }
        if (!enabled) { reply.fail("analytics-disabled"); return; }
        switch (operation) {
            case "logEvent": analytics.logEvent(payload.getString("name"), SdkBridge.analyticsBundle(payload.optJSONObject("parameters"))); break;
            case "setUserId": analytics.setUserId(payload.isNull("userId") ? null : payload.getString("userId")); break;
            case "setUserProperty": analytics.setUserProperty(payload.getString("name"), payload.isNull("value") ? null : payload.getString("value")); break;
            default: reply.fail("unsupported-analytics-operation"); return;
        }
        reply.success(null);
    }
}
