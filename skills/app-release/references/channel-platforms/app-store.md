# App Store 接入

适用于已选择 App Store 的 Apple 平台游戏与非游戏 App，按项目实际 iOS／iPadOS 或其他目标执行[渠道公共规范](../channel-platform-integration.md)。商店分发、TestFlight 和其他分发路线分别确认，不把 Web／小游戏产物或开发构建当作正式候选。

## 接入与验证

1. **身份与原生来源**：核对开发者主体／团队、Bundle ID、版本／构建号、设备族、系统范围及 App Store Connect 记录。Unity／Cocos 使用各自原生导出，Phaser／Three.js 核实本栈原生宿主，Flutter／Expo 按本栈构建；使用 WebView 不自动证明达到审核中的功能完整性／最低功能要求，不另行编造原生功能凑审。
2. **构建与签名**：锁定实际工具链，核对当前 SDK／上传要求、签名证书、Provisioning Profile、entitlements、能力和依赖；确认归档及交付包中的应用身份和随包资源。证书、私钥与商店凭据只走受控配置；签名、上传、TestFlight 分发均按已有授权范围分别执行。
3. **隐私与账号**：按实际采集和 SDK 行为填写 App Privacy，核对隐私政策、用途说明、适用 `PrivacyInfo.xcprivacy`、Required Reason API 和第三方 SDK 要求。隐私清单、商店声明与真实授权分别验证，不能相互替代；涉及跟踪时核对 ATT，拒绝不能冒充已授权。存在第三方登录、账号创建或删除时，再按当前审核规则核对 Sign in with Apple 的适用条件与应用内账号删除，不为无此功能的 App 加入无关能力。
4. **购买与权益**：数字内容／订阅按当前审核规则选择 StoreKit／In-App Purchase；地区／品类例外、外链或其他分发方案须有明确适用依据，不能直接套用 Google Play、小游戏支付或任意 Web 收款。按实际商品覆盖购买、取消、待批准、失败、验证、恢复／权益同步与重复回调；服务端验证交易／通知并幂等维护权益，测试与真实交易分别获得相应授权。无内购按公共规则移除专用 SDK。
5. **验证与审核可达性**：区分模拟器、开发构建、TestFlight 与正式候选，检查适用安装／首启、系统启动屏、生命周期、权限拒绝、网络失败及已接入能力。准备审核演示账号或完整演示模式、访问说明、可用后台和非显然功能说明；不能只写“测试通过”而没有当前包身份和真实范围。实际显示由用户确认，不自动真机验收。
6. **资料与发布**：复用真实截图／宣传素材，核对内容分级、地区、适用出口合规及业务资质等当前资料；实际需要内购时同时核对相关提审信息。构建上传、TestFlight 审核、App Review、审核通过、待开发者发布和正式可下载分别记录；不因上传成功或审核通过直接声称已上线。

## 官方资料

资料核对：2026-11-10；审核、SDK 和地区支付规则在实际提审时重新核对。

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)、[审核准备与提交说明](https://developer.apple.com/distribute/app-review/)。
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)、[Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)。
- [第三方 SDK 要求](https://developer.apple.com/support/third-party-SDK-requirements/)。
