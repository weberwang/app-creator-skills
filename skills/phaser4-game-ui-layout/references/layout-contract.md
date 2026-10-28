# UI 布局合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#ui-布局合同)。

## 合同身份与范围

schema 1.2.0 根对象包含 `fidelity`、`frozen_visual_target`、`layout_nodes`、`critical_alignments` 和 `parity_cases`。普通布局使用 `not-applicable/not-applicable`，`layout_nodes`、`critical_alignments` 和 `parity_cases` 都是空数组；冻结目标使用 `specified` 或 `verified`，场景先绑定拆解确认中的 `decomposition_elements`，再登记后置生成的布局节点。冻结目标还记录 `visual_baseline_version`。verified parity 的 scene/state 必须属于 scope，合同版本和视觉基线版本必须分别等于根合同与冻结目标；`actual_test_id` 必须等于 `planned_test_id`。冻结目标节点的 `ui_layout` 按[节点组织规则](./layout-hierarchy.md)声明，并纳入布局合同身份哈希；职责变化须重新确认受影响的 V3 方案。

`regions` 是声明式布局区域；`decomposition_elements` 是效果图拆解阶段确认的元素事实，`layout_nodes` 则是确认后由元素 bounds 与显式功能归属推导出的可装配几何节点。普通布局 `fidelity.applicability=not-applicable` 必须使用空数组；`frozen-target` 合同在布局完成门才声明至少一个布局节点。布局节点把效果图的目标几何与 Phaser 运行时的唯一布局入口绑定，不能用整屏截图、隐藏覆盖层或散落的绝对坐标替代。

## 全局响应式视口合同

任何可见 Scene、HUD、弹窗或 `DISPLAY_LAYER` 都必须在根对象声明以下字段：`logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr`、`scaleMode`、`cameraViewportPolicy`、`cameraZoomPolicy`、`cameraOriginPolicy`、`inputCoordinatePolicy`、`safeAreaPolicy`、`resizePolicy`、`orientationPolicy`、`textResolutionPolicy`、`assetResolutionPolicy`、`performanceBudget`、`representativeViewports` 和 `requiredRuntimeEvidence`。这些字段是事实合同，不绑定某个临时函数名；缺失、用旧字段替代或只写一句说明均不能通过。

`logicalViewportSpace` 的单位固定为 CSS 逻辑像素（`css-px`/`css-logical-px`）。布局、safe area、断点、点击区域、`gameSize`、Camera viewport、Camera zoom 和程序化文字排版都在该空间计算。`canvasBackingPolicy` 必须明确 `backingWidth = ceil(cssWidth × effectiveDPR)`、`backingHeight = ceil(cssHeight × effectiveDPR)`，并声明 backing 是物理像素；物理 backing 像素不得直接作为布局坐标或命中坐标。CSS display 尺寸、逻辑尺寸和 backing 尺寸必须分别记录，不能把一个数值重复贴到三种空间。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#全局响应式视口合同)。

Canvas 必须填满真实 CSS 视口，布局合同的 `scaleMode` 固定为项目自定义的 `custom`，不能用 `FIT` 留黑边。Phaser `Scale.RESIZE` 可在适配器内部负责画布尺寸更新，但不作为合同值，也不能替代项目对逻辑尺寸、CSS 尺寸、物理 backing、`gameSize`、Camera viewport/zoom/origin 和输入映射的计算与实证；单独声明模式或构建成功都不是高分屏兼容证明。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#全局响应式视口合同)。

## V3 串行拆解与布局标注

拆解先按[功能语义分组约束](./functional-semantic-grouping.md)确认区域、功能组件、部件和独立元素。最终元素包含显式 `parent_element_id` 与 `semantic_grouping.kind/rationale`，父级表达实际功能或布局归属；独立位置依赖写入 `ui_layout.position_reference_id`。图标与文字可以同属按钮 Container 并相互参照定位。布局不按几何包含、类型或位置依赖自动改父级；父级、独立参照或显式溢出发生变化时重新确认受影响拆解。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

效果图还原节点分别建立实际父级与定位参照：父级只能是已声明容器或稳定根 `viewport`/`safe-area`；有效 `reference_id` 来自独立 `position_reference_id` 或默认父级。独立参照允许同 scene/state、同坐标空间的兄弟、祖先或稳定根，不能指向任意跨分支叶子、全屏装饰背景或自身；父边与参照边合并后无环。`parent_target_bounds` 与真实父框逐字段一致，`reference_target_bounds` 与定位框逐字段一致。所有入口消费同一份 viewport/safe-area 根矩形，安全区必须位于 viewport 内，不得将已有安全区扩大为画布。无显式溢出时子框须完整落在父框内；`ui_layout.visual_overflow` 只允许越出非根父框。`relative_position` 按真实父框计算四边有符号距离，允许溢出产生负值但不得伪填；`offset` 按有效定位参照计算。浮点误差不超过 `1e-6`。

`axis_alignment.horizontal` 显式选择 `left/center/right`，`vertical` 显式选择 `top/center/bottom`，不按最近边或测量阈值推断。中心轴按[居中策略](./center-alignment.md)默认 strict，有意偏移使用带数值和理由的 reference；组合按联合矩形整体计算。生成器仅平移布局目标并复算几何，不回写 proposal 原始 bounds。`offset` 按有效参照计算，`self_anchor`、`reference_anchor` 为 `${vertical}-${horizontal}`。确认器从 proposal 与决策复算，结构、中心策略或成员变化后重新确认受影响布局。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

普通布局的 `reference_id` 可以指向已声明区域或具体布局节点；effect-image 使用已确认的具体节点或稳定根，并分别检查功能归属与定位参照。当一个区域绑定多个布局节点时，普通布局也必须指定具体节点以消除歧义。所有依赖都必须有可读取的同批次几何，禁止自引用或循环引用。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

`regions.origin_applicability` 必须区分 `display-object` 与 `layout-only`：可设置资源原点的对象默认将 `origin` 写为 `center`，运行时对应 `(0.5, 0.5)`；非中心值须在该稳定 ID 的区域中填写 `origin_exception.reason` 与 `origin_exception.coordinate_conversion`。纯布局边界与无资源原点的 Container 使用 `layout-only` 和 `origin=not-applicable`，只表达布局参照，不调用不存在的原点接口。跨层的背景、世界、特效、HUD 和瞬态层顺序按[显示对象锚点与显示层分层](./display-object-layering.md)规划；局部 `z_index`/`z_order` 不得替代跨层合成顺序。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

## 目标与尺寸

全屏 UI、带底板弹窗和无底板弹窗分别使用场景、底板功能容器和宿主场景的逻辑尺寸作为布局边界，详见[场景与弹窗尺寸参照](./layout-hierarchy.md#场景与弹窗尺寸参照)。底板 Container 的 `target_bounds` 与面板逻辑矩形一致，底板图片与内容共用该父级；内部独立定位参照不改变功能归属和面板尺寸。不能将有底板弹窗整体改为全屏尺寸，也不能以无底板弹窗的内容包围盒代替宿主尺寸。安全区约束继续生效，独立全屏背景不参与前景定位。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#目标与尺寸)。

## 断点与结构

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#断点与结构)。

## 安全区、滚动与覆盖

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#安全区滚动与覆盖)。

## 动态内容与文字

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#动态内容与文字)。

效果图还原的可见文字由场景合同中的 `text_decomposition` 独立管理：有文本时使用 `applicability=has-text` 并逐项登记稳定 `text_node_id`、`region_id`、`layout_node_id`、文案来源、语义角色、动态/本地化标记、目标 bounds 和完整 typography facts；确实没有文本时使用 `not-applicable` 并填写 reason。V4 必须为每个文本节点选择 `phaser-text`、`bitmap-text`、`image-text` 或 `hybrid`，说明路线理由、所有权和实际资源依赖。动态或本地化文字不能烘焙为 `image-text`；图片字标仍要保留可访问语义。原字体未知时保留 `observable_facts`，不能猜填 family，并明确替代字体或位图方案。V5 逐节点记录实际 renderer、字体加载与 fallback、actual/glyph bounds、baseline、测试 ID 和证据，并把 target/candidate 差异绑定预声明 tolerance 或精确例外。

### 文字路线判定

先按[完整拆解与视觉显著性](../../phaser4-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)判断文字承担的视觉作用、内容变化与复用需求，而不是把所有文字统一指定为系统文本或位图。明显美术标题优先使用独立字图；带统一字形风格的提示根据文案是否固定选择字图或位图字体；视觉特征不明显的操作标签优先考虑 `phaser-text`。字体替代及低显著性差异只在适用的 `usability` 拆解方案中明确说明，原字体未知仍保留观察事实，不能把所选替代字体冒充原字体。

选择 `phaser-text` 后，当前字体和文字 renderer 必须实现方案要求保留的字形、排版、填色/渐变、描边、阴影、发光及其它效果，并说明可核验实现依据；能够显示相同文案不足以证明美术文字还原。不能把非文本区域的“简单规则渐变可实现”直接套到文字，也不能在实现时静默删去已确认效果、猜用默认字体或提高容差使该路线通过。`exact` 或明确指定字体/效果时遵守精确要求。视觉来源与拆解标签遵循[程序还原资格与位图回退](../../phaser4-game-asset-integration/references/asset-production-routes.md#程序还原资格与位图回退)。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#文字路线判定)。

文本字号必须区分参考图物理像素与 Phaser 逻辑坐标：同时冻结 `reference_pixel_bounds`、逻辑 `target_bounds`、`font_size_unit=logical-px`、参考 DPR、glyph bounds 和 baseline。参考图中量到的 48px 不是可以直接写入 Phaser 的 `fontSize: 48px`；最终字号需结合逻辑 viewport、DPR、字体 ascent/descent、字距和实际 glyph bounds 验证。文字框尺寸通过布局节点统一计算，字形测量只作为运行时证据，不能用整体区域 bounds 掩盖字体 fallback、基线或断行偏差。

## 不变量与证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#不变量与证据)。

# 效果图还原布局绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#效果图还原布局绑定)。

## 本栈配套资料

- [布局校准](./layout-calibration.md)
- [游戏内文案](./game-copy.md)
- [`装饰性满幅背景`](../../phaser4-game-asset-integration/references/full-bleed-background.md)
- [离线布局审阅产物](./layout-review-artifacts.md)
