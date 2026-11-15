# 实施计划与执行批次

`Implementation Package.executionUnits` 是计划者给定的固定顺序。`sequence` 必须从 1 连续递增；控制器按数组顺序分批，不执行拓扑排序或自动重排。

## 单元字段

- 未提供 `parallelGroup` 的单元各自构成一个串行批次。
- `parallelGroup` 是非空字符串。同一组必须在计划中连续出现，并至少有两个单元。组内单元可以任意顺序完成结果提交。
- `dependsOn` 是可选的单元 ID 数组，只能指向计划中更早批次的单元。不能指向未知、未来或同一个并行批次中的单元，也不能重复引用。
- `SHARED`、`INTEGRATION`、`RELEASE` 单元只能串行。
- 同一个并行组的 `paths` 之间不得相同、互为父子目录或在 Windows 上大小写不同但路径相同。并行单元须声明具体路径；包含 glob 通配符的所有权一律拒绝，因为控制器无法证明它与其他所有权互斥。路径的现存祖先（包括路径本身）也不得是符号链接或 Junction；现存文件还会按文件系统设备号和 inode 检查硬链接别名。串行路径保持公共路径校验语义。
- 不同批次可以沿用公共路径：批次之间严格串行。单元类型和引擎专属规则仍由相应技术栈 profile 与领域规范决定。

<a id="sample-dependencies"></a>

## 代表样本与生产依赖

本批正式视觉资源需要代表样本试接时，在游戏 `SCENE` 现有 V4 计划的执行单元标明 `sampleRole:sample` 或 `sampleRole:batch`、非空唯一的 `sampleScopeIds` 与 `sampleBasisRef:{path,sha256}`。三维世界使用当前场景合同的模型规格，并重验空间、方向及模型规格的既有 V3 依据；二维世界及游戏 UI 图片目标引用对应已确认的 V3 布局记录，并重验图片基线、目标覆盖、拆解及布局的既有确认链。普通工程任务、非游戏页面与不需该项检查的 UI 保持原计划字段，不为声明创建额外工作项、固定报告或审批。

每个 `batch` 必须通过 `dependsOn` 直接引用更早批次的 `sample` 单元；依赖的样本共同覆盖本批 `sampleScopeIds`，且与批量单元绑定相同制作依据版本。同批、未来或未知依赖仍按现有批次规则拒绝。多个独立制作依据可分别安排各自的样本和稳定批次；实际不相关的工作继续按既有依赖推进。若使用仍有效的旧样本，样本单元可核对并引用该来源及既有用户消息，不要求重新制作或重复审批。

样本单元显式填写 `sampleDecisionRequired`，说明现有流程是否确需用户对本样本作判断；为 `true` 时，真实决定尚未明确就不能放行依赖批次。执行报告的 `sampleEvidenceRef:{path,sha256}` 指向已有试接记录；新样本在实际试接完成后记录，不要求规划时预先生成未来结果。记录补齐 `schemaVersion:1.0`、`kind:production-sample`、实际生产者 `workItemId`、当前 `projectId/stack/objectId`、覆盖 `scopeIds`、同版本 `basisRef`、真实 `sourceRefs`、原试接 `evidenceRoot` 和 `runtimeRef`，可沿用已有三维样本的 `sceneRef`、`outputs` 和结构化引擎运行。运行引用也可指向相同证据根下的非空原始试接输出；合同、规格、人工确认和资源本身不能冒充输出。

需要人工判断时，`humanDecisionRef` 引用已有 V4 `representative-sample` 或 `imported-assets` 确认，绑定同一对象、实际来源或试接、覆盖范围和真实用户消息；确认展示文件及所有关联事实保留其实际文件与摘要。已有消息明确覆盖本样本时引用同一消息，不自动生成批准。样本单元正常 PASS 时，执行状态冻结当前结果及依据、源、试接、适用人工记录的摘要；后续检查或登记依赖批次时重验，内容或依据变化须返修受影响范围。

控制器只检查已明确声明的范围、依赖和记录，无法从任务名称发现被漏报的生产行为，也无法证明计划外的真实制作时间。执行者仍需如实标注实际生产范围，在用户检查显示效果后记录真实结果。

## 状态与提交

进入 `IMPLEMENTING` 时，控制器会把实施计划快照、单元 `PENDING` 状态和首批单元 ID 写入 `execution-state.json`。`activeBatch` 表示当前允许提交的结果单元，不表示控制器已经启动任何执行进程。

`unit-check --result <path>` 保持原参数。控制器读取结果中的 `unitId`，核对当前批次及预声明 `resultPath`。`PASS` 仍需完整核验：`files` 中实际交付存在且属于单元所有权；可选 `deletedFiles` 属于同一范围、具有批次实施前冻结的存在性和内容身份且现已不存在。两类至少一类非空，不能将原本不存在的路径冒报为删除，或删除控制器/证据保护文件。同单元真实更名须在 `files` 申报新路径、在 `deletedFiles` 申报旧路径；仅允许单一普通文件目标，当前单元扫描范围内的未申报别名、多硬链接，以及同批并行单元中的别名仍拒绝。当前工作项中重新创建被删路径，或丢失已交付文件，仍使结果失效。

已完成前批作为生产依赖或视觉复用来源时，只将业务交付视为历史事实：后批可在其实际所有权内更名、删除或重建业务路径，不要求保留旧业务文件。前批工作项、冻结计划、执行结果、命令原始输出、证据和确认链仍须完整且有效，兼作交付的记录不能借业务身份跳过检查。历史通过不代表当前版本通过；本批及最终集成仍按当前文件和实际行为严格验证。

计划命令与输出逐项对应。非空原始文本日志可直接使用；静默命令应使用 `command-capture-v1` 标准采集 JSON，真实 `command`、`exitCode` 必须与计划及结果一致，`stdout`/`stderr` 可为空。禁止用虚构成功文本填充日志。

独立采集入口会真实执行当前活动批次的冻结命令，输出不可覆盖的记录：

```text
node .agents/skills/app-workflow-control/scripts/capture-command.mjs --repo <项目路径> --work-item <工作项路径> --unit <单元ID> --index <从1开始的命令序号> --output <evidenceRoot内新JSON路径>
```

本仓库维护时将 `.agents/skills/` 替换为 `skills/`。采集只证明实际命令及输出，不自动登记 PASS，也不授权命令中的真机、发布或其他受保护操作。

一个并行批次的所有单元通过后，`activeBatch` 才切换到下一批。若尚有结果未提交，当前批次包含该批完整单元列表；最后一批全通过时值为空数组。完成状态仍保留所有单元结果并在 `check`、进入 `VALIDATING` 和从 `BLOCKED` 恢复时重新核验。

Execution State 会保存执行计划快照。启动后若实施包的单元顺序、分组、依赖、所有权路径、结果路径或验收命令变化，控制器会拒绝继续消费旧状态；需要通过工作流规定的 RETURN/新 evidenceRoot 重建实现闭环。

## 并发写入

`unit-check`、状态迁移、视觉阶段推进和工作项初始化按 Work Item 使用项目内排他锁。锁不可用时立即返回 `BUSY`，不会等待或回收遗留锁；调用方应检查 `status` 后再决定是否重试。只读 `status` / `check` 不创建锁文件。控制器仅核验记录，不启动代理、引擎、构建、设备或发布进程。

示意计划：

```json
{
  "executionUnits": [
    { "unitId": "foundation", "sequence": 1 },
    { "unitId": "ui", "sequence": 2, "parallelGroup": "feature-work", "dependsOn": ["foundation"] },
    { "unitId": "assets", "sequence": 3, "parallelGroup": "feature-work", "dependsOn": ["foundation"] },
    { "unitId": "integration", "sequence": 4, "dependsOn": ["ui", "assets"] }
  ]
}
```

完整单元还需满足 [Implementation Package schema](../schemas/implementation-package.schema.json) 中的类型、owner、paths、resultPath 和 acceptanceCommands 合同。
