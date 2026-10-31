# 视觉实施准入与证据

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 任务范围与显式批准

> 适用技术栈：cocos、phaser、threejs。

视觉验收通过 `visual_validation.mode` 区分 `usability` 与 `exact`，默认使用 `usability`。普通候选的位置、尺寸、边距、换行和几何变化须符合已声明适配或已确认目标容差，并检查越界、裁切、关键遮挡、不可读及交互失效；effect-image 也不自动切换到 `exact`。只有用户明确要求像素级还原或项目合同明确指定时才使用 `exact`，并启用严格容差、全视口/全状态矩阵和完整差异证据。V3 拆解、布局父子关系、顺序和内部几何一致性仍需保持。

## 弹窗工作项与场景解耦

> 适用技术栈：cocos、phaser、threejs。

视觉阶段使用机器枚举 `V0`、`V1`、`V2`、`V3`、`V4`、`V5`，且必须同时声明有语义的 `visualStageState`。公共 V2 内、离开公共 V2 前须建立或复用全局基线 brief（不阻断公共 V1 功能验证）、生成恰好三张同条件候选效果图、同屏交给人工并确认其中一张；`globalVisualBaselineSelectionRef` 通过后才可写入 `global-static-baseline-frozen`。该引用通过不可变 `path` 跨 Work Item 复用，根证据顶层 `workItemId` 始终是生产者身份，不是当前消费者；该状态只冻结颜色、字体、栅格等静态规则；它不等于 `v3-production-planning-complete`，三候选人工选择也不能替代逐场景 V3 拆解图确认。V3 方案冻结必须由拆解图、技术 JSON、coverage、生产计划和拆解确认证据派生。

> 适用技术栈：cocos、phaser、threejs。

正式消费已确认的视觉资产、替换旧视觉实现或声明视觉完成时，必须由共享视觉前置校验器复核当前场景 Work Item 的 V3 拆解与目标布局、V4 正式资源验收；声明视觉完成时另需 V5 运行候选。仅含 `SHARED`/`MODULE` 的 foundation-only 包按是否声明视觉依赖分流：纯工程包不消费视觉产物或正式可见资产，只需当前任务范围、工程基线、冻结实施包和工程证据即可在全局选图前实施；声明视觉合同或资产生产依赖的基础包仍必须通过机器复核的 `globalVisualBaselineSelectionRef`（三张 generated 候选、唯一 SINGLE_HUMAN/CONFIRMED 决定、冻结正文实际文件）和 `globalStaticBaselineState=global-static-baseline-frozen`。一旦声明正式视觉资源消费等视觉行为，即使单元类型仍为 `SHARED`/`MODULE`，也回到正式 V3/V4 视觉门。包含 `SCENE`、`DISPLAY_LAYER` 或 `INTEGRATION` 的包以 V3 `v3-production-planning-complete` 作为规划边界、V4 正式资源验收作为正式视觉资源装配前置。全局选择根证据的生产者 Work Item 可被多个消费者引用，但场景 V3/V4/V5 证据仍必须绑定当前场景 Work Item；阶段名、`stageId` 文本、根 PASS/布尔值、说明文字和 批准记录文字都不是证据；所有证据必须使用 Work Item、Unit Result、候选标识和实际文件引用。必要业务字段或路径缺失/格式错误先 `repair`，上游事实未变的机器验证失败按 `revalidate` 只重跑当前门；只有上游事实失效、任务范围真实变化或硬门将被绕过时，才按最小范围更新并 `return` 到最早受影响阶段。普通候选身份变化不触发 `RETURN`，不使 V3 拆解确认失效；下游按受影响范围失效，不默认整 Work Item 重做。

## 实施顺序状态硬门

> 适用技术栈：cocos、phaser、threejs。

`highFidelityPrerequisite` 是 SCENE/DISPLAY_LAYER 必填、其他类型必须为 null 的严格 nullable 字段，引用当前单元所属 Work Item 的 V3 方案。SCENE 引用场景工作项证据；DISPLAY_LAYER 引用独立弹窗工作项证据，并额外以 scene/layer/host 身份绑定宿主上下文图。两者不得共用一个实施包，也不要求使用同一 `evidenceFile`；必要业务字段缺失、任务归属不符或文件缺失均拒绝；摘要不参与验收。

> 适用技术栈：cocos、phaser、threejs。

公共 V3→公共 V4 是同一场景 Work Item 的阶段推进。V3 拆解与布局确认、V4 正式资源证据、V5 运行态证据写入同一 `workItemId` 的不可变阶段引用；公共 V5 正式组合实施包进入 `IMPLEMENTING` 前必须消费当前 Work Item 的 V3/V4 证据。阶段实施序列完成只表示当前包完成，只有当前 Work Item 的公共 V5 运行态联合验收证据闭合后才允许场景 `COMPLETE`。

## 状态、阶段与停止门

> 适用技术栈：cocos、phaser、threejs。

效果图还原是当前场景实现 Work Item 内的可选视觉模式；foundation-only 基础实施完成后进入场景 V2，由 V2 生成或接收并冻结 `scene_reconstruction_contract`、scene master/reference target、必需宿主上下文图和初步还原草案，再进入 V3 拆解确认门。工作项按统一阶段和当前全局状态向前推进：缺字段、格式、路径或可补证据问题先在当前阶段原地修复，上游事实未变的机器验证失败只重验当前门。只有上游事实失效、任务范围真实变化，或继续推进会绕过硬门并使下游无效，才使用 `RETURN` 回到最早受影响阶段；普通候选身份变化不触发回退。

## V0/V1/V2/V3/V4/V5 机器状态依赖

> 适用技术栈：cocos、phaser、threejs。

| 阶段 | 唯一完成状态 | 下游硬依赖 |
| --- | --- | --- |
| V0 | `not-started`/`in-progress` 等过程状态 | 分流对象与范围 |
| V2 | `in-progress`/过程状态 | 视觉契约、冻结图、布局和容差 |
| V3 | `v3-production-planning-complete` | 拆解图、技术 JSON、coverage、component×state、父子/停靠/对齐/显示层事实、生产方案和拆解确认 |
| V4 | `v4-formal-acceptance-complete` | 正式资产、组件资源状态、`visualManifestFile`/`visualManifestSha256` 与生产验收 |
| V5 | `v5-runtime-integration-candidate` | 当前 V3/V4 事实、正式 Scene 消费、runtime replay、fresh fidelity、无替代 |

> 适用技术栈：cocos、phaser、threejs。

V4 资源验收通过后，V5 直接激活正式实施包并读取当前 V3 拆解/布局和 V4 资源证据。正式执行准入和 COMPLETE 仍须复核这些上游事实及 V5 实际运行候选。

> 适用技术栈：cocos、phaser、threejs。

`global-static-baseline-frozen` 是静态基线的独立状态，不是 V3 完成状态。正式可见 Scene/UI 工作进入集成状态前，校验器必须从 V3→V4→V5 的不可变文件证据派生运行候选；无副作用本地 A4 不因等级标签额外进入批准门。裸 `frozen`、未知阶段、根摘要、手写 PASS 或 `stageId=main/integration/production-entry` 均失败。

## 全局视觉冻结与实施顺序

> 适用技术栈：cocos、phaser、threejs。

任务范围和工程基线完成后，纯工程 foundation-only 包可先完成 `SHARED` 最小项目骨架和 `MODULE` 场景无关基础模块；只有具有视觉合同或资产生产依赖的基础包才需先建立全局基线 brief，生成恰好三张同条件候选效果图并同屏交给人工，人工选择确认一张后以 `globalVisualBaselineSelectionRef` 正式冻结 `visual_baseline`。公共 V1 功能验证后各场景进入公共 V2；此视觉阶段生成或接收并冻结当前场景的 scene master/reference target、必需 transient display-layer 宿主上下文图、`scene_reconstruction_contract` 和初步还原草案，集合按 scene/state 分项而非一张合并图；随后该场景才在 V3 完成拆解图确认与生产方案。

> 适用技术栈：cocos、phaser、threejs。

具有视觉依赖的 foundation-only 包必须同时通过 `globalVisualBaselineSelectionRef` 的三候选/唯一人工确认/实际文件门和 `globalStaticBaselineState=global-static-baseline-frozen`，缺失任一项时 fail closed；纯工程包只需当前任务范围、工程基线、冻结实施包和工程证据，不等待全局选图；一旦基础包声明正式视觉资源消费等视觉行为，即回到正式 V3/V4 门。混入 SCENE/DISPLAY_LAYER/INTEGRATION 的包以 V3 `v3-production-planning-complete` 和 V4 正式资源验收作为正式视觉资源装配前置。全局选择是独立硬门，不能替代逐场景 V3。参考模式的 `effect-image` 仍在同一 Work Item 内完成 V2→V3→V4→V5。

> 适用技术栈：cocos、phaser、threejs。

正式代码包按 `SHARED`→`MODULE`→`SCENE`→`INTEGRATION` 或 `SHARED`→`MODULE`→`DISPLAY_LAYER`→`INTEGRATION` 排列；SCENE 与 DISPLAY_LAYER 不得混在同一包。正式视觉资源装配单元直接读取所属 Work Item 的 V3/V4 证据，`hostSceneId` 不构成宿主场景完成依赖。

## 高保真前置

> 适用技术栈：cocos、phaser、threejs。

公共 V3→公共 V4 是同一场景 Work Item 的阶段推进。V3 拆解与布局确认、V4 正式资源证据、V5 运行态证据分别写入同一 `workItemId` 的不可变阶段引用；公共 V5 正式组合实施包进入 `IMPLEMENTING` 前必须消费当前 Work Item 的 V3/V4 证据。阶段实施序列完成只表示当前包完成，只有当前 Work Item 的公共 V5 运行态联合验收证据闭合后才允许场景 `COMPLETE`。

> 适用技术栈：phaser、threejs。

SCENE 与 DISPLAY_LAYER 分别绑定各自 Work Item 的 V3 证据，使用独立 `evidenceFile`，不共用同一证据包或同一文件；各自的 scene/layer/host 及任务归属必须一致，candidate/diff/target 摘要仅作可选追踪。必要业务字段、格式、路径、越界或缺文件错误先 `repair` 并重验当前门；上游事实未变但机器证据过期/失败时为 `revalidate`。只有上游事实失效、任务范围真实变化或硬门将被绕过才 `return` 到最早受影响阶段；普通候选身份变化不触发回退。

## 视觉阶段 Schema

> 适用技术栈：cocos、phaser、threejs。

`visualStage` 只能是 `V0`、`V1`、`V2`、`V3`、`V4` 或 `V5`，`visualStageState` 只能使用带上下文的状态：`global-static-baseline-frozen`、`v3-production-planning-complete`、`v4-formal-acceptance-complete`、`v5-runtime-integration-candidate`（以及明确的过程/失效状态）。裸 `frozen`、未知阶段、缺少阶段语义或冲突声明均失败。

> 适用技术栈：cocos、phaser、threejs。

全局基线冻结前必须先建立视觉 brief，生成恰好三张同条件候选效果图，同屏交给人工并由唯一 `SINGLE_HUMAN`/`CONFIRMED` 记录选择其中一张；候选图片路径只允许 PNG/JPEG，文件门还会检查真实图片魔数，不能用同后缀文本伪装。`globalVisualBaselineSelectionRef` 必须绑定独立的选择根证据、三张 generated 图片及生成记录、决定文件和冻结正文实际文件。完整字段见 本栈 `global-visual-baseline-selection.schema.json`，机器文件门由 `global-visual-baseline-contract.mjs` 核对实际文件与业务内容。只有该引用完整通过文件门后才能写入 `global-static-baseline-frozen`；全局选择是独立硬门，不能替代逐场景 V3 拆解图确认。

> 适用技术栈：cocos、phaser、threejs。

选择根证据顶层 `workItemId` 是生成并冻结三候选及人工决定的生产者身份；消费者 Work Item 只通过引用的 `path` 复用该根证据，不得将消费者身份写回根、候选生成记录或人工决定。
