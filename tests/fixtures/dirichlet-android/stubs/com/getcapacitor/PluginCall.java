package com.getcapacitor;

/** 编译夹具：提供 Capacitor 7 的调用与完成接口。 */
public class PluginCall {
    /** 返回已经解析的请求对象。 */
    public JSObject getData() { return null; }
    /** 完成无返回值调用。 */
    public void resolve() {}
    /** 使用稳定错误类别拒绝调用。 */
    public void reject(String message, String code) {}
}
