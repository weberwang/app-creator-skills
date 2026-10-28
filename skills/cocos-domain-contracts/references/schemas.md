# 结构化 Schema

摘要和实际验收见[按实际完成情况验收](../../app-domain-toolkit/references/reference-domain-completion.md)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#结构化-schema)。

公共 Work Item、Implementation Package、Execution Result、Evidence Manifest、Human Review、拷问和发布结果 schema 统一见[公共 Schema、CLI 与结果合同](../../app-creator-workflow/references/professional-execution.md)。本目录以下仅保留本技术栈的视觉/领域合同；任何旧全局 Schema 不得作为当前 CLI 输入。

- [视觉拆解人工确认](./visual-decomposition-confirmation.schema.json)
- [视觉阶段硬门](./visual-stage.schema.json)
- [项目美术 brief](./game-art-brief.schema.json)
- [全局视觉基线选择](./global-visual-baseline-selection.schema.json)
- [运行美术验收](./art-experience-acceptance.schema.json)

## 视觉阶段 Schema

各技术栈统一采用 V0–V5，V1 是功能验证，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

全局视觉基线的本栈结构见[选择证据 Schema](./global-visual-baseline-selection.schema.json)，由本栈校验器检查真实文件。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#视觉阶段-schema)。

选择根与决定文件分别使用 `cocos-global-visual-baseline-selection/1.1` 和 `cocos-global-visual-baseline-selection-decision/1.1`，不提供旧格式放行。`brief.path` 的真实内容为 `cocos-game-art-brief/1.0` JSON，绑定生产者 `workItemId`/`briefId`，并声明 `theme`、`audience`、`coreLoop`、`experienceGoals`、`viewingContext`、`visualHierarchy` 和 `stimulusBudget`。预算的 `baseline`、`interaction`、`peak` 各含 `brightnessContrast`、`screenCoverage`、`duration`、`triggerFrequency`、非负整数 `maxConcurrent`、`recovery`、`blendPolicy`；另含 `measurementMethod`。文本预算说明项目实际限制和单位，不虚构通用阈值。

`humanSelection.candidateAssessments` 与实际决定文件中的同名数组按三候选 ID 唯一完整绑定，每项为 `candidateId` 与 `checks`。`checks` 恰含 `themeFit`、`audienceFit`、`readability`、`comfort`、`craft`，各项为 `status=passed|failed|unverified` 和非空 `reason`。所选候选五项均须 passed；未选候选允许失败或未验证，三张全部不合格时不能形成可放行的冻结根。根与决定内容按语义核对，不因 JSON 对象键顺序或候选评估数组顺序变化误报，也不以摘要替代实际内容。判断标准见[游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)，机器验证的是实际人工结果的结构与绑定，不自动判断像素质量。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-admission.md#视觉阶段-schema)。

正式可见视觉集成的 `visualStageEvidenceRefs` 必须为适用的 V3、V4、V5 阶段提供 `path`，由控制面读取实际文件并核对业务归属；内联对象、根 `PASS`、布尔值、说明文字和 Ledger 文本不能满足依赖。V3 引用必须是冻结且 COMPLETE 的 `cocos-scene-v2-reconstruction-plan/1.0`，绑定拆解图、技术 JSON、布局、coverage、生产方案和人工确认；V4 引用绑定正式资产验收及 `visualManifestFile`；V5 引用绑定实际运行候选、正式 Scene 消费和运行证据。摘要仅可选追踪。旧式方向审批不能被 V4/V5/F2 的重复人工记录替代。

V3 布局候选的机器引用必须覆盖同一候选目录的 `layout.png`、唯一 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 生成同批 `review.html`。scene contract 的 `layout_decomposition.layout_source.nodes_file`、annotation 与 layout confirmation 的 `layout_nodes_file` 必须逐字指向同一文件；布局/确认/decision/receipt 还须与 PNG、决策文件/ID、拆解确认、proposal、target、scene/state 身份逐项一致。scene contract 与 schema 2.0.0 UI 引用合同不得内联第二份布局树；控制面读取实际源文件核对内容与业务归属，不能以页面元数据或根 PASS 代替。PNG、`review.html` 和派生快照仅是只读展示投影，不是第二份手工事实。字段、候选状态、离线模板和自引用规避见[离线布局审阅产物](../../cocos-game-ui-layout/references/layout-review-artifacts.md)。

公共记录路径见[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)。

所有新工件必须直接满足当前 Schema；旧单值模块或旧委派格式不能驱动当前任务，不提供兼容路径。

公共 Work Item、门禁、路径范围、拷问决定与具体副作用批准统一按[公共 Schema、CLI 与结果合同](../../app-creator-workflow/references/professional-execution.md)执行；此处本栈专用视觉与资源证据字段仅约束各自领域工件，不新增全局状态、授权账本或 CLI。



各领域身份、资源与视觉合同继续遵守本栈下文的专用约束；全局模块范围和执行计划由[公共 Schema、CLI 与结果合同](../../app-creator-workflow/references/professional-execution.md)定义。纯工程 foundation-only 包只需当前任务范围、工程基线、冻结实施包和工程证据即可完成项目骨架与场景无关基础模块，不等待全局三候选；该基础阶段允许最小 Boot/Preload 生命周期、公开契约、游戏数据配置加载与 schema 校验、状态/存档仓库、输入/平台适配、资源目录/加载基础设施和测试支撑，禁止具体场景玩法规则、场景 UI/布局、正式可见资产消费、Boot→正式可见 Scene 接入和删除旧视觉实现。只要基础包声明 `visualProductionUnits`、`visualManifestFile`、`visualContractVersion` 等视觉合同或资产生产依赖，就必须通过 `globalVisualBaselineSelectionRef` 文件门和 `globalStaticBaselineState=global-static-baseline-frozen`；一旦声明正式视觉资源消费等视觉行为，则回到正式 V3/V4 视觉门。视觉装配在 V3 `v3-production-planning-complete` 和 V4 正式资源验收通过后实施；V1 可先直接实施并验证功能，白盒可选，不依赖视觉目标。`executionUnits` 数组顺序是计划制定者预设的唯一执行顺序，控制面只校验/执行，不通过依赖图、闭包或拓扑关系推导顺序。每个单元绑定 `moduleId`；`SCENE` 绑定 `sceneId`，`DISPLAY_LAYER` 绑定 `displayLayerId` 和 `hostSceneId` 且 `sceneId=null`，其他类型三个身份字段均为 null。本栈原生视觉生产合同的 SCENE/DISPLAY_LAYER 必须填写严格的 `highFidelityPrerequisite`，其他类型必须显式为 null；该对象只引用当前场景 Work Item 的 V3 方案，包含 `workItemId`、`status=COMPLETE`、`stage=V3`、`frozen=true`、scene/layer/host 与仓库内 `evidenceFile`；`targetSha256`、`candidateSha256`、`diffFingerprint`、`evidenceSha256` 均可省略。证据文件统一为 `cocos-scene-v2-reconstruction-plan/1.0` 的单一场景根结果，根提供 `sceneMaster`、`sceneReconstructionContract`、拆解标注图、技术拆解 JSON、拆解确认、生产合同、`visualProductionUnits` 和 `displayLayerContexts[]`。本栈领域校验器复核任务、candidateVersion、scene/layer/host 与实际文件归属一致。必要业务字段缺失、PENDING、证据越界/缺失均 fail closed，并以 `repair` 原地修复；上游事实未变的机器验证问题以 `revalidate` 重验当前门。只有上游事实失效、任务范围真实变化或硬门将被绕过时才以 `return` 回到最早受影响阶段；普通候选身份变化不触发 `RETURN`。参考还原仅是当前场景实现 Work Item 的可选视觉模式，不建立第二条生命周期。SERIAL 单元各占一个顺序位置，同一非空 `parallelGroup` 的 PARALLEL 单元必须连续出现并视为一个顺序阶段。SHARED/INTEGRATION 强制 SERIAL，MODULE/SCENE/DISPLAY_LAYER 才可进入至少含两个单元的并行组。`fileOwnership` 与实施单元写范围必须双向唯一覆盖且 owner 相同，预期增删文件也必须唯一落入实施单元。


公共执行状态和结果见[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)。



公共证据、验证与批准字段以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为准。

视觉实施包使用唯一的 camelCase 字段 `visualProductionUnits`，并必须同时提供 `candidateVersion` 和 `visualManifestFile`，摘要字段可选；只要包包含带 `annotation_number` 的区域，就必须携带覆盖全部编号的 `visualDecompositionConfirmation`，每个单元登记同一 `decomposition_confirmation_id`。每个单元按稳定 `annotation_number`、`region_id`、owner、`ownedPaths`、`outputPaths` 和生产方法绑定覆盖区域。固定视觉单元还必须携带 `state_analysis` 和 `component_inventory`：先以 `phase=before-component-splitting` 完成所有常见状态的 `required/not-applicable+reason` 分析，并记录实际证据、目标文件、`analysis_id`、`completed_at`，且 `completed_at` 必须严格早于 `component_inventory.created_at`（相等也失败），再登记唯一原子部件和 placements；runtime-data/runtime-rendered 单元不得携带 component/asset/expected/actual/runtime consumption 身份。效果图拆解分析 PNG、原子部件、状态和资产需求清单必须经过 `visual-decomposition-confirmation/1.0` 的人工 accepted 记录；确认集合同时冻结本次生成、复用既有资源和非图片逻辑编号，缺失、AUTO、pending、漏编号均不能从分析阶段进入实施阶段。`expected_assets` 必须按 `component_id × required state_id` 一一对应；生成式位图使用 `delivery_mode=individual` 且 `atlas_allowed=false`，禁止共享横向组图和图集；固定视觉图片只允许 `image-generation`、`authored-raster` 或有证据的 `reuse`，不得用 `authored-svg`、`cocos-graphics`、`runtime-program`、Canvas/CanvasTexture 或 runtime drawing 生成或替代游戏图片。只有非图片逻辑、交互热区、碰撞或布局才能使用程序绘制。图集切片必须登记 `atlas_size.width/height`，x/y 不得为负且右/下边界不得越界，V4 必须核对正式 atlas 资产真实尺寸。每个 placement 必须显式声明 `interaction_required`；热区必须通过 `interaction_hotspots` 按 placement 一一绑定且不得携带 `asset_id`，不计入视觉资产数量。`visual-assets` 的新合同字段不兼容旧的隐式推断：只有明确 `image_generation_required=true` 才进入 `image-generation` 分类；方法变化必须由当前 Work Item 记录的真实用户决定支持；区域、工作项、候选版本、用户原文和时间仍记在对应视觉领域记录中。V4/V5 的审计与复核证据分别使用 `production_contract_audit`、F2 两类机器证据、F3 replay 和 freshness-bound fidelity cases。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#视觉阶段-schema)。

Work Item 不得内嵌 `userDecisionReceipt` 或 `visualConfirmationAuthority` 自称权威，只能使用 `visualConfirmationAuthorityRefs[]` 引用 `.workflow-control/user-resolutions/` 下的 `user-resolution-ledger/1.0`。编排层收到用户确认消息后才可落盘 ledger；loader 必须读取 ledger/entry/receipt 实际文件，并核对用户消息、线程、当前 Work Item、manifest 的 target/candidate、scene/state 和拆解身份。ledger 只记录视觉确认事实，不是普通任务授权记录，且不得被 Implementation Package ownedPaths/outputPaths 或委派动作覆盖。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#视觉阶段-schema)。

共享核心只维护视觉合同的基础谓词、路径规范化、生产/交付/替换词汇表和处置映射；详细字段约束与结构仍以各领域 JSON Schema 为唯一准据。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-schema.md#视觉阶段-schema)。

### 场景还原 schema 与验证命令

效果图 `scene_reconstruction_contract` 的 V2 最低字段包括 `reference_technical_conflicts`（允许空数组但不得省略）、`display_layer_planning`（无显示层也必须显式 `inventory=[]`）、scene master/reference target、宿主上下文图和初步还原草案；规划必须区分 scene master、宿主场景上下文层图和 V3 component×state 生产方案，并声明 `visual_validation.mode=usability|exact`（默认 `usability`，effect-image 不自动启用 `exact`）。V3 固定串行：先产出拆解标注图、技术拆解 JSON 和 `decomposition_elements`，人工修改并确认，proposal 此后作为历史确认输入；再由智能视觉判断基于原图构图、视觉重心与元素语义生成 `automatic-layout-decision/1.0`，逐元素声明水平 `left/center/right` 与垂直 `top/center/bottom`，不得从几何距离自动反推。布局生成器从确认 proposal 与 Stage B decision 生成唯一 `layout-nodes.json`，承载分组、父子、定位参照与布局策略；scene contract 的 `layout_decomposition.layout_source.nodes_file` 和 annotation/confirmation 的 `layout_nodes_file` 必须指向同一文件。schema 2.0.0 UI 合同只引用公共策略与场景合同，不内联 `regions`、`layout_nodes`、`scope.ui_ids`、`fidelity` 或运行快照。PNG、`review.html` 和运行快照只读展示，不成为第二份手工事实或回写 proposal。布局图随后由用户独立确认；布局确认绑定 decision 文件/ID、最终图、唯一布局源路径、上游拆解、scene/state/target 和用户 receipt，任一上游身份变化都必须重新确认。父子/分组变化按原 Stage A 规则更新并重确认。V3→V4 必须绑定拆解图、技术 JSON、唯一布局源、视觉布局决策、布局图、coverage、生产合同、`visualProductionUnits` 及两次人工确认。结构化 fidelity case 不要求候选 SHA 或差异指纹，须记录实际运行结果并提供 `normalization_equivalence.viewport`、`dpr`、`logical_coordinates` 三项等价证明。`usability` 默认记录关键关系和可用性事实，允许合理位置/尺寸差异；仅 `exact` 模式要求严格 `difference_evidence`、target/candidate measurement、delta、预声明 `tolerance_reference`、result、evidence 和（可为空的）`exception_ids`。V5 在正式场景提供同屏组合及瞬态层打开→交互→关闭→底层状态/焦点恢复轨迹。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#场景还原-schema-与验证命令)。

验证器命令示例：

```text
失败：node skills/cocos-game-asset-integration/scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V5
典型输出：current_stage=V5 必须显式 checkFiles=true；未执行真实文件门，V5 FAIL

失败：node skills/cocos-game-asset-integration/scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V3 --check-files --project-root .
典型输出：[V3] ... 根因=方案缺失 ... 缺失视觉事实=visualDecompositionConfirmation ... 处置=repair ... 当前门阻断

成功：node skills/cocos-game-asset-integration/scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V5 --check-files --project-root .
典型输出：结构合同、F2 `validationMode=MACHINE` 确定性机器检查、逐区域 fidelity、runtime replay 和文件门均通过；返回码 0。
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#场景还原-schema-与验证命令)。

V5 实际运行候选的 `artExperienceAcceptance` 使用 `cocos-art-experience-acceptance/1.0`，引用[运行美术验收 Schema](./art-experience-acceptance.schema.json)。它绑定 work item、candidate 与场景上下文，保存五项 checks、实际用户原文和确认时间，以及观看情境和四类 scenarios：`normal-play`、`repeated-feedback`、`event-peak`、`overlap-peak`。正常使用必须 required；其他情境允许有理由的 not-applicable。required 记录真实 `recordingFile`、有效起止秒数、非负整数触发次数/并发和人工观察；not-applicable 的文件、时段和计数为空，不伪造检查。整体与五项 checks 全 passed、文件可读取且身份正确后才满足 V5 完成门。机器只校验人工结果与录屏文件绑定，不分析视频、不自动生成通过结果；该对象属于现有运行验收，不恢复旧复核字段或新增审批阶段。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-scene-contract.md#场景还原-schema-与验证命令)。
