# Cocos UI 节点组织

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。

各技术栈统一使用 V0–V5；V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 节点树与父容器职责

> 适用技术栈：cocos、phaser、threejs。

每个父容器都必须至少承担一种可说明的职责：

> 适用技术栈：phaser、threejs。

空容器只有在占位用途明确时才能保留，例如确认过的动态列表槽位、后续状态内容的装配边界或具有布局/裁切职责的空内容框。标注其用途、预期内容或空置条件及负责人；单纯留白、图层整理或猜测未来需求都不足以建立容器。布局标注中的 `empty_container` 必须与拆解确认中的空容器状态一致。

## 场景与弹窗尺寸参照

> 适用技术栈：cocos、phaser、threejs。

在确定内部功能分组前，先明确页面或弹窗的布局边界；以下规则同时适用于 V3 拆解与布局、V5 正式实现：

> 适用技术栈：cocos、phaser、threejs。

这里的场景尺寸是已转换到 UI 布局坐标空间的实际可见逻辑视口，不是 Canvas backing 像素，也不能直接沿用固定设计基准的另一轴尺寸。底板尺寸使用其逻辑布局矩形，不使用纹理像素尺寸、透明留白或全屏遮罩尺寸。弹窗底板表示功能面板，不标记为全屏 `background`，也不应用满屏 cover。

> 适用技术栈：cocos、phaser、threejs。

安全区通过 `safe_area_policy` 等合同约束关键内容，不能把有底板弹窗的内容改为相对全屏安全区定位。场景尺寸或底板尺寸变化时，由同一幂等重排入口重新计算相对布局。底板有无、参照容器或其职责改变时，须更新 V3 拆解与布局确认；V5 不得在实现中静默改写冻结父级。

> 适用技术栈：phaser、threejs。

| UI 类型 | 布局父级与尺寸参照 | 节点表达 |
| --- | --- | --- |
| 全屏 UI | 场景；按场景的当前逻辑宽高相对布局 | 根参照使用 `viewport`；存在负责布局的页面根容器时，其 bounds 与场景逻辑视口一致。 |
| 有底板的弹窗 | 底板对应的功能容器；按底板的逻辑宽高相对布局 | 显式建立 `PopupPanel` 等 `component` 容器，bounds 与底板布局矩形一致；底板位图与内容归属该容器，容器本身相对场景定位。 |
| 无底板的弹窗 | 宿主场景；按场景的当前逻辑宽高相对布局 | 使用 `viewport`，或与场景逻辑视口一致且承担真实布局/状态职责的弹窗根容器；不能用内容包围盒代替场景尺寸。 |

## 推荐根节点

> 适用技术栈：cocos、phaser、threejs。

```text
UIRoot
├── BackgroundRoot       # 可全屏延伸，装饰边缘可裁切
├── SafeAreaRoot         # 关键操作和信息的安全区参照
│   ├── HUDRoot          # 场景常驻信息和操作
│   └── PageRoot         # 当前页面内容；空间不足时重排或滚动
└── DisplayLayerRoot     # 宿主规划槽位，不代表把瞬态 UI 并入 HUD
```

> 适用技术栈：cocos、phaser、threejs。

上述节点树表达 UI 父子职责，不代替整个场景的绘制前后顺序。背景、世界主体/特效、常驻 HUD 与瞬态层分别建立有名根层，按“显示层分层合同”（见本栈配套资料）声明合成顺序；各层内部才使用局部 `z_index`/`z_order`。布局停靠在左上角也不改变显示对象默认中心锚点。

## V3 组织事实

> 适用技术栈：cocos、phaser、threejs。

每个屏幕 UI 节点在确认的 `decomposition_elements` 中使用 snake_case 的 `ui_layout` 字段，至少记录：

> 适用技术栈：cocos、phaser、threejs。

`DELEGATE_TO_PARENT` 必须沿父链找到唯一的 `HIT_TARGET`，命中目标不得嵌套另一命中目标。`SCROLL` 只能由承担 `LAYOUT` 职责的容器管理。`minimum_size` 在 V3 校验声明值，在 V5 以真实视口测量确认可读和可点击尺寸。

> 适用技术栈：cocos、phaser、threejs。

```yaml
semantic_grouping:
  kind: part
  rationale: "该图标是购买按钮的视觉内容，与文字共同表达购买操作"
ui_layout:
  grouping_basis: [INTERACTION, POSITION]
  layout_owner: PARENT
  size_policy: FIXED
  overflow_policy: KEEP_VISIBLE
  safe_area_policy: INSIDE_SAFE_AREA
  interaction_policy: DELEGATE_TO_PARENT
  minimum_size: {width: 48, height: 48}
```

> 适用技术栈：phaser、threejs。

V3 继续严格按现有串行确认顺序执行：先生成人工可修改的拆解图与技术 JSON，人工确认最终 `decomposition_elements`；再由已确认元素生成显式布局决策与布局产物，人工独立确认布局图。未确认的拆解不得进入布局生成，父级不得由几何关系反推，空容器必须出现在确认拆解和布局标注中。

> 适用技术栈：phaser、threejs。

`semantic_grouping.kind/rationale` 继续描述 `region`、`component`、`part` 或 `standalone` 的语义归属与理由；`ui_layout.grouping_basis` 描述实际父级承担的职责。独立文字、图标和同一组件内其他互不依赖的内容继续列为同级，不按“同为文字”等类型合并。父子节点的几何字段、裁切字段和现有 `layout_nodes.size_policy` 等机器合同字段也必须按现有合同填写；`ui_layout` 不能替代它们。

> 适用技术栈：phaser、threejs。

示例字段与当前 `ui_layout` 合同使用 snake_case，枚举值使用大写：

> 适用技术栈：phaser、threejs。

这些字段作为 V3 人工确认事实，必须在拆解、生成布局节点及离线审阅资料中保持一致。布局节点原有几何、裁切和响应式字段仍按机器合同独立填写，`ui_layout` 不能替代它们。

## 背包格

> 适用技术栈：cocos、phaser、threejs。

```text
InventoryGrid              # LAYOUT：列数、间距、滚动内容
└── InventorySlot           # INTERACTION、REUSE：固定点击单位
    ├── ItemIcon
    ├── CountBadge           # POSITION：依赖格子角落定位
    │   └── CountText
    └── SelectionOutline    # STATE：随选中状态显隐
```

> 适用技术栈：cocos、phaser、threejs。

网格控制格子的尺寸与顺序，格子是单一命中目标和复用单元。角标依赖格子定位，数量文字属于角标；图标和选中框保持格子下的同级节点。内容超出可见高度时由网格/滚动视口处理，不把单格标成可溢出。

## 血条

> 适用技术栈：cocos、phaser、threejs。

```text
HealthBar
├── Track
│   └── FillClip             # CLIP：只裁切填充表现
│       └── Fill
├── DamagePreview            # 与 FillClip 同级，完整显示
└── ValueText                # 与填充宽度解耦
```

> 适用技术栈：cocos、phaser、threejs。

`FillClip` 的边界由血条内轨道确定，只有 `Fill` 需要裁切。受伤预览和数值文字保持在裁切区外，防止血量变化时被一并裁掉或挤压。需要展示的父子关系必须由拆解确认，不可仅以视觉覆盖或矩形相交决定。

## V2、V3、V4、V5 阶段接入

> 适用技术栈：cocos、phaser、threejs。

| 阶段 | 节点组织工作 | 确认与证据边界 |
| --- | --- | --- |
| V2 | 定义 `UIRoot`、背景/安全区/HUD/页面/显示层职责，声明坐标空间、安全区、视口和响应式计划。 | 记录节点树提案与溢出/输入基本策略；竖屏以 1080×1920 为设计基准按宽度适配，横屏以 1920×1080 为设计基准按高度适配，另一轴随视口变化。 |
| V3 | 先确认语义分组、直接父级和职责，再完成布局决策、节点几何和独立布局图确认。 | 拆解确认与布局确认仍是两个串行人工门；节点职责或父级变更需更新上游确认和受影响下游身份。 |
| V4 | 生产并验收节点所需正式资源。 | 绑定资源身份、来源和状态。 |
| V5 | 直接消费 V3 节点树与 V4 正式资源，在正式 Scene 中实现和校准 UI。 | 在代表性逻辑视口、安全区、resize 和状态下记录真实可见性、滚动/重排、裁切和命中结果；静态布局图不能代替运行证据。 |

> 适用技术栈：cocos、phaser、threejs。

V3 中只改变停靠或偏移、未改变父级与职责时，沿现有布局确认规则重新生成并确认布局产物；改变节点、父子归属、语义分组或容器职责时，必须回到拆解确认。V4/V5 的失败按“布局阶段门”（见本栈配套资料）处理，不新建第二套状态机。

## 背景与布局参照分离

> 适用技术栈：cocos、phaser、threejs。

V3 拆解与布局确认时校验这项规则，V5 正式场景实现时再次复核资源与节点的绑定。已有冻结节点错误绑定背景时，回到 V3 修正并重新确认节点来源，不在正式实现中偷偷改写冻结显示树。

> 适用技术栈：phaser、threejs。

全屏装饰背景是视口中的独立显示层，只负责自身的铺底、缩放与覆盖。背景图片不得成为其他元素的父容器、锚点或相对测量参照；前景节点显式使用 `viewport`、`safe-area` 或有功能职责的容器。背景节点独立归属 `viewport`，不放入可移动的功能容器；绘制顺序使用层级与 z-order 表达，不用背景父子关系表达。有底板的弹窗按上述尺寸参照规则建立底板功能容器，底板位图属于该容器的视觉部件，不属于这里的全屏装饰背景。

## 按钮

> 适用技术栈：phaser、threejs。

```text
PurchaseButton             # 一个 INTERACTION 命中目标
├── VisualRoot             # 可单独播放按压反馈
│   ├── Background
│   ├── Icon
│   └── Label
└── DisabledOverlay        # 随按钮状态显隐，不接收输入
```

> 适用技术栈：phaser、threejs。

`PurchaseButton` 管理命中、状态与生命周期。`Icon` 和 `Label` 同属购买信息并保持同级；`VisualRoot` 只在视觉内容确实需要一起动画时存在。子视觉节点标记 `DELEGATE_TO_PARENT` 或 `NONE`，避免多个重叠目标竞争点击。
