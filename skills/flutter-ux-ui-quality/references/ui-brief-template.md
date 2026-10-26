# UI Spec Template

## Navigation and Screen Inventory

| Screen / route | User outcome | State coverage | Design level |
|---|---|---|---|
| | | | |

## Cross-page Quality Gates

- Accessibility, responsive, and localization constraints:
- Shared interaction and state rules:

## Global Responsive Strategy

> Fill this table before page high-fidelity handoff. Values are a product baseline, not a device checklist; every structural switch needs a reason and evidence viewport. See [responsive-layout-strategy.md](./responsive-layout-strategy.md).

| Layout class / width range (logical px) | Structural trigger and rationale | Navigation pattern | Content max width / edge inset | Columns / min column width / gutter | Evidence viewports |
|---|---|---|---|---|---|
| Compact: | | | | | |
| Medium: | | | | | |
| Expanded: | | | | | |
| Product-specific landscape / fold / split: | | | | | |

- Shared overflow/localization policy:
- Shared SafeArea, system-bar, gesture-inset, and keyboard policy:
- Shared scroll ownership and nested-scroll policy:
- ScreenUtil boundary when the UI-token profile adopts it (root initialization and shared tokens only):

## Screen

- Name:
- Route:
- User goal:
- Business goal:
- Entry context and prior step:
- First-value contribution:
- Trust or risk concern:
- Primary action:
- Secondary actions:

## Information Hierarchy

1.
2.
3.

## First-Time Experience

- Value the user should understand in the first 3 seconds:
- Result the user should receive before leaving this flow:
- Friction to remove (registration, input, payment, permission, or uncertainty):
- Safe-to-try evidence or recovery path:

## Required States

| State | Required behavior | Evidence |
|---|---|---|
| Loading | | |
| Empty | | |
| Error | | |
| Success | | |
| Disabled | | |
| Permission denied | | |

## Layout Requirements

- Target viewport range(s) and orientation:
- Layout class / breakpoint trigger(s) used by this page:
- Content max width / edge insets / columns / minimum column width / gutter:
- Relative anchors and constraints (what is aligned to what, gap token, wrap/collapse rule):
- Small phone structure and fallback:
- Standard phone structure and fallback:
- Tablet / Expanded structure and fallback:
- Navigation structure at each applicable class:
- Flow elements (participate in document scroll):
- Docked elements (fixed / pinned / floating; anchor, occlusion padding, hide/show rule):
- Scroll owner per axis and any intentional nested scroll:
- SafeArea, system bar, gesture inset, fold/split avoidance:
- Keyboard behavior (resize, scroll-to-focus, docked CTA transformation):
- Large text / long content / localization / RTL behavior:
- Overflow policy (wrap, truncate with accessible alternative, collapse, or explicit scroll):
- Required evidence viewports, text scale, states, and interaction traces:

## Visual Direction

- Visual context confirmation:
- Image-generation directions:
- Selected visual direction:
- Product character (three qualities):
- Visual expression preset ID and axes:
- Page-type budget dial:
- Avoided impressions:
- Decoration purpose and limits:
- Design system:
- High-fidelity confirmation required: Yes / No
- Frozen page high-fidelity mockup path when required: `.codex-workflow/visuals/pages/<page-name>/frozen-<slug>.png`
- Mockup candidate ID / SHA-256 / confirmation time:
- High-fidelity approval notes:
- Mockup required: Yes / No
- Mockup reason:
- Page design decision path:
- Code Sketch Level: Full / Lightweight / Reuse
- Independent Code Sketch Review verdict and semantic contract: page design decision
- Asset manifest required: Yes / No
- Asset manifest path:
- Production Flutter sketch, relationship tests and screenshot hashes: page design decision
- Color tokens:
- Typography:
- Spacing:
- Radius:
- Motion:

## Acceptance Criteria

- 
- The primary user understands the screen value and next action without relying on decorative treatment.
- Applicable trust, permission, payment, privacy, loading, error, and recovery information is clear before it can block the user's first-value moment.

## Rejection Criteria

- 
