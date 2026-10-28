# 状态、阶段与停止门

场景和弹窗按[场景与显示层职责](../../app-domain-toolkit/references/reference-domain-display-ownership.md)分别验收。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#状态阶段与停止门)。

## 全局状态

Work Item 状态、阶段、用户决定、BLOCKED/RETURN 与恢复规则以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)及公共控制器 Schema 为唯一准据；此文件只说明本栈领域证据。

## 三级处置

本栈视觉校验器将结果分类为 `repair`（修复当前事实）、`revalidate`（重验受影响证据）或 `return`（上游事实失效等须返回的情况）；它们是领域 disposition，而不是控制器命令。需要返回时按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)使用当前 transition 和真实原因、影响范围；恢复点及字段由公共控制器推导。

## 统一阶段

G0–G3 是[游戏生产里程碑](../../app-domain-toolkit/references/reference-orchestration-quality-gates.md)；工作项统一使用 V0–V5，其中 V1 实现并验证功能，白盒可选，V2–V5 分别对应视觉目标、拆解布局、资源导入和运行验收。实际阶段、状态和迁移使用[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)。

## V0/V1/V2/V3/V4/V5 机器状态依赖

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#v0v1v2v3v4v5-机器状态依赖)。

## 全局视觉冻结与实施顺序

全局选择的 brief/质量门按[Schema](./schemas.md#视觉阶段-schema)和[游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)执行：结构化 brief 必须绑定生产者并定义三层刺激预算，所选候选的主题、受众、可读性、静态舒适和完成度人工结果全部通过，且根与实际决定文件一致，才可冻结。全不合格或缺少实际人工评价时不得放行。静态基线通过不推导持续游玩通过；V5 实际运行候选内的 `artExperienceAcceptance` 必须绑定当前身份、真实动态片段与通过的实际用户结果，缺失、失败或未验证都阻断完成门。该材料属于既有运行验收，不新增审批阶段。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#全局视觉冻结与实施顺序)。

## 高保真前置

`highFidelityPrerequisite` 必须是不可变引用：`workItemId`、`status=COMPLETE`、`stage=V3`、`frozen=true`、`sceneId`/`displayLayerId`/`hostSceneId`、仓库内相对 `evidenceFile`；摘要字段可选且不参与验收。证据文件须为 `threejs-scene-v2-reconstruction-plan/1.0` 的单一场景根结果：根提供 `sceneMaster`、`sceneReconstructionContract`、`decompositionAnnotation`、`technicalDecomposition`、`visualDecompositionConfirmation`、`visualProductionContract`、`visualProductionUnits` 和 `displayLayerContexts[]`。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#高保真前置)。

## 强制停止门

状态、范围与停止条件以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为准。

- 本栈原生校验器仅检查其技术栈对象；跨栈任务仍按公共控制协议执行。

## 视觉生产硬门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-gates.md#视觉生产硬门)。
