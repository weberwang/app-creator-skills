# 实施计划与执行批次

`Implementation Package.executionUnits` 是计划者给定的固定顺序。`sequence` 必须从 1 连续递增；控制器按数组顺序分批，不执行拓扑排序或自动重排。

## 单元字段

- 未提供 `parallelGroup` 的单元各自构成一个串行批次。
- `parallelGroup` 是非空字符串。同一组必须在计划中连续出现，并至少有两个单元。组内单元可以任意顺序完成结果提交。
- `dependsOn` 是可选的单元 ID 数组，只能指向计划中更早批次的单元。不能指向未知、未来或同一个并行批次中的单元，也不能重复引用。
- `SHARED`、`INTEGRATION`、`RELEASE` 单元只能串行。
- 同一个并行组的 `paths` 之间不得相同、互为父子目录或在 Windows 上大小写不同但路径相同。并行单元须声明具体路径；包含 glob 通配符的所有权一律拒绝，因为控制器无法证明它与其他所有权互斥。路径的现存祖先（包括路径本身）也不得是符号链接或 Junction；现存文件还会按文件系统设备号和 inode 检查硬链接别名。串行路径保持公共路径校验语义。
- 不同批次可以沿用公共路径：批次之间严格串行。单元类型和引擎专属规则仍由相应技术栈 profile 与领域规范决定。

## 状态与提交

进入 `IMPLEMENTING` 时，控制器会把实施计划快照、单元 `PENDING` 状态和首批单元 ID 写入 `execution-state.json`。`activeBatch` 表示当前允许提交的结果单元，不表示控制器已经启动任何执行进程。

`unit-check --result <path>` 保持原参数。控制器读取指定结果中的 `unitId`，再核对它是否属于当前批次，并要求结果路径与该单元预先声明的 `resultPath` 一致。状态为 `PASS` 仍需通过完整结果核验：实际文件存在并属于单元路径所有权、计划命令与非空输出文件逐项对应，且结果绑定当前工作项、技术栈和实施包。

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
