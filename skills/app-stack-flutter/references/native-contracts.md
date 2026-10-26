# flutter 原生技术合同

本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。

## 能力索引

- **产品与游戏需求**
  - [Flutter Product Spec](#mode-flutter-product-spec)
- **技术架构与模块设计**
  - [Flutter Tech Design](#mode-flutter-tech-design)
- **游戏与应用汁水设计**
  - [Flutter 应用交互反馈](#mode-flutter-feedback)
- **候选交付与发布准备**
  - [Flutter Release Readiness](#mode-flutter-release-readiness)
- **质量审核与性能验证**
  - [Flutter Quality Review](#mode-flutter-quality-review)
  - [Flutter UX/UI Quality](#mode-flutter-ux-ui-quality)
- **界面布局与自适应**
  - [Adaptive Layout Implementation](#mode-adaptive-layout-implementation)
- **项目整理与产物清理**
  - [Flutter 项目整理与清理](#mode-flutter-artifact-cleanup)
- **项目初始化与基础运行时**
  - [Flutter Project Init](#mode-flutter-project-init)
- **界面代码草图**
  - [Flutter Code Sketch](#mode-flutter-code-sketch)
- **视觉素材生产**
  - [Flutter Asset Atlas](#mode-flutter-asset-atlas)
  - [Flutter High-Fidelity Mockup](#mode-flutter-hifi-mockup)
- **开发编排与实施交接**
  - [Flutter Implementation Plan](#mode-flutter-implementation-plan)
  - [Flutter Subagent Delivery](#mode-flutter-subagent-delivery)

## 产品与游戏需求

<!-- native-source:flutter-product-spec:start -->
<a id="mode-flutter-product-spec"></a>

<a id="mode-flutter-product-spec--flutter-product-spec"></a>
### Flutter Product Spec

<a id="mode-flutter-product-spec--overview"></a>
#### Overview

Turn an app idea into a constrained commercial product spec. The output must make scope, users, value, and acceptance criteria testable before UX or code work starts.

<a id="mode-flutter-product-spec--inputs"></a>
#### Inputs

- App idea or business goal.
- `docs/product/grilling-log.md` with the user's explicit shared-understanding confirmation when the product is entering the commercial delivery workflow.
- Target market or audience, if known.
- Platform assumptions: Flutter mobile first unless the user states otherwise.
- Monetization intent, if known.

<a id="mode-flutter-product-spec--process"></a>
#### Process

1. State assumptions and ask only for information that changes MVP scope.
2. Identify target users, painful jobs, high-value moments, and the first value the user must receive after starting.
3. Split MVP from later features.
4. Define user stories with acceptance criteria, including the value, trust, and perceived-risk conditions that affect first-time adoption; keep them as sections of the product brief.
5. Define commercial constraints: payment, account, data ownership, privacy, support, and retention.
6. Record the intended product quality: brand character, interaction tone, visual constraints, and decorations that are justified by the product rather than added for novelty.
7. Derive a visual expression preset from product category and audience using [../flutter-ux-ui-quality/references/visual-expression-presets.md](../../flutter-ux-ui-quality/references/visual-expression-presets.md). Record preset ID, axis values, and derivation basis in the product brief. Do not lower task-clarity or trust gates; the preset only sets expression ceiling and exploration bias.
8. Before handing off to global UX/UI exploration, run the one-time light visual interrogation from the preset reference. Record answers in `docs/product/grilling-log.md` and mirror signature and implementation-cost commitments in the product brief. Both records are required.
9. Write the product brief using [references/product-brief-template.md](../../flutter-product-spec/references/product-brief-template.md). Keep MVP scope, stories, market assumptions and acceptance criteria in that same document unless the user explicitly requests a standalone export.

<a id="mode-flutter-product-spec--output-files"></a>
#### Output Files

- `docs/product/product-brief.md`
- `docs/product/grilling-log.md` updates for the light visual interrogation

<a id="mode-flutter-product-spec--gate"></a>
#### Gate

Do not proceed to UX/UI or technical design until the grilling log records the user's explicit shared-understanding confirmation, the MVP has clear non-goals, every core feature has acceptance criteria, the product brief records a derived visual expression preset, and the one-time light visual interrogation answers are recorded in the grilling log with signature and implementation-cost commitments mirrored in the product brief.

<a id="mode-flutter-product-spec--common-mistakes"></a>
#### Common Mistakes

- Writing a feature catalog without user value, a first-value moment, or a safe reason to try the product.
- Allowing "nice to have" items into MVP.
- Missing account, privacy, or monetization assumptions for a commercial app.
- Treating visual polish as a substitute for clear value, reliable feedback, and trust.
- Leaving the visual expression preset blank, or using "restrained" as a universal default instead of deriving axes from category and audience.
- Entering UX/UI after deriving a preset but before completing the light visual interrogation and brief mirror.
<!-- native-source:flutter-product-spec:end -->


## 技术架构与模块设计

<!-- native-source:flutter-tech-design:start -->
<a id="mode-flutter-tech-design"></a>

<a id="mode-flutter-tech-design--flutter-tech-design"></a>
### Flutter Tech Design

<a id="mode-flutter-tech-design--overview"></a>
#### Overview

Create the smallest practical technical design that supports the approved product. This skill selects architecture and integration strategy; release evidence belongs to `flutter-release-readiness`.

<a id="mode-flutter-tech-design--process"></a>
#### Process

1. Read product and UX artifacts before choosing architecture.
2. Identify the app and service shape: local-first, API-backed, subscription, content, community, commerce, AI, or enterprise.
3. Choose only required state, routing, persistence, networking, auth, payment, observability, environment, and dependency capabilities.
[公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)
5. For APIs/services, define contract and versioning, authentication/authorization, idempotency/retry/timeout, migration/rollback, service tests, deployment/monitoring, backup/recovery, and client compatibility. If server implementation is out of scope, record only external dependencies, owners, assumptions, and client boundaries.
6. Define layered platform verification: foundation startup/routing/plugin smoke; primary-target runtime smoke after critical business flows; complete platform matrix at final integration/release. Never auto-start physical-device acceptance.
7. Define the shared breakpoint resolver, constrained page container, scroll-owner policy, docking/overlay primitives, and system-inset/keyboard infrastructure that page layout specs will consume. Do not reimplement these decisions independently in each page.
8. Write `docs/architecture/technical-design.md` with [references/technical-design-template.md](../../flutter-tech-design/references/technical-design-template.md) and `docs/architecture/verification-platforms.md` with [references/verification-platforms-template.md](../../flutter-tech-design/references/verification-platforms-template.md).

<a id="mode-flutter-tech-design--dependency-capability-bias"></a>
#### Dependency Capability Bias

- Prefer SDK features, existing packages, and boring well-supported dependencies.
- Use [dependency-profiles.md](../../flutter-project-init/references/dependency-profiles.md) to enable only needed core, data/API, complex-domain, and UI-token profiles.
- Record why each package/profile is enabled and which lighter option was rejected.
- Require annotations and generation only for actually adopted generated-model/serialization profiles.
- Do not add offline sync, plugin abstraction, multi-backend support, or a custom design engine unless the MVP requires it.
- Centralize configuration and secrets; never hardcode keys.

<a id="mode-flutter-tech-design--commercial-requirements"></a>
#### Commercial Requirements

Explicitly address applicable account lifecycle, privacy-sensitive data, payment restoration, analytics/crash reporting, feature flags, CI, build flavors, release signing, service rollout, monitoring and recovery.

<a id="mode-flutter-tech-design--gate"></a>
#### Gate

Do not move to implementation planning until decisions, rejected alternatives, dependency profile reasons, module/data ownership, contracts, service boundaries, verification commands, layered platform scope, migrations/rollback, and production-risk ownership are explicit.
<!-- native-source:flutter-tech-design:end -->


## 游戏与应用汁水设计

<!-- native-source:flutter-feedback:start -->
<a id="mode-flutter-feedback"></a>

<a id="mode-flutter-feedback--flutter-原生适配交互反馈"></a>
### Flutter 原生适配：交互反馈

> 本文件是 app-creator-skills 仓库新增的 Flutter 原生适配，不是五个源仓库保留的原生 Skill，也不新增独立 `SKILL.md` 入口。它由统一的 [`app-feedback`](../../app-feedback/SKILL.md) 能力入口按需调用。

先遵守[公共执行协议](../../app-creator-workflow/references/professional-execution.md)，再将[游戏与应用共用的交互反馈规范](../../app-feedback/references/interaction-feedback.md)应用到 Flutter 项目。本文件只规定 Flutter 的实现映射；产品语义、事件矩阵、通道预算与异步真实性原则以共用规范为准。

<a id="mode-flutter-feedback--flutter-中的实现边界"></a>
#### Flutter 中的实现边界

- **让业务状态驱动反馈。** Widget 的视觉状态来自当前业务/界面状态；`build` 保持可重复调用且不承担副作用。已成立的用户操作或既定路由意图可以包含转场表现并正常收尾；动画完成本身不能冒充保存成功、奖励到账等业务结果，也不能触发没有用户或既定路由意图的新导航。
- **即时响应与最终结果分别呈现。** 控件按下、输入已接收、局部忙碌状态可以立即反馈；网络或持久化结果另行呈现。乐观更新明确失败回滚或恢复入口，不能把本地临时值写成已确认。
- **把动画范围限制在负责组件。** 使用项目已经采用的动画和渲染方式表达需要的变化；把频繁动画状态限制在相关子树，避免每帧通知页面根节点并重建无关内容。列表项目和动态内容保持稳定身份，避免重排时反馈串到另一条目。
- **按已有架构接入声音和触觉。** 复用项目已有的服务、包和平台约定；只有存在明确语义且目标设备/偏好允许时才触发。声音和触觉不可用或被关闭时，业务状态仍可理解。不为了反馈任务新增依赖或假设某个设备必然支持触觉。

不要在没有项目依据时预设动画 API 版本、固定持续时间、必需声音/触觉，或将游戏粒子、屏幕震动等装饰形式设为普通应用控件的默认反馈。

<a id="mode-flutter-feedback--widgetstate-与-route-生命周期"></a>
#### Widget、State 与 Route 生命周期

- `AnimationController` 等动画资源由清楚的 `State` 或组件所有者持有并在其生命周期结束时清理；若 `TickerProviderStateMixin` 的 `State` 创建控制器，应先释放控制器再调用 `super.dispose()`。退出动画等待要考虑取消语义：普通 `TickerFuture` 在 ticker 被取消后可能一直不完成，只有确实需要等待时才按项目 API 使用 `orCancel` 并处理取消结果。
- 在 `dispose`、路由离开或组件替换后，清理失效视图的订阅、瞬态反馈和展示回调；不要因此无条件取消保存、上传等业务操作。业务操作是否可取消由既有操作所有者和取消契约决定；未取消的权威结果仍交给该所有者处理，旧视图只需停止展示其过期回调。
- `mounted` 只用于避免访问已失效的 State；它不会取消网络/业务请求，也不能阻止同一个仍挂载的页面被旧请求结果覆盖。异步操作仍须单独检查当前操作身份。路由的 `popped` 结果也可能早于退出转场真正结束，业务状态不应依赖转场完成来提交。
- 对用户快速重复提交、切换选择、连续搜索或列表手势，定义当前哪次操作有效。较新操作替换较旧操作时，旧结果不得恢复过期文本、进度、错误或动画。
- 处理应用进入后台、视图遮挡与返回：暂停或停止不应继续的瞬态动效，重新前台后由当前状态恢复；持久业务状态不依赖动画重播才能呈现。
- 对生命周期敏感的异步回调应检查组件是否仍有效，并同时核对操作身份。仅检查组件尚未销毁，仍可能让同一页面上已过期请求更新新状态。

<a id="mode-flutter-feedback--辅助技术焦点与减少动态效果"></a>
#### 辅助技术、焦点与减少动态效果

- 让控件语义、名称、可用性及重要结果与画面一致。错误、保存/发送结果、真实进度或动态加载阶段通过适当的语义/文本呈现；纯装饰变化不应反复触发朗读。
- 验证键盘焦点、表单错误定位、无障碍焦点与导航变化。重要反馈不能只表现为颜色、闪烁、音频或震动，也不应无故把焦点从当前任务移走。
- 读取项目 SDK 和目标平台实际暴露的减少动态效果偏好，并以静态状态或低幅度变化代替非必要动画；功能状态、提示文本和可操作性仍然保留。Flutter 的 `disableAnimations`、`accessibleNavigation` 与 iOS 的 `AccessibilityFeatures.reduceMotion` 表达不同偏好，不能把其中一个臆造成跨平台统一标志；按项目 SDK 现有 API 和产品需要确认适用信号。
- 触觉、声音、动效分别响应项目和平台已有设置。若项目未提供相应能力，保留核心视觉、文字与语义反馈，不新造一套全局偏好或通道调度器。
- `HapticFeedback` 是向平台请求默认触觉效果；它不保证每台设备都会产生可感知输出。`Semantics`/live region 可用于重要动态结果，但播报时序和合并行为可能随平台与辅助技术不同，核心操作仍须可读且可恢复。

<a id="mode-flutter-feedback--布局性能与组件更新"></a>
#### 布局、性能与组件更新

- 让反馈落在操作发生的位置：按钮忙碌状态、表单字段错误、列表条目变化、导航结果或局部进度。避免单一全屏遮罩掩盖仍可交互的上下文，除非产品语义确实要求阻断操作。
- 高频状态更新只通知实际依赖它的局部 UI。按项目现有状态管理方式拆分监听范围，避免动画帧或列表项更新触发整页 `setState`、重复计算昂贵布局，或使无关列表项重建。
- 动效中的尺寸/布局变化注意滚动位置、键盘、安全区和内容增长；错误提示出现后焦点和可见内容应仍可达。项目原有布局规范和无障碍适配优先。
- 依据目标设备与项目约定检查掉帧、过度重绘、列表滚动稳定性和资源清理。不要以增加动画层数或全局监听器掩盖状态归属不清。

<a id="mode-flutter-feedback--flutter-回归检查"></a>
#### Flutter 回归检查

按改动风险选择适合的检查范围，并沿用项目已有测试和验证入口：

- 覆盖即时按下/输入响应与最终成功、拒绝、失败状态是否分明。
- 快速触发、重复操作、反向操作、重试、取消和新旧请求乱序完成时，当前显示结果是否仍对应有效操作。
- 页面离开或组件销毁后，计时器、订阅、动画及异步结果是否停止影响旧视图；重新进入时，持久状态是否从当前数据恢复。
- 减少动态效果、键盘操作、语义提示、错误定位、静音和无触觉情况下，状态和后续动作是否仍可理解。
- 用目标尺寸与具有代表性的列表/页面负载检查布局、帧稳定性和局部重建范围。

组件或自动化检查可以验证状态和语义合同，但不能替代视觉/手感验收。需要视觉检查时，由用户人工查看所提供的实际呈现并确认；不自动分析截图或把未查看的截图称为通过。报告实际运行的验证和仍待人工检查的体验结论。

<a id="mode-flutter-feedback--flutter-api-参考"></a>
#### Flutter API 参考

以下官方 API 文档用于核对当前 Flutter/Dart API 语义，不锁定项目 SDK 版本。实现时按仓库实际 SDK、平台和依赖确认可用字段及行为：

- [AnimationController](https://api.flutter.dev/flutter/animation/AnimationController-class.html)、[State.mounted](https://api.flutter.dev/flutter/widgets/State/mounted.html) 与[转场完成结果](https://api.flutter.dev/flutter/widgets/TransitionRoute/completed.html)：资源生命周期、有效 State 和退出转场的边界。
- [MediaQueryData.disableAnimations](https://api.flutter.dev/flutter/widgets/MediaQueryData/disableAnimations.html)、[MediaQueryData.accessibleNavigation](https://api.flutter.dev/flutter/widgets/MediaQueryData/accessibleNavigation.html) 与[Dart UI 的 reduceMotion](https://api.flutter.dev/flutter/dart-ui/AccessibilityFeatures/reduceMotion.html)：不同辅助/动态偏好信号的语义。
- [HapticFeedback](https://api.flutter.dev/flutter/services/HapticFeedback-class.html) 与[SemanticsProperties](https://api.flutter.dev/flutter/semantics/SemanticsProperties-class.html)：平台触觉请求和无障碍语义接口。
<!-- native-source:flutter-feedback:end -->


## 候选交付与发布准备

<!-- native-source:flutter-release-readiness:start -->
<a id="mode-flutter-release-readiness"></a>

<a id="mode-flutter-release-readiness--flutter-release-readiness"></a>
### Flutter Release Readiness

<a id="mode-flutter-release-readiness--overview"></a>
#### Overview

Act as the Release lane in the multi-level review funnel after F0 and F1 pass. Check whether the immutable Flutter release candidate is ready for commercial release. Treat missing legal, account, payment, analytics, crash, and store evidence as release risks.

This skill verifies launch evidence. Architecture choices for payments, analytics, crash reporting, signing, and environments belong in `flutter-tech-design`; release readiness checks whether those choices are implemented and documented.

<a id="mode-flutter-release-readiness--required-checks"></a>
#### Required Checks

Use [references/release-checklist.md](../../flutter-release-readiness/references/release-checklist.md) and create `docs/release/release-checklist.md`.

Always cover:

- App identity, icons, splash, bundle IDs, versioning.
- Release signing and environment configuration.
- Privacy policy, terms, consent, account deletion.
- Payment, subscription, restore purchase, receipt validation when monetized.
- Crash reporting, analytics, logging, and support channels.
- Store screenshots, descriptions, keywords, categories, and test account.
- App Store Privacy Nutrition Labels.
- Google Play Data Safety form.
- Export compliance and encryption declaration.
- iOS entitlements, Android permissions, and manifest disclosures.
- Data collection disclosures consistent with runtime analytics, crash, ads, and payment SDK behavior.
- API/service contract version compatibility, auth/permission controls, idempotent retry behavior, migration rollback, service tests, deployment monitoring, backup restore and recovery evidence when applicable. If server implementation is externally owned, verify only the recorded dependency, owner, compatibility and release boundary.
- Accessibility, localization, network failures, and offline behavior.
- Release build verification commands.
- The global verification platform scope and its required release evidence.
- Earlier foundation startup/routing/plugin smoke and critical-flow primary-target smoke are present without being overstated; final device/emulator/simulator/browser/desktop matrix is complete for release scope.

<a id="mode-flutter-release-readiness--verification-commands"></a>
#### Verification Commands

Select commands that match the app:

- `fvm flutter analyze`
- `fvm flutter test`
- `fvm flutter test integration_test`
- `fvm flutter build apk --release`
- `fvm flutter build appbundle --release`
- `fvm flutter build ios --release`

Do not claim a platform build passed unless the command was run and output was observed.
Use `docs/architecture/verification-platforms.md` as the sole source of truth. Earlier smoke should already cover shared foundations and critical flows; release executes and records the complete in-scope matrix. Do not claim a platform release-ready unless required build, final runtime smoke, store, privacy and applicable service evidence exists. Never automatically start physical-device acceptance.

<a id="mode-flutter-release-readiness--output"></a>
#### Output

Produce:

- Release-lane verdict: approved / changes_requested / blocked.
- Blocking issues.
- Non-blocking risks.
- Evidence paths.
- Next release actions.

<a id="mode-flutter-release-readiness--gate"></a>
#### Gate

Do not approve the Release lane while any store, privacy, account, payment, crash reporting, API/service rollout/recovery, or release build blocker remains unresolved. Release-lane approval does not itself complete F3: QA and technical verdicts, any triggered Product or visual verdict, and explicit external-release authorization remain required. PR/CI evidence is required only when it is applicable to the current release scope and has been explicitly authorized; missing authorization must not trigger PR/CI creation.
<!-- native-source:flutter-release-readiness:end -->


## 质量审核与性能验证

<!-- native-source:flutter-quality-review:start -->
<a id="mode-flutter-quality-review"></a>

<a id="mode-flutter-quality-review--flutter-quality-review"></a>
### Flutter Quality Review

只审核已进入范围的事实。先读[审核漏斗](../../flutter-quality-review/references/review-funnel.md)决定深度和通道，再按需读取[审核 rubric](../../flutter-quality-review/references/review-rubric.md)；不把窄审查扩大成发布审计。

<a id="mode-flutter-quality-review--输入"></a>
#### 输入

只加载 F1 或指定 F2 通道需要的路径：八字段任务契约、变更文件、F0 命令证据、`snapshot-id`、相关产品/设计/技术决策、页面 layout-spec/资产 manifest、以及该层级要求的平台烟测。没有 snapshot 或必要证据时返回 `NEEDS_CONTEXT`。

<a id="mode-flutter-quality-review--检查范围"></a>
#### 检查范围

- F1：范围、风险、验收追踪、输入指纹和 F0 证据；只选择实际触发的 Product、QA、technical、visual、Release 通道。
- F2：只读检查被分配的专业事实；UI 变化才检查语义合同、Code Sketch、冻结目标、资产、测量和同视口 parity。
- F3：确认有效通道覆盖当前 snapshot、阻塞已关闭、平台证据与集成条件满足；不重做 F2。

按需复用已有设计、服务和[关键对齐门禁](../../adaptive-layout-implementation/references/critical-alignment-gate.md)。低保真截图只证明结构；[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

<a id="mode-flutter-quality-review--输出"></a>
#### 输出

F1 返回 snapshot、变化维度、通道和理由；F2 按[统一返回契约](../../flutter-implementation-plan/references/task-brief-template.md)返回发现、缺失证据和结论；F3 返回有效通道、关闭阻塞、剩余风险和最终 verdict。严重级别为 Critical、Important、Minor。

只有 Controller 在需要持久记录时写 `docs/tasks/<task-id>/review.md`。修复后只重跑失败或受影响命令，只重开输入指纹变化的通道。Markdown 不驱动状态、合并或发布；真机验收、外部写入和发布需单独授权。
<!-- native-source:flutter-quality-review:end -->

<!-- native-source:flutter-ux-ui-quality:start -->
<a id="mode-flutter-ux-ui-quality"></a>

<a id="mode-flutter-ux-ui-quality--flutter-uxui-quality"></a>
### Flutter UX/UI Quality

UX/UI Lead 负责页面语义与视觉输入，不写页面代码。

<a id="mode-flutter-ux-ui-quality--流程"></a>
#### 流程

1. 定义全局 UI spec、设计 token、导航语义、无障碍、内容策略与视觉方向。
2. 对每个页面输出语义合同：范围、内容优先级、状态、交互、结果、导航、滚动 owner、断点/重排、文本增长、SafeArea/键盘/系统栏、无障碍与 data/UI/asset ownership。
3. 依据 `flutter-code-sketch/references/code-sketch-level-standard.md` 选择 Full、Lightweight 或 Reuse 并记录理由。
4. 调用 `adaptive-layout-implementation` 创建 `phase: sketch` 的页面 `layout-spec.yaml`；此阶段不含未来视觉 parity 字段。
5. 由 Flutter Engineer 使用 `flutter-code-sketch` 在生产骨架实现中性草图、关系测试和风险选择的截图，再由独立 Code Sketch Reviewer 审阅。
6. Review 通过后调用 `flutter-hifi-mockup` 生成、评审并由用户冻结高保真目标。
7. 对冻结目标与语义合同/sketch spec 做合同回对。任何范围、状态、导航、滚动、断点、无障碍或 ownership 变化都返回更新并重审。
8. 需要资产时调用 `flutter-asset-atlas`；随后把同一 layout-spec 升级为 `phase: fidelity`，在同一骨架还原并进入独立 Visual QA。

<a id="mode-flutter-ux-ui-quality--完成条件"></a>
#### 完成条件

页面只有在风险选择的结构证据、高保真目标、资产证据（或 N/A）、fidelity validator、实际 Widget 关系测量、target/Flutter 同视口截图和独立 Visual QA 全部满足时完成。低保真截图只约束功能与层级，进入高保真后其 Golden 失效或被替换。
<!-- native-source:flutter-ux-ui-quality:end -->


## 界面布局与自适应

<!-- native-source:adaptive-layout-implementation:start -->
<a id="mode-adaptive-layout-implementation"></a>

<a id="mode-adaptive-layout-implementation--adaptive-layout-implementation"></a>
### Adaptive Layout Implementation

每个页面只维护一个 `docs/design/pages/<page-name>/layout-spec.yaml`。先以 `phase: sketch` 表达语义结构与关系证据；冻结高保真目标后把同一文件升级为 `phase: fidelity`。`phase` 不是运行时状态或合并信号。

<a id="mode-adaptive-layout-implementation--流程"></a>
#### 流程

1. 从已审页面语义合同复制 [sketch 模板](../../adaptive-layout-implementation/assets/layout-spec-template.yaml)，填写区域、锚点、断点、内容容器、系统避让、滚动 owner、文本增长与 `text_behavior.line_break` 角色合同、叠层、实现约束、不变量和 `evidence_matrix`。
2. sketch 阶段禁止写 `critical_alignments` 或 `parity_cases`，避免伪造未来证据。运行 `node scripts/validate-layout-spec.js <layout-spec.yaml>` 后才实现 Code Sketch。
3. 在生产 Flutter 骨架中实现并执行实际 Widget 关系测试。文本断行测试必须覆盖最长文案与大字号的组合，并按正文、标题/关键文案、控件标签和原子文本分别验证；结构门禁通过后才按风险生成截图，截图不能替代关系测试。
4. 高保真目标冻结并与语义合同回对后，参考 [fidelity 模板](../../adaptive-layout-implementation/assets/layout-spec-fidelity-template.yaml) 升级同一文件，补充 target↔Flutter `critical_alignments` 与 `parity_cases`。
5. 每个 parity case 只绑定一个明确冻结的 viewport/state/orientation/target SHA 和 candidate code SHA；没有冻结目标的视口不得声称 parity。spec hash 由 Code Sketch Review、任务审阅或 Visual QA 外部记录，禁止写回 spec 造成自引用。
6. 运行 validator、实际 Widget 测量测试、target/Flutter 同视口截图复核和独立 Visual QA。validator 只证明 schema、中心复算、delta、容差和证据元数据，不证明实际视觉一致。

<a id="mode-adaptive-layout-implementation--资源"></a>
#### 资源

- 字段和两阶段规则：[layout-spec.md](../../adaptive-layout-implementation/references/layout-spec.md)
- 执行顺序：[implementation-workflow.md](../../adaptive-layout-implementation/references/implementation-workflow.md)
- Flutter 适配：[flutter-adapter.md](../../adaptive-layout-implementation/references/flutter-adapter.md)
- 测试覆盖：[test-matrix.md](../../adaptive-layout-implementation/references/test-matrix.md)
- 关键对齐门禁：[critical-alignment-gate.md](../../adaptive-layout-implementation/references/critical-alignment-gate.md)
<!-- native-source:adaptive-layout-implementation:end -->


## 项目整理与产物清理

<!-- native-source:flutter-artifact-cleanup:start -->
<a id="mode-flutter-artifact-cleanup"></a>

<a id="mode-flutter-artifact-cleanup--flutter-整理清理原生适配"></a>
### Flutter 整理清理原生适配

> 本规范为 app-creator-skills 仓库新增，Flutter 源仓库没有该整理清理技能；由唯一公共入口 [`app-artifact-cleanup`](../../app-artifact-cleanup/SKILL.md) 按需调用。

先遵循[公共执行协议](../../app-creator-workflow/references/professional-execution.md)，再应用[项目整理与产物清理规范](../../app-artifact-cleanup/references/project-cleanup.md)。公共规则负责分类、引用盘点和清单；此适配规定 Flutter 资源声明、生成文件和打包边界。

<a id="mode-flutter-artifact-cleanup--flutter-资源与构建产物"></a>
#### Flutter 资源与构建产物

- 对照当前 Flutter/Dart SDK、项目采用的代码生成器和所有目标 flavor/channel，检查 `pubspec.yaml` 中 assets、fonts、依赖以及构建脚本/插件自动登记的资源。核对路径大小写、目录级声明和打包生成的资源清单及实际包含情况。
- 追踪 `Image.asset`、`AssetBundle`、`rootBundle`、本地化与生成资源接口的静态引用，也检查通过服务端/配置返回键、`Map`、反射式选择或拼接路径形成的动态资源键。代码中没有字面路径不能证明资源未使用。
- 对图片/atlas检查实际调用点、生成映射 JSON/Dart 文件、导入工具的源图和输出清单。移动或删除必须同时核对映射键和加载 API；不可仅因原图不直接被 `Image.asset` 引用就移除生成输入。
- `build/`、`.dart_tool/` 等目录只在确认可通过目标 SDK、锁定依赖和生成步骤重建后作为候选；保留 `pubspec.lock`、手写/正式 `lib` 与 `assets`、生成器真实输入、平台 Runner 配置、用户数据和发布产物。
- 检查 `flutter gen-l10n`、build_runner或项目脚本声明的生成输出与输入关系。生成文件是否纳入版本控制按当前仓库约定，不能仅因文件头写着 generated 就删除或重写。

完成后运行受影响的资源生成/代码生成、静态检查或项目 Flutter 测试，并对目标 flavor 执行资源包含性构建检查。只有确认路径、动态键与输出映射一致，才报告资源清理通过；未执行目标构建时清楚标记。
<!-- native-source:flutter-artifact-cleanup:end -->


## 项目初始化与基础运行时

<!-- native-source:flutter-project-init:start -->
<a id="mode-flutter-project-init"></a>

<a id="mode-flutter-project-init--flutter-project-init"></a>
### Flutter Project Init

<a id="mode-flutter-project-init--overview"></a>
#### Overview

Initialize the smallest Flutter foundation required by the approved technical design. Dependencies are capability profiles, not a mandatory bundle.

<a id="mode-flutter-project-init--fvm-environment-rule"></a>
#### FVM Environment Rule

Use FVM as the only Flutter and Dart execution environment. Run commands through `fvm flutter` or `fvm dart`.

<a id="mode-flutter-project-init--dependency-profiles"></a>
#### Dependency Profiles

Read [references/dependency-profiles.md](../../flutter-project-init/references/dependency-profiles.md). Select only the profiles justified in `docs/architecture/technical-design.md`:

- Core: shared/async state, dependency injection, and optional hook-managed lifecycle.
- Data/API: API DTOs or persisted JSON and their generation tooling.
- Complex domain: generated immutable/union models or typed failure composition.
- UI token: optional named size-token mapping; never structural responsive layout.

Do not install Riverpod, hooks, Freezed, fpdart, JSON generators, or ScreenUtil merely because initialization runs. Record each enabled item, reason, rejected lighter option, and package risk.

<a id="mode-flutter-project-init--process"></a>
#### Process

1. Read product, UI, technical design, verification-platform scope, and existing project configuration.
2. Confirm the FVM SDK and run `fvm flutter create` only when project creation is required.
3. Preserve accepted existing structure and dependencies; do not rewrite unrelated configuration.
4. Install only dependencies from approved capability profiles and any separately approved package additions.
5. Set up the app shell, theme, routing, linting, test scaffolding, and code generation only when the selected profiles require them.
6. Generate the project-local `flutter-dev` skill with `node scripts/create_flutter_dev_skill.js`, then adapt its dependency sections to the actual selected profiles.
7. Write `docs/architecture/flutter-init.md` from [references/init-report-template.md](../../flutter-project-init/references/init-report-template.md).

<a id="mode-flutter-project-init--verification"></a>
#### Verification

Run only applicable generation plus the project-native baseline:

```bash
fvm dart run build_runner build --delete-conflicting-outputs
fvm flutter analyze
fvm flutter test
```

After shared foundations are usable, run the representative startup, routing, and enabled-plugin smoke defined in `docs/architecture/verification-platforms.md`. This is early evidence, not full platform verification, and must not automatically start physical-device acceptance.

<a id="mode-flutter-project-init--gate"></a>
#### Gate

Do not finish initialization until FVM commands work, selected dependencies match documented capability needs, the project-local skill reflects actual packages, baseline checks pass, and the representative foundation smoke is executed or explicitly blocked with evidence.
<!-- native-source:flutter-project-init:end -->


## 界面代码草图

<!-- native-source:flutter-code-sketch:start -->
<a id="mode-flutter-code-sketch"></a>

<a id="mode-flutter-code-sketch--flutter-code-sketch"></a>
### Flutter Code Sketch

在生产 Flutter 骨架中实现中性、可测试的页面结构。此 skill 只负责草图实现、结构证据和独立审阅；`adaptive-layout-implementation` 统一定义 `layout-spec.yaml`、断点和验证规则。

<a id="mode-flutter-code-sketch--前置条件"></a>
#### 前置条件

1. 先完成工程与进程 preflight，确认现有验证命令。新项目须先完成技术设计、Flutter 初始化、模块范围和任务简报；既有项目只读复用现状。
2. 要求 UX/UI Lead 提供页面语义合同、状态、交互、响应式边界，并按 [Code Sketch Level](../../flutter-code-sketch/references/code-sketch-level-standard.md) 选择 Full、Lightweight 或 Reuse。UX/UI Lead 不写页面代码。
3. 从 `adaptive-layout-implementation/assets/layout-spec-template.yaml` 创建项目唯一的页面 `layout-spec.yaml`，保持 `phase: sketch`，通过统一 validator 后再编码。

<a id="mode-flutter-code-sketch--实现-code-sketch"></a>
#### 实现 Code Sketch

1. 由 Flutter Engineer 担任 Code Sketch Agent，在生产路由、状态模型和页面骨架中实现；禁止建立一次性重复页面。
2. 使用中性色、基础排版和简单占位内容表达层级、状态、导航、交互、滚动 owner、断点与系统避让；不要提前锁定最终几何、装饰或品牌材质。
3. 为稳定语义节点添加 Flutter key，并编写 Widget/关系测试覆盖合同不变量、断点边界、文本增长、滚动和系统避让。
4. 先运行 analyze 与 Widget/关系测试。结构门禁通过后才生成确定性截图；Lightweight 仅在风险要求时截图，Reuse 只有结构事实变化才完整重审。
5. 仅当导航、键盘、SafeArea、系统栏或插件行为必须运行时验证时，复用已健康的 runtime 实例；没有可复用实例才启动服务。真机验收必须获得用户明确授权。

<a id="mode-flutter-code-sketch--组织独立审阅"></a>
#### 组织独立审阅

1. 固定当前工作树 diff、`phase: sketch` 的 layout-spec、结构测试输出和截图哈希，并计算 `snapshot-id`；由任务审阅记录 spec hash，禁止把 spec 自身 SHA 写回 spec。
2. 派发与 producer 不同的只读 Code Sketch Reviewer，按 [审阅 rubric](../../flutter-code-sketch/references/code-sketch-review-rubric.md) 检查语义、状态、导航、滚动、断点、无障碍和系统避让。
3. 低保真截图只证明功能层级和结构事实，不约束高保真几何。进入高保真阶段后，草图 Golden 必须失效或被高保真证据替换。
4. 审阅不通过时回到同一生产骨架修复并重新计算 snapshot；不得由 producer 自审放行。

<a id="mode-flutter-code-sketch--高保真交接"></a>
#### 高保真交接

1. Code Sketch Review 通过后才生成、评审并由用户冻结高保真目标图。
2. 将冻结目标与已审语义合同及 sketch layout-spec 回对。若范围、状态、导航语义、滚动 owner、断点、无障碍或 data/UI/asset ownership 改变，回到语义/草图阶段更新并重审，不得静默继续。
3. 完成资产拆解和确认后，把同一 `layout-spec.yaml` 升级为 `phase: fidelity`；在同一 Flutter 骨架上正常重构实现，禁止用 `Stack/Positioned` 覆盖旧草图凑像素。
4. 最终通过 fidelity validator、实际 Widget 关系测量、target/Flutter 同视口截图 parity 和独立 Visual QA。validator 只证明规格结构与元数据，不证明实际视觉一致。

<a id="mode-flutter-code-sketch--输出"></a>
#### 输出

- 页面语义合同与 Code Sketch Level 决策。
- `phase: sketch` 的同一个 `layout-spec.yaml` 及 validator 结果。
- 生产 Flutter 骨架、Widget/关系测试与风险选择的截图证据。
- 独立 Code Sketch Review：snapshot-id/diff、spec hash、截图 hash、结论与未决项。
<!-- native-source:flutter-code-sketch:end -->


## 视觉素材生产

<!-- native-source:flutter-asset-atlas:start -->
<a id="mode-flutter-asset-atlas"></a>

<a id="mode-flutter-asset-atlas--flutter-asset-atlas"></a>
### Flutter Asset Atlas

高保真目标冻结并通过合同回对后，依据 [bitmap decomposition standard](../../flutter-asset-atlas/references/bitmap-decomposition-standard.md) 完成 ownership、覆盖审计、编号确认和生产。`docs/design/pages/<page-name>/asset-manifest.md` 是 ownership、覆盖审计、编号映射与资产结论的唯一权威；design decision 只链接它。

<a id="mode-flutter-asset-atlas--流程"></a>
#### 流程

1. 验证冻结目标路径、candidate ID、SHA-256、用户确认、全局方向和页面决策。
2. Asset planning agent 只读执行 ownership-first decomposition、全视觉覆盖审计与现有品牌/应用/共享资产复用检查。运行时 data 只记录 renderer、placeholder、loading 和 fallback。
3. 无 bitmap/exported visual 时，在 manifest 记录 `N/A: no bitmap or exported visual assets` 并结束。
4. 为每个固定视觉记录 100% match evidence。无法证明完全匹配时必须生产专用资产，不能用近似系统图标或组件替代。
5. 填写 [asset manifest](../../flutter-asset-atlas/references/asset-manifest-template.md)，再用 `node scripts/render-bitmap-confirmation.js` 从 exact frozen target 生成编号图。Controller 只展示图片并等待用户明确确认。
6. 确认后由独立 production work node 只处理获批编号：依次选择 reuse、adapt、variant、new generation、atlas、或经明确批准的 target extraction。默认基于 `390 x 844` 逻辑参考仅提供精确 `2x` raster；全屏图才是 `780 x 1688 px`。
7. 需要透明合成时优先原生透明输出；否则记录 mask/removal 方法，清理 alpha、matte、color spill，保留 shadow/glow/translucency，并在 checkerboard、亮/暗和实际背景检查。
8. 在同一 manifest 记录 source/license、prompt hash、background、logical/output size、Flutter path、loading/error fallback 与 fidelity verdict。
9. 对照冻结目标、编号图和 manifest 做覆盖与视觉复核；任何映射或边界变化必须重新编号确认。

<a id="mode-flutter-asset-atlas--门禁"></a>
#### 门禁

用户未确认编号图前不得生成、适配、提取、导出、透明化或切片。不得从代表性 runtime data 生产像素，不得把页面截图作为默认生产资产。页面 ownership 未覆盖、资产来源或 license 不清、透明边缘损坏、尺寸不符或 fidelity 未通过时阻断高保真实现。
<!-- native-source:flutter-asset-atlas:end -->

<!-- native-source:flutter-hifi-mockup:start -->
<a id="mode-flutter-hifi-mockup"></a>

<a id="mode-flutter-hifi-mockup--flutter-high-fidelity-mockup"></a>
### Flutter High-Fidelity Mockup

仅在 Code Sketch Review 通过后生成页面目标图。高保真目标是最终视觉来源，但不能静默改变已审语义合同、状态、导航、滚动、断点、无障碍或 ownership。

<a id="mode-flutter-hifi-mockup--输入"></a>
#### 输入

- 已审页面语义合同、Code Sketch Level 与 Code Sketch Review。
- `phase: sketch` 的 `layout-spec.yaml`、外部 spec hash、关系测试和风险需要的截图证据。
- 全局视觉方向、产品/模块范围与页面真实内容要求。

<a id="mode-flutter-hifi-mockup--流程"></a>
#### 流程

1. 冻结前在对话中临时准备 brief、prompt 和候选；不要把未选方案、prompt 或评审草稿写进仓库。
2. 方向清楚时生成一个候选；只有用户要求探索或存在实质取舍时生成两到三个。每张页面图必须精确 `780 x 1688 px`。
3. 高风险/核心/探索页安排与 producer 不同的只读 Effect Image Reviewer，检查任务层级、状态、可读性、无障碍、系统区域和全局方向。
4. Controller 获得用户明确选择后，把选中图持久化到 `.codex-workflow/visuals/pages/<page-name>/`，计算 SHA-256；随后才在 page design decision 写 candidate ID、hash、确认时间、约束与允许偏差。冻结前 brief/prompt/candidates 保持 transient。
5. 将冻结目标与已审语义合同/layout-spec(sketch)逐项回对。若范围、状态、导航语义、滚动 owner、断点、无障碍或 data/UI/asset ownership 改变，返回 UX/UI 与 Code Sketch 阶段更新并独立重审。
6. 回对通过后，调用 `flutter-asset-atlas` 完成 bitmap decomposition、覆盖审计、编号图确认和资产生产；`asset-manifest.md` 是明细唯一权威，design decision 只链接。
7. 将同一 layout-spec 升级 `phase: fidelity` 后在同一生产 Flutter 骨架高保真还原，并执行 target/Flutter parity 与独立 Visual QA。

<a id="mode-flutter-hifi-mockup--禁止"></a>
#### 禁止

不得把低保真截图当最终几何蓝图；不得在 Code Sketch Review 前生成页面目标；不得在用户冻结前写候选记录；不得在合同回对失败时继续资产或高保真实现；不得把资产 ownership/编号/覆盖明细复制到 design decision。
<!-- native-source:flutter-hifi-mockup:end -->


## 开发编排与实施交接

<!-- native-source:flutter-implementation-plan:start -->
<a id="mode-flutter-implementation-plan"></a>

<a id="mode-flutter-implementation-plan--flutter-implementation-plan"></a>
### Flutter Implementation Plan

把已接受的产品、设计和技术事实压缩成可实施的模块顺序与任务。风险、拓扑和工件规则分别由[风险分级](../../flutter-subagent-delivery/references/task-risk-tiers.md)、[审核漏斗](../../flutter-quality-review/references/review-funnel.md)和[工件矩阵](../../flutter-app-orchestrator/references/artifacts.md)维护。

<a id="mode-flutter-implementation-plan--输入"></a>
#### 输入

- 已接受的产品 brief、UI spec、技术设计和模块边界。
- 页面语义合同；有自适应页面时使用 `adaptive-layout-implementation` 的 `layout-spec.yaml`。
- 现有项目结构、依赖、跨模块契约和平台验证范围。

<a id="mode-flutter-implementation-plan--规划规则"></a>
#### 规划规则

1. 以产品责任、路由/数据 ownership、业务流等级和页面交互顺序划分模块；跨模块先建立契约。
2. 一个任务只交付一个垂直切片或隔离基础；模块进入可实施状态时再细化函数、状态、验收路径和 brief。
3. 每个任务都填写[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)。普通单代理在对话中传递；只有跨角色、高风险持久上下文或用户要求才创建 Markdown brief。
4. 默认当前分支的 checkout、单写者、顺序执行。其他分支、worktree、提交、PR 或并行写入仅在用户明确授权后规划，且写范围必须互斥。
5. 只列出实际需要的实现角色和 F2 通道；不要预先组装全团队。UI 任务按需包含 layout-spec、关系测试和截图/golden 证据。
6. 任务验证区分 F0 命令、共享基础烟测、关键业务流主目标烟测和最终平台矩阵；不能把局部证据写成全平台通过。

<a id="mode-flutter-implementation-plan--输出"></a>
#### 输出

- `docs/plans/module-map.md`
- `docs/plans/modules/<module-name>-scope.md`
- `docs/plans/implementation-plan.md`
- 条件性 `docs/tasks/<task-id>/brief.md`

使用本目录的 module map、module scope、implementation plan 和 task brief 模板；不创建占位工件或运行时状态。

<a id="mode-flutter-implementation-plan--gate"></a>
#### Gate

没有明确范围、验收条件、确认事实或可执行验证命令时暂停规划并返回 `NEEDS_CONTEXT`。正式审核前必须先获得测试等级选择并完成真实 F0；物理真机、发布和外部写入不自动发生。
<!-- native-source:flutter-implementation-plan:end -->

<!-- native-source:flutter-subagent-delivery:start -->
<a id="mode-flutter-subagent-delivery"></a>

<a id="mode-flutter-subagent-delivery--flutter-subagent-delivery"></a>
### Flutter Subagent Delivery

本 skill 只处理用户明确授权的并行可写任务或 worktree。普通任务默认由当前分支 checkout 中的一个写入者顺序完成，风险等级不改变拓扑。

<a id="mode-flutter-subagent-delivery--交接"></a>
#### 交接

1. 先读[风险分级](../../flutter-subagent-delivery/references/task-risk-tiers.md)和[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)。
2. [公共委派与独立审核约定](../../app-creator-workflow/references/professional-conventions.md#delegation-and-review)
3. 只有跨角色交接或用户要求时才创建 Markdown brief；不创建 YAML/JSON 状态、租约或自动化状态机。

<a id="mode-flutter-subagent-delivery--执行与审核"></a>
#### 执行与审核

1. 每个写入者只接收一个范围，依赖、路由、主题、生成文件、共享状态、迁移和单页 spec 保持单写者串行。
2. 获得测试等级授权后先实际执行 F0，再按[审核漏斗](../../flutter-quality-review/references/review-funnel.md)进行 F1/F2/F3。
3. [公共委派与独立审核约定](../../app-creator-workflow/references/professional-conventions.md#delegation-and-review)普通审核以 snapshot 绑定，不强制提交。
4. [公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

<a id="mode-flutter-subagent-delivery--集成边界"></a>
#### 集成边界

分支、提交、PR、合并、worktree 清理、发布和任何外部写入都必须另有明确授权；Markdown 不驱动这些动作。早期烟测只能证明命名覆盖，完整平台矩阵由最终集成/发布承担，真机验收需单独授权。
<!-- native-source:flutter-subagent-delivery:end -->
