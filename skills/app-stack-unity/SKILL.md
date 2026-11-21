---
name: app-stack-unity
description: 在已选用 Unity 的游戏或交互项目中制定与实现 Unity 专属工程、场景、资源、UI、动画、测试和构建方案；Unity 版本、包或序列化资产边界决定实施方式时使用。
---

# Unity 技术栈

已选 CrazyGames、微信／抖音小游戏、Google Play 或 App Store 时，按[渠道接入](../app-release/references/channel-platform-integration.md)核实当前 Unity 版本对应的 Web、小游戏适配或原生构建路线，再接入所选平台能力；Editor 或普通 WebGL 可运行不证明渠道通过。

大场景和多状态流程按[分批生产](../app-domain-toolkit/references/incremental-production.md)安排，维持同一正式 Scene、Prefab 和资源身份；共享编辑器源保持单写者并在每批保存、回读。

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)。确认当前项目实际 Unity 版本与已有布局，再按任务读取 [工程与架构](references/engineering.md)、[场景、UI 与资源](references/assets-and-ui.md) 或 [验证与环境](references/verification.md)。

Unity 6 与 URP 是此规范的默认起点；尊重项目已安装版本和配置。运行时 UI 默认 uGUI，文字默认先评估 UniText，文本及国际化按[安装检查与 JSON 配置](../unity-development-workflow/references/text-and-localization.md)实施；安装不正确时由用户选择修复或回退 TMP。文字按[完整还原标准](../unity-development-workflow/references/visual-decomposition-routes.md#完整还原的判断标准)核实后定路线：已验证完整则原生，已确认不能则直接图片，尚未核实则待验证，文案仍读取固定 JSON 模板并按语言/状态绑定；所有文案消费者不按语言判断选择翻译，不限组件或显示位置。编辑器新工具默认 UI Toolkit。不能把 Unity 目录或序列化语义用于其他技术栈。

Sprite 的 Pixels Per Unit 默认 `100`，uGUI 新建 Canvas 的参考像素单位默认 `100`；覆盖条件与导入回读要求见[默认像素单位](references/assets-and-ui.md#默认像素单位)。

国际化初始化必须在 `foundation-engineering` / S00 完成：UniText 安装与能力检查、正式 JSON 文案加载/校验、启动语言和统一绑定均须有真实基础运行证据，按 [S00 验收条件](../unity-development-workflow/references/foundation-workflow.md#国际化基础能力验收)核对。该职责适用于单场景及全部文案消费者，不延后到 HUD 或 V5。

插件执行按任务路由给可用的 Unity CLI、Unity MCP 与框架专项能力；先确认目标工程、活动 Editor 和实时可用命令。规范中列出的插件/工具能力不能视为当前已经连接或已经验证。

各技术栈共用 V1–V5：V1 先验证功能，世界场景按[3D／2D 分流](../app-domain-toolkit/references/game-design-exploration.md#implementation-routes)落实搭建、整体确认和正式交接；UI 保留原图片与布局流程。

技术事实以 Profile 和 references 为准。目标内的普通实现修复无需重复确认未受影响的决定；设计目标、布局依据或受影响合同发生变化时更新实际材料。已冻结的目标、人工确认及相关证据引用按公共控制器核对内容身份与摘要，摘要不证明用户身份；工程证据和用户人工视觉确认分别报告。

来源：`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-architecture`、`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-visual-assets`、`unity-development-workflow/references/project-discovery.md`、`unity-development-workflow/references/project-structure.md`、`unity-development-workflow/references/resource-loading-and-frame-handoff.md`、`unity-development-workflow/references/3d-asset-workflow.md`、`unity-development-workflow/references/sdk-initialization.md`。
