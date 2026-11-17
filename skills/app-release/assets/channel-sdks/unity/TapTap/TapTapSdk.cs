#if APP_CREATOR_TAPTAP_CORE
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TapSDK.Core;

namespace AppCreator.ChannelSdk
{
    /// <summary>TapSDK 4.11.1 的具名能力入口；可选模块通过独立编译符号加入。</summary>
    public sealed partial class TapTapSdk
    {
        private readonly Action ensureReady;
        private readonly Action ensureAnalytics;
        private readonly TapTapChannel owner;
        private readonly Action ensureCurrent;
        /// <summary>绑定当前初始化代次，不允许释放后继续使用旧句柄。</summary>
        internal TapTapSdk(Action ensureReady, Action ensureAnalytics, TapTapChannel owner, Action ensureCurrent)
        { this.ensureReady = ensureReady; this.ensureAnalytics = ensureAnalytics; this.owner = owner; this.ensureCurrent = ensureCurrent; }
        /// <summary>在当前所有者作用域执行同步清理，不依赖已撤回的用途授权。</summary>
        private void Cleanup(Action action) { owner.RunCleanup(ensureCurrent, action); }
        /// <summary>跟踪异步清理的真实终态，防止旧操作进入新会话。</summary>
        private Task CleanupTask(Func<Task> action) { return owner.RunCleanupTask(ensureCurrent, action); }
        /// <summary>更新官方语言设置。</summary>
        public void UpdateLanguage(TapTapLanguageType language) { ensureReady(); TapTapSDK.UpdateLanguage(language); }
        /// <summary>查询当前游戏是否由 TapTap PC 客户端唤起。</summary>
        public Task<bool> IsLaunchedFromTapTapPC() { ensureReady(); return TapTapSDK.IsLaunchedFromTapTapPC(); }
        /// <summary>设置经业务授权后使用的统计用户身份。</summary>
        public void SetAnalyticsUserId(string userId) { ensureAnalytics(); TapTapEvent.SetUserID(userId); }
        /// <summary>设置统计用户身份及其授权范围内的属性。</summary>
        public void SetAnalyticsUserId(string userId, Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.SetUserID(userId, properties); }
        /// <summary>清理当前统计用户身份。</summary>
        public void ClearAnalyticsUser() { Cleanup(TapTapEvent.ClearUser); }
        /// <summary>读取官方统计设备标识，调用前由项目确认相应授权。</summary>
        public string GetAnalyticsDeviceId() { ensureAnalytics(); return TapTapEvent.GetDeviceId(); }
        /// <summary>按项目实际授权记录自定义事件。</summary>
        public void LogAnalyticsEvent(string name, Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.LogEvent(name, properties); }
        /// <summary>初始化已授权的设备统计属性。</summary>
        public void InitializeAnalyticsDevice(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.DeviceInitialize(properties); }
        /// <summary>更新已授权的设备统计属性。</summary>
        public void UpdateAnalyticsDevice(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.DeviceUpdate(properties); }
        /// <summary>累加已授权的设备统计属性。</summary>
        public void AddAnalyticsDevice(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.DeviceAdd(properties); }
        /// <summary>初始化已授权的用户统计属性。</summary>
        public void InitializeAnalyticsUser(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.UserInitialize(properties); }
        /// <summary>更新已授权的用户统计属性。</summary>
        public void UpdateAnalyticsUser(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.UserUpdate(properties); }
        /// <summary>累加已授权的用户统计属性。</summary>
        public void AddAnalyticsUser(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.UserAdd(properties); }
        /// <summary>设置单个统计公共属性。</summary>
        public void AddAnalyticsCommonProperty(string key, string value) { ensureAnalytics(); TapTapEvent.AddCommonProperty(key, value); }
        /// <summary>设置一组统计公共属性。</summary>
        public void AddAnalyticsCommon(Dictionary<string, object> properties) { ensureAnalytics(); TapTapEvent.AddCommon(properties); }
        /// <summary>清除指定统计公共属性。</summary>
        public void ClearAnalyticsCommonProperty(string key) { Cleanup(() => TapTapEvent.ClearCommonProperty(key)); }
        /// <summary>清除一组统计公共属性。</summary>
        public void ClearAnalyticsCommonProperties(string[] keys) { Cleanup(() => TapTapEvent.ClearCommonProperties(keys)); }
        /// <summary>清除全部统计公共属性。</summary>
        public void ClearAllAnalyticsCommonProperties() { Cleanup(TapTapEvent.ClearAllCommonProperties); }
        /// <summary>记录已核验交易的统计事件，不执行支付或发货。</summary>
        public void LogPurchasedEvent(string orderId, string productName, long amount, string currencyType, string paymentMethod, Dictionary<string, object> properties)
        { ensureAnalytics(); TapTapEvent.LogPurchasedEvent(orderId, productName, amount, currencyType, paymentMethod, properties); }
        /// <summary>注册动态统计属性，调用方负责实际授权和回调生命周期。</summary>
        public void RegisterAnalyticsDynamicProperties(Func<Dictionary<string, object>> callback)
        {
            ensureAnalytics();
            if (callback == null) throw new ArgumentNullException(nameof(callback));
            TapTapEvent.RegisterDynamicProperties(() =>
            {
                // 厂商可以稍后再次调用已注册回调；授权撤回时不再读取业务属性。
                try { ensureAnalytics(); return callback() ?? new Dictionary<string, object>(); }
                catch { return new Dictionary<string, object>(); }
            });
        }
        /// <summary>按项目授权显式提供 OAID，不主动读取设备标识。</summary>
        public void SetAnalyticsOaid(string value) { ensureAnalytics(); TapTapEvent.SetOAID(value); }
        /// <summary>按项目授权显式记录设备登录事件。</summary>
        public void LogAnalyticsDeviceLogin() { ensureAnalytics(); TapTapEvent.LogDeviceLoginEvent(); }
#if UNITY_STANDALONE_WIN
        /// <summary>监听 TapTap PC 客户端运行状态。</summary>
        public void RegisterTapTapPCStateChangeListener(Action<int> callback) { ensureReady(); TapTapSDK.RegisterTapTapPCStateChangeListener(callback); }
        /// <summary>注销原 TapTap PC 客户端状态监听。</summary>
        public void UnregisterTapTapPCStateChangeListener(Action<int> callback) { TapTapSDK.UnRegisterTapTapPCStateChangeListener(callback); }
#endif
    }
}
#endif
