#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_LOGIN
using System.Threading.Tasks;
using TapSDK.Login;

namespace AppCreator.ChannelSdk
{
    /// <summary>TapTap 登录的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>请求用户授权，保留 SDK 的取消和异常结果。</summary>
        public Task<TapTapAccount> LoginWithScopes(string[] scopes) { ensureReady(); return TapTapLogin.Instance.LoginWithScopes(scopes); }
        /// <summary>读取 SDK 当前账号；结果仍需按项目要求建立业务会话。</summary>
        public Task<TapTapAccount> GetCurrentTapAccount() { ensureReady(); return TapTapLogin.Instance.GetCurrentTapAccount(); }
        /// <summary>退出 TapTap 登录。</summary>
        public void Logout() { Cleanup(() => TapTapLogin.Instance.Logout()); }
    }
}
#endif
