# TapTap 聚合广告可复用代码接入

已选广告方案为 Dirichlet 聚合。实现与固定官方依赖见[来源清单](../../app-domain-toolkit/assets/mobile-sdks/dirichlet/source-manifest.json)，总体路线见[按引擎与宿主接入](taptap-ad-integration.md)。仅复制已选引擎的代码及必要公共契约，不调用 AdMob／MAX 的整包安装器，也不引入统计或归因 SDK。

## 按引擎安装代码与下载 SDK

在目标工程根目录执行，维护仓库使用 `skills/` 替换 `.agents/skills/`；先预检已有内容，再安装。以下例子是 Unity 原生目标，Cocos／Phaser／Three.js 将 `--engine` 换为实际引擎：

```sh
node .agents/skills/app-release/scripts/install-taptap-ads.mjs --project . --engine unity --target native --dry-run
node .agents/skills/app-release/scripts/install-taptap-ads.mjs --project . --engine unity --target native
node .agents/skills/app-release/scripts/download-taptap-ads-sdk.mjs --project . --engine unity --dry-run
node .agents/skills/app-release/scripts/download-taptap-ads-sdk.mjs --project . --engine unity
```

源码安装器拒绝越界、符号链接和不同内容覆盖。下载器按引擎选择固定官方 Unity 聚合包或 Android 聚合 ZIP，流式下载后校验 SHA256；同摘要文件直接复用，错误响应或摘要不符不保留半包。默认下载到工程 `ThirdParty/TapTap/Dirichlet/<版本>/`，下载结果 `imported=false`，不能当作已导入引擎。

| 引擎／宿主 | 实际代码与安装后操作 |
| --- | --- |
| Unity 原生 | `Assets/Scripts/Platform/TapTapAds/`：`DirichletManager.cs`、`DirichletAds.cs` 直接调用官方 `Dirichlet.Mediation`，并复用 `IMobileAds`、初始化与主线程契约。通过 Unity 正式包导入流程导入已下载 Unity 聚合包，按实际平台处理官方依赖，启用 `APP_CREATOR_DIRICHLET_SDK`，使用真实 SDK 编译 |
| Cocos Android | `assets/scripts/platform/taptap-ads/engines/cocos/dirichlet-ads.ts`；原生源码默认 `native/taptap-ads/android/core/` 与 `cocos/`。将 Java 源加入真实 Android source set、接入官方聚合 AAR 及已选网络，按下文绑定真实 JSB |
| Phaser／Three.js Android | `src/platform/taptap-ads/engines/<引擎>/dirichlet-ads.ts`；原生源码默认 `native/taptap-ads/android/core/` 与 `capacitor/`。将 Java 源及依赖纳入实际 Capacitor Android 工程，注册 `AppCreatorDirichletPlugin`，再注册 TS 插件名 `AppCreatorDirichlet` |
| 三个 TypeScript 引擎的 Tap 小游戏 | 使用 `--target minigame` 复用[现有渠道安装器](channel-sdk-reuse.md#接入正式工程)与本引擎 `TaptapCapabilities`。SDK／转换插件按本引擎官方小游戏路线获取，广告运行时由真实宿主提供，不下载原生聚合包 |

原生壳安装器支持的 TypeScript 平台当前为 Android；传入 iOS 会明确拒绝。Unity 的平台支持按官方包及项目实际构建核实；Unity 小游戏当前已核实公开包缺少广告 C# 类型，安装器明确报告缺口，不生成厂商不存在的类型。Flutter／Expo 尚未交付专用桥接。`--output` 与 `--native-output` 可调整工程内位置；保留安装器输出的相对目录，不能把运行时导入指向 `.agents`。

Unity 已有移动 SDK 代码时复用相同内容的公共契约，两个安装器均避免再次创建同名类型；已有差异或多份定义会报冲突。Unity 自定义程序集需让复用契约与实现处于同一适用程序集，并核对真实编译，不能以不同目录代表类型隔离。

## Unity 使用

唯一应用入口构造 `DirichletManager`，向业务注入现有 `IMobileAds`。媒体配置和广告位使用目标应用真实值；`applyNetworkPrivacy` 必须执行已启用网络的真实非个性化配置并返回实际结果，不能传入固定返回 `true` 的空函数。Android 封装还会在初始化和请求前调用官方聚合非个性化设置；iOS 的实际隐私机制须由项目落实，不把 Android 开关套用过去。

```csharp
// configuration 与 privacy 来自项目已核实的配置和授权所有者。
IMobileAds ads = new DirichletManager(
    configuration.MediaId, configuration.MediaName, configuration.MediaKey,
    configuration.TimeoutMilliseconds,
    new AdUnits(configuration.BannerId, configuration.InterstitialId, configuration.RewardedId),
    privacy.CurrentAdPolicy, privacy.ApplyDirichletNetworkPrivacy);
// 此任务由 SDK 所有者观察；先等真实初始化，再投递广告预加载。
async Task PrepareRewardedAsync()
{
    await ads.InitializeAsync();
    ads.LoadRewarded(result => rewardAvailability.Update(result));
}
// 独立投递并观察 preparation 的异常，首帧和玩法不等待它。
var preparation = PrepareRewardedAsync();
```

初始化真实完成后才投递加载；示例中的加载应由初始化成功分支调用，未就绪立即回退而非挂起游戏。展示使用 `ShowRewarded(requestId, rewarded, ended)`／`ShowInterstitial(ended)`，没有已加载广告时立即返回 `false`。只有官方 `RewardVerified.IsVerified` 的有效奖励通知进入原请求的幂等结算，`ended` 只恢复展示相关状态。策略变化调用 `UpdatePolicy`，离开应用作用域调用 `Dispose`；已受理展示保留原对象，关闭后到达的可信奖励仍按原 `requestId` 交付。

## Cocos／Phaser／Three.js 使用

Cocos 的原生 `DirichletCocosBridge` 绑定实际 Android Activity 与引擎 JSB，TS 使用 `createCocosDirichletAds({ bridge: native.jsbBridgeWrapper, ...options })`。Phaser／Three.js 分别使用自己的 `createPhaserDirichletAds`／`createThreejsDirichletAds`；共享实现只负责已核实无引擎差异的广告状态，业务不导入原生厂商 API。

Capacitor 加载器以真实 `@capacitor/core` 运行时为输入，不在普通 Web 注册可用广告替身：

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';
import { createDirichletCapacitorLoader } from './dirichlet/typescript/capacitor-port';
import { createPhaserDirichletAds } from './engines/phaser/dirichlet-ads';

const ads = createPhaserDirichletAds({
  ...verifiedAndroidConfiguration,
  initializationAllowed: () => privacy.canInitializeAds(),
  canRequestAds: () => privacy.canRequestAds(),
  loadPlugin: createDirichletCapacitorLoader({
    isNativePlatform: () => Capacitor.isNativePlatform(),
    getPlatform: () => Capacitor.getPlatform(),
    registerPlugin,
  }),
});
// SDK 所有者单独观察失败，不让场景启动等待广告。
void ads.initialize().catch(reportAdFailure);
```

真实初始化完成后在后台调用 `loadRewarded()`／`loadInterstitial()`；业务触发时使用同步的 `tryShowRewarded(callbacks)`／`tryShowInterstitial(callbacks)`，只有 `requested` 表示原生请求已发出。未就绪、授权不足、繁忙或配置缺失立即返回，不在业务触发时补加载并等待。`onClosed` 不发奖；只有同一展示 ID、格式、广告位及 `verified=true` 的有效奖励才能触发 `onReward`。

已有授权来源变化时调用 `refreshPolicy()`，先清除旧缓存，再通知原生请求门与横幅清理。展示失败、重复、迟到回调和页面退出分别处理；`dispose()` 停止新请求，已受理展示继续交付原结算所有者。未结算激励记录有界，达到上限拒绝新展示，不删除旧记录后猜测奖励归属。

上述迟到回调保证以原业务所有者仍存活为前提。Activity 重建并保留同一 JS 所有者时，原生继续持有原广告对象；WebView／JS 状态或应用进程被销毁后的持久事件重放、业务发奖恢复和确认协议不在当前实现内，不能据此声明跨进程奖励恢复已通过。

## 验证层级

工作流验证覆盖源码分发、下载摘要、TypeScript 类型及行为、Unity 真实官方 C# 类型编译和 Android 官方 AAR 编译，并以离线替身验证回调顺序及失败路径。目标项目仍需以真实引擎、原生宿主和所选聚合网络完成构建与授权范围内的验证；下载、编译或替身测试不代表已开通、实际填充或真机通过。
