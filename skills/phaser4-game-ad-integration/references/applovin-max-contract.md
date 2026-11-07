# AppLovin MAX 广告接入合同

本文件是 `phaser4-game-ad-integration` 的唯一详细运行合同。它约束 Phaser 4 + Capacitor 移动项目通过 AppLovin 官方 MAX Cordova 原生插件接入 Banner、插页与激励视频广告：平台边界、插件职责、网络集合、状态、公开接口、静默预加载、广告位独立加载重试、Banner 布局与刷新、视频不可用提示、奖励、隐私、遥测和验收。实施时必须核对[官方 Cordova 集成文档](https://support.applovin.com/en/max/cordova/overview/integration)和[官方插件仓库](https://github.com/AppLovin/AppLovin-MAX-Cordova)；官方页面更新时，以当前页面、官方插件发布物和项目已批准的实现包为准，不把本文件当作 SDK 版本或法律意见。

## 不变量与平台边界

- Phaser Web、浏览器预览、小游戏和其他没有原生 MAX 容器的目标不直接调用 MAX、不导入原生 SDK，也不发起网络广告请求。共享 TypeScript 门面在这些目标上返回结构化 `unsupported-platform` no-op，并立即让游戏继续。
- iOS 与 Android 仅通过 AppLovin 官方 `cordova-plugin-applovin-max` 调用 MAX；Capacitor 使用其 Cordova 兼容层加载插件。Phaser 场景只能调用共享 TypeScript 门面，不能直接触碰官方插件全局对象、Activity、ViewController、MAX 原生对象或任何网络 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。

- 任何平台只允许一个广告服务实例和一个官方插件接入实例。SDK 初始化状态与初始化恢复由 `src/platform/sdks/max-sdk.ts` 独立持有；每个广告位持有独立业务状态和至多一个加载重试 timer，格式匹配的 MAX 原生对象由官方插件内部管理。所有广告位只共用激励视频结束后的插页保护截止时间等服务级状态，不设置跨广告位全屏互斥，不共用加载重试 timer。重复初始化、预加载、展示请求或插件回调不能造成同广告位并发 load、递归回调或多套退避机制。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。

## 固定聚合网络与别名

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#固定聚合网络与别名)。

| canonical | MAX/控制台常见名称 | 别名与注意事项 |
| --- | --- | --- |
| `applovin` | AppLovin / AppLovin Exchange 或 AppLovin Bidding | MAX 自有需求；不另接一个“AppLovin adapter”来代替 SDK 初始化。 |
| `admob` | Google Bidding and Google AdMob | Google AdMob 是同一项固定渠道；不要把 Google Ad Manager 误加入本次集合。 |
| `mintegral` | Mintegral | 以官方 MAX Mintegral adapter 与当前隐私说明为准。 |
| `pangle` | Pangle | ByteDance 相关名称可能出现在 SDK/adapter 资料中；国家、地区、商店和流量限制必须按官方当前要求逐项配置，不预设地区规则。 |
| `unity` | Unity Ads | 使用 MAX 的 Unity Ads adapter，不把 Unity 游戏插件或 Unity 引擎依赖带入 Phaser 项目。 |
| `dt-exchange` | DT Exchange | Fyber 是历史/常用别名；本合同只计为一个渠道，不重复接入。 |
| `verve` | Verve | PubNative、HyBid 是历史/产品别名；本合同只计为一个渠道。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#固定聚合网络与别名)。

## 三方职责分离

### MAX 控制台

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#max-控制台)。

### 官方原生插件与依赖

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#官方原生插件与依赖)。

### Capacitor 官方插件适配层

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#capacitor-官方插件适配层)。

SDK key 与 MAX ad unit ID 是官方插件 API 所需的客户端配置，由生成式、分环境构建配置注入插件适配器并按 debug/test/release 隔离；业务场景只使用 `slotId`，不得直接持有这些值。它们不得写入手工维护的业务源码、示例、日志、遥测或版本库。广告网络账号凭证、Ad Review key 和服务器 API key 属于秘密，只能留在对应控制台、CI 秘密或原生构建配置，绝不传给 Web/Phaser 层。

## 平台行为矩阵

| 运行目标 | 初始化/预加载 | 状态/触发 |
| --- | --- | --- |
| Phaser Web / 浏览器 | 立即返回 `unsupported-platform`，不调用 MAX | `isReady=false`；全屏展示和 Banner 显隐均立即 no-op |
| 小游戏或其他 Web 容器 | 同上；若平台有独立广告 SDK，另建经批准的 Skill/模块 | 不在本合同内实现或兜底为 no-op |
| Capacitor Android | Capacitor Cordova 兼容层加载官方插件；适配器包装插件异步初始化，完成后静默预加载全部启用的插页与激励视频广告位 | 全屏复核实例就绪属性与业务门后调用官方插件 show；Banner 首次展示时创建并加载，后续复用视图显隐 |
| Capacitor iOS | 同上；构建前验证官方插件与项目当前 iOS 包管理器路径兼容 | 全屏复核实例就绪属性与业务门后调用官方插件 show；Banner 首次展示时创建并加载，后续复用视图显隐 |

## 公开桥接接口与结构化结果

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

```ts
initialize(config: InitConfig): Promise<InitResult> // 初始化请求，仅等待本地受理/拒绝
retryInitialize(): Promise<InitResult>        // 转发至MAX 管理文件中的 MAX 任务，不绕过退避或配置阻断
preload(slotId: AdSlotId): Promise<PreloadResult> // 仅插页/激励后台加载；Banner 返回 format-mismatch
isReady(slotId: AdSlotId): ReadyResult        // 全屏读取实例就绪属性；Banner 读取加载状态，不创建或加载
tryShow(context: ShowContext): Promise<ShowResult> // 复核当前实例就绪属性后展示或立即拒绝
setBannerVisibility(slotId: AdSlotId, visible: boolean): Promise<BannerVisibilityResult>
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

```ts
type Platform = "android" | "ios" | "web" | "unsupported";
type AdFormat = "banner" | "interstitial" | "rewarded";
type AdSlotId = string;
type BannerVisibility = "not-applicable" | "hidden" | "visible";
type AdPhase =
  | "unsupported" | "new" | "initializing" | "failed" | "idle"
  | "loading" | "ready" | "showing";
type GateStatus = "open" | "closed" | "unknown";

interface InitConfig {
  environment: "test" | "staging" | "production";
  enabled: boolean;
}

interface ShowContext {
  slotId: AdSlotId;          // 业务广告位标识，不是 MAX ad unit ID
  naturalBreak: boolean;     // false 时立即返回 not-natural-break
}

interface GateSnapshot {
  host: GateStatus;          // Activity/ViewController provider
  foreground: GateStatus;
  connectivity: GateStatus;
  privacy: "ready" | "pending" | "blocked";
}

interface AdResult {
  ok: boolean;
  code: string;
  platform: Platform;
  phase: AdPhase;            // 资源/展示 phase，不是 Phaser 场景状态
  gates: GateSnapshot;
  instanceGeneration: number;
  slotId?: AdSlotId;
  format?: AdFormat;
  bannerVisibility?: BannerVisibility;
  retryScheduled?: boolean;
}

interface InitResult extends AdResult {
  operation: "initialize" | "retryInitialize";
  accepted: boolean;          // 仅表示本地受理，不表示 MAX 已完成
}
interface PreloadResult extends AdResult {
  operation: "preload";
  accepted: boolean;
}
interface ReadyResult extends AdResult {
  operation: "isReady";
  ready: boolean;
}
interface ShowResult extends AdResult {
  operation: "tryShow";
  accepted: boolean;
  showRequestId?: string;
  interstitialDelayRemainingMs?: number; // 激励视频结束后的插页保护期剩余时间
  noticeCode?: "video-ad-unavailable"; // UI 层本地化并显示一次 Toast
  noticeDedupeKey?: string;             // 立即拒绝时每次触发唯一
}
interface BannerVisibilityResult extends AdResult {
  operation: "setBannerVisibility";
  accepted: boolean;
  visible: boolean;
  widthPx?: number;
  heightPx?: number;
}
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

所有原生回调另带稳定 `eventId`，同一回调跨桥重投时不得重新生成，以此去重传输层重复。应用主动 load 的回调必须匹配当前 `loadOperationId`；Banner auto-refresh 的回调必须匹配当前活动 `refreshEpoch`。同一 refresh epoch 可以产生多轮合法 `loaded`，不能仅因 generation/slot 相同而丢弃；停止 auto-refresh 时立即使该 epoch 失效，之后到达的旧回调不得进入重试或改变可见性。上述类型中的 `phase` 只描述对应广告位自身，所有 gates 由原生服务依赖计算，不能镜像到 Phaser 场景状态。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

- `not-initialized`、`initializing`、`privacy-pending`、`privacy-blocked`：初始化或其他实际适用请求前置未完成。不得仅因 `hasUserConsent=false` 返回隐私阻断码。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

## 多广告位状态与单一服务

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#多广告位状态与单一服务)。

### 广告实例就绪属性与预加载成功

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#广告实例就绪属性与预加载成功)。

### phase 与原生 gates 分离

`phase` 只描述一个广告位的资源/展示阶段（`new`、`initializing`、`failed`、`idle`、`loading`、`ready`、`showing` 或 `unsupported`）；它不是 Phaser 场景状态。以下 gates 是原生服务依赖，不能复制到场景状态机或由场景自行维护：

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

- `privacy`：按实际适用的 CMP/TCF、地区、网络与标志传递条件判定广告请求/展示；初始化及重试另遵守锁定版本真实官方前置。`hasUserConsent=false` 不是 CMP 完成或用户选择证明，也不能单独保证请求许可；无其他实际限制时按适用受限模式执行。

Phaser 场景只提供 `slotId` 与自然中断点上下文并消费结构化结果；`tryShow` 前由官方插件适配层读取该广告位当前实例就绪属性、phase 和共享 gates，任一 gate closed/unknown 都立即拒绝。前后台、断网、隐私变化和宿主切换由 Capacitor 生命周期与官方插件事件归一化后发布，恢复时重新计算 gates，而不是让场景写入广告 phase。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。
2. MAX 以真实完成回调确认初始化后，广告位业务状态进入 `idle`；不遍历创建广告对象或视图，只通过插页与激励视频各自的服务入口投递预加载意图，插件内部按需管理资源。Banner 保持未创建，不投递 load；初始化失败转为 `failed`。实际请求条件未满足时以 privacy gate 和结果码保留意图；`hasUserConsent=false` 不能证明这些条件已经满足。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

6. 后台、离线、其他实际适用请求条件未决或无有效宿主时保留当前 phase 快照，但不发起新的 load/show；`hasUserConsent=false` 本身不属于暂停条件。恢复到前台且网络可用后重新计算 gates，并按保留的退避 deadline 最多恢复一次调度。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

每广告位的 deadline、失败计数、加载重试 timer 和正在加载标记，以及各广告位自己的正在展示标记、共享的奖励待决账本、插页保护截止时间和实例代次，都属于广告服务这个单一状态所有者。独立表示加载重试 timer 按 `slotId` 隔离，不表示由 Phaser 场景或组件自行创建；不得让场景、多个组件或多个原生回调各自维护另一份重试、保护时间或奖励状态。

### 初始化失败分类与独立自动重试

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 网络超时、网络服务暂不可用和明确的原生服务瞬时错误，由MAX 管理文件中独立的 MAX 初始化任务自动重试。该任务独立保存初始化连续失败计数、单调时钟 deadline、timer 引用和 in-flight 标记；沿用合同规定的 2/4/8/16/32/64 秒公式及抖动规则，最高 64 秒、无次数上限，直到成功、MAX 被禁用或该任务销毁。失败回调只登记任务，不同步递归初始化。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 缺失 SDK/adapter、无效配置、平台不支持或明确策略阻断不盲目重试；报告原因并按现有恢复入口处理。初始化或重试所需的官方隐私前置未满足时暂停对应 MAX 任务并保留真实原因；前置满足后按适用合同恢复，其他 SDK 和游戏继续。无法归类的错误先诊断，确认瞬时故障后才纳入自动退避。
- SDK 初始化和隐私任务分别维护状态、操作标识与失败处理。自集成 CMP 的官方前置未满足时不得启动 MAX；内建流程由 initialize 触发，完成前等待官方回调。SDK 回调未到时保持同一个 in-flight 请求，不伪造完成或并发初始化；真实失败按分类恢复。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。

- 初始化成功立即清零 MAX 初始化失败计数，取消该任务 timer、清空 deadline 和恢复意图，再通过各广告位入口去重投递全部启用的插页/激励预加载意图；实际广告请求隐私门未满足时保留待加载意图，条件恢复后去重执行，不重新初始化 SDK；Banner 仍不创建、不预加载。MAX 被禁用、配置替换或应用级初始化任务销毁时，MAX 管理文件只取消并失效对应 MAX 操作；配置替换后的初始化由新配置入口重新登记。
- SDK 初始化恢复与广告位 load/create 恢复是不同任务，状态所有者也不同。初始化成功前不创建广告位加载任务；SDK 初始化恢复不得共享、重置或触发广告位的重试 timer 与计数。Banner 离开展示场景只取消该 Banner 恢复任务，不取消MAX 管理文件中的 MAX 初始化恢复；任何恢复任务均不得持有已销毁场景引用。

## 初始化与隐私独立推进

应用层所有 SDK 初始化统一由 `src/platform/initialize-sdks.ts` 独立投递，MAX 与隐私任务分别进入自己的分支；具体规则见[SDK 统一初始化](../../phaser4-game-architecture/references/sdk-initialization.md)。`src/platform/sdks/max-sdk.ts` 持有 MAX 的真实完成回调、幂等状态和初始化恢复任务；广告服务只持有广告位加载/展示与其运行期恢复。官方插件适配器封装原生 API，下述真实完成条件、隐私门与能力冲突继续有效，不因统一投递而改变官方前置或推断成功。

1. 启动时读取受控平台配置，检查平台、宿主、环境开关与插件配置；Web/小游戏 no-op。复核项目锁定插件、SDK、平台和所采用隐私流程的官方初始化前置：自行集成 CMP 须先完成，再调用 MAX initialize；未满足时仅保留 MAX 待处理意图。默认关闭 MAX 内建流程，手动标志仅在官方适用路径下配置，不覆盖真实用户选择。
2. 初始化任务持有 MAX 调用、真实回调和失败恢复；隐私业务仅按已有或明确需求实施，已采用或官方要求的 CMP（包括 UMP）前置不可绕过。无相关前置时两任务可独立推进；存在前置时以真实结果释放对应任务，不把隐私结果当作 SDK 完成回调。
3. 默认关闭 MAX 自动 Terms and Privacy Policy Flow，并按锁定版本核验同步后的 Android/iOS 有效配置；明确采用内建流程时，initialize 触发流程，流程完成后官方才发送初始化完成回调，相关 MMP/分析 SDK 遵循官方等待要求。自行集成 CMP 的流程在 MAX 初始化前完成。参见 [Android 官方流程](https://support.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow)和 [iOS 官方流程](https://support.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow)。缺少可用合规路径时阻断 MAX，不影响游戏和无关 SDK，不伪造完成或套用其他框架 API。
4. iOS `Info.plist` 按当前 AppLovin SKAdNetwork 页面和已实际启用的每个 mediated network 生成/维护 `SKAdNetworkItems`，不能复制过期的固定清单。Android/iOS 的隐私 manifest、数据安全声明、商店隐私资料和目标地区限制同样由发布责任人核对。
5. 初始化成功后向已启用的插页与激励视频广告位投递预加载意图；实际 load 仍检查广告请求隐私门，未满足时保留意图。初始化瞬时失败按独立任务退避；宿主、网络或官方隐私前置未满足时暂停，条件恢复后按合同去重恢复。初始化与广告位加载重试不混用。

按各渠道实际要求核实授权配置和覆盖范围，不擅自新增 CMP；已有或官方要求的 CMP（包括 UMP）、TCF 与 ATT 前置必须遵守。`hasUserConsent=false` 是 SDK 配置，既非用户选择、CMP 完成证明，也不保证所有地区和渠道允许请求。真实选择按锁定插件官方接口同步；各聚合网络的标志传递逐项核实，真实限制未满足时保留请求意图，满足后恢复。

### 初始化前设置 hasUserConsent=false

默认关闭内建流程且采用官方手动标志路径时，MAX 管理文件按锁定插件支持的语义在初始化前配置 `setHasUserConsent(false)`，并先核对真实用户选择及其他官方前置，不能用 false 覆盖已确定选择或虚构 CMP 完成。同配置重复入口复用有效请求；成功只由真实初始化完成回调推进。明确采用内建流程时遵循官方流程配置，不机械叠加此示例。

同实例自动或手动重试复用已确定配置，不以 false 覆盖真实隐私更新；新实例也须先核对已有真实选择。设置或桥接真实失败时不能跳过必要配置。以下仅示意适用手动 false 路径、官方前置均已满足时的顺序：

```ts
// false 是未授予个性化同意的 SDK 配置，不能拿它当作停止广告的业务开关。
AppLovinMAX.setHasUserConsent(false);
AppLovinMAX.initialize(sdkKey, onSdkInitialized);
```

[官方 Cordova 隐私说明](https://support.applovin.com/en/max/cordova/overview/privacy/)明确描述设置 `false` 后仍初始化并请求广告；不把它等同于禁止全部广告，也不据此保证每个网络有填充。初始化完成且宿主、网络及其他实际请求条件满足时，应投递并执行正常广告加载；不得通过隐私 gate、预加载入口、Banner 请求或重试任务间接再次检查“必须同意为 true”。

按锁定插件验证设置与初始化的原生执行顺序，并通过初始化日志的 Privacy States 或 Mediation Debugger 核对实际值；JS getter 的缓存值不能单独证明原生已生效，也不等待该版本未提供的 setter 完成回调。设置或调用真实失败时按配置/桥接错误处理；已设置的布尔 `false` 本身不是失败。若较新的真实用户选择与初始化重试交错，由同一标志所有者在真实初始化完成后同步最新有效选择，不重复初始化，不把等待同意为 true 变成加载前置。该配置仅作用于 MAX，不自动修改 AppsFlyer 的同意状态、启动条件或归因结果。

### 关闭 MAX 内建隐私流程并保留初始化

默认在调用 MAX initialize 前关闭 Terms and Privacy Policy Flow；项目明确采用内建流程时按官方流程启用，验证相关 SDK 前置。当前核对的 [官方 Cordova JS API](https://github.com/AppLovin/AppLovin-MAX-Cordova/blob/master/plugin/www/applovinmax.js)未提供该流程的公开开关，不得套用其他框架同名 API；实施时重新核对锁定版本。采用原生资源配置时合并目标工程文件并保留其他设置。以下关闭值必须按锁定版本验证实际生效，不能仅凭文件内容宣称关闭成功：

Android 实际 app module 的 `src/main/res/raw/applovin_settings.json`（常规 Capacitor 路径为 `android/app/src/main/res/raw/applovin_settings.json`）：

```json
{
  "consent_flow_settings": {
    "consent_flow_enabled": false
  }
}
```

iOS 实际 App target 打包的 `AppLovin-Settings.plist` 中，`ConsentFlowInfo` 字典的布尔项 `ConsentFlowEnabled` 为 `NO`（plist 表示为 `<false/>`）。TDD 记录实际文件位置与 target 资源归属，不能只创建一个未被打包的同名文件。Android 同样核对当前构建变体和资源覆盖，Capacitor 同步后重新检查最终值，避免生成配置或初始化前的插件调用重新开启流程。

关闭流程后保留广告功能、SDK key、广告位配置和 MAX 插件；仅在官方初始化前置满足时发起有效初始化，以真实回调推进状态。缺少可用合规路径时保留阻断，不能伪造完成或通过禁用广告掩盖。瞬时失败由 MAX 独立任务恢复，不复用广告位加载 timer。

初始化成功后仍按已有规则投递全屏广告位预加载意图；已手动设置 `hasUserConsent=false` 且其他实际请求条件满足时，实际 load/show 正常执行，不能仅因该值暂停请求。关闭 MAX 内建流程不等于伪造同意收集完成；已有独立隐私能力仍处理其实际职责，上述版本能力冲突仍需证据关闭。

### 与 AppsFlyer 独立推进

若项目采用 AppsFlyer，统一装配入口分别投递 MAX 和 AppsFlyer 任务；无真实官方依赖时独立启动与恢复。启用 MAX 内建流程时，相关 MMP/分析 SDK 须按锁定版本官方要求等待该流程结束；自集成 CMP 按官方前置完成后再初始化 MAX。每个分支维护自身状态与恢复，未受影响的 SDK 和游戏继续。

验证覆盖无依赖时 MAX 与 AppsFlyer 各自先完成及任一失败、超时；存在官方依赖时验证正确等待与释放、未满足时只阻断受影响 SDK。仅修改配置或通过 TypeScript 编译不能证明实际广告初始化、归因或加载展示已通过；真机与外部配置按明确授权执行。

## 全屏广告静默预加载与独立持续重试

### 常规路径

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#常规路径)。

### 退避公式

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#退避公式)。

### 快速返回语义

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#快速返回语义)。

## Banner 布局、显隐与刷新

### 提前规划 UI 布局

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#提前规划-ui-布局)。

### 原生视图和安全布局

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生视图和安全布局)。

- Banner 位于完整游戏区域内的原生覆盖层，遵守系统 safe area，仅覆盖背景留白等无有效内容的位置。不得为广告缩小 Phaser 渲染区域、改变画面比例、增加内容 inset 或空白占位。实际/自适应尺寸用于核对覆盖矩形和遮挡，不能遮挡角色、目标、路径、HUD、文字或交互区域。无法容纳时隐藏广告，动态内容进入覆盖位置时立即隐藏。不得把固定 50px/50dp 当作所有设备的真实高度，也不得把 Banner 尺寸乘入渲染 DPR。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生视图和安全布局)。

### 显隐快速返回

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。
- `setBannerVisibility(slotId, false)` 无论当前 phase 如何都清除可见请求、使其请求代次失效、取消创建/加载重试与待恢复操作，幂等停止刷新并隐藏，返回 `banner-hidden`；离开展示场景必须调用此入口。Banner 未 ready、显隐失败或 loadFailed 都不显示视频不可用 Toast，也不阻塞 Phaser 场景。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。

### 创建失败重试与场景退出

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#创建失败重试与场景退出)。

### 刷新单一所有者

- Banner 正常刷新只允许 MAX 原生 auto-refresh 作为所有者；禁止 Phaser、JavaScript、场景组件或通用 timer 另建固定刷新循环。刷新间隔和策略以 MAX 控制台与当前官方 API 为准，不在 Skill 中硬编码。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#刷新单一所有者)。

## 展示触发与视频失败提示

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示触发与视频失败提示)。

最小调用方式应类似“发起展示尝试后立即结束当前同步处理”；禁止 `await ad.load()`、`await ad.showUntilHidden()` 或为了广告结果暂停 Phaser 更新。激励 show 受理时以 generation/slot/request 建立奖励待决记录；`rewarded` 事件可以在 `hidden` 前后到达，只要匹配一条仍有效且未失败的待决记录就异步发奖并原子标记已结算。`hidden` 不发奖也不删除待决记录，下一次展示不能覆盖上一条记录；`displayFailed` 将对应记录标为不可发奖。待决记录只能在发奖、明确展示失败或经过项目基于平台测试确定的有界结算窗口后清理，超时必须记录 `reward-settlement-timeout`。高价值或跨进程奖励应采用 MAX S2S rewarded callback 与服务端幂等账本。

### 视频广告不可用 Toast

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#视频广告不可用-toast)。

- Toast 是 UI 反馈，不改变加载计数、奖励和游戏流程。官方插件适配层只发送稳定 `noticeCode`，不直接操作 Phaser UI，也不把插件原始错误文本展示给用户。

## 展示失败、生命周期与断网

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。
- MAX `hidden` 要结束该广告位展示状态并立即静默预加载同一广告位的下一条；匹配当前激励视频展示的事件还要先更新 30 秒插页保护截止时间。如果用户快速离开场景，预加载请求仍不得持有已销毁的 Phaser/Activity/ViewController。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。

## 错误分类与处理原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#错误分类与处理原则)。

## 遥测与安全

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#遥测与安全)。

## 验收与测试矩阵

### 状态机和非阻塞单测

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 使用插件替身覆盖适用手动 false 路径的配置及初始化顺序，重复入口不重复原生请求；已有真实用户选择时，包括新实例与重试均不得覆盖。仅在实际渠道、地区和其他前置均允许受限模式时验证预加载、Banner、展示及加载重试；设置/桥接失败与值为 false 必须区分。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 验证自集成 CMP 未完成、失败、完成时 MAX 的真实前置与恢复；内建流程开启时 initialize 触发流程，完成前不得伪造回调。无真实依赖的 SDK 和游戏继续；重复入口不重复初始化或弹窗。
- 核验 Android/iOS 构建配置符合实际选择：默认关闭内建流程，明确启用时验证官方回调顺序及相关 MMP/分析 SDK 前置；分别核对隐私和初始化的状态、失败计数与 timer，不伪造同意。
- 验证初始化官方前置未满足时只阻断 MAX；仅广告请求条件未满足时保留加载意图，条件满足后恢复。`hasUserConsent=false` 和未显示内建弹窗都不能证明 CMP 完成或所有渠道允许请求。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。
- 初始化退避中重复 initialize/retryInitialize 或恢复事件最多复用一次请求；后台、离线、宿主门关闭或真实官方隐私前置未满足时暂停并保留 deadline，恢复不抢跑、不重置计数。成功后仅投递一次全屏预加载意图，实际 load 检查隐私门；禁用、销毁、配置替换和旧回调不能重启旧任务。
- Banner 离开展示场景不影响MAX 管理文件中的 MAX 初始化恢复；MAX 初始化恢复也不能重建该 Banner 的已取消任务。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 实际 Banner 尺寸超出游戏内安全覆盖矩形、布局未就绪或遮挡任何有效内容时保持隐藏。方向/窗口/safe-area 和玩法内容变化先重新检查覆盖关系，旧回调不污染新布局。验证游戏渲染尺寸、画面比例、输入坐标和原有系统安全区不因 Banner 改变，隐藏时无空白占位。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

### 原生与渠道验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生与渠道验收)。

## 官方 AppLovin 资料

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#官方-applovin-资料)。

## 本栈配套资料

- [MAX Getting Started](https://developers.applovin.com/en/max/getting-started/)
- [iOS Test Mode](https://developers.applovin.com/en/max/ios/testing-networks/test-mode/)
- [Android Test Mode](https://developers.applovin.com/en/max/android/testing-networks/test-mode/)
- [iOS Mediation Debugger](https://developers.applovin.com/en/max/ios/testing-networks/mediation-debugger/)
- [Android Mediation Debugger](https://developers.applovin.com/en/max/android/testing-networks/mediation-debugger/)
- [MAX Dashboard: Connect Networks](https://developers.applovin.com/en/max/max-dashboard/networks/connect-networks/)
- [Traditionally Mediated Network Guides](https://developers.applovin.com/en/max/mediated-network-guides/traditionally-mediated-network-guides/)
- [SDK Bidder Network Guides](https://developers.applovin.com/en/max/mediated-network-guides/sdk-bidder-network-guides/)
- [iOS SKAdNetwork](https://developers.applovin.com/en/max/ios/overview/skadnetwork/)
- [iOS Terms and Privacy Policy Flow](https://developers.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow/)
- [Android Terms and Privacy Policy Flow](https://developers.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow/)
- [iOS Privacy](https://developers.applovin.com/en/max/ios/overview/privacy/)
- [Android Privacy](https://developers.applovin.com/en/max/android/overview/privacy/)
- [iOS Error Handling](https://developers.applovin.com/en/max/ios/overview/error-handling/)
- [Android Error Handling](https://developers.applovin.com/en/max/android/overview/error-handling/)
- [iOS Preparing Mediated Networks](https://developers.applovin.com/en/max/ios/preparing-mediated-networks/)
- [Android Preparing Mediated Networks](https://developers.applovin.com/en/max/android/preparing-mediated-networks/)
- [iOS Rewarded Ads](https://developers.applovin.com/en/max/ios/ad-formats/rewarded-ads/)
- [Android Rewarded Ads](https://developers.applovin.com/en/max/android/ad-formats/rewarded-ads/)
- [iOS Interstitial Ads](https://developers.applovin.com/en/max/ios/ad-formats/interstitial-ads/)
- [Android Interstitial Ads](https://developers.applovin.com/en/max/android/ad-formats/interstitial-ads/)
- [iOS Banner & MREC Ads](https://developers.applovin.com/en/max/ios/ad-formats/banner-and-mrec-ads/)
- [Android Banner & MREC Ads](https://developers.applovin.com/en/max/android/ad-formats/banner-and-mrec-ads/)
- [iOS MAX SDK Integration](https://developers.applovin.com/en/max/ios/overview/integration/)
- [Android MAX SDK Integration](https://developers.applovin.com/en/max/android/overview/integration/)
- [`$app-workflow-control`](../../app-workflow-control/SKILL.md)
