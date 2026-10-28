# 正式场景布局校准与参考还原

布局校准在 V5 正式 ThreeJS Scene 中进行。V5 直接读取 V3 已确认的节点结构、目标 bounds、父子关系、锚点和响应式约束，以及 V4 已验收的正式资源；用户检查实际运行画面，开发者在正式布局配置中调整并复验受影响部分。无需先生成一份独立预览或为预览单独确认。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#正式场景布局校准与参考还原)。

## 校准步骤

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#校准步骤)。

3. V5 修改正式布局配置或 ThreeJS 实现场景后，重跑受影响的尺寸/状态/交互检查并更新运行证据。上游事实不变时不重复 V3/V4 的确认；实际依赖变更时使相关下游证据失效。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#校准步骤)。

## 布局读数与边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#布局读数与边界)。

## 关键几何验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#关键几何验收)。
