# TapTap 材料、开通与政策核查

用于已选 TapTap 的真实目标应用。先确认地区、开发者主体、游戏身份、宿主和商业模式，再按需读取[运行时能力](taptap-runtime-integration.md)或 [CLI 管理](channel-platforms/taptap.md)。本页区分需要真实证明的材料、账号持有人完成的后台操作和可自动推进的工程实现；不为未选功能收集证件或创建账户。

## 材料与后台操作

| 工作项 | 开发者提供／确认 | 工程可以先完成 | 官方来源 |
| --- | --- | --- | --- |
| 主体认证 | 个人的姓名、地址、身份证明和联系方式；企业的营业执照、认证公函、联系方式等，以当前表单为准 | 缺项检查与材料整理；已有认证直接复用 | [开发者入驻](https://developer.taptap.cn/docs/store/) |
| 应用与登录 | 正确应用身份、包名／签名等配置，后台开通登录及账号权限；不因接登录单独索要收款材料 | SDK、授权登录、会话、退出和账号绑定；真实 ID 缺失时不能假称联调通过 | [登录](https://developer.taptap.cn/docs/sdk/taptap-login/features/) |
| 实名／防沉迷 | 后台开通对应方案；有版号时完成中宣部系统注册、接口测试／审核和凭证配置；无版号按相应方案办理 | 登录依赖、认证／可玩时段／年龄／消费控制、测试账号路径 | [合规认证](https://developer.taptap.cn/docs/sdk/anti-addiction/features/) |
| H5／星火／制造广告 | 完成认证与财务主体、收款账户和开户行等信息，申请广告开通；核实所选 Dirichlet 聚合是否支持该宿主 | 按[引擎与宿主路线](taptap-ad-integration.md)准备真实聚合适配及展示、奖励、失败恢复；宿主支持未知时记录缺口 | [广告开通](https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/) |
| APK／Tap 小游戏广告 | 按 Dirichlet 聚合对应入驻、账户、应用及广告位要求核实；不套用 H5 开通表单 | 复用[Unity 官方聚合封装／三引擎 Android 桥接](taptap-ads-usage.md)或已支持的小游戏接口；安装官方依赖并核对真实宿主，未交付的路线明确缺口 | [Dirichlet 聚合](https://ssp.dirichlet.cn/docs/dirichlet/)、[广告路线](https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/) |
| Android 原生内购 | 营业执照、法人及必要受益人／管理员证件、版号、软著、适用授权、联系方式、结算账户；二级商户开户、审核与签约 | 支付 UI、订单／履约／补单／退款接口；商品和真实账户需开通后联调 | [创建商户](https://developer.taptap.cn/docs/sdk/tap-iap/create-merchant/) |
| 微信 App 支付 | 额外提供微信开放平台 AppID、已开放下载的商店页和游戏／支付截图，管理员完成扫码、验证及签约；当前指南要求上线后申请。未上线可先按条件开通支付宝 | 共用内购接入代码、支付页面及截图采集准备；实际画面由用户人工检查 | [商户申请细则](https://developer.taptap.cn/docs/sdk/tap-iap/create-merchant/) |
| 小游戏虚拟支付 | 认证个体工商户或企业、实名、版号／软著、提现账户、管理员及协议签约；确认目标应用有权限 | 商品、服务端签名／验单、幂等发货和沙箱接线 | [虚拟支付](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/payment/payment/) |
| PC 买断／DLC | 对应版号及授权、付费合同、财务主体、商品／价格和测试权限 | 启动／正版／DLC 权益校验、受限与购买恢复 | [PC 买断](https://developer.taptap.cn/docs/pc-store/guide/pc-b2p/) |
| 云存档／排行／成就／好友／联机 | 开通实际服务、确认账号体系、ID／素材／规则和配额（如适用） | 按本引擎实现具名 SDK 接线与游戏行为，不默认要求商户资质 | [能力矩阵](https://developer.taptap.cn/docs/sdk/) |
| 角色查询／礼包／手机号回调 | 真实数据字段、素材／绑定协议、已授权用途、回调地址及活动配置；直达礼包需符合备案 HTTPS 域名要求 | 服务端验签、回调／解密、角色与权益服务接线，客户端深链；业务结果必须来自真实数据 | [角色查询](https://developer.taptap.cn/docs/sdk/game-record/features/)、[直达礼包](https://developer.taptap.cn/docs/sdk/instant-gift/features/)、[手机号](https://developer.taptap.cn/docs/sdk/reserve-phone-authorization/) |

证件、银行卡、服务端密钥等通过平台或已有安全通道处理，不要求把原件发到聊天、仓库或工单日志。账号持有人负责身份验证和对应签约；代理可准备可审查的材料与配置，在已有明确授权内使用 CLI／后台，授权边界沿用公共协议，不重复建立一套审批流程。

## 政策检查与候选边界

- **资质**：移动游戏收费／内购、正式上线与试玩、联网备案、软著和授权链按目标应用与当前官方规范核查。开通暂无版号的认证服务不等于获得收费资格；广告开通也不自动证明其他资质合格。[入门与资质](https://developer.taptap.cn/docs/store/standardies-operation/)、[审核规范](https://developer.taptap.cn/docs/store/release/publish/agree/)、[APP 备案／核准说明](https://developer.taptap.cn/docs/store/release/policy/filing-notice/)
- **未成年人**：适用网络游戏按实名认证、可玩时段和按年龄消费限额接线；不能以 SDK 超时、默认游客或断网放行绕过。当前时段按周五、周六、周日及法定节假日 20:00–21:00，每日一小时核查；其他限制按相应当前法规和服务合同，避免把单一年龄档额度套给全部用户。[国家新闻出版署通知](https://www.nppa.gov.cn/xxfb/tzgs/202108/t20210830_666285.html)、[TapTap 防沉迷策略](https://developer.taptap.cn/docs/sdk/anti-addiction/features/)
- **隐私**：主体、实际收集目的／范围／第三方 SDK、有效链接和应用内内容一致；TapSDK 在用户同意隐私政策后初始化。工程负责真实行为与告知实现，开发者核实主体、联系方式、数据处理事实和文本；不把接入 SDK 视为已取得同意。[SDK 合规使用](https://developer.taptap.cn/docs/sdk/start/compliance/)、[商店安全合规](https://developer.taptap.cn/docs/store/release/policy/policy-guide/)
- **广告与交易**：付费明码标价，禁止诱导站外充值、自动扣费、欺骗广告、不可关闭的悬浮广告和后台继续展示；激励完成、客户端付款回调、平台验单和实际发货分别记录。沙箱、真实交易、点击广告、退款和提现是不同操作，不从文档测试要求推导授权。[审核规范](https://developer.taptap.cn/docs/store/release/publish/agree/)
- **费率与结算**：平台零分成不等于支付渠道零手续费；原生 IAP、小游戏广告、小游戏支付、PC 买断分别按当前合同、财务主体与后台记录核查，不在通用工作流固定统一费率或到账承诺。[原生 IAP](https://developer.taptap.cn/docs/sdk/tap-iap/overview/)、[PC 买断](https://developer.taptap.cn/docs/pc-store/guide/pc-b2p/)

## 已知文档冲突

资料核对：2026-11-17；正式接入及提审时重新核对目标平台当前页面、后台和官方回复，保留来源与适用范围。

1. [小游戏行为规范](https://developer.taptap.cn/minigameapidoc/tap-operation/operation-standards/behavior-standards/)仍列出每日 1.5／3 小时及 22:00–8:00 的旧时长。与国家新闻出版署现有通知冲突的部分不作为实现依据；时长采用上文政策原文，其他疑点按具体条目向官方核实，不能机械复制整页数字。
2. [小游戏介绍](https://developer.taptap.cn/minigameapidoc/quick-start/guide/minigames-intro/)称内购仍在内测，但存在完整虚拟支付接入文档。只据文档存在不能认定当前主体、地区、终端或应用已开放；以后台权限和实际合同核实。
3. SDK 首页的 Android／iOS／Unity／UE5／PC 支持按功能不同。Unity 包可安装不代表每个模块都可在当前终端运行；原生 Android 内购不能因通用检查清单出现 iOS 字样就被声明支持 iOS。

候选完成条件：已选能力都有真实实现、必要开通与资质依据，以及对应测试证据或清楚的未验证结论。只阻断依赖缺口的能力或候选；不为无关功能扩建材料或业务。管理端成功、模拟通过、本地编译、实际宿主和正式上线分别报告。
