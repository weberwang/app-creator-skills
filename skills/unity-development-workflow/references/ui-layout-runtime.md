# 布局控制权与真实组件快照

V3 制定执行策略、V4 导入核对、V5 正式组合校准时读取。复用 `uwt_measure_layout` 采集实际几何和组件配置；不另建运行账本，不用计划、静态参数、截图或自报 PASS 代替实际读取。

## 每个属性只有一个写入者

在 `layoutBinding.uiLayout` 明确 `positionDriver` 与 `sizeDrivers.width/height`。位置、宽度、高度可由不同机制管理；同一时段同一属性只能有一个有效写入者。`layoutOwner` 仍表示责任归属，不能证明某原生组件存在。

| 机制 | 实际核验 |
| --- | --- |
| RECT_TRANSFORM | uGUI 的固定锚点、偏移和尺寸配置；不是持续执行 SetNativeSize 的组件。 |
| LAYOUT_GROUP | 活动父 LayoutGroup 负责子项位置；宽高按实际 childControl 与 Grid 规则判断。ignoreLayout 子项不计入父布局写入。 |
| CONTENT_SIZE_FITTER | 仅在相应轴 Fit 非 Unconstrained 时控制自身尺寸。 |
| ASPECT_RATIO_FITTER | WidthControlsHeight 仅写高度，HeightControlsWidth 仅写宽度；FitInParent/EnvelopeParent 同时写位置与双轴尺寸，None 不写。 |
| UITOOLKIT_LAYOUT | UI Toolkit 相对流位置和原生计算宽高，覆盖 USS/inline 固定尺寸、Auto、内容与 Flex；样式作为约束输入。 |
| UITOOLKIT_STYLE | UI Toolkit 的绝对定位。不能仅凭 inline style 推断 USS 尺寸来源。 |
| SCRIPT / ANIMATION | 实际安装并登记的脚本或动画组件，在活动时拥有声明属性。 |

例如父布局控制宽度、ContentSizeFitter 控制高度可以合法分工；两者同时写宽度则失败。布局和动画按明确状态交接控制权，不采用每帧互相覆盖后恰好看起来正确的做法。视口、安全区、文字和成员变化进入同一幂等布局入口，先计算内容尺寸，再按已声明位置机制定位；无需每帧重排。

## 原图与显示尺寸

SPRITE 节点通过 `uiLayout.imageSizing` 明确尺寸意图：

- `NATIVE`：uGUI Image 使用正式 Sprite 的原生尺寸。采集 Sprite.rect、Sprite PPU、Canvas reference PPU、Image.pixelsPerUnit 和实际 RectTransform 本地尺寸。原生宽高按 `sprite.rect / image.pixelsPerUnit` 核对；`pixelsPerUnitMultiplier` 不进入这个 SetNativeSize 换算。屏幕 bounds、节点缩放与本地内容尺寸分开，不以屏幕像素反写 Sprite 尺寸。
- `EXPLICIT`：明确的设计尺寸/缩放，填写具体 `reason`，防止无意拉伸被包装为适配。
- `SLICED`：沿既有 `nineSlice` 冻结源尺寸与四边 Border；uGUI 读取实际 Sliced/Image Border，UI Toolkit 读取实际切片样式。切片最小中心与消费者验证仍使用[九宫格合同](./nine-slice-ui.md)。

UI Toolkit 背景图和 VisualElement 的布局尺寸独立，不拥有 uGUI Image/SetNativeSize 语义，不能直接套用 Cocos RAW 或源像素等于逻辑点的规则。纯结构和文字节点不伪造图片尺寸计划。

## 同批采集

从 V3 布局包为当前目标视口与状态准备 `layout-measurement` Job，设置：

- `includeComponentSnapshots: true`、当前 `stateId` 和实际 Work Item 的 `evidenceRoot`；`outputPath` 必须位于该根内，使用新版本文件名。
- 每个目标记录布局包中的实际节点 `id` 与实际父路径，另写 `referenceId`；实际参照使用 `referenceObjectPath`、`referenceElementName` 或 `referenceRoot` 三者之一。逻辑根使用小写 `viewport`/`safe-area`，对应同批实际 viewport/safe-area 矩形，不假定场景中存在同名 GameObject；普通业务节点的 `parentElementId` 必须对应真实直接父节点。默认实际参照为父节点，但稳定参照 ID 仍须明确。
- 同批业务节点全部覆盖，包含当前状态下不活动的节点。计划 `expectedActive` 省略时为 true，隐藏节点显式为 false。

Toolkit 只读加载场景，从实际 Screen/Canvas/Panel 取得同批 viewport、安全区、节点、父框和参照框，生成 `measurementSource`、`runId`、`generatedAtUtc`、`frameCount`、状态与实际组件快照。安全区换算只应用一次。不能混 Canvas、Panel 或坐标单位，不把缺少安全区快照当作全屏。

非活动节点保留组件实际配置，`positionWriters/widthWriters/heightWriters` 为空；无可用几何时记录空矩形和 `INACTIVE`，不伪造正尺寸或零边距。父节点不活动时后代不能自称活动。

## 外部写入登记的边界

uGUI 目标或 UIDocument 上的 `LayoutWriterRegistration` 只登记取证事实，不执行布局。每项绑定真实 `Behaviour writer`、SCRIPT/ANIMATION、负责的属性；UI Toolkit 还用 `elementName` 绑定具体元素。采集器核对真实组件身份与 `isActiveAndEnabled`，禁用组件不计作有效写入者。

该机制覆盖原生组件和已登记写入者，不能证明任意未登记脚本没有写布局。实现负责人仍须审查脚本、动画曲线与生命周期入口，补齐登记；不能把组件类型扫描当作完整行为证明。重复登记或多个实际机制争写属性必须暴露为冲突。

UI Toolkit 的外部尺寸交接按实际 Flex 控制轴和明确 inline 固定尺寸判断；`resolvedStyle` 不提供 USS 规则来源，本检查器不解析整套 USS。依赖复杂 USS 与脚本共同约束的尺寸仍需审查实际交接，不能用宽高快照证明所有样式来源都已排除。

## 校验与控制面

```powershell
node .\.agents\skills\unity-development-workflow\scripts\workflow-files.mjs layout-runtime-check --project-root . --plan docs/layout-plan.json --source .workflow-control/evidence/current/layout-run-1.json
```

显式运行上述文件工具：它读取传入的布局计划和报告，检查同批根、节点覆盖、父/参照绑定、属性控制权、原生尺寸和中心关系，并读取计划引用的拆解、Prefab 结构与 VERIFIED 装配材料进行对账。V5 测量节点的 `id` 必须对应布局包节点 `id`，不得改用 `decompositionElementId` 或临时别名。声明 targetRect/tolerance 的节点从报告矩形重新计算 delta 并检查 maxAbsDelta；未声明容差时仍按适用结构、边界、中心与尺寸规则检查，不将默认 usability 升级为整屏 exact。报告或节点为 FAIL 时修复后重验。工具只核对提交的数据，不能证明报告确由 Unity 采集，也不读取运行中的正式对象；采集来源和 scene/state/candidate 等身份须由执行者与当前工作项另行核对。

Unity 原生实施包可用 `uiLayoutPlanRef: {path}` 引用布局计划，计划引用 `splitPlanRef` 与 `prefabStructureRef`；V5 原生测量材料可用 `uiLayoutMeasurementRef: {path}` 引用报告，计划还须引用 `prefabAssemblyRef`。这些是 Unity 原生合同字段，公共 Evidence Manifest 不提供此字段，公共控制器的 `check/status/run` 和状态迁移目前不会自动调用布局引用链校验。执行者须在 V5 显式运行 `layout-runtime-check` 并保存实际命令、结果和当前证据根内报告；另核对候选、对象、scene/state/displayLayer 和宿主身份。已有关联的装配引用须检查；技术修复后 `repair + revalidate`，不改写历史确认。公共控制器对冻结目标和确认引用仍按其合同核对摘要。

V5 先将装配节点 `name` 与 uGUI 实测 `objectPath` 的末段或 UI Toolkit 的 `elementName` 对应，再核对实测父路径和定位参照。本检查验证节点身份、层级与布局事实；当前测量器没有采集 Prefab 实例来源 GUID，资产来源验收仍需相应资源证据。

本合同的测试夹具只验证工具，不能用作正式场景运行证据。截图仍由用户人工检查；工程与几何通过不代表显示效果已验收。
