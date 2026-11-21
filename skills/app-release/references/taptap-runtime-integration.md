# TapTap 运行时能力与代码复用

用于已选择 TapTap 登录、合规认证、商业变现或游戏服务的项目。先按[渠道平台接入](channel-platform-integration.md)确认地区、终端、真实宿主和工程导出，再读取本页实际需要的模块。开发者中心操作继续使用 [TapTap CLI](channel-platforms/taptap.md)；CLI 登录不等于玩家登录，上传包体不等于接入 SDK。

## 工作项与前置条件

TapTap 先纳入[全渠道 SDK 分类与多选确认](channel-sdk-selection.md)：按本次 APK／PC／小游戏／H5／TapPlay 的真实强制条件列必接项，其他能力集中多选；确认整套范围后才按下文阶段统一接入。已有明确选择直接沿用，未回复不自动选中登录、广告、统计或其他服务，材料盘点可先继续。

沿用七阶段和既有 MODULE／INTEGRATION／RELEASE，不增加状态机或审批字段。在现有技术规格或任务中逐项记录：选用能力、宿主／语言／SDK 版本、官方来源、实现文件、真实配置来源、[材料与开通](taptap-materials-policy.md)、业务所有者、失败处理、当前证据和未验证项。已有效的认证和材料直接复用，只补缺口。

| 阶段 | 本阶段交付 |
| --- | --- |
| 需求与范围 | 确认 APK／PC／Tap 小游戏／H5／TapTap 制造或星火；选择登录、合规、广告、内购／买断及所需生态能力，明确不做项；把材料、服务开通和工程实现分别列入已有任务 |
| 全局基线 | 按本页语言路线确定独立 SDK 模块、版本及平台范围；定义账号、存档、交易、奖励和回调所有者，复核隐私与原生自动初始化路径 |
| 基础工程 | 安装所选可复用代码，接入官方包与唯一装配入口；核验真实宿主、配置和按用途授权；先打通最小产物，缺少真实配置明确受限 |
| 功能批次 | 业务消费具名接口；服务端实现自身账号、角色、订单和权益持久化，不逐项目重写平台协议；先实现可独立验证部分，不等待无关材料 |
| 最终集成 | 按已选能力覆盖拒绝、取消、断网、重复／迟到回调、退出和重建；分别记录替身测试、官方依赖编译和真实宿主结果 |
| 发布准备 | 关联同一候选、官方 SDK 解析版本、已开通服务、资质和实际生效配置；核对政策及材料，未执行真机／交易／发布保持未验证 |

## 宿主与语言路线

同为 TapTap 分发不意味着共享一套运行时。只有不依赖引擎的具体协议代码才能复用；各引擎保留自身装配与类型接口。没有真实桥接的栈不能因分发了参考资料而标记已支持。

| 工程／语言 | 复用资源与边界 |
| --- | --- |
| Unity C# | [Unity 源码](../assets/channel-sdks/unity/)直接调用官方 TapSDK 类型，按模块编译符号隔离；Core／Login 及实际选用模块通过官方 UPM 包引入。广告另用[官方 Unity 聚合 SDK 的可复用封装](taptap-ads-usage.md#unity-使用)，不把通用 TapSDK 当广告 SDK。以模块来源清单锁定版本和平台；Unity 不存在官方 Share 模块时不伪造分享封装 |
| Cocos Creator TypeScript | Tap 小游戏使用[本引擎接口](../assets/channel-sdks/typescript/engines/cocos/)及[共享 Tap 实现](../assets/channel-sdks/typescript/taptap/)；前提是 Creator 的实际小游戏导出和宿主已验证。原生 APK／iOS 需要真实 Java／Swift／Objective-C 桥接，不能拿小游戏 `tap` API 代替 |
| Phaser／Three.js TypeScript | 分别使用[Phaser 接口](../assets/channel-sdks/typescript/engines/phaser/)／[Three.js 接口](../assets/channel-sdks/typescript/engines/threejs/)和共享 Tap 实现；必须先证实无 DOM/BOM 的小游戏 VM 可运行实际产物。普通 H5、WebView 和 Tap 小游戏分别判定，不能注入假的 `tap` 对象冒充支持 |
| Node.js JavaScript／TypeScript | [服务端协议源码](../assets/channel-sdks/nodejs/)负责登录凭证交换、已核实协议的签名／验签、回调解析及解密。源文件仅在服务端使用；导入不启动服务，不自动存储账号、发货或注册路由 |
| Android Java／Kotlin、iOS Swift／Objective-C | 按[官方能力矩阵](https://developer.taptap.cn/docs/sdk/)选本平台 SDK。没有已交付的本语言桥接代码时明确记录缺口；将核实后的桥接回收到工作流，再接入项目，不拷贝 Unity 调用或猜造原生方法 |
| Flutter Dart／Expo React Native | 当前没有随本工作流交付的 TapTap 原生桥接。只有在对应平台的真实插件／原生模块已实现和验证后才使用；不得将小游戏 TS、Unity C# 或 Capacitor 适配器称为该栈现成 SDK |
| Roblox／ESP32 | 不提供 TapTap 客户端 SDK 路线；确有管理任务时只使用 CLI；实际服务器模块可单独采用 Node.js 协议资源 |

## 能力选择与完成条件

下表是按需索引，不是要求每个项目启用全部功能。具体已交付方法及源码来源以对应语言目录的来源清单为准；官方支持、工作流代码覆盖、项目服务开通与实际验证分别记录。

| 能力 | 接线与验证要点 | 官方入口 |
| --- | --- | --- |
| 登录 | 原生授权、账号绑定、静默恢复、取消／失效／退出；小游戏 `login` code 交服务端 `code2Session`，不把临时凭证当业务会话 | [登录](https://developer.taptap.cn/docs/sdk/taptap-login/features/)、[小游戏登录态](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/login-management/) |
| 实名认证／防沉迷 | 登录依赖、认证结果、账号切换、可玩时段、年龄与消费限制；有版号／暂无版号的开通路线分别核对 | [合规认证](https://developer.taptap.cn/docs/sdk/anti-addiction/features/) |
| 正版／DLC | 启动校验、购买资格、查询和购买 DLC、权益更新；买断和消耗品内购不是同一能力 | [正版验证](https://developer.taptap.cn/docs/sdk/) |
| 广告 | 统一采用已选 Dirichlet 聚合，按[引擎与宿主](taptap-ad-integration.md)核对官方支持和已交付的适配；预加载与展示分离，奖励只由有效完成结果幂等结算 | [Dirichlet 聚合](https://ssp.dirichlet.cn/docs/dirichlet/)、[宿主广告路线](https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/) |
| 内购 | 原生 Tap Payment／Unity Purchasing 与小游戏虚拟支付分别接线；商品、未完成订单、验单、补单、退款和权益同步归订单服务 | [原生内购](https://developer.taptap.cn/docs/sdk/tap-iap/overview/)、[小游戏支付](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/payment/payment/) |
| 云存档 | 创建／更新／删除／查询／下载；明确本地与云端冲突、存档版本、跨设备身份及失败恢复，不以最后一个回调盲目覆盖 | [云存档](https://developer.taptap.cn/docs/sdk/tap-cloudsave/features/) |
| 排行榜／成就 | 提交成绩、查询与显示；成就解锁／增量和回调；榜单／成就 ID、素材及反作弊按业务定义 | [排行](https://developer.taptap.cn/docs/sdk/leaderboard/features/)、[成就](https://developer.taptap.cn/docs/sdk/achievement/features/) |
| 好友／多人联机 | 好友关系、邀请、消息，以及连接、房间、玩家状态、帧同步和断线恢复；不把好友邀请当游戏服务器授权 | [好友](https://developer.taptap.cn/docs/sdk/tap-relation/features/)、[联机](https://developer.taptap.cn/docs/sdk/tap-online-battle/features/) |
| 更新／分享／评价／内嵌动态／REP | 逐模块核对平台；更新唤起和评价目前仅 Android。社区、资源置换跳转不代表已开通广告变现 | [服务矩阵](https://developer.taptap.cn/docs/sdk/) |
| TapDB | 用户与事件、购买事件和广告投放归因；确认授权、事件口径和已有 Firebase／AppsFlyer 消费者，不重复上报，不把分析购买事件当验单 | [TapDB](https://developer.taptap.cn/docs/sdk/tapdb/features/) |
| 角色查询 | 绑定方式、角色列表、绑定／解绑通知及数据推送；只推送已授权且属于对应账号的角色，业务数据结构由真实配置确定 | [角色接口](https://developer.taptap.cn/docs/sdk/game-record/server-guide/role-bind/) |
| 直达礼包／礼包码／TapLink | 区服／角色查询、发送礼包、兑换核销和深链；验签、角色归属和持久幂等由业务所有者落实，客户端跳转不代表发奖 | [直达礼包](https://developer.taptap.cn/docs/sdk/instant-gift/guide/)、[礼包码](https://developer.taptap.cn/docs/sdk/tds-gift/features/)、[TapLink](https://developer.taptap.cn/docs/sdk/taplink/features/) |
| 预约手机号授权 | 接收 authorize／cancel／test，先验签后解密；按事件身份幂等处理，撤销更新授权状态，test 不写正式业务 | [手机号回调](https://developer.taptap.cn/docs/sdk/reserve-phone-authorization/) |
| TapPlay／APK 加固 | 属于所选发行和包体处理路线，非一律新增 SDK；核对实际后台授权、包体和宿主限制，不据此免除其他候选的合规义务 | [TapPlay](https://developer.taptap.cn/docs/sdk/tap-play/features/) |

## 接入可复用源码

复用[渠道安装器](../scripts/install-channel-sdks.mjs)，维护仓库使用 `skills/`，项目使用已安装的 `.agents/skills/`。先检查计划再复制；已有差异拒绝覆盖，不把 `.agents` 作为运行时导入路径。

```sh
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine unity --dry-run
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine unity
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine cocos
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine nodejs
```

Unity 默认落到 `Assets/Scripts/Platform/Channels/`，Cocos 为 `assets/scripts/platform/channels/`，Phaser／Three.js 为 `src/platform/channels/`，Node.js 为 `src/integrations/taptap/`；可用 `--output` 指定工程内目录。安装器只复制自有源码，不安装或开通厂商服务；按已选模块安装官方包与符号，不选内购时不引入内购 SDK。

TypeScript 用本引擎 `createChannelSelector()`，显式提供已核实的 Tap 小游戏宿主信号；Unity 用 `ChannelSelector` 的 TapTap 入口，遵守[Unity 接入说明](../assets/channel-sdks/unity/integration.md)。共享加载入口不以 `tap` 对象存在、网页 UA 或渠道名猜选宿主。仅选择器／SDK 管理器拥有初始化，各业务调用明确模块与方法，禁止字符串 API 路径分发或反射。

服务端导入具名协议方法，将原始 HTTP method、未经重排的 path/query、原始请求体和原始头传入验签；框架必须在 JSON 解析前保留 body。Server Secret、小游戏 secret、session_key 和支付 key 只从服务端安全配置取得；不得拷入客户端、日志或测试证据。不同协议的签名规则分别实现，不能把 S2S HMAC 直接套到 Tap Payment、小游戏支付或登录鉴权。业务持久幂等与事务不由内存集合替代；路由、账号、订单和道具发放接入实际工程既有服务，不新造成功返回。

Node.js 的 `index.mjs`／`index.d.mts` 提供具名入口与类型：`TapTapMiniappClient` 交换会话、获取稳定凭据和查询订单，`signTapRequest`／`verifyTapRequest` 处理 S2S，`parseReservePhoneCallback`／`parseRoleBindingCallback`／`parseDirectGiftCallback` 解析对应业务。小游戏支付单独使用 `signGameItemPayment`、`signTapUserData`、`verifyMiniappPaymentProbe`、`parseMiniappPaymentDelivery` 和 `assertMiniappDeliveryMatchesOrder`，不以解密成功或客户端付款完成代替订单、环境、商品、数量和金额核对。解析器不写数据库或发货；已核对订单须在真实持久事务中按业务身份去重和履约，模拟消息不得进入正式发货。

## 生命周期与授权边界

遵守[独立 SDK 初始化](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)。TapSDK 的隐私同意和官方模块依赖属于真实前置，未满足时不初始化受影响模块。界面和无关业务继续运行；**法律或平台强制实名、时段、年龄和消费限制必须阻止对应游戏服务／交易，不能用“不阻塞 SDK”跳过限制或开放游客游玩**。

激励广告 SDK 未提供展示身份时，不制造平台不存在的关联字段。复用真实单例、串行展示、有效加载与完成事件，并在业务侧按已受理展示幂等结算；没有可信身份的跨请求异常迟到事件属于实际宿主核验项，不能宣称本地替身测试已证明全部串单风险消失。页面退出不等于取消已受理交易，奖励、订单和联网房间由明确所有者收尾。

资料核对：2026-11-17。Unity 代码基于官方 4.11.1 固定提交 `a241d3bd89530b4590936e0065a06d765097cb32`；各目录清单记录实际覆盖与来源。执行时核对解析版本、终端和后台资格，不能从可变文档 URL 推定长期有效。测试只证明其实际覆盖层级；真实引擎构建、原生桥接、小游戏宿主、广告填充、交易和外部配置按项目证据分别验收，不自动真机运行或发布。
