# 微信小游戏渠道接入

仅在目标包含微信小游戏时使用。小游戏运行在微信宿主及其专用运行环境中；先执行[渠道平台公共接入规范](../channel-platform-integration.md)，再按实际引擎版本读取本专项。普通 Web 包、小程序页面或编辑器预览不能代替小游戏渠道工程和宿主验证，也不能仅凭技术栈名称推断可以导出。

同一导出方案已实际支持多宿主时，按[运行时平台选择](../channel-platform-integration.md#导出方案与运行时平台选择)结合引擎标识和真实小游戏能力选中微信适配器；不为探测环境初始化其他渠道 SDK。微信浏览器中的 H5 与微信小游戏分别识别，不能仅凭 User-Agent 或 `wx` 全局对象调用小游戏 API；若需求实际是 H5，按当前[微信网页 JS-SDK](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html)另核实必要能力，不用本专项冒充 H5 接入。

## 确认接入范围

1. 核对微信平台当前小游戏类目、开发主体、真实 AppID、目标地区、商业模式及对应资质和备案要求。按实际广告变现（IAA）、内购（IAP）及是否涉及其他能力分别核对；不要把某一种资质当作所有游戏固定要求。测试号的能力有限，不能把它当作正式账号上传、发布或商业化验证的证据。
2. 按项目锁定的引擎和版本选择当前官方支持的小游戏适配、构建和开发者工具路线；Unity 采用适用版本的官方适配方案，Cocos 等以实际引擎的导出支持为准。确认渠道工程配置、主包及资源加载方式；只有达到实际需求或平台条件时才安排分包，不固定包体数值或无故引入分包。
3. 按平台当前要求登记业务网络的安全域名、服务端及测试环境，核对 HTTPS、资源下载、合法域名和实际接口可用性；不得将测试域名或凭据默认为正式配置。开发者工具结果、合法域名核查与实际目标宿主运行分别记录。

## 接入与验证

- 登录仅在产品确有账号需求时接入。按小游戏登录合同在客户端获取临时凭证，由可信服务端与微信交换会话；AppSecret、会话密钥和服务端凭据不得写入客户端、日志、截图或源码仓库。测试匿名、取消、过期、断网、重复请求和恢复时，以实际能力为准，不伪造微信身份。
- 按当前官方隐私指引识别实际调用的个人信息相关 API、告知和授权前置，核对声明、同意、拒绝及所选能力的可用路径。平台要求的前置未满足时限制受影响能力并报告，不能冒充同意或提审就绪；不因普通接入擅自扩建无关隐私中心。应用级隐私状态与平台授权分别管理。
- 接入微信小游戏的进入后台/返回前台通知，按实际玩法验证 `onHide`、`onShow` 对输入、计时、音频、广告、网络及资源恢复的影响；重复通知、异步迟到、切后台及返回后不得重复注册、错误发奖或恢复已关闭场景。宿主能力不可用时按用途返回明确结果，不阻塞无关功能。
- 只有确认需要广告时选择微信适用的广告能力。激励广告由用户主动触发，按微信当前完成、关闭、错误回调合同判断结果；提前关闭、失败、取消或未获得有效完成结果不发奖，重复或迟到回调须幂等。客户端回调不是不可伪造的服务端凭证；涉及有价值权益时按平台提供的验证能力和项目风险实现可信核验。
- 只有产品存在适用内购时接入微信当前支持的虚拟支付方案。按主体、类目、目标终端和最新规则核对开通条件与限制；由服务端按选用能力的官方合同核验订单与异步通知，幂等发货并处理取消、失败、重复通知、补单与恢复。没有内购时遵守[内购 SDK 移除规范](../release-readiness.md#内购-sdk-必要性与移除)，不得因渠道存在而预装专用内购 SDK。

## 提审与交付

- 在现有 GDD/TDD、质量记录及发布清单中关联已选渠道、AppID 脱敏身份、引擎/插件版本、开发者工具版本、构建配置、候选内容、适用资质和实际证据。渠道包与素材、隐私说明、备案资料和审核说明须对应当前内容；真实玩法截图按平台要求准备，并交用户人工检查。
- 核对小游戏工程能由当前开发者工具识别、构建和预览；按授权情况验证目标宿主、生命周期、登录、广告、支付及失败路径，分别列出未运行的终端或能力。开发者工具构建成功、源代码上传、审核通过、发布上线分别记录，不能互相替代。
- 平台后台账号配置、上传、提审、正式发布、真实交易、真实广告点击及真机验收须有对应明确授权。缺少工具、账号、资质或环境时记录阻断和可继续的本地工作，不虚构审核或运行结果。

## 官方资料

资料核对日期：2026-11-10。接入和提审时重新核对当前官方要求与后台状态，规则变化以平台当期资料为准。

- [小游戏接入指南及资质](https://developers.weixin.qq.com/minigame/introduction/guide/)、[IAP 游戏资质](https://developers.weixin.qq.com/minigame/introduction/guide/zzsh-iap.html)、[内容与备案](https://developers.weixin.qq.com/minigame/introduction/guide/nrjs.html)。
- [小游戏开发指南](https://developers.weixin.qq.com/minigame/dev/guide/)、[Unity 适配指南](https://developers.weixin.qq.com/minigame/dev/guide/game-engine/unity-webgl-transform/Design/Guide.html)、[分包加载](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html)。
- [小游戏登录](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/login.html)、[隐私合规](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/privacy.html)、[激励视频广告](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/ad/rewarded-video-ad.html)、[虚拟支付](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/guide.html)。
