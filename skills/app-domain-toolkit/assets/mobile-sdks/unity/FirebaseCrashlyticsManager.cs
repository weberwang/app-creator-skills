#if APP_CREATOR_FIREBASE_SDK
using System;
using System.Threading.Tasks;
using Firebase.Crashlytics;

namespace AppCreator.MobileSdk
{
    /// <summary>Firebase Crashlytics 的异常、上下文与采集策略管理器。</summary>
    public sealed class FirebaseCrashlyticsManager : IDisposable
    {
        private readonly MainThread thread;
        private readonly FirebaseDependencies dependencies;
        private readonly SdkInitialization initialization;
        private bool collectionEnabled;
        private bool initializationAllowed;
        /// <summary>仅保存项目授权策略，不主动初始化 SDK。</summary>
        internal FirebaseCrashlyticsManager(MainThread thread, FirebaseDependencies dependencies, int timeoutMilliseconds, bool initializationAllowed, bool collectionEnabled)
        { this.thread = thread; this.dependencies = dependencies; initialization = new SdkInitialization(timeoutMilliseconds); this.initializationAllowed = initializationAllowed; this.collectionEnabled = collectionEnabled; }
        /// <summary>当前异常上报初始化状态。</summary>
        public SdkState State => initialization.State;
        /// <summary>初始化是否仍在 SDK 中进行。</summary>
        internal bool Pending => initialization.Pending;
        /// <summary>依赖检查完成后独立设置异常采集状态。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            if (!initializationAllowed) { initialization.Restrict(); throw new InvalidOperationException("Firebase 初始化授权前置未满足。"); }
            return initialization.Start(async () => {
                await dependencies.InitializeAsync();
                if (initialization.State == SdkState.Disposed || initialization.State == SdkState.TimedOut) throw new ObjectDisposedException(nameof(FirebaseCrashlyticsManager));
                if (!initializationAllowed) throw new InvalidOperationException("Firebase 初始化授权已撤回。");
                Crashlytics.IsCrashlyticsCollectionEnabled = collectionEnabled;
            });
        }
        /// <summary>更新初始化授权；撤回时同时关闭本模块采集。</summary>
        public void SetInitializationAllowed(bool allowed)
        { thread.Require(); initializationAllowed = allowed; if (!allowed && State == SdkState.Ready) SetCollectionEnabled(false); }
        /// <summary>根据已有授权来源更新异常采集。</summary>
        public void SetCollectionEnabled(bool enabled)
        { thread.Require(); initialization.RequireReady(); if (enabled && !initializationAllowed) throw new InvalidOperationException("Firebase 初始化授权前置未满足。"); collectionEnabled = enabled; Crashlytics.IsCrashlyticsCollectionEnabled = enabled; }
        /// <summary>防止授权未满足时排队发送异常或上下文。</summary>
        private void RequireCollection()
        { thread.Require(); initialization.RequireReady(); if (!collectionEnabled) throw new InvalidOperationException("异常采集当前受限。"); }
        /// <summary>记录非致命异常；不得传入包含凭据的上下文。</summary>
        public void RecordException(Exception exception)
        { RequireCollection(); if (exception == null) throw new ArgumentNullException(nameof(exception)); Crashlytics.LogException(exception); }
        /// <summary>记录已脱敏的诊断消息。</summary>
        public void Log(string message) { RequireCollection(); Crashlytics.Log(message); }
        /// <summary>设置已授权且已脱敏的诊断字段。</summary>
        public void SetCustomKey(string key, string value) { RequireCollection(); Crashlytics.SetCustomKey(key, value); }
        /// <summary>设置业务已授权的脱敏用户标识。</summary>
        public void SetUserId(string id) { RequireCollection(); Crashlytics.SetUserId(id); }
        /// <summary>停止本管理器的后续业务调用。</summary>
        public void Dispose() { initialization.Dispose(); }
    }
}
#endif
