# 全局视觉与模块阶段门禁

所有正式 `PAGE`、`SCENE`、`DISPLAY_LAYER` 都执行此合同。局部工作可复用有效基线和设计文件。绑定[生产总范围](../schemas/production-scope.schema.json)时，用 `versionVisual.workItemPaths` 登记第 7 阶段必须纳入的正式来源。各模块按自身批次推进。

## 第 4 阶段冻结全局视觉

定义方向和制作代表稿前，执行[产品调研与美术设定参考](../../app-creator-workflow/references/professional-conventions.md#product-market-research)，将查证或有效复用的产品参考转成当前视觉 brief 的设计依据。

图片、Figma 和三维世界基线都须用 `visualResearchRef: {path,sha256}` 绑定[调研清单](../templates/visual-research.json)。`projectId` 和 `stack` 与当前基线相同，`productResearch` 提供 `market`、`competitor`、`audience` 的来源和结论，`artReferences` 逐项记录来源、设计观察及当前适用依据。每项来源提供公开 `url` 或冻结的 `fileRef: {path,sha256}`。控制器在绑定基线的阶段迁移和基础视觉冻结清单校验时核对这些材料。当前项目和技术栈下仍适用的冻结清单可以直接复用。仅部分来源适用时，将这些来源纳入本次清单并说明适用依据。执行者负责核对公开链接内容和实际适用性。

已冻结的基线若缺少 `visualResearchRef`，可在同目录补充 `<基线文件名>.research-supplement.json`，例如 `goods-sorting-b.json` 对应 `goods-sorting-b.research-supplement.json`。补充记录使用 `schemaVersion: "1.0"`，以 `baselineRef: {path,sha256}` 绑定原基线，以 `visualResearchRef: {path,sha256}` 绑定调研清单，原基线保持冻结。控制器校验两条文件身份，并将补充记录、调研清单及其本地 `fileRef` 来源纳入只读输入写保护。调研清单如声明 `basisRef: {path,sha256}`，其规范化路径和摘要须与当前基线一致。基线自身已声明 `visualResearchRef` 时，以该引用为准。

仅设计的 Figma 提案在选稿前用 `visual.visualResearchRef` 绑定同样的调研清单，也可以沿用已绑定的有效全局基线。提案尚未绑定基线时，控制器仍会校验调研清单所声明的 `basisRef` 的文件身份。进入 V2 及执行受保护的 Figma 写入前都要核对调研。

基础工程 Work Item 完成原有工程验收。其 `foundationVisualRef: {path,sha256}` 指向 JSON，字段为 `schemaVersion: "1.0"`、`projectId`、`stack`、`foundationWorkItemPath` 及 `baselines`。各基线记录 `{route,ref:{path,sha256}}`。路线取 `image`、`figma-app` 或 `world-3d`，直接 Figma 条目保留已获授权的 `designSource`。各路线使用既有基线合同，记录用户对代表稿及全局方向的确认，并将清单的准确路径与摘要纳入基础工程的 `systemCoverage.modules[].designRefs`。正式模块绑定同一个 `foundationVisualRef` 和当前路线对应的 `globalVisualBaselineRef`。

## V1 确认方案

游戏世界 `SCENE` 在 V1 尝试启动[场景／关卡设计任务](../../app-domain-toolkit/references/game-design-exploration.md#v1-scene-design-task)。控制器在可继续的 V1 工作项响应中提供 `next` 和 `metadata.sceneDesignTask`，其中记录 `stage`、`workItemId`、`objectId` 与 `designRoute`。执行者核对现有方案能否复用，必要时在当前模块任务内新增或修订设计，并沿用现有确认和冻结流程。

`visual.modulePlanRef` 指向带摘要的方案 JSON，记录 `schemaVersion: "1.0"`、`workItemId`、`objectId`、`dependencies`（无外部依赖时为空数组）和 `entries`。显示层还登记 `hostId`。每项填写 `kind`、`id`、`description`、`acceptance`、`requirementId` 和在 V5 运行的 `command`。

`kind` 包括 `element`、`function`、`state`、`step`、`transition`、`progress`。属于当前模块的 UI、精灵、地块、二维背景与反馈等设计要素逐项用 `element` 登记，常驻或静态要素可独立于流程登记。`function` 登记 `trigger` 与 `resolution`，`transition` 登记 `fromStateId`、`toStateId` 和 `trigger`。每条流程登记实际适用的状态转换和进度，独立模式可以分别定义起点。生产总范围内本对象本批的状态、步骤和转换沿用原有 ID。

绑定生产总范围时，`transition` 两端必须与总范围中的定义一致，每个流程覆盖其业务步骤的适用状态，已有业务路径保留本对象的步骤顺序及回环。跨对象流程可在 `stateIds` 和 `initialStateIds` 引用总范围中其他对象的边界状态。本对象状态登记为本地 `state` 条目，边界状态由其对应对象负责设计和验收。

方案的 `rules.flows` 登记本轮实际流程，每个流程记录 `id`、`functionIds`、`stateIds`、`initialStateIds`、`stepIds`、`transitionIds`、`progressIds` 和 `combinationIds`，关联本轮机制、初始状态、可达状态、转换、进度及适用组合。流程之间可以复用相同条目；没有适用条目的数组保留为空。动态系统记录可达状态类别、生成规则及边界，使用同一规则表达多个实例。

`rules.combinations` 登记流程中机制组合的适用触发及裁决，每条记录 `id`、`functionIds`、`trigger`、`resolution` 以及指向该流程内 V1 条目的 `verification: {kind,id}`。逐对核对同一流程的机制是否能同时生效，以及结果、互斥、相互独立或优先级。若流程含三个及以上机制，`simultaneousGroups` 列出会共同触发的机制 ID 组，每组引用覆盖整体裁决的组合规则；已确认无此类组合时用空数组。单机制流程的组合清单可为空。正常、异常、暂停恢复、数据归属和玩家感知按实际需求归入流程、规则与可验证预期。

对照本轮玩法、内容、配置和产品资料补齐上述内容；`rules.openQuestions` 可记录尚待澄清的问题。未解决且会影响实现或验收的规则通过 grilling 处理，决定写回产品资料和方案；清空已解决问题后记录 F0、F1 并进入 V2。所有 3D 世界场景须在 V1 建立或复用有效白模，再推进 V2。2D 直接使用正式工程、平面布局与功能用例，禁止白模。控制器检查引用、覆盖和结构，规则含义及产品来源是否完整仍由执行者结合项目事实核对。

## V2 生成并确认模块稿

V2 展示 V1 已确认的当前模块全部适用要素和必要状态，用于用户确认及 V3 拆解交接。全局视觉方向沿用第 4 阶段的冻结基线。跨模块内容只引用当前交互、状态或布局所需的宿主上下文；同一场景含多个模块时，按当前模块的范围确认稿件。

`modulePlanRef` 提供 V1 的功能和覆盖依据。出稿按[正式出稿输入](../../app-creator-workflow/references/workflow.md#v2-design-inputs)独立设计，V1 草稿、线框、原型截图和临时视觉规则不得用作 V2 参考或底稿。3D 白模按场景合同提供已确认的空间与功能约束。

出稿或实施前发现方案无法从已确认依据中明确时，执行[模块设计方案决策](../../app-creator-workflow/references/workflow.md#module-design-decision)，待用户选择调研或人工调整并明确方案后再推进受影响的设计。变更沿用 V1、V2 和现有用户确认记录。

在当前工作项的 `grillingRef` 登记该问题，并将该条 `decisions[].kind` 设为 `module-design`。待定时记录为 `OPEN`。用户选择后，将 `answer` 和 `resolution.approach` 一致填写为 `research` 或 `manual`，并在 `resolution.choiceUserMessageRef` 引用该决定的用户答复。用户确认具体方案后，用 `proposalRef: {path,sha256}` 冻结该方案，另以 `confirmationUserMessageRef` 记录确认消息。调研路线同时冻结 `referenceRefs`。资料齐全后将记录关闭为 `CLOSED`，并给 `grillingRef` 绑定摘要，随后才允许阶段推进、准备实施包或登记执行单元。

`visual.moduleDesignRef` 指向带摘要的设计清单，清单记录 `schemaVersion: "1.0"`、`workItemId`、`modulePlanRef`、`baselineRef` 和 `entries`。V1 `entries` 的全部要素、机制、状态、步骤、转换及进度沿用原有 `kind` 和 `id`。`rules.flows` 的每项用 `kind: "flow"` 和该流程的 `id` 登记，步骤及其顺序沿用冻结的 V1 方案。每项绑定已确认的 `targetRef: {path,sha256}`，同一份稿可以对应多项。Figma 图片路线还用 `designRef` 引用对应的可编辑节点快照。同一条目需要多张稿时，用 `additionalTargets` 数组登记其余目标的 `targetRef` 及适用的 `designRef`。V2 图片目标覆盖当前模块全部二维元素和必要状态，单张不能清楚容纳时拆分多张。3D 世界按[场景设计合同](world3d-scenes.md#world-camera-designs)使用空间、方向和适用状态规格，`worldViews` 按需登记。

`visual.moduleDesignReviewRef` 指向用户确认的记录，字段为 `schemaVersion: "1.0"`、`workItemId`、`stage: "V2"`、`decision: "approved"`、真实 `userMessageRef` 和与清单一致的 `subjectRef: {path,sha256}`。连续进度可用关键帧和变化规则表达，重复表现可引用共享规格。控制器进入 V3 前逐项核对冻结方案和已确认稿件，遗漏、重复、越界或未登记用途的目标均阻断推进。通过后固定 V2 快照，V3–V5 核对同一版本。设计表达及实际预览由用户人工核对。

## 实现、验收与返工

每次执行布局脚本时，须限定到当前工作项需要处理的目标。V4 验收完成前检查工作流生成的布局写入脚本已退出项目执行链路。V4 验收完成后，V5 和返工均按[布局脚本执行规则](../../app-domain-toolkit/references/editor-display-authoring.md#layout-script-stop-after-v4)维护正式布局源。

V3 拆解 V2 确认的稿件，V4 准备资源、接口、共享组件与适用的风险验证。当前视觉单位及状态的图片与应显示文字按批接入正式目标源并保存，逐批核对同次采集的实际文字和图片消费者。V5 完整实现本轮功能，用 V1 的 `requirementId` 和 `command` 将每项验收关联到当前实施包的需求、验证单元与真实执行输出。通过后固定执行证据摘要，以便第 7 阶段复核来源及正式组合的跨模块状态与端到端路径。

Unity、Cocos、Phaser、Three.js、Flutter、Expo 和 ESP32 的 V4 资源评审以 `textRestorationRef: {path, sha256}` 冻结同一份完整原生采集报告。该报告保留各栈规定的工作项、候选、状态、采集批次及文字读数，并记录 `formalIntegration: {entryRef: {path, sha256}, images: [{assetId, outputRef: {path, sha256}, componentPath}]}`。`entryRef` 指向已保存的当前正式场景、页面或组件源，Unity 与 V3 布局计划 `scenePath` 一致，Expo 和 ESP32 与当前正式布局 `layout.sourcePath` 一致，Flutter 与已登记 `implementationEvidence` 的正式源码引用一致，Cocos、Phaser 和 Three.js 使用正式场景、Prefab 或 TypeScript/JavaScript 场景或显示层入口。临时演示、证据目录和未保存状态不能充当正式目标源。`images` 逐项绑定资源评审的图片 `assetId` 和 `output`，并记录该目标中同次采集的实际消费者组件路径；纯原生实现填写空数组。V4 核对源文件和图片实际内容及摘要，V5 保留冻结的 V4 报告并独立采集正式运行证据，V4 之后正式源可继续演进。

含应显示文字的 Cocos、Phaser 和 Three.js 视觉单位在 V3 通过 `layoutSpecRef` 冻结 `formalTarget: {entryPath, rootComponentPath}`，分别填写正式入口文件和目标的原生组件根。V4 的 `formalIntegration.entryRef.path` 与 `rootComponentPath` 须匹配，采集时保留根下的图片消费者和文字组件路径。此类视觉单位通过 `app-workflow` 完成 V4 正式图文接入验收。独立素材命令可按[跨栈 V4 验收合同](visual-v4-acceptance.md)绑定当前工作项和目标。用户授权复核历史生图或已确认文字试装时，资源评审引用共用决议及各栈实际采集证据。V3 的原始参考事实保留，V5 独立采集正式运行证据。

同一工作项的所有正式设计稿须完成 V3 拆解确认后才能进入 V4。图片场景和常驻 HUD 沿用各视觉目标自身的确认链。单目标路线的附加稿、三维场景单独出稿且未纳入 HUD 的二维内容，以及多稿 Figma 路线的每张稿，在 `visual.supplementalDecompositionReviews` 登记各自的 `{path,sha256}` 确认引用。记录采用 [human-review](../templates/human-review.json)，使用当前工作项、对象、候选和适用宿主身份，`stage` 为 `V3`、`purpose` 为 `decomposition`，`referenceTarget` 绑定该张 V2 确认稿，`targetRef` 和 `targetSha256` 绑定用户确认的拆解材料。Figma 还需以 `figmaDesignRef` 指明对应的可编辑稿，并引用当前原生拆解交接。三维机位预览与空间规格沿三维场景合同校验。

V3 在原拆解记录落实[动画清单](../../app-domain-toolkit/references/frame-animation-execution.md#v3-animation-inventory)，将需要动画的对象与冻结的状态、事件和正式消费者对应。二维采用帧动画，每个动作从[生图和视频抽帧](../../app-domain-toolkit/references/frame-animation-execution.md#source-route-selection)中二选一。V4 按确认的来源制作，采样和正式播放最高 24 FPS。

业务规则有实质歧义时做 grilling，更新 V1 后回到 V2。模块稿变更走 `RETURN` 的 `visual:V2` 并重新确认。全局方向变更先更新第 4 阶段，再复核受影响的模块。
