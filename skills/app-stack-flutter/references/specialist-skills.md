# Flutter 能力与原生适配

从公共能力入口进入任务，再按模式定位本栈[原生技术手册](native-contracts.md)的对应章节。专业差异集中维护，脚本、模板与校验器仍在各资源目录；旧专业目录不保留 SKILL.md 或 ADAPTER.md 入口。

领域输入与公共证据接线见[领域校验接入](domain-validation.md)。

| 公共能力 | 唯一入口 |
| --- | --- |
| 产品与游戏需求 | [app-product-planning](../../app-product-planning/SKILL.md) |
| 技术架构与模块设计 | [app-architecture](../../app-architecture/SKILL.md) |
| 游戏与应用汁水设计 | [app-feedback](../../app-feedback/SKILL.md) |
| 候选交付与发布准备 | [app-release](../../app-release/SKILL.md) |
| 质量审核与性能验证 | [app-quality-review](../../app-quality-review/SKILL.md) |
| 界面布局与自适应 | [app-ui-layout](../../app-ui-layout/SKILL.md) |
| 项目整理与产物清理 | [app-artifact-cleanup](../../app-artifact-cleanup/SKILL.md) |
| 项目初始化与基础运行时 | [app-project-foundation](../../app-project-foundation/SKILL.md) |
| 界面代码草图 | [app-ui-code-sketch](../../app-ui-code-sketch/SKILL.md) |
| 有设计约束的素材生产 | [app-asset-workflow](../../app-asset-workflow/SKILL.md) |
| 游戏与应用统一编排 | [app-creator-workflow](../../app-creator-workflow/SKILL.md) |

## 原生适配模式

| 原专业能力 | 公共入口 | 完整原生规范 |
| --- | --- | --- |
| adaptive-layout-implementation | $app-ui-layout | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation) |
| flutter-asset-atlas | $app-asset-workflow | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-asset-atlas) |
| flutter-code-sketch | $app-ui-code-sketch | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-code-sketch) |
| flutter-hifi-mockup | $app-asset-workflow | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-hifi-mockup) |
| flutter-implementation-plan | $app-creator-workflow | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-implementation-plan) |
| flutter-product-spec | $app-product-planning | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-product-spec) |
| flutter-project-init | $app-project-foundation | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-project-init) |
| flutter-quality-review | $app-quality-review | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-quality-review) |
| flutter-release-readiness | $app-release | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-release-readiness) |
| flutter-subagent-delivery | $app-creator-workflow | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-subagent-delivery) |
| flutter-tech-design | $app-architecture | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-tech-design) |
| flutter-ux-ui-quality | $app-quality-review | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-ux-ui-quality) |
| flutter-feedback（本仓库新增） | $app-feedback | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-feedback) |
| flutter-artifact-cleanup（本仓库新增） | $app-artifact-cleanup | [原生章节](../../app-stack-flutter/references/native-contracts.md#mode-flutter-artifact-cleanup) |

## 支持资源

- [adaptive-layout-implementation](../../adaptive-layout-implementation)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [app-domain-toolkit](../../app-domain-toolkit)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-app-orchestrator](../../flutter-app-orchestrator)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-asset-atlas](../../flutter-asset-atlas)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-code-sketch](../../flutter-code-sketch)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-domain-contracts](../../flutter-domain-contracts)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-hifi-mockup](../../flutter-hifi-mockup)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-implementation-plan](../../flutter-implementation-plan)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-product-spec](../../flutter-product-spec)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-project-init](../../flutter-project-init)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-quality-review](../../flutter-quality-review)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-release-readiness](../../flutter-release-readiness)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-subagent-delivery](../../flutter-subagent-delivery)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-tech-design](../../flutter-tech-design)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [flutter-ux-ui-quality](../../flutter-ux-ui-quality)：领域资料、模板和工具依赖；不含独立全局流程入口。

## 原工具入口

运行 Node 专业工具前按安装说明准备统一依赖。视频、DCC 和引擎工具仍需对应外部程序，不因脚本存在而认定已经运行。

- `workflow-snapshot`：[实现](../../flutter-domain-contracts/tools/scripts/workflow-snapshot.js)，按专业技能中给出的 CLI 参数调用。
- `validate-workflow`：[实现](../../flutter-domain-contracts/tools/scripts/validate-workflow.js)，按专业技能中给出的 CLI 参数调用。
