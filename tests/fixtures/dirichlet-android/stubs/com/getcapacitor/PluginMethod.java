package com.getcapacitor;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

/** 编译夹具：声明 Capacitor 可调用方法。 */
@Retention(RetentionPolicy.RUNTIME)
public @interface PluginMethod {}
