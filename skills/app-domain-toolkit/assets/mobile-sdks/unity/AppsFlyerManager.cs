#if APP_CREATOR_APPSFLYER_SDK
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AppsFlyerSDK;

namespace AppCreator.MobileSdk
{
    /// <summary>AppsFlyer Unity 7 的归因、会话启动与业务事件管理器。</summary>
    public sealed class AppsFlyerManager : IDisposable
    {
        private readonly MainThread thread;
        private readonly SdkInitialization initialization;
        private readonly AppsFlyer receiver;
        private readonly string devKey;
        private readonly string appId;
        private bool trackingAllowed;
        private bool pluginInitialized;
        private bool conversionRegistered;
        private bool sessionRegistered;
        private bool sessionReady;
        private bool starting;
        private bool disposed;
        private TaskCompletionSource<bool> readySignal;

        /// <summary>仅保存配置；receiver 必须为官方 AppsFlyer 组件，以接收原生 RPC 事件。</summary>
        internal AppsFlyerManager(MainThread thread, int timeoutMilliseconds, AppsFlyer receiver, string devKey, string appId, bool trackingAllowed)
        {
            this.thread = thread; initialization = new SdkInitialization(timeoutMilliseconds);
            this.receiver = receiver;
            this.devKey = devKey;
            this.appId = appId; this.trackingAllowed = trackingAllowed;
        }
        /// <summary>收到真实归因信息时通知业务；内容不得直接写入日志。</summary>
        public event Action<string> ConversionSucceeded;
        /// <summary>收到真实归因失败通知时交由业务处理。</summary>
        public event Action<string> ConversionFailed;
        /// <summary>SDK 具备会话前置并已投递 start 后为 Ready；不代表归因或网络发送完成。</summary>
        public SdkState State => initialization.State;
        /// <summary>真实初始化或会话前置仍未完成。</summary>
        internal bool Pending => initialization.Pending;

        /// <summary>只按 AppsFlyer 自身的官方前置启动，不等待广告或其他 SDK。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            if (!trackingAllowed) { initialization.Restrict(); throw new InvalidOperationException("AppsFlyer 授权前置未满足。"); }
            return initialization.Start(async () => {
                // 单个 SDK 的错误配置只影响自身初始化，不能阻断组合根构造。
                if (receiver == null) throw new ArgumentNullException(nameof(receiver));
                if (string.IsNullOrWhiteSpace(devKey)) throw new ArgumentException("AppsFlyer 开发密钥未配置。", nameof(devKey));
#if UNITY_IOS
                if (string.IsNullOrWhiteSpace(appId)) throw new ArgumentException("iOS AppsFlyer 应用 ID 未配置。", nameof(appId));
#endif
                if (!pluginInitialized) {
                    await AppsFlyer.init(devKey, appId, receiver);
                    if (disposed) throw new ObjectDisposedException(nameof(AppsFlyerManager));
                    if (!AppsFlyer.isRPCBridgeAvailable()) throw new InvalidOperationException("AppsFlyer 原生桥不可用。");
                    pluginInitialized = true;
                }
                if (!conversionRegistered) {
                    await AppsFlyer.registerConversionListener(OnConversionSucceeded, OnConversionFailed);
                    conversionRegistered = true;
                    if (disposed) { await AppsFlyer.unregisterConversionListener(); throw new ObjectDisposedException(nameof(AppsFlyerManager)); }
                }
                if (!sessionRegistered) {
                    AppsFlyer.OnSessionReady += OnSessionReady;
                    sessionRegistered = true;
                    await AppsFlyer.registerSessionReadyListener();
                    if (disposed) throw new ObjectDisposedException(nameof(AppsFlyerManager));
                }
                if (!sessionReady) {
                    readySignal = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                    await readySignal.Task;
                }
                if (disposed || initialization.State == SdkState.TimedOut) throw new InvalidOperationException("AppsFlyer 初始化已失效。");
                if (!trackingAllowed) throw new InvalidOperationException("AppsFlyer 授权前置未满足。");
                await StartSessionAsync();
            });
        }

        /// <summary>仅真实 session-ready 事件使业务可请求启动；迟到事件不自动恢复超时尝试。</summary>
        private void OnSessionReady(object sender, EventArgs args)
        {
            sessionReady = true;
            if (disposed || initialization.State == SdkState.TimedOut) {
                readySignal?.TrySetException(new InvalidOperationException("AppsFlyer 会话通知已迟到。"));
                if (disposed) AppsFlyer.OnSessionReady -= OnSessionReady;
                return;
            }
            if (initialization.State == SdkState.Initializing) readySignal?.TrySetResult(true);
            else if (initialization.State == SdkState.Ready && trackingAllowed) _ = StartSessionAsync();
        }

        /// <summary>官方 start(false) 仅表示请求已派发，不表示网络发送或归因成功。</summary>
        private async Task StartSessionAsync()
        {
            if (starting || disposed || !trackingAllowed) return;
            starting = true;
            try { await AppsFlyer.start(false); }
            finally { starting = false; sessionReady = false; }
        }

        /// <summary>发送业务事件；返回表示调用已派发，不声称服务端已接收。</summary>
        public async Task LogEventAsync(string name, Dictionary<string, string> values)
        {
            thread.Require(); initialization.RequireReady();
            if (!trackingAllowed) throw new InvalidOperationException("AppsFlyer 跟踪当前受限。");
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("事件名不能为空。", nameof(name));
            await AppsFlyer.logEvent(name, values, false);
        }

        /// <summary>变更项目授权策略；撤回时阻止新事件并按官方接口停止 SDK。</summary>
        public async Task SetTrackingAllowedAsync(bool allowed)
        {
            thread.Require();
            if (disposed) throw new ObjectDisposedException(nameof(AppsFlyerManager));
            trackingAllowed = allowed;
            if (pluginInitialized) await AppsFlyer.stop(!allowed);
        }

        /// <summary>将官方归因结果交给当前业务所有者。</summary>
        private void OnConversionSucceeded(string data) { if (!disposed) ConversionSucceeded?.Invoke(data); }
        /// <summary>将官方归因失败交给当前业务所有者。</summary>
        private void OnConversionFailed(string error) { if (!disposed) ConversionFailed?.Invoke(error); }

        /// <summary>停止新的业务请求；待决会话通知仍需释放其真实初始化占用。</summary>
        public void Dispose()
        {
            thread.Require();
            if (disposed) return;
            disposed = true;
            initialization.Dispose();
            if (!initialization.Pending && sessionRegistered) AppsFlyer.OnSessionReady -= OnSessionReady;
            if (conversionRegistered) _ = AppsFlyer.unregisterConversionListener();
        }
    }
}
#endif
