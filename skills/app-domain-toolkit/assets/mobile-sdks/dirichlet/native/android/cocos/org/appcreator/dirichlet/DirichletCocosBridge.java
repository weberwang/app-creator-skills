package org.appcreator.dirichlet;

import android.app.Activity;
import com.cocos.lib.CocosHelper;
import com.cocos.lib.JsbBridgeWrapper;
import java.lang.ref.WeakReference;
import org.json.JSONException;
import org.json.JSONObject;

/** Cocos Creator 3.8 JSB 传输层，原生广告状态由进程唯一的 DirichletRuntime 管理。 */
public final class DirichletCocosBridge {
    private static final String REQUEST = "appcreator.dirichlet.request";
    private static final String RESPONSE = "appcreator.dirichlet.response";
    private static final String EVENT = "appcreator.dirichlet.event";
    private static WeakReference<Activity> host = new WeakReference<>(null);
    private static boolean registered;
    private static final JsbBridgeWrapper.OnScriptEventListener listener = DirichletCocosBridge::receive;

    /** 工具类不能被构造。 */
    private DirichletCocosBridge() {}

    /** 在 Activity 创建或重建时注册一次监听并替换当前宿主。 */
    public static synchronized void register(Activity activity) {
        if (activity == null) throw new IllegalArgumentException("activity");
        host = new WeakReference<>(activity);
        if (!registered) { JsbBridgeWrapper.getInstance().addScriptEventListener(REQUEST, listener); registered = true; }
    }

    /** 只移除本桥自己的请求监听，已受理广告结果仍可独立投递。 */
    public static synchronized void unregister() {
        if (registered) JsbBridgeWrapper.getInstance().removeScriptEventListener(REQUEST, listener);
        registered = false; host = new WeakReference<>(null);
    }

    /** 校验传输身份后切到 Android 主线程执行真实 SDK 调用。 */
    private static void receive(String raw) {
        final JSONObject request;
        final long id;
        final String method;
        final JSONObject options;
        try {
            request = new JSONObject(raw);
            Object rawId = request.get("id");
            if (!(rawId instanceof Number)) return;
            double numeric = ((Number) rawId).doubleValue();
            id = ((Number) rawId).longValue();
            if (id <= 0 || id > 9007199254740991L || numeric != id) return;
            Object rawMethod = request.get("method");
            if (!(rawMethod instanceof String)) { response(id, false, "invalid-request"); return; }
            method = (String) rawMethod;
            options = request.optJSONObject("options");
            if (options == null) { response(id, false, "invalid-request"); return; }
        } catch (JSONException | RuntimeException error) { return; }
        final Activity activity;
        synchronized (DirichletCocosBridge.class) { activity = host.get(); }
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) { response(id, false, "activity-unavailable"); return; }
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed()) { response(id, false, "activity-unavailable"); return; }
            synchronized (DirichletCocosBridge.class) {
                if (host.get() != activity) { response(id, false, "activity-unavailable"); return; }
            }
            try {
                DirichletRuntime.get(activity).invoke(method, options, DirichletCocosBridge::event, new DirichletRuntime.Result() {
                    /** 只有真实原生操作完成或展示已受理才回复成功。 */
                    @Override public void success() { response(id, true, null); }
                    /** 厂商失败按脱敏错误类别回复。 */
                    @Override public void fail(String code) { response(id, false, code); }
                });
            } catch (RuntimeException error) { response(id, false, "native-error"); }
        });
    }

    /** 响应在游戏线程送回 JS，requestId 保持与请求一致。 */
    private static void response(long id, boolean ok, String error) {
        JSONObject value = new JSONObject();
        try { value.put("id", id); value.put("ok", ok); if (error != null) value.put("error", error); }
        catch (JSONException ignored) { return; }
        dispatch(RESPONSE, value);
    }

    /** 原生广告事件保留业务展示请求的字符串身份。 */
    private static void event(JSONObject value) { dispatch(EVENT, value); }

    /** 只发送本模块事件，不覆盖项目其他 JSB 监听。 */
    private static void dispatch(String name, JSONObject value) {
        String raw = value.toString();
        CocosHelper.runOnGameThread(() -> JsbBridgeWrapper.getInstance().dispatchEventToScript(name, raw));
    }
}
