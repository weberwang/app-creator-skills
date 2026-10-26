---
name: app-stack-threejs
description: 为浏览器中的 three.js 3D 应用或游戏设计世界场景、WebGL 渲染、glTF/GLB 模型接入、材质、动画、资源释放与 3D 性能验证时使用。
---

# Three.js 技术栈

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读公共 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)，发现项目版本和 Renderer，再按需读[架构与世界空间](references/architecture-and-world.md)、[模型和资源](references/models-and-assets.md)或[渲染与验证](references/rendering-and-verification.md)。

Three.js 技能区分真实三维世界与固定 HUD/页面，不能套用二维游戏的缩放坐标合同。WebGL 2 Renderer 是新项目默认；只有实际运行浏览器、材质与目标部署验证后才使用 WebGPU。Capacitor 和原生平台插件按实际需求启用。

来源：`skills/threejs-game-architecture/references/project-structure.md`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-asset-integration`、`skills/threejs-game-architecture/references/production-build.md`。
