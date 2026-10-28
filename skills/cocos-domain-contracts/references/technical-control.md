> 迁移说明：公共 WorkItem、执行包、阶段状态与总控命令已合并到 `$app-workflow-control`；下文完整保留旧版领域合同和工具文档。旧全局 CLI/状态实现不再安装，命令请使用 `.agents/skills/app-workflow-control/scripts/workflow-control.mjs`。

> 领域合同边界：下文旧 Work Item、schema、CLI 和状态约定只解释原技术栈输入。新任务状态、执行包和 Evidence 使用公共控制面及[cocos领域校验接线](../../app-stack-cocos/references/domain-validation.md)；领域上下文继续独立校验，不作为新 Work Item 的旧版兼容解析或第二状态机。


# 本栈技术控制补充
公共工作流和控制器以[当前公共控制协议](../../app-creator-workflow/references/professional-execution.md)为准；本参考只保留本栈技术补充。

Creator 编辑器、AssetDB、Scene/Node/Component、Prefab、构建和预览操作统一遵循[Creator MCP 协议](./cocos-mcp-protocol.md)，按当次 `tools/list` 的 schema 调用；不手写 `.scene`、`.prefab` 或 `.meta` 绑定。当前 MCP 对构建/预览的能力边界与真实证据要求以该协议为准。

## 最短主闭环

弹窗与宿主的工作项边界见[场景与显示层职责](../../app-domain-toolkit/references/reference-domain-display-ownership.md)。



## 阶段收尾与 Git 提交

- 阶段验收后需要清理本任务临时文件时，使用 [`cocos-game-artifact-cleanup`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-artifact-cleanup) 核对引用与再生成条件后执行；用户要求历史记录或中间产物清理时也路由到该 Skill。保留有效证据和审计链，不因记录失效、任务终态或 Git 忽略自动删除；清理范围与风险按公共控制协议处理。
- 任务开始时记录已有工作区和暂存区改动；阶段收尾按[最小 Git 提交集](./minimal-git.md)和[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)核对实际 diff、文件所有权和当前 Work Item 的真实引用，逐层收齐恢复当前工作所需的文件。Creator 正式 `assets/` 资源与对应 `.meta` 必须一并保留；`settings/`、`profiles/`、必要的 `native/` 与 `extensions/` 源配置保持可跟踪。按 Creator 工程约定忽略 `library/`、`temp/`、`local/`、`build/`、`cache/` 等可再生成目录，不整体忽略源码或正式资源。禁止无差别 `git add .` 或 `git add -A`；同一文件混有他人改动时按块隔离，无法可靠分离则保留现场并报告阻塞，不夹带已有暂存内容。
- 提交前将最小忽略模板合并到项目 `.gitignore`：`output/`、根级 `evidence/`、`docs/`、源素材和 `.workflow-control/` 默认忽略文件并保持父目录可遍历，再按真实引用逐文件放行；不能整体放行某个工作项或产物目录。用户确认账本和回执实际位于 `.workflow-control/user-resolutions/`，沿用此路径，不另造控制目录。人工作业 `evidence/<workItemId>/reviews/` 与 `validation/` 不等于机器 `evidenceRoot`；受 `evidenceRoot` 限制的字段只能引用对应 Work Item 实际配置根目录中的文件。本地秘密配置与凭据不入库。将必要 `.gitignore` 修改纳入提交，并逐文件用 `git check-ignore --no-index` 检查最终规则；不得用宽泛规则掩盖未完成工作。

## 渐进式读取

- 阶段收尾或检查提交范围：读取 `references/minimal-git.md` 与架构 Skill 的 `references/artifact-storage.md`。

## 不可绕过约束

- 美术方向和质量遵循[游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)。全局选图的结构化 brief 与逐候选人工质量结果必须通过真实文件门，所选候选任一失败或未验证均不能冻结；机器出口只核对事实，不替代观看舒适、主题与完成度的人工结果，未明确授权时代理不自动分析截图或视频画面。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-domain-visual-review.md#不可绕过约束)。

## 图片任务交付

效果图生成与界面实现共用[游戏内文案](../../cocos-game-ui-layout/references/game-copy.md)规则：内部策划说明与玩家可见表达分开，生成提示词明确可见文字范围，正式界面绑定同一表达与动态数据。全局候选、场景主图、弹窗及无效果图路径均适用；复用现有生成记录、领域文档与人工验收，不新增审批门，也不把机器检查视为文案显示通过。

视觉任务遵循[图片优先的确认方式](./simplified-workflow.md#图片优先的确认方式)：代理内部维护分析、技术记录与提示词，直接交付真实图片或预览供人工确认，不设常规文字提案、拆解记录或布局决策的制作前确认门。帧动画例外：先说明动作方案的设计理念并等待用户明确确认，再制作真实素材或进入具体实现。已确认目标范围内的返修直接给前后对照；有决定性需求歧义才暂停受影响部分。实际拆解、布局、资源、父帧与视频确认及操作授权沿用原门，不能以内部记录替代真实候选。
