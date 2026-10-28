# 专业技能公共执行规范

本参考是五技术栈专业技能唯一的公共执行接线。Unity、Cocos Creator、Phaser、Three.js 与 Flutter 的专业技能继续定义各自的 API、项目文件、资产身份、工具、构建和技术验收；专业技能不再维护第二套全局 CLI、Work Item 状态机或审批账本。

## 当前控制记录

- 每项任务使用当前项目中的一个 Work Item；机器字段以 [Work Item Schema](../../app-workflow-control/schemas/work-item.schema.json) 和 [模板](../../app-workflow-control/templates/work-item.json) 为准。Work Item 绑定目标、技术栈、工作类型、阶段、允许/禁止路径、工程门状态、证据根和可选视觉/拷问引用。小型事实查询、文案或注释修正不必为了形式创建 Work Item。
- 实施前以 [Implementation Package Schema](../../app-workflow-control/schemas/implementation-package.schema.json) 冻结实施单元顺序、并行组与依赖、所有者、写入路径、结果文件路径和实际验收命令。并行组与依赖组的激活规则以[控制器实施执行参考](../../app-workflow-control/references/implementation-execution.md)为准。实施单元路径必须在 Work Item 允许范围内，并避开禁止范围；不要从 profile 的建议目录扩大工作项授权。
- 执行者实际运行单元中声明的命令，把退出码、逐条命令及非空原始输出路径记录到 [Execution Result](../../app-workflow-control/schemas/execution-result.schema.json)。`unit-check` 只校验结果、范围、顺序和组依赖，不替执行者运行验收命令，也不把文件名或命令文本当作成功证据。同一并行组的结果齐备后才激活依赖组。控制器在进入 `IMPLEMENTING` 时建立当前 evidenceRoot 的 `execution-state.json`，并由有效的 `unit-check` 更新执行状态。
- [Evidence Manifest](../../app-workflow-control/schemas/evidence-manifest.schema.json) 逐项引用真实文件与 `PASS`/`FAIL`/`NOT_RUN`，须绑定当前 Work Item、技术栈、实施包和适用视觉阶段。机器控制器检查文件和业务关系，不证明它实际执行过命令，不自动判断运行画面、音质、手感或素材质量。

领域参考中的 `baselineHash`、原生 Work Item、Implementation Package 或 Evidence 等字段只属于独立领域输入；按对应 `app-stack-<stack>/references/domain-validation.md` 准备，不得塞回当前公共 Work Item、实施包或 Evidence Schema，也不得据此建立第二套状态权威。已明确覆盖同一目标和动作的真实用户批准应复用原消息引用，不重复索要相同批准。

## 状态、视觉与决定

公共状态和转移以 [控制面](../../app-workflow-control/SKILL.md) 与 [六阶段及对象流程](workflow.md) 为准。六阶段为需求与范围、全局基线、基础工程、场景/页面/显示层生产、全局集成验证、发布；全局状态只能通过控制器支持的显式迁移。`run` 只自动推进满足门禁的安全早期阶段，在生产实现、发布和人工决定边界停止。

可见对象各自绑定 `SCENE`、`PAGE` 或 `DISPLAY_LAYER` Work Item 和 `objectId`；V0–V5 是对象进度，不是第二套全局状态。V1 验证功能，白盒按需使用；V2 确认视觉目标，V3 拆解与布局需要分别确认，V4 是正式素材和技术导入，V5 是正式组合和运行验收。阶段确认按 [Human Review Schema](../../app-workflow-control/schemas/human-review.schema.json) 记录对象、阶段/用途、决定、真实用户消息引用及适用质量项；技术通过不代替用户对显示结果的人工确认。

只在需要用户对产品目标、行为、预算、视觉方向或其他实质取舍作决定时使用 [Grilling Record](../../app-workflow-control/schemas/grilling-record.schema.json)，并通过 Work Item 的 `grillingRef` 绑定。OPEN 的问题阻止其影响范围；回答、决定和 `userMessageRef` 必须来自实际用户消息。没有待决取舍时不要制造拷问或审批记录。

## 唯一公共 CLI

从已安装技能的目标仓库根目录调用 `.agents/skills/app-workflow-control/scripts/workflow-control.mjs`。命令和参数以脚本 `OPTIONS` 为准；下面只列当前支持入口。在维护 `app-creator-skills` 仓库源码时，才将示例中的 `.agents/skills/` 前缀替换为 `skills/`：

```text
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs init --repo <项目路径> --stack <unity|cocos|phaser|threejs|flutter> --id <ID> --type <类型> --objective <目标>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs plan --repo <项目路径> --work-item <工作项相对路径> --spec <实际计划JSON相对路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs record --repo <项目路径> --work-item <工作项相对路径> --unit <单元ID> --report <真实执行报告JSON相对路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs reuse-visual --repo <项目路径> --work-item <新工作项相对路径> --source-work-item <已完成来源相对路径> --impact <implementation|layout|assets|target> --reason <未变化与受影响范围的事实说明>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs status --repo <项目路径> --work-item <项目相对 JSON 路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs check --repo <项目路径> --work-item <项目相对 JSON 路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs run --repo <项目路径> --work-item <项目相对 JSON 路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs transition --repo <项目路径> --work-item <项目相对 JSON 路径> --to <状态>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs visual-stage --repo <项目路径> --work-item <项目相对 JSON 路径> --to <V1|V2|V3|V4|V5>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs unit-check --repo <项目路径> --work-item <项目相对 JSON 路径> --result <项目相对结果 JSON 路径>
node .agents/skills/app-workflow-control/scripts/workflow-control.mjs lint --repo <项目路径>
```

`status` 与 `check` 只读；`run` 不执行专业工作、测试或发布。`transition --to RETURN` 还必须带 `--reason` 与 `--affected-scope`，恢复时使用控制器要求的 `--return-resolution`；不要手写 Work Item 状态绕过门禁。项目内文件引用使用 `/` 分隔的相对路径。

`init --mode light` 仅用于一个本地 FOUNDATION/MODULE 执行单元，直接进入 REVIEW，仍须真实 F0–F3 与原生工程证据。`plan` 根据实际输入生成并绑定实施包/空清单，可转录有理由的 F0/F1/F2 自评；`record` 从成功命令与非空原始输出生成单元结果并合并真实证据。两者不运行命令、不自动通过 F3/F4、不替代 `unit-check`。计划与报告字段见控制器的 `work-plan`、`execution-report` schemas/templates；冻结后不能覆盖记录，失败保持原报告供修复。

视觉增量先完成当前 V1 功能验证，再在 V2 用 `reuse-visual` 引用同项目/栈/对象已完成来源的基线及允许的 V2/V3 确认；其原始用户消息和文件不改写。V4 导入、V5 实际运行及最终人工验收仍由当前工作项完成。发布准备使用 `init --type RELEASE` 的默认 `prepare`，实际发布才显式 `--release-intent publish`；两者的完成证据分别为 `release-preparation` 与 `release-result`。

全局工程门 F0–F4 分别记录范围、目标与有效决定、领域质量、真实工程结果和受保护动作的精确授权事实。A0–A6 在产品流程中描述动作风险等级，不会因为等级本身产生新的 CLI 命令或审批阶段。普通任务范围内的本地工作依据当前用户请求和 Work Item 执行；`action.approval` 只绑定真实用户明确批准的具体副作用动作及对象。控制器只记录/校验状态，不执行真机、外部写入、签名、上传、付费、破坏性操作或发布。

## 验证与人工检查

代码改动后先推荐 T0–T3 等级，说明风险、覆盖和命令，再自动执行相应本地验证；普通测试不等待用户选择。T0 检查本次改动；T1 做最小相关测试、类型检查或 lint；T2 验证受影响模块并运行必要构建；T3 做全量测试、构建及已授权的关键流程冒烟。命令必须来自项目实际脚本、当前运行环境和对应技术栈规范；不得把不存在的命令写进计划。

运行失败先修复并重验当前范围；候选与上游事实未变、仅验证材料失效时只重验受影响门；目标或上游事实发生真实变化时，按 `transition` 明确进入 `RETURN` 并给出最小受影响范围。每项命令保存真实退出码与非空原始输出；缺少工具或平台时记为未验证，不伪造 PASS。普通本地验证不得自动启动真机、Player/Standalone、签名、上传或发布。

截图可以采集并附上检查点，但默认由用户人工检查显示效果；代理不得自动分析截图并据此判为视觉通过。只有用户明确要求自动视觉验证时才执行该分析，并且结果仍不能伪装成用户确认。

未经用户明确要求，不自动提交或推送 Git。交付时报告实际改动、执行等级与结果、失败和修复、未执行项、人工视觉验收或受保护动作的待办。各专业 Skill 只补充本栈的技术执行和证据要求，不重写这些公共职责。
