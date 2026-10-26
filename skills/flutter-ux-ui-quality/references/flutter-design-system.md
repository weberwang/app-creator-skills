# Flutter iOS Design System Baseline

Use Apple Human Interface Guidelines and iOS conventions for interaction semantics, accessibility behavior, navigation, feedback, and platform-familiar control logic. Do not treat stock Cupertino appearance as the default visual answer. Derive the visible component language from the approved product character and allow authored components, custom painting, shaders, motion, imagery, and intentional one-off brand signatures.

During global direction positioning, define the intended component, material, imagery, and motion language without generating page effect images. Do not reject a direction because it exceeds ordinary widget composition. During module effect-image interrogation, confirm whether distinctive treatments may use authored components, `CustomPainter`, shaders, animation, or bitmap assets, together with accepted cost and fallback.

## Required Tokens

- `AppColors`: semantic colors, not raw brand names.
- `AppTypography`: display, title, body, label scales.
- `AppSpacing`: 4/8 based scale.
- `AppRadius`: consistent radius levels.
- `AppElevation`: shadows or surfaces.
- `AppMotion`: durations and curves.

## Required Primitives

- Cupertino page scaffold and navigation structure.
- Primary, secondary, destructive, and disabled buttons.
- Text field with label, helper, error, disabled, loading.
- Empty state.
- Error state with recovery action.
- Loading skeleton that matches final layout.
- Inline status, banner, or iOS-style transient overlay for non-blocking feedback.
- Cupertino alert, action sheet, or sheet for blocking choices.

## Flutter Implementation Notes

- Prefer `CupertinoApp`, `CupertinoThemeData`, and iOS navigation semantics for platform defaults, then override visible styling through product-specific tokens and authored components.
- Define product semantic color roles in `AppColors`; map system-aware values through `CupertinoDynamicColor` when light, dark, contrast, or elevation variants are required.
- Avoid hardcoded sizes inside screens when a token exists.
- Avoid one-off buttons or fields that bypass shared primitives.
- Shared text and control primitives must expose the roles required by the authoritative [Adaptive Layout Implementation](../../app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation) line-break contract. Dynamic text containers cannot impose fixed heights or hide failures with `FittedBox`, font shrinking, or display-string line breaks.
- Add Chinese comments only for non-obvious logic in source code, not for simple widget declarations.

## Accessibility

- Check contrast for text and CTAs.
- Support text scaling unless the screen is a fixed-format canvas.
- Keep touch targets at least 44x44 logical pixels.
- Provide semantic labels for icon-only actions.
