#if APP_CREATOR_FIREBASE_SDK
using System;
using System.Threading.Tasks;
using Firebase;

namespace AppCreator.MobileSdk
{
    /// <summary>Firebase Analytics 与 Crashlytics 共用官方依赖检查，而不互相等待业务状态。</summary>
    internal sealed class FirebaseDependencies : IDisposable
    {
        private readonly MainThread thread;
        private readonly SdkInitialization initialization;
        /// <summary>只保存配置，不在构造时启动 Firebase。</summary>
        internal FirebaseDependencies(MainThread thread, int timeoutMilliseconds)
        { this.thread = thread; initialization = new SdkInitialization(timeoutMilliseconds); }
        /// <summary>仅在当前 SDK 仍有官方依赖检查时返回 true。</summary>
        internal bool Pending => initialization.Pending;
        /// <summary>复用同一官方依赖检查，必须实际返回 Available 才能启动 Firebase 业务。</summary>
        internal Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            return initialization.Start(async () => {
                DependencyStatus result = await FirebaseApp.CheckAndFixDependenciesAsync();
                if (result != DependencyStatus.Available) throw new InvalidOperationException("Firebase 依赖不可用。");
                _ = FirebaseApp.DefaultInstance;
            });
        }
        /// <summary>释放依赖检查所有者。</summary>
        public void Dispose() { initialization.Dispose(); }
    }
}
#endif
