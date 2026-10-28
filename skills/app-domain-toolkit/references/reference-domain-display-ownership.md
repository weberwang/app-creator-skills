# 场景与显示层职责

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 弹窗工作项与场景解耦

> 适用技术栈：cocos、phaser、threejs。

场景工作项和弹窗工作项独立规划、实现、验收。场景只负责自身玩法、场景画面及属于 scene master 的常驻 HUD；modal、popup、drawer、toast 等瞬态显示层建立独立 `DISPLAY_LAYER` Work Item 和独立 Implementation Package。`host_scene_id` 只描述弹窗打开时的运行上下文及接线目标，不表示弹窗归属于宿主场景实现，也不把弹窗完成状态并入场景 V5。

> 适用技术栈：cocos、phaser、threejs。

- 场景 `display_layer_planning.inventory` 只记录场景自有的常驻显示层；没有自有显示层时显式使用 `inventory=[]`。`deferred_layers` 已移除，不得把未完成弹窗作为场景待办。

> 适用技术栈：cocos、phaser、threejs。

- 弹窗 Work Item 的 `inventory` 记录本任务实际交付的瞬态层，并独立完成参考、拆解确认、布局确认、正式资源、代码和 V5 运行轨迹。required state 仍必须绑定真实宿主上下文图，V5 仍验证打开→交互→关闭→恢复。

> 适用技术栈：cocos、phaser、threejs。

- `SCENE` 与 `DISPLAY_LAYER` 不得出现在同一个 Implementation Package。独立弹窗包可包含多个写范围和状态所有权互斥的 DISPLAY_LAYER 单元；每个单元保留 `displayLayerId` 和 `hostSceneId`。

> 适用技术栈：cocos、phaser、threejs。

- 大厅或其他宿主场景只实现自己范围内的稳定触发事件/公开接口。弹窗内容、资源、状态、接线和验收由弹窗 Work Item 负责；弹窗未开始、失败或延期均不阻断宿主场景验收。

> 适用技术栈：cocos、phaser、threejs。

- 弹窗与宿主需要联合调试时，在弹窗 Work Item 内消费宿主已冻结的公开接口与上下文证据。联合调试结果证明弹窗自身可用，不回写为场景完成前置，也不要求重新打开已通过的场景验收。
