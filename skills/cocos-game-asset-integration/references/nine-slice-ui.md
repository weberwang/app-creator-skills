# 九宫格 UI：拆解时确定，按小图生产

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#九宫格-ui拆解时确定按小图生产)。

## 适用判断

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#适用判断)。

不要仅凭“按钮”“底板”等名称选择。需从冻结参考图判断固定区域与可伸展区域，并保留原图外形、层次、边厚和留白。简单规则底板若已选择可完整还原的 Cocos 原生绘制，则沿用该路线，不为九宫格改成图片。

## 冻结合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#冻结合同)。

不适用的 UI 皮肤使用 `{ "mode": "not-applicable", "reason": "中心图案必须保持完整比例" }`。普通非 UI 插画可不声明；九宫格不能用于纯结构容器或满幅背景。采用九宫格的底板图片可以兼任 `element_type: container` 的功能根，使用 `render_kind: sprite` 和 `semantic_grouping.kind: component` 或 `region`；保留它自己的 `component_id`、`placement_id` 和图片资产身份，不强制把 Sprite 变为叶子。负责交互/布局的容器按真实职责保留；不得仅为框住底板或满足分类校验新增包装容器。未采用九宫格的普通固定视觉底板派生尺寸计划为 `sprite_geometry={type:'SIMPLE',size_mode:'RAW',content_size:null}`，正式 SpriteFrame 保持完整未裁切原尺寸。

`axis_alignment.horizontal=left|center|right` 与 `vertical=top|center|bottom` 组合表示九点停靠：选择内容在底板或其他参照上的位置关系，并由锚点和偏移补全。九点停靠不表示图片九宫格拉伸，也不触发 `SLICED`、`CUSTOM` 或目标尺寸写入。`nine_slice` 只描述纹理固定边角/边条与可伸展区域；两者独立决策、分别冻结。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#冻结合同)。

## V3 到 V5 传递

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#v3-到-v5-传递)。

3. **V5**：正式场景按 V3/V4 已冻结的 `object_fit="nine-slice"` 与 `nine_slice` 实现，一个 Node 只引用一张皮肤纹理。源图实际尺寸不符、参数未冻结、目标过小均阻断，不能临时手填新的切片值。初始位置仍直接来自 V3，偏移默认空。
4. **V5**：在正式场景使用 `Sprite.Type.SLICED`、`Sprite.SizeMode.CUSTOM` 和 Sprite Editor 中冻结的边界实现；对应派生 `sprite_geometry={type:'SLICED',size_mode:'CUSTOM',content_size:{width:目标宽,height:目标高}}`。显示框尺寸由底板节点自身的 `UITransform` 内容尺寸控制；底板可以同时作为组件父节点，不要求增加结构根。局部 scale 保持 1，不通过缩放整张图片改变角边；父 Node scale 会一并作用于所有子节点。只有采用九宫格的图片设置目标宽高，`mode=not-applicable` 或普通非九宫格图片仍使用 `Sprite.SizeMode.RAW` 和 `sprite_geometry={type:'SIMPLE',size_mode:'RAW',content_size:null}`，保持正式 SpriteFrame 的完整未裁切原尺寸，不套用九宫格的尺寸写入逻辑。改变九宫格底板的 `contentSize` 不会按比例缩放其图标和文字子项，子项由布局入口按冻结参照与停靠关系重新计算。父容器 bounds、定位参照或布局尺寸策略不能改写普通图片的 `contentSize`；普通图片不得使用 `STRETCH`/`FLEX`，纯结构容器、文字和命中区域不声明 Sprite 尺寸计划。设计空间到设备的整体变换仍走共享视口入口。resize/wake 重放同一合同，不另写底板尺寸补丁。

Creator 的 Sprite `Sliced Mode` 将图像按九宫格规则适配目标尺寸；它不是独立 NineSlice 对象，也没有 WebGL 前置要求。资源切片边界需在 Sprite Editor 中与已冻结合同一致，并对目标 Creator 小版本及实际目标平台运行核验。依据 [Cocos Creator 3.8 Sprite 组件参考](https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/sprite.html)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md#v3-到-v5-传递)。
