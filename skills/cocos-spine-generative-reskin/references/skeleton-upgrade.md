# Skeleton 审计与升级

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-skeleton-upgrade.md#skeleton-审计与升级)。

先从目标 Creator 项目实际启用的 `sp.SPINE_VERSION` 和 feature 配置确定 Spine Runtime 分支，再将其 major.minor 写入 `target_runtime`。Creator 版本、项目 `data.version` 和 Spine Runtime 是不同概念，不能互相推断。Creator 3.8.6 的 `cc.config.json` 明确列有 `spine-3.8` 与 `spine-4.2` feature；更高 Creator 版本也应核对其自身配置与真实解析结果。[Creator 3.8.6 feature 配置](https://raw.githubusercontent.com/cocos/cocos-engine/v3.8.6/cc.config.json)

仅在目标分支为 Spine 3.8 时应用 3.8 分支的导出兼容限制；不要因此拒绝 Spine 4.2，也不要将单一版本限制推广到所有 Creator 3.x。当原版本低于当前目标 Runtime 时，工具只保存外部/官方 Spine 工具生成的候选，不自行实现跨版本转换。`upgrade-check` 对升级前后做规范化结构投影比较：Bone 的 parent/length/Transform/inherit、Slot 的 bone/color/dark/default attachment/blend、IK/transform/path/physics 约束、Skin/Attachment 的 region/mesh/linkedmesh 锚点/尺寸/path/parent/deform/sequence，以及动画关键帧时间、值和插值语义变化都属于未知变更并阻断；只允许记录 Runtime 格式字段迁移。

`--runtime-evidence` 必须来自目标项目的真实 Runtime 诊断页或官方解析工具，而不是本 CLI 自己把版本号改成目标版本。证据 JSON 需要记录实际候选 Skeleton、目标 Spine Runtime、Creator 引擎版本及其来源、`sp.SPINE_VERSION` 及其来源、`runtime_owner`、`producer`、command 或 URL、`parsed=true`，并引用候选目录内的实际原始日志。不要把 Creator MCP 的面板打开/worker ready 当作 Runtime 解析。CLI 只校验证据的绑定性和结构投影，不能宣称自己完成了官方 Runtime 解析；实际文件缺失或 Runtime 不满足要求时 `plan-batches` 仍会失败。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-spine-skeleton-upgrade.md#skeleton-审计与升级)。
