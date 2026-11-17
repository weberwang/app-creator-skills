# TapTap 广告按引擎与宿主接入

已选择 TapTap 广告时，统一采用用户已确定的 [Dirichlet 聚合](https://ssp.dirichlet.cn/docs/dirichlet/)，无需再次询问聚合方案。确认实际引擎、目标宿主、广告形式、后台主体与广告位，按下表接线并核对当前官方聚合 SDK、后台配置及所需网络依赖。其他 SDK 的选择仍按原有范围确认；TapTap 广告不自动改用 AdMob／MAX 或套用 MAX 的固定七网络。[广告开通材料](taptap-materials-policy.md)和[渠道隐私与商业规范](channel-platform-integration.md#隐私与商业能力)继续适用。

## 先确认宿主

依照[官方广告接入指引](https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/)，APK 使用 Dirichlet 广告联盟；[Tap 小游戏支持 Dirichlet 聚合](https://developer.taptap.cn/minigameapidoc/tap-operation/operation/monetization-operation/IAA/dirichlet-intro/)，通过小游戏媒体和真实宿主接口接入，不安装 APK 聚合包。H5 小游戏、星火和 TapTap 制造提供开发者中心的平台广告，尚须核实是否支持所选聚合，不能从平台接口或账户开通推断支持。无法确认或不支持时记录该宿主的聚合接入缺口，继续独立工程，不切换其他广告方案绕过。应用身份、账号权限、开放格式及后台开通状态分别核实；普通浏览器、编辑器、其他小游戏宿主或 PC 包不能仅因使用相同引擎而视作已支持。TapTap CLI 管理渠道资料，不是客户端广告 SDK。

## 引擎适配路线

| 引擎与目标 | 接入方式及本工作流实际覆盖 |
| --- | --- |
| Unity，原生 APK | 采用官方 [Unity 聚合 SDK](https://ssp.dirichlet.cn/docs/dirichlet-mediation-sdk/dirichlet-mediation-sdk-guide-unity/)，按其实际 C# 接口建立本引擎广告适配和独立初始化管理。工作流现有 [TapSDK Unity 模块](../assets/channel-sdks/unity/TapTap/)不包含联盟广告实现，安装 TapSDK 不代表广告已接通 |
| Unity，Tap 小游戏 | 按官方 [Unity WebGL 小游戏适配](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-webGL/)及[广告指南](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-ad/)接入小游戏媒体和真实宿主 C# 接口，核实导出版本及广告位。它与 APK 的 Unity 广告包是不同路线；本工作流当前未交付 Unity 小游戏广告封装 |
| Unity，H5／星火／制造 | 核实当前导出工具、实际宿主官方广告接口和 Unity 绑定是否支持 Dirichlet 聚合；无法确认时记录缺口。不能将 APK 或 Tap 小游戏 SDK 直接视为这些宿主的聚合广告接口 |
| Cocos Creator，Tap 小游戏 | 按官方 [Cocos 适配指南](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)核实引擎版本和小游戏类型，并按 [Dirichlet 小游戏指南](https://ssp.dirichlet.cn/docs/mini-program-guide/)接入小游戏媒体和实际宿主接口；复用 [Cocos 渠道接口](../assets/channel-sdks/typescript/engines/cocos/channel-capabilities.ts)、[Cocos 渠道实现](../assets/channel-sdks/typescript/engines/cocos/taptap-minigame-channel.ts)及共享的 [Tap 具名 API](../assets/channel-sdks/typescript/taptap/api.ts)。工作流封装本身不代表后台开通或宿主联调通过 |
| Cocos Creator，原生 APK | 核实实际引擎与 Android 聚合 SDK 支持，优先采用官方提供的对应平台聚合 SDK 和引擎插件；没有可用的 Cocos 官方插件时，实现本引擎 TypeScript 到真实原生聚合 SDK 的具名 JSB 桥。现有 `tap.*` 宿主封装不是 APK 联盟桥接；本工作流当前未交付该桥接 |
| Phaser，Tap 小游戏 | 先证明实际导出可在小游戏宿主运行，再按实际接口复用 [Phaser 渠道接口](../assets/channel-sdks/typescript/engines/phaser/channel-capabilities.ts)、[Phaser 渠道实现](../assets/channel-sdks/typescript/engines/phaser/taptap-minigame-channel.ts)和共享 Tap API；广告位及联盟资格按真实后台确认 |
| Three.js，Tap 小游戏 | 先证明实际导出可在小游戏宿主运行，再按实际接口复用 [Three.js 渠道接口](../assets/channel-sdks/typescript/engines/threejs/channel-capabilities.ts)、[Three.js 渠道实现](../assets/channel-sdks/typescript/engines/threejs/taptap-minigame-channel.ts)和共享 Tap API；广告位及联盟资格按真实后台确认 |
| Phaser／Three.js，原生 APK | 先确认真实原生宿主及其插件机制，再按 Dirichlet 聚合 SDK 建立各引擎的明确能力接口和真实原生桥接；现有小游戏封装、普通网页和 AdMob／MAX 插件均不代表该联盟桥接已交付 |
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
