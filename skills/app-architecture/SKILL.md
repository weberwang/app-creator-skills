---
name: app-architecture
description: "把已确认的产品需求转成模块边界、数据流、依赖关系、技术决策和可并行实施的交接包。"
---

# 技术架构与模块设计

把已确认需求组织成可维护、可测试、可逐步交付的模块设计，并让架构决策能够追溯到需求和风险。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 已确认的需求和验收条件；当前仓库、依赖与运行入口；平台、性能、隐私和上线约束；需要保留或迁移的旧数据与接口。

## 共用操作步骤

1. 先读取现有工程结构、版本、构建入口和已有约定，画出现有模块、持久化、外部服务及关键运行时之间的依赖。
2. 按[架构模块契约](../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)将需求分配到唯一所有者模块，并写明职责、输入输出、状态所有者、公开接口和依赖边界。
   涉及可见内容时，同时按[显示结构约定](../app-domain-toolkit/references/reference-domain-display-ownership.md#公共显示结构约定)规划实际显示树，明确导航宿主、内容槽、页面/世界、常驻 UI、瞬态层及组件的挂载、输入和生命周期；分别交付代码组织与显示组织，沿用当前栈原生结构和已有合同。
3. 沿主要用户流程或游戏事件追踪数据产生、校验、存储、观察、生命周期与恢复责任；具体数据流约定见[架构模块契约](../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)。
4. 按[技术方案选型顺序](../app-creator-workflow/references/professional-conventions.md#solution-selection)优先官方、其次成熟社区、最后自研；结合[架构模块契约](../app-creator-workflow/references/professional-conventions.md#architecture-module-contracts)比较复杂度、性能、测试性、迁移成本和平台限制，记录来源、适用版本、决策依据、被拒方案、风险与复审条件；自研须说明官方和社区方案的具体缺口。
5. 按[协作与交接](../app-creator-workflow/references/handoffs.md)为并行实施拆出有序交接包，明确文件/对象所有权、接口冻结点、先决任务、可独立验证的结果及集成责任。
6. 设计覆盖关键边界的测试与演进方案；涉及数据格式变更时列出备份、升级、回滚和旧数据处置步骤。

## 关键边界

- 第三方 SDK 的文件职责遵循[独立管理与初始化规范](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#文件职责)，技术栈资料仅补充入口路径和原生要求。
- 架构图必须反映真实仓库和目标栈，不凭空引入框架、服务或新依赖。
- 平台/API细节和资源生命周期由当前栈原生适配补齐；未经授权不得修改公共配置或执行迁移写入。

## 交付

- 模块与数据流图、接口契约、架构决策记录、迁移/恢复方案、风险清单和可执行的实施交接包。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-architecture [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

