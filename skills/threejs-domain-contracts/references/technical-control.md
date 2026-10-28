> 迁移说明：公共 WorkItem、执行包、阶段状态与总控命令已合并到 `$app-workflow-control`；下文完整保留旧版领域合同和工具文档。旧全局 CLI/状态实现不再安装，命令请使用 `.agents/skills/app-workflow-control/scripts/workflow-control.mjs`。

> 领域合同边界：下文旧 Work Item、schema、CLI 和状态约定只解释原技术栈输入。新任务状态、执行包和 Evidence 使用公共控制面及[threejs领域校验接线](../../app-stack-threejs/references/domain-validation.md)；领域上下文继续独立校验，不作为新 Work Item 的旧版兼容解析或第二状态机。


# 本栈技术控制补充
三维世界使用独立的嵌套 `responsiveContract.renderSpace=world-3d`，按[世界视口 Schema](./world-viewport-contract.schema.json)和[范例](./world-viewport-example.json)起草。V4 运行证据核对相机投影、NDC 输入、渲染预算与场景归属；二维固定设计合同仅用于 HUD。机器合同不能替代人工视觉或实际设备验收，摘要不参与验收。

公共工作流和控制器以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为准；本参考只保留本栈技术补充。

## 最短主闭环

弹窗与宿主的工作项边界见[场景与显示层职责](../../app-domain-toolkit/references/reference-domain-display-ownership.md)。



## 阶段收尾与 Git 提交

- 生成、送审、归档与收尾按[产物目录与归档规范](../../threejs-game-architecture/references/artifact-storage.md)分开临时文件、已确认非运行成果、生产源文件、正式游戏资源与工作流记录。控制工件沿用工具实际路径；送审和有效证据不得只留在可清理的 `output/`，已绑定文件不因归档搬迁或覆盖，目录名称不能代替确认事实。
- 阶段验收后需要清理本任务临时文件时，使用 [`threejs-game-artifact-cleanup`](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-artifact-cleanup) 核对引用与再生成条件后执行；用户要求历史记录或中间产物清理时也路由到该 Skill。保留有效证据和审计链，不因记录失效、任务终态或 Git 忽略自动删除；清理范围与风险按公共控制协议处理。
- 任务开始时记录已有工作区和暂存区改动；收尾按[最小提交集](../../threejs-game-architecture/references/artifact-storage.md#最小提交集)核对运行/构建/必要测试文件及当前工作项仍需读取的规格、记录和间接依赖，只暂存本次任务在该集合内的实际差异。归档文件、历史 JSON、文本报告或已确认成果不因属于本任务就全部提交。禁止无差别 `git add .`、`git add -A` 或 `git add -f`；同一文件混有他人改动时按块隔离，无法可靠分离则保留现场并报告阻塞，不夹带已有暂存内容。
- 提交前按[产物 Git 规则](../../threejs-game-architecture/references/artifact-storage.md#git-与保留)维护 `.gitignore`：非运行文档、源素材、证据和控制记录默认忽略，在末尾逐文件精确放行当前必要规格、Work Item、实施包、有效确认/审批、执行状态和仍被读取的 Result/证据记录。静态忽略规则不能解析引用，执行代理随计划变化复核文件和目录扫描依赖；不放行整目录、全部 JSON 或全部文本报告。提交本次必要 `.gitignore` 修改，检查正式运行文件未被误忽略；当前必需的媒体、审阅 HTML、源输入和验证附件也须逐文件纳入，未引用历史和重复报告可保留本地；不因忽略而删除文件或跳过真实文件验收。

## 不可绕过约束

- 美术方向和质量遵循[游戏美术体验与质量契约](../../threejs-game-asset-integration/references/art-quality-contract.md)。全局选图的结构化 brief 与逐候选人工质量结果必须通过真实文件门，所选候选任一失败或未验证均不能冻结；机器出口只核对事实，不替代观看舒适、主题与完成度的人工结果，未明确授权时代理不自动分析截图或视频画面。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-review.md#不可绕过约束)。

## 图片任务交付

效果图生成与界面实现共用[游戏内文案](../../threejs-game-ui-layout/references/game-copy.md)规则：内部策划说明与玩家可见表达分开，生成提示词明确可见文字范围，正式界面绑定同一表达与动态数据。全局候选、场景主图、弹窗及无效果图路径均适用；复用现有生成记录、领域文档与人工验收，不新增审批门，也不把机器检查视为文案显示通过。

视觉任务遵循[图片优先的确认方式](./simplified-workflow.md#图片优先的确认方式)：代理内部维护分析、技术记录与提示词，直接交付真实图片或预览供人工确认，不设常规文字提案、拆解记录或布局决策的制作前确认门。帧动画例外：按[动画设计理念说明](../resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)先说明目标感受、动作依据及节奏取舍，取得当前动作方案的明确确认后才制作真实素材。已确认目标范围内的返修直接给前后对照；有决定性需求歧义才暂停受影响部分。实际拆解、布局、资源、父帧与视频确认及操作授权沿用原门，不能以内部记录替代真实候选。
