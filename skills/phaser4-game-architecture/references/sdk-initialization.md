# SDK 统一初始化

Android/iOS 采用 Firebase（统计、事件、异常）、AppsFlyer 和 AdMob／MAX 二选一时，先读取[移动 SDK 复用](../../app-domain-toolkit/references/mobile-sdk-integration.md)，安装当前引擎具体实现并接线原生依赖，不逐项目重写 SDK。
项目实际采用的 SDK 按[SDK 文件职责](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#文件职责)分文件管理：每个 SDK 使用 `src/platform/sdks/<sdk>-sdk.ts`。`src/main.ts` 在装配阶段调用 `src/platform/initialize-sdks.ts`，该入口只装配并独立投递各管理器任务。没有采用 SDK 时不创建占位文件，也不因本规范增加 SDK 或依赖。

## 唯一入口与职责

- 入口只投递各 SDK 的独立任务并立即返回，不等待整批初始化。Phaser 首帧、Boot 和场景启动不等待任何 SDK 的批次完成；不得用 `await initializeSdks(...)`、全局 `allSdksReady` 或其他 SDK 启动屏障延迟游戏启动。
- 按[SDK 文件职责](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#文件职责)划分装配入口与各 SDK 管理文件；广告服务、隐私模块、Scene 和平台入口不另建初始化状态或恢复逻辑。
- 公共类型、纯配置、原生插件安装与必要宿主配置继续归属原有文件。平台适配器可封装原生 API 调用细节，但不在构造函数、模块导入或场景生命周期中启动 SDK，也不持有另一份初始化状态或重试器。
- 广告加载/展示、支付、登录界面、埋点业务和隐私交互仍归各自业务模块。广告位加载恢复等 SDK 就绪后的运行期任务由所属服务持有；业务模块通过已注入的能力接口查询结果或请求单个 SDK 重试，不直接导入第三方 SDK。
- SDK 导入不得在模块顶层产生初始化副作用。可选 SDK 的动态加载或调用失败必须在该 SDK 自己的任务中捕获，不得令共享入口或其他 SDK 任务失效。

## 独立启动与真实前置

1. 入口对每个已启用且平台支持的 SDK 分别投递任务；一个 SDK 的配置错误、动态导入失败、同步异常、Promise 拒绝、失败、重试或永不回调，都不能阻止无关 SDK 任务发起。每项任务独立消费拒绝并记录自身结果；确有官方前置依赖时只限制受影响的任务。
2. 禁止无官方真实依据的跨 SDK 串行、`dependsOn` 启动图或等待全部 SDK 完成的 `Promise.all` 门；确有官方前置时仅限制受影响的 SDK。若在任务已投递后使用 `Promise.allSettled` 汇总诊断，汇总结果不能作为 Phaser 启动或其他无关 SDK 的前置。
3. 每个 SDK 只等待自身真实需要的平台、配置、宿主或桥接条件。当前条件未满足时只保留该 SDK 的待初始化意图，不让其他 SDK 或游戏首帧陪同等待。禁止通过延迟到登录、隐私弹窗、广告加载、正式场景或 UI 就绪来建立项目级屏障。
4. 不得绕过锁定版本官方明确要求的真实前置。如果官方要求使某 SDK 无法独立初始化，记录该 SDK、锁定版本、具体前置和来源，只将该 SDK 标记为受限；仍继续投递其他无关 SDK，不伪造初始化成功，也不以“核心 SDK”名义建立全局启动屏障。
5. 广告、支付或跟踪等实际业务动作仍由业务合同检查 SDK 就绪、真实隐私状态和操作条件。初始化解耦不授权提前请求广告或执行其他业务动作；能力未就绪时通过公开接口返回该能力自己的状态。

## 幂等、回调与失败隔离

- 同一应用生命周期、同一有效配置下，每个 SDK 只发起一次初始化；重复入口复用该 SDK 正在进行的请求或已完成状态，不重新启动其他 SDK。配置替换、禁用或销毁时只失效该 SDK 的旧操作与回调，迟到或重复回调不得覆盖新状态。
- 只有该 SDK 的真实完成回调或官方明确的就绪信号才能确认初始化成功；请求已受理、初始化函数返回或其他 SDK 成功都不能代替完成事实。超时本身也不能伪造 SDK 失败或成功。
- 每个 SDK 独立持有初始化请求标识、错误分类、失败次数、deadline 与至多一个恢复 timer。初始化失败只按该 SDK 的适用合同自动重试；单 SDK 手动重试复用同一状态，不重跑整个 SDK 集合。配置错误、平台不支持或官方前置未满足时保留清晰阻断，修正前不盲目循环重试。
- 可重试失败只恢复目标 SDK，不重置或影响其他任务。SDK 特有退避、生命周期与条件恢复以该 SDK 合同为准；初始化恢复不得与广告位加载、支付交易或其他运行期重试共用计数或 timer。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#幂等回调与失败隔离)。

## MAX 与 AppsFlyer

统一入口投递 MAX 初始化意图。仅在项目已有或明确要求隐私业务时另行编排其任务；已采用或官方要求的 CMP（包括 UMP）前置必须遵守。MAX 真实调用及完成回调属于 MAX 初始化分支，未满足官方前置时仅阻断 MAX，无关 SDK 与游戏继续。

- 默认关闭 MAX 内建 Terms and Privacy Policy Flow，并按[广告合同](../../phaser4-game-ad-integration/references/applovin-max-contract.md#初始化前设置-hasuserconsentfalse)核实手动标志路径；新实例配置不得覆盖已有真实选择。同实例重试复用有效配置。自集成 CMP 须按锁定版本官方要求在 MAX 初始化前完成；明确采用内建流程时由 initialize 触发并等待真实完成回调。缺少可用合规路径时阻断 MAX，不强行初始化。
- `hasUserConsent=false` 是 MAX 配置，不是用户同意或 CMP 完成回执，也不能单独证明全部地区、渠道和请求均允许。无其他真实限制时按适用受限模式处理；广告业务仍核对 CMP/TCF、地区、宿主和网络条件。
- 项目采用 AppsFlyer 时，在其管理文件实现初始化与启动任务，并由统一入口投递。按锁定插件官方语义处理 session-ready 和真实隐私前置；例如启用 MAX 内建流程时，相关 MMP/分析 SDK 按官方要求等待流程结束。没有官方依赖时各自启动与恢复，不建立无关屏障。
- 官方真实前置若与独立初始化目标冲突，按本文件“独立启动与真实前置”仅报告并阻断对应 SDK；不得谎报 CMP/ATT 结果、套用其他框架 API 或扩展为全局等待。

## 交付与验证

在 TDD 与实施包中记录实际 SDK、目标平台与配置来源、各自真实前置、完成信号、状态所有者、失败分类、初始化重试所有者及业务使用边界。无实际需求时不安装未采用 SDK。

目标项目的定向验证应覆盖：两个 SDK 独立投递；单个 SDK 抛错、拒绝、失败或不回调时其他 SDK 与 Phaser 首帧不受阻；重复入口、配置切换和迟到回调；平台不支持与 SDK 自身的官方前置；单 SDK 重试不重跑其他 SDK；广告运行期重试与 SDK 初始化恢复互相隔离。采用 MAX/AppsFlyer 时还需分别核验 MAX 内建流程关闭、先设置 `false` 后实际初始化回调，以及 AppsFlyer 按自身官方条件实际启动。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#交付与验证)。
