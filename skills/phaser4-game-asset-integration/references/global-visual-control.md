# 全局视觉控制约束

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#全局视觉控制约束)。

## 生产者与消费者绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#生产者与消费者绑定)。

## 基线身份与风格指纹

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#基线身份与风格指纹)。

## 三候选生成与人工冻结门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#三候选生成与人工冻结门)。

## 全局视觉冻结表

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#全局视觉冻结表)。

## 锚点与继承

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#锚点与继承)。

## AI 生成包契约

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#ai-生成包契约)。

上述 AI 专用字段只强制用于路线为 `ai-composite-raster` 且状态为 `producing`、`review` 或 `accepted` 的资源，不泛化到非 AI 生产路线。机器清单中的 AI `generation_record` 必须至少包含非空 `global_prompt_prefix`、`asset_prompt`、`state_prompt`、`negative_prompt`、实际生成器及版本、种子、非空 `reference_inputs` 路径列表和字符串 `postprocess` 数组；未暴露的版本写 `not-provided`。所有路线的 accepted 资源若没有 `source_file/source_files`，仍须满足公共生产身份：record ID、生成器及版本、时间、可执行命令/配方、输入来源和参数。状态段不适用时也必须显式说明原因；`--check-files` 必须验证每个 `reference_inputs` 文件。生成资产 `expected_assets.alpha=true` 时，策略与边缘类型由 `transparency_requirements` 冻结。纯色去背景只可用于 `hard-edge` 且主体与背景明显分离的素材；直接 Alpha 需有针对实际工具与边缘类型的验证，并解码 PNG 确认真实透明像素；复杂透明边缘走经验证的 Alpha、独立遮罩/人工创作、重新生成或有明确合同的 Phaser 特效。半透明、辉光、柔和阴影、毛发、玻璃与混合边缘不得阈值去背。生成记录需按实际路线绑定工具/版本、参数、后处理、原始输入与最终输出路径/SHA；只有背景去除路线保留背景颜色及实际尝试。已有真实透明图按 provided/reuse 资源合同接入，不伪造生成或去背记录；`alpha=false` 的完整场景背景按场景合同处理。

## 多资源一致性证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#多资源一致性证据)。

## 漂移判定与处置

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#漂移判定与处置)。

## 基线变更提案

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#基线变更提案)。

## 审核模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#审核模板)。

## 生成前全局基线硬门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#生成前全局基线硬门)。

## 本栈配套资料

- [持续游玩验收](./art-quality-contract.md#持续游玩验收)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md)
- [效果图文案约束](../../phaser4-game-ui-layout/references/game-copy.md#效果图生成)
- [游戏美术体验与质量契约](./art-quality-contract.md)
- [`game-art-brief.schema.json`](../../phaser-domain-contracts/references/game-art-brief.schema.json)
- [控制模型](../../phaser-domain-contracts/references/control-model.md)
