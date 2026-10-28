# 简化工作流视图

六阶段和对象视觉闭环见[公共工作流](../../app-creator-workflow/references/workflow.md)，本文件只补充本栈的实施与验收。

## 图片优先的确认方式

除帧动画方案确认外，图片任务按“内部整理 → 直接展示真实图片或预览 → 用户确认 → 继续”推进。分析、提示词、技术 JSON、来源和确认回执由代理维护，不要求用户先阅读或确认文字提案；用户主动索要时再展开。实际图片确认只记录一次，不再要求确认文字复述。

帧动画在动作方案完成后、制作真实素材前，主动按[设计理念说明](../resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)说明目标感受及动作与节奏产生这种感受的依据；说明后暂停，等待用户明确确认当前动作方案。收到确认后才在已有授权范围推进素材制作和具体实现，真实素材仍须人工确认。

游戏画面中的内容按[游戏内文案](../../cocos-game-ui-layout/references/game-copy.md)贯穿策划、效果图和实现：内部规格分开保存，图片/图标/数字/符号优先，文字只补充必要语义；生成前指定可见文字范围，正式场景沿用同一表达，不把策划详细说明复制到画面。此规则不影响拆解标注、流程说明或 V3 布局审阅。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-review.md#图片优先的确认方式)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-gates.md#图片优先的确认方式)。

## 六阶段项目视图

六阶段、阶段身份和交付见[公共工作流](../../app-creator-workflow/references/workflow.md)。


基础工程阶段必须按[基础显示约束](../../cocos-game-orchestrator/references/game-implementation.md#基础显示约束)完成游戏全屏显示；目标包含 Android 时，启动首帧、启动画面切换及运行全程均不得显示窗口标题栏或 ActionBar，并在后台返回和窗口焦点恢复后保持沉浸式全屏。此项属于基础平台能力，不等待场景视觉生产；无实际运行证据的验收项须明确标记未验证，真机验收仍需用户明确授权。

音频生命周期也在基础工程阶段完成：按[后台暂停与恢复约束](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio--后台暂停与恢复约束)，进入后台暂停播放，返回前台后从原位置继续；手动暂停、停止或销毁的音频不自动恢复，后台新请求不补播。

基础工程同时按[游戏项目目录规范](../../cocos-game-architecture/references/project-structure.md)和[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)建立实际需要的目录：入口与基础服务分层，场景内部按功能聚合，平台适配、独立显示层、正式资源、源素材、测试和生成产物分清归属；路径与所有权在 TDD 和实施包中明确，不预建空壳目录。根级 `evidence/<workItemId>/reviews/` 与 `validation/` 用于人工作业审阅和验证，机器 `evidenceRoot` 按 Work Item 实际配置使用，受限字段不得填写该根目录以外的路径。

## 四步单场景视图

本栈统一使用 V0–V5；V1 可直接实现和验证功能，白盒可选。

对象视觉阶段及实际产物见[公共工作流](../../app-creator-workflow/references/workflow.md)。

V1 先验证功能，白盒可选；V2→V3→V4→V5 在同一场景 Work Item 内按[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)相邻推进。每阶段保留各自确认、实施结果及实际证据；V4 与 V5 使用独立实施包和执行闭环，不能跳过视觉目标和布局前置。

V5 在正式 Scene 中组合 V3 结构和 V4 资源，按实际运行画面调整布局、资源呈现和动态状态；布局或素材偏差由其真实来源所属阶段修复，并对受影响的正式运行证据复验。用户人工检查当前实际画面，机器检查不代替视觉验收。具体见[正式场景视觉还原与校准](../../cocos-game-asset-integration/references/visual-alignment-authoring.md)。

场景路线还需在 V2 确定[显示对象默认中心锚点与渲染分层](../../cocos-game-ui-layout/references/display-object-layering.md)：对象例外、背景/世界/特效/HUD/瞬态层顺序和每层的坐标、输入、生命周期归属。V3 固化布局与显示层合同，V5 在实际场景中用遮挡、命中和恢复轨迹验证；渲染分层不新增全局阶段，也不把普通世界层误记为独立 `DISPLAY_LAYER` Work Item。

### 序列帧路线映射

帧动画阶段与统一工作流一致，V3–V5 依次处理拆解、资源与运行验收。

通用帧动画沿用全局状态机，按[分类入口](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)选择用途，默认视频抽帧；图片递归补帧仅在用户明确选择或确认切换时启用。V3 内部完成动作分析、时间轴和区域/分辨率方案，说明设计理念后等待用户明确确认当前动作方案；确认后才写提示词并在已有授权内制作真实候选，只有事件、时长或行为边界有决定性歧义时询问。视频分辨率与条数按[区域规划](../resources/frame-animation/references/region-planning.md)选择并遵守预算；图片默认 768p，确需 2K 时在已有工具与预算授权内直接选择，新增费用或超出授权才询问。V4 人工验收实际最终抽帧视频后才抽帧，图片首尾、必要关键帧和递归帧在真实父图确认后推进；最后验收完整真实序列。仅确认文字参数不能证明表现或衔接通过，内部记录由代理维护。图集、来源、时间映射、声音及 V5 Cocos 接入见[通用帧动画接入合同](../resources/frame-animation/references/workflow-integration.md)。

视觉阶段命令和迁移以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为准。


## CLI 输出

命令和状态见[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)。

## 门禁边界

具体阶段门禁、证据和授权见[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)及[公共工作流](../../app-creator-workflow/references/workflow.md)。
