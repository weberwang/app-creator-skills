# 项目交付物规范

公共 Work Item、实施结果、真实证据、拷问、人工确认、受保护动作和 Git 验证规则统一见[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)。下文只保留本技术栈的产物路径与领域工件职责。
## 产物存放与确认归档

生产、送审、确认、资源接入与收尾统一遵守[产物目录与归档规范](../../threejs-game-architecture/references/artifact-storage.md)。临时中间文件放 `output/intermediate/`，未送审候选放 `output/candidates/`；确认后的非运行设计成果放 `docs/confirmed/<owner>/<artifact-id>/<version>/`，生产源文件放 `assets-source/<owner>/`，正式游戏资源放 `public/assets/<owner>/`。`<owner>` 按 `shared`、`scenes/<scene-id>`、`display-layers/<display-layer-id>` 区分。

送审实际文件及截图、录屏、日志放 `evidence/<workItemId>/reviews/` 或 `validation/`，工作流机器记录仍放 `.workflow-control/` 并沿用工具实际布局；`evidenceRoot` 默认是 `.workflow-control/evidence/<workItemId>/`，受该根目录约束的机器输出仍写入其中。受保护用户确认账本与回执保留固定位置 `.threejs-workflow/user-resolutions/`。已绑定的确认/执行文件不因归档移动或覆盖，非运行成果的归档副本不建立第二套确认状态；正式游戏资源只维护一份运行路径。实施包记录实际输入/输出路径，Evidence Manifest 引用真实保留文件，不能引用可清理的临时文件。确认状态来自原有人工确认与控制面事实，不由目录名推断。

## 领域工件

下表描述领域工件的职责，不是全部提交清单。Git 按[最小提交集](../../threejs-game-architecture/references/artifact-storage.md#最小提交集)只纳入运行必需工程文件及当前工作项仍需读取的规格、记录和间接依赖；被引用的已完成结果、共享基线和目录扫描所需记录也要保留，账本按完整文件提交。非运行文档、素材、证据和控制记录默认忽略，由执行代理维护精确文件放行；不整目录提交历史 JSON、文本报告、确认归档或生成媒体。被忽略的文件仍须满足本地保留和实际文件检查要求，跨机器验收前按既有方式恢复。

| 文件 | 领域权威内容 |
| --- | --- |
| `docs/project-profile.yaml` | 项目身份、渠道和约束 |
| `docs/GDD.md` | 已批准需求、完整功能/场景清单、范围、玩法、验收与端到端追踪；分开内部规则与[玩家可见表达](../../threejs-game-ui-layout/references/game-copy.md#工作流接入)，供生成与界面实现共用 |
| `docs/visual-baseline.md` | 不可变冻结全局视觉规则正文；完整文件 SHA-256 形成风格指纹 |
| `docs/visual-design.md` | 可追加的方向探索、基线索引与 V2/V3/V4 阶段证据，不参与风格指纹 |
| `docs/TDD.md` | 模块、公共基础、场景依赖/实施序列、分项完成事实、能力、平台和服务边界 |
| `docs/balance.md` | 数值模型与验证 |
| `docs/game-feel.md`（按需） | 当前任务需要独立记录动态反馈意图、事件语义或组合规则时使用；也可复用 GDD/视觉设计文档，不是默认工件或机器必需字段，参考[汁水感设计指南](../../threejs-game-juice/references/design-guide.md) |
| `docs/asset-license-register.md` | 资源/音频来源、授权与发布资格 |
| `docs/visual-assets.json` | 含场景或 shared 归属的视觉资源机器清单，不驱动全局状态 |
| 3D 模型当前工作项的源、运行资产与交接报告 | [建模交接](../../threejs-game-3d-modeling/references/model-handoff.md)包含版本化 `.blend`、自包含 GLB、实际 UV/槽位/LOD/碰撞及导出回读；源放 `assets-source/<owner>/<asset-id>/<version>/`，运行资源放 `public/assets/<owner>/`。模型清单、静态报告、Blender 专项报告和人工结论分别保留并由实施单元实际证据引用，不另造全局工件或阶段 |
| `docs/confirmed/<owner>/<artifact-id>/<version>/` | 已确认非运行设计成果的交付归档；确认依据仍引用原有实际送审文件与控制记录 |
| 场景 V2 布局候选目录 | 同批 `layout.png`、`layout-nodes.json`、`layout-decision.json`、离线 `review.html`、`generation-result.json` 及真实 SHA；审阅页规则见[离线布局审阅产物](../../threejs-game-ui-layout/references/layout-review-artifacts.md) |
| `docs/qa-plan.md` | 测试策略，不得自填通过状态 |
| `docs/platform-matrix.md` | 分层平台证据；不自动触发真机 |
| `docs/release-checklist.md` | 独立发布工作项的候选清单，不是发布授权 |


## 留痕

公共状态、返工、证据和人工作业记录只按[当前公共专业执行规范](../../app-creator-workflow/references/professional-execution.md)处理。清单中的领域工件仅按实际需要创建；被引用的实际资源、规格、结果和证据必须保留完整依赖。未经明确请求不提交或推送 Git，也不自动回滚、合并、发布或清理共享工作区。
