# unity 原生技术合同

本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。

各技术栈统一使用 V0–V5：V0 范围、V1 功能验证、V2 视觉目标、V3 拆解布局、V4 资源导入、V5 正式运行验收；白盒按需使用。包含视觉阶段的领域记录必须声明 `visualStageModel: function-first-v1`，无阶段的纯资源协议不需要该字段。

## 能力索引

- **产品与游戏需求**
  - [Unity 游戏制作策划](#mode-unity-game-production)
- **技术架构与模块设计**
  - [Unity 游戏技术架构](#mode-unity-game-architecture)
- **游戏玩法实现**
  - [Unity 游戏玩法开发](#mode-unity-gameplay-development)
- **游戏音频**
  - [Unity 游戏音频](#mode-unity-game-audio)
- **游戏数值与经济**
  - [Unity 游戏数值设计](#mode-unity-game-balance)
- **游戏与应用汁水设计**
  - [Unity 游戏动态反馈](#mode-unity-game-juice)
- **候选交付与发布准备**
  - [Unity 多平台发布与合规](#mode-unity-game-release)
- **质量审核与性能验证**
  - [Unity 测试与性能](#mode-unity-game-qa-performance)
- **动画制作与接入**
  - [Unity 2D 动画技术美术](#mode-unity-game-2d-animation-ta)
  - [Unity 游戏 3D 角色动画](#mode-unity-game-3d-animation)
  - [2D 角色动作生产](#mode-unity-game-2d-rigging)
- **角色骨架与绑定**
  - [Unity 原生 2D 骨骼制作](#mode-unity-game-2d-rigging)
  - [Unity 游戏 3D 角色绑定](#mode-unity-game-3d-rigging)
- **三维几何建模**
  - [Unity 游戏 3D 模型制作](#mode-unity-game-3d-modeling)
- **三维材质与贴图生产**
  - [Unity 游戏 3D 纹理贴图](#mode-unity-game-3d-texturing)
- **Spine 生成式换皮**
  - [Unity Spine 外观换皮](#mode-unity-game-spine-reskin)
- **界面布局与自适应**
  - [Unity UI 结构与布局接入](#mode-unity-game-visual-assets)
- **项目整理与产物清理**
  - [Unity 项目整理与清理](#mode-unity-artifact-cleanup)
- **视觉素材生产**
  - [Unity 视觉与资源接入](#mode-unity-game-visual-assets)

## 产品与游戏需求

<!-- native-source:unity-game-production:start -->
<a id="mode-unity-game-production"></a>

<a id="mode-unity-game-production--unity-游戏制作策划"></a>
### Unity 游戏制作策划

将游戏意图拆成可批准、可实现、可验收的范围；不替用户批准产品方向、商业能力、发行方式或风险豁免。

<a id="mode-unity-game-production--输入与决策"></a>
#### 输入与决策

读取当前 Work Item、`docs/project-profile.yaml`、`docs/GDD.md` 与已有验收证据。[公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)

<a id="mode-unity-game-production--执行与交接"></a>
#### 执行与交接

1. 定义一句话体验、目标玩家、核心循环、失败/重试、最小范围和排除项；对视觉 Work Item 补充主题、目标受众、体验目标与主要观看情境，供[美术质量合同](../../unity-development-workflow/references/art-quality-contract.md)使用。涉及玩家可见文字时，按[游戏内文案指导](../../unity-development-workflow/references/game-copy.md)分离内部规格与显示表达，并在 V2 效果图生成前列出许可文字、动态数值示例和候选共享内容。
2. 把范围拆成六阶段任务和 V0-V5 场景/弹窗增量，每项写玩家行为、可观察结果、依赖、资源需求、所有权与测试点。V2 与玩法/视觉角色确定关键事件和反馈意图；V3 指定动画制作路线、资产生产者、检查点和事件消费者，细节见[动画意图合同](../../unity-development-workflow/references/animation-intent-contract.md)。V4 只负责正式资源生产、导入和素材验收，可提供组合预览；V4 可生产资源级 Prefab，正式宿主 Scene/场景装配 Prefab/UI 实现与校准在 V5 完成。场景只包含自身玩法、画面与常驻 HUD；modal、popup、drawer、toast 分别建立独立 DISPLAY_LAYER Work Item，`hostSceneId` 只记录运行上下文。只把用户选择的平台写入交付范围。
3. 只为真实产品/视觉取舍和带副作用操作安排决定点；普通本地实现不创建多余批准门。
4. 变更先区分 `repair`、`revalidate` 与 `return`，只失效真实受影响范围；不替其他角色重写其文档。
5. 向控制面提交阶段状态、证据索引和阻断项，不直接迁移全局状态。

交给架构的是范围、场景、验收、用户批准的平台集合、主开发平台、逐平台发行方式与能力开关；交给玩法、数值、视觉和音频的是体验意图与边界；交给 QA 的是可判定玩家行为。

原生 2D 动画任务按[岗位协作](../../unity-development-workflow/references/2d-animation-collaboration.md)与总控明确动画导演、动画质量负责人、骨骼制作、视觉、玩法、技术美术和独立 QA 的所有权及交接；简单动作由设计师兼任导演，复杂表演单独安排导演。正式素材生产前按[动画意图合同](../../unity-development-workflow/references/animation-intent-contract.md)向用户说明设计理念与动作方案，并取得明确确认。将实际场景与动作需求交质量负责人形成动作标杆，并交 [`$app-animation`](#mode-unity-game-2d-animation-ta)评估版本能力、工具缺口和验证方案；质量负责人是现有任务内的独立专业审查职责，不新增岗位 Skill 或审批阶段。工具开发与具体角色资产制作分别分配范围，不将计划中的校验器或测试夹具写成已具备能力。

正式 2D 骨骼资产交付按[控制面门禁](../../unity-domain-contracts/references/rigging-delivery-gate.md)冻结当前角色身份、候选修订、实际必需回归和五岗位负责人。工程与角色回归双证据不齐或失败时阻断交玩法；总控将 `repairs` 分配给原实施单元所有者，独立 QA 复验后再放行。普通返修不自动 RETURN、不扩大范围；跨界或上游事实失效再按原机制裁决。

3D 资源按[3D 生产流程](../../unity-development-workflow/references/3d-asset-workflow.md)分配 Blender MCP 建模、贴图、绑定和动画生产者；角色按[共同交接](../../unity-development-workflow/references/3d-character-handoff.md)与 [Unity 导入合同](../../unity-development-workflow/references/3d-character-unity-import.md)规划模型/骨架/动作来源、材质/LOD、Avatar、根运动和事件接口。V4 可交付资源级角色 Prefab 与资产验证，V5 验收实际场景和玩法轨迹；不用 2D 专用 `riggingDelivery` 或检查器代替 3D 证据，普通本地制作不追加工具选择审批。
<!-- native-source:unity-game-production:end -->


## 技术架构与模块设计

<!-- native-source:unity-game-architecture:start -->
<a id="mode-unity-game-architecture"></a>

<a id="mode-unity-game-architecture--unity-游戏技术架构"></a>
### Unity 游戏技术架构

建立可维护、可测试、可构建的技术边界，并让 S00 只承载确有复用证据的全局骨架。

<a id="mode-unity-game-architecture--输入与决策"></a>
#### 输入与决策

读取 Work Item、项目配置、GDD、TDD、模块 manifest 与代码事实。技术路线、公共接口、存档迁移、包依赖、性能预算或发行方式存在无法合理推断的实质取舍时，交给 `$grilling`；普通首次实现或可逆的本地架构选择由实施包记录合理假设后推进。

<a id="mode-unity-game-architecture--执行与交接"></a>
#### 执行与交接

首次建立工程、规划目录或评审模块边界时，读取[项目结构约束](../../unity-development-workflow/references/project-structure.md)与[产物存放规则](../../unity-development-workflow/references/artifact-storage.md)，在 TDD 固定代码、文档、资源、源文件和证据目录映射、程序集依赖、场景生命周期与资源所有权；后续新增实现必须沿用该合同。

项目创建与 Editor/构建操作交给 `unity:new-unity-project`、`unity:unity-cli`；UPM 交给 `unity:unity-package-management`；BiRP→URP 和 Render Graph 专项分别交给 `unity:migrate-birp-to-urp`、`unity:validate-urp-render-graph-renderer-feature`。本角色只决定架构、预算、依赖和验收边界，不重复维护插件操作步骤。

1. 在 TDD 记录 Unity Editor、Unity CLI、`com.unity.pipeline` 与包版本、模块职责、asmdef、Composition Root、场景与状态流、输入、时间/随机、资源、存档、日志、错误处理、测试和构建；采用 SDK 时按[统一初始化合同](../../unity-development-workflow/references/sdk-initialization.md)登记唯一入口、真实前置、完成信号、失败隔离和重试所有者。
2. 分离纯规则、Unity 表现、Editor 工具和外部服务；Runtime 程序集不引用 Editor 实现。
3. 只将至少两个场景共同需要的能力上移 Foundation/Shared；为公共接口建立消费者和变更影响清单。
4. 在基础工程阶段以 SHARED/MODULE 单元实现可运行最小骨架、测试入口和可复现空壳构建；平台服务通过接口隔离，不为未选择平台增加实现。已采用 SDK 的统一初始化只投递各自独立任务，不作为首帧或场景启动屏障。
5. 为所有可见 Scene、常驻 HUD 和独立 DISPLAY_LAYER 定义唯一 Unity 原生响应式合同，冻结 Camera、Screen/Game View、CanvasScaler 或 PanelSettings、安全区、输入坐标、resize/orientation、文本、资源分辨率、性能预算和代表性视口。UI/2D 位图默认 `sourceScale=1` 只表示生产像素密度，不是固定运行时 DPR；运行时以平台、Canvas/Panel、Camera、Render Scale、动态分辨率和 Importer 实测为准。
6. 场景 Implementation Package 只包含 `SCENE`，弹窗包只包含 `DISPLAY_LAYER`；`hostSceneId` 只绑定公开接口和运行上下文，不表示所有权或完成依赖。Scene/Prefab/UXML/UIDocument 装配与视觉资源来源分别建模，禁止用整屏复合图代替结构。
7. 按目标设备、镜头距离和场景密度为 3D 资产定义可验证预算：三角形/顶点、LOD、骨骼与蒙皮、材质槽、碰撞体、Texel Density、纹理尺寸与内存、Mip/Streaming、Draw Call、Shader/变体和 Prefab 依赖；把预算分别交给 `$app-3d-modeling`、`$app-3d-texturing` 和独立 QA，不代替它们制作或批准资产。
8. 规定 3D 运行时目录、稳定资源 ID、模型/材质/Prefab 所有权和替换边界；玩法只能消费已登记且验证通过的 Prefab，禁止场景内复制并私改 Mesh、Material 或 Texture。
9. Unity 写入按 `unity:unity-cli` 的当前规则发现唯一项目目标和实际命令；结果仍须回填当前实施包与证据清单。

新增或修改的类、函数和实体定义必须有简体中文注释；注释说明设计边界、生命周期、兼容风险或性能取舍。
<!-- native-source:unity-game-architecture:end -->


## 游戏玩法实现

<!-- native-source:unity-gameplay-development:start -->
<a id="mode-unity-gameplay-development"></a>

<a id="mode-unity-gameplay-development--unity-游戏玩法开发"></a>
### Unity 游戏玩法开发

<a id="mode-unity-gameplay-development--输入与决策"></a>
#### 输入与决策

读取 Work Item、Implementation Package、项目配置、GDD、TDD、资源契约、测试与当前场景 manifest。只实现范围内且可观察验收的增量；职责、公开契约、状态所有权、依赖方向、场景生命周期与体验边界存在实质取舍时交给 `$grilling`，否则记录合理假设并推进。

<a id="mode-unity-gameplay-development--实现与交接"></a>
#### 实现与交接

Editor/Scene/Prefab 操作交给 `unity:unity-cli`；未指定 UI 技术时先用 `unity:ui`；NavMesh、3D 碰撞、多人和 LiveOps 分别路由到 `unity:initialize-ai-navigation`、`unity:physics-3d-collision`、`unity:setup-multiplayer-services`、`unity:build-live-game`。本角色保留玩法规则、状态所有权、接口和场景增量，不复制插件专项实现指南。

按[公共资源登记与使用](../../unity-development-workflow/references/shared-asset-usage.md)从总表解析资源身份与实际引用，在当前场景/显示层合同维护消费节点和变更影响；只控制本地实例、文案和动态状态，不修改共享源或为每个消费者复制公共资产。

原生 2D 骨骼角色在拆件和骨架制作前提供实际使用场景、相机与显示尺度、速度、操作频率、动作窗口、事件和中断需求，与骨骼角色评审根节点、朝向、挂点及位移归属。按[动画意图合同](../../unity-development-workflow/references/animation-intent-contract.md)协同确定贴合场景的节奏；不能在接入时任意加速、减速或拉伸动作掩盖设计不匹配。玩法拥有权威玩法状态并通过合同参数/事件接口驱动，角色 Animator Controller 的内部参数、状态、过渡和中断由骨骼角色维护；不足时退回该负责人修改，禁止双方同时写入。接入后的触发、事件消费和状态规则缺陷由本角色修复，资产缺陷退回对应生产者。

按[2D 动画岗位协作](../../unity-development-workflow/references/2d-animation-collaboration.md)向质量负责人和 TA 提供真实玩法窗口、触发／中断／恢复轨迹与测量入口。质量意见涉及规则变更时交总控协调，TA 工具只诊断和测量、不接管权威状态；玩法接入后向独立 QA 提交运行证据，资产轮通过不能代替实际场景运行轮。

正式消费 2D 骨骼资产前，核对[交付门禁](../../unity-domain-contracts/references/rigging-delivery-gate.md)与现有工作流检查均已通过，且当前角色、Prefab/GUID 和候选修订一致。失败、缺失或陈旧报告不作为已交付资产接入；按门禁诊断退相应岗位，玩法只修自己的触发、规则和生命周期问题，不临时改共享资产绕过失败。

3D 角色按[角色共同交接](../../unity-development-workflow/references/3d-character-handoff.md)和 [Unity 导入合同](../../unity-development-workflow/references/3d-character-unity-import.md)消费已独立验证的蒙皮角色、材质/LOD、Avatar/Clips、挂点与 Animator 接口；绑定和动作需求分别交 [`$app-character-rigging`](#mode-unity-game-3d-rigging)、[`$app-animation`](#mode-unity-game-3d-animation)。角色内部 Animator 由实施包指定的动画/集成单写者维护；玩法负责触发、状态、事件消费和唯一位移权威，V5 实测循环/过渡/打断、根运动和生命周期。3D 不套用 2D 专用门禁，骨架/权重、动作或材质缺陷退原岗位，不从场景私改共享源绕过。

1. 先冻结玩家行为、边界情况和测试点；A3 前冻结实施包，再按总控的阶段任务闭环编码。
2. 表现前建立图片、模型、贴图、动画、VFX、字体和音频依赖；查询登记并复用有效产物，合成效果图交给视觉资源角色，不自行裁切。生产级模型和贴图需求分别交给 `$app-3d-modeling` 与 `$app-3d-texturing`；原生 2D 骨骼与动画交给 [`$app-character-rigging`](#mode-unity-game-2d-rigging)。消费已独立验收的角色 Prefab、视角/方向规则、Animator 参数、动作事件和挂点合同，负责触发与战斗逻辑；不在场景中私改骨架、网格、权重或共享 Clip，接口不足时退回资产角色修复。玩法拥有权威状态、命中/伤害判定、事件语义、数值和动作触发；把已确定的事件及参数交给 [`$app-feedback`](#mode-unity-game-juice) 设计反馈映射。表现层消费事件，不能成为玩法判定来源；顿帧、击退等改变规则或玩家控制的行为由玩法/数值角色确定。
3. 遵守 asmdef 和 TDD 边界，分离纯规则、状态、输入、场景表现、Unity 生命周期和平台服务；数值读取可审阅配置。
4. 纯规则可与资源制作并行；正式场景只接入已登记、审查、授权和 Unity 验证通过的资源。场景只实现自身玩法、画面与常驻 HUD；modal、popup、drawer、toast 使用独立 DISPLAY_LAYER Work Item 和包，`hostSceneId` 仅用于公开接口与上下文接线，弹窗未完成不阻断宿主场景 V5。
5. 2D/UI 场景必须消费响应式合同与平台目标：按现有项目选择 uGUI CanvasScaler、UI Toolkit PanelSettings 或 Camera 路线，并从唯一入口幂等重排；交互内容保持在安全区，左右或上下边带只接入已登记的纯视觉背景。移动端另处理刘海/挖孔、系统栏、旋转、软键盘和触控手势，Windows 另处理窗口缩放、焦点与键鼠/手柄切换。程序化文本默认实现 `zh-CN`，英语 `en` 等其他语言按项目选择实现，逐语言遵守单行/换行合同并禁止截断；玩家可见表达、真实数据绑定、代表值和本地化边界检查按[游戏内文案指导](../../unity-development-workflow/references/game-copy.md)执行，不把内部 GDD 或设计描述绑定为界面文案。
6. 3D 场景只消费按共同交接由建模、贴图、绑定、动画及指定集成单写者交付、通过独立 QA 的版本化资源级 Prefab；按稳定资源 ID/GUID/地址接线，不在场景或运行时脚本中复制、覆盖或临时修改 Mesh、UV、Material、Texture、LOD、骨骼和材质槽。碰撞、交互挂点或 Animator 接口不满足玩法时，提交可复现需求并退回资产所有者修复。
7. 研发阶段仅在 Editor/EditMode/PlayMode 与 Game View 模拟中验证重开、暂停恢复、参考分辨率、输入映射、资源失败、离线和适用的存档异常；未经明确授权不安装或启动 Standalone/Player、真机或等价设备。
8. 提交变更路径、测试、构建日志、Editor 固定机位截图、正式资源、限制和阻断项；开发者不能完成自己的独立 F2 审查。设备证据只在独立发布 Work Item 获明确授权后产生。

占位资源必须登记替换责任人和最迟质量门。新增或修改的类、函数和实体定义必须添加说明规则、边界或性能取舍的简体中文注释。
<!-- native-source:unity-gameplay-development:end -->


## 游戏音频

<!-- native-source:unity-game-audio:start -->
<a id="mode-unity-game-audio"></a>

<a id="mode-unity-game-audio--unity-游戏音频"></a>
### Unity 游戏音频

<a id="mode-unity-game-audio--输入与决策"></a>
#### 输入与决策

读取 Work Item、相关音频、代码、项目配置、GDD/TDD、资源登记与音频计划。音频方向、授权、响度、预算、外部成本或发布资格存在实质取舍时交给 `$grilling`；购买、上传或外部生成还必须由控制面取得精确操作批准。

<a id="mode-unity-game-audio--执行与交接"></a>
#### 执行与交接

AudioSource→AudioMixer 分组与场景扫描交给 `unity:audio-setup-mixers`，Importer、Load Type、编码、采样率和 Mixer 性能优化交给 `unity:optimize-audio`；Vivox 语音/文字聊天交给 `unity:setup-vivox-voice-chat`。本角色保留音频方向、事件语义、来源授权、预算和跨领域交接，不复制插件操作流程。项目音频生命周期还需遵守[基础工程要求](../../unity-development-workflow/references/foundation-workflow.md)与[TDD 生命周期记录](../../unity-development-workflow/templates/project-docs/TDD.md)。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。
3. 用 AudioMixer 规划 Master/Music/SFX/Voice/UI 分组、音量、Duck、并发限制和持久设置；避免每次播放产生不必要分配。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#后台暂停与恢复约束)。

Unity 工程必须将窗口失焦加入暂停原因；窗口、应用和系统中断通知沿用统一暂停原因集合与恢复边界。
5. 验证首次播放、暂停恢复、窗口失焦、设备切换、静音、循环、场景切换、重复生命周期通知、停止/销毁后的恢复边界、后台新请求和资源缺失；在 Windows 候选环境检查实际输出。目标含 Android 时，在获准的设备验证中复核系统中断和前后台恢复。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。

新增或修改的类、函数和实体定义必须有说明生命周期、并发或性能取舍的简体中文注释。
<!-- native-source:unity-game-audio:end -->


## 游戏数值与经济

<!-- native-source:unity-game-balance:start -->
<a id="mode-unity-game-balance"></a>

<a id="mode-unity-game-balance--unity-游戏数值设计"></a>
### Unity 游戏数值设计

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。

<a id="mode-unity-game-balance--输入与决策"></a>
#### 输入与决策

读取 Work Item、相关玩法、配置、测试、GDD 和 `docs/balance.md`。目标节奏、经济、商业化影响、允许偏差、验收阈值或高风险曲线存在实质取舍时交给 `$grilling`；其余范围内可逆配置由实施包记录后推进。

<a id="mode-unity-game-balance--执行与交接"></a>
#### 执行与交接

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#参数变更影响与复验)。
<!-- native-source:unity-game-balance:end -->


## 游戏与应用汁水设计

<!-- native-source:unity-game-juice:start -->
<a id="mode-unity-game-juice"></a>

<a id="mode-unity-game-juice--unity-游戏动态反馈"></a>
### Unity 游戏动态反馈

沿用现有 Work Item、Implementation Package 与 V0–V5 阶段，不创建反馈专用状态机或 Work Item 类型。V0 内部分流无常规确认；V1 验证功能，V2–V5 按控制面提交真实交付，V3 拆解图和布局图分别确认。动画制作前先确认动作方案，真实显示仍由用户验收。

玩法角色拥有权威状态、命中/伤害判定、事件语义、数值和动作触发。本角色把已确认的玩法事件映射为表现通道及生命周期策略；表现反馈不能作为玩法判定依据。顿帧、击退等会改变规则或玩家控制的行为由玩法与数值角色确定，本角色只实现其已批准的表现部分。

<a id="mode-unity-game-juice--工作流程"></a>
#### 工作流程

1. **V2 明确反馈意图**：对核心事件记录玩家应理解的信息、触发时机和预期感受，并确定视觉、音频、镜头、时间与交互反馈是否适用。此处与美术 brief、主题和可读性目标一致。
2. **V3 冻结事件映射**：为每个事件记录来源、参数、表现通道、强度、时长、触发条件、时间来源、优先级、重复/叠加策略、中断处理、完成行为及负责对象。具体格式见[动画意图与反馈时间轴合同](../../unity-development-workflow/references/animation-intent-contract.md)。
3. **V4 验收反馈资源**：验证已登记的动画、VFX、音频和镜头参数的资源交付与导入，可提供临时组合预览；正式场景接入与校准留在 V5。
4. **V5 接入并验收动态体验**：在真实 Scene/Prefab/UI 组合中检查触发次序、层级、遮挡和时间行为，按[美术质量契约](../../unity-development-workflow/references/art-quality-contract.md)检查正常游玩、重复反馈、事件峰值和同屏叠加情境。真实运行片段和人工检查绑定当前工作项、候选与场景；技术验证不代替用户显示确认。

<a id="mode-unity-game-juice--必须明确的运行行为"></a>
#### 必须明确的运行行为

- 重复和叠加遵循[公共反馈竞争规则](../../app-feedback/references/interaction-feedback.md#3-处理重复并发和打断)；Unity 可选重播或重置，按项目限制并发数量，避免多个反馈争用同一属性。
- 被更高优先级事件打断、对象禁用、关闭显示层或离开场景时，遵循[公共反馈生命周期](../../app-feedback/references/interaction-feedback.md#5-尊重生命周期与可访问性)；结束后恢复被临时修改的视觉属性。
- **时间与暂停**：按反馈通道声明使用缩放时间或非缩放时间，以及暂停、顿帧和 UI 交互时的行为。不得让一个短暂反馈意外改变全局 `Time.timeScale`；修改全局时间的玩法规则由玩法角色持有。
- **对象生命周期**：对象池复用前清除旧动画、计时器、协程、事件订阅和临时状态；释放后不得继续播放或影响新实例。选择适合项目实现的清理方式并在实际对象池轨迹验证。

反馈设计需服从[美术质量契约](../../unity-development-workflow/references/art-quality-contract.md)的可读性与观看舒适要求。HUD、Toast、奖励浮字等若含玩家可见文字，按[游戏内文案指导](../../unity-development-workflow/references/game-copy.md)消费已冻结表达与真实事件数据，不添加未批准的解释语句，并保留图标控件的项目级无障碍名称。需要制作不同动画路线时，按[动画意图与反馈时间轴合同](../../unity-development-workflow/references/animation-intent-contract.md)明确资产负责人；生产级模型与贴图 Skill 不承担动画生产。
<!-- native-source:unity-game-juice:end -->


## 候选交付与发布准备

<!-- native-source:unity-game-release:start -->
<a id="mode-unity-game-release"></a>

<a id="mode-unity-game-release--unity-多平台发布与合规"></a>
### Unity 多平台发布与合规

准备可交付候选包不等于已经签名、上传、发布或通过外部审核。账号、证书、令牌、崩溃数据和个人信息只进入受控外部系统。

<a id="mode-unity-game-release--输入与决策"></a>
#### 输入与决策

读取项目配置、GDD、TDD、控制面、发行矩阵、资源/音频登记、QA 计划、G2 逐模块与逐平台验收结果和发布清单。发行渠道、数据处理、第三方 SDK、商店资料、设备档位、已知风险接受、回滚策略和最终放行需先交给 `$grilling` 逐项确认，生成绑定当前候选包的批准记录；缺少当前版本记录时不得签名、上传或发布。

<a id="mode-unity-game-release--执行与交接"></a>
#### 执行与交接

候选测试与构建使用 `unity:unity-cli`；IAP、LevelPlay、Vivox、多人和 LiveOps 使用对应 `unity:*` 专项 Skill。本角色负责平台矩阵、许可隐私、候选身份、签名/上传授权和最终放行，不重复维护 SDK 或 CLI 操作教程。

1. 核对用户批准的平台集合和每个平台的 Unity 6 Build Profile、脚本后端、版本、场景、图形 API、输入、屏幕策略与日志配置；未选择平台不得生成候选包。
2. 本角色是设备验证的唯一启动角色。先用机器可验证的当前 G2 结果确认状态为 `PASS`，并深验其覆盖全部模块、场景和用户批准平台；任一报告缺失、重复、失败、失效或项目/源码/状态身份不一致时，不得生成候选包、安装或启动任何 Standalone/Player，也不得开始设备验证。
3. 只从可追溯源码修订和可复现构建配置生成各平台候选包。Windows/Android 按 `unity:unity-cli` 当前规则构建；iOS/iPadOS 必须在 macOS/Xcode、签名和真机条件具备时生成 IPA，否则保持 `BLOCKED`。
4. 取得用户对当前设备验收的明确授权后，对每个平台候选主制品执行“对应设备档位 × 全部批准场景”最终矩阵，核对安装/升级、启动、核心循环、输入、生命周期、屏幕适配、视觉、音频、性能和稳定性；证据引用同一 G2 `g2.development-complete` 与实际候选制品路径及版本，不要求或比较 SHA。
5. 核对资源、字体、音乐、第三方包与生成内容的权属/许可，记录隐私、联网、遥测、崩溃收集、账号和商业能力实际状态。
6. 按发行方式准备图标、截图、描述、分级、安装/卸载、系统要求、发布说明、已知问题和回滚方案。
7. 由独立角色核对制品与证据；没有用户明确放行时不得声称已准备上架，更不得签名、上传、覆盖稳定制品或创建外部发布。

输出候选包、`delivery-manifest.yaml`、`quality-report-device-acceptance.yaml`、发行清单和风险摘要；把外部提交与审核状态如实标记为未执行、进行中或实际结果。
<!-- native-source:unity-game-release:end -->


## 质量审核与性能验证

<!-- native-source:unity-game-qa-performance:start -->
<a id="mode-unity-game-qa-performance"></a>

<a id="mode-unity-game-qa-performance--unity-测试与性能"></a>
### Unity 测试与性能

证据优先于主观结论。设备档位、帧率、内存、GC、Draw Call、加载或包体上限未经用户批准时，只报告实测数据与决策缺口。

<a id="mode-unity-game-qa-performance--输入与决策"></a>
#### 输入与决策

读取 Work Item、验收、相关实现、测试、项目配置、GDD/TDD、当前候选包及已创建的数值、资源、音频与发行文档。性能预算、验收阈值、严重度、风险豁免或放行存在实质取舍时交给 `$grilling`；未定义阈值时只报告实测结果，不自定 PASS。

按总控规则以用户要求和实际完成情况验收；合同提供目标与边界，中途实现调整无需回改合同，不校验 SHA。实际行为变化只重验受影响部分，并保留真实证据与用户人工确认。

<a id="mode-unity-game-qa-performance--执行与交接"></a>
#### 执行与交接

测试、构建、Editor/Player 日志和 Profiler 入口使用 `unity:unity-cli`；Web、音频、TMP 与具体渲染问题分别路由到 `unity:optimize-web`、`unity:optimize-audio`、`unity:optimize-text-mesh-pro` 及适用的 URP 专项 Skill。本角色负责测试矩阵、证据真实性、预算判定和独立放行，不复制专项调优教程。

1. 在 QA 计划中预先定义 EditMode、PlayMode、场景主路径、模块边界和用户批准的目标平台。设备用例与档位只能提前规划；G2 `PASS` 前禁止安装或启动任何 Standalone/Player、真机或等价设备，也禁止采集设备视觉、输入、生命周期、性能或稳定性结果。
2. 按 `unity:unity-cli` 当前规则运行测试并等待任务终态；记录版本、用例数、失败详情与原始日志。
3. G2 前只做 Editor Profiler 趋势、静态预算、资源统计和构建日志检查，不产生目标设备性能 `PASS`。G2 `PASS` 后在 G3 按批准的平台工具链与候选制品采集帧时间、CPU/GPU、内存、GC、Draw Call、纹理、加载和包体。
4. 缺陷记录版本、场景、设备、复现步骤、预期/实际、证据、P0-P3、所有者和回归状态。
5. 2D/UI 小循环仅覆盖已批准方向内的代表性比例：横屏无需验证竖屏，竖屏无需验证横屏；双方向项目分别覆盖两种方向并验证切换。单方向覆盖该方向的参考、较窄和较宽比例、代表性安全区及连续 resize 轨迹，不要求跨方向旋转；桌面宽屏仅在批准范围内覆盖。逐例实测 Screen/Game View/backbuffer 或 RenderTexture、Camera `pixelRect`/投影、CanvasScaler 或 PanelSettings、`Screen.safeArea`、输入命中、关键 UI 矩形、状态、语言、稳定帧和截图；只存在组件、构建成功、单张截图或静态配置不能证明响应式通过。[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)
6. 对 `$app-3d-modeling` 交付物独立检查来源版本、拓扑/法线/切线、比例轴向、材质槽、LOD、BlendShape 目标几何、Collider、Prefab 引用和架构预算；角色骨架/权重与动作按下述专用流程验收，模型生产代理的自检不能替代 QA。
7. 对 `$app-3d-texturing` 交付物独立检查 UV 密度/重叠/Padding、Bake 射线与接缝、PBR 通道/颜色空间/法线方向、URP Shader/Importer/Material 映射、Mip/Streaming、纹理内存和授权证据。
8. 研发期 3D 验收使用 Unity Editor 覆盖中性光、掠射光、正反面、近远景、LOD 切换、动画变形与目标场景光照；批准平台实机转台、设备性能和稳定性只在 G2 `PASS` 后的 G3 执行。
9. 程序化文本对项目所选语言（默认 `zh-CN`，英语 `en` 可选）分别验证真实字形、字体回退、基线、`single-line`/`wrap` 策略和容器适配，任何语言都不得截断。按[游戏内文案指导](../../unity-development-workflow/references/game-copy.md)使用实际必要翻译中占用空间最长的文本与合理边界输入检查换行、容器适配和截断；验证可见内容与真实数据/显示条件一致，并保留必要条件和后果。场景证据只覆盖自身常驻 HUD；modal、popup、drawer、toast 必须使用独立 DISPLAY_LAYER 候选与打开→交互→关闭→恢复轨迹，宿主场景截图不能替代。
10. G2 为每个批准模块生成唯一 `modules.acceptance-complete` PASS 报告，并为每个批准平台生成唯一 `platforms.adaptation-complete` PASS 报告。G3 只能在该 G2 结果有效时，为每个平台冻结候选主制品并执行“平台设备档位 × 全部批准场景”笛卡尔积；每个用例绑定所属平台制品哈希。没有完整模块、平台、设备矩阵或真机证据时使用 `NOT_RUN` 或 `BLOCKED`，不得报告通过。

开发者自测可作为输入，不能替代独立 QA 批准。

<a id="mode-unity-game-qa-performance--美术质量与动态反馈验收"></a>
#### 美术质量与动态反馈验收

按[美术质量合同](../../unity-development-workflow/references/art-quality-contract.md)独立检查主题贴合、受众适配、玩法可读、观看舒适、美术完成度，五项必须逐项 `PASS`。V5 对 `normal-play`、`repeated-feedback`、`event-peak`、`overlap-peak` 逐项记录必需或不适用及理由；适用项缺少真实运行证据时为 `NOT_RUN`，不推定通过。

验收材料绑定当前 Work Item、候选与场景/显示层，由控制面 `artExperienceAcceptanceRef` 引用。实际运行片段或截图交由用户人工检查显示效果并确认；QA 不自动分析截图或据此声称视觉通过。动态反馈的重复、叠加、中断、暂停和对象池生命周期按 [`unity-game-juice`](#mode-unity-game-juice) 的事件映射和当前 Unity 实测轨迹检查。

对 [`$app-character-rigging`](#mode-unity-game-2d-rigging) 的交付，读取其[制作与验收合同](../../unity-game-2d-rigging/references/production-contract.md)，在现有质量门内分两轮独立检查，不增加阶段或状态。

3D 角色绑定与动画分别来自 [`$app-character-rigging`](#mode-unity-game-3d-rigging) 和 [`$app-animation`](#mode-unity-game-3d-animation)。按[角色共同交接](../../unity-development-workflow/references/3d-character-handoff.md)和[Unity 角色导入合同](../../unity-development-workflow/references/3d-character-unity-import.md)，资产交付前独立核对当前骨架/rest/bind、各 LOD 权重/形态、导出回读、Avatar/Clip/根运动、事件、挂点、材质和 SkinnedMeshRenderer Bounds；接入后在目标场景验证响应、过渡/循环/打断、位移单权威、暂停恢复、对象池和多实例等适用轨迹。动画专业审查与制作者分离，覆盖姿态/节奏材料；实际片段和截图交用户人工检查。技术报告、专业意见、F2/F3 和用户确认分开，不把 Node 静态检查当作角色播放已通过；缺实际 Blender/Unity 证据标记 `NOT_RUN`/`BLOCKED`。3D 不调用 `uwt_validate_2d_rigging`，不填写 2D 专用 `riggingDelivery`。

按[岗位协作](../../unity-development-workflow/references/2d-animation-collaboration.md)接收 TA 的工具版本、作用范围、复现命令和原始报告，并独立复验；TA 编写的工具与制作者自检均不能自批。总控可在本角色中指定具备动画专业能力、且与被审资产制作者分离的动画质量负责人，负责动作标杆和专业审查材料；技术 QA、专业意见和用户显示确认分别记录。代理审查设计、时间轴、曲线／事件数据和材料覆盖，实际画面由人工判断，不自动分析截图。

- **资产交付前**：检查部件与骨骼映射、网格/权重和 Sprite Skin 状态、极端姿势、视角/方向/镜像、Clip 循环与 Controller 过渡/中断、事件与挂点合同、Prefab 保存与重导入、实例引用隔离和批准预算。代表动画须覆盖当前动作风险；通过资产检查仅表示该候选可交玩法接入。
- **玩法接入后**：在实际场景、相机和显示尺度下，验证输入到动作的响应、事件时机与次数、移动速度与步频/接触的一致性，以及适用的连续触发、打断、转向、暂停恢复、对象池复用和多实例。检查实际节奏是否满足使用场景，不能以孤立 Clip 播放或资产检查结果代替整体完成。

存在角度、手势或变形替换图时，资产轮检查基础部件与变体映射、Sprite 引用、每个变体适用的骨骼/网格/权重、切换绑定与保存重导入结果；不得默认所有变体可共用网格或权重。接入轮检查切换时机、退出/中断后的默认恢复、适用的对象池重置和多实例隔离，确认没有多个驱动者同时替换同一部件。两轮预览覆盖切换前、切换瞬间及切换后，正常速度与必要慢放交用户人工检查轮廓、关节、比例、颜色、层叠、运动轨迹及挂点是否连续；不能仅靠单张替换图或暂停姿势验收。补图或切换返修后复验受影响的动作、过渡和引用，未受影响工作不扩围。

工程轮使用 TA 交付的 `uwt_validate_2d_rigging` Job 和结构化报告独立复验，并运行 Toolkit 的 `Project.UnityWorkflow.Tests.Rigging` 检查器负例与角色回归夹具，具体见[工具说明](../../unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit/README.md#2d-骨骼资产工程检查)。记录真实 Editor／已解析包版本、测试数量、失败详情和原始结果；技术夹具通过只证明其覆盖的资产与生命周期行为，正式角色仍按当前场景及人工视觉确认验收。不能把 Node 静态测试、测试代码存在或未实际运行的 Unity 用例报告为通过。

2D 骨骼资产交玩法前，按[骨骼交付门禁](../../unity-domain-contracts/references/rigging-delivery-gate.md)提交现有 Manifest 的 `riggingDelivery`：回读当前 Prefab/GUID/修订的工程报告，实际运行目标项目角色的必需 Editor PlayMode 情境，保存 `completed` 原始测试结果并逐项绑定测试全名；由独立 QA 记录复验人、时间和环境。工具夹具、静态 F3 PASS、启动成功、零测试或跳过项均不能代替。失败与未闭环 findings 阻断交接；将内容缺陷退原生产岗位，将缺证/陈旧证据作为本岗位 `revalidate`，修复后重跑受影响检查，再调用控制面复验。

两轮均采集覆盖动作全过程、循环接点和过渡的真实预览，必要时补充极端姿势、连接区细节和慢放，交用户人工检查部件组合无缝及动作节奏。按合同排查裂缝、露底、错位、双轮廓、明显色差/纹理/线条接缝、透明边缘和层叠跳变；不得自动分析截图或据此判定视觉通过，也不得以缩小画面、改机位或提高容差掩盖问题。缺图与连接区交视觉资产角色，权重/姿态/节奏/Controller 交骨骼角色，触发/判定/状态规则交玩法；跨界问题由总控裁决，返修后复验受影响动作和接入情境。

确认记录、来源版本、资源引用和预算必须对应当前候选；未在目标 Editor 实测的 API 能力或设备性能保留 `NOT_RUN`，不由静态检查推断通过。工程检查通过与用户视觉确认分别记录，未完成后者不得宣告视觉或整体验收通过。
<!-- native-source:unity-game-qa-performance:end -->


## 动画制作与接入

<!-- native-source:unity-game-2d-animation-ta:start -->
<a id="mode-unity-game-2d-animation-ta"></a>

<a id="mode-unity-game-2d-animation-ta--unity-2d-动画技术美术"></a>
### Unity 2D 动画技术美术

为 2D 骨骼动画生产提供可复用的技术管线、诊断和回归入口。岗位边界、制作交接和动画质量审查按[2D 动画协作说明](../../unity-development-workflow/references/2d-animation-collaboration.md)执行。

<a id="mode-unity-game-2d-animation-ta--责任范围"></a>
#### 责任范围

- 维护或在明确授权的 Work Item 内实现公共制作工具、导入/导出约定、骨骼与变体资产校验、角色×方向×动作×变体的批量完整性对账、资源依赖影响分析，以及 Unity 回归夹具和性能测量方案。
- 任务开始时读取现有 Work Item 与 Implementation Package，确认项目实际 Unity/包版本、资源路径、生产约定、预算、验证入口及文件和 Unity 对象的单写者。沿用现有工作项、证据与状态，不另建领域账本或状态机。
- 具体角色的骨架、网格、权重、Clip、Controller 和变体切换属于 `$app-character-rigging`；部件图片属于 `$app-asset-workflow`；权威玩法状态、规则与触发属于 `$app-gameplay-development`。出现角色资产或玩法问题时提供诊断并交给对应所有者修复，不自行修改这些交付物或项目全局配置。
- 自动化检查只给出工程事实和诊断。由总控指定且与被审角色制作者分离的动画质量负责人审查动作标杆、姿势、节奏、重量、接触、运动弧线、过渡及部件切换可读性；独立验收由 `$app-quality-review` 完成。TA 不替代二者，也不把工具结果当作动画或美术通过。

<a id="mode-unity-game-2d-animation-ta--执行方式"></a>
#### 执行方式

1. **先查现状**：用 `unity:unity-cli` 发现实际 Unity Editor 并执行命令与测试；Sprite 元数据操作使用 `unity:sprite-editor`。只有确认存在实际包缺口且任务授权时，才使用 `unity:unity-package-management`。复用已有有效工具和 Toolkit 实际提供的能力；确认 API 或导入行为时以当前版本的实际环境为准，不虚构 API，也不把尚未实现的校验器、夹具或命令说成现成能力。
2. **尽早提供约束**：向骨骼动画、视觉和玩法负责人说明已验证的版本与能力、输入数据要求、导入/导出约束、预算影响及可用验证入口。发现能力缺口时给出最小技术验证和限制，交总控决定范围，不让正式资产依赖未验证的路径。
3. **支持制作与返修**：提供按任务范围可复用的检查与对账，覆盖部件身份和引用、骨骼映射、网格/权重基本有效性、方向/动作/变体组合完整性、导入结果及变更影响。未要求或未授权开发相应工具时，明确可执行的人工检查和未覆盖项；公共工具或规则缺陷由 TA 修复，具体角色内容问题退回该资产所有者。
4. **提交可复验交付**：把 QA 可复现的命令或操作入口、目标项目和版本、输入候选、检查结果、日志位置、失败项与未运行项写入现有工作项证据。说明哪些结论来自工具、哪些仍需独立 QA 或用户检查；修复后仅复验受影响的资源和消费者。

已有角色骨骼资产工程检查入口为 Toolkit 的 `uwt_validate_2d_rigging`，使用工作流 `templates/rigging-validation.yaml`／`schemas/rigging-validation.schema.json` 描述当前角色需求，再编译为通用 Job；读取[工具说明](../../unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit/README.md#2d-骨骼资产工程检查)。该检查器只读角色资产、只写工程报告；独立 QA 的 `Rigging` 角色夹具测试和用户显示确认分别执行，不能用静态工程 `PASS` 替代运行／视觉通过。

正式交付执行[骨骼交付门禁](../../unity-domain-contracts/references/rigging-delivery-gate.md)：工程报告保留实际 Prefab/GUID 和 Assets 依赖来源，任务与修订绑定当前工作项；QA 提供当前正式角色的播放回归。缺失、失败或失效证据阻断交接。公共工具或规则缺陷由本岗位修复，素材、角色内容和玩法缺陷分别退回原所有者；修复后由独立 QA 重新取证，TA 不签署自己的独立验收。

<a id="mode-unity-game-2d-animation-ta--写入与验收边界"></a>
#### 写入与验收边界

- 仅在当前 Work Item 明确授权的文件、脚本或 Unity 对象范围内开发工具。遵守单写者；对 `ProjectSettings/`、`Packages/`、共享 asmdef、Addressables 等项目级配置，或超出任务包的目录和对象，不自行写入，先交总控更新范围。
- 优先使用现有 Unity Editor、插件与 Toolkit，并先检查可复用进程；不得为方便而重复启动服务。新增依赖、修改全局设置或扩展安装包不由本 Skill 自动授权。
- Unity 场景/Prefab/Importer 等事实必须从目标 Editor 或受支持的工具取得，写入后回读验证；静态检查不能替代 Unity 导入、重载或运行回归。性能报告按已批准预算解释，缺门槛时只报测量值和决策缺口。
- 不自动启动真机或 Standalone/Player，不执行外部写入或发布。截图和实际预览由用户人工检查；不得自动分析截图或据此宣布视觉验收通过。
<!-- native-source:unity-game-2d-animation-ta:end -->

<!-- native-source:unity-game-3d-animation:start -->
<a id="mode-unity-game-3d-animation"></a>

<a id="mode-unity-game-3d-animation--unity-游戏-3d-角色动画"></a>
### Unity 游戏 3D 角色动画

使用已交接并冻结的 3D 角色 Rig 制作可读、可复现、可导入的正式动作。动画路线固定使用 Blender MCP。正式素材生产前先按既有[动画意图与反馈时间轴合同](../../unity-development-workflow/references/animation-intent-contract.md)向用户说明设计理念和动作方案并取得确认；不增加额外阶段或先做灰盒。开始前读取[动画工作流](../../unity-game-3d-animation/references/animation-workflow.md)、[3D 角色交接](../../unity-development-workflow/references/3d-character-handoff.md)和[Unity 角色导入流程](../../unity-development-workflow/references/3d-character-unity-import.md)。

<a id="mode-unity-game-3d-animation--职责与工具"></a>
#### 职责与工具

- 模型/贴图角色拥有网格、拓扑、UV、法线、槽位、材质和 BlendShape 目标几何；绑定角色拥有骨架、静置姿势、控制器、变形骨、蒙皮、约束与驱动基础和挂点；本角色只读消费这些冻结版本，拥有 Actions/slots、曲线、IK/FK 切换、表演姿势、接触、循环/过渡、节奏、根运动轨迹和表现事件。
- 玩法拥有权威状态、位移/命中/伤害规则与事件触发时机。动画事件只能报告表现节点或通知约定入口，不能独立决定玩法效果、伤害、物理推力或权威位移。
- 先复用可用 Blender 进程，按当前 MCP Schema/Blender 版本核实 Action、约束/驱动烘焙、曲线采样、形态键曲线、NLA 和逐 Clip FBX 能力。既有合法动画可只读输入并在 Blender 内适配；缺少必需能力即 `BLOCKED`，不能改用 Unity 自动绑定、外部自动动画服务或供应商。
- 脚本执行遵循既有精确授权边界。Unity 只消费导出的骨架/动画，负责导入器、Avatar、Clip 设置、Animator/事件映射、SkinnedMeshRenderer 与资源级 Prefab 验证；不替代 Blender 源动画生产。

<a id="mode-unity-game-3d-animation--制作入口"></a>
#### 制作入口

读取[生产级动画工作流](../../unity-game-3d-animation/references/animation-workflow.md)，沿用既有 Work Item/V0–V5 和 `animation-intent-contract`。为每个动作独立定义 FPS、帧/秒范围、循环接点、步幅/步频、root motion（in-place 或 displacement）、玩法单一权威、中断/对象池/多实例行为和表现事件，再按已确认方案制作真实动作。输出要包含源文件与配方、逐 Clip 烘焙/导出、回读证据和 Unity 导入验证；动作画面由用户人工检查。
<!-- native-source:unity-game-3d-animation:end -->


## 角色骨架与绑定

<!-- native-source:unity-game-2d-rigging:start -->
<a id="mode-unity-game-2d-rigging"></a>

<a id="mode-unity-game-2d-rigging--unity-原生-2d-骨骼制作"></a>
### Unity 原生 2D 骨骼制作

从完整角色图开始，协调视觉部件生产，制作可编辑的骨架、蒙皮、动画和角色 Prefab。项目决定视角、风格、动作、版本和性能预算；不要套用固定的人形骨架或动作模板。

<a id="mode-unity-game-2d-rigging--输入职责与工具"></a>
#### 输入、职责与工具

- 读取当前 Work Item、Implementation Package、项目资源规范、完整角色图、玩法动作需求、可复用 Unity Editor 和实际命令目录。复用现有 Work Item 与实施单元，不新增 `ASSET` 或 `MODULE` Work Item 类型，也不建立第二套状态机。
- 使用 Unity 原生 2D Animation / Sprite Skin。完整角色图是设计基准；通过 `$app-asset-workflow` 按拆件合同生产部件、遮挡补全和关节连接区，不能把效果图直接裁切成正式 Sprite。小幅弯曲优先用骨骼网格变形；角度、透视或轮廓等无法正确表达时，由骨骼角色提出补充角度图或替换图，按[制作合同](../../unity-game-2d-rigging/references/production-contract.md)闭环制作、接入和复验。实际图像生成或编辑委派 `image_generator` 子代理，不用生成整段动画代替 Unity 骨骼动画。
- Unity Editor 发现与命令目录使用 `unity:unity-cli`；Sprite 元数据操作复用 `unity:sprite-editor`；仅在确有依赖缺口时交给 `unity:unity-package-management` 安装所需包。遵循这些技能的安全检查与实际版本约束。
- 骨骼角色负责骨架、网格、权重、Clip、角色 Prefab，以及角色 Animator Controller 内部的参数、状态、过渡和中断；玩法角色拥有权威玩法状态、规则与触发时机，只通过已约定接口消费动画。独立质量审查交给 `$app-quality-review`。现有 Spine 角色只换皮时转给 `$app-spine-reskin`。
- 按[岗位协作](../../unity-development-workflow/references/2d-animation-collaboration.md)消费动画质量负责人的动作标杆与返修意见，并由 [`$app-animation`](#mode-unity-game-2d-animation-ta)提供公共工具、数据／导入规范、诊断和回归支持。骨骼角色仍拥有具体角色资产和样例角色数据；公共工具缺陷交 TA，角色缺陷由本角色修复，工具结果与自检不能代替独立 QA 或用户视觉确认。

<a id="mode-unity-game-2d-rigging--制作顺序"></a>
#### 制作顺序

1. 读取项目 Unity、已解析包与渲染管线版本、角色视觉基线、朝向/镜像规则、骨架命名、导入规范、目标预算和已有验收门槛。缺少普通技术细节时提出并记录方案；影响视觉、玩法接口或性能放行的取舍交回总控。
2. 拆件前复用项目已有的有效视角决定；没有决定时先让用户选择并记录视角、方向集合、默认朝向、镜像许可和切换规则。名称与候选见[制作合同](../../unity-game-2d-rigging/references/production-contract.md)。
3. 拆件合同定稿前，与玩法共同评审根节点、朝向、挂点及其局部空间、动画事件语义和位移权属，并写入现有交接合同；不新增确认门。根据已定视角、玩法和部件组合风险设计拆件图、身份、层叠顺序、连接区、骨架运动关系及导入规格。交付可查看的框选标注图和内部结构合同，等待用户确认当前版本后才委派正式部件生产。
4. 检查视觉资产的来源版本、映射、尺寸、Pivot、PPU、边缘、连接区和层叠；在约定尺度检查组合效果，缺陷退回视觉资产角色。按项目结构创建骨架、Sprite Skin、网格与权重，区分刚性部件和连续蒙皮部件；逐个验证图像变体能否复用原网格与权重，不适用时重新制作并验证。按[制作合同](../../unity-game-2d-rigging/references/production-contract.md)的无缝标准检查全运动范围。
5. 根据真实使用场景规划每个动作的姿态和节奏，再按[动画意图与时间轴合同](../../unity-development-workflow/references/animation-intent-contract.md)制作真实 Unity 骨骼驱动动画。代表动作按关节、遮挡、挂点、速度和接触风险选择；简单待机覆盖不足时，在同一代表动画预览中补充必要姿势或短片段。展示实际 Unity 预览并等待用户确认后，才扩展其余动作；截图和片段的视觉效果由用户人工检查，代理不得自动分析截图或据此判定视觉通过。
6. 按项目动作合同完成 Clips、循环、过渡、中断、事件、Controller 与挂点，保存候选 Prefab。资产工作项使用 `domain: 2d-rigging`、`unity-asset-change`，按[骨骼交付门禁](../../unity-domain-contracts/references/rigging-delivery-gate.md)声明当前角色和实际回归情境；资产工程检查及该角色播放回归通过、独立 QA 复验后才交玩法。门禁失败按岗位修复并重新取证，不能用公共技术夹具代替。玩法接入后再由 QA 检查游戏内行为。两轮预览与验收范围见[制作合同](../../unity-game-2d-rigging/references/production-contract.md)，实际画面由用户人工检查；沿用原状态和专项确认，分别记录资产就绪与整体完成。

<a id="mode-unity-game-2d-rigging--硬性边界"></a>
#### 硬性边界

- 两次用户确认分别绑定角色、基线、产物版本和用户回复：拆件方案确认后才能在其生产边界内制作部件；代表动画确认后才能批量扩展动作。若修改要求改变已确认的拆件方案或代表动画，修正、重验、重新展示并确认新版本。
- 已确认拆件范围内因动作暴露缺陷而补充变体，按合同直接制作、接入和展示复验，不另加文字审批；新增视角方向或超出已确认生产边界时，先更新并重新展示受影响拆件内容、获得确认后再生产。若补件改变已确认代表动画，先展示更新版并获得确认，再扩展依赖动作。
- 正式生产前先在隔离技术样例或已验收可复用部件上验证最小资产链路，不依赖尚未通过拆件确认的正式部件。该技术验证不代替实际角色预览与用户视觉检查。
- SCENE / DISPLAY_LAYER 按现有控制面使用 V0–V5 与阶段确认；内容一致时拆件确认可并入 V3。代表动画确认必须早于其余动作制作。记录专项确认和阶段确认各自覆盖的对象，不创建新的状态或确认 schema；其他 Work Item 遵循原有门禁。
- 先检查并复用可用 Editor；不得自动启动真机或 Standalone/Player。只有发现必需能力后才安装包，不升级 Unity 或无关依赖，不手改 `Packages/manifest.json`、`.meta` 或 Unity 序列化 YAML。
- 不承诺 Unity 自动权重界面存在可调用 API。权重算法可先在隔离的最小样例中实现和验证；未经样例验证不得用于正式生产。不得伪造 C# 模板；缺必需能力或输入时记为 `BLOCKED`，未执行检查记为 `NOT_RUN`，实际失败记为 `FAIL` 并修复，不得报告 PASS。
- 性能预算沿用项目已批准门槛；门槛缺失时记录测量值并交回总控制定，不自行宣布通过。无真机证据时不得声称设备性能已验证。

需要细化部件与玩法交接、视角选择或确认门时，读取[制作合同](../../unity-game-2d-rigging/references/production-contract.md)；需要评估 Editor API、权重算法和资产生命周期时，读取[Unity 能力验证](../../unity-game-2d-rigging/references/unity-capability-validation.md)。
<!-- native-source:unity-game-2d-rigging:end -->

<!-- native-source:unity-game-3d-rigging:start -->
<a id="mode-unity-game-3d-rigging"></a>

<a id="mode-unity-game-3d-rigging--unity-游戏-3d-角色绑定"></a>
### Unity 游戏 3D 角色绑定

为已交接的生产模型建立可维护、可动画、可导出的角色 Rig。统一在 Blender MCP 制作，不以自动权重或基础骨架生成器的结果直接交付。开始前读取[绑定工作流](../../unity-game-3d-rigging/references/rigging-workflow.md)、[3D 角色交接](../../unity-development-workflow/references/3d-character-handoff.md)；导出和导入按[Unity 角色导入流程](../../unity-development-workflow/references/3d-character-unity-import.md)衔接。

<a id="mode-unity-game-3d-rigging--职责与边界"></a>
#### 职责与边界

- 建模拥有网格几何、拓扑、法线、UV、材质槽与 BlendShape 目标几何；纹理拥有贴图、材质节点和 Shader 信息。绑定只读接收并保留这些数据，拥有静置姿势、骨架结构、命名/轴向/bone roll、控制器、变形骨、skin weights、驱动校正、道具挂点及各 LOD 绑定。
- 动画角色只消费已冻结的骨架与绑定，拥有 Actions、曲线、表演、IK/FK 切换、接触、循环、过渡、节奏、根运动轨迹和表现事件。动画发现骨架结构、蒙皮或变形缺陷时退回绑定；绑定发现几何问题退回建模，UV/槽位或材质信息问题退回相应模型/纹理负责人。
- 绑定不得为了方便改网格、重排顶点、重展 UV、改槽位或重做 BlendShape 目标几何。结构修改需版本化返给建模并重新核对权重、校正形态及导出依赖。
- Humanoid 或 Generic 由角色形态、骨架用途和重定向需求决定，不强制人形，也不设统一骨骼数或权重影响数。Unity 负责实际导入、Avatar/Skinned Mesh 设置、Prefab 装配和播放验证，不替代源绑定。

<a id="mode-unity-game-3d-rigging--blender-mcp-与-unity-路由"></a>
#### Blender MCP 与 Unity 路由

1. 先检查可复用的 Blender 进程、MCP 连接和当前工具 Schema；核对版本、活动 `.blend`、场景、对象/Collection、未保存状态、外链依赖和写入归属。只有确认没有可复用实例后才考虑启动，禁止重置或覆盖用户场景。
2. 按当前 Blender/MCP 版本确认 Rig、权重检查/编辑、约束与驱动烘焙、保存、FBX 导出及回读能力；不得假设某个工具名、API 或 UI 操作一定存在。能力不足时将受影响产物标为 `BLOCKED`，不改用 Unity 自动绑定、外部自动 Rig 服务或供应商补位。
3. 既有合法模型、绑定部件和动作可作为只读输入；所有正式修改写入版本化派生 `.blend`。脚本沿用当前精确授权边界；没有覆盖本次脚本与路径的精确授权时，执行前展示并取得确认。
4. 通过 Blender MCP 完成源 Rig 和蒙皮；派生副本中选择明确的骨架/网格/必需挂点导出集合并输出各 LOD 的 skinned FBX。随后按共享的 [Unity 角色导入流程](../../unity-development-workflow/references/3d-character-unity-import.md)串行导入、回读并验证。Blender 源能力不足时保持阻断，不转到 Unity 或 2D 专用 Rig 路线。

<a id="mode-unity-game-3d-rigging--生产交付"></a>
#### 生产交付

执行[绑定工作流](../../unity-game-3d-rigging/references/rigging-workflow.md)：先确认模型与骨架合同，再规划静置姿势和骨层级，分别建立控制骨与运行时变形骨，完成并修正蒙皮、驱动校正及按需的道具/面部挂点，验证压力姿势和各 LOD，最后在派生副本导出并回读。需要角色动作时交接给 `$app-animation`，不可将绑定验证误报为动画完成。

绑定交付至少含可重开的 `.blend` 及依赖、源/模型/UV/槽位/BlendShape 版本、骨架层级和命名/轴向说明、权重与压力姿势检查、控制和变形骨映射、各 LOD 对应、FBX 对象/骨骼选择与导出参数、许可、Unity 导入技术结果及待用户人工检查的显示证据。资源级 Prefab 属 V4，正式场景接入属 V5；技术检查和专业审查不代替用户视觉确认。
<!-- native-source:unity-game-3d-rigging:end -->


## 三维几何建模

<!-- native-source:unity-game-3d-modeling:start -->
<a id="mode-unity-game-3d-modeling"></a>

<a id="mode-unity-game-3d-modeling--unity-游戏-3d-模型制作"></a>
### Unity 游戏 3D 模型制作

把已批准的视觉方向转成可编辑、可追溯、可导入 Unity 的生产级 3D 模型。先读 [Blender MCP 生产级建模流程](../../unity-game-3d-modeling/references/mcp-modeling-workflow.md)。模型几何与 PBR 贴图生产均统一通过 Blender MCP；模型和贴图按[共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)衔接，贴图工序见[生产级 PBR 贴图流程](../../unity-game-3d-texturing/references/pbr-texture-workflow.md)。[@Unity](plugin://unity@openai-curated-remote) 负责导入器、Material/Renderer、资源级 Prefab 和运行验证，不承担模型或纹理创建。

<a id="mode-unity-game-3d-modeling--输入与边界"></a>
#### 输入与边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#冻结模型简报)。
- 缺少模型规格、可用 Blender MCP、明确的 `.blend` 源和输出范围、唯一 Unity 项目目标或修改授权时，可先输出带假设标记的只读规格建议，但受影响写入保持 `BLOCKED`。
- Blender MCP 是模型和贴图的既定生产路线，不再重复选择工具。模型 brief 和需要用户取舍的轮廓/交互边界交给 `$grilling`；已授权范围内的细化与返修继续执行，范围变化和破坏性操作按控制面处理。
- 本角色拥有几何、拓扑、法线、UV 版本冻结、材质槽结构、LOD、Collider 和静态模型导出；角色的骨架/蒙皮模型由绑定角色导出。`$app-3d-texturing` 在版本化派生 `.blend` 中拥有材质节点、绘制、烘焙、通道打包和贴图导出。Unity 仅负责导入器、Material/Renderer、资源级 Prefab 和运行验证；最终验证交给 `$app-quality-review`。
- 绑定与动画按[角色共同交接](../../unity-development-workflow/references/3d-character-handoff.md)交给 [`$app-character-rigging`](#mode-unity-game-3d-rigging) 和 [`$app-animation`](#mode-unity-game-3d-animation)。本角色准备关节拓扑、BlendShape 目标几何和静态源，绑定负责角色骨架/权重和蒙皮模型导出，动画负责动作与逐 Clip 导出；不负责 PBR 纹理、绑定动画或最终 QA 放行，VFX 另行分工。

<a id="mode-unity-game-3d-modeling--blender-mcp-与-unity-路由"></a>
#### Blender MCP 与 Unity 路由

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#检查-blender-工作区)。
2. 所有正式模型均在 Blender MCP 中完成结构、拓扑、法线、UV、LOD、碰撞代理和版本化导出；PBR 贴图也固定由 Blender MCP 按[生产级贴图流程](../../unity-game-3d-texturing/references/pbr-texture-workflow.md)制作。低模、模块化、风格化资产同样执行生产标准；禁止回退到 ProBuilder、Unity 基础体块拼装或外部生成式供应商创建模型或贴图。
3. 本地已有模型可作为只读输入，在 Blender MCP 内审计与修整；复用成品必须符合实际轮廓、结构、拓扑与许可要求。无法满足 Blender 所需能力时保持 `BLOCKED`，不得降级交付。
4. Blender MCP 属于本地 DCC MCP；工具名与参数以当前发现为准。仅暴露脚本执行时，逐项核实所需 Blender API 与实际结果，不能把“能运行 Python”视为全部建模能力就绪。
5. 按 `unity:unity-cli` 选择唯一 Editor、发现模型和贴图导入命令与参数。通过 AssetDatabase 或项目 Pipeline 导入 Blender 导出的模型及贴图；格式支持先验证，不能把图片导入命令当作模型导入器。
6. Blender 自检与 Unity 技术验证分别记录；视觉显示由用户人工检查截图并确认，不自动分析截图或据此宣称通过。未经用户明确要求，不启动 Standalone/Player 或真机验收。

<a id="mode-unity-game-3d-modeling--场景小循环"></a>
#### 场景小循环

1. 冻结模型 brief、Visual Bible 版本、资源 ID、主次形体、结构特征、观看距离与验收矩阵。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#完成模型结构)。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#核对表面与性能预算)。
5. 保存版本化 `.blend` 与可复现模型配方，记录工具版本、关键操作、参数、实际源文件位置及派生关系。在独立导出副本上处理修改器、三角化和轴向，回读导出结果。
6. 串行接入 Unity，检查实际导入器（适用时为 ModelImporter）、比例、轴向、Pivot、法线、材质槽、LODGroup、Collider、Prefab 引用和 Console；正式场景接入仍在 V5。
7. 按[共同交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)交付 UV、槽位、适用的高低模/Cage、法线/三角化策略和各 LOD 用图信息；贴图返修涉及网格、UV 或槽位时由建模角色修复并按依赖范围复验。输出转台、线框、UV、碰撞、LOD 与目标场景截图及人工检查要点；技术自检后交给纹理角色或独立 QA，不自批。用户确认显示效果前保持视觉待验收。

<a id="mode-unity-game-3d-modeling--生产质量底线"></a>
#### 生产质量底线

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#完成模型结构)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#核对表面与性能预算)。
- 几何、UV、预算、导出回读、Unity 导入证据以及用户显示确认分别列出；缺项、失败或只完成灰模时不标记正式资源就绪。

<a id="mode-unity-game-3d-modeling--安全与写入规则"></a>
#### 安全与写入规则

- 本流程不调用外部生成式模型供应商、不上传项目文件或付费生成；需要改变路线时先由用户明确变更范围。
- Blender MCP 若支持任意代码执行，沿用 DCC 脚本边界：执行前展示并取得用户确认，已有精确脚本授权可复用。脚本只允许 Blender API、数学与网格操作，以及批准路径内的 `.blend` 保存、模型导出和证据输出；禁止操作系统命令、网络、环境变量、凭据、任意文件读取和动态导入。
- 原始来源只读，修改写入版本化派生文件；同一 DCC 源、模型资源 ID、Unity 项目和导出目标同时只允许一个写代理。
- 覆盖、删除、重建 UV、改变顶点顺序或蒙皮信息前建立检查点并取得确认。

<a id="mode-unity-game-3d-modeling--交付"></a>
#### 交付

交付版本化 `.blend` 源文件、运行时模型、资源级 Prefab、模型配方、许可、拓扑与法线报告、实际 UV 位置与报告、按需的高低模/烘焙交接、导入设置、LOD/Collider 指标、Unity 技术证据和用户显示确认状态。以实际模型满足用户要求为验收依据，中途调整无需回改合同，不校验 SHA。模型必须使用与资产类型匹配的登记分支，禁止为通过契约伪填 TextureImporter/Sprite 等图片字段。
<!-- native-source:unity-game-3d-modeling:end -->


## 三维材质与贴图生产

<!-- native-source:unity-game-3d-texturing:start -->
<a id="mode-unity-game-3d-texturing"></a>

<a id="mode-unity-game-3d-texturing--unity-游戏-3d-纹理贴图"></a>
### Unity 游戏 3D 纹理贴图

把已批准的 Visual Bible 转为绑定实际模型/UV 来源的生产级 PBR 纹理集与 URP 材质。先按[建模与贴图交接](../../unity-game-3d-texturing/references/model-texture-handoff.md)接收模型，再读 [Blender MCP 生产级 PBR 流程](../../unity-game-3d-texturing/references/pbr-texture-workflow.md)。纹理制作、烘焙、绘制、通道处理与导出统一使用 Blender MCP；[@Unity](plugin://unity@openai-curated-remote) 负责 TextureImporter、Material、Renderer/Prefab 接入与运行验证。

<a id="mode-unity-game-3d-texturing--输入与职责"></a>
#### 输入与职责

- 要求 Visual Bible、模型交接中的 `.blend` 与运行时低模、实际模型/UV 来源、材质槽映射、法线/切线与三角化策略、按需高模/Cage、LOD 用图策略、观看距离、纹理预算、透明需求、目标 Shader、许可与唯一 Unity 项目目标。
- 建模角色拥有几何、拓扑、UV、法线、材质槽结构与导出网格；本角色只读校验。发现 UV、法线、材质槽或顶点顺序问题时退回 `$app-3d-modeling`，不静默修改；在纹理派生文件中仅制作材质、图像、节点与向既有槽位赋材质。
- 角色按[四角色共同交接](../../unity-development-workflow/references/3d-character-handoff.md)对接绑定和动画：绑定交付带骨架/蒙皮的角色模型，动画交付同骨架 Clips；本角色只读骨架、权重、形态通道和动作，在约定的参考姿态/网格上烘焙，不能把当前动画姿态误作烘焙基准。保留 UV、槽位与各 LOD 用图，变形中的表面问题区分几何、权重和贴图归属后退修。
- 负责烘焙、PBR 主通道、URP 打包、TextureImporter、Material、自检与交接；最终 QA 由独立角色执行。
- Blender MCP 是已确定的制作路线，不为工具选择重复请求确认。纹理 brief 和需要用户取舍的材质外观、透明方案交给 `$grilling`；已有授权内的制作与返修继续执行，需求变化、覆盖和破坏性操作按控制面处理。

<a id="mode-unity-game-3d-texturing--blender-mcp-与-unity-路由"></a>
#### Blender MCP 与 Unity 路由

1. 先检查可复用的 Blender 实例与 MCP 连接，核对版本、活动文件、对象、未保存状态、外链图像、写入所有权及输出根。只有确认没有可复用实例后才考虑启动，不重置用户场景。
2. Blender MCP 属于本地 DCC MCP；按实际工具 Schema 核实网格/UV 只读检查、材质节点、绘制、烘焙、图像数据、通道打包、保存与导出能力。脚本接口须逐项验证所需 Blender API，不能用“可执行 Python”替代能力证据。
3. 所有正式纹理在 Blender MCP 内制作、烘焙、修整并导出；程序节点与绘制可结合，已有合法贴图可作输入。禁止回退到 Unity 程序贴图生成、外部图像生成供应商或独立图像脚本作为生产路线；缺少必要能力保持 `BLOCKED`。
4. 按 `unity:unity-cli` 发现唯一 Unity 项目、实际导入/材质命令与参数，并确认 Editor 稳定；Unity 只消费已导出的纹理和通道，不替代 Blender 制作或烘焙。
5. 源纹理、Blender 预览与 Unity 材质分别验证；截图由用户人工检查，技术参数或成功执行命令不能代替显示验收。

<a id="mode-unity-game-3d-texturing--纹理小循环"></a>
#### 纹理小循环

1. 接收建模交付，按交接清单只读核对几何、UV、材质槽、高低模、法线/切线、蒙皮与 BlendShape；缺输入或结构不合格即退回建模，不能在贴图阶段重展 UV 或改变网格。
2. 冻结目标 Shader 的通道消费、纹理集/分辨率/位深、Texel Density、Padding、透明与内存预算，建立材质分区、表面尺度和参考标杆。
3. 在 Blender 的版本化纹理派生文件中建立可编辑节点、蒙版和图像，完成代表材质；按需在实际低模上进行高低模投射或程序材质烘焙，配置选择、活动目标、Cage/射线、采样与膨胀边。
4. 按目标通道集合制作 BaseColor、Tangent-space Normal、Metallic、Roughness、AO，以及按需的 Emission、Height、Opacity；Metallic 等数据与 Curvature、Thickness、ID 辅助图按实际验证的 Blender 方法提取，不能假定为内建烘焙类型。恒定通道可使用明确的 Shader 标量，不生成无用途的图像。
5. 处理投射遗漏、接缝、拉伸、细节尺度与透明边缘，保留独立主通道，在 Blender MCP 内由 Roughness 计算 Smoothness 并按目标 URP Shader 打包。保存节点、绘制图和所有依赖，不用预览截图或只存于内存的图像交付。
6. 回读实际导出文件，验证尺寸、通道、位深、颜色/数据语义、实际输出位置和打包数值；在 Unity 中配置 sRGB、NormalMap、MipMap、Streaming、压缩、平台覆盖与 Material 属性，回读实际映射与资源级 Prefab 引用。
7. 输出中性光、掠射光、目标场景、近远景和 LOD 切换证据及人工检查要点；分别记录技术结果、F2/F3 与用户显示确认，自检后交由视觉角色和 `$app-quality-review` 独立审查。正式场景接入在 V5，未经用户明确要求不启动 Standalone/Player 或真机。

<a id="mode-unity-game-3d-texturing--生产质量底线"></a>
#### 生产质量底线

- 材质分区、表面尺度、粗糙度/金属度关系与细节须符合 Visual Bible 和实际模型；不以整模统一赋色、无目标的噪声叠加或套一个程序材质冒充完成，简单/风格化表面也按设计判断，不强行添加磨损或复杂度。
- Blender 节点材质须落成运行时可消费的 UV 图像；不得假定 Unity 能直接读取 Blender Shader、程序节点或显示变换。BaseColor 不混入固定光照，除非视觉规格明确批准风格化例外。
- 不用贴图掩盖错误形体、UV 或法线；技术检查、Unity 接入和用户视觉确认分别记录，缺证据不宣称正式贴图就绪。

<a id="mode-unity-game-3d-texturing--安全与视觉约束"></a>
#### 安全与视觉约束

- 参考按已批准 Visual Bible 与许可使用；截图仅作参考或供用户人工验收，不自动分析截图或据此判定通过。
- 本流程不调用外部生成供应商、不上传项目文件、不付费生成；需要改变路线时由用户明确变更范围。
- Blender MCP 的任意代码执行沿用 DCC 边界：执行前展示并取得用户确认，已有精确脚本授权可复用。只允许 Blender API、数学、图像和只读网格操作，以及批准路径内的输入读取、派生 `.blend` 保存、烘焙和图像导出；禁止操作系统命令、网络、环境变量、凭据、任意文件读取和动态导入。
- 原始模型只读，纹理和 lookdev 写入版本化派生文件；同一模型/材质资源和 Unity 项目同时只允许一个写代理。

<a id="mode-unity-game-3d-texturing--交付"></a>
#### 交付

交付版本化纹理 `.blend`、可编辑节点/蒙版/绘制图与依赖、按需烘焙中间图、独立主通道、URP 打包图、Material、TextureImporter 记录、实际模型/UV 来源及槽位/LOD 映射、配方、许可、技术结果与用户视觉确认状态。验收以实际贴图及材质满足用户要求为准，中途调整无需回改合同，不校验 SHA。缺模型交接、Blender 能力、烘焙方法、Unity 环境或必要证据时逐项记录 `BLOCKED`，不得推断 `PASS`；模型调整后的返修按[交接与变更范围](../../unity-game-3d-texturing/references/model-texture-handoff.md)执行。
<!-- native-source:unity-game-3d-texturing:end -->


## Spine 生成式换皮

<!-- native-source:unity-game-spine-reskin:start -->
<a id="mode-unity-game-spine-reskin"></a>

<a id="mode-unity-game-spine-reskin--unity-spine-外观换皮"></a>
### Unity Spine 外观换皮

只替换外观。优先在同一 Spine `Skeleton` 中新增原生多 `Skin`，复用现有骨架、动画、Mesh 和权重；不得用重做角色结构的方式扩大范围。

<a id="mode-unity-game-spine-reskin--先判定是否仍是换皮"></a>
#### 先判定是否仍是换皮

只在以下结构全部冻结时继续，并在开始前保存源工程、导出物与 Unity 基线证据：

- Bone 名称、父子层级和 Setup Pose。
- Slot 名称、顺序和 Draw Order。
- Attachment 名称、类型和占用关系。
- Mesh 顶点、三角形、UV、权重和 Linked Mesh 关系。
- IK、Transform、Path 约束及其目标和顺序。
- 全部动画、事件和 Attachment Timeline。
- 碰撞、攻击点、受击点、挂点及玩法代码。

若新外观必须改变任一冻结项、轮廓无法在现有 Attachment/Mesh 边界内成立、连接区无法复用或现有网格发生明显变形错误，立即返回 `BLOCKED`，列出冲突对象和证据，移交更高范围的角色重制/骨骼动画任务。不得删减外观、静默改名、改权重、换 Attachment 类型或降低验收标准后冒充换皮。

<a id="mode-unity-game-spine-reskin--版本与源工程预检"></a>
#### 版本与源工程预检

1. 只读发现 `.spine` 源工程、原始纹理、导出 JSON/Binary、Atlas、Unity `SkeletonDataAsset`、AtlasAsset、材质和运行时代码入口。
2. 记录 Spine 源工程版本、实际导出所用 Spine Editor 版本、JSON/Binary 格式、`spine-unity`/Spine Runtime 包版本、Unity/URP 版本和当前导出设置。核对官方兼容矩阵或现有成功导出基线；版本不匹配时保持 `BLOCKED`，不得猜测兼容或擅自升级源工程。
3. 没有可写、可由正确 Spine Editor 打开的源工程时立即 `BLOCKED`。禁止直接篡改导出 JSON、Binary 或 Atlas 来伪造 Skin，也禁止以 Unity 运行时拼接替代正式源工程 Skin。
4. 核对现有 Skin、Slot、Attachment、网格、约束、动画、碰撞/挂点和 Unity 引用清单，记录实际资源位置与状态，不要求或校验 SHA。开始前确认目标输出目录和单写者，禁止覆盖唯一有效源或当前稳定导出；验收以实际完成情况满足用户要求为准，中途调整无需回改合同。

<a id="mode-unity-game-spine-reskin--嵌入-v0-v5-执行"></a>
#### 嵌入 V0-V5 执行

V0-V5 是场景与资源生产阶段；A0-A6 只表示动作风险。F2 记录独立 Spine/视觉审查，F3 记录 Unity 编译、导入、PlayMode 与资源证据；只有真实视觉取舍使用 `USER_DECISION`。

<a id="mode-unity-game-spine-reskin--v0-引用-visual-bible"></a>
##### V0 引用 Visual Bible

引用仍有效且覆盖该角色的 Visual Bible。若缺失、失效或范围不足，返回 `$app-creator-workflow` 建立或选择全局视觉基线；已有有效规范时不强制重新生成候选。

<a id="mode-unity-game-spine-reskin--v1-功能验证"></a>
##### V1 功能验证

先使用现有角色和临时资源验证切换、动画与交互功能；白盒按需使用，不是进入 V2 的前提。

<a id="mode-unity-game-spine-reskin--v2-换皮草图与结构映射"></a>
##### V2 换皮草图与结构映射

1. 产出实际可查看的完整换皮草图/灰盒，以及站立、移动、攻击等足以暴露连接和遮挡问题的关键姿势。
2. 画出每个部件的完整边界、被遮挡补全、连接区、前后遮挡、Clipping 边界和极端弯曲余量；不得只提交正面静态半身图。
3. 提交逐项 `skinId → slotName → attachmentName` 映射，标明 Attachment 类型、现有 Mesh/Linked Mesh、原点/Pivot、画布、用途、朝向、状态和预期 Atlas Region。
4. 完成独立视觉/Spine 审查；存在实质取舍时请求用户确认当前草图、关键姿势和映射版本。生产边界未冻结时不得进入 V3。

<a id="mode-unity-game-spine-reskin--v3-高保真与生产边界"></a>
##### V3 高保真与生产边界

1. 只依据有效视觉基线与 V2，生成完整高保真角色和代表性关键姿势；不得暗改 Slot、Attachment、轮廓边界或遮挡设计。
2. F2 由非作者执行视觉一致性、Spine 可实现性和 UX/可读性审核；检查全部姿势、连接区、轮廓、层叠、Clipping、颜色识别和动画可读性。
3. 将高保真、资产拆解、映射和生产规格冻结为同一 V3 边界；存在视觉取舍时绑定用户决定。任一边界或映射变化均生成新版本并重验受影响范围。

<a id="mode-unity-game-spine-reskin--v3-编号资产地图"></a>
##### V3 编号资产地图

向用户只展示在冻结高保真原图上框选并附图内中文标注的资产地图，不输出文本拆解段落、表格或清单。图中稳定编号对应内部资产映射，标明部件用途、连接区、层叠关系和生产边界；密集部件另附同编号的局部放大标注图。遵守[图片框选与标注交付](../../unity-development-workflow/references/visual-workflow.md#图片框选与标注交付)，以下映射与规格仅作为内部生产和校验记录。

1. 只分析已冻结的高保真原图，完整编号所有可见部件和明确无需生产项；漏标、重号或无映射项均阻塞。
2. 每项固定记录 `skinId → slotName → attachmentName → sourceImage → atlasRegion`，并记录相同画布、Pivot/原点、连接区、完整遮挡补全、用途、朝向、像素尺寸、Alpha、PMA 策略和验收姿势。
3. 资产地图生产边界冻结后，才按编号逐项独立生成或重绘。禁止裁切、抠取、放大或轻微修饰高保真效果图充当源图；禁止整张角色效果图进入 Atlas。
4. 对每项核对现有 Attachment 类型、Mesh 顶点/UV/权重和 Linked Mesh。明显轮廓变化、画布/Pivot 不一致、连接区不兼容或网格无法承载时立即 `BLOCKED`，不得修改 Mesh、UV 或权重解决。
5. 每张源图分别验证透明边缘、完整轮廓、连接区、方向、尺寸、采样、色彩和在关键姿势中的变形，再允许进入 V4。

<a id="mode-unity-game-spine-reskin--v4-分批生产记录"></a>
##### V4 分批生产记录

只有完整 V3 资产地图与生产边界冻结后才可拆批。分批只是执行调度，不能替代 V0-V3 任何门禁；所有资产仍必须先完成全量编号、分类、映射和地图确认。

1. 在项目内建立机器可读 JSON 台账：`Artifacts/Spine/<characterId>/batch-ledger.json`。路径必须是项目根内的 POSIX 相对路径，不得使用绝对路径、项目外路径、符号链接段或临时聊天附件；台账和证据写入由一个单写者维护。
2. 台账根对象至少记录 `ledgerVersion`、`projectId`、`characterId`、`sourceRevision`、`assetMapVersion`、`visualBibleVersion`、实际交付的完整 `assetIds`、`batches`、追加式 `events` 和 `overallStatus`。核对实际资源覆盖已确认角色要求，不要求回改 V3 地图或计算摘要。
3. 每个批次至少记录：`taskId`、`skinId`、`batchId`、从 1 开始且不重复的 `ordinal`、唯一 `assetIds`、`dependsOnBatchIds`、`inputVersion` 与实际输入位置、`outputVersion` 与实际输出位置、`owner`、`singleWriter`、`status`、创建/开工/更新时间、验证/审核/用户决定证据、失败与阻塞原因、`recoveryPoint`、`unityVersion`、`spineEditorVersion`、`spineRuntimeVersion`、`exportFormat`、`supersedes` 和 `supersededBy`。
4. 每个 V3 `assetId` 必须在且只能在一个当前有效批次中出现；建批时校验集合与 V3 地图完全相等，禁止遗漏、重复、空批次或依赖循环。失败批次仍保留原资产归属，修订时建立新 `batchId` 并记录 supersedes 关系。
5. 状态只能按 `PLANNED → READY → IN_PROGRESS → PRODUCED → REVIEWED → INTEGRATED → VALIDATED` 推进；异常进入 `FAILED` 或 `BLOCKED`，不得写 `PASS` 或伪造完成。建批、开工、每次产物生成、审核、Unity 集成和验证完成后立即向 `events` 追加事件，事件记录时间、执行者、状态、实际输入/输出位置和证据路径；禁止覆盖旧事件、旧证据或用聊天记录补写历史。
6. 恢复批次前读取实际输入/输出、依赖批次状态、Spine/Unity 导出版本和单写者，判断是否满足已确认要求；实际资源错误或依赖未完成时修复对应批次，不因合同、版本或文件内容变化自动作废批次，不校验 SHA，不得凭对话记忆续做。
7. 全部批次达到 `VALIDATED`、整批映射无遗漏且 V5 集成完成后，仍必须做一次整角色全量回归：完整 `assetId → skinId → slotName → attachmentName → atlasRegion` 映射、Atlas/材质/PMA/Draw Call/纹理内存、全部动画与 Attachment Timeline、默认/新 Skin、多实例隔离、极端姿势、Clipping 和遮挡。只有全量回归实际 `PASS`，才可写整体 `COMPLETE`；任何失败或阻塞都保留台账并回到对应批次。

<a id="mode-unity-game-spine-reskin--v5-spine-源工程与-unity-接入"></a>
##### V5 Spine 源工程与 Unity 接入

1. 在原 Spine 源工程新增原生 Skin，复用冻结的 Skeleton、Slot、Attachment 名称/类型、Mesh、权重、约束、动画和 Attachment Timeline；只替换各 Skin 的区域/图片绑定。
2. 使用已确认兼容的 Spine Editor 与既有导出配置重新打包 Atlas 并导出 JSON/Binary。输出到新版本路径，核对导出前后冻结清单；任何结构差异均失败。
3. 保持 Atlas Region 与 V3 映射一致。明确使用 PMA 或 Straight Alpha，纹理导入、Atlas 设置和材质 Shader 必须同一策略，禁止混用导致黑边/白边。URP 使用当前 `spine-unity` 支持的 Spine/Skeleton Shader 与正确材质关键字，不擅自换成不兼容通用 Shader。
4. 记录 Atlas 页数、材质/混合模式、Clipping、Draw Call、纹理尺寸、格式、MipMap 和估算/实测纹理内存；新 Skin 不得以无预算的额外 Atlas 页或材质放大批次数。只有用户明确需要独立下载、卸载或内容分包时才引入 Addressables，并验证 `SkeletonDataAsset`、AtlasAsset、材质和纹理引用原子加载。
5. 在 Unity 中以当前实例切换 Skin：先确认目标 Skin 存在；保持原 `AnimationState` 与当前 Track，不重建或清空动画状态；对该实例的 `Skeleton` 设置 Skin，恢复 Slot setup pose，再重新应用当前 AnimationState。目标 Skin 缺失时回退默认 Skin并报告，不写入共享 `SkeletonData`，不让一个实例的切换污染其他实例。
6. 重新导入后核对 `SkeletonDataAsset`、AtlasAsset、材质、纹理、GUID/地址、Prefab/Scene 引用和 Console；不得用 `unity command` 返回成功代替真实验证。

<a id="mode-unity-game-spine-reskin--unity-验证矩阵"></a>
#### Unity 验证矩阵

至少覆盖以下当前版本组合：

- 站立、移动、攻击、受击、死亡和项目实际使用的其他关键动画。
- 极端弯曲、拉伸、翻转、缩放及镜像条件。
- Attachment Timeline 切换、事件前后和动画混合/中断。
- 前后遮挡、Draw Order、Clipping、透明边缘、混合模式和颜色染色。
- 默认 Skin、新 Skin、缺失 Skin 回退和同一画面多实例使用不同 Skin。
- Prefab/Scene 重载、对象池复用、禁用/启用和存档恢复等实际生命周期。
- Atlas/材质/PMA/URP 显示、Draw Call、纹理内存和适用平台的 Editor 模拟。

先运行 EditMode/PlayMode、Editor/Game View 和项目既有自动测试。不得自动启动 Standalone、Player 或真机；设备验收只能在独立发布 Work Item 中由用户明确要求后执行。

<a id="mode-unity-game-spine-reskin--证据失效与交接"></a>
#### 证据、失效与交接

- Visual Bible 变化使受影响 V2-V5 失效；V2 变化使受影响 V3-V5 失效；V3 映射或源图变化使受影响生产项与 V4/V5 失效。
- Spine 源结构、导出设置、Editor/Runtime 版本、Atlas、材质、GUID/地址或运行时切换逻辑变化，使对应导出与 Unity 验证失效；结构冻结项变化则退出本 Skill 并 `BLOCKED`。
- 保存冻结清单、草图/高保真/资产地图确认、逐项源图、Spine 源修订、导出日志、差异报告、Unity 引用、测试、截图、性能和失败证据。旧批准只作历史记录。
- 完成时向总控报告变更文件、固定项差异为零的证据、验证矩阵结果、Atlas/性能影响、未运行项和剩余风险；不得把缺少 Spine Editor、源工程、许可证、Unity 环境或设备写成通过。
<!-- native-source:unity-game-spine-reskin:end -->


## 项目整理与产物清理

<!-- native-source:unity-artifact-cleanup:start -->
<a id="mode-unity-artifact-cleanup"></a>

<a id="mode-unity-artifact-cleanup--unity-整理清理原生适配"></a>
### Unity 整理清理原生适配

> 本规范为 app-creator-skills 仓库新增，Unity 源仓库没有该整理清理技能；由唯一公共入口 [`app-artifact-cleanup`](../../app-artifact-cleanup/SKILL.md) 按需调用。

先遵循[公共执行协议](../../app-creator-workflow/references/professional-execution.md)，再应用[项目整理与产物清理规范](../../app-artifact-cleanup/references/project-cleanup.md)。公共规则负责分类、引用盘点和清单；此适配规定 Unity 资源身份与 Editor 边界。

<a id="mode-unity-artifact-cleanup--unity-资产与生成目录"></a>
#### Unity 资产与生成目录

- 使用 Unity Editor/AssetDatabase 的受支持移动、重命名、导入或删除操作维护项目资源索引。根据项目版本确认 API；不要用文件系统移动正式资产后让仓库遗留过期索引。
- `.meta` 中的 GUID 以及资源内部 `fileID` 关联 Prefab、场景、材质、动画、脚本和 Addressables 引用。移动/重命名需保持资源及 `.meta` 的身份关系；删除资源时对照 Editor 引用、Addressables/AssetBundle构建规则和动态加载路径。不得单独删除 `.meta`、手改 GUID 或假设文本搜索能覆盖序列化引用。
- 将 `Library/`、`Temp/` 等目录仅作为待证明可再生成候选；先确认目标 Unity 版本、Package Manager锁定依赖和导入输入可用。它们不是默认的工作区清理目标。
- `Assets/` 内正式资源、`.meta`、`Packages/manifest.json`、锁文件、构建/发布包、用户交付物与工作流证据均按公共清单逐项处理，不因当前场景未使用或未提交而整体删除。

清理完成后在项目目标 Unity 版本中刷新/导入涉及资源，检查 GUID/fileID 和 Addressables/场景引用解析，再执行受影响的最小 Editor 测试或候选构建。没有可复用 Editor 或目标版本时报告未执行项，不用删缓存替代导入验证。
<!-- native-source:unity-artifact-cleanup:end -->


## 视觉素材生产

<!-- native-source:unity-game-visual-assets:start -->
<a id="mode-unity-game-visual-assets"></a>

<a id="mode-unity-game-visual-assets--unity-视觉与资源接入"></a>
### Unity 视觉与资源接入

本角色消费 `$app-workflow-control` 的 Work Item 和 `$app-creator-workflow` 的场景计划。视觉生产使用 V0-V5；A0-A6 只表示动作风险，F2 记录领域质量，F3 记录 Unity 工程验证。

<a id="mode-unity-game-visual-assets--输入与边界"></a>
#### 输入与边界

读取 Visual Bible、场景契约、结构草图、资源登记、性能预算和当前 V 阶段。只有存在实质视觉取舍、授权、外部生成成本或替代策略时，才把精确问题交给 `$grilling`；已有有效决定不重复询问。

公共字体、贴图、材质、图标、九宫格和 Prefab 遵守[公共资源登记与使用](../../unity-development-workflow/references/shared-asset-usage.md)：V3 先查库，合格资源按真实身份复用；V4 提交独立生产/导入事实，由指定单写者同步总表，交付各场景的消费绑定，不重复生产或私改共享源。

生产级 3D 模型与 PBR 贴图分别交给 `$app-3d-modeling` 和 `$app-3d-texturing`；3D 绑定与动作分别交给 [`$app-character-rigging`](#mode-unity-game-3d-rigging)、[`$app-animation`](#mode-unity-game-3d-animation)，四者固定通过 Blender MCP 源生产，按[3D 生产流程](../../unity-development-workflow/references/3d-asset-workflow.md)和角色交接接入。本角色不把这些产物转为图片生成任务，也不从效果图裁切贴图。现有 Spine 角色仅换皮且 Bone、Slot、Attachment、Mesh、约束与动画固定时交给 `$app-spine-reskin`。美术 brief 和 V5 体验验收遵循[美术质量合同](../../unity-development-workflow/references/art-quality-contract.md)：主题、受众、玩法可读、观看舒适、美术完成度逐项通过。动画与反馈事件交给 [`$app-feedback`](#mode-unity-game-juice) 协调；具体资产生产者按[动画意图合同](../../unity-development-workflow/references/animation-intent-contract.md)明确。

Unity 原生 2D 骨骼角色交给 [`$app-character-rigging`](#mode-unity-game-2d-rigging)；本角色消费其已确认的视角与拆件合同，独立生产部件、遮挡补全和连接区，不直接裁切完整效果图充当 Sprite。交付稳定部件 ID、视角/方向、画布与 Pivot、角色局部位置、层叠、源图位置、导入规格和资源身份；骨架、网格、权重与动画由骨骼角色负责，图片生成或编辑委派给图片子代理。

骨骼部件按[制作与交接合同](../../unity-game-2d-rigging/references/production-contract.md)保证运动范围内的无缝组合：依据实际动作幅度留足关节覆盖与遮挡补全，统一连接区的轮廓、线条、颜色和纹理衔接，核对 Pivot、PPU、局部空间和透明边缘。图片任务包须包含相邻部件的连接关系、覆盖范围与检查姿势，不能仅要求每张部件图单独好看。缺图、边缘或连接区缺陷由本角色返修；权重、排序或动作造成的问题交骨骼角色，总控裁决跨界问题。独立源素材检查与实际 Unity 组合的人工视觉验收分别记录，不以导入成功证明无缝。

动作设计或制作中需要新角度、手势、表情、特殊变形或必要过渡图时，消费骨骼角色的补图需求，按同一制作合同生产部件变体。任务包须携带已确认的角色基线、基础部件与变体身份、目标角度/姿态、相邻连接区、消费动作及切换要求；生成编辑仍交 `image_generator`，维持角色造型、比例、配色与材质一致。交付独立图片与资源映射供骨骼角色接入，不以整段生成式动画替代骨骼驱动。已确认边界内的补图返修直接制作并展示；新增视角、方向或越过已确认拆件边界时，由总控先更新并取得受影响拆件内容的确认。

按[2D 动画岗位协作](../../unity-development-workflow/references/2d-animation-collaboration.md)消费动画质量负责人的风格与动作标杆，以及 TA 的数据／导入约束；向骨骼角色交付部件与变体映射，向 TA 提供对账和诊断所需的来源与导入事实。图像缺陷由本角色返修，公共导入工具缺陷交 TA；双方不直接修改骨架或动画资产。

具体 Unity 操作使用插件专项：UI 先交给 `unity:ui` 路由；Sprite、Atlas、Tilemap、像素渲染分别使用 `unity:sprite-editor`、`unity:manage-sprite-atlas`、适用的 `unity:tilemap-*` 与 `unity:2d-pixel-perfect`；本地化/TMP、URP 后处理和 Shader Graph 分别使用对应 `unity:*` Skill。本角色只维护视觉基线、拆解、来源/装配决策、资源身份和验收证据。

<a id="mode-unity-game-visual-assets--v0-v5"></a>
#### V0-V5

1. **V0 分流**：识别全局基线、场景、显示层、参考图使用边界和实际交付类型。场景只包含自身画面与常驻 HUD；modal、popup、drawer、toast 建立独立 `DISPLAY_LAYER` Work Item。新建且包含可见画面的场景或显示层必须安排效果图任务；已有有效视觉规范时用它指导效果图，需要方向探索时生成由任务决定数量的实质不同候选，并让用户选择。
1. **V1 功能验证**：先使用临时资源实现并验证玩法、交互和跨场景状态；白盒可选，不要求先冻结视觉目标。

2. **V2 对象定义**：为新建且包含可见画面的 `SCENE`/`DISPLAY_LAYER` 提交至少一张可查看的完整效果图，覆盖目标状态与主要视觉元素，确认后作为 V3–V5 的持续视觉目标；独立生产不等于重新设计，后续生成图不得静默替代 V2，具体见[持续目标规则](../../unity-development-workflow/references/visual-workflow.md#v2-场景定义)。同时冻结主题、受众、核心循环、体验目标和观看情境，并与 `$app-feedback` 定义关键反馈意图。按需提交草图或灰盒，并记录 Scene/Prefab/UXML 结构，覆盖稳定节点 ID、位置依赖、语义分组、父子层级、渲染顺序、状态、Anchor、Pivot、安全区、遮罩、资源槽和 Unity 原生响应式合同。效果图不注册为正式资源。
3. **V3 拆解确认**：先按[文本与色彩拆分路线](../../unity-development-workflow/references/visual-decomposition-routes.md)覆盖 V2 的实际可见特征及空间结构，逐项绑定稳定编号、生产归属、消费节点和组件×状态，不能仅列功能名称；系统文本、原生绘制及原子资源内含特征同样登记。按位置依赖确定父子关系；共同表达同一信息但无位置依赖的元素归入同一语义组并保持同级，禁止按距离、最小包含矩形或元素类型猜父级。再分别记录 `visualRouteAnalysis` 与 `assemblyAnalysis`：前者决定独立图片、复用、Unity 原生绘制、模型、材质或 VFX 来源，后者决定 Scene/Prefab/UXML/UIDocument/Canvas/Transform 装配。适用的九宫格资源冻结源图尺寸、Unity border 与内容内边距；动作资产冻结独立时间轴、关键事件、资源生产者与消费接口。单一区域不得用 `COMPOSITE` 混合外观和行为，也不得用整屏图冒充结构化装配。需要用户取舍时绑定精确版本确认；确认前不生产或导入正式资源。
4. **V4 资源生产与验收**：按编号独立生产、创作或复用正式资源，在 Unity 中验证 TextureImporter、SpriteAtlas、字体、材质、模型、VFX、GUID 和 Addressables，并检查资源在宿主场景中的组合预览。九宫格导入后回读实际 Border 并检查组件呈现；V4 可生产并验证资产自身的资源级 Prefab，不负责正式宿主 Scene/场景装配 Prefab/UI 实现或布局校准。资源与 `.meta` 同属一个所有权单元。
5. **V5 正式接入与校准**：由单写者按冻结结构实现并拼装 Scene、Prefab 或 UXML/USS，校准正式组合，删除灰盒、占位 Mesh/Sprite/Material、临时对象和残留引用；在编译/域重载稳定后提交 Game View、EditMode/PlayMode、交互、布局、Console 与性能证据。动态美术体验按[美术质量合同](../../unity-development-workflow/references/art-quality-contract.md)覆盖适用情境，截图和真实片段由用户人工检查确认。

<a id="mode-unity-game-visual-assets--生产规则"></a>
#### 生产规则

- 当前阶段内先内部完成分析、技术记录、布局决策和提示词，直接交付真实候选供用户检查，不等待常规文字方案确认；动画正式素材遵循[动画意图合同](../../unity-development-workflow/references/animation-intent-contract.md)，先说明设计理念与动作方案并取得用户明确确认再制作。同目标返修直接展示前后对照。V3、V4 等实际阶段确认与父图/视频专项确认仍保留，详见[图片优先的确认方式](../../unity-domain-contracts/references/simplified-workflow.md#图片优先的确认方式)。
- 生成全局方向图、场景效果图或宿主上下文图前，按[游戏内文案](../../unity-development-workflow/references/game-copy.md)列明允许的可见文字、图标和示例数值，内部规格不得绘入画面；候选共用同一内容。冻结后按目标拆解，不从策划说明追加文字，也不擅自删改冻结文字；动态/本地化文本由真实数据与文本节点呈现。
- 静态资源以画廊或可放大的 V2 相关区域/输出对照直接交付，透明资源并排给深浅底预览；V4/V5 按[组合对照交付](../../unity-development-workflow/references/visual-workflow.md#v4-正式资源生产与导入验收)提供 V2 与当前实际 Unity 组合并列对照及已知未还原项。完整来源与工程结果内部保存，预览成功不代表用户已验收显示效果。
- V3 用户侧拆解说明只展示图片框选和图内中文标注，不输出文本段落、表格或清单。在冻结的 V2 效果图上逐项框选并绑定稳定编号，用引线说明用途、来源、关系、装配和生产边界；结构化合同内部保存。遵守[图片框选与标注交付](../../unity-development-workflow/references/visual-workflow.md#图片框选与标注交付)。
- 参考图和高保真图用于保留目标内容、构图、轮廓、配色、材质、光影及视觉层级；禁止裁切、抠取、放大或轻微修饰后充当 Sprite/纹理，也禁止整图铺底冒充结构化实现。该限制只约束资产取得方式，不要求放弃目标特征。
- 图片生成或编辑委派给图片子代理；V2 确认后的部件生产、编辑与返修，任务包必须包含可读取的原始 V2 目标图、稳定编号、相关部件区域说明、所含特征及状态。按实际部件明确构图、主要轮廓与比例、关键颜色、材质、层次、透明/不透明区域和文本留白；还原任务不能只写“风格参考”并放弃构图或外形约束，不得无依据改色、删去装饰或把目标特征写进禁止项。返修仍携带 V2，旧生成图仅作辅助，注明其中须保留与纠正的内容；完整实际提示词随生产记录保存。首次 V2 效果图生成沿用上方方向图与文案规则。
- 生成后及透明处理、尺寸归一化后，核对独立源素材的主体、轮廓、颜色、完整性、有效内容边界及透明/不透明区域是否满足任务；已有确认 V2 的部件生产与返修还须对照该图，并记录证据与缺陷。文件存在、尺寸正确、有 Alpha、成功导入只证明工程事实，不能据此宣告资源合格；例如目标不透明内板被生成为透明开口，即使 PNG 技术检查通过也属于生产失败。缺陷交回相应生产环节修复，不能靠缩放、移动节点或提高容差掩盖。此检查遵守[源素材与运行截图边界](../../unity-development-workflow/references/art-quality-contract.md#追溯与检查边界)，不代替人工阶段验收。
- 生成式透明位图如果先产出不透明单一纯色背景 PNG，使用 `scripts/remove-background-local.mjs` 从画布边缘执行纯色去背景；显式记录背景色、容差、源/输出位置、删除像素和深浅底预览，只有 `PASS` 输出才能进入 Unity 导入。工具自行生成的 SHA 不参与验收。该脚本不得用于参考图抠取，也不适合复杂背景、毛发、玻璃、发光或半透明边缘。
- 文字与填充先按[视觉显著性](../../unity-development-workflow/references/visual-decomposition-routes.md#完整拆解与视觉显著性)判断：低显著性文字优先系统文本，简单填充/规则边框优先原生绘制；明显字形、材质、纹理和光影保留独立资产，有风格的重复表面优先复用贴图。拆开来源仍由原组件统一管理交互、布局、本地化和动态状态，不静默简化已确认效果。
- 静态特色外观优先交付独立图片、模型、材质或 VFX；程序化路线只用于文本、动态数据、布局、基础几何、进度、粒子/Shader 等具有资格证据的内容，实际 renderer 必须保留 V2 要求的外观与状态。`REUSE` 记录实际源路径、Unity GUID、许可、Importer、消费节点和相关验证证据，除身份外还须按[路线判定](../../unity-development-workflow/references/visual-decomposition-routes.md)核对实际轮廓、比例和材质，主题或风格相似不足以证明合格。目标内实现调整无需回改合同，不校验 SHA。
- UI/2D 位图默认以目标最大显示尺寸的 `sourceScale=1` 规划源像素密度，像素美术或已批准平台预算可明确覆盖。它不是浏览器 DPR；运行时缩放必须读取 CanvasScaler、PanelSettings、Camera、Screen、动态分辨率和 Importer 的真实配置。SpriteAtlas、压缩、MipMap、Read/Write、色彩空间和 Addressables 仍由 Unity 平台预算决定。
- 程序化文本默认覆盖 `zh-CN`，英语 `en` 等其他语言按项目选择覆盖，逐语言声明 `single-line` 或 `wrap`，验证 TMP/UI Toolkit 字体回退、真实字形宽度、基线和容器；禁止截断。
- 独立 DISPLAY_LAYER 在宿主上下文中验证打开、交互、关闭和焦点/输入/底层状态恢复；其失败或延期不回写为宿主场景未完成。
- 研发阶段只做 Editor/Game View/PlayMode 视觉验证。未经用户明确要求，不启动 Standalone/Player 或真机。

向玩法交付当前资源 ID、GUID/地址、路径、规格、导入约定和限制；向 QA 交付逐项检查、清理、Editor 画面和预算证据；向发布交付来源、许可与生成记录。复杂透明边缘缺少独立遮罩或干净背景时必须补绘或重新生成，不伪造透明结果。

<a id="mode-unity-game-visual-assets--ui-相对布局约束"></a>
#### UI 相对布局约束

UI 布局与位置统一遵循[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。本栈父级、锚点、坐标换算及原生组件按技术约束实现；浮层本体与内部 UI 的边界按公共规范验收。
<!-- native-source:unity-game-visual-assets:end -->
