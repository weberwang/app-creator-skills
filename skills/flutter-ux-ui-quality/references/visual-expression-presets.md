# Visual Expression Presets

Derive a visual expression budget from product category and audience. Use it to raise or lower exploration bias and signature strength. Never lower the task-clarity, hierarchy, accessibility, or trust-evidence gates.

## Derivation

1. Map the product to one preset below using category first, then audience modifiers.
2. Apply audience modifiers only when they change an axis by one step.
3. Record the result in `docs/product/product-brief.md`.
4. Before global visual direction positioning, run the light visual interrogation once. Record answers in `docs/product/grilling-log.md` and mirror the resulting signature and implementation-cost commitments in `docs/product/product-brief.md`. Both records are required; do not choose only one.
5. Define one global visual-system direction when the target is clear, or compare two to three when exploration or a material tradeoff remains, without generating page effect images. After the user selects one when needed, require an explicit restatable-signature confirmation when Global Freeze Signature Rule says so, then allow `pin`, `raise`, or `loosen`. Record the direction definition, confirmation, override, and accepted implementation cost in `docs/design/global-design-freeze.md`.

Task clarity is a hard floor for every preset. Presets change expression ceiling, three-direction distribution, review thresholds, and scoring weights only.

## Preset Catalog

| Preset ID | Typical categories | signature_strength | decoration_budget | trust_priority | information_density | wow_requirement |
|---|---|---|---|---|---|---|
| `trust-critical` | 医疗、金融、政务、保险、合规工具 | low–medium | low | high | medium–high | none |
| `utility` | 效率工具、B2B、生产力、后台协作 | medium | low–medium | medium–high | medium–high | hero-pages |
| `consumer-brand` | 电商、消费品牌、会员增长 | medium–high | medium | medium | medium | hero-pages |
| `lifestyle` | 生活方式、内容、社区、本地生活 | medium–high | medium–high | medium | medium | hero-pages |
| `entertainment` | 娱乐、游戏化、年轻消费、社交玩法 | high | high | low–medium | low–medium | required |
| `visual-led` | 妆容、穿搭、空间、摄影、设计灵感 | high | high | medium | medium | required |
| `balanced-default` | 无法稳定归类时使用 | medium | medium | medium | medium | hero-pages |

### Audience modifiers

Apply at most two modifiers:

| Audience signal | Axis change |
|---|---|
| 年龄偏大或低数字熟练度 | `information_density` +1 toward clarity; `decoration_budget` −1; `wow_requirement` may drop from `required` to `hero-pages` |
| 年轻或审美敏感 | `signature_strength` +1; `decoration_budget` +1 when trust_priority is not `high` |
| 高风险决策（资金、健康、法律） | `trust_priority` → `high`; do not raise `wow_requirement` above `hero-pages` |
| 首次转化强依赖情绪或品味证明 | `wow_requirement` → at least `hero-pages`; for visual-led/entertainment keep `required` |

Clamp every axis to the nearest allowed value. If modifiers conflict with `trust-critical`, keep trust and signature ceilings of that preset.

## Global Freeze Signature Rule

A restatable visual signature is required before freezing the selected global direction when any of the following is true after modifiers:

- `wow_requirement` is `required`
- `wow_requirement` is `hero-pages`
- `signature_strength` is `medium–high` or `high`

Only `trust-critical` with `wow_requirement: none` and `signature_strength` at most `low–medium` may freeze without a hero-level signature, but the selected direction must still include the distinctive-but-trustworthy trait required by its three-direction mix. If the user answers “no” to the restatable-signature confirmation when this rule applies, do not freeze; iterate directions.

## Three-Direction Distribution

When defining multiple global directions, enforce a meaningful distribution for the active preset. Do not generate page or representative-page effect images, and do not let the alternatives converge on the same restrained professional neutrality.

| Preset | Required direction mix |
|---|---|
| `trust-critical` | 2 credible/calm directions + 1 distinctive-but-trustworthy signature direction |
| `utility` | 1 clarity-first + 1 distinctive professional signature + 1 warmer or more modern alternative |
| `consumer-brand` | 1 trustworthy commerce + 1 brand-forward signature + 1 higher-energy conversion direction |
| `lifestyle` | 1 high-memory signature + 1 high-emotion/lifestyle + 1 calmer credible alternative |
| `entertainment` | at least 2 high-memory or high-energy directions; forbid three muted utility looks |
| `visual-led` | at least 2 imagery-led or composition-led directions with unmistakable signatures |
| `balanced-default` | 1 signature-forward + 1 emotion-forward + 1 credible baseline |

## Scoring Weights

Keep the existing score dimensions. Re-weight emphasis when comparing directions:

| Preset | Raise weight | Do not sacrifice |
|---|---|---|
| `trust-critical` | 产品可信度、品类用户预期、首次尝试与信任 | 信息可读性 |
| `utility` | 信息可读性、功能扩展、设计系统可维护性 | 品牌辨识度至少达到可复述签名 |
| `consumer-brand` | 品牌辨识度、商业化适配、情绪吸引力 | 产品可信度 |
| `lifestyle` | 情绪吸引力、品牌辨识度、市场差异化 | 信息可读性 |
| `entertainment` | 情绪吸引力、品牌辨识度、市场差异化 | 任务清晰（仍为门槛） |
| `visual-led` | 品牌辨识度、情绪吸引力、品类预期匹配 | 任务清晰与内容真实性 |
| `balanced-default` | equal weights, but reject a set with no distinctive signature | 任务清晰 |

## Page-Type Budget Dial

Start from the product preset, then dial per page type:

| Page type | Budget dial |
|---|---|
| 首页、首次价值页、付费墙、品牌落地、高价值内容详情 | use full preset budget; `wow_requirement` pages must show a restatable signature moment |
| 浏览型内容流、数据总览、对话主界面 | keep signature, moderate decoration |
| 设置、表单、权限、账户、错误恢复、法律协议 | dial down decoration and wow; keep system consistency and task clarity |

The reviewed semantic contract and Code Sketch lock scope, structure, states, and interactions without locking final geometry. On full-budget pages, composition, hero treatment, material, and imagery may express the preset signature without changing product meaning.

## Light Visual Interrogation

Run once after the product brief has a derived preset and before global visual direction positioning. Ask at most three questions, one at a time. Record answers in `docs/product/grilling-log.md` and mirror the resulting commitments in the product brief. Both are mandatory.

Required questions:

1. 用户凭什么在约 3 秒内认出这是我们的产品，而不是品类里的通用 App？
2. 若更具辨识度的视觉需要自定义组件、插画、动效或位图资产，是否接受为此付实现与维护成本？
3. 仅当预设为 `entertainment`、`visual-led`、`lifestyle`，或用户主动要求更强表达时再问：当前预设是否需要上调或下调表达预算？

Do not run this interrogation on every page. After the requested global direction definitions are shown and before freeze, ask exactly one confirmation when Global Freeze Signature Rule applies: “选中的方向是否有一个可复述的视觉签名？” If the answer is no, do not freeze; iterate the direction. When the rule does not apply, do not create an extra confirmation record.

## Global Direction Freeze Gate

Run this gate after direction selection and before any global freeze write. This gate freezes a visual-system direction definition, not an effect image. Do not treat it as a second copy of the light visual interrogation.

Confirm one decision at a time:

1. Selected global direction.
2. Accept or reject the direction's visual signature and implementation-cost commitment.
3. Restatable signature when the Global Freeze Signature Rule applies.
4. `pin`, `raise`, `loosen`, or no expression-budget override.
5. Explicit intent to freeze the current direction definition.

Audit the answers against the product brief, grilling log, product brief market evidence, and active preset. If scope, priority, tradeoffs, risks, acceptance criteria, or dependencies are new, conflicting, or unresolved, re-enter `grilling`, record the resulting user decision, then resume this gate. If none remain, continue without an extra record. Persist only the selected direction and actual freeze decision in `docs/design/global-design-freeze.md`; do not create a global frozen image.

## Conditional Module Visual Decision

Run only when function/page refinement exposes a new visual outcome, page/state selection, expression budget, signature, implementation, asset, or maintenance-cost decision. Ask one question at a time and confirm:

1. The module's visual outcome and the user perception it must create.
2. Which pages and states require effect images in this module.
3. The page-type budget and signature expectation for those pages.
4. Accepted custom-component, motion, bitmap-asset, implementation, and maintenance cost.
5. Explicit shared understanding that the effect images will follow the frozen global direction without changing module scope.

Record actual answers and confirmation in `docs/product/grilling-log.md` and the module scope file. When existing global and page constraints already settle these points, continue without a gate record.

## Review Threshold

Replace “is decoration restrained enough?” with:

- Does the screen meet the preset’s `signature_strength` and `wow_requirement` for this page type?
- Does any expressive treatment harm task clarity, hierarchy, trust evidence, or accessibility?
- For full-budget pages, flag missing signature, overly safe stock-component composition, or flattened product character as Important when the preset requires wow or high signature.

Penalize purposeless noise and generic AI decoration. Do not penalize purposeful signature strength required by the preset.
