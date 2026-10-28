# 控制模型

## A0-A6 动作等级

本标题仅保留原资料引用定位，不代表当前控制器提供 A0–A6 字段或动作等级。本栈编辑器、资源、平台与项目对象的真实操作限制按原生能力执行；受保护副作用与具体动作批准以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)和 Work Item 的 action.approval 为准，不定义第二套全局动作等级或审批记录。

## F0-F4 唯一语义

公共 F0–F4、验证证据和完成条件以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为唯一准据；本参考后续只补充视觉、资源和显示层的领域事实。

## 执行优先与证据收敛

任务范围、实施计划和验证按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行；实际完成情况与必要领域证据见以下参考。

### 按实际完成情况验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-completion.md#按实际完成情况验收)。

### 前进优先与三级处置

本栈视觉校验器的 repair/revalidate/return 是领域 disposition，不是公共控制器命令；返回及恢复按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行。

## 任务范围与显式批准

任务范围、用户决定和受保护动作统一按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行；本栈视觉合同仍需满足下面的字段和实际证据要求。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#任务范围与显式批准)。

## 视觉阶段硬门

### 弹窗工作项与场景解耦

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-display-ownership.md#弹窗工作项与场景解耦)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#弹窗工作项与场景解耦)。

全局 brief 使用结构化项目美术 JSON，明确主题、受众、核心循环、体验目标、观看情境、视觉层级与三层刺激预算。选择根/决定合同为 1.1，三候选各记录五项实际人工质量结果，所选候选全部通过才可冻结；三张均失败时保持待定并返工，不以“相对最好”放行。字段与文件门见[Schema](./schemas.md#视觉阶段-schema)。场景目标、资源组合和持续游玩沿用[游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)与现有确认节点；V4 运行候选内的 `artExperienceAcceptance` 缺失或非通过时不得完成，机器事实出口不能替代用户视觉验收。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-sequence.md#弹窗工作项与场景解耦)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#弹窗工作项与场景解耦)。

受保护副作用的实际对象、动作和明确批准按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)核对。

## 实施顺序状态硬门

effect-image 的 V2 功能归属是拆解确认的一部分，遵守[功能语义分组约束](../../cocos-game-ui-layout/references/functional-semantic-grouping.md)。最终元素必须显式声明 `parent_element_id` 与 `semantic_grouping.kind/rationale`；父子树表达功能归属、共同状态、交互、生命周期或真实布局管理，单纯定位依赖通过 `ui_layout.position_reference_id` 表达，省略时参照实际父级。简单底板组件优先以同一个 `element_type=container`、`render_kind=sprite` 的节点兼任容器与底板图像，kind 为 `component`/`region`，保留该节点的 `component_id`、`placement_id` 和图片身份；不复制空根与底板叶子。额外纯结构容器若包裹可用底板和内容，必须声明非空 `ui_layout.independent_container_reason`；机器只检查合同结构和理由存在，不声称证明该职责真实，也不自动删除或改写已冻结结构。允许引用同场景状态、同坐标空间的兄弟或祖先节点及稳定根，背景不能作参照；联合父边与定位参照边不得循环。合法容器可承载区域、组件或叶子，不按 kind 强加包装层。机器检查归属结构和身份，语义判断由人工确认；实际归属变化更新拆解确认及受影响布局，不自动改写已冻结的项目工件。

基础、场景和显示层顺序按[公共工作流](../../app-creator-workflow/references/workflow.md)及各自的视觉证据执行。

effect-image 的布局拆解在控制面按串行顺序处理：先在确认 proposal 中按原顺序冻结 `decomposition_elements`，再由布局阶段逐项继承 `parent_element_id` 为 `parent_layout_node_id` 并计算 `parent_target_bounds`。智能布局必须结合原图构图、视觉重心、元素语义和 resize 意图，按同一顺序生成唯一决策并显式声明 `axis_alignment.horizontal=left|center|right` 与 `vertical=top|center|bottom`；两轴组合是九点停靠关系，依据预期尺寸变化后应保持的锚定意图选择，不按当前元素落入几何九等分格自动决定。center 轴按[居中策略与组合定位](../../cocos-game-ui-layout/references/center-alignment.md)规范化 `center_alignment`：普通 center 轴省略策略时默认 strict，受 leader `member_ids` 控制的组员轴继承组策略；允许偏移必须明确为 reference 并提供理由。图文整体居中由 leader 声明成员联合框，角标独立停靠。Stage A proposal 是历史确认输入，Stage B decision 是唯一布局生成输入；生成器只用两者产出同批唯一 `layout-nodes.json`，其中集中保存分组、父子、定位参照、停靠、中心、尺寸、RAW/九宫格和派生 `layout_execution`。scene contract 的 `layout_decomposition.layout_source.nodes_file` 指向该文件，`layout_binding`、annotation、confirmation 只保留身份和证据，annotation/confirmation 的 `layout_nodes_file` 必须与 source 一致。decision 原字节保持不变，规范化策略写入生成节点。center 约束和父/定位参照位移都可平移布局节点或整组；参照位移沿关系传播到依赖节点，即使依赖节点对应轴不是 center 也保持原有相对间距，并且同一祖先位移只累计一次。proposal 原 bounds、节点尺寸、身份和顺序保持不变；确认门从已绑定 proposal 与 decision 复算最终 `target_bounds` 和 `offset`，不静默回写 proposal 或用 V4 补丁更改 V2。它与纹理 `nine_slice` 九宫格拉伸合同相互独立，也不等同于 Creator 默认中心 `anchorPoint`。不得依据四边距离自动决定对齐，也不得调序、生成多个布局方案或重新生成/替换视觉参考图。布局标注 PNG、review 与派生运行快照只读展示，不产生第二份手工事实。`relative_position` 按真实父框测量；非根子项声明 `ui_layout.visual_overflow.reason` 时允许负距离，不扩大父框，目标画布和稳定根边界仍受约束。`reference_id` 取已确认定位参照，`reference_target_bounds` 绑定该参照目标框；与父级相同时可由父框推导，独立参照时必须显式记录。`offset` 与两个 `${vertical}-${horizontal}` 锚点按定位参照及显式视觉决策计算。普通底板即使兼任父容器，其 `sprite_geometry` 仍为 `SIMPLE + RAW` 且 `content_size=null`；纯结构容器不声明 Sprite 尺寸计划。仅已冻结九宫格图片输出 `SLICED + CUSTOM` 和自身目标宽高；父容器尺寸不能写入普通图片。分组、父子、视觉决策或定位参照实际变化时按对应确认门重新生成并重验。

effect-image V4 必须在 `combination_preacceptance.layout_geometry.component_snapshots` 提供同一正式 Creator Scene 采集的全部业务布局节点组件快照，并与 `node_measurements` 几何容差矩阵分开校验。`usability` 与 `exact` 都要求组件快照覆盖全部业务节点；`usability` 的几何测量可以只覆盖关键节点，不能据此减少快照。快照读取实际父级、Creator `Node.activeInHierarchy` 活动状态及其父子一致性、唯一位置/尺寸写入者、Widget 与 Creator 原生 Layout、UITransform、Sprite 原尺寸、`layout_bounds`/`reference_bounds` 和到冻结布局逻辑坐标空间的变换；实际矩形用于校验 strict/reference/组 union，但不要求每个节点矩形等于目标框，也不升级为 exact 几何矩阵。自定义项目布局器由 `SHARED` 驱动并可保留 `PARENT` 职责。V2 自动选型默认假设 Widget 路径 `scale=1`、`rotation=0`、`skew=0`，不声称读取尚未采集的运行矩阵；已知非单位路径显式用 `SHARED`，V4 观测不符则拒绝并回上游调整。变换必须先按既有 designTransform/Camera/逻辑视口合同换算，不能直接使用包含屏幕适配缩放或 DPR 的 worldMatrix。RAW 校验只限制 `UITransform.contentSize` 等于正式 SpriteFrame 原尺寸，不拦截 Node 缩放动画；仅凭 Widget 对齐 flag/value 正确不能证明实际严格居中。快照不接受从 `layout_execution` 复制、由测试 fixture 冒充正式采集或仅提交自报 PASS。标准字段和布局冲突规则见 [Widget 运行快照](../../cocos-game-ui-layout/references/widget-runtime-evidence.md)。该运行证据检查组件配置，不表示已完成人工截图视觉验收。

实施顺序和当前结果按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。

控制面读取 V2 布局候选目录的实际布局 PNG、节点 JSON、决策 JSON 和生成结果；如提供交互审阅页，另核验其真实文件及绑定，并把 `layout_nodes_file` 与 scene contract 的 `layout_source.nodes_file`、PNG、decision、拆解确认、proposal、target、scene/state 身份逐项复核；annotation 与布局确认也必须指向同一个 `layout_nodes_file`。唯一 `layout-nodes.json` 是后续分组、父子、定位参照和执行策略的来源；`review.html`、PNG 与派生快照只展示它，不能改变状态或替代标准布局 PNG、F2 机器门。缺父节点、成环、越界、顺序/身份漂移、事实副本冲突或必要文件不可读取均拒绝。字段和页面约束见[离线布局审阅产物](../../cocos-game-ui-layout/references/layout-review-artifacts.md)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。
