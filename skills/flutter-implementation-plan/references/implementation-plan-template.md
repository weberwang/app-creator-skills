# Implementation Plan Template

## Global Constraints

- Flutter app, mobile first.
- Follow the approved product, UI, and technical specs.
- Use the generated project-local `flutter-dev` skill for implementation tasks.
- Do not add features outside MVP scope.
- Capture screenshot or golden evidence only for actual visible changes or when the applicable native contract requires it; automatic screenshot or golden analysis requires explicit user authorization. Pure non-visual UI logic does not add a screenshot requirement.
- UI page tasks involving layout follow the applicable native contract, including a validated `docs/design/pages/<page-name>/layout-spec.yaml`, its validator command/result, relation invariants, and parameterized test matrix when required; screenshots/goldens do not replace required implementation inputs.
- UI page tasks verify real functionality and semantics in V1. Code Sketch is optional and selected by risk; when selected, record the applicable Full, Lightweight, or Reuse evidence and review. Screenshots are checked by the user unless automatic visual verification is explicitly requested.
- Module and page tasks must follow `docs/plans/module-map.md` for business-flow levels, module dependencies, cross-module contracts, and page interaction order. Finish and verify each level before starting the next. Default to the current checkout, one writer, and sequential execution; read-only work may parallelize, while branches/worktrees/commits/PRs or parallel writers require explicit user authorization.
- Treat the cross-module task list as provisional until the current module becomes eligible. Audit existing decisions, run grilling only for material unresolved choices, then refine functions, states, acceptance paths, and task briefs.
- Follow the global platform scope in `docs/architecture/verification-platforms.md`. Do not treat unlisted platforms as verified.
- Run representative startup/routing/plugin smoke after shared foundations, primary-target runtime smoke after critical business flows, and the complete platform matrix at final integration/release. Task-level evidence proves only its named coverage; never auto-start physical-device acceptance.
- Recommend an applicable T0–T3 level before verifying code changes, then perform the selected verification; T0 only inspects the changes. F1/F2 review and tool contracts retain their required real F0 evidence and snapshot identity when applicable; do not generate a snapshot or run extra commands for a pure T0 task merely to fill a field. An authorized existing commit may supply identity where the applicable contract permits it.

## Module Map

- Module map:
- Business-flow levels:
- Level advancement gates:
- Module acceptance paths:
- Cross-module contracts:
- Page interaction levels:
- Parallelization limits:
- Module refinement status:
- Confirmed module scope files:

## Milestones

### M0: Foundation

- Goal:
- Flutter init:
- Generated `flutter-dev` skill:
- Tasks:
- Verification:

### M1: Design System and Navigation

- Goal:
- Tasks:
- Verification:

### M1.5: Confirmed High-Fidelity Inputs

- Goal:
- Screens or flows:
- Mockup evidence:
- Page design decisions:
- Asset manifests:
- Verification:

### M2: Core Data and Services

- Goal:
- API contract/version and ownership:
- Auth/permissions; idempotency/retry/timeout:
- Migration/rollback and client compatibility:
- Service tests, deployment/monitoring, backup/recovery (when service implementation is in scope):
- External dependency/boundary (when service implementation is out of scope):
- Tasks:
- Verification:

### M3: Primary User Path

- Goal:
- Tasks:
- Verification:

### M4: Account, Privacy, and Settings

- Goal:
- Tasks:
- Verification:

### M5: Monetization

- Goal:
- Tasks:
- Verification:

### M6: Release Hardening

- Goal:
- Tasks:
- Verification:

### M6.5: Final Platform Runtime Validation

- Entry condition: all business-flow levels and module/page functionality are verified, and visual acceptance is complete under the selected mode; full precision parity is required only for explicitly selected `exact`.
- Platforms: `docs/architecture/verification-platforms.md`
- Runtime evidence:
- Blocking findings and fixes:
- Verification:

## Task List

For each ordinary task, use the [three minimal agreements](../../app-creator-workflow/references/output-files.md#每项任务的最小约定). The current agent is responsible by default; record a different owner for delegation, parallel work or cross-role handoff. Add risk, business-flow level, dependencies, inputs, consumers, versions or retention only when the task or applicable contract requires them; reference existing facts instead of repeating them. Formal delegation keeps the full task package, and controller, native and domain schemas retain their required fields and evidence.

| Goal / result | Write or output path, when applicable | Acceptance and verification |
|---|---|---|
