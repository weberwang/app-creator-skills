# Google Play 接入

适用于已选择 Google Play 的 Android 游戏与非游戏 App，先执行[渠道公共规范](../channel-platform-integration.md)。采用当前栈已确认的 Android 原生／宿主构建，网页或小游戏包不直接成为商店候选。

## 接入与验证

1. **身份与账号**：核实开发者主体及当前验证／测试资格、应用 `applicationId`、版本名／`versionCode`、目标地区与测试轨道。区分开发包、候选及生产应用身份，不创建临时正式账号或占位商品。Google 登录、成就等 Play Games Services 仅在游戏需求实际包含时接入，普通应用不强制增加游戏服务 SDK。
2. **构建与签名**：使用当前规则接受的发行格式，新应用按 Android App Bundle 路线准备；区分上传密钥与 Play App Signing 的应用签名身份。核对当前 target API、工具链、ABI／原生库要求、权限和适用资源交付方式，不写死年度门槛。涉及 OAuth、API、深链等证书绑定时，分别核对实际测试签名和 Play 分发签名，不能用 debug 签名结果证明商店签名可用；凭据不入包／日志。
3. **声明与隐私**：按实际应用和所有入包 SDK 的采集／共享行为填写 Data safety、隐私政策、广告声明、目标受众、内容分级及适用权限资料。声明须覆盖实际行为，非个性化广告不自动等于不采集数据；含账号创建时核对应用内和 Web 的账号删除要求。只落实实际适用能力，不为无账号应用凭空添加账号系统。
4. **购买与权益**：数字内容／订阅按当前 Payments 政策选择 Google Play Billing，地区例外或替代计费仅在符合计划资格与接入条件时采用，不泛化为任意第三方支付。按锁定 Billing Library 的支持期限和实际商品验证待处理、取消、失败、购买确认／消耗、重复通知及权益恢复等适用路径；服务端验单和幂等发货，测试购买须有对应授权。无内购按公共规则移除专用 SDK。
5. **渠道验证**：静态／构建检查后，在已授权的实际测试通道核对安装、首启、签名关联服务、生命周期、断网恢复及适用登录／支付流程。内部测试、封闭测试和生产发布分别记录；受账号类别影响的测试要求按当前后台核对，不用固定人数／天数代替实时事实。构建 AAB 成功不证明通过政策、安装或商店分发验证。
6. **审核与交付**：复用当前候选身份、真实多图与宣传图、商店资料和审核访问说明，保证审核账号／后台可用且不把秘密写入公开素材。上传、轨道推广、提审和生产放量分别记录实际状态；候选准备不包含自动更改 Play Console、真实交易或生产发布。

## 官方资料

资料核对：2026-11-10；年度 API、Billing Library、账号测试和政策要求在实际提审时复核。

- [Android App Bundle](https://developer.android.com/guide/app-bundle)、[应用签名与 Play App Signing](https://developer.android.com/studio/publish/app-signing)、[目标 API 要求](https://developer.android.com/google/play/requirements/target-sdk)。
- [提审前应用内容与声明](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)、[账号删除要求](https://support.google.com/googleplay/android-developer/answer/13316080?hl=en)。
- [Payments 政策说明](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en-GB)。
- [Billing 接入与交易处理](https://developer.android.com/google/play/billing/integrate)。
