# 正式场景视觉还原与校准

V5 在正式 Phaser Scene 中完成视觉还原、布局校准和运行验收，直接组合 V3 冻结的拆解结构与目标布局、V4 验收通过的正式资源。布局、资源和画面差异在正式运行场景中定位并修复，再对受影响范围复验。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景视觉还原与校准)。

## 正式场景实现

1. 将 V3 的节点与布局关系映射到正式 Phaser GameObject、Container、显示层和布局配置。保留结构化场景，不用整屏截图、隐藏覆盖层或绝对叠层伪造目标画面。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景实现)。

4. 在真实 Phaser viewport 中实现安全区、缩放、方向和 resize 行为。布局重算应由明确的布局入口完成；Scene 创建、唤醒、resize 等生命周期不得累积重复偏移或重复注册监听器。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景实现)。

布局几何遵守[UI 布局合同](../../phaser4-game-ui-layout/references/layout-contract.md)与[Phaser 显示对象锚点及显示层分层](../../phaser4-game-ui-layout/references/display-object-layering.md)。V3 `anchor` 表达布局关系；纹理 `origin` 表达资源围绕 GameObject 的定位方式，两者不能互相替代。子节点局部位置按其目标世界位置减去父节点世界位置计算，祖先偏移只累计一次。

## 运行校准与验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#运行校准与验收)。

## 本栈配套资料

- [视觉生产管线](./visual-production-pipeline.md)
