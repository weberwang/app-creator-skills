> 迁移说明：公共阶段流程唯一入口为 `$app-creator-workflow`，公共状态唯一入口为 `$app-workflow-control`。本文件完整保留原技术栈编排正文供领域参考，冲突处遵守当前仓库公共规则：未经用户明确要求不提交、不创建分支或 worktree；截图由用户人工检查。

---
name: app-creator-workflow
description: Use when the user asks to coordinate a Flutter app task across product, design, technical planning, implementation, review, or release stages.
---

# Flutter App Orchestrator

这是唯一入口路由器。先选择最小风险流程，再只加载当前阶段需要的 skill；专业 skill 不因“新建 Flutter 应用”自动全部启用。

## 最短流程

1. 预检仓库、现有决策、依赖、健康服务和项目原生命令。
2. 按[风险分级](../../flutter-subagent-delivery/references/task-risk-tiers.md)选择 `light`、`standard`、`high` 或 `release`。
3. 用[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)在当前对话中交接目标；普通单代理不创建 brief。只有跨角色交接、高风险持久审核或用户明确要求时才落盘。
4. 默认在当前分支的 checkout 由单写者顺序完成；风险只改变验证和审核深度。其他分支、worktree、提交、PR 或并行写入必须有用户明确授权。
5. 单写者完成改动后，报告推荐测试等级、理由、覆盖范围和命令，随后自动执行适用验证并根据结果修复或推进。没有真实命令证据不进入正式审核。
6. F1 只按实际变更分诊；普通审核使用可复算 `snapshot-id`，已有且获授权的提交才补充 commit SHA。
7. 仅派发触发的只读 F2 通道，F3 由 Controller 收敛。修复后只重跑失败或受影响命令，只让输入指纹变化的通道失效。

## 阶段路由

| 用户目标 | 仅在需要时加载 |
|---|---|
| 产品范围、MVP、用户故事 | `flutter-product-spec`，未决关键选择才用 `grilling` |
| UX/UI、页面语义、视觉方向 | `flutter-ux-ui-quality` |
| 自适应布局规格 | `adaptive-layout-implementation` |
| Code Sketch | `flutter-code-sketch` |
| 高保真目标图 | `flutter-hifi-mockup` |
| 固定视觉资产 | `flutter-asset-atlas` |
| 架构、依赖、API、迁移 | `flutter-tech-design` |
| Flutter 工程初始化 | `flutter-project-init` |
| 模块与任务拆分 | `flutter-implementation-plan` |
| 代码实现 | 项目本地 `flutter-dev` 或对应实现 skill |
| 质量审核 | `flutter-quality-review`，只加载触发的 rubric |
| 发布准备 | `flutter-release-readiness` |
| 明确要求并行可写任务/worktree | `flutter-subagent-delivery` |

## UI 例外流程

只有页面结构或视觉确实变化时才进入 UI 链：V1 实现并验证功能和页面语义，Code Sketch 按风险选择；仅选择草图路线时才执行相应草图审阅。V2 由用户确认视觉目标并回对已验证语义，V3–V5 完成布局合同、必要资产、正式组合及运行验收。布局规格中的 `phase: sketch` 是关系数据，不要求草图画面；默认 `usability`，明确要求 `exact` 时才强制 `phase: fidelity` 和完整同视口 parity。截图由用户人工检查，普通复用页按影响范围验证。

## 权威规则

- 风险、拓扑和场景路由：[task-risk-tiers.md](../../flutter-subagent-delivery/references/task-risk-tiers.md)
- F0–F3、snapshot 和失效：[review-funnel.md](../../flutter-quality-review/references/review-funnel.md)
- 工件创建条件：[artifacts.md](./artifacts.md)
- 并行写入边界：[collaboration-protocol.md](../../flutter-subagent-delivery/references/collaboration-protocol.md)
- 角色与派发：[subagent-map.md](./subagent-map.md)

README、任务简报和其他 skill 只链接这些权威规则，不复制整套流程。Markdown 只保存决策、证据和结论，不是状态机、自动化输入或合并信号。物理真机验收、发布和外部写入始终需要单独的明确授权。
