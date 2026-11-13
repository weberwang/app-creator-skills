using System;

namespace AppCreator.ChannelSdk
{
    /// <summary>由应用组合根持有的渠道选择器，复用当前生命周期中的唯一渠道。</summary>
    public sealed class ChannelSelector : IDisposable
    {
        private readonly object gate = new object();
        private IChannelCapabilities current;
        private string config;
        private bool disposed;

        /// <summary>只允许一个已确认且包含在当前构建中的渠道；同配置返回同一实例。</summary>
        public IChannelCapabilities Select(bool hasWechat, bool hasCrazyGames, bool wechatVerified, bool crazyGamesVerified, TimeSpan timeout)
        {
            if (wechatVerified == crazyGamesVerified) throw new InvalidOperationException("运行环境未知或渠道信号冲突。");
            if ((wechatVerified && !hasWechat) || (crazyGamesVerified && !hasCrazyGames))
                throw new InvalidOperationException("当前构建未包含已确认渠道。");
            if (timeout <= TimeSpan.Zero || timeout.TotalMilliseconds > int.MaxValue) throw new ArgumentOutOfRangeException(nameof(timeout));
            string nextConfig = string.Join("/", hasWechat, hasCrazyGames, wechatVerified, crazyGamesVerified, timeout.Ticks);
            lock (gate)
            {
                if (disposed) throw new ObjectDisposedException(nameof(ChannelSelector));
                if (current != null && current.State == ChannelState.Disposed)
                {
                    // 释放只使旧回调失效，并不取消官方 SDK 内已经发起的初始化。
                    if (current is ChannelBase prior && prior.InitializationPending)
                        throw new InvalidOperationException("先前的 SDK 初始化仍未结束，暂不能重新选择。");
                    current = null;
                    config = null;
                }
                if (current != null)
                {
                    if (config != nextConfig) throw new InvalidOperationException("渠道配置已变化，请先释放当前渠道。");
                    return current;
                }
                current = wechatVerified ? (IChannelCapabilities)new WechatMinigameChannel(true, timeout) : new CrazyGamesChannel(true, timeout);
                config = nextConfig;
                return current;
            }
        }

        /// <summary>释放当前渠道后允许同一组合根重新选择，已受理业务回调仍由业务所有者处理。</summary>
        public void Release()
        {
            lock (gate)
            {
                if (disposed) throw new ObjectDisposedException(nameof(ChannelSelector));
                if (current is ChannelBase prior && prior.InitializationPending)
                    throw new InvalidOperationException("先前的 SDK 初始化仍未结束，暂不能释放选择。");
                current?.Dispose();
                current = null;
                config = null;
            }
        }

        /// <summary>关闭选择器并释放其持有的渠道；新的应用生命周期须创建新选择器。</summary>
        public void Dispose()
        {
            lock (gate)
            {
                if (disposed) return;
                current?.Dispose();
                current = null;
                config = null;
                disposed = true;
            }
        }
    }
}
