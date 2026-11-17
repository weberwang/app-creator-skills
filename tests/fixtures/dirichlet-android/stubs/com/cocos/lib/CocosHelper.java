package com.cocos.lib;

/** 编译夹具：仅提供 Cocos 游戏线程入口签名。 */
public final class CocosHelper {
    /** 测试时同步运行回调。 */
    public static void runOnGameThread(Runnable action) { action.run(); }
}
