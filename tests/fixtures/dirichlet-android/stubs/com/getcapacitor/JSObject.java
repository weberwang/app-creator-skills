package com.getcapacitor;
import org.json.JSONException;
import org.json.JSONObject;

/** 编译夹具：提供 Capacitor 的 JSON 请求类型。 */
public class JSObject extends JSONObject {
    /** 从原始 JSON 构造对象。 */
    public JSObject(String raw) throws JSONException { super(raw); }
}
