using System;
using System.Reflection;

namespace AppCreator.ChannelSdk
{
    /// <summary>CrazyGames 官方 Unity SDK 适配。</summary>
    public sealed class CrazyGamesChannel : ChannelBase
    {
        private readonly Type sdkType;
        private readonly bool verifiedPlatform;

        /// <summary>显式提供已确认的渠道环境；测试可注入替身类型。</summary>
        public CrazyGamesChannel(bool verifiedPlatform, TimeSpan timeout, Type sdkType = null) : base(timeout)
        { this.verifiedPlatform = verifiedPlatform; this.sdkType = sdkType; }

        /// <summary>渠道身份。</summary>
        public override string Platform => "crazygames";
        /// <summary>仅在确认的目标环境中查找 SDK。</summary>
        protected override Type ResolveRoot()
        {
            if (!verifiedPlatform) throw new InvalidOperationException("CrazyGames 宿主未确认。");
            return sdkType ?? FindSdkType("CrazyGames.CrazySDK");
        }

        /// <summary>先确认官方可用状态，再等待官方完成回调。</summary>
        protected override void StartSdk(Type root, Action<Exception> complete)
        {
            const BindingFlags flags = BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy;
            PropertyInfo available = root.GetProperty("IsAvailable", flags);
            PropertyInfo initialized = root.GetProperty("IsInitialized", flags);
            if (available == null || initialized == null) throw new MissingMemberException(root.FullName, "IsAvailable/IsInitialized");
            if (!(bool)available.GetValue(null)) throw new InvalidOperationException("CrazyGames SDK 当前不可用。");
            if ((bool)initialized.GetValue(null)) { complete(null); return; }
            Action callback = () => complete(null);
            InvokeStatic(root, "Init", typeof(Action), callback);
        }
    }
}
