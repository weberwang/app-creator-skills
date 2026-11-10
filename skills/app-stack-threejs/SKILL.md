---
name: app-stack-threejs
description: 为浏览器中的 three.js 3D 应用或游戏设计世界场景、WebGL 渲染、glTF/GLB 模型接入、材质、动画、资源释放与 3D 性能验证时使用。
---

# Three.js 技术栈

已选分发渠道按[渠道接入](../app-release/references/channel-platform-integration.md)区分 CrazyGames Web、需核实适配能力的微信／抖音小游戏，以及 Google Play／App Store 的已确认原生宿主路线；WebGL、DOM、音频和资源能力按实际宿主验证，不从浏览器结果推断小游戏可用。

复杂世界和多状态流程按[分批生产](../app-domain-toolkit/references/incremental-production.md)安排，核对同一正式三维世界、镜头／HUD 和资源生命周期，不按目标图复制运行场景。

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读公共 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)，发现项目版本和 Renderer，再按需读[架构与世界空间](references/architecture-and-world.md)、[模型和资源](references/models-and-assets.md)或[渲染与验证](references/rendering-and-verification.md)。

Three.js 技能区分真实三维世界与固定 HUD/页面，不能套用二维游戏的缩放坐标合同。WebGL 2 Renderer 是新项目默认；只有实际运行浏览器、材质与目标部署验证后才使用 WebGPU。Capacitor 和原生平台插件按实际需求启用。

场景或弹出层加载遵循[统一加载与过渡显示](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)：复用应用宿主上的同一加载服务与显示层，区分 Loader 完成、场景图挂载、必要数据及首个可显示布局；场景退出清理更新与输入，共享纹理、材质和几何按实际消费者释放。

各技术栈统一使用 V0–V5：V1 先验证功能，白盒可选；V2 视觉目标、V3 拆解布局、V4 正式资源、V5 运行验收。

来源：`skills/threejs-game-architecture/references/project-structure.md`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-asset-integration`、`skills/threejs-game-architecture/references/production-build.md`。
