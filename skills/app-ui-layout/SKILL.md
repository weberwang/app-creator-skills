---
name: app-ui-layout
description: "将界面需求整理为可测量的层级、信息优先级、断点/安全区和输入可达布局规则。"
---

# 界面布局与自适应

让界面在目标尺寸、方向、系统缩放和内容变化下保持层级清楚、操作可达、文字可读和状态可见。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

涉及用户可见文案时，先读取[通用文案原则](../app-domain-toolkit/references/ui-copy-principles.md)，再按当前技术栈完成规格、设计与实现。

## 输入

- 页面流程和真实文案；目标屏幕尺寸/方向/输入方式；安全区与系统缩放要求；已有组件、设计稿及内容极值。

## 共用操作步骤

1. 列出页面状态、主要任务、紧急提示和真实内容；为每个控件写明语义、优先级、尺寸下限、交互状态与可访问标签。按[无文字意图可读性](../app-asset-workflow/references/interface-intent.md)安排层级、形态与位置关系，使主要目标和操作意图无需先读文字也能辨认。
2. 按[UI 相对布局与定位](references/relative-layout.md)建立布局树和约束：标明容器层级、参照、对齐、间距、可伸缩/固定尺寸、滚动范围、遮挡关系、键盘/手柄焦点顺序。
   按[显示结构约定](../app-domain-toolkit/references/reference-domain-display-ownership.md#公共显示结构约定)把布局树落实到本栈实际节点、Widget 或 DOM，区分显示挂载、功能归属与渲染顺序；不以代码目录或设计稿图层替代运行结构。
3. 确定断点与重排策略，而不是只等比缩放；逐项处理安全区、横竖屏、长文案、多语言、系统字体放大和最小交互尺寸。
4. 用最短、最长、空、错误和加载内容填充布局，检查截断、换行、溢出、按钮遮挡和视觉优先级退化。
5. 在目标运行环境测量真实可用视口并核对触控/鼠标/键盘导航，修复每种布局约束的源头而非对单张截图加偏移。
6. 交付布局规则、断点/内容矩阵、导航顺序、运行验证矩阵和需用户人工判断的视觉点。

Unity、Cocos 任务新增显示元素时，统一遵循[显示元素的编辑器还原](../app-domain-toolkit/references/editor-display-authoring.md)，同步交付正式可编辑源及适用的动态预览。

## 关键边界

- 全部 UI 均遵循[相对布局与定位](references/relative-layout.md)；弹窗、浮窗和 Toast 仅本体允许独立定位，内部 UI 仍必须相对布局。
- Unity/Creator/Web UI 与 Flutter Widget 的布局系统并不相同；只使用当前栈匹配的原生适配模式。
- 效果图供目标确认，不能把按钮、动态文案和交互状态烘焙成不可访问的背景图。

## 交付

- 页面/组件结构、布局约束和断点、极值内容用例、目标尺寸回归与用户检查点。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-ui-layout [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

