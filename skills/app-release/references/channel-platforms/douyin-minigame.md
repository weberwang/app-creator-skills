# 抖音小游戏渠道接入

仅在目标包含抖音小游戏时使用。小游戏运行在所选抖音系宿主及其专用运行环境中；先执行[渠道平台公共接入规范](../channel-platform-integration.md)，再按实际引擎版本和宿主读取本专项。普通浏览器环境、Web 导出和小程序页面不能直接视为小游戏渠道工程或宿主通过，也不能仅凭技术栈名称推断可以导出。

同一导出方案已实际支持多宿主时，按[运行时平台选择](../channel-platform-integration.md#导出方案与运行时平台选择)结合引擎标识和真实小游戏 API 选择抖音适配器，未选中 SDK 不加载、不初始化；`tt` 名称或浏览器标识不能单独证明小游戏环境。普通抖音内网页与小游戏分别处理，平台识别不能代替专用引擎适配或改变支付资格。

## 确认接入范围

1. 核对开放平台当前的小游戏主体、真实 AppID、类目、目标地区及实际开通的宿主和能力，按游戏内容、商业模式和发布目标确认资质、备案与审核要求；未知项记录待核实，不照搬微信的主体或资质结论。
2. 按锁定的引擎版本选择官方支持的小游戏适配和专用构建路线，核对小游戏工程配置及开发者工具版本。抖音小游戏不是一般浏览器环境，使用 Web API 前须核实宿主适配能力；Cocos 等按实际引擎原生导出能力处理。Unity 项目区分普通小游戏适配与适用条件下的官方原生接入路线，按实际版本、目标宿主和平台当前条件选择，不将其等同于普通 WebGL。
3. 根据实际网络能力和当前平台要求配置合法安全域名，核对请求、下载、资源托管、环境及白名单；按需要处理主包、资源加载或分包，不写死包体数字，也不为未选择的宿主生成构建产物。

## 接入与验证

- 登录仅在产品实际需要时接入。按抖音当前账号合同区分匿名身份与宿主账号授权，使用实际返回的临时凭证由可信服务端交换并核验会话；AppSecret、会话密钥和服务端凭据不得进入客户端、日志、截图或源码仓库。处理用户拒绝、匿名到授权的身份关联、过期、断网及恢复，不能直接照搬微信身份或假造成功。
- 按平台当期隐私及个人信息规则核查实际 API 的声明、告知和授权前置，验证允许、拒绝和能力受限的适用路径。平台必需前置未满足时限制相关能力并报告，不能用初始化成功代表用户同意，也不能标记提审就绪；不因普通接入擅自扩建无关隐私中心。
- 通过实际宿主支持的 `onHide`、`onShow` 等生命周期通知处理前后台切换，验证输入、计时、音频、网络、广告及资源恢复。重复进入、重复订阅和迟到回调不得恢复已关闭对象或重复结算；不同宿主和终端分别记录，不以开发者工具预览代替实际宿主结果。
- 仅在确认需要广告时接入适用平台广告能力，遵守当前广告位、展示和隐私要求。激励广告须由用户主动触发，按官方完成、关闭、错误合同判断结果；取消、失败、提前关闭或缺少有效完成结果不发奖，重复及迟到回调幂等。客户端回调不是不可伪造的服务端凭证；有价值权益按平台提供的验证能力和项目风险实现可信核验。
- 仅在确认有内购需求时，按实际主体、类目、宿主、地区和 Android/iOS 等目标终端核对当前支付开通资格与审核限制。尤其核实 iOS 虚拟商品和导付路径的当期规定，不假定各端可使用同一支付方式；服务端按所选能力合同核验订单及异步通知，幂等发货，并处理取消、失败、重复通知、补单与恢复。无内购时执行[内购 SDK 移除规范](../release-readiness.md#内购-sdk-必要性与移除)。

## 提审与交付

- 在现有 GDD/TDD、质量记录与发布清单关联目标宿主及终端、AppID 脱敏身份、引擎/适配插件和开发者工具版本、构建配置、候选内容、适用资质与真实证据；实际审核材料和截图须反映当前候选，视觉显示由用户人工检查。
- 核对专用工程可被当前开发者工具识别、构建和预览；按授权情况分别验证实际目标宿主的生命周期、账号、广告、支付、网络和失败恢复，记录不支持、未运行及环境限制。开发工具构建、源码上传、平台审核与正式上线是独立事实，不以其中任何一项替代其他项。
- 平台后台账号配置、上传、提审、正式发布、真实交易、真实广告点击及真机验收须有对应明确授权。缺少工具、账号、资质或宿主时报告阻断和可继续的本地工作，不虚构审核或运行结果。

## 官方资料

资料核对日期：2026-11-10。接入和提审时重新核对实际宿主及终端的官方要求，规则变化以平台当期资料为准。

- [小游戏开发指南](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/develop/)、[引擎适配说明](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/game-engine/engine-adaptation-instructions)、[Unity 原生接入指南](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/game-engine/rd-to-SCgame/unity-game-access/install-connect/sc_access_guide)。
- [小游戏账号能力](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/c-api/open-ability/account)、[服务端 code2Session](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/basic-abilities/log-in/code-2-session)、[支付能力接入](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/payment/access-process)。
- [版本提审](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/examineguide)、[小游戏审核规范](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/standard)。
