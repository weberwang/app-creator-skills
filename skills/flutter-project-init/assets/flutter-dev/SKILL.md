---
name: flutter-dev
description: Use for implementation, refactoring, or debugging Flutter code after the project-local architecture and task contract are accepted.
---

# Flutter Dev

## Overview

Use this project-local skill for Flutter implementation. Prefer SDK features, existing dependencies and project primitives, and the smallest state surface that satisfies the task.

## FVM Environment Rule

Use `fvm flutter` and `fvm dart` for every Flutter or Dart command. Do not run bare `flutter` or `dart` commands.

## Active Dependency Profiles

Replace this section during project initialization with only the profiles and packages approved in `docs/architecture/technical-design.md`:

- Core profile: optional shared state, dependency injection, hooks, and matching lint packages.
- Data/API profile: optional JSON annotations and generation for API DTOs or persisted data.
- Complex-domain profile: optional immutable/union generation and typed failure composition.
- UI-token profile: optional named size-token mapping, never structural responsive layout.

Unlisted packages and profiles are not implementation requirements.

## Dependency Approval Rule

Do not add a new dependency until the task records:

1. Which existing package or project primitive was checked first.
2. Why the SDK, existing dependencies, and active profiles cannot solve the requirement.
3. The approved artifact path in `docs/architecture/technical-design.md` or the task brief.
4. The package's runtime, size, maintenance, and platform risk.

## Implementation Rules

- When the core profile is active, follow its selected state/lifecycle package conventions; otherwise use the simplest SDK or existing-project state boundary.
- When the data/API profile is active, generate serialization for the DTOs and persisted formats explicitly covered by the design.
- When the complex-domain profile is active, use its selected immutable/union or typed-failure tools only at justified boundaries.
- When the UI-token profile is active, use its selected package only through app initialization and shared sizing tokens.
- Widgets must not call network or storage APIs directly; preserve documented API contracts, auth/permission boundaries, idempotency/retry behavior, and client-version compatibility.

## Conditional Annotation Generation

When an approved profile uses generated Dart code, use its annotations and `build_runner` consistently.

- Freezed annotations are required only for artifacts assigned to Freezed by the technical design.
- JSON annotations are required only for DTOs or persisted models assigned to generated serialization.
- `part` files must be declared correctly.
- Run `fvm dart run build_runner build --delete-conflicting-outputs` after changing annotated files.
- Do not handwrite `copyWith`, equality, sealed union plumbing, `fromJson`, or `toJson` when Freezed or json_serializable can generate it.

## Minimum State Change Rule

Before creating or changing state, answer:

1. Is this local visual state? Use hooks.
2. Is this shared app or async state? Use the active core-profile state solution, if any.
3. Is this derived from existing state? Use selectors, computed providers, or local variables.
4. Can this rebuild less? Use `select`, smaller providers, or smaller widgets.

Do not create a provider for a constant, one-off callback, static config, or purely local controller. Do not introduce state just to pass data down one or two widget levels.

## Riverpod Rules (When Adopted)

- Keep providers small and named by responsibility.
- Prefer `AsyncValue` for loading, data, and error UI.
- Keep repository providers separate from UI state providers.
- Do not mutate collections in place inside provider state.
- Do not call network or storage APIs directly from widgets.

## Freezed and JSON Rules (When Adopted)

- Add `part` files and run build generation after model changes.
- Keep DTOs separate from domain models when API shape leaks transport concerns.
- Hand-written `fromJson`, `toJson`, equality, `copyWith`, and union plumbing are forbidden unless generator support is impossible and the task brief records the exception.

## fpdart Rules (When Adopted)

- Use `Either<Failure, T>` or `TaskEither<Failure, T>` at repository and use-case boundaries when failure is expected.
- Convert failures to `AsyncValue` or UI state at the presentation boundary.
- Do not throw for ordinary recoverable domain failures.

## ScreenUtil Rules (When Adopted)

- Initialize once near the app root.
- Prefer design tokens over scattered `.w`, `.h`, `.sp` calls.
- `ScreenUtil` only supplies root initialization and named shared size tokens; it is not the responsive layout engine. Do not use it to decide columns, navigation, scroll ownership, breakpoint structure, or global proportional scaling.

## Layout Implementation Handoff

- Before implementing or refactoring a page, load `.agents/skills/app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation` and `.agents/skills/adaptive-layout-implementation/references/flutter-adapter.md`.
- Require a validated `docs/design/pages/<page-name>/layout-spec.yaml` as the page implementation input; use its shared resolver, root layout, scroll owner, system-boundary and text-growth decisions.
- Record any implementation signals named by the specification in the page task and relation tests. This project-local skill supplies dependency and generator boundaries; the generic layout workflow owns layout rules.

## Verification

Run the generation command only when an adopted profile has generated inputs; always run applicable project-native checks:

```bash
fvm dart run build_runner build --delete-conflicting-outputs # adopted generators only
fvm flutter analyze
fvm flutter test
```

For UI work, also capture screenshot or golden evidence required by the task.
