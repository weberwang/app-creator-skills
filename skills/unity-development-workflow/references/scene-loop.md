# 场景 V0-V5 闭环

世界内容先按[3D、2D 与 UI 分流](../../app-domain-toolkit/references/game-design-exploration.md#implementation-routes)：3D 在正式 Scene 白模搭建与 V1 验证，2D 平面布局及占位，UI 原流程。前期只记录需求，概念图可选；整体场景单次审查并获人工确认后再安排正式模型／二维资源生产。公共控制器可显式使用[无图 3D 场景合同](../../app-workflow-control/references/world3d-scenes.md)；下文目标图和 V3 双确认属于图片／UI 路线，旧 Unity 图片工具若不支持无图合同须如实报告，不能伪造图片或通过。

图片目标的场景与独立显示层遵守[阶段人工确认](../../unity-domain-contracts/references/stage-confirmation.md)：V0 只作内部识别与分流，V3 拆解图和布局图分别确认。`world-3d` 按公共无图合同绑定单次审查以及实际空间、方向、资源和显示确认，不增加 V3 双图。V5 完成实际运行验证并经用户确认后闭合；技术 PASS 不代替人工确认，确认只绑定当前工作项和实际交付。

## V0 分流

内部确定场景 ID、宿主 Scene、模块依赖、常驻 HUD、视觉模式、平台约束和验收轨迹。图片目标的新场景或显示层在 V2 生成真实完整目标图；`world-3d` 使用真实空间与方向依据。纯工程模块不伪装成场景，也不等待视觉基线选择，除非实施包声明 `visualBaselineRequired=true`。跨场景入口归 INTEGRATION。modal、popup、drawer、toast 等瞬态层另建 `DISPLAY_LAYER` Work Item，`hostSceneId` 只作运行上下文。

## V1 功能实现与验证

先验证当前功能切片的玩家行为、状态、输入和跨场景数据；3D 世界先搭建或复用有效白模，2D／UI 的额外原型按风险选择，功能可直接沿正式工程实现。实际验证后，世界场景先完成本批整体空间确认，再确定相关正式视觉目标；纯 UI 沿原流程。

## V2 场景定义

冻结玩家行为、状态、失败/恢复、输入、相机、UI、数据所有权与 Scene/Prefab/UXML 结构，并生成适用响应式合同。按[布局参照规则](./ui-layout-and-hierarchy.md#布局参照选择)确定场景 UI 相对场景大小停靠，弹窗内部有底板时相对底板布局、无底板时相对屏幕布局。图片／UI 目标按[持续目标规则](./visual-workflow.md#v2-场景定义)确认真实完整目标图，草图和白盒不能代替图片目标；`world-3d` 按公共合同确认白模对应空间和方向，不要求目标图。功能可直接在正式代码实现并验证。

视觉任务同时明确主题、受众、核心循环、体验目标与主要观看情境，并由玩法和 [`unity-game-juice`](../../app-stack-unity/references/native-contracts.md#mode-unity-game-juice) 确认关键事件的反馈意图，按[美术质量合同](./art-quality-contract.md)记录目标。

## V3 拆解确认

图片／UI 路线先在冻结的 V2 效果图上展示带稳定编号、来源、关系、装配与生产边界的拆解图，取得确认后再生成布局图；布局图标明参照、节点约束和关键适配行为，并单独取得第二次 V3 确认。详细展示规则见[视觉工作流](./visual-workflow.md#v3-拆解与布局确认)。`world-3d` 按公共合同交接模型身份、尺度、原点与接口，不要求两张图及对应确认。

图片／UI 路线冻结组件×状态、`parentElementId`、`semanticGrouping`、`layoutBinding`、视觉来源分析、Scene/Prefab/UXML 装配分析、资源/Importer/GUID/Addressables 约定和验收条件。适用的九宫格资源冻结源图尺寸、border、目标最小尺寸和内容内边距；动作资产冻结设计意图、动作方案、关键事件、消费接口、循环/中断和资产生产者。动画素材制作前先向用户说明理念与动作方案并等待确认；其他图片直接制作真实候选。父子表达真实功能、布局、交互、状态、裁切或复用归属；位置依赖使用独立参照，不强行改父级。屏幕 UI 按[节点树规则](./ui-layout-and-hierarchy.md)声明容器职责，并按[机器布局包](./ui-layout-plan.md)检查依赖、越界与居中后生成布局图。

## V4 正式资源生产与导入验收

正式资源全部生产、导入并完成资源级验证，回读 GUID、Importer 和必要的九宫格 Border；可生产并验证资产自身的资源级 Prefab，用临时组合预览检查资源关系，但 V4 不完成正式宿主 Scene/场景装配 Prefab/UI 接入或布局校准。资源交付可独立并行，但必须持有自身工作项、确认和所有权，不并入场景的完成条件。

## V5 正式实现与运行验收

以新绑定的 V5 Implementation Package 完成正式 Scene/Prefab/UI 接入、布局校准、玩法、视觉、音频、输入、生命周期和清理；在 Editor/PlayMode 中按实际实现采集 Screen/GameView、backbuffer 或 RenderTexture、Camera、Canvas/PanelSettings、安全区、方向/resize、输入命中、截图和状态轨迹。实际完成情况沿用当前 V5 验证和证据记录，不再抄写交付报告。缺少真实 Unity 测量时 V5 只能为 `NOT_RUN` 或失败；完成验证后展示真实组合和证据，用户确认后闭合。场景 V5 不等待独立瞬态层。

图片／UI 路线按[美术质量合同](./art-quality-contract.md)检查五项质量及适用动态体验，独立验收材料通过现有 `art-experience-acceptance` 条目绑定。`world-3d` 按公共合同绑定真实正式场景、运行与模型消费，并由用户人工检查显示；机器侧参数不代表视觉通过。真实 Unity 测量或原生工具能力缺失时如实保留未验证。

不同场景可并行只读准备；正式 Unity Editor 写入受单写者约束。完成一个场景不是切换下一个场景的强制前提，只有共享资源、入口或状态所有权存在依赖时才串行。
