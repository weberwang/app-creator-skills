# 广告接入的通用交接

本规范是列入迁移清单的技术栈共用的完整规则。每段标明适用栈；执行时同时读取本栈技能的原生约束与“本栈配套资料”，资料路径和具体工具由栈入口维护。公共状态与授权仍由 app-workflow-control 管理。

## 完整流程

### 适用范围与硬边界（phaser、threejs）

- iOS 与 Android 只使用 AppLovin 官方 `cordova-plugin-applovin-max`。实施前必须按“官方 Cordova 集成文档”（见本栈配套资料）和“官方仓库”（见本栈配套资料）核对插件版本、Capacitor Cordova 兼容层、Android Gradle 与 iOS 包管理器；不兼容时阻断并报告，不回退到社区插件、自建 Capacitor 原生插件或业务代码直连 MAX SDK。

### 适用范围与硬边界（phaser、threejs）

- 本 Skill 不替项目自动配置 MAX 控制台、广告网络账号、商店元数据或发布渠道。SDK key 与 ad unit ID 按环境从受控构建配置注入官方插件适配层，不手写进业务源码、示例、日志或提交记录；广告网络账号凭证与 Ad Review key 不得进入 Web 代码或公开产物。

### 适用范围与硬边界（phaser、threejs）

- 广告只在自然中断点尝试展示；调用方永不等待广告加载、网络请求或展示完成。不可展示时必须按广告位当前状态立即返回结果，不得阻塞场景切换、输入、主循环或结算流程。后台加载、加载失败和重试保持静默，不弹 Toast。

### 适用范围与硬边界（phaser、threejs）

- Banner 不参与初始化预加载；首次请求展示时才创建原生视图并加载，调用立即返回。收到 loaded 且布局安全、业务仍请求可见时显示；创建或加载失败均保持隐藏并按同一独立退避持续重试；离开展示场景清除可见请求并取消重试，旧回调不得恢复创建或显示。不弹 Toast、不占用错误高度、不等待加载。

### 专业执行与交付（phaser、threejs）

涉及外部写入、付费、真实设备、商店提交、发布或不可逆操作的 A4-A6 动作，必须按对象取得控制面明确批准；本 Skill 不代为批准、执行或推送这些动作，也不自动发起真机运行验收。普通本地文档、桥接代码和单元测试按当前任务授权执行。

### 交付流程（phaser、threejs）

提交最小模块提议：Web/小游戏 no-op、AppLovin 官方 Cordova 插件、共享 TypeScript 业务门面与插件 API 适配器、测试替身。核对官方插件发布版本、许可证、Android/iOS 支持、Capacitor 兼容方式、回调语义和隐私能力；不得提出社区插件或自建原生桥作为备用实现。

### 交付流程（phaser、threejs）

在自然中断点调用 `tryShow`；调用读取指定广告位当前有效实例的就绪属性和业务快照，绝不触发前台加载。匹配的激励视频 `hidden` 回调到达后，广告服务使用单调时钟记录 30 秒插页保护截止时间；保护期内的插页 `tryShow` 必须立即返回 `rewarded-interstitial-delay`，不得调用 MAX show、创建冷却 timer 或弹不可用 Toast。保护期结束后，只要目标广告位 ready、所有 gates open、自然中断条件成立，就可以发起展示。未 ready、同广告位正在展示、隐私未决、网络不可用或平台不支持都立即返回并继续游戏；视频广告不可用或展示失败时，由统一 UI 层消费结构化结果/事件并显示一次不可用 Toast。激励只由匹配的 `rewarded` 回调异步发放且保持幂等；关闭或展示失败后立即静默预加载对应全屏广告位。

### 交付流程（phaser、threejs）

进入可展示 Banner 的页面时，先按当前平台格式、可用宽度和安全区确定预留尺寸与内容 inset，在页面首帧前完成 UI 布局；布局规划不创建广告视图、不请求广告。Banner 展示时只放入预留区域，不调整游戏 UI；实际尺寸无法安全容纳时保持隐藏，在下一次页面或 viewport 布局周期处理。Banner 使用原生广告视图；业务只控制显隐，不自行创建刷新 timer。隐藏、切后台或页面不允许广告时暂停刷新，恢复显示时按合同恢复；不得覆盖游戏按钮、手势区、系统安全区或把空白占位当成已加载广告。

### 交付流程（phaser、threejs）

先完成静态审查、TypeScript/原生编译和状态机单测，再在已授权的目标环境运行平台集成测试。使用 MAX Test Mode 与 Mediation Debugger 按渠道和格式分别核验，检查 `app-ads.txt`、iOS SKAdNetwork、Google CMP/TCF 及 ATT；不以单一网络或单一格式成功冒充全部通过。

### 最低公开契约（phaser、threejs）

结果至少包含稳定的 `ok`、`code`、`platform`、`phase`、`gates` 和必要的 `retryScheduled` 字段；插页因激励视频后的 30 秒保护期被跳过时返回 `rewarded-interstitial-delay` 和 `interstitialDelayRemainingMs`。业务调用方只传环境、能力开关和业务 `slotId`；官方插件适配器按环境解析 SDK key 与 MAX ad unit ID，并仅在插件 API 边界使用。不得把插件原始异常、设备 ID、广告网络账号凭证或完整 waterfall 凭证透传到业务层。`tryShow` 返回“已请求展示”不等于已展示成功。

### 最低公开契约（phaser、threejs）

`InitResult`、`PreloadResult`、`ReadyResult`、`ShowResult` 及 `NativeAdEvent` 的最小字段、隐私 gate/结果码、`instanceGeneration`/`showRequestId` 关联和重复事件幂等规则统一以“接入合同”（见本栈配套资料）为准。

### 交付审查清单（phaser、threejs）

- 平台边界：Web/小游戏调用为 no-op；Android/iOS 仅通过 AppLovin 官方 Cordova 插件调用 MAX，未引入社区插件、自建原生广告插件或直接 SDK 接入；宿主页面生命周期、Activity/ViewController 和前后台切换已明确。

### 交付审查清单（phaser、threejs）

- 生命周期：初始化幂等；每个已配置广告位持有业务 phase、加载计数、retry deadline 和至多一个加载重试 timer，格式匹配的原生对象由官方插件管理；广告服务额外持有激励视频结束后的 30 秒插页保护截止时间，但不为此创建 timer。所有广告位共享该跨格式保护状态等服务级门，不共享加载重试 timer，不设置跨广告位全屏互斥；实例重建递增 `instanceGeneration`，展示请求生成唯一 `showRequestId`；成功初始化立刻投递全部启用的插页与激励视频预加载意图，实际加载经过广告请求隐私门，重复调用不会并发请求。

### 交付审查清单（phaser、threejs）

- 节奏：插页只在自然中断点展示；匹配的激励视频 `hidden` 事件从其单调时间戳起阻断插页 30 秒，保护期只阻断插页，不阻断 Banner、激励视频、后台预加载或奖励结算。保护期内立即静默返回剩余毫秒数，过期后无需 timer 唤醒即可恢复判定；`hidden` 与 `displayFailed` 都会触发对应广告位的后台预加载。

### 交付审查清单（phaser、threejs）

- 就绪判断：全屏广告实例的就绪属性是预加载成功的唯一依据；适配器通过官方 isInterstitialReady/isRewardedAdReady 读取插件内部实例状态，不另存独立 ready 布尔值。loaded 仅触发复核；展示与重试前重新读取，实例不存在、失效或读取失败均视为未就绪；Banner 仍按创建后的加载事件管理，不参与预加载。

### 交付审查清单（phaser、threejs）

- 失败恢复：每个广告位使用独立加载重试 timer，并遵循同一套退避公式持续重试直到成功，不设次数上限；计数、deadline、timer 引用和 in-flight 标记均按广告位隔离，同一广告位只允许一个待执行 timer。后台或离线时分别暂停，恢复后每个到期广告位最多恢复一次；展示失败独立记录并重新预加载，不进入另一套重试逻辑。

### 交付审查清单（phaser、threejs）

- 用户反馈：后台加载、重试和状态变化保持静默；视频广告展示触发在立即判定不可用或异步 `displayFailed` 时只显示一次本地化不可用 Toast，重复/迟到回调不会重复提示；`rewarded-interstitial-delay` 是预期节奏控制，不显示不可用 Toast。

### 交付审查清单（phaser、threejs）

- 验证：每个固定网络均在测试模式或 Mediation Debugger 中单独确认 adapter、加载、展示和官方插件失败回调；检查 MAX waterfall、`app-ads.txt` 和发布前平台清单。单测还要覆盖官方插件广告事件永不返回时，结算通过 fire-and-forget 仍继续，以及适配器 Promise 只等待本地受理/拒绝、不等待广告事件。
