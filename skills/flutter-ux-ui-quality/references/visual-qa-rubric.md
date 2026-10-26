> 截图视觉验收：代理默认只核验机器可读的布局与证据；截图由用户人工检查。只有用户明确要求自动视觉验证时才自动分析截图。

# Visual QA Rubric

Review screenshots or golden evidence, not intent.

## Required Viewports

- Small phone: 360x640 or close equivalent.
- Standard phone: 390x844 or close equivalent.
- Tablet / Expanded: 768x1024 or close equivalent when in scope.
- Both sides of every structural breakpoint (not merely a scaled screenshot) when the page changes columns, navigation, or component structure.
- Any app-specific landscape, foldable, split-screen, or desktop window layout when the contract includes it.

## Responsive Evidence Matrix

按 [responsive-layout-strategy.md](./responsive-layout-strategy.md) 的风险选择证据；普通复用页不需要制作所有设备的高保真图。每条证据标注逻辑尺寸、方向、文字比例、状态、平台以及键盘/系统 inset 是否生效。

| 风险与布局特征 | 最小证据视口 | 必须验证的结构或行为 |
|---|---|---|
| 普通单列复用页 | 1 个 Compact + 1 个目标平台基准 | 长内容、状态、SafeArea、无溢出 |
| 列数/导航/组件在断点切换 | 断点两侧各 1 个（至少 Compact/Medium/Expanded 中适用者） | 结构变化、最大宽度、列/gutter、路由和选中状态 |
| 固定/吸顶/悬浮或复杂滚动 | 目标 Compact + 1 个 Expanded | 滚动所有权、显隐、内容底部避让、命中区、回滚行为 |
| 表单、支付、权限、长文或高风险操作 | Compact + 目标平台宽度 | 大字体、长本地化、错误恢复、键盘聚焦、系统栏/手势区 |
| 横屏、平板、折叠或分屏 | 每个目标方向/窗口范围至少 1 个 | 重新约束、铰链/遮挡区、左右手势区、独立滚动和导航 |

若产品契约未声明某类视口，记录为“不在范围”，不要用未采集的截图推断支持。

## Findings

Report by severity:

- Critical: core action unusable, unreadable content, broken navigation, severe overflow, privacy/payment risk.
- Important: unclear hierarchy, missing required state, weak recovery, contrast failure, inconsistent component style, missing restatable signature on full-budget or wow-required pages.
- Minor: polish issue that does not block task acceptance.

## Checklist

- Main user goal is obvious in 3 seconds.
- The screen communicates its immediate value and the user's next step without relying on a tutorial or decorative cue.
- Primary CTA is visually dominant and reachable.
- Text does not clip or overflow.
- Loading, empty, error, disabled, and success states match the UI brief.
- Spacing and typography use the chosen design system.
- Screen remains usable with long content.
- Mobile layout is not a compressed desktop layout; breakpoint evidence proves the contracted structural change.
- Relative anchors, max width, columns, and gutters remain coherent across the selected viewports.
- Fixed, pinned, and floating elements have explicit scroll behavior, hit targets, SafeArea/gesture insets, keyboard behavior, and content-occlusion padding.
- Each scroll axis has an understandable owner; intentional nested scrolling does not trap gestures or focus.
- Large text, long localized strings, RTL where applicable, landscape, and split/fold layouts do not clip or hide the primary action.
- System bars, keyboard insets, hinge/display-feature bounds, and bottom gesture regions do not cover content.
- When adopted, ScreenUtil sizing tokens do not substitute for constraint-driven structure.
- No generic AI UI tells: random gradients, fake metrics, filler avatars, inconsistent card shapes.
- Decorations, gradients, shadows, textures, and motion have a stated hierarchy, feedback, or brand purpose; they do not compete with content or primary actions.
- The screen meets the active visual expression preset and page-type budget: full-budget or wow-required pages show a restatable signature; dial-down pages stay clearer without abandoning system consistency.
- The first-value path exposes relevant privacy, payment, permission, and recovery conditions before the user takes an irreversible or high-friction action.
- Motion supports state or hierarchy and respects reduced motion.
- Independent visual-QA findings for the user-facing flow are resolved or explicitly accepted.

## Output Shape

1. Verdict: Pass / Fail.
2. Findings.
3. Missing evidence.
4. Required fixes.
5. Optional polish.
