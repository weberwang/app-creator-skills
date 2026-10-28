# 最小 Git 提交集

阶段提交只包含运行或构建所需文件，以及恢复当前工作项所需的记录和实际引用文件。长期保存、已经确认或位于某个目录都不自动构成提交理由；未入库也不构成删除理由。本规则不改变文件位置、确认权威、阶段硬门或当前任务范围。

## 必要文件

| 类别 | 选入依据 |
| --- | --- |
| Creator 工程与运行文件 | 当前源码、实际加载的正式资源及其 `.meta`、`settings/` 与 `profiles/` 工程配置、必要的 `native/` 与 `extensions/` 源码/配置、构建平台配置、依赖清单与锁文件、必要工具和验证当前改动所需的测试；本仓库的 Skill、脚本及必要参考文件也属于交付内容 |
| 当前规格 | 当前任务实际使用的项目配置、GDD/TDD、视觉基线、布局/资源合同、资源清单和许可依据，按文件选取，不整目录提交 `docs/` |
| 续接记录 | 当前 Work Item、绑定的实施包、执行状态、必要单元结果、Diff Audit、Evidence Manifest，以及仍参与当前决定的委派/并行批次、变更、审批与视觉确认回执 |
| 实际引用产物 | 上述有效记录及规格引用的图片、布局包、生成/归一化记录、日志、截图、录屏和必要源输入，逐层检查文件引用直到没有缺项 |

Creator `assets/` 中的正式资源与对应 `.meta` 是一组工程源文件，必须一起保留和提交；不能通过忽略整个 `assets/` 或 `*.meta` 排除它们。`settings/`、`profiles/`、项目实际使用的 `native/` 源码和原生平台配置也不能整体忽略。具体文件仍按当前工程和工作项依赖核对。

根级 `evidence/<workItemId>/reviews/` 与 `validation/` 是人工作业审阅/验证产物目录，不是控制工具的 `evidenceRoot`。当前工作项确实引用其中的媒体、审阅页、截图、录屏或日志时，按实际依赖逐文件纳入；Evidence Manifest、自身文件列表、命令 `outputFile` 等受 `evidenceRoot` 限制的字段仍只能引用对应 Work Item 实际配置证据根内的路径，不得填写根级 `evidence/` 或其他外部路径。已冻结引用不为入库批量迁移或自动改写。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/git-minimal-submission.md#必要文件)。

确认账本或清单是一个实际文件时，保留完整文件，不为缩小提交而裁剪账本条目、删除 Schema 必需字段、伪造通过或解除真实依赖。Cocos 用户确认账本与回执使用 `.workflow-control/user-resolutions/`；只提交当前有效引用链需要的完整文件，不另造 `.cocos-workflow/` 或第二套账本路径。当前选择证据若引用多张候选，候选及其必要记录都选入，不能自行改成只保存所选图。

通常不入库：临时尝试、无有效引用的失败候选/旧版本/重复预览、无后续用途的源素材、缓存、普通调试日志、进程锁、已完成事务的临时文件、依赖安装目录，以及 Creator 的 `library/`、`temp/`、`local/`、`build/`、`cache/` 等可再生成内容。若其中的图片、源视频或日志仍是当前门需要的实际文件，则按引用选入，不能只留下路径字符串。秘密配置、签名凭据和访问令牌不入库；使用环境配置说明或无秘密示例，不得借必要引用强制加入秘密文件。

## 忽略规则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/git-minimal-submission.md#忽略规则)。

- `node_modules/`、Creator 生成的 `library/`、`temp/`、`local/`、`build/` 与 `cache/` 保持忽略。不能用宽泛规则忽略 Creator 正式 `assets/` 及 `.meta`、`settings/`、`profiles/`、`native/` 或 `extensions/`。
- `output/`、根级 `evidence/`、`docs/`、源素材目录和 `.workflow-control/` 默认忽略目录内文件，再为最小提交集中的文件逐条追加以 `/` 定位的 `!` 规则。
- 被忽略的产物目录仍需保持父目录可遍历。父目录例外 `!/<目录>/**/` 只放行目录，不放行目录内文件；不能在父目录仍被整目录忽略时只追加子文件例外，也不能用 `!/.workflow-control/**`、`!/docs/**` 或某个工作项目录的整体例外代替精确文件清单。
- 临时目录默认也保持父目录可遍历。若当前有效记录已经引用某个临时文件且仍需它续接，精确放行该文件；新产物仍按[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)在确认前固定长期位置，不为整理入库迁移已冻结引用。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/git-minimal-submission.md#忽略规则)。

```gitignore
# 工作流必要文件开始
!/docs/TDD.md
!/.workflow-control/work-items/WI-1.json
!/.workflow-control/evidence/WI-1/execution-state.json
!/.workflow-control/evidence/WI-1/units/result-1.json
!/.workflow-control/evidence/WI-1/attachments/V4/run-1/test.log
!/.workflow-control/user-resolutions/WI-1-ledger.json
!/.workflow-control/user-resolutions/WI-1-receipt.json
!/evidence/WI-1/reviews/V2/candidate-1/review.html
!/evidence/WI-1/reviews/V2/candidate-1/layout.png
!/evidence/WI-1/validation/V4/run-1/screenshot.png
!/output/candidates/WI-1/V3/candidate-1/frame.png
!/docs/confirmed/scenes/battle/layout-target/v1/layout.png
# 工作流必要文件结束
```

## 提交前核对

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/git-minimal-submission.md#提交前核对)。

3. 合并精确放行条目，逐文件检查 `git check-ignore --no-index -v -- <路径>`；再用 `git ls-files --cached -- <路径>` 核对已跟踪情况。检查仓库级、全局和嵌套忽略规则的最终效果，不仅查看根 `.gitignore` 文本。对 Creator 正式资源同时核对源文件和 `.meta` 均可入库。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/git-minimal-submission.md#提交前核对)。

## 本栈配套资料

- [控制面收尾规则](./technical-control.md#阶段收尾与-git-提交)
- [项目忽略模板](../assets/minimal-project.gitignore)
