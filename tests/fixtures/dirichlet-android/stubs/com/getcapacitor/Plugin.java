package com.getcapacitor;
import androidx.appcompat.app.AppCompatActivity;

/** 编译夹具：提供 Capacitor 7 插件调用接口。 */
public class Plugin {
    /** 返回当前 Activity。 */
    public AppCompatActivity getActivity() { return null; }
    /** 仅通知本插件事件。 */
    protected void notifyListeners(String event, JSObject data) {}
}
