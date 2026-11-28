---
name: app-workflow-control
description: 维护游戏、应用、设备 GUI 与服务器共用的 Work Item、七阶段状态、功能依赖、执行结果与证据门；有显示对象时使用 V1–V5，不直接运行工程、设备或发布操作。
---

# 统一工作流控制面

## 状态和边界

- 控制器是 [七阶段](../app-creator-workflow/references/workflow.md#七阶段)、状态和证据的权威。PROJECT 承担立项、需求与基础基线，MODULE 承担功能，INTEGRATION 的 `feature` 对应跨模块集成、`final` 对应整体验收。发布单独委托。
- F0–F4 分别记录范围、规格、领域质量、工程验证及受保护动作的明确授权。只以当前范围内的真实决定和证据登记通过。执行真机、外部写入、签名、上传、付费、破坏性操作或发布前使用 `check-action` 核对动作、对象、用户消息和 F4。
- `status/check` 只读，阻断时 `check` 返回非零；`run` 只推进允许的控制状态，停在 REVIEW 或 IMPLEMENTING 时，按已有授权继续实际工作。失败先修复并重验，上游目标或范围失效才用 `RETURN`，带真实原因和影响范围。
- 只在涉及可见对象时读[全局视觉与模块门禁](references/version-visual-gate.md)，按适用路线处理 SCENE、PAGE 或 DISPLAY_LAYER。实际显示交用户人工确认，分别报告[结构、工程和人工视觉结论](../app-creator-workflow/references/verification.md#三类验收结论)。

## 工作项和文件

按 [Work Item Schema](schemas/work-item.schema.json) 及当前栈的 `profile.json` 确认类型和实际验证入口。纯查询、文案或注释通常直接处理。单个无视觉生产的本地 FOUNDATION/MODULE 修复可用 `init --mode light`，从 REVIEW 起步；仍须 F0–F3、一个独立实施单元和本栈证据。正式功能、视觉、集成及发布按 `standard` 推进。

- `planningRef` 冻结计划文件和有依据的 F0/F1/F2 自评；`implementationPackageRef` 绑定单元所有权、冻结验收命令和顺序。[实施批次与结果状态](references/implementation-execution.md)规定 `parallelGroup`、`dependsOn` 与活跃批次；`status` 的 `metadata.activeBatch` 指示可提交的单元。
- 每份正式计划填[系统与模块覆盖](../app-creator-workflow/references/system-module-coverage.md)。最终集成按 `integrationScopeRef.systemCoverageMappings` 核对来源系统、前批次和本轮用例。复杂分批任务按需读取[生产范围](../app-domain-toolkit/references/incremental-production.md#按需绑定机器范围)，使用 [范围模板](templates/production-scope.json)。
- `evidenceRef` 绑定当前工作项、实施包、技术栈及适用的视觉阶段。命令输出、结果和公开清单条目位于 `evidenceRoot`；结果文件及删除记录按单元所有权检查。项目路径相对 `--repo`，使用 `/`；以 `allowedPaths/forbiddenPaths` 为范围。
- 实质取舍才记录 `grillingRef`，待决时只阻断依赖项。控制器对同一 Work Item 的写操作加锁；遇到 `BUSY` 先读状态再重试。输出命名、文件引用和交付遵循[输出文件规范](../app-creator-workflow/references/output-files.md)。
- 从零游戏项目的阶段 1–3、人工确认和回退按[游戏项目阶段](references/game-project-stages.md)执行，后续工作项绑定相同项目及架构模板。每次触发工作流后最终答复末行只写一行进度，例如 `进度 5/V1·待确认`。非视觉省略 V，发布用 `发布`。优先复用已知状态或 `metadata.progress`，未知时仅调用一次 `status --progress`，仍未知写 `进度 未登记`。纯查询未触发工作流时省略。

## CLI

在项目根执行 `node .agents/skills/app-workflow-control/scripts/workflow-control.mjs <命令> --repo <项目路径> ...`；维护本仓时将 `.agents/skills/` 换为 `skills/`。除 `init` 等项目级命令外，以 `--work-item <项目内相对路径>` 指定工作项。

| 命令 | 使用方式 |
| --- | --- |
| `init` | `--stack <技术栈> --id <ID> --type <类型> --objective <目标>`。PROJECT 可用 `--stage commercial-initiation\|requirements-scope\|global-baseline`；INTEGRATION 用 `--integration-purpose feature\|final`。有显示对象时另读[视觉初始化](references/version-visual-gate.md#视觉路由与初始化)。 |
| `status`、`check`、`run` | 读取当前状态、检查门禁或推进安全控制状态。`status --progress` 只输出一行，用于最终回复缺少当前进度时。 |
| `plan` | `--spec <计划路径>`，用 [计划模板](templates/work-plan.json) 冻结实施包和空证据清单，收窄单元范围。 |
| `record` | `--unit <单元 ID> --report <报告路径>`。按 [执行报告模板](templates/execution-report.json) 引用冻结命令序号和实际输出；结构化采集包含退出码，普通文本日志需提供退出码。结果保留完整冻结命令。 |
| `unit-check` | `--result <结果路径>`，核对结果和证据绑定。失败命令、占位命令或缺少真实输出均无法通过。静默命令使用 [命令采集](scripts/capture-command.mjs) 保存真实记录。 |
| `transition` | `--to <状态>`；`RETURN` 需 `--reason` 和 `--affected-scope`，恢复时按要求提供 `--return-resolution`。 |
| `game-stage` | 从零游戏项目用 `--work-item <PROJECT路径> --spec <当前阶段JSON>` 提交阶段 1–3，或用 `--return-to <1\|2\|3> --reason <原因>` 回退；见[游戏项目阶段](references/game-project-stages.md)。 |
| `check-action` | `--action-id <动作 ID> --effect <受保护效果> --target <对象>`，逐效果核对精确批准；发布还须进入 `RELEASING`。 |

`plan`、`record`、`unit-check` 不运行验收命令。实施者根据真实工程证据完成 F3，F4 绑定实际授权。视觉的 `visual-stage`、`reuse-visual` 及对应证据查[视觉工作项](references/version-visual-gate.md#视觉工作项字段)；功能重验查[功能依赖](references/function-dependencies.md)。

`RELEASE` 默认 `releaseIntent=prepare`，使用 [准备模板](templates/release-preparation.json)。真实发布须显式选择 `init --release-intent publish`，并绑定 [发布结果](templates/release-result.json)。发布准备和发布完成分别按证据报告。
