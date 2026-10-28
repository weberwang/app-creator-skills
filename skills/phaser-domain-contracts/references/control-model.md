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

全局 brief 使用结构化项目美术 JSON，明确主题、受众、核心循环、体验目标、观看情境、视觉层级与三层刺激预算。选择根/决定合同为 1.1，三候选各记录五项实际人工质量结果，所选候选全部通过才可冻结；三张均失败时保持待定并返工，不以“相对最好”放行。字段与文件门见[Schema](./schemas.md#视觉阶段-schema)。场景目标、资源组合和持续游玩沿用[游戏美术体验与质量契约](../../phaser4-game-asset-integration/references/art-quality-contract.md)与现有确认节点；V4 运行候选内的 `artExperienceAcceptance` 缺失或非通过时不得完成，机器事实出口不能替代用户视觉验收。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-sequence.md#弹窗工作项与场景解耦)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#弹窗工作项与场景解耦)。

受保护副作用的实际对象、动作和明确批准按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)核对。

## 实施顺序状态硬门

effect-image 的 V2 功能归属是拆解确认的一部分，遵守[功能语义分组约束](../../phaser4-game-ui-layout/references/functional-semantic-grouping.md)。最终元素声明 `parent_element_id` 与 `semantic_grouping.kind/rationale`，独立定位参照通过 `ui_layout.position_reference_id` 表达，非根溢出通过 `visual_overflow` 说明。父级与定位依赖分别确认，不以几何包含或位置依赖改树。机器检查结构、参照、合并依赖环及边界，语义与理由由人工确认；真实拆解事实变化时更新受影响确认，不自动改写已冻结项目工件。

基础、场景和显示层顺序按[公共工作流](../../app-creator-workflow/references/workflow.md)及各自的视觉证据执行。

effect-image 的布局拆解沿用串行确认：proposal 按原序冻结拆解事实，布局逐项继承真实父级与有效参照，分别计算 `parent_target_bounds`、`reference_target_bounds`。双轴对齐由显式视觉决策确定，不按最近距离猜测，不调序或替换参考图。`relative_position` 测量真实父框距离，锚点与 `offset` 使用定位参照；合并依赖图不得有环，根边界与已声明安全区保持一致，非根溢出须有理由。生成结果、审阅资料与独立布局确认消费同一批事实；变化只重验受影响关系，不检查布局摘要。

中心轴遵守[居中策略](../../phaser4-game-ui-layout/references/center-alignment.md)，从原 proposal 与决策独立复算最终位置，不改写原始测量。最终 V2 节点必须保存确定性 `layout_execution`；V4 effect-image 与 verified UI 按[Phaser 运行证据合同](../../phaser4-game-ui-layout/references/layout-runtime-evidence.md)消费同次真实对象采集。完整快照、实际父链、写入机制与已确认中心关系是共同要求，`usability` 保留原验收范围，不增加 exact 像素矩阵、SHA 校验或人工审批。

实施顺序和当前结果按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。

控制面读取 V2 布局候选目录的实际布局 PNG、节点 JSON、决策 JSON 和生成结果；如提供交互审阅页，另核验其真实文件及绑定，并把 `layout_nodes_file` 与 PNG、决策、拆解确认、proposal、target、scene/state 身份逐项复核。`review.html` 仅是候选审阅展示，不能改变状态或替代标准布局 PNG、F2 机器门；缺父节点、成环、越界、顺序/身份漂移或必要文件不可读取均拒绝。字段和页面约束见[离线布局审阅产物](../../phaser4-game-ui-layout/references/layout-review-artifacts.md)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。
