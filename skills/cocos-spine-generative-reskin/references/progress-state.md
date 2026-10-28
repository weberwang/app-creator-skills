# 进度清单 Schema v3 与状态机

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#进度清单-schema-v3-与状态机)。

## Alpha 结构合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#alpha-结构合同)。

## 状态

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#状态)。

`mark` 只能写 `pending/generating/generated/failed`，不能手工伪造 `validating/packed/runtime_validating/completed`；存在批次计划时只能写当前批。正式 `batch accept` 在审阅图和候选 SHA 通过后推进当前批 Cell 到 `validating` 并锁定批次；`pack` 要求全部批次 `ACCEPTED+locked`，成功只进入 `packed`；`runtime-validate` 先通过结构化 Cocos 报告，`finalize` 才推进运行态闭环。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#状态)。

## 哈希与锁

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#哈希与锁)。

## 完成不变量

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-progress-state.md#完成不变量)。
