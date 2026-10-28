# 单目标领域合同

PAGE 和 DISPLAY_LAYER 在 V1 完成功能验证后，V2–V5 分别将 `visual.domainEvidenceRef` 指向当前阶段的领域证据文件，引用包含实际 `path` 和 `sha256`。阶段证据根记录 `schemaVersion: "1.0"`、`workItemId`、`projectId`、`stack`、`workItemType`、`visualStageModel: "function-first-v1"`、`visualStage`、`objectId`、`candidateId` 和 `referenceTarget: {path,sha256}`；目标文件必须与该工作项的 V2 人工确认一致。阶段证据随阶段更新，不能拿 V2 的记录冒充 V5。

DISPLAY_LAYER 另记录 `hostId` 和 `layerType`，必须与当前显示层工作项一致。Unity 证据以 `nativeWorkItemRef: {path,sha256}` 指向实际原生显示层工作项；V3–V5 另以 `nativeEvidenceRef` 指向对应阶段原生证据。原生工作项须绑定显示层、宿主、阶段和响应式合同，原生证据须通过实际领域校验；V5 还记录实际 `stateId` 和 `viewport`，并与人工验收情境中的对象、候选、目标和运行条件一致。

Cocos、Phaser 和 Three.js 的 DISPLAY_LAYER 使用 `manifestRef: {path,sha256}` 指向实际视觉清单，清单绑定当前工作项、候选、阶段和 V2 目标，并包含唯一当前显示层及宿主；V2 运行场景还原合同，V3–V5 运行本栈的清单和文件门。V5 运行轨迹须覆盖打开、交互、关闭与恢复。

Web 清单有带编号的拆解区域时，领域证据还提供 `visualConfirmationAuthorityRefs` 和排序去重的 `visualConfirmationPrerequisiteFiles`，指向 `.workflow-control/user-resolutions/` 下实际用户决定记录。控制器通过本栈 loader 读取并复核当前工作项、候选、场景和状态；不能在领域证据中自行填写权威通过对象。SCENE 多目标将相同引用放在各自领域清单中。

Flutter PAGE 和 DISPLAY_LAYER 的 V2 领域证据只绑定当前对象和已确认目标，不预先要求布局产物。V3–V5 使用 `layoutSpecRef: {path,sha256}` 指向真实布局规格，由自适应布局校验器检查，规格的 `page.id` 必须与当前对象一致。`visualValidationMode` 默认 `usability`；仅明确要求 `exact` 时 V5 必须使用 `fidelity` 规格。使用 `fidelity` 时，对照用例和对齐证据必须绑定 V2 主目标或 `additionalTargets` 中分别经用户确认的视口目标，以及实际运行截图和测量文件。每个额外目标记录 `{referenceTarget:{path,sha256}, reviewRef:{path,sha256}}`，确认记录绑定当前工作项、对象、候选、V2 和真实用户消息。技术校验不能替代用户对显示效果的人工验收。

Flutter DISPLAY_LAYER 的 V2、V3 拆解、V3 布局、V4 和 V5 人工确认还须记录当前 `hostId` 和 `layerType`。V5 领域证据使用 `runtimeContextRef: {path,sha256}` 引用运行上下文 JSON，V5 人工确认引用同一文件。上下文记录 `schemaVersion`、`workItemId`、`objectId`、`candidateId`、`hostId`、`layerType` 和 `interactions`；`interactions` 分别记录 `open`、`close`、`focus-restore`，适用时提供 `PASS` 和实际证据 `evidenceRef: {path,sha256}`，不适用时提供 `NOT_APPLICABLE` 与原因。更换宿主或层类型须重新确认并验证受影响上下文，不要求宿主另建工作项或等待宿主 V5。

额外视口目标也可沿有效的 V2 视觉复用链引用来源确认；来源必须已完成 V5，且来源领域证据中确有相同目标与确认记录。当前 V4/V5 材料仍须重新验证。

V1 不需要这些视觉领域证据，也不强制白盒。缺失文件、错阶段、错对象或错宿主时修复证据并重新校验，不通过手写 PASS 替代实际领域合同。
