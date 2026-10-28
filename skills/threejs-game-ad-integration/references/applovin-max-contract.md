# AppLovin MAX 广告接入合同

本文件是 `threejs-game-ad-integration` 的唯一详细运行合同。它约束 three.js + Capacitor 移动项目通过 AppLovin 官方 MAX Cordova 原生插件接入 Banner、插页与激励视频广告：平台边界、插件职责、网络集合、状态、公开接口、静默预加载、广告位独立加载重试、Banner 布局与刷新、视频不可用提示、奖励、隐私、遥测和验收。实施时必须核对[官方 Cordova 集成文档](https://support.applovin.com/en/max/cordova/overview/integration)和[官方插件仓库](https://github.com/AppLovin/AppLovin-MAX-Cordova)；官方页面更新时，以当前页面、官方插件发布物和项目已批准的实现包为准，不把本文件当作 SDK 版本或法律意见。

## 不变量与平台边界

- ThreeJS Web、浏览器预览、小游戏和其他没有原生 MAX 容器的目标不直接调用 MAX、不导入原生 SDK，也不发起网络广告请求。共享 TypeScript 门面在这些目标上返回结构化 `unsupported-platform` no-op，并立即让游戏继续。
- iOS 与 Android 仅通过 AppLovin 官方 `cordova-plugin-applovin-max` 调用 MAX；Capacitor 使用其 Cordova 兼容层加载插件。ThreeJS 场景只能调用共享 TypeScript 门面，不能直接触碰官方插件全局对象、Activity、ViewController、MAX 原生对象或任何网络 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。
- 本合同的“隐私未决仍初始化”“privacy 不暂停初始化重试”等规则，只适用于已由官方资料与锁定依赖核实支持独立时序的 SDK/CMP 组合。官方要求先完成自有 CMP 而当前组合无法满足独立初始化要求时，将 MAX 任务标为结构化配置阻断，不调用 initialize、不安排自动重试，也不建立等待 CMP 或其他 SDK 的启动链；记录限制并按当前任务解决配置，AppsFlyer 和游戏继续独立启动。该阻断来自不适用的接入组合，不从用户拒绝或 ATT 状态本身推断。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。
- 任何平台只允许一个广告服务实例和一个官方插件接入实例。每个广告位持有独立业务状态和至多一个加载重试 timer，格式匹配的 MAX 原生对象由官方插件内部管理；所有广告位只共用激励视频结束后的插页保护截止时间等服务级状态，不设置跨广告位全屏互斥，不共用加载重试 timer。重复初始化、预加载、展示请求或插件回调不能造成同广告位并发 load、递归回调或多套退避机制。
- 新 MAX 实例首次实际 initialize 前必须手动调用官方 `AppLovinMAX.setHasUserConsent(false)`。该值仅作为 SDK 隐私配置，不能作为业务广告开关：不得因 false 拒绝初始化、预加载、Banner 按需加载、加载重试或展示，不得从 `!hasUserConsent` 推导 `privacy-pending`/`privacy-blocked`。SDK 已就绪且其他真实条件满足时照常发起请求；实际填充和 SDK/adapter 返回结果按原合同处理，不把 false 擅改为 true。内建流程关闭与该配置分别核对，AppsFlyer 不依赖该值启动。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。

## 固定聚合网络与别名

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#固定聚合网络与别名)。

| canonical | MAX/控制台常见名称 | 别名与注意事项 |
| --- | --- | --- |
| `applovin` | AppLovin / AppLovin Exchange 或 AppLovin Bidding | MAX 自有需求；不另接一个“AppLovin adapter”来代替 SDK 初始化。 |
| `admob` | Google Bidding and Google AdMob | Google AdMob 是同一项固定渠道；不要把 Google Ad Manager 误加入本次集合。 |
| `mintegral` | Mintegral | 以官方 MAX Mintegral adapter 与当前隐私说明为准。 |
| `pangle` | Pangle | ByteDance 相关名称可能出现在 SDK/adapter 资料中；国家、地区、商店和流量限制必须按官方当前要求逐项配置，不预设地区规则。 |
| `unity` | Unity Ads | 使用 MAX 的 Unity Ads adapter，不把 Unity 游戏插件或 Unity 引擎依赖带入 ThreeJS 项目。 |
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

SDK key 与 MAX ad unit ID 是官方插件 API 所需的客户端配置，由生成式、分环境构建配置注入插件适配器并按 debug/test/release 隔离；业务场景只使用 `slotId`，不得直接持有这些值。它们不得写入手工维护的业务源码、示例、日志、遥测或版本库。广告网络账号凭证、Ad Review key 和服务器 API key 属于秘密，只能留在对应控制台、CI 秘密或原生构建配置，绝不传给 Web/ThreeJS 层。

## 平台行为矩阵

| 运行目标 | 初始化/预加载 | 状态/触发 |
| --- | --- | --- |
| ThreeJS Web / 浏览器 | 立即返回 `unsupported-platform`，不调用 MAX | `isReady=false`；全屏展示和 Banner 显隐均立即 no-op |
| 小游戏或其他 Web 容器 | 同上；若平台有独立广告 SDK，另建经批准的 Skill/模块 | 不在本合同内实现或兜底为 no-op |
| Capacitor Android | Capacitor Cordova 兼容层加载官方插件；适配器包装插件异步初始化，完成后静默预加载全部启用的插页与激励视频广告位 | 全屏复核实例就绪属性与业务门后调用官方插件 show；Banner 首次展示时创建并加载，后续复用视图显隐 |
| Capacitor iOS | 同上；构建前验证官方插件与项目当前 iOS 包管理器路径兼容 | 全屏复核实例就绪属性与业务门后调用官方插件 show；Banner 首次展示时创建并加载，后续复用视图显隐 |

## 公开桥接接口与结构化结果

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

```ts
initialize(config: InitConfig): Promise<InitResult> // 初始化请求，仅等待本地受理/拒绝
retryInitialize(): Promise<InitResult>        // 手动入口复用初始化恢复任务，不绕过退避或配置阻断
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
  privacy: "ready" | "pending" | "blocked"; // 实际请求条件，不等于 hasUserConsent=true
}

interface AdResult {
  ok: boolean;
  code: string;
  platform: Platform;
  phase: AdPhase;            // 资源/展示 phase，不是 ThreeJS 场景状态
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

所有原生回调另带稳定 `eventId`，同一回调跨桥重投时不得重新生成，以此去重传输层重复。应用主动 load 的回调必须匹配当前 `loadOperationId`；Banner auto-refresh 的回调必须匹配当前活动 `refreshEpoch`。同一 refresh epoch 可以产生多轮合法 `loaded`，不能仅因 generation/slot 相同而丢弃；停止 auto-refresh 时立即使该 epoch 失效，之后到达的旧回调不得进入重试或改变可见性。上述类型中的 `phase` 只描述对应广告位自身，所有 gates 由原生服务依赖计算，不能镜像到 ThreeJS 场景状态。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

- `not-initialized`、`initializing`：SDK 尚未初始化或初始化请求进行中；不用于表达隐私状态。
- `privacy-pending`、`privacy-blocked`：仅表示存在尚未满足的独立实际广告请求条件或 SDK/平台限制，不得由 `hasUserConsent=false` 单独产生，也不能作为 initialize/retryInitialize 的拒绝原因；初始化前的接入组合不适用按配置阻断另行处理。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

## 多广告位状态与单一服务

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#多广告位状态与单一服务)。

### 广告实例就绪属性与预加载成功

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#广告实例就绪属性与预加载成功)。

### phase 与原生 gates 分离

`phase` 只描述一个广告位的资源/展示阶段（`new`、`initializing`、`failed`、`idle`、`loading`、`ready`、`showing` 或 `unsupported`）；它不是 ThreeJS 场景状态。以下 gates 是原生服务依赖，不能复制到场景状态机或由场景自行维护：

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

- `privacy`：实际广告请求配置和 SDK/平台条件是否达到 `ready`，不表示用户是否同意。`hasUserConsent=false` 已正确传入且没有其他独立阻断时，privacy 应为 ready，允许加载、重试和展示；不能因为 false 等待用户同意、把值改 true 或映射为 pending/blocked。只有另有明确的实际请求限制才使用 pending/blocked，并记录与该布尔值无关的原因；不参与 SDK 初始化完成判定，已确认的初始化成功不受弹窗结果覆盖。

ThreeJS 场景只提供 `slotId` 与自然中断点上下文并消费结构化结果；`tryShow` 前由官方插件适配层读取该广告位当前实例就绪属性、phase 和共享 gates，任一 gate closed/unknown 都立即拒绝。前后台、断网、隐私变化和宿主切换由 Capacitor 生命周期与官方插件事件归一化后发布，恢复时重新计算 gates，而不是让场景写入广告 phase。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。
2. MAX 初始化完成后，广告位业务状态进入 `idle`，不以隐私同意与否作为初始化成功条件；不遍历创建广告对象或视图，只通过插页与激励视频各自的服务入口立即投递一次预加载，插件内部按需管理资源。Banner 保持未创建，不投递 load；官方插件初始化失败转为 `failed`。只有另有明确的实际请求限制导致 privacy pending/blocked 时才阻断 load/show 并保留意图，不从 hasUserConsent=false 推导该限制，也不改变已经确认的 SDK 初始化成功状态。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

6. 后台、离线、独立的实际请求条件未满足或无有效宿主时保留当前 phase 快照，但不发起新的 load/show；hasUserConsent=false 本身不属于这些阻断。恢复到前台且网络可用后重新计算 gates，并按保留的退避 deadline 最多恢复一次调度。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

每广告位的 deadline、失败计数、加载重试 timer 和正在加载标记，以及各广告位自己的正在展示标记、共享的奖励待决账本、插页保护截止时间和实例代次，都属于广告服务这个单一状态所有者。独立表示加载重试 timer 按 `slotId` 隔离，不表示由 ThreeJS 场景或组件自行创建；不得让场景、多个组件或多个原生回调各自维护另一份重试、保护时间或奖励状态。

### 初始化失败分类与独立自动重试

初始化调用、完成回调、幂等、失败计数、deadline、in-flight 请求和初始化 timer 的唯一所有者是 `src/platform/initialize-sdks.ts` 中的 MAX 私有任务，按[SDK 单文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)落地；以下初始化恢复规则均由该任务执行。公开 `initialize`/`retryInitialize` 的 SDK 调用归入该文件，广告门面只转发应用装配层按公开契约注入的 MAX 任务入口，不反向导入平台文件，不初始化整个 SDK 列表，也不在广告服务内复制恢复实现。广告位 phase 只消费 SDK 初始化结果，独立的广告位加载/创建恢复仍归广告服务。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 网络超时、网络服务暂不可用和明确的原生服务瞬时错误，由统一初始化文件中 MAX 唯一的恢复任务自动重试。独立保存初始化连续失败计数、单调时钟 deadline、timer 引用和 in-flight 标记；沿用加载重试的 2/4/8/16/32/64 秒公式及抖动规则，最高 64 秒、无次数上限，直到成功、服务禁用或销毁。失败回调只登记任务，不同步递归初始化，不重新初始化其他 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。
- 缺失 SDK/adapter、无效配置、平台不支持或明确策略阻断不自动重试：取消初始化恢复任务并报告原因。修正受控配置或依赖、解除策略阻断后由调用方显式 `retryInitialize()`；未修正时返回原阻断；前台、网络、宿主或隐私恢复事件不能解除该阻断或自动发起初始化。对已核实支持独立时序的 SDK/CMP 组合，初始化及其重试不受广告请求 privacy gate 约束：隐私未决、拒绝同意或 ATT 未授权都不暂停、不取消初始化任务；隐私结果只用于配置真实隐私标志与广告请求/展示策略。不满足独立时序的组合维持配置阻断，不按隐私状态变化抢跑。无法归类的错误先诊断，不凭自由文本默认无限重试，只有确认瞬时故障后才纳入自动退避。
- SDK 初始化请求进行中才保持 `initializing` 和同一个 in-flight 请求；隐私弹窗状态不参与该判定。SDK 完成回调到达即确认成功，即使隐私流程仍在进行；隐私失败不增加初始化失败计数、不创建初始化重试 timer。只有当前 SDK 初始化请求明确失败时才按失败分类恢复，重复点击或隐私状态变化不再次 initialize。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#初始化失败分类与独立自动重试)。

- 初始化成功立即清零初始化失败计数，取消 timer、清空 deadline 和恢复意图，再通过各广告位入口去重投递全部启用的插页/激励预加载意图；实际广告请求隐私门未满足时保留待加载意图，条件恢复后去重执行，不重新初始化 SDK；Banner 仍不创建、不预加载。服务禁用、销毁或配置替换时取消旧初始化恢复任务并失效旧操作；配置替换后的初始化由新配置入口重新登记。
- 初始化恢复与广告位 load/create 恢复是不同任务。初始化成功前不创建广告位加载任务；初始化恢复不得共享、重置或触发广告位的重试 timer 与计数。Banner 离开展示场景仅取消该 Banner 恢复任务，不取消广告服务初始化恢复；任何恢复任务均不得持有已销毁场景引用。

## 初始化与隐私独立编排

MAX 的实际初始化和完成/恢复处理集中在 `src/platform/initialize-sdks.ts`，与项目其他 SDK 分别独立投递；初始化入口、幂等状态和 timer 不分散到广告服务、隐私模块或场景中。游戏和其他 SDK 不等待 MAX 完成，MAX 也不等待它们；已启用聚合网络由 MAX 官方插件/adapter 自身管理，不绕过插件为每个网络另行直接初始化原生 SDK。

1. 启动时读取受控平台配置，检查平台、当前 Activity/ViewController、环境开关、插件配置与独立时序资格；Web/小游戏直接 no-op。原生服务启用、配置有效且官方已确认当前 SDK/CMP 组合支持独立时序时，正常调用 MAX initialize，不额外添加同意隐私、CMP 完成、ATT 或 AppsFlyer 完成等等待；不得把拒绝同意本身转换为禁用 MAX。组合不支持独立时序时按上述配置阻断处理，不能绕过官方初始化前提。
2. SDK 初始化与隐私流程是两条独立任务，不通过 Promise 串联，也不相互等待完成事件。SDK 初始化成功只由实际完成回调确认；隐私弹窗、CMP、UMP 或 ATT 的进行中、拒绝、失败、取消及重新授权如实更新对应信号，不修改已确认的初始化结果或触发初始化重试。广告请求门根据独立实际请求条件判断，不把 hasUserConsent=false 或用户拒绝直接映射为业务 blocked；只有确有其他独立限制时才保留预加载意图并暂停 load/show，限制解除后恢复广告请求。
3. 必须在 MAX initialize 之前完成内建 Terms and Privacy Policy Flow 的关闭配置，不能仅删除弹窗调用或未经核对就假设默认关闭。[Android 官方流程](https://developers.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow/)和[iOS 官方流程](https://developers.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow/)说明：该流程需 opt-in 启用，启用后 SDK 在用户完成流程后才调用初始化完成回调。关闭只作用于 MAX 内建流程，MAX SDK 与广告服务仍保持启用，继续正常调用 initialize，并由真实完成回调确认成功。实际关闭方式按下一节核对，不套用其他框架 API、自建广告桥或伪造成功。独立隐私模块继续维护真实授权状态，关闭 MAX 内建流程不代表隐私已完成；官方页面还要求自有 CMP 组合先满足其规定的隐私前提，因此不能宣称任意 CMP 组合都可独立初始化。若锁定插件/SDK 或所选 CMP 不支持要求的独立时序，记录具体限制与官方证据并在当前任务范围解决接入组合，不擅自恢复内建流程、改成跨 SDK 串行等待或把未满足要求的配置标为通过；AppsFlyer 等其他独立 SDK 继续启动。
4. iOS `Info.plist` 按当前 AppLovin SKAdNetwork 页面和已实际启用的每个 mediated network 生成/维护 `SKAdNetworkItems`，不能复制过期的固定清单。Android/iOS 的隐私 manifest、数据安全声明、商店隐私资料和目标地区限制同样由发布责任人核对。
5. 初始化成功后立即通过每个启用的插页与激励视频广告位自己的服务入口投递静默预加载意图；实际 load 仍检查广告请求隐私门，未满足时保留意图，恢复后各广告位去重执行一次。初始化失败立即返回结构化错误；瞬时故障由独立任务自动退避，宿主/前台/网络条件未满足时暂停，隐私状态不阻断初始化重试，配置错误修正后显式重试，不在初始化回调里递归重试或阻塞 ThreeJS。
6. 项目启用 AppsFlyer 时，其初始化及实际启动由统一文件中的 AppsFlyer 私有任务独立发起，不在 MAX initialize、MAX 内建隐私流程、广告 load/show 或 MAX 重试回调中执行，也不等待这些动作完成。按[官方 Cordova 指南](https://github.com/AppsFlyerSDK/appsflyer-cordova-plugin/blob/master/docs/Guides.md#init-sdk)核对锁定插件：当前 API 的 `init()` 不自动启动，在 AppsFlyer 自己的 `registerSessionReadyListener` 回调调用 `start()`，自身真实 ATT/授权条件仍遵守官方要求。MAX 失败或永久不回调时不阻断 AppsFlyer 自己的启动流程，AppsFlyer 失败或不回调时不阻断 MAX 初始化。两个 SDK 不共享启动标志、请求或重试 timer，不能以 MAX 成功代替 AppsFlyer 已启动；未采用 AppsFlyer 的项目不额外安装它。

### 初始化前设置 hasUserConsent=false 与广告请求资格

- 在 `src/platform/initialize-sdks.ts` 中，每个新 MAX 实例首次实际 initialize 前手动调用官方 `AppLovinMAX.setHasUserConsent(false)`；不是给门面、场景或 `InitConfig` 增加一个本地同名字段。设置的是布尔 `false`，不能传字符串、假设 SDK 默认已为 false，或等初始化完成才设置。调用顺序和原生实际接收状态应在目标项目验证。
- [官方 Cordova 隐私说明](https://support.applovin.com/en/max/cordova/overview/privacy)明确提供“设置 false → 初始化 SDK → 请求广告”的调用方式；[官方 JS 实现](https://github.com/AppLovin/AppLovin-MAX-Cordova/blob/master/plugin/www/applovinmax.js)的 setter 不返回完成 Promise，也不接收完成回调。不能用 `await setHasUserConsent(...)` 假装等待原生配置生效；按插件真实调用语义在 initialize 前设置，并在目标项目通过初始化日志的 Privacy States / Has User Consent 或 Mediation Debugger 核对实际值为 false。
- 同一实例的重复启动入口复用已有初始化请求/结果，不重复执行 SDK 列表或覆盖后续真实隐私更新；同一实例瞬时失败后的恢复复用已确定的配置，未完成的必要配置不能跳过。只有创建新原生实例并首次初始化时，才重新落实本工作流要求的初始 false；同实例的自动/手动重试、状态查询和回调重放不再次回写 false 覆盖后续真实更新。
- `hasUserConsent` 与广告请求资格分开保存：`false` 不表示 SDK 未就绪、广告禁用、无填充或必须等待同意。在 SDK 初始化成功、宿主/网络/前台、广告位与格式等条件满足，且没有其他独立实际限制时，privacy gate 为 ready，全屏预加载、Banner 按需加载、加载重试和就绪后的展示照常执行。禁止通过 `if (!hasUserConsent) return`、将 false 映射为 pending/blocked、等待该值变 true 或取消既有恢复任务来间接阻止广告请求。
- 实际 SDK/adapter 对该隐私配置如何处理请求及是否填充，以真实结果为准；不得保证 false 一定有填充，也不把值改成 true 来消除错误。独立的真实 SDK/平台请求限制继续按其实际原因处理，不能把缺少用户同意本身重复包装成另一个业务层禁用开关。
- 此 false 是本次启动指定的 SDK 初始配置，不是用户已点击拒绝/同意的交互记录，也不是 AppsFlyer 的授权状态。独立隐私模块按真实反馈和官方接口更新相应信号；不得从 MAX 初始化成功推断用户同意，或用 MAX 的 false 决定 AppsFlyer 是否启动。设置 false 与关闭内建流程是两个独立动作，必须分别核对。

### 内建流程关闭配置与真实初始化核对

- 先检查锁定的[官方 Cordova JS API](https://github.com/AppLovin/AppLovin-MAX-Cordova/blob/master/plugin/www/applovinmax.js)及原生桥接。已核对的官方公共接口没有内建流程开关，不得写入不存在的 `AppLovinMAX.setTermsAndPrivacyPolicyFlowEnabled(false)`；`setHasUserConsent(false)` 只表达授权状态，也不能用来代替关闭内建流程。
- 对官方支持的宿主资源检查 Android `res/raw/applovin_settings.json` 的 `consent_flow_settings.consent_flow_enabled`，以及 iOS 主 target `AppLovin-Settings.plist` 的 `ConsentFlowInfo.ConsentFlowEnabled`；取消启用该流程的 opt-in `true`/`YES` 项，并检查所有已采用的构建模板、生成脚本、原生代码启用调用和最终产物，避免再次注入启用设置。若锁定 SDK 已确认支持以布尔 `false`/`NO` 显式配置，则按其实际读取行为关闭；官方流程文档只展示启用示例，不能将反设 false 的行为或多处配置覆盖优先级写成已验证事实。
- 核对关闭配置先于实际 SDK initialize 生效，但初始化任务照常发起；以官方插件回传的 SDK 初始化完成信号检查真实成功，随后由广告服务投递预加载意图，实际 load/show 仍检查业务与隐私门。保留配置、初始化完成和广告请求各自的验证结果，不以无弹窗、请求受理、AppsFlyer 成功或源码检查代替 MAX 运行验证。
- AppsFlyer 的自身配置、监听、session-ready 和 start 都留在独立任务；MAX 的开关配置失败或初始化异常只影响 MAX，不跳过 AppsFlyer 的任务投递。其自身官方启动前提与 MAX 无关，不把关闭 MAX 流程误写为用户已同意 AppsFlyer 跟踪。

Google AdMob 的 Google UMP/CMP 消息配置、IAB TCF 与实际聚合网络覆盖由隐私模块独立核实，不固定为 MAX 初始化内置流程；外部控制台配置仍由责任人在授权范围内完成。本工作流明确要求 MAX 初始化前手动传入 false，该初始配置不能冒充用户交互结果，也不能被业务层用作阻止广告加载的条件。其余真实隐私信号按锁定插件支持的接口传递，不从初始化成功推断用户已同意，不为获得填充把 false 改为 true。具体方案须核对[官方 Cordova 隐私说明](https://support.applovin.com/en/max/cordova/overview/privacy)，不能假设所有 SDK/CMP 组合都支持独立时序；儿童数据、年龄限制和地区义务不能由广告模块自行假设或绕过。

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

- Banner 位于原生视图层并遵守系统 safe area。内容 inset 在页面布局阶段按当前平台支持的尺寸规则预先确定，MAX 回调中的实际/自适应尺寸仅用于核对预留区域；不得把固定 50px/50dp 当作所有设备的真实高度，也不得把 Banner 尺寸乘入 ThreeJS 渲染 DPR。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生视图和安全布局)。

### 显隐快速返回

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。
- `setBannerVisibility(slotId, false)` 无论当前 phase 如何都清除可见请求、使其请求代次失效、取消创建/加载重试与待恢复操作，幂等停止刷新并隐藏，返回 `banner-hidden`；离开展示场景必须调用此入口。Banner 未 ready、显隐失败或 loadFailed 都不显示视频不可用 Toast，也不阻塞 ThreeJS 场景。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。

### 创建失败重试与场景退出

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#创建失败重试与场景退出)。

### 刷新单一所有者

- Banner 正常刷新只允许 MAX 原生 auto-refresh 作为所有者；禁止 ThreeJS、JavaScript、场景组件或通用 timer 另建固定刷新循环。刷新间隔和策略以 MAX 控制台与当前官方 API 为准，不在 Skill 中硬编码。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#刷新单一所有者)。

## 展示触发与视频失败提示

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示触发与视频失败提示)。

最小调用方式应类似“发起展示尝试后立即结束当前同步处理”；禁止 `await ad.load()`、`await ad.showUntilHidden()` 或为了广告结果暂停 ThreeJS 更新。激励 show 受理时以 generation/slot/request 建立奖励待决记录；`rewarded` 事件可以在 `hidden` 前后到达，只要匹配一条仍有效且未失败的待决记录就异步发奖并原子标记已结算。`hidden` 不发奖也不删除待决记录，下一次展示不能覆盖上一条记录；`displayFailed` 将对应记录标为不可发奖。待决记录只能在发奖、明确展示失败或经过项目基于平台测试确定的有界结算窗口后清理，超时必须记录 `reward-settlement-timeout`。高价值或跨进程奖励应采用 MAX S2S rewarded callback 与服务端幂等账本。

### 视频广告不可用 Toast

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#视频广告不可用-toast)。

- Toast 是 UI 反馈，不改变加载计数、奖励和游戏流程。官方插件适配层只发送稳定 `noticeCode`，不直接操作 ThreeJS UI，也不把插件原始错误文本展示给用户。

## 展示失败、生命周期与断网

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。
- MAX `hidden` 要结束该广告位展示状态并立即静默预加载同一广告位的下一条；匹配当前激励视频展示的事件还要先更新 30 秒插页保护截止时间。如果用户快速离开场景，预加载请求仍不得持有已销毁的 ThreeJS/Activity/ViewController。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。

## 错误分类与处理原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#错误分类与处理原则)。

## 遥测与安全

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#遥测与安全)。

## 验收与测试矩阵

### 状态机和非阻塞单测

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 核对 MAX 实际初始化、完成回调和初始化恢复只在 `src/platform/initialize-sdks.ts` 实现；广告门面的 initialize/retryInitialize 仅转发 MAX 私有任务，广告服务不持有第二套初始化请求、计数或 timer。该文件同时启用另一个测试 SDK 时，任一任务同步抛错、初始化失败或永不回调，都不阻止另一个发起/完成或游戏首帧；单独重试 MAX 不重新启动其他 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 使用假的官方插件记录调用顺序：新 MAX 实例首次 initialize 之前必须先收到布尔 `false` 的 setHasUserConsent 调用；SDK 真正完成前不能 load。完成后保持 false，其他实际条件满足且没有独立阻断时，privacy 为 ready，全部启用全屏广告位各发起一次预加载，Banner 仍只在展示请求时创建并加载；模拟加载失败后仍按原任务重试，实例就绪后允许展示，不等待值变 true，也不返回仅由 false 产生的 privacy 错误或 Toast。
- 在上项基础上另设一项明确的、与 hasUserConsent 值无关的 SDK/平台请求限制，才验证 privacy pending/blocked 时 load/show 为零；解除该限制后 false 仍不变，恢复广告请求而不重新初始化 MAX。独立隐私任务的成功、拒绝、失败、取消均不得覆盖已确认的 SDK 初始化状态；SDK 尚未完成时也不能用隐私任务完成代替实际 SDK 回调。
- 核验 MAX 内建流程启用项已从实际配置取消，关闭状态先于 initialize 生效，构建脚本及最终 Android/iOS 产物不会重新启用；没有弹窗、入口返回或仅检查源码均不能代替真实 MAX 初始化完成回调。只在已确认支持独立初始化的 SDK/CMP 组合中，用不结束的独立隐私任务验证 MAX 仍能完成，成功后只投递一次全屏预加载意图，实际 load/show 仍经过隐私门。按独立隐私模块同步真实结果，已有状态时不重复弹窗；初始化重试不重复注册隐私监听或请求 CMP/UMP/ATT。锁定依赖无法满足独立时序时记录能力限制，不伪造验收通过。
- 同时启用 MAX 与 AppsFlyer，分别模拟任一 SDK 的同步异常、失败、永久不回调和重试：另一个仍独立发起并按自身真实完成/启动信号推进，游戏首帧继续；AppsFlyer 在自身 session-ready 和实际采用的官方条件满足后执行 start，不遗漏或重复启动。检查两者不共享初始化状态和重试 timer，AppsFlyer 不挂在 MAX 初始化或广告回调下；关闭 MAX 内建流程不误设 AppsFlyer 授权状态。
- 对已核实支持独立时序的 SDK/CMP 组合，在隐私任务未完成、拒绝同意及 ATT 未决/拒绝时仍调用 MAX initialize，临时初始化失败仍自动重试；SDK 的初始化完成回调到达前不得假装成功。是否阻断广告请求仅按独立的真实请求限制判断，不能因初始化配置 false 或用户拒绝就把业务 privacy gate 置为 blocked。另测官方要求自有 CMP 前置而不满足独立时序的组合：MAX 返回具体配置阻断，不调用 initialize 或创建初始化重试任务，但不能从 false 本身推断该阻断，AppsFlyer 仍独立启动。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。
- 在已核实支持独立时序且不存在配置阻断的组合中，初始化退避中重复 initialize/retryInitialize、重复生命周期或网络恢复事件最多复用一次请求；后台、离线、宿主门关闭暂停且保留 deadline，隐私未决或拒绝不暂停初始化重试，恢复不抢跑、不重置计数。成功取消 timer 并只投递一次全屏预加载意图，实际 load 继续检查广告请求隐私门，Banner 不创建；禁用、销毁、配置替换和旧/重复尝试回调不能重新启动旧任务。
- Banner 离开展示场景不影响初始化恢复；初始化恢复也不能重建该 Banner 的已取消任务。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 实际 Banner 尺寸超出预留区域或布局未就绪时保持隐藏，不在广告回调中重排游戏 UI；方向/窗口/safe-area 变化先隐藏并由布局模块重新提交，旧回调不污染新布局；主要按钮和手势区不遮挡，内容 inset 不修改 ThreeJS DPR。
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
