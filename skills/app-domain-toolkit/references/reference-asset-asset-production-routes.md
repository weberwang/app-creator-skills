# 资产生产路线

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。

各技术栈统一使用 V0–V5；V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 资产生产路线

> 适用技术栈：cocos、phaser、threejs。

`effect-image` 的 AI 合成栅格路线必须遵循“Effect-image 生成式位图忠实还原提示词合同”（见本栈配套资料）；本文件只负责路线选择、交付形态与阶段分工。资源文件的格式、Alpha、技术尺寸和切片合同仍按资源路线校验；显示层运行态默认使用 `visual_validation.mode=usability`，位置、尺寸、边距和换行允许合理偏差，只有明确 `exact` 需求才启用严格像素/全视口矩阵。

> 适用技术栈：cocos、phaser、threejs。

V4 为每个资源选择一条主路线，并在机器清单记录场景或 shared 归属、源文件、运行时输出、接入对象/图层、关键验收、预算，以及当前冻结全局视觉基线的 ID、版本和适用锚点；风格指纹仅作可选追踪。所有路线执行 “全局视觉控制约束”（见本栈配套资料）。正式资源必须继承当前有效基线并保留可编辑源文件；纯生成资产必须保留足以重现和审计的生成记录。局部资源不得自行创造新材质、光源、描边、角色比例或图标语法。

> 适用技术栈：cocos、phaser。

通用帧动画按“分类入口”（见本栈配套资料）选择用途，默认视频抽帧，图片递归补帧须用户明确选择或确认切换。V3 内部分析行为、阶段、事件、衔接、时长、尺寸与 FPS，方案完成后先按“设计理念说明”（见本栈配套资料）阐述目标感受与动作依据，等待用户明确确认当前动作方案后，才在已有授权内写提示词、制作真实候选和推进具体实现；关键玩法事实有决定性歧义时只询问受影响部分。分辨率、条数与预算选择见“区域规划”（见本栈配套资料），图片默认 768p，确需 2K 时在已有工具与预算授权内直接选择，新增费用或超出授权才询问。V4 人工验收实际最终抽帧视频后才抽帧；图片逐张确认首尾、关键帧及递归父图后继续，最终真实序列人工验收。来源、时间映射、修图成果和 schema 分派见“接入合同”（见本栈配套资料）。上游静态图片 individual 禁图集合同不会自动变为帧动画合同，路线切换仍须明确决定；预览确认也不构成付费、外部写入或真机授权。

## effect-image 全元素视觉路线

> 适用技术栈：cocos、phaser、threejs。

对应实施单元的 `runtime_implementation.render_contract` 必须逐值镜像已冻结的 `native_suitability.render_contract`，并进入区域确认记录；改参会使已有确认失效。V5 每个原生区域还须提供 `native_runtime_evidence`，记录实际 `observed_method`、`observed_delivery_kind`、镜像冻结参数的 `render_contract`、`status=passed`、指向消费报告 JSON 的 `evidence`；`evidence_sha256`、`candidate_sha256`、`target_sha256`、`baseline_sha256` 和 `diff_fingerprint` 仅作可选追踪。`projectRoot` 可用时必须读取该 JSON 并复核实际内容：报告须声明 `report_schema='native-render-consumption/1.0'`、`consumed=true`，`region_id`、`scene_id`、`state_id` 必须匹配当前区域；`observed_method`、`observed_delivery_kind`、`render_contract`必须与 `native_runtime_evidence` 逐值一致。缺失、不可读、格式错误、任务归属或业务字段不匹配均失败；无关 JSON 文件即使 SHA 已登记也不能证明实际消费。只有规划参数而没有实际渲染与运行消费证据，或实际方法/参数/身份不一致，均不能通过。

> 适用技术栈：cocos、phaser、threejs。

复用不是“看起来相似”或“语义相同”：`reuse` 必须登记精确资产身份或通过既有 `asset-reuse-snapshot/1.0` 的 target/candidate 保真比较，并提供视觉和兼容性证据；缺失时直接回退方案阶段。整屏截图不得作为交互场景来源，必须交付原子部件并由正式 Scene 装配；这里禁止的是整屏捕获交付，不是独立图片资产。

## 功能与场景阶段的共享规划

> 适用技术栈：cocos、phaser、threejs。

确定功能、拆分场景和显示层时，就在现有 GDD/场景资源规划中总结共用需求，不必等正式图片生成后才开始。逐项记录资源用途、消费场景/显示层、适用状态、尺寸与变换要求、共同视觉要求、必须保留的差异，以及共享或保持独立的理由。可同时标出可共享的局部部件，例如同一货币图标可共用，而不同主题按钮只共用文字或图标，不因此共用完整按钮皮肤。

> 适用技术栈：cocos、phaser、threejs。

已明确多个位置需要同一个视觉部件且规格一致时，可提前确定共享设计，在 V3 的 component/placements 和生产清单中安排一次生产、多处引用；尚未确定外观或使用条件时，只登记为共享候选，不合并不同部件的生产任务，也不声称已有 accepted 资源。功能相同或视觉相似不能单独决定共享。早期规划交给后续场景 V2/V3 逐项核实，正式产物完成后再按下节复核实际适用性；不满足时保留独立资源并更新受影响的规划与证据。

## 正式图片生成后的共享与复用

> 适用技术栈：cocos、phaser、threejs。

每批正式图片完成生成、透明处理及尺寸归一化后，基于实际最终文件复核早期共享规划，并检查新发现的共用需求，将结论写回资源清单与适用证据。共享关系同时满足实际产物和消费需求，不在生成前仅凭功能名称或预期相似外观合并不同部件；V3 已确认同一原子部件的多个 placements 仍按既定计划生产一次。

> 适用技术栈：cocos、phaser、threejs。

- 逐一核对目标场景、显示层、状态和用途，以及轮廓、材质、光源、色彩、符号语义、装饰密度、逻辑显示尺寸、清晰度、透明边缘、切片/裁切、锚点和允许变换。实际资源能满足各消费位置的功能与视觉要求时才共用；功能相同、视觉相似、同类名称或相同提示词只能提示检查候选，均不能构成复用结论。不得通过强行拉伸、改色、裁切关键内容或弱化场景差异来迁就同一图片。

> 适用技术栈：cocos、phaser、threejs。

- 能共用时保留一个权威 `asset_id`、纹理键和正式输出，登记全部消费场景/显示层、状态、region、component/placement、用途、适用尺寸与变换限制，以及判断理由和实际验收证据。用现有 `scene_id`、`shared/shared_scene_ids`、`coverage_region_ids`、placements 和场景使用记录表达归属；理由与限制写入现有分析/证据工件，不另建无实际消费者的通用素材库。

> 适用技术栈：cocos、phaser、threejs。

- 同场景多个组件或显示层共用，仍保持该场景归属并分别登记实例；跨场景只有至少两个场景已确认需要使用时才声明 `shared: true` 与 `shared_scene_ids`，运行必需资源沿用既有例外。早期共享资产按实际进度保持 planned/producing/review，不能提前标为 accepted。共用资源不合并功能组件、布局节点、点击热区或状态所有权，消费方只引用同一视觉资源。

> 适用技术栈：cocos、phaser、threejs。

- 没有共用需求、无法证明适用或存在主题/状态/尺寸差异时，保留独立资源；尚待人工视觉检查的结果只能登记为待评估候选，不能标为已通过复用。提供正式资源及目标位置的对照与检查点，由用户检查显示效果，不以相似度分数或代理自评替代人工结论。

> 适用技术栈：cocos、phaser、threejs。

- 后续生产先查已登记且适用的正式资源，再逐目标核实使用条件；通过后按既有 `reuse-existing` 与不可变 `asset-reuse-snapshot/1.0` 合同绑定 accepted 来源、文件、许可、基线、适用状态及证据。已生成资源保留真实生成记录，不因后来共用而回写成复用来源；已冻结必须独立生成的区域不得因发现共享候选而跳过生成或静默换源，方法变更仍按现有 Change Request 规则处理。登记共享不授权删除独立产物或改写历史确认。

## 其他资产路线约束

> 适用技术栈：cocos、phaser。

- 装饰满幅背景只覆盖无交互的屏幕空间装饰；世界空间关卡、Tilemap、碰撞或玩法环境使用场景/Tilemap或世界/玩法环境路线。

> 适用技术栈：cocos、phaser、threejs。

- 非 `effect-image` 的普通 UI 仍可按项目约定使用矢量、字体工程、九宫格和布局配置；`effect-image` 则先依据上述路线分析，不因 UI 语义把特色材质默认降为原生绘制。

> 适用技术栈：cocos、phaser、threejs。

- 动画与 VFX 必须按动态时间采样验收，不能只检查某一静态帧。

> 适用技术栈：cocos、phaser、threejs。

- AI 合成栅格路线才读取 `effect-image-splitting.md`；它是可选子路线，不是其他资产类型的前置步骤。

> 适用技术栈：cocos、phaser、threejs。

- accepted 资源没有 `source_file/source_files` 时，任意路线的 `generation_record` 都必须提供公共可执行身份：`record_id`、生成器及版本、可解析时间、命令/配方、非空输入来源和非空参数对象；任意对象不能冒充来源。状态为 `producing`、`review` 或 `accepted` 的 `ai-composite-raster` 还强制其专用字段：非空全局前缀、资产段、状态段、负向段、模型、模型版本、种子、参考输入路径列表和后处理列表。

> 适用技术栈：cocos、phaser、threejs。

- 场景差异只能使用全局基线声明的允许变量；不得把不同场景做成同一模板或互不相容的美术体系。

> 适用技术栈：cocos、phaser、threejs。

- V5 必须用多资源联系表和同屏截图完成确定性一致性 F2；相同关键词、模型或调色板不能单独证明一致。

## 完整拆解与视觉显著性

> 适用技术栈：cocos、phaser、threejs。

在不影响功能的前提下，完整识别位图中的可独立部件，包括文字、图标、底板、色彩填充、边框和装饰；每项登记来源与实现路线，不因原图已合成就整块保留，也不因某项改用程序绘制就从拆解清单遗漏。拆分后的部件仍属于原功能组件，保持点击热区、状态联动、动态更新、本地化和布局关系；“完整”指职责与覆盖完整，不是逐字、逐颜色或逐装饰细节机械切碎。

> 适用技术栈：cocos、phaser、threejs。

默认 `usability` 下，低显著性文字的替代字体、简单填充的轻微装饰差异可以在拆解方案中明确说明，但不得改变文案、语义、可读性、视觉层级或状态识别。明显美术特征及明确要求保留的效果仍须保留；`exact` 或指定字体/效果时遵守对应精确要求。路线和替代依据写入现有分析、文字理由与字体方案，随拆解图一并人工确认，不增设确认步骤；实际显示效果仍由用户检查，技术检查不代替视觉验收。

## 色彩填充路线判定

> 适用技术栈：cocos、phaser、threejs。

色彩填充与文字使用同一判断顺序：先看视觉作用、特征显著性、状态变化与复用需求，再选择位图或原生绘制。颜色本身、静态/动态属性或程序能否画出渐变，都不能单独决定路线。

> 适用技术栈：cocos、phaser、threejs。

| 填充特点 | 拆分与实现 | 判断理由 |
| --- | --- | --- |
| 明显的金属、玻璃、纹理、立体光影、复杂辉光或不规则色面 | 将完整的材质表面作为独立位图；与边框、装饰可可靠分离时分别登记，否则保留完整原子部件 | 色彩与材质、光影共同承担主题和质感，单色或近似渐变无法保留主要视觉价值 |
| 有统一风格、需要多处复用的渐变或纹理填充 | 优先复用独立填充贴图，按需要使用已确认的九宫格、遮罩或分层装配；只有原生绘制能保留所需风格时才选择原生路线 | 类似位图字体复用字形，复用的是有风格的表面资产；填充仍按图片合同登记，缩放与裁切不得破坏材质特征 |
| 视觉特征不明显的纯色、透明色或简单规则渐变 | 独立登记为原生填充，记录形状、颜色、透明度和适用状态 | 主要承担分区、衬底、遮罩或数值/状态表达，原生绘制便于改变尺寸、颜色和填充比例 |

> 适用技术栈：cocos、phaser、threejs。

例如战斗失败弹窗：返回按钮的蓝色表面若包含明显高光、辉光与纹饰，应保留对应位图；只有可分离且视觉特征不明显的基础蓝色填充才单独交给原生绘制，金属边框、发光和装饰继续使用独立图片。不能只因为“是蓝色填充”就把整个按钮表面替换为纯色矩形。弹窗遮罩的简单半透明黑色可用原生填充，带裂纹和材质的深色面板则保留位图。

> 适用技术栈：cocos、phaser、threejs。

填充拆开后仍归属原组件，共用形状边界、圆角、裁切、布局及状态来源，避免接缝、重复叠色或透明度叠加。进度比例、选中/禁用颜色等功能状态保持运行时可变；位图负责风格表面，原生逻辑负责实际比例或状态，不能烘焙为单一固定结果。填充与光影无法可靠分离或分离会损伤功能、既定外观时，保留完整部件并记录原因，不为减少位图强行拆分。

## 程序还原资格与位图回退

> 适用技术栈：cocos、phaser、threejs。

拆解中标为 `runtime-program` 的视觉元素，必须能由当前选定 renderer 完整实现该区域要求保留的外观与适用状态。先列出实际字体/字形、填色、渐变、描边、阴影、发光、纹理、透明度及状态变化，再逐项对应可确定性实现的方法和已有可核验依据；元素叫“文字”“按钮”或方法名包含 Graphics/Text 都不能授予资格。不会实现、当前能力不支持或依据不足时，不得先标为程序元素，再用纯色、默认字体或简化效果近似交付。这里只决定生产路线，不新增自动截图或运行验收授权。

> 适用技术栈：cocos、phaser、threejs。

`runtime-program` 是实现分类，不能替代 `visual_route_analysis` 的视觉来源判断。程序能加载、排列或控制一张图片，不代表其纹理外观由程序还原：无法完整还原的固定外观进入独立 `image-asset` 区域，按实际来源选择位图拆解、独立生产或合规复用；程序区域只承担可以完整实现的绘制或行为。拆解提案中相应调整区域、标签、owner、生产合同和资源/布局绑定，不能用一个程序标签隐藏图片依赖。已确认方案的路线变化按现有 V3 变更与确认规则处理。

> 适用技术栈：cocos、phaser、threejs。

同一判断也适用于图片及其局部，不限于文字：图标、按钮表面、面板、装饰和背景中的元素，按已确认的功能语义、独立状态与可观察视觉边界拆解，逐项判断当前程序能力能否完整还原。可完整实现的几何、填色或效果可交给程序；不能完整实现的插画、纹理、渐变、光影、不规则轮廓或透明边缘保留为独立位图。不能因为原素材是一张图片就把全部内容强制图片化，也不能把复杂图形简化为近似几何。主体与阴影、发光等效果只有在分离后仍能完整还原且保持状态同步时才拆开；无法可靠分离时保留完整的原子视觉部件，不按每种颜色或每个装饰细节机械切碎。使用现有拆解提案、来源与透明合同，不改变 schema 或既有确认边界。

> 适用技术栈：cocos、phaser、threejs。

文字按“文字路线判定”（见本栈配套资料）处理，先按上述视觉显著性确定需要保留的风格和适用路线；不能只因程序能绘制同样文案就把美术文字降为普通文本。渐变或其它效果本身不强制使用位图，但当前文字 renderer 必须完整复现方案要求保留的效果；不能复现的固定外观拆成字图或独立位图。效果与字形无法可靠分离时保留整段固定文字的视觉结果。动态或本地化内容仍须可变，不能烘焙为固定字图；可选位图字体或混合路线，但必须连同字形覆盖、排版和所需效果一起满足合同，能力不足时报告缺口，不自动降级外观。

## 生成式位图生产合同硬门禁

> 适用技术栈：cocos、phaser、threejs。

生成记录必须按实际路线记录生产工具和版本、参数、后处理、原始输入和最终归一化输出文件、`edge_profile` 和 `edge_evidence`。去背路线才记录 `source_background_color`、`color_separation_verified=true` 与 `background_removal_attempts`；其他路线禁止附带这些字段。已有真实透明图按 `origin=provided` 的复用合同接入，不伪造生成、遮罩或去背记录。透明生成输出必须是 PNG；V4/V5 均须解码像素证明存在真实透明度，不能只相信扩展名、提示词或工具声明。

> 适用技术栈：cocos、phaser、threejs。

当前可用工具的声明与真实像素验证边界见“生成式透明能力审计”（见本栈配套资料）。生成记录顶层使用实际 `generator/generator_version`；直接 Alpha 的 `capability.tool/tool_version` 必须与该生成器身份一致，并按 `edge_profile` 分别绑定可核验能力证据。没有对应实际 PNG 解码证据时，该能力仍标记未验证。

> 适用技术栈：cocos、phaser、threejs。

公共纯色背景脚本通过参数调用，不为每个任务改写脚本：

> 适用技术栈：cocos、phaser、threejs。

上面的公共去背工具只服务 `hard-edge` 且主体与背景颜色明显区分的输入，并要求调用方显式声明 `--color-separation-verified`；不接受半透明、辉光、柔和阴影、毛发、玻璃或混合边缘。输出按统一归一化流程处理，真实 Alpha 和主体边界必须保留。

> 适用技术栈：cocos、phaser、threejs。

所有生成式位图单图均先保留真实原始输出，再按已冻结路线生产透明结果，最后执行尺寸归一化。`raw_source_file` 与 `raw_source_sha256` 绑定实际生成输入；`source_file` 和 `source_sha256` 绑定归一化后的运行时 PNG，并与 `runtime_file`、`runtime_outputs` 和 `normalization_record.output_file` 对齐。背景去除、直接 Alpha、遮罩合成三条路线都必须保留比例、Alpha 和主体边界；归一化禁止把棋盘格或网格预览烘焙进素材。首次输出比例不符时最多重生一次；第二次仍不符时，若 V2/V4 已冻结裁切焦点和安全事实，可用 `operation=crop-and-resize-to-contract`（CLI 使用 `--attempt-one`、`--attempt-two`、`--focus-x`、`--focus-y` 及每个 attempt 的身份元数据）：CLI/API 必须读取两个真实原始生成 attempt 的 `attempt_id`、`generation_record_id`、`generated_at`、文件、实际宽高，确认两者都与目标比例不符、实际来源路径互不相同；旧的仅路径数组结构拒绝，不要求两次尺寸相同但第二次实际宽高必须等于当前归一化输入。受控裁切按归一化输入的实际尺寸和约分目标比例计算最大整数 `crop_rect`，再等比 resize；若裁切会损伤主体、文字、透明轮廓或关键构图，则报告当前路线的能力缺口并重新制定输入或生产路线。`padding_policy=none`，禁止非等比拉伸、padding、contain、复制边缘或裁切冻结 `reference_target`；原图尺寸已经正确时记录 `operation=not-required`。透明素材归一化前后都必须解码检查 Alpha，并保持主体边界。归一化记录缺失、失败、实际路径或尺寸不满足要求先 `repair` 并重验当前门；只有冻结生产规格或上游事实真实变化时才 `return` 到最早受影响阶段。

> 适用技术栈：cocos、phaser、threejs。

所有透明路线都为同一候选生成浅底（`#F2E9DF`）和深底（`#16202E`）预览；预览记录 `candidate_sha256`、归一化 `source_file/source_sha256`、两张预览 SHA，以及检查项 `subject_integrity`、`background_residue`、`color_fringe`、`semi_transparency`。V4 可记录 `inspection.status=pending`；V5 必须由视觉检查将状态更新为 `passed` 并附证据，不能以 PNG 格式、机器 Alpha 检查或工具声明代替主体缺损、残留背景、色边和半透明区域检查。

> 适用技术栈：cocos、phaser、threejs。

拆解粒度补充：先完成状态分析，再建立唯一原子 `component_id/atomic_visual_key`；重复视觉实例通过 `placements` 表达，不重复生成资产。② 的六个顶部按钮分别是六个组件；⑧ 的三个相同底部表面可是一组件三 placements；⑨ 的三个动作图标按实际复用关系登记。生成式位图对每个唯一 component×required state 只接受独立位图，强制 `delivery_mode=individual` 与 `atlas_allowed=false`，编号组图、横向组图和图集均不等价；atlas 只适用于其他生产方法的显式切片合同。placement 热区有独立 `hotspot_id`，不计入视觉资产。

> 适用技术栈：cocos、phaser、threejs。

V4 按每个 `annotation_number/region_id` 写入上述合同和错误定位；Implementation Package 另写 `visualProductionUnits`，逐一绑定 coverage、所有者、ownedPaths、输出路径和格式。V5 必须提交 `production_contract_audit`，F2 只消费带 `validationMode=MACHINE` 的当前身份机器验证事实；V5 还必须绑定 V4、实施包、F2 机器验证事实、F3 runtime replay、freshness-bound fidelity cases、正式场景运行时消费和无未批准替换。

> 适用技术栈：cocos、phaser、threejs。

生产方式变化只能使用 `ACCEPTED` 的 Change Request，并绑定区域、工作项、候选版本、用户原文和决定时间。V5/F2/V5 发现缺少生成记录、输出文件、实际消费或未批准替换时必须拒绝，不得以补一张截图或相似度结论放行。

## 机器清单最低字段

> 适用技术栈：cocos、phaser、threejs。

根节点记录 `schema_version=1.5` 和 `effect_image_reconstruction`。普通资产使用 `not-applicable/not-applicable`，不得伪造目标、回对、coverage 或 fidelity；效果图还原使用 `effect-image/v3-ready`，V4 前要求冻结目标/候选、已通过回对和 coverage，V3/V4 可无 fidelity；V5 完成改为 `v5-complete` 并要求 case 非空且全部通过。coverage 每个区域必须有同 scene/state 唯一的正整数 `annotation_number`、非空 `ownership_evidence` 和 `implementation_plan`：`generate-now` 只允许 fixed-production-visual，`runtime-program` 只允许 runtime-data/runtime-rendered 且不得有 asset，`reuse-existing` 只允许 fixed-production-visual，并绑定已 `accepted`、当前 scene/state、基线、许可与兼容性证据的既有资源。

> 适用技术栈：cocos、phaser、threejs。

固定区域必须声明 `production_origin`：`bitmap-decomposition` 代表从冻结效果图拆解位图，必须先完成状态分析和唯一原子 component/placements 登记，再在冻结原图上生成绑定实际目标、region ID 和区域定义 的 PNG 提案并等待 USER_DECISION；`independent-production` 是独立生产，不得用 `effect-image-extraction` 原因伪装。对应 `confirmation` 必须记录 `proposal_id`、目标文件、`region_id`、实际区域定义、提案/决定记录文件、PNG 文件、MIME、版本和 `decision_id`；决定记录还要绑定 `decision_source=user-message`、thread/work item 和可解析时间；用户消息 SHA 仅作可选追踪。开始任何拆解生产前必须运行带 `--check-files --project-root .` 的资产校验；文件检查会核对实际 PNG 格式、尺寸、元数据和区域覆盖，正式流程不生成或接受 SVG 标注。`bitmap-decomposition` 映射资产必须使用 `ai-composite-raster`；独立生产的 source_file/source_files 不得指向冻结效果图 `original_file` 的真实路径；独立生产按实际内容判断，不比较内容 SHA。

> 适用技术栈：cocos、phaser、threejs。

固定视觉区域的拆解粒度补充合同：状态分析必须先于组件清单，不能把 `annotation_number` 误当成资产数量。`state_analysis` 需要覆盖 default、selected、active、disabled、pressed、hover、victory、defeat、paused，并对每项写 `required` 或 `not-applicable+reason`。`component_inventory` 的 `component_count` 必须等于可复用部件清单；`image_generation` 的 `expected_assets` 必须逐 `component_id × required state_id` 映射。默认 individual 模式禁止一张横向组图满足多个 component；生成式位图必须 `delivery_mode=individual` 且 `atlas_allowed=false`；其他生产方法只有在显式合同下才能使用唯一 `atlas_slice` 元数据。交互热区不属于视觉资产。

> 适用技术栈：cocos、phaser、threejs。

方向或全局规则漂移退 V3；生产规格、基线绑定或生成包缺失退 V4；资源执行偏差退 V5；结构根因退 V2。冻结基线变更后标记失效证据，并重验全部受影响资源与同屏组合。

> 适用技术栈：cocos、phaser、threejs。

V4 结构设计运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V4`；V5 正式验收固定运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V5 --check-files --project-root .`，V5 正式验收固定运行同命令但使用 `--stage V5`，不得只验证 JSON 字段。效果图清单必须以根 `workItemId`、`candidateVersion` 绑定当前工作项和候选版本，并与实施包的任务、版本和范围一致。
