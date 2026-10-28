# UI 布局阶段门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#ui-布局阶段门)。

## 统一门

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#统一门)。

## 阶段映射

## 高分屏与响应式阶段门

- 对屏幕 HUD、DOM Overlay、适用的屏幕自适应平面内容、弹窗和 `DISPLAY_LAYER`，V2 的 Implementation Package/布局合同必须填写 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr=2`、`scaleMode=custom`、Camera viewport/zoom/origin、输入坐标、安全区、resize、方向、文字/资源分辨率和性能预算。竖屏 1080×1920 按宽、横屏 1920×1080 按高适配，Canvas 填满视口且背景等比 cover；还需说明物理 backing、`gameSize`、弹窗宿主继承、监听清理及显式降级策略。真正三维世界和透视关卡按三维世界视口合同验收，不要求二维固定设计视口。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。

合同中的 `scaleMode` 使用项目自定义的 `custom` 策略，不以引擎模式名代替视口映射。实际 Canvas 填屏、Camera 变换和输入映射仍须提供背景覆盖、输入命中及连续 resize 的运行证据；字段名称、构建、单测或静态截图不能单独驱动 V5 PASS。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。

## 本栈配套资料

- [离线布局审阅产物](./layout-review-artifacts.md)
- [节点组织规则](./layout-hierarchy.md)
- [控制面不可绕过约束](../../app-workflow-control/SKILL.md#不可绕过约束)
- [实际完成情况](../../threejs-domain-contracts/references/control-model.md#按实际完成情况验收)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
