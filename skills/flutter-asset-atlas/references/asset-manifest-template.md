# Asset Manifest

Maintain one `docs/design/pages/<page-name>/asset-manifest.md` for each page with fixed visual assets. This is an internal production and audit artifact. Never present its table, mapping, notes, dimensions, or source decisions to the user during bitmap confirmation; the user sees only the numbered overlay image.

This manifest is the sole authority for ownership, coverage audit, number mapping, production decisions, and asset fidelity. The page design decision links this file and must not duplicate these details. If no bitmap or exported visual asset exists, record `N/A: no bitmap or exported visual assets` here.

## Ownership And Coverage Audit

| Region/layer | Visible element | Owner | Runtime variability | Classification | Asset identity | Evidence/verdict |
|---|---|---|---|---|---|---|
| | | data / UI / fixed visual | | data / UI / bitmap | ID or N/A | |

## Confirmation Evidence

- Page:
- Frozen page image path:
- Frozen page image SHA-256:
- Numbered overlay path: `.codex-workflow/visuals/pages/<page-name>/bitmap-confirmation-v<version>.png`
- Overlay version:
- Overlay SHA-256:
- Confirmed numbers:
- User decision:
- Confirmation time:
- Overall fidelity verdict:

## Internal Number Mapping

| No. | Visual role | Placements/states | Box bounds | 100% match evidence | Decision/source/license | Crop/background/effects | Logical/output size | Flutter path | Status/fidelity |
|---|---|---|---|---|---|---|---|---|---|
| | | | x/y/w/h on frozen image | | reuse / adapt / generate / export / extract | transparent / retained / mask; shadow/glow handling | logical; exact 2x pixels | | planned / confirmed / produced / pass / blocked |

Rules:

- Use the same number for repeated placements of one shared asset; list every placement and state.
- Use different numbers for distinct states or visually different outputs.
- Keep production details internal even when the user excludes or revises a number.
- Record only the selected source, required prompt hash, failure reason, license, output, fallback, and fidelity result.
- 按受影响资产在现有映射或说明中补齐源帧、有效内容边界、透明留白、资源 scale、切片及目标逻辑显示尺寸；区分确认目标、测量、估计与适配规则，不新建重复素材清单。这些是交接要求，编号图脚本不验证真实 Flutter 导入或运行显示。
- A material change to membership, numbered bounds, placement/state coverage, crop, source, background handling, size, or production verdict invalidates the affected number and requires a new overlay version.
- Keep unselected candidates, repeated prompts, and intermediate exports transient.
