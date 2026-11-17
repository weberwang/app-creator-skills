#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_IAP
using TapSDK.IAP;

namespace AppCreator.ChannelSdk
{
    /// <summary>TapTap IAP 接入官方 Unity Purchasing 的具名入口。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>返回官方 Purchasing 模块；商品、订单与发货由项目现有购买服务负责。</summary>
        public TapPurchasingModule GetPurchasingModule() { ensureReady(); return TapPurchasingModule.Instance; }
        /// <summary>对已创建的官方商店配置写入已确认的客户端公开信息。</summary>
        public void ConfigurePurchasing(ITapTapStoreConfiguration store, string clientId, string clientToken, int regionCode)
        {
            ensureReady();
            if (store == null) throw new System.ArgumentNullException(nameof(store));
            store.SetClientId(clientId);
            store.SetClientToken(clientToken);
            store.SetRegionCode(regionCode);
        }
        /// <summary>显式设置官方购买诊断选项；线上日志配置由项目负责。</summary>
        public void ConfigurePurchasingDiagnostics(ITapTapStoreConfiguration store, bool enableLog, bool isRndMode)
        {
            ensureReady();
            if (store == null) throw new System.ArgumentNullException(nameof(store));
            store.SetEnableLog(enableLog);
            store.SetIsRNDMode(isRndMode);
        }
    }
}
#endif
