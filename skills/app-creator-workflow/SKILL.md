---
name: app-creator-workflow
description: 开发或迭代 Unity、Cocos Creator、Phaser、Three.js 游戏及 Flutter 应用时，统一编排需求、视觉、基础工程、场景或页面、验证与交付；按当前技术栈加载独立规范。
---

# 游戏与应用统一编排

以 [app-workflow-control](../app-workflow-control/SKILL.md) 为唯一状态、门禁、执行结果与证据权威。本技能负责编排，不创建第二套状态机。既有项目的局部任务从最早受影响点开始，不重走所有阶段。

## 进入任务

1. 先读项目约束、已有控制记录、技术版本与已有进程；不得擅自创建分支或 worktree。发现可复用的引擎、浏览器或开发服务后复用，不能为了验证另启实例。若项目还有旧栈总控或编排技能，明确本次只使用公共总控，不运行两套状态机，也不静默把旧批准转换为新记录。
2. 按项目事实选择一个技术栈，并读取其能力与原生模式索引。按当前任务进入唯一公共能力，再通过 `native-adapters.json` 选择本栈模式；使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <能力名> [sourceSkill]` 读取对应原生章节、直接公共依赖与资源路径，多模式必须指定来源。索引摘要不能代替专业规范，未展开的脚本、模板和校验器仍按任务读取。用户指定优先；同时含多个栈时按模块拆工作项，明确边界与接口，不将多个栈塞进同一实施包。目标只是文案、注释或事实查询时不建立完整项目流程。
3. 明确目标、非目标、文件/对象所有权与可观察验收；先只读补事实。出现确实需要用户取舍的缺口时进入 [grilling](../grilling/SKILL.md)，继续不依赖该决定的工作，不能把正常实现变成逐步审批。
4. 创建或读取 Work Item，按[统一流程](references/workflow.md)选择六阶段和 V0–V4。单个本地工程修复可用 `init --mode light`，直接进入实施前复核，仍须 F0–F3 和真实单元证据；其他任务使用普通模式，纯文案/查询无需建立完整控制记录。用 `plan --spec` 从实际计划生成实施包及空证据清单，用 `record --report` 从真实执行报告关联结果；二者不执行命令、不自动通过门禁。按独立路径与对象所有权委派，单物理编辑器和共享配置保持单写者。
5. 视觉任务加载 [app-asset-workflow](../app-asset-workflow/SKILL.md)，将视觉签名、三候选基线、真实素材、技术检查和人工验收接入同一工作项。同项目、技术栈和对象已有完成的 V4 工作项时，按语义影响用 `reuse-visual` 继承未变化的基线及 V1/V2 确认；当前 V3 导入和 V4 运行/人工验收仍独立完成。技术通过不等于画面通过。
6. 实施后按[验证与交付](references/verification.md)先推荐 T0–T3 的理由、覆盖与命令，再自动执行；记录真实结果。失败优先 repair/revalidate，仅上游目标或范围真实失效才显式 return。

| 技术栈 | 独立规范 | 识别依据 |
| --- | --- | --- |
| Unity | `$app-stack-unity` | ProjectSettings/ProjectVersion.txt、Packages/manifest.json |
| Cocos Creator | `$app-stack-cocos` | Creator 工程与 assets/settings/profiles |
| Phaser | `$app-stack-phaser` | package.json 的 Phaser 依赖与实际版本 |
| Three.js | `$app-stack-threejs` | package.json 的 three 依赖及真实 3D 运行入口 |
| Flutter | `$app-stack-flutter` | pubspec.yaml、FVM 配置及 Flutter SDK 依赖 |

探测文件只是线索。`package.json`、`assets/` 等通用文件不能独立证明技术栈；读取依赖和项目设置，仍无法判定时只问技术选择，不替用户重建项目。

## 交接与状态

实施包、单元结果和证据格式以控制器的 schemas/templates 为准，不手写另一套近似字段。角色职责与交接见[协作边界](references/handoffs.md)；涉及策划、业务/玩法、动态反馈、音频、数值或动画时读取[领域生产交接](references/domain-production.md)。公共流程只规定“必须证明什么”；如何读取引擎对象、布局、输入、资源、构建及性能由各技术技能规定。

控制器的 `status/check` 只读；`run` 只推进安全控制状态，不能代替实际开发、测试或批准。用户消息是决定来源，本地 JSON 只是记录，不是身份验证或新增执行授权。发布阶段允许完成本地准备，真机、签名、上传、外部写入、付费、破坏性操作与发布须有对应明确授权。

发布工作项默认 `releaseIntent=prepare`，准备材料和必需验证完成后可正常关闭。只有实际执行发布时选择 `init --release-intent publish`；其 F4、精确批准和真实发布结果必须齐备，准备完成不能标成已上线。

无明确请求不自动提交、推送、安装全局技能或修改源技能仓库。交付必须分别说明实现完成、工程验证、视觉待验收与外部操作状态。

<!-- capability-route:start -->
## 技术栈原生能力路由

当前公共流程继续由本技能负责。需要处理目标栈专有的资源结构或实现步骤时，先确认项目的 `app-stack-*`，再读取同目录 [native-adapters.json](native-adapters.json)。manifest列出当前栈时，按 `when` 选择 `mode`，使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <当前能力名> [sourceSkill]` 读取对应章节、直接公共依赖及按需资源路径；多模式必须指定 `sourceSkill`，维护本仓库时将 `.agents/skills/` 换为 `skills/`。
manifest未列当前栈时，继续使用该栈的 `app-stack-*` 规范/索引和适用公共流程，不视为能力缺失；只有已声明且选中的专项文件缺失才报告阻断。不得改读其他栈适配或虚构原生API。公共工作流仅在 manifest 的适用栈包含当前栈时读取。
<!-- capability-route:end -->
