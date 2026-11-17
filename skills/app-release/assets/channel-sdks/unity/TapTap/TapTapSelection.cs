#if APP_CREATOR_TAPTAP_CORE
using System;

namespace AppCreator.ChannelSdk
{
    /// <summary>在已有唯一选择器中按明确构建和宿主线索接入 TapTap。</summary>
    public sealed partial class ChannelSelector
    {
        private TapTapConfiguration tapConfiguration;

        /// <summary>选择已确认的唯一渠道；TapTap 配置对象需在本次选择生命周期内保持稳定。</summary>
        public IChannelCapabilities Select(bool hasWechat, bool hasCrazyGames, bool hasTapTap,
            bool wechatVerified, bool crazyGamesVerified, bool tapTapVerified, TimeSpan timeout, TapTapConfiguration options)
        {
            if ((wechatVerified ? 1 : 0) + (crazyGamesVerified ? 1 : 0) + (tapTapVerified ? 1 : 0) != 1)
                throw new InvalidOperationException("运行环境未知或渠道信号冲突。");
            if (!tapTapVerified) return Select(hasWechat, hasCrazyGames, wechatVerified, crazyGamesVerified, timeout);
            if (!hasTapTap) throw new InvalidOperationException("当前构建未包含已确认渠道。");
            if (timeout <= TimeSpan.Zero || timeout.TotalMilliseconds > int.MaxValue) throw new ArgumentOutOfRangeException(nameof(timeout));
            if (options == null) throw new ArgumentNullException(nameof(options));
            string nextConfig = string.Join("/", "taptap", hasWechat, hasCrazyGames, hasTapTap, timeout.Ticks);
            lock (gate)
            {
                if (disposed) throw new ObjectDisposedException(nameof(ChannelSelector));
                if (current != null && current.State == ChannelState.Disposed)
                {
                    // 官方异步初始化未结束时，释放句柄不等于可以重新初始化。
                    if (current is ChannelBase prior && prior.InitializationPending)
                        throw new InvalidOperationException("先前的 SDK 初始化仍未结束，暂不能重新选择。");
                    current = null;
                    config = null;
                }
                if (current != null)
                {
                    if (config != nextConfig || !ReferenceEquals(tapConfiguration, options))
                        throw new InvalidOperationException("渠道配置已变化，请先释放当前渠道。");
                    return current;
                }
                current = new TapTapChannel(true, timeout, options);
                config = nextConfig;
                tapConfiguration = options;
                return current;
            }
        }
    }
}
#endif
