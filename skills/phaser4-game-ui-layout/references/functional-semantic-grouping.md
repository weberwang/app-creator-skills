# 功能语义分组约束

适用于 V3 的效果图拆解与后置布局。先确认功能归属，再分别记录实际父级和定位参照。父子关系表达功能、共同状态、交互、生命周期或真实布局管理职责，定位参照表达位置计算依据；位置依赖本身不要求更改父级。不得根据元素类型、距离或最小包含矩形自动确定父级。

屏幕节点还须记录父容器职责、布局所有者、尺寸/溢出/安全区和输入策略。字段及 Phaser 根节点、空容器与 V2/V3/V4/V5 组织规则详见[Phaser UI 节点组织](./layout-hierarchy.md)；`ui_layout` 不取代本文件定义的语义归属。

## 判断原则

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。
- `parent_element_id` 表达真实功能或布局父级。可选 `ui_layout.position_reference_id` 独立指定位置参照，省略时使用父级；允许同一 scene/state、同坐标空间的兄弟节点（包括叶子）、祖先和稳定根，不允许任意跨分支叶子或全屏装饰背景。独立参照须有 `POSITION` 职责，父边与参照边合并后必须无环。
- 子项突出非根父框时，声明 `ui_layout.visual_overflow: {reason: "关闭按钮突出面板边缘"}`，保留真实父级和父框尺寸。声明只放宽该父框的包含检查，不豁免 viewport、安全区、画布、裁切、输入和可读性要求；没有声明仍检查完整包含，不为通过检查扩大面板或增加无职责包装层。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。
- 同时存在信息归属和位置依赖时，两项都要保留。例如按钮图标与文字同属按钮 Container，文字可参照图标定位，不将文字改挂到图标下。Phaser 的功能 Container 与底板图片保持各自身份；不照搬 Cocos 的 Sprite 组件与 Node 共存模型，也不把底板图片尺寸当作 Container 的自动布局尺寸。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#判断原则)。

## 拆解记录

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#拆解记录)。

`parent_element_id` 只能引用同一 scene/state 的已声明容器，或稳定根 `viewport` / `safe-area`，最终确认不接受缺省父级。`ui_layout.position_reference_id` 省略时为父级；独立参照不改变功能归属。`semantic_grouping.rationale` 说明共同表达的信息、父级职责及必要的独立定位关系，不以“都是文字”“距离最近”作为理由。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#拆解记录)。

这里的 `kind=component` 表示功能组件容器，与拆解元素字段 `element_type=component` 表示非容器元素不是同一概念。复合功能可以嵌套组件，但区域不能塞入功能组件内部。所有显式父关系必须无环、不自指、几何可包含，且空容器标记与实际子项一致。

## 阶段与校验边界

1. 阶段 A 先登记原子元素，再按真实功能归属登记父级、独立定位参照、溢出和理由，生成拆解图与技术 JSON。存在歧义就保留为待补充草案，展示争议点，不自动猜测或伪造人工决定。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#阶段与校验边界)。
3. 阶段 B 按已确认元素原序映射实际父级与有效定位参照，分别生成 `parent_target_bounds` 和 `reference_target_bounds`，再做双轴对齐判断。相对距离按真实父级计算，锚点偏移按有效参照计算；审阅资料同时展示两类关系。
4. 机器检查字段完整、父级类别、参照上下文、合并依赖环、显式溢出、根边界与确认身份一致性。机器不能证明功能语义或理由真实；滥用分组、`standalone` 或溢出声明仍由人工审阅识别，不以 PASS 或 AI 自评代替确认。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md#阶段与校验边界)。

新增节点需要纳入拆解确认，已有元素顺序、身份和原始测量保持不变。布局目标可按明确的[居中策略](./center-alignment.md)平移，并传播父级或参照位移；不得回写 proposal 原始 bounds 或确认回执。

## 本栈配套资料

- [完整拆解与视觉显著性](../../phaser4-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)
- [场景与弹窗尺寸参照](./layout-hierarchy.md#场景与弹窗尺寸参照)
