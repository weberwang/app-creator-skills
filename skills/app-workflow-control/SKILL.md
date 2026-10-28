---
name: app-workflow-control
description: 维护五技术栈共用的游戏和应用 Work Item、六阶段状态、V0–V5 对象阶段、功能依赖、执行结果与证据门；不直接编辑引擎项目，不运行构建、设备或发布操作。
---

# 统一工作流控制面

为 Unity、Cocos Creator、Phaser、Three.js 与 Flutter 保留一份权威状态机和证据合同。运行技术任务前加载对应 `app-stack-*` 的 `profile.json`，按当前技术栈读取编译、测试、资源导入和可视化运行规范。Unity 的 `.meta`、Cocos AssetDB、Phaser Vite、Three.js WebGL 和 Flutter 路由验证始终由技术 profile 决定。

## 状态和边界

- 六个阶段：需求与范围、全局基线、基础工程、场景与页面生产、全局集成验证、发布。全局状态只由控制器校验并按显式命令迁移；`run` 仅推进无需再次执行人工决定的早期安全阶段，停在生产实现或发布边界。
- `SCENE`、`PAGE`、`DISPLAY_LAYER` 各用独立 Work Item。显示层须设置 `visual.hostId/layerType`。对象按 V0 范围、V1 功能实现与验证、V2 目标、V3 拆解/布局双确认、V4 资源导入、V5 正式组合运行推进。V1 可用直接实现、已有功能或白盒，但须验证实际行为；白盒不是必需品。
  采用白盒时遵循[可辨识的功能原型](../app-creator-workflow/references/readable-functional-prototype.md)，将语义、状态和反馈检查并入现有 V1 验证，明确模拟范围，不新增审批或控制器字段。
- A0–A6 区分只读调查、规格、原型、生产实现、本地集成、外部状态/设备与发布风险。A4–A6 的外部写入、设备、签名、上传、付费和发布操作必须绑定精确动作、对象与真实用户消息引用。JSON 只追溯决策，不能自行证明身份或授权，也不能让 CLI 执行动作。
- F0–F4 保存需求范围、规格、领域质量、工程验证和高影响审批事实。PASS 只可在实际调查、证据和人工确认支持时记录；空文件、过期工作项或错栈证据不算通过。
- 失败优先修复当前事实并重验。上游范围或事实失效时显式 `RETURN`，必须提供 `--reason` 和 `--affected-scope`，控制器推导恢复入口并作废消费过的计划/证据路径。`BLOCKED`/`RETURN` 是控制记录；其恢复仍须重新满足有效拷问、审批与门禁。

## 工作项和文件

按 [schemas/work-item.schema.json](schemas/work-item.schema.json) 定义单个 JSON 工作项。生成新工作项用 CLI `init`，已有工作项引用指向项目里的机器记录：

- `implementationPackageRef` → 固定顺序实施包。单元默认串行；连续且至少两项的 `parallelGroup` 可形成并行批次，组内声明的目录/文件所有权必须互斥。`dependsOn` 只引用更早批次的单元，不会改变 `sequence` 顺序。
- `planningRef` → 本次实际计划及 F0/F1/F2 显式自评的来源文件。`plan` 生成关联实施包及空 Evidence Manifest，不自动通过任何门。
- `evidenceRef` → 当前实施包、工作项、技术栈及视觉阶段相同的 Evidence Manifest。每项必须是 profile 所需类别、真实非空文件，且位于当前 `evidenceRoot`。
- `visual.functionDependencies` → 按行为范围引用同项目同栈的非视觉功能工作项及其实际通过的证据；详见[功能范围与跨对象依赖](references/function-dependencies.md)。未使用共享功能依赖时由当前工作项完成 V1 工程验证；白盒可选。
- PAGE 和 DISPLAY_LAYER 的 `visual.domainEvidenceRef` → 当前 V2–V5 阶段的实际领域输入；具体合同及技术栈适用性见[单目标领域合同](references/single-target-domain.md)。
- `globalVisualBaselineRef` → 首次视觉基线，以 `{path,sha256}` 冻结基线文件；基线的 `selectionReviewRef` 同样绑定选择记录及其摘要。首次建立时为同条件三候选、唯一人工选择和五项质量判断；选择记录的 `targetRef/targetSha256` 绑定已选文件的实际内容。基线绑定同一 `projectId/stack`，可供后续工作项复用。仅选中候选须五项全 PASS；其他候选也逐项记录状态。
- `visual.targets` → SCENE 的全部正式视觉目标，逐项绑定目标 ID、候选、场景/状态/视口、目标文件指纹、领域证据、`reviews` 与 `assetReviewRef`；`coverageRef` 固定全部目标范围。PAGE 和 DISPLAY_LAYER 使用 `visual.reviews`。每项 `reviews` 引用记录确认文件的 `{path,sha256}`；确认记录再绑定实际目标、确认图和 SHA-256，V3 布局另绑定拆解确认。SHA 用于核对内容变化，不证明用户身份；用户确认不能伪造，不能拿一条记录关闭两个步骤。
- 目标清单、确认链、各栈领域证据和逐视图运行记录的具体字段见[场景多目标记录](references/multi-target-visual.md)。
- `assetReviewRef` → PAGE/DISPLAY_LAYER 的 V4 已导入素材、技术报告和同一候选的人工结果；SCENE 在各视觉目标下分别绑定素材评审。素材评审及场景 `integrationEvidenceRef` 均记录 `{path,sha256}`，重验文件内容；确认身份仍以真实用户消息为准。AI 位图记录生成来源及去 AI 味审阅；控制器只检查记录和文件，不自动判断图像是否有 AI 味。原生 UI 可以记录真实组件源码与组件检查，不伪造独立位图。
- `grillingRef` → 仅保存确有实质用户取舍的记录。OPEN 拷问停止相关工作；CLOSED 每项决定需有用户回答和消息引用；没有问题就不建立记录。

项目路径以 `/` 表示并相对 `--repo`；绝对路径、路径穿越、跨工作栈或跨执行单元改动会被拒绝。工作项的 `allowedPaths/forbiddenPaths` 是项目范围唯一授权来源，profile 中 `runtimeRoots` 仅提供初始化建议目录。

机器输出不证明命令曾运行。每项执行结果必须列出确实修改且存在的单元文件、与计划命令逐一对应的退出码和非空命令输出文件；`unit-check` 只校验结果，不执行命令。`status` 和 `check` 也只读。`check` 与 `run` 遇到阻断时返回非零状态。

`run` 的 STOPPED 表示控制器没有执行实际工作，不代表新增人工审批。已获当前任务授权的代理应继续明确的实施和显式迁移；只有真实缺少事实、实质取舍或受保护动作授权时，才向用户询问。

`status` 的 `metadata.activeBatch` 显示可提交结果的当前批次。并行批次的单元可以任意顺序提交，但需等待整批真实结果都通过后才会开放下一批。控制器为同一个 Work Item 的写操作加排他锁；遇到 `BUSY` 时重新读取状态后重试。字段和校验边界见[实施批次与结果状态](references/implementation-execution.md)。

`RELEASE` 默认 `releaseIntent=prepare`，检查或候选准备通过后，用 [release-preparation](templates/release-preparation.json) 绑定当前工作项及真实准备材料，可从 PASSED/INTEGRATING 正常完成。只有 `releaseIntent=publish` 才经过 F4、精确批准和 RELEASING；完成时必须有 [release-result](templates/release-result.json) 及实际发布凭据。两类完成结果分别标为 `release-prepared` 和 `release-published`，控制器与 `run` 均不执行发布。

## CLI

```text
node skills/app-workflow-control/scripts/workflow-control.mjs init --repo <项目路径> --stack <unity|cocos|phaser|threejs|flutter> --id <ID> --type <FOUNDATION|SCENE|PAGE|...> --objective <目标>
node skills/app-workflow-control/scripts/workflow-control.mjs plan --repo <项目路径> --work-item <项目相对JSON路径> --spec <实际计划JSON路径>
node skills/app-workflow-control/scripts/workflow-control.mjs record --repo <项目路径> --work-item <项目相对JSON路径> --unit <单元ID> --report <真实执行报告JSON路径>
node skills/app-workflow-control/scripts/workflow-control.mjs reuse-visual --repo <项目路径> --work-item <新工作项路径> --source-work-item <已完成来源路径> --impact <implementation|layout|assets|target> --reason <事实说明>
node skills/app-workflow-control/scripts/workflow-control.mjs refresh-function-baseline --repo <项目路径> --work-item <项目相对 JSON 路径> --spec <功能重验规格 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs status --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs check --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs check-action --repo <项目路径> --work-item <项目相对 JSON 路径> --action-id <动作ID> --effect <受保护效果> --target <目标>
node skills/app-workflow-control/scripts/workflow-control.mjs run --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs transition --repo <项目路径> --work-item <项目相对 JSON 路径> --to <状态>
node skills/app-workflow-control/scripts/workflow-control.mjs visual-stage --repo <项目路径> --work-item <项目相对 JSON 路径> --to <V1|V2|V3|V4|V5>
node skills/app-workflow-control/scripts/workflow-control.mjs unit-check --repo <项目路径> --work-item <项目相对 JSON 路径> --result <项目相对结果 JSON 路径>
```

`init` 只生成 Work Item，不覆盖已有记录。PAGE/SCENE/DISPLAY_LAYER 必须建立或复用已确认的全局视觉基线，V1 功能验证不等待选图；无视觉生产的局部工程任务使用非视觉工作项，不要求视觉基线。

单个无视觉生产的本地 FOUNDATION/MODULE 修复可用 `init --mode light`，从 REVIEW 起步；仍须 F0–F3、单个独立实施单元和当前栈必需证据。普通任务默认 `standard`，视觉、发布、集成或受保护动作使用普通流程。纯查询、文案或注释通常无需建立工作项。

实际计划和执行报告使用 [work-plan](templates/work-plan.json)、[execution-report](templates/execution-report.json)。记录工具从当前工作项推导身份和路径，`plan` 收窄范围，`record` 合并真实证据；不执行命令、不伪造输出、不自动设置 F3/F4。成功记录后仍需 `unit-check` 及后续实际验证门。

可在准备阶段提前登记受保护动作及目标，不必为完成本地准备提前取得批准。实际执行外部写入、设备、签名、上传、付费、破坏性操作或发布前，先核对用户明确授权，并对每个受保护效果运行 `check-action`；动作 ID、效果和目标必须与记录及批准一致，F4 必须通过。发布还须先进入 `RELEASING`。该命令只读、不执行动作，也不能自行验证用户身份或阻止调用者绕过检查；执行者仍须遵守明确授权边界。

当前功能 V1 验证后，视觉增量用 `reuse-visual` 校验来源并引用未变化的基线和 V2/V3 确认；同项目、技术栈、对象、候选及显示层宿主必须匹配，源工作项须 COMPLETE/V5。布局变化重新确认布局，目标变化重新确认目标；当前 V4/V5 和工程证据仍独立产生。完整规则见[统一流程](../app-creator-workflow/references/workflow.md#视觉确认的增量复用)。

使用 [templates/](templates) 中同名合同记录真实实施包、结果、人工阶段确认、全局基线、素材评审和拷问。不要在已通过的证据里放模板占位符。
