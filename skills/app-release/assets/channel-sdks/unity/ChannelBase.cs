using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace AppCreator.ChannelSdk
{
    /// <summary>管理单个渠道的初始化、超时及旧回调隔离。</summary>
    public abstract class ChannelBase : IChannelCapabilities
    {
        private readonly object gate = new object();
        private readonly TimeSpan timeout;
        private TaskCompletionSource<bool> current;
        private ChannelState state = ChannelState.Created;
        private bool sdkRequestPending;
        private int generation;
        private int activeAttempt;

        /// <summary>创建渠道，不触发 SDK 加载或调用。</summary>
        protected ChannelBase(TimeSpan timeout)
        {
            if (timeout <= TimeSpan.Zero || timeout.TotalMilliseconds > int.MaxValue)
                throw new ArgumentOutOfRangeException(nameof(timeout));
            this.timeout = timeout;
        }

        /// <summary>当前渠道身份。</summary>
        public abstract string Platform { get; }
        /// <summary>读取单渠道状态。</summary>
        public ChannelState State { get { lock (gate) return state; } }
#if APP_CREATOR_WECHAT_SDK
        /// <summary>只在微信小游戏就绪后提供微信渠道的具名接口。</summary>
        public WechatMinigameSdk Wechat
        {
            get { lock (gate) { EnsureReady(); if (Platform != "wechat-minigame") throw new InvalidOperationException("当前渠道不支持微信小游戏能力。"); int attempt = generation; return new WechatMinigameSdk(() => EnsureAttemptReady(attempt)); } }
        }
#endif
#if APP_CREATOR_CRAZYGAMES_SDK
        /// <summary>只在 CrazyGames 就绪后提供平台的具名接口。</summary>
        public CrazyGamesSdk CrazyGames
        {
            get { lock (gate) { EnsureReady(); if (Platform != "crazygames") throw new InvalidOperationException("当前渠道不支持 CrazyGames 能力。"); int attempt = generation; return new CrazyGamesSdk(() => EnsureAttemptReady(attempt)); } }
        }
#endif

        /// <summary>按官方 SDK 回调独立初始化，超时不代表真实成功。</summary>
        public Task InitializeAsync()
        {
            TaskCompletionSource<bool> completion;
            int attempt;
            lock (gate)
            {
                if (state == ChannelState.Disposed) throw new ObjectDisposedException(Platform);
                if (state == ChannelState.Ready) return Task.CompletedTask;
                if (state == ChannelState.Initializing) return current.Task;
                // 超时不等于 SDK 已终止；未收到旧回调前不能再次并发初始化。
                if (sdkRequestPending) throw new InvalidOperationException("先前的 SDK 初始化仍未结束，暂不能重试。");
                completion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                current = completion;
                attempt = ++generation;
                activeAttempt = attempt;
                state = ChannelState.Initializing;
                sdkRequestPending = true;
            }

            try
            {
                Type root = ResolveRoot();
                StartSdk(root, error => Complete(attempt, error));
                _ = WatchTimeoutAsync(attempt, completion);
            }
            catch (Exception error) { Complete(attempt, Unwrap(error)); }
            return completion.Task;
        }

        /// <summary>由渠道文件定位官方根类型。</summary>
        protected abstract Type ResolveRoot();
        /// <summary>由渠道文件调用官方初始化，回调携带失败信息或 null。</summary>
        protected abstract void StartSdk(Type root, Action<Exception> complete);

        /// <summary>查找已经加载的确切官方根类型，避免按用户输入加载任意程序集。</summary>
        protected static Type FindSdkType(string fullName)
        {
            Type[] matches = AppDomain.CurrentDomain.GetAssemblies()
                .Select(assembly => assembly.GetType(fullName, false, false))
                .Where(type => type != null).ToArray();
            if (matches.Length != 1) throw new InvalidOperationException("官方 SDK 未安装或存在重复类型：" + fullName);
            return matches[0];
        }

        /// <summary>调用明确签名的官方静态方法，保留 SDK 抛出的原始异常。</summary>
        protected static void InvokeStatic(Type root, string method, Type parameter, object argument)
        {
            MethodInfo info = root.GetMethod(method, BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy,
                null, new[] { parameter }, null);
            if (info == null) throw new MissingMethodException(root.FullName, method);
            try { info.Invoke(null, new[] { argument }); }
            catch (TargetInvocationException error) { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(Unwrap(error)).Throw(); throw; }
        }

        /// <summary>去除反射包装而不暴露无关凭据到日志。</summary>
        private static Exception Unwrap(Exception error)
        {
            return error is TargetInvocationException invocation && invocation.InnerException != null ? invocation.InnerException : error;
        }

        /// <summary>仅当前尝试的真实回调可改变结果。</summary>
        private void Complete(int attempt, Exception error)
        {
            lock (gate)
            {
                if (attempt != activeAttempt) return;
                sdkRequestPending = false;
                if (attempt != generation || state != ChannelState.Initializing) return;
                if (error != null) { state = ChannelState.Failed; current.TrySetException(error); }
                else { state = ChannelState.Ready; current.TrySetResult(true); }
            }
        }

        /// <summary>供唯一选择器避免在旧官方初始化仍运行时创建第二套管理器。</summary>
        internal bool InitializationPending { get { lock (gate) return sdkRequestPending; } }

        /// <summary>到期只限制此 SDK，并使迟到完成结果不能改写状态。</summary>
        private async Task WatchTimeoutAsync(int attempt, TaskCompletionSource<bool> completion)
        {
            await Task.WhenAny(completion.Task, Task.Delay(timeout)).ConfigureAwait(false);
            lock (gate)
            {
                if (attempt != generation || state != ChannelState.Initializing) return;
                state = ChannelState.TimedOut;
                completion.TrySetException(new TimeoutException("SDK 初始化超时，状态未确认。"));
            }
        }

        /// <summary>阻止未就绪或销毁后的 SDK 操作。</summary>
        protected void EnsureReady()
        {
            lock (gate) if (state != ChannelState.Ready) throw new InvalidOperationException("渠道 SDK 尚未就绪或已释放。");
        }

        /// <summary>禁止重试后复活旧尝试产生的 SDK 句柄。</summary>
        private void EnsureAttemptReady(int attempt)
        {
            lock (gate) if (state != ChannelState.Ready || generation != attempt)
                throw new InvalidOperationException("渠道 SDK 句柄已失效。");
        }

        /// <summary>使当前任务和已发出的全部句柄失效。</summary>
        public void Dispose()
        {
            lock (gate)
            {
                if (state == ChannelState.Disposed) return;
                state = ChannelState.Disposed;
                generation++;
                current?.TrySetException(new ObjectDisposedException(Platform));
            }
        }
    }
}
