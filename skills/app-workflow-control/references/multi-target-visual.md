# 场景多目标记录

一个 `SCENE` 工作项使用 `visual.objectId` 标识正式场景、`visual.stage` 记录共同阶段，并通过 `visual.targets` 登记一张或多张正式目标图。不要为每张目标另建场景或复制正式资源。V0、功能验证 V1 和 V2 初期可无视觉目标；离开 V2 前至少规划并确认一个目标。

每个目标填写唯一 `targetId` 和 `candidateId`、`sceneId`、`stateId`、`viewport.width/height`、可读区域说明 `scope`、`referenceTarget` 的 `{path,sha256}`，以及 `domainEvidenceRef`、`reviews` 和 V4 的 `assetReviewRef`。目标图、确认记录及素材评审的 SHA-256 均由实际文件字节计算，不能使用模板占位值。`visual.coverageRef` 的 `{path,sha256}` 指向用户确认的覆盖清单：记录 `workItemId`、`sceneId`、`status=CONFIRMED`、真实 `userMessageRef`、完整 `targetIds`，并在 `targets` 中逐项冻结上述身份、区域、视口及 `referenceTarget`。可以用同一次 V2 用户确认同时确认目标和覆盖范围，不强加额外审批。

Web 清单包含编号拆解区域时，在各自领域清单中提供 `visualConfirmationAuthorityRefs` 与排序去重的 `visualConfirmationPrerequisiteFiles`，由本栈 loader 从受保护的真实用户决定记录加载权威；具体要求见[单目标领域合同](single-target-domain.md)。Unity V5 按目标将状态、视口和目标文件绑定到实际人工验收情境。

每个目标的 `reviews` 分别绑定 `V2`、`V3Decomposition`、`V3Layout`、`V4`、`V5` 的实际确认记录；每个引用是确认 JSON 的 `{path,sha256}`。人工记录使用 [human-review 模板](../templates/human-review.json)：填写 `workItemId`、场景 `objectId`、`targetId`、`candidateId`、实际目标 `referenceTarget`、本阶段展示文件 `targetRef/targetSha256`、真实用户消息及对应阶段和用途。V3 布局确认另以 `decompositionReviewRef:{path,sha256}` 绑定本目标已确认的拆解记录。V2 图须是本目标图；V4 素材审核与确认必须对应同一用户消息。PAGE 和 DISPLAY_LAYER 也按同一方式绑定实际目标与确认图，`targetId` 使用对象 ID。

V2 至 V5 逐目标检查当前技术栈的实际领域合同；控制器与各技术栈使用同一阶段和含义，V1 只验证功能，不传给视觉领域门。Cocos、Phaser、Three.js 的 `domainEvidenceRef` 指向该目标的单目标视觉清单：工作项、候选、场景、状态、视口和目标图均与公共目标一致；V4 也保留场景还原合同，不能省略用来核对身份的字段。Unity 的 `domainEvidenceRef` 指向 [Unity 目标领域包装 Schema](../schemas/domain-target.schema.json)，包装绑定目标身份和实际 Work Item；V3 及后续还引用对应 Evidence。领域合同和文件门失败时不得以非空文件或人工确认绕过。

实际承载视觉阶段的领域 Work Item、视觉清单和阶段证据以 `visualStageModel: "function-first-v1"` 标明统一语义；缺失或标记不符的旧记录不能被静默按新阶段解释。该标记不改变纯资源或不含阶段的独立工件协议版本。

V4 的 `assetReviewRef` 和 V5 的 `visual.integrationEvidenceRef` 也使用 `{path,sha256}`。V5 衔接记录绑定 `workItemId`、`sceneId`、`status=APPROVED`、真实 `userMessageRef` 和全部 `targetIds`；可沿用同一次 V5 用户验收消息。`record` 提交实际运行证据时，在每条与视图相关的 `evidence` 项附上 `targetId`，每个目标都须覆盖该栈 profile 的视觉类别；共享文件可被多个目标分别引用。用户检查目标图、运行画面和跨视图衔接；机器只核对事实与文件，不自动分析截图或代判。

在当前功能验证之后使用 `reuse-visual` 可继承未变化的 V2/V3 确认；来源链逐跳检查身份及内容指纹，V4/V5 须由当前工作项重新验收。目标或确认文件真实变化时返回受影响阶段并重新确认；单纯更新摘要不能替代用户决定。SHA-256 只绑定内容，不证明用户身份。
