# Blender MCP 生产级建模流程

选择 Blender 制作模型时按本流程使用 Blender MCP；本地模型复用和项目授权且可用的生成 API 按[公共模型来源与交接](../../app-3d-modeling/SKILL.md#模型来源与交接)执行。PBR 贴图生产仍由 Blender MCP 承担；Unity 插件负责导入器、Material/Renderer、资源级 Prefab 装配和运行验证。模型与贴图按[共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)衔接，贴图生产步骤见[生产级 PBR 贴图流程](../../unity-game-3d-texturing/references/pbr-texture-workflow.md)。流程嵌入既有 V1-V5。

角色资产还须按[角色共同交接](../../unity-development-workflow/references/3d-character-handoff.md)提供关节拓扑、形状目标几何和明确的 UV/法线/槽位/LOD 基准，交由 Blender MCP 绑定和动画技能制作。建模导出静态网格源；绑定导出带骨架/蒙皮的正式角色，动画只导出匹配骨架的 Clips，不由建模技能包办动作。绑定/动画提出几何缺陷时，建模修复后按实际依赖复验蒙皮、烘焙和受影响动作。

## 执行前发现

- 先检查可复用的 Blender 进程与 MCP 连接，再核对 Blender/插件版本、活动 `.blend`、场景、Collection、对象、未保存修改、外链资源和文件占用。没有可复用实例才可启动新实例；不得重置用户场景。
- 按当前工具 Schema 发现只读检查、建模、修改器、拓扑、UV、LOD、碰撞、保存、导出与取证能力。工具可能通过专用接口或受限 Blender Python 执行提供；记录真实工具与所需 API，不虚构统一命令。
- 脚本操作前核实当前 Blender 版本对应的 API、上下文、对象选择与模式；长任务按可恢复的工序拆分，写后回读实际对象和指标。
- 绑定唯一资源 ID、源文件、可写对象集合及输出根；无法证明连接、对象归属、保存或导出能力时，受影响步骤为 `BLOCKED`。不得转用 ProBuilder、Unity 体块拼装或外部 AI 模型生成补位。

## 模型规格

在既有模型 brief 中至少明确模型与贴图的共同输入；生产责任和交接按[模型与贴图共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)记录：

- Visual Bible 版本、资源 ID、用途、参考来源与许可、目标机位、最近观看距离和参考尺寸。
- 主次形体、轮廓、识别特征、结构连接、厚度、开口、曲面转折与必须建模的细节；可由贴图表现的细节单独列出。
- 世界单位、轴向、Pivot、变换、模块接缝、拆件边界和材质槽。
- 三角面/顶点/材质槽预算、法线与切线策略、UV 集、允许重叠、Texel Density、Padding、纹理预算及烘焙需求。
- LOD 层级、阈值与轮廓保留目标，Collider 类型与交互体积，绑定/动画前置条件及责任人。
- `.blend` 源、导出格式、命名、目录与目标 Unity 项目；源按[产物存放规则](../../unity-development-workflow/references/artifact-storage.md)放入 `ArtSource/<owner>/<assetId>/<version>/`，正式资源放入 `Assets/Art/Runtime/<module-or-scene>/`，证据位于实际 `evidenceRoot`。

生产级按目标观看条件、可编辑性、结构正确性和运行预算判断，不等于一律高面数、写实或高模雕刻。低模与风格化资产执行同样的生产质量要求。

## 生产工序

结构、轮廓、拓扑、UV、LOD、碰撞和导出回读按[公共建模生产](../../app-domain-toolkit/references/modeling-production.md#生产流程)执行。需要烘焙时另按[共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)提供高低模与 Cage／射线方案。

建模方提交导出回读；Unity 资产接入负责人通过 AssetDatabase 或已发现的 Pipeline 导入，回读 Importer、Mesh、资源级 Prefab、LODGroup、Collider 与引用，并回传 Editor/PlayMode 技术结果。正式场景接入留在 V5，显示效果由用户验收。

高模、重拓扑、额外 UV 集和 LOD 等按资产需求与预算适用；不适用项须说明原因，不能用“低模”跳过结构、拓扑清理、法线、主 UV 和导出验证。贴图角色通过 Blender MCP 执行生产级材质节点、图像绘制、烘焙、通道打包与贴图导出，具体工序遵循[生产级 PBR 贴图流程](../../unity-game-3d-texturing/references/pbr-texture-workflow.md)。贴图使用版本化派生 `.blend`，只读核对模型并向既有槽位赋材质；禁止暗改网格、UV、槽位结构/顺序/面分配，或从派生网格覆盖运行时模型。各 LOD 需明确共用 UV/图集或独立用图策略。输入缺陷退回建模修复，不在纹理阶段补救几何。

模型交接须覆盖资源 ID 与实际源版本、运行时低模、UV 通道/位置/重叠规则、法线与切线策略、既有材质槽及面分配、Texel Density/Padding、纹理集、LOD 用图策略；按烘焙需要提供匹配高低模、Cage/射线方案、命名、法线/切线和三角化策略。贴图发现几何、UV、法线、烘焙输入或槽位缺陷时，按[共同交接中的返修与局部重验](../../unity-game-3d-texturing/references/model-texture-handoff.md#缺陷退回与局部重验)返回建模；模型修改后只重验其实际影响的烘焙、纹理、材质、导入及 Prefab 依赖。

## 禁止体块成品

- 禁止仅添加、缩放、摆放立方体/球体/圆柱等基础体，或将它们简单 Join 后赋色、平滑、细分，作为正式可见模型交付。
- 基础体可作为起始网格、比例 blockout 或碰撞代理；正式资产必须继续完成轮廓塑造、结构连接、边缘转折、拓扑清理、法线与 UV，按设计保留合理分件，不强制把所有零件焊成单网格。
- 模块化、低模、风格化、远景和简单几何造型也按规格证明结构与工艺完成度；模型本身是简单形状时按其设计交付，不为增加复杂度堆砌无关细节。
- 禁止用贴图、材质、光照、渲染景深、高面数或整张效果图补偿未完成的形体，禁止把成功执行脚本或导出文件当作生产质量通过。
- 不满足目标结构、预算或 Blender 能力时报告缺口并返修/阻断，不允许降级为体块拼搭后宣布完成。

## Unity 验证与人工显示验收

- 本节的 Unity 导入、LODGroup 配置与运行回读由资产接入负责人执行。项目选择与导入命令按 `unity:unity-cli` 发现；输入必须在批准目录。FBX/OBJ 与 GLB/glTF 使用项目实际支持的导入器，后者先确认 glTFast 等所需能力，不能假定原生 ModelImporter 可处理全部格式。
- 回读实际导入器的比例、坐标转换、法线、切线、Read/Write、压缩与网格设置；适用时记录 ModelImporter，其他格式记录实际导入器类型，不伪填证据。
- Mesh 检查实际三角面/顶点数、Bounds、子网格、UV、法线与材质槽；Prefab 检查 Renderer、LODGroup、Collider、GUID 与引用，无 Missing Script 或 Console 错误。
- 分别记录各 LOD 的网格、Renderer/材质槽数量、批次影响和内存估算；EditMode/PlayMode 检查引用、LOD/碰撞配置及必要交互，不自动启动 Standalone/Player 或真机。
- 输出中性转台、目标机位、线框、UV 棋盘、掠射光、LOD 和碰撞证据，并附比例、轮廓、接缝、阴影、跳变与交互边界的检查要点。截图由用户人工检查；除非明确要求自动验证，不自动分析或判定视觉通过。独立 F2/F3 与用户显示确认分别记录，技术通过不代替人工确认。
- 模型、材质、纹理、Prefab 和动画按[登记 Schema](../../unity-development-workflow/schemas/registration-record.schema.json)的真实类型分支记录，再由单写者合并[资源总表](../../unity-development-workflow/schemas/asset-register.schema.json)。FBX 等实际使用 ModelImporter 时回读对应标准摘要，其他格式使用实际导入器的记录，不伪填不存在的 ModelImporter、Sprite 或 TextureImporter 设置。额外骨架/UV/格式参数由实际导入报告承载；Toolkit 的 `uwt_import_image` 只处理图片，不能当作模型/材质登记器。

## 写入与交付

Blender MCP 脚本只可在已展示并批准的范围内执行；已有精确授权无需重复请求。允许必要的 Blender API、数学与网格操作，以及批准路径内的源保存、导出、烘焙交接与证据输出；禁止 shell、网络、环境变量、凭据、任意文件读取和动态依赖。保留源检查点、脚本/关键操作、工具版本、调用结果和实际输出位置；原始输入只读，修改写入版本化派生文件。同一源、资源 ID 和输出目标保持单写者；覆盖、删除、重建已交付 UV、改变顶点顺序或蒙皮信息前建立检查点并取得所需确认。

建模交付可编辑 `.blend`、模型导出物、配方、许可、拓扑/法线/UV 报告、适用的高低模/Cage 烘焙输入、LOD 网格与碰撞代理指标及导出回读。Unity 资产接入负责人提交资源级 Prefab 和导入及运行证据，人工验收记录随当前候选关联。贴图交付版本化派生 `.blend` 与依赖、通道/打包图、LOD 用图策略及其回读证据，字段详见[共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)。模型、UV、烘焙输入或贴图变化后只重验实际受影响部分，无需回改合同或校验 SHA；缺失证据或仍为 blockout 时不得宣称正式模型就绪。
