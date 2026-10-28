# UI 布局合同

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。

各技术栈统一使用 V0–V5；V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 全局响应式视口合同

> 适用技术栈：cocos、phaser、threejs。

`runtimeDprPolicy` 必须从设备动态读取，非法、零、负数、非有限或字符串值回退为 1，有效值严格位于 `(0, 2]`，原始值大于 2 时有效值封顶为 2。DPR 不是启动常量：resize 和显示密度变化都要重新读取；游戏方向固定为初始化选择的一个方向，仍须清理尺寸与密度监听器。`maxRuntimeDpr` 固定为数字 `2`。资源生产基线另由 `assetResolutionPolicy.productionDpr=1` 声明，和运行时 DPR 分离；1 表示图片生产倍率，不限制运行时 DPR；运行时仍动态封顶为 2。运行时代表性矩阵仍必须覆盖 DPR `1.25/1.5`。

> 适用技术栈：cocos、phaser、threejs。

游戏的 `orientationPolicy.allowed` 必须恰好包含一个 `portrait` 或 `landscape`，初始化时由用户选择，不从缺省值推断双方向支持。`designResolutionPolicy` 只要求声明 `allowed` 中方向的分支：竖屏基准为 1080×1920、按宽度适配；横屏基准为 1920×1080、按高度适配。实际 CSS 视口为 `W×H` 时，竖屏比例 `s=W/1080`、可见逻辑区域为 `1080×(H/s)`；横屏比例 `s=H/1080`、可见逻辑区域为 `(W/s)×1080`。设计区域在可见区域中居中，另一轴可以展开或裁切；安全区、UI 锚点和输入命中必须使用实际可见区域。横竖屏以运行时视口宽高判断，宽高相等时按横屏处理。

> 适用技术栈：cocos、phaser。

Camera 合同必须说明逻辑 viewport 如何映射到物理 backing，zoom 不得偷换 DPR，origin 必须显式声明；输入合同必须说明 CSS client 坐标如何经过逻辑 viewport、Camera 再到世界/命中空间。弹窗和 `DISPLAY_LAYER` 默认继承宿主的 CSS 逻辑视口、有效 DPR、Camera/输入合同和 safe area；若使用独立 Camera，必须在自身合同声明并单独验证。

> 适用技术栈：cocos、phaser、threejs。

`resizePolicy` 必须在同一页面完成，不得用刷新页面掩盖重排；resize、safe area 和 DPR 变化后至少重新计算逻辑视口、Canvas backing、safe area、Camera viewport、输入映射和文字排版。游戏不声明双方向，不要求 `orientation-change`；所有项目都必须覆盖所选方向内的连续 resize 与 DPR 变化。监听器必须可清理且重复计算幂等。允许在超预算时显式减少滤镜、RenderTexture 或透明全屏层，但不得静默降低 DPR、资源质量或文字清晰度。

> 适用技术栈：cocos、phaser、threejs。

`performanceBudget` 至少记录最大 Canvas backing、最大像素总量、RenderTexture、全屏滤镜、透明全屏层、代表性设备和真实测量结果。`representativeViewports` 按 `orientationPolicy.allowed` 覆盖类别：支持竖屏时要求窄/标准竖屏，支持横屏时要求横屏/桌面宽屏；单方向项目用该方向的窄宽尺寸覆盖，并仍包含 DPR 1、1.25/1.5、2 和原始 DPR 大于 2 的封顶样本。`requiredRuntimeEvidence` 必须要求 `viewportRect`、`canvasRect`、`designTransform`、`logicalSize`、`backingSize`、`cssDisplaySize`、原始/有效 DPR、两段缩放、Camera、safe area、边距、背景覆盖、关键 UI、输入命中、resize 轨迹、`pageReloaded`、截图及 scene/state、候选标识、合同/基线版本；`designTransform` 记录实际方向、设计宽高、适配轴、比例、可见逻辑区域及居中偏移，必须与当前 CSS 视口一致。缺少真实运行测量只能标记 `unverified`。

## V3 串行拆解与布局标注

> 适用技术栈：cocos、phaser、threejs。

布局图也允许按图上反馈人工修改；修改后必须重新生成最终布局图，并以独立 `layout-annotation-confirmation/1.0` 确认。用户默认直接检查布局 PNG，需要交互对照时检查同批 `review.html`，不需要先确认文字对齐方案或阅读技术决策。该确认同时绑定实际布局图文件、尺寸、schema/layout、metadata identity、`visual-decomposition-confirmation` 的 ID、proposal 文件、scene/state/target、用户原文和 receipt。任一图、元数据、布局关系或上游拆解身份变化都使旧确认失效；V3 最终完成门必须同时看到拆解图和布局图的两次人工确认。

> 适用技术栈：phaser、threejs。

冻结目标进入 V3 后，机器门固定执行两个串行阶段：阶段 A 先从冻结原图、区域与组件事实生成拆解标注图及技术 JSON，并产出有序 `decomposition_elements`；代理内部维护完整技术事实，用户只看拆解 PNG，可按图号提出修改，修改后重新生成 PNG，再以 `visual-decomposition-confirmation/1.0` 确认。阶段 B 只有在阶段 A 的最终图像确认通过后才能启动，布局入口必须按原顺序消费该确认绑定的 `proposal.decomposition_elements`，再推导后置布局节点，不得从预存 `layout_nodes`、未确认清单草案或原图自行识别元素。

> 适用技术栈：phaser、threejs。

阶段 B 生成独立 `layout-annotation/png/1` PNG：原图作为左侧底图，所有已确认父容器、子组件和空容器均需框出；相同层级使用相同确定性颜色，不同层级使用不同确定性颜色。PNG 元数据绑定 `layout_node_id`/`element_id`、`parent_layout_node_id`、`depth`、`color`、`bounds`、`empty_container`、`relative_position` 四边距离、显式 `axis_alignment`、锚点、布局决策文件身份及上游拆解确认身份。

> 适用技术栈：phaser、threejs。

图上每个框与右栏说明必须使用同一个唯一短编号，并显式列出父编号；编号按确认元素原序分配，合成根使用独立编号，不能为展示重排元素或改变 bounds。技术 ID 仅作为追溯信息，不能代替图上可见编号。密集小框的编号需避让，必要时用引线明确指向所属框。右栏为每个节点提供一份完整自身说明：类型、父级、水平左/中/右与垂直上/中/下停靠、自身/父级锚点及双轴偏移；父容器和空容器同样必须说明相对其上级的停靠方案，不能只列子组件或四边距离。根明确“无上级”，不伪造停靠关系。长说明按实际文字宽度换行并扩展画布高度，不得截断；机器校验同时检查编号映射、父子关系、方案内容与可见区域，元数据自报完整不能代替实际可读内容。

> 适用技术栈：phaser、threejs。

布局 PNG 生成时必须在 `--output` 所在的同一候选目录同步产出 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`。审阅页直接消费本批冻结参考图与节点数据，不能建立第二套坐标或关系规则；详细的两栏模板、离线约束、名称回退、下载字节、SHA 身份和错误门见“离线布局审阅产物”（见本栈配套资料）。

> 适用技术栈：phaser、threejs。

阶段 B 先由智能视觉判断读取原图与确认后的 `proposal.decomposition_elements`，按该列表逐项产出唯一的 `automatic-layout-decision/1.0` JSON：每个元素必须显式给出 `horizontal_alignment=left|center|right` 和 `vertical_alignment=top|center|bottom`。随后使用 `scripts/generate_layout_annotation.mjs` 生成布局 PNG；命令必须显式传入 manifest、project root、scene/state、输出路径、拆解确认 ID 和 `--layout-decision-file`；摘要参数不再必填。生成器拒绝缺失决策、非法枚举、元素漏绑、新增伪造、调序、越界或跨场景输入，不会按测量结果兜底猜测对齐，也不会生成多个布局候选或新的视觉参考图。

> 适用技术栈：phaser、threejs。

每个 `layout_nodes` 节点必须包含：

> 适用技术栈：phaser、threejs。

- `layout_node_id`、`region_id`、`coordinate_space`、`reference_id`。

> 适用技术栈：phaser、threejs。

- `parent_layout_node_id`、`parent_target_bounds`、`relative_position`、`axis_alignment`。

> 适用技术栈：phaser、threejs。

- `self_anchor`、`reference_anchor`、`offset`、`target_bounds`、`size_policy`。

> 适用技术栈：phaser、threejs。

- `z_order`、`clip_policy`、`responsive_rule`、`planned_test_id`。

> 适用技术栈：phaser、threejs。

`layout_node_id` 在节点集合内唯一；同一 `region_id` 可以绑定多个元素/layout nodes，但该区域 ID 必须同时存在于 `regions` 和 `scope.ui_ids`，`coordinate_space` 必须存在于 `coordinate_spaces`。`target_bounds` 使用目标 viewport 的逻辑坐标，四边均须为有限数值，宽高为正数，并完全落在 `scene_reconstruction_binding.target_viewport` 内。`offset` 是双轴偏移对象，可以是数值或项目定义的非空表达式；`size_policy`、`clip_policy`、`responsive_rule` 和 `planned_test_id` 不得为空。

> 适用技术栈：phaser、threejs。

模板的 `layout_node_example` 是可直接复制到 `layout_nodes` 的完整 effect-image 节点示例；它不是普通 `not-applicable` 合同的活动节点。切换到冻结目标时，应复制该示例、改成项目稳定 ID 和目标几何，并补齐场景绑定与关键对齐证据。

> 适用技术栈：phaser、threejs。

`regions` 自身仍是声明式布局区域，每个区域至少包含：

> 适用技术栈：phaser、threejs。

- `id`、`semantic_role`、`parent_space`、`reference_id`、`positioning`。

> 适用技术栈：phaser、threejs。

- `anchors.horizontal` 与 `anchors.vertical`，各自声明 `self`、`reference` 和 `offset`；两者必须有语义参照边界。

> 适用技术栈：phaser、threejs。

- `size.min`、`size.preferred`、`size.max` 和 `size.strategy`。

> 适用技术栈：phaser、threejs。

- `layout_group`、`z_index`、`layout_participation`、`scroll`、`input`、`clip`。

> 适用技术栈：phaser、threejs。

- `origin`、`layout_anchor`、`animation_offset`，三者不可互相代替。

> 适用技术栈：phaser、threejs。

`reference_id` 只能指向已声明区域，或保留边界 `viewport`；若使用 `safe-area`，必须先声明同名安全区区域。区域引用形成有向图；不得自引用或形成环。`parent_space` 必须存在于 `coordinate_spaces`，坐标空间 parent 也不得自引用或成环。所有 UI ID 必须唯一，稳定 ID 不使用随机值或运行时显示文本。

## 目标与尺寸

> 适用技术栈：cocos、phaser、threejs。

`targets` 只定义代表性设备视口的最小、首选和最大逻辑宽高、方向和宽高比，不能覆盖固定设计基准；`targets.orientations` 必须与 `orientationPolicy.allowed` 一致，三个示例目标也只能使用支持方向。`scale` 旧嵌套字段不再承担 DPR 或 backing 合同，相关事实统一写在根级响应式字段。`aspect_ratio.min/max` 必须是正数且顺序合理。`content` 定义 `max_width`、`columns`、`gaps` 和 `margins`；断点和布局关系仍必须使用逻辑像素，不能使用参考截图的物理像素直接硬编码。

> 适用技术栈：cocos、phaser、threejs。

容器尺寸策略可以是 `fixed`、`content`、`proportional`、`stretch`、`contain`、`cover` 或 `nine_slice`，但必须同时给出最小、首选和最大值；三档宽高须为正数或非空表达式，数值最小值不能大于最大值。图片本体默认按最终源帧逻辑尺寸还原，只有合法九宫格允许改变显示框；容器策略不能授权普通图片缩放，文字与图标也不能随九宫格皮肤拉伸。固定尺寸和悬浮元素需按实际约束审查；独立定位只允许弹窗、浮窗和 Toast 本体，内部 UI 必须保持相对关系。缺少实际父级、合法参照、策略或证据，以及普通 UI 使用独立定位时均拒绝；规则与字段见[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。

> 适用技术栈：cocos、phaser、threejs。

屏幕装饰性满幅背景必须在 `designResolutionPolicy.backgroundFit` 中冻结 `mode=cover-v1`、
`sourceFocalPoint` 和 `targetPoint`，并将同一组事实传给 QA 的 `viewport.backgroundFit`。算法与运行时证据遵循
“`装饰性满幅背景`”（见本栈配套资料）。
背景等比覆盖与根级 `scaleMode` 的 Canvas 映射是独立职责。屏幕装饰背景按独立 cover 合同适配；其余普通 UI 图片仍保持源逻辑尺寸，只有合法九宫格可按切片改变显示框。禁止以背景分类或容器缩放绕过前景图片规则。

## 断点与结构

> 适用技术栈：cocos、phaser、threejs。

普通静态布局允许 `breakpoints: []`；一旦声明断点，每个断点必须有非空 `when` 触发条件和 `structure_changes`。条件键和值、结构变化项必须是非空字符串或有效数值。条件可以基于宽度、高度、宽高比、方向、安全区或内容容量。必须明确变化的区域/列/导航/操作区，以及仍保持的关系。默认 `usability` 验证基准和代表性断点；只有 `exact` 或项目明确要求时才为每个断点执行临界三点 `breakpoint - 1`、`breakpoint`、`breakpoint + 1`。

## 安全区、滚动与覆盖

> 适用技术栈：cocos、phaser、threejs。

`platform_insets` 记录系统栏、圆角、刘海、Home Indicator、键盘、折叠和分屏输入，并覆盖零安全区与非零安全区。固定、悬浮或停靠元素在 `overlay_rules` 中记录遮挡检测、回退和输入优先级；区域的 `layout_participation` 为 `fixed-overlay`、`floating-overlay` 或 `docked-overlay` 时，必须存在相同元素和模式的覆盖规则。弹窗、抽屉和 Toast 的宿主关系、生命周期、遮罩、焦点恢复与上下文效果图不写成另一套布局状态机，而是在场景 `display_layer_planning` 中绑定对应 `layer_id`；V5 必须把这些 overlay 放回宿主场景同屏验证。

> 适用技术栈：cocos、phaser、threejs。

无滚动的静态 HUD 允许 `scrolling.axes: []`；一旦声明滚动轴，每个轴必须有唯一且非空的 `axis`、`owner_id`、内容区域、边界和手势优先级，禁止多个所有者争抢同一轴。`narrow_height_degradation` 必须声明 `trigger`、`strategy` 和 `fallback`，说明窄高度时折叠、重排或滚动的条件及关键动作可达性。

## 动态内容与文字

> 适用技术栈：cocos、phaser、threejs。

`dynamic_content.localization` 记录默认语言、最长文案、程序化文本开关、必需语言、增长、换行与截断策略。`programmatic_text=true` 时，`required_languages` 与项目已确认的语言清单一致；新项目默认简体中文 `zh-CN`，英语 `en` 等其他语言可选，既有项目沿用已确认的语言范围；`wrap` 必须为每种必需语言独立声明 `single-line` 或 `wrap`，允许部分语言单行、部分语言换行；`truncate_policy=forbid`、`growth=locale-adaptive`，并通过 `display_fit_evidence` 绑定全部所选语言的真实字形宽度、字体回退、基线、断行和容器适配证据。`copy_style=concise-gameplay` 要求文案在语义准确、玩家可理解的前提下保持短促、游戏化；倍率使用 `multiplier_format=x{value}`，如三倍奖励直接显示 `x3`，数值变化优先使用 `+10`、图标+数值等熟悉表达，不使用可由符号代替的解释性长句。空间不足时应遵守该语言的行布局策略，改短文案、调整字距/字号、扩展容器或合理换行，不能靠截断通过。`text_scaling` 记录默认和最大字号及 `strategy`。无关键动作的静态 HUD 允许 `key_actions: []`；一旦声明关键动作，其 ID 必须引用区域，状态至少包含 `default`、`disabled`、`submitting` 和 `completed`，并声明 `text_truncation`。关键动作不能使用不可恢复的单行省略。`reflow_events` 至少覆盖 `text-change`、`state-change`、`resize` 和 `safe-area-change`；合同还应覆盖动态数字、成员数量、创建/隐藏/销毁后的重排，以及按下、错误等扩展状态。

> 适用技术栈：cocos、phaser、threejs。

`copy_style=concise-gameplay` 按“游戏内文案”（见本栈配套资料）执行：图片、图标、数字、符号和视觉状态优先，可见文字仅补充必要语义，不把可直接表达的奖励、消耗或进度写成解释句。精确数值通过对应图标、正负号和上下文表达，不以「需要精确」为由追加重复说明。图标歧义、首次必要引导或操作后果仍需最少说明；仅图标控件保留无障碍名称，可不进入可见布局。证据覆盖重复说明、数值归属、必要信息完整性、通用图标堆叠和功能自解释性。

## 文字路线判定

> 适用技术栈：cocos、phaser、threejs。

- 固定美术文字优先以完整原子字标选择 `image-text` 或独立位图资源，保留整体字形、构图和跨字效果，不机械逐字拆分；即使程序能绘制其中部分效果，也不因此自动改用普通文本。效果可可靠分离且实际需要独立变化时，可用 `hybrid`，分别登记程序文字与位图效果，并保留可访问语义。

> 适用技术栈：cocos、phaser、threejs。

- 动态数值或本地化文字禁止烘焙为固定 `image-text`。可使用满足字形覆盖、字距、换行及效果要求的 `bitmap-text`，或确实能完整还原的混合方案；位图字形/效果依赖按图片合同登记，程序负责更新与排版，不把图片外观声明为纯程序绘制。

> 适用技术栈：cocos、phaser、threejs。

- 位图字体或混合方案也不能完整表达要求时，报告当前能力缺口并修订方案；不能仅因文案需要动态变化就改用缺少渐变或其它效果的普通文本。

> 适用技术栈：cocos、phaser、threejs。

例如战斗失败弹窗：顶部「战斗失败」的金属立体字、破损裂纹、厚描边与跨字火光共同构成情绪字标，整段拆为一个独立位图，与边框、徽章分开；下方失败提示的倾斜字形、粗字重、描边/阴影形成统一提示风格，固定文案可整段用图片，需更换文案或复用风格时用覆盖所需字符的位图字体；按钮「返回」主要表达操作，字形没有同等显著的定制材质，可用系统文本，并把蓝色发光按钮底板作为独立图片部件。三类文字分别登记节点、语义与资源依赖，按钮文字和底板仍由同一功能组件统一处理交互与状态，不能把按钮或整屏烘焙为不可交互的图片。

## UI 布局合同

> 适用技术栈：phaser、threejs。

布局合同是某个场景、状态和候选的可验证关系规范。它不是流程状态机，也不能自动批准、自动合并或替代 F0–F4。视觉验证通过 `visual_validation.mode=usability|exact` 选择严格程度，默认 `usability`；effect-image 不自动启用 `exact`。模板采用 JSON-compatible YAML：文件是合法 YAML 1.2 的 JSON 子集，验证器使用 Node.js `JSON.parse` 解析。

## 不变量与证据

> 适用技术栈：phaser、threejs。

`invariants` 的每一项都包含稳定 ID、非空描述/表达式、非空且全部有效的适用区域、非负容差和 `evidence.automation`/`evidence.visual` 字符串项。关系表达优先描述相对中心、边界距离、间距、遮挡和断点结构，而非一个孤立屏幕坐标。`evidence_matrix` 必须绑定同一候选、合同版本、动态封顶 2 的 DPR 策略和已执行的视口条件；默认 `usability` 覆盖基准及代表性窄/宽、项目支持方向和关键状态，验证关系不变量与可用性。只有 `exact` 或项目明确要求时才覆盖断点邻值、宽高、字号、本地化、安全区、动作态、DPR、动态值、Scene 生命周期和覆盖层/键盘/滚动的完整组合；游戏只验证初始化选择的单方向，不要求跨方向切换轴。精确矩阵启用 Golden 精确视觉。

> 适用技术栈：phaser、threejs。

`critical_alignments` 用于冻结目标中的关键 UI/HUD：通过 `layout_node_id` 绑定布局节点，`element_id` 等于对应 `region_id`。`reference_id` 可指向稳定 region、`viewport` 或具体节点；多节点 region 必须指定具体节点。两种模式均保留唯一 ID、双轴关系、目标证据、双方身份和测试计划；verified 需要真实运行测量、运行证据与通过结果。默认 `usability` 不强制整屏精确测量或全矩阵；但项目显式提供 `tolerance` 时，该项必须绑定真实目标矩形，verified 按同空间 x/y/width/height 实测差值校验容差，不能用手写通过或伪造 delta 放行。支持 `px/logical-px/css-px/css-logical-px`，不能用未经换算的比例单位。未声明容差的普通项允许合理的位置和尺寸差异；`exact` 仍强制完整几何与四轴 delta 等材料。目标或布局结构实质变化才重新确认，普通运行态微调原地验证。正式场景的校准、边距和素材可见边界口径见“布局校准”（见本栈配套资料）。

> 适用技术栈：phaser、threejs。

`parity_cases` 不可变绑定 scene/state、已执行 viewport、实际有效 DPR（(0,2]）、语言、随机种子、输入轨迹、稳定帧/动画采样、合同/基线版本、双方证据、容差、例外 ID 与结论。默认 `usability` 只需代表性案例；`exact` 或明确全覆盖需求才要求完整视口/状态组合。依据实际目标、上游事实和当前要求判断证据是否仍可复用，SHA 变化不使证据失效。

> 适用技术栈：phaser、threejs。

specified 可只做结构检查；verified 必须追加 `--check-files --project-root .`，验证冻结原图可读取，并拒绝缺失或逃逸项目根目录的目标、运行及 parity 证据路径。

## 效果图还原布局绑定

> 适用技术栈：phaser、threejs。

当布局服务于 `effect-image` 时，根节点可声明 `scene_reconstruction_binding`，其中必须包含 `scene_id`、`state_id`、`target_viewport`、`visual_baseline_version`、`reconstruction_contract_version`和 `layout_decomposition_version`；`layout_contract_sha256` 可选且不参与验收。`layout_contract_sha256` 是布局合同身份哈希，不是整个文件的递归自哈希：可供内部追踪的合同身份投影（合同 ID/版本、目标 SHA、scene/state、目标 viewport、布局拆解版本、布局决策文件身份，以及按已确认 `decomposition_elements` 原顺序排列的节点 ID、区域、坐标空间、父节点 ID、父目标 bounds、四边相对距离、显式轴向对齐、参照、锚点、偏移、目标几何、尺寸/裁切/响应式策略、层级和计划测试 ID）可计算确定性追踪摘要，但工作流不要求或比较该值；不得为稳定哈希排序公开节点数组，并排除该哈希字段本身以及运行时证据。实际合同内容变化时重验受影响关系，不要求重算摘要。

> 适用技术栈：phaser、threejs。

V3→V4 合同回对必须校验该绑定；`legacy_layout_reused`、`uses_generic_layout` 等真实还原方案不满足要求时退回 `V2/PROPOSAL`，不能沿用旧响应式骨架。

> 适用技术栈：phaser、threejs。

目标 viewport 在 `usability` 下用于确认整体关系、可读性和可操作性，其他代表性 viewport 验证关系不变量；只有 `exact` 或明确精确需求时才要求目标 viewport 的严格还原。布局区域仍须与正式 Scene 结构绑定；整屏截图不能作为交互 Scene、隐藏覆盖层或绝对叠图不能作为布局实现。
