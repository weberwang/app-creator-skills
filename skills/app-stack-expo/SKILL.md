---
name: app-stack-expo
description: 规划、开发或交付采用 Expo 的 React Native 应用时使用，涵盖页面、导航、原生能力、资源、构建、测试和发布；Web 仅在项目选择该目标时适用。
---

# Expo 技术栈

先读公共 [app-creator-workflow](../app-creator-workflow/SKILL.md) 与 [app-workflow-control](../app-workflow-control/SKILL.md)，共用六阶段、工作项、证据和 V0–V5。应用页面使用 `PAGE`，独立瞬态层使用 `DISPLAY_LAYER` 并绑定实际页面宿主；业务能力使用 `MODULE`，不使用游戏 `SCENE`。Android、iOS 只处理实际选定的平台；Web 为按需目标，服务端 API 使用其实际服务端工作项。

结合 `package.json` 的 Expo 与 React Native 依赖、应用配置及真实入口识别工程；`package.json` 或 `app.json` 单独存在不足以证明 Expo。沿用项目锁定的 Expo SDK、React Native、React、Node 和包管理器，先核实依赖与目标平台兼容。新项目优先评估 Expo Router，现有项目保留其实际导航方案。

按任务读取：

- 项目来源、CNG、原生目录、SDK 与环境配置：[工程与架构](references/engineering.md)。
- 页面、弹窗、加载、布局、素材与性能：[显示、资源与性能](references/display-and-assets.md)。
- 文本属性、字号适配及本地化：[文本布局](references/text-layout.md)。
- 测试、启动屏、内购核查、发布、OTA 和清理：[验证与交付](references/verification.md)。
- 控制器的 Expo V2–V5 输入：[领域证据合同](../expo-domain-contracts/references/domain-validation.md)。
- 按公共能力读取本栈专业规则：`node .agents/skills/app-skill-runtime/read-native-mode.mjs expo <公共能力>`，只展开[原生手册](references/native-contracts.md)的相应模式；维护技能源码时将 `.agents/skills/` 换为 `skills/`。

Expo Go 只作为其能力覆盖范围内的预览；正式开发按需要使用 development build，不能把 Expo Go、Web 或单元测试结果冒充原生构建和发布验收。系统启动屏与首帧衔接按实际发布构建核验；截图及录屏由用户人工检查。单元、工程、原生运行与视觉结果分别报告。

Expo 插件、EAS 云服务和 OTA 均按项目实际需要使用，并非本栈前置条件。启动新验证进程前先检查可复用实例；不自动进行真机、云构建、付费、签名、上传、OTA 或发布，只有对应明确授权才执行。发布工作项默认准备而非发布。
