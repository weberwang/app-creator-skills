# 装饰性满幅背景

## 适用边界

只适用于不承载交互、文字、关键目标、碰撞、导航或玩法信息的屏幕空间装饰背景。
世界空间关卡、项目自建地图/图块、可交互物、玩法环境和影响遮挡判断的场景层，使用
`asset-production-routes.md` 的场景地图或世界/玩法环境路线。

背景在 V2/V3 与关键对象联合确定性机器验证。默认 `visual_validation.mode=usability`，在不影响可读性、层级和玩法信息的前提下允许合理裁切与构图差异，但背景必须完全铺满当前可见场景，不允许留白、露边或仅覆盖安全区。完整覆盖是所有验收模式的硬约束。普通背景在已有明确需求或冻结基线且结构、布局、交互不变时记录 `AUTO`；新方向、焦点或高返工取舍只请求一次 `USER_DECISION`。Work Item 指定效果图忠实还原时受[视觉还原](./visual-reconstruction.md)约束；只有 `exact` 或明确精确需求时，才把背景焦点、构图和可见裁切按严格容差判定，并要求对应决定记录。后续绑定当前决策记录。
响应式合同的详细字段和门禁以 [`threejs-game-ui-layout` 布局合同](../../threejs-game-ui-layout/references/layout-contract.md) 为准。

## 生产与适配

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-full-bleed-background.md#生产与适配)。

## 本栈配套资料

- [响应式视觉验证](../../threejs-game-qa-performance/references/responsive-visual-validation.md)
- [`full-bleed-background-adapter.mjs`](../scripts/full-bleed-background-adapter.mjs)
