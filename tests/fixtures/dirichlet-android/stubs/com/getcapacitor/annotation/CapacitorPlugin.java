package com.getcapacitor.annotation;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

/** 编译夹具：声明 Capacitor 插件名称。 */
@Retention(RetentionPolicy.RUNTIME)
public @interface CapacitorPlugin { String name(); }
