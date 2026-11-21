---
name: app-workflow-control
description: 维护游戏、应用、设备 GUI 与服务器共用的 Work Item、七阶段状态、功能依赖、执行结果与证据门；有显示对象时使用 V1–V5，不直接运行工程、设备或发布操作。
---

# 统一工作流控制面

大场景和复杂应用分批时使用[多状态与多步骤生产](../app-domain-toolkit/references/incremental-production.md)定义总范围、本批范围与最终覆盖；开发批次顺序和游戏／应用运行步骤分别记录，控制器不会自行运行功能或判断截图。

为 Unity、Cocos Creator、Phaser、Three.js、Flutter、Expo、ESP32 与 Node.js 保留一份权威状态机和证据合同。运行技术任务前加载对应 `app-stack-*` 的 `profile.json`，按当前技术栈读取编译、测试、资源导入和可视化运行规范。Unity 的 `.meta`、Cocos AssetDB、Phaser Vite、Three.js WebGL、Flutter 路由及 Expo 原生/Web 验证始终由技术 profile 决定。

## 状态和边界

- [通用七阶段](../app-creator-workflow/references/workflow.md#七阶段)从商业立项到模块集成与整体验收。阶段 ID、类型和状态由控制器检查。PROJECT 可按 `init --stage commercial-initiation|requirements-scope|global-baseline` 建立对应策划工作项；MODULE 属于模块实现；`INTEGRATION` 的 `feature` 属于跨模块集成，`final` 属于整体验收。发布是独立明确委托的工作项。
- `SCENE`、`PAGE`、`DISPLAY_LAYER` 各有独立 Work Item。第 4 阶段确认并冻结全局视觉方向。第 5 阶段 V1 确认完整模块方案，V2 生成并确认全状态和进度稿，V3 拆解同一确认稿，V4 准备资源和接口，V5 完整实现与模块验收。Flutter、Expo 默认使用 [Figma App 路线](../app-ui-layout/references/figma-app-design.md)，ESP32 按硬件约束选用；游戏图片与无图 3D 沿用各自证据合同。
  多个 `PAGE` 按[多页面推进顺序](../app-domain-toolkit/references/incremental-production.md#多页面推进顺序)选择代表页、复用共享部分并按依赖调度；各对象阶段独立，不默认全页同步。实施包内的批次门禁只约束该包的执行单元，不构成不同页面必须同步推进的要求。
  按需采用[轻量原型](../app-creator-workflow/references/readable-functional-prototype.md)验证风险。所有正式视觉对象按[模块阶段门禁](references/version-visual-gate.md)绑定第 4 阶段确认来源与 V1 方案；进入 V2 前确定机制、状态、流程和适用组合规则，未决实质规则做 grilling。V2 核对全部状态与进度后进 V3。改模块稿回 V2，改共享视觉方向回第 4 阶段。
- A0–A6 区分只读调查、规格、原型、生产实现、本地集成、外部状态/设备与发布风险。A4–A6 的外部写入、设备、签名、上传、付费和发布操作必须绑定精确动作、对象与真实用户消息引用。JSON 只追溯决策，不能自行证明身份或授权，也不能让 CLI 执行动作。
- F0–F4 保存需求范围、规格、领域质量、工程验证和高影响审批事实。PASS 只可在实际调查、证据和人工确认支持时记录；空文件、过期工作项或错栈证据不算通过。
- 结构完成、工程通过和用户人工确认的视觉通过按[验收结论](../app-creator-workflow/references/verification.md#三类验收结论)分别报告；这是对已有证据的解释，不增加控制器状态或字段。节点、参数、测试和截图采集结果不能代替用户确认，机器检查不证明显示效果通过。
- 失败优先修复当前事实并重验。上游范围或事实失效时显式 `RETURN`，必须提供 `--reason` 和 `--affected-scope`，控制器推导恢复入口并作废消费过的计划/证据路径。`BLOCKED`/`RETURN` 是控制记录；其恢复仍须重新满足有效拷问、审批与门禁。

## 工作项和文件

游戏 3D 世界可显式选择[无图场景路线](references/world3d-scenes.md)：`init --design-route world-3d`，仅用于五游戏栈 SCENE。它以 V1 必需的白模、空间规格、单次审查、人工空间／方向确认、模型规格、导入与运行记录替代图片目标和 V3 两图硬门；不改变 2D、UI 或 Figma 默认流程。以下游戏三候选及多图条款针对原图片路线，不强加到 world-3d；原工程门和用户最终显示确认保持。世界模型不伪装成原生 UI。

游戏 `SCENE` 默认使用 `world-2d`，纯界面场景使用 `init --design-route game-ui`。二维世界可用 `visual.sceneDesignRef:{path,sha256}` 引用[二维空间合同](schemas/world2d-scene.schema.json)，三维世界沿用其场景合同。V1 确认模块空间、状态、进度与验收方案，按风险选择原型、运行验证及必要的空间确认；V2 制作并确认模块稿，V5 验证实际运行。

`world-3d` 中真实存在的常驻 HUD 使用同一工作项的 `visual.hud`，按[HUD 交接](references/world3d-scenes.md#persistent-hud)继续原 UI 图片、拆解布局、资源与运行确认链；没有 HUD 不生图。代表样本及批量范围按需使用[样本依赖声明](references/implementation-execution.md#sample-dependencies)，在原执行批次中检查覆盖、依据版本和有效样本，不新增审批或自动确认。

输出分类、命名与交接遵循[工作流输出文件规范](../app-creator-workflow/references/output-files.md)，控制器路径仍以本技能实际工具与 Schema 为准。`Execution Result.files` 是单元所有权内的改动交付文件，`resultPath`、命令 `outputFile` 与公共 Manifest 条目按各自约束位于当前 `evidenceRoot`；目录规范不扩大字段、写入权限或自动归档能力。

按 [schemas/work-item.schema.json](schemas/work-item.schema.json) 定义单个 JSON 工作项。生成新工作项用 CLI `init`，已有工作项引用指向项目里的机器记录：

- `implementationPackageRef` → 固定顺序实施包。单元默认串行；连续且至少两项的 `parallelGroup` 可形成并行批次，组内声明的目录/文件所有权必须互斥。`dependsOn` 只引用更早批次的单元，不会改变 `sequence` 顺序。
- `planningRef` → 用 `{path,sha256}` 固定本次实际计划及 F0/F1/F2 显式自评的来源文件。`plan` 生成关联实施包及空 Evidence Manifest，不自动通过任何门；规划后改写来源须 RETURN 并重新规划。
- 实施包的 `systemCoverage` → [需求、系统／模块、设计、任务与验证覆盖](../app-creator-workflow/references/system-module-coverage.md)。游戏及非游戏共用；每份计划必填，统一加载器与进入实施的执行快照核对同一内容。缺设计、本批需求关联后置／未决模块、孤立任务或验收命令错绑均阻断，手写包及 light 也不例外；原始需求完整性仍由 F1/F2 实际审查。
- 最终 `integrationScopeRef` 的 `systemCoverageMappings` → [来源系统到最终用例与命令的闭环](../app-creator-workflow/references/system-module-coverage.md#最终集成的系统覆盖闭环)，覆盖本轮正式实现及实际功能／生产前批。独立系统和独立前批分别由范围 `systemSources/productionSources` 纳入，已绑定总范围不得漏批；结果须指向同一单元真实输出。
- `evidenceRef` → 当前实施包、工作项、技术栈及视觉阶段相同的 Evidence Manifest。每项必须是 profile 所需类别、真实非空文件，且位于当前 `evidenceRoot`。
- `visual.functionDependencies` → 按行为范围引用同项目同栈的非视觉功能工作项及其实际通过的证据；详见[功能范围与跨对象依赖](references/function-dependencies.md)。V1 记录依赖方案，V5 验证真实功能来源及模块组合，已实现的共享功能可明确复用。
- PAGE 和 DISPLAY_LAYER 的 `visual.domainEvidenceRef` → 当前 V2–V5 阶段的实际领域输入；具体合同及技术栈适用性见[单目标领域合同](references/single-target-domain.md)。
- `globalVisualBaselineRef` → 用 `{path,sha256}` 冻结方向及真实选择。非游戏 App 使用 [figma-app-baseline 模板](templates/figma-app-baseline.json)，默认一张代表页效果图，用户确认后重建可编辑 Figma；用户明确要求比较时按其数量制作实质不同的方向，并允许明确组合及有效局部复用，每项绑定冻结原图、来源与真实选稿依据；选中目标再关联重建节点。游戏图片路线使用原 [global-visual-baseline 模板](templates/global-visual-baseline.json)，保持三候选及五项人工判断；world-3d 使用[无图方向模板](templates/world3d-visual-baseline.json)。选择绑定真实用户消息，结构或工具成功不能生成视觉 PASS。
- `visual.targets` → 二维世界及游戏 UI 的完整图片目标与累计覆盖，继续原领域合同；world-3d 改用其场景合同。PAGE／DISPLAY_LAYER 使用 `visual.reviews`；Figma 领域封套以 `figmaDesignRef` 冻结 fileKey、nodeId、状态、视口、结构与预览，V3 的 `figmaHandoffRef` 将节点属性实际对照原生规格，不要求额外 V3 两图或两次批准。同稿状态可用 V2 `approvedTargetRefs` 精确覆盖已确认源图。V4/V5 仍验当前原生资源和运行材料，样本不提升为整页通过。摘要不证明用户身份或视觉质量。
- 目标清单、确认链、各栈领域证据和逐视图运行记录的具体字段见[场景多目标记录](references/multi-target-visual.md)。
- `assetReviewRef` → PAGE/DISPLAY_LAYER 的 V4 已导入素材、技术报告和同一候选的人工结果；图片 SCENE 在各视觉目标下分别绑定素材评审，world-3d 在工作项根绑定模型评审。素材评审及图片场景 `integrationEvidenceRef` 均记录 `{path,sha256}`，重验文件内容；确认身份仍以真实用户消息为准。AI 位图记录生成来源及去 AI 味审阅；控制器只检查记录和文件，不自动判断图像是否有 AI 味。原生 UI 可以记录真实组件源码与组件检查，不伪造独立位图。
- `grillingRef` → 仅保存确有实质用户取舍的记录。OPEN 拷问停止相关工作；CLOSED 每项决定需有用户回答和消息引用；没有问题就不建立记录。

项目路径以 `/` 表示并相对 `--repo`；绝对路径、路径穿越、跨工作栈或跨执行单元改动会被拒绝。工作项的 `allowedPaths/forbiddenPaths` 是项目范围唯一授权来源，profile 中 `runtimeRoots` 仅提供初始化建议目录。

机器输出不证明命令曾运行。每项执行结果必须列出确实修改且存在的单元文件、与冻结计划一致的实际可复跑命令、真实退出码和非空原始输出文件；占位命令如 `<执行某项检查>`、TODO 在计划、结果和采集入口均被拒绝。静默成功用真实 `command-capture-v1` 保存 command、exitCode、stdout、stderr，不伪造一行成功日志。`unit-check` 只校验结果，不执行命令；`status` 和 `check` 也只读，阻断返回非零状态。

`run` 的 STOPPED 表示控制器没有执行实际工作，不代表新增人工审批。已获当前任务授权的代理应继续明确的实施和显式迁移；只有真实缺少事实、实质取舍或受保护动作授权时，才向用户询问。

`status` 的 `metadata.activeBatch` 显示可提交结果的当前批次。并行批次的单元可以任意顺序提交，但需等待整批真实结果都通过后才会开放下一批。控制器为同一个 Work Item 的写操作加排他锁；遇到 `BUSY` 时重新读取状态后重试。字段和校验边界见[实施批次与结果状态](references/implementation-execution.md)。

另行明确委托的 `RELEASE` 默认 `releaseIntent=prepare`。检查或候选准备通过后，使用 [release-preparation](templates/release-preparation.json) 绑定真实材料。实际发布需经过 F4、精确批准和 RELEASING，并提供 [release-result](templates/release-result.json) 及实际凭据。整体验收交付由 `INTEGRATION --integration-purpose final` 完成。

## CLI

```text
node skills/app-workflow-control/scripts/workflow-control.mjs init --repo <项目路径> --stack <unity|cocos|phaser|threejs|flutter|expo|esp32|nodejs|roblox> --id <ID> --type <FOUNDATION|SCENE|PAGE|...> --objective <目标>
node skills/app-workflow-control/scripts/workflow-control.mjs plan --repo <项目路径> --work-item <项目相对JSON路径> --spec <实际计划JSON路径>
node skills/app-workflow-control/scripts/workflow-control.mjs record --repo <项目路径> --work-item <项目相对JSON路径> --unit <单元ID> --report <真实执行报告JSON路径>
node skills/app-workflow-control/scripts/workflow-control.mjs reuse-visual --repo <项目路径> --work-item <新工作项路径> --source-work-item <已完成来源路径> --impact <implementation|layout|assets|target> --reason <事实说明>
node skills/app-workflow-control/scripts/workflow-control.mjs reuse-visual --repo <项目路径> --work-item <新场景工作项路径> --source-work-item <已完成来源路径> --impact <implementation|layout|assets> --reason <事实说明> --target-ids <来源目标ID列表，以逗号分隔>
node skills/app-workflow-control/scripts/workflow-control.mjs refresh-function-baseline --repo <项目路径> --work-item <项目相对 JSON 路径> --spec <功能重验规格 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs status --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs check --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs check-action --repo <项目路径> --work-item <项目相对 JSON 路径> --action-id <动作ID> --effect <受保护效果> --target <目标>
node skills/app-workflow-control/scripts/workflow-control.mjs run --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs transition --repo <项目路径> --work-item <项目相对 JSON 路径> --to <状态>
node skills/app-workflow-control/scripts/workflow-control.mjs visual-stage --repo <项目路径> --work-item <项目相对 JSON 路径> --to <V2|V3|V4|V5>
node skills/app-workflow-control/scripts/workflow-control.mjs unit-check --repo <项目路径> --work-item <项目相对 JSON 路径> --result <项目相对结果 JSON 路径>
```

`init` 只生成 Work Item，不覆盖已有记录。正式 PAGE／SCENE／DISPLAY_LAYER 绑定已确认的第 4 阶段全局视觉基线和 V1 模块方案；无视觉生产的局部工程任务使用非视觉工作项。

Flutter/Expo 的页面默认 `visual.designRoute: figma-app`；ESP32 可用 `--design-route figma-app`。仅设计提案用 `--design-intent proposal`，按委托范围交付。正式实现 V1 确认完整模块方案，V2 生成并确认模块设计，V5 完整实现与验收。Figma 工具按当前宿主实际能力使用。

App 初始化默认 `visual.designSource.kind:imagegen`，V2 根据第 4 阶段全局基线生成并确认[效果图来源](templates/app-visual-source.json)、可解码图片及摘要、任务书和真实选稿。用户明确要求直接 Figma 时，初始化使用 `--design-source figma-direct --design-source-message <真实消息引用> --design-source-scope <实际范围>`；其他生图工具按实际来源记录。源图确认与忠实重建授权绑定同一 `visualSourceRef`，V3 拆解该确认版本，V4/V5 独立验收。

无图 3D 世界使用 `init --design-route world-3d --type SCENE`，不支持仅设计提案冒充运行，也不自动迁移已有图片工作项。完整字段见[场景 Schema](schemas/world3d-scene.schema.json)，阶段资料由现有记录维护，不由 `run` 生成批准。

需要机器核对复杂游戏或 App 的增量范围时，先按[生产范围模板](templates/production-scope.json)准备项目内总范围；生产工作项在 `init` 追加 `--production-scope <项目相对范围 JSON> --production-batch <批次 ID>`，有前置批次时另附 `--production-dependencies <前置引用 JSON>`，最终 `INTEGRATION --integration-purpose final` 只追加相同 `--production-scope`。本批证据及最终覆盖要求见[分批生产](../app-domain-toolkit/references/incremental-production.md#按需绑定机器范围)；未绑定范围的普通任务不产生额外记录。

绑定总范围的工作项完成时，返回结果的 `metadata.workflowView.completionKind` 区分 `production-batch-complete`（当前批次）和 `production-scope-complete`（最终范围集成），同时返回范围引用与适用的批次 ID；该标记依赖真实阶段门和证据，不代替人工视觉确认或实际发布。

单个无视觉生产的本地 FOUNDATION/MODULE 修复可用 `init --mode light`，从 REVIEW 起步；仍须 F0–F3、单个独立实施单元和当前栈必需证据。普通任务默认 `standard`，视觉、发布、集成或受保护动作使用普通流程。纯查询、文案或注释通常无需建立工作项。

实际计划和执行报告使用 [work-plan](templates/work-plan.json)、[execution-report](templates/execution-report.json)。记录工具从当前工作项推导身份和路径，`plan` 收窄范围，`record` 合并真实证据；不执行命令、不伪造输出、不自动设置 F3/F4。成功记录后仍需 `unit-check` 及后续实际验证门。

可在准备阶段提前登记受保护动作及目标，不必为完成本地准备提前取得批准。实际执行外部写入、设备、签名、上传、付费、破坏性操作或发布前，先核对用户明确授权，并对每个受保护效果运行 `check-action`；动作 ID、效果和目标必须与记录及批准一致，F4 必须通过。发布还须先进入 `RELEASING`。该命令只读、不执行动作，也不能自行验证用户身份或阻止调用者绕过检查；执行者仍须遵守明确授权边界。

原图片及 Figma 路线在当前 V1 方案确认后，可用 `reuse-visual` 校验来源并引用未变化的基线和 V2/V3 确认；同项目、技术栈、对象、候选及显示层宿主必须匹配。新增或变化的模块设计在 V2 补齐并确认，V3 引用同一确认版本，当前 V4/V5 和工程证据独立产生。完整规则见[统一流程](../app-creator-workflow/references/workflow.md#视觉确认的增量复用)。

使用 [templates/](templates) 中同名合同记录真实实施包、结果、人工阶段确认、全局基线、素材评审和拷问。不要在已通过的证据里放模板占位符。

Unity 可见对象 V5 另读取[公共美术验收](references/art-experience-acceptance.md)，通过公共 Manifest 条目逐目标引用真实记录；其他栈不新增强制任务。
