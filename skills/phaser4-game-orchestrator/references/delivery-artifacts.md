# 项目交付物规范

公共 Work Item、实施结果、真实证据、拷问、人工确认、受保护动作和 Git 验证规则统一见[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)。下文只保留本技术栈的产物路径与领域工件职责。
## 产物落盘

目录与流转统一按[产物目录与归档规范](../../phaser4-game-architecture/references/artifact-storage.md)执行：未送审候选和中间文件使用 `output/candidates/`、`output/intermediate/`；已确认非运行成果使用 `docs/confirmed/<owner>/<artifact-id>/<version>/`；源输入和正式资源分别使用 `assets-source/<owner>/`、`public/assets/<owner>/`。领域审阅与验证文件放根级 `evidence/<workItemId>/reviews/`、`evidence/<workItemId>/validation/`；机器记录保持 `.workflow-control/` 的实际布局。根级 evidence 不是机器 evidenceRoot；受 evidenceRoot 约束的 Manifest、files[]、outputFile 仍写入控制根，领域清单通过自身引用关联外部文件。

待确认文件先完成保留目录落盘和引用更新再展示，确认后按用途归档；原始审阅文件不因归档搬迁覆盖，副本不创建第二套确认状态。TDD 记录项目实际映射，Work Item、实施包及证据清单引用真实文件，不将临时文件作为后续唯一输入。

游戏资源在记录 V3 `accepted` 前安装到计划中的正式路径，并更新尚未冻结的生产/归一化记录后重验实际文件；安装到通过之间不得进入正式场景加载、构建或发布。通过后冻结路径，返修用新版本，不覆盖仍被有效确认引用的资源，也不在通过后再搬迁文件。

## 最小入库范围

按[最小 Git 提交集](../../phaser-domain-contracts/references/minimal-git.md)选择本任务运行/构建必需文件，以及恢复当前 Work Item 所需的记录和逐层引用文件。下面的领域工件表是职责索引，不是必须全部创建或提交的清单；只有实际使用的规格、清单、确认和附件入库。长期目录内未被当前工作项使用的版本、普通日志和非必要源素材可只本地保存；使用[忽略模板](../../phaser-domain-contracts/assets/minimal-project.gitignore)默认忽略产物文件，再为必要文件逐条放行。不能只提交引用 JSON 而遗漏它依赖的真实图片、布局包、回执或结果，也不能为减少 Git 文件裁剪权威记录。

## 领域工件

| 文件 | 领域权威内容 |
| --- | --- |
| `docs/project-profile.yaml` | 项目身份、渠道和约束 |
| `docs/GDD.md` | 已批准需求、完整功能/场景清单、范围、玩法、验收与端到端追踪；分开内部规则与[玩家可见表达](../../phaser4-game-ui-layout/references/game-copy.md#工作流接入)，供生成与界面实现共用 |
| `docs/visual-baseline.md` | 不可变冻结全局视觉规则正文；完整文件 SHA-256 形成风格指纹 |
| `docs/visual-design.md` | 可追加的方向探索、基线索引与 V2/V3/V4 阶段证据，不参与风格指纹 |
| `docs/TDD.md` | 模块、公共基础、场景依赖/实施序列、分项完成事实、能力、平台和服务边界 |
| `docs/balance.md` | 数值模型与验证 |
| `docs/game-feel.md`（按需） | 当前任务需要独立记录动态反馈意图、事件语义或组合规则时使用；也可复用 GDD/视觉设计文档，不是默认工件或机器必需字段，参考[汁水感设计指南](../../phaser4-game-juice/references/design-guide.md) |
| `docs/asset-license-register.md` | 资源/音频来源、授权与发布资格 |
| `docs/visual-assets.json` | 含场景或 shared 归属的视觉资源机器清单，不驱动全局状态 |
| `docs/confirmed/scenes/<scene-id>/<artifact-id>/<version>/`（显示层使用 `display-layers/<displayLayerId>`） | 同批 `layout.png`、`layout-nodes.json`、`layout-decision.json`、离线 `review.html`、`generation-result.json`；在展示前固定引用路径，审阅页规则见[离线布局审阅产物](../../phaser4-game-ui-layout/references/layout-review-artifacts.md) |
| `docs/qa-plan.md` | 测试策略，不得自填通过状态 |
| `docs/platform-matrix.md` | 分层平台证据；不自动触发真机 |
| `docs/release-checklist.md` | 独立发布工作项的候选清单，不是发布授权 |


## 留痕

公共状态、返工、证据和人工作业记录只按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)处理。清单中的领域工件仅按实际需要创建；被引用的实际资源、规格、结果和证据必须保留完整依赖。未经明确请求不提交或推送 Git，也不自动回滚、合并、发布或清理共享工作区。
