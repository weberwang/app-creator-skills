# 角色与派发地图

本文件只定义“何时启用谁”；角色卡和返回格式见[公共角色契约](../../flutter-subagent-delivery/references/app-team-role-prompts.md)，专项差异见[四类提示模板](../../flutter-subagent-delivery/references/subagent-prompts.md)。默认单写者，只有用户明确授权并行可写任务时才组装多个写入者。

## 核心角色

| 角色 | 负责范围 | 默认何时启用 |
|---|---|---|
| Controller | 风险、排序、用户决定、Gate、冲突和最终集成 | 始终 |
| Product Manager | 价值、范围、指标、业务验收 | 新范围或产品决策 |
| UX/UI Lead | 流程、语义、视觉、无障碍、设计交接 | 用户可见结构/交互变化 |
| Tech Lead | 架构、依赖、契约、非功能风险 | 共享基础、跨模块、数据或技术决策 |
| Flutter Engineer | 客户端实现与测试 | Flutter 代码变化 |
| Backend/Data Engineer | API、认证、数据、迁移、服务测试 | 服务端/数据在范围内 |
| QA Engineer | 独立证据、回归和质量结论 | F2 被触发或验收需独立定义 |
| DevOps/Release Engineer | 构建、环境、签名、发布和回滚 | 发布或交付基础设施在范围内 |

## 路由

| 任务特征 | DRI | 条件性独立验收 |
|---|---|---|
| 文案/窄修复 | 当前范围所有者 | `light` 自检 |
| 普通功能或 Bug | Flutter/Backend Engineer | 行为或验收变化启用 QA |
| 页面结构或视觉 | UX/UI 或 Flutter Engineer | 页面风险触发 Code Sketch/Visual QA |
| 认证、支付、迁移、共享契约 | Tech Lead 或 Backend/Data | QA + 技术，必要时 Product |
| 发布、生产、分发 | DevOps/Release | QA + 技术 + Release |

只读探索和互不依赖的 F2 可以并行。任何可写并行都要用户明确授权、共同基线和互斥范围；不要把角色名当成必需团队规模。

## 派发包

每次只传：一个核心角色、可选一个专项模板、[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)、已接受的上游路径、精确读写范围、获授权的验证命令、snapshot（审核时）和独立验收者身份。禁止粘贴完整会话或上游全文。

角色遇到缺失事实返回 `NEEDS_CONTEXT`，遇到无法执行返回 `BLOCKED`；不得猜测用户决定、扩大范围或批准自己的产出。Controller 只在确认返回包后记录接受结果。
