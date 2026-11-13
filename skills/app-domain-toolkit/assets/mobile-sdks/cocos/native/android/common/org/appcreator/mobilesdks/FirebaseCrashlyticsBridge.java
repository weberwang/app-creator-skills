package org.appcreator.mobilesdks;

import android.app.Activity;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import org.json.JSONObject;

/** 直接调用 Firebase Android Crashlytics，异常上报不依赖 Analytics 完成。 */
public final class FirebaseCrashlyticsBridge {
    private FirebaseCrashlytics crashlytics;
    private boolean enabled;
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private FirebaseCrashlyticsBridge() {}
    /** 显式注册桥接入口，不主动触发崩溃或发送日志。 */
    public static void register(Activity activity) {
        FirebaseCrashlyticsBridge owner = new FirebaseCrashlyticsBridge();
        SdkBridge.register(activity, "firebase.crashlytics", owner::handle);
    }
    /** 已确认采集策略后才允许发送业务异常。 */
    private void handle(Activity activity, String operation, JSONObject payload, SdkBridge.Reply reply) throws Exception {
        if (operation.equals("initialize")) {
            FirebaseAppProvider.get(activity.getApplicationContext());
            crashlytics = FirebaseCrashlytics.getInstance();
            crashlytics.setCrashlyticsCollectionEnabled(false);
            enabled = false;
            reply.success(null);
            return;
        }
        if (crashlytics == null) { reply.fail("firebase-crashlytics-not-ready"); return; }
        if (operation.equals("setCollectionEnabled")) {
            enabled = payload.getBoolean("enabled"); crashlytics.setCrashlyticsCollectionEnabled(enabled); reply.success(null); return;
        }
        if (!enabled) { reply.fail("crashlytics-disabled"); return; }
        switch (operation) {
            case "recordException": {
                JSONObject error = payload.getJSONObject("error");
                String stack = error.optString("stack", "");
                if (!stack.isEmpty()) crashlytics.log(stack);
                crashlytics.recordException(new RuntimeException(error.optString("name", "Error") + ": " + error.optString("message", "")));
                break;
            }
            case "log": crashlytics.log(payload.getString("message")); break;
            case "setCustomKey": {
                String key = payload.getString("key"); Object value = payload.get("value");
                if (value instanceof Boolean) crashlytics.setCustomKey(key, (Boolean) value);
                else if (value instanceof Integer || value instanceof Long) crashlytics.setCustomKey(key, ((Number) value).longValue());
                else if (value instanceof Number) crashlytics.setCustomKey(key, ((Number) value).doubleValue());
                else if (value instanceof String) crashlytics.setCustomKey(key, (String) value);
                else throw new IllegalArgumentException("invalid-custom-key");
                break;
            }
            case "setUserId": crashlytics.setUserId(payload.getString("userId")); break;
            default: reply.fail("unsupported-crashlytics-operation"); return;
        }
        reply.success(null);
    }
}
