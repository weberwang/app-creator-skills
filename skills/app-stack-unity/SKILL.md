---
name: app-stack-unity
description: 在已选用 Unity 的游戏或交互项目中制定与实现 Unity 专属工程、场景、资源、UI、动画、测试和构建方案；Unity 版本、包或序列化资产边界决定实施方式时使用。
---

# Unity 技术栈

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)。确认当前项目实际 Unity 版本与已有布局，再按任务读取 [工程与架构](references/engineering.md)、[场景、UI 与资源](references/assets-and-ui.md) 或 [验证与环境](references/verification.md)。

Unity 6 与 URP 是此规范的默认起点；尊重项目已安装版本和配置。运行时 UI 默认 uGUI 与 TextMeshPro，编辑器新工具默认 UI Toolkit。不能把 Unity 目录或序列化语义用于其他技术栈。

Sprite 的 Pixels Per Unit 默认 `100`，uGUI 新建 Canvas 的参考像素单位默认 `100`；覆盖条件与导入回读要求见[默认像素单位](references/assets-and-ui.md#默认像素单位)。

插件执行按任务路由给可用的 Unity CLI、Unity MCP 与框架专项能力；先确认目标工程、活动 Editor 和实时可用命令。规范中列出的插件/工具能力不能视为当前已经连接或已经验证。

各技术栈统一使用 V0–V5：V1 先验证功能，白盒可选；V2 视觉目标、V3 拆解布局、V4 正式资源、V5 运行验收。

技术事实以 Profile 和 references 为准。实现调整不要求回改已确认的合同或追算哈希；工程证据证明实际运行状态，美术显示效果由用户人工检查确认。

来源：`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-architecture`、`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-visual-assets`、`unity-development-workflow/references/project-discovery.md`、`unity-development-workflow/references/project-structure.md`、`unity-development-workflow/references/resource-loading-and-frame-handoff.md`、`unity-development-workflow/references/3d-asset-workflow.md`、`unity-development-workflow/references/sdk-initialization.md`。
