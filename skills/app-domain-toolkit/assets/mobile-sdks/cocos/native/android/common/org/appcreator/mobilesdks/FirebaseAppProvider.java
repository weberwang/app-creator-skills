package org.appcreator.mobilesdks;

import android.content.Context;
import com.google.firebase.FirebaseApp;

/** Analytics 和 Crashlytics 共享 Firebase 原生应用，不重复创建默认实例。 */
final class FirebaseAppProvider {
    /** 由当前桥接所有者创建，避免业务重复构造原生状态。 */
    private FirebaseAppProvider() {}
    /** 只在对应 SDK 显式初始化时获取真实默认 App，配置缺失明确失败。 */
    static synchronized FirebaseApp get(Context context) {
        FirebaseApp app = FirebaseApp.getApps(context).isEmpty() ? FirebaseApp.initializeApp(context) : FirebaseApp.getInstance();
        if (app == null) throw new IllegalStateException("firebase-config-missing");
        return app;
    }
}
