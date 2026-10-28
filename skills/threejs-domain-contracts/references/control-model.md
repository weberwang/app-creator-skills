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

全局 brief 使用结构化项目美术 JSON，明确主题、受众、核心循环、体验目标、观看情境、视觉层级与三层刺激预算。选择根/决定合同为 1.1，三候选各记录五项实际人工质量结果，所选候选全部通过才可冻结；三张均失败时保持待定并返工，不以“相对最好”放行。字段与文件门见[Schema](./schemas.md#视觉阶段-schema)。场景目标、资源组合和持续游玩沿用[游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)与现有确认节点；V4 运行候选内的 `artExperienceAcceptance` 缺失或非通过时不得完成，机器事实出口不能替代用户视觉验收。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-sequence.md#弹窗工作项与场景解耦)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#弹窗工作项与场景解耦)。

受保护副作用的实际对象、动作和明确批准按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)核对。

## 实施顺序状态硬门

effect-image 的 V2 功能归属是拆解确认的一部分，遵守[功能语义分组约束](../../threejs-game-ui-layout/references/functional-semantic-grouping.md)。最终元素必须显式声明 `parent_element_id` 与 `semantic_grouping.kind/rationale`；位置依赖决定父子归属，共同表达同一信息且没有位置依赖的元素列为同组同级项，布局严格继承，不以几何包含兜底。机器检查归属结构和身份，语义判断由人工确认；新增容器、归属或理由变化返回拆解确认并使旧布局身份失效，不自动改写已冻结的项目工件。

基础、场景和显示层顺序按[公共工作流](../../app-creator-workflow/references/workflow.md)及各自的视觉证据执行。

effect-image 的布局拆解在控制面按串行顺序处理：先在确认 proposal 中按原顺序冻结 `decomposition_elements`，再由布局阶段逐项继承 `parent_element_id` 为 `parent_layout_node_id` 并计算 `parent_target_bounds`。智能布局必须结合原图构图、视觉重心和元素语义，按同一顺序生成唯一决策并显式声明 `axis_alignment.horizontal=left|center|right` 与 `vertical=top|center|bottom`；不得依据四边距离自动决定对齐，也不得调序、生成多个布局方案或重新生成/替换视觉参考图。布局标注 PNG 只在冻结原图上叠加父子框与右栏说明。`relative_position` 记录相对真实父框的测量和漂移复核，声明 `visual_overflow.reason` 的普通父框可出现负距，`offset` 与两个 `${vertical}-${horizontal}` 锚点按显式视觉决策计算。`reference_id` 使用 `ui_layout.position_reference_id`，省略时等于真实父 ID；定位参照可为同级、祖先或 `viewport`/`safe-area` 合成根，父级与参照依赖合并后不得成环。显式溢出不扩大父框，viewport 与实际安全区硬边界仍须满足；视觉决策或父子几何实际变化时只重验受影响关系，不检查布局摘要。

实施顺序和当前结果按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)执行。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。

控制面读取 V2 布局候选目录的实际布局 PNG、节点 JSON、决策 JSON 和生成结果；如提供交互审阅页，另核验其真实文件及绑定，并把 `layout_nodes_file` 与 PNG、决策、拆解确认、proposal、target、scene/state 身份逐项复核。`review.html` 仅是候选审阅展示，不能改变状态或替代标准布局 PNG、F2 机器门；缺父节点、成环、越界、顺序/身份漂移或必要文件不可读取均拒绝。字段和页面约束见[离线布局审阅产物](../../threejs-game-ui-layout/references/layout-review-artifacts.md)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#实施顺序状态硬门)。
