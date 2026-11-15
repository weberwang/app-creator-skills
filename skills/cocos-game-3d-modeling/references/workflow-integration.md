# 工作流与 Cocos 资源接入

3D 模型接入沿用 `$app-workflow-control` 的现有 Work Item、Implementation Package、风险门与 V0-V5；本技能不新增状态、审批阶段或单独的资产状态机。可以提议、审查，并在当前任务、A 等级和允许路径范围内生产/接入；结论、实际修改和证据回到控制面。范围变化按现有 Change Request 与 `repair`/`revalidate`/`return` 规则处理。

Cocos Creator 同时支持 3D 世界、2D 和 UI；按实际内容而非引擎名称分流。`world-3d` 本批 V1 白模与功能验证、一次联合审查和整体空间人工确认完成后，V2 正式方向经人工确认，V3 模型接口规格完成，才安排依赖这些事实的正式模型生产。沿用[正式资产与替换交接](../../app-domain-toolkit/references/game-design-exploration.md#production-handoff)，已有有效模型与白模可复用，局部模型修订不重建整个空间。

主代理在既有实施包中交接本批场景规格、对象身份、尺寸、轴向、原点、连接、预算、目标消费者及源文件路径：调用[公共建模能力](../../app-3d-modeling/SKILL.md)的 Cocos 原生模式，通过 Blender MCP 制作或复用模型；需要贴图时衔接[公共贴图能力](../../app-3d-texturing/SKILL.md)，交接实际 UV、材质槽与版本化源文件，按当前 Creator 渲染和工具能力处理，不假定存在 Cocos 专用贴图适配。调用者遵守各能力自身工具和委派约束。

## V0-V5 对齐

| 阶段 | 3D 模型工作 |
| --- | --- |
| V0 | 确认这是运行时 3D 模型还是仅用于烘焙背景的 3D 源；定位当前 Work Item、资产用途、许可、基线和负责人。 |
| V2 | 冻结模型用途、轮廓/结构、观看距离、玩法体积、单位/Pivot、预算、材质槽、UV、LOD/碰撞、实际目标项目与输出路径。 |
| V3 | 适用 V3 时仅确定建模规格、路线与必要的隔离 blockout；正式模型生产留在 V4，不增加额外阶段或确认。 |
| V4 | 先选代表建筑、设施或模块，通过 Blender MCP 制作或复用正式模型，按需贴图，完成 Creator 资源级导入、身份回读与临时试接；复用现有样本审阅和已覆盖本范围的真实用户决定，必要的用户判断未定时只暂停依赖该决定的扩展，处理问题后再分批生产和导入。交接源／输出身份、来源许可、UV/材质槽、适用 LOD/碰撞、真实导入与消费者证据；当前工作项 V4 验收仍须覆盖其声明的整批模型，样本不能代替整批，既有资源人工验收继续执行。AssetDB 身份核验不证明几何通过或正式场景消费；几何结论由 Blender 专项报告提供。 |
| V5 | 由 Creator 项目唯一写者按已确认的位置、尺度和接口在正式宿主替换白模表现，保存并读回实际节点与资源引用；在真实运行上下文证明加载和消费，复验受影响的通行、遮挡、碰撞、交互、LOD 与性能，完整组合截图交用户人工检查。 |

阶段不适用项按当前控制面和验收合同处理，不因一个模型资源另造推进门。`effect-image` 仅表示参考图被指定为正式画面目标，不决定区域生产路线；逐区按既有生产合同执行，可能使用原生实现或复用已有资源。只有冻结 `image_generation_required=true` 的区域禁止被 3D 替代。只有当该 Work Item 明确只需烘焙的装饰性满幅背景时，最终运行输出走现有 `decorative-full-bleed` 路线；Blender 工程是背景的可编辑源，不是场景运行时网格。世界空间玩法模型和环境登记为 `gameplay-environment`。

依赖空间确认的制作等待真实用户决定，沉默或工具成功不构成确认；同一次明确决定覆盖相关内容时复用原消息，不新增逐模型或逐步骤审批。若正式模型需要改变已确认占地、路线或连接，回受影响白模修订并等待人工确认；普通工程返修只复验受影响范围，不重开单次设计审查。控制器核对阶段证据，不自动派发任务或证明代表样本先于批量制作。

`effect-image` 的 `production_method`/`delivery_kind` 区域合同没有可供本技能直接声明的 3D 模型交付类型。若 Work Item 将参考图冻结为正式场景目标，仍执行既有区域合同；不得把模型伪装成位图/原生绘制资产，也不得取消或改写 effect-image。当前 Schema 和 Creator 工具若无法如实记录模型消费及验收事实，保持受影响门未验证或 `pending/blocked`，说明需要增加能表达并核验 3D 资源的能力；按现有范围变更规则处理后再继续。

## visual-assets 通用登记

按当前 [`cocos-game-asset-integration`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration) 和其资源路线/校验器维护已有 `visual-assets` 清单。运行时 3D 模型使用现有 `gameplay-environment` route，不新增 route、Schema 或 3D 专用机器校验。条目使用唯一 `id` 与 `texture_key`、`route` 和 `status`，并且只能声明一个 `scene_id` 或 `shared: true`。状态为 `producing`、`review` 或 `accepted` 时，`visual_baseline_id`/`visual_baseline_version` 必须与清单根基线一致。状态为 `accepted` 时还必须提供 `source_file`/`source_files` 或真实 `generation_record`、非空 `runtime_outputs`、`license_record`、`cocos_evidence`、`gameplay_visual_evidence` 和非空路径列表 `consistency_evidence`。未完成资源保持实际的非 accepted 状态；不得伪填来源、许可、输出或验收证据。

`texture_key` 是现有清单要求的通用唯一登记键，可使用 `model.<asset-id>`；它不表示资源必须带贴图。不得为满足图片路线字段伪造 SpriteFrame、TextureImporter、图片宽高或 Alpha 数据，也不得将 `.blend` 源误写成运行时消费文件。若真实模型带贴图，应按项目已有真实图像资源各自登记其实际信息。

当前清单校验只能证明通用登记结构、路径和要求的来源/许可/运行证据字段存在；它不验证网格、拓扑、法线、UV、LOD、碰撞或导入后的模型质量。独立 Blender/Creator 技术报告应记录真实几何预算、拓扑/法线/UV、LOD/碰撞、导出回读、Creator 中实际导入器/资源类型、UUID/子资源（仅当工具实际提供）及资源加载事实，并以真实报告路径填入 `cocos_evidence`。`gameplay_visual_evidence` 保存实际玩法视觉证据与用户检查结果；不要将机器清单校验描述成模型几何通过。

## Creator MCP 操作约束

对 Creator、AssetDB、Scene、Node、Component、Prefab、资源 UUID 或构建的任何操作，先读取[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)并发现当前 `tools/list` 实时 Schema。协议文档中的工具名只作定位，调用参数和实际能力以本次发现为准。

- 核对项目身份和唯一活动写者；确认 AssetDB 就绪后按目标目录导入已批准的运行时模型，集中刷新并逐文件读取真实结果。
- 逐项回读资源类型/导入状态和 UUID。只有当当前导入格式实际暴露子资源时才核验相应子资源；不能假定模型必有特定子资源标识。刷新或 `.meta` 出现不等于导入成功、内容已加载或场景已消费。
- 如果当前工作项需要 Prefab/Scene 接入，使用实时 MCP 能力进行最小修改，写后读回节点、组件、属性和资产引用。同一 Creator 项目的编辑器写入保持单写者；不得并行改同一项目状态。
- V5 必须有目标运行上下文实际加载并消费模型的证据。Creator MCP 若只支持打开面板、不能提供运行预览或加载读回，相关结论保持 `pending/blocked`，不可用文件存在、AssetDB UUID 或构建面板替代运行证据。

显示截图与转台、线框、UV、LOD、碰撞等检查图附上给用户的检查要点，由用户人工检查。除非用户明确要求自动验证，不自动分析图像或代替用户判定视觉通过；未经明确要求不启动真机验收。破坏性操作以及外部写入/发布等操作仍按 Work Item 的真实副作用和现有 A4-A6 规则处理，不因技能文本或工具可用而自动获准。
