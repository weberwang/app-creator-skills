# Skeleton 审计与升级

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-skeleton-upgrade.md#skeleton-审计与升级)。

当原版本低于目标 Runtime 时，工具只保存外部/官方 Spine 工具生成的候选，不自行实现 3.x→4.x 转换。`upgrade-check` 对升级前后做规范化结构投影比较：Bone 的 parent/length/Transform/inherit、Slot 的 bone/color/dark/default attachment/blend、IK/transform/path/physics 约束、Skin/Attachment 的 region/mesh/linkedmesh 锚点/尺寸/path/parent/deform/sequence，以及动画关键帧时间、值和插值语义变化都属于未知变更并阻断；只允许记录 Runtime 格式字段迁移。

`--runtime-evidence` 必须来自目标项目的真实 Runtime 诊断页或官方解析工具，而不是本 CLI 自己把版本号改成目标版本。证据 JSON 需要记录实际候选 Skeleton、目标 Runtime、`producer`、runtime package/version、command 或 URL、`parsed=true`，并引用候选目录内的实际原始日志。CLI 只校验证据的绑定性和结构投影，不能宣称自己完成了官方 Runtime 解析；实际文件缺失或 Runtime 不满足要求时 `plan-batches` 仍会失败。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-skeleton-upgrade.md#skeleton-审计与升级)。
