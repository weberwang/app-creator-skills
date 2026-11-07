# 项目交付物

## 何时读取

初始化阶段文档、进入新领域任务，或整理 Work Item 投影视图时读取。

## 输入

- 项目根目录、当前 Work Item、阶段、质量门和已启用角色。
- 已存在的 `docs/` 文档、机器契约、实际 `evidenceRoot` 与人工审阅/验证目录。
- 用户批准的范围、视觉、指标、渠道和豁免。

## 执行步骤

1. 采用本栈完整初始化时创建项目合同要求的 `project-profile.yaml`、`GDD.md`、`TDD.md` 和 `control-plane.md`；普通局部任务按[三项最小约定](../../app-creator-workflow/references/output-files.md#每项任务的最小约定)更新必要内容或直接交付结论，不为了任务形式新建整套文档。
2. 对应角色实际开工时才创建可选文档：`balance.md`、`asset-register.yaml`、`audio-plan.md`、`qa-plan.md`、`distribution-matrix.md`，以及发布阶段的 `release-checklist.md`、`privacy-review.md`、`third-party-notices.md`。
3. GDD 保存玩家体验、范围和验收；TDD 保存模块、生命周期、数据、构建和验证设计；`control-plane.md` 只是 `.workflow-control/` 当前状态的可读投影，不是状态权威。
4. Work Item、Implementation Package、执行结果、审批和 Change Request 保存在 `.workflow-control/` 的实际控制工具路径；机器证据仅写入当前 Work Item 的实际 `evidenceRoot`。项目人类可读的审阅、验证和确认设计成果按[产物存放规则](./artifact-storage.md)存放，详细规则、资源登记和测试矩阵留在所属交付物。
5. 质量门汇合后，可在普通可编辑的 `control-plane.md` 投影视图中精简已归入基线且无续接用途的重复说明，保留当前门、未决／阻断及有效结论引用；不能借此删除机器控制记录、确认或原始证据。
6. 初始化脚本仍拒绝覆盖，冻结或绑定文件按原合同保护；授权范围内的普通可编辑文档直接更新，无需为每次编辑重复申请确认。

## 子代理角色与并行边界

- 制作维护 GDD，架构维护 TDD，各专业角色只维护自己的可选交付物。
- 总控维护控制面索引并解决跨角色冲突，不替角色复述输入文档。
- 不重叠文档可并行写入；同一文档只有一个所有者。

## 所需锁与 Unity 权限

- 文档初始化和维护不需要 Unity 权限，但需对应文件独占锁。
- 文档引用 Unity 证据时记录真实路径、版本、来源提交或实际内容标识；哈希可作为可选追踪信息，不是阶段验收或用户确认的前置条件。不得改写原始日志。
- 禁止记录密钥、账号、个人数据、未脱敏日志和受限合同全文。

## 机器可读输出

项目文档根目录统一为小写 `docs/`。产物按[产物存放规则](./artifact-storage.md)分类，机器控制记录使用 `.workflow-control/` 的真实路径；公共 Manifest 的 `items[].path` 和命令 `outputFile` 等受约束字段只引用当前实际 `evidenceRoot` 内文件，`Execution Result.files` 则引用执行单元所有权内的实际改动交付，不把人工审阅路径伪装为证据根。阶段通过后的本地提交与忽略/放行规则遵循[最小 Git 提交集](../../unity-domain-contracts/references/minimal-git.md)。

公共与专属资源共用 `docs/asset-register.yaml`，登记事实、唯一所有权和各场景消费关系按[公共资源登记与使用](./shared-asset-usage.md)分别归档。总表由指定单写者在资源交接时维护，生产者提交独立事实，不建立场景级公共资源副本或另一套登记总表。

## 通过条件

- 只创建当前范围需要的文件，实际结果、相关路径及验证明确；分工、状态和证据身份仅按协作或实际合同补充。
- 控制面简短且能索引真实基线与证据，不保存问答全文。
- 初始化没有意外覆盖已有文件。

## 失败与恢复出口

- 同名文件存在时停止并报告；只有用户明确要求时使用 `--force`。
- 文档与实现冲突时以实际代码和运行证据识别差异，再由所属角色修正基线。
- 缺少人工结论时记录待决策及最迟决定点，不填入虚构默认值。
