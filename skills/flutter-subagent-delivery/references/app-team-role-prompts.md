# 公共角色契约

使用前先填写[八字段任务契约](../../flutter-implementation-plan/references/task-brief-template.md)，再为每个 agent 选择一个核心角色和至多一个专项模板。普通单代理不需要角色卡；本文件不创建运行时状态。

## 角色卡输入

```text
角色：<Controller / Product / UX/UI / Tech / Flutter / Backend / QA / Release>
Agent ID：<id>
任务 ID：<id>
阶段：<stage>
DRI：<Yes / No>
独立验收者：<不同 agent；不需要时写无>
八字段任务契约：<路径或八项内容>
已接受输入：<路径和事实>
读写范围：<精确路径；只读时明确写只读>
Snapshot：<审核时填写；实现时可无>
```

## 公共返回契约

```text
状态：DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
摘要：<一个结果句>
输出：<路径或结论>
变更文件：<路径列表；只读时写无>
验证结果：<实际命令、证据和覆盖范围>
Gate 结论：<通过 / 需修改 / 阻塞>
缺失证据：<无则写无>
阻塞项：<阻塞原因；无则写无>
剩余风险：<影响、责任人和下一步>
```

`NEEDS_CONTEXT` 必须指出缺失输入及其所有者；`BLOCKED` 必须指出尝试、阻塞和解除条件；不得用 `DONE` 掩盖未执行命令。审阅者只读，不编辑 Controller 的 brief/review；任何外部写入或发布都在授权边界之外。

## 核心角色差异

| 核心角色 | 只负责 | 不负责 |
|---|---|---|
| Controller | 路由、用户决定、Gate 和唯一持久记录 | 冒充缺失的专业结论 |
| Product / UX/UI | 业务范围、语义、视觉和可访问性输入 | 写生产代码或替用户确认 |
| Tech / Backend | 架构、契约、服务/数据实现及风险 | 改变未确认产品范围 |
| Flutter | 约定范围内的生产实现、测试和证据 | 自审放行或声称未执行的平台通过 |
| QA | 指定 F2 事实的独立只读判断 | 修代码或重做未触发维度 |
| Release | 可复现构建、渠道、监控和回滚判断 | 未授权发布或生产修改 |

## 使用规则

所有角色遵守契约中的写入范围和授权边界。仅消费 Controller 标记为已接受的上游事实；需要决策时返回 `NEEDS_CONTEXT` 给 Controller。只读并行不改变单写者默认拓扑。
