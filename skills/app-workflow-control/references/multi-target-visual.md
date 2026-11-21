# 场景多目标记录

本页管理原图片视觉目标；显式 `world-3d` 世界使用[无图场景合同](world3d-scenes.md)，不建立根级世界图片 targets 或世界的双 V3 图稿确认。2D、UI 和既有图片路线继续执行本页要求。

3D 世界中的常驻 HUD 仍属于真实宿主场景，并按[同场景常驻 HUD](world3d-scenes.md#persistent-hud)在 `visual.hud` 引用本页图片目标、领域材料与人工确认；根级世界合同继续处理模型。此处 HUD 沿用本页流程，不作为瞬态层或新增场景。

游戏二维世界使用默认 `world-2d`，可用 `visual.sceneDesignRef` 引用[二维空间合同](../schemas/world2d-scene.schema.json)表达相关空间方案。V1 确认模块方案，可按风险验证或引用已有有效空间确认；V2 生成并确认覆盖适用状态和进度的模块稿。纯界面 `SCENE` 显式用 `game-ui`。

二维合同的 `spatialSpecRef` 指向当前工作项／项目／栈／场景身份、`dimension:2`、单位、覆盖范围、区域身份、角色尺度及目标视口。需要空间风险验证时，`layoutRef` 绑定实际布局源，`layoutRunRef` 记录真实引擎会话、时间、同一布局版本、原始输出和适用检查。实际运行记录按发生的阶段保存。

V1 以完整模块方案作为进入 V2 的依据，可按风险搭建并验证。确需人工空间确认时，`reviewRef` 和 `spaceApprovalRef` 绑定真实审查、对象和用户决定，不冒用覆盖范围。空间或规则变化按影响更新方案与必要确认；单次审查方法见[场景方案](../../app-domain-toolkit/references/game-design-exploration.md#review)。

Roblox 场景目标沿用当前数组与公共确认链，`domainEvidenceRef` 仍使用现有路径引用。领域包装绑定目标、候选、场景/状态、视口及冻结目标，再通过带摘要的 `robloxEvidenceRef` 关联[本栈原生材料](../../roblox-domain-contracts/references/domain-validation.md)。Place 是正式工程宿主，一个 Place 可承载多个功能或数据关卡，不按关卡数量机械建场景；当前 Studio、Edit 与 Client/Server 运行上下文分别核对。

一个 `SCENE` 工作项使用 `visual.objectId` 标识正式场景、`visual.stage` 记录共同阶段，并通过 `visual.targets` 登记一张或多张正式目标图。V1 方案可无视觉目标，V2 按模块全部适用状态和进度生成并确认目标，离开 V2 前核对设计覆盖。

每个目标填写唯一 `targetId` 和 `candidateId`、`sceneId`、`stateId`、`viewport.width/height`、可读区域说明 `scope`、`referenceTarget` 的 `{path,sha256}`，以及 `domainEvidenceRef`、`reviews` 和 V4 的 `assetReviewRef`。目标图、确认记录及素材评审的 SHA-256 均由实际文件字节计算，不能使用模板占位值。`visual.coverageRef` 的 `{path,sha256}` 指向用户确认的覆盖清单：记录 `workItemId`、`sceneId`、`status=CONFIRMED`、真实 `userMessageRef`、完整 `targetIds`，并在 `targets` 中逐项冻结上述身份、区域、视口及 `referenceTarget`。可以用同一次 V2 用户确认同时确认目标和覆盖范围，不强加额外审批。

Web 清单包含编号拆解区域时，在各自领域清单中提供 `visualConfirmationAuthorityRefs` 与排序去重的 `visualConfirmationPrerequisiteFiles`，由本栈 loader 从受保护的真实用户决定记录加载权威；具体要求见[单目标领域合同](single-target-domain.md)。Unity V5 按目标将状态、视口和目标文件绑定到实际人工验收情境。

每个目标的 `reviews` 分别绑定 `V2`、`V3Decomposition`、`V3Layout`、`V4`、`V5` 的实际确认记录；每个引用是确认 JSON 的 `{path,sha256}`。人工记录使用 [human-review 模板](../templates/human-review.json)：填写 `workItemId`、场景 `objectId`、`targetId`、`candidateId`、实际目标 `referenceTarget`、本阶段展示文件 `targetRef/targetSha256`、真实用户消息及对应阶段和用途。V3 布局确认另以 `decompositionReviewRef:{path,sha256}` 绑定本目标已确认的拆解记录。V2 图须是本目标图；V4 素材审核与确认必须对应同一用户消息。PAGE 和 DISPLAY_LAYER 也按同一方式绑定实际目标与确认图，`targetId` 使用对象 ID。

V2 至 V5 逐目标检查当前技术栈的实际领域合同，V1 确认模块方案。Cocos、Phaser、Three.js 的 `domainEvidenceRef` 指向该目标的单目标视觉清单，绑定工作项、候选、场景、状态、视口和目标图；V4 保留场景还原合同。Unity 的 `domainEvidenceRef` 指向 [Unity 目标领域包装 Schema](../schemas/domain-target.schema.json)，V3 及后续引用对应 Evidence。领域合同和文件门失败时修复实际证据。

Unity 在现有 `V3Layout.layoutSpecRef` 冻结布局计划。有文字的目标在 V5 将本次 Unity 布局测量同时用于原生 `uiLayoutMeasurementRef` 和公共 `runtime-layout` 证据，逐状态核对实际属性和计划摘要。[Unity 运行回读](../../unity-development-workflow/references/ui-layout-runtime.md)

Cocos、Phaser、Three.js 有文字的目标在 `V3Layout.layoutSpecRef` 引用该目标冻结的 V3 视觉清单。V5 对照其逐节点文字目标并读取当前目标 `runtime-layout` 的实际组件读数。[Web 三栈文字证据](../../app-domain-toolkit/references/reference-ui-layout-contract.md)

实际承载视觉阶段的领域 Work Item、视觉清单和阶段证据以 `visualStageModel: "function-first-v1"` 标明统一语义；缺失或标记不符的旧记录不能被静默按新阶段解释。该标记不改变纯资源或不含阶段的独立工件协议版本。

V4 的 `assetReviewRef` 和 V5 的 `visual.integrationEvidenceRef` 也使用 `{path,sha256}`。V5 衔接记录绑定 `workItemId`、`sceneId`、`status=APPROVED`、真实 `userMessageRef` 和全部 `targetIds`；可沿用同一次 V5 用户验收消息。`record` 提交实际运行证据时，在每条与视图相关的 `evidence` 项附上 `targetId`，每个目标都须覆盖该栈 profile 的视觉类别；共享文件可被多个目标分别引用。用户检查目标图、运行画面和跨视图衔接；机器只核对事实与文件，不自动分析截图或代判。

在当前 V1 模块方案确认后可使用 `reuse-visual` 继承未变化的 V2/V3 确认，来源链逐跳检查身份及内容指纹，V4/V5 由当前工作项重新验收。累计生产新增目标时可对 `SCENE` 使用 `--target-ids <以逗号分隔的来源目标ID>` 继承所选未变化目标，新增目标在 V2 设计并确认。本批累计覆盖清单须重新由用户确认，包含继承与非继承目标时共同阶段停留在 V2，待全部目标满足后继续。

`impact=target` 只沿用全局视觉方向，当前目标全部重新生产，不属于上述累计确认复用。已明确退出新总范围的旧目标无需保留；绑定同一生产总范围时，最终集成仍须覆盖该范围中的全部必要目标，不能借目标重做缩小最终验收范围。

目标或确认文件真实变化时返回受影响阶段并重新确认；单纯更新摘要不能替代用户决定。历史确认只证明当时已确认内容，不能让旧工程结果替代当前工作项的 V4、V5 或功能验证。SHA-256 只绑定内容，不证明用户身份。
