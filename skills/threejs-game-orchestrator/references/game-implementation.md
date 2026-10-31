# 游戏实现规则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#游戏实现规则)。

实现按可验收场景闭环；玩法与美术职责及状态所有权按[玩法实现规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)执行。游戏生产里程碑不构成第二套全局状态机。

## 默认实施闭环

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#默认实施闭环)。

## G1 强制实施序列

基础实施先按[游戏项目目录规范](../../threejs-game-architecture/references/project-structure.md)冻结入口、基础模块、场景、显示层、平台适配、资源、测试和产物的路径与所有权；按实际需要创建目录，后续实施沿同一映射落盘。

涉及 SDK 时，基础平台包按[SDK 分文件独立初始化](../../threejs-game-architecture/references/sdk-initialization.md)为每个 SDK 使用独立管理文件，由 `src/platform/initialize-sdks.ts` 装配并投递。SDK 相互独立，首帧、场景与隐私流程不等待 SDK 批次完成；不能把初始化分散回各场景或在成功回调里串接下一个 SDK。

Android/iOS 原生平台功能按[原生平台插件选型](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-architecture--原生平台插件选型)优先复用现有插件，再选择适用的官方或社区插件；仅在明确能力缺口下补充自建原生实现。实施包记录插件选型与平台适配边界，必要宿主配置和冷启动/恢复验收仍按对应约束执行。

1. 全局基线、foundation-only 边界和项目状态顺序按[控制模型](../../threejs-domain-contracts/references/control-model.md)与[状态、阶段与停止门](../../threejs-domain-contracts/references/state-gates.md)执行；编排层只建立“需求 → 功能 → 模块 → 场景 → 正式资源 → 测试证据”的追踪。
2. foundation-only 仅承载 `SHARED` 最小骨架和 `MODULE` 场景无关基础能力；在此阶段完成游戏全屏显示和 Android 启动、运行无标题栏，按下述基础显示约束实施，并按[后台暂停与恢复约束](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-audio--后台暂停与恢复约束)实现音频进入后台暂停、返回前台从原位置继续播放；具体场景玩法、UI/布局、正式可见资产消费、Boot→正式可见 Scene 接入和删除旧视觉实现留在场景或集成范围。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#g1-强制实施序列)。

场景 V2 同时冻结[显示对象锚点与显示层分层](../../threejs-game-ui-layout/references/display-object-layering.md)方案：可设置原点的显示对象默认中心 `(0.5, 0.5)`，例外逐对象说明；背景、世界、特效、HUD 和瞬态层按实际职责划分有名根层并明确前后、输入与生命周期。V3 将对象原点和层序映射到布局/显示层合同，V5 在正式场景中检查资源组合、遮挡、最上层命中及关闭/resize 后恢复。这里的渲染分层不把世界对象或特效变成独立 `DISPLAY_LAYER` Work Item。

通用帧动画是场景路线中的动态资源子路线，按[分类入口](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation--分类入口)选择用途，再按[来源路线](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation--来源路线)默认视频抽帧；图片递归补帧须用户明确选用。主代理按[执行代理约定](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation--执行代理)按动画用途委派对应职业的设计师，混合任务按动画或区域划分职责并交接事件与锚点；实际图片生成/编辑交图片代理。V3 内部维护行为、阶段、事件、衔接、尺寸、FPS 和批次计划，方案完成后说明目标感受、动作依据与节奏取舍，等待当前动作方案明确确认后才在已有授权内写提示词、制作真实候选和推进实现；只有关键玩法事实存在决定性歧义时先澄清。视频分辨率与条数按[区域规划](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md)选择并遵守预算；图片默认 768p，确需 2K 时在已有工具与预算授权内直接选择，新增费用或超出授权才询问。V4 验收实际最终抽帧视频后才抽帧，图片首尾、关键帧与递归父图逐张确认后推进，最终验收完整真实序列。只确认文字方案不能代替真实候选验收。保留独立图集、报告及实际生成的预览、来源与修图成果，V5 完成正式 ThreeJS 消费和事件验证；完整证据与 schema 分派见[接入合同](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md)。

## 基础显示约束

- 在实现基础模块时，将游戏容器和 ThreeJS 画布设为填满实际可用视口；视口、方向或窗口尺寸变化后同步重算画布和输入映射。该能力归属场景无关的平台/显示适配模块，不等待正式场景或视觉资源完成。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#基础显示约束)。

## 单场景完成闭环

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#单场景完成闭环)。

### 场景与显示层效果图产物

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#场景与显示层效果图产物)。

### V5 正式场景实现与验收

V5 直接消费 V3 确认的节点关系、初始布局和锚点，以及 V4 `accepted` 的正式资源；在项目正式 ThreeJS Scene 和布局合同中实现可交互结构。实现前后按[正式场景视觉还原与校准](../../threejs-game-asset-integration/references/visual-alignment-authoring.md)及[ThreeJS 布局实现参考](../../threejs-game-ui-layout/references/threejs-adapter.md)处理坐标空间、父子偏移、资源 origin、背景覆盖和 resize。运行时资源、字体、布局或渲染错误必须令实际运行验收失败；V5 仍需提供正式场景运行证据，并由用户检查画面。

## 增量流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#增量流程)。

5. 普通资产和效果图还原的清单字段、状态分析、component×state、生产合同与文件校验以[视觉生产管线](../../threejs-game-asset-integration/references/visual-production-pipeline.md)及对应 Schema 为准；编排层只确认当前场景的 V3 两次确认、V4 资源验收、V5 实施包和运行证据引用完整。

效果图的 coverage、layout/placement 双向绑定和父子/双轴关系以[UI 布局合同](../../threejs-game-ui-layout/references/layout-contract.md)为准。编排层确保产物属于当前工作项，`DISPLAY_LAYER` 绑定实际宿主上下文并独立调度，V5 正式场景实现和运行态证据均引用同一份 V3/V4 场景事实。

高保真布局节点的父子几何、双轴对齐和身份投影按[UI 布局合同](../../threejs-game-ui-layout/references/layout-contract.md)执行；运行时只能消费校验通过且已完成 V3 布局确认的结果。
6. V4 生产并验证资源；只有机器清单状态为 `accepted` 且来源或生成记录、适用的版权/许可信息、正式布局、运行时输出、ThreeJS 和玩法视觉证据完整时，V5 才能消费这些资源实施正式场景。效果图区域还必须逐 `annotation_number/region_id` 显式声明七个生产合同字段以及状态/部件映射；不得在 V4 之前以占位资源启动正式功能代码。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#增量流程)。

## 受控并行实现

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#受控并行实现)。

## UI 与背景

玩家可见内容从 V1 的反馈定义起沿用[游戏内文案](../../threejs-game-ui-layout/references/game-copy.md)：图像、图标、数字与符号优先，文字只补充必要语义；V2 效果图、V3 文本拆解与后续实现保持同一表达，不把内部规格说明直接放进画面。

UI 必须使用 [`threejs-game-ui-layout`](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-ui-layout) 的版本化合同和唯一布局入口，从显式坐标空间、父容器、双方停靠点、四边相对距离、尺寸、安全区与断点计算；资源锚点、布局停靠点和动画偏移分离。视口、安全区、方向、内容尺寸、运行时有效 DPR（动态封顶 2）和状态是入口输入，重排必须幂等，不能在多个生命周期回调散布无参照坐标。固定尺寸、绝对定位、悬浮 HUD、Camera/`Group` 或 DOM Overlay 和单行省略触发布局专项审核，不凭模式本身判错；合同缺依据或证据时才退回。默认 `usability` 测试关系不变量、可读性、边界、遮挡和交互，位置和尺寸须符合已声明适配或已确认目标容差；`exact` 或明确需求时才启用严格 Golden。装饰屏幕空间背景使用统一适配器；项目自建地图数据、三维碰撞和玩法环境使用独立世界结构，不能扁平化为背景。

二维布局/图片拆解用于 HUD、DOM、billboard 与平面纹理等适用内容，不替代世界模型。真实三维环境与角色交付模型/`SkinnedMesh`、材质、灯光、Camera、关卡与碰撞数据；角色骨骼动画由资产 clips 和 `AnimationMixer` 驱动。正式几何生产与网格修改按 [3D 建模](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-3d-modeling)执行，贴图/绑定/接入使用其实际网格、UV、槽位和 LOD 交接；已有模型加载及动画生命周期按[三维模型与关卡管线](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline)与[运行基础](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-runtime)执行。模型单元在当前实施包声明静态验收命令、清单和报告，不把静态通过当作人工视觉或 V5 实际消费通过。

## 视觉证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#视觉证据)。

## 回退

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#回退)。

## 本栈配套资料

- [模块划分](./module-decomposition.md)
