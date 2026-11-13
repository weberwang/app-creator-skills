package org.appcreator.mobilesdks;

import android.app.Activity;
import android.app.Application;
import com.appsflyer.AppsFlyerLib;
import com.appsflyer.share.AppsFlyerConversionListener;
import com.appsflyer.share.attribution.AppsFlyerRequestListener;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Map;

/** AppsFlyer Android SDK 7 的独立生命周期、事件和真实归因回调。 */
public final class AppsFlyerBridge implements AppsFlyerConversionListener {
    private static final AppsFlyerBridge OWNER = new AppsFlyerBridge();
    private final ArrayList<SdkBridge.Reply> waiters = new ArrayList<>();
    private final ArrayList<JSONObject> bufferedAttributions = new ArrayList<>();
    private Application application;
    private String key;
    private boolean initialized;
    private boolean allowed;
    private boolean requested;
    private boolean sessionReady;
    private boolean starting;
    private boolean started;
    private boolean bridgeReady;
    private long authorizationRevision;
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private AppsFlyerBridge() {}

    /** 已有授权时可在 Application.onCreate 早期配置，以保留 SDK 7 首次生命周期。 */
    public static void configureEarly(Application application, String devKey, boolean authorized) {
        if (authorized) OWNER.configure(application, devKey);
    }

    /** 注册当前 Activity；设备重建只更新窗口，不重新注册 SDK 监听。 */
    public static void register(Activity activity) { SdkBridge.register(activity, "appsflyer", OWNER::handle); }

    /** 单例 SDK 只允许同一 dev key 的一次初始化，避免 SDK 内生成第二套会话。 */
    private synchronized void configure(Application app, String devKey) {
        if (devKey == null || devKey.isEmpty()) throw new IllegalArgumentException("missing-key");
        if (initialized) { if (!key.equals(devKey)) throw new IllegalStateException("appsflyer-key-conflict"); return; }
        application = app;
        key = devKey;
        AppsFlyerLib sdk = AppsFlyerLib.getInstance();
        sdk.init(devKey, this, app);
        initialized = true;
        // SDK 7 的 session-ready 在后台线程回调，只在真实授权且收到启动意图后 start。
        sdk.registerSessionReadyListener(() -> {
            synchronized (AppsFlyerBridge.this) { sessionReady = true; }
            tryStart();
        });
    }

    /** 初始化、授权与归因事件均由 SDK 自己的具体原生 API 执行。 */
    private void handle(Activity activity, String operation, JSONObject payload, SdkBridge.Reply reply) throws Exception {
        switch (operation) {
            case "initialize": {
                String devKey = payload.getString("devKey");
                if (!payload.getBoolean("allowAttribution")) { reply.fail("attribution-not-authorized"); return; }
                // SDK 7 必须在 Application 启动阶段注册 session-ready，迟到注册无法保证冷启动归因。
                synchronized (this) {
                    if (!initialized) { reply.fail("appsflyer-early-configuration-required"); return; }
                    if (!key.equals(devKey)) { reply.fail("appsflyer-key-conflict"); return; }
                }
                synchronized (this) {
                    allowed = true;
                    requested = true;
                    bridgeReady = true;
                    for (JSONObject value : bufferedAttributions) SdkBridge.event("appsflyer", "conversion", null, null, value);
                    bufferedAttributions.clear();
                    if (started) { reply.success(null); return; }
                    waiters.add(reply);
                    sessionReady = sessionReady || AppsFlyerLib.getInstance().isSessionReady();
                }
                tryStart();
                return;
            }
            case "setAllowed": {
                boolean next = payload.getBoolean("allowed");
                synchronized (this) {
                    if (allowed != next) authorizationRevision++;
                    allowed = next;
                    if (!next) {
                        started = false; requested = false;
                        // 撤回授权时结束等待，不能让初始化永久挂起。
                        for (SdkBridge.Reply waiter : waiters) waiter.fail("attribution-not-authorized");
                        waiters.clear();
                    }
                }
                if (initialized) AppsFlyerLib.getInstance().stop(!next, application);
                reply.success(null);
                if (next) tryStart();
                return;
            }
            case "logEvent": {
                synchronized (this) { if (!allowed || !started) { reply.fail("appsflyer-not-ready"); return; } }
                AppsFlyerLib.getInstance().logEvent(activity.getApplicationContext(), payload.getString("name"), SdkBridge.eventMap(payload.optJSONObject("values")), new AppsFlyerRequestListener() {
                    @Override public void onSuccess() { reply.success(null); }
                    @Override public void onError(int code, String ignored) { reply.fail("appsflyer-event-" + code); }
                });
                return;
            }
            default: reply.fail("unsupported-appsflyer-operation");
        }
    }

    /** 唯一真实 SDK session-ready 信号到来后才启动；回调在后台线程时加锁防重。 */
    private void tryStart() {
        final long revision;
        synchronized (this) {
            if (!initialized || !allowed || !requested || !sessionReady || starting) return;
            starting = true; sessionReady = false; revision = authorizationRevision;
        }
        AppsFlyerLib.getInstance().start(new AppsFlyerRequestListener() {
            @Override public void onSuccess() {
                ArrayList<SdkBridge.Reply> result;
                final boolean accepted;
                synchronized (AppsFlyerBridge.this) {
                    starting = false;
                    // 撤回再授权后，旧请求成功不能代替新授权的会话结果。
                    accepted = allowed && revision == authorizationRevision;
                    started = accepted;
                    result = accepted ? new ArrayList<>(waiters) : new ArrayList<>();
                    if (accepted) waiters.clear();
                }
                for (SdkBridge.Reply reply : result) reply.success(null);
                tryStart();
            }
            @Override public void onError(int code, String ignored) {
                ArrayList<SdkBridge.Reply> result;
                synchronized (AppsFlyerBridge.this) { starting = false; result = revision == authorizationRevision ? new ArrayList<>(waiters) : new ArrayList<>(); if (revision == authorizationRevision) waiters.clear(); }
                for (SdkBridge.Reply reply : result) reply.fail("appsflyer-start-" + code);
                tryStart();
            }
        });
    }

    /** 冷启动归因可能早于 JS 桥接；保留结果直到业务可订阅，不能虚构归因。 */
    @Override public void onConversionDataSuccess(Map<String, Object> values) {
        JSONObject data = new JSONObject(values);
        synchronized (this) {
            if (!allowed) return;
            if (!bridgeReady) { bufferedAttributions.add(data); return; }
        }
        SdkBridge.event("appsflyer", "conversion", null, null, data);
    }
    /** 归因错误只传分类，不泄露原生异常详情。 */
    @Override public void onConversionDataFail(String ignored) {
        synchronized (this) { if (!allowed || !bridgeReady) return; }
        SdkBridge.event("appsflyer", "conversionError", null, null, "conversion-failed");
    }
}
