package org.appcreator.mobilesdks;

import android.app.Activity;
import android.os.Bundle;
import com.cocos.lib.CocosHelper;
import com.cocos.lib.JsbBridgeWrapper;
import org.json.JSONObject;
import java.util.Iterator;
import java.util.HashMap;
import java.util.Map;
import java.lang.ref.WeakReference;
import java.util.concurrent.atomic.AtomicBoolean;

/** 仅处理 Cocos JSB 的消息关联和线程切换，不持有各 SDK 的业务状态。 */
public final class SdkBridge {
    /** SDK 原生实现收到已解析参数，必须以真实结果完成响应。 */
    public interface Handler { void handle(Activity activity, String operation, JSONObject payload, Reply reply) throws Exception; }
    private static final Map<String, Endpoint> LISTENERS = new HashMap<>();
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private SdkBridge() {}

    /** Activity 重建时复用 SDK 所有者并替换弱引用，避免保留已经销毁的窗口。 */
    private static final class Endpoint {
        private WeakReference<Activity> activity;
        private final Handler handler;
        private final JsbBridgeWrapper.OnScriptEventListener listener;
        /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
        private Endpoint(Activity activity, Handler handler) {
            this.activity = new WeakReference<>(activity);
            this.handler = handler;
            this.listener = this::receive;
        }
        /** 只更新宿主窗口，不重复注册 SDK 或丢弃已有 SDK 回调。 */
        private synchronized void attach(Activity value) { this.activity = new WeakReference<>(value); }
        /** 所有 SDK/UI 调用在当前 Activity 主线程执行。 */
        private void receive(String data) {
            final JSONObject message;
            try { message = new JSONObject(data); } catch (Exception ignored) { return; }
            final long id = message.optLong("id", -1);
            if (id < 0) return;
            final String operation = message.optString("operation", "");
            final JSONObject payload = message.optJSONObject("payload") == null ? new JSONObject() : message.optJSONObject("payload");
            final Reply reply = new Reply(id);
            final Activity host;
            synchronized (this) { host = activity.get(); }
            if (host == null || host.isFinishing() || host.isDestroyed()) { reply.fail("activity-unavailable"); return; }
            host.runOnUiThread(() -> {
                if (host.isFinishing() || host.isDestroyed()) { reply.fail("activity-unavailable"); return; }
                try { handler.handle(host, operation, payload, reply); }
                catch (Exception error) { reply.fail(error.getClass().getSimpleName()); }
            });
        }
    }

    /** 将请求注册为独立事件，避免覆盖其他原生插件的桥接回调。 */
    public static synchronized void register(Activity activity, String service, Handler handler) {
        final String event = "appcreator.mobile." + service;
        Endpoint existing = LISTENERS.get(event);
        if (existing != null) { existing.attach(activity); return; }
        Endpoint endpoint = new Endpoint(activity, handler);
        LISTENERS.put(event, endpoint);
        JsbBridgeWrapper.getInstance().addScriptEventListener(event, endpoint.listener);
    }

    /** 仅注销本 SDK 事件，不能清理其他 SDK 或游戏的桥接监听。 */
    public static synchronized void unregister(String service) {
        String event = "appcreator.mobile." + service;
        Endpoint endpoint = LISTENERS.remove(event);
        if (endpoint != null) JsbBridgeWrapper.getInstance().removeScriptEventListener(event, endpoint.listener);
    }

    /** 原生响应在第一次真实回调时结算；重复回调不会再次改变请求结果。 */
    public static final class Reply {
        private final long id;
        private final AtomicBoolean completed = new AtomicBoolean();
        /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
        private Reply(long id) { this.id = id; }
        /** 请求身份供广告展示回调和业务幂等结算关联。 */
        public long id() { return id; }
        /** 只在真实 SDK 结果或同步 API 成功后调用。 */
        public void success(Object value) { send(true, value, null); }
        /** 错误只暴露分类，不输出 SDK key、设备信息和原生异常全文。 */
        public void fail(String code) { send(false, null, code); }
        /** 原子防重后回调游戏线程。 */
        private void send(boolean ok, Object value, String error) {
            if (!completed.compareAndSet(false, true)) return;
            JSONObject output = new JSONObject();
            try { output.put("id", id); output.put("ok", ok); if (value != null) output.put("value", value); if (error != null) output.put("error", error); }
            catch (Exception ignored) { return; }
            dispatch("appcreator.mobile.response", output);
        }
    }

    /** 将 SDK 的奖励、关闭或归因回调原样关联到指定广告位和展示请求。 */
    public static void event(String source, String event, String adUnitId, Long requestId, Object value) {
        JSONObject output = new JSONObject();
        try {
            output.put("source", source); output.put("event", event);
            if (adUnitId != null) output.put("adUnitId", adUnitId);
            if (requestId != null) output.put("requestId", requestId);
            if (value != null) output.put("value", value);
        } catch (Exception ignored) { return; }
        dispatch("appcreator.mobile.event", output);
    }

    /** Cocos 3.8 规定脚本回调必须在游戏线程执行。 */
    private static void dispatch(String event, JSONObject value) {
        final String message = value.toString();
        CocosHelper.runOnGameThread(() -> JsbBridgeWrapper.getInstance().dispatchEventToScript(event, message));
    }

    /** 将仅含字符串和数字的事件参数转换为 Firebase 官方 Bundle。 */
    public static Bundle analyticsBundle(JSONObject values) throws Exception {
        Bundle result = new Bundle();
        if (values == null) return result;
        Iterator<String> keys = values.keys();
        while (keys.hasNext()) {
            String key = keys.next(); Object value = values.get(key);
            if (value instanceof String) result.putString(key, (String) value);
            else if (value instanceof Integer || value instanceof Long) result.putLong(key, ((Number) value).longValue());
            else if (value instanceof Number) result.putDouble(key, ((Number) value).doubleValue());
            else throw new IllegalArgumentException("unsupported-analytics-value");
        }
        return result;
    }

    /** 将 JSON 标量参数转换为 AppsFlyer 事件使用的键值对。 */
    public static Map<String, Object> eventMap(JSONObject values) throws Exception {
        Map<String, Object> result = new HashMap<>();
        if (values == null) return result;
        Iterator<String> keys = values.keys();
        while (keys.hasNext()) { String key = keys.next(); Object value = values.get(key); if (!(value instanceof String || value instanceof Number || value instanceof Boolean)) throw new IllegalArgumentException("unsupported-event-value"); result.put(key, value); }
        return result;
    }
}
