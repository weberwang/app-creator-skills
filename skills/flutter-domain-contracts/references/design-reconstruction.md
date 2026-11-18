# Flutter 设计拆解与当前还原合同

这是 Flutter PAGE／DISPLAY_LAYER 的正式领域合同。公共控制器在 V3–V5 实际执行 `flutter-design-contract.mjs`；[Schema](design-reconstruction.schema.json)约束冻结计划，[模板](../templates/design-reconstruction.json)提供可执行字段。选稿及设计节点身份按[Figma App 设计流程](../../app-ui-layout/references/figma-app-design.md)与公共控制器记录；本合同补充必要的实现映射，不建立新阶段、逐素材审批或另一套状态机。

## 责任与阶段

V2 默认先分析、生图及用户确认效果图，再按明确授权忠实重建可编辑 Figma。原效果图是确认的视觉目标，真实节点是结构与规格的提取来源，两者用转换及冻结引用关联。源图已确认且授权忠实还原时，结构核对完成即可继续 V3，不重复要求确认同一目标的新预览；重建预览未经人工检查仍保持未检查。V3 从真实节点提取交接，不能从已有代码反向拼规格；清楚表达的结构与布局无需重画或重复审批。允许合格原生组件、全原生页面、共享图片及组件复用，逐项证明当前结构、样式和状态，仅换 Theme、颜色或默认控件不能证明还原。

`usability` 与 `exact` 均要求布局、层级、形状、排版、视觉特征、状态和当前目标对照；usability 仅省略完整像素级 fidelity 矩阵。功能测试、命令通过、截图采集和摘要匹配均为技术事实，不等于视觉通过。

V3 只冻结拆解与生产规格，不强制已有源码或图片；V4 才取得、制作、导入与读取实际资源，并核查当前组件；V5 提交正式组合及用户真实视觉确认。

## V3 冻结计划

领域封套 `designReconstructionRef: {path,sha256}` 指向计划 JSON；`figmaDesignRef` 冻结重建节点、原始采集和独立预览，`figmaHandoffRef` 将设计项映射到节点并冻结布局及原生计划。根记录 `schemaVersion: "1.0"`、`workItemId`、`objectId`、`candidateId` 与 V2 已确认原效果图 `referenceTarget`；显示层另填宿主和层类型。快照的 `reconstruction` 绑定源图、真实还原授权及执行方式。重建预览不替换源图身份，修改产物后生成新冻结版本并更新受影响引用，保留历史确认。

- `conditions`：唯一 `id`、真实 `stateId`、逻辑 `viewport:{width,height}`、`language`、`textScale`、`adaptation:{platform,orientation,safeArea:{top,right,bottom,left},keyboard}`。默认主目标；其他已分别确认的状态或视口使用 `targetRef`，须出现在领域封套 additionalTargets 中，并由其真实 V2 完整目标确认支持。每个已声明目标都必须进入条件和设计项覆盖，不能只出现在 fidelity 用例中。
- `elements`：每个可见元素唯一 `id`、`label`、`targetRef`、可核对的 `region:{x,y,width,height,unit:"px",frame?}`、适用 `conditionIds`、真实 `parentId`（根为 null）、`layoutReference`（viewport 或另一设计项）、唯一 `implementationId`。区域可由实际 Figma 节点边界直接导出并经 handoff 映射到节点，无需另画拆解图；预览区域和节点身份均绑定已选目标。
- `implementations`：唯一 `id`、`kind`（native／image／shared-image／dynamic）、精确 `designItemIds`、`consumers:[{id,sourcePath,symbol}]`、逐项 `designReason`、`requirements`。一项设计只绑定一个主要实现；一个实现可服务多项设计，但必须穷尽其消费者和状态，不能用“全部原生”取代逐项分析。
- `requirements`：结构 `structure`、尺寸 `size`、间距 `spacing`、字体 `typography`、颜色 `color`、边框 `border`、形状 `shape`、状态 `states`。每项记录可执行 `value`、`basis`（measured／estimated／adaptation／approved-change）、`reason`。非文字对象的字体等不适用项在 value 内明确 `applicable:false` 和原因，不填无意义占位文本。测量值、估计、适配和用户批准的变化不能互相冒充；批准变化还须 `approvalRef` 指向真实用户决定，逐设计项、属性与条件核对范围。

文字及承载文字的映射必须在 `requirements.appearance.value.normalized` 中记录文字自身的 `textFill` 和 `textOpacity`。纯色记录 RGBA，或记录 RGB 与明确的填色 opacity；渐变保留每个停靠点的 RGBA。文字节点自身透明度使用 0–1 的 `ratio`；背景颜色或父容器透明度不能充当文字读数。V4/V5 按当前设计项和状态对照实际组件的文字填色及透明度，缺失或与目标不符时保持未验证。图片文字仍按实际生产来源与用户显示确认核对。
- 图片实现另需 `production`：`identity`（independent／shared）、准确 `consumerIds`、`sourceRegion`、正式 `outputPath`、物理 `outputSize`、逻辑 `displaySize`、`density`、`background`、`transparentInsets`、`edgePolicy`；按实际需要补 `effectiveContentBounds`、`slice` 或有序 `frames`。不需要的切片、帧序直接省略。共享图必须有多个真实消费者，来源帧可记在 sourceRegion.frame。源图区域只说明设计来源，V4 再登记实际制作来源。

节点提取使用[本地提取器](../scripts/extract-figma-plan.mjs)，在项目根执行 `node .agents/skills/flutter-domain-contracts/scripts/extract-figma-plan.mjs <冻结快照JSON> <实际映射JSON> <新版本计划输出> <新版本交接映射输出>`；参数替换为真实项目路径。映射声明真实消费者、节点、状态及 native／image／shared-image／dynamic 路线，图片实现补生产规格并保留 `sourceAssets` 的实际来源。快照路径及摘要必须匹配；输出拒绝覆盖已有冻结文件。`requirements.appearance` 同时保留 `raw` 原属性和 `normalized` 值，其余需求从同一真实节点提取，不能由旧代码反向拼出。

带可见填充、边框、效果或部分透明度的容器也须映射，包括真实页面背景；仅映射子文字不能丢掉父容器的视觉表现。纯组织层可省略，但须保留最近已映射祖先及坐标转换依据；不确定的旋转／变换明确阻断，不能静默改变层级或坐标。

逐角数据保留为 topLeft／topRight／bottomRight／bottomLeft 并交接 `BorderRadius.only`，例如 20／20／0／0 不统一归零、不塞进 kind。排版明确逻辑像素、源行高 PIXELS／PERCENT／AUTO 与 Flutter 行高倍率，字距按源单位换算；AUTO 保留自动语义。渐变保留 stops、颜色和变换，图片填充保留 scaleMode 及变换，透明度与边框独立交接，不删字段迁就 Schema。视觉轮廓与触控容器分别映射并核对包围关系，例如 44 高输入框可置于真实 48 高命中容器内；零尺寸 SVG 路径定位到具体节点修复并重新采集，不能静默跳过或反复重建整页。

Figma `LINE` 的本地高度为零、长度在 width，方向由 rotation 表达；V3 的 `requirements.size` 原样保留此事实，`shape.flutter.geometry` 标记按真实长度与旋转派生，不能伪造源路径。`region` 优先采用实际 `absoluteRenderBounds` 与根 `absoluteBoundingBox` 换算；没有这两项时，以实际中心描边、旋转及 NONE／ROUND／SQUARE 线帽计算可见包围范围，不以描边厚度替换源节点高度。可见特效或其他线帽需要实际渲染边界；旋转祖先目前无法可靠推导，不能将估计冒充测量。

机器校验唯一身份、映射覆盖、父子关系、状态与参照有效性；设计截图与运行截图默认由用户检查。选稿已经表达清楚的拆解和布局不再重复审批；用户仍需判断设计方案、范围和最终视觉结果，机器通过不能冒充该结论。

## 确认范围的机器消费

沿用控制器 `visual.reviews`。Figma 路线使用 V2 目标选定、V4 正式资源和 V5 完整组合确认；稿内已表达清楚的 V3 交接不要求另有 V3Decomposition、V3Layout 两次人工批准。样本及局部设计变化依实际范围记录，不增加逐素材审批；实质改变已选视觉或交互方案时才重新确认。

V2 真实用户选稿绑定设计身份和覆盖范围，不预造 V3 计划；V3 handoff 将当前 Figma 设计项、布局及原生计划绑定起来。V4 正式资源和 V5 完整组合确认必须绑定 `referenceTarget`、`designReconstructionRef`、`scope:{kind:"full-object",designItemIds:[完整集合],conditionIds:[完整集合]}` 与真实 `userMessageRef`；V4 另绑定 `assetReviewRef`，V5 另绑定 `comparisonRef`。控制器消费并精确比对集合及引用，样本或局部决定不能提升为完整验收。

单项替换确认使用 `purpose:"design-change"`、`scope.kind:"design-items"`、适用 `designItemIds`、`conditionIds`、`properties`；只有被范围覆盖的 approved-change 属性能引用它。它不能消除其他设计项、检查、状态或整页验收要求。代表样本不能填入完整阶段通过节点；样本通过后仍需正式资源和 V5 全组合验收。

## V4 实际实现与导入

领域封套 `implementationEvidenceRefs` 是每个实现恰好一份的冻结 JSON 引用。每份记录当前 `schemaVersion/workItemId/objectId/candidateId`（显示层另含宿主）、`implementationId`、相同 `designReconstructionRef`、全部真实消费者源码 `sourceRefs:[{path,sha256}]`、`method`（source-inspection／layout-test／runtime-measurement）、原始输出 `executionRef`。

`observations` 必须逐设计项、逐适用条件、逐 requirements 属性记录 `{designItemId,conditionId,property,value}`。实际 value 与冻结要求比对，缺项、错值、重复或无关观测均阻止通过。不能只提交“源码存在”、非空任意文档或自写 PASS；源码变化会使摘要失效，必须重新核验。

`executionRef` 必须指向可解析的原始观测 JSON，使用[原始观测模板](../templates/design-observations.json)。它包含当前对象身份、`format:"flutter-design-observations-v1"`、`implementationId`、`method`、相同 `designReconstructionRef`、`sourceRefs`、准确 `consumers`，以及 `observations:[{designItemId,conditionId,property,observed,bindings?}]`。observed 须与声明 value 一致，不能把期望与实际混成一个 PASS 字段。

source-inspection 的每条原始观测提供 `bindings:[{pointer,sourcePath,start,end,encoding}]`，指向当前正式源码中可复算的字面量；start/end 为 UTF-16 字符偏移，end 不含末端，pointer 为观测对象内 JSON 指针。可定位整个值（pointer 为空串），或完整覆盖所有叶值。encoding 为 json 时重新解析源码片段，为 text 时读取片段原文；校验器重新读取实际源码并比对 observed，不能用空 Widget 加复制计划通过。变量或表达式无法以字面量复算时，应从真实布局测试或运行测量取值，不强迫应用为验收新增无效常量。source-inspection 只证明声明的源属性事实，定位是否属于生效的真实组件仍需代码审查；它不自动证明运行显示效果。

layout-test／runtime-measurement 的原始观测另含 `commandCaptureRef`，指向 `command-capture-v1` 的真实成功命令采集；stdout 必须为结构化原始观测数组，与报告逐条一致。保留真实命令、退出码与原始输出，不允许任意文本日志冒充属性观测。记录本身的真实性仍须可追溯，控制器不替代执行环境的信任边界。

命令必须可实际复跑，不能填写 `<执行某项检查>`、TODO 或路径占位；失败保留真实非零退出码与输出，不将未执行记录补成通过。结构通过、工程通过、源图确认及运行视觉验收分别报告，不能相互替代。

图片报告另记录 `imported:{assetRef,provenanceRef,importEvidenceRef,production,consumerIds}`。正式资源路径必须等于冻结 outputPath，实际生产参数与消费者须与计划一致；实际来源及导入加载原始输出分别可读且摘要匹配。格式解码、Alpha、有效内容、边缘、切片、加载回读等适用技术检查继续遵循素材和 Flutter 原生规则，不由字段相等代替真实执行。

公共 asset-review 中每项 `assetId` 对应 implementation.id，补齐 `designItemIds`、`consumerIds` 和相同 `implementationEvidenceRef`。原生 componentEvidenceRef 指向该结构化报告，output 对应源码；图片 output 对应正式资源。集合必须完整，不能用一个头像决定关闭其他原生组件。

## V5 当前组合对照

领域封套 `comparisonRef` 指向 JSON，记录当前对象身份、冻结 `designReconstructionRef`、当前全部 `implementationEvidenceRefs` 和 `cases`。每个条件恰好一个用例：`{conditionId,conditions,targetRef,runtimeRef,captureRef,designItemIds}`；conditions 完整复述计划的视口、状态、语言、文字倍率和适配条件，targetRef 绑定该条件的已确认目标，runtimeRef 为当前正式组合截图，设计项集精确对应该条件。exact 的额外视口目标同时遵循现有 additionalTargets 和 fidelity 合同。

`captureRef` 引用[采集上下文](../templates/runtime-capture.json)，记录当前对象身份、`format:"flutter-runtime-capture-v1"`、相同 runtimeRef、conditions、designReconstructionRef、当前 implementationEvidenceRefs、所有当前 sourceRefs、实际 `captureMethod`、`pixelRatio` 和 `captureOutputRef`。技术校验解码截图并核对逻辑视口乘像素倍率后的尺寸；文本伪截图、直接把目标路径当运行截图均被拒绝。独立采集可能与目标恰好同字节，不能仅凭摘要相同拒绝合法还原。采集日志、上下文和摘要只能说明技术身份，不自动证明截图来自真实运行或显示效果通过。

默认由用户人工检查截图、目标与组合。代理只校验材料身份、覆盖和工程事实，不自动分析截图、不代写视觉 PASS；用户明确授权自动视觉分析时，另记录授权与范围，仍不能扩大批准范围。真实性无法从本地 JSON 独立证明，用户消息来源、实际截图是否来自声明运行及视觉一致性必须保留可审计来源并由人工判断。

发现未拆解元素、缺生产要求或布局方案错误时 RETURN 到 V3；已确认目标变化 RETURN 到 V2；仅实现偏离按最早受影响阶段返修。控制器作废当前领域封套与受影响下游确认／资源引用、禁止重新绑定；保留历史文件，不覆盖旧证据。
