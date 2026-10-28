# 视觉质量专业复核

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

各技术栈统一使用 V0–V5；V1 是功能实现与验证，白盒可选，正式功能不必等待视觉目标。

## 视觉质量门

> 适用技术栈：cocos、phaser、threejs。

视觉拆解确认只能由编排层在收到用户确认消息后写入受保护的 `user-resolution-ledger/1.0`；Work Item 仅引用 `visualConfirmationAuthorityRefs[]`，不得内嵌 receipt 或自称 authority。前置文件冻结在 Work Item 根的 `visualConfirmationPrerequisiteFiles`，控制面写入 ledger/receipt 后，loader 核对真实文件、用户决定来源和任务归属；不要求 Git 摘要或 baseline blob 比对。V3 ledger 不记录 `task_authorization_id`。

> 适用技术栈：cocos、phaser、threejs。

视觉领域规则只能收紧 “app-workflow-control”（见本栈配套资料）。公共对象阶段为 V0–V5，Work Item 使用 `visual.stage` 记录，不能将其作为工作项的 `stageId`；各技术栈均使用一致的 V0–V5 阶段；全局状态、审批与 F0-F4 语义不得改写。

> 适用技术栈：cocos、phaser、threejs。

场景视觉与功能生命周期沿用当前场景 Work Item 的 V0→V1→V2→V3→V4→V5 阶段；本领域只补充视觉质量事实。V3 依次完成拆解确认和布局确认，V4 完成正式资源验收，V5 直接消费 V3 布局与 V4 正式资源，完成运行态视觉接入和功能/视觉联合复验。全局基线、基础工程和集成入口以控制面文档为准。

## 路径

> 适用技术栈：cocos、phaser、threejs。

- V0 分流原子资源、组件/资源集、场景/整套 UI/视觉系统/重做；参考还原只作为场景实现的可选视觉模式。

> 适用技术栈：cocos、phaser、threejs。

- V1 实现并验证功能，低保真或白盒按需使用。V2 基于已验证功能确认玩法视觉契约、布局合同和早期预算；参考模式在 V2 内冻结 scene master/reference target、宿主上下文图、参考身份、目标视口/状态、对比条件、整屏构图和初步还原草案。

> 适用技术栈：cocos、phaser、threejs。

- V3 直接从 V2 拆解事实形成还原方案：拆解图、proposal 技术 JSON、状态分析、component×state、尺寸、停靠关系、父子关系、对齐关系、coverage、显示层、合同回对、生产路线和预声明容差。V3 先通过 `visual-decomposition-confirmation/1.0` 确认拆解，再通过独立布局确认冻结布局结果。

> 适用技术栈：cocos、phaser、threejs。

- V4 生产并验收正式资源；`production_contract_audit` 必须逐区域比较 V3 预期方法/交付类型与实际输出、生成记录和运行时消费。

> 适用技术栈：cocos、phaser、threejs。

- V5 直接消费 V3 已确认的布局与 V4 已验收资源，实现正式功能并执行运行态视觉接入、动态玩法视觉验证、功能/视觉联合复验、响应式证据和低保真清理。

> 适用技术栈：cocos、phaser、threejs。

普通资产在 schema 1.5 使用 `not-applicable`。效果图 V3 完成后标记 `v3-ready`；V3/V4 可暂无 fidelity case，V5 完成态要求 `v5-complete` 且 fidelity case 非空并全部通过。所有带 `annotation_number` 的区域必须先提交记录冻结目标文件、region ID、实际区域定义 的完整编号拆解提案，并记录 accepted/manual 的拆解确认；AUTO、pending、旧字段或漏编号均拒绝进入 Implementation Package。

> 适用技术栈：cocos、phaser、threejs。

效果图必须采用串行拆解工作流：先整屏构图和拆解确认，再冻结布局节点与元素/状态并完成布局确认，随后把 coverage region、布局合同和 placement 三方绑定，最后按布局合同装配，V5 进行布局+视觉双验收。布局、视觉资源和场景装配属于对应 `SCENE`+`DISPLAY_LAYER` 内部实现职责；不得把场景内部子步骤提升为全局执行阶段。

> 适用技术栈：cocos、phaser、threejs。

场景内显示层沿用同一条 V0→V1→V2→V3→V4→V5 链。主效果图只冻结基础场景与 persistent/HUD，transient 层按必需状态分别提供绑定宿主场景、遮罩/层级和当前状态的 contextual effect image。V3 确认显示层拆解方案，V5 在正式场景组合并提交打开→交互→关闭/恢复轨迹。

> 适用技术栈：cocos、phaser、threejs。

生成式位图生产合同贯穿 V3、V4、V5：`independent-production` 与 `generate-now` 不推断具体生成器；每个区域必须完成 `state_analysis`，并让 `expected_assets` 逐唯一 `component_id × required state_id` 对应独立位图。V4 必须审计 `production_contract_audit` 及逐部件 `component_usages`，V5 再绑定 F3 runtime replay、非空 freshness-bound fidelity cases、实际消费及无未批准替换。

## 失效与返回

> 适用技术栈：cocos、phaser、threejs。

缺字段、路径、对象绑定或可补证据问题在当前阶段 `repair`；上游事实未变的生产、运行态或机器证据问题在当前门 `revalidate`。只有上游事实失效、任务范围真实变化或硬门将被绕过时才 `return` 到 V2/V3/V4 中最早受影响阶段；普通候选身份变化、路径修正和 V4/V5 候选/diff 正常演进不得使 V3 拆解确认失效。
