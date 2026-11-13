using System;
using System.Threading.Tasks;

namespace AppCreator.ChannelSdk
{
    /// <summary>渠道初始化和官方 SDK 完整调用的公共契约。</summary>
    public interface IChannelCapabilities : IDisposable
    {
        /// <summary>当前已确认的渠道身份。</summary>
        string Platform { get; }
        /// <summary>当前 SDK 初始化状态。</summary>
        ChannelState State { get; }
#if APP_CREATOR_WECHAT_SDK
        /// <summary>微信小游戏就绪后可访问的具名渠道能力。</summary>
        WechatMinigameSdk Wechat { get; }
#endif
#if APP_CREATOR_CRAZYGAMES_SDK
        /// <summary>CrazyGames 就绪后可访问的具名渠道能力。</summary>
        CrazyGamesSdk CrazyGames { get; }
#endif
        /// <summary>只请求本渠道的初始化，重复调用复用当前任务。</summary>
        Task InitializeAsync();
    }

    /// <summary>单个渠道 SDK 的初始化状态。</summary>
    public enum ChannelState { Created, Initializing, Ready, Failed, TimedOut, Disposed }
}
