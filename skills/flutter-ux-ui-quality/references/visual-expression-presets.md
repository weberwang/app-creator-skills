# Visual Expression Presets

Use these presets only as optional inspiration for the product and audience. They do not lock layout, information architecture, fonts, colors, whitespace, or component shape unless the user has explicitly locked them. Keep business facts, task clarity, accessibility, actual platform capability, and confirmed brand constraints.

## Derivation

1. When useful, compare product and audience with the examples below; a preset is not mandatory.
2. Apply audience considerations only when supported by actual requirements.
3. Record meaningful constraints in the existing product brief without creating a separate approval.
4. 仅视觉签名、表达预算或实现成本存在实质未决取舍时开展轻量讨论，将实际决定写入 `docs/product/grilling-log.md` 并在产品简报同步结论。需求已明确时直接继续，不创建额外确认门。
5. 文字方向仅按需作为设计输入，不形成独立冻结或预先批准。首次定调／实质改版按 [Figma App 设计流程](../../app-ui-layout/references/figma-app-design.md)默认精修一份可编辑方案；只有用户明确要求比较时才按指定数量制作多方向，保持相同任务、内容及比较条件并体现实质差异。已有有效方向的局部增量可复用。用户观看节点链接和预览后确认或明确选择／组合，控制器记录实际决定。

Task clarity and accessibility remain requirements. Presets do not define an expression ceiling, required direction count, review threshold, or mandatory score.

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

Treat every axis and audience modifier as an optional hypothesis; actual constraints come from confirmed product facts and the user's explicit decisions.

## Global Freeze Signature Rule

A restatable visual signature can help explain a candidate when it is relevant to the product:

- `wow_requirement` is `required`
- `wow_requirement` is `hero-pages`
- `signature_strength` is `medium–high` or `high`

This is not a separate freeze gate or a mandatory preapproval. Users select or explicitly combine the actual Figma directions; only unresolved material tradeoffs need discussion.

## Direction Exploration

非游戏 App 首次定调或实质改版默认精修一份可编辑 Figma 方案；只有用户明确要求比较时才按指定数量制作多方向。多个方向保持相同核心任务、主要内容和视口等比较条件，在布局、层级、排版、形态或交互呈现上有实质区别，不只换颜色；可以参考类别差异而不套用固定风格。用户确认后再扩展其他页面和关键状态。

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
| 首页、首次价值页、付费墙、品牌落地、高价值内容详情 | 根据真实任务和用户需要考虑更强的视觉表达，不把预设变为强制门槛 |
| 浏览型内容流、数据总览、对话主界面 | keep signature, moderate decoration |
| 设置、表单、权限、账户、错误恢复、法律协议 | dial down decoration and wow; keep system consistency and task clarity |

Confirmed business scope, necessary functions, states, and interactions remain constraints. The semantic contract and optional Code Sketch do not lock information architecture, visual hierarchy, layout, component shape, or final geometry unless the user explicitly does so. Composition, imagery, and component treatment may be explored without adding unsupported features.

## Light Visual Interrogation

仅产品简报与已有用户决定未解决下列实质取舍时触发，每次只问一个相关问题，最多三个；记录实际讨论并在产品简报同步结论，已明确的内容不重复询问。

按未决项选择问题：

1. 用户凭什么在约 3 秒内认出这是我们的产品，而不是品类里的通用 App？
2. 若更具辨识度的视觉需要自定义组件、插画、动效或位图资产，是否接受为此付实现与维护成本？
3. 仅当预设为 `entertainment`、`visual-led`、`lifestyle`，或用户主动要求更强表达时再问：当前预设是否需要上调或下调表达预算？

不对每页重复讨论。视觉签名的可复述性用于候选审查和必要取舍，可与公共图片选择一并确认；已有决定足够时不增加单独确认。

## Global Direction Freeze Gate

正式冻结使用公共控制器的用户选稿记录及真实 Figma 节点和冻结预览；文字方向、预设和成本说明不是独立冻结门。正式实现须验证相关 V1 功能，仅设计提案不强制先建工程。既有有效方向的局部增量可复用。

建立或替换公共基线时，在一次实际 Figma 节点选择中记录相关决定：

1. Selected global direction.
2. Accept or reject the direction's visual signature and implementation-cost commitment.
3. Restatable signature when the Global Freeze Signature Rule applies.
4. `pin`, `raise`, `loosen`, or no expression-budget override.
5. 对实际展示的方向作出选择或明确组合，并引用公共基线与选定节点身份。

核对产品简报、实际讨论和设计依据；只有影响范围、成本或验收的实质冲突才补充讨论。按需汇总所选方向并引用公共候选／选择记录，不得独立批准文字方向或以图片替代可编辑节点。

## Conditional Module Visual Decision

当页面细化出现确需用户决定的范围、交互、预算或成本实质取舍时，只讨论相关问题并沿用现有记录。信息足够时直接在 Figma 探索，不要求用户先批准文字方向、不按页面或素材逐项审批；独立图片仅在确有需要时生成或复用。

## Review Threshold

Replace “is decoration restrained enough?” with:

- Does the screen meet the preset’s `signature_strength` and `wow_requirement` for this page type?
- Does any expressive treatment harm task clarity, hierarchy, trust evidence, or accessibility?
- For full-budget pages, flag missing signature, overly safe stock-component composition, or flattened product character as Important when the preset requires wow or high signature.

Penalize purposeless noise and generic AI decoration. Do not penalize purposeful signature strength required by the preset.
