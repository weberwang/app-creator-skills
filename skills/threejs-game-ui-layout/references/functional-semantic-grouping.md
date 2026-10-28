# 功能语义分组约束

适用于 V3 的效果图拆解与后置布局。先分别确认真实父子归属、定位参照和信息分组，再决定组件如何停靠；真实父级表达结构/功能归属，`position_reference_id` 表达独立的停靠参照，语义分组表达共同信息，三者不得混用，也不得根据元素类型、所在大区域或最小包含矩形自动确定父级。

屏幕节点还须记录父容器职责、布局所有者、尺寸/溢出/安全区和输入策略。字段及 ThreeJS 根节点、空容器与 V2/V3/V4/V5 组织规则详见[ThreeJS UI 节点组织](./layout-hierarchy.md)；中心策略、整体图文居中与偏移参照详见[中心对齐合同](./center-alignment.md)。`ui_layout` 不取代本文件定义的语义归属。

## 判断原则

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。
- 真实父级表达结构和功能归属，定位参照表达停靠计算所依赖的边界。位置依赖可通过同级、祖先或稳定根参照表示，不因此强制改变真实父子关系；只有真实组件职责或结构关系要求新容器时，才建立并确认定位容器。不得把位置依赖方自动挂到被参照叶子下，也不得从几何包含补父级。
- 普通子项 bounds 应完整落在真实父框内。装饰确需越出普通功能父框时，可在 `ui_layout.visual_overflow.reason` 中说明原因；该声明不扩大父框，也不放宽 viewport/safe-area 根边界。角标等依赖项可用独立定位参照指向同级或祖先；不得修改原图测量 bounds 或用视觉溢出绕过安全区。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。
- 同时存在信息归属和位置依赖时，两项都要保留：共同信息决定语义组，真实结构决定父子关系，位置依赖由 `position_reference_id` 表达；不能为减少字段而混同三种关系。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。

## 拆解记录

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#拆解记录)。

`parent_element_id` 只能引用同一 scene/state 的已声明容器，或稳定根 `viewport` / `safe-area`；最终确认不接受缺省父级。它记录真实结构归属，不默认等于定位参照。可选 `ui_layout.position_reference_id` 只能指向同级、祖先或稳定根；与父级不同时，`grouping_basis` 必须包含 `POSITION`。父级和定位参照联合起来必须无环。`semantic_grouping.rationale` 必须说明共同表达的信息、独立布局原因或层级归属，不以“都是文字”“距离最近”作为理由。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#拆解记录)。

这里的 `kind=component` 表示功能组件容器，与拆解元素字段 `element_type=component` 表示非容器元素不是同一概念。复合功能可以嵌套组件，但区域不能塞入功能组件内部。所有显式父关系必须无环、不自指，普通父框须包含子项；带 `visual_overflow.reason` 的装饰例外仍须在稳定根内。空容器标记与实际子项一致；额外纯结构根若可复用显式 Sprite 底板，必须通过 `independent_container_reason` 说明独立职责。

## 阶段与校验边界

1. 阶段 A 先登记原子元素，再按“位置依赖确定父子、共同信息确定同级分组”的顺序登记候选容器、归属和理由，生成拆解图与技术 JSON。存在歧义就保留为待补充草案，展示争议点，不自动猜测或伪造人工决定。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#阶段与校验边界)。
3. 阶段 B 按已确认元素原序把 `parent_element_id` 映射为 `parent_layout_node_id`，再做视觉双轴对齐判断。输出节点、布局 PNG 与审阅资料需要可追溯到同一功能归属；理由不能只存在于未绑定的旁注。
4. 机器检查字段完整、父级类别、引用、环、几何包含、跨组件归属与确认身份一致性。机器不能从静态 bounds 证明位置依赖或共同信息正确；把有位置依赖的元素平铺、把同一信息拆成无关项、把多个信息谎称为一个组件、滥用 `standalone` 或填写无意义理由，仍由拆解人工审阅识别，不以 PASS 或 AI 自评代替确认。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#阶段与校验边界)。

新增节点需要明确纳入新的拆解确认，已有元素相对顺序与原始 bounds 仍保持不变。该约束不授权自动改写已有项目的冻结工件或确认回执。

## 本栈配套资料

- [完整拆解与视觉显著性](../../threejs-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)
- [场景与弹窗尺寸参照](./layout-hierarchy.md#场景与弹窗尺寸参照)
