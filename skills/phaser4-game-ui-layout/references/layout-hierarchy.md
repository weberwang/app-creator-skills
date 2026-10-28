# Phaser UI 节点组织

本参考把屏幕 UI 的节点职责、父子关系和阶段检查接入 Phaser 布局流程。它补充[功能语义分组约束](./functional-semantic-grouping.md)：语义分组说明共同表达什么，父级说明功能或布局归属，`ui_layout.position_reference_id` 说明定位依据；布局、溢出、安全区和输入职责另行记录，三类事实不能互相推导。

## 节点树与父容器职责

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#节点树与父容器职责)。

| 职责 | 适用情况 | Phaser 中的组织方式 |
| --- | --- | --- |
| `POSITION` | 节点具有明确位置依赖，或父级实际管理子项定位 | 独立定位依赖使用 `position_reference_id`，父级实际管理布局时由 Container 或布局根统一变换；不能仅为表达参照增加父级。 |
| `LAYOUT` | 父级决定子项尺寸、顺序、间距或重排 | 由一个布局所有者计算子节点，避免布局计算与手写位置互相覆盖。 |
| `INTERACTION` | 父级是一个完整命中目标并处理子项输入 | 将输入绑定到组件根；纯视觉子节点不重复接收同一次操作。 |
| `STATE` | 子项共享显隐、动画状态或生命周期 | 将共同状态的拥有者与受控子项放在同一组件根下。 |
| `CLIP` | 父级定义需要裁切的边界 | 只将需裁切的内容放入裁切区；须保持完整的文字、预览和提示作为同级内容。 |
| `REUSE` | 子树作为整体重复实例化或复用 | 将稳定的可复用 UI 单元封装为组件；仅仅使用相同资源不构成复用关系。 |

同一组件中的图标与文字可以保持同级，位置依赖由独立参照表达。父级必须来自人工确认的功能、状态、交互、生命周期或真实布局职责，几何包含、视觉距离和元素类型不能决定归属。一个节点可以有多个真实职责；不能用笼统的“分组”代替职责说明。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#节点树与父容器职责)。

## 场景与弹窗尺寸参照

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#场景与弹窗尺寸参照)。

`parent_element_id`/`parent_layout_node_id` 保留实际归属，`reference_id` 使用 `ui_layout.position_reference_id` 或默认父级。`parent_target_bounds` 记录真实父框，`reference_target_bounds` 记录定位框；相对父级距离与定位偏移分别计算。独立参照只允许同 scene/state、同坐标空间的兄弟、祖先或稳定根，合并父边与参照边后必须无环。内部功能组件继续按职责分层。底板 Container 的逻辑 bounds 显式声明，底板图片只是视觉部件，不从纹理或子项包围盒推导容器尺寸。

关闭按钮等部件突出底板时，保持真实归属并声明 `ui_layout.visual_overflow: {reason: "关闭按钮突出面板边缘"}`，按需独立参照定位。该声明只放宽非根父框包含，不扩大底板 bounds；安全区、viewport、裁切和命中仍需验证。只有具有独立状态、布局、交互或裁切职责时才增加容器。

`viewport` 和 `safe-area` 是逻辑几何根，不要求创建同名 Phaser 对象。生成、居中、审阅和运行校验消费同一批次根矩形；已声明的小安全区不得回退成完整画布。安全区必须完全位于当前逻辑视口内。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#场景与弹窗尺寸参照)。

## 推荐根节点

以下结构是屏幕 UI 的常用 Phaser 组织起点，实际 scene 可按职责裁剪；不得为了匹配示意图而增加无职责层：

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#推荐根节点)。

`BackgroundRoot` 可超出安全区以覆盖可见 viewport；按钮、关键文字和玩法信息应遵循运行时 `safe_area_policy`。常驻 HUD 与当前页面分别归属明确根节点。`DisplayLayerRoot` 表示宿主场景预留的显示层位置；modal、popup、drawer、toast 等瞬态层仍按现有独立 `DISPLAY_LAYER` Work Item 规则建立，并记录宿主、生命周期、输入阻断和关闭后的恢复。Phaser 的 Scale、Camera、DOM Overlay 和输入坐标细节按[适配器参考](./phaser-adapter.md)确定。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#推荐根节点)。

## V3 组织事实

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v3-组织事实)。

| 字段 | 记录内容 |
| --- | --- |
| `grouping_basis` | 直接父子关系的职责数组，只使用 `POSITION`、`LAYOUT`、`INTERACTION`、`STATE`、`CLIP`、`REUSE`；同级性由多个节点共享同一父节点表达，不能把兄弟节点互相设为父级。只有直接挂在 `viewport`/`safe-area` 且无额外依赖时才用 `[]`；其余父子关系至少说明一项真实职责。 |
| `layout_owner` | 谁计算该节点的位置与尺寸：`PARENT`、`SELF` 或 `EXTERNAL`。 |
| `position_reference_id` | 可选定位参照；省略时为实际父级。独立参照须包含 `POSITION` 职责，且不得形成混合依赖环。 |
| `visual_overflow` | 可选 `{reason: 非空说明}`，允许越出非根父框，不豁免视口、安全区、裁切和输入。 |
| `size_policy` | 尺寸意图：`FIXED`、`STRETCH`、`CONTENT` 或 `FLEX`；布局节点原有尺寸字段仍须填写并与它一致。 |
| `overflow_policy` | 空间不足时处理：`KEEP_VISIBLE`、`CLIP_DECORATION`、`REFLOW` 或 `SCROLL`。 |
| `safe_area_policy` | `FULL_BLEED` 或 `INSIDE_SAFE_AREA`。 |
| `interaction_policy` | `HIT_TARGET`、`DELEGATE_TO_PARENT` 或 `NONE`。 |
| `minimum_size` | 可选的最小可读/可点击尺寸，宽高须为正数逻辑像素；声明后任何视口下都不得低于该值。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v3-组织事实)。

## Phaser 组件例子

### 按钮

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#按钮)。

### 背包格

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#背包格)。

### 血条

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#血条)。

## V2、V3、V4、V5 阶段接入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v2v3v4v5-阶段接入)。

## Phaser 适配边界

迁移的是父子职责、同级分组、空槽标注、安全区和组合验收规则。Unity 的 CanvasScaler、RectTransform/UXML 属性和 Prefab 生命周期不作为 Phaser 字段或实现要求；固定设计基准由 Phaser 的 Scale、Camera、Container、CSS 视口和输入映射实现，不能直接照搬 Unity 的缩放组件。


## 背景与布局参照分离

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#背景与布局参照分离)。

## 本栈配套资料

- [布局阶段门](./workflow-gates.md)
- [显示层分层合同](./display-object-layering.md#显示层分层合同)
