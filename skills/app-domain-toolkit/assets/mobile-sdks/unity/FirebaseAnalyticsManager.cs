#if APP_CREATOR_FIREBASE_SDK
using System;
using System.Linq;
using System.Threading.Tasks;
using Firebase.Analytics;

namespace AppCreator.MobileSdk
{
    /// <summary>Firebase Analytics 统计、事件和采集策略的独立管理器。</summary>
    public sealed class FirebaseAnalyticsManager : IDisposable
    {
        private readonly MainThread thread;
        private readonly FirebaseDependencies dependencies;
        private readonly SdkInitialization initialization;
        private bool collectionEnabled;
        private bool initializationAllowed;

        /// <summary>保存项目现有采集策略，构造时不启动 SDK。</summary>
        internal FirebaseAnalyticsManager(MainThread thread, FirebaseDependencies dependencies, int timeoutMilliseconds, bool initializationAllowed, bool collectionEnabled)
        { this.thread = thread; this.dependencies = dependencies; initialization = new SdkInitialization(timeoutMilliseconds); this.initializationAllowed = initializationAllowed; this.collectionEnabled = collectionEnabled; }
        /// <summary>当前 Analytics 的初始化状态。</summary>
        public SdkState State => initialization.State;
        /// <summary>初始化是否仍在厂商 SDK 内运行。</summary>
        internal bool Pending => initialization.Pending;
        /// <summary>按真实依赖初始化统计并应用项目授权策略。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            if (!initializationAllowed) { initialization.Restrict(); throw new InvalidOperationException("Firebase 初始化授权前置未满足。"); }
            return initialization.Start(async () => {
                await dependencies.InitializeAsync();
                if (initialization.State == SdkState.Disposed || initialization.State == SdkState.TimedOut) throw new ObjectDisposedException(nameof(FirebaseAnalyticsManager));
                if (!initializationAllowed) throw new InvalidOperationException("Firebase 初始化授权已撤回。");
                FirebaseAnalytics.SetAnalyticsCollectionEnabled(collectionEnabled);
            });
        }
        /// <summary>更新初始化授权；撤回时同时关闭本模块采集。</summary>
        public void SetInitializationAllowed(bool allowed)
        { thread.Require(); initializationAllowed = allowed; if (!allowed && State == SdkState.Ready) SetCollectionEnabled(false); }
        /// <summary>根据现有授权来源更新统计采集，不自行显示授权界面。</summary>
        public void SetCollectionEnabled(bool enabled)
        { thread.Require(); initialization.RequireReady(); if (enabled && !initializationAllowed) throw new InvalidOperationException("Firebase 初始化授权前置未满足。"); collectionEnabled = enabled; FirebaseAnalytics.SetAnalyticsCollectionEnabled(enabled); }
        /// <summary>按原始数值类型发送已确认的业务事件。</summary>
        public void LogEvent(string name, params AnalyticsValue[] values)
        {
            thread.Require(); initialization.RequireReady();
            if (!collectionEnabled) throw new InvalidOperationException("统计采集当前受限。");
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("事件名不能为空。", nameof(name));
            Parameter[] parameters = (values ?? Array.Empty<AnalyticsValue>()).Select(value => {
                if (string.IsNullOrWhiteSpace(value.Name)) throw new ArgumentException("事件参数名不能为空。");
                if (value.Value is string text) return new Parameter(value.Name, text);
                if (value.Value is long integer) return new Parameter(value.Name, integer);
                if (value.Value is double number) return new Parameter(value.Name, number);
                throw new ArgumentException("事件参数只支持字符串、整数和浮点数。");
            }).ToArray();
            FirebaseAnalytics.LogEvent(name, parameters);
        }
        /// <summary>记录项目已确认的页面或场景名称。</summary>
        public void LogScreen(string screenName, string screenClass)
        { LogEvent(FirebaseAnalytics.EventScreenView, new AnalyticsValue(FirebaseAnalytics.ParameterScreenName, screenName), new AnalyticsValue(FirebaseAnalytics.ParameterScreenClass, screenClass)); }
        /// <summary>更新业务已授权的用户属性。</summary>
        public void SetUserProperty(string name, string value)
        { thread.Require(); initialization.RequireReady(); if (!collectionEnabled) throw new InvalidOperationException("统计采集当前受限。"); FirebaseAnalytics.SetUserProperty(name, value); }
        /// <summary>更新业务已授权的用户标识；调用方负责提供脱敏标识。</summary>
        public void SetUserId(string id)
        { thread.Require(); initialization.RequireReady(); if (!collectionEnabled) throw new InvalidOperationException("统计采集当前受限。"); FirebaseAnalytics.SetUserId(id); }
        /// <summary>停止本管理器的后续业务调用。</summary>
        public void Dispose() { initialization.Dispose(); }
    }
}
#endif
