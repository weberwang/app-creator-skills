# phaser 原生技术合同

本手册中的 DPR 动态封顶 2 与图片生产基线 1 仅适用于对应 Web 管线；原生平台不强制填写浏览器 DPR。普通屏幕 UI 图片保持源逻辑尺寸，合法九宫格可按切片改变显示框；屏幕装饰背景按独立 cover-v1 合同等比覆盖；设备密度、容器或相机映射不授权额外缩放。图片生产归一化与运行展示分别管理，详见[各栈尺寸与密度](../../app-ui-layout/references/relative-layout.md#技术栈的尺寸与密度)。

本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。

各技术栈统一使用 V0–V5：V0 范围、V1 功能验证、V2 视觉目标、V3 拆解布局、V4 资源导入、V5 正式运行验收；白盒按需使用。包含视觉阶段的领域记录必须声明 `visualStageModel: function-first-v1`，无阶段的纯资源协议不需要该字段。

## 能力索引

- **产品与游戏需求**
  - [Phaser 4 制作策划](#mode-phaser4-game-production)
- **技术架构与模块设计**
  - [Phaser 4 技术架构](#mode-phaser4-game-architecture)
- **游戏玩法实现**
  - [Phaser 4 玩法开发](#mode-phaser4-gameplay-development)
- **游戏音频**
  - [Phaser 4 音频设计](#mode-phaser4-game-audio)
- **游戏数值与经济**
  - [Phaser 4 数值设计](#mode-phaser4-game-balance)
- **游戏与应用汁水设计**
  - [Phaser 4 游戏汁水感](#mode-phaser4-game-juice)
- **候选交付与发布准备**
  - [Phaser 4 发布与合规](#mode-phaser4-game-release)
- **质量审核与性能验证**
  - [Phaser 4 测试与性能](#mode-phaser4-game-qa-performance)
- **动画制作与接入**
  - [Phaser 4 通用帧动画制作](#mode-phaser4-frame-animation)
- **Spine 生成式换皮**
  - [Phaser 4 Spine 生成式换皮](#mode-phaser4-spine-generative-reskin)
- **界面布局与自适应**
  - [Phaser 4 游戏 UI 布局](#mode-phaser4-game-ui-layout)
- **项目整理与产物清理**
  - [Phaser 4 记录与中间产物清理](#mode-phaser4-game-artifact-cleanup)
- **图片优化**
  - [Phaser 4 图片资源优化](#mode-phaser4-game-image-optimization)
- **游戏广告接入**
  - [Phaser 4 AppLovin MAX 广告接入](#mode-phaser4-game-ad-integration)
- **视觉素材生产**
  - [Phaser 4 游戏美术生产与接入](#mode-phaser4-game-asset-integration)

## 产品与游戏需求

<!-- native-source:phaser4-game-production:start -->
<a id="mode-phaser4-game-production"></a>

<a id="mode-phaser4-game-production--phaser-4-制作策划"></a>
### Phaser 4 制作策划

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-phaser4-game-production--最短流程"></a>
#### 最短流程

[公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-phaser4-game-production--领域边界"></a>
#### 领域边界

- [公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。
- 全局静态基线、场景方向和高保真证据由控制面统一校验；本领域只提供体验意图、功能事实和范围，不用文字或根摘要替代机器证据。

<a id="mode-phaser4-game-production--交接与收敛"></a>
#### 交接与收敛

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-phaser4-game-production--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../phaser-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../phaser-domain-contracts/references/state-gates.md)
- [实际完成情况](../../phaser-domain-contracts/references/control-model.md#按实际完成情况验收)
- [游戏美术体验与质量契约](../../phaser4-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md#工作流接入)
- [汁水感设计指南](../../phaser4-game-juice/references/design-guide.md)
- [功能与场景阶段的共享规划](../../phaser4-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
<!-- native-source:phaser4-game-production:end -->


## 技术架构与模块设计

<!-- native-source:phaser4-game-architecture:start -->
<a id="mode-phaser4-game-architecture"></a>

<a id="mode-phaser4-game-architecture--phaser-4-技术架构"></a>
### Phaser 4 技术架构

<a id="mode-phaser4-game-architecture--全局控制接入"></a>
#### 全局控制接入





建立可维护、可测试、可构建的边界，并显式处理小游戏、iOS、Google Play 的差异。

动态反馈确实涉及公共事件、时间协调或生命周期边界时，按需参考[汁水感工程边界](../../phaser4-game-juice/references/design-guide.md#phaser-工程边界)；先复用已有能力，不为单个效果引入公共框架，规则、表现和音频所有权保持分离。

<a id="mode-phaser4-game-architecture--输入与边界"></a>
#### 输入与边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。

- 用 Phaser 4、TypeScript、Vite 实现 Web 核心；新项目优先采用官方当前的 create-phaser-game 流程。
- 新建或调整 Vite 生产构建时，按[生产构建压缩与发布检查](../../phaser4-game-architecture/references/production-build.md)落实 Terser 两轮压缩、标识符缩短、注释移除与生产 Source Map 默认关闭；评估 Phaser Compressor 按需裁剪引擎，并交接实际配置入口、构建命令和验证证据。
- 仅在移动平台档被实际需求触发时用 Capacitor 承载 iOS 与 Android，并将每个已采用插件封装在平台适配层；初始化不得默认安装非必需插件。
- 项目所有已采用 SDK 由 `src/platform/initialize-sdks.ts` 装配并独立投递，各 SDK 的初始化、状态和恢复由各自的 `src/platform/sdks/<sdk>-sdk.ts` 管理，`src/main.ts` 调用后 Phaser 首帧不等待初始化批次；设计和实施时读取[SDK 统一初始化](../../phaser4-game-architecture/references/sdk-initialization.md)，在 TDD 明确每个 SDK 的官方真实前置、就绪判据和失败/重试所有权，禁止跨 SDK 建启动屏障或在场景、构造函数、业务服务和导入副作用中分散初始化。
- Android/iOS 原生平台功能优先使用现有插件，按下述[原生平台插件选型](#mode-phaser4-game-architecture--原生平台插件选型)执行，避免重复实现原生能力。
- 小游戏必须单独验证；可选商业能力须有显式接口和已批准开关。
- 基础模块阶段建立统一音频服务与生命周期适配，按[后台暂停与恢复约束](#mode-phaser4-game-audio--后台暂停与恢复约束)实现后台暂停、前台原位置续播；保留手动暂停和静音状态，防止重复恢复、过期音效补播及已销毁实例复活，纳入基础包和 TDD。
- 基础模块实施必须完成[基础显示约束](../../phaser4-game-orchestrator/references/game-implementation.md#基础显示约束)：游戏填满实际可用视口；Android 宿主从启动首帧到运行全程无窗口标题栏或 ActionBar，并实现沉浸式全屏及前台/焦点恢复。启动主题、运行主题、窗口配置与视口/安全区适配纳入基础包和 TDD，不延后到场景实现阶段。

<a id="mode-phaser4-game-architecture--原生平台插件选型"></a>
#### 原生平台插件选型

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
- 选型核实插件对项目当前 Capacitor 版本、目标 Android/iOS 版本、所需 API、权限和生命周期行为的支持，并记录依赖版本、维护状态、许可、平台限制和验证方式；只安装当前需求实际使用的插件。
- 插件调用统一封装在平台适配层，通过项目公开接口向业务提供能力；业务和 Scene 不直接调用插件。Web/小游戏适配显式声明支持情况与失败语义，不以空实现伪装原生能力成功。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。

<a id="mode-phaser4-game-architecture--执行与交接"></a>
#### 执行与交接

新建游戏项目、实现基础模块或调整目录与模块边界时，先读取[游戏项目目录规范](../../phaser4-game-architecture/references/project-structure.md)，按入口/基础服务分层、场景功能聚合组织代码，明确资源、平台、测试和产物归属，并把实际路径与所有权写入 TDD 和实施包。制作前按[产物目录与确认流转](../../phaser4-game-architecture/references/project-structure.md#产物目录与确认流转)及[产物存放与证据边界](../../phaser4-game-architecture/references/artifact-storage.md)分开临时候选、确认成果、源素材、正式运行资源、人工作业审阅/验证产物和工作流机器记录；根级 `evidence/` 不等于机器 `evidenceRoot`，已冻结引用路径保持原样。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
2. 在 TDD 标注 foundation-only 的 `SHARED`/`MODULE` 范围、场景 `SCENE`/`DISPLAY_LAYER` 归属和跨场景 `INTEGRATION` 依赖。基础包只提供稳定契约，不实现具体场景玩法、UI/布局、正式可见资产消费或 Boot→正式可见 Scene 接入；[公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)场景只通过公开服务、状态仓库或消息契约协作，不得直接访问其他 Scene 的内部状态。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
4. 为装饰性屏幕空间满幅背景建立唯一适配器，覆盖创建、唤醒、恢复、方向与画布尺寸变化；具体缩放、焦点和裁切规则由项目契约定义。世界空间关卡、Tilemap、碰撞或玩法环境必须使用独立对象、地图和层级数据，不得套用装饰背景适配器或扁平化。
   在场景 TDD 中按[显示对象锚点与显示层分层](../../phaser4-game-ui-layout/references/display-object-layering.md)声明有名渲染根层及从后到前的合成顺序，覆盖实际使用的背景、世界后景、世界主体、前景/特效、常驻 HUD 与瞬态层；每层记录 Camera/坐标空间、滚动、裁切、输入、生命周期和所有者。可设置原点的显示对象默认显式采用中心 `(0.5, 0.5)`，非中心例外记录原因和换算；布局停靠点及 Camera 原点不代替对象原点。不同根层的前后关系不得仅靠局部 depth 数值或创建顺序推断。
5. 涉及 UI 时使用 [`phaser4-game-ui-layout`](#mode-phaser4-game-ui-layout) 定义唯一的逻辑坐标与布局入口，并在 Work Item/Implementation Package/TDD 中完整记录 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr=2`、`scaleMode`、Camera viewport/zoom/origin、输入坐标、安全区、resize、方向、文字/资源分辨率、性能预算、代表性视口和运行证据字段。CSS 逻辑尺寸用于 `gameSize`、布局、安全区、断点、点击区域和程序化文字；Canvas backing 必须为 CSS 尺寸×有效 DPR，物理像素不得直接成为布局坐标。DPR 必须从设备动态读取，非法值回退 1，变化时刷新 CSS/backing 并清理监听器；资源生产 1:1 基线与运行时 DPR 分离。竖屏使用 1080×1920 设计基准并按宽适配，横屏使用 1920×1080 设计基准并按高适配；Canvas 以 `RESIZE` 或同等 `custom` 填满真实视口，屏幕装饰背景按独立 cover-v1 合同等比覆盖，不留黑边，且必须证明 Camera 和输入的双向映射。弹窗/DISPLAY_LAYER 继承宿主视口、DPR、Camera/输入和安全区，必须拥有独立运行轨迹与证据。布局重算从合同值开始并保持幂等，资源 origin、布局锚点和动画偏移相互分离，禁止在多个生命周期回调散布无参照语义的屏幕坐标。合同验证器属于 F3 工程验证，固定值或绝对定位完整有据时触发布局专项 F2。
6. 分离核心规则、表现、平台和第三方服务。[公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)foundation-only 阶段的 `SHARED` 只提供最小启动、公开契约和 Boot/Preload 生命周期，`MODULE` 只提供场景无关数据/状态/输入/平台/资源基础设施与测试支撑；具体场景业务、UI/布局和正式可见资产仍在对应场景阶段完成。每个场景在自身阶段完成场景自有玩法、正式视觉、常驻 HUD、清理和联合证据；瞬态弹窗/显示层通过独立 `DISPLAY_LAYER` Work Item 完成上下文、UI、生命周期与证据，并独立验收，不作为宿主场景完成 V5 的前置。玩法独占规则、状态、碰撞和交互代码；美术可维护纯表现资源配置、布局/表现预制数据与视觉集成调整，但不得改变玩法规则、碰撞语义或状态所有权。为协作集成、触控、安全区、暂停恢复、后台切换和断网定义验证策略。
7. 对组件/资源集和场景路径，在 V2 定义每场景纹理、图集、帧数、动画采样、纹理内存、过绘、Draw Call 和最大纹理预算；在 V4 将预算写入机器清单，V5 只验证。原子资源必须引用已有适用且有效的玩法视觉契约与预算基线，否则升级路径；不得在验收时临时放宽。
8. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
10. 共享基础完成后提供代表性 Vite/Phaser 启动、Boot/首场景、资源和适用插件烟测；关键玩法流完成后提供主目标平台运行烟测；仅最终集成/G3/release 执行完整平台矩阵。不得由局部证据宣称全平台通过，不得自动发起真机验收。
11. F0 完成后提交范围与流程事实；F1 提交规格映射；F2 提交独立架构结论；F3 提交候选 SHA、实际命令证据和未覆盖项。

交给玩法开发模块入口、数据流和测试入口；交给测试提供构建命令、版本和日志定位方式。新增或修改的类、函数、实体定义均添加解释设计边界的简体中文注释。

<a id="mode-phaser4-game-architecture--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../phaser-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../phaser-domain-contracts/references/state-gates.md)
<!-- native-source:phaser4-game-architecture:end -->


## 游戏玩法实现

<!-- native-source:phaser4-gameplay-development:start -->
<a id="mode-phaser4-gameplay-development"></a>

<a id="mode-phaser4-gameplay-development--phaser-4-玩法开发"></a>
### Phaser 4 玩法开发

全局阶段、V0–V5、状态、执行结果与证据门统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行。本领域只负责玩法规则、状态、交互和动态验收；场景按 V0–V5 推进；V1 验证功能，V3 的拆解和布局分别确认。

<a id="mode-phaser4-gameplay-development--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实际实施结果、证据与阶段迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈玩法规则、状态、交互和动态验收。

<a id="mode-phaser4-gameplay-development--所有权"></a>
#### 所有权

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-phaser4-gameplay-development--实现"></a>
#### 实现

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
3. 对当前场景明确可观察玩家行为、状态迁移、时序、反馈、成功/失败和异常恢复。截图无法证明的行为标为待定义，不自行推断。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
6. 只使用绑定当前 `scene_id` 或合规 `shared` 且 V4 `accepted` 的资源进入正式功能实现。用独立 GameObject、命名容器和图层结构化装配，按[显示对象锚点与显示层分层](../../phaser4-game-ui-layout/references/display-object-layering.md)显式设置可设原点对象的默认中心 `(0.5, 0.5)`，逐对象记录非中心例外，并声明背景、世界、特效、HUD 与瞬态层的合成顺序和输入归属；UI 从 [`phaser4-game-ui-layout`](#mode-phaser4-game-ui-layout) 布局契约计算，区分坐标空间、资源 origin、布局停靠点与动画偏移，并在视口、安全区、方向、状态和内容变化后通过唯一入口幂等重排。普通测试验证相对关系，不把绝对屏幕坐标当作通用验收标准。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-phaser4-gameplay-development--证据"></a>
#### 证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-phaser4-gameplay-development--本栈配套资料"></a>
#### 本栈配套资料

- [`phaser4-game-ui-layout`](#mode-phaser4-game-ui-layout)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md#资源拆解与界面实现)
- [汁水感设计指南](../../phaser4-game-juice/references/design-guide.md)
<!-- native-source:phaser4-gameplay-development:end -->


## 游戏音频

<!-- native-source:phaser4-game-audio:start -->
<a id="mode-phaser4-game-audio"></a>

<a id="mode-phaser4-game-audio--phaser-4-音频设计"></a>
### Phaser 4 音频设计

<a id="mode-phaser4-game-audio--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实施结果、证据门、验证与用户确认统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈音频设计和运行约束。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。
5. 标准、发布通道向总控提交一条音频范围、证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-phaser4-game-audio--后台暂停与恢复约束"></a>
#### 后台暂停与恢复约束

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#后台暂停与恢复约束)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-phaser4-game-audio--本栈配套资料"></a>
#### 本栈配套资料

- [动态反馈设计指南](../../phaser4-game-juice/references/design-guide.md)
<!-- native-source:phaser4-game-audio:end -->


## 游戏数值与经济

<!-- native-source:phaser4-game-balance:start -->
<a id="mode-phaser4-game-balance"></a>

<a id="mode-phaser4-game-balance--phaser-4-数值设计"></a>
### Phaser 4 数值设计

<a id="mode-phaser4-game-balance--全局控制接入"></a>
#### 全局控制接入





> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。

汁水感调整涉及顿帧、硬直、实际击退、吸附或输入容错等规则参数时，按[玩法与表现边界](../../phaser4-game-juice/references/design-guide.md#设计原则与玩法边界)与玩法共同确定影响和验证；纯粒子、声音或视觉偏移不因此进入数值修改范围。

读取全局 Work Item、项目配置、GDD、当前玩法实现和数值模型。按 F0 范围与流程、F1 规格一致性、F2 数值质量、F3 模拟/实测/回归证据和 F4 集成/发布决策推进。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
4. 标准、发布通道向总控提交一条模型版本、关键证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
<!-- native-source:phaser4-game-balance:end -->


## 游戏与应用汁水设计

<!-- native-source:phaser4-game-juice:start -->
<a id="mode-phaser4-game-juice"></a>

<a id="mode-phaser4-game-juice--phaser-4-游戏汁水感"></a>
### Phaser 4 游戏汁水感

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-phaser4-game-juice--控制面与职责"></a>
#### 控制面与职责



- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#模块职责边界)。
- 美术、帧动画和音频继续拥有对应素材生产、登记、时间轴及生命周期。优先复用已有模块，不为调用本 Skill 新建运行时管理器。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。
- 沿用已授权的范围、服务复用、当前分支和测试规则；不自动启动真机或执行外部写入、付费、发布等受保护操作。

<a id="mode-phaser4-game-juice--按需读取"></a>
#### 按需读取

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#按需读取)。

<a id="mode-phaser4-game-juice--执行闭环"></a>
#### 执行闭环

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#执行闭环)。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-phaser4-game-juice--交付"></a>
#### 交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-phaser4-game-juice--本栈配套资料"></a>
#### 本栈配套资料

- [完整设计指南](../../phaser4-game-juice/references/design-guide.md)
- [工作流接入](../../phaser4-game-juice/references/workflow-integration.md)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md)
<!-- native-source:phaser4-game-juice:end -->


## 候选交付与发布准备

<!-- native-source:phaser4-game-release:start -->
<a id="mode-phaser4-game-release"></a>

<a id="mode-phaser4-game-release--phaser-4-发布与合规"></a>
### Phaser 4 发布与合规

<a id="mode-phaser4-game-release--全局控制接入"></a>
#### 全局控制接入



发布必须创建独立 Work Item。`phaser-build-upload`、`phaser-backend-config`、`phaser-channel-config` 为 A5；`phaser-device-test`、`phaser-store-submit`、`phaser-release`、`phaser-game-rollback` 为 A6，先由 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 校验精确游戏目标和 F4 审批。Git、GitHub Release、消息和通用第三方 API 不属于此生命周期控制面。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。

读取独立发布 Work Item、平台矩阵、资源登记、测试计划和发布清单。F0 校验任务范围与流程，F1 校验候选与发布规格，F2 完成 QA/技术/合规领域质量，F3 绑定工程证据，F4 只决定记录中明确的外部对象和发布动作。

1. 分别核对小游戏、iOS、Google Play 的打包、版本、图标截图、描述、隐私、分级、广告或内购披露、数据收集与账号删除要求。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
3. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)候选 SHA、包哈希仅作可选追踪，不要求填写或匹配，不阻断发布工作项验收；摘要核对留到最终人工验收后处理。共享基础和关键玩法流证据只能证明各自范围；发布 Work Item 应覆盖实际目标渠道/平台矩阵，并以本栈发布清单确认对应项，不得自动发起真机验收。
   按[生产构建压缩与发布检查](../../phaser4-game-architecture/references/production-build.md)检查最终候选：Vite 生产入口显式设置 `build.sourcemap: false`，Terser 依赖、锁文件与压缩选项实际生效；检查所有公开产物及渠道包内 Web 资源，不得包含 Source Map 文件、内联映射或映射引用。登记 Phaser Compressor 的版本适用性、采用结果或未采用原因；采用时核对裁剪配置、实际引擎入口、体积对比和功能烟测，防止渠道配置覆盖或重复打入完整引擎。不能将基础压缩或引擎裁剪表述为完整反编译加固。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
5. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)
<!-- native-source:phaser4-game-release:end -->


## 质量审核与性能验证

<!-- native-source:phaser4-game-qa-performance:start -->
<a id="mode-phaser4-game-qa-performance"></a>

<a id="mode-phaser4-game-qa-performance--phaser-4-测试与性能"></a>
### Phaser 4 测试与性能

<a id="mode-phaser4-game-qa-performance--全局控制接入"></a>
#### 全局控制接入





[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
2. [公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
10. 共享基础完成后验证代表性 Vite/Phaser 启动、Boot/首场景、资源加载和适用插件；关键玩法流完成后在主目标平台烟测核心循环与失败恢复；只有最终集成/G3/release 执行完整渠道/平台矩阵。[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。

<a id="mode-phaser4-game-qa-performance--本栈配套资料"></a>
#### 本栈配套资料

- [scripts/responsive-visual-validation.mjs](../../phaser4-game-qa-performance/scripts/responsive-visual-validation.mjs)
- [scripts/responsive-visual-validation.test.mjs](../../phaser4-game-qa-performance/scripts/responsive-visual-validation.test.mjs)
- [事件覆盖与反馈规则](../../phaser4-game-juice/references/design-guide.md)
- [`phaser4-game-ui-layout`](#mode-phaser4-game-ui-layout)
- [响应式视觉验证](../../phaser4-game-qa-performance/references/responsive-visual-validation.md)
- [游戏美术体验与质量契约](../../phaser4-game-asset-integration/references/art-quality-contract.md)
- [视觉还原](../../phaser4-game-asset-integration/references/visual-reconstruction.md)
- [实际完成情况](../../phaser-domain-contracts/references/control-model.md#按实际完成情况验收)
- [检查与返修](../../phaser4-game-ui-layout/references/game-copy.md#检查与返修)
<!-- native-source:phaser4-game-qa-performance:end -->


## 动画制作与接入

<!-- native-source:phaser4-frame-animation:start -->
<a id="mode-phaser4-frame-animation"></a>

<a id="mode-phaser4-frame-animation--phaser-4-通用帧动画制作"></a>
### Phaser 4 通用帧动画制作

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

动画设计优先增强观看体验与动作表现力：先确定目标感受、表演亮点和节奏，再解决一致性、采样与接入。设计师可主动构思转身、侧身、旋转、翻腾、透视变化、遮挡、位移与夸张形变，按任务选择，不强制炫技。身份一致性和运动连续性服务于表演，固定画布、区域与资源锚点不锁死主体朝向、姿态或画内位置。

在当前 Work Item 范围内内部提出、推导并维护动作时间轴设计记录，方案完成后主动向用户阐述设计理念，说明希望带来什么感觉及相应动作依据，等待用户明确确认当前动作方案后，再按已有授权推进提示词、真实素材和具体实现；用户审阅真实视频、逐张关键帧及完整序列，按反馈修复并重验，随后回到控制面提交证据与状态迁移。只有玩法事件、时长或行为权限确实缺失且无法推导时，才询问受影响动作。

<a id="mode-phaser4-frame-animation--分类入口"></a>
#### 分类入口

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

<a id="mode-phaser4-frame-animation--来源路线"></a>
#### 来源路线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#来源路线)。

<a id="mode-phaser4-frame-animation--共用流程"></a>
#### 共用流程

1. 按[导演与动作指导](../../phaser-domain-contracts/resources/frame-animation/references/animation-direction.md)判断设计复杂度，简单任务由对应设计师兼任导演，复杂任务独立委派导演统筹。先构思观看体验与表演亮点，读取视觉基线、用途类型参考与[完整动作与时间轴](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md)，建立当前动画的内部设计工件。明确来源路线、行为边界、初态/终态、游戏时长、阶段区间、关键姿态、事件、播放方式、锚点/允许位移、完整运动范围、目标显示尺寸、FPS 和背景处理。角色动作还须明确前后动作衔接、是否循环及进入/退出条件，见[衔接与循环设计](../../phaser-domain-contracts/resources/frame-animation/references/character-animation.md#衔接与循环设计)。按需要读取[区域规划](../../phaser-domain-contracts/resources/frame-animation/references/region-planning.md)，合批时各区域仍有独立类型和时间映射。
2. 按[动作分析规则](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md#动作分析与时间轴)和[玩法与意图设计方法](../../phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md)，从玩法目的、表现意图与已有时间约束内部推导行为边界、阶段与运动依据、衔接/循环及节奏取舍，并记录建议时间轴、事件时点、关键姿态意图、尺寸推理和逐阶段检查点。视频同时推导 768p/2K 区域排布、条数、整组消耗与推荐方案。只对确实缺失且无法推导的玩法事件、时长或行为权限提问，并只暂停受影响动作的设计；完成的方案仍须交用户确认后才能制作。不制作灰盒或可播放几何示意。
3. 方案完成后，先按[设计理念说明](../../phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)向用户说明目标感受、动作依据、节奏取舍与观看重点，并暂停等待用户明确确认当前动作方案；收到确认后，才按“表演过程与当前参数＋类型规则＋身份与资源要求”编写正式提示词，在已有授权范围内制作真实候选或预览。视频按[分辨率与合批比较](../../phaser-domain-contracts/resources/frame-animation/references/region-planning.md#视频条数与消耗比较)选择 768p 或 2K：先最少条数覆盖全部动作，再在该条数下选整组消耗最少者，同等条件优先 768p；图片按[图片分辨率约定](../../phaser-domain-contracts/resources/frame-animation/references/region-planning.md#图片分辨率约定)处理。首次素材交付直接展示真实视频候选/预览或真实图片首帧及关键帧，并附与设计理念对应的简短检查点。用户确认实际素材时可同时接受该素材所表达的时序，不另行确认文字复述。无现有生成授权时遵守外部操作边界，不把路线选择视为授权。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。
5. 视频按固定区域抽帧，图片按真实来源清单打包；两者共用背景处理、等比缩放、固定 cell/锚点、独立图集和报告；需要动画播放时通过 `--output-preview` 指定 HTML 预览路径。依据当前类型反馈局部修帧，保留已有修图成果及来源身份，更新图集、报告及实际生成的预览和 SHA。缺陷修复不默认替换整组来源。
6. 用真实完整帧序列按内部设计工件中的逐阶段检查点人工检查表现意图、节奏、连续性、事件及单次/循环/终态和外部动作衔接，记录具体偏差与用户结论。同目标的局部纠错直接返修并展示前后对照；目标感受、核心动作方案、玩法语义或来源路线实质改变时须重新确认，不重新索取已有生成授权。保存分类规则、玩法与意图推导、真实候选审阅、时间映射与最终人工验收证据，按[工作流接入合同](../../phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md)提交资源，再回到控制面完成 Phaser 接入和运行验证。

<a id="mode-phaser4-frame-animation--动作设计与真实素材确认"></a>
#### 动作设计与真实素材确认

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-phaser4-frame-animation--共用质量与关键约束"></a>
#### 共用质量与关键约束

- 先由用户完整观看吸引力、情绪/性格、节奏与表现亮点，再检查可读性、主次、连续性和事件同步，具体方法见[共用质量与优化](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md#共用质量与优化)。重量感、夸张程度、停顿和跟随运动按类型、对象性质与视觉基线配置，不统一套用战斗节奏。
- 按[效果与性能平衡](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md#效果与性能平衡)，在目标显示尺寸、动作可读性和已有平台预算之间选择合适的 FPS、帧数、cell 与图集规模，结合加载、纹理驻留和同屏并发评估成本。动作方案说明须包含推荐精细程度及取舍依据，等用户确认后再制作；最终结合用户视觉验收与实际性能证据判断，不默认追求最高参数。
- 每个动画的时长与节奏先依据游戏特点、玩法响应、对象性质和表现目的独立确定。同一视频中的多组动画可以有不同总时长、阶段比例、停顿、循环周期和 FPS，不为合批强行统一；短区域的内容在自身设计终点结束，无须继续生成动作来等待长区域，抽帧和验收仅覆盖自身有效区间。例如同批 5 秒与 3 秒的区域，短区域到 3 秒即结束内容。具体规划见[游戏时间先于来源](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md#游戏时间先于来源)。游戏时间独立于源视频时长，同一完整行为共享自己的时间轴，内部可标事件和输入衔接；制作分组不增加攻击次数、自动连击或伤害，也不改变现有输入机制。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 默认保持要求呈现的内容及完整运动范围入框，保留安全边距。裁剪例外须有当前任务的明确授权，逐项记录对象、范围与理由；不能为合批或强调力度自行裁边。
- 固定资源锚点用于坐标映射，主体可以围绕它转身、翻腾或按设计位移；在工件中记录运动意图与范围即可，不为每次合理姿态变化新增许可。按运动过程判断透视、遮挡、可见比例和形变，修正无因漂移、身份丢失、闪烁和跨区串入，不要求每帧外观或位置相同。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 分类与优化参数保存在设计工件，不因分类添加合同字段，不虚构脚本或生成 API 参数。视频沿用原合同；图片使用独立来源清单、报告和 accepted 合同，记录真实生成图、父图、时间槽位、生成/修图记录与 SHA，不能伪造视频路径或来源时间戳。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-phaser4-frame-animation--执行代理"></a>
#### 执行代理

帧动画 Work Item 先按[导演与动作指导](../../phaser-domain-contracts/resources/frame-animation/references/animation-direction.md)判断职责：简单任务由对应专业设计师兼任动画导演／动作指导，复杂表演或紧密跨类型配合独立委派该岗位。导演负责观看体验、整体构思、动作亮点、空间与节奏及跨类型表演协调；各专业设计师负责时间轴细化、提示词、时间整理、抽帧/图片序列集成和修正。主代理负责分类、复杂度判断、任务包、所有权与范围裁决、人工反馈、接入、审查与最终验证。

| 用途类型 | 负责设计的职业 | 设计重点与交付依据 |
| --- | --- | --- |
| 普通动画 | 道具与环境动画设计师 | 物件材质、结构与运动机制，机械约束、环境节奏、状态转换和循环接缝；交付关键状态、运动轨迹与锚点范围。 |
| 角色动作动画 | 角色动画设计师 | 身体力学、重心与支撑、动作剪影、预备与跟随运动、角色性格及前后动作衔接；交付关键姿态、接触关系与玩法事件时间轴。 |
| 特效动画 | 游戏特效设计师 | 视觉层级、能量演变、形状与色彩节奏、透明边缘、命中同步和消散；交付效果阶段、峰值时点与角色/场景遮挡约束。 |
| UI 帧动画 | UI 动效设计师 | 交互状态、反馈时机、注意力引导、文字与图标可读性、打断及重复触发；交付状态转换、反馈时间轴与界面显示边界。 |

职业身份写入委派提示词，不新增工具未提供的 `agent_type`。按动画用途分配，不按视频/图片来源、文件格式或循环/单次播放方式分配。各设计师读取分类入口中对应的参考，在设计工件中记录职业、负责动画、设计依据和逐阶段检查点，不能只更换角色称谓而沿用同一套设计标准。

各职业按对应分类参考的“设计依据与交付内容”和“人工验收重点”执行，并遵循[共用设计交付与验收检查点](../../phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md#设计师交付与验收检查点)：在当前设计工件中关联依据、设计决定、阶段/事件与人工检查点，交付目标感受、完整时间轴、关键状态意图、事件、空间约束及采样与性能取舍。具体时长、帧数、FPS、幅度和尺寸按当前任务推导并说明理由，不将通用示例或某职业的惯用节奏写成固定参数。

混合任务按可独立设计的动画或区域拆分，由各类型设计师分别负责；例如角色挥剑与命中特效分别交角色动画设计师和游戏特效设计师。导演或兼任设计师先统一构思、事件时点、坐标/锚点与遮挡关系，主代理明确允许修改范围；有依赖时先交付上游构思与时间轴，再交接下游设计，仅对独立且文件所有权不重叠的部分并行委派。不可拆分的复杂复合动画由独立导演整合整体表演，主体类型设计师整合时间轴与素材要求。共享视频合批不合并职业职责，也不改变各动画独立时长。

独立导演与专业设计师均使用 `collaboration.spawn_agent`，设置 `agent_type="default"`、`model="gpt-6.1-sol"`、`reasoning_effort="max"`、`fork_turns="none"`。完整任务包包含 Work Item、复杂度判断与导演兼任/独立安排、导演构思与核心表现、设计师职业与职责、负责动画/区域、跨类型依赖与交接约束、用途类型与来源路线、对应参考、玩法目的与表现意图、既有玩法时间约束、行为/输入边界、阶段检查点、素材与基线路径、允许修改范围、当前候选版本/内部时间轴、允许推进步骤、验收标准、测试等级与命令、禁止操作及并行提醒。执行代理在方案完成后、制作前输出设计理念与目标感受说明，由主代理及时传达给用户；执行代理在此暂停，主代理取得用户明确确认后再交接确认范围与允许继续的步骤；详细动作推导理由保存在内部工件。获准继续后的首次素材交付提供真实候选/预览和对应检查点；未确认的方案不得开始素材制作或具体实现。视频路线交接当前真实视频及人工审阅结果，图片路线交接当前已确认帧及已有生成授权继续制作。

同一工作项、同一职业职责范围内的连续修正优先复用代理；范围实质变化或工作项完成后结束该生命周期。位图生成/编辑仍交给图片生成代理，动画执行代理提供时间轴、帧槽位和素材约束并集成结果。指定工具或模型不可用时报告限制，不静默换模型。委派不扩大文件、视觉自动验证或外部操作授权。

<a id="mode-phaser4-frame-animation--本地工具与参考路由"></a>
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
| 导演职责与表演构思 | [animation-direction.md](../../phaser-domain-contracts/resources/frame-animation/references/animation-direction.md)，简单任务由设计师兼任，复杂任务独立委派，交接核心表演与跨类型依赖 |
| 用途判断与类型制作 | 上方对应的一份分类参考；涉及独立特效或 UI 位图时再读取其规则 |
| 从玩法与表现意图推导时长、节奏及检查点 | [intent-driven-design.md](../../phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md)，在动作分析时读取并写入既有设计工件，制作与验收复用 |
| 需要反馈语义、类型适用或事件覆盖规则 | [Phaser 2D 汁水感设计指南](../../phaser4-game-juice/references/design-guide.md)；本 Skill 仍按既有时间轴设计、真实素材审阅和完整序列人工验收生产帧动画 |
| 游戏时间、分组、阶段及修正 | [action-timing.md](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md) |
| 效果图尺寸推理、合批与空间裁剪 | [region-planning.md](../../phaser-domain-contracts/resources/frame-animation/references/region-planning.md) |
| 图片首尾、关键帧、双图参考递归与图片来源合同 | [image-inbetween.md](../../phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md) |
| 动作设计与素材确认、提示词组合与来源/修图证据 | [workflow-integration.md](../../phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md) |

全局阶段仍由[唯一控制面](../../app-workflow-control/SKILL.md)管理：V3 内部推导并记录动作时间轴、阐述设计理念并取得用户确认，V4 制作并审阅真实视频或关键帧、验收完整序列，V5 依据报告的 preload、anims 和 origin 接入 Phaser 并验证运行态。

<a id="mode-phaser4-frame-animation--本栈配套资料"></a>
#### 本栈配套资料

- [动作设计与素材确认](../../phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md#动作设计与素材确认)
- [真实素材审阅与验收](../../phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md#真实素材审阅与验收)
- [设计与美术的边界](../../phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md#设计与美术的边界)
- [一致性及衔接门](../../phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md#关键帧的一致性与衔接门)
- [视频节奏整理](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md#视频节奏整理)
- [按区域抽帧](../../phaser-domain-contracts/resources/frame-animation/references/region-planning.md#按区域抽帧)
- [图片递归补帧](../../phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md)
- [普通动画](../../phaser-domain-contracts/resources/frame-animation/references/object-animation.md)
- [角色动作动画](../../phaser-domain-contracts/resources/frame-animation/references/character-animation.md)
- [特效动画](../../phaser-domain-contracts/resources/frame-animation/references/effect-animation.md)
- [UI 帧动画](../../phaser-domain-contracts/resources/frame-animation/references/ui-frame-animation.md)
<!-- native-source:phaser4-frame-animation:end -->


## Spine 生成式换皮

<!-- native-source:phaser4-spine-generative-reskin:start -->
<a id="mode-phaser4-spine-generative-reskin"></a>

<a id="mode-phaser4-spine-generative-reskin--phaser-4-spine-生成式换皮"></a>
### Phaser 4 Spine 生成式换皮

本 Skill 只在已授权的 Phaser Work Item 内使用。它保留原 Skeleton、Attachment、锚点、Atlas Region 几何和 Mesh UV 语义；候选资源始终在独立诊断目录中验证，未通过运行态门前不得接入主游戏。

<a id="mode-phaser4-spine-generative-reskin--入口"></a>
#### 入口

```powershell
node <skill-dir>/scripts/spine_reskin_progress.mjs --help
```

正式原版目录可用 `inspect --asset-dir <原版资源目录>` 或 `init --asset-dir <原版资源目录>`；独立 Skeleton/Atlas/Page 会直接审计，Cocos `sp.SkeletonData` 的 `_atlasText`/`_skeletonJson` 会先导出到独立规范化候选目录，绝不改写源目录。`init` 必须同时传入控制面 manifest，绑定 Work Item、production contract 和适用的 V3 方案证据。

进度清单必须是 schema v3。所有会修改清单的命令使用跨进程锁和原子写入；禁止手动编辑状态伪造完成。详细规则见：

- [Skeleton 审计与升级](../../phaser4-spine-generative-reskin/references/skeleton-upgrade.md)
- [批次计划与人工锁定](../../app-domain-toolkit/references/spine-reskin/batch-review.md)
- [运行态验证与最终交付](../../phaser4-spine-generative-reskin/references/runtime-validation.md)
- [状态、恢复与锁](../../phaser4-spine-generative-reskin/references/progress-state.md)
- [Atlas 重建](../../phaser4-spine-generative-reskin/references/atlas-rebuild.md)

<a id="mode-phaser4-spine-generative-reskin--固定流程"></a>
#### 固定流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。
7. 使用 `runtime-validate` 提交结构化 Phaser SpineGameObject 报告，覆盖目标 Runtime 解析、动态动画全集、Idle 循环、纹理/锚点/Mesh/闪烁/裁剪检查、摘要、URL、桌面和约 390px 移动截图；SHA 仅作可选追踪。通过后才能 `finalize`，最后用 `report` 生成 11 项最终交付报告。

<a id="mode-phaser4-spine-generative-reskin--状态硬门"></a>
#### 状态硬门

Cell 状态固定为：

```text
pending → generating → generated → validating → packing → packed → runtime_validating → completed
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。

<a id="mode-phaser4-spine-generative-reskin--全局视觉与批次确认边界"></a>
#### 全局视觉与批次确认边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/spine-reskin-production.md#完整流程)。

<a id="mode-phaser4-spine-generative-reskin--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../phaser-domain-contracts/references/control-model.md)
- [状态与门](../../phaser-domain-contracts/references/state-gates.md)
<!-- native-source:phaser4-spine-generative-reskin:end -->


## 界面布局与自适应

<!-- native-source:phaser4-game-ui-layout:start -->
<a id="mode-phaser4-game-ui-layout"></a>

<a id="mode-phaser4-game-ui-layout--phaser-4-游戏-ui-布局"></a>
### Phaser 4 游戏 UI 布局

文本任务必须读取[Phaser 文本属性与配置](text-layout.md)，区分 Text 与 BitmapText，明确固定盒宽和换行宽度、字号适配缺口、中文断行及完整字形测量。

正式显示对象、UI 与独立显示层统一遵守[显示对象锚点与显示层分层](../../phaser4-game-ui-layout/references/display-object-layering.md)：可设置原点的对象默认显式使用中心 `(0.5, 0.5)`；例外逐对象记录原因与换算。场景须声明背景、世界、特效、HUD、瞬态层的实际层序、输入和生命周期归属，并在 V5 正式 Scene 中验证运行遮挡。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

效果图 V3 拆解与布局遵守[功能语义分组约束](../../phaser4-game-ui-layout/references/functional-semantic-grouping.md)和[Phaser UI 节点组织](../../phaser4-game-ui-layout/references/layout-hierarchy.md)：先确认真实功能父级、信息分组、独立定位参照和显式溢出，再整理停靠决策并展示布局图/预览确认；不先发文字方案要求确认。图标与文字可保持同级，通过 `position_reference_id` 相互定位。父框与参照框分别维护，非根溢出须说明理由；禁止按类型、几何包含或单纯位置依赖改树。Phaser 组件 Container 与底板显示对象保持各自身份。

中心轴遵守[居中策略与组合定位](../../phaser4-game-ui-layout/references/center-alignment.md)：默认严格居中，设计偏移须有明确数值和理由；图文组合按成员联合矩形整体移动，角标不混入主内容居中框。布局节点从已确认拆解与决策重新派生，确认器独立复算，不改写 proposal 原始测量。

V3 同时派生位置与尺寸各自唯一控制者的执行计划；V5 按[Phaser 布局执行与运行证据](../../phaser4-game-ui-layout/references/layout-runtime-evidence.md)从正式 Scene 采集实际对象、父链、运行写入记录与同空间几何，再校验计划和真实中心关系。计划与测试 fixtures 不能代替运行采集；`usability` 不因此升级为完整 exact 几何矩阵，视觉效果仍由用户人工检查。

<a id="mode-phaser4-game-ui-layout--全局控制接入"></a>
#### 全局控制接入





> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-phaser4-game-ui-layout--全局视口与高分屏合同"></a>
#### 全局视口与高分屏合同

所有可见 Scene、HUD、弹窗和 `DISPLAY_LAYER` 都必须在布局合同中填写 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr`、`scaleMode`、`cameraViewportPolicy`、`cameraZoomPolicy`、`cameraOriginPolicy`、`inputCoordinatePolicy`、`safeAreaPolicy`、`resizePolicy`、`orientationPolicy`、`textResolutionPolicy`、`assetResolutionPolicy`、`performanceBudget`、`representativeViewports` 和 `requiredRuntimeEvidence`。`orientationPolicy.allowed` 声明项目支持的方向；`designResolutionPolicy` 只需提供这些方向的分支，`targets.orientations` 与其一致。竖屏以 1080×1920 为设计基准并按宽度适配，横屏以 1920×1080 为设计基准并按高度适配；另一轴随视口展开或裁切。Canvas 填满 CSS 视口，装饰性屏幕装饰背景按独立 cover-v1 合同等比覆盖，禁止黑边。Canvas backing 由 CSS 尺寸乘有效 DPR（向上取整）得到，物理像素不得直接用于布局或命中。

运行时 DPR 从设备动态读取，非法输入回退 1，正有限值封顶 2，且必须覆盖 resize、显示密度变化以及双方向项目的方向切换并清理监听器。资源生产 DPR 固定基线为 1（逻辑尺寸 1:1），必须与运行时 DPR 分离。布局合同的 `scaleMode` 统一使用项目自定义的 `custom` 策略；Phaser `Scale.RESIZE` 可作为内部画布尺寸更新方式，但不能替代项目对 `gameSize`、Camera viewport/zoom/origin 和 CSS/物理映射的自定义计算及运行证据。声明模式或构建成功不能单独作为高分屏证据。弹窗默认继承宿主逻辑视口、DPR、安全区、Camera 和输入合同，V5 必须独立记录其运行轨迹。

<a id="mode-phaser4-game-ui-layout--视觉语言默认原则"></a>
#### 视觉语言默认原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-phaser4-game-ui-layout--核心流程"></a>
#### 核心流程

正式场景的布局校准与关键几何验收读取[布局校准与参考还原](../../phaser4-game-ui-layout/references/layout-calibration.md)。V5 直接消费冻结 V3 布局与 V4 正式资源，在实际 Phaser Scene 中调整并复验受影响范围；布局矩形与素材可见边界分别检查，不能用可用性通过代替参考还原。

1. 读取项目的 GDD/TDD、当前候选、总控审核漏斗和适用视觉阶段；确定稳定 UI ID、坐标空间、参照物、状态与平台输入。
2. 复制 schema 1.2.0 [合同模板](../../phaser4-game-ui-layout/assets/ui-layout-contract-template.yaml)。普通布局使用 `not-applicable` 并保持 `layout_nodes: []`；冻结视觉目标先用 `frozen-target/specified`。同时冻结上述根级视口/DPR/Camera/Input/性能字段，禁止使用旧 `targets.scale` 字段绕过新门禁。V3 先按位置依赖建立父子、按共同信息建立同级分组，代理内部维护完整技术 JSON 和 `decomposition_elements`，直接展示编号拆解图供人工确认；屏幕 UI 的 `ui_layout` 职责字段也保留在技术合同中。拆解图确认后依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果生成逐元素 `left/center/right × top/center/bottom` 决策；未经明确授权不得分析截图，事实不足时标记待定并集中澄清，不得按几何距离猜测。再由同一入口同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`，需要交互对照时通过 `--interactive-review` 生成同批离线 `review.html`，用户直接检查最终布局图（需要交互对照时可使用同批审阅页）并独立确认。无需先后确认文字提案或技术记录。随后登记由已确认元素和视觉决策共同推导的非空 `layout_nodes` 与关键对齐合同。
3. V4 正式资源验收后直接进入 V5：按[正式场景视觉还原与校准](../../phaser4-game-asset-integration/references/visual-alignment-authoring.md)在正式 Scene 中消费 V3 节点与布局合同、V4 验收资源，接入实际交互、动态数据和 required state。坐标、尺寸和响应式调整写入正式布局配置；冻结的 V3 节点结构仍按上游合同管理。具体 Phaser 视口、Camera、输入与幂等重排规则见[Phaser 适配参考](../../phaser4-game-ui-layout/references/phaser-adapter.md)。
4. specified 阶段运行结构检查 `node scripts/validate_ui_layout_contract.mjs <contract>`；verified 正式验收必须运行 `node scripts/validate_ui_layout_contract.mjs <contract> --check-files --project-root .`，读取冻结原图并检查目标/运行/parity 证据文件。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

正式场景依据项目现有 Phaser Scene 结构和布局合同实现。V3 锚点、父子 bounds、资源 origin 与 Phaser 父级局部坐标分别处理，祖先偏移只累计一次。V5 直接加载已验收资源并在真实 Phaser Scene 中组合；背景覆盖按实际可见视口计算，图片按冻结 fit/裁切规则呈现，不能缩进安全区、留边或平移露出空隙。图片 fit 和 Phaser 文字字段按适配参考执行；资源/字体未就绪、布局或渲染异常必须令运行验收失败。Scene 创建、唤醒和 resize 使用同一幂等布局入口；发布画面不含编辑辅助内容。运行证据来自正式场景的实际消费与画面。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-phaser4-game-ui-layout--effect-image-场景绑定"></a>
#### effect-image 场景绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

效果图节点声明真实父级、父框、有效参照与参照框、父框相对距离及显式双轴对齐；不能由四边距离反推停靠。`relative_position` 测量真实父框，`offset` 和双轴锚点按有效参照计算，二者可不同；父边与参照边合并后必须无环。中心按 strict/reference 与组合规则派生，非根溢出须有理由，根边界仍检查。视觉决策及其 ID 进入布局图和确认记录，缺失决策时阻断生成。

<a id="mode-phaser4-game-ui-layout--资源导航"></a>
#### 资源导航

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。
- 需要 Phaser Scale、Camera、Container、DOM Overlay、resize 或重排边界时，读取 [references/phaser-adapter.md](../../phaser4-game-ui-layout/references/phaser-adapter.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-phaser4-game-ui-layout--所有权与输出"></a>
#### 所有权与输出

布局技能输出合同版本、布局计算输入/输出、不变量和证据索引。玩法继续独占规则、状态和交互；架构维护坐标空间与模块边界；美术维护纯表现资源和预制数据；QA 只读验证可达、截断、遮挡、触控、滚动和证据。布局计算与 Phaser GameObject 测试验证关系不变量，不把孤立绝对坐标当作通用验收标准。汁水感任务可按需参考[动态反馈设计指南](../../phaser4-game-juice/references/design-guide.md)；反馈对象的视觉偏移应使用独立表现偏移，不覆盖布局合同中的基础位置、焦点和坐标所有权。

<a id="mode-phaser4-game-ui-layout--本栈配套资料"></a>
#### 本栈配套资料

- [references/layout-calibration.md](../../phaser4-game-ui-layout/references/layout-calibration.md)
- [references/layout-review-artifacts.md](../../phaser4-game-ui-layout/references/layout-review-artifacts.md)
- [references/evidence-matrix.md](../../phaser4-game-ui-layout/references/evidence-matrix.md)
- [references/workflow-gates.md](../../phaser4-game-ui-layout/references/workflow-gates.md)
- [references/layout-hierarchy.md](../../phaser4-game-ui-layout/references/layout-hierarchy.md)
- [references/display-object-layering.md](../../phaser4-game-ui-layout/references/display-object-layering.md)
- [references/layout-contract.md](../../phaser4-game-ui-layout/references/layout-contract.md)
- [工作流门禁](../../phaser4-game-ui-layout/references/workflow-gates.md)
- [证据矩阵](../../phaser4-game-ui-layout/references/evidence-matrix.md)
- [拆解时确定九宫格](../../phaser4-game-asset-integration/references/nine-slice-ui.md)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md)
- [场景与弹窗尺寸参照](../../phaser4-game-ui-layout/references/layout-hierarchy.md#场景与弹窗尺寸参照)

<a id="mode-phaser4-game-ui-layout--ui-相对布局约束"></a>
#### UI 相对布局约束

UI 布局与位置统一遵循[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。本栈父级、锚点、坐标换算及原生组件按技术约束实现；浮层本体与内部 UI 的边界按公共规范验收。
<!-- native-source:phaser4-game-ui-layout:end -->


## 项目整理与产物清理

<!-- native-source:phaser4-game-artifact-cleanup:start -->
<a id="mode-phaser4-game-artifact-cleanup"></a>

<a id="mode-phaser4-game-artifact-cleanup--phaser-4-记录与中间产物清理"></a>
### Phaser 4 记录与中间产物清理

<a id="mode-phaser4-game-artifact-cleanup--全局控制接入"></a>
#### 全局控制接入

清理范围、路径所有权、验证证据与状态迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能只维护清理对象判定、引用保护和本栈资源边界。

用户要求清理时，在 Work Item 允许路径内处理已确认的本地产物，不重复请求普通本地操作批准。阶段收尾只处理本任务临时文件；历史记录、其他任务和共享目录不自动纳入。外部写入、设备、签名、上传、付费、破坏性操作或发布等具体副作用，须把精确动作和目标绑定到 Work Item 的明确用户批准。

<a id="mode-phaser4-game-artifact-cleanup--判定边界"></a>
#### 判定边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#判定边界)。

| 文件类别 | 默认处理 |
| --- | --- |
| `.workflow-control/work-items/`、审批账本、状态迁移/返工记录 | 保留；终态也不自动删除，历史记录支撑追踪和审计 |
| 控制面中的实施包、执行状态、Result、Evidence Manifest、验证清单和路径/归属绑定文件 | 按 `.workflow-control/` 与 `.phaser-workflow/user-resolutions/` 工具实际路径保留有效引用和审计链；失效不等于可删 |
| V3 拆解与布局确认、V4 正式资源/生产记录、V5 实现与运行证据 | 保留完整依赖闭包，包括原图、JSON、审阅页、运行证据及宿主上下文 |
| 明确属于本任务的临时日志、临时导出、失败候选、重复预览、可再生成构建或缓存 | 证明无引用、无运行占用且可再生成后，纳入清理清单 |
| 源码、正式资源、源素材/视频、用户交付物、锁文件、测试夹具、发布产物 | 默认保留；不是一般中间产物 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

按[产物存放与证据边界](../../phaser4-game-architecture/references/artifact-storage.md)，`output/intermediate/<workItemId>/<stageId>/<attemptId>/` 与 `output/candidates/<workItemId>/<stageId>/<candidateId>/` 是逐文件核对的临时目录，不是可整目录删除的授权。`docs/confirmed/` 中的确认版本、`assets-source/` 的生产输入、`public/assets/` 的正式资源、根级 `evidence/<workItemId>/reviews/` 与 `validation/` 的人工作业文件，以及 `.workflow-control/` 中位于工具真实 `evidenceRoot` 下的机器证据分别判定并保留依赖；目录本身不证明通过、无引用或可删除。根级 `evidence/` 不是机器 `evidenceRoot`，受限字段不能引用其外部路径。已冻结文件和机器记录按原路径保留；清理不能批量搬迁或自动改写引用。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

<a id="mode-phaser4-game-artifact-cleanup--清理流程"></a>
#### 清理流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
4. **执行前复核**：按 Work Item 的允许/禁止路径核对清单，运行公共控制 CLI `check`；逐对象确认实际动作、引用和写入占用。公共控制器没有清理专用动作预检命令；受保护副作用必须由 Work Item 绑定精确用户批准。删除前重新检查引用，并用内部内容摘要防止并发写入后误删；这是删除事务保护，不是验收校验，不要求工件填写 SHA。清单生成后内容或依赖变化时跳过该对象并重新判定。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

<a id="mode-phaser4-game-artifact-cleanup--路径与恢复"></a>
#### 路径与恢复

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#路径与恢复)。

<a id="mode-phaser4-game-artifact-cleanup--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#结果报告)。
- 控制面复核结果、剩余不确定性和需用户决定的范围外项。

只盘点时明确说明未执行删除；没有可靠字节统计时不宣称释放空间。清理不改变原任务的阶段或证据有效性，最终交回控制面并按当前 Work Item 报告本任务差异。

<a id="mode-phaser4-game-artifact-cleanup--本栈配套资料"></a>
#### 本栈配套资料

- [最小提交集](../../phaser-domain-contracts/references/minimal-git.md)
- [产物存放与证据边界](../../phaser4-game-architecture/references/artifact-storage.md)
- [控制模型](../../phaser-domain-contracts/references/control-model.md)
<!-- native-source:phaser4-game-artifact-cleanup:end -->


## 图片优化

<!-- native-source:phaser4-game-image-optimization:start -->
<a id="mode-phaser4-game-image-optimization"></a>

<a id="mode-phaser4-game-image-optimization--phaser-4-图片资源优化"></a>
### Phaser 4 图片资源优化

<a id="mode-phaser4-game-image-optimization--全局控制接入"></a>
#### 全局控制接入



显式调用只触发提案，不等于授权写入。所有盘点、候选生成、替换和验证都必须进入 [`app-workflow-control`](../../app-workflow-control/SKILL.md)；本 Skill 不拥有全局状态或审批，不得旁路 diff 审计与证据门。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化目标)。

<a id="mode-phaser4-game-image-optimization--执行边界"></a>
#### 执行边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。
- 将本任务视为显式触发的资源领域任务，并按实际动作纳入 A0-A3、本地阶段与统一门；不得自动加入构建脚本、Git 钩子或 CI，也不得由发布状态隐式触发。
- 默认只处理项目内被运行时代码、资源清单或加载配置引用的 PNG、JPEG 和 WebP。设计源文件、参考图、审核证据、截图、测试夹具、构建产物、缓存以及未被运行时引用的素材不在范围内。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。

<a id="mode-phaser4-game-image-optimization--优化流程"></a>
#### 优化流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化流程)。
7. 只有候选体积更小且全部适用验证通过时才替换原文件；任一验证失败、体积不降或收益不足以抵偿画质与兼容风险时保留原文件。替换后再次核对引用与版本控制差异，确保修改范围仅包含获准资源及必要引用。

<a id="mode-phaser4-game-image-optimization--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#结果报告)。
<!-- native-source:phaser4-game-image-optimization:end -->


## 游戏广告接入

<!-- native-source:phaser4-game-ad-integration:start -->
<a id="mode-phaser4-game-ad-integration"></a>

<a id="mode-phaser4-game-ad-integration--phaser-4-applovin-max-广告接入"></a>
### Phaser 4 AppLovin MAX 广告接入

<a id="mode-phaser4-game-ad-integration--适用范围与硬边界"></a>
#### 适用范围与硬边界

本 Skill 只处理 Phaser 4 + TypeScript/Vite + Capacitor 移动项目的 Banner、插页与激励视频广告能力，聚合层固定使用 AppLovin MAX，接入实现固定使用 AppLovin 官方维护的 `cordova-plugin-applovin-max`，由 Capacitor 的 Cordova 兼容层加载。项目只在 TypeScript 侧建立业务门面和官方插件 API 适配，不自建 Android/iOS 广告插件，也不直接集成 MAX 原生 SDK。所有已配置广告位独立维护状态；插页与激励视频只在后台静默预加载，不在初始化阶段主动创建广告对象或视图，插件内部按需管理加载资源。插页与激励视频预加载成功以当前广告实例对象的就绪属性为准，loaded 回调和业务 phase 不能单独证明成功。全屏展示读取实例就绪属性与现有业务状态并立即返回；Banner 不预加载，只在业务请求展示时创建并加载；支持 Banner 且广告位启用、页面允许展示时，在页面首帧前先预留广告区域并完成 UI 布局，不等广告加载或展示。每个广告位独立维护加载失败计数、retry deadline 和至多一个重试 timer，但使用相同分类、退避、暂停和恢复规则。开始任何设计、实施或审查前，必须先读取唯一细则合同 [AppLovin MAX 接入合同](../../phaser4-game-ad-integration/references/applovin-max-contract.md)，并以其中的状态、时序、失败和合规规则为准。

- Phaser Web、浏览器预览和小游戏不直接调用 MAX，也不加载原生广告 SDK；广告能力在这些运行目标上必须是明确的 `unsupported`/no-op，调用后立即返回并继续游戏。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 视频广告位在用户触发展示但当前不可用，或官方插件接受展示后回调 `displayFailed` 时，通过统一 UI 层弹出一次“视频广告暂不可用，请稍后再试”Toast；不得由插件适配层直接操作 Phaser UI，也不得因重复回调重复提示。
- SDK 初始化与隐私流程独立推进：初始化调用、完成状态和失败重试均不等待隐私弹窗、CMP 或 ATT；隐私未决、失败或拒绝不阻塞 SDK 初始化。MAX 内建 Terms and Privacy Policy Flow 必须在初始化前显式关闭并核验同步后的有效原生配置；广告服务仍启用且继续调用 MAX initialize，不能通过禁用广告或跳过初始化实现关闭流程。隐私收集由独立任务通过项目采用的原生 CMP/Google UMP 与 ATT 入口处理，广告服务只消费真实隐私状态，并仅对广告加载与展示检查 privacy gate。SDK 初始化成功仍以官方插件真实完成回调为准，不能用请求受理或隐私结果代替。具体配置和能力边界以细则合同为准。
- 新 MAX 实例首次实际初始化前，适配器按统一入口的初始化请求先手动调用官方插件 `setHasUserConsent(false)`，再调用 `initialize`；同配置重复调用复用现有任务。`hasUserConsent=false` 不等于禁止广告，不得据此返回 `privacy-pending`/`privacy-blocked`、跳过 load/show、停止预加载或暂停加载重试。privacy gate 只表达尚未满足的其他实际适用请求条件，不以 `hasUserConsent === true` 作为广告准入条件；不得把该 MAX 配置当作用户已完成选择的回执或 AppsFlyer 的同意状态。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-phaser4-game-ad-integration--全局控制接入"></a>
#### 全局控制接入



> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-phaser4-game-ad-integration--交付流程"></a>
#### 交付流程

广告 SDK 初始化及独立隐私任务的应用层启动统一接入 `src/platform/initialize-sdks.ts`，按[SDK 统一初始化](../../phaser4-game-architecture/references/sdk-initialization.md)分别投递；MAX 初始化调用、真实完成回调、幂等状态与初始化恢复任务由 `src/platform/sdks/max-sdk.ts` 持有，官方插件适配器只封装原生 API 细节。广告服务继续持有各广告位的加载/展示状态和运行期恢复任务。不得在 Scene、Boot/Preload 或构造函数再建启动入口，也不因统一投递而让隐私任务成为 MAX 初始化前置。

项目采用 AppsFlyer 时，它在自己的 `src/platform/sdks/appsflyer-sdk.ts` 中独立初始化和启动，不等待 MAX、MAX 内建隐私流程或广告加载，也不在 MAX 回调中启动；MAX 同样不等待 AppsFlyer 或归因结果。两者的失败、超时与恢复分别处理，不相互取消，不重复安装或初始化插件已管理的传递依赖。

1. 读取当前 Work Item、项目 TDD/依赖能力档、Capacitor 平台状态及官方插件安装状态；按 [AppLovin MAX 接入合同](../../phaser4-game-ad-integration/references/applovin-max-contract.md)登记范围、非目标、公开接口、状态所有权、生命周期和失败边界。广告属于可选商业能力，不能把它作为 Phaser Web 核心循环的运行前置。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
3. 冻结插件适配契约：`initialize`、`preload(slotId)`、`tryShow(context)`、`setBannerVisibility(slotId, visible)`、`isReady(slotId)` 均为非阻塞调用并返回结构化结果；MAX 管理文件负责注册并处理 MAX 初始化回调，适配层只封装必要的原生 API 调用细节。MAX 初始化失败进入 `failed`：明确的瞬时故障由 `src/platform/sdks/max-sdk.ts` 中 MAX 独立任务按 2/4/8/16/32/64 秒持续退避；后台、离线或宿主条件未满足时暂停，恢复后继续；配置或依赖错误修正后通过注入的 MAX 单 SDK 重试入口显式恢复。SDK 初始化恢复与广告位加载恢复隔离，不混用 timer 或计数。支持平台且服务启用、插件配置有效时，必须发起 MAX 初始化，不以隐私同意、CMP 完成或 ATT 授权作为调用前置。每个广告位只有一个业务状态所有者，原生格式对象由官方插件内部管理。初始化成功后立即投递全部启用的插页与激励视频预加载意图，实际加载经过广告请求隐私门；所有已发起的加载失败都由各广告位自己的重试 timer 持续调度，不按错误类别终止、不设次数上限，直到成功；禁用、移除或服务销毁终止对应广告位重试，运行 gates 关闭仅暂停。各广告位独立保存计数与 deadline，并应用同一套 `2/4/8/16/32/64 秒`退避、抖动、去重、后台/离线暂停和恢复规则。一个广告位取消、重排或触发重试不得改变其他广告位的 timer。
4. 将 MAX 控制台、官方插件及其原生依赖、Capacitor Cordova 兼容配置、独立隐私任务（CMP/Google UMP/ATT）、广告位配置和遥测分别登记责任人。隐私任务不作为 SDK 初始化任务的前置依赖或完成条件。固定聚合渠道为 AppLovin、Google AdMob、Mintegral、Pangle、Unity Ads、DT Exchange（Fyber）和 Verve（PubNative/HyBid）；插件、MAX SDK 与 adapter 的版本组合以官方插件和官方渠道文档当前声明的兼容范围为准，不在 Skill 或业务代码中写死版本号，也不绕过插件重复引入 MAX SDK。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
8. 将候选 diff、接口契约、平台日志（脱敏）、失败重试轨迹和验证结果提交给 `$app-workflow-control`；把未执行的外部配置、真机、实时广告和发布步骤列为明确未覆盖项。

<a id="mode-phaser4-game-ad-integration--最低公开契约"></a>
#### 最低公开契约

共享门面至少提供以下语义，具体参数命名可按目标项目惯例落地，但不能改变返回时序：

```ts
initialize(config): Promise<InitResult> // 只确认桥接请求受理/初始化状态，不等待广告加载
retryInitialize(): Promise<InitResult>  // 转发至MAX 管理文件中的 MAX 任务，不绕过退避或配置阻断
preload(slotId): Promise<PreloadResult> // 仅插页/激励后台加载；Banner 返回 format-mismatch
isReady(slotId): ReadyResult            // 全屏读取实例就绪属性；Banner 读取加载状态，不创建或加载
tryShow(context): Promise<ShowResult>   // 复核实例就绪属性和业务门，通过后才展示
setBannerVisibility(slotId, visible): Promise<BannerVisibilityResult> // 展示时按需创建/加载，立即返回
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-phaser4-game-ad-integration--交付审查清单"></a>
#### 交付审查清单

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 原生门：Activity/ViewController provider、前台状态和网络连通性参与初始化调度；privacy readiness 仅参与广告加载与展示，不参与初始化调用、完成判定或重试，也不等于 `hasUserConsent`。必须覆盖 `false` 已设置且无其他阻断时正常加载的路径。`phase` 只表示广告资源/展示阶段，门状态独立计算，不混入 Phaser 场景状态。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 初始化恢复：MAX 管理文件中的 MAX 独立任务最多持有一个初始化请求和一个待执行重试 timer；瞬时失败持续退避，宿主/前台/网络门关闭保留 deadline，隐私状态不暂停初始化重试，恢复时去重调度；配置错误不自动重试。成功、禁用或销毁清理该 SDK 的恢复任务，成功后只投递一次全屏预加载意图，广告请求仍检查隐私门，阻断时保留意图待恢复。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- Banner：不预加载、不默认创建；首次展示请求创建并加载，创建失败和加载失败共用一个持续退避重试任务；离开展示场景立即取消任务并使旧请求失效，再次进入须重新请求展示；ready 且布局安全后按当前可见请求显示，失败保持隐藏且无 Toast；页面首帧前按平台 Banner 尺寸规则和安全区预留区域，加载、失败、重试与显隐回调不改变内容 inset；实际尺寸只用于验证能否安全放入预留区域，布局不遮挡游戏交互；刷新只有一个所有者，禁止 JS/Phaser 自建刷新 timer。
- 合规与安全：独立隐私任务的 CMP/Google UMP/TCF 配置、MAX 隐私标志、iOS ATT、SKAdNetwork、Google 要求和目标地区规则均有责任人和证据；初始化链路未启用自动隐私弹窗，隐私事件不改写 SDK 初始化状态；SDK key 与广告位来自受控的分环境构建配置并仅供官方插件适配器使用，账号凭证与 Ad Review key 不进入 Web 层，遥测脱敏。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

本仓库本次只交付 Skill 指导文件，不新增运行时代码、脚本、SDK 依赖或外部配置。

<a id="mode-phaser4-game-ad-integration--本栈配套资料"></a>
#### 本栈配套资料

- [接入合同](../../phaser4-game-ad-integration/references/applovin-max-contract.md)
- [官方 Cordova 集成文档](https://support.applovin.com/en/max/cordova/overview/integration)
- [官方仓库](https://github.com/AppLovin/AppLovin-MAX-Cordova)
<!-- native-source:phaser4-game-ad-integration:end -->


## 视觉素材生产

<!-- native-source:phaser4-game-asset-integration:start -->
<a id="mode-phaser4-game-asset-integration"></a>

<a id="mode-phaser4-game-asset-integration--phaser-4-游戏美术生产与接入"></a>
### Phaser 4 游戏美术生产与接入

<a id="mode-phaser4-game-asset-integration--全局控制接入"></a>
#### 全局控制接入





<a id="mode-phaser4-game-asset-integration--工作流"></a>
#### 工作流

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-phaser4-game-asset-integration--场景还原合同effect-image-强制"></a>
##### 场景还原合同（effect-image 强制）

V3 拆解先遵守[功能语义分组约束](../../phaser4-game-ui-layout/references/functional-semantic-grouping.md)：确认真实功能父级、信息分组、独立定位参照与必要溢出。图标与文字可保持同级，使用 `position_reference_id` 表达相对定位；突出非根父框时显式说明 `visual_overflow`。布局不得按类型、几何包含或位置依赖自动改树，归属不明留在拆解确认。Phaser 保留 Container 与底板显示对象各自身份，不套用 Cocos Sprite 容器或 RAW 尺寸规则。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。
4. schema 1.5 `visual-assets.json` 先声明 `effect_image_reconstruction`：普通资产为 `not-applicable`，不要求还原工件；效果图还原为 `effect-image`。后者冻结目标后、进入 V4 前以 `v3-ready` 完成合同回对和 coverage，V3/V4 可暂无 fidelity case；只有 V5 验证完成才为 `v5-complete` 并要求全部 case 通过。效果图 coverage 逐区登记 `annotation_number` 与 `implementation_plan`，先完成 ownership/实现分类，再做带实际证据文件、冻结目标文件、分析 ID 和完成时间的 `state_analysis`，严格在 component inventory 之前完成，最后按唯一原子部件填写 `component_inventory`、placements 与 `expected_assets`；编号不是资产数量单位。视觉来源与装配方式必须分开：`visual_route_analysis` 只能在独立 coverage region 上选择 `image-asset` 或 `phaser-native`，`assembly_analysis` 再独立声明原子 Scene 装配、禁止整屏捕获并允许独立图片资产；不得从“不能整屏贴图”推导 `runtime-program`。如果同一视觉事实同时包含程序逻辑与独立视觉资产，必须回到 V2/PROPOSAL 重新划分 coverage/annotation：图片外观进入独立 image-asset region，程序行为进入独立 phaser-native/runtime region，分别进入各自生产与运行逻辑合同。禁止使用单一 `composite` region 或 `composite_parts` 在一个区域内闭环生产、验收。全部区域均为 `phaser-native` 时必须提供绑定目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`，文件门会读取实际文件并逐区核对资格事实。状态分析必须覆盖普通、selected/active、disabled、pressed/hover、victory/defeat/paused，实际适用写 `required`，不适用写 `not-applicable+reason`。② 顶部 6 个按钮必须 6 个 component；⑧ 的 3 个相同底部表面可登记 1 个 component+3 个 placements，⑨ 的动作图标按实际复用关系登记；③、④、⑦ 只有在明确单部件且其余状态不适用时才保持单图。默认 individual 模式禁止横向组图；`image_generation_required=true` 的生成式位图使用 `individual + atlas_allowed=false`，其 `expected_assets.width/height` 由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，必须精确为最小尺寸；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 必须为 `none`，尺寸合同本身不需要 human_review。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 按设备动态读取并封顶为 2。历史 1.5/2 倍生产证据须重生成或标记 `stale`。其他生产方法只有在显式合同下才能使用完整 `atlas_slice` 图集。每个 placement 必须声明 `interaction_required`，真实 `interaction_hotspots` 只能按 placement 一一绑定且不计入视觉资产。确认图仍同时呈现 `generate-now`、`reuse-existing` 和 `runtime-program`，但 PNG 仅绘制用户摘要与“新建图片资产 / 复用现有图片 / 程序绘制或动态逻辑”标签；placement ID、坐标尺寸、组件/状态/资产技术字段不进入可见行。运行 `--proposal` 时，这些技术字段完整写入拆解分析技术 JSON，并与 PNG 元数据、实际区域定义及现有 confirmation 业务字段绑定。系统按提示词、参考输入、材质、透明需求和可用能力决定是否使用图像生成；`independent-production` 与 `generate-now` 不作任何生成器推断。V3 再按 [资产生产路线](../../phaser4-game-asset-integration/references/asset-production-routes.md) 选择路线。
   路线按可观察视觉事实和 Phaser 实际渲染能力判断，不按“按钮”“面板”等语义，也不以静态/动态作为唯一条件。文本、纯色矩形、基础几何、规则边框、可确定性表达的简单规则渐变、遮罩和进度填充，在 Phaser 原生能力可精确表达冻结外观时可选 `phaser-native`；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰使用独立图片路线。原生路线冻结 `native_suitability.render_contract` 的 renderer、尺寸、颜色、线宽、圆角、渐变、透明度、适用状态和不支持特征；无法支持的视觉特征必须阻断，不能近似替代后通过。
   图片、图片局部和文字先按[完整拆解与视觉显著性](../../phaser4-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)登记可独立部件，保持功能、交互与状态联动；明显美术外观优先位图，低显著性操作文字考虑系统文本，简单填充考虑原生绘制。再核对[完整程序还原资格](../../phaser4-game-asset-integration/references/asset-production-routes.md#程序还原资格与位图回退)：程序必须完整实现方案要求保留的外观；主体与效果无法可靠分离时保留完整原子视觉部件。动态/本地化文字按[文字路线判定](../../phaser4-game-ui-layout/references/layout-contract.md#文字路线判定)保留可变能力，不在实现时静默简化已确认的美术效果。
   色彩填充同样按[色彩填充路线判定](../../phaser4-game-asset-integration/references/asset-production-routes.md#色彩填充路线判定)拆分：明显材质和光影保留独立位图，有风格的重复表面优先复用贴图，低显著性基础填充考虑原生绘制；动态比例和状态仍保持可变，不能把填充与边框、辉光或纹饰混作纯色区域。
   外观来源与行为装配分别记录和绑定；例如按钮可由原生框体、独立图标图片和 Phaser.Text 文字组成，并通过明确组件/节点引用接入交互，不合并为 `composite` 区域。`image_generation_required=true` 一经冻结不得自动换成原生路线，只能遵循明确接受的 Change Request 变更。
5. V3 可运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V3`；V4 正式验收运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V4 --check-files --project-root .`，V5 正式验收运行同命令但使用 `--stage V5`。独立弹窗工作项必须额外传入 `--work-item-type DISPLAY_LAYER`，场景工作项默认按 `SCENE` 校验；该参数只改变显示层作用域，不把弹窗纳入宿主场景验收。V4 逐项验证真实资源文件、来源/许可信息（如适用）、预算、冻结基线、coverage 和 `production_contract_audit`；V5 验证正式 Scene 消费、运行组合、F2 两类机器证据、F3 runtime replay 与适用 fidelity cases。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

透明路线由 `expected_assets.transparency_requirements` 冻结策略与 `edge_profile`。只有 `hard-edge` 且主体与纯色背景明显区分时才可走 `background-removal`；复杂边缘禁止阈值去背。`direct-alpha` 必须匹配已验证的工具、版本和边缘类型，并用 PNG 解码证明真实透明像素；generation record 顶层 `generator/generator_version` 是实际身份，`capability.tool/tool_version` 必须与之相同。`mask-composition` 必须绑定独立遮罩或人工创作的实际输入和工具参数。能力不足时报告缺口，不提高容差、硬抠轮廓、删除光效或伪造结果。生成记录按实际路线登记生成器身份、参数、输入/输出 SHA 和后处理；归一化保持比例、Alpha 和主体边界，并禁止把棋盘格预览烘焙进素材。每个候选都生成浅底与深底预览，V5 完成主体缺损、残留背景、色边和半透明区域的视觉检查。已有真实透明图按资源复用合同接入，不伪造生成或去背记录。`image_generation_required=true` 的冻结合同不能由透明路线判断或提示词生成器自动替换。
7. V1 可按已授权范围实现并验证正式功能，白盒按需使用；视觉样片不能伪装成正式可交互场景。V3 确认后生产 V4 正式资源；V5 在正式 Phaser Scene 中实现功能并消费已验收资源，禁止一次性截图 Scene、整屏铺图、隐藏覆盖层和绝对叠层凑像素。V5 在正式功能实现之后与玩法协作完成结构化集成、动态验收和低保真清理；上游事实或当前受影响候选身份变化时才使对应 fidelity case 失效重采，其他单元证据继续有效。

正式效果图标注命令必须带 `--proposal <file>.json`；省略该参数直接失败，不生成只有用户图示的成功产物。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-phaser4-game-asset-integration--条件参考"></a>
#### 条件参考

- 参考截图、录屏、运行项目或源码还原：读取 [视觉还原](../../phaser4-game-asset-integration/references/visual-reconstruction.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。
- UI：同时读取 [`phaser4-game-ui-layout`](#mode-phaser4-game-ui-layout) 的布局合同、Phaser 适配器和证据矩阵；资源 origin、布局锚点与动画偏移按合同分离，资产接入不得重新发明布局规则。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-phaser4-game-asset-integration--审核与交付"></a>
#### 审核与交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-phaser4-game-asset-integration--视觉确认边界"></a>
##### 视觉确认边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-phaser4-game-asset-integration--本栈配套资料"></a>
#### 本栈配套资料

- [响应式视觉验证](../../phaser4-game-qa-performance/references/responsive-visual-validation.md)
- [满幅背景](../../phaser4-game-asset-integration/references/full-bleed-background.md)
- [九宫格 UI](../../phaser4-game-asset-integration/references/nine-slice-ui.md)
- [`离线布局审阅产物`](../../phaser4-game-ui-layout/references/layout-review-artifacts.md)
- [控制模型](../../phaser-domain-contracts/references/control-model.md)
- [全局视觉控制](../../phaser4-game-asset-integration/references/global-visual-control.md)
- [视觉还原](../../phaser4-game-asset-integration/references/visual-reconstruction.md)
- [视觉生产管线](../../phaser4-game-asset-integration/references/visual-production-pipeline.md)
- [功能与场景阶段的共享规划](../../phaser4-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)
- [正式图片生成后的共享与复用](../../phaser4-game-asset-integration/references/asset-production-routes.md#正式图片生成后的共享与复用)
- [图片批量生成](../../phaser4-game-asset-integration/references/visual-production-pipeline.md#图片批量生成)
- [帧动画合同](#mode-phaser4-frame-animation)
- [《Effect-image 生成式位图忠实还原提示词合同》](../../phaser4-game-asset-integration/references/effect-image-prompt-contract.md)
- [独立工作项规则](../../phaser-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏美术体验与质量契约](../../phaser4-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md#效果图生成)
<!-- native-source:phaser4-game-asset-integration:end -->
