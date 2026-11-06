---
name: app-stack-esp32
description: 开发 ESP32 自带屏幕的嵌入式 GUI 固件时使用，覆盖开发板与屏幕约束、LVGL 页面、输入、资源、构建和设备验收；手机或电脑上的控制客户端使用其自身技术栈。
---

# ESP32 设备 GUI 技术栈

先读公共 [app-creator-workflow](../app-creator-workflow/SKILL.md) 与 [app-workflow-control](../app-workflow-control/SKILL.md)，共用其工作项、证据和 V0–V5，不另建固件状态机。设备完整页面使用 `PAGE`，弹窗等独立瞬态层使用 `DISPLAY_LAYER`；硬件驱动、业务和通信使用 `MODULE`，不使用游戏 `SCENE`。

默认方案是 ESP-IDF 与 LVGL，先核实具体芯片、板卡、显示与输入，以及 SDK、GUI 和移植组件的实际版本。已有 Arduino、PlatformIO 或其他 GUI 工程沿用明确选择，记录实际构建入口与能力缺口；不把 ESP-IDF 命令直接套到其他工程，也不擅自迁移技术栈。

按任务读取：

- 初始化、驱动和并发：读[工程与硬件](references/engineering.md)。
- 页面、字库、图片与预算：读[显示与资源](references/display-and-assets.md)。
- 本地构建、模拟、硬件和人工验收：读[验证与交付](references/verification.md)。
- 控制器 V2–V5 输入：读[领域证据合同](references/domain-validation.md)。
- 从公共能力进入专业任务：使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs esp32 <公共能力>`，只读[原生手册](references/native-contracts.md)中选中的模式。维护本仓库时将 `.agents/skills/` 换为 `skills/`。

V1 先验证功能、导航与状态，白盒按需使用；V2 的视觉目标必须在真实屏幕和资源预算内可实现；V3 保存正式布局树与输入规则；V4 转换并注册字体、图片和其他实际资源；V5 分别记录结构、工程、主机模拟、硬件运行和用户视觉确认。没有硬件授权时继续本地工作，硬件结果保留未执行，不能把模拟器通过写成整机验收通过。

不自动连接或操作真机、烧录、擦除、读写设备配置、OTA、启用安全熔丝或执行实际发布。真机动作须有对应明确授权；只读文档、生成代码或测试等级不构成该授权。截图可提供检查点，默认由用户人工检查。
