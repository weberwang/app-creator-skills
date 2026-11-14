# Flutter 设计拆解与当前还原合同

这是 Flutter PAGE／DISPLAY_LAYER 的正式领域合同。公共控制器在 V3–V5 实际执行 `flutter-design-contract.mjs`；[Schema](design-reconstruction.schema.json)约束冻结计划，[模板](../templates/design-reconstruction.json)提供可执行字段。它补充自适应布局规格，不建立新阶段、逐素材审批或另一套状态机。

## 责任与阶段

V2 已确认设计图是事实源。V3 从图中可见元素推导拆解、布局及实现方案；不能从已有代码反向拼出规格。允许合格原生组件、全原生页面、共享图片和既有组件复用，必须逐项证明当前结构、样式与状态；换 Theme、颜色、默认控件、抽象 Widget 树或职责框图不能单独证明还原。也不能把文字、交互、动态内容全部切成图片。

`usability` 与 `exact` 均要求布局、层级、形状、排版、视觉特征、状态和当前目标对照；usability 仅省略完整像素级 fidelity 矩阵。功能测试、命令通过、截图采集和摘要匹配均为技术事实，不等于视觉通过。

V3 只冻结拆解与生产规格，不强制已有源码或图片；V4 才取得、制作、导入与读取实际资源，并核查当前组件；V5 提交正式组合及用户真实视觉确认。

## V3 冻结计划

领域封套 `designReconstructionRef: {path,sha256}` 指向计划 JSON。根记录 `schemaVersion: "1.0"`、`workItemId`、`objectId`、`candidateId`、V2 相同的 `referenceTarget`；显示层另填 `hostId`、`layerType`。实际实现证据放在后续封套，不能为补导入记录改写已批准的计划。

- `conditions`：唯一 `id`、真实 `stateId`、逻辑 `viewport:{width,height}`、`language`、`textScale`、`adaptation:{platform,orientation,safeArea:{top,right,bottom,left},keyboard}`。默认主目标；其他已分别确认的状态或视口使用 `targetRef`，须出现在领域封套 additionalTargets 中，并由其真实 V2 完整目标确认支持。每个已声明目标都必须进入条件和设计项覆盖，不能只出现在 fidelity 用例中。
- `elements`：每个可见元素唯一 `id`、`label`、`targetRef`、源图可核对的 `region:{x,y,width,height,unit:"px",frame?}`、适用 `conditionIds`、真实 `parentId`（根为 null）、`layoutReference`（viewport 或另一设计项）、唯一 `implementationId`。源图定位即可，不要求额外制作标注图；若制作标注图，其编号与 ID 对照仍须在计划中可查。
- `implementations`：唯一 `id`、`kind`（native／image／shared-image／dynamic）、精确 `designItemIds`、`consumers:[{id,sourcePath,symbol}]`、逐项 `designReason`、`requirements`。一项设计只绑定一个主要实现；一个实现可服务多项设计，但必须穷尽其消费者和状态，不能用“全部原生”取代逐项分析。
- `requirements`：结构 `structure`、尺寸 `size`、间距 `spacing`、字体 `typography`、颜色 `color`、边框 `border`、形状 `shape`、状态 `states`。每项记录可执行 `value`、`basis`（measured／estimated／adaptation／approved-change）、`reason`。非文字对象的字体等不适用项在 value 内明确 `applicable:false` 和原因，不填无意义占位文本。测量值、估计、适配和用户批准的变化不能互相冒充；批准变化还须 `approvalRef` 指向真实用户决定，逐设计项、属性与条件核对范围。
- 图片实现另需 `production`：`identity`（independent／shared）、准确 `consumerIds`、`sourceRegion`、正式 `outputPath`、物理 `outputSize`、逻辑 `displaySize`、`density`、`background`、`transparentInsets`、`edgePolicy`；按实际需要补 `effectiveContentBounds`、`slice` 或有序 `frames`。不需要的切片、帧序直接省略。共享图必须有多个真实消费者，来源帧可记在 sourceRegion.frame。源图区域只说明设计来源，V4 再登记实际制作来源。

机器校验唯一身份、映射覆盖、父子关系、状态与参照有效性；人工拆解确认负责判断源图是否真的穷尽可见元素、区域与方案是否正确。不能用“机器通过”冒充该人工结论。

## 确认范围的机器消费

沿用 `visual.reviews` 中 V2、V3Decomposition、V3Layout、V4、V5 节点。确认分别记录 target、decomposition、layout、imported-assets、runtime-acceptance；样本使用 representative-sample，局部替换／设计变化使用 design-change，仍是支持记录，不增加审批节点。

V3 拆解、V3 布局、V4 正式资源及 V5 完整组合确认必须绑定 `referenceTarget`、`designReconstructionRef`、`scope:{kind:"full-object",designItemIds:[完整集合],conditionIds:[完整集合]}`、真实 `userMessageRef`。布局确认另绑定当前 `layoutSpecRef`；V4 另绑定实际 `assetReviewRef`，从而冻结正式资源、组件及当前报告身份；V5 另绑定当前 `comparisonRef`。控制器消费并精确比对这些集合和引用，拒绝样本范围、子集、重复或额外身份。V2 只确认完整目标，不预造 V3 计划。

单项替换确认使用 `purpose:"design-change"`、`scope.kind:"design-items"`、适用 `designItemIds`、`conditionIds`、`properties`；只有被范围覆盖的 approved-change 属性能引用它。它不能消除其他设计项、检查、状态或整页验收要求。代表样本不能填入完整阶段通过节点；样本通过后仍需正式资源和 V5 全组合验收。

## V4 实际实现与导入

领域封套 `implementationEvidenceRefs` 是每个实现恰好一份的冻结 JSON 引用。每份记录当前 `schemaVersion/workItemId/objectId/candidateId`（显示层另含宿主）、`implementationId`、相同 `designReconstructionRef`、全部真实消费者源码 `sourceRefs:[{path,sha256}]`、`method`（source-inspection／layout-test／runtime-measurement）、原始输出 `executionRef`。

`observations` 必须逐设计项、逐适用条件、逐 requirements 属性记录 `{designItemId,conditionId,property,value}`。实际 value 与冻结要求比对，缺项、错值、重复或无关观测均阻止通过。不能只提交“源码存在”、非空任意文档或自写 PASS；源码变化会使摘要失效，必须重新核验。

`executionRef` 必须指向可解析的原始观测 JSON，使用[原始观测模板](../templates/design-observations.json)。它包含当前对象身份、`format:"flutter-design-observations-v1"`、`implementationId`、`method`、相同 `designReconstructionRef`、`sourceRefs`、准确 `consumers`，以及 `observations:[{designItemId,conditionId,property,observed,bindings?}]`。observed 须与声明 value 一致，不能把期望与实际混成一个 PASS 字段。

source-inspection 的每条原始观测提供 `bindings:[{pointer,sourcePath,start,end,encoding}]`，指向当前正式源码中可复算的字面量；start/end 为 UTF-16 字符偏移，end 不含末端，pointer 为观测对象内 JSON 指针。可定位整个值（pointer 为空串），或完整覆盖所有叶值。encoding 为 json 时重新解析源码片段，为 text 时读取片段原文；校验器重新读取实际源码并比对 observed，不能用空 Widget 加复制计划通过。变量或表达式无法以字面量复算时，应从真实布局测试或运行测量取值，不强迫应用为验收新增无效常量。source-inspection 只证明声明的源属性事实，定位是否属于生效的真实组件仍需代码审查；它不自动证明运行显示效果。

layout-test／runtime-measurement 的原始观测另含 `commandCaptureRef`，指向 `command-capture-v1` 的真实成功命令采集；stdout 必须为结构化原始观测数组，与报告逐条一致。保留真实命令、退出码与原始输出，不允许任意文本日志冒充属性观测。记录本身的真实性仍须可追溯，控制器不替代执行环境的信任边界。

图片报告另记录 `imported:{assetRef,provenanceRef,importEvidenceRef,production,consumerIds}`。正式资源路径必须等于冻结 outputPath，实际生产参数与消费者须与计划一致；实际来源及导入加载原始输出分别可读且摘要匹配。格式解码、Alpha、有效内容、边缘、切片、加载回读等适用技术检查继续遵循素材和 Flutter 原生规则，不由字段相等代替真实执行。

公共 asset-review 中每项 `assetId` 对应 implementation.id，补齐 `designItemIds`、`consumerIds` 和相同 `implementationEvidenceRef`。原生 componentEvidenceRef 指向该结构化报告，output 对应源码；图片 output 对应正式资源。集合必须完整，不能用一个头像决定关闭其他原生组件。

## V5 当前组合对照

领域封套 `comparisonRef` 指向 JSON，记录当前对象身份、冻结 `designReconstructionRef`、当前全部 `implementationEvidenceRefs` 和 `cases`。每个条件恰好一个用例：`{conditionId,conditions,targetRef,runtimeRef,captureRef,designItemIds}`；conditions 完整复述计划的视口、状态、语言、文字倍率和适配条件，targetRef 绑定该条件的已确认目标，runtimeRef 为当前正式组合截图，设计项集精确对应该条件。exact 的额外视口目标同时遵循现有 additionalTargets 和 fidelity 合同。

`captureRef` 引用[采集上下文](../templates/runtime-capture.json)，记录当前对象身份、`format:"flutter-runtime-capture-v1"`、相同 runtimeRef、conditions、designReconstructionRef、当前 implementationEvidenceRefs、所有当前 sourceRefs、实际 `captureMethod`、`pixelRatio` 和 `captureOutputRef`。技术校验解码截图并核对逻辑视口乘像素倍率后的尺寸；文本伪截图、直接把目标路径当运行截图均被拒绝。独立采集可能与目标恰好同字节，不能仅凭摘要相同拒绝合法还原。采集日志、上下文和摘要只能说明技术身份，不自动证明截图来自真实运行或显示效果通过。

默认由用户人工检查截图、目标与组合。代理只校验材料身份、覆盖和工程事实，不自动分析截图、不代写视觉 PASS；用户明确授权自动视觉分析时，另记录授权与范围，仍不能扩大批准范围。真实性无法从本地 JSON 独立证明，用户消息来源、实际截图是否来自声明运行及视觉一致性必须保留可审计来源并由人工判断。

发现未拆解元素、缺生产要求或布局方案错误时 RETURN 到 V3；已确认目标变化 RETURN 到 V2；仅实现偏离按最早受影响阶段返修。控制器作废当前领域封套与受影响下游确认／资源引用、禁止重新绑定；保留历史文件，不覆盖旧证据。
