# Cocos 2D 游戏汁水感设计指南

本指南把 Juice（汁水感）定义为：玩家输入、规则变化、角色行为、环境反应和阶段成果，都获得及时、清楚、符合游戏气质的反馈，使操作有质感、结果可理解、情绪有回报。动作游戏强调力量，解谜强调解开的满足，经营强调成长，策略强调局势变化，恐怖强调紧张；不以特效数量、亮度或震动强度统一评价。

设计方法适用于主流 2D 类型；工程部分针对本仓库的 Cocos Creator 3.x。具体 API 按目标游戏锁定版本核对，不建立旧版本兼容实现。本文技术事实按 Cocos Creator 3.x.1.0 官方源码核实；所有时长、数量与幅度示例仅是调参起点，不是引擎标准、行业阈值或自动验收条件。

## 目录与使用方式

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#目录与使用方式)。

- [Cocos 工程边界](#cocos-工程边界)
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

## Cocos 工程边界

先读取目标项目的 `package.json`、Creator 编辑器版本和锁定依赖。以下参考链接指向 Cocos Creator 3.8 文档；其他 3.x 小版本应按项目版本核对 API，不跨版本移植接口。

| 能力 | Cocos Creator 3.x 实现方向 | 边界 |
| --- | --- | --- |
| 形变、位移、透明度 | Creator Tween 系统与职责独立的表现 Node | 保留基准值、属性所有权与取消后的有效终态 |
| 帧动作、特效 | 已验收的 `SpriteFrame`、`AnimationClip` 或项目动画组件 | 规则事件不依赖漏播的一帧结算；播放方式按目标版本及资源合同核对 |
| 接触、尘土、碎屑 | Creator `ParticleSystem2D`、`ParticleSystem` 或项目已有效果池 | 数量、寿命、位置、预算与回收按所用组件实测 |
| 声音 | `AudioSource` 与项目统一音频服务 | 解锁、并发、暂停原因、切场景清理由项目服务管理 |
| 镜头 | Creator `Camera` 配置与项目控制的相机偏移 | 隔离 Canvas UI，声明叠加策略并实测视口与缩放；不假设引擎提供通用震屏行为 |
| 光效与后处理 | 项目实际启用且在目标平台支持的材质/后处理方案 | 不使用未在锁定 Creator 版本核实的滤镜接口 |
| 时间效果 | 游戏规则、Tween、动画、粒子、Spine、声音和输入的分系统协调 | 明确恢复责任、重叠请求、游戏时间与表现时间；不假设存在统一全局倍率 |

Creator Tween 系统可驱动 Node 等对象的变换和颜色属性，并支持延迟、串行及并行动作。Tween 的 `timeScale` 仅在 Creator 3.8.4 及以上文档版本列出，使用前须核对实际小版本，且该设置只作用于对应 Tween；不能把它当作全游戏时间倍率。[Tween 系统文档](https://docs.cocos.com/creator/3.8/manual/en/tween/index.html)、[Tween API](https://docs.cocos.com/creator/3.8/api/en/function/tween)、[Tween 接口版本说明](https://docs.cocos.com/creator/3.8/manual/en/tween/tween-interface.html)。

### 时间控制

| 子系统 | 实施与验证边界 |
| --- | --- |
| 规则、AI、计时器 | 由玩法状态所有者显式处理暂停、顿帧和恢复；修改表现速率不能代替规则冻结 |
| Tween | 逐个确认所属对象、取消方式和恢复责任；需要时间倍率时按目标 Creator 版本核实 Tween 接口 |
| Creator Animation 与帧动画 | 按项目实际动画组件、Animation State 和资源设置管理播放、暂停、切换及收尾；不推断其他子系统随之变速 |
| 粒子与 Spine | 根据具体组件、目标平台和所用数据模式确认更新/暂停策略，不从其他组件的倍率外推 |
| 声音 | 是否续播、暂停或变速是独立选择，遵循项目音频服务及后台恢复合同 |
| 输入与 UI | 明确接受、缓存或拒绝哪些输入，以及哪些界面在时间效果期间继续响应 |

顿帧恢复不能依赖同一顿帧已冻结的计时器。多个请求由具有明确所有权的协调逻辑合并；恢复各子系统此前的有效状态，不把所有系统盲目设为默认值。已有手动暂停、后台暂停或其他时间效果仍需保留，暂停、切场景和对象销毁都必须可靠解除当前请求。

### 渲染、相机与声音

Creator 使用 Scene/Node 层级、`Camera`、Canvas 以及对应渲染组件组织画面。镜头反馈优先使用项目拥有的受控偏移，并为世界内容和 UI 定义清晰的相机边界；连续叠加、刷新、忽略和恢复策略由项目合同决定。需用材质或后处理时，先核对目标 Creator 版本、渲染管线和目标平台的实际支持，不能凭通用滤镜名称推断存在可调用接口。[Camera API](https://docs.cocos.com/creator/3.8/api/en/class/Camera)。

Creator 3.x 的音频播放组件为 `AudioSource`，较长音乐与短音效的实例生命周期由项目音频服务统一管理。Web 播放需遵守浏览器的用户手势策略；场景切换只清理当前所有者的实例，不误停仍有效的全局音乐。[AudioSource 组件参考](https://docs.cocos.com/creator/3.8/manual/en/audio-system/audiosource.html)。

Creator 原生帧动画可由 Animation 系统驱动节点或组件属性；Sprite 帧资源通过 `SpriteFrame` 与项目的 `AnimationClip`/`Animation` 接入。粒子系统按 2D 或 3D 实际组件选择，不能把动画播放、粒子生命周期或音频暂停自动推断为同一个时钟行为。[Animation 系统](https://docs.cocos.com/creator/3.8/manual/en/animation/)、[Sprite 组件](https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/sprite.html)、[Particle System](https://docs.cocos.com/creator/3.8/manual/en/particle-system/index.html)。

### 结构与生命周期

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#结构与生命周期)。

## 输入与平台环境

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#输入与平台环境)。

浏览器可能要求用户手势后播放音频；循环音乐的生命周期由项目音频服务管理，单场景清理不应误停全局持有的有效实例。具体播放与恢复边界见[后台暂停与恢复约束](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio--后台暂停与恢复约束)。

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

- [帧动画动作时间轴](../../cocos-domain-contracts/resources/frame-animation/references/action-timing.md)
- [UI 布局契约](../../cocos-game-ui-layout/references/layout-contract.md)
- [美术体验契约](../../cocos-game-asset-integration/references/art-quality-contract.md)
- [玩法视觉契约](../../cocos-game-asset-integration/references/gameplay-visual-contract.md)
- [游戏感质量门](../../cocos-game-asset-integration/references/game-feel-quality-gate.md)
- [工作流接入](./workflow-integration.md)
- [音频后台暂停与恢复约束](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio--后台暂停与恢复约束)
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
