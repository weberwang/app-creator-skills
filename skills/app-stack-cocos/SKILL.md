---
name: app-stack-cocos
description: 在 Cocos Creator 项目中实现或审查场景、节点、Component、Prefab、UI、AssetDB 导入和 Creator 发布构建；选择 Creator 版本与编辑器操作方式时使用。
---

# Cocos Creator 技术栈

已选 CrazyGames、微信／抖音小游戏、Google Play 或 App Store 时，按[渠道接入](../app-release/references/channel-platform-integration.md)选择当前 Creator 版本的对应平台构建与 SDK；Cocos 使用自身原生导出路线，不默认套用 WebView 包装，编辑器／浏览器结果不代替真实宿主验证。

大场景和多状态流程按[分批生产](../app-domain-toolkit/references/incremental-production.md)安排，沿用同一正式 Scene、Prefab 与 AssetDB 身份；共享编辑器源保持单写者并在每批保存、回读。

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先阅读公共 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 和 [`app-workflow-control`](../app-workflow-control/SKILL.md)，识别当前 Creator 项目及版本，然后根据任务读取 [架构与 AssetDB](references/architecture-and-assetdb.md)、[UI 与视觉资产](references/ui-and-assets.md) 或 [验证和构建](references/verification.md)。

该栈以 Cocos Creator 3.x 为预期技术系列；每个小版本都需单独核对项目设置、Creator MCP 实际命令及序列化行为。不得手写 Editor 管理的 Scene、Prefab、`.meta` 或猜测 UUID。核心正式工作通常依赖 Cocos Creator Editor 与 Creator MCP 能力。无法发现或读回所需工具时，停止相应编辑器操作，并报告缺失能力。

公共工作项和控制记录由统一工作流维护。Creator 编辑器、AssetDB、组件、布局和平台打包行为只由本技术规范界定。

各技术栈统一使用 V0–V5：V1 先验证功能，白盒可选；V2 视觉目标、V3 拆解布局、V4 正式资源、V5 运行验收。

来源：`README.md`、`skills/cocos-game-architecture/references/project-structure.md`、`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout`、`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration`、`skills/cocos-game-workflow-control/references/cocos-mcp-protocol.md`。
