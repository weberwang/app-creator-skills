---
name: app-stack-roblox
description: 在 Roblox Studio 游戏中规划或实现 Luau、Place、客户端与服务器、场景、GUI、模型、地形、资源、试玩和交付；需要选择 Studio 原生能力与验证边界时使用。
---

# Roblox Studio 技术栈

先读 [统一编排](../app-creator-workflow/SKILL.md)和[控制器](../app-workflow-control/SKILL.md)，确认当前 Experience/Place、Studio 实例、权限、项目路径与实际版本。按任务读取[工程与 Studio](references/engineering.md)、[内容与地形](references/content.md)、[文本布局](references/text-layout.md)、[验证与交付](references/verification.md)及本栈[原生能力手册](references/native-contracts.md)。本技能提供原生路线，不创建第二套控制状态。

用户指定优先；已连接 Studio 的 Place 和实际保存的 `.rbxl`/`.rbxlx` 是识别线索，单个 `.luau` 或普通目录不足以证明技术栈。先发现并复用现有 Studio，不自动新开实例或结束他人的会话；读取本机实际可用的 `list_roblox_studios`、`get_studio_state`、`skill` 与按需工具，始终绑定目标 `studio_id` 及 `Edit`、`Client` 或 `Server` 上下文。工具名称与参数依当前连接结果，不能把文档中的能力当作已连接或已执行。

未连接或工具缺失时，独立的仓库策划、规范和验证材料仍可推进；需要 Studio 的编辑、正式源回读或运行检查分别保持未验证。确需配置或安装时转入 `$roblox-studio:roblox-get-started` 的接入流程；遵循该技能对设置、用户登录及需要授权操作的要求，不静默安装、注册、修改设置或关闭 Studio。

正式工作优先使用 Studio 可编辑源：脚本按项目实际官方 Script Sync 映射，Place 选择一个真实保存并回读的 `.rbxl` 或 `.rbxlx` 作为正式快照。Script Sync 不保存非脚本实例、属性或标签，不能替代 Place；MCP 文档没有确认可自动本地保存的专用工具，自动保存能力须在当前实例实际验证。同一 Place 编辑、同步与保存保持单写者，使用真实项目路径及既有控制器的文件/证据合同。[正式源和环境](references/engineering.md)

游戏世界的实际对象使用 `SCENE`，独立弹窗等使用 `DISPLAY_LAYER` 并绑定宿主；数据规则和平台服务使用 `MODULE`。一份 Place 可包含多个游戏内容对象或关卡，不把每个关卡机械变成 Place。V0–V5 沿用公共阶段：V1 先验证功能，V2 确认目标，V3 拆解，V4 交付正式资源，V5 在当前正式组合中验证。Roblox `Gui`、系统界面、安全区和实际输入由本栈合同定义，三维世界坐标不能套用屏幕像素；不额外制作自有 Android/iOS 启动屏或执行 Vite/npm 构建。

客户端输入和 Remote 必须由服务端依实际规则校验；`execute_luau`、导入和启动试玩也可能触发云数据、HTTP、上传或其他副作用，先核对当前 Experience、数据环境和实际动作，默认使用隔离测试数据。云数据写入、上传、付费、发布及真机等仍按现有控制器的具体动作与授权执行。视觉截图和播放效果由用户人工检查，插件试玩子代理不能绕过该规则。

按本技能 [profile.json](profile.json) 和各公共能力的 `native-adapters.json` 选择唯一模式；18 个原生模式使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs roblox <公共能力名>` 读取。安装来源、资源审核、可用工具和实际运行结果均按当前项目核实，不将本地模板、离线合同或截图采集冒充 Studio 运行通过。
