# 单目标领域合同

本页的 PAGE／DISPLAY_LAYER 和原图片场景领域门保持；显式 3D 世界使用[无图场景合同](world3d-scenes.md)的冻结源、模型及运行链，不借此取消 UI 原生领域校验。

Roblox 使用 SCENE 和独立 DISPLAY_LAYER，不使用 PAGE。显示层公共包装沿用身份、确认引用与宿主字段，另以 `robloxEvidenceRef: {path,sha256}` 关联[Roblox 原生合同](../../roblox-domain-contracts/references/domain-validation.md)。V1 确认完整模块方案，V2–V5 分别验证模块目标、布局、正式资源和当前运行组合；V5 由公共工程证据入口验证实际执行。结构、工程与用户人工显示结论分别记录。

Expo PAGE 和 DISPLAY_LAYER 使用同一公共阶段与证据容器，默认采用[Figma App 设计流程](../../app-ui-layout/references/figma-app-design.md)并由独立 Expo 领域校验器处理 React Native 布局、资源和运行记录。按 [Expo 领域证据合同](../../expo-domain-contracts/references/domain-validation.md)逐阶段绑定平台、设计、正式源和当前宿主；V2 不提前要求 V3–V5 产物，V3 不强制提前实现正式组件。原生与 Web、开发与发布构建分别记录，不借浏览器截图或手写 PASS 代替原生运行与用户视觉确认。

正式实现的 PAGE 和 DISPLAY_LAYER 在 V1 确认完整模块方案后，V2 生成并确认覆盖适用状态和进度的模块稿，V2–V5 分别将 `visual.domainEvidenceRef` 指向当前阶段的领域证据文件，引用包含实际 `path` 和 `sha256`。仅设计提案可独立进入设计任务。阶段证据根记录 `schemaVersion: "1.0"`、`workItemId`、`projectId`、`stack`、`workItemType`、原生封套标记 `visualStageModel: "function-first-v1"`、`visualStage`、`objectId`、`candidateId` 和 `referenceTarget: {path,sha256}`。App 默认图片路线的目标为用户确认的原效果图，可编辑节点通过 reconstruction 关联原图。阶段证据随阶段更新。

DISPLAY_LAYER 另记录 `hostId` 和 `layerType`，必须与当前显示层工作项一致。Unity 证据以 `nativeWorkItemRef: {path,sha256}` 指向实际原生显示层工作项；V3–V5 另以 `nativeEvidenceRef` 指向对应阶段原生证据。原生工作项须绑定显示层、宿主、阶段和响应式合同，原生证据须通过实际领域校验；V5 还记录实际 `stateId` 和 `viewport`，并与人工验收情境中的对象、候选、目标和运行条件一致。

Unity 显示层从 V3 起声明实际 `stateId`，沿用 `V3Layout.layoutSpecRef` 冻结对应布局计划。有文字时在 V5 将当前原生 `uiLayoutMeasurementRef` 与公共 `runtime-layout` 指向同次实际采集。[Unity 运行回读](../../unity-development-workflow/references/ui-layout-runtime.md)

Cocos、Phaser 和 Three.js 的 DISPLAY_LAYER 使用 `manifestRef: {path,sha256}` 指向实际视觉清单，清单绑定当前工作项、候选、阶段和 V2 目标，并包含唯一当前显示层及宿主；V2 运行场景还原合同，V3–V5 运行本栈的清单和文件门。V5 运行轨迹须覆盖打开、交互、关闭与恢复。

Web 清单有带编号的拆解区域时，领域证据还提供 `visualConfirmationAuthorityRefs` 和排序去重的 `visualConfirmationPrerequisiteFiles`，指向 `.workflow-control/user-resolutions/` 下实际用户决定记录。控制器通过本栈 loader 读取并复核当前工作项、候选、场景和状态；不能在领域证据中自行填写权威通过对象。SCENE 多目标将相同引用放在各自领域清单中。

Flutter PAGE 和 DISPLAY_LAYER 的 V2 绑定当前对象、`figmaDesignRef: {path,sha256}` 及已确认原图到忠实重建节点的转换关系；原图确认与还原授权有效时不要求用户再选一次重建预览，不预先要求布局产物。V3–V5 以 `figmaHandoffRef` 将节点和设计项对应起来并冻结 `layoutSpecRef` 和 `designReconstructionRef`；可直接从已选节点提取关系和边界，不强制重新绘图或重复人工确认。自适应布局规格的 `page.id` 须与对象一致，[设计还原合同](../../flutter-domain-contracts/references/design-reconstruction.md)逐项连接目标、组件或素材、消费者与当前证据。`visualValidationMode` 默认 `usability`，仍须还原目标布局、层级、形状、排版及视觉特征；仅 `exact` 强制完整 fidelity 矩阵。V5 绑定当前目标、正式组合、视口、状态、语言、文字倍率及适配条件；截图由用户人工检查。

Flutter DISPLAY_LAYER 的 V2、V4 和 V5 人工确认还须记录当前 `hostId` 和 `layerType`；Figma 交接已经表达的 V3 拆解与布局不要求再设独立人工批准。V5 领域证据使用 `runtimeContextRef: {path,sha256}` 引用运行上下文 JSON，V5 人工确认引用同一文件。上下文记录 `schemaVersion`、`workItemId`、`objectId`、`candidateId`、`hostId`、`layerType` 和 `interactions`；分别记录 `open`、`close`、`focus-restore` 的实际证据或不适用原因。更换宿主或层类型须重新确认并验证受影响上下文，不要求宿主另建工作项或等待宿主 V5。

额外视口目标也可沿有效的 V2 视觉复用链引用来源确认；完整阶段继承的来源必须已完成 V5；仅引用有效已确认原图时核对同一目标、摘要和真实消息即可，不继承来源工程结论。当前 V4/V5 材料仍须重新验证。

V1 不需要这些视觉领域证据，也不强制白盒。缺失文件、错阶段、错对象或错宿主时修复证据并重新校验，不通过手写 PASS 替代实际领域合同。
