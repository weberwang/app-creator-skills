# 协作协议

## 默认拓扑

所有风险等级默认在当前分支的 checkout 使用一个写入者顺序完成。风险只改变验证和审核深度；只读探索和独立 F2 审核可以并行。普通单代理直接使用八字段任务契约，不创建 brief、账本或状态文件。

## 显式并行

只有用户明确授权分支、worktree、提交、PR 或并行写入，Controller 才能启用对应动作。授权记录必须包含共同基线、每个 DRI、互斥写入范围、共享资源所有者、验证命令和授权边界；没有这些事实就返回 `NEEDS_CONTEXT`。依赖、路由、主题、生成文件、共享状态、迁移和单页 layout-spec 始终由一个写入者串行负责。

交接只传[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)、已接受路径和最小证据；不粘贴会话或上游全文。不创建 YAML/JSON 状态机，不根据 Markdown 自动合并、清理或发布。

## 审核与记录

实现者先执行获授权的 F0，Controller 再按[审核漏斗](../../flutter-quality-review/references/review-funnel.md)分诊。F2 审阅者只读并绑定 snapshot-id；只有高风险/发布持久验收、跨角色交接或用户要求时才创建 brief/review，且 Controller 是 review 唯一写入者。

修复后只重跑失败或受影响命令，只重开输入指纹变化的通道。已有且获授权的提交才记录 SHA；外部写入、发布和真机验收另行授权。早期启动/路由/插件及关键流烟测只能证明各自覆盖，完整平台矩阵属于最终集成/发布。
