# AppLovin MAX 广告接入合同

本文件是 `phaser4-game-ad-integration` 的唯一详细运行合同。它约束 Phaser 4 + Capacitor 移动项目通过 AppLovin 官方 MAX Cordova 原生插件接入 Banner、插页与激励视频广告：平台边界、插件职责、网络集合、状态、公开接口、静默预加载、广告位独立加载重试、Banner 布局与刷新、视频不可用提示、奖励、隐私、遥测和验收。实施时必须核对[官方 Cordova 集成文档](https://support.applovin.com/en/max/cordova/overview/integration)和[官方插件仓库](https://github.com/AppLovin/AppLovin-MAX-Cordova)；官方页面更新时，以当前页面、官方插件发布物和项目已批准的实现包为准，不把本文件当作 SDK 版本或法律意见。

## 不变量与平台边界

- Phaser Web、浏览器预览、小游戏和其他没有原生 MAX 容器的目标不直接调用 MAX、不导入原生 SDK，也不发起网络广告请求。共享 TypeScript 门面在这些目标上返回结构化 `unsupported-platform` no-op，并立即让游戏继续。
- iOS 与 Android 仅通过 AppLovin 官方 `cordova-plugin-applovin-max` 调用 MAX；Capacitor 使用其 Cordova 兼容层加载插件。Phaser 场景只能调用共享 TypeScript 门面，不能直接触碰官方插件全局对象、Activity、ViewController、MAX 原生对象或任何网络 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。

- 任何平台只允许一个广告服务实例和一个官方插件接入实例。SDK 初始化状态与初始化恢复由共享的 `src/platform/initialize-sdks.ts` 按 MAX 单独持有；每个广告位持有独立业务状态和至多一个加载重试 timer，格式匹配的 MAX 原生对象由官方插件内部管理。所有广告位只共用激励视频结束后的插页保护截止时间等服务级状态，不设置跨广告位全屏互斥，不共用加载重试 timer。重复初始化、预加载、展示请求或插件回调不能造成同广告位并发 load、递归回调或多套退避机制。
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
retryInitialize(): Promise<InitResult>        // 转发至共享初始化文件中的 MAX 任务，不绕过退避或配置阻断
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

- `privacy`：其他实际适用广告请求/展示条件是否达到 `ready`；不参与 MAX 初始化及初始化重试判定，也不映射为 `hasUserConsent` 的真假。初始化前已手动配置 `hasUserConsent=false`，且没有其他实际阻断时，`privacy=ready`，允许正常预加载、展示与加载重试；不能实现为 `hasUserConsent === true`、`Boolean(hasUserConsent)` 或把 `false` 留在 `pending`。确有适用 CMP/TCF、地区/网络策略或标志传递条件未满足时，按具体原因返回 `pending`/`blocked`，不伪造同意或解除真实条件。

Phaser 场景只提供 `slotId` 与自然中断点上下文并消费结构化结果；`tryShow` 前由官方插件适配层读取该广告位当前实例就绪属性、phase 和共享 gates，任一 gate closed/unknown 都立即拒绝。前后台、断网、隐私变化和宿主切换由 Capacitor 生命周期与官方插件事件归一化后发布，恢复时重新计算 gates，而不是让场景写入广告 phase。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。
2. MAX 初始化完成后，广告位业务状态进入 `idle`，不以隐私同意与否作为初始化成功条件；不遍历创建广告对象或视图，只通过插页与激励视频各自的服务入口立即投递一次预加载，插件内部按需管理资源。Banner 保持未创建，不投递 load；官方插件初始化失败转为 `failed`。`hasUserConsent=false` 不阻断这些请求；只有其他实际适用请求条件未决或被阻断时，才以 privacy gate 和结果码保留预加载意图，不改变已经确认的 SDK 初始化成功状态。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

6. 后台、离线、其他实际适用请求条件未决或无有效宿主时保留当前 phase 快照，但不发起新的 load/show；`hasUserConsent=false` 本身不属于暂停条件。恢复到前台且网络可用后重新计算 gates，并按保留的退避 deadline 最多恢复一次调度。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

每广告位的 deadline、失败计数、加载重试 timer 和正在加载标记，以及各广告位自己的正在展示标记、共享的奖励待决账本、插页保护截止时间和实例代次，都属于广告服务这个单一状态所有者。独立表示加载重试 timer 按 `slotId` 隔离，不表示由 Phaser 场景或组件自行创建；不得让场景、多个组件或多个原生回调各自维护另一份重试、保护时间或奖励状态。

### 初始化失败分类与独立自动重试

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 网络超时、网络服务暂不可用和明确的原生服务瞬时错误，由共享初始化文件中独立的 MAX 初始化任务自动重试。该任务独立保存初始化连续失败计数、单调时钟 deadline、timer 引用和 in-flight 标记；沿用合同规定的 2/4/8/16/32/64 秒公式及抖动规则，最高 64 秒、无次数上限，直到成功、MAX 被禁用或该任务销毁。失败回调只登记任务，不同步递归初始化。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 缺失 SDK/adapter、无效配置、平台不支持或明确策略阻断不自动重试：共享初始化文件取消该 MAX 恢复任务并报告对应原因。修正受控配置或依赖、解除策略阻断后由调用方显式 `retryInitialize()`；该公开入口只转发至 MAX 任务，未修正时返回原阻断；前台、网络、宿主或隐私恢复事件不能解除该阻断或自动发起初始化。初始化及其重试不受 privacy gate 约束：隐私未决、拒绝同意或 ATT 未授权都不暂停、不取消初始化任务；隐私结果只用于配置真实隐私标志与广告请求/展示策略。无法归类的错误先诊断，不凭自由文本默认无限重试，只有确认瞬时故障后才纳入自动退避。
- SDK 初始化和隐私任务分别维护状态、操作标识与失败处理。隐私弹窗未结束、出错或被拒绝，不得使 SDK 保持 `initializing`、转为 `failed`、暂停初始化重试或再次 initialize；SDK 状态只由当前初始化请求的真实回调更新。SDK 回调未到时仍保持同一个 in-flight 请求，不伪造完成，也不因重复点击并发初始化；当前请求明确失败时，按初始化错误分类恢复，与隐私任务进度无关。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。

- 初始化成功立即清零 MAX 初始化失败计数，取消该任务 timer、清空 deadline 和恢复意图，再通过各广告位入口去重投递全部启用的插页/激励预加载意图；实际广告请求隐私门未满足时保留待加载意图，条件恢复后去重执行，不重新初始化 SDK；Banner 仍不创建、不预加载。MAX 被禁用、配置替换或应用级初始化任务销毁时，共享初始化文件只取消并失效对应 MAX 操作；配置替换后的初始化由新配置入口重新登记。
- SDK 初始化恢复与广告位 load/create 恢复是不同任务，状态所有者也不同。初始化成功前不创建广告位加载任务；SDK 初始化恢复不得共享、重置或触发广告位的重试 timer 与计数。Banner 离开展示场景只取消该 Banner 恢复任务，不取消共享文件中的 MAX 初始化恢复；任何恢复任务均不得持有已销毁场景引用。

## 初始化与隐私独立推进

应用层所有 SDK 初始化统一由 `src/platform/initialize-sdks.ts` 独立投递，MAX 与隐私任务分别进入自己的分支；具体规则见[SDK 统一初始化](../../phaser4-game-architecture/references/sdk-initialization.md)。共享文件持有 MAX 的真实完成回调、幂等状态和初始化恢复任务；广告服务只持有广告位加载/展示与其运行期恢复。官方插件适配器封装原生 API，下述真实完成条件、隐私门与能力冲突继续有效，不因集中编排而改变官方前置或推断成功。

1. 启动时读取受控平台配置，检查平台、当前 Activity/ViewController、环境开关与插件配置；Web/小游戏直接 no-op。支持的原生平台服务启用且具备有效配置时，先手动调用官方插件 `setHasUserConsent(false)`，保持 MAX 内建流程关闭，再调用 MAX initialize；不以用户同意、CMP 完成或 ATT 授权作为本合同目标初始化的前置。该值不作为加载、展示或加载重试的阻断条件；平台/网络本身的实际要求仍按对应能力证据判断。
2. 初始化任务只处理 MAX 的调用、真实完成回调及失败恢复；隐私收集另建独立任务，通过项目采用的原生 CMP/Google UMP 与 ATT 入口执行，不作为初始化任务的前置依赖或验收条件。工作流要求两者可独立完成：SDK 回调先到时立即确认初始化成功，即使 privacy 仍为 pending/blocked；隐私结果先到时只更新真实隐私状态，不推断 SDK 已初始化，也不再次 initialize。初始化调用只确认本地受理并快速返回，不等待隐私流程或广告事件。上述是目标行为，具体插件是否支持须按下一条核实，不能视为现有 MAX 接入能力已经满足。
3. 不启用 MAX 自动 Terms and Privacy Policy Flow。[Android 官方流程](https://support.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow)与[iOS 官方流程](https://support.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow)说明该模式会在用户结束流程后才发送初始化完成回调。按锁定插件/SDK 支持的入口关闭该模式；使用原生资源配置时，Android `res/raw/applovin_settings.json` 的 `consent_flow_settings.consent_flow_enabled` 为 `false`，iOS `AppLovin-Settings.plist` 的 `ConsentFlowInfo.ConsentFlowEnabled` 为 `NO`，并核验同步后的有效配置。项目实际采用自行集成 CMP 时，官方要求该流程在 MAX 初始化前完成；这项额外真实前置与独立初始化目标的关系须按锁定 SDK/CMP 版本单独核实，不因本合同手动 `hasUserConsent=false` 就虚构 CMP 已完成，也不把这个布尔值本身标为能力未满足或禁止请求。存在实际顺序冲突时记录具体未满足项，不牵连游戏核心流程；没有该额外前置时按官方手动标志路径初始化并请求广告。不得套用其他框架的同名 API、创建新的原生广告桥，或提前伪造初始化完成来掩盖真实冲突。
4. iOS `Info.plist` 按当前 AppLovin SKAdNetwork 页面和已实际启用的每个 mediated network 生成/维护 `SKAdNetworkItems`，不能复制过期的固定清单。Android/iOS 的隐私 manifest、数据安全声明、商店隐私资料和目标地区限制同样由发布责任人核对。
5. 初始化成功后立即通过每个启用的插页与激励视频广告位自己的服务入口投递静默预加载意图；实际 load 仍检查广告请求隐私门，未满足时保留意图，恢复后各广告位去重执行一次。初始化失败立即返回结构化错误；MAX 独立任务自动退避，宿主/前台/网络条件未满足时暂停，隐私状态不阻断初始化重试，配置错误修正后通过单 SDK 重试入口显式恢复；广告位加载重试由广告服务分别持有，两种重试不得混用。

Google AdMob 的同意收集由独立隐私任务使用符合项目要求的 Google UMP/CMP，核实相应消息配置、IAB TCF 与实际聚合网络覆盖；外部控制台配置仍由责任人在授权范围内完成。MAX 初始化前按本合同手动配置 `hasUserConsent=false`，它是 SDK 配置，不是用户已完成选择或明确拒绝的回执，不能据此伪造 CMP/TCF/ATT 结果。后续实际用户选择到达时按锁定插件官方接口同步更新，但不重新初始化 MAX；privacy gate 只根据其他实际适用条件重算，不能因为该标志仍为 `false` 而阻止加载。各聚合网络的标志传递能力必须逐项核实，不能仅更新业务 gate 就宣称传递成功；有真实请求阻断时保留意图，条件满足后恢复。iOS ATT/NSUserTrackingUsageDescription 由隐私任务统一管理，避免重复请求，不等待 ATT 才初始化 SDK。儿童数据、年龄限制和地区义务不能由广告模块自行假设或绕过。

### 初始化前设置 hasUserConsent=false

MAX 适配器由统一初始化文件调用，在新 MAX 实例首次真正发起 SDK 初始化之前，先手动调用官方 `setHasUserConsent(false)`，再调用 `initialize`；同配置重复入口复用现有请求，不重复发起原生初始化。内建隐私流程必须在 initialize 前完成关闭配置；SDK key 从受控环境配置传入，成功状态只由真实初始化完成回调推进。

同实例的自动或手动初始化重试复用已确定的配置，不再次调用 false 覆盖后续真实隐私更新；只有新建原生实例时重新落实首次配置。设置或桥接真实失败时不能跳过必要配置。下面的 `AppLovinMAX` 表示已取得的官方插件对象，示意新实例首次请求内的先后顺序：

```ts
// false 是未授予个性化同意的 SDK 配置，不能拿它当作停止广告的业务开关。
AppLovinMAX.setHasUserConsent(false);
AppLovinMAX.initialize(sdkKey, onSdkInitialized);
```

[官方 Cordova 隐私说明](https://support.applovin.com/en/max/cordova/overview/privacy/)明确描述设置 `false` 后仍初始化并请求广告；不把它等同于禁止全部广告，也不据此保证每个网络有填充。初始化完成且宿主、网络及其他实际请求条件满足时，应投递并执行正常广告加载；不得通过隐私 gate、预加载入口、Banner 请求或重试任务间接再次检查“必须同意为 true”。

按锁定插件验证设置与初始化的原生执行顺序，并通过初始化日志的 Privacy States 或 Mediation Debugger 核对实际值；JS getter 的缓存值不能单独证明原生已生效，也不等待该版本未提供的 setter 完成回调。设置或调用真实失败时按配置/桥接错误处理；已设置的布尔 `false` 本身不是失败。若较新的真实用户选择与初始化重试交错，由同一标志所有者在真实初始化完成后同步最新有效选择，不重复初始化，不把等待同意为 true 变成加载前置。该配置仅作用于 MAX，不自动修改 AppsFlyer 的同意状态、启动条件或归因结果。

### 关闭 MAX 内建隐私流程并保留初始化

在调用 MAX initialize 之前显式关闭 Terms and Privacy Policy Flow。当前核对的[官方 Cordova JS API](https://github.com/AppLovin/AppLovin-MAX-Cordova/blob/master/plugin/www/applovinmax.js)未提供该流程的公开开关，不得套用 React Native、Flutter 或直接原生 SDK 的同名 API；实施时重新核对锁定版本。采用原生资源配置时合并到目标工程对应文件，保留其其他有效设置。以下是要求达到的关闭配置值；官方 Android/iOS 指南示范的是启用值，必须按锁定 SDK 版本验证 `false`/`NO` 确实被读取并关闭流程，不能仅凭文件内容宣称关闭成功：

Android 实际 app module 的 `src/main/res/raw/applovin_settings.json`（常规 Capacitor 路径为 `android/app/src/main/res/raw/applovin_settings.json`）：

```json
{
  "consent_flow_settings": {
    "consent_flow_enabled": false
  }
}
```

iOS 实际 App target 打包的 `AppLovin-Settings.plist` 中，`ConsentFlowInfo` 字典的布尔项 `ConsentFlowEnabled` 为 `NO`（plist 表示为 `<false/>`）。TDD 记录实际文件位置与 target 资源归属，不能只创建一个未被打包的同名文件。Android 同样核对当前构建变体和资源覆盖，Capacitor 同步后重新检查最终值，避免生成配置或初始化前的插件调用重新开启流程。

关闭流程后，广告功能开关、SDK key、广告位配置和 MAX 插件保持正常接入；注册初始化结果处理后仍通过官方插件发起一次有效初始化，以真实完成回调推进 SDK 状态。不能删除 initialize、提前 return、伪造完成回调、把广告服务设为 disabled 或调用隐私结果代替 SDK 完成来实现“关闭”。初始化瞬时失败由共享初始化文件中的 MAX 独立任务恢复，关闭流程不清除或复用广告位加载 timer。

初始化成功后仍按已有规则投递全屏广告位预加载意图；已手动设置 `hasUserConsent=false` 且其他实际请求条件满足时，实际 load/show 正常执行，不能仅因该值暂停请求。关闭 MAX 内建流程不等于伪造同意收集完成；独立 CMP/UMP/ATT 仍处理实际适用的职责，上述版本能力冲突仍需证据关闭。

### 与 AppsFlyer 独立推进

若项目采用 AppsFlyer，统一初始化文件分别启动 MAX 和 AppsFlyer 分支，不建立相互等待边。AppsFlyer 不挂在 MAX 初始化成功、失败、内建隐私流程结束或广告 ready 回调后；MAX 不等待 AppsFlyer 初始化/启动、归因结果或其错误恢复。每个分支仅消费自身真实前置与隐私要求，各自维护幂等、状态、失败及恢复；一个分支失败不能提前终止另一个分支。AppsFlyer 的具体插件 API 和证据按[SDK 统一初始化](../../phaser4-game-architecture/references/sdk-initialization.md#max-与-appsflyer)交付，不在广告模块中建立第二个归因 SDK 所有者。

验证必须分别覆盖 MAX 先完成、AppsFlyer 先完成、任一失败/超时与隐私未决，证明关闭内建流程后 MAX 初始化调用和真实回调仍存在，AppsFlyer 启动不受其结果影响。仅修改配置或通过 TypeScript 编译不能证明实际广告初始化、归因或加载展示已通过；真机与外部配置继续按明确授权执行。

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

- Banner 位于原生视图层并遵守系统 safe area。内容 inset 在页面布局阶段按当前平台支持的尺寸规则预先确定，MAX 回调中的实际/自适应尺寸仅用于核对预留区域；不得把固定 50px/50dp 当作所有设备的真实高度，也不得把 Banner 尺寸乘入 Phaser 渲染 DPR。
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

- 通过插件替身记录新实例首次初始化调用序列，断言 `setHasUserConsent(false)` 先于首次 `initialize`，重复入口不重复原生请求。同实例初始化重试复用配置，不再次回写 false；在真实用户选择已更新后触发自动和手动重试，验证该选择不被覆盖，新实例才重新落实首次 false 配置。初始化成功、`hasUserConsent=false` 已按插件约定传递且无其他实际阻断时，`privacy=ready`：全屏预加载、Banner 按需加载、ready 后的展示与失败后的加载重试均正常执行，不返回 `privacy-pending`/`privacy-blocked`，也不等待用户将值改为 true。设置/桥接真实失败与值为 false 必须区分。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 使用永不结束、失败、同意和拒绝的独立隐私任务分别验证：SDK 完成回调到达即确认初始化成功，不等待隐私结果；回调未到时只保持 SDK 请求 in-flight，不伪造成功。SDK 真实瞬时失败仍独立退避，重复 initialize/retryInitialize 或广告点击不重复请求或弹窗；隐私任务失败不转成初始化失败。
- 核验 Android/iOS 有效构建配置已关闭 MAX 自动隐私流程；初始化与隐私任务不共用完成条件、失败计数或 timer。覆盖隐私先完成和 SDK 先完成两种顺序，真实隐私结果只更新隐私标志与广告 gates，不再次初始化，不重置 SDK phase，不重复注册 CMP/UMP 或 ATT 监听、不重复弹窗，也不伪造同意。
- 其他实际适用请求条件导致 privacy pending/blocked 时仍按目标合同调用 MAX initialize，临时初始化失败仍自动重试；SDK 的初始化完成回调到达前不得假装成功。初始化成功但存在这些真实阻断时仅保留预加载意图，条件满足后恢复请求、不重新初始化。单独设置 `hasUserConsent=false`、未显示 MAX 内建弹窗或尚未得到用户同意为 true，不得用来制造该阻断；实际适用 CMP/TCF 或网络条件仍按具体原因验证。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。
- 初始化退避中重复 initialize/retryInitialize、重复生命周期或网络恢复事件最多复用一次请求；后台、离线、宿主门关闭暂停且保留 deadline，隐私未决或拒绝不暂停初始化重试，恢复不抢跑、不重置计数。成功后共享初始化文件取消 MAX timer 并只投递一次全屏预加载意图，实际 load 继续检查广告请求隐私门，Banner 不创建；禁用、销毁、配置替换和旧/重复尝试回调不能重新启动旧 MAX 任务。
- Banner 离开展示场景不影响共享文件中的 MAX 初始化恢复；MAX 初始化恢复也不能重建该 Banner 的已取消任务。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 实际 Banner 尺寸超出预留区域或布局未就绪时保持隐藏，不在广告回调中重排游戏 UI；方向/窗口/safe-area 变化先隐藏并由布局模块重新提交，旧回调不污染新布局；主要按钮和手势区不遮挡，内容 inset 不修改 Phaser DPR。
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
