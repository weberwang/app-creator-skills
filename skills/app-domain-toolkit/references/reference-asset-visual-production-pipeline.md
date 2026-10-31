# 视觉生产管线

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。

各技术栈统一使用 V0–V5；V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 视觉生产管线

> 适用技术栈：cocos、phaser、threejs。

玩家可见内容沿用“游戏内文案”（见本栈配套资料）：V0/V1/V2 分开内部功能说明与可见表达；全局候选、场景主图和显示层上下文图发送明确的可见文字范围与生成约束；V3 只拆解冻结目标中的文字；V4 不给图标/皮肤附加说明；V5 绑定同一可见表达与真实数值。普通资产、程序界面与 effect-image 均适用；图像显示结论仍由用户人工确认。

> 适用技术栈：cocos、phaser、threejs。

场景 Work Item 只生产自身画面和常驻 HUD；modal/popup 等弹窗建立独立 DISPLAY_LAYER Work Item。弹窗 required state 仍需完整宿主上下文、拆解、布局和资源前置，但其未完成不阻断场景 V5。字段和调度边界见“控制模型”（见本栈配套资料）。

> 适用技术栈：cocos、phaser、threejs。

effect-image 生成式位图的完整提示词与实际参考输入合同统一见“Effect-image 生成式位图忠实还原提示词合同”（见本栈配套资料）；管线只引用该合同，不重复维护模板正文。透明工具声明与实际输出证据的边界见“生成式透明能力审计”（见本栈配套资料）。

## V0 分流

> 适用技术栈：cocos、phaser、threejs。

先记录范围、视觉方向是否冻结、结构/交互/布局是否变化、正式资源数量与跨域风险，再选择且只选择一条路径；资源数量和生产方式只服务后续路径、预算与执行规划，不参与效果图适用性判断。Work Item 指定效果图或参考截图为还原目标时启用“忠实还原模式”（见本栈配套资料），指定参考是冻结视觉目标而非可自由优化的灵感输入。

> 适用技术栈：cocos、phaser、threejs。

效果图/参考图是否适用只看当前场景 Work Item 是否把它指定为正式运行画面的视觉目标，与是否生成、制作或新增资源无关。适用时，参考还原是同一场景实现生命周期内的视觉模式与合同叠加，即使所有覆盖区域均为 `reuse-existing`/`runtime-program`、零新资源且零生成式位图，也必须走 `effect-image` 的 V2→V3→V4→V5 还原合同，并完成布局绑定、coverage、宿主场景同屏组合和 fidelity 验收；不创建第二个场景 Work Item 或第二条阶段链。仅仅生成新资源，或仅把图片作为灵感、说明或临时参考，不足以触发 `effect-image`，仍按普通资产、组件或场景路径分类。`image_generation_required`、`generate-now`、资源数量和 `production_method` 只能在触发后于 V3 决定生产路线，不能参与 V0 applicability 判定。

> 适用技术栈：cocos、phaser、threejs。

| 类型 | 判定 | 阶段 | 审核 |
| --- | --- | --- | --- |
| 原子资源 | 视觉方向已冻结，结构、交互、布局不变，并有适用、有效、绑定当前范围的玩法视觉契约、V2/V3 决策记录、视觉可交付结论与预算基线；缺少任一项时升级路径 | V3 → V4 → V5 | F0 范围与流程；F1 规格一致；V4 确定性机器 F2；V5 生成 F3 动态集成工程证据；F4 仅处理有副作用的精确操作批准 |
| 组件/资源集 | 同一组件、角色状态组、图标集或可复用资源集，需要局部探索与一致性控制 | V2 → V3 → V4 → V5 | 普通候选执行 F0-F3；V4 做确定性机器 F2，V5 形成 F3 工程证据；仅有外部写入、付费、真机、破坏性或外部删除、发布副作用的 A4-A6 操作执行 F4 |
| 场景/视觉系统/重做类任务 | 场景、整套 UI、世界环境、跨场景视觉系统或重做；参考还原作为可选视觉模式 | V2 → V3 → V4 → V5 正式还原与验收 | V2/V3 确定性机器检查强制；实质取舍按条件记录一次 `USER_DECISION` |

> 适用技术栈：cocos、phaser、threejs。

局部修复仍执行 F0 范围与流程、F1 规格、适用 F2 与 F3 工程证据；只有涉及外部写入、付费、真机、破坏性或外部删除、发布副作用的 A4-A6 操作执行 F4 批准门。记录缺失优先原地补齐；任务目标范围真实变化才重新分流，普通路径、方案和资源清单调整直接更新计划并重验受影响部分。

> 适用技术栈：cocos、phaser、threejs。

所有任务执行适用 V2/V3 确定性机器检查。已有明确需求或冻结基线时可记录 `AUTO`；修复、提升游戏感或工程适配只要改变产品方向、玩法语义或上游视觉事实，才按差异列出影响和候选方案，请求一次 `USER_DECISION`。普通位置、尺寸、边距和换行差异按 `visual_validation.mode=usability` 处理，不升级为精确选择；后续绑定当前决策记录。

> 适用技术栈：cocos、phaser、threejs。

全局基线、foundation-only 边界、场景阶段顺序和集成入口以“控制模型”（见本栈配套资料）与“状态、阶段与停止门”（见本栈配套资料）为准。本管线只补充资源领域的 V0 分流、V3 生产合同、V4 资源验收和 V5 正式场景运行证据；参考还原仍属于当前场景 Work Item。

> 适用技术栈：cocos、phaser、threejs。

F2 的机器出口必须由确定性验证执行，并绑定当前 baseline/diff 身份；只说明文件、结构、实际参数和证据绑定的检查结果。美术质量与观看舒适依“游戏美术体验与质量契约”（见本栈配套资料）由用户人工检查，意见沿用现有选图、方向、V3 布局确认与 V5 运行验收材料，不新增旧 `human_review` 字段。V2/V3 使用 `AUTO` 或 `USER_DECISION` 记录，只覆盖所列对象；方向决定不写操作审批账本。F4 只处理外部写入、付费、真机、破坏性或外部删除、发布等带副作用的 A4-A6 操作。

> 适用技术栈：cocos、phaser、threejs。

美术 brief 必须包含主题、受众、核心循环、体验目标、观看情境、视觉层级和三层刺激预算，并进入实际生成输入。全局三候选逐项人工评估，所选候选任一失败或未验证都不能冻结；场景目标也在冻结前检查。正式生产遵守已通过的方向与目标，不能依靠拆件时暗改画面修复不合格参考。

## V2 玩法视觉契约与视觉目标

> 适用技术栈：cocos、phaser、threejs。

1. 逐状态定义第一视觉目标，以及玩家、目标、危险、交互、装饰的优先顺序。

> 适用技术栈：cocos、phaser、threejs。

2. 定义明度、色彩、轮廓和运动区分，可供性（affordance），前摇、命中、受击、奖励反馈时序，遮挡预算及小屏、高速、灰阶、色觉差异阈值。

> 适用技术栈：cocos、phaser、threejs。

3. V1 使用临时资源验证功能；结构、交互或节奏需要额外探索时可选用白盒，不将白盒作为强制门槛。

> 适用技术栈：cocos、phaser、threejs。

4. 在生产前定义每场景纹理、图集、帧数、动画采样、纹理内存、过绘、Draw Call 和最大纹理预算。未能量化的阈值标为项目待定义，不能推迟到 V4。

> 适用技术栈：cocos、phaser、threejs。

5. 保留已批准的功能语义、业务状态、交互语义和状态所有权，同时检查构图、信息层级、资源槽、页面模板和布局几何是否足以承载核心玩具、专属场景对象、关键反馈与奖励表达。必要灰盒是功能与结构证据，不是必须原样换皮的最终视觉模板。

> 适用技术栈：cocos、phaser、threejs。

6. 建立全局视觉基线候选，记录基线 ID/版本、风格指纹、主锚点与分系统锚点、世界幻想及形状、比例、镜头、色彩、材质、光源、描边、密度、字体、图标、面板、动画和 VFX 规则，并明确允许变量与禁止项。未冻结内容不得作为批量生产依据。

> 适用技术栈：cocos、phaser、threejs。

8. 参考模式在当前场景 Work Item 的 V2 内生成或接收并冻结参考身份、版本、权属、文件指纹、目标视口/状态、对比条件、scene master/reference target 与宿主上下文效果图；V3 前基于 V2 拆解草案建立区域关系和必要状态证据，字段、容差、冲突处理和失败条件以“视觉还原”（见本栈配套资料）为准。默认允许合理几何偏差，只有明确 `exact` 需求时才定义严格像素容差和全覆盖矩阵。

> 适用技术栈：cocos、phaser、threejs。

功能与场景划分阶段已形成的“共享资源规划”（见本栈配套资料）在 V2 回对消费位置、状态、尺寸、共同视觉要求和差异，在 V3 落到实际 component/placements 与生产清单；确定同一部件可规划一次生产，未确定者保持候选。V4 用真实正式图片复核，不能因早期功能归类而强行统一场景美术。

> 适用技术栈：cocos、phaser、threejs。

玩法拥有规则、状态、交互和功能灰盒。美术拥有视觉契约中的表现目标，不得通过视觉实现改写玩法规则。

## V2 条件门：视觉目标与决策记录

> 适用技术栈：cocos、phaser、threejs。

先在 V1 验证功能，V2 定义视觉契约和目标，再完成条件分类和决策记录；白盒按需使用。自动路径写 `AUTO`、依据与适用范围后进入 V3；实质取舍路径记录一次用户结论。

> 适用技术栈：cocos、phaser、threejs。

需求、玩法视觉契约和冻结基线已足以确定目标时，直接记录 `AUTO` 并生成/展示场景目标及宿主上下文预览，不先要求用户确认文字版判断或计划。只有产品方向、玩法语义、结构或目标内容存在会改变实现的实质歧义时，才提出具体问题；能用预览表达的差异优先用图片并列说明。

> 适用技术栈：cocos、phaser、threejs。

决策记录包含候选、范围、契约、功能验证证据和返工影响；使用白盒时可附上相关证据。自动路径记录 `AUTO` 及依据；需要人工时结论只允许“通过”“修改后重提”或“拒绝”。

> 适用技术栈：cocos、phaser、threejs。

“修改后重提”产生新候选并重跑受影响 F0-F3；只有带副作用的 A4-A6 操作重跑 F4 批准门。拒绝按根因留 V2 或退制作契约/GDD；模块边界变化仅有实质取舍时进入 grilling。

## V3 拆解确认与生产方案

> 适用技术栈：cocos、phaser、threejs。

UI 底板、按钮皮肤和框体在当前拆解里完成“九宫格适用决策”（见本栈配套资料）。采用时把 `nine_slice` 的小图源尺寸与切片边宽保留到拆解元素、布局节点、对应组件/expected asset 及正式场景呈现配置；已有人工确认同时冻结这些事实。普通位图生产尺寸规则不用于把九宫格皮肤扩大到整块显示框。

> 适用技术栈：cocos、phaser、threejs。

当前场景 Work Item 的 V2 冻结目标和初步还原草案有效后进入 V3。V3 把 V2 的视觉事实细化为可确认、可执行的还原方案，并按两个串行视觉硬门完成：阶段 A 在内部维护拆解图对应的技术 JSON、按序 `decomposition_elements`、功能归属与理由、component×state 和资源生产事实，向用户展示编号 PNG 供视觉确认；阶段 B 仅在拆解图确认后自动继承功能父子归属，补充停靠/对齐关系、布局测量、显示层关系和布局容差，生成布局标注 PNG 供视觉确认；需要交互对照时使用 `--interactive-review` 生成同批审阅页。无需在任一图片确认前单独提交或等待文字提案、对齐决策或技术记录的确认。

> 适用技术栈：cocos、phaser、threejs。

拆解先按“完整拆解与视觉显著性”（见本栈配套资料）完整登记可独立部件并保持功能归属：明显美术外观保留位图，低显著性操作文字可用系统文本，简单填充可用原生绘制，不能遗漏改用程序的拆解项。程序标签再满足“程序还原资格与位图回退”（见本栈配套资料），只有当前 renderer 能完整实现方案要求保留的外观与状态时才成立；文字所需效果不能完整还原时，按“文字路线判定”（见本栈配套资料）将固定外观拆为位图，不能在实现时静默用普通文本近似通过。

> 适用技术栈：cocos、phaser、threejs。

原生路线在 `native_suitability.render_contract` 冻结 `renderer`、`dimensions.width/height`、`colors`、`line_width`、`corner_radius`、`gradient`、`opacity`、`applicable_states` 和 `unsupported_features`。颜色以及渐变 stop 颜色使用 `#RRGGBB`；`gradient.type=none` 的 `stops` 是空数组，线性渐变必须冻结 0–360 的 `angle` 和有序 `stops`。合同按参考测量记录精确参数。`runtime_implementation.render_contract` 必须逐值镜像原生资格合同，并进入已确认区域定义记录；参数变更会使拆解确认失效，不能在行为装配时静默修改。`unsupported_features` 中任何尚需保真的特征都会阻断原生路线，不得以近似替代后放行。特色美术选择原生路线还必须提供等价性证据，并绑定预先声明的容差或精确例外。冻结的 `image_generation_required=true` 不得自动替换为原生路线；方法变更只能走明确接受的 Change Request。

> 适用技术栈：cocos、phaser、threejs。

固定视觉区域区分 `bitmap-decomposition` 与 `independent-production`；代理内部按 ownership/实现分类 → 状态分析 → 唯一原子 component/placements → proposal 技术 JSON 与编号 PNG 的顺序维护事实。用户直接检查 PNG 的编号、视觉框、中文摘要和“新建图片资产 / 复用现有图片 / 程序绘制或动态逻辑”标签，并确认图像；坐标、状态、组件/placement、生产合同、atomic requirements 和资源映射留在 JSON，供代理和机器门使用。拆位图仍须通过 `node scripts/generate_effect_image_annotation.mjs ... --output ...png --proposal ...json` 生成绑定实际目标、region ID 与区域定义的提案；confirmation 仍记录实际 proposal/decision、PNG 身份和用户原文，但不要求用户另行确认这些文字或技术字段。开始裁切、抠图、分层、AI 分割/补全或派生位图前，必须运行 `node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V3 --check-files --project-root .`，结构和文件证据均通过才可执行；PNG 必须由共享无依赖确定性栅格渲染器产出，文件检查会校验 PNG 魔数/MIME/尺寸/用户说明元数据与区域覆盖，同时读取 proposal 与实际区域定义复核技术合同，不校验摘要；正式流程不生成或接受 SVG 标注。`reuse-existing` 的 `source_manifest` 必须是不可变 `asset-reuse-snapshot/1.0`，并用 `source_file` 完成精确身份复核；bitmap 路线资产使用 `ai-composite-raster`。只有 V5 完成后声明 `v5-complete`，case 必须全部满足当前验证模式，并在 `exact` 或明确全覆盖需求时逐一覆盖冻结目标的每个 scene/state 组合。其余条件确认按既有规则触发，`AUTO` 绑定判定证据；owner_type 属于合同/F2 专业事实，不能由验证器从像素推断。

> 适用技术栈：cocos、phaser、threejs。

1. 按资产类型选择源文件、运行时输出、生产工具、命名、切片、锚点、图集、帧和压缩策略；保留可编辑源文件或完整生成记录，并继承当前全局基线与适用分系统锚点。

> 适用技术栈：cocos、phaser、threejs。

2. 将资源写入 `docs/visual-assets.json`，声明唯一资源 ID、纹理键、输出路径、路线、状态、证据、项目已定义预算，以及与根节点完全一致的基线 ID、版本；风格指纹仅作可选追踪。每个资源无论处于 `planned`、`producing`、`review`、`accepted`、`rejected` 还是 `replaced`，都必须二选一声明具体 `scene_id`，或 `shared: true` 及至少两个 `shared_scene_ids`；仅运行必需资源可用 `shared_reason: runtime-required` 免除两个场景条件。拒绝或替换资源仍保留原场景归属，确保审计链可追溯。

> 适用技术栈：cocos、phaser。

3. UI、像素美术、逐帧/骨骼动画、Tilemap、VFX、背景和玩法环境走各自路线。框选效果图拆单图只属于 AI 合成栅格路线，不是默认管线。

> 适用技术栈：cocos、phaser、threejs。

4. 场景/系统/参考还原在 V3 做确定性机器 F2；原子资源和组件集不重复设置 V3 审核。

> 适用技术栈：cocos、phaser、threejs。

5. AI 生成包固定使用“全局提示前缀 + 资产特定段 + 状态段 + 负向段”，并记录模型/版本、种子、参考输入、控制参数和后处理。相同关键词、模型或调色板不得单独证明一致。

> 适用技术栈：cocos、phaser、threejs。

V3 使用仍适用的 V2 `AUTO` 或 `USER_DECISION` 记录、视觉可交付与全局基线；还原任务必须绑定冻结视觉目标、必要的区域关系证据和 `visual_validation.mode`。`exact` 才要求严格忠实度矩阵与精确例外；默认 `usability` 只接受已声明适配或已确认目标容差内的位置、尺寸、边距和换行变化。

> 适用技术栈：cocos、phaser、threejs。

V3 的生产合同字段必须逐 `annotation_number/region_id` 显式记录 `production_origin`、`production_method`、`delivery_kind`、`image_generation_required`、`generation_record_required`、`substitution_policy` 和 `expected_assets`。原生区域还要冻结上述 `native_suitability.render_contract`，并由实现单元的 `runtime_implementation.render_contract` 精确镜像；它与目标、基线、候选和区域定义共同受确认身份约束。拆解顺序固定为“先 `state_analysis`，再 `component_inventory`”：所有普通、selected/active、disabled、pressed/hover、victory/defeat/paused 状态必须写 `required` 或 `not-applicable+reason`；`annotation_number` 不是资产数量单位。`component_inventory.component_count` 必须对应可复用部件清单，生成式位图的 `expected_assets` 必须按 `component_id × required state_id` 一一对应。生成式位图使用 individual 位图并声明 `atlas_allowed=false`，一张横向组图或图集均不能满足多个部件；验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算 `width/height`，只能使用精确最小尺寸；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 必须为 `none`，这部分机器合同不要求 human_review。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 按设备动态取值并封顶为 2，不改变资产尺寸合同。历史 1.5/2 倍生产证据须重生成或标记 `stale`。其他生产方法只有在显式 `atlas_allowed=true` 且每个部件×状态登记完整 `atlas_slice` 时使用图集。交互热区单独登记，不计入视觉资产数量。`independent-production` 与 `generate-now` 不推断具体生成器；独立生产不等于图片生成，视觉相似不等于生产合同完成。若 `image_generation_required=true`，必须是 `image-generation+raster-image`，并交付独立源/运行时位图、实际生成器及版本、完整提示词与生成记录、MIME/宽高/alpha及实际文件、运行时消费证据；工具版本未暴露时记录 `not-provided`，不可自动替换为原生实现。实施包的 `visualProductionUnits` 必须与 coverage 一一映射；编号、部件/状态、输出共享、路径、所有权和格式冲突先在 V3 `repair`，只有冻结生产规格真实变化时才进入必要回退。

> 适用技术栈：cocos、phaser、threejs。

每条生成路线按真实生产活动记录工具/版本、参数、后处理、原始输入路径与 SHA，以及最终归一化 PNG 路径与 SHA。只有背景去除路线记录背景颜色、`color_separation_verified` 和 `background_removal_attempts`；`provided`/`reuse` 已有透明图保持资源来源记录，不补造生成或去背记录。透明输出须由 V4/V5 解码检查真实像素 Alpha；声明、扩展名、提示词或工具参数均不足以证明透明。

> 适用技术栈：cocos、phaser、threejs。

生成式位图单图按“保留原始输出 → 执行冻结的透明路线（如适用） → Sharp 尺寸归一化 → V4/final/runtime”执行。`normalization_record.source_file` 绑定当前处理输入；最终 `actual_output`、`runtime_file` 和 `normalization_record.output_file` 指向归一化后的 PNG/JPEG（`alpha=true` 只允许 PNG，`alpha=false` 可用 JPEG）。归一化保留透明 Alpha、画布比例和主体边界，禁止把棋盘格预览烘焙为背景。首次输出比例不符时最多重生一次；第二次仍不符时，若已冻结裁切焦点和安全事实，使用 `crop-and-resize-to-contract` 并记录两次真实原始生成 attempt、SHA、尺寸、focus 和最大目标比例 `crop_rect`；若裁切会损伤主体、文字、透明轮廓或关键构图，则报告能力缺口并重新制定输入/路线，不执行有损处理。该分流适用于所有生成式位图，`expected_assets.width/height` 最终必须精确匹配，`padding_policy=none`，禁止非等比拉伸、裁剪冻结 `reference_target`、补边、contain、复制边缘或静默变形。尺寸已满足时也要记录 `operation=not-required`；透明素材归一化前后均须解码验证真实 Alpha。归一化记录缺失、失败、实际尺寸或路径不满足要求时阻断 V4，SHA 不参与验收。

> 适用技术栈：cocos、phaser、threejs。

每条透明路线都为同一候选生成浅底（`#F2E9DF`）和深底（`#16202E`）预览，并记录实际候选和最终归一化 PNG 路径，SHA 可省略。V4 允许视觉检查保持 pending；检查入口直接并排展示浅底、深底和可放大的独立资源，V5 须检查主体缺损、残留背景、色边和半透明区域，并记录通过状态与人工检查证据。

> 适用技术栈：phaser、threejs。

V3 布局必须后置于拆解图确认：阶段 A 先由冻结原图、区域和组件事实生成拆解图及技术 JSON，并明确按确认顺序排列的 `decomposition_elements`；只有图中内容或分组需要更正时，用户才通过指出具体图号提出修改，代理更新并重出图片，再确认最终拆解图。默认不先给文字提案，也不要求用户查看技术 JSON。只有 `visual-decomposition-confirmation/1.0` 通过后，智能布局才结合原图构图、视觉重心和元素语义，为每个确认元素按原顺序生成唯一的 `left/center/right × top/center/bottom` 对齐决策；几何测量不得替代该视觉判断。布局入口只消费该决策与 `proposal.decomposition_elements`，按原顺序推导后置布局节点并生成独立布局标注图；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`。不能读取预存 `layout_nodes`，也不生成新的视觉参考图或多个布局候选。布局决策和布局图由代理内部维护；只有用户在布局图（需要交互对照时可使用同批审阅页）中发现需更正的关系时，才按反馈修改并重出图，再以 `layout-annotation-confirmation/1.0` 绑定用户看到的最终图、决策文件及全部上游身份。两次确认仍分别是人工确认，且不得合并或跳过。

> 适用技术栈：phaser、threejs。

布局图的每个框必须与右栏共用唯一短编号，并注明父编号，保持确认元素原序；编号避让只能调整标注，不得改变元素布局。右栏逐节点说明自身相对上级的双轴停靠、锚点与偏移，父容器、空容器同样必填，根明确无上级。技术 ID 和四边距离仅辅助追溯；长说明必须换行且完整可见，不能用被裁切的文本或元数据完整标记代替可读图。详细规则见 “UI 布局合同”（见本栈配套资料）。

> 适用技术栈：phaser、threejs。

V3 阶段 B 的唯一生成入口还必须在 PNG 输出目录同步写入 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`。审阅页直接消费本批冻结参考图/节点数据，使用同一坐标映射展示当前与父节点关系；候选状态、离线约束、名称回退、实际文件及独立布局确认的完整字段见“离线布局审阅产物”（见本栈配套资料）。这些产物属于可读审阅和可追溯交付，不能替代标准 PNG、F2 机器门或 V5 证据。

## V4 正式资源生产与资源级验收

> 适用技术栈：cocos、phaser、threejs。

1. 按冻结场景顺序和 V3 清单生产运行时文件；当前 V4 范围内相互独立的静态 component × required state 待生成图片统一按下述批量规则提交，不逐张创建或串行等待生成任务。有父图依赖的图片帧动画遵守自身制作与逐张确认合同。不静默覆盖已验收版本；同步登记来源、生成记录和适用的版权/许可信息。

> 适用技术栈：cocos、phaser、threejs。

2. 每项图片必须记录 CSS 逻辑显示范围、最大 intended scale、生产分辨率、source/runtime 文件尺寸，以及在代表性视口中是否会被放大；分辨率不足时阻断 V4，简单插值放大不得作为清晰度修复。生成式图片仍使用固定 1:1 生产基线，不能用运行时动态 DPR 或其上限 2 替代；历史 1.5/2 倍生产证据须重生成或标记 `stale`。

> 适用技术栈：cocos、phaser、threejs。

4. `accepted` 资源必须有可编辑来源或生成记录、正式输出文件和资源级加载/视觉证据；涉及外部素材时保留版权/许可记录。无 `source_file/source_files` 时，生成记录必须带公共 record ID、生成器/版本、时间、可执行命令或配方、输入来源和参数；AI 路线在此基础上保留专用提示词、模型、种子、参考输入和后处理字段。正式 Scene 消费与玩法运行轨迹在 V5 验证。启用 `--check-files` 时所有声明文件必须存在。

> 适用技术栈：cocos、phaser、threejs。

5. V4 只验证 V2 已定义或原子资源已引用且在 V3 写入的预算；超预算先阻断并重验当前门，只有预算基线或冻结生产计划必须实质修改时才 `return` 到 V3，不能在验收时临时放宽。

> 适用技术栈：cocos、phaser、threejs。

6. 所有标准路径都在 V4 做确定性机器 F2。资源问题留在 V4；跨域集成风险不在资源层提前做 F3。普通本地集成不因 A4 等级标签额外等待审批，外部写入、付费、真机、破坏性或外部删除和发布才进入精确操作批准。

> 适用技术栈：cocos、phaser、threejs。

7. 每个生产包直接提供图片画廊或联系表，并保留每项原尺寸放大查看入口；画廊中并排呈现逐资源对照，引用具体区域和可观察事实，方便检查形状、比例、材质、光源、描边、色彩和渲染密度。场景同屏组合由用户在 V5 实际运行验收中检查。随附文字只列失败、缺失和待处理差异，不先要求确认文字报告。

> 适用技术栈：cocos、phaser、threejs。

8. 忠实还原逐资源和同屏核对其是否支持冻结视觉事实；逐资源检查须在画廊中把冻结 region、原始生成图、最终运行图并排按实际显示尺寸查看，并允许放大，再在正式布局中复核。轮廓、比例、姿态、符号语义、主色分布、材质、光源和装饰密度任一出现可辨认偏离时，该项标为失败并进入修复批次，不能只凭提示词合规、文件齐全或 `usability` 可用性通过。返修直接展示参考/修前/修后三图供用户确认修复效果，并按图像反馈继续返修，不另等文字修复方案确认。技术 ID、文件路径或普通生产方案调整由代理更新内部计划、身份绑定并重验；若已确认的拆解标签或生产边界改变，重出受影响拆解图并由用户看图确认；只有冻结视觉目标、玩法语义、任务范围或授权发生实质变化时才询问具体取舍。不得用整屏铺图、隐藏层或不可交互栅格绕过结构化实现及差异审计。

> 适用技术栈：cocos、phaser、threejs。

9. 运行 `production_contract_audit`，逐区域比较 V3 预期方法/交付类型与实际输出、生成记录和运行时消费；缺文件、缺记录、格式不符或实际方法漂移必须带阶段、编号、区域、expected/observed method 返回失败。原生路线对照实现中的冻结 `render_contract`，图片路线对照实际独立输出和消费记录。

> 适用技术栈：cocos、phaser、threejs。

10. 正式图片生成、透明处理与尺寸归一化后，按“正式图片生成后的共享与复用”（见本栈配套资料）核实实际共用需求与各消费位置的适用性，记录共享候选、已确认复用关系或保持独立的原因。已通过者登记权威资源身份、全部消费位置、使用限制和证据；待人工视觉检查者保持候选。后续任务先查此记录，但不因功能相同或视觉相似直接换源，也不改写本轮真实生成记录或已冻结的独立生产合同。

> 适用技术栈：cocos、phaser、threejs。

V4 以文件、性能、加载、响应式、`production_contract_audit` 和一致性证据判断工程可交付。工程结论不能覆盖 V3 拆解方案、当前 `AUTO`/`USER_DECISION` 记录、视觉可交付或全局一致性失效。

## 图片批量生成

> 适用技术栈：cocos、phaser、threejs。

本节适用于相互独立的静态 component × required state 图片。存在父图依赖的图片帧动画按“帧动画合同”（见本栈配套资料）及“图片递归补帧规则”（见本栈配套资料）逐张确认后推进；只有已满足父图与确认前置且相互独立的区间可按动画合同并行，不能套用本节跳过确认。

> 适用技术栈：cocos、phaser、threejs。

开始生成前，从当前已完成 V3 确认的生产范围收齐上述静态待生成图片，按唯一 component × required state 去重，形成一个批量生成任务。每项携带资源身份、完整提示词、实际参考输入、尺寸/背景合同和独立输出路径；共享 placements 复用同一项。复用资源、程序实现和尚未满足 V3 前置的显示层待办不计入本批。

> 适用技术栈：cocos、phaser、threejs。

一次提交整批任务，不采用“生成一张 → 等待完成或验收 → 再提交下一张”的调度。工具支持批量请求时一次传入全部条目；只支持单图调用时，在同一批任务内一次编排所有条目并按工具允许的并发执行，不能退回逐图工作项。工具的容量限制只影响批内执行，不改变完整批次范围。

> 适用技术栈：cocos、phaser、threejs。

批量是任务提交粒度，每项仍交付独立位图并保留各自生成记录；`individual + atlas_allowed=false` 不变，禁止把整批合成一张图再裁切。每项沿用原图、透明路线去背、尺寸归一化的依赖顺序；批次完成后汇总成功、失败和缺失项，直接提供可逐张放大的画廊/联系表供视觉验收；文字只汇报失败、缺失和待处理差异。同屏组合在 V5 正式运行验收中检查。效果图中的小部件按“提示词合同”（见本栈配套资料）同时发送完整冻结图与同源局部细节参考。每项先由代理记录具体偏差及对应冻结事实，再只把生成失败、缺失或视觉偏离项汇总为修复批次；直接展示参考图、修前图、修后图并排供用户确认修复效果，并按图像反馈继续返修，不等待文字方案确认。技术 ID、文件路径或普通生产方案调整由代理更新内部计划、身份绑定并重验；若已确认拆解标签或生产边界改变，重出受影响拆解图供用户确认；只有冻结目标、玩法语义、任务范围或授权发生实质变化时才询问具体取舍。已通过项不重复生成。沿用每项既有重试上限；到达上限仍无法忠实还原时报告阻塞和差异，不能把偏离项标为成功或用同屏可用性结论掩盖。

## V5 正式还原与动态玩法视觉验收

> 适用技术栈：cocos、phaser、threejs。

2. 玩法、美术边界与跨边界处理见[玩法与美术职责](./gameplay-implementation.md#玩法与美术职责)。

> 适用技术栈：cocos、phaser、threejs。

3. 提供动态可玩片段、同屏截图或可复现交互轨迹，对照主锚点和分系统锚点验证跨场景/状态的视觉质量；响应式路径提供完整 viewport、resize 前后测量、安全区和多比例证据，并作为 V5 候选的 F2/F3 证据。

> 适用技术栈：cocos、phaser、threejs。

4. 清除低保真纹理、占位纹理键、临时路径、fallback、代码分支和运行时引用；保留调试工具必须与正式运行隔离。

> 适用技术栈：cocos、phaser、threejs。

5. 所有路径在 V5 后由 F3 绑定当前候选工程证据；只有外部写入、付费、真机、破坏性或外部删除和发布等具有副作用的 A4-A6 操作在 F4 请求精确操作批准。资源执行和上游事实未变的机器证据偏差在当前门 `repair`/`revalidate`；只有生产设计、冻结基线、拆解方案或结构真实变化时才 `return` 到 V2/V3/V4 中最早受影响阶段，并使对应下游证据失效。

> 适用技术栈：cocos、phaser、threejs。

6. 忠实还原默认使用 `visual_validation.mode=usability`，在代表性视口/状态以完整可读画面为主证据，检查关系、可读性、边界、遮挡和交互；位置、尺寸、边距和换行的小幅差异不单独阻断。只有 `exact` 或明确精确需求时才逐项验证完整忠实度矩阵、严格容差、ROI/叠加/像素差和全视口/全状态覆盖，动画/VFX 仍不得只看像素差。

> 适用技术栈：cocos、phaser、threejs。

7. V5 硬门必须同时绑定 V3、`visualProductionUnits` 实施包、V4 production contract audit、F2 `validationMode=MACHINE` 事实、F3 runtime replay、fidelity cases、正式场景实际消费和无未批准替换；任一关键项缺失或身份漂移都不得声明完成。V5 的实际运行验收沿用 V2 冻结的视觉方向和 V3 确认的布局目标。

## 完成条件

> 适用技术栈：cocos、phaser、threejs。

当前场景只有在功能代码、V3 规划、全部正式资源 V4 `accepted`、V5 正式接入、占位清理，以及功能、视觉、响应式和性能联合证据全部有效后才能报告完成。任务范围内场景和功能关闭前不得据此宣称 G1 完成。

## 原子视觉拆解补充

> 适用技术栈：cocos、phaser、threejs。

拆解顺序固定为“先状态分析，再按可复用部件拆解”：`component_count` 只计算唯一原子视觉部件，`visible_instance_count` 通过多个 `placements` 表达重复实例。② 的六个顶部按钮分别登记六个 component；⑧ 的三个相同表面可登记一个 component 加三个 placements，⑨ 的三个动作图标按实际复用关系登记。生成式位图每个唯一 `component×required state` 必须独立位图，强制 `individual + atlas_allowed=false`，不能以编号级组合图或图集替代；atlas 仅适用于其他生产方法的显式切片合同。交互热区绑定 placement 且不计入视觉资产。实际状态证据、目标文件、分析 ID 和完成时间必须先于 component inventory。

## 场景级效果图还原门

> 适用技术栈：cocos、phaser、threejs。

效果图路线在 foundation-only 基础实施完成后进入场景 V2，并在 V2 内建立并冻结 `scene_reconstruction_contract`、scene master、显示层 inventory、宿主场景上下文效果图和初步还原草案。V2 负责冻结视觉事实、整屏构图、目标绑定布局、响应式关系、项目容差、`visual_validation.mode`（默认 `usability`）和可供确认的初步拆解；V3 直接输出拆解图和技术 JSON，用同一套拆解事实确认 component×state、尺寸、停靠/父子/对齐关系、显示层、资源生产路线和容差。V4 完成正式资源验收，V5 在宿主场景上组合并重放打开→交互→关闭/恢复轨迹。

> 适用技术栈：cocos、phaser、threejs。

V5 直接在正式场景中实现并校准 V3 布局和 V4 正式资源。V5 要求重建合同、layout、V3/V4、适用功能与可用性验证、真实运行及正式 Scene 消费证据通过；完整逐区域精确 fidelity 仅在 exact 模式要求。资源 loaded/used 或 `missing=0` 只能构成工程子门。

## 场景还原硬门与 CLI 回执

> 适用技术栈：cocos、phaser、threejs。

效果图路线按 `V2 → V3 → V4 → V5` 单向推进：V2 生成或接收并冻结 reference target、scene master、宿主上下文图、`reference_technical_conflicts`、整屏构图、布局/响应式关系、逐区域事实、项目 tolerance 和初步还原草案；V3 绑定拆解图、proposal 技术 JSON、合同回对、coverage、component×state、当前候选版本和拆解方案确认；V3→V4 缺字段直接以 `方案缺失` 回 `V2/PROPOSAL`。V4 绑定资源生产实施包与资源合同，完成资源级验收；V5 绑定正式 Scene 结构、运行时组合与 `scene_asset_usage`，执行真实文件门、F2 两类机器证据、F3 runtime replay 和正式 Scene consumption。

> 适用技术栈：cocos、phaser、threejs。

默认 `visual_validation.mode=usability` 记录实际 viewport/DPR、可读完整画面、关键关系、可见性和交互证据，只接受已声明适配或已确认目标容差内的位置/尺寸变化，以及已声明的背景出血、滚动裁切。在现有机器合同中，只有 `exact` 才强制 `normalization_equivalence`、非空 `difference_evidence`、完整逐 region 的 target/candidate、delta、预声明 `tolerance_reference`、result、evidence 和 `exception_ids`，并按严格容差判定。其他模式仍按工作流记录基准对照条件；该要求不表示机器已强制等价证明。局部临时 tolerance 不具备精确合同效力。普通问题先原地修复和定向重验；仅上游目标、设计或任务范围真实变化才回退。

> 适用技术栈：cocos、phaser、threejs。

门禁回执示例：

> 适用技术栈：cocos、phaser、threejs。

```text
失败：node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V5
典型输出：V5 必须显式 checkFiles=true；未执行真实文件门，V5 FAIL。
成功：node scripts/validate_visual_manifest.mjs docs/visual-assets.json --stage V5 --check-files --project-root .
典型输出：结构合同、正式场景运行组合、F2、fidelity、runtime 和文件证据全部通过，退出码 0。
```

## 全局视觉一致性输入

> 适用技术栈：cocos、phaser、threejs。

在任何场景效果图或正式资源生成调用前，必须引用已冻结的全局 `visual_baseline`；全局候选、人工选择、冻结状态及跨 Work Item 文件门以“全局视觉控制”（见本栈配套资料）和控制面 Schema 为准。该基线同时作用于 scene master/reference target、显示层上下文图和原子生成式位图资产；原子资产必须保留完整冻结效果图主参考，再把全局锚点作为额外 style references。generated 记录必须留下实际完整提示词、实际生成器/版本、canonical 一致性段、禁止风格迁移策略、实际输出和一致性证据；provided 只登记外部来源。文件门读取这些实际文件；基线或锚点的实际事实不再满足当前要求时，重新判断受影响证据，不因摘要变化使证据失效。

## 拆解图确认（视觉硬门）

> 适用技术栈：phaser、threejs。

V3 完成拆解图、技术 JSON、component×state、生产合同和合同回对后，通过 `visual-decomposition-confirmation/1.0` 冻结还原方案；随后完成独立布局确认。确认记录以 `confirmation_mode=manual`、`status=accepted` 记录实际 annotation/proposal/decision 文件、当前工作项/场景/版本、全部编号和用户原文；这些 V3 方案身份变化才需要重新确认。V4 的 fixed asset、component×state 与资源 F2 检查，以及 V5 正式场景的同屏组合、适用逐区域 fidelity 与运行 F2 检查，由当前身份的机器证据核对可确定性事实；overlay/diff 仅在 exact 或明确需求时强制。机器不推导视觉舒适、质感或主题结论；V5 按观看情境交付正式运行画面和持续游玩片段供用户检查。后续候选的正常演进不重开无关方向决定，但实际变化的画面仍按当前阶段复验，机器或人工证据缺失时不得宣称整体视觉通过。
