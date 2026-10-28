# 游戏与应用技能工作流

为 AI 编程助手提供从需求、功能实现、视觉设计到集成验证和发布准备的项目工作流。支持 Unity、Cocos Creator、Phaser、Three.js 和 Flutter，可按项目技术栈安装到 `.agents/skills/`。

你可以用自然语言描述想做的游戏或应用，由统一入口组织任务，按需调用产品、架构、玩法、视觉、资源、测试等专业能力。各技术栈使用自己的工程与领域规则，共用 V0–V5 阶段。

## 能做什么

- **启动项目**：梳理目标、平台、核心流程、语言和验收范围，建立工程与任务计划。
- **先验证功能**：按用户行为拆分功能，先验证机制与关键路径，再推进正式视觉；白盒、白模和临时资源按需使用。
- **制作视觉与资源**：确定视觉方向，生成一张或多张场景设计稿，完成拆解、布局、资源生产和导入。
- **组织跨场景功能**：明确导航框架、主页、共享路由和弹窗的职责，复用共享实现并验证实际组合。
- **持续交付**：支持局部修复、功能增量、质量审核、项目整理和发布准备，保留继续工作所需的有效记录。

这是技能、工具和工作流集合。引擎、SDK、素材工具及实际运行环境按所选技术栈另行准备；安装技能后，再由助手检查当前任务所需的环境。

## 选择技术栈

| 技术栈 | 适用项目 | 规范入口 |
| --- | --- | --- |
| Unity | 2D、3D 游戏与交互项目 | [app-stack-unity](skills/app-stack-unity/SKILL.md) |
| Cocos Creator | 基于 Creator 的游戏项目 | [app-stack-cocos](skills/app-stack-cocos/SKILL.md) |
| Phaser | Web 2D 游戏 | [app-stack-phaser](skills/app-stack-phaser/SKILL.md) |
| Three.js | Web 3D 场景与游戏 | [app-stack-threejs](skills/app-stack-threejs/SKILL.md) |
| Flutter | 跨平台应用 | [app-stack-flutter](skills/app-stack-flutter/SKILL.md) |

按实际项目选择一个或多个栈。专业能力的适用范围以对应入口及原生规范为准。

## 安装到项目

需要 **Node.js >= 22.20** 和 **Git**。推荐在目标项目根目录直接通过 npx 从 GitHub 安装，无需等待 npm 包发布或手动克隆仓库：

```powershell
# 交互选择技术栈
npx github:weberwang/app-creator-skills

# 或直接指定技术栈
npx github:weberwang/app-creator-skills flutter
npx github:weberwang/app-creator-skills unity,cocos
```

安装到当前项目的 `.agents/skills/`，仅写入所选栈与公共依赖。只有显式选择 `all` 才安装全部五栈；非交互环境须指定技术栈。

私有 GitHub 仓库需要先配置 Git 的访问凭证。npx 会取得仓库包及其 Node 依赖，再从包内技能安装，不再通过 GitHub API 重复下载。需要固定版本时使用 `npx 'github:weberwang/app-creator-skills#提交SHA' flutter`，安装内容与该提交一致。npm 包发布后也可使用 `npx app-creator-skills flutter`。

需要运行专业 Node 工具时，在目标项目安装一次共享依赖：

```powershell
npm ci --prefix .agents/skills/app-skill-runtime
```

常用选项：`--dir ../my-app` 指定目标项目，`--dry-run` 预览，`--replace` 更新不同内容并备份旧目录到 `.agents/skills-backups/`。重复安装复用相同内容。显式提供 `--repo <owner/repo>` 或 `--ref <提交SHA>` 时改从 GitHub API 获取指定来源，私库 API 访问需通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供 Contents 只读权限。

**本地安装备选**：在技能仓库根目录执行：

```powershell
node packages/installer/install-project-skills.mjs ../my-app --stack flutter
```

## 开始第一个项目

在目标项目中打开能够读取项目技能的 AI 编程助手，使用统一入口，并说明产品目标与平台。例如：

```text
使用 $app-creator-workflow 开始一个 Flutter 习惯打卡应用。
目标平台是 Android 和 iOS，先实现习惯列表、每日打卡和历史记录。
先梳理需求和功能范围，再建立工程并验证核心流程。
白盒按需使用，功能明确后再进入正式视觉设计。
```

```text
使用 $app-creator-workflow 开始一个 Phaser 2D 游戏。
先实现大厅进入关卡、完成关卡、结算和返回大厅的完整流程。
先验证玩法与跨场景状态传递，再设计正式场景和资源。
```

初始化时会确认目标、平台、技术栈、核心功能和语言。 Flutter 可选择横屏、竖屏或双方向；游戏只选择横屏或竖屏之一。背景允许等比缩放覆盖视口，关键 UI 按安全区与实际宽高重排。界面语言默认建议简体中文 `zh-CN`，英语 `en`、日语 `ja`、俄语 `ru`、西班牙语 `es` 可选；以用户实际选择为准，已有明确选择时直接沿用。

也可以从已有项目中的具体任务开始：

```text
使用 $app-creator-workflow 修复当前项目的返回导航问题，保留未受影响的界面设计。
```

## 项目如何推进

项目整体按“需求与范围 → 全局基线 → 基础工程 → 场景、页面与显示层生产 → 全局集成验证 → 发布”推进，各可见对象使用统一的 V0–V5：

| 阶段 | 主要成果 |
| --- | --- |
| V0 范围 | 明确对象、状态、功能范围和依赖 |
| V1 功能实现与验证 | 验证实际功能；可直接实现、复用有效验证或按需制作白盒 |
| V2 正式视觉目标 | 设计并确认目标图与覆盖范围，完成适用的全局视觉方向选择 |
| V3 拆解与布局 | 分别确认带编号拆解图、布局图及适配关系 |
| V4 正式资源与导入 | 完成资源生产、实际文件、技术导入和资源级验证 |
| V5 正式组合与运行 | 接入实际宿主，验证交互、布局与状态，完成用户视觉验收 |

大场景可以使用多张设计稿描述不同视图、状态或区域，共享同一正式场景和资源。新项目先确定关键功能与结构，减少视觉目标随功能变化反复改版。

跨场景功能先验证跳转、参数、状态与返回等行为，再支持相关对象的视觉工作；不要求目的地先完成 V5。导航共享机制、常驻框架、主页内容和瞬态显示层按实际职责划分，最终在正式组合中重跑完整路径。详见[功能范围与跨对象依赖](skills/app-workflow-control/references/function-dependencies.md)。

后续增量可复用同项目、技术栈及对象中仍有效的视觉确认，仅重做受影响的部分。功能代码变化时按实际范围回归，未变化的共享来源继续复用；数组重排和安全的等价路径不会要求改写合同证据。详见[完整工作流](skills/app-creator-workflow/references/workflow.md)。

## 验证与验收

- 普通文案、注释或查询直接完成；局部模块修复可使用轻量流程，普通功能与跨模块任务按实际范围推进。
- 助手根据影响推荐 T0–T3 验证等级，并自动执行已授权的测试与检查，报告真实结果和未执行项。
- 截图默认由用户人工检查。Flutter 默认按可用性验收，仅明确选择 `exact` 时要求完整精确还原对照。
- 已知轻微偏差先记录并继续不受影响的工作，随后汇报；明确验收条件未满足时保留未通过或未决状态。
- 真机、付费、签名、上传和实际发布需要对应明确授权。发布准备与实际发布分别管理。
- 提交时仅选择当前运行、构建、验证和继续工作所需的记录；过时且无有效引用的中间产物不纳入提交。

[工作流控制器](skills/app-workflow-control/SKILL.md)负责状态、实施单元和证据关系。`plan`、`record` 帮助生成和关联记录；`status`、`check` 用于读取状态和检查材料。控制器不会代替助手执行项目制作、引擎运行或构建，技术检查通过也不代替用户视觉确认。

## 按任务使用专业能力

通常从 `$app-creator-workflow` 开始，也可直接指定已知能力：

| 任务 | 能力入口 |
| --- | --- |
| 需求、架构与工程基础 | `$app-product-planning`、`$app-architecture`、`$app-project-foundation` |
| 玩法、数值与音频 | `$app-gameplay-development`、`$app-game-balance`、`$app-audio` |
| 视觉目标、素材与布局 | `$app-asset-workflow`、`$app-ui-layout` |
| 可选代码草图 | `$app-ui-code-sketch` |
| 动画、角色绑定与 Spine | `$app-animation`、`$app-character-rigging`、`$app-spine-reskin` |
| 三维模型、贴图与资源管线 | `$app-3d-modeling`、`$app-3d-texturing`、`$app-3d-asset-pipeline` |
| 交互反馈 | `$app-feedback` |
| 广告与运行时插件 | `$app-ad-integration`、`$app-runtime-plugins` |
| 图片优化与项目清理 | `$app-image-optimization`、`$app-artifact-cleanup` |
| 质量审核与发布 | `$app-quality-review`、`$app-release` |

图片优化仅在用户明确请求时执行。其余能力按任务和所选技术栈的实际支持范围调用；助手通过各能力的原生适配读取对应规范，无需首次使用就读完全部手册。

## 仓库维护

以下命令在本技能仓库根目录执行：

```powershell
npm ci
npm test
npm run test:flutter-layout
```

发布轻量安装包前使用 `npm run build:npx` 和 `npm run pack:npx`；根包保持私有，用于完整源码维护。

进一步阅读：[公共专业约定](skills/app-creator-workflow/references/professional-conventions.md)、[完整工作流](skills/app-creator-workflow/references/workflow.md)。
