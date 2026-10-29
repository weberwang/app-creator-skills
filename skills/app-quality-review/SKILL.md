---
name: app-quality-review
description: "基于可复现证据审核功能、视觉、无障碍、性能、平台差异和回归风险并推动问题闭环。"
---

# 质量审核与性能验证

使用可复现的证据发现并归类质量问题，区分工程正确性、用户体验和性能风险，清楚标出未验证部分。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 明确版本与变更范围；验收条件、目标设备/浏览器和性能预算；可复现的运行入口、日志与问题记录。

## 共用操作步骤

1. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)确认被测快照、目标平台和可复用运行实例；把功能、布局/无障碍、性能、资源、存档/网络等风险映射到具体检查项。涉及界面美术时，将[无文字意图可读性](../app-asset-workflow/references/interface-intent.md)纳入已有人工审阅。
2. 先跑最小冒烟和关键路径，再扩展边界/状态组合；每条用例写清前置条件、操作、预期、实际和证据位置。
3. 对性能记录设备、构建模式、场景/负载、预热、采样窗口和测量数据；与基线及预算比较，不凭一次波动推断趋势。
4. 将发现按影响、频率、可绕过性和证据可信度分级，并按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)分开记录观察事实、推测根因与建议修复。
5. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)只复验失败或受实际影响的区域及必要回归；环境、输入或快照失效时重新检查相关通道，新增副作用时扩展覆盖。
6. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)汇总通过、失败、阻断、未运行、环境限制和剩余风险，以覆盖范围内的证据说明当前结论，不替用户宣告体验验收。

## 关键边界

- 按[文本宽度、缩放与换行](../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)核对固定行宽、按用途选定的模式及具体最小字号：标题/按钮保持单行并在下限内自动缩放，长描述自然换行且完整可读；内容撑宽、低于下限、长描述被裁切或以缩小抵消系统字体放大均须修复。
- 项目存在编辑器布局时，按[布局控制权](../app-domain-toolkit/references/editor-display-authoring.md#编辑器位置关系的控制权)核对脚本位置写入是否有明确功能依据、限定范围及结束策略，并验证编辑器调整能在启动、启用和刷新后生效；无功能依据的覆盖作为缺陷处理。
- 对新增显示元素，按[增量显示约束](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)核对正式源与实际实例的父级、位置参照、尺寸、层序和输入，以及受影响的布局/资源材料和当前验证证据；不能仅凭元素出现、旧页面已通过或编辑器已保存判定完成。
- 涉及新增能力、依赖或通用基础设施时，按[技术方案选型顺序](../app-creator-workflow/references/professional-conventions.md#solution-selection)核对来源、版本与适用性证据；采用社区或自研须有上一级方案的具体缺口依据。发现无依据的重复实现时列为审查问题，由实施者修复并定向复验。
- 测试报告不能把未运行或受环境限制的项目标为通过；视觉显示由用户人工检查，除非用户明确授权自动分析。
- 跨端检查的工具、统计指标和布局断点由当前栈及设备配置决定。

## 交付

- 普通审查直接输出带快照身份的报告，包括适用的测试矩阵、复现步骤、性能数据、缺陷分类、修复复验结果和剩余风险；不为报告创建网页或启动服务。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-quality-review [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

