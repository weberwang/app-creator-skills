# 游戏实现规则

Creator 编辑器、AssetDB、Scene/Node/Component、Prefab、构建和预览操作统一经[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)路由，并以实时 `tools/list` 参数 schema 为准；不手写 `.scene`、`.prefab` 或 `.meta` 绑定。刷新等待 `.meta` 不证明导入/编译完成，需查询真实资源和 UUID、核验子资源、保存后读回。当前 MCP 仅打开构建面板或报告 worker ready 时，实际运行/构建保持 pending/blocked。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#游戏实现规则)。

实现按可验收场景闭环；玩法与美术职责及状态所有权按[玩法实现规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)执行。游戏生产里程碑不构成第二套全局状态机。

## 默认实施闭环

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#默认实施闭环)。

## G1 强制实施序列

基础实施先按[游戏项目目录规范](../../cocos-game-architecture/references/project-structure.md)冻结入口、基础模块、场景、显示层、平台适配、资源、测试和产物的路径与所有权；产物分别按[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)写入临时、候选、确认、源素材、正式资源和人工作业审阅/验证目录。根级 `evidence/` 不作为机器 `evidenceRoot`；工作流机器记录和受限证据字段按控制工具真实布局执行。按实际需要创建目录，后续实施沿同一映射落盘。

Android/iOS 原生平台功能按[原生平台插件选型](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-architecture--原生平台插件选型)优先复用现有插件，再选择适用的官方或社区插件；仅在明确能力缺口下补充自建原生实现。实施包记录插件选型与平台适配边界，必要宿主配置和冷启动/恢复验收仍按对应约束执行。

1. 全局基线、foundation-only 边界和项目状态顺序按[控制模型](../../cocos-domain-contracts/references/control-model.md)与[状态、阶段与停止门](../../cocos-domain-contracts/references/state-gates.md)执行；编排层只建立“需求 → 功能 → 模块 → 场景 → 正式资源 → 测试证据”的追踪。
2. foundation-only 仅承载 `SHARED` 最小骨架和 `MODULE` 场景无关基础能力；在此阶段完成游戏全屏显示和 Android 启动、运行无标题栏，按下述基础显示约束实施，并按[后台暂停与恢复约束](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio--后台暂停与恢复约束)实现音频进入后台暂停、返回前台从原位置继续播放；具体场景玩法、UI/布局、正式可见资产消费、Boot→正式可见 Scene 接入和删除旧视觉实现留在场景或集成范围。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#g1-强制实施序列)。

场景 V2 同时冻结[显示节点锚点与层级](../../cocos-game-ui-layout/references/display-object-layering.md)方案：具有 `UITransform` 的渲染 Node 默认锚点为中心 `(0.5, 0.5)`，例外逐对象说明；背景、世界、特效、HUD 和瞬态层按实际职责划分有名根层并明确前后、输入与生命周期。V3 将 Node 锚点和层序映射到布局/显示层合同，V5 在正式场景中检查资源组合、遮挡、最上层命中及关闭/resize 后恢复。这里的渲染分层不把世界对象或特效变成独立 `DISPLAY_LAYER` Work Item。

通用帧动画是场景路线中的动态资源子路线，按[分类入口](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)选择用途，再按[来源路线](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--来源路线)默认视频抽帧；图片递归补帧须用户明确选用。主代理按[执行代理约定](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--执行代理)先按观看体验与表演协调难度安排动画导演／动作指导：简单任务由对应专业设计师兼任，复杂任务独立委派导演统一构思，再按用途类型委派设计师细化；混合任务明确表演、事件与空间交接，固定画布/区域不锁死角色朝向、姿态或画内位移，实际图片生成/编辑交图片代理。V3 内部维护行为、阶段、事件、衔接、尺寸、FPS 和批次计划，方案完成后先按[设计理念说明](../../cocos-domain-contracts/resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)向用户阐述目标感受与动作依据，等待用户明确确认当前动作方案后，才在已有授权内写提示词、制作真实候选和推进具体实现；只有关键玩法事实存在决定性歧义时询问。视频分辨率与条数按[区域规划](../../cocos-domain-contracts/resources/frame-animation/references/region-planning.md)选择并遵守预算；图片默认 768p，确需 2K 时在已有工具与预算授权内直接选择，新增费用或超出授权才询问。V4 验收实际最终抽帧视频后才抽帧，图片首尾、关键帧与递归父图逐张确认后推进，最终验收完整真实序列。只确认文字方案不能代替真实候选验收。保留独立图集、报告及实际生成的预览、来源与修图成果，V5 完成正式 Cocos 消费和事件验证；完整证据与 schema 分派见[接入合同](../../cocos-domain-contracts/resources/frame-animation/references/workflow-integration.md)。

## 基础显示约束

- 在实现基础模块时，将游戏容器和 Cocos 画布设为填满实际可用视口；视口、方向或窗口尺寸变化后同步重算画布和输入映射。该能力归属场景无关的平台/显示适配模块，不等待正式场景或视觉资源完成。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#基础显示约束)。

## 单场景完成闭环

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#单场景完成闭环)。

### 场景与显示层效果图产物

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#场景与显示层效果图产物)。

### V5 正式场景实现与验收

V5 直接消费 V3 确认的节点关系、初始布局和锚点，以及 V4 `accepted` 的正式资源；在项目正式 Cocos Scene 和布局合同中实现可交互结构。实现前后按[正式场景视觉还原与校准](../../cocos-game-asset-integration/references/visual-alignment-authoring.md)及[Cocos 布局实现参考](../../cocos-game-ui-layout/references/cocos-adapter.md)处理坐标空间、父子偏移、资源 origin、背景覆盖和 resize。运行时资源、字体、布局或渲染错误必须令实际运行验收失败；V5 仍需提供正式场景运行证据，并由用户检查画面。

## 增量流程

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#增量流程)。

5. 普通资产和效果图还原的清单字段、状态分析、component×state、生产合同与文件校验以[视觉生产管线](../../cocos-game-asset-integration/references/visual-production-pipeline.md)及对应 Schema 为准；编排层只确认当前场景的 V3 两次确认、V4 资源验收、V5 实施包和运行证据引用完整。

效果图的 coverage、layout/placement 双向绑定和父子/双轴关系以[UI 布局合同](../../cocos-game-ui-layout/references/layout-contract.md)为准。编排层确保产物属于当前工作项，`DISPLAY_LAYER` 绑定实际宿主上下文并独立调度，V5 正式场景实现和运行态证据均引用同一份 V3/V4 场景事实。

高保真布局节点的父子几何、双轴对齐和身份投影按[UI 布局合同](../../cocos-game-ui-layout/references/layout-contract.md)执行；运行时只能消费校验通过且已完成 V3 布局确认的结果。
6. V4 生产并验证资源；只有机器清单状态为 `accepted` 且来源或生成记录、适用的版权/许可信息、正式布局、运行时输出、Cocos 和玩法视觉证据完整时，V5 才能消费这些资源实施正式场景。效果图区域还必须逐 `annotation_number/region_id` 显式声明七个生产合同字段以及状态/部件映射；不得在 V4 之前以占位资源启动正式功能代码。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#增量流程)。

## 受控并行实现

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#受控并行实现)。

## UI 与背景

玩家可见内容从 V1 的反馈定义起沿用[游戏内文案](../../cocos-game-ui-layout/references/game-copy.md)：图像、图标、数字与符号优先，文字只补充必要语义；V2 效果图、V3 文本拆解与后续实现保持同一表达，不把内部规格说明直接放进画面。

UI 必须使用 [`cocos-game-ui-layout`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout) 的版本化合同和唯一布局入口，从显式坐标空间、父 Node、双方停靠点、四边相对距离、尺寸、安全区与断点计算；纹理可见边界、UITransform 锚点、布局停靠点和动画偏移分离。视口、安全区、方向、内容尺寸、运行时有效 DPR（动态封顶 2）和状态是入口输入，重排必须幂等，不能在多个生命周期回调散布无参照坐标。固定尺寸、绝对定位、悬浮 HUD、Camera/父节点层级和单行省略触发布局专项审核，不凭模式本身判错；合同缺依据或证据时才退回。默认 `usability` 测试关系不变量、可读性、边界、遮挡和交互，允许合理位置/尺寸偏差；`exact` 或明确需求时才启用严格 Golden。装饰屏幕空间背景使用统一适配器；世界空间 Tilemap、碰撞和玩法环境使用独立结构，不能扁平化为背景。

## 视觉证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#视觉证据)。

## 回退

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md#回退)。

## 本栈配套资料

- [模块划分](./module-decomposition.md)
