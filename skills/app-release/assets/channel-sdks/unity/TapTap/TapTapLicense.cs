#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_LICENSE
using TapSDK.License;

namespace AppCreator.ChannelSdk
{
    /// <summary>买断和 DLC 资格验证的官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>注册正版验证结果回调。</summary>
        public void RegisterLicenseCallback(ITapLicenseCallback callback) { ensureReady(); TapTapLicense.RegisterLicenseCallBack(callback); }
        /// <summary>注册 DLC 查询与购买回调。</summary>
        public void RegisterDlcCallback(ITapDlcCallback callback) { ensureReady(); TapTapLicense.RegisterDLCCallback(callback); }
        /// <summary>按官方合同校验本体购买资格。</summary>
        public void CheckLicense(bool force = false) { ensureReady(); TapTapLicense.CheckLicense(force); }
        /// <summary>查询真实 DLC 权益。</summary>
        public void QueryDlc(string[] dlcs) { ensureReady(); TapTapLicense.QueryDLC(dlcs); }
        /// <summary>发起 DLC 购买；权限结果以官方回调和验证为准。</summary>
        public void PurchaseDlc(string dlc) { ensureReady(); TapTapLicense.PurchaseDLC(dlc); }
    }
}
#endif
