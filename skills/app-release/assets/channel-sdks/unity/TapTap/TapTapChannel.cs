#if APP_CREATOR_TAPTAP_CORE
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TapSDK.Core;

namespace AppCreator.ChannelSdk
{
    /// <summary>TapTap 组合配置；创建时复制核心字段，并由项目提供真实授权判断。</summary>
    public sealed class TapTapConfiguration
    {
        internal readonly TapTapSdkOptions Core;
        internal readonly TapTapSdkBaseOptions[] Modules;
        internal readonly Func<bool> MayInitialize;
        internal readonly Func<bool> MayUseServices;
        internal readonly Func<bool> MayUseAnalytics;

        /// <summary>保存明确配置；未选择统计模块时关闭官方默认 TapDB 自动事件。</summary>
        public TapTapConfiguration(TapTapSdkOptions core, Func<bool> mayInitialize, params TapTapSdkBaseOptions[] modules)
            : this(core, mayInitialize, mayInitialize, () => false, modules) { }

        /// <summary>分别提供初始化、运行时服务与统计授权；模块配置对象在初始化完成前不得修改。</summary>
        public TapTapConfiguration(TapTapSdkOptions core, Func<bool> mayInitialize, Func<bool> mayUseServices,
            Func<bool> mayUseAnalytics, params TapTapSdkBaseOptions[] modules)
        {
            if (core == null) throw new ArgumentNullException(nameof(core));
            if (string.IsNullOrWhiteSpace(core.clientId)) throw new ArgumentException("TapTap clientId 不能为空。", nameof(core));
            MayInitialize = mayInitialize ?? throw new ArgumentNullException(nameof(mayInitialize));
            MayUseServices = mayUseServices ?? throw new ArgumentNullException(nameof(mayUseServices));
            MayUseAnalytics = mayUseAnalytics ?? throw new ArgumentNullException(nameof(mayUseAnalytics));
            Core = new TapTapSdkOptions { clientId = core.clientId, clientToken = core.clientToken,
                clientPublicKey = core.clientPublicKey, region = core.region, preferredLanguage = core.preferredLanguage,
                gameVersion = core.gameVersion, enableLog = core.enableLog, screenOrientation = core.screenOrientation };
            if (modules == null || modules.Any(module => module == null)) throw new ArgumentException("模块配置不能包含空值。", nameof(modules));
            if (modules.OfType<TapTapEventOptions>().Skip(1).Any()) throw new ArgumentException("统计配置只能提供一份。", nameof(modules));
            // 官方 Core 在缺省时启用统计；未显式选择时关闭，避免意外增加数据采集。
            Modules = modules.Any(module => module is TapTapEventOptions) ? modules.ToArray() :
                modules.Concat(new TapTapSdkBaseOptions[] { new TapTapEventOptions { enableTapTapEvent = false } }).ToArray();
        }
    }

    /// <summary>直接使用锁定版本 TapSDK Core 初始化，并保护进程内唯一初始化。</summary>
    public sealed class TapTapChannel : ChannelBase
    {
        private static readonly object OwnerGate = new object();
        private static TapTapChannel owner;
        private static int pendingCleanup;
        private readonly TapTapConfiguration configuration;
        private readonly bool verifiedPlatform;

        /// <summary>保存已确认宿主与配置；实际 SDK 仅在主线程初始化时调用。</summary>
        public TapTapChannel(bool verifiedPlatform, TimeSpan timeout, TapTapConfiguration configuration) : base(timeout)
        {
            this.verifiedPlatform = verifiedPlatform;
            this.configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        }

        /// <summary>当前 TapTap 渠道身份。</summary>
        public override string Platform => "taptap";

        /// <summary>只接受已经核实的宿主，不通过类型存在推断当前渠道。</summary>
        protected override Type ResolveRoot()
        {
            if (!verifiedPlatform) throw new InvalidOperationException("TapTap 宿主未确认。");
            CheckPolicy(configuration.MayInitialize, "TapTap 初始化尚未获得用户授权。");
            EnsureServicePermission();
            if (configuration.Modules.OfType<TapTapEventOptions>().Any(option => option.enableTapTapEvent)) EnsureAnalyticsPermission();
            return typeof(TapTapSDK);
        }

        /// <summary>每次具体服务调用都重新检查授权；读取策略异常按禁止处理。</summary>
        internal void EnsureServicePermission() { CheckPolicy(configuration.MayUseServices, "TapTap 服务当前未获授权。"); }

        /// <summary>统计用途单独检查，不能由登录或通用授权自动推断。</summary>
        internal void EnsureAnalyticsPermission() { CheckPolicy(configuration.MayUseAnalytics, "TapTap 统计当前未获授权。"); }

        /// <summary>在唯一所有者锁内执行同步收尾，撤回授权也允许清理当前会话。</summary>
        internal void RunCleanup(Action ensureCurrent, Action cleanup)
        {
            lock (OwnerGate)
            {
                ensureCurrent();
                if (!ReferenceEquals(owner, this)) throw new InvalidOperationException("TapTap SDK 已由其他渠道接管。");
                cleanup();
            }
        }

        /// <summary>异步收尾真实结束之前保留 SDK 占用，避免迟到的断线影响新会话。</summary>
        internal Task RunCleanupTask(Action ensureCurrent, Func<Task> cleanup)
        {
            lock (OwnerGate)
            {
                ensureCurrent();
                if (!ReferenceEquals(owner, this)) throw new InvalidOperationException("TapTap SDK 已由其他渠道接管。");
                Task operation = cleanup() ?? throw new InvalidOperationException("TapTap SDK 未返回清理任务。");
                pendingCleanup++;
                // 同步或异步终态均只释放占用，不把失败当作清理成功。
                _ = operation.ContinueWith(_ => { lock (OwnerGate) pendingCleanup--; },
                    CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
                return operation;
            }
        }

        /// <summary>将不可用或异常策略收敛为明确拒绝，避免泄露策略内部信息。</summary>
        private static void CheckPolicy(Func<bool> policy, string message)
        {
            bool allowed;
            try { allowed = policy(); } catch { allowed = false; }
            if (!allowed) throw new InvalidOperationException(message);
        }

        /// <summary>在主线程调用官方初始化，并仅按该次真实回调确认结果。</summary>
        protected override void StartSdk(Type root, Action<Exception> complete)
        {
            lock (OwnerGate)
            {
                if (owner != null && owner != this &&
                    (pendingCleanup != 0 || owner.InitializationPending || (owner.State != ChannelState.Disposed && owner.State != ChannelState.Failed && owner.State != ChannelState.TimedOut)))
                    throw new InvalidOperationException("TapTap SDK 已由另一个渠道实例持有。");
                owner = this;
            }
            var callback = new InitCallback(complete);
            // 先发起本次初始化再订阅，避免 AddInitCallback 补发上一次结果。
            TapTapSDK.Init(configuration.Core, configuration.Modules);
            try { TapTapSDK.AddInitCallback(callback); }
            catch
            {
                // 无法确认回调是否已注册时，不能视为底层初始化结束并允许并发重试。
                // 等待既有超时并保留占用；若官方回调仍然到达，它会负责解除占用。
            }
        }

        /// <summary>只接收一次终态；即便超时或释放也保留监听直到官方操作实际结束。</summary>
        private sealed class InitCallback : ITapInitCallback
        {
            private readonly Action<Exception> complete;
            private int finished;
            /// <summary>绑定当前初始化尝试的结果处理。</summary>
            internal InitCallback(Action<Exception> complete) { this.complete = complete; }
            /// <summary>确认官方初始化成功。</summary>
            public void OnInitSuccess() { Finish(null); }
            /// <summary>报告官方错误码，不把厂商错误消息或配置写入日志。</summary>
            public void OnInitFail(int errorCode, string errorMsg) { Finish(new InvalidOperationException("TapTap SDK 初始化失败，错误码：" + errorCode)); }
            /// <summary>重复回调不可重复完成，监听解除后再投递结果。</summary>
            private void Finish(Exception error)
            {
                if (Interlocked.Exchange(ref finished, 1) != 0) return;
                try { TapTapSDK.RemoveInitCallback(this); }
                finally { complete(error); }
            }
        }
    }
}
#endif
