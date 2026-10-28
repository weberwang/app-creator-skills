# 九宫格 UI：拆解时确定，按小图生产

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#九宫格-ui拆解时确定按小图生产)。

## 适用判断

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#适用判断)。

不要仅凭“按钮”“底板”等名称选择。需从冻结参考图判断固定区域与可伸展区域，并保留原图外形、层次、边厚和留白。简单规则底板若已选择可完整还原的 Phaser 原生绘制，则沿用该路线，不为九宫格改成图片。

## 冻结合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#冻结合同)。

不适用的 UI 皮肤使用 `{ "mode": "not-applicable", "reason": "中心图案必须保持完整比例" }`。普通非 UI 插画可不声明；九宫格不能用于结构容器或满幅背景。需九宫格的可见底板是独立图片叶子，负责交互/布局的父容器仍单独存在。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#冻结合同)。

## V3 到 V5 传递

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#v3-到-v5-传递)。

3. **V5**：正式场景按 V3/V4 已冻结的 `object_fit="nine-slice"` 与 `nine_slice` 实现，一个节点只引用一张皮肤纹理。源图实际尺寸不符、参数未冻结、目标过小均阻断，不能临时手填新的切片值。初始位置仍直接来自 V3，偏移默认空。
4. **V5**：在正式场景按同一合同创建 Phaser NineSlice 对象。内部尺寸变化用 `setSize`，局部对象保持 scale=1；不能用整图 `setDisplaySize` 拉伸角边。设计空间到设备的整体变换仍走共享视口入口。resize/wake 重放同一合同，不另写底板尺寸补丁。

原生 NineSlice 依赖 WebGL，含九宫格资源的正式场景需使用 WebGL；项目构建缺少 NineSlice 或 WebGL 时报告实际能力缺口，不能静默改成普通图片拉伸。依据 [Phaser NineSlice API](https://docs.phaser.io/api-documentation/class/gameobjects-nineslice/) 和 [创建器能力说明](https://docs.phaser.io/api-documentation/class/gameobjects-gameobjectcreator#nineslice)，项目实际锁定的 Phaser 4 版本仍需具备对应能力。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#v3-到-v5-传递)。
