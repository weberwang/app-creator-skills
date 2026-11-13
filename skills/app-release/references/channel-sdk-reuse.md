# 微信小游戏与 CrazyGames SDK 复用

用于 Unity、Cocos Creator、Phaser、Three.js 已确认支持的微信小游戏或 CrazyGames 目标。先读[渠道接入规范](channel-platform-integration.md)，将[工作流渠道源码](../assets/channel-sdks/)接入正式工程。每个引擎有明确能力接口，每个渠道有独立具名实现；项目填写配置、安装对应官方 SDK 并接线，不重新编写同一渠道适配。

## 渠道专属范围

所有渠道遵守[SDK 不阻塞应用流程](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#sdk-不阻塞应用流程)：游戏不等待渠道初始化、隐私选择、广告加载或关闭回调。未就绪或受限立即跳过对应可选能力并继续玩法；渠道广告只在当前真实可用时尝试展示，不排队等待，不以关闭代替奖励。确实依赖登录或交易结果的单项业务单独处理结果，不能把它扩大为全局加载或游戏入口屏障。

只封装渠道特定 API，不接管引擎基础能力。Google Play 沿用引擎原生 SDK 路线，不增加独立渠道层。

| 归属 | 能力与边界 |
| --- | --- |
| 微信渠道 | 登录与账号、必要授权、平台广告、虚拟／米大师支付、分享／邀请、关系链与群能力、客服／订阅、平台排行与用户云存储、开放数据通信、渠道事件与平台统计 |
| CrazyGames 渠道 | Ad、Banner、Game 平台事件与邀请、User、Data 平台存档、Analytics 订单上报、Store |
| 引擎基础能力 | 网络、文件、音频、渲染、普通输入、设备／系统信息及通用本地存储；渠道层不重新封装 |

开放数据域只提供平台通信，不包装 Canvas；微信 `wx.cloud` 的通用云数据库、文件和网络能力不在渠道适配范围。官方声明依赖的结构类型不代表这些基础能力存在于公开渠道接口中。CrazyGames 的环境识别、平台配置和支付宿主判断仍按实际平台合同处理，不因此扩展设备能力。

## 具名接口与实现

业务调用明确的方法、模块和参数，不使用 `call('API 路径')`、动态 Proxy 或通用反射句柄。原始回调型接口保留官方回调及注销身份，Promise／Task 型接口保留异步语义；两平台同名或相似能力不被伪装成相同合同。

| 实现 | 路径与具体入口 |
| --- | --- |
| TypeScript 微信 | [api.ts](../assets/channel-sdks/typescript/wechat/api.ts)：`loginCredential`、`showRewardedAd`、`payMidas`、`payGameItem`、`requestVirtualPayment`、`payVirtual`；[具名方法与对象](../assets/channel-sdks/typescript/wechat/platform.generated.ts)提供渠道原始方法及广告／平台对象的明确方法 |
| TypeScript CrazyGames | [api.ts](../assets/channel-sdks/typescript/crazygames/api.ts)：`api.game`、`api.ad`、`api.banner`、`api.user`、`api.data`、`api.analytics`、`api.store`；包括 `ad.showRewardedAd()`、`user.login()`、`store.purchase(itemId)` |
| Unity | [Unity 接入说明](../assets/channel-sdks/unity/integration.md)：`IChannelCapabilities.Wechat` 与 `.CrazyGames`，按官方 C# 类型逐项调用；广告等平台返回对象也有明确具名封装 |

TypeScript 三引擎分别定义 `engines/<engine>/channel-capabilities.ts`，并有各自渠道文件。只有不依赖引擎的具体实现共用源码，项目不直接依赖 `.agents` 作为运行时目录。入口识别真实平台后，将当前渠道的明确能力接口注入已有业务服务；业务不直接读取 `wx` 或 `CrazyGames.SDK`，也不在页面散布渠道判断。

登录便捷方法只返回临时 code 或 token，必须交给已有可信服务端建立会话。激励结果仅在官方明确完成时为 completed，提前关闭、未知关闭、错误及重复通知不得错误发奖。支付便捷方法返回客户端流程结果并明确需要核验，不能自动发货；已受理交易或广告结算不会因页面销毁而丢掉可信迟到通知。

## 接入正式工程

在项目根目录执行已安装脚本，`--engine` 只选实际引擎：

```sh
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine cocos --dry-run
node .agents/skills/app-release/scripts/install-channel-sdks.mjs --project . --engine cocos
```

| 引擎 | 默认源码目录 |
| --- | --- |
| Unity | `Assets/Scripts/Platform/Channels/` |
| Cocos | `assets/scripts/platform/channels/` |
| Phaser、Three.js | `src/platform/channels/` |

用 `--output <工程内目录>` 配合既有结构。脚本先检查全部冲突，再复制当前引擎接口、渠道实现及共享具体模块；相同文件可重复接入，已有修改拒绝覆盖。更新时审查差异，把通用修复回收到工作流，不替换项目业务。Unity 只为已安装官方 SDK 配置对应的 `APP_CREATOR_WECHAT_SDK`／`APP_CREATOR_CRAZYGAMES_SDK` 符号。

应用唯一入口持有一个选择器：TypeScript 用本引擎的 `createChannelSelector()`，Unity 用 `new ChannelSelector()`。依据真实引擎／宿主信号及受控配置选择实现；未知、冲突或当前构建不支持时不猜选。只有选中 CrazyGames 后才加载 SDK，再核对官方环境；`local` 只能明确用于测试，`disabled` 不提供商业能力。微信 H5 和小游戏分别识别。

同一有效配置重复选择复用实例与初始化任务。切换前释放旧实例，厂商初始化尚未结束时不重建并发初始化。初始化分别投递，不让首帧或无关模块等待 SDK；超时不算成功，旧完成不能复活已释放实例。SDK 原始初始化方法只由管理器调用，不作为第二业务入口公开。

具名接口在 SDK 真实就绪后使用，例如：

```ts
// 业务接收当前引擎的 WechatCapabilities；广告参数来自项目实际配置。
const login = await channel.api.loginCredential();
const result = await channel.api.showRewardedAd(adOptions);
// 只有 result.status === 'completed' 才进入已有奖励结算流程。
const payment = await channel.api.payGameItem(serverSignedOrder);
// payment 为 client_completed 时继续由订单服务核验，不凭客户端结果发货。
```

CrazyGames 的对应业务使用 `channel.api.user.login()`、`channel.api.ad.showRewardedAd()`、`channel.api.store.purchase(itemId)`。两段示例分别属于所选渠道，不在同一渠道上混用。SDK 返回的广告、按钮等对象由业务持有者按其具体 `off...`／`destroy` 方法释放；渠道销毁不等于自动取消所有业务操作。

## 官方来源与覆盖清单

资料核对日期为 2026-11-13。版本、方法、源摘要、纳入范围和引擎差异分别保存在[微信 TS 清单](../assets/channel-sdks/typescript/wechat/surface.json)、[CrazyGames TS 清单](../assets/channel-sdks/typescript/crazygames/api-manifest.json)及 [Unity 清单](../assets/channel-sdks/unity/Generated/sdk-bindings-manifest.json)。未文档化 SDK 内部处理器不伪装成稳定公开接口，缺少官方引擎绑定的方法明确记缺口，不制造成功实现。

- 微信 TS 基于 [3.8.22 官方类型固定提交](https://github.com/wechat-miniprogram/minigame-api-typings/tree/42c427aa8c3961b7a4f8ea5bd6112c2bcf058177)，仅保存渠道类型依赖及其 MIT 许可；JavaScript 运行时由真实小游戏宿主提供，类型文件不是运行时 SDK。
- 微信 Unity 依据[官方转换 SDK 固定提交](https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/tree/915d4bf4f60ef0cd1c29316a8d67257185d609a7)，使用官方真实 C# 参数与回调；不把 TS Promise 接口套到 C# 回调接口上。
- CrazyGames TS 使用[官方 HTML5 v3](https://sdk.crazygames.com/crazygames-sdk-v3.js)及[公开文档](https://docs.crazygames.com/sdk/intro/)。Cocos 官方插件覆盖不全，因此本资源 Cocos 使用同一 HTML5 运行时。
- CrazyGames Unity 使用[官方 Unity 包](https://sdk.crazygames.com/UnityCrazySDK.unitypackage)，实际包摘要和各源文件摘要在 Unity 清单中固定；可变下载 URL 不代表版本已经锁定。

微信 TS 原声明把游戏道具支付的 `signData` 写为对象，但官方注释与 Unity 参数均为原始 JSON 字符串；本实现明确修订为字符串并原样传递，绝不在客户端重新序列化已签名数据。`requestVirtualPayment` 在该小游戏类型版本中遗漏，独立具名封装依据官方 Unity 绑定，调用前核对实际宿主可用性，不声称该类型版本已声明或项目已开通。

微信支付按主体、类目、宿主与当前资质配置；CrazyGames Store／Xsolla 按[官方支付规则](https://docs.crazygames.com/sdk/in-game-purchases/)及[Store 合同](https://docs.crazygames.com/sdk/store/)启用。客户端完整接入不等于获得平台资格，官方本地购买模拟不用于真实发货。签名、验单、幂等结算由已有可信服务端负责。

## 更新与验证

自有具名代码与必要类型、清单随工作流分发，新项目不需运行代码生成器。维护微信 TS 时，先锁定官方声明与摘要，再执行 `.agents/skills/app-release/scripts/generate-wechat-bindings.mjs --source <已核实官方声明目录>`；`--check` 从已交付类型快照验证生成代码未漂移。Unity 的源解析和生成方式见其接入说明。新增渠道能力先在工作流实现并补测试，再交项目使用，不把缺口交给每个项目重新实现。

仓库验证覆盖具名方法逐项调用、参数／返回／回调身份、类型及编译、激励与支付结果、重复和迟到通知、初始化隔离、安装及远程分发。本地替身测试、官方类型编译与真实引擎／宿主证据分别记录。真实 Unity 构建、IL2CPP/AOT、目标小游戏／CrazyGames 宿主、广告填充、支付和服务端验单仍须在项目中验证；没有明确授权不自动执行真机、商业请求、后台写入或发布。
