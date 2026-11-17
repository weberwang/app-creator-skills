# TapTap 广告按引擎与宿主接入

已选择 TapTap 广告时，统一采用用户已确定的 [Dirichlet 聚合](https://ssp.dirichlet.cn/docs/dirichlet/)，无需再次询问聚合方案。确认实际引擎、目标宿主、广告形式、后台主体与广告位，按下表接线并核对当前官方聚合 SDK、后台配置及所需网络依赖。其他 SDK 的选择仍按原有范围确认；TapTap 广告不自动改用 AdMob／MAX 或套用 MAX 的固定七网络。[广告开通材料](taptap-materials-policy.md)和[渠道隐私与商业规范](channel-platform-integration.md#隐私与商业能力)继续适用。

可复用代码、按引擎安装器、固定官方 SDK 下载器和调用方式见[实际代码接入](taptap-ads-usage.md)。Unity 原生直接使用官方 Unity 聚合 C# SDK；Cocos／Phaser／Three.js 原生复用已交付的 Android 聚合核心与各自宿主桥，不为已有官方 Unity 包另造原生广告桥。

## 按引擎下载并使用官方 SDK

SDK 获取是接入任务的一部分：确认范围后，由实施代理在目标工程实际下载／解析并导入对应官方依赖，再复用工作流封装接线，不能仅交付下载链接、来源清单或自有接口就标记完成。先检查工程已有依赖和插件，符合本次引擎、宿主及聚合方案的直接复用；缺少时按下表获取，不一次下载所有引擎的 SDK。

| 实际工程 | 下载／安装对象与使用方式 |
| --- | --- |
| Unity 原生 | 从[官方资源下载](https://ssp.dirichlet.cn/docs/resource-download/)选择 **Unity 聚合 SDK**，核对包内平台支持后导入 Unity 工程，按官方 C# 接口调用；不以 Android AAR、通用 TapSDK 或非聚合 Unity 包替代 |
| Unity Tap 小游戏 | 按[官方 WebGL 适配](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-webGL/)核实官方小游戏 SDK／导出插件；当前已核实公开版本缺少广告 C# 类型，在找到真实可用发布包前保留广告接入缺口，不导入原生 Unity 聚合包冒充支持 |
| Cocos Creator Tap 小游戏 | 从[官方引擎适配指南](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)获取当前 Creator 版本对应的小游戏转换扩展和适配资源，导入并完成实际小游戏构建，再经本引擎渠道接口使用宿主提供的 `tap` 广告能力；类型声明和自有封装不提供宿主运行时 |
| Cocos Creator 原生 | 按真实 Android／iOS 导出目标，从对应聚合手册获取官方原生 SDK 及所选网络依赖，接入本引擎原生工程，再经具名 JSB 桥调用；不为原生工程下载 Unity 包或小游戏适配包 |
| Phaser／Three.js | 先确认真实宿主。小游戏仅获取官方已支持该产物的适配资源并使用宿主 API；原生壳按目标平台获取聚合 Android／iOS SDK，经实际壳插件和本引擎能力接口调用。不把 TypeScript 类型包当作广告 SDK，也不下载其他引擎插件凑齐依赖 |
| Flutter／Expo | 按真实目标平台获取聚合原生 SDK，安装已核实的本栈插件／原生模块或实现桥接；没有对应插件时不能安装 Unity／Cocos 插件后宣称本栈可用 |

获取前根据项目配置确认引擎版本、导出目标和当前已安装依赖，按官方手册选择匹配的发布包、包管理坐标或固定源码版本。保留官方来源、实际解析版本、下载包校验值或锁文件／固定提交，并核对安装位置与最终构建引用。能由包管理器获取的依赖使用其正式流程；离线包导入目标工程的正式插件位置，不手工伪造厂商类型或依赖锁记录。

下载与导入完成后，以真实官方依赖执行本引擎类型检查／编译及必要构建，再接通初始化和已选广告能力。缺少下载权限、匹配版本、官方适配或真实桥接时，报告具体缺口并保留未完成状态，不用替身编译、空适配器或其他引擎包替代；后台开通、真实广告请求及真机验收仍按已有授权分别执行。

## 先确认宿主

依照[官方广告接入指引](https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/)，APK 使用 Dirichlet 广告联盟；[Tap 小游戏支持 Dirichlet 聚合](https://developer.taptap.cn/minigameapidoc/tap-operation/operation/monetization-operation/IAA/dirichlet-intro/)，通过小游戏媒体和真实宿主接口接入，不安装 APK 聚合包。H5 小游戏、星火和 TapTap 制造提供开发者中心的平台广告，尚须核实是否支持所选聚合，不能从平台接口或账户开通推断支持。无法确认或不支持时记录该宿主的聚合接入缺口，继续独立工程，不切换其他广告方案绕过。应用身份、账号权限、开放格式及后台开通状态分别核实；普通浏览器、编辑器、其他小游戏宿主或 PC 包不能仅因使用相同引擎而视作已支持。TapTap CLI 管理渠道资料，不是客户端广告 SDK。

## 引擎适配路线

| 引擎与目标 | 接入方式及本工作流实际覆盖 |
| --- | --- |
| Unity，原生 APK | 下载官方 [Unity 聚合 SDK](https://ssp.dirichlet.cn/docs/dirichlet-mediation-sdk/dirichlet-mediation-sdk-guide-unity/)，复用已交付的 [DirichletManager](../../app-domain-toolkit/assets/mobile-sdks/unity/DirichletManager.cs)及[广告对象管理](../../app-domain-toolkit/assets/mobile-sdks/unity/DirichletAds.cs)，实现本引擎现有 `IMobileAds`。它独立于通用 TapSDK，直接调用官方聚合 C# 接口 |
| Unity，Tap 小游戏 | 官方 [Unity WebGL 适配](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-webGL/)与[广告指南](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-ad/)仍须对照实际发布包。已核实公开 `com.taptap.minigame` 2.0.21 固定提交未包含文档所示广告 C# 类型，当前安装器明确拒绝该路线，不伪造厂商类型或导入原生聚合包冒充支持 |
| Unity，H5／星火／制造 | 核实当前导出工具、实际宿主官方广告接口和 Unity 绑定是否支持 Dirichlet 聚合；无法确认时记录缺口。不能将 APK 或 Tap 小游戏 SDK 直接视为这些宿主的聚合广告接口 |
| Cocos Creator，Tap 小游戏 | 按官方 [Cocos 适配指南](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)核实引擎版本和小游戏类型，并按 [Dirichlet 小游戏指南](https://ssp.dirichlet.cn/docs/mini-program-guide/)接入小游戏媒体和实际宿主接口；复用 [Cocos 渠道接口](../assets/channel-sdks/typescript/engines/cocos/channel-capabilities.ts)、[Cocos 渠道实现](../assets/channel-sdks/typescript/engines/cocos/taptap-minigame-channel.ts)及共享的 [Tap 具名 API](../assets/channel-sdks/typescript/taptap/api.ts)。工作流封装本身不代表后台开通或宿主联调通过 |
| Cocos Creator，原生 APK | 下载 Android 官方聚合 SDK，复用[本引擎入口](../../app-domain-toolkit/assets/mobile-sdks/engines/cocos/dirichlet-ads.ts)、[真实 Android 核心](../../app-domain-toolkit/assets/mobile-sdks/dirichlet/native/android/core/)与[Cocos JSB 接线](../../app-domain-toolkit/assets/mobile-sdks/dirichlet/native/android/cocos/)，接入正式 Android 工程。iOS 桥接尚未交付 |
| Phaser，Tap 小游戏 | 先证明实际导出可在小游戏宿主运行，再按实际接口复用 [Phaser 渠道接口](../assets/channel-sdks/typescript/engines/phaser/channel-capabilities.ts)、[Phaser 渠道实现](../assets/channel-sdks/typescript/engines/phaser/taptap-minigame-channel.ts)和共享 Tap API；广告位及联盟资格按真实后台确认 |
| Three.js，Tap 小游戏 | 先证明实际导出可在小游戏宿主运行，再按实际接口复用 [Three.js 渠道接口](../assets/channel-sdks/typescript/engines/threejs/channel-capabilities.ts)、[Three.js 渠道实现](../assets/channel-sdks/typescript/engines/threejs/taptap-minigame-channel.ts)和共享 Tap API；广告位及联盟资格按真实后台确认 |
| Phaser／Three.js，原生 APK | 下载 Android 官方聚合 SDK；分别复用[Phaser 入口](../../app-domain-toolkit/assets/mobile-sdks/engines/phaser/dirichlet-ads.ts)／[Three.js 入口](../../app-domain-toolkit/assets/mobile-sdks/engines/threejs/dirichlet-ads.ts)、共享[真实 Android 核心](../../app-domain-toolkit/assets/mobile-sdks/dirichlet/native/android/core/)与[Capacitor 插件](../../app-domain-toolkit/assets/mobile-sdks/dirichlet/native/android/capacitor/)。仅支持实际 Android 原生宿主，iOS 桥接尚未交付 |
| Cocos／Phaser／Three.js，H5／星火／制造 | 核实实际宿主官方广告接口及真实引擎运行环境是否支持 Dirichlet 聚合；确认后按实际支持分别实现本引擎适配。不能从小游戏 `tap` 对象或普通 Web 运行结果推定聚合可用；工作流未声明这些宿主的完整广告适配覆盖 |
| Flutter／Expo 原生应用 | 核实目标平台可用的官方聚合插件或原生模块及版本；若缺失则按本栈建立真实桥接。当前工作流未交付 Flutter／Expo 的 Dirichlet 聚合广告桥接 |
| Node.js、ESP32、Roblox | 不在这些运行时安装 TapTap 客户端广告 SDK；存在真实业务服务端职责时独立处理，不将后台或 CLI 操作视作广告展示 |

原生桥接分别遵循官方[聚合 Android](https://ssp.dirichlet.cn/docs/dirichlet-mediation-sdk/dirichlet-sdk-guide/)与[聚合 iOS](https://ssp.dirichlet.cn/docs/dirichlet-mediation-sdk/dirichlet-mediation-sdk-guide-ios/)手册。聚合包已包含 TapADN，不另装独立的非聚合包；广告网络依实际 SDK 版本、后台与商务配置选择，不固定七个。需核实聚合商务白名单、媒体配置、网络与授权文件；方案选择不自动授权签约或后台写入。

Unity 官方[资源下载](https://ssp.dirichlet.cn/docs/resource-download/)与各平台手册的版本可能更新或不一致；项目接入时按实际目标和官方聚合发布包核对并锁定版本，不能从一个平台的版本推断其他平台支持。

## 接线与完成条件

1. 同一引擎内，业务依赖本引擎已有的广告能力接口，唯一装配入口选择实际宿主与实现；独立 SDK 管理器持有初始化、加载、回调和释放。不同引擎可共享已证实不依赖引擎的具体实现，不能共享虚构的宿主能力或在页面中散布平台判断。
2. Tap 小游戏已交付的 `TaptapApi` 提供 `createBannerAd`、`createInterstitialAd` 和 `prepareRewardedAd`；激励通过 `TapRewardedController` 后台加载、即时尝试展示，并由实际关闭结果确认完成。按真实小游戏宿主和聚合媒体使用该接口，封装本身不证明广告位已开通。单例与失败隔离的具体限制见[运行时能力](taptap-runtime-integration.md#生命周期与授权边界)。其他宿主和原生 SDK 按各自真实回调合同实现，不套用小游戏关闭事件。
3. 继续遵守[渠道隐私与商业规范](channel-platform-integration.md#隐私与商业能力)和[SDK 不阻塞应用流程](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#sdk-不阻塞应用流程)：依据[官方个性化设置](https://ssp.dirichlet.cn/docs/personalized/)逐平台、版本和聚合网络核实实际配置，未设置时不得假定默认关闭。该资料已明确 Android 原生设置；Unity C#、iOS 与小游戏各自核实实际可用机制，不推断存在通用桥接或同一开关。授权或非个性化设置无法核实则停用受影响请求；无填充、失败、取消和未知结果不发奖。奖励绑定已受理展示并幂等结算；需要可信服务端验证的权益由现有服务端完成。
4. 在现有 TDD、广告清单和 QA 记录实际引擎版本、宿主、SDK／桥接版本、初始化归属、广告位与资格来源、代码路径及验证结果。分别验证未就绪、无填充、失败、重复请求、关闭和可信奖励；替身测试、真实 SDK 编译、实际宿主和真机证据分别记录。广告请求、真实设备运行与后台写入按既有授权执行，尚未执行的项目保持未验证。

官方资料核对日期：2026-11-17。接入时继续核对所选引擎、宿主和 SDK 版本的最新官方文档，不能从安装或代码编译成功推断联盟已开通或广告可展示。
