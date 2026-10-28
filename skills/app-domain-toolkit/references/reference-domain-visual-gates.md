# 视觉生产领域门禁

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 视觉生产硬门

> 适用技术栈：cocos、phaser、threejs。

V3 必须完成逐 region 状态分析，记录实际分析证据、目标文件、分析 ID 和完成时间后，才能声明 `component_inventory`。`annotation_number` 只是审阅区域编号，不是资产数量单位；唯一原子部件由 `component_id/atomic_visual_key` 标识，重复实例用 `placements` 表达。效果图拆解分析 PNG、原子部件、状态和资产需求清单必须使用 `visual-decomposition-confirmation/1.0` 记录并由用户 `status=accepted`、`confirmation_mode=manual` 确认后才能进入 Implementation Package；缺失、pending、AUTO、旧字段、漏编号或区域定义变化一律拒绝。

> 适用技术栈：cocos、phaser、threejs。

生成式位图的每个唯一 `component_id × required state_id` 必须绑定一个独立位图，并强制 `delivery_mode=individual`、`atlas_allowed=false`，不能使用图集；其尺寸由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，`expected_assets.width/height` 必须精确等于该最小值，图片生产基线 `max_dpr=1` 和 `padding_policy=none` 必须存在；运行时实际 DPR 仍由设备动态读取并封顶为 2，历史 1.5/2 倍生产证据须重生成或标记 `stale`。固定视觉组件只允许 `image-generation`、`authored-raster` 或有证据的 `reuse`，交付为真实 PNG/JPG 位图；非图片逻辑、交互热区、碰撞或布局才能使用程序绘制。

> 适用技术栈：cocos、phaser、threejs。

V4 `production_contract_audit` 必须逐部件核对实际输出和 `component_usages`；F2 只消费 `validationMode=MACHINE` 的确定性机器事实，不再产生 `production_contract_review` 或 `component_reviews`；V5 还必须绑定 F3 runtime replay、非空 freshness-bound fidelity cases、运行时实际消费及无未批准替换。

> 适用技术栈：cocos、phaser。

Spine 换皮的 `spine_batch_acceptance` 只表示局部批次生产锁定。它必须核对批次 revision、实际审阅图、候选 Cell 和 Region 顺序，但不构成公共控制器的动作批准、不计为场景 V3 拆解确认，也不得绕过 V5 运行态证据。

## 图片优先的确认方式

> 适用技术栈：cocos、phaser、threejs。

拆解确认后再生成布局，两个图片确认仍分别保留；图片动画只在实际父图确认后制作依赖帧，真实视频验收后才能抽帧。图片、预览与观看效果由用户人工检查，代理不能代写通过。缺少素材或工具时说明真实缺口，不用文字方案、占位图或机器 PASS 冒充视觉候选。费用、外部写入、真机与发布仍按已有明确操作授权执行。
