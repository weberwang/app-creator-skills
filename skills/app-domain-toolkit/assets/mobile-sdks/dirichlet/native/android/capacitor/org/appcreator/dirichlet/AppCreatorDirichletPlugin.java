package org.appcreator.dirichlet;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;
import org.json.JSONObject;

/** Capacitor Android 7 的 Dirichlet 聚合插件，广告状态由唯一原生运行时持有。 */
@CapacitorPlugin(name = "AppCreatorDirichlet")
public final class AppCreatorDirichletPlugin extends Plugin {
    /** 按显式授权配置初始化官方聚合 SDK。 */
    @PluginMethod public void initialize(PluginCall call) { invoke("initialize", call); }
    /** 在后台加载激励广告。 */
    @PluginMethod public void loadRewarded(PluginCall call) { invoke("loadRewarded", call); }
    /** 在后台加载插屏广告。 */
    @PluginMethod public void loadInterstitial(PluginCall call) { invoke("loadInterstitial", call); }
    /** 只展示已加载的激励广告。 */
    @PluginMethod public void showRewarded(PluginCall call) { invoke("showRewarded", call); }
    /** 只展示已加载的插屏广告。 */
    @PluginMethod public void showInterstitial(PluginCall call) { invoke("showInterstitial", call); }
    /** 按已确认位置加载并展示横幅。 */
    @PluginMethod public void showBanner(PluginCall call) { invoke("showBanner", call); }
    /** 隐藏自有横幅视图。 */
    @PluginMethod public void hideBanner(PluginCall call) { invoke("hideBanner", call); }
    /** 删除自有横幅视图。 */
    @PluginMethod public void removeBanner(PluginCall call) { invoke("removeBanner", call); }
    /** 更新请求授权，撤回时保留已受理展示的奖励回调。 */
    @PluginMethod public void setRequestsAllowed(PluginCall call) { invoke("setRequestsAllowed", call); }
    /** 禁止新的广告请求并清理未展示资源。 */
    @PluginMethod public void dispose(PluginCall call) { invoke("dispose", call); }

    /** 将具体方法投递到当前 Activity 主线程，插件请求仅在真实结果到达后完成。 */
    private void invoke(String method, PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) { call.reject("activity-unavailable", "activity-unavailable"); return; }
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed() || getActivity() != activity) { call.reject("activity-unavailable", "activity-unavailable"); return; }
            try {
                DirichletRuntime.get(activity).invoke(method, call.getData(), this::sendEvent, new DirichletRuntime.Result() {
                    /** SDK 确实完成或已经受理展示时才解析 Promise。 */
                    @Override public void success() { call.resolve(); }
                    /** 原生错误使用稳定分类，不暴露厂商原始消息。 */
                    @Override public void fail(String code) { call.reject(code, code); }
                });
            } catch (RuntimeException error) { call.reject("native-error", "native-error"); }
        });
    }

    /** 广告事件携带原字符串 requestId，由注册的业务监听器结算。 */
    private void sendEvent(JSONObject event) {
        try { notifyListeners("adEvent", new JSObject(event.toString())); }
        catch (JSONException ignored) { /* 损坏事件不得伪装为有效奖励。 */ }
    }
}
