# 跨栈 V4 历史产物与文字试装验收

本合同适用于需要复核历史生图或采用已确认文字试装的视觉单位。当前 `app-workflow` 控制器接入 Unity、Cocos、Phaser、Three.js 的图片 `SCENE`，在 V4 和 V5 读取同一套决议身份。Cocos、Phaser、Three.js 的独立素材命令也可绑定工作项。Flutter、Expo、ESP32 等技术栈执行各自现有的图文验收合同，需要此决议能力时，先实现能够提供本合同所需身份及实际消费事实的对应采集和校验适配。

资源评审的 `promptAcceptanceRef` 和 `textAcceptanceRef` 是可选的 `{path,sha256}`。任一决议生效时，资源评审的 `technicalStatus` 与 `humanStatus` 均须为 `PASS`。显式引用决议时，控制器核验所引用的每个证据文件、摘要、工作项、技术栈、场景、状态、候选、目标、阶段及用户确认。各引用指向项目内实际文件，摘要为 64 位小写 SHA-256，已作废的文件不可用于重新确认。未声明决议时继续执行当前路线的既有验收门。文件记录用于追溯，用户身份和视觉效果仍由真实用户确认。

## 授权与决议

三种记录的结构见[验收记录 Schema](../schemas/visual-v4-acceptance.schema.json)。用户批准验收规则的消息必须独立于 V4 视觉确认消息，并实际授权本次范围。授权记录填写 `schemaVersion: "1.0"`、`scope`、`decision: "APPROVED"`、`stack`、`workItemId`、`targetId`、`candidateId`、`reviewRef` 和授权消息 `userMessageRef`。`scope` 按用户实际批准的能力填写，`verify-v4-original-prompts` 授权核验历史生图，`accept-v4-text-trial` 授权采用文字试装，`verify-v4-original-prompts-and-approved-trial` 同时授权两项。`reviewRef` 绑定当前 V4 视觉确认，授权消息不得与该确认消息相同。

历史生图决议使用 `schemaVersion: "visual-prompt-acceptance/1.0"`，填写 `stack`、`workItemId`、`targetId`、`sceneId`、`stateId`、`candidateId`、`referenceTarget`、`reviewRef`、`acceptedScreenshot`、`userMessageRef`、`ruleApprovalRef` 和 `runtimeReadbackRef`。`userMessageRef` 与 V4 视觉确认及资源评审的用户消息一致。`assets` 非空，逐项填写 `assetId`、冻结的 `source`、实际消费的 `runtime` 和非空 `receiptRefs`。决议覆盖的资源评审图片逐项填写 `visualReviewScope: "combined-runtime-trial"`，标明确认的是同一正式运行试装画面。控制器读取实际生成收据，核对发送的原始提示词、冻结参考附件和生成原图，并对照领域清单中的原始记录及同次试装的实际消费者。每个资产须有唯一身份，不能借用其他候选、图像、组件或授权。

文字试装决议使用 `schemaVersion: "visual-text-acceptance/1.0"`，填写相同的工作项、技术栈、目标、场景、状态、候选、参考图、V4 确认、截图、用户消息和授权身份，并以 `textRestorationRef` 指向同一资源评审冻结的原生回读报告。控制器逐节点和内容用例核对原始采集、资源、字形读数与报告。V3 冻结的文字内容、用例和参考事实保留，采集报告及决议不重写 V3。V5 使用新的正式运行采集批次，复验相同文字用例和已确认事实。

## 采集证据

Cocos 保留 Creator 实际导入元数据、位图字体、原始读数和截图的既有严格核验。历史生图的运行读回逐项绑定正式源图、实际导入图及其元数据，文字报告保留原生 `rawReadback`、字体资源和同一 `formalIntegration`。Creator 实际原始文字采集支持 `cocos-native-text-trial/1.0`。旧 Cocos 专用决议和授权应按上述共用格式重新冻结，再由资源评审引用新的文件身份。

Unity、Phaser 和 Three.js 的历史生图原始读回使用 `schemaVersion: "visual-image-readback/1.0"`，记录 `stack`、`workItemId`、`targetId`、`sceneId`、`stateId`、`candidateId`、`referenceTarget`、`visualStage: "V4"`、`measurementSource: "runtime-component"`、`screenshotRef` 和 `formalIntegrationRef: {path,sha256}`。`assets` 逐项记录 `assetId`、冻结的 `source` 和 `runtime`，以及实际消费者的 `componentPath`。运行读回来自正式目标的同次试装，并与已确认截图及决议对应。

`formalIntegrationRef` 指向 `schemaVersion: "visual-image-integration/1.0"` 的报告，记录与原始读回相同的技术栈、工作项、目标、场景、状态、候选、参考图、V4 阶段、运行采集来源及截图身份。`formalIntegration` 包含 `entryRef: {path,sha256}`、`rootComponentPath` 和 `images: [{assetId,outputRef:{path,sha256},componentPath}]`。正式入口与组件根须匹配 V3 冻结的正式布局目标，`images` 覆盖本次资源评审中的全部图片，并与原始读回逐项匹配输出文件身份及实际组件消费者。纯图片目标同样提供该报告。

Unity 的图片正式接入报告另填写 `runId`、`nativeLayoutRef` 和 `gameViewCaptureRef`，绑定同帧生成的原生布局报告和 Game View 采集报告。晚于该截图另行采集的读数须使用新的截图重新确认。图文决议同时生效时，`nativeLayoutRef` 与 `textRestorationRef` 指向同一份采集。uGUI 对照实际 `Image.assetPath` 和 `objectPath`，V5 逐图复验 `assetGuid` 和 `localId`。UI Toolkit 以 `rootComponentPath` 绑定实际 UIDocument 的 `objectPath`，再核对元素 `elementName`、现场背景 GUID 及 `images[].importMetadataRef: {path,sha256}` 冻结的 `.meta`。历史生图决议使用真实提示词和同图视觉评审，附件角色与顺序、区域、实际运行尺寸及资源消费仍经原有 Unity 资源门逐项校验。

Unity 的资源评审沿用 `generationRecord` 和 `generationRecordSha256` 引用正式生成记录。记录保留 `assetId`、`candidateId`、字符串路径形式的 `referenceTarget`、`region.id`、`runtimePath`、`prompt`、`actualReferenceInputs`，并记录 `rawOutput: {path,sha256}` 和 `receiptRefs: [{path,sha256}]`，供控制器共同核对真实生成收据、参考附件和原始图片。

Unity 的文字决议以 `textRestorationRef` 指向实际原生布局报告，并以 `gameViewCaptureRef` 绑定同帧生成的 Game View 报告。使用 `uwt_capture_game_view` 的 `layoutMeasurement` 参数采集原生证据。截图配套的 `<截图路径>.json` 记录实际帧号和布局报告的 `path`、`sha256`、`runId`、`frameCount`。控制器将这些字段与冻结的布局报告及已确认截图对照。V5 采集独立正式运行批次，比较各可见节点的实际文字属性，并继续核对 V3 布局和拆解。

Phaser 和 Three.js 的原始文字读回使用 `schemaVersion: "visual-text-readback/1.0"` 和相同的工作项、技术栈、目标、状态、候选、阶段、测量来源及截图身份，另记录 `runId`、`formalIntegration`、`fontResources` 和 `nodes`。每个节点填写 `textNodeId`、`layoutNodeId`、实际 `componentPath` 和 `cases`。用例提供现有文字合同要求的内容、语言、输入来源、可见性、字体、排版、几何和测试身份，控制器将原始用例逐项对照冻结的 V4 报告。`fontResources` 中的本地字体资源均冻结，节点实际使用的路径须与其资源声明一致；无需本地字体文件的渲染方式可以使用空数组。正式接入的入口、图片产物及消费者与 V4 报告属于同一次采集。

## 独立素材命令

三栈图片场景的独立清单可使用 `workflow_binding: {schemaVersion: "1.0", workItemPath, targetId}` 指向当前工作项和视觉目标。各栈命令固定校验自身技术栈，读取的领域清单必须与目标冻结引用为同一文件，并与工作项当前 V4 或 V5 阶段一致。控制器核对目标 V2 至 V4 确认链、V4 资源评审及适用决议，再运行对应阶段的领域门，完成相同的正式图文和来源校验。
