# AppLovin MAX 广告接入合同

本文件是 `cocos-game-ad-integration` 的唯一详细运行合同。它约束 Cocos Creator 3.x 原生项目通过项目维护的 Cocos 原生插件/JSB 适配层接入 AppLovin MAX 原生 SDK：平台边界、责任、网络集合、状态、公开接口、静默预加载、广告位独立加载重试、Banner 布局与刷新、视频不可用提示、奖励、隐私、遥测和验收。实施时按 Creator 实际版本核对 [Cocos 原生插件](https://docs.cocos.com/creator/3.8/manual/en/native-development/native-plugin/)与 [JSB 桥接](https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/js-oc-bridge.html)，并核对 [AppLovin Android SDK 集成](https://developers.applovin.com/en/max/android/overview/integration/)和 [AppLovin iOS SDK 集成](https://developers.applovin.com/en/max/ios/overview/integration/)及广告格式文档。SDK 类、回调和配置以当前官方原生文档及项目锁定版本为准；本文件描述业务合同，不替代 SDK/API 文档或法律意见。

## 不变量与平台边界

- Cocos Web、浏览器预览、小游戏和其他没有原生 MAX 容器的目标不直接调用 MAX、不导入原生 SDK，也不发起网络广告请求。共享 TypeScript 门面在这些目标上返回结构化 `unsupported-platform` no-op，并立即让游戏继续。
- iOS 与 Android 由项目维护的 Creator 原生插件/适配层调用 MAX 对应平台原生 SDK。Cocos 场景只能调用共享 TypeScript 门面，不能直接触碰 Android Activity、iOS ViewController、MAX 原生对象或任何网络 SDK。
- 不依赖 Web 容器兼容层，也不假设存在 AppLovin 官方 Cocos 插件。原生实现须符合当前 Creator 版本的原生插件、构建和 JSB 接口要求；无法满足平台构建条件时标记阻断并回到 Work Item 决策，不静默切换到其他引擎或框架插件。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。
- 任何平台只允许一个广告服务实例和一个平台原生适配器实例。每个广告位持有独立业务状态和至多一个加载重试 timer，格式匹配的 MAX 原生对象由原生适配器管理；所有广告位只共用激励视频结束后的插页保护截止时间等服务级状态，不设置跨广告位全屏互斥，不共用加载重试 timer。重复初始化、预加载、展示请求或 SDK 回调不能造成同广告位并发 load、递归回调或多套退避机制。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#不变量与平台边界)。

## 固定聚合网络与别名

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#固定聚合网络与别名)。

| canonical | MAX/控制台常见名称 | 别名与注意事项 |
| --- | --- | --- |
| `applovin` | AppLovin / AppLovin Exchange 或 AppLovin Bidding | MAX 自有需求；不另接一个“AppLovin adapter”来代替 SDK 初始化。 |
| `admob` | Google Bidding and Google AdMob | Google AdMob 是同一项固定渠道；不要把 Google Ad Manager 误加入本次集合。 |
| `mintegral` | Mintegral | 以官方 MAX Mintegral adapter 与当前隐私说明为准。 |
| `pangle` | Pangle | ByteDance 相关名称可能出现在 SDK/adapter 资料中；国家、地区、商店和流量限制必须按官方当前要求逐项配置，不预设地区规则。 |
| `unity` | Unity Ads | 使用 MAX 的 Unity Ads adapter，不把 Unity 游戏插件或 Unity 引擎依赖带入 Cocos 项目。 |
| `dt-exchange` | DT Exchange | Fyber 是历史/常用别名；本合同只计为一个渠道，不重复接入。 |
| `verve` | Verve | PubNative、HyBid 是历史/产品别名；本合同只计为一个渠道。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#固定聚合网络与别名)。

## 三方职责分离

### MAX 控制台

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#max-控制台)。

4. 记录控制台环境、平台、ad unit 所属 Work Item 和责任人。SDK key 与 ad unit ID 由分环境构建配置注入原生适配器，不手写进业务源码、示例、公开文档、遥测或本仓库；广告网络账号凭证不得进入客户端。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#max-控制台)。

### 官方原生插件与依赖

项目按 Creator 原生构建接入对应平台的 AppLovin MAX SDK，并由 Cocos 原生插件/适配层管理 SDK 实例、广告格式对象和回调。Android SDK 与 iOS SDK 的版本和 mediated network adapters 分别按 AppLovin 对应平台当前官方文档锁定；同一平台不能重复引入多个 MAX SDK 副本。

本合同不写死 Creator、SDK、adapter 或第三方网络 SDK 版本，也不允许无约束的版本通配。实施时记录平台 SDK 与 adapter 的实际版本、官方页面、目标平台构建方式和兼容性证据；Android 与 iOS 的依赖声明分别维护。Pangle 的区域配置、平台差异和必要参数以 AppLovin 当前 Pangle 章节为准。

### Cocos 原生插件与 JSB 适配层

TypeScript 门面只与项目的 Cocos 原生适配层通信，再由原生实现调用 MAX SDK。若 Creator 目标版本支持 `native.bridge`，官方 JS API 为 `native.bridge.sendToNative(arg0, arg1?)` 和唯一可赋值的 `native.bridge.onNative`；参数只传字符串，复杂负载需编码为 JSON。`sendToNative` 是单向调用、没有返回值，不能证明原生操作成功。建立单一桥接监听器，以稳定事件名和 JSON `requestId`/实例代次回传异步结果；不得在各业务组件重复覆盖 `onNative`。实际接口以[Creator 对应版本桥接文档](https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/js-oc-bridge.html)为准。

- 接收统一 SDK 初始化模块的 MAX 初始化配置/重试请求，以及广告门面的按广告位预加载、状态查询和展示请求；验证原生平台、生命周期、业务 `slotId` 和环境配置，映射为 MAX ad unit ID，再调用当前版本的 SDK API。初始化编排、完成状态和初始化恢复由[SDK 统一初始化](../../cocos-game-architecture/references/sdk-initialization.md)唯一管理。
- 原生层把 SDK 初始化回调、load、display、hidden、reward、Banner expand/collapse、click 和 failure callbacks 映射为稳定事件与结构化结果；初始化事件回给统一 SDK 初始化模块，广告事件回给广告服务。原始错误消息不得直接进入业务 UI 或遥测。
- Android 原生 API 由统一初始化任务通过插件适配器调用 `AppLovinSdkInitializationConfiguration`、`AppLovinSdk.getInstance(context).initialize(...)`；插页/激励对象在对应版本支持时使用 `loadAd()`、实例 `isReady()` 与 `showAd(...)`。激励只能在 `onUserRewarded(...)` 收到原生奖励回调后发放。Banner 使用 `MaxAdView`、加载监听与原生 View 层级。iOS 侧使用相应官方原生 SDK 对象和 delegate，不将 Android 类名照搬到 iOS。
- 保存服务实例、每广告位状态和独立加载重试 timer；不把平台对象、SDK 类、网络凭证、MAX waterfall 或设备标识返回 Cocos 层。
- 在 Android 绑定当前有效 Activity，在 iOS 绑定当前有效 ViewController；后台、恢复、销毁和重复回调都必须有明确处理。不存在有效宿主时立即返回 `no-host`，不阻塞等待。

SDK key 与 MAX ad unit ID 是 MAX 原生 SDK 所需的客户端配置，由生成式、分环境构建配置注入原生适配器并按 debug/test/release 隔离；业务场景只使用 `slotId`，不得直接持有这些值。它们不得写入手工维护的业务源码、示例、日志、遥测或版本库。广告网络账号凭证、Ad Review key 和服务器 API key 属于秘密，只能留在对应控制台、CI 秘密或原生构建配置，绝不传给 Cocos 层。

## 平台行为矩阵

| 运行目标 | 初始化/预加载 | 状态/触发 |
| --- | --- | --- |
| Cocos Web / 浏览器 | 立即返回 `unsupported-platform`，不调用 MAX | `isReady=false`；全屏展示和 Banner 显隐均立即 no-op |
| 小游戏或其他 Web 容器 | 同上；若平台有独立广告 SDK，另建经批准的 Skill/模块 | 不在本合同内实现或兜底为 no-op |
| Cocos Creator Android Native | 项目原生插件调用 MAX Android SDK；初始化完成后静默预加载启用的插页与激励广告位 | 全屏复核 MAX 实例 `isReady()` 和业务门后调用 `showAd(Activity)`；Banner 首次展示时创建 `MaxAdView` 并加载，按安全布局加入原生 View 层级 |
| Cocos Creator iOS Native | 项目原生插件调用 MAX iOS SDK；初始化完成后静默预加载启用的插页与激励广告位 | 全屏复核对应原生实例 readiness 与业务门后调用官方 `showAd`；Banner 首次展示时创建原生广告视图并加载，按安全布局加入宿主视图层级 |

## 公开桥接接口与结构化结果

参数命名可按目标项目约定调整，但不得改变“快速返回、事件最终确认”的语义。桥接调用只表示消息已发送；适配器在可用时可将本地消息派发包装成快速 `Promise`，该 Promise 只表示桥接请求已受理/拒绝，不表示 SDK 初始化、广告网络加载、展示或隐藏已完成。SDK 初始化只由统一初始化模块发起；广告调用方不得等待 SDK/广告完成来推进游戏流程。业务层只传环境、能力开关、自然中断上下文和 `slotId`；SDK key 与 MAX ad unit ID 由原生适配层从受控构建配置解析，广告网络 placement/账号凭证绝不从 Cocos 层传入。

```ts
initialize(config: InitConfig): Promise<InitResult> // 仅供统一 SDK 初始化模块调用；快速返回本地受理/拒绝
retryInitialize(): Promise<InitResult>        // 如需显式重试，由统一初始化模块路由至 MAX 独立任务
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
  phase: AdPhase;            // 资源/展示 phase，不是 Cocos 场景状态
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

所有原生回调另带稳定 `eventId`，同一回调跨桥重投时不得重新生成，以此去重传输层重复。应用主动 load 的回调必须匹配当前 `loadOperationId`；Banner auto-refresh 的回调必须匹配当前活动 `refreshEpoch`。同一 refresh epoch 可以产生多轮合法 `loaded`，不能仅因 generation/slot 相同而丢弃；停止 auto-refresh 时立即使该 epoch 失效，之后到达的旧回调不得进入重试或改变可见性。上述类型中的 `phase` 只描述对应广告位自身，所有 gates 由原生服务依赖计算，不能镜像到 Cocos 场景状态。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

- `not-initialized`、`initializing`、`privacy-pending`、`privacy-blocked`：初始化或合规前置未完成。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#公开桥接接口与结构化结果)。

## 多广告位状态与单一服务

每个广告位使用独立业务 `phase`、加载失败计数、retry deadline 和加载重试 timer；平台原生适配器持有格式匹配的 MAX 原生对象，Banner 另有独立 `bannerVisibility`。不能把“已加载”和“当前可见”混成一个 phase。服务级统一持有实例代次、Banner 可见性仲裁和 `interstitialBlockedUntilMonotonicMs`。该截止时间只表达激励视频结束后的 30 秒跨格式保护，不是广告位加载重试 deadline，也不创建 timer。广告服务仍是业务状态的单一所有者；每个广告位的加载重试独立定时，不得复制另一套退避算法。

### 广告实例就绪属性与预加载成功

插页与激励视频预加载是否成功，唯一依据是当前有效 MAX 广告实例对象的就绪属性。Android 官方示例在 `MaxInterstitialAd`/`MaxRewardedAd` 实例上调用 `isReady()`；iOS 使用对应 SDK 实例的 readiness API。`ready` 若作为项目适配对象只读字段，只能实时委托给原生对象，不能由事件单独缓存成可独立过期的布尔值。不得通过实例存在、load 方法受理、桥接消息发送成功或业务 `phase=ready` 推断广告已就绪。读取不得隐式创建实例、发起 load、请求网络或等待加载事件。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#广告实例就绪属性与预加载成功)。

### phase 与原生 gates 分离

`phase` 只描述一个广告位的资源/展示阶段（`new`、`initializing`、`failed`、`idle`、`loading`、`ready`、`showing` 或 `unsupported`）；它不是 Cocos 场景状态。`initializing` 与初始化 `failed` 是统一 SDK 初始化模块状态在广告门面的只读投影，广告服务不另持一份 SDK 初始化状态或重试器。以下 gates 是原生服务依赖，不能复制到场景状态机或由场景自行维护：

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

- `privacy`：除 MAX `hasUserConsent` 首次初始化配置外，其他实际适用广告请求/展示隐私条件是否达到 `ready`；不参与 MAX 初始化及初始化重试判定。`hasUserConsent=false` 本身不能产生 `privacy-pending` 或 `privacy-blocked`，初始化成功与用户选择分别记录，不能互相推断。

Cocos 场景只提供 `slotId` 与自然中断点上下文并消费结构化结果；`tryShow` 前由项目原生适配层读取该广告位当前实例就绪属性、phase 和共享 gates，任一 gate closed/unknown 都立即拒绝。前后台、断网、隐私变化和宿主切换由 Android/iOS 生命周期及 MAX 回调归一化后发布，恢复时重新计算 gates，而不是让场景写入广告 phase。

1. `new → initializing` 是统一 SDK 初始化模块状态在广告门面的投影；只由该模块首次有效投递 MAX 任务触发。相同配置的重复入口复用原请求，不重复创建 SDK/广告对象。广告服务不得直接启动 MAX 或持有第二套初始化重试。
2. MAX 真实初始化回调成功后，统一初始化模块通知广告服务，广告位业务状态进入 `idle`，再通过插页与激励视频各自服务入口去重投递一次预加载意图。Banner 保持未创建，不投递 load；初始化失败投影为 `failed`，恢复由统一初始化模块负责。隐私门只约束实际适用的广告请求/展示条件；不因 `hasUserConsent=false` 阻断请求或改变已确认的 SDK 初始化状态。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

6. 后台、离线、真实适用隐私条件未决或无有效宿主时保留当前 phase 快照，但不发起新的 load/show；`hasUserConsent=false` 本身不是暂停条件。恢复到前台且网络可用后重新计算 gates，并按保留的广告位退避 deadline 最多恢复一次调度。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#phase-与原生-gates-分离)。

每广告位的 deadline、失败计数、加载重试 timer 和正在加载标记，以及各广告位自己的正在展示标记、共享的奖励待决账本、插页保护截止时间和实例代次，都属于广告服务这个单一状态所有者。独立表示加载重试 timer 按 `slotId` 隔离，不表示由 Cocos 场景或组件自行创建；不得让场景、多个组件或多个原生回调各自维护另一份重试、保护时间或奖励状态。

### SDK 初始化与广告位恢复的边界

MAX 的初始化状态、真实完成回调、配置、失败分类、幂等、请求身份和初始化重试由[SDK 统一初始化](../../cocos-game-architecture/references/sdk-initialization.md)中的单一 TypeScript 所有者管理。原生插件/JSB 层只封装平台 API 并回传事件；广告服务只投影初始化状态、消费真实完成事件及管理各广告位自己的 load/create 恢复。初始化恢复不与广告位恢复共用 timer、计数、deadline 或实例状态；不得在 Scene、Component 或广告服务里复制 MAX 初始化任务。

MAX 初始化成功后，广告服务去重投递启用的插页与激励视频预加载意图；每个 load 仍检查实际广告请求隐私条件，未满足时保留该广告位意图，条件恢复后去重恢复。Banner 不参与初始化预加载。MAX 初始化失败、显式单 SDK 重试、网络/生命周期条件恢复和迟到回调按统一初始化规范处理；这些事件不得重跑其他 SDK 或直接改变广告位加载计数。

### MAX 初始化失败分类与独立自动重试

以下所有初始化状态和恢复规则均由 `assets/scripts/platform/initialize-sdks.ts` 内 MAX 独立任务持有，原生插件/JSB 只返回请求受理结果和带操作身份的 SDK 回调；广告服务只投影状态并管理广告位 load/create 恢复，不得复制初始化计数、deadline、timer 或重试逻辑。

- MAX 的真实初始化错误进入 `failed`，返回稳定错误类别和 `retryScheduled`，不阻塞游戏。相同配置的重复 `initialize` 复用 in-flight 请求或失败/恢复快照，不递归初始化，也不重置退避。
- 网络超时、网络服务暂不可用和明确的原生瞬时错误按 2/4/8/16/32/64 秒公式独立退避，使用与广告合同一致的 `0.8–1.2` 抖动并将最终延迟封顶在 64 秒；无次数上限，持续到成功、MAX 被禁用或该任务销毁。初始化连续失败次数、单调时钟 deadline、timer 和 in-flight 状态只由 MAX 任务保存；失败回调只登记任务，不同步递归初始化。
- `host`、`foreground` 或 `connectivity` 条件关闭时不发起新初始化。已有退避时暂停 timer，但保留失败计数与 deadline；条件变化不增加计数。配置/策略阻断及未知待诊断错误解除后，没有 deadline 时最多立即投递一次；到期的 deadline 才允许投递，未来 deadline 则按剩余时间恢复 timer。重复恢复事件不得重复请求。
- 缺失 SDK/adapter、无效配置、平台不支持或明确策略阻断不自动重试：取消 MAX 恢复 timer 并报告原因。修复配置/依赖或解除明确策略阻断后，才由调用方显式 `retryInitialize()`；未修复时返回原阻断。前台、网络、宿主或 CMP/ATT 状态变化不能替代修复或自动解除阻断。无法归类的错误先诊断，不凭自由文本无限退避，只有确认是瞬时故障后才进入自动重试。
- `retryInitialize()` 是同一 MAX 任务的手动入口：初始化进行中复用原请求；已有自动退避时复用原 deadline，不抢跑、不清零计数；宿主/前台/网络条件关闭时返回原因并保留待恢复意图。确定性配置问题修复后，清除对应阻断和旧失败计数，再受理一次新初始化；已成功则返回成功快照，不重复初始化。
- 每次原生尝试和回调都关联唯一操作身份及当前配置/实例代次。迟到、重复或旧实例回调不得覆盖当前状态、增加失败计数、重复启动恢复或再次投递预加载；配置替换、MAX 禁用、宿主实例重建或应用级初始化任务销毁时，使旧请求与 timer 失效。timer 执行前清空自身引用并复核代次、请求有效性、SDK 自身运行条件和非 in-flight 状态。
- 只有 MAX 真实初始化完成回调能确认成功。当前有效请求出现可观测的真实失败信号（同步调用异常、本地受理拒绝或 SDK 官方提供的失败回调）时，才按错误类别处理；单纯等待超时或没有任何回调时保留同一 in-flight 状态，不伪造失败或启动重试。
- 初始化成功立即清零 MAX 初始化失败计数、取消 timer、清空 deadline/恢复意图，并只向广告服务投递一次全部启用插页与激励视频的预加载意图；广告位继续检查真实广告请求隐私条件并分别恢复。Banner 不创建、不预加载。MAX 初始化任务与每个广告位 RetryState 完全隔离，任一侧的重试不共享或改写另一侧 timer、计数、deadline。

MAX 内建 Terms and Privacy Policy Flow 已在初始化前关闭，因此 MAX 初始化回调不得等待该弹窗。项目的 CMP/Google UMP/TCF 与 ATT 各自维护真实状态及用户界面，不与 MAX 初始化任务共用完成条件、失败计数或 timer；CMP/ATT 尚无结果、失败或用户拒绝都不能替代 MAX 的真实初始化回调，不能把 MAX 任务标为成功/失败或自动再次初始化。真实且有官方依据的前置只影响它明确约束的任务/广告请求，不伪造隐私结果。

## MAX 隐私配置与初始化时序

1. 唯一初始化入口检查受控平台配置、当前 Activity/ViewController、环境开关与原生 SDK 配置；Web/小游戏直接 no-op。Cocos 引擎和 AssetDB 按自身生命周期运行，不作为第三方 SDK 初始化的一部分。
2. 每个新 MAX 实例首次初始化前，通过锁定插件/SDK 支持的原生入口设置 `hasUserConsent=false`，并在初始化前关闭 MAX 内建 Terms and Privacy Policy Flow。Android 官方原生 API 为 `AppLovinPrivacySettings.setHasUserConsent(false)` 与 `AppLovinSdk.getInstance(context).getSettings().getTermsAndPrivacyPolicyFlowSettings().setEnabled(false)`；iOS 官方原生 API 为 `[ALPrivacySettings setHasUserConsent:NO]` 与 `[ALSdk shared].settings.termsAndPrivacyPolicyFlowSettings.enabled = NO`（Swift 使用 `isEnabled = false`）。随后由统一初始化模块调用当前版本的 MAX `initialize` 并只凭真实完成回调确认成功。按项目锁定 SDK/插件版本核验调用可用性和最终生效值。
3. 官方也支持原生资源配置 `consent_flow_enabled=false`（Android）和 `ConsentFlowEnabled=NO`（iOS）。如项目采用资源配置，应合并保留其他有效值，并检查打包后的有效配置；不能因官方页面演示启用示例而保留 `true`。关闭流程不等于关闭 SDK、跳过 MAX 初始化或完成用户同意收集。
4. 首次设置的 `hasUserConsent=false` 是 MAX 配置，不是用户已同意或拒绝的回执，不得据此伪造 CMP/TCF/ATT 结果或阻断初始化、广告请求和 load 重试。后续真实用户选择到达时按锁定插件官方接口同步，不由同实例初始化重试再次写入初始 `false` 覆盖。真实适用的 CMP/TCF、地区、网络及 ATT 条件继续由各自流程处理；确有官方前置时不得伪造完成，只阻断对应 SDK/广告动作并记录来源。
5. iOS `Info.plist` 按当前 AppLovin SKAdNetwork 页面与实际启用的 mediated networks 生成/维护 `SKAdNetworkItems`，不能复制过期固定清单。Android/iOS 隐私 manifest、数据安全声明、商店隐私资料和目标地区限制由发布责任人核对；ATT 描述和请求时序按平台官方流程及项目决策处理，不重复弹窗，也不把未授权结果说成已授权。
6. 若使用 Google UMP/CMP，核对实际消息配置、IAB TCF 与聚合网络覆盖；任何外部控制台配置由责任人在授权范围内完成。隐私状态由适配层按官方 API 如实读取/传递；广告请求门只表达确有适用的阻断条件，不能仅因 `hasUserConsent=false` 返回 `privacy-pending` 或 `privacy-blocked`。儿童数据、年龄限制和地区义务不能自行假设或绕过。

官方参考：[Android MAX Privacy](https://support.applovin.com/en/max/android/overview/privacy)、[iOS MAX Privacy](https://support.applovin.com/en/max/ios/overview/privacy)、[Android Terms and Privacy Policy Flow](https://support.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow) 和 [iOS Terms and Privacy Policy Flow](https://support.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow)。

## 全屏广告静默预加载与独立持续重试

### 常规路径

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#常规路径)。

### 退避公式

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#退避公式)。

5. 已收到的 `loadFailed` 无论错误类别都登记持续退避重试，不因 configuration、adapter 或 unknown 类别停止或设置次数上限，并把诊断原因报告给控制面。隐私、前后台、网络和宿主 gates 关闭时保留重试任务但暂停请求，恢复后继续；MAX 初始化未成功时只由统一初始化模块持有独立的分类恢复任务，广告位恢复不代管或绕过该任务。Banner 只恢复由当前展示场景请求发起的创建或加载，隐藏或离开展示场景后取消待执行恢复；创建失败时可以在原展示请求有效期间重试创建，不能借重试创建从未请求展示的视图。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#退避公式)。

### 快速返回语义

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#快速返回语义)。

## Banner 布局、显隐与刷新

### 提前规划 UI 布局

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#提前规划-ui-布局)。

### 原生视图和安全布局

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生视图和安全布局)。

- Banner 位于原生视图层并遵守系统 safe area。内容 inset 在页面布局阶段按当前平台支持的尺寸规则预先确定，MAX 回调中的实际/自适应尺寸仅用于核对预留区域；不得把固定 50px/50dp 当作所有设备的真实高度，也不得把 Banner 尺寸乘入 Cocos 渲染 DPR。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#原生视图和安全布局)。

### 显隐快速返回

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。
- `setBannerVisibility(slotId, false)` 无论当前 phase 如何都清除可见请求、使其请求代次失效、取消创建/加载重试与待恢复操作，幂等停止刷新并隐藏，返回 `banner-hidden`；离开展示场景必须调用此入口。Banner 未 ready、显隐失败或 loadFailed 都不显示视频不可用 Toast，也不阻塞 Cocos 场景。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#显隐快速返回)。

### 创建失败重试与场景退出

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#创建失败重试与场景退出)。

### 刷新单一所有者

- Banner 正常刷新只允许 MAX 原生 auto-refresh 作为所有者；禁止 Cocos、JavaScript、场景组件或通用 timer 另建固定刷新循环。刷新间隔和策略以 MAX 控制台与当前官方 API 为准，不在 Skill 中硬编码。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#刷新单一所有者)。

## 展示触发与视频失败提示

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示触发与视频失败提示)。

最小调用方式应类似“发起展示尝试后立即结束当前同步处理”；禁止 `await ad.load()`、`await ad.showUntilHidden()` 或为了广告结果暂停 Cocos 更新。激励 show 受理时以 generation/slot/request 建立奖励待决记录；`rewarded` 事件可以在 `hidden` 前后到达，只要匹配一条仍有效且未失败的待决记录就异步发奖并原子标记已结算。`hidden` 不发奖也不删除待决记录，下一次展示不能覆盖上一条记录；`displayFailed` 将对应记录标为不可发奖。待决记录只能在发奖、明确展示失败或经过项目基于平台测试确定的有界结算窗口后清理，超时必须记录 `reward-settlement-timeout`。高价值或跨进程奖励应采用 MAX S2S rewarded callback 与服务端幂等账本。

### 视频广告不可用 Toast

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#视频广告不可用-toast)。

- Toast 是 UI 反馈，不改变加载计数、奖励和游戏流程。原生适配层只发送稳定 `noticeCode`，不直接操作 Cocos UI，也不把 SDK 原始错误文本展示给用户。

## 展示失败、生命周期与断网

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。
- MAX `hidden` 要结束该广告位展示状态并立即静默预加载同一广告位的下一条；匹配当前激励视频展示的事件还要先更新 30 秒插页保护截止时间。如果用户快速离开场景，预加载请求仍不得持有已销毁的 Cocos/Activity/ViewController。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#展示失败生命周期与断网)。

## 错误分类与处理原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#错误分类与处理原则)。

| 类别 | 常见含义/官方码示例 | 处理 |
| --- | --- | --- |
| `unsupported` | Web/小游戏或未实现的平台 | 立即 no-op，不初始化、不重试。 |
| `configuration` | 无效 ad unit、缺失 SDK/adapter、包名不匹配；例如 `-5603` | SDK 初始化配置错误修正后由统一初始化模块显式重试；加载失败持续退避重试并报告配置问题。 |
| `privacy` | 有来源的实际隐私阻断、ATT/CMP/SKAN 前置未完成 | 不请求广告；监听隐私状态变化后重新评估 gates。MAX 初始 `hasUserConsent=false` 不是同意回执或阻断原因。 |
| `lifecycle` | 无有效 Activity/ViewController、后台、宿主已销毁 | 快速返回并暂停调度；前台/宿主恢复后最多恢复一次。 |
| `connectivity` | 无网络、超时、网络错误；例如 `-1009`、`-1001`、`-1000` | SDK 初始化瞬时失败由统一初始化模块独立退避，离线暂停后按原 deadline 恢复；load 失败使用广告位独立退避。 |
| `no-fill` | 当前设备/地区无可用填充；例如 `204` | 视为瞬时 load failure，使用统一指数退避。 |
| `adapter` | adapter/第三方 SDK 载入失败、内部错误；例如 `-5001`、`-5209` | 记录渠道别名和类别，按 load 退避；依赖缺失则升级为 configuration。 |
| `concurrency` | 同广告位已有展示请求、广告未 ready 或 Banner 可见性冲突 | 不重试 show、不设置跨广告位全屏互斥；Banner 保持隐藏。 |
| `display` | 展示过程失败；iOS 例如 `-4205` | 独立记录，结束对应广告位展示状态并立即重新预加载。 |
| `unknown` | 无法归类的 SDK/桥接异常；例如 `-1` | SDK 初始化未知错误由统一初始化模块先诊断，确认瞬时后按 SDK 合同恢复；加载失败持续退避重试。gates 关闭时暂停，恢复后继续。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#错误分类与处理原则)。

## 遥测与安全

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#遥测与安全)。

禁止记录或上传 SDK key、MAX ad unit ID、网络 placement/账号凭证、IDFA/AAID、设备标识、用户标识、IP、完整 SDK 错误消息、完整 waterfall、竞价凭证、CMP 原文或可反推出个人的自由文本。原生错误对象只取稳定分类/数值码；原始日志仅限受控本地 debug，发布构建关闭敏感日志。

测试、debug、staging 和生产的 SDK key、ad unit、MAX Test Mode 与遥测端点必须隔离。SDK key 与 ad unit 通过不入库的生成式构建配置提供给原生适配器；广告网络账号凭证、Ad Review key 和服务器 API key 保持在 CI 秘密或原生构建配置中。广告模块不建立新的用户画像、个性化标识或绕过 CMP/ATT 的通道。

## 验收与测试矩阵

### 状态机和非阻塞单测

使用假的单调时钟、timer、原生适配器和网络/生命周期事件，至少覆盖：

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 用原生插件替身核验新实例首次初始化前先设置 `hasUserConsent=false` 并关闭 MAX 内建 Terms and Privacy Policy Flow，再调用 `initialize`；同实例重入/初始化重试不重复写入 false 或覆盖后续真实用户选择，新实例重新按首次配置执行。
- 使用永不结束、失败和返回真实状态的独立 CMP/ATT 替身验证：MAX 内建流程关闭后，MAX 的真实初始化回调可独立确认 SDK 成功，不等待 CMP/ATT 用户界面；CMP/TCF/ATT 的真实状态与错误只更新对应隐私任务，不改变 MAX 初始化状态。
- 对 MAX 任务的假时钟/原生回调分别验证瞬时错误的 2/4/8/16/32/64 秒退避、`0.8–1.2` 抖动及 64 秒硬上限；重复瞬时失败无次数上限。配置/依赖/明确策略错误修正前不自动请求；unknown 先诊断，不能凭错误文本无限退避。
- 分别注入当前有效请求的同步调用异常、本地受理拒绝和 SDK 官方失败回调，断言它们按真实失败信号分类；只有纯超时或完全无回调时保持 in-flight，不伪造失败或启动重试。
- 关闭 `host`、`foreground`、`connectivity` 任一门时验证暂停 timer 且保留单调 deadline 和失败计数；恢复时仅按 deadline 恢复一次，重复恢复事件不能重复投递。
- 初始化中和退避中的 `retryInitialize()` 分别复用 in-flight 请求或原 deadline，不抢跑、不重置计数；问题修复后只重新受理一次。旧/重复操作身份回调不能覆盖新状态或重复计数；配置替换、禁用和任务销毁使旧 timer/回调失效。
- MAX 回调未到时保持同一个 in-flight 状态，不伪造 `failed`、`retryScheduled` 或成功；有真实成功回调时仅一次清零初始化计数并投递全部启用全屏广告位的预加载，Banner 不创建，广告位恢复不改写 MAX 初始化 timer/计数。
- `hasUserConsent=false` 且无其他实际隐私阻断时，断言 `privacy=ready`，全屏预加载、Banner 按需加载、ready 展示和失败后的 load 重试正常执行；不得返回 `privacy-pending`/`privacy-blocked`，不得把 false 解释为同意、拒绝或 CMP/TCF 完成。
- 对统一 SDK 初始化模块验证 MAX 与 AppsFlyer 等已采用 SDK 独立投递；一个失败、拒绝或不回调不能延迟其他 SDK或游戏首帧。MAX 真实完成回调、失败分类、幂等和重试不由广告服务重复持有，SDK 重试与各广告位恢复 timer/计数/deadline 相互独立。
- 覆盖后台、离线、宿主条件恢复与初始化配置修正：只恢复 MAX 自己的待办/退避，不重跑其他 SDK；初始化事件不改变广告位 load 失败计数，不因 MAX 内建流程显示/隐藏而转换状态。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 实际 Banner 尺寸超出预留区域或布局未就绪时保持隐藏，不在广告回调中重排游戏 UI；方向/窗口/safe-area 变化先隐藏并由布局模块重新提交，旧回调不污染新布局；主要按钮和手势区不遮挡，内容 inset 不修改 Cocos DPR。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#状态机和非阻塞单测)。

- 使用永不返回广告事件的 fake 原生适配器：结算调用 `void ad.tryShow(context)` 后仍立即推进下一场景；断言适配器调用只等待本地受理/拒绝，不等待 `loaded`、`displayed`、`hidden` 或任何广告回调。

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
