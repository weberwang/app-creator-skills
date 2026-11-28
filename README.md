# 游戏与应用技能工作流

为 AI 编程助手提供从立项、产品定义、架构和功能实现到模块集成与整体验收的七阶段工作流。支持 Unity、Cocos Creator、Phaser、Three.js、Roblox、Flutter、Expo、ESP32 设备 GUI 和 Node.js，可按项目技术栈安装到 `.agents/skills/`。

你可以用自然语言描述想做的游戏、应用或服务器，由统一入口组织产品、架构、玩法、视觉、资源和测试。可见对象共用 V1–V5，各技术栈沿用自身工程规则。Node.js 无界面服务器使用非视觉模块和集成流程。

## 能做什么

- **启动项目**：梳理目标、平台、核心流程、语言和验收范围，建立工程与任务计划。
- **探索游戏方案**：复杂游戏先形成[关卡结构草案与空间规则](skills/app-domain-toolkit/references/game-design-exploration.md)，持续推敲路线、空间节奏与玩家视角；概念图按需，本批方案审查后交人工修改或确认。
- **先明确模块方案**：按用户行为确定本轮功能、交互状态、进度和验收。所有 3D 世界场景在 V1 搭建或复用有效白模，按风险选择运行验证；2D 与界面使用平面布局、正式工程和功能用例。
- **制作视觉与资源**：空间确认后确定正式方向，3D 按[模型与材质交接](skills/app-domain-toolkit/references/game-design-exploration.md#production-handoff)组织制作。低风险批次正常导入，高风险批次先验证首件或复用有效证据，再扩展依赖批次。2D／UI 保留适用图片和布局流程。
- **按需处理音频**：非游戏客户端按[App 音频工作流](skills/app-domain-toolkit/references/app-audio.md)区分提示、播放、录音／语音和平台通知，无需求则跳过；游戏按[音效生产流程](skills/app-audio/references/sfx-production.md)设计与制作适用素材。分别记录文件技术、实际运行与用户听感，不默认增加声音或后台能力。
- **组织跨场景功能**：明确导航框架、主页、共享路由和弹窗的职责，复用共享实现并验证实际组合。
- **持续交付**：支持局部修复、功能增量、质量审核、项目整理和发布准备，保留继续工作所需的有效记录。
- **接入渠道**：按已选目标执行 [CrazyGames、微信／抖音小游戏、TapTap 及移动商店接入](skills/app-release/references/channel-platform-integration.md)，区分平台 SDK、原生构建、合规资料与实际上线；TapTap 的[运行时能力与语言代码复用](skills/app-release/references/taptap-runtime-integration.md)覆盖 Unity C#、三引擎 Tap 小游戏 TypeScript 和 Node.js 协议，按[材料与政策](skills/app-release/references/taptap-materials-policy.md)核查前置；[官方 CLI](skills/app-release/references/channel-platforms/taptap.md)管理资料、包体、审核、测试及运营。
- **选择 SDK**：所有渠道先[列必接项、集中多选并等待确认](skills/app-release/references/channel-sdk-selection.md)，再按引擎／语言统一复用代码接入；已有明确选择直接沿用，广告聚合互斥、必要依赖与材料一并说明，未确认不默认安装或接线。

这是技能、工具和工作流集合。引擎、SDK、素材工具及实际运行环境按所选技术栈另行准备；安装技能后，再由助手检查当前任务所需的环境。

## 选择技术栈

| 技术栈 | 适用项目 | 规范入口 |
| --- | --- | --- |
| Unity | 2D、3D 游戏与交互项目 | [app-stack-unity](skills/app-stack-unity/SKILL.md) |
| Cocos Creator | 基于 Creator 的游戏项目 | [app-stack-cocos](skills/app-stack-cocos/SKILL.md) |
| Phaser | Web 2D 游戏 | [app-stack-phaser](skills/app-stack-phaser/SKILL.md) |
| Three.js | Web 3D 场景与游戏 | [app-stack-threejs](skills/app-stack-threejs/SKILL.md) |
| Roblox | Roblox Studio 游戏体验与 Place 内容 | [app-stack-roblox](skills/app-stack-roblox/SKILL.md) |
| Flutter | 跨平台应用 | [app-stack-flutter](skills/app-stack-flutter/SKILL.md) |
| Expo | 基于 React Native 的 Android、iOS 应用；Web 按需启用 | [app-stack-expo](skills/app-stack-expo/SKILL.md) |
| ESP32 | ESP32 自带屏幕的嵌入式 GUI 固件 | [app-stack-esp32](skills/app-stack-esp32/SKILL.md) |
| Node.js | API 服务器、后台任务与消息消费者 | [app-stack-nodejs](skills/app-stack-nodejs/SKILL.md) |

按实际项目选择一个或多个栈。专业能力的适用范围以对应入口及原生规范为准。

## 安装到项目

需要 **Node.js >= 22.20** 和 **Git**。推荐在目标项目根目录直接通过 npx 从 GitHub 安装，无需等待 npm 包发布或手动克隆仓库：

```powershell
# 交互选择技术栈
npx github:weberwang/app-creator-skills

# 或直接指定技术栈
npx github:weberwang/app-creator-skills flutter
npx github:weberwang/app-creator-skills expo
npx github:weberwang/app-creator-skills roblox
npx github:weberwang/app-creator-skills esp32
npx github:weberwang/app-creator-skills nodejs
npx github:weberwang/app-creator-skills unity,cocos
```

安装到当前项目的 `.agents/skills/`，仅写入所选栈与公共依赖。只有显式选择 `all` 才安装全部九栈；非交互环境须指定技术栈。

私有 GitHub 仓库需要先配置 Git 的访问凭证。npx 会取得仓库包及其 Node 依赖，再从包内技能安装，不再通过 GitHub API 重复下载。需要固定版本时使用 `npx 'github:weberwang/app-creator-skills#提交SHA' flutter`，安装内容与该提交一致。npm 包发布后也可使用 `npx app-creator-skills flutter`。

需要运行专业 Node 工具时，在目标项目安装一次共享依赖：

```powershell
npm ci --prefix .agents/skills/app-skill-runtime
```

常用选项：`--dir ../my-app` 指定目标项目，`--dry-run` 预览。远程及 npx 安装默认覆盖所选安装目录中的不同内容，无需 `--replace`，成功后不保留旧目录备份；相同内容跳过，无关技能不受影响。安装中途失败时恢复旧目录。显式提供 `--repo <owner/repo>` 或 `--ref <提交SHA>` 时改从 GitHub API 获取指定来源，私库 API 访问需通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供 Contents 只读权限。

**本地安装备选**：在技能仓库根目录执行：

```powershell
node packages/installer/install-project-skills.mjs ../my-app --stack flutter
```

本地安装遇到不同内容时使用 `--replace` 更新，并保留旧目录到 `.agents/skills-backups/`。

`.agents/` 是项目根的本地工具目录，不纳入 Git、业务变更快照或发布包。安装器会幂等合并根 `.gitignore` 的 `/.agents/`，dry-run 不写文件；已跟踪的旧文件需在明确要求下仅移出 Git 索引并保留本地，安装器不自动修改索引。技能仍可从原位置读取和运行，业务记录保存在 `.workflow-control/` 等正式目录，不能放进 `.agents/` 隐藏；本仓库维护的 `skills/` 源码仍正常跟踪。

## 开始第一个项目

在目标项目中打开能够读取项目技能的 AI 编程助手，使用统一入口，并说明产品目标与平台。例如：

```text
使用 $app-creator-workflow 开始一个 Flutter 习惯打卡应用。
目标平台是 Android 和 iOS，先实现习惯列表、每日打卡和历史记录。
先梳理需求和功能范围，再建立工程并验证核心流程。
2D 游戏使用平面布局和正式工程验证，功能明确后再进入正式视觉设计。
```

```text
使用 $app-creator-workflow 开始一个 Phaser 2D 游戏。
先实现大厅进入关卡、完成关卡、结算和返回大厅的完整流程。
先验证玩法与跨场景状态传递，再设计正式场景和资源。
```

```text
使用 $app-creator-workflow 开始一个 ESP32 自带屏幕的 GUI 项目。
先确认芯片、开发板、屏幕、输入方式和资源预算，评估 ESP-IDF + LVGL。
先验证功能、导航和状态，再推进正式界面与字库、图片导入。
先完成本地构建与可用的主机验证；真机运行和烧录另行授权。
```

```text
使用 $app-creator-workflow 开始一个 Node.js 订单 API 服务器。
先明确接口、业务模块、权限、数据一致性和部署约束，再选择框架与数据库。
先完成隔离测试与模块集成；不创建页面、设计稿或视觉验收。
真实数据库迁移和生产部署另行授权。
```

初始化时会确认目标、平台、技术栈和核心功能。含客户端界面的项目再确认语言、屏幕与输入。Flutter、Expo 可选择横屏、竖屏或双方向；Unity、Cocos、Phaser、Three.js 游戏只选择横屏或竖屏之一，Roblox 按平台与项目实际支持的设备和方向处理。ESP32 按实际屏幕分辨率、旋转、保留区域与输入硬件设计，不套用游戏画布或手机安全区。背景允许等比缩放覆盖视口，关键 UI 按适用安全区与实际宽高重排。界面语言默认建议简体中文 `zh-CN`，英语 `en`、日语 `ja`、俄语 `ru`、西班牙语 `es` 可选；以用户实际选择为准，已有明确选择时直接沿用。Node.js 服务器不询问界面方向或强制创建语言清单，按实际 API 合同处理本地化需求。

Roblox 项目由 Studio 内置 MCP 执行场景、脚本及试玩操作。通过 [Roblox Studio 官方接入说明](https://create.roblox.com/docs/studio/mcp)连接后，按实际 Studio 版本探测工具；工作流不会因为安装技能而自动安装、启动或配置 Studio。未连接时仍可分析需求、准备方案和编写代码，但 Studio 运行、Place 保存回读及画面体验应标记未验证。

也可以从已有项目中的具体任务开始：

```text
使用 $app-creator-workflow 修复当前项目的返回导航问题，保留未受影响的界面设计。
```

## 项目如何推进

从零游戏按“玩法与题材立项 → 产品定义 → 制作技术方案 → 基础工程与架构实现 → 模块实现与体验整合 → 跨模块集成 → 模块集成与整体验收”推进。已确认的产品需求与本批范围决定交付，用户规划多个版本时再关联实际版本。发布按单独明确委托办理。详见[七阶段](skills/app-creator-workflow/references/workflow.md#七阶段)。

从零游戏在第 2 阶段用最小可玩原型完成[核心循环验证](skills/app-creator-workflow/references/workflow.md#optional-core-gameplay-check)，由人工确认实际原型与循环范围。第 3 阶段采用所选技术栈的[固定架构模板](skills/app-creator-workflow/references/game-architecture.md)，第 4 阶段落地并核对结构与接口；编译和打包由后续需要构建产物的工作项安排。

Node.js 服务器沿用公共控制器与质量门，通过 MODULE 实现业务、INTEGRATION 验证当前模块组合。架构覆盖传输、业务、数据访问、外部适配与装配。详见 [Node.js 架构](skills/app-stack-nodejs/references/architecture.md)。

| 阶段 | 主要成果 |
| --- | --- |
| V1 确认模块方案 | 明确本轮范围、业务规则、流程、交互状态和进度、依赖及验收条件 |
| V2 制作并确认模块稿 | 沿用第 4 阶段全局视觉方向，展示 V1 确认的当前模块全部适用要素、状态、步骤、转换和进度，供 V3 拆解交接 |
| V3 拆解与布局 | 拆解 V2 确认的同一稿件。3D 交接模型与材质接口，图片／UI 保留适用拆解与布局确认，Figma 提取原生结构 |
| V4 实施准备 | 准备资源、共享组件、接口和测试数据，按风险开展首件或技术验证 |
| V5 完整实现与验收 | 接入实际宿主，完成本轮全部功能及体验整合，验证状态、进度、正常与异常路径并完成人工视觉验收 |

大场景按需要用静态布局、3D 白模视角或设计图描述不同区域与状态，共享同一正式场景和资源。新项目先确定关键功能与结构，减少正式生产随空间变化反复返工。

初期广告按已规划点位调用统一接口并返回模拟成功；规划了真实广告的后续版本，再按目标平台接入 SDK。V3 完成模型或界面交接后，3D 世界按[风险决定 V4 首件验证](skills/app-workflow-control/references/world3d-scenes.md#model-sample-reuse)，其他路线按[代表性接入验证](skills/app-asset-workflow/SKILL.md#代表性接入与分批协作)选择适用工作。V5 完成模块组合、回归和用户人工视觉验收。

大场景、长游戏流程和复杂 App 流程按[多状态与多步骤的分批生产](skills/app-domain-toolkit/references/incremental-production.md)明确整体骨架、关键状态与依赖，再按连续可玩／可操作路径分批实施；同一正式场景／页面可持续增量生产，每批核对受影响的邻区／页面连接与已有内容组合。游戏按风险复用后期状态复现、运行断言及持续运行检查，并在既有试玩中跟进跨批节奏和重复负担。本批完成仅代表该批范围，整体交付还须核对必要路径和当前正式组合。

3D 世界沿[同一条可玩路径](skills/app-domain-toolkit/references/incremental-production.md#world-3d-playable-path)交接白模、资源首件和正式组合，按风险验证并分批复查受影响的邻区连接。

V2 的图片目标覆盖本轮所有二维元素及适用必要状态，一张无法清楚容纳时拆分多张并沿用共享来源。3D 空间通过白模、空间规格及相机路径表达，按需提供机位预览；V3 按已确认空间拆分模型，随后选择本地复用、生成 API 或 Blender。详见[3D 设计与模型交接](skills/app-workflow-control/references/world3d-scenes.md#world-camera-designs)。

跨设计稿出现的相同元素按[共享设计来源](skills/app-asset-workflow/references/asset-provenance.md#shared-design-elements)沿用同一有效设计与固定空间关系，视角及已定义状态可以变化；改版时核对受影响稿件、资源和消费者，复用现有确认与回归，不逐稿重新设计或增加逐元素审批。

App 多页面在第 4 阶段以代表页建立并冻结共同视觉基线。实际模块在 V2 制作覆盖本轮全部适用状态和进度的设计稿，后续沿同一确认版本推进。详见[多页面推进顺序](skills/app-domain-toolkit/references/incremental-production.md#多页面推进顺序)。

跨场景功能先验证跳转、参数、状态与返回等行为，再支持相关对象的视觉工作；不要求目的地先完成 V5。导航共享机制、常驻框架、主页内容和瞬态显示层按实际职责划分，最终在正式组合中重跑完整路径。详见[功能范围与跨对象依赖](skills/app-workflow-control/references/function-dependencies.md)。

后续增量可复用同项目、技术栈及对象中仍有效的视觉确认，仅重做受影响的部分。功能代码变化时按实际范围回归，未变化的共享来源继续复用；数组重排和安全的等价路径不会要求改写合同证据。详见[完整工作流](skills/app-creator-workflow/references/workflow.md)。

每轮先判断行为、依赖与消费者影响，沉淀必要的关键行为和缺陷回归测试，并只做保障本次交付所需的局部重构。收尾更新受影响的当前启动／构建／测试说明、架构边界及剩余问题，历史冻结证据保持不变，使下一轮不依赖原会话即可接手；规则见[持续迭代与可接手收尾](skills/app-creator-workflow/references/workflow.md#持续迭代与可接手收尾)。小任务不新增报告、账本或审批。

## 验证与验收

Unity 运行时文本及国际化默认使用 [UniText](skills/unity-development-workflow/references/text-and-localization.md)。具体实施前核查插件安装、依赖、编译与实际绑定能力；安装不正确时由用户选择修复或回退 TMP。翻译统一读取[固定 JSON 模板](skills/unity-development-workflow/assets/localization-catalog-template.json)，所有面向用户的文案消费者只绑定文案键和参数，禁止按语言条件内联翻译；TMP 回退沿用同一配置源。

- 普通文案、注释或查询直接完成；局部模块修复可使用轻量流程，普通功能与跨模块任务按实际范围推进。
- 助手根据影响推荐 T0–T3 验证等级，并自动执行已授权的测试与检查，报告真实结果和未执行项。
- 截图默认由用户人工检查。Flutter 默认按可用性验收，仅明确选择 `exact` 时要求完整精确还原对照。
- 已知轻微偏差先记录并继续不受影响的工作，随后汇报；明确验收条件未满足时保留未通过或未决状态。
- 真机、付费、签名、上传和实际发布需要对应明确授权。发布准备与实际发布分别管理。
- Expo 区分 Expo Go 预览、development build、release 构建和 Web；原生 SDK 与启动屏按实际构建验证，云构建、云模拟器、OTA、上传和发布另按具体授权执行。CNG 与直接维护原生工程分别确定正式源，不能统一清理 `android/ios`。
- ESP32 区分逻辑测试、固件构建、主机 GUI 模拟和实际设备运行；主机通过不代表屏幕、触控或硬件性能通过，烧录、擦除和 OTA 需对应明确授权。
- Node.js 区分静态检查、业务/接口测试、隔离数据集成与真实依赖联调；不以 mock 通过宣称真实系统已联调，不自动执行真实数据库迁移、外部写入或部署。
- 提交时仅选择当前运行、构建、验证和继续工作所需的记录；过时且无有效引用的中间产物不纳入提交。

[工作流控制器](skills/app-workflow-control/SKILL.md)负责状态、实施单元和证据关系。`plan`、`record` 帮助生成和关联记录；`status`、`check` 用于读取状态和检查材料。控制器不会代替助手执行项目制作、引擎运行或构建，技术检查通过也不代替用户视觉确认。

游戏和非游戏 App 共用[系统与模块防遗漏机制](skills/app-creator-workflow/references/system-module-coverage.md)：需求／全局基线先识别必要能力，实施前通过必填 `systemCoverage` 关联需求、设计、模块、任务与验收命令。共同领域及游戏／App 专项逐项说明适用性，后置或未决前置不能支持本批实施；来源摘要和映射进入执行快照，记录与完成时继续复验。机器检查已声明关系，原始需求完整性与设计质量仍须实际审查。

## 按任务使用专业能力

通常从 `$app-creator-workflow` 开始，也可直接指定已知能力：

| 任务 | 能力入口 |
| --- | --- |
| 需求、架构与工程基础 | `$app-product-planning`、`$app-architecture`、`$app-project-foundation` |
| 玩法与数值 | `$app-gameplay-development`、`$app-game-balance` |
| 音频（按需） | 游戏专项使用 `$app-audio`；非游戏客户端读取[App 音频工作流](skills/app-domain-toolkit/references/app-audio.md)，按当前栈实际能力实施 |
| 视觉目标、素材与布局 | `$app-asset-workflow`、`$app-ui-layout` |
| 可选代码草图 | `$app-ui-code-sketch` |
| 动画、角色绑定与 Spine | `$app-animation`、`$app-character-rigging`、`$app-spine-reskin` |
| 三维模型、贴图与资源管线 | `$app-3d-modeling`、`$app-3d-texturing`、`$app-3d-asset-pipeline` |
| 交互反馈 | `$app-feedback` |
| 广告与运行时插件 | `$app-ad-integration`、`$app-runtime-plugins` |
| 图片优化与项目清理 | `$app-image-optimization`、`$app-artifact-cleanup` |
| 质量审核与发布 | `$app-quality-review`、`$app-release` |

图片优化仅在用户明确请求时执行。其余能力按任务和所选技术栈调用。原生模式读取器默认展开当前模式、直接引用的章节及清单要求的必读资料；其他公共参考可用 `--reference '<路径[#章节]>'` 按需读取。

## 仓库维护

以下命令在本技能仓库根目录执行：

```powershell
npm ci
npm test
npm run test:flutter-layout
```

维护技术栈或任务路由时，参照[工作流路由评估](tests/task-routing-evals.md)复验安装后的引用与代理选择。

Windows 并发测试若出现 `Unable to deserialize cloned data due to invalid or unsupported version`，保留失败日志并核对实际 `process.execPath` 与版本；本机曾在 Node 24.14.1 遇到该问题，上游有[相同报告](https://github.com/nodejs/node/issues/64061)及[修复追踪](https://github.com/nodejs/node/issues/65934)。可用已带修复的 Node 补丁版本重新执行原测试命令与并发数，本次使用已有 Node 24.22.1；父进程和子进程须使用同一版本，`npm.cmd` 可能选择自身目录旁的旧 Node。使用所选 Node 的绝对路径运行实际 `npm-cli.js` 并在本次进程 PATH 前置其目录即可，不要求改系统配置；独立文件复验不能代替完整测试，不删测、吞错或自动重试到通过。

发布轻量安装包前使用 `npm run build:npx` 和 `npm run pack:npx`；根包保持私有，用于完整源码维护。

进一步阅读：[公共专业约定](skills/app-creator-workflow/references/professional-conventions.md)、[完整工作流](skills/app-creator-workflow/references/workflow.md)。
