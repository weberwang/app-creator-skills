#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_COMPLIANCE
using System;
using System.Threading.Tasks;
using TapSDK.Compliance;

namespace AppCreator.ChannelSdk
{
    /// <summary>实名认证与防沉迷的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>注册实名和防沉迷状态回调。</summary>
        public void RegisterComplianceCallback(Action<int, string> callback) { ensureReady(); TapTapCompliance.RegisterComplianceCallback(callback); }
        /// <summary>为实际登录用户启动合规认证。</summary>
        public void StartCompliance(string userId) { ensureReady(); TapTapCompliance.Startup(userId); }
        /// <summary>退出当前用户的认证会话。</summary>
        public void ExitCompliance() { Cleanup(TapTapCompliance.Exit); }
        /// <summary>获取官方返回的年龄段。</summary>
        public Task<int> GetAgeRange() { ensureReady(); return TapTapCompliance.GetAgeRange(); }
        /// <summary>获取当前可游玩剩余秒数。</summary>
        public Task<int> GetRemainingTime() { ensureReady(); return TapTapCompliance.GetRemainingTime(); }
        /// <summary>获取合规服务当前令牌，调用方不得写入日志。</summary>
        public Task<string> GetComplianceAccessToken() { ensureReady(); return TapTapCompliance.GetCurrentAccessToken(); }
        /// <summary>以分为单位查询未成年人消费限制；回调结果不能代替订单验证。</summary>
        public void CheckPaymentLimit(long amount, Action<CheckPayResult> success, Action<string> failure)
        { ensureReady(); TapTapCompliance.CheckPaymentLimit(amount, success, failure); }
        /// <summary>按官方要求上报真实已发生的支付金额。</summary>
        public void SubmitCompliancePayment(long amount, Action success, Action<string> failure)
        { ensureReady(); TapTapCompliance.SubmitPayment(amount, success, failure); }
    }
}
#endif
