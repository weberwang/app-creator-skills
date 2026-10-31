# UI 布局合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#ui-布局合同)。

## 合同身份与范围

schema 1.3.0 根对象包含 `fidelity`、`frozen_visual_target`、`layout_nodes`、`critical_alignments` 和 `parity_cases`。普通布局使用 `not-applicable/not-applicable`，`layout_nodes`、`critical_alignments` 和 `parity_cases` 都是空数组；冻结目标使用 `specified` 或 `verified`，场景先绑定拆解确认中的 `decomposition_elements`，再登记后置生成的布局节点。冻结目标还记录 `visual_baseline_version`。verified parity 的 scene/state 必须属于 scope，合同版本和视觉基线版本必须分别等于根合同与冻结目标；`actual_test_id` 必须等于 `planned_test_id`。冻结目标节点的 `ui_layout` 按[节点组织规则](./layout-hierarchy.md)声明，并纳入布局合同身份哈希；职责变化须重新确认受影响的 V3 方案。

每个业务节点必须携带从已确认职责派生的 [`layout_execution`](./layout-execution.md)，分别声明位置、尺寸控制权和图片模式。`verified` 冻结目标还须在根对象提供 [`runtime_batch` 与 `component_snapshots`](./layout-runtime-evidence.md)，绑定当前场景、状态、候选和实际视口；缺失时不能以静态几何或截图替代。候选 ID 是控制面的不透明身份标识，不要求是文件摘要。

`regions` 是声明式布局区域；`decomposition_elements` 是效果图拆解阶段确认的元素事实，`layout_nodes` 则是确认后由元素 bounds 与显式功能归属推导出的可装配几何节点。普通布局 `fidelity.applicability=not-applicable` 必须使用空数组；`frozen-target` 合同在布局完成门才声明至少一个布局节点。布局节点把效果图的目标几何与 ThreeJS 运行时的唯一布局入口绑定，不能用整屏截图、隐藏覆盖层或散落的绝对坐标替代。

## 全局响应式视口合同

屏幕 HUD、DOM Overlay、适用的屏幕自适应平面内容、弹窗和 `DISPLAY_LAYER` 必须在根对象声明以下字段：`logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr`、`scaleMode`、`cameraViewportPolicy`、`cameraZoomPolicy`、`cameraOriginPolicy`、`inputCoordinatePolicy`、`safeAreaPolicy`、`resizePolicy`、`orientationPolicy`、`textResolutionPolicy`、`assetResolutionPolicy`、`performanceBudget`、`representativeViewports` 和 `requiredRuntimeEvidence`。这些字段表达项目事实和坐标策略，不是 three.js 内置布局 API；`scaleMode=custom` 表示由项目代码更新 `WebGLRenderer` 尺寸与 Camera 投影。字段名不绑定某个临时函数名；缺失、用旧字段替代或只写一句说明均不能通过。真正三维世界和透视关卡使用[三维世界视口合同](../../threejs-domain-contracts/references/world-viewport-contract.schema.json)，不适用本二维合同，也不需要二维固定设计视口。

`logicalViewportSpace` 的单位固定为 CSS 逻辑像素（`css-px`/`css-logical-px`）。布局、safe area、断点、点击区域和程序化文字排版都在该空间计算；合同中的 `gameSizeSpace` 仅为项目定义的逻辑视口字段，不代表 three.js 有 `GameSize` 类型。Camera viewport 按项目的 HUD/世界投影合同确定，不能把透视世界单位与 HUD 像素空间混为一谈。`canvasBackingPolicy` 必须明确 three.js `WebGLRenderer.setSize()` 按有效 DPR 将 backing 宽高向下取整，并声明 backing 是物理像素；物理 backing 像素不得直接作为布局坐标或命中坐标。CSS display 尺寸、逻辑尺寸和 backing 尺寸必须分别记录，不能把一个数值重复贴到三种空间。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#全局响应式视口合同)。

Canvas 必须填满真实 CSS 视口，`scaleMode` 使用 `custom`，表示由项目适配器定义填屏和逻辑视口映射；它是本项目合同字段，不是 three.js 的模式枚举。逻辑尺寸、CSS 尺寸、物理 backing、Camera 投影和输入映射之间的关系仍需实证；单独声明字段或构建成功都不是高分屏兼容证明。

Camera 合同必须说明逻辑 viewport 如何映射到物理 backing，zoom 不得偷换 DPR；`cameraOriginPolicy` 是坐标系原点约定，不对应 Camera 上的 `origin` 属性。输入合同必须说明 CSS client 坐标如何经过逻辑 viewport、Camera 再到世界/命中空间。弹窗和 `DISPLAY_LAYER` 默认继承宿主的 CSS 逻辑视口、有效 DPR、Camera/输入合同和 safe area；若使用独立 Camera，必须在自身合同声明并单独验证。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#全局响应式视口合同)。

## V3 串行拆解与布局标注

拆解先按[功能语义分组约束](./functional-semantic-grouping.md)确认区域、功能组件、部件和独立元素。最终元素必须包含显式 `parent_element_id` 与 `semantic_grouping.kind/rationale`；真实父级表达功能、状态、交互和布局管理归属，位置依赖通过可选 `ui_layout.position_reference_id` 单独记录，共同表达同一信息且互不依赖位置的元素必须列入同一个功能组件并保持同级。布局父级严格继承该归属，不按几何包含自动挑父容器。文字保持独立节点并归属对应信息组，不按类型集中归组。新增容器或归属变化必须回到拆解确认。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

效果图还原节点必须分别建立真实父级图与定位参照：`parent_layout_node_id` 只能引用另一个已声明的 `layout_node_id`，或稳定根 `viewport`/`safe-area`；`reference_id` 等于已确认的 `ui_layout.position_reference_id`，未声明时等于真实父级。独立定位参照只能指向同级、祖先或稳定根；父级边与参照边联合后不得自引用或成环。`parent_target_bounds` 必须逐字段等于真实父节点 `target_bounds`；`viewport` 根固定为 `{x:0,y:0,width:target_viewport.width,height:target_viewport.height}`，`safe-area` 根使用同批实际测量的唯一 bounds，所有根引用必须一致且位于 viewport 内。普通子节点应落在父框内；仅当 `ui_layout.visual_overflow.reason` 非空时允许视觉边界越出普通父框，父框自身不扩展，且节点仍必须位于稳定根安全区内。`relative_position` 必须按 `left=child.x-parent.x`、`right=parent.x+parent.width-child.x-child.width`、`top=child.y-parent.y`、`bottom=parent.y+parent.height-child.y-child.height` 相对真实父框逐项测量，允许有理由的负值；不接受手填近似，浮点误差不超过 `1e-6`。

`axis_alignment.horizontal` 依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果显式选择 `left/center/right`，`vertical` 显式选择 `top/center/bottom`。判断依据应明确来源；未经明确授权不得分析截图，事实不足时标记待定并集中澄清，不按最近边或测量阈值自动推断。四边距离只记录几何事实；运行时 `offset` 按选定对齐轴计算，其中 `center` 使用子中心相对父中心的有符号偏移。`self_anchor` 与 `reference_anchor` 必须是 `${vertical}-${horizontal}`（例如 `top-center` 或 `center-center`）。视觉决策文件、父子关系、相对距离、对齐、偏移和锚点都属于布局身份，任一变化都必须让旧确认失效。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

布局节点的 `reference_id` 在普通布局中可以指向已声明的 `regions` 或其他 `layout_node_id`；在 `effect-image` 中，它由可选 `ui_layout.position_reference_id` 决定，未声明时回退到真实父级。独立参照只能指向同级、祖先或 `viewport`/`safe-area`。当一个 region 只有一个布局节点时，普通布局可直接用该 region ID 作为参照；当一个 region 绑定多个布局节点时，region ID 参照会产生歧义，必须改用具体 `layout_node_id`。所有节点参照组成有向图，禁止自引用和环；因此不能通过一个孤立或循环的节点绕过布局合同。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

`regions.origin_applicability` 必须区分 `display-object` 与 `layout-only`：对 `THREE.Sprite`，中心 `origin` 可映射到 `Sprite.center=(0.5, 0.5)`；模型与其他 `Object3D` 以局部几何枢轴或父级 `Group` 实现坐标换算。非中心值须在该稳定 ID 的区域中填写 `origin_exception.reason` 与 `origin_exception.coordinate_conversion`。纯布局边界与不承担图像枢轴的父级使用 `layout-only` 和 `origin=not-applicable`，只表达布局参照，不调用不存在的通用原点接口。跨层的背景、世界、特效、HUD 和瞬态层顺序按[three.js 场景层级与显示层分层](./display-object-layering.md)规划；局部 `z_index`/`z_order` 不得替代跨层合成顺序。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#v3-串行拆解与布局标注)。

## 目标与尺寸

全屏 UI、带底板弹窗和无底板弹窗分别使用场景、底板功能容器和宿主场景的逻辑尺寸作为布局参照，详见[场景与弹窗尺寸参照](./layout-hierarchy.md#场景与弹窗尺寸参照)。场景参照对应 `viewport` 或与其同尺寸的职责根；底板参照对应显式功能容器，其 `target_bounds` 与底板布局矩形一致，底板位图与内容共用该父级。子节点的 `parent_target_bounds`、双轴锚点、偏移与比例/拉伸尺寸均来自已确认直接父级；不能让有底板弹窗的内容使用全屏尺寸，也不能让无底板弹窗使用内容包围盒尺寸。安全区作为可见性约束保留，独立全屏背景仍不参与前景布局参照。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#目标与尺寸)。

## 断点与结构

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#断点与结构)。

## 安全区、滚动与覆盖

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#安全区滚动与覆盖)。

## 动态内容与文字

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#动态内容与文字)。

效果图还原的可见文字由场景合同中的 `text_decomposition` 独立管理：有文本时使用 `applicability=has-text` 并逐项登记稳定 `text_node_id`、`region_id`、`layout_node_id`、文案来源、语义角色、动态/本地化标记、目标 bounds 和完整 typography facts；确实没有文本时使用 `not-applicable` 并填写 reason。V4 必须为每个文本节点选择 `threejs-text`、`bitmap-text`、`image-text` 或 `hybrid`，说明路线理由、所有权和实际资源依赖。动态或本地化文字不能烘焙为 `image-text`；图片字标仍要保留可访问语义。原字体未知时保留 `observable_facts`，不能猜填 family，并明确替代字体或位图方案。V5 逐节点记录实际 renderer、字体加载与 fallback、actual/glyph bounds、baseline、测试 ID 和证据，并把 target/candidate 差异绑定预声明 tolerance 或精确例外。

### 文字路线判定

先按[完整拆解与视觉显著性](../../threejs-game-asset-integration/references/asset-production-routes.md#完整拆解与视觉显著性)判断文字承担的视觉作用、内容变化与复用需求，而不是把所有文字统一指定为系统文本或位图。明显美术标题优先使用独立字图；带统一字形风格的提示根据文案是否固定选择字图或位图字体；视觉特征不明显的操作标签优先考虑 `threejs-text`。字体替代及低显著性差异只在适用的 `usability` 拆解方案中明确说明，原字体未知仍保留观察事实，不能把所选替代字体冒充原字体。

选择 `threejs-text` 后，当前字体和文字 renderer 必须实现方案要求保留的字形、排版、填色/渐变、描边、阴影、发光及其它效果，并说明可核验实现依据；能够显示相同文案不足以证明美术文字还原。不能把非文本区域的“简单规则渐变可实现”直接套到文字，也不能在实现时静默删去已确认效果、猜用默认字体或提高容差使该路线通过。`exact` 或明确指定字体/效果时遵守精确要求。视觉来源与拆解标签遵循[程序还原资格与位图回退](../../threejs-game-asset-integration/references/asset-production-routes.md#程序还原资格与位图回退)。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#文字路线判定)。

文本字号必须区分参考图物理像素与 ThreeJS 逻辑坐标：同时冻结 `reference_pixel_bounds`、逻辑 `target_bounds`、`font_size_unit=logical-px`、参考 DPR、glyph bounds 和 baseline。参考图中量到的 48px 不是可以直接写入 ThreeJS 的 `fontSize: 48px`；最终字号需结合逻辑 viewport、DPR、字体 ascent/descent、字距和实际 glyph bounds 验证。文字框尺寸通过布局节点统一计算，字形测量只作为运行时证据，不能用整体区域 bounds 掩盖字体 fallback、基线或断行偏差。

## 不变量与证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#不变量与证据)。

# 效果图还原布局绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-contract.md#效果图还原布局绑定)。

## 本栈配套资料

- [布局校准](./layout-calibration.md)
- [游戏内文案](./game-copy.md)
- [`装饰性满幅背景`](../../threejs-game-asset-integration/references/full-bleed-background.md)
- [离线布局审阅产物](./layout-review-artifacts.md)
