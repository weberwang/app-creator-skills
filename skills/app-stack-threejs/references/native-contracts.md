# threejs 原生技术合同

本手册中的 DPR 动态封顶 2 与图片生产基线 1 仅适用于对应 Web 管线；原生平台不强制填写浏览器 DPR。普通屏幕 UI 图片保持源逻辑尺寸，合法九宫格可按切片改变显示框；屏幕装饰背景按独立 cover-v1 合同等比覆盖；设备密度、容器或相机映射不授权额外缩放。图片生产归一化与运行展示分别管理，详见[各栈尺寸与密度](../../app-ui-layout/references/relative-layout.md#技术栈的尺寸与密度)。

本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。

各技术栈统一使用 V0–V5：V0 范围、V1 功能验证、V2 视觉目标、V3 拆解布局、V4 资源导入、V5 正式运行验收；白盒按需使用。包含视觉阶段的领域记录必须声明 `visualStageModel: function-first-v1`，无阶段的纯资源协议不需要该字段。

## 能力索引

- **产品与游戏需求**
  - [three.js 制作策划](#mode-threejs-game-production)
- **技术架构与模块设计**
  - [three.js 技术架构](#mode-threejs-game-architecture)
- **游戏玩法实现**
  - [three.js 玩法开发](#mode-threejs-gameplay-development)
- **游戏音频**
  - [three.js 音频设计](#mode-threejs-game-audio)
- **游戏数值与经济**
  - [three.js 数值设计](#mode-threejs-game-balance)
- **游戏与应用汁水设计**
  - [three.js 游戏汁水感](#mode-threejs-game-juice)
- **候选交付与发布准备**
  - [three.js 发布与合规](#mode-threejs-game-release)
- **质量审核与性能验证**
  - [three.js 测试与性能](#mode-threejs-game-qa-performance)
- **动画制作与接入**
  - [three.js 通用帧动画制作](#mode-threejs-frame-animation)
- **三维几何建模**
  - [three.js 游戏 3D 几何建模](#mode-threejs-game-3d-modeling)
- **界面布局与自适应**
  - [three.js 游戏 UI 布局](#mode-threejs-game-ui-layout)
- **项目整理与产物清理**
  - [three.js 记录与中间产物清理](#mode-threejs-game-artifact-cleanup)
- **图片优化**
  - [three.js 图片资源优化](#mode-threejs-game-image-optimization)
- **游戏广告接入**
  - [three.js AppLovin MAX 广告接入](#mode-threejs-game-ad-integration)
- **三维资源与运行管线**
  - [三维模型与关卡管线](#mode-threejs-game-model-pipeline)
- **运行时插件与扩展**
  - [游戏插件方案](#mode-threejs-game-plugins)
- **项目初始化与基础运行时**
  - [three.js 游戏运行基础](#mode-threejs-game-runtime)
- **视觉素材生产**
  - [three.js 游戏美术生产与接入](#mode-threejs-game-asset-integration)

## 产品与游戏需求

<!-- native-source:threejs-game-production:start -->
<a id="mode-threejs-game-production"></a>

<a id="mode-threejs-game-production--threejs-制作策划"></a>
### three.js 制作策划

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-threejs-game-production--最短流程"></a>
#### 最短流程

[公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-threejs-game-production--领域边界"></a>
#### 领域边界

- [公共策划范围与验收约定](../../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。
- 全局静态基线、场景方向和高保真证据由控制面统一校验；本领域只提供体验意图、功能事实和范围，不用文字或根摘要替代机器证据。

<a id="mode-threejs-game-production--交接与收敛"></a>
#### 交接与收敛

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/game-production.md#完整流程)。

<a id="mode-threejs-game-production--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../threejs-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../threejs-domain-contracts/references/state-gates.md)
- [实际完成情况](../../threejs-domain-contracts/references/control-model.md#按实际完成情况验收)
- [游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md#工作流接入)
- [汁水感设计指南](../../threejs-game-juice/references/design-guide.md)
- [功能与场景阶段的共享规划](../../threejs-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
<!-- native-source:threejs-game-production:end -->


## 技术架构与模块设计

<!-- native-source:threejs-game-architecture:start -->
<a id="mode-threejs-game-architecture"></a>

<a id="mode-threejs-game-architecture--threejs-技术架构"></a>
### three.js 技术架构

<a id="mode-threejs-game-architecture--全局控制接入"></a>
#### 全局控制接入





建立可维护、可测试、可构建的 Web 3D 工程边界。浏览器是默认运行环境；只有目标渠道明确需要时，才增加小程序、桌面封装或移动原生宿主适配。

<a id="mode-threejs-game-architecture--输入与边界"></a>
#### 输入与边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。

- 用 three.js、TypeScript 和项目选定的 Web 构建工具实现浏览器核心；WebGL 2 的 `WebGLRenderer` 是默认渲染器。只有项目明确选择 WebGPU 并验证目标浏览器、材质和部署要求后，才采用 `WebGPURenderer`。
- 新建或调整 Vite 生产构建时，按[生产构建压缩与发布检查](../../threejs-game-architecture/references/production-build.md)配置 Terser 两轮压缩、标识符缩短、注释移除和生产 Source Map 显式关闭，核对最终 Web 与渠道资源的实际字节。
- three.js `Scene` 是 `Object3D` 树，负责组织可见对象，不充当游戏状态容器。独立的场景控制器拥有玩法状态与生命周期，并提供 `enter`、`update`、`exit`、`dispose`；渲染循环按固定步长推进玩法/物理，再用渲染插值显示当前状态。
- 浏览器是默认平台。仅当目标渠道确实要求原生宿主时才采用 Capacitor 或对应宿主；平台插件按能力逐项选择并封装在适配层，不预装非必需插件。
- 小游戏必须单独验证；可选商业能力须有显式接口和已批准开关。
- 项目采用的 SDK 按[SDK 单文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)统一在 `src/platform/initialize-sdks.ts` 实现启动、回调、幂等和初始化重试。各 SDK 独立发起，不互相等待，也不等待隐私流程、场景或全局就绪；原生真实条件按各 SDK 单独检查，业务使用仍遵守相应能力门。
- 基础模块按[音频生命周期约束](#mode-threejs-game-audio--后台暂停与恢复约束)处理浏览器页面可见性和音频上下文受限；只有采用原生宿主时才添加对应平台生命周期适配。
- 基础模块按[基础显示约束](../../threejs-game-orchestrator/references/game-implementation.md#基础显示约束)让 Canvas 适配实际 CSS 视口并保持 Camera、HUD 和输入坐标一致。原生窗口主题、沉浸式全屏和平台安全区只在对应宿主被选用时实现。

<a id="mode-threejs-game-architecture--原生平台插件选型"></a>
#### 原生平台插件选型

仅在项目已选择 Android/iOS 原生宿主或明确需要原生平台能力时应用本节；浏览器项目不因此引入 Capacitor、原生工程或平台插件。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
- 选型核实插件对项目当前宿主框架版本、目标 Android/iOS 版本、所需 API、权限和生命周期行为的支持；采用 Capacitor 时明确核对其版本。记录依赖版本、维护状态、许可、平台限制和验证方式，只安装当前需求实际使用的插件。
- 插件调用统一封装在平台适配层，通过项目公开接口向业务提供能力；业务和场景控制器不直接调用插件。Web/小游戏适配显式声明支持情况与失败语义，不以空实现伪装原生能力成功。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。

<a id="mode-threejs-game-architecture--执行与交接"></a>
#### 执行与交接

新建游戏项目、实现基础模块或调整目录与模块边界时，先读取[游戏项目目录规范](../../threejs-game-architecture/references/project-structure.md)，按入口/基础服务分层、场景功能聚合组织代码；生成或归档产物时同时读取[产物目录与归档规范](../../threejs-game-architecture/references/artifact-storage.md)，明确临时文件、已确认成果、资源、平台、测试和工作流记录的归属，并把实际路径与所有权写入 TDD 和实施包。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
2. 在 TDD 标注 foundation-only 的 `SHARED`/`MODULE` 范围、场景 `SCENE`/`DISPLAY_LAYER` 归属和跨场景 `INTEGRATION` 依赖。基础包只提供稳定契约，不实现具体场景玩法、HUD/布局、正式可见资产消费或 Boot→正式可见 Scene 接入；[公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)场景控制器只通过公开服务、状态仓库或消息契约协作，不得直接访问其他控制器的内部状态。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
4. 装饰性屏幕空间背景只用于非交互背景。关卡、地形、碰撞、玩法环境和相机轨迹使用独立世界数据与坐标合同，不套用 HUD 的固定设计分辨率。按[显示对象锚点与显示层分层](../../threejs-game-ui-layout/references/display-object-layering.md)声明真实 `Object3D` 根、Camera、渲染顺序、深度测试、输入、生命周期和资源所有权；对象枢轴通过几何局部坐标或父级 `Group` 表达，跨层合成由 Camera/DOM/渲染通道合同明确。
5. 涉及屏幕 HUD 时使用 [`threejs-game-ui-layout`](#mode-threejs-game-ui-layout) 定义布局入口，并记录 CSS client rect、有效 DPR（最高 2）、Canvas backing、Camera、输入映射、安全区、resize、代表性视口、性能预算和证据字段。Canvas 尺寸按 CSS 宽高配置，物理像素不作为 UI 坐标；改尺寸后同步更新相机投影矩阵。传统按钮/文字优先由 DOM Overlay 布局，需在 3D Canvas 内绘制的 HUD 使用 OrthographicCamera。固定 1080×1920 设计基准只可用于 HUD；透视世界按项目单位、关卡几何、相机和视锥另立 world contract。DPR 变化时 CSS/backing 与输入映射一起更新，监听器按显示模块生命周期清理。弹窗/DISPLAY_LAYER 继承宿主 CSS 视口与输入合同；独立 Camera 或 Canvas 另行声明合成和命中映射。布局重算保持幂等；合同验证属于 F3，特殊视口与遮挡规则触发布局专项 F2。
6. 分离核心规则、表现、平台和第三方服务。[公共架构模块契约](../../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)foundation-only 阶段的 `SHARED` 只提供最小启动、公开契约与 Boot/Preload 生命周期，`MODULE` 只提供场景无关数据/状态/输入/资源基础设施、渲染循环和测试支撑；具体场景业务、HUD/布局和正式可见资产仍在对应场景阶段完成。每个场景在自身阶段完成玩法、正式视觉、自有常驻 HUD、清理和联合证据；瞬态弹窗由独立 DISPLAY_LAYER 工作项负责，不作为宿主场景验收前置。玩法独占规则、状态、物理语义和交互代码；美术可维护纯表现资源配置、场景数据和视觉集成调整，但不得改变玩法规则、碰撞语义或状态所有权。为浏览器输入、页面暂停/恢复、可见性、视口与目标硬件定义验证策略。
7. 对组件/资源集和场景路径，在 V2 定义每场景纹理、图集、帧数、动画采样、纹理内存、过绘、Draw Call 和最大纹理预算；在 V4 将预算写入机器清单，V5 验证正式资源与场景组合。原子资源必须引用已有适用且有效的玩法视觉契约与预算基线，否则升级路径；不得在验收时临时放宽。
8. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/architecture-handoff.md#完整流程)。
10. 共享基础完成后验证代表性浏览器/Vite 启动、WebGL2 Renderer、Boot/首场景、资源和已选插件；关键玩法流完成后验证项目声明的目标浏览器/硬件；仅最终集成/G3/release 执行项目实际采用渠道的平台矩阵。不得由局部证据宣称全平台通过，不得自动发起真机验收。
11. F0 完成后提交范围与流程事实；F1 提交规格映射；F2 提交独立架构结论；F3 提交候选 SHA、实际命令证据和未覆盖项。

交给玩法开发模块入口、数据流和测试入口；交给测试提供构建命令、版本和日志定位方式。新增或修改的类、函数、实体定义均添加解释设计边界的简体中文注释。

<a id="mode-threejs-game-architecture--本栈配套资料"></a>
#### 本栈配套资料

- [控制模型](../../threejs-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../threejs-domain-contracts/references/state-gates.md)
<!-- native-source:threejs-game-architecture:end -->


## 游戏玩法实现

<!-- native-source:threejs-gameplay-development:start -->
<a id="mode-threejs-gameplay-development"></a>

<a id="mode-threejs-gameplay-development--threejs-玩法开发"></a>
### three.js 玩法开发

全局阶段、V0–V5、状态、执行结果与证据门统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行。本领域只负责玩法规则、状态、交互和动态验收；场景按 V0–V5 推进；V1 验证功能，V3 的拆解和布局分别确认。

<a id="mode-threejs-gameplay-development--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实际实施结果、证据与阶段迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈玩法规则、状态、交互和动态验收。

<a id="mode-threejs-gameplay-development--所有权"></a>
#### 所有权

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-threejs-gameplay-development--实现"></a>
#### 实现

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
3. 对当前场景明确可观察玩家行为、状态迁移、时序、反馈、成功/失败和异常恢复。截图无法证明的行为标为待定义，不自行推断。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。
6. 只使用绑定当前 `scene_id` 或合规 `shared` 且 V4 `accepted` 的资源进入正式功能实现。用 `Object3D`/`Group` 层级、模型、网格和相机结构化装配，按[显示对象锚点与显示层分层](../../threejs-game-ui-layout/references/display-object-layering.md)区分模型局部枢轴、碰撞代理与 `Sprite.center`；记录坐标单位、变换和必要例外，并声明背景、世界、特效、HUD 与瞬态层的合成顺序和输入归属。UI 从 [`threejs-game-ui-layout`](#mode-threejs-game-ui-layout) 布局契约计算，区分坐标空间、资源原点、布局停靠点与动画偏移，并在视口、安全区、方向、状态和内容变化后通过唯一入口幂等重排。普通测试验证相对关系，不把绝对屏幕坐标当作通用验收标准。
7. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-threejs-gameplay-development--证据"></a>
#### 证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#完整流程)。

<a id="mode-threejs-gameplay-development--本栈配套资料"></a>
#### 本栈配套资料

- [`threejs-game-ui-layout`](#mode-threejs-game-ui-layout)
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md#资源拆解与界面实现)
- [汁水感设计指南](../../threejs-game-juice/references/design-guide.md)
<!-- native-source:threejs-gameplay-development:end -->


## 游戏音频

<!-- native-source:threejs-game-audio:start -->
<a id="mode-threejs-game-audio"></a>

<a id="mode-threejs-game-audio--threejs-音频设计"></a>
### three.js 音频设计

<a id="mode-threejs-game-audio--全局控制接入"></a>
#### 全局控制接入



Work Item 范围、实施结果、证据门、验证与用户确认统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能继续维护本栈音频设计和运行约束。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。
5. 标准、发布通道向总控提交一条音频范围、证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#音频需求与资产交接)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-threejs-game-audio--后台暂停与恢复约束"></a>
#### 后台暂停与恢复约束

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio.md#后台暂停与恢复约束)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/audio-implementation.md#完整流程)。

<a id="mode-threejs-game-audio--本栈配套资料"></a>
#### 本栈配套资料

- [动态反馈设计指南](../../threejs-game-juice/references/design-guide.md)
<!-- native-source:threejs-game-audio:end -->


## 游戏数值与经济

<!-- native-source:threejs-game-balance:start -->
<a id="mode-threejs-game-balance"></a>

<a id="mode-threejs-game-balance--threejs-数值设计"></a>
### three.js 数值设计

<a id="mode-threejs-game-balance--全局控制接入"></a>
#### 全局控制接入





> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。

汁水感调整涉及顿帧、硬直、实际击退、吸附或输入容错等规则参数时，按[玩法与表现边界](../../threejs-game-juice/references/design-guide.md#设计原则与玩法边界)与玩法共同确定影响和验证；纯粒子、声音或视觉偏移不因此进入数值修改范围。

读取全局 Work Item、项目配置、GDD、当前玩法实现和数值模型。按 F0 范围与流程、F1 规格一致性、F2 数值质量、F3 模拟/实测/回归证据和 F4 集成/发布决策推进。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
4. 标准、发布通道向总控提交一条模型版本、关键证据或阻断项，由总控更新控制面；快速通道仅在产生未决决策或阻断项时提交。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/balance.md#数值模型与参数交付)。
<!-- native-source:threejs-game-balance:end -->


## 游戏与应用汁水设计

<!-- native-source:threejs-game-juice:start -->
<a id="mode-threejs-game-juice"></a>

<a id="mode-threejs-game-juice--threejs-游戏汁水感"></a>
### three.js 游戏汁水感

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-threejs-game-juice--控制面与职责"></a>
#### 控制面与职责



- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#模块职责边界)。
- 美术、二维帧动画、三维模型动画和音频继续拥有对应素材生产、登记、时间轴及生命周期。帧动画可用于 HUD、billboard 或贴图序列，三维角色骨骼动画由模型 clips 与 `AnimationMixer` 驱动；两条路线不能互相冒充。优先复用已有模块，不为调用本 Skill 新建运行时管理器。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。
- 沿用已授权的范围、服务复用、当前分支和测试规则；不自动启动真机或执行外部写入、付费、发布等受保护操作。

<a id="mode-threejs-game-juice--按需读取"></a>
#### 按需读取

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#按需读取)。

<a id="mode-threejs-game-juice--执行闭环"></a>
#### 执行闭环

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/juice.md#执行闭环)。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-threejs-game-juice--交付"></a>
#### 交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/feedback-lifecycle.md#完整流程)。

<a id="mode-threejs-game-juice--本栈配套资料"></a>
#### 本栈配套资料

- [完整设计指南](../../threejs-game-juice/references/design-guide.md)
- [工作流接入](../../threejs-game-juice/references/workflow-integration.md)
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md)
<!-- native-source:threejs-game-juice:end -->


## 候选交付与发布准备

<!-- native-source:threejs-game-release:start -->
<a id="mode-threejs-game-release"></a>

<a id="mode-threejs-game-release--threejs-发布与合规"></a>
### three.js 发布与合规

<a id="mode-threejs-game-release--全局控制接入"></a>
#### 全局控制接入



发布必须创建独立 Work Item。`threejs-build-upload`、`threejs-backend-config`、`threejs-channel-config` 为 A5；`threejs-device-test`、`threejs-store-submit`、`threejs-release`、`threejs-game-rollback` 为 A6，先由 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 校验精确游戏目标和 F4 审批。Git、GitHub Release、消息和通用第三方 API 不属于此生命周期控制面。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。

读取独立发布 Work Item、平台矩阵、资源登记、测试计划和发布清单。F0 校验任务范围与流程，F1 校验候选与发布规格，F2 完成 QA/技术/合规领域质量，F3 绑定工程证据，F4 只决定记录中明确的外部对象和发布动作。

1. 按项目实际采用的浏览器、小游戏或原生渠道核对打包、版本、图标截图、描述、隐私、分级、广告或内购披露、数据收集与账号删除要求，不为未采用的宿主创建占位工程。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
3. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)候选 SHA、包哈希仅作可选追踪，不要求填写或匹配，不阻断发布工作项验收；摘要核对留到最终人工验收后处理。共享基础和关键玩法流证据只能证明各自范围；发布 Work Item 应覆盖实际目标渠道/平台矩阵，并以本栈发布清单确认对应项，不得自动发起真机验收。
   按[生产构建压缩与发布检查](../../threejs-game-architecture/references/production-build.md)核对实际 Terser 配置与最终候选，使用产物检查器检查公开目录和已解包渠道 Web 资源；Source Map 文件、内联映射或映射引用未清除时不得交付发布候选。部署响应头与真实运行证据分别核对，不以压缩检查替代。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/release.md#发布准备与依赖审查)。
5. [公共发布候选与证据约定](../../app-creator-workflow/references/professional-conventions.md#release-candidate-evidence)
<!-- native-source:threejs-game-release:end -->


## 质量审核与性能验证

<!-- native-source:threejs-game-qa-performance:start -->
<a id="mode-threejs-game-qa-performance"></a>

<a id="mode-threejs-game-qa-performance--threejs-测试与性能"></a>
### three.js 测试与性能

<a id="mode-threejs-game-qa-performance--全局控制接入"></a>
#### 全局控制接入





[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
2. [公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。
10. 共享基础完成后验证代表性 Vite/ThreeJS 启动、Boot/首场景、资源加载和适用插件；关键玩法流完成后在主目标平台烟测核心循环与失败恢复；只有最终集成/G3/release 执行完整渠道/平台矩阵。[公共质量证据与返修复验约定](../../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/quality-verification.md#完整流程)。

<a id="mode-threejs-game-qa-performance--本栈配套资料"></a>
#### 本栈配套资料

- [scripts/responsive-visual-validation.mjs](../../threejs-game-qa-performance/scripts/responsive-visual-validation.mjs)
- [scripts/responsive-visual-validation.test.mjs](../../threejs-game-qa-performance/scripts/responsive-visual-validation.test.mjs)
- [事件覆盖与反馈规则](../../threejs-game-juice/references/design-guide.md)
- [`threejs-game-ui-layout`](#mode-threejs-game-ui-layout)
- [响应式视觉验证](../../threejs-game-qa-performance/references/responsive-visual-validation.md)
- [游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)
- [视觉还原](../../threejs-game-asset-integration/references/visual-reconstruction.md)
- [实际完成情况](../../threejs-domain-contracts/references/control-model.md#按实际完成情况验收)
- [检查与返修](../../threejs-game-ui-layout/references/game-copy.md#检查与返修)
<!-- native-source:threejs-game-qa-performance:end -->


## 动画制作与接入

<!-- native-source:threejs-frame-animation:start -->
<a id="mode-threejs-frame-animation"></a>

<a id="mode-threejs-frame-animation--threejs-通用帧动画制作"></a>
### three.js 通用帧动画制作

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-threejs-frame-animation--全局控制边界"></a>
#### 全局控制边界

[`app-workflow-control`](../../app-workflow-control/SKILL.md) 是本技能唯一的全局状态、风险门、任务范围和证据控制面。本技能可在当前 Work Item 授权任务范围内提出动画方案、审阅现有任务工件，并仅对已分配的动画/区域和文件实施修改；真实视觉结果仍由用户人工验收，主代理负责审查方案、范围与验收证据。本技能不扩大跨 Work Item 范围，不替代控制面的批准或状态管理。所有方案、变更、人工验收结果、测试证据和阻断项都回到唯一控制面登记与复核，再按控制面安排完成 ThreeJS 接入、运行验证和状态迁移。

在当前 Work Item 范围内先内部推导并维护动作时间轴设计记录。方案完成后，按[设计理念说明](../../threejs-domain-contracts/resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)向用户说明目标感受、关键动作依据、节奏和资源取舍，并等待用户明确确认当前方案；确认后才编写正式提示词和制作真实素材。方案确认与视频、图片关键帧及完整序列的真实素材验收分别进行。只有玩法事件、时长或行为权限确实缺失且无法推导时，才询问受影响动作。

<a id="mode-threejs-frame-animation--适用范围与运行时"></a>
#### 适用范围与运行时

此技能生产二维逐帧位图动画，运行时以 `THREE.Sprite` 和 `THREE.SpriteMaterial` 显示为朝向相机的 billboard；可用于世界空间角色/特效，也可接入现有正交相机或 HUD 图层。HUD 的布局、缩放和输入仍沿用项目现有 UI 系统。本技能不制作三维骨骼模型动画；带骨骼、蒙皮或模型动作片段的资源使用 three.js `AnimationMixer`。角色若有意采用二维精灵表现，仍走本技能的图集路线。

<a id="mode-threejs-frame-animation--分类入口"></a>
#### 分类入口

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#分类入口)。

<a id="mode-threejs-frame-animation--来源路线"></a>
#### 来源路线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#来源路线)。

<a id="mode-threejs-frame-animation--共用流程"></a>
#### 共用流程

1. 读取视觉基线、用途类型参考、[完整动作与时间轴](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md)，建立当前动画的内部设计工件。明确来源路线、行为边界、初态/终态、游戏时长、阶段区间、关键姿态、事件、播放方式、锚点/允许位移、完整运动范围、目标显示尺寸、FPS、资源预算和背景处理。角色动作还须明确前后动作衔接、是否循环及进入/退出条件，见[衔接与循环设计](../../threejs-domain-contracts/resources/frame-animation/references/character-animation.md#衔接与循环设计)。按需要读取[区域规划](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md)，合批时各区域仍有独立类型、有效时长和时间映射。
2. 按[动作分析规则](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md#动作分析与时间轴)和[玩法与意图设计方法](../../threejs-domain-contracts/resources/frame-animation/references/intent-driven-design.md)，从玩法目的、观看体验与已有时间约束内部推导行为边界、阶段、运动依据、衔接/循环、节奏和性能取舍，并记录具体时间轴、事件时点、关键姿态意图、尺寸推理和逐阶段检查点。视频同时推导 768p/2K 区域排布、条数、整组消耗与推荐方案。方案完成后先向用户阐述设计理念并等待当前方案明确确认；只对确实缺失且无法推导的玩法事件、时长或行为权限提问，并只暂停受影响动作。不制作灰盒或可播放几何示意。
3. 确认当前方案后，按“共用视觉与资源约束＋类型规则＋当前动画参数”编写正式提示词，并在已有操作授权范围内制作真实候选或预览。视频按[分辨率与合批比较](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md#视频条数与消耗比较)选择 768p 或 2K：先最少条数覆盖全部动作，再在该条数下选整组消耗最少者，同等条件优先 768p；图片按[图片分辨率约定](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md#图片分辨率约定)处理。确认前不生成真实候选或调用图片生成；真实素材交付时附简短检查点。用户确认实际素材时可同时接受该素材所表达的时序，不另行确认文字复述。已有生成授权不能替代当前方案确认，方案确认也不扩大外部操作授权。
4. 视频路线接收真实视频并核对画布、区域和音轨，按需要选择有效区间、阶段重定时并保存派生来源，交付用户人工验收实际最终抽帧输入。原视频已适配时直接验收原视频；只有实际视频内容、区域和时间映射已经人工验收才抽帧。SHA 可作为追踪记录，不参与文件验收或替代用户对实际视频的确认。未通过先修正并重提；修正说明或文字方案不代替新视频验收。图片路线核实实际输出尺寸，固定统一画布并确认首尾；同一连续行为的必要关键帧按时间顺序逐张制作，与真实基线及相邻已确认帧比较，人工确认当前帧后才推进下一关键帧。关键帧齐备并确认后，再按内部推导的时点递归补齐目标帧位。实际依赖与[一致性及衔接门](../../threejs-domain-contracts/resources/frame-animation/references/image-inbetween.md#关键帧的一致性与衔接门)集中维护；父图有缺陷先修正，不继续传播。
5. 视频按固定区域抽帧，图片按真实来源清单打包；两者共用背景处理、等比缩放、固定 cell/锚点、独立图集和报告；需要动画播放时通过 `--output-preview` 指定 HTML 预览路径。依据当前类型反馈局部修帧，保留已有修图成果及来源身份，更新图集、报告及实际生成的预览及可选 SHA 追踪值。缺陷修复不默认替换整组来源。
6. 用真实完整帧序列按内部设计工件中的逐阶段检查点人工检查表现意图、节奏、连续性、事件及单次/循环/终态和外部动作衔接，记录具体偏差与用户结论。同一已确认目标下的局部纠错直接返修并展示前后对照；目标感受、核心动作方案、玩法语义或来源路线实质改变时，先重新说明并确认。已有方案范围内不重新索取生成授权。保存分类规则、玩法与意图推导、方案确认版本、真实候选审阅、时间映射与最终人工验收证据，按[工作流接入合同](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md)提交资源，再回到控制面完成 ThreeJS 接入和运行验证。

<a id="mode-threejs-frame-animation--动作设计与真实素材确认"></a>
#### 动作设计与真实素材确认

动作分析与时间轴写入内部设计工件；方案完成后先说明设计理念并等待用户明确确认，确认后才进入正式提示词与素材制作。方案确认之后，视频路线由用户审阅真实视频候选及完整序列；用户对实际视频的确认可同时接受其中表现的时序。图片路线以真实首尾、关键帧和递归父图逐张确认，再验收完整真实序列。真实序列预览提供播放/暂停、重播和逐帧查看，检查标记只放预览界面。正式美术使用真实基线及已确认素材，设计图表和历史占位示意不得作为生图视觉参考。同一已确认目标下的局部修正直接返修并展示前后对照；目标感受、核心动作方案、玩法语义或来源路线实质变化时，先重新说明并确认。详细要求见[动作设计与素材确认](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md#动作设计与素材确认)、[真实素材审阅与验收](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md#真实素材审阅与验收)及[设计与美术的边界](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md#设计与美术的边界)。

<a id="mode-threejs-frame-animation--共用质量与关键约束"></a>
#### 共用质量与关键约束

- 以可读性、节奏、主次关系、连续性和事件同步验收；具体判断及优化方法见[共用质量与优化](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md#共用质量与优化)。重量感、夸张程度、停顿和跟随运动按类型、对象性质与视觉基线配置，不统一套用战斗节奏。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 默认保持要求呈现的内容及完整运动范围入框，保留安全边距。裁剪例外须有当前任务的明确授权，逐项记录对象、范围与理由；不能为合批或强调力度自行裁边。
- 稳定锚点不等于禁止运动。允许位移、姿态夸张或形变须在设计工件中说明范围和意图，按计划验收；禁止未计划的漂移、闪烁、比例变化与跨区串入。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation.md#共用质量与关键约束)。
- 分类与优化参数保存在设计工件，不因分类添加合同字段，不虚构脚本或生成 API 参数。视频沿用原合同；图片使用独立来源清单、报告和 accepted 合同，记录真实生成图、父图、时间槽位、生成/修图记录及可选 SHA 追踪值，不能伪造视频路径或来源时间戳。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-threejs-frame-animation--执行代理"></a>
#### 执行代理

帧动画按用途分配专业设计职责，并由对应设计师完成时间轴细化、提示词、时间整理、抽帧/图片序列集成和修正：

| 用途类型 | 负责设计的职业 | 设计重点与交付依据 |
| --- | --- | --- |
| 普通动画 | 道具与环境动画设计师 | 物件材质、结构与运动机制、机械约束、环境节奏、状态转换和循环接缝；交付关键状态、运动轨迹与锚点范围。 |
| 角色动作动画 | 角色动画设计师 | 身体力学、重心与支撑、动作剪影、预备与跟随运动、角色性格及前后动作衔接；交付关键姿态、接触关系与玩法事件时间轴。 |
| 特效动画 | 游戏特效设计师 | 视觉层级、能量演变、形状与色彩节奏、透明边缘、命中同步和消散；交付效果阶段、峰值时点与角色/场景遮挡约束。 |
| UI 帧动画 | UI 动效设计师 | 交互状态、反馈时机、注意力引导、文字与图标可读性、打断及重复触发；交付状态转换、反馈时间轴与界面显示边界。 |

职业身份写入委派任务包和设计工件；按动画用途分配，不按来源路线、文件格式或播放方式分配。混合任务按可独立设计的动画或区域明确职业、文件所有权和负责范围，交接跨类型事件时点、坐标/锚点、遮挡关系与上下游依赖；依赖尚未交接时不并行，仅在文件所有权不重叠且依赖已交接的工作间并行委派。共享视频合批不合并职业职责，也不改变各动画独立时长。

主代理负责需求、任务包、人工反馈、接入范围、审查与最终验证，不接管动画制作。

使用 `collaboration.spawn_agent`，设置 `agent_type="default"`、`model="gpt-6.1-sol"`、`reasoning_effort="max"`、`fork_turns="none"`。完整任务包包含 Work Item、用途类型与来源路线、负责职业及动画/区域所有权、跨类型事件/锚点/依赖交接、对应参考、玩法目的与表现意图、既有玩法时间约束、行为/输入边界、独立区域时间轴、性能预算与检查点、素材与基线路径、允许修改范围、当前候选版本/内部时间轴、允许推进步骤、验收标准、测试等级与命令、禁止操作及并行提醒。先交付简短中文设计理念说明并等待用户确认当前方案；确认后才推进正式提示词和真实素材。视频路线还须交接当前真实输入视频及人工审阅结果，图片路线交接当前已确认帧和已有生成授权。图片生成/编辑另交 `image_generator` 子代理，动画执行代理负责约束与集成。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/frame-animation-execution.md#完整流程)。

<a id="mode-threejs-frame-animation--本地工具与参考路由"></a>
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
| 用途判断与类型制作 | 上方对应的一份分类参考；涉及独立特效或 UI 位图时再读取其规则 |
| 从玩法与表现意图推导时长、节奏及检查点 | [intent-driven-design.md](../../threejs-domain-contracts/resources/frame-animation/references/intent-driven-design.md)，在动作分析时读取并写入既有设计工件，先说明方案并等用户确认，制作与验收复用 |
| 需要分配普通/角色/特效/UI 动画设计职责及混合任务所有权 | 上方[执行代理](#mode-threejs-frame-animation--执行代理)的职业映射与交接要求 |
| 需要反馈语义、类型适用或事件覆盖规则 | [ThreeJS 2D 汁水感设计指南](../../threejs-game-juice/references/design-guide.md)；本 Skill 仍按既有时间轴设计、真实素材审阅和完整序列人工验收生产帧动画 |
| 游戏时间、独立区域时长、性能取舍与修正 | [action-timing.md](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md) |
| 效果图尺寸推理、合批与空间裁剪 | [region-planning.md](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md) |
| 图片首尾、关键帧、双图参考递归与图片来源合同 | [image-inbetween.md](../../threejs-domain-contracts/resources/frame-animation/references/image-inbetween.md) |
| 动作设计与素材确认、提示词组合与来源/修图证据 | [workflow-integration.md](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md) |

全局阶段仍由[唯一控制面](../../app-workflow-control/SKILL.md)管理：V3 内部推导并记录动作时间轴、向用户说明设计理念并取得当前方案确认；V4 按已确认方案制作并审阅真实视频或关键帧、验收完整序列；V5 依据报告的 `TextureLoader`、水平 UV、`SpriteMaterial`、`Sprite.center` 与逐帧更新合同接入 three.js 并验证运行态。二维精灵的资源与运行时合同不适用于三维骨骼动画，后者仍走 `AnimationMixer`。

<a id="mode-threejs-frame-animation--本栈配套资料"></a>
#### 本栈配套资料

- [游戏时间先于来源](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md#游戏时间先于来源)
- [视频节奏整理](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md#视频节奏整理)
- [按区域抽帧](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md#按区域抽帧)
- [图片递归补帧](../../threejs-domain-contracts/resources/frame-animation/references/image-inbetween.md)
- [普通动画](../../threejs-domain-contracts/resources/frame-animation/references/object-animation.md)
- [角色动作动画](../../threejs-domain-contracts/resources/frame-animation/references/character-animation.md)
- [特效动画](../../threejs-domain-contracts/resources/frame-animation/references/effect-animation.md)
- [UI 帧动画](../../threejs-domain-contracts/resources/frame-animation/references/ui-frame-animation.md)
<!-- native-source:threejs-frame-animation:end -->


## 三维几何建模

<!-- native-source:threejs-game-3d-modeling:start -->
<a id="mode-threejs-game-3d-modeling"></a>

<a id="mode-threejs-game-3d-modeling--threejs-游戏-3d-几何建模"></a>
### three.js 游戏 3D 几何建模

把已确定的视觉与玩法规格制作成可编辑、可复查的正式静态几何；按当前 Work Item 将其交付为 three.js 运行模型，或仅作为明确要求烘焙装饰背景的源文件。开始正式建模前阅读[Blender MCP 建模流程](../../threejs-game-3d-modeling/references/mcp-modeling-workflow.md)；涉及下游使用或修改时阅读[模型交接](../../threejs-game-3d-modeling/references/model-handoff.md)；登记资源、安排阶段证据或进入运行接入时阅读[工作流接入](../../threejs-game-3d-modeling/references/workflow-integration.md)。

范围、资源路径、执行权限、状态和风险门由唯一控制面 [app-workflow-control](../../app-workflow-control/SKILL.md) 约束。本技能可提议、审查，并在当前 WorkItem（工作项）范围内修改；完成后回到控制面提交实际文件与证据，不另建或复制控制状态。本技能与[三维模型与关卡管线](#mode-threejs-game-model-pipeline)共用当前 Work Item、资源清单和 V0–V5 阶段；V1 验证功能，V2 冻结模型几何规格，V3 制作路线并在有用时做 blockout，V4 按 V0 分类交付正式模型或烘焙源并核验，只有运行模型在 V5 验证 GLB 的真实消费；不另建 Work Item、状态机或确认阶段。

<a id="mode-threejs-game-3d-modeling--职责与路由"></a>
#### 职责与路由

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/modeling-production.md#冻结模型简报)。
- 本技能不制作 PBR 贴图，不实现骨架、蒙皮权重或动作，不装配正式场景，也不负责 QA 放行。贴图、骨骼动画、three.js 场景消费和最终运行验收继续由现有模型管线负责。
- 实际几何建模必须委派 `agent_type=default`、`model=gpt-6.1-sol`、`reasoning_effort=max`、`fork_turns=none` 的建模子代理调用 Blender MCP；主代理负责规格、任务包、集成和最终验证。只有明确需要生成或编辑图片时才调用 `image_generator`。
- 源 `.blend` 保持只读；所有建模修改写入获准路径中的版本化派生文件。同一 `.blend`、MCP 会话和目标导出路径保持单一写者，修改与保存按顺序执行。使用 Blender MCP 前实时发现可用工具和参数，不假定固定命令、API 或导出能力。

目标使用正式模型但不改几何时，走现有模型管线的资源接入或优化流程；本技能只在当前 Work Item 明确包含几何生产或修改时承担建模职责。
<!-- native-source:threejs-game-3d-modeling:end -->


## 界面布局与自适应

<!-- native-source:threejs-game-ui-layout:start -->
<a id="mode-threejs-game-ui-layout"></a>

<a id="mode-threejs-game-ui-layout--threejs-游戏-ui-布局"></a>
### three.js 游戏 UI 布局

正式 `Object3D`、UI 与独立显示层统一遵守[显示对象锚点与显示层分层](../../threejs-game-ui-layout/references/display-object-layering.md)：three.js 没有通用二维 `origin` 属性；`Sprite.center` 可显式使用中心 `(0.5, 0.5)`，模型枢轴由几何局部坐标或父级 `Group` 表达，例外逐对象记录原因与换算。场景须声明背景、世界、特效、HUD、瞬态层的实际层序、输入和生命周期归属，并在 V5 正式 Scene 中验证运行遮挡。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

效果图 V3 拆解与布局遵守[功能语义分组约束](../../threejs-game-ui-layout/references/functional-semantic-grouping.md)和[ThreeJS UI 节点组织](../../threejs-game-ui-layout/references/layout-hierarchy.md)：先在编号拆解图上确认位置依赖与信息分组，再由代理自动整理停靠方案并展示布局图/预览确认；不先发文字方案要求确认。真实父级表达功能、状态、交互和布局管理归属，位置依赖通过可选 `ui_layout.position_reference_id` 单独记录，共同表达同一信息且彼此无位置依赖的元素列为同组同级项。父容器职责、布局所有者、尺寸、溢出、安全区和输入归属仍在技术合同中维护；禁止按文字类型或几何最小包含关系自动归父级。

V3 从已确认字段派生位置与尺寸的唯一驱动器，具体决策见[执行计划](../../threejs-game-ui-layout/references/layout-execution.md)。V5 通过[实际运行快照](../../threejs-game-ui-layout/references/layout-runtime-evidence.md)核对全部业务布局节点的真实父级、参照、写入者、中心和图片尺寸；`usability` 的关键节点测量与 `exact` 的完整测量仍沿用既有范围。图片源像素与 CSS/HUD 显示尺寸分开，透视世界继续使用 world contract。

<a id="mode-threejs-game-ui-layout--全局控制接入"></a>
#### 全局控制接入





> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-threejs-game-ui-layout--全局视口与高分屏合同"></a>
#### 全局视口与高分屏合同

屏幕 HUD、DOM Overlay、适用的屏幕自适应平面内容、弹窗和 `DISPLAY_LAYER` 必须在布局合同中填写 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr`、`scaleMode`、`cameraViewportPolicy`、`cameraZoomPolicy`、`cameraOriginPolicy`、`inputCoordinatePolicy`、`safeAreaPolicy`、`resizePolicy`、`orientationPolicy`、`textResolutionPolicy`、`assetResolutionPolicy`、`performanceBudget`、`representativeViewports` 和 `requiredRuntimeEvidence`。这些字段描述项目的视口和坐标策略，不是 three.js 内置布局 API；Three.js 项目用 `WebGLRenderer.setSize()`、CSS 视口和相机投影实现实际映射。`orientationPolicy.allowed` 声明项目支持的方向；`designResolutionPolicy` 只需提供这些方向的分支，`targets.orientations` 与其一致。竖屏以 1080×1920 为设计基准并按宽度适配，横屏以 1920×1080 为设计基准并按高度适配；另一轴随视口展开或裁切。Canvas 填满 CSS 视口，装饰性屏幕装饰背景按独立 cover-v1 合同等比覆盖，禁止黑边。Canvas backing 由 CSS 尺寸乘有效 DPR 向下取整，物理像素不得直接用于布局或命中。真正的三维世界和透视关卡使用[三维世界视口合同](../../threejs-domain-contracts/references/world-viewport-contract.schema.json)，不套用二维布局合同，也不要求二维固定设计视口。

运行时 DPR 从设备动态读取，非法输入回退 1，正有限值封顶 2，且必须覆盖 resize、显示密度变化以及双方向项目的方向切换并清理监听器。资源生产 DPR 固定基线为 1（逻辑尺寸 1:1），必须与运行时 DPR 分离。`scaleMode` 是项目自定义视口策略字段，使用 `custom` 表示由项目代码计算视口、更新 `WebGLRenderer` 和相机投影；`gameSizeSpace` 仅指合同中的逻辑布局空间，不代表 three.js 提供 `GameSize`。`cameraOriginPolicy` 记录坐标系原点约定，不对应相机上的 `origin` 属性。实施包必须证明逻辑视口、Camera 投影、输入映射和 CSS/物理尺寸之间的真实关系；声明字段或构建成功不能单独作为高分屏证据。弹窗默认继承宿主逻辑视口、DPR、安全区、Camera 和输入合同，V5 必须独立记录其运行轨迹。

<a id="mode-threejs-game-ui-layout--视觉语言默认原则"></a>
#### 视觉语言默认原则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-threejs-game-ui-layout--核心流程"></a>
#### 核心流程

正式场景的布局校准与关键几何验收读取[布局校准与参考还原](../../threejs-game-ui-layout/references/layout-calibration.md)。V5 直接消费冻结 V3 布局与 V4 正式资源，在实际 ThreeJS Scene 中调整并复验受影响范围；布局矩形与素材可见边界分别检查，不能用可用性通过代替参考还原。

1. 读取项目的 GDD/TDD、当前候选、总控审核漏斗和适用视觉阶段；确定稳定 UI ID、坐标空间、参照物、状态与平台输入。
2. 复制 schema 1.3.0 [合同模板](../../threejs-game-ui-layout/assets/ui-layout-contract-template.yaml)。普通布局使用 `not-applicable` 并保持 `layout_nodes: []`；冻结视觉目标先用 `frozen-target/specified`。同时冻结上述根级视口/DPR/Camera/Input/性能字段，禁止使用旧 `targets.scale` 字段绕过新门禁。V3 先确认真实功能父级、独立定位参照与共同信息分组，代理内部维护完整技术 JSON 和 `decomposition_elements`，直接展示编号拆解图供人工确认；屏幕 UI 的 `ui_layout` 职责字段也保留在技术合同中。拆解图确认后由智能视觉判断生成逐元素 `left/center/right × top/center/bottom` 决策，再由同一入口同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`，需要交互对照时通过 `--interactive-review` 生成同批离线 `review.html`，用户直接检查最终布局图（需要交互对照时可使用同批审阅页）并独立确认。无需先后确认文字提案或技术记录。随后登记由已确认元素和视觉决策共同推导的非空 `layout_nodes` 与关键对齐合同。
3. V4 正式资源验收后直接进入 V5：按[正式场景视觉还原与校准](../../threejs-game-asset-integration/references/visual-alignment-authoring.md)在正式 Scene 中消费 V3 节点与布局合同、V4 验收资源，接入实际交互、动态数据和 required state。坐标、尺寸和响应式调整写入正式布局配置；冻结的 V3 节点结构仍按上游合同管理。具体 ThreeJS 视口、Camera、输入与幂等重排规则见[ThreeJS 适配参考](../../threejs-game-ui-layout/references/threejs-adapter.md)。
4. specified 阶段运行结构检查 `node scripts/validate_ui_layout_contract.mjs <contract>`；verified 正式验收必须运行 `node scripts/validate_ui_layout_contract.mjs <contract> --check-files --project-root .`，读取冻结原图并检查目标/运行/parity 证据文件。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

正式场景依据项目现有 ThreeJS Scene 结构和布局合同实现。V3 锚点、父子 bounds、资源 origin 与 ThreeJS 父级局部坐标分别处理，祖先偏移只累计一次。V5 直接加载已验收资源并在真实 ThreeJS Scene 中组合；背景覆盖按实际可见视口计算，图片按冻结 fit/裁切规则呈现，不能缩进安全区、留边或平移露出空隙。图片 fit 和 ThreeJS 文字字段按适配参考执行；资源/字体未就绪、布局或渲染异常必须令运行验收失败。Scene 创建、唤醒和 resize 使用同一幂等布局入口；发布画面不含编辑辅助内容。运行证据来自正式场景的实际消费与画面。

正式 HUD、DOM Overlay 和适用平面 UI 的设计画布尺寸、主轴与另一轴的展开或裁切规则由项目布局合同定义；合同采用固定设计视口时，可使用 `assets/fixed-design-viewport.mjs`。真正三维世界的模型、角色和道具位置由[三维世界视口合同](../../threejs-domain-contracts/references/world-viewport-contract.schema.json)定义，不要求二维固定设计视口。设备 CSS 像素只决定显示尺寸。背景必须覆盖完整可见区域，位置由对应合同与实际视口共同决定，不能用编辑器中的拖动或临时偏移改变冻结目标。

<a id="mode-threejs-game-ui-layout--effect-image-场景绑定"></a>
#### effect-image 场景绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

效果图节点还必须声明真实 `parent_layout_node_id`、`parent_target_bounds`、`relative_position` 和 `axis_alignment`。拆解确认后，智能布局结合原图构图、视觉重心和元素语义，为每个元素显式判断水平 `left/center/right` 与垂直 `top/center/bottom`；该判断不能由四边距离自动反推。`relative_position` 按真实父级 bounds 测量；可选 `ui_layout.position_reference_id` 单独决定停靠参照，未声明时使用真实父级。`offset`、`self_anchor`、`reference_anchor` 按已选轴向和定位参照计算。普通父框外的视觉溢出须有 `visual_overflow.reason`，但不得越过 viewport/safe-area。父级和定位参照只能使用已确认节点或稳定根，联合依赖不得成环。视觉决策文件及其 ID 会进入布局图和确认记录，缺失决策必须阻断布局生成。

<a id="mode-threejs-game-ui-layout--资源导航"></a>
#### 资源导航

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。
- 需要 Three.js Camera、Group、DOM Overlay、resize 或重排边界时，读取 [references/threejs-adapter.md](../../threejs-game-ui-layout/references/threejs-adapter.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/ui-layout.md#完整流程)。

<a id="mode-threejs-game-ui-layout--所有权与输出"></a>
#### 所有权与输出

布局技能输出合同版本、布局计算输入/输出、不变量和证据索引。玩法继续独占规则、状态和交互；架构维护坐标空间与模块边界；美术维护纯表现资源与场景配置；QA 只读验证可达、截断、遮挡、触控、滚动和证据。布局计算与 `Object3D`/DOM HUD 测试验证关系不变量，不把孤立绝对坐标当作通用验收标准。汁水感任务可按需参考[动态反馈设计指南](../../threejs-game-juice/references/design-guide.md)；反馈对象的视觉偏移应使用独立表现偏移，不覆盖布局合同中的基础位置、焦点和坐标所有权。

<a id="mode-threejs-game-ui-layout--本栈配套资料"></a>
#### 本栈配套资料

- [references/layout-calibration.md](../../threejs-game-ui-layout/references/layout-calibration.md)
- [references/layout-review-artifacts.md](../../threejs-game-ui-layout/references/layout-review-artifacts.md)
- [references/evidence-matrix.md](../../threejs-game-ui-layout/references/evidence-matrix.md)
- [references/workflow-gates.md](../../threejs-game-ui-layout/references/workflow-gates.md)
- [references/layout-hierarchy.md](../../threejs-game-ui-layout/references/layout-hierarchy.md)
- [references/display-object-layering.md](../../threejs-game-ui-layout/references/display-object-layering.md)
- [references/layout-contract.md](../../threejs-game-ui-layout/references/layout-contract.md)
- [工作流门禁](../../threejs-game-ui-layout/references/workflow-gates.md)
- [证据矩阵](../../threejs-game-ui-layout/references/evidence-matrix.md)
- [拆解时确定九宫格](../../threejs-game-asset-integration/references/nine-slice-ui.md)
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md)
- [场景与弹窗尺寸参照](../../threejs-game-ui-layout/references/layout-hierarchy.md#场景与弹窗尺寸参照)

<a id="mode-threejs-game-ui-layout--ui-相对布局约束"></a>
#### UI 相对布局约束

UI 布局与位置统一遵循[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。本栈父级、锚点、坐标换算及原生组件按技术约束实现；浮层本体与内部 UI 的边界按公共规范验收。
<!-- native-source:threejs-game-ui-layout:end -->


## 项目整理与产物清理

<!-- native-source:threejs-game-artifact-cleanup:start -->
<a id="mode-threejs-game-artifact-cleanup"></a>

<a id="mode-threejs-game-artifact-cleanup--threejs-记录与中间产物清理"></a>
### three.js 记录与中间产物清理

<a id="mode-threejs-game-artifact-cleanup--全局控制接入"></a>
#### 全局控制接入

清理范围、路径所有权、验证证据与状态迁移统一按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)执行；本技能只维护清理对象判定、引用保护和本栈资源边界。

用户要求清理时，在 Work Item 允许路径内处理已确认的本地产物，不重复请求普通本地操作批准。阶段收尾只处理本任务临时文件；历史记录、其他任务和共享目录不自动纳入。外部写入、设备、签名、上传、付费、破坏性操作或发布等具体副作用，须把精确动作和目标绑定到 Work Item 的明确用户批准。

<a id="mode-threejs-game-artifact-cleanup--判定边界"></a>
#### 判定边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#判定边界)。

| 文件类别 | 默认处理 |
| --- | --- |
| `.workflow-control/work-items/`、审批账本、状态迁移/返工记录 | 保留；终态也不自动删除，历史记录支撑追踪和审计 |
| 实施包、`evidence/<workItemId>/execution-state.json`、Result、验证清单、路径与业务归属绑定文件 | 保留有效引用和审计链；失效不等于可删 |
| V3 拆解与布局确认、V4 正式资源/生产记录、V5 实现与运行证据 | 保留完整依赖闭包，包括原图、JSON、审阅页、运行证据及宿主上下文 |
| 明确属于本任务的临时日志、临时导出、失败候选、重复预览、可再生成构建或缓存 | 证明无引用、无运行占用且可再生成后，纳入清理清单 |
| 源码、正式资源、源素材/视频、用户交付物、锁文件、测试夹具、发布产物 | 默认保留；不是一般中间产物 |

原视频可能用于重新抽帧，去背景原图可能支撑生产记录与质量复核，`review.html` 可能是人工审阅所需的实际产物。不要按扩展名、目录名含 `output`/`temp`，或体积大小批量判断。按[产物目录与归档规范](../../threejs-game-architecture/references/artifact-storage.md)优先盘点本任务 `output/intermediate/` 和 `output/candidates/` 中未被引用且可再生成的文件；`docs/confirmed/`、`assets-source/`、正式资源、审阅/验证文件和 `.workflow-control/` 记录属于保留对象。发现临时路径已被绑定时先保留并修复归档与引用，不先删除；证据语义见[控制模型](../../threejs-domain-contracts/references/control-model.md)。

Git 的[最小提交集](../../threejs-game-architecture/references/artifact-storage.md#最小提交集)只限制入库范围，不缩小本地保留集合。未被当前工作项引用的历史文件、已被忽略的素材或撤销精确放行规则的记录，不因此自动成为清理对象；仍须核对全部保留记录和运行依赖。本 Skill 的清理结果仅在当前工作项仍需读取时提交，优先复用已有 Result/证据记录。

<a id="mode-threejs-game-artifact-cleanup--清理流程"></a>
#### 清理流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
4. **执行前复核**：按 Work Item 的允许/禁止路径核对清单，运行公共控制 CLI `check`；逐对象确认实际动作、引用和写入占用。公共控制器没有清理专用动作预检命令；受保护副作用必须由 Work Item 绑定精确用户批准。删除前重新检查引用，并用内部内容摘要防止并发写入后误删；这是删除事务保护，不是验收校验，不要求工件填写 SHA。清单生成后内容或依赖变化时跳过该对象并重新判定。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#清理流程)。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup-execution.md#完整流程)。

<a id="mode-threejs-game-artifact-cleanup--路径与恢复"></a>
#### 路径与恢复

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#路径与恢复)。

<a id="mode-threejs-game-artifact-cleanup--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/artifact-cleanup.md#结果报告)。
- 控制面复核结果、剩余不确定性和需用户决定的范围外项。

只盘点时明确说明未执行删除；没有可靠字节统计时不宣称释放空间。清理不改变原任务的阶段或证据有效性，最终交回控制面并按当前 Work Item 报告本任务差异。
<!-- native-source:threejs-game-artifact-cleanup:end -->


## 图片优化

<!-- native-source:threejs-game-image-optimization:start -->
<a id="mode-threejs-game-image-optimization"></a>

<a id="mode-threejs-game-image-optimization--threejs-图片资源优化"></a>
### three.js 图片资源优化

<a id="mode-threejs-game-image-optimization--全局控制接入"></a>
#### 全局控制接入



显式调用只触发提案，不等于授权写入。所有盘点、候选生成、替换和验证都必须进入 [`app-workflow-control`](../../app-workflow-control/SKILL.md)；本 Skill 不拥有全局状态或审批，不得旁路 diff 审计与证据门。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化目标)。

<a id="mode-threejs-game-image-optimization--执行边界"></a>
#### 执行边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。
- 将本任务视为显式触发的资源领域任务，并按实际动作纳入 A0-A3、本地阶段与统一门；不得自动加入构建脚本、Git 钩子或 CI，也不得由发布状态隐式触发。
- 默认只处理项目内被运行时代码、资源清单或加载配置引用的 PNG、JPEG 和 WebP。设计源文件、参考图、审核证据、截图、测试夹具、构建产物、缓存以及未被运行时引用的素材不在范围内。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#执行边界)。

<a id="mode-threejs-game-image-optimization--优化流程"></a>
#### 优化流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#优化流程)。
7. 只有候选体积更小且全部适用验证通过时才替换原文件；任一验证失败、体积不降或收益不足以抵偿画质与兼容风险时保留原文件。替换后再次核对引用与版本控制差异，确保修改范围仅包含获准资源及必要引用。

<a id="mode-threejs-game-image-optimization--结果报告"></a>
#### 结果报告

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/image-optimization.md#结果报告)。
<!-- native-source:threejs-game-image-optimization:end -->


## 游戏广告接入

<!-- native-source:threejs-game-ad-integration:start -->
<a id="mode-threejs-game-ad-integration"></a>

<a id="mode-threejs-game-ad-integration--threejs-applovin-max-广告接入"></a>
### three.js AppLovin MAX 广告接入

<a id="mode-threejs-game-ad-integration--适用范围与硬边界"></a>
#### 适用范围与硬边界

本 Skill 只处理 three.js + TypeScript/Vite + Capacitor 移动项目的 Banner、插页与激励视频广告能力，聚合层固定使用 AppLovin MAX，接入实现固定使用 AppLovin 官方维护的 `cordova-plugin-applovin-max`，由 Capacitor 的 Cordova 兼容层加载。项目只在 TypeScript 侧建立业务门面和官方插件 API 适配，不自建 Android/iOS 广告插件，也不直接集成 MAX 原生 SDK。所有已配置广告位独立维护状态；插页与激励视频只在后台静默预加载，不在初始化阶段主动创建广告对象或视图，插件内部按需管理加载资源。插页与激励视频预加载成功以当前广告实例对象的就绪属性为准，loaded 回调和业务 phase 不能单独证明成功。全屏展示读取实例就绪属性与现有业务状态并立即返回；Banner 不预加载，只在业务请求展示时创建并加载；支持 Banner 且广告位启用、页面允许展示时，在页面首帧前先预留广告区域并完成 UI 布局，不等广告加载或展示。每个广告位独立维护加载失败计数、retry deadline 和至多一个重试 timer，但使用相同分类、退避、暂停和恢复规则。开始任何设计、实施或审查前，必须先读取唯一细则合同 [AppLovin MAX 接入合同](../../threejs-game-ad-integration/references/applovin-max-contract.md)，并以其中的状态、时序、失败和合规规则为准。

- ThreeJS Web、浏览器预览和小游戏不直接调用 MAX，也不加载原生广告 SDK；广告能力在这些运行目标上必须是明确的 `unsupported`/no-op，调用后立即返回并继续游戏。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 视频广告位在用户触发展示但当前不可用，或官方插件接受展示后回调 `displayFailed` 时，通过统一 UI 层弹出一次“视频广告暂不可用，请稍后再试”Toast；不得由插件适配层直接操作 ThreeJS UI，也不得因重复回调重复提示。
- 必须在 MAX 初始化前明确关闭内建 Terms and Privacy Policy Flow，并核对最终 Android/iOS 构建配置不会重新启用；不能仅删除弹窗调用或未经核对就假定默认关闭。官方 Cordova 接口未暴露该流程开关时，通过官方支持的宿主配置取消其 opt-in 启用项，不编造 JS 方法。关闭后仍正常调用 MAX initialize，以真实初始化完成回调确认成功，不以隐私弹窗、CMP、ATT 或 AppsFlyer 的完成作为初始化/重试前置；SDK/所选 CMP 的实际能力限制按合同核对，不能绕过官方必需条件。隐私状态仅控制广告加载与展示，其未完成、失败或用户拒绝不得覆盖已经确认的 MAX 初始化成功；独立隐私方案和真实授权状态仍单独配置。关闭方式与最终配置核对见[接入合同](../../threejs-game-ad-integration/references/applovin-max-contract.md#初始化与隐私独立编排)。
- MAX 与项目其他已采用 SDK 的初始化、完成回调、幂等和初始化重试统一写在 `src/platform/initialize-sdks.ts`，遵循[SDK 单文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)。MAX 不等待其他 SDK，也不在成功回调里启动其他 SDK；广告服务只消费其初始化结果并管理广告位，不再持有第二套初始化请求或重试状态。
- 每次创建新的 MAX SDK 实例时，在该实例首次实际 initialize 前手动调用官方 `AppLovinMAX.setHasUserConsent(false)`，不能只写本地变量或依赖默认值。该值是 SDK 隐私配置，不是广告开关；不得因 `false` 把 privacy gate 置为 pending/blocked、跳过插页/激励预加载、阻止 Banner 按需加载、暂停加载重试或拒绝展示。SDK 已就绪且其他实际条件满足时照常请求广告，由 SDK/adapter 按该配置处理；不承诺填充，也不把值改成 true 来绕过真实失败。设置 false 与关闭内建流程分别执行，不能互相代替。
- 本 Skill 中有效初始化配置必须包含已核实的独立时序资格：“隐私未决仍初始化”和相关重试规则仅适用于官方支持的 SDK/CMP 组合。官方要求自有 CMP 前置而当前组合不满足独立时序时，MAX 返回配置阻断，不调用 initialize、不安排自动重试，也不等待 CMP 或 AppsFlyer；记录具体限制后按当前任务解决，其他 SDK 与游戏继续。该配置阻断不能从用户拒绝同意或 ATT 状态本身推断。
- 项目启用 AppsFlyer 时，其初始化与实际启动使用统一文件中的独立任务；不能挂在 MAX 初始化、内建隐私流程或广告加载回调下，MAX 失败或不回调不影响 AppsFlyer 启动，AppsFlyer 失败或不回调也不阻止 MAX。该规则不要求未采用 AppsFlyer 的项目额外安装 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-threejs-game-ad-integration--全局控制接入"></a>
#### 全局控制接入



> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-threejs-game-ad-integration--交付流程"></a>
#### 交付流程

1. 读取当前 Work Item、项目 TDD/依赖能力档、Capacitor 平台状态及官方插件安装状态；按 [AppLovin MAX 接入合同](../../threejs-game-ad-integration/references/applovin-max-contract.md)登记范围、非目标、公开接口、状态所有权、生命周期和失败边界。广告属于可选商业能力，不能把它作为 ThreeJS Web 核心循环的运行前置。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
3. 冻结插件适配契约：`initialize`、`preload(slotId)`、`tryShow(context)`、`setBannerVisibility(slotId, visible)`、`isReady(slotId)` 均为非阻塞调用并返回结构化结果；适配器把官方插件的 callback/event API 归一化为该契约。MAX 初始化与初始化重试实际实现归入 `src/platform/initialize-sdks.ts`，广告门面只转发到该文件中的 MAX 私有任务。初始化失败进入 `failed`：明确的瞬时故障由该任务按 2/4/8/16/32/64 秒持续退避；后台、离线或宿主条件未满足时暂停，恢复后继续；配置或依赖错误修正后显式重试，不重启其他 SDK。初始化重试与广告服务的广告位加载重试隔离，不混用 timer 或计数。MAX 初始化幂等；支持平台且服务启用、插件配置有效时，必须发起 MAX 初始化，不以其他 SDK、隐私同意、CMP 完成或 ATT 授权作为调用前置。每个广告位只有一个业务状态所有者，原生格式对象由官方插件内部管理。广告服务收到初始化成功结果后立即投递全部启用的插页与激励视频预加载意图，实际加载经过广告请求隐私门；所有已发起的加载失败都由各广告位自己的重试 timer 持续调度，不按错误类别终止、不设次数上限，直到成功；禁用、移除或服务销毁终止重试，运行 gates 关闭仅暂停。各广告位独立保存计数与 deadline，并应用同一套 `2/4/8/16/32/64 秒`退避、抖动、去重、后台/离线暂停和恢复规则。一个广告位取消、重排或触发重试不得改变其他广告位的 timer。
4. 将 MAX 控制台、官方插件及其原生依赖、Capacitor Cordova 兼容配置、独立隐私流程/Google UMP/ATT、广告位配置和遥测分别登记责任人。固定聚合渠道为 AppLovin、Google AdMob、Mintegral、Pangle、Unity Ads、DT Exchange（Fyber）和 Verve（PubNative/HyBid）；插件、MAX SDK 与 adapter 的版本组合以官方插件和官方渠道文档当前声明的兼容范围为准，不在 Skill 或业务代码中写死版本号，也不绕过插件重复引入 MAX SDK。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
8. 将候选 diff、接口契约、平台日志（脱敏）、失败重试轨迹和验证结果提交给 `$app-workflow-control`；把未执行的外部配置、真机、实时广告和发布步骤列为明确未覆盖项。

<a id="mode-threejs-game-ad-integration--最低公开契约"></a>
#### 最低公开契约

共享门面至少提供以下语义，具体参数命名可按目标项目惯例落地，但不能改变返回时序：

```ts
initialize(config): Promise<InitResult> // 只确认桥接请求受理/初始化状态，不等待隐私流程或广告加载
retryInitialize(): Promise<InitResult>  // 手动入口复用初始化恢复任务，不绕过退避或配置阻断
preload(slotId): Promise<PreloadResult> // 仅插页/激励后台加载；Banner 返回 format-mismatch
isReady(slotId): ReadyResult            // 全屏读取实例就绪属性；Banner 读取加载状态，不创建或加载
tryShow(context): Promise<ShowResult>   // 复核实例就绪属性和业务门，通过后才展示
setBannerVisibility(slotId, visible): Promise<BannerVisibilityResult> // 展示时按需创建/加载，立即返回
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。

<a id="mode-threejs-game-ad-integration--交付审查清单"></a>
#### 交付审查清单

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 原生门：Activity/ViewController provider、前台状态、网络连通性属于初始化与广告请求依赖；privacy readiness 表示实际请求配置及 SDK/平台条件是否满足，不等于 `hasUserConsent=true`。`false` 已正确配置且没有其他独立阻断时应允许请求，不能把 false 或其读取结果当作隐私拒绝码。确有独立的 SDK/平台限制时按实际原因处理；门不控制初始化完成。`phase` 只表示广告资源/展示阶段，门状态独立计算，不混入 ThreeJS 场景状态。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 初始化恢复：统一初始化文件中的 MAX 私有任务最多持有一个初始化请求和一个待执行重试 timer，广告服务不另建；瞬时失败持续退避，宿主/前台/网络门关闭保留 deadline，隐私状态不暂停初始化重试，恢复时去重调度；配置错误不自动重试。成功、禁用或销毁清理该初始化恢复任务，成功结果交给广告服务只投递一次全屏预加载意图，广告请求仍检查隐私门，阻断时保留意图待恢复。单独重试 MAX 不重新初始化其他 SDK。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- Banner：不预加载、不默认创建；首次展示请求创建并加载，创建失败和加载失败共用一个持续退避重试任务；离开展示场景立即取消任务并使旧请求失效，再次进入须重新请求展示；ready 且布局安全后按当前可见请求显示，失败保持隐藏且无 Toast；页面首帧前按平台 Banner 尺寸规则和安全区预留区域，加载、失败、重试与显隐回调不改变内容 inset；实际尺寸只用于验证能否安全放入预留区域，布局不遮挡游戏交互；刷新只有一个所有者，禁止 JS/ThreeJS 自建刷新 timer。
- 合规与安全：独立隐私流程及其 Google UMP/TCF 配置、MAX 隐私标志、iOS ATT、SKAdNetwork、Google 要求和目标地区规则均有责任人和证据；核验 MAX 内建隐私流程在实际初始化配置与最终 Android/iOS 产物中均已关闭，真实初始化回调仍能完成；AppsFlyer 按独立任务启动，不把关闭 MAX 流程等同于同意授权。SDK key 与广告位来自受控的分环境构建配置并仅供官方插件适配器使用，账号凭证与 Ad Review key 不进入 Web 层，遥测脱敏。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/advertising-integration.md#完整流程)。
- 授权值与加载分离：检查真实调用顺序为 `setHasUserConsent(false)` 后才 initialize；收到真实初始化完成信号且其他条件满足时，值保持 false 仍投递全部启用全屏广告位的预加载，并允许 Banner 按需加载、失败后的原有重试及就绪后的展示。只有独立的真实请求限制才阻断，不等待该值变成 true，不恢复 MAX 内建隐私流程，AppsFlyer 继续独立启动。

本仓库本次只交付 Skill 指导文件，不新增运行时代码、脚本、SDK 依赖或外部配置。

<a id="mode-threejs-game-ad-integration--本栈配套资料"></a>
#### 本栈配套资料

- [接入合同](../../threejs-game-ad-integration/references/applovin-max-contract.md)
- [官方 Cordova 集成文档](https://support.applovin.com/en/max/cordova/overview/integration)
- [官方仓库](https://github.com/AppLovin/AppLovin-MAX-Cordova)
<!-- native-source:threejs-game-ad-integration:end -->


## 三维资源与运行管线

<!-- native-source:threejs-game-model-pipeline:start -->
<a id="mode-threejs-game-model-pipeline"></a>

<a id="mode-threejs-game-model-pipeline--三维模型与关卡管线"></a>
### 三维模型与关卡管线

可提议、审查并在当前 Work Item 内修改资产与接入代码，完成后回到 [app-workflow-control](../../app-workflow-control/SKILL.md) 提交资源身份和验证证据。

<a id="mode-threejs-game-model-pipeline--blender-模型生成"></a>
#### Blender 模型生成

用户要求生成新模型时，在当前资源或场景 Work Item 内按 **参考与多视图 → 正式几何交接 → 按需制作 PBR/AI 贴图 → 人工模型审查** 编排。读取 [Blender 模型生产合同](../../threejs-game-model-pipeline/references/blender-model-production.md)，将题材、风格、面数和贴图预算写入当前实施包；实际几何、拓扑、法线、UV、槽位、LOD、碰撞代理和静态导出由 [`threejs-game-3d-modeling`](#mode-threejs-game-3d-modeling) 负责。该建模技能按既有 `gpt-6.1-sol` / `max` 配置委派实际 Blender MCP 制作；图像生成与编辑交给 `image_generator`。已提供有效参考或多视图时复用，不重复生成；不需要新几何的已有模型接入直接执行下述接入流程。

贴图、烘焙、绑定/动画或接入任务先读取[模型交接](../../threejs-game-3d-modeling/references/model-handoff.md)。沿用交付网格、实际 UV 位置、槽位与 LOD 用图策略；下游不擅自重展 UV、改顶点顺序、重排槽位或覆盖建模源。几何缺陷交回建模责任人，在同一工作项内局部修复和复验。

该路线复用 V2 参考、V3 拆解、V4 正式资源生产与验收，不创建独立聊天或第二套阶段。人工确认当前模型与贴图候选后才可作为已验收资源进入接入环节；自动静态检查不替代人工审查。截图、渲染及真机验收按用户当前明确授权执行。

<a id="mode-threejs-game-model-pipeline--模型接入与优化"></a>
#### 模型接入与优化

1. V2 确定世界尺度、轴向、pivot、包围盒、动画命名、PBR 风格、灯光和三维预算；效果图只是目标视角的参考。交互世界必须交付模型/关卡数据、碰撞代理及可观察状态，不能整屏贴图伪装关卡。
2. V3 拆解角色、环境、交互件、特效与 HUD。三维对象记录 parent、TRS、单位、相机、材质、碰撞和可见性；二维布局 JSON 只约束 HUD 和固定视角标注，不能证明三维空间正确。
3. V4 资源清单逐项记录 GLB 路径与可选追踪摘要、来源/许可、triangles、draw calls、material/texture、纹理维度/显存估算、骨骼/clip、LOD、碰撞代理和解码依赖。纹理磁盘体积不能替代 GPU 内存预算，生成图片也不能作为已生成模型的证据。
4. 使用 GLTFLoader 加载，按实际资产扩展注册 KTX2/meshopt/Draco；部署 decoder/transcoder 并验证 CSP、路径与失败提示。颜色纹理按颜色空间处理，法线/粗糙度等数据纹理不作为 sRGB；不盲目覆盖加载器已设置的材质。
5. 每实例拥有 AnimationMixer 与角色状态；SkinnedMesh 克隆使用 SkeletonUtils.clone，clip/mixer 时间用于表现，伤害/奖励由玩法状态驱动。切换停止 action 并 uncacheRoot，释放独占 geometry/material/texture；ImageBitmap 和共享纹理由资产所有权管理。
6. 先测密度，再采用 InstancedMesh、合并静态几何、LOD、视锥裁剪、纹理压缩和阴影限制。实例选取绑定 instanceId；动画 bounds、透明排序和碰撞数据与降级档位一起验证。更换 LOD 不能改变玩法命中语义。

V5 为人工视觉验收提供相同相机、光照、时间与游戏状态的检查要点，并检查移动、碰撞、动画、切场景/重进和失败恢复；未实际执行的项目标记未验证。需要截图或检查图时提供给用户人工检查，只有用户明确要求自动视觉验证时才自动分析截图，真机运行验收须另有明确授权。记录实际取得的 renderer.info、加载时间与退出后的资源基线。资产处理工具按项目选择；不得自动上传素材或申请外部付费生成。

参考：[glTF 官方加载器](https://threejs.org/docs/pages/GLTFLoader.html)、[资源释放](https://threejs.org/manual/pages/cleanup.html)、[插件接入](#mode-threejs-game-plugins)。

静态 GLB 资产验收命令见 [`validate-model.mjs`](../../threejs-game-model-pipeline/scripts/validate-model.mjs)，清单范例见 [`model-manifest.example.json`](../../threejs-game-model-pipeline/references/model-manifest.example.json)：`node <模型管线技能目录>/scripts/validate-model.mjs --repo <项目目录> --manifest <模型清单.json>`。将实际命令写入实施单元的 `acceptanceCommands`；`asset.sceneId` 是需唯一匹配的 glTF 内部 `scene.name`，游戏场景归属另由资源条目的 `scene_id` 记录。

三维资源的生产单元使用 `production_method=authored-model`、`delivery_kind=gltf-model`，绑定模型清单与验收报告路径并提交控制面的通用文件证据；登记和 V0–V5 对齐见[建模工作流接入](../../threejs-game-3d-modeling/references/workflow-integration.md)。`sceneVisualRouteAnalysis` 只服务二维 effect-image coverage；GLB 不进入它的 image-asset/threejs-native 分支。固定视角截图用于人工检查视觉结果，模型清单提供空间资产的静态事实，两者分别记录。

摘要仅作为可选追踪信息，不要求提供或比对，不因缺失、错误或变化阻断验收；仍须检查模型实际内容、路径归属、资源预算和人工审查结果。
<!-- native-source:threejs-game-model-pipeline:end -->


## 运行时插件与扩展

<!-- native-source:threejs-game-plugins:start -->
<a id="mode-threejs-game-plugins"></a>

<a id="mode-threejs-game-plugins--游戏插件方案"></a>
### 游戏插件方案

在当前 Work Item 内提议、审查并修改依赖，完成后回到 [app-workflow-control](../../app-workflow-control/SKILL.md) 审计。用户允许必备插件时，可安装经需求证明必要的依赖；不默认开启付费、外部服务或发布。

先读 [能力与接入表](../../threejs-game-plugins/references/plugin-plan.md)，按玩法选择最小集合。three/addons 与 three 必须来自同一锁定版本；开发工具不进入运行包。每项采用的能力记录用途、精确版本/锁文件、适用 renderer、自身资源创建条件、销毁责任、包体/内存预算和验证命令。

项目采用的 SDK 按[SDK 单文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)统一在 `src/platform/initialize-sdks.ts` 实现初始化、回调与初始化恢复，各 SDK 之间不建立串行前置。物理世界、解码器等对象自身所需的真实就绪条件仍由对应能力管理，不把它们扩张成所有 SDK 或游戏首帧的启动门。

涉及 Android/iOS 原生宿主或平台能力时，遵循架构 Skill 的[原生平台插件选型](#mode-threejs-game-architecture--原生平台插件选型)：复用现有插件 → 官方插件 → 社区插件 → 有明确能力缺口的最小自建。版本、权限、许可、生命周期、平台适配层与必要宿主配置以该规则为准。

物理插件接入的验收是固定步、碰撞过滤、运动体类型、坐标单位与暂停恢复；导航是可达性、动态障碍和 NavMesh 更新；模型解码器是实际压缩样本加载和部署路径；后处理是最坏场景 GPU 成本与画质档位。安装成功只证明依赖可解析。

已有 React 项目可选 React Three Fiber 与匹配的 drei；新项目默认直接 three.js。不要同时安装多个承担相同职责的物理引擎、音频库或渲染后处理系统。
<!-- native-source:threejs-game-plugins:end -->


## 项目初始化与基础运行时

<!-- native-source:threejs-game-runtime:start -->
<a id="mode-threejs-game-runtime"></a>

<a id="mode-threejs-game-runtime--threejs-游戏运行基础"></a>
### three.js 游戏运行基础

可提议、审查并在当前 Work Item 范围内修改，完成后回到 [app-workflow-control](../../app-workflow-control/SKILL.md) 提交候选与验证证据。

three.js 提供渲染与场景图；玩法循环、输入状态、物理世界、资源生命周期和游戏状态由项目负责。先复用项目服务；新工程以 TypeScript、Vite、three 为核心。

项目实际采用 SDK 时，按[SDK 单文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)在 `src/platform/initialize-sdks.ts` 集中实现，各 SDK 独立发起与恢复。应用装配调用后继续启动渲染与 Boot，不等待 SDK 批次完成；能力入口自行处理目标 SDK 未就绪，不在主循环或场景间串接 SDK 初始化。无 SDK 的工程模板不增加占位文件。

1. 把渲染 Scene 与玩法 scene controller 分离。控制器负责 enter、fixedUpdate、renderUpdate、exit、dispose，入口只装配服务。规则与数值模块不依赖 WebGL、DOM 或材质。
2. 使用 [固定步与输入辅助模块](../../threejs-game-runtime/scripts/game-runtime.mjs)：物理和规则用固定 dt，渲染用 accumulator/step 插值。后台暂停、失焦与 Pointer Lock 解除清空按键；恢复时重置时间戳和积累量，禁止补算整段后台时间。最多追赶有限步数，记录丢弃时间；输入边沿每模拟步只消费一次。
3. 世界使用米、秒、弧度、Y 向上，明确前向和玩家尺寸。模型 pivot、碰撞体中心、HUD 锚点是不同契约。高速物体按实测使用 CCD；Raycaster 负责选取，不替代刚体碰撞。物理与导航见 [插件选择](#mode-threejs-game-plugins)。
4. resize 从 Canvas CSS rect 推导 renderer 大小与相机投影；输入 CSS→NDC→Raycaster。DOM HUD 消费 CSS 尺寸，正交 HUD 单独定义逻辑坐标。禁止把二维效果图拆解直接当作三维世界变换；[UI 适配器](../../threejs-game-ui-layout/references/threejs-adapter.md)只管理屏幕布局。
5. GPU 资源由资产服务引用计数持有；移除 Object3D 不会自动释放 geometry、material、texture 或 render target。异步加载返回后先核对场景代次，过期资源交还资产服务。退出清理事件、定时器、mixer、physics/nav handle 和独占资源；共享资源仅在最后持有者释放时 dispose。
6. 最坏玩法密度记录帧时间 p50/p95、draw calls、triangles、材质与纹理数量、阴影与后处理开销、加载字节和切场景后的资源基线。先减少冗余绘制、材质、阴影和全屏 pass，再按已声明档位调整画质；不得在无数据时承诺 FPS。

新项目运行 `node <技能目录>/scripts/create-game.mjs <空目录>`，脚本复制 [工程模板](../../threejs-game-runtime/assets/starter/package.json)并注入同一运行模块；模板目录本身不是完整可构建产物。生成后执行 `npm ci`、`npm run build`，落实实际玩法再验收。它只演示渲染、响应式输入、固定步和暂停恢复，不是完整游戏。先测试确定性规则、步进与坐标转换，再按需浏览器烟测；启动服务前检查可复用实例，不自动执行真机验收。
<!-- native-source:threejs-game-runtime:end -->


## 视觉素材生产

<!-- native-source:threejs-game-asset-integration:start -->
<a id="mode-threejs-game-asset-integration"></a>

<a id="mode-threejs-game-asset-integration--threejs-游戏美术生产与接入"></a>
### three.js 游戏美术生产与接入

真实三维世界与角色按模型、材质、灯光、Camera、关卡/碰撞数据和运行逻辑生产；骨骼角色使用导入的网格动画 clips 与 `AnimationMixer`。正式几何、拓扑、UV、LOD/碰撞和静态导出交给 [3D 建模](#mode-threejs-game-3d-modeling)，按[模型交接](../../threejs-game-3d-modeling/references/model-handoff.md)接收真实文件与专项报告，再由[三维模型与关卡管线](#mode-threejs-game-model-pipeline)组织贴图和运行接入。二维效果图拆解、UI 布局、九宫格和逐帧纹理只约束 HUD、DOM、billboard、平面贴图等适用内容，不能把三维环境或角色替换成整屏/整角色图片。

<a id="mode-threejs-game-asset-integration--全局控制接入"></a>
#### 全局控制接入





<a id="mode-threejs-game-asset-integration--工作流"></a>
#### 工作流

生产前按[产物目录与归档规范](../../threejs-game-architecture/references/artifact-storage.md)确定输入、输出和归属：未送审候选与临时转换放 `output/` 对应子目录，送审文件先持久保留；确认后的非运行效果图/拆解/布局归档到 `docs/confirmed/`，源文件归档到 `assets-source/`，已验收的正式游戏资源只接入 `public/assets/<owner>/` 或已声明的模块导入路径。清单登记正式路径及来源/验收引用，不让游戏加载临时、设计或证据目录，不把截图、审阅页和报告随资源发布。

需要声明加载地址时使用[运行资源路径绑定](../../threejs-game-asset-integration/references/runtime-resource-binding.md)：公共文件保留目录并绑定部署前缀，模块资源绑定实际 importer 与静态 `?url` 导入；不能把磁盘路径或 basename 猜测当成运行 URL。帧动画 accepted 门强制验证此绑定，普通资源显式声明后复用同一校验。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-threejs-game-asset-integration--场景还原合同effect-image-强制"></a>
##### 场景还原合同（effect-image 强制）

V3 拆解先遵守[功能语义分组约束](../../threejs-game-ui-layout/references/functional-semantic-grouping.md)：确认区域、功能组件、部件和独立元素的位置依赖、信息分组与理由；位置依赖方划为被依赖元素所对应布局容器的子元素，共同表达同一信息且彼此无位置依赖的元素列为同组同级项。布局不得按文字类型或几何包含重新分组，归属不明留在拆解确认，不自动生成可放行布局。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。
4. schema 1.5 `visual-assets.json` 先声明 `effect_image_reconstruction`：普通资产为 `not-applicable`，不要求还原工件；效果图还原为 `effect-image`。后者冻结目标后、进入 V4 前以 `v3-ready` 完成合同回对和 coverage，V3/V4 可暂无 fidelity case；只有 V5 验证完成才为 `v5-complete` 并要求全部 case 通过。效果图 coverage 逐区登记 `annotation_number` 与 `implementation_plan`，先完成 ownership/实现分类，再做带实际证据文件、冻结目标文件、分析 ID 和完成时间的 `state_analysis`，严格在 component inventory 之前完成，最后按唯一原子部件填写 `component_inventory`、placements 与 `expected_assets`；编号不是资产数量单位。视觉来源与装配方式必须分开：`visual_route_analysis` 只能在独立 coverage region 上选择 `image-asset` 或 `threejs-native`，`assembly_analysis` 再独立声明原子 Scene 装配、禁止整屏捕获并允许独立图片资产；不得从“不能整屏贴图”推导 `runtime-program`。如果同一视觉事实同时包含程序逻辑与独立视觉资产，必须回到 V2/PROPOSAL 重新划分 coverage/annotation：图片外观进入独立 image-asset region，程序行为进入独立 threejs-native/runtime region，分别进入各自生产与运行逻辑合同。禁止使用单一 `composite` region 或 `composite_parts` 在一个区域内闭环生产、验收。全部区域均为 `threejs-native` 时必须提供绑定目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`，文件门会读取实际文件并逐区核对资格事实。状态分析必须覆盖普通、selected/active、disabled、pressed/hover、victory/defeat/paused，实际适用写 `required`，不适用写 `not-applicable+reason`。② 顶部 6 个按钮必须 6 个 component；⑧ 的 3 个相同底部表面可登记 1 个 component+3 个 placements，⑨ 的动作图标按实际复用关系登记；③、④、⑦ 只有在明确单部件且其余状态不适用时才保持单图。默认 individual 模式禁止横向组图；`image_generation_required=true` 的生成式位图使用 `individual + atlas_allowed=false`，其 `expected_assets.width/height` 由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，必须精确为最小尺寸；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 必须为 `none`，尺寸合同本身不需要 human_review。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 按设备动态读取并封顶为 2。历史 1.5/2 倍生产证据须重生成或标记 `stale`。其他生产方法只有在显式合同下才能使用完整 `atlas_slice` 图集。每个 placement 必须声明 `interaction_required`，真实 `interaction_hotspots` 只能按 placement 一一绑定且不计入视觉资产。确认图仍同时呈现 `generate-now`、`reuse-existing` 和 `runtime-program`，但 PNG 仅绘制用户摘要与“新建图片资产 / 复用现有图片 / 程序绘制或动态逻辑”标签；placement ID、坐标尺寸、组件/状态/资产技术字段不进入可见行。运行 `--proposal` 时，这些技术字段完整写入拆解分析技术 JSON，并与 PNG 元数据、实际区域定义及现有 confirmation 业务字段绑定。系统按提示词、参考输入、材质、透明需求和可用能力决定是否使用图像生成；`independent-production` 与 `generate-now` 不作任何生成器推断。V3 再按 [资产生产路线](../../threejs-game-asset-integration/references/asset-production-routes.md) 选择路线。
   路线按可观察视觉事实和 ThreeJS 实际渲染能力判断，不按“按钮”“面板”等语义，也不以静态/动态作为唯一条件。文本、纯色矩形、基础几何、规则边框、可确定性表达的简单规则渐变、遮罩和进度填充，在 ThreeJS 原生能力可精确表达冻结外观时可选 `threejs-native`；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰使用独立图片路线。原生路线冻结 `native_suitability.render_contract` 的 renderer、尺寸、颜色、线宽、圆角、渐变、透明度、适用状态和不支持特征；无法支持的视觉特征必须阻断，不能近似替代后通过。
   图片、图片局部和文字先按[完整拆解与视觉显著性](../../threejs-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)登记可独立部件，保持功能、交互与状态联动；明显美术外观优先位图，低显著性操作文字考虑系统文本，简单填充考虑原生绘制。再核对[完整程序还原资格](../../threejs-game-asset-integration/references/asset-production-routes.md#程序还原资格与位图回退)：程序必须完整实现方案要求保留的外观；主体与效果无法可靠分离时保留完整原子视觉部件。动态/本地化文字按[文字路线判定](../../threejs-game-ui-layout/references/layout-contract.md#文字路线判定)保留可变能力，不在实现时静默简化已确认的美术效果。
   色彩填充同样按[色彩填充路线判定](../../threejs-game-asset-integration/references/asset-production-routes.md#色彩填充路线判定)拆分：明显材质和光影保留独立位图，有风格的重复表面优先复用贴图，低显著性基础填充考虑原生绘制；动态比例和状态仍保持可变，不能把填充与边框、辉光或纹饰混作纯色区域。
   外观来源与行为装配分别记录和绑定；例如按钮可由原生框体、独立图标图片和 DOM/CSS2D 文字组成，并通过明确组件/节点引用接入交互，不合并为 `composite` 区域。`image_generation_required=true` 一经冻结不得自动换成原生路线，只能遵循明确接受的 Change Request 变更。
5. V3 可运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V3`；V4 正式验收运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V4 --check-files --project-root .`，V5 正式验收运行同命令但使用 `--stage V5`。独立弹窗工作项必须额外传入 `--work-item-type DISPLAY_LAYER`，场景工作项默认按 `SCENE` 校验；该参数只改变显示层作用域，不把弹窗纳入宿主场景验收。V4 逐项验证真实资源文件、来源/许可信息（如适用）、预算、冻结基线、coverage 和 `production_contract_audit`；V5 验证正式 Scene 消费、运行组合、F2 两类机器证据、F3 runtime replay 与适用 fidelity cases。
6. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

透明路线由 `expected_assets.transparency_requirements` 冻结策略与 `edge_profile`。只有 `hard-edge` 且主体与纯色背景明显区分时才可走 `background-removal`；复杂边缘禁止阈值去背。`direct-alpha` 必须匹配已验证的工具、版本和边缘类型，并用 PNG 解码证明真实透明像素；generation record 顶层 `generator/generator_version` 是实际身份，`capability.tool/tool_version` 必须与之相同。`mask-composition` 必须绑定独立遮罩或人工创作的实际输入和工具参数。能力不足时报告缺口，不提高容差、硬抠轮廓、删除光效或伪造结果。生成记录按实际路线登记生成器身份、参数、输入/输出 SHA 和后处理；归一化保持比例、Alpha 和主体边界，并禁止把棋盘格预览烘焙进素材。每个候选都生成浅底与深底预览，V5 完成主体缺损、残留背景、色边和半透明区域的视觉检查。已有真实透明图按资源复用合同接入，不伪造生成或去背记录。`image_generation_required=true` 的冻结合同不能由透明路线判断或提示词生成器自动替换。
7. V1 可按已授权范围实现并验证正式功能，白盒按需使用；视觉样片不能伪装成正式可交互场景。V3 确认后生产 V4 正式资源；V5 在正式 ThreeJS Scene 中实现功能并消费已验收资源，禁止一次性截图 Scene、整屏铺图、隐藏覆盖层和绝对叠层凑像素。V5 在正式功能实现之后与玩法协作完成结构化集成、动态验收和低保真清理；上游事实或当前受影响候选身份变化时才使对应 fidelity case 失效重采，其他单元证据继续有效。

正式效果图标注命令必须带 `--proposal <file>.json`；省略该参数直接失败，不生成只有用户图示的成功产物。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-threejs-game-asset-integration--条件参考"></a>
#### 条件参考

- 参考截图、录屏、运行项目或源码还原：读取 [视觉还原](../../threejs-game-asset-integration/references/visual-reconstruction.md)。
- 装饰性屏幕空间满幅背景：读取 [满幅背景](../../threejs-game-asset-integration/references/full-bleed-background.md)；世界空间关卡、项目自建地图/图块或玩法环境改读资产生产路线和模型管线。
- UI：同时读取 [`threejs-game-ui-layout`](#mode-threejs-game-ui-layout) 的布局合同、ThreeJS 适配器和证据矩阵；资源 origin、布局锚点与动画偏移按合同分离，资产接入不得重新发明布局规则。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-threejs-game-asset-integration--审核与交付"></a>
#### 审核与交付

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-threejs-game-asset-integration--视觉确认边界"></a>
##### 视觉确认边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/asset-production.md#完整流程)。

<a id="mode-threejs-game-asset-integration--本栈配套资料"></a>
#### 本栈配套资料

- [响应式视觉验证](../../threejs-game-qa-performance/references/responsive-visual-validation.md)
- [九宫格 UI](../../threejs-game-asset-integration/references/nine-slice-ui.md)
- [`离线布局审阅产物`](../../threejs-game-ui-layout/references/layout-review-artifacts.md)
- [控制模型](../../threejs-domain-contracts/references/control-model.md)
- [全局视觉控制](../../threejs-game-asset-integration/references/global-visual-control.md)
- [视觉还原](../../threejs-game-asset-integration/references/visual-reconstruction.md)
- [视觉生产管线](../../threejs-game-asset-integration/references/visual-production-pipeline.md)
- [功能与场景阶段的共享规划](../../threejs-game-asset-integration/references/asset-production-routes.md#功能与场景阶段的共享规划)
- [正式图片生成后的共享与复用](../../threejs-game-asset-integration/references/asset-production-routes.md#正式图片生成后的共享与复用)
- [图片批量生成](../../threejs-game-asset-integration/references/visual-production-pipeline.md#图片批量生成)
- [帧动画合同](#mode-threejs-frame-animation)
- [《Effect-image 生成式位图忠实还原提示词合同》](../../threejs-game-asset-integration/references/effect-image-prompt-contract.md)
- [独立工作项规则](../../threejs-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md#效果图生成)
<!-- native-source:threejs-game-asset-integration:end -->
