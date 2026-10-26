# Spine 生成式换皮生产

本规范是列入迁移清单的技术栈共用的完整规则。每段标明适用栈；执行时同时读取本栈技能的原生约束与“本栈配套资料”，资料路径和具体工具由栈入口维护。公共状态与授权仍由 app-workflow-control 管理。

## 完整流程

### 固定流程（cocos、phaser）

`inspect` 读取 Skeleton JSON 与 Atlas，输出版本、Bone、Slot、Skin、Attachment、Mesh、Animation、Page、Region 统计、attachment path 映射和 Mesh 顶点/三角形/UV 稳定哈希。

### 固定流程（cocos、phaser）

`init` 建立 schema v3 清单，读取真实源文件，SHA-256 仅作可选追踪。低于目标 Runtime 时只接受外部官方工具生成的候选，使用 `upgrade-check` 比较结构投影；未通过目标 Runtime 解析证据前，任何批次命令都会阻断。

### 固定流程（cocos、phaser）

`freeze-contract` 冻结角色名、目标 Runtime、暗黑视觉方向、六项色板、材质语言、光向和默认 `strict_alpha=true`。首批前不得使用临时色板。

### 固定流程（cocos、phaser）

`plan-batches` 导入精确 Region 顺序、mode、alpha lock 和可选连续特效序列，机器校验全集覆盖、无重复/遗漏、Mesh 使用 `mesh-safe` 且锁 Alpha。

### 固定流程（cocos、phaser）

按 `batch prepare → mark generated → batch review → 停止 → batch accept` 执行。`batch accept` 核对当前批次 revision、实际候选、审阅图和人工确认，不要求提供或比较 SHA/fingerprint；在刚展示且由 `--batch` 明确指定的审阅上下文中，简短“确认”即可通过，也可使用当前批次对应的完整确认句（初始批次“确认第N批”、返工“确认重启版第N批”）。空白、无关或否定文本仍拒绝。回执是 V3 正式资源生产中的局部 `spine_batch_acceptance`，不是全局第二次视觉审批。返工使用 `batch reopen` 增加 revision，只影响当前批。

### 固定流程（cocos、phaser）

所有批次 `ACCEPTED+locked` 后执行 `pack`。默认且正式固定 `padding=0`、`extrusion=0`，Page 名必须保持原名并且实际为 PNG；Atlas Page/Region 间空行格式由序列化器固定。

### 状态硬门（cocos、phaser）

正式 Cell 必须是实际 PNG、含 Alpha、尺寸等于正向 Atlas Region；`alpha_lock=true` 时 Alpha 掩码像素级一致，Mesh 永远锁 Alpha。`constrained-redraw` 只有显式 `alpha_lock=false` 才允许使用。

### 全局视觉与批次确认边界（cocos、phaser）

全局视觉阶段、状态和确认规则以 `app-workflow-control` 的“控制模型”（见本栈配套资料）、“状态与门”（见本栈配套资料）及 Schema 为准。Spine 换皮中的方案提议、审查或审阅、批次锁定都必须在当前用户任务的既有 Work Item 范围内完成；本 Skill 只修改自身候选工件，不自行扩展任务范围或创建全局审批。任务内范围、方案或路径变化同步更新计划并重验受影响部分；需要改变产品方向、视觉方向或接入主游戏时，回到控制面重新审查。Spine 批次确认属于 V3 正式资源生产中的局部锁定回执，不进入 Approval Ledger，也不改变场景 V2 的拆解与布局确认。
