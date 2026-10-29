---
name: app-creator-workflow
description: 开发或迭代 Unity、Cocos Creator、Phaser、Three.js 游戏及 Flutter 应用时，统一编排需求、视觉、基础工程、场景或页面、验证与交付；按当前技术栈加载独立规范。
---

# 游戏与应用统一编排

以 [app-workflow-control](../app-workflow-control/SKILL.md) 为唯一状态、门禁、执行结果与证据权威。本技能负责编排，不创建第二套状态机。既有项目的局部任务从最早受影响点开始，不重走所有阶段。

## 进入任务

技术方案统一遵循[官方优先、社区其次、最后自研](references/professional-conventions.md#solution-selection)。在全局基线及后续功能增量的实施前完成适用性核实，将来源与取舍写入已有计划，并随实施交接和质量审查核对；不新增状态或审批步骤。

Unity、Cocos 新增显示内容时，读取[显示元素的编辑器还原](../app-domain-toolkit/references/editor-display-authoring.md)并同步更新正式可编辑源，普通增量任务同样适用。

五个技术栈新增显示元素时，均按[增量显示约束](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)补齐位置、真实父子关系、尺寸、层序及输入等约定，并更新受影响的工作流材料与验证；局部新增和动态生成同样适用。

1. 先读项目约束、已有控制记录、技术版本与已有进程；不得擅自创建分支或 worktree。发现可复用的引擎、浏览器或开发服务后复用，不能为了验证另启实例。若项目还有旧栈总控或编排技能，明确本次只使用公共总控，不运行两套状态机，也不静默把旧批准转换为新记录。
2. 按项目事实选择一个技术栈，并读取其能力与原生模式索引。按当前任务进入唯一公共能力，再通过 `native-adapters.json` 选择本栈模式；使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <能力名> [sourceSkill]` 读取对应原生章节、直接公共依赖与资源路径，多模式必须指定来源。索引摘要不能代替专业规范，未展开的脚本、模板和校验器仍按任务读取。用户指定优先；同时含多个栈时按模块拆工作项，明确边界与接口，不将多个栈塞进同一实施包。目标只是文案、注释或事实查询时不建立完整项目流程。
3. 明确目标、非目标、文件/对象所有权与可观察验收；先只读补事实。出现确实需要用户取舍的缺口时进入 [grilling](../grilling/SKILL.md)，继续不依赖该决定的工作，不能把正常实现变成逐步审批。
   新项目初始化时询问用户支持的界面语言：默认简体中文 `zh-CN`，英语 `en`、日语 `ja`、俄语 `ru`、西班牙语 `es` 可按需追加；给出默认选项并等待用户选择，已有明确语言决定时不重复询问。将确认的语言清单和默认显示语言写入项目配置并用于各栈实现、字体与验证；默认显示语言必须在清单内。语言选择未答复时继续不依赖该选择的工作，不能把预选项当作确认。既有项目沿用其已确认的语言范围，不因局部修复重问或擅自扩展。
4. 创建或读取 Work Item，按[统一流程](references/workflow.md)选择六阶段和 V0–V5，以可验证的功能切片驱动场景、页面和显示层分批推进；导航、主页及共享路由按[功能范围与跨对象依赖](../app-workflow-control/references/function-dependencies.md#导航框架与共享路由)划分，简单单对象任务不强制额外建项。V1 先验证相关功能，白盒按需选择，不等待正式视觉完成。单个本地工程修复可用 `init --mode light`，直接进入实施前复核，仍须 F0–F3 和真实单元证据；其他任务使用普通模式，纯文案/查询无需建立完整控制记录。用 `plan --spec` 从实际计划生成实施包及空证据清单，用 `record --report` 从真实执行报告关联结果；二者不执行命令、不自动通过门禁。按独立路径与对象所有权委派，单物理编辑器和共享配置保持单写者。
5. 涉及可见内容时，按[显示结构约定](../app-domain-toolkit/references/reference-domain-display-ownership.md#公共显示结构约定)及本栈规范，从 V0/V1 明确宿主、内容、常驻 UI 和瞬态层的显示职责，白盒可选。视觉任务在相关功能完成 V1 验证后加载 [app-asset-workflow](../app-asset-workflow/SKILL.md)，将视觉签名、三候选基线、真实素材、技术检查和人工验收接入工作项。游戏内容或场景超出单张设计稿的可读范围时，按[多张场景设计稿](../app-asset-workflow/references/multi-image-scene-design.md)规划、生成和交接。同项目、技术栈和对象已有完成的 V5 工作项时，按语义影响用 `reuse-visual` 继承未变化的基线及 V2/V3 确认；当前功能验证、V4 导入和 V5 运行/人工验收仍独立完成。技术通过不等于画面通过。
6. 实施后按[验证与交付](references/verification.md)先推荐 T0–T3 的理由、覆盖与命令，再自动执行；记录真实结果。失败优先 repair/revalidate，仅上游目标或范围真实失效才显式 return。

| 技术栈 | 独立规范 | 识别依据 |
| --- | --- | --- |
| Unity | `$app-stack-unity` | ProjectSettings/ProjectVersion.txt、Packages/manifest.json |
| Cocos Creator | `$app-stack-cocos` | Creator 工程与 assets/settings/profiles |
| Phaser | `$app-stack-phaser` | package.json 的 Phaser 依赖与实际版本 |
| Three.js | `$app-stack-threejs` | package.json 的 three 依赖及真实 3D 运行入口 |
| Flutter | `$app-stack-flutter` | pubspec.yaml、FVM 配置及 Flutter SDK 依赖 |

探测文件只是线索。`package.json`、`assets/` 等通用文件不能独立证明技术栈；读取依赖和项目设置，仍无法判定时只问技术选择，不替用户重建项目。

Cocos、Phaser、Three.js 的编排任务按需要读取以下公共资料，同时保留当前技术栈原生补充：

- 启动验证服务前读取[服务查重与复用](../app-domain-toolkit/references/reference-orchestration-local-service-validation.md)；用户明确要求工作区隔离时读取[隔离规则](../app-domain-toolkit/references/reference-orchestration-worktree-integration.md)。
- 实施与交接时按任务选择[专业编排与交付](../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md)、[游戏实施](../app-domain-toolkit/references/reference-orchestration-game-implementation.md)、[模块拆分](../app-domain-toolkit/references/reference-orchestration-module-decomposition.md)和[依赖能力检查](../app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md)。
- Cocos、Phaser 任务需要归档交付文件时，读取[交付文件保留与引用](../app-domain-toolkit/references/reference-orchestration-delivery-artifacts.md)。
- 需要专业复核时读取[视觉质量](../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md)、[复核分工](../app-domain-toolkit/references/reference-orchestration-review-funnel.md)或[游戏生产里程碑](../app-domain-toolkit/references/reference-orchestration-quality-gates.md)。

任务明确包含 Git 提交时，所有技术栈先按[工作流记录与提交范围](references/workflow.md#工作流记录与提交范围)选择必要文件；Cocos、Phaser、Three.js 再读取[最小提交规则](../app-domain-toolkit/references/git-minimal-submission.md)并结合本栈补充，Unity、Flutter 使用所选技术栈的 Git 规范。Git 提交或合并须有用户明确要求；任务范围内无副作用的本地集成可按已有授权执行。

## 交接与状态

V1 采用白盒、临时资源或白模时，读取[可辨识的功能原型](references/readable-functional-prototype.md)，让对象、任务、可操作状态和反馈可理解；复用实际机制，以已有功能验证记录承载结果。白盒仍可选，不提前进行正式美术验收。

实施包、单元结果和证据格式以控制器的 schemas/templates 为准，不手写另一套近似字段。角色职责与交接见[协作边界](references/handoffs.md)；涉及策划、业务/玩法、动态反馈、音频、数值或动画时读取[领域生产交接](references/domain-production.md)。公共流程只规定“必须证明什么”；如何读取引擎对象、布局、输入、资源、构建及性能由各技术技能规定。

控制器的 `status/check` 只读；`run` 只推进安全控制状态，不能代替实际开发、测试或批准。用户消息是决定来源，本地 JSON 只是记录，不是身份验证或新增执行授权。发布阶段允许完成本地准备，真机、签名、上传、外部写入、付费、破坏性操作与发布须有对应明确授权。

发布工作项默认 `releaseIntent=prepare`，准备材料和必需验证完成后可正常关闭。只有实际执行发布时选择 `init --release-intent publish`；其 F4、精确批准和真实发布结果必须齐备，准备完成不能标成已上线。

无明确请求不自动提交、推送、安装全局技能或修改源技能仓库。交付必须分别说明实现完成、工程验证、视觉待验收与外部操作状态。

<!-- capability-route:start -->
## 技术栈原生能力路由

当前公共流程继续由本技能负责。需要处理目标栈专有的资源结构或实现步骤时，先确认项目的 `app-stack-*`，再读取同目录 [native-adapters.json](native-adapters.json)。manifest列出当前栈时，按 `when` 选择 `mode`，使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <当前能力名> [sourceSkill]` 读取对应章节、直接公共依赖及按需资源路径；多模式必须指定 `sourceSkill`，维护本仓库时将 `.agents/skills/` 换为 `skills/`。
manifest未列当前栈时，继续使用该栈的 `app-stack-*` 规范/索引和适用公共流程，不视为能力缺失；只有已声明且选中的专项文件缺失才报告阻断。不得改读其他栈适配或虚构原生API。公共工作流仅在 manifest 的适用栈包含当前栈时读取。
<!-- capability-route:end -->
