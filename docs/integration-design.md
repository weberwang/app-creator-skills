# 工作流整合设计

## 完整专业能力迁移

当前以五源仓库1608个Git跟踪文件为逐项输入，91个原正式入口均有去向。目标只保留30个根SKILL：21个领域能力、4个公共流程和5个技术栈规范。77份专业正文改为ADAPTER.md，全部脚本、模板、校验器及1个Flutter嵌套生成模板继续保留；没有旧专业入口别名。共同正文与算法继续使用完整真源，详见[入口迁移](capability-entry-migration.md)。

公共流程仍只有当前控制器；旧控制目录中的纯领域合同按依赖闭包迁为各栈 domain-contracts，旧编排目录的技术资源作为无根 SKILL.md 的资源目录保留。混在 Unity 原 CLI 中的原生技术校验单独提取为只读模块，不能被通用状态机替代。全局执行器和旧全局回归逐项记录替代目标，专业测试和正式脚本依赖的夹具保留。

确定性迁移器记录源/目标摘要、具体变换和去向。按栈安装适用公共能力及完整原生资源包；公共manifest只加载当前栈模式，明确复用既有适配时保持原主职责不变。Flutter CommonJS、真实工具输入、资源与校验接口保留；不引入旧入口别名或旧公共Work Item兼容解析。

公共视觉合同、无引擎图片算法、补帧规划、字库及专业共同规则由 `app-domain-toolkit` 维护真源。相同纯模块保留薄导出入口；仅 Schema 身份或技术名不同的 CLI 用工厂参数注入；原生行为不同的资源导入、renderer、场景/输入和布局合同继续独立。公共实现不得反向依赖某个栈的私有模块。抽取边界见[公共能力设计](shared-capability-plan.md)，实际对照见[公共能力清单](shared-capabilities.md)。

## 目标与边界

以 unity-skills 为流程语义基准，统一六阶段、V0–V4、A0–A6、F0–F4、实施包、执行结果、证据及 repair/revalidate/return。新增 PAGE 表达应用页面，SCENE 与 DISPLAY_LAYER 保持独立。五套技术规范独立维护，不保留五份控制器，不兼容旧控制数据，不自动迁移旧项目。

目录采用 `skills/<技能名>`。公共技能为 `app-creator-workflow`、`app-workflow-control`、`grilling`、`app-asset-workflow`；五个 `app-stack-*` 提供技术栈规范和完整专业索引。按任务读取当前栈的原名专业技能及其资源，不以栈规范摘要替代专业入口。

## 控制器工作项

- 所有权：`skills/app-workflow-control/**` 与 `tests/control/**`，由控制器实现者负责。其他文件由主代理负责。
- 无第三方运行时依赖，Node.js >=22.20；所有实现文件小于 1000 行，函数、类与非直观逻辑添加中文注释。
- CLI：`node skills/app-workflow-control/scripts/workflow-control.mjs <init|status|check|run|transition|visual-stage|unit-check|lint> --repo <项目> --work-item <项目相对JSON路径>`。
- `init --stack <unity|cocos|phaser|threejs|flutter> --id <ID> --type <类型> --objective <目标>` 创建最小工作项，不覆盖文件。缺省类型 FOUNDATION、项目阶段 foundation-engineering，INIT 为 INTAKE。控制记录位于 `.workflow-control/`。
- `transition --to <状态>`，`visual-stage --to <V1|V2|V3|V4>`，`unit-check --result <结果JSON路径>`；`lint` 校验控制器模板与技术 profile 的可加载性。未知命令/参数报错。
- 稳定 JSON 输出包含 `status/stage/changed/blocking/next/metadata`，失败退出码非零；`status` 只读诊断退出 0，`check` 阻断时退出非零。控制器不启动进程、不执行验收命令、不批准人工决定、不执行引擎写入。
- 唯一数据版本 `1.0`；主键使用 `workItemId/stack/workItemType/stageId/globalState/objective/allowedPaths/forbiddenPaths/gateStatus/revision`，不用 baselineHash/SHA。视觉对象使用 `visual: {objectId, stage}`，显示层另有 `hostId/layerType`；类型包含 PROJECT/FOUNDATION/MODULE/SCENE/PAGE/DISPLAY_LAYER/INTEGRATION/RELEASE。
- Work Item 使用 `implementationPackageRef/evidenceRef/globalVisualBaselineRef/assetReviewRef/grillingRef` 指向项目内 JSON。字段细节由控制器 schemas/templates 明确。所有文件路径为 POSIX 项目相对路径，拒绝绝对路径、..、符号链接越界。
- 实施包绑定 workItemId/stack/visualStage（适用时）和有序 executionUnits（unitId/owner/type/paths/acceptanceCommands）。路径同时满足 allowedPaths 与 forbiddenPaths，包不混 SCENE/PAGE/DISPLAY_LAYER，Unity `.meta`/编辑器单写者细节由技术 profile 约束。
- 单元结果绑定工作项、实施包、单元及顺序，保存真实命令退出码和 evidenceRoot 内非空 outputFile；验证不能只看手填 PASS。执行状态存于当前 evidenceRoot/execution-state.json，不修改实施包快照。进入 VALIDATING 时重验全部结果。
- Evidence 绑定当前工作项/stack/实施包/visualStage（适用时），需要真实证据文件与技术 profile 声明的 evidence 类别。F0–F3 不能替代证据。
- 技术 profile 位于相邻 `app-stack-<stack>/profile.json`，公共字段：`id/displayName/detectAny/frameworkPolicy/nativeRules/evidenceRequirements/runtimeRoots`；evidenceRequirements 是 {engineering: string[], assetImport: string[], visual: string[]}。V3 只要求工程与实际资源导入类别，V4 才要求完整运行类别。runtimeRoots 只是初始化 allowedPaths 的默认值，实际授权由工作项与单元路径决定，不能当作不可扩展白名单。各栈保留领域验证责任，公共控制器核对类别、文件、身份，不推断引擎执行通过。
- 视觉确认只认记录的真实用户消息引用，按当前 objectId/阶段/候选绑定。V0 不确认，不伪造实施结果；V1 目标图；V2 先拆解后布局独立确认；V1/V2 设计阶段不强制编译构建。V3 资源导入和执行证据闭合再进入 V4；V4 运行证据和人工确认才能最终完成。全局首次视觉基线三候选、唯一人工选择；候选均记录五项结果，只有选中者必须全部 PASS，同项目同栈基线跨 Work 复用；同目标不重走审批。
- assetReviewRef 用于 V3/V4，区分技术 PASS 和人工风格检查；去 AI 味结果不得由生成成功或静态工具推断。截图默认只由用户人工验收。
- 待决 grilling 阻断受影响工作，已确认决定绑定真实用户消息；无问题不造占位拷问。
- 副作用 external-write/device/sign/upload/publish/payment/destructive 必须精确绑定当前操作、目标及真实用户批准引用。本地 JSON 只是记录，不能验证用户身份，也不授权执行副作用。A5/A6 自动 run 停止，发布只能显式 transition，仍不执行外部动作。
- RETURN 显式提供 affected-scope 与 reason，推导 BASELINE/PROPOSAL/REVIEW 恢复点，归档执行状态并清除实施包/证据消费引用；不允许手选恢复点。BLOCKED 不得成为绕过 RETURN 的通道。

## 其他交付

主代理负责公共编排、拷问、素材流程、五个profile、能力集成、安装器、来源追溯与仓库校验。安装器按技术栈安装适用公共能力、栈规范、完整原生资源包与依赖声明，默认冲突不覆盖，显式replace保留可恢复备份；不安装全局技能或改动五个源仓库。

## 验证计划

本轮推荐 T3：跨五库的专业能力迁移涉及脚本、模板、校验器及安装分发，执行全仓 Node 测试、专业工具回归、全部脚本语法与技能引用检查、逐源文件摘要核对、临时目录安装及打包预检。命令为 `npm test`、`npm run test:flutter-layout`、`npm run check`、`npm run check:migration -- --source-root E:/Git` 和 `npm pack --dry-run --json --silent`。不启动引擎、开发服务、真机，不生成图片或执行外部写入；实际结果见验证记录。
