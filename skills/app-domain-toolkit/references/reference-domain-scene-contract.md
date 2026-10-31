# 场景视觉还原合同

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 结构化 Schema

> 适用技术栈：cocos、phaser、threejs。

场景视觉阶段依次使用 V0、V1、V2、V3、V4 和 V5。V4 `v4-formal-acceptance` 证据绑定 `visualManifestFile` 与正式资源验收；V5 Implementation Package 与 runtime candidate 直接绑定当前场景 V3 拆解/布局、V4 资源和实际运行证据。

> 适用技术栈：cocos、phaser、threejs。

`display_layer_planning` 不再支持 `deferred_layers`。场景 Work Item 的 `inventory` 只记录场景自有常驻显示层；modal/popup 等弹窗建立独立 DISPLAY_LAYER Work Item，并在自己的 `inventory` 中记录完整事实。弹窗仍必须提供 `host_scene_id`、required state 上下文图和自身 V5 运行轨迹，但其状态不进入宿主场景验收。字段由 `display-layer-planning-contract.mjs` 校验，边界见[场景与显示层职责](./reference-domain-display-ownership.md)。

## 视觉阶段 Schema

> 适用技术栈：cocos、phaser、threejs。

旧的单数 `visualDecompositionConfirmation` 不再兼容；实施包必须使用按 `scene_id+state_id` 分组的 `visualDecompositionConfirmations[]`，每组覆盖该组全部新生成、复用和非图片逻辑编号，并冻结 annotation/proposal/decision/receipt 身份。

> 适用技术栈：cocos、phaser、threejs。

视觉确认前置文件和实际用户确认按[视觉质量专业复核](./reference-orchestration-visual-quality-gate.md)执行。
效果图 Evidence 还必须绑定 `scene_reconstruction_contract`：冻结 target 条件、完整 composition、逐区域视觉事实、runtime fidelity obligations、目标绑定 layout/responsive、默认可用性验证或明确选择的精确模式、预声明容差和完整实现计划。V5 fidelity case 按 `visual_validation.mode` 取证：默认 `usability` 关注布局关系和可用性；项目已声明的关键几何容差在 `usability` 中仍须按现有校验入口核对；只有明确选择 `exact` 时才要求完整逐 region 测量矩阵及严格像素差异、side-by-side/overlay/diff。

## 场景还原 schema 与验证命令

> 适用技术栈：cocos、phaser、threejs。

Evidence Manifest 的 `current_stage` 为 V3 或 V4 时，场景合同和组合验收字段按当前硬门校验，但允许尚未产生 V5 `fidelity_cases`；只有显式 `current_stage=V5` 才要求非空 fidelity cases，并仍由 V5 runtime validator 执行真实文件、F2/F3 和正式 Scene 消费门。

> 适用技术栈：cocos、phaser、threejs。

V5 的合同还必须声明 `combination_preacceptance`，固定视觉实施单元必须提供完整 `scene_asset_usage`；F2 只接受带 `validationMode=MACHINE`、当前 baseline/diff 身份和机器 evidence 的确定性验证事实，不再产生 `visual_fidelity_review`、`production_contract_review` 或 `component_reviews`。默认 `visual_validation.mode=usability` 时，机器事实验证关键关系、可读性、边界和交互，不强制像素级差异或全视口/全状态矩阵；`exact` 仅在明确精确需求时启用。旧的独立资源或缺任一新增 effect-image 字段的工件不兼容当前 schema。

> 适用技术栈：cocos、phaser、threejs。

根因只使用 `方案缺失`、`执行问题`、`验收问题`。缺字段或记录问题先 `repair`，上游事实未变的机器验证问题用 `revalidate`；只有 `upstream-fact-invalidated`、`scope-changed` 或 `hard-gate-would-be-bypassed` 时才给出 `returnStage`，并取最早受影响阶段。普通候选身份变化不触发回退。

> 适用技术栈：cocos、phaser、threejs。

场景 V3 不再保留旧式 `visual_human_approval`。还原方案确认使用 `visual-decomposition-confirmation/1.0`，绑定拆解图、技术 JSON、生产方案、target、baseline、candidate/diff、全部编号和用户原文。`v2Artifact.human_review`、`v2StructuredReview`、`combinationPreacceptance`、`structuredFidelityCase.human_review`、逐 `fidelityRegionResult.human_review`、F2 review 和 `component_reviews[].human_review` 均不是人工审阅要求；这些工件必须改用当前身份绑定的确定性机器 evidence 和 status，hash 可选且不参与验收。V5 COMPLETE 的 `all_visual_artifacts_human_reviewed` 不能单独满足 schema/运行时硬门。

> 适用技术栈：cocos、phaser、threejs。

上述限制针对机器工件中的重复审阅字段，不取消现有选图、拆解、布局和运行验收中的实际人工视觉确认。观看舒适、主题/受众适配与美术完成度意见保存在现有任务验收材料，机器 F2 的 `validationMode=MACHINE` 只表示事实核对；不能将其单独表述为美术或持续游玩已通过。

> 适用技术栈：cocos、phaser、threejs。

效果图相关 Schema 统一使用 `origin=provided|generated`。generated 的 `reference_target`、上下文效果图、V3 artifact 或原子 expected asset 必须带 `generation_record`；provided 禁止带生成记录。generation record 的身份字段、完整 `style_reference_inputs`、canonical 全局视觉一致性提示词、`style_drift_policy=forbid`、实际 `full_prompt`、输出文件、`consistency_status=passed` 与 `consistency_evidence` 由共享合同进一步校验，Schema 不承担项目具体美术风格解释。

> 适用技术栈：phaser、threejs。

效果图 `scene_reconstruction_contract` 的 V2 最低字段包括 `reference_technical_conflicts`（允许空数组但不得省略）、`display_layer_planning`（无显示层也必须显式 `inventory=[]`）、scene master/reference target、宿主上下文图和初步还原草案；规划必须区分 scene master、宿主场景上下文层图和 V3 component×state 生产方案，并声明 `visual_validation.mode=usability|exact`（默认 `usability`，effect-image 不自动启用 `exact`）。V3 固定串行：先产出拆解标注图、技术拆解 JSON 和 `decomposition_elements`，人工修改并确认；再依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果生成 `automatic-layout-decision/1.0`；未经明确授权不得分析截图，事实不足时标记待定并集中澄清。逐元素声明水平 `left/center/right` 与垂直 `top/center/bottom`，不得从几何距离自动反推；随后由确认元素与视觉决策生成布局图并人工确认。布局确认必须绑定布局决策文件/ID、最终图、上游拆解、scene/state/target 和用户 receipt，任一上游身份变化都必须重新确认。V3→V4 必须绑定拆解图、技术 JSON、视觉布局决策、布局图、coverage、生产合同、`visualProductionUnits` 及两次人工确认。结构化 fidelity case 不要求候选 SHA 或差异指纹，须记录实际运行结果并提供 `normalization_equivalence.viewport`、`dpr`、`logical_coordinates` 三项等价证明。`usability` 默认记录关键关系和可用性事实，已确认关键目标、已声明容差和适配规则仍须满足；仅 `exact` 模式要求完整矩阵及严格 `difference_evidence`、target/candidate measurement、delta、预声明 `tolerance_reference`、result、evidence 和（可为空的）`exception_ids`。V5 在正式场景提供同屏组合及瞬态层打开→交互→关闭→底层状态/焦点恢复轨迹。
