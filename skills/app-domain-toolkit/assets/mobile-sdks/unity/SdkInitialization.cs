using System;
using System.Threading.Tasks;

namespace AppCreator.MobileSdk
{
    /// <summary>单个 SDK 的初始化、超时及迟到结果隔离。</summary>
    internal sealed class SdkInitialization : IDisposable
    {
        private readonly object gate = new object();
        private readonly int timeoutMilliseconds;
        private Task nativeTask;
        private Task current;
        private int generation;
        private SdkState state = SdkState.Created;

        /// <summary>每个 SDK 保持独立超时和任务，不共享批次屏障。</summary>
        internal SdkInitialization(int timeoutMilliseconds)
        {
            if (timeoutMilliseconds <= 0) throw new ArgumentOutOfRangeException(nameof(timeoutMilliseconds));
            this.timeoutMilliseconds = timeoutMilliseconds;
        }

        /// <summary>读取当前 SDK 状态。</summary>
        internal SdkState State { get { lock (gate) return state; } }
        /// <summary>即使等待超时或对象释放，也保留厂商操作的真实进行状态。</summary>
        internal bool Pending { get { lock (gate) return nativeTask != null && !nativeTask.IsCompleted; } }

        /// <summary>重复调用复用当前任务；旧任务未结束前不能并发重启。</summary>
        internal Task Start(Func<Task> action)
        {
            lock (gate)
            {
                if (state == SdkState.Disposed) throw new ObjectDisposedException(nameof(SdkInitialization));
                if (state == SdkState.Ready) return Task.CompletedTask;
                if (current != null && !current.IsCompleted) return current;
                if (nativeTask != null && !nativeTask.IsCompleted) throw new InvalidOperationException("先前 SDK 初始化仍在运行。");
                state = SdkState.Initializing;
                int attempt = ++generation;
                try { nativeTask = action() ?? throw new InvalidOperationException("SDK 未提供初始化任务。"); }
                catch { state = SdkState.Failed; throw; }
                current = Observe(nativeTask, attempt);
                return current;
            }
        }

        /// <summary>超时只终止本次等待，不把厂商内部任务当成已取消。</summary>
        private async Task Observe(Task source, int attempt)
        {
            try
            {
                if (await Task.WhenAny(source, Task.Delay(timeoutMilliseconds)) != source)
                {
                    lock (gate) if (attempt == generation && state != SdkState.Disposed) state = SdkState.TimedOut;
                    throw new TimeoutException("SDK 初始化超时，真实状态尚未确认。");
                }
                await source;
                lock (gate)
                {
                    if (attempt != generation || state == SdkState.Disposed) throw new ObjectDisposedException(nameof(SdkInitialization));
                    state = SdkState.Ready;
                }
            }
            catch
            {
                lock (gate) if (attempt == generation && state == SdkState.Initializing) state = SdkState.Failed;
                throw;
            }
        }

        /// <summary>标记当前授权不足，不触发任何 SDK 调用。</summary>
        internal void Restrict() { lock (gate) { if (state == SdkState.Created || state == SdkState.Failed) state = SdkState.Restricted; } }
        /// <summary>仅真实就绪后允许业务调用。</summary>
        internal void RequireReady() { lock (gate) if (state != SdkState.Ready) throw new InvalidOperationException("SDK 尚未就绪或已释放。"); }
        /// <summary>使等待和之后的 SDK 操作失效，已受理业务回调由所属请求保留。</summary>
        public void Dispose() { lock (gate) { state = SdkState.Disposed; generation++; } }
    }
}
