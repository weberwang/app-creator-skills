# ThreeJS UI 节点组织

本参考把屏幕 UI 的节点职责、父子关系和阶段检查接入 ThreeJS 布局流程。它补充[功能语义分组约束](./functional-semantic-grouping.md)：语义分组说明元素共同表达什么，`ui_layout` 说明节点为何依赖其直接父级以及布局、溢出、安全区和输入由谁控制。两类信息必须分别记录，不能互相推导。

## 节点树与父容器职责

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#节点树与父容器职责)。

| 职责 | 适用情况 | ThreeJS 中的组织方式 |
| --- | --- | --- |
| `POSITION` | 子节点位置、偏移或缩放依赖父节点参照 | 用 `Group` 或明确的布局根统一变换坐标；仍须按确认的父级记录，不能按 bounds 自动挑选。 |
| `LAYOUT` | 父级决定子项尺寸、顺序、间距或重排 | 由一个布局所有者计算子节点，避免布局计算与手写位置互相覆盖。 |
| `INTERACTION` | 父级是一个完整命中目标并处理子项输入 | 将输入绑定到组件根；纯视觉子节点不重复接收同一次操作。 |
| `STATE` | 子项共享显隐、动画状态或生命周期 | 将共同状态的拥有者与受控子项放在同一组件根下。 |
| `CLIP` | 父级定义需要裁切的边界 | 只将需裁切的内容放入裁切区；须保持完整的文字、预览和提示作为同级内容。 |
| `REUSE` | 子树作为整体重复实例化或复用 | 将稳定的可复用 UI 单元封装为组件；仅仅使用相同资源不构成复用关系。 |

同组且没有相互位置依赖的元素应作为同级子项，不可为了“看起来更整齐”把一个视觉元素设成另一个的父级。父级必须来自人工确认的功能、状态、交互或布局管理职责，几何包含、视觉距离和元素类型只能帮助检查，不能决定归属。一个节点可以有多个真实职责；不能用笼统的“分组”代替职责说明。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#节点树与父容器职责)。

## 场景与弹窗尺寸参照

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#场景与弹窗尺寸参照)。

相对位置仍按真实父级测量，双轴锚点、偏移和比例/拉伸尺寸按定位参照计算；内部已有功能组件继续按自身直接父级组织，不将所有后代平铺到场景或底板下。`parent_element_id` 与 `parent_layout_node_id` 表示真实归属，`reference_id` 表示停靠参照；`parent_target_bounds` 始终记录真实父级矩形。可选 `ui_layout.position_reference_id` 可以指向同级、祖先或稳定根，并与父级边共同满足无环约束。底板容器声明 `POSITION` 或 `LAYOUT` 职责，底板位图只是其中的视觉部件。

关闭按钮等部件突出底板时，按现有包含规则建立覆盖底板与突出部件的外层逻辑容器；内部仍保留与底板同尺寸的面板布局参照，突出部件属于外层。不得扩大内层底板布局范围来迁就突出部件，否则会改变内容的尺寸参照。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#场景与弹窗尺寸参照)。

## 推荐根节点

以下结构是屏幕 UI 的常用 ThreeJS 组织起点，实际 scene 可按职责裁剪；不得为了匹配示意图而增加无职责层：

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#推荐根节点)。

`BackgroundRoot` 可超出安全区以覆盖可见 viewport；按钮、关键文字和玩法信息应遵循运行时 `safe_area_policy`。常驻 HUD 与当前页面分别归属明确根节点。`DisplayLayerRoot` 表示宿主场景预留的显示层位置；modal、popup、drawer、toast 等瞬态层仍按现有独立 `DISPLAY_LAYER` Work Item 规则建立，并记录宿主、生命周期、输入阻断和关闭后的恢复。Three.js Camera、`Group`、DOM Overlay 和输入坐标细节按[适配器参考](./threejs-adapter.md)确定。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#推荐根节点)。

## V3 组织事实

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v3-组织事实)。

| 字段 | 记录内容 |
| --- | --- |
| `grouping_basis` | 直接父子关系的职责数组，只使用 `POSITION`、`LAYOUT`、`INTERACTION`、`STATE`、`CLIP`、`REUSE`；同级性由多个节点共享同一父节点表达，不能把兄弟节点互相设为父级。只有直接挂在 `viewport`/`safe-area` 且无额外依赖时才用 `[]`；其余父子关系至少说明一项真实职责。 |
| `layout_owner` | 谁计算该节点的位置与尺寸：`PARENT`、`SELF` 或 `EXTERNAL`。 |
| `size_policy` | 尺寸意图：`FIXED`、`STRETCH`、`CONTENT` 或 `FLEX`；布局节点原有尺寸字段仍须填写并与它一致。 |
| `overflow_policy` | 空间不足时处理：`KEEP_VISIBLE`、`CLIP_DECORATION`、`REFLOW` 或 `SCROLL`。 |
| `safe_area_policy` | `FULL_BLEED` 或 `INSIDE_SAFE_AREA`。 |
| `interaction_policy` | `HIT_TARGET`、`DELEGATE_TO_PARENT` 或 `NONE`。 |
| `minimum_size` | 可选的最小可读/可点击尺寸，宽高须为正数逻辑像素；声明后任何视口下都不得低于该值。 |
| `position_reference_id` | 可选的独立停靠参照，只能引用同级、祖先或稳定根；与真实父级不同则 `grouping_basis` 必须包含 `POSITION`。父级边与参照边联合后必须无环。 |
| `visual_overflow` | 可选的 `{reason}`，仅允许有理由的装饰越出普通父框；viewport/safe-area 仍是硬边界。 |
| `independent_container_reason` | 可选理由；当额外纯结构根可复用明确绘制的 Sprite 底板时，解释为何仍需该结构容器。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v3-组织事实)。

`parent_element_id` 表示真实结构与功能父级，`position_reference_id` 只影响停靠几何，两者分别进入确认和节点事实。显式安全区引用须绑定同批唯一实际矩形，即使 inset 为零也须有快照。严格中心策略默认应用于 `center` 对齐；带理由的 reference 偏移和 `member_ids` 整体图文居中按[中心对齐合同](./center-alignment.md)生成。

## ThreeJS 组件例子

### 按钮

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#按钮)。

### 背包格

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#背包格)。

### 血条

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#血条)。

## V2、V3、V4、V5 阶段接入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#v2v3v4v5-阶段接入)。

## ThreeJS 适配边界

迁移的是父子职责、同级分组、空槽标注、安全区和组合验收规则。Unity 的 CanvasScaler、RectTransform/UXML 属性和 Prefab 生命周期不作为 three.js 字段或实现要求；固定设计基准由项目视口适配器、Camera、`Group`、CSS 视口和输入映射实现，不能直接照搬其他引擎的缩放组件。


## 背景与布局参照分离

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md#背景与布局参照分离)。

## 本栈配套资料

- [布局阶段门](./workflow-gates.md)
- [显示层分层合同](./display-object-layering.md#显示层分层合同)
