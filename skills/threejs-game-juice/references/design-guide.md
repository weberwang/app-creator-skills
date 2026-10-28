# three.js 三维游戏汁水感设计指南

本指南把 Juice（汁水感）定义为：玩家输入、规则变化、角色行为、环境反应和阶段成果，都获得及时、清楚、符合游戏气质的反馈，使操作有质感、结果可理解、情绪有回报。动作游戏强调力量，解谜强调解开的满足，经营强调成长，策略强调局势变化，恐怖强调紧张；不以特效数量、亮度或震动强度统一评价。

设计方法适用于 three.js 三维游戏中的世界、角色、相机与 HUD 反馈；类型示例按当前玩法选择采用。具体 API 按目标游戏锁定版本及其官方文档核对，不建立旧版本兼容实现。所有时长、数量与幅度示例仅是调参起点，不是引擎标准、行业阈值或自动验收条件。

## 目录与使用方式

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#目录与使用方式)。

- [ThreeJS 工程边界](#threejs-工程边界)
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#目录与使用方式)。

## 设计原则与玩法边界

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#设计原则与玩法边界)。

## 通用反馈库

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#通用反馈库)。

## 运动接触与材质

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#运动接触与材质)。

## 情绪与节奏

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#情绪与节奏)。

## 连续操作

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#连续操作)。

## 类型场景清单

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#类型场景清单)。

## 类型适用矩阵

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#类型适用矩阵)。

## 反馈语义约定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#反馈语义约定)。

## 组合优先级与预算

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#组合优先级与预算)。

## 声音镜头与环境

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#声音镜头与环境)。

## three.js 工程边界

three.js 提供场景图、几何、材质、相机和渲染能力；补间调度、粒子发射、世界时间倍率、镜头震动和游戏状态由项目或明确选用的插件实现。实施前读取项目锁定的 three.js/插件版本及其官方文档，不把其它引擎的管理器或对象 API 当作 three.js 内置能力。

| 能力 | three.js 项目实现方向 | 边界 |
| --- | --- | --- |
| 形变、位移、透明度 | 项目补间/事件系统更新表现节点的 `Object3D` 属性 | 保留基准值、属性所有权与取消后终态；three.js 核心不附带通用 TweenManager |
| 三维角色动作 | 导入 `SkinnedMesh` 与动画 clips，用 `AnimationMixer` 播放和更新 | 规则状态与结算由玩法拥有；二维帧动画不替代三维网格和骨骼动画 |
| HUD、billboard、贴图序列 | 已验收的帧图集或项目自建纹理动画 | 明确帧率、事件点、透明和采样；规则结算不依赖漏播的一帧 |
| 接触、尘土、碎屑 | 项目发射器/效果池，可用 `Points`、`InstancedMesh` 或自建网格表达 | three.js 不提供通用粒子发射器；限制数量、寿命、位置、预算并回收 |
| 声音 | 项目音频服务；需要空间音频时使用 three.js 的 AudioListener/Audio 能力 | 解锁、并发、暂停原因和切场景清理由项目负责 |
| 镜头反馈 | 由项目控制相机 rig 或 Camera 变换 | three.js 不内置 Camera Shake；隔离 HUD、相机跟随和实际输入投影 |
| 光效与后处理 | 项目材质/shader 或所选版本支持的 three/addons 后处理链 | three.js 不提供通用 Filters API；核对 renderer、色彩空间、移动成本与降级 |
| 时间效果 | 项目固定步调度与分系统表现时间 | 明确恢复责任、重叠请求、暂停和销毁语义 |

### 时间控制

| 系统 | three.js 项目要求 |
| --- | --- |
| 玩法与物理 | 使用项目固定步/物理插件的时间源；顿帧只能在玩法明确授予时间控制时影响规则步进 |
| 补间表现 | 使用项目现有调度器并按表现对象分组；冻结或取消必须保留玩法状态和属性所有权 |
| 角色动画 | 用 `AnimationMixer.update(delta)` 推进导入的 clips；暂停/混合/切换策略与玩法状态绑定 |
| 粒子和 VFX | 各组件消费明确的表现 delta 或固定步；不能假设统一动画时钟会自动控制它们 |
| 声音 | 续播、暂停、淡出或变速是独立选择，不能假设跟随世界时间缩放 |
| 输入与 UI | 明确接受、缓存或拒绝哪些操作，以及暂停期间哪些界面继续工作 |

顿帧恢复不能由已冻结的计时器负责。多个请求由有明确持有权的项目控制逻辑合并，恢复先前有效状态，不简单把所有系统设为默认值；已有手动暂停、后台暂停或其他时间效果仍需保留。暂停、切场景和销毁必须可靠解除本请求。

### 渲染与相机

循环由项目渲染入口驱动，可按目标 renderer 使用 `WebGLRenderer.setAnimationLoop()`；后处理使用已选版本支持的 addons/自建 pass。无论采用何种路线，必须验证实际渲染器、颜色输出、混合顺序、视口和性能预算。不要把 `Filters`、`enableFilters()` 或内置 Camera Shake 当作 three.js API。

镜头震动/冲击由项目相机 rig 或受控 Camera 偏移实现，必须记录强度单位、持续时间、相机 zoom/投影和恢复策略。相机影响全画面，应先考虑局部对象反馈；HUD 使用 DOM Overlay 或独立 HUD Camera，避免无意一起震动、缩放或受后处理影响。

官方参考：[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)、[Object3D](https://threejs.org/docs/pages/Object3D.html)、[AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)、[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)、[AudioListener](https://threejs.org/docs/pages/AudioListener.html)。具体 API 按目标项目锁定版本核对。

### 结构与生命周期

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#结构与生命周期)。

## 输入与平台环境

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#输入与平台环境)。

浏览器可能要求用户手势后播放音频。Three.js 使用 `THREE.Audio` / `THREE.PositionalAudio` 与 `THREE.AudioListener`，由项目明确音频实例和共享监听器的所有权；场景移除不能代替音频收尾。离开场景时，按实例的播放控制能力停止本场景拥有的声音，并断开已连接的音频节点；共享监听器和音频上下文由其所有者管理，不停止其他场景的有效声音。接口依据：[Three.js Audio](https://threejs.org/docs/pages/Audio.html)、[Three.js AudioListener](https://threejs.org/docs/pages/AudioListener.html)。

## 多人和不确定结果

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#多人和不确定结果)。

## 完整游戏循环

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#完整游戏循环)。

## 长期体验与可访问性

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#长期体验与可访问性)。

## 资源规范与规模控制

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#资源规范与规模控制)。

## 参数与事件模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#参数与事件模板)。

### 单事件规格模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#单事件规格模板)。

## 覆盖核对表与验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#覆盖核对表与验收)。

### 事件范围核对

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#事件范围核对)。

### 单事件覆盖表

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#单事件覆盖表)。

### 场景与验证方法

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#场景与验证方法)。

## 四类完整设计实例

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#四类完整设计实例)。

### 动作：重击命中

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#动作重击命中)。

### 解谜：三消连锁

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#解谜三消连锁)。

### 卡牌：出牌与联动

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#卡牌出牌与联动)。

### 经营：批量收获

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#经营批量收获)。

## 现有质量规则与资料

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#现有质量规则与资料)。

## 本栈配套资料

- [帧动画动作时间轴](../../threejs-domain-contracts/resources/frame-animation/references/action-timing.md)
- [UI 布局契约](../../threejs-game-ui-layout/references/layout-contract.md)
- [美术体验契约](../../threejs-game-asset-integration/references/art-quality-contract.md)
- [玩法视觉契约](../../threejs-game-asset-integration/references/gameplay-visual-contract.md)
- [游戏感质量门](../../threejs-game-asset-integration/references/game-feel-quality-gate.md)
- [工作流接入](./workflow-integration.md)
- [音频后台暂停与恢复约束](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-audio--后台暂停与恢复约束)
- [四类完整设计实例](#四类完整设计实例)
- [覆盖核对表与验收](#覆盖核对表与验收)
- [参数与事件模板](#参数与事件模板)
- [资源规范与规模控制](#资源规范与规模控制)
- [完整游戏循环](#完整游戏循环)
- [长期体验与可访问性](#长期体验与可访问性)
- [输入与平台环境](#输入与平台环境)
- [多人和不确定结果](#多人和不确定结果)
- [声音镜头与环境](#声音镜头与环境)
- [组合优先级与预算](#组合优先级与预算)
- [反馈语义约定](#反馈语义约定)
- [类型场景清单](#类型场景清单)
- [类型适用矩阵](#类型适用矩阵)
- [情绪与节奏](#情绪与节奏)
- [连续操作](#连续操作)
- [通用反馈库](#通用反馈库)
- [运动接触与材质](#运动接触与材质)
- [设计原则与玩法边界](#设计原则与玩法边界)
