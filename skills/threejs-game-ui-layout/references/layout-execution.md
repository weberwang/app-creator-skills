# 布局执行计划

V5 在实例化 DOM/HUD 布局前，必须从已确认的业务节点和 `ui_layout` 推导每个属性的唯一控制者。`layout_execution` 是可重复计算的派生结果，不是第二份可手工编辑的布局合同；不得从 PNG、演示 JSON 或目标 bounds 推断运行计划。

## 驱动声明

可选声明位于 `ui_layout`：

```json
{
  "layout_owner": "PARENT",
  "size_policy": "FIXED",
  "overflow_policy": "KEEP_VISIBLE",
  "position_driver": "SHARED",
  "size_driver": "FIXED"
}
```

`position_driver` 的枚举为 `DOM_LAYOUT`、`SHARED`、`STATIC`、`ANIMATION`，普通游戏 UI 禁止 `STATIC`。正式路线已确定时填写 `ui_layout.renderer=DOM|HUD`；DOM 对真实父级的普通停靠及流式/滚动排布使用 `DOM_LAYOUT`，省略驱动时由该事实派生。HUD 或尚未确定实际 renderer 的计划缺省为 `SHARED`，后续实际 DOM 快照仍须核对原生优先规则，不能以省略字段绕过。`DOM_LAYOUT` 只能以真实 `parent_layout_node_id` 为定位参照；不可拆的虚拟居中组合和独立参照按现有结构核实共享回退。定位参照仍由 `ui_layout.position_reference_id` 决定，未声明时为真实父级，已有 `reference_id` 必须一致。

`ANIMATION` 要求 `layout_owner=EXTERNAL`，并填写 `ui_layout.position_behavior`：`kind` 为 `drag|pointer-follow|world-follow|transition`，`reason`、`trigger`、`restore_rule` 明确用途及交接，`properties` 只含当前节点的 `x/y` 且非空无重复，`restore_driver` 为 `DOM_LAYOUT|SHARED`。行为期间维持唯一位置写入者；该记录不能授权普通静态坐标或改变其他节点、尺寸。

V5 活动 DOM 节点的 `component_snapshot.dom_layout` 保留实际计算样式：`parent_id`、`position`、`parent_display`；绝对/固定 CSS 定位还须记录实际 `containing_block_id` 及 `inset.left/right/top/bottom`。双轴至少各有一个实际非 auto 的有限 px/% 边距，包含块与本节点的真实布局父级一致。自然流、Flex/Grid 由真实父容器排布。采样从同一节点的 `getComputedStyle`、真实 DOM 父级和包含块取得，不能按计划回填；原生机制记录与实际矩形仍按各自合同核对。数据一致性不认证采集来源，也不等同完整 CSS 求解或全部视口运行通过。

实际 DOM 固定边距沿用本栈中心采样的 `0.5 logical-px` 量化预算，容纳原生小数布局读数；Canvas HUD 保留其原有数值精度。该预算不适用于其他引擎，也不授权修改停靠方向或设计间距。

`size_driver` 按 `size_policy` 派生：`FIXED → FIXED`、`CONTENT → CONTENT`、`STRETCH/FLEX → SHARED`。拉伸或弹性尺寸可以明确声明 `DOM_LAYOUT`；固定和内容尺寸必须分别由 `FIXED` 与 `CONTENT` 驱动，不能声明冲突的写入者。

## 派生结果

调用 `deriveLayoutExecutionPlans(nodes)` 会返回深拷贝，并只给业务节点添加以下四个字段：

```json
{
  "position_driver": "SHARED",
  "size_driver": "FIXED",
  "reference_id": "panel",
  "image_mode": "PRESERVE_ASPECT"
}
```

`image_mode` 为 `NONE`、`PRESERVE_ASPECT` 或 `NINE_SLICE`。Sprite 普通图片使用 `PRESERVE_ASPECT`；只有已冻结 `nine_slice.mode=stretch` 的合格图片底板使用 `NINE_SLICE`。纯结构容器不能获得九宫格计划，固定皮肤要求九宫格决策时不得省略决定。

图片源像素属于纹理内容，不是 CSS 或 HUD 尺寸。计划不会复制源像素尺寸；普通图片的运行内容必须保留源图宽高比，九宫格源尺寸必须继续等于已冻结的 `nine_slice.source_size`。`layout_execution` 不控制满幅背景的 cover、UV 或裁切，这些继续使用既有满幅背景合同。

合成根只允许 `layout_node_id=viewport/safe-area`、`is_root_container=true` 和 `parent_layout_node_id=null`，根节点不带 `layout_execution`。业务节点即使声明根标记或占用根 ID，也必须失败，不能借此跳过驱动校验。

## 集成调用

在确认入口生成布局节点后、创建运行组件前调用派生器；最终导出前用 `validateLayoutExecutionNodes(nodes, errors, label, { requirePlan: true })` 检查计划是否缺失或被篡改。验证器会重新计算字段，发现计划与当前 `ui_layout` 不一致时拒绝执行。DOM/HUD 适配层应依照计划为位置和尺寸分别注册单一 writer，动画驱动也必须通过项目实际驱动注册表可观测。
