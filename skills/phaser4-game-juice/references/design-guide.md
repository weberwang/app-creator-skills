# Phaser 2D 游戏汁水感设计指南

本指南把 Juice（汁水感）定义为：玩家输入、规则变化、角色行为、环境反应和阶段成果，都获得及时、清楚、符合游戏气质的反馈，使操作有质感、结果可理解、情绪有回报。动作游戏强调力量，解谜强调解开的满足，经营强调成长，策略强调局势变化，恐怖强调紧张；不以特效数量、亮度或震动强度统一评价。

设计方法适用于主流 2D 类型；工程部分针对本仓库的 Phaser 4。具体 API 按目标游戏锁定版本核对，不建立旧版本兼容实现。本文技术事实按 Phaser 4.1.0 官方源码核实；所有时长、数量与幅度示例仅是调参起点，不是引擎标准、行业阈值或自动验收条件。

## 目录与使用方式

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#目录与使用方式)。

- [Phaser 工程边界](#phaser-工程边界)
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

## Phaser 工程边界

先读目标游戏的依赖与锁文件。本技能仓库不固定游戏运行时版本；下面的 API 事实以官方 v4.1.0 为核实基线。实施前仍按项目版本读取官方文档/源码并进行定向验证。

| 能力 | Phaser 4 实现方向 | 边界 |
| --- | --- | --- |
| 形变、位移、透明度 | Tween 与独立表现节点 | 保留基准值、属性所有权与取消后终态 |
| 接触、尘土、碎屑 | 可复用粒子发射器或效果池 | 数量、寿命、位置、预算与回收 |
| 帧动作、特效 | 已验收动画资源与关键事件点 | 规则事件不依赖漏播的一帧结算 |
| 声音 | 统一音频服务与明确实例持有者 | 解锁、并发、暂停原因、切场景清理 |
| 镜头 | Camera 效果或受控偏移 | UI 隔离、叠加策略、实际视口与缩放 |
| 光效与后处理 | Phaser 4 Filters | 按实际对象/滤镜支持与渲染器核对 |
| 时间效果 | 分系统策略与集中协调 | 恢复责任、重叠请求、游戏时间与表现时间 |

### 时间控制

| 系统 | v4.1.0 事实或设计要求 |
| --- | --- |
| Scene Clock | `scene.time.timeScale` 影响其 Timer Events；大于 1 加速，小于 1 减速，0 冻结，不是全游戏倍率 |
| TweenManager | `scene.tweens.timeScale` 影响该管理器补间，需要独立确定策略 |
| Arcade Physics | 固定步长下 `world.timeScale=2` 半速、`0.5` 双速；`fixedStep=false` 时倍率与 FPS 控制不生效 |
| 规则与 AI | 自身推进需显式处理，不因修改某个管理器就自动停止 |
| Sprite 动画与粒子 | 按项目版本分别核对更新与倍率，不能假设 Clock 控制它们 |
| 声音 | 是否续播、暂停或变速是独立选择，不能假设随世界时间缩放 |
| 输入与 UI | 明确接受、缓存、拒绝哪些操作及哪些界面继续工作 |

顿帧恢复不能由已冻结的计时器负责。多个请求由有明确持有权的控制逻辑合并，恢复先前有效状态，不简单把所有系统设为默认值；已有手动暂停、后台暂停或其他时间效果仍需保留。暂停、切场景和销毁必须可靠解除本请求。

来源：[Clock](https://docs.phaser.io/api-documentation/class/time-clock)、[TweenManager](https://docs.phaser.io/api-documentation/class/tweens-tweenmanager)、[官方 v4.1.0 Arcade World 源码](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/World.js)。

### 渲染与相机

Phaser 4 使用 Filters：对象按需 `enableFilters()`，以 `filters.internal` / `filters.external` 管理，滤镜依赖 WebGL。Canvas Renderer 在 v4 迁移文档中标为 deprecated，且不支持高级 WebGL 能力。选定目标渲染能力后实施，不直接把 Phaser 3 的 FX 接口写进 Phaser 4 代码。

Camera Shake 的 intensity 是相对强度，不是固定像素；实际偏移与相机尺寸和 zoom 有关。运行中再次调用是否重启还受 force 参数影响，需由项目定义刷新、忽略或聚合策略。API 默认值不等于适合当前游戏的设计幅度。

来源：[官方 v4 迁移指南](https://github.com/phaserjs/phaser/blob/v4.1.0/changelog/v4/4.0/MIGRATION-GUIDE.md)、[Filters](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-filters)、[官方 v4.1.0 Shake 源码](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/effects/Shake.js)。

### 结构与生命周期

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#结构与生命周期)。

## 输入与平台环境

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-design-guide.md#输入与平台环境)。

浏览器可能要求用户手势后播放音频；Sound Manager 属于 Game，循环音不会因切换 Scene 自动停止，单场景清理不应误用全局停止。来源：[官方音频指南](https://docs.phaser.io/phaser/concepts/audio)、[官方 v4.1.0 WebAudioSoundManager](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js)。

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

- [帧动画动作时间轴](../../phaser-domain-contracts/resources/frame-animation/references/action-timing.md)
- [UI 布局契约](../../phaser4-game-ui-layout/references/layout-contract.md)
- [美术体验契约](../../phaser4-game-asset-integration/references/art-quality-contract.md)
- [玩法视觉契约](../../phaser4-game-asset-integration/references/gameplay-visual-contract.md)
- [游戏感质量门](../../phaser4-game-asset-integration/references/game-feel-quality-gate.md)
- [工作流接入](./workflow-integration.md)
- [音频后台暂停与恢复约束](../../app-stack-phaser/references/native-contracts.md#mode-phaser4-game-audio--后台暂停与恢复约束)
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
