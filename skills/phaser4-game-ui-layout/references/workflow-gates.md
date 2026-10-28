# UI 布局阶段门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#ui-布局阶段门)。

## 统一门

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#统一门)。

## 阶段映射

## 高分屏与响应式阶段门

- V2：Implementation Package/布局合同必须填写 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr=2`、`scaleMode=custom`、Camera viewport/zoom/origin、输入坐标、安全区、resize、方向、文字/资源分辨率和性能预算。竖屏 1080×1920 按宽、横屏 1920×1080 按高适配，Canvas 填满视口且背景等比 cover；还需说明物理 backing、`gameSize`、弹窗宿主继承、监听清理及显式降级策略。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。
- V3 的实际父级与定位参照分别继承，带理由的非根溢出不改变面板尺寸；中心策略、组合成员和位置/尺寸执行计划由同一事实派生并在独立布局确认中复算。V5 从正式 Scene 读取同批运行快照核对这些关系，详见[运行证据合同](./layout-runtime-evidence.md)；组件快照覆盖不扩大 `usability` 的像素几何验收范围。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。

`FIT` 和 `NONE` 不满足填屏约束；合同 `scaleMode` 固定为 `custom`。Phaser `Scale.RESIZE` 可以作为内部画布尺寸更新方式，但不能替代实测变换、背景覆盖、输入命中及连续 resize 证据，也不能单靠模式名称、构建、单测或静态截图驱动 V5 PASS。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。

## 本栈配套资料

- [离线布局审阅产物](./layout-review-artifacts.md)
- [节点组织规则](./layout-hierarchy.md)
- [控制面不可绕过约束](../../app-workflow-control/SKILL.md#不可绕过约束)
- [实际完成情况](../../phaser-domain-contracts/references/control-model.md#按实际完成情况验收)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
