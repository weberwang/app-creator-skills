# 布局控制权与真实组件快照

V3 制定执行策略、V4 导入核对、V5 正式组合校准时读取。复用 `uwt_measure_layout` 采集实际几何和组件配置；不另建运行账本，不用计划、静态参数、截图或自报 PASS 代替实际读取。

## 每个属性只有一个写入者

在 `layoutBinding.uiLayout` 明确 `positionDriver` 与 `sizeDrivers.width/height`。位置、宽度、高度可由不同机制管理；同一时段同一属性只能有一个有效写入者。`layoutOwner` 仍表示责任归属，不能证明某原生组件存在。

普通 UI 的相对停靠、原生优先、可核实的共享布局回退和功能位置交接按[布局计划](./ui-layout-plan.md#普通-ui-的原生停靠)声明。uGUI 使用或恢复到 `RECT_TRANSFORM` 时回读的 `anchorMin`、`anchorMax`、`pivot` 必须与当前计划一致；仅移动业务节点的脚本不能代替可表达的原生停靠。对于普通 HUD 的非居中轴，除父容器原生排布或明确功能行为外，依据当前参照核对设计边缘间距。功能行为只允许在声明的坐标空间和有限范围内接管，须保留实际注册写入者和原生恢复依据，恢复后另采集正常布局状态。uGUI 的 `CANVAS_LOCAL` 行为范围对应同批 `anchoredPosition`，UI Toolkit 的 `UI_TOOLKIT_PANEL` 对应 Panel 内实际矩形坐标。

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
- `SLICED`：沿既有 `nineSlice` 冻结源尺寸与四边 Border；uGUI 读取实际 Sliced/Image Border，且 `pixelsPerUnitMultiplier` 必须严格为数字 `1`；UI Toolkit 读取实际切片样式，且 `sliceScale` 必须严格为数字 `1`。该硬约束同时适用于被计划误标为其他尺寸模式的实际切片组件，不允许默认补值或用近似容差放行。切片最小中心与消费者验证仍使用[九宫格合同](./nine-slice-ui.md)。

UI Toolkit 背景图和 VisualElement 的布局尺寸独立，不拥有 uGUI Image/SetNativeSize 语义，不能直接套用 Cocos RAW 或源像素等于逻辑点的规则。纯结构和文字节点不伪造图片尺寸计划。

## 同批采集

从 V3 布局包为当前目标视口与状态准备 `layout-measurement` Job，设置：

- `includeComponentSnapshots: true`、当前 `stateId` 和实际 Work Item 的 `evidenceRoot`；`outputPath` 必须位于该根内，使用新版本文件名。
- 正式文字回读使用当前工作项 `taskId`、目标 `candidateId` 与 `layoutPlanPath`。Unity 读取冻结计划文件并将其 SHA-256 写入该批报告的 `layoutPlanSha256`。
- 每个目标记录布局包中的实际节点 `id` 与实际父路径，另写 `referenceId`；实际参照使用 `referenceObjectPath`、`referenceElementName` 或 `referenceRoot` 三者之一。逻辑根使用小写 `viewport`/`safe-area`，对应同批实际 viewport/safe-area 矩形，不假定场景中存在同名 GameObject；普通业务节点的 `parentElementId` 必须对应真实直接父节点。默认实际参照为父节点，但稳定参照 ID 仍须明确。
- 同批业务节点全部覆盖，包含当前状态下不活动的节点。计划 `expectedActive` 省略时为 true，隐藏节点显式为 false。

Toolkit 只读加载场景，从实际 Screen/Canvas/Panel 取得同批 viewport、安全区、节点、父框和参照框，生成 `measurementSource`、`runId`、`generatedAtUtc`、`frameCount`、状态与实际组件快照。安全区换算只应用一次。不能混 Canvas、Panel 或坐标单位，不把缺少安全区快照当作全屏。

非活动节点保留组件实际配置，`positionWriters/widthWriters/heightWriters` 为空；无可用几何时记录空矩形和 `INACTIVE`，不伪造正尺寸或零边距。父节点不活动时后代不能自称活动。

## 文本与世界文字的取证边界

UniText 与固定 JSON 文案按[文本与国际化](text-and-localization.md)验证所有消费者，不能把本页几何报告作为插件安装、配置加载或语言切换证据。uGUI 测量器支持默认显示器的 Screen Space Overlay/Camera Canvas，也能按实际组件序列化属性回读文字样式；文字内容、字形生成和语言绑定仍须独立验证。

每个活动 `TEXT` 节点在 V3 布局计划的 `textStyle` 记录确认稿来源 `source` 和 `attributes`。每项包含语义名称 `name`、项目实际安装的组件完整类型名 `componentType`、实际属性 `propertyPath` 和已确认目标的 `expectedValue`。必须包含实际显示文字（content）、有效可见性（visible）、字体（font）、字号（fontSize）和字体颜色（fill，按确认稿记录文字本身的 RGBA 值），并逐项覆盖设计可核实的字重、行高、字距、对齐、换行、渐变和描边阴影等适用效果；设计事实不足时保持待验证。为同节点测量请求的 `textStyle` 填入对应 `name`、`componentType`、`propertyPath`。uGUI 从目标组件的序列化属性读取；UI Toolkit 从实际元素类型和当前 Unity 版本提供的 `resolvedStyle.属性名` 读取解析样式，并由文字元素的 `text` 属性读取内容。`content` 的实际值须与当前状态预期文本逐字一致，空白视为遗漏。`visible` 使用同类型文字组件和 `visible` 路径，核对实际启用与有效可见性。缺失、空白或隐藏文字阻止 V4 试装及 V5 验收。无法唯一定位组件或属性类型不支持时回报 `UNAVAILABLE`。字符串直接比较，浮点数采用不随地区变化的往返表示，布尔为 `true`/`false`，枚举为序列化整数，颜色为大写 `#RRGGBBAA`，资源引用为项目资源路径。字号和其他属性先明确相同单位与真实组件语义，不能直接比较不同单位。缺少快照、来源、属性或回读不匹配时该文字项保持未验证。

对于目标明确而采集器不支持的属性，使用项目已有 Unity Editor 测量接口实际回读并将补充 JSON 保存在当前 `evidenceRoot`。V5 的 `uiLayoutMeasurementRef.textEvidencePath` 引用该文件，独立运行 `layout-runtime-check` 时可用 `--text-evidence <项目内JSON路径>`。JSON 顶层记录 `measurementSource: UNITY_EDITOR_LOADED_SCENE` 及与布局报告一致的 `runId`、`frameCount`、`scenePath`、`stateId`、`uiSystem`。`measurements` 数组每项绑定同一节点 `id`、实际 `objectPath`（UI Toolkit 还需 `elementName`）和与采集器一致的 `textStyle` 属性数组。仅同批、同对象且与已有实测不冲突的属性参与目标比较。保留实际 Unity 采集调用及原始结果。无法获取时保持未验证并按真实约束调整计划或素材路线。

组件渲染材质的适用属性可使用 `material.color.<着色器属性名>` 或 `material.float.<着色器属性名>` 作为原生探针路径。支持的渲染材质来自当前 `Graphic` 或 `Renderer`，存在材质属性块覆盖时由项目原生探针补充实际读数。

V4 的 uGUI 布局含应显示的 `SPRITE` 节点时，采集包含图片及文字的完整组件快照。没有此类节点的 uGUI 与 World Space Canvas 目标可用同一采集器的 `textOnly: true`，使用 `uiSystem: UGUI` 并提供每个可见文字节点的 `id`、实际 `objectPath` 和 `textStyle` 探针。先把本批图文接入 V3 布局计划指定的正式场景并保存，再按[阶段门禁](../../app-workflow-control/references/version-visual-gate.md#实现验收与返工)在同一报告记录 `formalIntegration`。目标截图、可读性和遮挡由用户人工确认。

## 外部写入登记的边界

uGUI 目标或 UIDocument 上的 `LayoutWriterRegistration` 只登记取证事实，不执行布局。每项绑定真实 `Behaviour writer`、SCRIPT/ANIMATION、负责的属性；UI Toolkit 还用 `elementName` 绑定具体元素。采集器核对真实组件身份与 `isActiveAndEnabled`，禁用组件不计作有效写入者。

该机制覆盖原生组件和已登记写入者，不能证明任意未登记脚本没有写布局。实现负责人仍须审查脚本、动画曲线与生命周期入口，补齐登记；不能把组件类型扫描当作完整行为证明。重复登记或多个实际机制争写属性必须暴露为冲突。

父布局是否排除某一子项由采集器实际读取 `LayoutElement.ignoreLayout` 后计入位置写入者；当前快照没有保存该属性本身，离线检查不能从 `parentLayoutGroup.enabled` 单独重建参与事实，也不能认证该记录确由 Unity 产生。UI Toolkit 当前快照不含 USS 规则来源或 left/right/top/bottom 属性，工程检查只能核对同批实际几何与所记录写入者，跨视口的原生样式及完整行为须在真实 Panel 中另行验证。

UI Toolkit 的外部尺寸交接按实际 Flex 控制轴和明确 inline 固定尺寸判断；`resolvedStyle` 不提供 USS 规则来源，本检查器不解析整套 USS。依赖复杂 USS 与脚本共同约束的尺寸仍需审查实际交接，不能用宽高快照证明所有样式来源都已排除。

## 校验与控制面

```powershell
node .\.agents\skills\unity-development-workflow\scripts\workflow-files.mjs layout-runtime-check --project-root . --plan docs/layout-plan.json --source .workflow-control/evidence/current/layout-run-1.json
```

显式运行上述文件工具：它读取传入的布局计划和报告，检查同批根、节点覆盖、父/参照绑定、属性控制权、原生尺寸和中心关系，并读取计划引用的拆解、Prefab 结构与 VERIFIED 装配材料进行对账。V5 测量节点的 `id` 必须对应布局包节点 `id`，不得改用 `decompositionElementId` 或临时别名。声明 targetRect/tolerance 的节点从报告矩形重新计算 delta 并检查 maxAbsDelta；未声明容差时仍按适用结构、边界、中心与尺寸规则检查，不将默认 usability 升级为整屏 exact。报告或节点为 FAIL 时修复后重验。工具只核对提交的数据，不能证明报告确由 Unity 采集，也不读取运行中的正式对象；采集来源和 scene/state/candidate 等身份须由执行者与当前工作项另行核对。

Unity 原生实施包以 `uiLayoutPlanRef: {path}` 引用布局计划，装配交付沿用 `splitPlanRef`、`prefabStructureRef` 和 `prefabAssemblyRef`。公共工作流以既有 V3 布局确认的 `layoutSpecRef: {path,sha256}` 冻结相同计划，逐场景状态核对其拆解来源及文字目标。V4 有保留文字时，资源评审的 `textRestorationRef: {path,sha256}` 冻结本候选正式接入采集，与 V3 的布局计划、目标状态和文字内容逐项对照。报告的 `formalIntegration.entryRef` 指向已保存且与计划 `scenePath` 一致的正式场景，`formalIntegration.images` 绑定当前资源评审的图片及实际消费者。uGUI 可使用纯文字报告补充正式图片消费者身份，UI Toolkit 使用现有完整布局报告。V5 采集新的运行批次，有保留文字时，原生 Evidence Manifest 用 `uiLayoutMeasurementRef: {path,textEvidencePath?}` 关联实际采集，公共 Evidence Manifest 的当前目标 `runtime-layout` 项引用同一报告路径。正式 V5 门调用 `layout-runtime-check` 使用的原生运行校验，重新核对报告、计划摘要、工作项、候选、实际 Scene 与状态。技术修复后按现有流程复验。装配、交互和截图人工验收分别留在现有证据项中。

V5 先将装配节点 `name` 与 uGUI 实测 `objectPath` 的末段或 UI Toolkit 的 `elementName` 对应，再核对实测父路径和定位参照。本检查验证节点身份、层级与布局事实；当前测量器没有采集 Prefab 实例来源 GUID，资产来源验收仍需相应资源证据。

本合同的测试夹具只验证工具，不能用作正式场景运行证据。截图仍由用户人工检查；工程与几何通过不代表显示效果已验收。
