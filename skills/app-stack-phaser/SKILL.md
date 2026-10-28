---
name: app-stack-phaser
description: 在 Phaser 4 浏览器游戏中设计或实现 TypeScript、Vite、Scene、游戏视口、输入映射、资源加载和生产构建；平台适配需要区分 Web、小游戏与原生宿主时使用。
---

# Phaser 技术栈

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读公共 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)，确认现有 Phaser/Vite/TypeScript 工程，再按需读取 [工程与架构](references/architecture.md)、[场景与显示布局](references/scenes-and-viewport.md)、[资产管线](references/assets-and-build.md) 或 [验证](references/verification.md)。

该技能以 Phaser 4、TypeScript 与 Vite 为默认 Web 路线。Capacitor 只在项目明确选择 iOS/Android 宿主时采用；特定小游戏与商店要求归入对应平台方案。尊重实际安装版本、锁文件和项目原有入口，不据此更换构建工具或添加未选平台。

HTML DOM/UI 与 Phaser Canvas 是不同渲染和输入空间，组合时明确边界与坐标转换。Three.js 的世界坐标和 Cocos Creator 的 Widget/AssetDB 不适用于 Phaser 的视口、资源和输入合同。

各技术栈统一使用 V0–V5：V1 先验证功能，白盒可选；V2 视觉目标、V3 拆解布局、V4 正式资源、V5 运行验收。

来源：`skills/phaser4-game-architecture/references/project-structure.md`、`skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-ui-layout`、`skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-asset-integration`、`skills/phaser4-game-architecture/references/production-build.md`。
