using System;

namespace AppCreator.ChannelSdk
{
    /// <summary>微信小游戏官方 Unity SDK 适配。</summary>
    public sealed class WechatMinigameChannel : ChannelBase
    {
        private readonly Type sdkType;
        private readonly bool verifiedMinigame;

        /// <summary>显式提供已确认的小游戏宿主；测试可注入替身类型。</summary>
        public WechatMinigameChannel(bool verifiedMinigame, TimeSpan timeout, Type sdkType = null) : base(timeout)
        { this.verifiedMinigame = verifiedMinigame; this.sdkType = sdkType; }

        /// <summary>渠道身份。</summary>
        public override string Platform => "wechat-minigame";
        /// <summary>拒绝未确认的小游戏环境，并查找官方 SDK 类型。</summary>
        protected override Type ResolveRoot()
        {
            if (!verifiedMinigame) throw new InvalidOperationException("微信小游戏宿主未确认。");
            return sdkType ?? FindSdkType("WeChatWASM.WX");
        }

        /// <summary>等待 WX.InitSDK 的真实完成信号。</summary>
        protected override void StartSdk(Type root, Action<Exception> complete)
        {
            // 官方小游戏运行时向 Inited 发送 200；锁定版本若变更，须核对原始实现。
            Action<int> callback = code => complete(code == 200 ? null : new InvalidOperationException("微信 SDK 初始化返回非成功状态。"));
            InvokeStatic(root, "InitSDK", typeof(Action<int>), callback);
        }
    }
}
