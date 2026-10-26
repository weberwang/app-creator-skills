# cocos 原生技术合同

本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。

## 能力索引

- **产品与游戏需求**
  - [Cocos Creator 3.x 制作策划](#mode-cocos-game-production)
- **技术架构与模块设计**
  - [Cocos Creator 3.x 技术架构](#mode-cocos-game-architecture)
- **游戏玩法实现**
  - [Cocos Creator 3.x 玩法开发](#mode-cocos-gameplay-development)
- **游戏音频**
  - [Cocos Creator 3.x 音频设计](#mode-cocos-game-audio)
- **游戏数值与经济**
  - [Cocos Creator 3.x 数值设计](#mode-cocos-game-balance)
- **游戏与应用汁水设计**
  - [Cocos Creator 3.x 游戏汁水感](#mode-cocos-game-juice)
- **候选交付与发布准备**
  - [Cocos Creator 3.x 发布与合规](#mode-cocos-game-release)
- **质量审核与性能验证**
  - [Cocos Creator 3.x 测试与性能](#mode-cocos-game-qa-performance)
- **动画制作与接入**
  - [Cocos Creator 3.x 通用帧动画制作](#mode-cocos-frame-animation)
- **三维几何建模**
  - [Cocos 游戏 3D 建模](#mode-cocos-game-3d-modeling)
- **Spine 生成式换皮**
  - [Cocos Creator 3.x Spine 生成式换皮](#mode-cocos-spine-generative-reskin)
- **界面布局与自适应**
  - [Cocos Creator 3.x 游戏 UI 布局](#mode-cocos-game-ui-layout)
- **项目整理与产物清理**
  - [Cocos Creator 3.x 记录与中间产物清理](#mode-cocos-game-artifact-cleanup)
- **图片优化**
  - [Cocos Creator 3.x 图片资源优化](#mode-cocos-game-image-optimization)
- **游戏广告接入**
  - [Cocos Creator 3.x AppLovin MAX 广告接入](#mode-cocos-game-ad-integration)
- **视觉素材生产**
  - [Cocos Creator 3.x 游戏美术生产与接入](#mode-cocos-game-asset-integration)

## 产品与游戏需求

<!-- native-source:cocos-game-production:start -->
<a id="mode-cocos-game-production"></a>

<a id="mode-cocos-game-production--cocos-creator-3x-制作策划"></a>
### Cocos Creator 3.x 制作策划

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-cocos-game-production--最短流程"></a>
#### 最短流程

[公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
2. 把当前任务范围拆成玩法/支持场景、玩家行为、状态迁移、依赖、正式资源边界、异常恢复和可观察验收结果；资源目录与 `resources.load/loadDir` 动态加载边界遵循[项目目录规范](../../cocos-game-architecture/references/project-structure.md#资源与引用)，无法从静态证据判断的行为明确标为待定义。
   确定功能和拆分场景时，按[功能与场景阶段的共享规划](../../cocos-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)在现有 GDD/场景资源规划中总结共用资源或局部部件，记录消费场景/显示层、状态、尺寸、共同视觉要求、需保留的差异与理由。已明确同一部件时可提前规划共享；仅功能相同、视觉相似或外观未定时保持候选，交给后续视觉拆解与正式产物复核。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-cocos-game-production--领域边界"></a>
#### 领域边界

- 涉及正式 3D 模型时，按[建模工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)在既有 GDD/场景资源规划中交接模型用途、机位与观看距离、参考尺寸、交互体积、视觉基线、面数/材质/LOD 预算和验收条件；交给建模领域形成可执行规格，不能把灰盒或材质效果当作正式模型完成。贴图、绑定和动画只有明确属于任务范围时才另行安排。
- [公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。
- 全局静态基线、场景方向和高保真证据由控制面统一校验；本领域只提供体验意图、功能事实和范围，不用文字或根摘要替代机器证据。

<a id="mode-cocos-game-production--交接与收敛"></a>
#### 交接与收敛

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-cocos-game-production--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../cocos-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../cocos-domain-contracts/references/state-gates.md)
- [实际完成情况](../../cocos-domain-contracts/references/control-model.md#按实际完成情况验收)
- [游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#工作流接入)
- [汁水感设计指南](../../cocos-game-juice/references/design-guide.md)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
<!-- native-source:cocos-game-production:end -->


## 技术架构与模块设计

<!-- native-source:cocos-game-architecture:start -->
<a id="mode-cocos-game-architecture"></a>

<a id="mode-cocos-game-architecture--cocos-creator-3x-技术架构"></a>
### Cocos Creator 3.x 技术架构

<a id="mode-cocos-game-architecture--全局控制接入"></a>
#### 全局控制接入

本领域在当前 Work Item、Implementation Package、A 等级和允许路径内提议、审查或修改；结果回到 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 审计和状态迁移。遵循 V0-V4、A0-A6、F0-F4 与 Work Item 的当前控制模型。任务内方案和路径变化同步更新计划并重验受影响部分；只有实质架构取舍才停止并进入 grilling。涉及外部写入、付费、真机、破坏性操作或发布的 A4-A6 行为仍须逐项审批。

<a id="mode-cocos-game-architecture--工程边界"></a>
#### 工程边界

- 以目标项目实际安装的 Cocos Creator 3.x 版本为准，先读取项目 `package.json`、Creator 编辑器版本、`settings/` 和 `profiles/`。目录约定见[游戏项目目录规范](../../cocos-game-architecture/references/project-structure.md)；其中规定普通 UUID 引用资源与 `resources.load/loadDir` 动态资源的存放边界，按 Creator 项目实际结构确定工程入口和依赖。
- Creator 项目运行时资产通常位于 `assets/`：场景、预制体、脚本、纹理、音频和数据配置由项目约定分层。Creator 导入的资源由 AssetDB 管理，并通过 `.meta` 中的 UUID 建立稳定引用；引用前核验导入结果和所需子资源。不要手工伪造 UUID 或只凭文件路径存在判断资源已就绪。
- 运行时结构由 `Scene`、`Node`、`Component`、`Prefab` 和资源引用组成。职责放在组件和模块中，场景保留清晰节点树；复用时使用预制体或共享服务。
- [公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)Scene 之间通过已声明的服务或数据契约协作，不直接依赖其他 Scene 的私有节点和状态。
- 实际采用的第三方 SDK 初始化统一遵循[SDK 统一初始化](../../cocos-game-architecture/references/sdk-initialization.md)：唯一应用装配入口调用 `assets/scripts/platform/initialize-sdks.ts` 独立投递任务；启动场景/最小 Boot 组件只做应用装配，不承载场景玩法初始化，也不等待 SDK 完成。Creator 引擎和 AssetDB 保持自身生命周期，不放进第三方 SDK 初始化模块。
- 资源候选、确认成果、Creator 正式资源、审阅证据和机器记录按[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)归档。新建或调整发布构建、准备发布候选时按[生产构建与发布检查](../../cocos-game-architecture/references/production-build.md)核对 Creator 版本对应的有效配置与最终包。
- 用 Creator 编辑器、AssetDB、构建配置和目标平台验证工程行为。Web、小游戏和原生平台的能力分别按项目实际构建目标核对。

<a id="mode-cocos-game-architecture--场景资源与编辑器写入边界"></a>
#### 场景、资源与编辑器写入边界

- Scene、Node、Component、Prefab、AssetDB 和构建相关操作必须遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，按当次 `tools/list` 的 schema 调用；不得手写 `.scene`、`.prefab` 或 UUID 绑定。对同一编辑器项目保持唯一活动写入者。
- 对一批写入 `assets/` 的原始资源，先完成整批文件写入，再调用 AssetDB refresh 并等待 `.meta` 就绪。refresh 成功只证明 sidecar 文件已出现，不代表导入有效、资源未 invalid、子资源可用或脚本已编译。
- 继续用协议列出的 `project_get_asset_info({assetPath})` 和 `project_query_asset_uuid({url})` 核验资源类型、状态及 UUID；子资源通过只读 sidecar 查询，找不到可用查询工具时停止绑定并报告缺口。含脚本时等待 Creator 正常编译，再从控制台/项目日志核验相关错误；`component_attach_script` 不是编译器。
- 保存 Scene 或 Prefab 后立即读回目标节点、组件、属性和资源引用，并对照实施包断言。MCP 工具成功返回、文件存在或日志为空都不足以单独证明持久化、编译或运行完成。

<a id="mode-cocos-game-architecture--cocos-表现与平台边界"></a>
#### Cocos 表现与平台边界

- 2D 渲染对象使用 Creator 的 `Node` 与相应渲染组件；需要 UI 几何时通过 `UITransform` 管理尺寸和锚点。`Canvas` 是 UI 根，`Widget` 表达相对父节点或 Canvas 边界的对齐约束；世界空间由场景节点和 `Camera` 组织。具体组件、坐标空间和序列化字段以项目锁定版本的 Creator 文档为准。
- UI 同级顺序应通过节点树顺序和项目明确采用的排序配置实现；跨 Camera 或世界/UI 层的合成必须在 TDD 中说明。

<a id="mode-cocos-game-architecture--原生平台插件选型"></a>
#### 原生平台插件选型

- 按顺序复用项目现有原生实现、Creator 或提供方官方方案，再评估维护状态、Creator/Android/iOS 版本支持及许可证适用的社区方案；只有确认存在明确能力缺口时才自建或扩展插件。
- 选型和实现前锁定 Creator 与 Android/iOS 工具链版本，并核验所需权限、宿主生命周期、线程约束、构建方式和失败语义。平台接口必须明确报告 Web/小游戏不支持，不得伪造或模拟原生能力。
- 新增原生能力时先检查项目已有 Creator 原生插件和适配层。Creator 的 JSB `native.bridge` 在官方支持的环境中可用作 JS/native 消息桥；桥接负载按目标版本的官方接口约束编码，原生侧 SDK 调用、线程与生命周期责任由插件适配层承担。它不是 AppLovin 或其他 SDK 的通用 JS API，也不应绕过业务契约。
- 仅在明确能力缺口时实现或扩展原生插件，并记录目标平台、Creator 版本、权限、生命周期、失败语义和验证范围。广告、Spine 等领域按各自 Skill 合同管理，不在架构 Skill 中虚构第三方插件 API。

<a id="mode-cocos-game-architecture--执行与交接"></a>
#### 执行与交接

Creator 编辑器写入、AssetDB、场景、节点、组件、Prefab、构建和预览都经[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)路由；MCP 当前只能打开构建面板或报告 worker ready 时，实际构建/预览保持 pending/blocked，不得记录为成功。

1. 读取 Work Item、用户明确要求、项目版本、目录规范、模块审计、依赖能力档和服务边界。按 F0-F4 提交范围、规格映射、架构结论、工程验证和集成/发布决策；不自行改变全局状态。
2. 实现前为每个模块记录职责与非目标、公开输入/输出、状态所有权、生命周期、允许/禁止依赖、失败边界、测试和所有者。新模块先确认目标边界和项目事实，只有实质取舍才进入 grilling。
3. 在技术设计中标出共享模块、场景模块、Scene/Prefab/Component 所有权和跨场景依赖。基础包只提供启动、生命周期和公开契约；具体场景玩法、UI 和正式可见资产在其对应场景任务内完成。
4. UI 采用 [`cocos-game-ui-layout`](#mode-cocos-game-ui-layout) 的布局合同。分别记录 UI 的 Canvas/`UITransform`/`Widget` 关系、世界空间 `Camera`、输入坐标、安全区、设计分辨率策略、方向和运行证据。布局锚点、节点锚点和动画表现偏移分开维护。
5. 先复用项目依赖与 Creator 能力。新增依赖需记录启用原因、版本、维护/许可、性能和平台风险、验证命令及所有者；未被需求触发的能力不预装。
6. 定义本地验证进程的项目身份、模式、主机/端口和健康检查。启动 Creator 预览或其他长驻验证进程前，先查找并复用同项目健康实例；身份不明的进程不停止。
7. 基础模块完成后验证 Creator 预览或构建、Boot/首场景、AssetDB 资源就绪及适用平台插件；局部证据不宣称全平台通过，也不自动发起真机验收。

向玩法和 UI 交接组件/服务入口、资源引用方式、所有权与测试范围；向 QA 交接 Creator 版本、目标构建平台、复现步骤、日志位置和未覆盖项。新增或修改的类、函数和实体定义须添加简体中文注释，说明不直观的边界或设计原因。
<!-- native-source:cocos-game-architecture:end -->


## 游戏玩法实现

<!-- native-source:cocos-gameplay-development:start -->
<a id="mode-cocos-gameplay-development"></a>

<a id="mode-cocos-gameplay-development--cocos-creator-3x-玩法开发"></a>
### Cocos Creator 3.x 玩法开发

全局阶段、V0–V4、状态、执行结果与证据门统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行。本领域只负责玩法规则、状态、交互和动态验收；场景仍使用同一 Work Item 的 V1→V2→V3→V4 链，V2 拆解和布局分别确认。

<a id="mode-cocos-gameplay-development--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实际实施结果、证据与阶段迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈玩法规则、状态、交互和动态验收。

<a id="mode-cocos-gameplay-development--所有权"></a>
#### 所有权

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-cocos-gameplay-development--实现"></a>
#### 实现

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
3. 对当前场景明确可观察玩家行为、状态迁移、时序、反馈、成功/失败和异常恢复。截图无法证明的行为标为待定义，不自行推断。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
6. 只使用绑定当前 `scene_id` 或合规 `shared` 且 V3 `accepted` 的资源进入正式功能实现。用独立 Node、Component、Prefab 和命名节点层组织场景，按[显示节点锚点与层级](../../cocos-game-ui-layout/references/display-object-layering.md)显式设置渲染节点的 `UITransform.anchorPoint`，逐对象记录非中心例外及坐标转换，并声明背景、世界、特效、HUD 与瞬态层的合成顺序和输入归属；UI 从 [`cocos-game-ui-layout`](#mode-cocos-game-ui-layout) 布局合同计算，区分左上布局坐标、Creator 锚点局部坐标、父子停靠与动画偏移，并在视口、安全区、方向、状态和内容变化后通过唯一入口幂等重排。普通测试验证关系不变量，不把绝对屏幕坐标当作通用验收标准。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-cocos-gameplay-development--证据"></a>
#### 证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

Creator 编辑器、AssetDB、Scene/Node/Component、Prefab 和构建操作必须遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，并先读取 `tools/list` 返回的实时 schema；不得手写 `.scene`、`.prefab` 或 `.meta` 绑定。资源刷新完成、脚本挂载或构建面板打开都不能单独证明资源导入、编译或构建成功；按协议做有界 UUID/子资源查询、读回检查和控制台错误核验。工具没有实际构建/预览能力时，相关运行结论保持 pending/blocked。

<a id="mode-cocos-gameplay-development--本栈配套资料"></a>
#### 本栈配套资料

- [`cocos-game-ui-layout`](#mode-cocos-game-ui-layout)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#资源拆解与界面实现)
- [汁水感设计指南](../../cocos-game-juice/references/design-guide.md)
<!-- native-source:cocos-gameplay-development:end -->


## 游戏音频

<!-- native-source:cocos-game-audio:start -->
<a id="mode-cocos-game-audio"></a>

<a id="mode-cocos-game-audio--cocos-creator-3x-音频设计"></a>
### Cocos Creator 3.x 音频设计

<a id="mode-cocos-game-audio--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实施结果、证据门、验证与用户确认统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈音频设计和运行约束。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

Creator Scene/Node/Component、`AudioSource`、Prefab、AssetDB 和构建操作必须遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，按实时 `tools/list` schema 调用，不手写 `.scene`、`.prefab` 或 `.meta` 绑定。面板打开或 worker ready 不证明预览/构建成功；缺真实运行证据时标记为 pending/blocked。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。
5. 标准、发布通道向总控提交一条音频范围、证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-cocos-game-audio--后台暂停与恢复约束"></a>
#### 后台暂停与恢复约束

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#后台暂停与恢复约束)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-cocos-game-audio--本栈配套资料"></a>
#### 本栈配套资料

- [动态反馈设计指南](../../cocos-game-juice/references/design-guide.md)
<!-- native-source:cocos-game-audio:end -->


## 游戏数值与经济

<!-- native-source:cocos-game-balance:start -->
<a id="mode-cocos-game-balance"></a>

<a id="mode-cocos-game-balance--cocos-creator-3x-数值设计"></a>
### Cocos Creator 3.x 数值设计

<a id="mode-cocos-game-balance--全局控制接入"></a>
#### 全局控制接入





> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。

汁水感调整涉及顿帧、硬直、实际击退、吸附或输入容错等规则参数时，按[玩法与表现边界](../../cocos-game-juice/references/design-guide.md#设计原则与玩法边界)与玩法共同确定影响和验证；纯粒子、声音或视觉偏移不因此进入数值修改范围。

读取全局 Work Item、项目配置、GDD、当前玩法实现和数值模型。按 F0 范围与流程、F1 规格一致性、F2 数值质量、F3 模拟/实测/回归证据和 F4 集成/发布决策推进。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
4. 标准、发布通道向总控提交一条模型版本、关键证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
<!-- native-source:cocos-game-balance:end -->


## 游戏与应用汁水设计

<!-- native-source:cocos-game-juice:start -->
<a id="mode-cocos-game-juice"></a>

<a id="mode-cocos-game-juice--cocos-creator-3x-游戏汁水感"></a>
### Cocos Creator 3.x 游戏汁水感

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-cocos-game-juice--控制面与职责"></a>
#### 控制面与职责



Creator Scene/Node/Component、Tween/Animation/ParticleSystem、Prefab、AssetDB 和构建操作必须遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)并按实时 `tools/list` schema 调用，不手写 `.scene`、`.prefab` 或 `.meta` 绑定。构建面板打开、worker ready 或资源刷新不代表运行通过；无法取得真实 Creator Preview/运行结果时保持 pending/blocked。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#模块职责边界)。
- 美术、帧动画和音频继续拥有对应素材生产、登记、时间轴及生命周期。优先复用已有模块，不为调用本 Skill 新建运行时管理器。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。
- 沿用已授权的范围、服务复用、当前分支和测试规则；不自动启动真机或执行外部写入、付费、发布等受保护操作。

<a id="mode-cocos-game-juice--按需读取"></a>
#### 按需读取

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#按需读取)。

<a id="mode-cocos-game-juice--执行闭环"></a>
#### 执行闭环

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#执行闭环)。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-cocos-game-juice--交付"></a>
#### 交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-cocos-game-juice--本栈配套资料"></a>
#### 本栈配套资料

- [完整设计指南](../../cocos-game-juice/references/design-guide.md)
- [工作流接入](../../cocos-game-juice/references/workflow-integration.md)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md)
<!-- native-source:cocos-game-juice:end -->


## 候选交付与发布准备

<!-- native-source:cocos-game-release:start -->
<a id="mode-cocos-game-release"></a>

<a id="mode-cocos-game-release--cocos-creator-3x-发布与合规"></a>
### Cocos Creator 3.x 发布与合规

<a id="mode-cocos-game-release--全局控制接入"></a>
#### 全局控制接入



发布必须创建独立 Work Item。`cocos-build-upload`、`cocos-backend-config`、`cocos-channel-config` 为 A5；`cocos-device-test`、`cocos-store-submit`、`cocos-release`、`cocos-game-rollback` 为 A6，先由 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 校验精确游戏目标和 F4 审批。Git、GitHub Release、消息和通用第三方 API 不属于此生命周期控制面。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。

Creator 项目配置、资源、Scene/Node/Component、Prefab、AssetDB 与编辑器构建操作按[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)并以实时 `tools/list` schema 执行；不得手写 `.scene`、`.prefab` 或 `.meta` 绑定。当前 MCP 的构建工具可能只打开 Creator 构建面板或报告 worker ready，这不构成构建完成；需经 Creator UI 实际完成构建并取得结果，否则候选构建验证保持 pending/blocked。

读取独立发布 Work Item、平台矩阵、资源登记、测试计划和发布清单。F0 校验任务范围与流程，F1 校验候选与发布规格，F2 完成 QA/技术/合规领域质量，F3 绑定工程证据，F4 只决定记录中明确的外部对象和发布动作。

1. 分别核对小游戏、iOS、Google Play 的打包、版本、图标截图、描述、隐私、分级、广告或内购披露、数据收集与账号删除要求。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
3. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)按[Creator 生产构建与发布检查](../../cocos-game-architecture/references/production-build.md)核对锁定 Creator 版本的 release 配置、压缩/混淆、注释移除、生产 Source Map 关闭、最终已解包候选扫描及 Feature Cropping 评估；Creator 的编辑器配置、CLI 覆盖和构建扩展以实际有效结果为准，不套用 Vite/Terser 固定键。候选 SHA、包哈希仅作可选追踪，不要求填写或匹配，不阻断发布工作项验收；摘要核对留到最终人工验收后处理。共享基础和关键玩法流证据只能证明各自范围；发布 Work Item 应覆盖实际目标渠道/平台矩阵，并以本栈发布清单确认对应项，不得自动发起真机验收。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
5. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)
<!-- native-source:cocos-game-release:end -->


## 质量审核与性能验证

<!-- native-source:cocos-game-qa-performance:start -->
<a id="mode-cocos-game-qa-performance"></a>

<a id="mode-cocos-game-qa-performance--cocos-creator-3x-测试与性能"></a>
### Cocos Creator 3.x 测试与性能

<a id="mode-cocos-game-qa-performance--全局控制接入"></a>
#### 全局控制接入





[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

涉及 3D 模型时，按[建模工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)核对 Blender 几何/拓扑/UV 报告、导出回读、Creator 实际模型与子资源、比例/轴向/Pivot、材质槽、LOD/碰撞、资源级 Prefab 和正式场景消费。以当前项目的预算和实际能力为准；通用资源清单 PASS、导出文件存在或 `.meta` 出现不能代替这些技术验证。转台、线框、UV、LOD 切换与碰撞边界截图供用户人工检查，技术结果和显示确认分别记录；不自动启动真机验收。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
2. [公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
10. 共享基础完成后验证 Creator 项目启动、Boot/首场景、资源加载和适用插件；关键玩法流完成后在主目标平台验证核心循环与失败恢复；只有最终集成/G3/release 执行完整渠道/平台矩阵。G3/release 候选还按[Creator 生产构建与发布检查](../../cocos-game-architecture/references/production-build.md)核验实际 release 构建配置、最终已解包包体中的 Source Map 文件/引用、压缩与注释处理、Feature Cropping 采用结果和构建资源路径；不将生产配置截图当作最终包检查。Creator 编辑器、AssetDB、Scene/Node/Component、Prefab、构建和预览操作按[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)执行。当前 MCP 的运行/构建工具只打开构建面板或报告 worker ready，不表示预览或构建完成；实际运行和构建没有证据时保持 pending/blocked。[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)V1/V2 条件门必须绑定当前候选；沉默、继续工作或旧决定不能替代真正需要的 `USER_DECISION`，用户决定也不能跳过 V2 拆解与布局确认所需的确定性机器 F2。固定宽/固定高模式的声明不证明满屏或响应式重排；禁止用构建面板打开、元素存在或无控制台错误假通过。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。

<a id="mode-cocos-game-qa-performance--本栈配套资料"></a>
#### 本栈配套资料

- [scripts/responsive-visual-validation.mjs](../../cocos-game-qa-performance/scripts/responsive-visual-validation.mjs)
- [scripts/responsive-visual-validation.test.mjs](../../cocos-game-qa-performance/scripts/responsive-visual-validation.test.mjs)
- [事件覆盖与反馈规则](../../cocos-game-juice/references/design-guide.md)
- [`cocos-game-ui-layout`](#mode-cocos-game-ui-layout)
- [响应式视觉验证](../../cocos-game-qa-performance/references/responsive-visual-validation.md)
- [游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)
- [视觉还原](../../cocos-game-asset-integration/references/visual-reconstruction.md)
- [实际完成情况](../../cocos-domain-contracts/references/control-model.md#按实际完成情况验收)
- [检查与返修](../../cocos-game-ui-layout/references/game-copy.md#检查与返修)
<!-- native-source:cocos-game-qa-performance:end -->


## 动画制作与接入

<!-- native-source:cocos-frame-animation:start -->
<a id="mode-cocos-frame-animation"></a>

<a id="mode-cocos-frame-animation--cocos-creator-3x-通用帧动画制作"></a>
### Cocos Creator 3.x 通用帧动画制作

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

动画设计先确定目标感受、表演亮点与节奏，再处理身份连续、采样、资源映射和 Cocos 接入。按表现目的主动考虑转身、侧身、旋转、翻腾、透视变化、遮挡、位移和夸张形变；这些是可选设计手段，不要求炫技。身份和运动连续性服务于表演，固定画布、区域、资源锚点和 Creator `Node` 映射不锁死主体朝向、姿态或画内位置。先确定值得观看的表演，再安排画布、关键帧、采样和批次；生成困难时先补足关键状态、明确轨迹或修正素材，不自动删去核心动作来迁就容器。

在当前 Work Item 范围内内部提出、推导并维护动作时间轴设计记录。方案完成后，主动向用户说明目标感受、关键动作依据、节奏取舍和观看重点，并等待用户明确确认当前动作方案；确认后才在既有授权内推进提示词、真实素材和具体实现。用户随后审阅真实视频、逐张关键帧及完整序列，按反馈修复并重验，再回到控制面提交证据与状态迁移。只有玩法事件、时长或行为权限确实缺失且无法推导时，才询问受影响动作；目标感受或核心动作方案实质改变时重新说明并确认。

<a id="mode-cocos-frame-animation--分类入口"></a>
#### 分类入口

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

<a id="mode-cocos-frame-animation--来源路线"></a>
#### 来源路线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#来源路线)。

<a id="mode-cocos-frame-animation--共用流程"></a>
#### 共用流程

1. 按[导演与动作指导](../../cocos-frame-animation/references/animation-direction.md)判断设计复杂度：简单任务由对应专业设计师兼任导演，复杂表演或紧密跨类型配合时独立委派导演。先构思观看体验与表演亮点，再读取视觉基线、用途类型参考与[完整动作与时间轴](../../cocos-frame-animation/references/action-timing.md)，建立当前动画的内部设计工件。明确来源路线、行为边界、初态/终态、游戏时长、阶段区间、关键姿态、事件、播放方式、资源锚点映射与允许位移、完整运动范围、目标显示尺寸、FPS 和背景处理。角色动作还须明确前后动作衔接、是否循环及进入/退出条件，见[衔接与循环设计](../../cocos-frame-animation/references/character-animation.md#衔接与循环设计)。按需要读取[区域规划](../../cocos-frame-animation/references/region-planning.md)，合批时各区域仍有独立类型和时间映射。
2. 按[动作分析规则](../../cocos-frame-animation/references/action-timing.md#动作分析与时间轴)和[玩法与意图设计方法](../../cocos-frame-animation/references/intent-driven-design.md)，从观看体验、玩法目的和已有时间约束内部推导行为边界、阶段与空间变化、衔接/循环及节奏取舍，并记录建议时间轴、事件时点、关键姿态意图、显示尺寸与性能取舍和逐阶段检查点。视频同时推导 768p/2K 区域排布、条数、整组消耗与推荐方案。只对确实缺失且无法推导的玩法事件、时长或行为权限提问，并只暂停受影响动作的设计。不制作灰盒或可播放几何示意。
3. 方案完成后，先按[设计理念说明](../../cocos-frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)向用户说明目标感受、动作依据、节奏和性能取舍及观看重点，并暂停等待用户明确确认当前动作方案。收到确认后，才按“表演过程与当前参数＋类型规则＋身份与资源要求”编写正式提示词，并在已有授权范围内制作真实候选或预览。视频按[分辨率与合批比较](../../cocos-frame-animation/references/region-planning.md#视频条数与消耗比较)选择 768p 或 2K：先最少条数覆盖全部动作，再在该条数下选整组消耗最少者，同等条件优先 768p；图片按[图片分辨率约定](../../cocos-frame-animation/references/region-planning.md#图片分辨率约定)处理。首次素材交付直接展示真实视频候选/预览或真实图片首帧及关键帧，并附与设计理念对应的简短检查点。用户确认实际素材时可同时接受该素材所表达的时序，不另行确认文字复述。无现有生成授权时遵守外部操作边界，不把路线选择视为授权。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。
5. 视频按固定区域抽帧，图片按真实来源清单打包；两者共用背景处理、等比缩放、固定 cell/锚点、独立图集、报告和 HTML 预览。依据当前类型反馈局部修帧，保留已有修图成果及来源身份，更新图集、报告和预览；SHA 如被记录，仅作可选身份追踪，不作为验收门。缺陷修复不默认替换整组来源。
6. 先由用户按正常速度完整观看真实帧序列，判断目标感受、吸引力、表演亮点与节奏，再按内部设计工件中的逐阶段检查点人工检查可读性、连续性、事件及单次/循环/终态和外部动作衔接，记录具体偏差与用户结论。同目标的局部纠错直接返修并展示前后对照；目标感受、核心动作方案、玩法语义或来源路线实质改变时须重新确认，不重新索取已有生成授权。保存分类规则、方案版本与确认、玩法与意图推导、真实候选审阅、时间映射与最终人工验收证据，按[工作流接入合同](../../cocos-frame-animation/references/workflow-integration.md)提交资源，再回到控制面完成 Cocos 接入和运行验证。

<a id="mode-cocos-frame-animation--动作设计与真实素材确认"></a>
#### 动作设计与真实素材确认

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-cocos-frame-animation--共用质量与关键约束"></a>
#### 共用质量与关键约束

- 先由用户完整观看吸引力、目标感受、节奏与表现亮点，再检查可读性、主次、连续性和事件同步；具体判断及优化方法见[共用质量与优化](../../cocos-frame-animation/references/action-timing.md#共用质量与优化)。重量感、夸张程度、停顿和跟随运动按类型、对象性质与视觉基线配置，不统一套用战斗节奏。
- 按[效果与性能平衡](../../cocos-frame-animation/references/action-timing.md#效果与性能平衡)，结合目标显示尺寸、动作可读性和项目已有平台预算选择 FPS、帧数、cell 与图集规模，并评估加载、纹理驻留、同屏并发和透明叠加成本。制作前的设计理念说明包含推荐精细程度、必须保留的表现及取舍理由；制作后结合用户视觉验收和实际资源/运行性能证据判断，不默认追求最高参数。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 默认保持要求呈现的内容及完整运动范围入框，保留安全边距。裁剪例外须有当前任务的明确授权，逐项记录对象、范围与理由；不能为合批或强调力度自行裁边。
- 资源锚点用于坐标映射，不要求角色根位置或朝向静止。主体可按表演设计转身、翻腾、位移和改变投影比例；在工件中记录运动意图与范围即可，不为每次合理姿态变化新增许可。按连贯过程检查身份、透视、遮挡与形变，修正无因漂移、身份丢失、闪烁和跨区串入，不要求每帧外观或位置相同。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 分类与优化参数保存在设计工件，不因分类添加合同字段，不虚构脚本或生成 API 参数。视频沿用既有 accepted workflow schema；视频与图片报告分别使用 schema `/2`，图片仍使用独立来源清单和 accepted 合同，记录真实生成图、父图、时间槽位与修图记录，不能伪造视频路径或来源时间戳。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-cocos-frame-animation--执行代理"></a>
#### 执行代理

帧动画 Work Item 按[动画导演与动作指导](../../cocos-frame-animation/references/animation-direction.md)判断岗位：简单任务由对应专业设计师兼任导演，复杂表演或紧密跨类型配合时独立委派导演。导演负责观看体验、整体构思、动作亮点、空间与节奏及跨类型配合；各专业设计师负责细化对应类型的时间轴、提示词、时间整理、抽帧/图片序列集成和修正。主代理负责分类、复杂度判断、任务包、所有权与范围裁决、人工反馈、接入、审查与最终验证。

| 用途类型 | 负责设计的职业 | 设计重点与交付依据 |
| --- | --- | --- |
| 普通动画 | 道具与环境动画设计师 | 物件材质、结构与运动机制、环境节奏、状态转换和循环接缝；交付关键状态、运动轨迹与锚点范围。 |
| 角色动作动画 | 角色动画设计师 | 身体力学、重心与支撑、动作剪影、预备与跟随运动、角色性格及前后动作衔接；交付关键姿态、接触关系与玩法事件时间轴。 |
| 特效动画 | 游戏特效设计师 | 视觉层级、能量演变、形状与色彩节奏、透明边缘、事件同步和消散；交付效果阶段、峰值时点与角色/场景遮挡约束。 |
| UI 帧动画 | UI 动效设计师 | 交互状态、反馈时机、注意力引导、文字与图标可读性、打断及重复触发；交付状态转换、反馈时间轴与界面显示边界。 |

职业身份写入委派提示词，不新增工具未提供的 `agent_type`。按动画用途分配，不按来源、文件格式或循环/单次方式分配。各设计师读取对应分类参考，在设计工件中记录负责动画、设计依据和逐阶段检查点，不能只更换称谓而沿用同一套标准。混合任务按可独立设计的动画或区域拆分；导演或兼任设计师先统一构思、事件时点、锚点与遮挡关系，再按依赖交接，只有文件所有权不重叠的独立部分可并行。

各职业按对应分类参考的设计依据和人工验收重点执行，并遵循[共用设计交付与验收检查点](../../cocos-frame-animation/references/intent-driven-design.md#设计师交付与验收检查点)：在当前设计工件中关联依据、设计决定、阶段/事件与人工检查点，交付目标感受、完整时间轴、关键状态意图、空间约束及采样与性能取舍。具体时长、帧数、FPS、幅度和尺寸按当前任务推导并说明理由，不将通用示例或某职业惯用节奏写成固定参数。

帧动画时间轴与素材工作按对应设计师职责委派；符合复杂度条件的导演任务另行委派。使用 `collaboration.spawn_agent`，设置 `agent_type="default"`、`model="gpt-6.1-sol"`、`reasoning_effort="max"`、`fork_turns="none"`。完整任务包包含 Work Item、复杂度判断与导演安排、导演构思与跨类型依赖、设计师职业与职责、用途类型和来源路线、对应参考、玩法目的与表现意图、已有时间约束、行为/输入边界、阶段检查点、素材与基线路径、允许修改范围、当前候选版本/内部时间轴、允许推进步骤、验收标准、测试等级与命令、禁止操作及并行提醒。执行代理在方案完成后、制作前交接设计理念与目标感受并暂停；主代理取得用户对当前动作方案的明确确认后，才交接确认范围与可推进步骤。未确认方案不得开始素材制作或具体实现。首次素材交付提供真实候选/预览和对应检查点；详细推导保存在内部工件。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-cocos-frame-animation--本地工具与参考路由"></a>
#### 本地工具与参考路由

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#本地工具与参考路由)。

```powershell
node <skill-dir>/scripts/video-to-atlas.mjs --help
node <skill-dir>/scripts/image-inbetween-plan.mjs --help
node <skill-dir>/scripts/images-to-atlas.mjs --help
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#本地工具与参考路由)。

| 当前阶段 | 按需读取 |
| --- | --- |
| 导演职责与表演构思 | [animation-direction.md](../../cocos-frame-animation/references/animation-direction.md)，简单任务由设计师兼任，复杂任务独立委派，交接核心表演与跨类型依赖 |
| 用途判断与类型制作 | 上方对应的一份分类参考；涉及独立特效或 UI 位图时再读取其规则 |
| 从玩法与表现意图推导时长、节奏及检查点 | [intent-driven-design.md](../../cocos-frame-animation/references/intent-driven-design.md)，在动作分析时读取并写入既有设计工件，制作与验收复用 |
| 需要反馈语义、类型适用或事件覆盖规则 | [Cocos 2D 汁水感设计指南](../../cocos-game-juice/references/design-guide.md)；本 Skill 仍按既有时间轴设计、真实素材审阅和完整序列人工验收生产帧动画 |
| 游戏时间、分组、阶段及修正 | [action-timing.md](../../cocos-frame-animation/references/action-timing.md) |
| 效果图尺寸推理、合批与空间裁剪 | [region-planning.md](../../cocos-frame-animation/references/region-planning.md) |
| 图片首尾、关键帧、双图参考递归与图片来源合同 | [image-inbetween.md](../../cocos-frame-animation/references/image-inbetween.md) |
| 动作设计与素材确认、提示词组合与来源/修图证据 | [workflow-integration.md](../../cocos-frame-animation/references/workflow-integration.md) |

Creator 资产、Scene/Node/Component、Prefab、AssetDB 和构建操作遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，按实时 `tools/list` schema 调用，不手写 `.meta`、`.scene` 或 `.prefab`。图集报告中的 `cc` 是 `SpriteFrame`、`UITransform` 与 `AnimationClip` 的描述清单，脚本不会物化 Creator 资产；V4 需通过 MCP 核验资源、逐项读回子工具结果，并在 Creator 中实际接入和验证。不能发现所需子资源查询或编辑能力时，受影响接入保持 pending/blocked。全局阶段仍由[唯一控制面](../../app-workflow-control/SKILL.md)管理：V2 内部推导并记录动作时间轴、阐述设计理念并取得用户对当前方案的明确确认，V3 制作并审阅真实视频或关键帧、验收完整序列，V4 消费 Creator `SpriteFrame`/`AnimationClip` 与 `UITransform` 锚点合同并验证运行态。

帧动画图集默认放在 `assets/animations/` 等已规划的普通资源目录，由 Scene/Prefab 的 UUID 引用；只有明确使用 `resources.load/loadDir` 按路径动态加载时才放进 `assets/resources/`。详见[项目目录规范中的资源与引用规则](../../cocos-game-architecture/references/project-structure.md#资源与引用)及[工作流接入合同](../../cocos-frame-animation/references/workflow-integration.md#accepted-资源文件门)。

<a id="mode-cocos-frame-animation--本栈配套资料"></a>
#### 本栈配套资料

- [游戏时间先于来源](../../cocos-frame-animation/references/action-timing.md#游戏时间先于来源)
- [动作设计与素材确认](../../cocos-frame-animation/references/workflow-integration.md#动作设计与素材确认)
- [真实素材审阅与验收](../../cocos-frame-animation/references/workflow-integration.md#真实素材审阅与验收)
- [设计与美术的边界](../../cocos-frame-animation/references/workflow-integration.md#设计与美术的边界)
- [一致性及衔接门](../../cocos-frame-animation/references/image-inbetween.md#关键帧的一致性与衔接门)
- [视频节奏整理](../../cocos-frame-animation/references/action-timing.md#视频节奏整理)
- [按区域抽帧](../../cocos-frame-animation/references/region-planning.md#按区域抽帧)
- [图片递归补帧](../../cocos-frame-animation/references/image-inbetween.md)
- [普通动画](../../cocos-frame-animation/references/object-animation.md)
- [角色动作动画](../../cocos-frame-animation/references/character-animation.md)
- [特效动画](../../cocos-frame-animation/references/effect-animation.md)
- [UI 帧动画](../../cocos-frame-animation/references/ui-frame-animation.md)
<!-- native-source:cocos-frame-animation:end -->


## 三维几何建模

<!-- native-source:cocos-game-3d-modeling:start -->
<a id="mode-cocos-game-3d-modeling"></a>

<a id="mode-cocos-game-3d-modeling--cocos-游戏-3d-建模"></a>
### Cocos 游戏 3D 建模

把已确定的视觉与玩法规格制作成可编辑、可复查并能由目标 Cocos Creator 项目实际导入的 3D 模型。正式模型在 Blender MCP 中生产，Creator 用于资源导入核验和既有 Work Item 要求的场景接入。开始前按需阅读[Blender MCP 建模流程](../../cocos-game-3d-modeling/references/mcp-modeling-workflow.md)、[模型交接](../../cocos-game-3d-modeling/references/model-handoff.md)和[工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)。



<a id="mode-cocos-game-3d-modeling--输入与边界"></a>
#### 输入与边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#冻结模型简报)。
- 缺少关键规格、可用 Blender MCP、明确的 `.blend` 来源/写入范围、唯一 Creator 项目或当前工作项授权时，可提供带假设的只读规格建议；受影响写入保持 `BLOCKED`。没有可用 Blender MCP 时阻断正式建模，不能用体块拼搭或其他工具冒充正式交付。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#完成模型结构)。
- 本技能拥有几何、拓扑、法线、UV、材质槽结构、LOD、碰撞代理和静态模型导出。它不生产 PBR 贴图，不实现骨架/权重/动作，不代替 Cocos 玩法场景装配或独立 QA；接口约定见[模型交接](../../cocos-game-3d-modeling/references/model-handoff.md)。
- 只按目标项目当前 Creator、Importer 和 MCP 能力选择导入格式。不得假定某种格式、导入器、网格子资源或自动转换能力必然可用。

<a id="mode-cocos-game-3d-modeling--执行底线"></a>
#### 执行底线

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#检查-blender-工作区)。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#核对表面与性能预算)。
3. 源资产只读；在授权路径内创建版本化派生文件。按实际授权处理覆盖、删除、重建 UV、改变顶点顺序或绑定数据等破坏性修改。Blender 脚本遵循当前工作项授权和 DCC 脚本限制；已授权的精确脚本范围可复用，不为每个本地脚本重复增加确认。
4. Creator 的 AssetDB、资源 UUID、子资源、Scene、Node、Component、Prefab 和构建操作严格遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，每次读取实时 `tools/list` Schema。禁止手写 `.scene`、`.prefab`、`.meta` 或伪造 UUID/子资源绑定；同一项目编辑器状态保持单写者，保存后读回。
5. 截图只提供给用户人工检查并附检查要点；未经用户明确要求，不自动分析截图或判断视觉通过。技术证据、玩法视觉证据和用户显示确认分别记录。

<a id="mode-cocos-game-3d-modeling--交付"></a>
#### 交付

交付版本化 `.blend`、运行时模型文件、拓扑/法线/实际 UV 位置报告、材质槽与 LOD/碰撞指标、导出回读记录、来源与许可、Creator 资源导入及实际加载证据，以及模型交接资料。只有真实模型满足当前工作项验收条件并补齐相应阶段证据，才可报告就绪。
<!-- native-source:cocos-game-3d-modeling:end -->


## Spine 生成式换皮

<!-- native-source:cocos-spine-generative-reskin:start -->
<a id="mode-cocos-spine-generative-reskin"></a>

<a id="mode-cocos-spine-generative-reskin--cocos-creator-3x-spine-生成式换皮"></a>
### Cocos Creator 3.x Spine 生成式换皮

本 Skill 只在已授权的 Cocos Work Item 内使用。它保留原 Skeleton、Attachment、锚点、Atlas Region 几何和 Mesh UV 语义；候选资源始终在独立诊断目录中验证，未通过运行态门前不得接入主游戏。

Creator 资源、`sp.Skeleton` 组件、Scene/Node/Prefab、AssetDB 和构建操作遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，并按实时 `tools/list` schema 调用；不得手写 `.meta`、`.scene` 或 `.prefab` 绑定。同一 Creator 项目保持唯一活动写入者。当前 MCP 的构建/预览能力不等于真实构建/运行；没有真实 Runtime 证据时，受影响验证保持 pending/blocked。

`target_runtime` 必须取自目标项目实际启用的 `sp.SPINE_VERSION` 分支，而不是 Creator 项目版本号。核对项目配置中的 Spine feature（Creator 3.8.6 源码包含 `spine-3.8` 与 `spine-4.2` 两个 feature）及真实解析证据；`creator_version` 单独记录项目实际 Creator 引擎版本。3.8 分支的导出限制只适用于该分支，不把它推广到 4.2 或所有 Creator 3.x 版本，也不以项目版本号推断 Spine Runtime。[Creator 3.8.6 feature 配置](https://raw.githubusercontent.com/cocos/cocos-engine/v3.8.6/cc.config.json)

<a id="mode-cocos-spine-generative-reskin--入口"></a>
#### 入口

```powershell
node <skill-dir>/scripts/spine_reskin_progress.mjs --help
```

正式原版目录可用 `inspect --asset-dir <原版资源目录>` 或 `init --asset-dir <原版资源目录>`；独立 Skeleton/Atlas/Page 会直接审计，Cocos `sp.SkeletonData` 的 `_atlasText`/`_skeletonJson` 会先导出到独立规范化候选目录，绝不改写源目录。`init` 必须同时传入控制面 manifest，绑定 Work Item、production contract 和适用的 V2 方案证据。

进度清单必须是 schema v3。所有会修改清单的命令使用跨进程锁和原子写入；禁止手动编辑状态伪造完成。详细规则见：

- [Skeleton 审计与升级](../../cocos-spine-generative-reskin/references/skeleton-upgrade.md)
- [批次计划与人工锁定](../../cocos-spine-generative-reskin/references/batch-review.md)
- [运行态验证与最终交付](../../cocos-spine-generative-reskin/references/runtime-validation.md)
- [状态、恢复与锁](../../cocos-spine-generative-reskin/references/progress-state.md)
- [Atlas 重建](../../cocos-spine-generative-reskin/references/atlas-rebuild.md)

<a id="mode-cocos-spine-generative-reskin--固定流程"></a>
#### 固定流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。
7. 使用 `runtime-validate` 提交 `cocos-spine-runtime-validation/2.0` 报告：绑定真实已启用的 `sp.Skeleton` 组件和其 `SkeletonData` UUID，从 `sp.Skeleton.skeletonData` 读取完整动画集；另绑定实际 `sp.SPINE_VERSION` 解析证据、Idle 循环、纹理/锚点/Mesh/闪烁/裁剪检查、诊断 URL、浏览器日志及桌面和约 390px 移动证据。Creator 版本与 Spine Runtime 版本分别记录。只有当前 Creator/Runtime 实际运行结果齐备才可通过；没有经核实的 Preview/运行能力时保持 pending/blocked，不用构建面板或 worker ready 代替。通过后才能 `finalize`，最后用 `report` 生成最终交付报告。

<a id="mode-cocos-spine-generative-reskin--状态硬门"></a>
#### 状态硬门

Cell 状态固定为：

```text
pending → generating → generated → validating → packing → packed → runtime_validating → completed
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。

<a id="mode-cocos-spine-generative-reskin--全局视觉与批次确认边界"></a>
#### 全局视觉与批次确认边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。

<a id="mode-cocos-spine-generative-reskin--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../cocos-domain-contracts/references/control-model.md)
- [状态与门](../../cocos-domain-contracts/references/state-gates.md)
<!-- native-source:cocos-spine-generative-reskin:end -->


## 界面布局与自适应

<!-- native-source:cocos-game-ui-layout:start -->
<a id="mode-cocos-game-ui-layout"></a>

<a id="mode-cocos-game-ui-layout--cocos-creator-3x-游戏-ui-布局"></a>
### Cocos Creator 3.x 游戏 UI 布局

正式渲染 Node、Canvas UI 与独立显示层统一遵守[显示节点锚点与层级](../../cocos-game-ui-layout/references/display-object-layering.md)：具有 `UITransform` 的节点默认使用中心 `anchorPoint=(0.5, 0.5)`；例外逐对象记录原因并换算。场景须声明背景、世界、特效、HUD、瞬态层的实际层序、输入和生命周期归属，并在 V4 正式 Scene 中验证运行遮挡。

UI 布局参照按[场景与弹窗尺寸参照](../../cocos-game-ui-layout/references/layout-hierarchy.md#场景与弹窗尺寸参照)统一确定：全屏 UI 的父级是场景，按场景逻辑尺寸相对布局；弹窗有底板时，内容按底板对应功能容器的宽高相对布局；弹窗没有底板时，按宿主场景逻辑尺寸相对布局。弹窗底板容器本身相对场景定位，简单结构中底板 Sprite 节点可直接兼任容器根；全屏装饰背景仍是独立显示层。安全区约束关键内容的可见范围，不替换这三种尺寸参照。

效果图 V2 拆解与布局遵守[功能语义分组约束](../../cocos-game-ui-layout/references/functional-semantic-grouping.md)和[Cocos UI 节点组织](../../cocos-game-ui-layout/references/layout-hierarchy.md)：先在编号拆解图上确认功能归属、实际父级和独立位置参照，再由代理自动整理停靠方案并展示布局图/预览确认；不先发文字方案要求确认。位置依赖不强制直接父子：`parent_element_id`/`parent_layout_node_id` 表示真实功能、状态、交互、生命周期或布局管理归属；可选 `ui_layout.position_reference_id` 表示位置参照，省略时默认真实父级。共同表达同一信息的元素可同属功能组件并保持同级。简单“底板+图标+文本”优先由同一个底板节点兼任 `element_type=container` 和 `render_kind=sprite`，保留组件/placement 与图片资产身份，不拆成空根和底板叶子。只有真实独立职责才新增纯结构容器；它包裹可用底板与内容时须在 `ui_layout.independent_container_reason` 写明具体职责。父容器职责、布局所有者、尺寸、显式溢出、安全区和输入归属仍在技术合同中维护；禁止按类型、显示层序或最小几何包含关系自动归父级或加包装层。Widget 只在已确认的父/祖先参照和单一位置所有权下使用，兄弟参照、图文整体居中及 REFLOW/SCROLL 交给共享布局；按[Widget 定位策略](../../cocos-game-ui-layout/references/widget-layout.md)生成配置与尺寸权限。

<a id="mode-cocos-game-ui-layout--全局控制接入"></a>
#### 全局控制接入

位置参照根 `viewport`/`safe-area` 使用合成布局几何，不代表同名 Creator Node，也不能作为 Widget target，直接参照时由 `SHARED` 处理。`viewport` 使用当前完整逻辑视口；`safe-area` 使用整批节点统一的实际安全区矩形。已存在的实际 Canvas 等父/祖先节点才可作为 Widget target。位置与尺寸驱动器分开判定，Widget 定位和共享或自身 Layout 尺寸计算可顺序协作，只有同一属性出现多个并行写入者才是冲突；V4 组件快照规则见 [Widget 运行快照](../../cocos-game-ui-layout/references/widget-runtime-evidence.md)，完整策略见 [Widget 定位策略](../../cocos-game-ui-layout/references/widget-layout.md)。





Creator 编辑器、AssetDB、Scene/Node/Component、Prefab 和构建操作按[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)执行，并先读取实时工具 schema；不得手写 `.scene`、`.prefab` 或 `.meta` 绑定。AssetDB refresh/等待 `.meta` 不证明导入、子资源或脚本编译完成；构建面板打开和 worker ready 也不证明构建/预览成功。缺少真实结果时记录 pending/blocked。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-cocos-game-ui-layout--全局视口与高分屏合同"></a>
#### 全局视口与高分屏合同

项目公共布局策略文件（`schema_version=1.0.0`）统一保存可见 Scene、HUD、弹窗和 `DISPLAY_LAYER` 共用的 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr`、`scaleMode`、Camera、输入、安全区、resize、方向、文字/资源分辨率、性能预算、代表性视口与运行证据要求。effect-image 的 schema 2.0.0 UI 合同只引用该文件，不复制共享配置；普通 UI schema 1.2.0 按[普通 UI 模板](../../cocos-game-ui-layout/assets/ordinary-ui-layout-contract-template.yaml)维护其已有合同结构。`orientationPolicy.allowed` 声明项目支持的方向；`designResolutionPolicy` 只需提供这些方向的分支，`targets.orientations` 与其一致。竖屏以 1080×1920 为设计基准并按宽度适配，横屏以 1920×1080 为设计基准并按高度适配；另一轴随视口展开或裁切。Canvas 填满 CSS 视口，装饰性背景等比 cover，禁止黑边。Canvas backing 由 CSS 尺寸乘有效 DPR（向上取整）得到，物理像素不得直接用于布局或命中。

运行时 DPR 从设备动态读取，非法输入回退 1，正有限值封顶 2，且必须覆盖 resize、显示密度变化以及双方向项目的方向切换并清理监听器。资源生产 DPR 固定基线为 1（逻辑尺寸 1:1），必须与运行时 DPR 分离。Creator `scaleMode` 按冻结设计分辨率选择 `FIXED_WIDTH`、`FIXED_HEIGHT` 或有实测证据的 `custom`；实施包必须证明实际设计视口、Camera 映射、Canvas/backing 尺寸、输入变换和 DPR 的关系，不能只靠声明模式或构建面板状态认定高分屏适配通过。弹窗默认继承宿主逻辑视口、DPR、安全区、Camera 和输入合同，V4 必须独立记录其运行轨迹。

<a id="mode-cocos-game-ui-layout--视觉语言默认原则"></a>
#### 视觉语言默认原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

图片还原默认使用 `Sprite.SizeMode.RAW`，保留已验收 SpriteFrame 的完整未裁切原尺寸；运行时 `UITransform.contentSize` 等于正式 SpriteFrame 原尺寸，不将布局 bounds 写入普通图片的内容尺寸。RAW 保护不禁止 Node `scale`、缩放动画或非单位 SHARED 坐标变换，视觉 bounds 仍按几何合同独立验收；普通底板兼任父容器时也保留自身 RAW 图片尺寸计划。只有已冻结采用九宫格的图片使用 `Sprite.Type.SLICED` 与 `Sprite.SizeMode.CUSTOM` 并设置目标宽高。九点停靠由水平/垂直对齐、锚点和偏移表达，只描述位置意图，不是九宫格拉伸，也不触发切片或 CUSTOM。布局容器、文字与命中区域的尺寸独立管理，具体写入与重排边界见[Cocos 适配器](../../cocos-game-ui-layout/references/cocos-adapter.md#图片原尺寸与九宫格尺寸)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-cocos-game-ui-layout--核心流程"></a>
#### 核心流程

正式场景的布局校准与关键几何验收读取[布局校准与参考还原](../../cocos-game-ui-layout/references/layout-calibration.md)。V4 直接消费冻结 V2 布局与 V3 正式资源，在实际 Cocos Scene 中调整并复验受影响范围；布局矩形与素材可见边界分别检查，不能用可用性通过代替参考还原。

1. 读取项目的 GDD/TDD、当前候选、总控审核漏斗和适用视觉阶段；确定稳定 UI ID、坐标空间、参照物、状态与平台输入。
2. 普通 UI 使用 schema 1.2.0 [普通合同模板](../../cocos-game-ui-layout/assets/ordinary-ui-layout-contract-template.yaml)；effect-image 使用 schema 2.0.0 [引用式合同模板](../../cocos-game-ui-layout/assets/ui-layout-contract-template.yaml)，精确字段见[JSON Schema](../../cocos-game-ui-layout/references/ui-layout-contract.schema.json)，并按[项目公共策略模板](../../cocos-game-ui-layout/assets/project-ui-layout-policy-template.yaml)建立共享策略。V2 分组、真实父子、定位参照、`ui_layout`、位置/尺寸权限、中心策略、RAW/九宫格计划和 `layout_execution` 只保存在同批 `layout-nodes.json`，由 scene contract 的 `layout_decomposition.layout_source.nodes_file` 指向。节点坐标由文件的 `doc.viewport` 统一定义；UI 引用合同不内联节点树或运行快照；annotation/confirmation 只记身份与图像确认依据，且其 `layout_nodes_file` 必须与 source 路径一致。Stage A proposal 是历史确认输入；Stage B decision 是生成输入。用户按图要求改变分组或父子时，从新的 Stage A 确认重生成；布局 PNG、`review.html` 和快照是只读投影，不回写 proposal，也不能另存手工事实。两次人工图像确认保持独立。
3. V3 正式资源验收后直接进入 V4：按[正式场景视觉还原与校准](../../cocos-game-asset-integration/references/visual-alignment-authoring.md)从 scene contract 引用的 V2 `layout-nodes.json` 读取唯一布局事实，并消费 V3 验收资源，在正式 Scene 接入实际交互、动态数据和 required state。坐标、尺寸和响应式调整写入正式布局配置；改变确认的分组、父子或定位事实时回到 V2 重生成、重确认。具体 Cocos 视口、Camera、输入与幂等重排规则见[Cocos 适配参考](../../cocos-game-ui-layout/references/cocos-adapter.md)。
4. schema 2.0.0 默认以 V2 检查：`node scripts/validate_ui_layout_contract.mjs <ref-contract> --project-root . --stage V2`（`--stage` 默认 `V2`）。V4 可运行 `node scripts/validate_ui_layout_contract.mjs <ref-contract> --project-root . --stage V4 --check-files`；引用合同、公共策略、场景合同和唯一 layout source 始终真实读取，`--check-files` 再检查对应正式文件证据。纯函数测试才可显式注入 Map，不能用于正式文件门自证。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

正式场景依据项目现有 Cocos Scene 结构和布局合同实现。V2 锚点、父子 bounds、资源 origin 与 Cocos 父级局部坐标分别处理，祖先偏移只累计一次。V4 直接加载已验收资源并在真实 Cocos Scene 中组合；背景覆盖按实际可见视口计算，图片按冻结 fit/裁切规则呈现，不能缩进安全区、留边或平移露出空隙。图片 fit 和 Cocos 文字字段按适配参考执行；资源/字体未就绪、布局或渲染异常必须令运行验收失败。Scene 创建、唤醒和 resize 使用同一幂等布局入口；发布画面不含编辑辅助内容。运行证据来自正式场景的实际消费与画面。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-cocos-game-ui-layout--effect-image-场景绑定"></a>
#### effect-image 场景绑定

当 Work Item 的 `effect_image_reconstruction.applicability=effect-image` 时，独立 UI 合同只以 `scene_contract_file` 引用场景合同。场景的 `layout_decomposition.layout_source` 必须仅含 `nodes_file`，并指向同批已确认 `layout-nodes.json`；annotation 与 confirmation 各自只保留身份/证据，其 `layout_nodes_file` 必须与该路径逐字匹配。禁止在 UI 合同或 scene contract 复制 `layout_nodes`/`layoutNodes`、`regions`、`scope.ui_ids`、`fidelity` 或运行快照。项目范围的 viewport/DPR/Camera/input/safe-area/resize/方向/文字与资源/性能/`targets`/`coordinate_spaces` 放在 `project_policy_file`；场景级 V2 事实留在唯一节点源，scene contract 中的绑定与确认对象只引用其身份及证据。V2 节点直接进入 V3/V4 还原；其他 viewport 默认验证确认的不变量和可用性，只有 `visual_validation.mode=exact` 或明确精确需求时才要求目标 viewport 的严格还原。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

效果图布局源按其正式格式保存父子、定位参照、父框相对关系、锚点、双轴停靠、目标几何和偏移；不在 UI 引用合同或 scene contract 再写一份字段清单。文件的 `doc.viewport` 定义唯一逻辑坐标空间。拆解确认后，智能布局结合原图构图、视觉重心和元素语义，为每个元素显式判断水平 `left/center/right` 与垂直 `top/center/bottom`；中心轴按[严格居中、中心参照与组合居中](../../cocos-game-ui-layout/references/center-alignment.md)决定是否保留偏移。该判断不能由四边距离自动反推。相对位置始终按实际父框测量；只有 `ui_layout.visual_overflow.reason` 明确声明时，子项才可超出非根父框，父框尺寸不扩大。定位偏移与锚点按有效定位参照和轴向决策计算。省略 `position_reference_id` 时使用真实父级；显式参照可指向同 scene/state 的兄弟节点（可为叶子）、祖先节点或稳定根 `viewport`/`safe-area`，不允许跨分支引用任意叶子。父框和参照框由同一节点源的目标几何确定。父边和定位参照边合并后不得有环，viewport、安全区、裁切和交互约束继续有效。视觉决策文件及其 ID 会进入布局图和确认记录，缺失决策必须阻断布局生成。

<a id="mode-cocos-game-ui-layout--资源导航"></a>
#### 资源导航

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。
- 需要严格居中、带理由的中心偏移或图文组合整体居中时，读取 [references/center-alignment.md](../../cocos-game-ui-layout/references/center-alignment.md)。
- 需要判断 Widget 是否适用、选择位置驱动器或确认拉伸尺寸权限时，读取 [references/widget-layout.md](../../cocos-game-ui-layout/references/widget-layout.md)。
- 需要 Creator `Canvas`、`UITransform`、`Widget`、`Camera`、坐标转换、resize 或重排边界时，读取 [references/cocos-adapter.md](../../cocos-game-ui-layout/references/cocos-adapter.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-cocos-game-ui-layout--所有权与输出"></a>
#### 所有权与输出

布局技能输出合同版本、布局计算输入/输出、不变量和证据索引。玩法继续独占规则、状态和交互；架构维护坐标空间与模块边界；美术维护纯表现资源和预制数据；QA 只读验证可达、截断、遮挡、触控、滚动和证据。布局计算与 Node/UITransform 运行测试验证关系不变量，不把孤立绝对坐标当作通用验收标准。汁水感任务可按需参考[动态反馈设计指南](../../cocos-game-juice/references/design-guide.md)；反馈对象的视觉偏移应使用独立表现偏移，不覆盖布局合同中的基础位置、焦点和坐标所有权。

<a id="mode-cocos-game-ui-layout--本栈配套资料"></a>
#### 本栈配套资料

- [references/layout-calibration.md](../../cocos-game-ui-layout/references/layout-calibration.md)
- [references/layout-review-artifacts.md](../../cocos-game-ui-layout/references/layout-review-artifacts.md)
- [references/evidence-matrix.md](../../cocos-game-ui-layout/references/evidence-matrix.md)
- [references/workflow-gates.md](../../cocos-game-ui-layout/references/workflow-gates.md)
- [references/layout-hierarchy.md](../../cocos-game-ui-layout/references/layout-hierarchy.md)
- [references/display-object-layering.md](../../cocos-game-ui-layout/references/display-object-layering.md)
- [references/layout-contract.md](../../cocos-game-ui-layout/references/layout-contract.md)
- [工作流门禁](../../cocos-game-ui-layout/references/workflow-gates.md)
- [证据矩阵](../../cocos-game-ui-layout/references/evidence-matrix.md)
- [拆解时确定九宫格](../../cocos-game-asset-integration/references/nine-slice-ui.md)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md)
<!-- native-source:cocos-game-ui-layout:end -->


## 项目整理与产物清理

<!-- native-source:cocos-game-artifact-cleanup:start -->
<a id="mode-cocos-game-artifact-cleanup"></a>

<a id="mode-cocos-game-artifact-cleanup--cocos-creator-3x-记录与中间产物清理"></a>
### Cocos Creator 3.x 记录与中间产物清理

<a id="mode-cocos-game-artifact-cleanup--全局控制接入"></a>
#### 全局控制接入

清理范围、路径所有权、验证证据与状态迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能只维护清理对象判定、引用保护和本栈资源边界。

用户要求清理时，在 Work Item 允许路径内处理已确认的本地产物，不重复请求普通本地操作批准。阶段收尾只处理本任务临时文件；历史记录、其他任务和共享目录不自动纳入。外部写入、设备、签名、上传、付费、破坏性操作或发布等具体副作用，须把精确动作和目标绑定到 Work Item 的明确用户批准。

清理会影响 Creator AssetDB、资源绑定、Scene/Node/Component 或 Prefab 时，先按[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)核对当前工具 schema 并经 MCP 执行支持的操作；不手写 `.meta`、`.scene` 或 `.prefab`，也不以直接删文件模拟编辑器删除。当前 MCP 无相应操作时，保留目标并报告 pending/blocked。

<a id="mode-cocos-game-artifact-cleanup--判定边界"></a>
#### 判定边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#判定边界)。

| 文件类别 | 默认处理 |
| --- | --- |
| `.workflow-control/work-items/`、审批账本、状态迁移/返工记录 | 保留；终态也不自动删除，历史记录支撑追踪和审计 |
| 控制面中的实施包、执行状态、Result、Evidence Manifest、验证清单和路径/归属绑定文件 | 按 `.workflow-control/` 下工具实际路径保留，包括 `user-resolutions/` 视觉确认账本与回执；失效不等于可删 |
| V2 拆解与布局确认、V3 正式资源/生产记录、V4 实现与运行证据 | 保留完整依赖闭包，包括原图、JSON、审阅页、运行证据及宿主上下文 |
| 明确属于本任务的临时日志、临时导出、失败候选、重复预览、可再生成构建或缓存 | 证明无引用、无运行占用且可再生成后，纳入清理清单 |
| 源码、正式资源、源素材/视频、用户交付物、锁文件、测试夹具、发布产物 | 默认保留；不是一般中间产物 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

`output/intermediate/<workItemId>/<stageId>/<attemptId>/` 与 `output/candidates/<workItemId>/<stageId>/<candidateId>/` 是逐文件核对的临时目录，不是整目录删除授权。`docs/confirmed/` 的确认版本、`assets-source/` 的生产输入、Creator `assets/` 的正式资源及 `.meta`、根级 `evidence/<workItemId>/reviews/` 与 `validation/` 的人工作业文件，以及 `.workflow-control/` 真实 `evidenceRoot` 下的机器证据分别判定并保留依赖；目录本身不证明通过、无引用或可删除。根级 `evidence/` 不是机器 `evidenceRoot`，受限字段不能引用其外部路径。已冻结文件和机器记录按原路径保留，清理不能批量搬迁或自动改写引用；正式资源删除继续遵守 Creator MCP 与 AssetDB 约束。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

<a id="mode-cocos-game-artifact-cleanup--清理流程"></a>
#### 清理流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
4. **执行前复核**：按 Work Item 的允许/禁止路径核对清单，运行公共控制 CLI `check`；逐对象确认实际动作、引用和写入占用。公共控制器没有清理专用动作预检命令；受保护副作用必须由 Work Item 绑定精确用户批准。删除前重新检查引用，并用内部内容摘要防止并发写入后误删；这是删除事务保护，不是验收校验，不要求工件填写 SHA。清单生成后内容或依赖变化时跳过该对象并重新判定。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

<a id="mode-cocos-game-artifact-cleanup--路径与恢复"></a>
#### 路径与恢复

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#路径与恢复)。

<a id="mode-cocos-game-artifact-cleanup--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#结果报告)。
- 控制面复核结果、剩余不确定性和需用户决定的范围外项。

只盘点时明确说明未执行删除；没有可靠字节统计时不宣称释放空间。清理不改变原任务的阶段或证据有效性，最终交回控制面并按当前 Work Item 报告本任务差异。

<a id="mode-cocos-game-artifact-cleanup--本栈配套资料"></a>
#### 本栈配套资料

- [最小提交集](../../cocos-domain-contracts/references/minimal-git.md)
- [产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)
- [控制模型](../../cocos-domain-contracts/references/control-model.md)
<!-- native-source:cocos-game-artifact-cleanup:end -->


## 图片优化

<!-- native-source:cocos-game-image-optimization:start -->
<a id="mode-cocos-game-image-optimization"></a>

<a id="mode-cocos-game-image-optimization--cocos-creator-3x-图片资源优化"></a>
### Cocos Creator 3.x 图片资源优化

Creator 资源导入/刷新、AssetDB 查询、场景引用核验和编辑器构建必须遵循[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)，按实时 `tools/list` schema 操作；只允许纯原始图片处理使用本地文件工具，不手写 `.meta`、`.scene` 或 `.prefab` 绑定。刷新等待和构建面板打开不证明资源导入或构建完成，必须读回资源并取得真实结果；缺能力时把受影响验证标记为 pending/blocked。

<a id="mode-cocos-game-image-optimization--全局控制接入"></a>
#### 全局控制接入



显式调用只触发提案，不等于授权写入。所有盘点、候选生成、替换和验证都必须进入 [`app-workflow-control`](../../app-workflow-control/SKILL.md)；本 Skill 不拥有全局状态或审批，不得旁路 diff 审计与证据门。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化目标)。

<a id="mode-cocos-game-image-optimization--执行边界"></a>
#### 执行边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。
- 将本任务视为显式触发的资源领域任务，并按实际动作纳入 A0-A3、本地阶段与统一门；不得自动加入构建脚本、Git 钩子或 CI，也不得由发布状态隐式触发。
- 默认只处理项目内被运行时代码、资源清单或加载配置引用的 PNG、JPEG 和 WebP。设计源文件、参考图、审核证据、截图、测试夹具、构建产物、缓存以及未被运行时引用的素材不在范围内。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。

<a id="mode-cocos-game-image-optimization--优化流程"></a>
#### 优化流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化流程)。
7. 只有候选体积更小且全部适用验证通过时才替换原文件；任一验证失败、体积不降或收益不足以抵偿画质与兼容风险时保留原文件。替换后再次核对引用与版本控制差异，确保修改范围仅包含获准资源及必要引用。

<a id="mode-cocos-game-image-optimization--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#结果报告)。
<!-- native-source:cocos-game-image-optimization:end -->


## 游戏广告接入

<!-- native-source:cocos-game-ad-integration:start -->
<a id="mode-cocos-game-ad-integration"></a>

<a id="mode-cocos-game-ad-integration--cocos-creator-3x-applovin-max-广告接入"></a>
### Cocos Creator 3.x AppLovin MAX 广告接入

<a id="mode-cocos-game-ad-integration--适用范围与硬边界"></a>
#### 适用范围与硬边界

本 Skill 只处理 Cocos Creator 3.x 原生构建中的 Banner、插页与激励视频。业务流程、状态和验收以唯一细则合同 [AppLovin MAX 接入合同](../../cocos-game-ad-integration/references/applovin-max-contract.md)为准。

- Web、浏览器预览和小游戏不加载原生 SDK，也不请求 MAX 广告；能力显式返回 `unsupported-platform`，游戏继续运行。
- 原生端由项目维护的 Cocos 原生插件/适配层调用 AppLovin 对应平台的 MAX 原生 SDK；实际初始化、完成回调、幂等状态和初始化重试统一由[SDK 统一初始化](../../cocos-game-architecture/references/sdk-initialization.md)编排。Cocos 场景只能调用共享 TypeScript 门面，不直接调用 Android/iOS SDK，也不依赖 Web 容器适配层。
- JS/native 消息使用目标 Creator 3.x 官方支持的桥接方式；若使用 `native.bridge`，须按 Creator 版本文档遵守字符串负载、单一 `onNative` 监听器和单向 `sendToNative` 语义。桥接收到命令不等于原生操作成功，状态通过带关联 ID 的异步事件回传。项目的 MCP 工具调用和 Creator 资源写入边界见[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)。
- 不得在 Cocos 场景或普通业务组件中持有 SDK key、广告网络凭证、MAX 原生对象或原生宿主 View。SDK key 与 ad unit ID 由受控分环境构建配置注入原生适配层；账号凭证与 Ad Review key 不进入客户端。
- 初始化和加载不得阻塞场景切换、输入、结算或主循环。插页与激励视频静默预加载；全屏展示只在自然中断点按当前就绪状态尝试。Banner 按请求创建/加载，只有已就绪且区域安全时显示。
- 每个广告位独立维护状态、失败计数、deadline 和至多一个重试任务；加载/重试静默。奖励只由匹配的激励回调异步发放并保证幂等；视频不可用或展示失败时通过统一 UI 显示一次本地化提示。
- MAX 内建 Terms and Privacy Policy Flow 在初始化前关闭；新实例首次初始化前由统一初始化入口设置 `hasUserConsent=false`。该值是 MAX 配置，不是用户回执，也不单独阻断广告请求；真实 CMP/TCF、地区、网络和 ATT 要求继续按官方文档处理。具体配置和隐私门以细则合同为准。

<a id="mode-cocos-game-ad-integration--全局控制接入"></a>
#### 全局控制接入

本领域可在当前 Work Item、Implementation Package、A 等级和允许路径内提出、审查并实施广告方案；任务范围、控制状态和证据由 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 维护。本领域的结论、变更、验证和阻断项回到控制面登记复核。涉及外部写入、付费、真机、商店提交、破坏性操作或发布的 A4-A6 行为，必须逐项取得控制面批准。

涉及 Creator 编辑器、AssetDB、Scene/Node/Component、Prefab 或构建的操作必须遵守[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)并实时读取工具 schema；不得手写 `.scene`、`.prefab` 或 `.meta` 绑定。只有拿到实际构建结果才能报告构建通过；若 MCP 只打开构建面板或报告 worker ready，则记录 pending/blocked。

<a id="mode-cocos-game-ad-integration--接入流程"></a>
#### 接入流程

1. 读取 Work Item、Creator 版本、TDD、依赖能力档和原生目标配置；确认目标原生插件/SDK 与 Android/iOS 构建环境的版本、许可、权限、生命周期和失败语义。先查项目已有实现，避免重复引入 SDK。初始化任务需登记到统一的 `assets/scripts/platform/initialize-sdks.ts`，广告服务只管理 SDK 就绪后的广告位状态和加载恢复。
2. 先阅读[唯一运行合同](../../cocos-game-ad-integration/references/applovin-max-contract.md)，冻结公开业务门面、广告位状态所有权、自然中断点、广告展示时序、隐私边界和奖励幂等规则。广告属于可选商业能力，不得成为 Cocos Web 核心循环前置。
3. 按目标 Creator 版本的[原生插件文档](https://docs.cocos.com/creator/3.8/manual/en/native-development/native-plugin/)与[JSB 桥接文档](https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/js-oc-bridge.html)实现平台适配。Creator 编辑器和项目资源操作按上面的 MCP 协议执行。
4. MAX 原生 API 按平台官方集成文档核对，不把其他引擎或跨平台框架的同名 API 当作 Cocos API。Android 官方示例使用 `AppLovinSdkInitializationConfiguration`、`AppLovinSdk.getInstance(context).initialize(...)`；初始化由唯一初始化模块调用。插页 `MaxInterstitialAd` 与激励 `MaxRewardedAd` 通过 `loadAd()`、`isReady()`、相应 `showAd(...)` 和官方 listener 管理，奖励以 `onUserRewarded(...)` 为准。Banner 使用 `MaxAdView`、listener 和原生 View 层级。iOS 使用对应官方原生 SDK API，并按当前 SDK 版本验证；不要凭类名推导桥接接口。
5. 将 MAX 初始化、广告加载/展示/隐藏/奖励和 Banner 布局事件映射为带 `requestId`/实例代次的结构化异步消息。Creator `native.bridge.sendToNative` 无操作结果返回值，不能用它的返回值假定 SDK 已接受或完成调用；注册唯一 JS 监听器并在适配层分发事件。
6. 先做静态审查、Android/iOS 原生编译和状态机单测，再在当前已批准范围内运行平台集成验证。使用 MAX Test Mode 与 Mediation Debugger 分广告位、格式和网络核验。若 MCP 构建接口仅打开 Creator 构建面板或报告 worker ready，不算真实构建通过；须取得实际构建输出，否则记录 pending/blocked。真机、真实流量、商店提交、控制台写入和发布依照控制面逐对象审批，不由本 Skill 自动发起。
7. 把候选 diff、脱敏平台日志、状态与退避轨迹、合规证据和未覆盖目标提交给 `$app-workflow-control`。局部验证不得冒充全平台通过。

<a id="mode-cocos-game-ad-integration--官方参考"></a>
#### 官方参考

- [Cocos Creator 3.8 原生插件](https://docs.cocos.com/creator/3.8/manual/en/native-development/native-plugin/)
- [Cocos Creator 3.8 JS/原生桥接](https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/js-oc-bridge.html)
- [AppLovin Android MAX SDK 集成](https://developers.applovin.com/en/max/android/overview/integration/)
- [AppLovin Android 插页广告](https://developers.applovin.com/en/max/android/ad-formats/interstitial-ads/)
- [AppLovin Android 激励广告](https://developers.applovin.com/en/max/android/ad-formats/rewarded-ads/)
- [AppLovin Android Banner/MREC](https://developers.applovin.com/en/max/android/ad-formats/banner-and-mrec-ads/)
- [AppLovin iOS MAX SDK 集成](https://developers.applovin.com/en/max/ios/overview/integration/)
- [AppLovin iOS 插页广告](https://developers.applovin.com/en/max/ios/ad-formats/interstitial-ads/)
- [AppLovin iOS 激励广告](https://developers.applovin.com/en/max/ios/ad-formats/rewarded-ads/)
- [AppLovin iOS Banner/MREC](https://developers.applovin.com/en/max/ios/ad-formats/banner-and-mrec-ads/)
- [AppLovin Android Terms and Privacy Policy Flow](https://support.applovin.com/en/max/android/overview/terms-and-privacy-policy-flow)
- [AppLovin iOS Terms and Privacy Policy Flow](https://support.applovin.com/en/max/ios/overview/terms-and-privacy-policy-flow)
<!-- native-source:cocos-game-ad-integration:end -->


## 视觉素材生产

<!-- native-source:cocos-game-asset-integration:start -->
<a id="mode-cocos-game-asset-integration"></a>

<a id="mode-cocos-game-asset-integration--cocos-creator-3x-游戏美术生产与接入"></a>
### Cocos Creator 3.x 游戏美术生产与接入

<a id="mode-cocos-game-asset-integration--全局控制接入"></a>
#### 全局控制接入





<a id="mode-cocos-game-asset-integration--creator-编辑器与-assetdb-边界"></a>
#### Creator 编辑器与 AssetDB 边界

Scene、Node、Component、Prefab、AssetDB、构建等 Creator 操作必须通过[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)；每次以实时 `tools/list` schema 为准。不得手写 `.scene`、`.prefab` 或 `.meta`，也不得直接伪造 UUID/子资源绑定。对同一编辑器项目保持唯一活动写入者，禁止多个代理并行写编辑器状态。

正式资源的目录位置遵循[项目目录规范中的资源与引用规则](../../cocos-game-architecture/references/project-structure.md#资源与引用)：普通 UUID 引用资源放入按类型或功能域规划的目录；只有明确通过 `resources.load/loadDir` 按路径加载时才放入 `assets/resources/`。Asset Bundle 按自身目录与加载机制管理，不因运行时加载而迁入 `resources/`。

批量资源按以下边界处理：

1. 一次性完成本批次原始文件导入/写入，再调用 MCP AssetDB refresh 并等待批次完成。`assetAdvanced_refresh_assets_and_wait` 只等待 `.meta` 文件出现；它不证明资源已成功导入、没有 invalid 状态、子资源正确或脚本编译通过。`assetAdvanced_query_asset_db_ready` 是执行 AssetDB 操作前的就绪检查。
2. 对每个必需资源做有界核验：用 `project_get_asset_info({assetPath})` 检查导入状态/类型，用 `project_query_asset_uuid({url})` 核对 UUID；SpriteFrame 等子资源身份通过协议提供的只读 sidecar 查询。必须满足资源已导入、未 invalid，类型和 UUID 与合同一致，所需子资源存在；未就绪前不得绑定或保存。
3. 本批次含脚本时，等待 Creator 正常编译，再用 `debug_get_console_logs({limit, filter:'error'})` 检查实际编译/加载错误。没有独立脚本编译 MCP 工具；`attach_script` 只负责挂脚本，不能当作编译证据。
4. 批次全部就绪后才将已核验的 UUID/子资源绑定到 Scene/Prefab。按实施包最小范围保存，并立即读回节点、组件、属性和引用，逐项断言持久化内容正确；读回不符则不能进入下一批。

MCP 若提供的 Build/Preview 操作只打开构建面板或报告 worker ready，应按协议记为面板已打开/worker 就绪，不能报告实际构建或预览通过。真实运行/构建结果拿不到时，只把受影响验收标记为 pending/blocked。

<a id="mode-cocos-game-asset-integration--工作流"></a>
#### 工作流

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-cocos-game-asset-integration--场景还原合同effect-image-强制"></a>
##### 场景还原合同（effect-image 强制）

V2 拆解先遵守[功能语义分组约束](../../cocos-game-ui-layout/references/functional-semantic-grouping.md)：确认区域、功能组件、部件和独立元素的功能归属及理由，再分别记录真实父级与位置参照。位置依赖方不必成为被参照元素的直接子项；`parent_element_id` 表达功能/状态/交互/生命周期或真实布局管理归属，可选 `ui_layout.position_reference_id` 表达定位依据，省略时默认实际父级。共同表达同一信息的元素可同属组件并保持同级。简单“底板+图标+文本”优先由底板 Sprite 节点兼任容器根，使用 `element_type=container`、`render_kind=sprite`、`kind=component|region` 并保留自身 `component_id`/`placement_id` 图片身份；不拆成空根和底板叶子。只有确有独立职责时才新增纯结构容器；若它包裹可用底板和内容，必须填写 `ui_layout.independent_container_reason`。布局不得按文字类型、元素类别、显示层序或几何包含重新分组，也不得为满足校验增加包装容器；归属不明留在拆解确认，不自动生成可放行布局。中心轴严格居中、显式中心偏移、图文组合整体居中及位置确认规则按[居中策略与组合定位](../../cocos-game-ui-layout/references/center-alignment.md)执行。Widget 适用条件、参照、唯一位置驱动器及尺寸授权按[Widget 定位策略](../../cocos-game-ui-layout/references/widget-layout.md)执行；拆解图的位置只提供测量，不能替代停靠意图确认。明确视觉溢出、RAW 原尺寸及九宫格尺寸规则按 UI 布局参考执行。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。
3. foundation-only 基础实施完成后，V1 建立功能规格、玩法视觉契约、必要低保真/灰盒与预算，只定义契约，不写正式场景功能代码；Work Item 指定效果图为还原目标时，V1 同时按[视觉还原](../../cocos-game-asset-integration/references/visual-reconstruction.md)生成或接收并冻结 scene master/reference target、宿主上下文效果图、参考身份、对比条件、可观察视觉事实和初步还原草案。需求或基线已明确时，V1 记录 `AUTO` 并直接提供场景目标/宿主上下文预览；只有产品方向、玩法语义或结构存在实质歧义时才询问。V2 保持“拆解图确认 → 布局图确认”的串行硬门：阶段 A 在内部完成状态分析、组件/placement、生产路线、技术 JSON 与 `decomposition_elements`，直接展示按确认顺序编号的拆解 PNG，只请用户看图确认；技术记录供代理和机器门使用，不另行要求阅读或确认。阶段 B 在拆解图确认后自动生成逐元素对齐决策和唯一 `layout-nodes.json`，并生成布局 PNG 与 `review.html`；scene contract 的 `layout_decomposition.layout_source.nodes_file` 直接引用该节点文件，布局 annotation/confirmation 只记录身份和图像证据。用户直接检查最终布局图/预览并独立确认；Stage A proposal 是历史确认输入，Stage B decision 是生成输入，PNG/review/派生快照仅为只读投影。分组或父子关系要改时从 Stage A 原规则更新、重生成并重新确认，不在 UI/scene contract 中维护第二份节点树，也不回写 proposal。无需先提交文字布局方案；布局只在冻结原图上叠加父子框与说明，不重新生成或替换视觉参考图，也不提供多个布局方案。
4. schema 1.5 `visual-assets.json` 先声明 `effect_image_reconstruction`：普通资产为 `not-applicable`，不要求还原工件；效果图还原为 `effect-image`。后者冻结目标后、进入 V3 前以 `v2-ready` 完成合同回对和 coverage，V2/V3 可暂无 fidelity case；只有 V4 验证完成才为 `v4-complete` 并要求全部 case 通过。效果图 coverage 逐区登记 `annotation_number` 与 `implementation_plan`，先完成 ownership/实现分类，再做带实际证据文件、冻结目标文件、分析 ID 和完成时间的 `state_analysis`，严格在 component inventory 之前完成，最后按唯一原子部件填写 `component_inventory`、placements 与 `expected_assets`；编号不是资产数量单位。视觉来源与装配方式必须分开：`visual_route_analysis` 只能在独立 coverage region 上选择 `image-asset` 或 `cocos-native`，`assembly_analysis` 再独立声明原子 Scene 装配、禁止整屏捕获并允许独立图片资产；不得从“不能整屏贴图”推导 `runtime-program`。如果同一视觉事实同时包含程序逻辑与独立视觉资产，必须回到 V1/PROPOSAL 重新划分 coverage/annotation：图片外观进入独立 image-asset region，程序行为进入独立 cocos-native/runtime region，分别进入各自生产与运行逻辑合同。禁止使用单一 `composite` region 或 `composite_parts` 在一个区域内闭环生产、验收。全部区域均为 `cocos-native` 时必须提供绑定目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`，文件门会读取实际文件并逐区核对资格事实。状态分析必须覆盖普通、selected/active、disabled、pressed/hover、victory/defeat/paused，实际适用写 `required`，不适用写 `not-applicable+reason`。② 顶部 6 个按钮必须 6 个 component；⑧ 的 3 个相同底部表面可登记 1 个 component+3 个 placements，⑨ 的动作图标按实际复用关系登记；③、④、⑦ 只有在明确单部件且其余状态不适用时才保持单图。默认 individual 模式禁止横向组图；`image_generation_required=true` 的生成式位图使用 `individual + atlas_allowed=false`，其 `expected_assets.width/height` 由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，必须精确为最小尺寸；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 必须为 `none`，尺寸合同本身不需要 human_review。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 按设备动态读取并封顶为 2。历史 1.5/2 倍生产证据须重生成或标记 `stale`。其他生产方法只有在显式合同下才能使用完整 `atlas_slice` 图集。每个 placement 必须声明 `interaction_required`，真实 `interaction_hotspots` 只能按 placement 一一绑定且不计入视觉资产。确认图仍同时呈现 `generate-now`、`reuse-existing` 和 `runtime-program`，但 PNG 仅绘制用户摘要与“新建图片资产 / 复用现有图片 / 程序绘制或动态逻辑”标签；placement ID、坐标尺寸、组件/状态/资产技术字段不进入可见行。运行 `--proposal` 时，这些技术字段完整写入拆解分析技术 JSON，并与 PNG 元数据、实际区域定义及现有 confirmation 业务字段绑定。系统按提示词、参考输入、材质、透明需求和可用能力决定是否使用图像生成；`independent-production` 与 `generate-now` 不作任何生成器推断。V2 再按 [资产生产路线](../../cocos-game-asset-integration/references/asset-production-routes.md) 选择路线。
   路线按可观察视觉事实和 Cocos 实际渲染能力判断，不按“按钮”“面板”等语义，也不以静态/动态作为唯一条件。文本、纯色矩形、基础几何、规则边框、可确定性表达的简单规则渐变、遮罩和进度填充，在 Cocos 原生能力可精确表达冻结外观时可选 `cocos-native`；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰使用独立图片路线。原生路线冻结 `native_suitability.render_contract` 的 renderer、尺寸、颜色、线宽、圆角、渐变、透明度、适用状态和不支持特征；无法支持的视觉特征必须阻断，不能近似替代后通过。
   图片、图片局部和文字先按[完整拆解与视觉显著性](../../cocos-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)登记可独立部件，保持功能、交互与状态联动；明显美术外观优先位图，低显著性操作文字考虑系统文本，简单填充考虑原生绘制。再核对[完整程序还原资格](../../cocos-game-asset-integration/references/asset-production-routes.md#程序还原资格与位图回退)：程序必须完整实现方案要求保留的外观；主体与效果无法可靠分离时保留完整原子视觉部件。动态/本地化文字按[文字路线判定](../../cocos-game-ui-layout/references/layout-contract.md#文字路线判定)保留可变能力，不在实现时静默简化已确认的美术效果。
   色彩填充同样按[色彩填充路线判定](../../cocos-game-asset-integration/references/asset-production-routes.md#色彩填充路线判定)拆分：明显材质和光影保留独立位图，有风格的重复表面优先复用贴图，低显著性基础填充考虑原生绘制；动态比例和状态仍保持可变，不能把填充与边框、辉光或纹饰混作纯色区域。
   外观来源与行为装配分别记录和绑定；例如按钮可由原生框体、独立图标图片和 Creator `Label` 文字组成，并通过明确组件/节点引用接入交互，不合并为 `composite` 区域。`image_generation_required=true` 一经冻结不得自动换成原生路线，只能遵循明确接受的 Change Request 变更。
5. V2 可运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V2`；V3 正式验收运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V3 --check-files --project-root .`，V4 正式验收运行同命令但使用 `--stage V4`。独立弹窗工作项必须额外传入 `--work-item-type DISPLAY_LAYER`，场景工作项默认按 `SCENE` 校验；该参数只改变显示层作用域，不把弹窗纳入宿主场景验收。V3 逐项验证真实资源文件、来源/许可信息（如适用）、预算、冻结基线、coverage 和 `production_contract_audit`；V4 验证正式 Scene 消费、运行组合、F2 两类机器证据、F3 runtime replay 与适用 fidelity cases。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

透明路线由 `expected_assets.transparency_requirements` 冻结策略与 `edge_profile`。只有 `hard-edge` 且主体与纯色背景明显区分时才可走 `background-removal`；复杂边缘禁止阈值去背。`direct-alpha` 必须匹配已验证的工具、版本和边缘类型，并用 PNG 解码证明真实透明像素；generation record 顶层 `generator/generator_version` 是实际身份，`capability.tool/tool_version` 必须与之相同。`mask-composition` 必须绑定独立遮罩或人工创作的实际输入和工具参数。能力不足时报告缺口，不提高容差、硬抠轮廓、删除光效或伪造结果。生成记录按实际路线登记生成器身份、参数、输入/输出 SHA 和后处理；归一化保持比例、Alpha 和主体边界，并禁止把棋盘格预览烘焙进素材。每个候选都生成浅底与深底预览，V4 完成主体缺损、残留背景、色边和半透明区域的视觉检查。已有真实透明图按资源复用合同接入，不伪造生成或去背记录。`image_generation_required=true` 的冻结合同不能由透明路线判断或提示词生成器自动替换。
7. V2 前的灰盒或视觉样片必须与正式运行链隔离，不得注册正式入口或实现正式业务逻辑；V2 确认后生产 V3 正式资源；V4 在正式 Cocos Scene 中实现功能并消费已验收资源，禁止一次性截图 Scene、整屏铺图、隐藏覆盖层和绝对叠层凑像素。V4 在正式功能实现之后与玩法协作完成结构化集成、动态验收和低保真清理；上游事实或当前受影响候选身份变化时才使对应 fidelity case 失效重采，其他单元证据继续有效。

正式效果图标注命令必须带 `--proposal <file>.json`；省略该参数直接失败，不生成只有用户图示的成功产物。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

布局生成的标准交付除 PNG 外必须包含同一候选目录的唯一 `layout-nodes.json`、`layout-decision.json`、自包含 `review.html` 和 `generation-result.json`。正式 `scene_reconstruction_contract.layout_decomposition.layout_source.nodes_file`、annotation 和 confirmation 的 `layout_nodes_file` 必须指向同一节点文件；`layout_binding`、annotation 与 confirmation 只保存身份/证据，不能复制节点树。布局审阅页只用于可读的人工作业，不能替代拆解确认、独立布局确认或 PNG/F2 机器门；其模板、真实文件与业务绑定、候选状态和离线边界见 [`离线布局审阅产物`](../../cocos-game-ui-layout/references/layout-review-artifacts.md)。

V2 拆解 UI 底板、按钮皮肤和框体时，必须按可观察固定角边与可伸展区域评估九宫格，记录适用/不适用原因及源图尺寸、四边切片值；采用九宫格时，选择随已有拆解确认冻结并贯穿 V3 小图生产与 V4 正式场景实现。具体合同读取[九宫格 UI](../../cocos-game-asset-integration/references/nine-slice-ui.md)，V3 生产按冻结切片参数执行。普通固定视觉图片派生 `sprite_geometry={type:'SIMPLE',size_mode:'RAW',content_size:null}`，使用正式 SpriteFrame 的完整未裁切原尺寸；即使底板兼任容器根并有子项，也保留 RAW 原尺寸计划。运行时 RAW 只要求 `UITransform.contentSize` 等于正式 SpriteFrame 原尺寸，不禁止 Node 缩放/动画或 SHARED 坐标变换；视觉 bounds 另行验收。只有冻结九宫格图片派生 `SLICED + CUSTOM` 与目标宽高。九点停靠（水平/垂直对齐、锚点和偏移）表示位置意图，与九宫格纹理切片独立，不触发 CUSTOM。普通图片不得使用 `STRETCH`/`FLEX` 尺寸策略，父级 Creator Layout、Widget 或其他尺寸驱动器不得改写其 `UITransform.contentSize`；其 `size_driver` 固定为 `SPRITE_RAW`。`widget_stretch_axes` 使尺寸由 `WIDGET` 控制，其他显式 `size_driver` 必须与 `size_policy` 匹配。父级 Creator Layout 排布活动子节点位置时，子节点必须由原生 Layout 控制位置；自定义项目布局器用 `SHARED` 驱动并保留 `PARENT` 职责；当前节点原生 Layout 以 `CONTAINER` 计算自身尺寸时，可在先计算尺寸后使用 Widget 定位。纯结构容器、文字与命中区域的尺寸独立管理。具体边界见[图片原尺寸与九宫格尺寸](../../cocos-game-ui-layout/references/cocos-adapter.md#图片原尺寸与九宫格尺寸)、[Widget 定位策略](../../cocos-game-ui-layout/references/widget-layout.md)及[Widget 运行快照](../../cocos-game-ui-layout/references/widget-runtime-evidence.md)。

<a id="mode-cocos-game-asset-integration--条件参考"></a>
#### 条件参考

- 正式 3D 模型制作或修整：交给 [`cocos-game-3d-modeling`](#mode-cocos-game-3d-modeling) 在 Blender MCP 中生产；本领域按[工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)登记模型来源与输出，通过 Creator MCP 核验真实模型、网格/材质子资源和资源级 Prefab。几何技术报告与实际场景消费证据独立于图片尺寸、Alpha 和 SpriteFrame 检查。
- 参考截图、录屏、运行项目或源码还原：读取 [视觉还原](../../cocos-game-asset-integration/references/visual-reconstruction.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。
- UI：同时读取 [`cocos-game-ui-layout`](#mode-cocos-game-ui-layout) 的布局合同、Cocos 适配器、Widget 定位策略和证据矩阵；资源 origin、布局锚点与动画偏移按合同分离，资产接入不得重新发明布局规则。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-cocos-game-asset-integration--审核与交付"></a>
#### 审核与交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-cocos-game-asset-integration--视觉确认边界"></a>
##### 视觉确认边界

同一场景 Work Item 的 V0→V1→V2→V3→V4 链在 V2 依次完成拆解图确认和布局图确认，冻结还原方案。用户面对的是编号拆解 PNG 与布局 PNG/`review.html`；技术 JSON、proposal 和 decision 在后台用于机器校验与身份绑定，不构成额外文字确认门。Stage A proposal 是历史确认输入，Stage B decision 是唯一布局生成输入；同批 `layout-nodes.json` 保存唯一分组/父子/参照/布局事实，并由 scene contract 的 `layout_source.nodes_file` 引用。`layout_binding`、annotation 与 confirmation 只存身份/证据，且它们的 `layout_nodes_file` 必须匹配 source 路径。`visual-decomposition-confirmation/1.0` 绑定拆解 PNG、proposal、target、V2 candidate、diff、baseline、全部编号和用户原文；已确认分组或父子变化必须按原规则重生成并重新确认。Stage B 布局修改从 decision 派生更新，不回写 Stage A proposal；PNG、`review.html` 和派生快照是只读投影。V2 拆解图、技术 JSON、布局节点源、合同回对、coverage 和结构化机器检查必须齐全，布局确认另行绑定最终布局图、decision 和同一 `layout_nodes_file`。V3 资源验收和 V4 正式场景的代表性完整画面及关键可用性证据绑定当前身份；overlay、diff 和完整逐区域精确 fidelity 仅在 exact 模式强制。根节点 PASS、布尔值、AI reviewer 字段或旧 `human_review` 均不能代替两次 V2 图像确认。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-cocos-game-asset-integration--本栈配套资料"></a>
#### 本栈配套资料

- [响应式视觉验证](../../cocos-game-qa-performance/references/responsive-visual-validation.md)
- [满幅背景](../../cocos-game-asset-integration/references/full-bleed-background.md)
- [控制模型](../../cocos-domain-contracts/references/control-model.md)
- [全局视觉控制](../../cocos-game-asset-integration/references/global-visual-control.md)
- [视觉生产管线](../../cocos-game-asset-integration/references/visual-production-pipeline.md)
- [功能与场景阶段的共享规划](../../cocos-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)
- [正式图片生成后的共享与复用](../../cocos-game-asset-integration/references/asset-production-routes.md#正式图片生成后的共享与复用)
- [图片批量生成](../../cocos-game-asset-integration/references/visual-production-pipeline.md#图片批量生成)
- [帧动画合同](#mode-cocos-frame-animation)
- [《Effect-image 生成式位图忠实还原提示词合同》](../../cocos-game-asset-integration/references/effect-image-prompt-contract.md)
- [独立工作项规则](../../cocos-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#效果图生成)
<!-- native-source:cocos-game-asset-integration:end -->
