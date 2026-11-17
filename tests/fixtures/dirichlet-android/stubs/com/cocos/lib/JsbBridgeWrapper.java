package com.cocos.lib;

/** 编译夹具：对应 Cocos Creator JSB 的事件接口。 */
public final class JsbBridgeWrapper {
    /** Cocos 原生事件监听接口。 */
    public interface OnScriptEventListener { void onScriptEvent(String data); }
    /** 返回测试桥对象。 */
    public static JsbBridgeWrapper getInstance() { return new JsbBridgeWrapper(); }
    /** 注册脚本监听。 */
    public void addScriptEventListener(String name, OnScriptEventListener listener) {}
    /** 移除指定脚本监听。 */
    public boolean removeScriptEventListener(String name, OnScriptEventListener listener) { return true; }
    /** 向脚本发送事件。 */
    public void dispatchEventToScript(String name, String data) {}
}
