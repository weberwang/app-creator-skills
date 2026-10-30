---
name: app-stack-flutter
description: 规划或实现 Flutter 应用页面、Widget 状态、导航、自适应布局、键盘/系统安全区、无障碍、页面视觉目标和 Flutter 测试时使用。
---

# Flutter 技术栈

完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。


先读公共 [`app-creator-workflow`](../app-creator-workflow/SKILL.md) 与 [`app-workflow-control`](../app-workflow-control/SKILL.md)，然后依任务读取[工程与架构](references/engineering.md)、[PAGE 工作项与布局](references/pages-and-layout.md)、[页面素材与视觉质量](references/assets-and-visual-quality.md)或[验证](references/verification.md)。

Flutter 独立 APP 页面采用 `PAGE` 工作类型。公共 V0–V5 由控制面提供身份和证据容器：V1 验证页面功能与状态，草图或白盒按需选择；V2 确认视觉目标，V3 拆解和布局，V4 资源导入，V5 验收实际页面与 fidelity。它不会把页面硬套进 Scene 生命周期或 Camera 坐标。页面没有实际视觉变化时，不强迫进入完整视觉评审链。

使用 FVM 运行项目已固定的 Flutter/Dart；源技术栈不预设具体版本。代码实现、技术设计、新增依赖或插件替换时读取[插件与技术方案选型](references/plugin-selection.md)：命中触发边界后优先采用通过准入的插件，未触发的简单局部逻辑使用 SDK，自研须记录例外证据。按能力档记录平台准入和替代方案，复用现有状态管理和导航，不从 `pub get`、公开 Widget 或模拟截图推测兼容或运行结果。

来源：`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-project-init`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-tech-design`、`flutter-app-orchestrator/SKILL.md`、`adaptive-layout-implementation/references/layout-spec.md`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-ux-ui-quality`、`flutter-hifi-mockup/references/mockup-review-rubric.md`。
