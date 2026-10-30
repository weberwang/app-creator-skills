> 截图视觉验收：代理默认只核验机器可读的布局与证据；截图由用户人工检查。只有用户明确要求自动视觉验证时才自动分析截图。

# Flutter Commercial Review Rubric

## Spec Compliance

- MVP scope implemented and no extra scope added.
- Acceptance criteria are met.
- Required states and flows exist.
- Product assumptions are not silently changed.
- Task follows `docs/plans/module-map.md` for business-flow level, module dependency order, cross-module contracts, and page interaction order.
- No task started before all required tasks, acceptance paths, and cross-module contracts of its preceding business-flow level passed or were explicitly accepted.
- Cross-module contracts are implemented before dependent UI or service work consumes them.
- Module acceptance path and integration smoke path are preserved or updated when module behavior changes.
- Module acceptance result and integration smoke result are reported when module boundaries, routes, cross-module contracts, or user flows change.
- `docs/architecture/verification-platforms.md` records representative foundation smoke, primary-target critical-flow smoke, and the final matrix. Early evidence proves only its named scope; unlisted or unrun platforms are not claimed as verified.

## Flutter Code Quality

- Project-local `flutter-dev` rules are present, read, and followed.
- State ownership is clear.
- Widgets are focused and not oversized.
- Shared UI primitives are reused.
- Existing plugins and primitives are preferred before new dependencies.
- 代码实现命中插件触发边界时，检查是否实际采用插件 API/生成机制；若自研，须有候选不可用的具体证据、最小范围与验证记录，不接受仅以“SDK 也能写”为理由重复建设通用能力。
- Only dependency profiles actually enabled by the technical design are required, and each adopted package has an explicit capability reason.
- 依赖或插件变更时按[选型规范](../../app-stack-flutter/references/plugin-selection.md)检查替代方案、来源日期、锁定版本、平台配置、SDK owner、安全与费用边界；mock、构建与实际平台运行证据分别标注，不用单平台或 `pub get` 推断全部可用。
- Annotation-based generation and `build_runner` are checked only when the adopted data/API or complex-domain profile uses them.
- State changes are minimal and rebuild scope is controlled.
- Async work handles loading, error, retry, and cancellation where relevant.
- Platform permissions are requested with clear user value.
- No hardcoded secrets or production keys.

## UX/UI

- UI evidence exists for screen changes.
- Independent visual-QA findings for user-facing flows are resolved or explicitly accepted.
- Page implementation order does not skip required prior interactions, states, or transitions from the module map.
- After V1 verifies real functionality and page semantics, the page target may be generated and confirmed by the user. Code Sketch and its independent review are required only when the sketch route is selected.
- The user-frozen target was checked against verified functionality and semantic contracts; scope, states, navigation, scrolling, breakpoints, accessibility or ownership changes require the affected functionality to be updated and revalidated. Sketch review is repeated only when that route is selected.
- Implementation uses the production structure and does not overlay an optional sketch with absolute positioning to fake pixels.
- Implemented UI respects the selected mockup and page decision constraints when present.
- A page asset manifest exists when approved mockups include required visual assets.
- Asset source, reuse decision, generation prompt constraints, background handling, license status, output/Flutter path, loading fallback and error fallback are recorded in the manifest.
- New bitmap assets use approved generation/reuse evidence and never derive from representative runtime data.
- Review required assets against the approved target and record their source and reuse decisions; complete asset-specific review where needed. A 100% match is required only for an explicitly selected `exact` acceptance mode.
- Transparent or composited assets have clean alpha edges, preserved shadows/glows, and no unintended background halos.
- Transparent-background post-processing records matte removal, alpha cleanup, edge decontamination, padding, and target-background QA when applicable.
- New generated assets reference global visual-direction and page-design-decision constraints and explain why existing assets were not reused.
- In `exact` mode, asset fidelity matches the approved target subject to documented rasterization or scaling tolerance; default `usability` checks suitability and legibility without requiring a 100% match.
- Implemented UI respects verified functional and semantic contracts for scope, structure, states, interactions, scrolling, breakpoints and ownership; honor Code Sketch only when selected and reviewed.
- Only explicitly selected `exact` mode requires a complete target↔Flutter parity contract for critical elements, actual Widget measurement and same-viewport screenshot evidence. Validators alone cannot establish actual parity; screenshots are checked by the user unless automatic visual verification is explicitly requested.
- Only `exact` mode requires critical axes within 1 logical px and documented optical-center evidence. In `usability` mode assess functional layout, readability and accessibility without this pixel threshold.
- Flutter handoff preserves semantic references and dual-axis relations. Frozen-view `x/y` is auxiliary; a `Positioned` exception names its semantic boundary, viewport scope, and responsive fallback.
- Low-fidelity screenshots constrain function and hierarchy only; their Goldens expire or are replaced after fidelity work starts.
- A page-level layout/adaptation contract records target ranges, structural breakpoint triggers, max width, columns/gutters, relative anchors, overflow/localization behavior, scroll ownership, docking, and system/keyboard avoidance; low fidelity and a frozen screenshot do not substitute for it.
- Text line breaking satisfies the authoritative [Adaptive Layout Implementation](../../app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation) contract: body, heading/critical copy, control labels, atomic text, dynamic containers, fallback order, and longest-copy plus large-text evidence are all present; fixed-height clipping, display-string line-break hacks, `FittedBox`, and font shrinking block approval.
- Layout works on the contract's target viewports and both sides of each applicable structural breakpoint; evidence verifies structural change rather than proportional scaling.
- Fixed, pinned, and floating elements document scroll direction, occlusion padding, hit target, SafeArea/gesture inset, keyboard behavior, and narrow-height fallback; no content or focused field is covered.
- SafeArea, system bars, keyboard `viewInsets`, fold/hinge display features, and split-screen constraints are handled at the right boundary and are represented in evidence when in scope.
- Each scroll axis has a clear owner; nested scrolling is intentional, documented, and does not trap gestures or accessibility focus.
- When the UI-token profile adopts ScreenUtil, it is limited to root initialization and shared sizing tokens. Columns, navigation, max width, scrolling, and structural decisions still come from constraints/`LayoutBuilder`/`MediaQuery`.
- Empty, loading, error, success, disabled, and permission-denied states are covered where relevant.
- CTA hierarchy is clear.
- The first-value path is understandable, and the user sees applicable privacy, payment, permission, or recovery conditions before a high-friction or irreversible step.
- Text is readable, semantically wrapped, and not clipped.
- Accessibility basics are respected.

## Visual Aesthetics And Premium Feel

- Provide the implementation screenshot and approved target for user review of aesthetics; do not automatically analyze images unless the user explicitly requests it.
- Verify hierarchy, alignment, spacing rhythm, typography, color and contrast, component consistency, and asset quality as one visual system.
- Verify that decoration, borders, shadows, corner radii, and accent colors are purposeful and match the active expression preset and page-type budget; flag visual noise, generic treatment, competing focal points, and missing signature on full-budget or wow-required pages. Do not require austerity when the preset calls for higher signature strength.
- Verify that the screen gives visual priority to the primary user task and uses content imagery or assets that fit the product and target audience.
- Verify that the visual system supports the documented product character and that polish does not conceal unclear value, unnecessary friction, or unresolved trust concerns.
- Record an explicit verdict: `approved`, `approved with Minor findings`, or `not approved`. A Critical or Important aesthetic finding results in `not approved` until resolved or explicitly accepted.

## Commercial Readiness

- Account lifecycle is handled when accounts exist.
- Privacy and data deletion paths are not broken.
- Payments handle failure and restoration when monetized.
- Analytics and crash reporting are present or explicitly out of scope.

## API And Service (Conditional)

- Contract source, version policy, request/response/error schema, and client compatibility are explicit.
- Authentication, authorization, permissions and sensitive-data boundaries are tested.
- Retry, timeout, rate-limit and idempotency behavior prevents unsafe duplicate operations.
- Schema/data migration has a rehearsed rollback; destructive changes have backup and recovery evidence.
- In-scope server implementation has unit/integration/contract tests plus deployment, monitoring, alert and restore evidence.
- When server implementation is out of scope, the review is limited to documented external owner, dependency assumptions, client boundary and escalation path.

## Testing

- `fvm flutter analyze` output is reported.
- Relevant unit/widget tests are reported.
- Golden or screenshot evidence exists for UI work.
- Integration tests are run when a user path is changed and tests exist.
- Shared-foundation review includes representative startup/routing/plugin smoke; critical-flow review includes primary-target runtime smoke. Neither may claim full platform verification. Final-integration/release review requires every in-scope platform's matching command and runtime evidence. Physical-device acceptance requires explicit user authorization.

## F2 通道输出

本细则只用于 F1 已触发的 F2 通道。不要在此重复 F1 分诊或 F3 收敛。发现优先，使用以下结构：

```text
Findings
- [Critical] ...
- [Important] ...
- [Minor] ...

Lane and coverage
- Product / QA / technical / visual / Release
- Candidate SHA, covered facts and evidence: ...

Aesthetic verdict (visual lane only)
- approved / approved with Minor findings / not approved
- Evidence and remaining actions: ...

Critical-alignment verdict (visual lane only)
- approved / changes_requested / blocked
- Mode (`usability` / `exact`), applicable measurements, user screenshot review, and exact-mode parity gaps: ...

Missing evidence
-

Open questions
-

Lane verdict
- approved / changes_requested / blocked
```

F2 reviewers return this structure to the Controller and never edit shared `docs/tasks/<task-id>/review.md`.
