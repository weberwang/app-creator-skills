# Google Play / App Store 移动端 SDK 复用

在本工作流的渠道归属中，本页代码属于 Google Play（Android）和 App Store（iOS）发行路线共用的 SDK 复用资源：AdMob／AppLovin MAX 负责广告变现，Firebase Analytics／Crashlytics 负责统计与异常，AppsFlyer 负责归因。底层原生实现按引擎共享，不为两个商店重复维护一套相同厂商代码；各商店候选的配置、隐私声明和验证结果分别记录。

渠道覆盖清单应将两条发行路线记为“已有移动端 SDK 复用代码”，再单独标明 Google Play Billing／Play Games Services、StoreKit／Sign in with Apple 等商店原生能力是否实现；不能因这些原生能力尚未封装，就把 Google Play／App Store 整体记为只有文档或没有复用代码。

本页是 Firebase／AppsFlyer 与 AdMob／MAX 原生聚合的具体路线。已选 TapTap 官方游戏服务、平台广告或 Dirichlet／TapADN 时，先按[TapTap 语言与宿主专项](../../app-release/references/taptap-runtime-integration.md)选择，不因项目导出 Android/iOS 就强制改用本页广告方案；已有统计／归因与新增 TapDB 需要按真实消费者避免重复上报。

本页列出可复用模块，不代表它们都是必接项。先按[SDK 分类与多选确认](../../app-release/references/channel-sdk-selection.md)取得完整选择：未选广告无需二选一，Analytics、Crashlytics、AppsFlyer 可以分别选用。现有整包安装器及广告组合根面向带广告的完整方案；部分选择或不含广告时复用本页独立模块及必要共享代码，按需安装官方包，不调用整包脚本再把完整依赖清单当用户选择。

Unity、Cocos Creator、Phaser、Three.js 的 Android/iOS 项目复用本资源中的具体实现。Firebase 负责统计、事件和异常，AppsFlyer 负责归因与事件；广告顶层聚合在 **AdMob 与 AppLovin MAX 中显式二选一**。这些是引擎原生 SDK 能力，不新增 Google Play 渠道适配层，也不用于微信小游戏或 CrazyGames。

## 实现与入口

| 引擎 | 实际调用路线 | 资源 |
| --- | --- | --- |
| Unity | C# 直接调用官方 Firebase、Google Mobile Ads 或 MAX、AppsFlyer SDK | [Unity 实现与编译符号](../assets/mobile-sdks/unity/README.md) |
| Cocos Creator 3.8 | TypeScript 具名能力 → JSB 事件桥 → Java / Objective-C++ 原生 SDK | [Cocos 宿主接线](../assets/mobile-sdks/cocos/README.md) |
| Phaser | 本引擎服务入口 → Capacitor Android/iOS 插件 | [Phaser 服务](../assets/mobile-sdks/engines/phaser/sdk-services.ts) |
| Three.js | 本引擎服务入口 → Capacitor Android/iOS 插件 | [Three.js 服务](../assets/mobile-sdks/engines/threejs/sdk-services.ts) |

Phaser 与 Three.js 共用具名的 [Capacitor 实现](../assets/mobile-sdks/capacitor/composition-root.ts)，各引擎保留自己的接口与唯一应用作用域。普通网页、编辑器与小游戏宿主不能冒充原生成功。SDK 管理器分别持有初始化状态，入口只装配并分别投递，不等待整批就绪；配置错误只影响相应 SDK。

## 接入工作流

先按[所有渠道 SDK 多选确认](../../app-release/references/channel-sdk-selection.md)展示本批必接项与可选项，确认后再运行本节安装脚本和接线。Google Play／App Store 的广告、统计、异常和归因均不因商店确定而自动启用；AdMob／MAX 顶层互斥，Firebase Analytics、Crashlytics、AppsFlyer 分别选择，选定方案的官方必要依赖一并展示。没有实际回复时等待，不从模板 false、默认广告提供方或依赖已存在推定选择。

1. 确认当前引擎、Android/iOS 导出路线及实际所选能力；选用广告时确定唯一顶层聚合，核实各 SDK 官方支持版本、授权来源、原生自动启动路径及网络 adapter。未使用的能力不启动。
2. 按选择复制当前引擎的独立模块和必要共享代码；只有带广告的完整组合与整包工具支持范围一致时，才使用下列脚本预览并复制：

```sh
node .agents/skills/app-domain-toolkit/scripts/sdk/install-mobile-sdks.mjs --project . --engine unity --ad-provider admob --dry-run
node .agents/skills/app-domain-toolkit/scripts/sdk/install-mobile-sdks.mjs --project . --engine unity --ad-provider admob
```

`--engine` 支持 `unity|cocos|phaser|threejs`；`--ad-provider` 必须指定 `admob|max`。默认输出遵循各引擎源码目录，可用 `--output` 指定工程内业务子目录。Cocos 原生源另放 `native/mobile-sdks`，可用 `--native-output` 调整。脚本拒绝越界、链接、元数据目录及不同内容覆盖；重复执行相同安装不重写。维护仓库内把 `.agents/skills/` 换为 `skills/`。

3. 按已确认清单与引擎 README 安装真实供应商 SDK；使用整包工具时核对其生成的 `installed-sdk-selection.json`，选用广告时再加入所选聚合的网络 adapter，完成 Gradle / Xcode / Unity 配置。脚本只复制自有源码与入口，不自动安装包、不修改原生宿主、不写控制台。Cocos 只复制所选原生 provider；Unity 只启用对应编译符号；Capacitor 入口只加载所选广告插件。
4. 唯一应用入口注入真实配置和已有授权策略，分别启动所需 SDK；业务调用明确的统计、异常、归因或广告方法，不从场景重建 SDK、不散布厂商 API。原生宿主重建与释放按对应 README 处理。
5. 先做模块测试和实际供应商依赖编译，再按项目明确授权执行平台验收。记录依赖锁定版本、adapter、宿主配置及未验证项；测试替身通过不代表真实 SDK、原生构建或真机验收通过。

## 已封装能力

所有调用遵守[SDK 不阻塞应用流程](reference-architecture-sdk-initialization.md#sdk-不阻塞应用流程)。启动入口投递即返回，游戏不等待 SDK、授权或超时；授权不足只跳过对应能力。广告预加载留在后台，展示通过同步尝试接口读取当前状态，不可用就立即回到玩法，不能在过关、结算、下一局或用户触发路径等待加载。奖励仅由真实回调交付，游戏继续不依赖关闭或奖励回调到达。

| SDK | 具名能力 |
| --- | --- |
| Firebase Analytics | 采集开关、事件与参数、屏幕、用户标识、用户属性；各栈按官方能力提供实例标识和重置 |
| Firebase Crashlytics | 采集开关、日志、自定义字段、用户标识、非致命异常；各栈按官方能力提供前次崩溃与未发送报告操作 |
| AppsFlyer | 配置、初始化、session-ready 启动、归因/深链回调、事件、UID 与停止；按对应引擎 SDK 的真实完成语义处理 |
| AdMob / MAX | 独立初始化、插屏和激励加载/就绪/展示、奖励/关闭/失败回调、Banner 显隐与释放 |

具体参数和平台能力以各实现的强类型接口为准，不声称封装全部厂商产品 API。Firebase 事件仅接受本资源定义的字符串/有限数值参数。关闭或展示失败不产生奖励，奖励由实际 SDK 信号关联原展示请求并去重。MAX 用随机且不含用户/订单信息的 placement 关联迟到奖励，会改变后台 placement 统计维度；稳定业务场景留在本地。未结算记录达到实现的容量上限时拒绝新激励展示，不能删除旧记录后猜测回调归属。

## 依赖与原生前置

Unity 和 Cocos 使用对应平台官方 SDK；AppsFlyer 7 与旧接口不同，Unity 需要 2023.1+ 的 Awaitable 支持。Android 首次冷启动可能直到下次真实前台才收到 session-ready，SDK 自身保持未就绪或超时，游戏继续；不得为促使归因就绪而主动跳转透明 Activity、人为暂停游戏或等待授权。需更早捕获会话时由项目按锁定 SDK 的官方原生生命周期接线并单独验证。Cocos 必须按 README 在原生 Application / AppDelegate 早期配置。不得用 JS 游戏启动替代要求的宿主生命周期。

Capacitor 路线使用 Capawesome Firebase 8.x 社区原生插件、官方 AppsFlyer Capacitor 7.0.4 与 js-core 7.1.0；AdMob 使用社区插件 8.3.0，MAX 使用官方 Cordova 插件 2.1.0 的 `window.applovin` 与真实事件。安装清单给出依赖约束，项目仍需锁定解析版本并验证 Capacitor / Cordova 原生兼容性；本资源未提供第三方 SDK 二进制。

Firebase 必须在进程启动前按官方原生配置关闭尚未获准的自动采集，核对持久化设置优先级；运行时关闭会立即阻止本封装的手动上报，自动采集实际生效时间遵循 SDK，可能需要下次启动。不能宣称撤回了此前数据或立即停止全部后台行为。复用[SDK 独立初始化与隐私策略](reference-architecture-sdk-initialization.md)，不自动创建隐私页面。

AdMob 按[AdMob 聚合约定](reference-ad-admob-contract.md)，MAX 按[MAX 聚合合同](reference-ad-applovin-max-contract.md)；固定七网络仅属于 MAX 路线。MAX 内的 Google AdMob adapter 是聚合网络，不是同时启动第二个顶层聚合。各网络的非个性化、未成年人、授权及初始化预加载条件需要逐项核实；布尔配置是项目已完成前置的证据输入，不替代真实原生配置。

官方核对入口：[Firebase Unity](https://firebase.google.com/docs/unity/setup)、[Crashlytics Unity](https://firebase.google.com/docs/crashlytics/unity/get-started)、[AdMob Unity](https://developers.google.com/admob/unity/quick-start)、[MAX Unity](https://github.com/AppLovin/AppLovin-MAX-Unity-Plugin)、[AppsFlyer Unity](https://github.com/AppsFlyerSDK/appsflyer-unity-plugin)、[AppsFlyer Capacitor API](https://github.com/AppsFlyerSDK/appsflyer-capacitor-plugin/blob/main/docs/API.md)、[Capawesome Analytics](https://capawesome.io/docs/sdks/capacitor/firebase/analytics/)、[Capawesome Crashlytics](https://capawesome.io/docs/sdks/capacitor/firebase/crashlytics/)、[AdMob Capacitor](https://github.com/capacitor-community/admob)、[MAX Cordova](https://github.com/AppLovin/AppLovin-MAX-Cordova)。核对版本不是持续有效保证，项目接入时以锁定依赖与官方源码复核。
