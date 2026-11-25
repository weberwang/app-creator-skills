---
name: app-creator-workflow
description: 开发或迭代游戏、Flutter 与 Expo 应用、ESP32 自带屏幕 GUI 及 Node.js 服务器时，统一编排需求、架构、基础工程、功能、验证与交付；按当前技术栈加载独立规范，有界面时使用视觉流程。
---

# 游戏与应用统一编排

游戏大场景、长游戏流程、复杂页面或跨页面流程按[多状态与多步骤的分批生产](../app-domain-toolkit/references/incremental-production.md)关联总范围、本批范围、行为步骤及实际证据。游戏先明确区域／机制／解锁的整体骨架，再按连续可玩路径分批，逐批验证邻区与已有内容衔接，按风险补状态复现、持续运行和长期体验检查；不等待全游戏完成才集成。小范围修改沿用已有任务。

3D 世界按[可玩路径推进](../app-domain-toolkit/references/incremental-production.md#world-3d-playable-path)选择首批或受影响的代表路径。所有 3D 世界场景在 V1 搭建或复用有效白模，按空间、镜头、碰撞和交互风险选择运行验证，再沿路径交接约束、验证适用首件并回归正式场景与邻区。

V2 从 V1 只接收确认过的功能要求，基于全局视觉方向独立设计模块画面。V1 草稿、线框和原型画面仅用于功能验证，禁止用作 V2 视觉输入。按[正式出稿输入](references/workflow.md#v2-design-inputs)展示当前模块的全部适用要素与必要状态，供 V3 拆解交接。图片目标覆盖该模块的 UI、精灵、地块、二维背景与反馈及适用的 3D 场景二维内容。一张能清楚容纳时使用一张，不够时拆分多张并沿用同一场景和共享设计来源。宿主场景和其他模块仅引用说明当前交互所需的上下文。3D 空间通过白模、空间规格及相机路径表达，机位预览按需提供。V3 按已确认空间拆分模型，V4 按需选择本地模型、生成 API 或 Blender，并在目标引擎核对接入。沿用[3D 设计与模型交接](../app-workflow-control/references/world3d-scenes.md#world-camera-designs)。

第 4 阶段先[调研相关产品并找美术设定参考](references/professional-conventions.md#product-market-research)，再按[目标版本统一视觉](references/workflow.md#目标版本统一视觉)确认并冻结全局视觉方向和代表稿。第 5 阶段 V1 确认完整模块方案，V2 生成并确认覆盖全部适用流程、进度与状态的模块稿，V3 拆解该确认稿，V4 同批还原文字与其他资源并验收试装，V5 完整实现与正式运行验收。出稿或实现前仍无法明确模块设计时，先[请用户选择定向调研或人工调整](references/workflow.md#module-design-decision)。模块稿变更回 V2，全局方向变更回第 4 阶段。

每次只执行当前工作项所需的布局脚本，并显式限定本次目标。V4 验收完成后，禁止执行工作流生成的布局写入脚本。V5 和后续调整直接修改正式布局源，保留人工调整，遵循[布局脚本执行规则](../app-domain-toolkit/references/editor-display-authoring.md#layout-script-stop-after-v4)。

App 按[多页面推进顺序](../app-domain-toolkit/references/incremental-production.md#多页面推进顺序)在第 4 阶段通过代表页建立并确认全局基线，各 `PAGE` 在 V2 生成并确认覆盖适用状态和进度的模块稿，依赖和所有权明确后推进 V3–V5。

App 默认按[Figma 设计与还原](../app-ui-layout/references/figma-app-design.md)在第 4 阶段确认代表页及全局方向，V2 完成模块稿生成、用户确认与可编辑设计，V3 从该确认版本提取规格。实际预览的人工结果单独记录。

游戏世界 `SCENE` 在 V1 开始按[场景与关卡设计任务](../app-domain-toolkit/references/game-design-exploration.md#v1-scene-design-task)尝试执行设计，先核对本批范围与已有方案。新场景或空间、路线、镜头及关键玩法实质变化时形成或修订空间、尺度和镜头依据。3D 世界在 V1 搭建或复用白模。2D 使用平面布局和正式工程，禁止白模。HUD、菜单和非游戏 App 按原界面流程推进。第 4 阶段冻结全局方向，V1 确认完整模块方案，V2 设计并确认模块画面，V5 实现与验收。

可见内容必须先按[通用分析的统一执行要求](references/professional-conventions.md#product-market-research)完成市场、竞品、受众与参考分析，已有有效结论核实后复用，只补查缺失或变化部分；再按共同权威[体验、视觉方向与意图表达](../app-asset-workflow/references/interface-intent.md#design-basis)，从本批真实用户行为、使用压力和适用状态形成有依据的视觉方向，区分硬约束、方向与探索空间，决定文字、美术及制作输入。游戏在原方案确定判断、场景线索、行动、反馈及必要精确信息，区分世界物件、地面区域、角色附属、场景浮层和 HUD，交接真实状态显隐。白模调试标签不直接继承为正式画面。需要多方向比较时，按[候选视觉语言与生成约束](../app-asset-workflow/references/style-and-production.md)分别定义造型、比例、材质、明暗边缘、功能色、UI 图标与制作路线，沿用当前路线的候选数量；实际可读性和风格差异仍由用户判断。

游戏包含声音反馈时，由 [app-audio](../app-audio/SKILL.md) 按[音效设计与生产](../app-audio/references/sfx-production.md#design)从本批事件确定声音风格、分层和代表样本，再交接受控变体、动态混音及情境试听返修。影响机制理解的样本可在 V1 前探索，V1 验证真实触发；纯音频任务沿用模块／资源实施单元，不要求视觉设计稿或 V2/V3 确认。

非游戏客户端仅在已确认需求包含声音时，按[App 音频工作流](../app-domain-toolkit/references/app-audio.md)区分提示音、内容播放、录音／语音及平台通知；先出本批方案并验证代表用例，再复用到实际消费者。无需求则跳过，不默认添加界面音效或背景音乐；音频功能不强制制作素材，前后台策略按用途决定。沿用当前栈真实能力，不调用未声明的 `app-audio` 原生模式；纯音频不新增视觉阶段。

选定 CrazyGames、微信小游戏、抖音小游戏、TapTap、Google Play 或 App Store 时，按[渠道平台接入](../app-release/references/channel-platform-integration.md)从需求、架构和基础工程安排实际适配任务，按本批能力验证并在最终候选逐渠道核对；TapTap 的开发者中心管理与运营按 [CLI 专项](../app-release/references/channel-platforms/taptap.md)执行，登录、合规、变现和生态服务按[运行时与语言复用](../app-release/references/taptap-runtime-integration.md)及[材料政策](../app-release/references/taptap-materials-policy.md)进入既有工作项。普通项目不默认启用全部渠道，宿主 SDK 与 MAX 原生方案分别适用，不另建发布状态机。

渠道 SDK 先按[分类、多选确认和统一接入](../app-release/references/channel-sdk-selection.md)汇总本批平台必接、产品功能依赖和可选项，集中展示依赖／互斥、材料及已有实现。存在未决可选项时等待用户明确选择或全部不选，再把必须项、已选项及依赖统一交接；已有完整确认直接复用，等待期间继续不依赖该选择的工作。规划阶段等待选择与运行时 SDK 独立启动分别处理，法定限制和平台必需前置仍须落实。

以 [app-workflow-control](../app-workflow-control/SKILL.md) 为唯一状态、门禁、执行结果与证据权威。按[七阶段](references/workflow.md#七阶段)从商业立项推进到模块集成与整体验收，发布任务按明确委托独立处理。可见增量在模块任务记录范围后进入 V1；纯非视觉修改按实际影响验证。

默认不编排隐私弹窗、隐私中心及同意管理等业务，仅在用户明确要求或已确认项目需求包含时实施；不擅自删除已有业务。涉及明确纳入范围的隐私流程或任何 SDK 接入、升级与行为调整时，读取[隐私流程与 SDK 解耦约束](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#隐私流程与-sdk-解耦)，按其中的工作流接入要求更新方案、实现和验证；解耦不允许绕过授权条件。

客户端错误反馈按[错误提示形式](../app-domain-toolkit/references/ui-copy-principles.md#错误提示形式)分流。第 4 阶段定[弹窗公共方案](../app-domain-toolkit/references/reference-domain-display-ownership.md#弹窗公共设计方案)和 Toast 的全局风格，模块 V2 设计其适用状态。实际 DISPLAY_LAYER 的模块及宿主组合分别验证。

涉及场景／页面切换或弹出层时统一遵循[场景与弹出层统一加载](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)：共用唯一加载服务和全局显示层，场景使用不透明全屏过渡、弹窗使用半透明蒙层，并发时场景样式优先；按请求身份与独立令牌管理取消、替代、失败和输入交接。所有应用自有弹窗都必须动态加载。宿主显示树中的所有弹窗共用一个弹窗层父节点，禁止预置弹窗实例（包括隐藏或禁用的节点）。首次打开才加载资源，每次打开创建新实例并直接挂到该层，读取当前业务数据；关闭时停止任务，退场结束即从显示树移除并销毁实例，弹窗只缓存预制体；场景切换清理旧宿主弹出层、任务与独占资源，后台预取保持静默。

## 进入任务

任务按[最小约定](references/output-files.md#每项任务的最小约定)明确目标与结果、涉及写入／输出时的路径、完成条件与验证方式。负责人默认当前代理，委派／并行／交接时才注明；版本、依赖、消费者及保留去向按需补充，已有规则直接引用。正式委派和工具合同必填项保留，机器证据仍使用当前 `evidenceRoot`，不覆盖冻结文件或为小任务额外生成报告。

游戏与非游戏 App 均按[系统与模块覆盖](references/system-module-coverage.md)在需求／全局基线识别必要能力，实施前设计本批规则并关联需求、模块、任务和验证。明确实施、复用、后置、不需要或待决定；本批依赖不能后置或未决。Work Plan 的 `systemCoverage` 是实施必需合同，不能仅列页面／场景任务或依靠视觉设计补业务规则；小任务沿已有依据做局部覆盖。

游戏在 GDD 定义核心循环时同步规划[广告体验与动态反馈](references/domain-production.md#游戏策划中的广告与反馈)。逐批从玩家路径和模块交接反查任务，将适用广告位和关键反馈纳入首次可玩切片及正式集成验证。

每轮按[增量影响与复用范围](references/professional-conventions.md#incremental-change-impact)确定真实消费者、需要修改与重验的部分，影响不明时先追踪依赖；小修改在已有计划中简述即可。新项目按[正式功能切片](references/workflow.md#功能切片与跨对象依赖)先贯通最小用户路径，后续沿同一正式工程演进，不另建长期 Demo 或在 V5 重写已验证机制。

按[项目整理与产物清理](../app-artifact-cleanup/references/project-cleanup.md)安排适用的记录与项目内容核对，任务只明确清理结果、允许范围及验证方式；涉及移动／删除时补齐引用与恢复依据，协作时明确写者。已有证据按变化复用，不反复全仓扫描，提交／发布去向到对应环节核对；冻结确认和有效证据链不得为清理改写。

项目根 `.agents/` 按[本地工具目录与项目范围](references/workflow.md#本地工具目录与项目范围)处理：Git 忽略且不追踪，普通业务变更/快照、扫描、清理和打包排除它；安装更新不触发业务返工，技能读取与明确的本地维护仍可执行。

前台加载按[加载显示任务拆解与交接](../app-domain-toolkit/references/reference-domain-display-ownership.md#加载显示任务拆解与交接)覆盖服务与最小视图、正式设计、素材、业务接入及验证。各项明确结果、相关路径和完成条件，分工与依赖仅在实际协作或有前置要求时补充；服务实现不能代替正式加载画面交付。

涉及性能预算、瓶颈定位或优化时，按[性能预算、定位与优化复验](../app-domain-toolkit/references/performance-optimization.md)明确范围与目标，先采集可比基线，再定向优化并核对收益、副作用和功能回归；沿用各栈原生工具与现有证据。普通开发不扩展成全项目优化，发布额外检查／优化／图集沿用真实用户选择，不自动生成图集或执行图片改写、真机验收。

自有客户端目标包含 Android、iOS/iPadOS，且新建基础工程或修改启动链路时，按[系统启动屏制作与交付](../app-domain-toolkit/references/system-launch-screen.md)安排平台配置、本地资源、首帧衔接及验证；游戏与非游戏 App 分别遵守目标平台内容要求，不默认添加 Logo＋文本品牌页，不为其他目标引入移动启动屏。Roblox 体验运行在平台客户端中，采用本栈实际加载和传送路线，不为它制作独立 APK/IPA 或自有系统启动屏。

技术方案统一遵循[官方优先、社区其次、最后自研](references/professional-conventions.md#solution-selection)。在全局基线及后续功能增量的实施前完成适用性核实，将来源与取舍写入已有计划，并随实施交接和质量审查核对；不新增状态或审批步骤。

基础工程、插件或 SDK 接入按[工具能力核实](../app-domain-toolkit/references/tool-capability-verification.md)区分资料、连接、执行和真实结果；需要运行时按[统一运行验证](../app-quality-review/references/runtime-validation.md)复用实际实例、执行受影响操作并清理本任务资源。素材生产及复用按[来源与消费者关联](../app-asset-workflow/references/asset-provenance.md)更新现有清单，跨设计稿相同元素从设计阶段遵守其中的[共享元素约束](../app-asset-workflow/references/asset-provenance.md#shared-design-elements)；候选准备按[构建输出绑定](../app-release/references/release-readiness.md#实际构建输出与候选绑定)核对真实输出与当前输入。只对本次适用职责安排任务，不增加必填账本或另一套控制流程。

各栈项目采用可视化编辑器时，按[编辑器优先](../app-domain-toolkit/references/editor-display-authoring.md#编辑器优先)把可配置功能保存在正式可编辑源中。功能函数实现后，编辑器支持的事件必须[在正式资产中绑定并由真实事件触发](../app-domain-toolkit/references/editor-display-authoring.md#editor-event-binding)。业务代码读取正式配置并负责运行时行为，启动时不重建已配置节点或覆盖布局。新增显示内容和普通增量同样适用。

各技术栈新增或修改可见表现时，按[增量显示约束](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)在模块任务确定范围，补齐位置、父子关系、尺寸、层序及输入约定，再推进 V1–V5。按真实范围复用原组件、资源与程序表现。

1. 先读项目约束、已有控制记录、技术版本与已有进程；不得擅自创建分支或 worktree。发现可复用的引擎、浏览器或开发服务后复用，不能为了验证另启实例。若项目还有旧栈总控或编排技能，明确本次只使用公共总控，不运行两套状态机，也不静默把旧批准转换为新记录。
2. 按项目事实选择一个技术栈，并读取其能力与原生模式索引。按当前任务进入唯一公共能力，再通过 `native-adapters.json` 选择本栈模式；使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <能力名> [sourceSkill]` 读取对应原生章节、直接公共依赖与资源路径，多模式必须指定来源。索引摘要不能代替专业规范，未展开的脚本、模板和校验器仍按任务读取。用户指定优先；同时含多个栈时按模块拆工作项，明确边界与接口，不将多个栈塞进同一实施包。目标只是文案、注释或事实查询时不建立完整项目流程。
3. 明确目标、非目标、文件/对象所有权与可观察验收；先只读补事实。出现确实需要用户取舍的缺口时进入 [grilling](../grilling/SKILL.md)，继续不依赖该决定的工作，不能把正常实现变成逐步审批。
   包含客户端界面的新项目初始化时询问用户支持的界面语言：默认简体中文 `zh-CN`，英语 `en`、日语 `ja`、俄语 `ru`、西班牙语 `es` 可按需追加；给出默认选项并等待用户选择，已有明确语言决定时不重复询问。将确认的语言清单和默认显示语言写入项目配置并用于各栈实现、字体与验证；默认显示语言必须在清单内。语言选择未答复时继续不依赖该选择的工作，不能把预选项当作确认。既有项目沿用其已确认的语言范围，不因局部修复重问或擅自扩展。
4. 创建或读取 Work Item，按[统一流程](references/workflow.md)选择七阶段及适用的 V1–V5。产品规格决定首批、完整和后续版本，V1 对照本轮玩法、内容、配置与规则完整确定机制、可达状态、流程、进度及组合结果，记录依赖和验收；规则不清时做 grilling 并更新方案后进入 V2。导航、主页及共享路由按[功能范围与跨对象依赖](../app-workflow-control/references/function-dependencies.md#导航框架与共享路由)划分。单个本地工程修复可用 `init --mode light`，仍须 F0–F3 和真实单元证据。用 `plan --spec` 冻结实际计划，用 `record --report` 关联实际执行结果。共享配置和原生编辑器保持单写者。
   有图片设计的项目在首次适用的 `app-workflow init` 按[图片路线初始化](../app-asset-workflow/references/image-generation.md)冻结两项选择。设计稿默认使用预检通过的 Codex，预检失败时在此处交用户选择可用方式。正式静态单图默认采用 SVG 重绘转 PNG。后续出稿、制作和返修读取工作项的冻结记录。
5. 涉及可见内容时，按[显示结构约定](../app-domain-toolkit/references/reference-domain-display-ownership.md#公共显示结构约定)明确宿主及职责。第 4 阶段确认全局视觉方向，V1 确认模块方案，V2 生成覆盖本轮全部状态、进度、文案、广告位和反馈的模块稿并取得用户确认，V3 拆解同一确认稿，V5 完整实现与验收。实际显示与手感由用户人工确认。
   制作前按本批深度核对[能力与动作语义](../app-asset-workflow/references/interface-intent.md#capability-semantics)，在布局和生图前按[最少必要文字](../app-domain-toolkit/references/ui-copy-principles.md#最少必要文字)完成文案取舍，并在原方案记录结论及视觉依据。每次实际生图前将这些结论转成当次提示词，按[生成前约束](../app-asset-workflow/references/style-and-production.md#生成前约束)检查冲突、来源角色及探索边界后调用工具，保存真实发送内容。正式场景、页面和显示层的图片目标须使用[实机运行画面约束](../app-asset-workflow/references/style-and-production.md#runtime-view-image)，明确描绘目标设备上可实现的实际视口。生图用于适合的路线和产物，不成为所有显示任务的必经步骤。
   代理可按[单次用户视角审查](../app-asset-workflow/references/art-review.md#当前设计稿的单次用户视角审查)核对真实设计节点与可测事实。V2 审稿按[最少必要文字](../app-domain-toolkit/references/ui-copy-principles.md#最少必要文字)逐项确认可见文案，V4 随资源试装时按确认稿逐项还原，V5 复验正式显示。实现时保留完整的无障碍名称与状态语义。未经明确授权不得自动分析设计稿或运行截图，截图交用户检查。非游戏 App 的 V3 从所选稿提取必要还原交接，表达清楚时不重画拆解图、布局图或重复要求人工批准；V4 前段按[代表性接入与分批协作](../app-asset-workflow/SKILL.md#代表性接入与分批协作)试接实际组件，再分批扩展。共享文件和原生编辑器保持单写者。
   保留的可见文字按[文字样式交接与验收](../app-domain-toolkit/references/ui-copy-principles.md#文字样式交接与验收)在 V3 绑定设计来源和样式目标，在 V5 用当前正式运行的原生回读核对。
6. 交付前将[主要任务与一个适用异常的有界复核](../app-asset-workflow/references/interface-intent.md#bounded-review)合入已有检查，主动修正内容、结构、交互语义与一致性问题，不新增审查轮次或绕过人工看图要求。实施后按[验证与交付](references/verification.md)先推荐 T0–T3 的理由、覆盖与命令，再自动执行；记录真实结果。失败先诊断设计、提示词、生成、还原或适配原因，再 repair/revalidate，仅上游目标或范围真实失效才显式 return。
   按[持续迭代收尾](references/workflow.md#持续迭代与可接手收尾)沉淀必要回归测试，更新受影响的当前项目说明并处理临时实现；按[精简交付](references/output-files.md#精简交付)简短反馈，不默认生成独立报告，不增加状态或审批。

| 技术栈 | 独立规范 | 识别依据 |
| --- | --- | --- |
| Unity | `$app-stack-unity` | ProjectSettings/ProjectVersion.txt、Packages/manifest.json |
| Roblox | `$app-stack-roblox` | 用户选定或已连接的 Roblox Studio Place，或核实后的 `.rbxl`/`.rbxlx` 正式文件；单个 `.luau` 文件不能单独证明 |
| Cocos Creator | `$app-stack-cocos` | Creator 工程与 assets/settings/profiles |
| Phaser | `$app-stack-phaser` | package.json 的 Phaser 依赖与实际版本 |
| Three.js | `$app-stack-threejs` | package.json 的 three 依赖及真实 3D 运行入口 |
| Flutter | `$app-stack-flutter` | pubspec.yaml、FVM 配置及 Flutter SDK 依赖 |
| Expo | `$app-stack-expo` | Expo 与 React Native 实际依赖、app.json/app.config.* 及实际应用入口；不能仅凭 package.json 判断 |
| ESP32 | `$app-stack-esp32` | 实际芯片/板卡、ESP-IDF 目标与组件配置，或 platformio.ini 中的 ESP32 平台/框架 |
| Node.js | `$app-stack-nodejs` | 实际服务器/消费者入口、服务端依赖、运行与部署脚本；仅有 package.json 或前端构建工具不能证明本栈 |

探测文件只是线索。`package.json`、`assets/` 等通用文件不能独立证明技术栈；读取依赖和项目设置，仍无法判定时只问技术选择，不替用户重建项目。

Roblox 使用 `SCENE`、独立 `DISPLAY_LAYER` 与 `MODULE`，由当前 Studio 的 Edit 正式源与 Client/Server 运行分别承载；同一 Place 可以包含多个功能或关卡。先按 [Roblox 技术栈](../app-stack-roblox/SKILL.md)确认目标实例、脚本同步、正式 Place 快照与实际工具；Studio 工具结果或 Play 状态不能代替项目内实际保存的正式源。Studio 未连接时继续不依赖它的仓库工作，相关运行、源回读及人工视觉结论保持未验证。

Expo 使用 React Native 的 PAGE 与独立 DISPLAY_LAYER，原生与 Web 按已选平台分别验证；采用项目实际 SDK、导航和原生工程维护方式。Expo Go、开发构建、发布构建的证明范围不同，不能以预览代替原生 SDK 或系统启动屏验收。云服务和插件是可选执行通道，不新增控制器或默认启动付费环境；具体见 [app-stack-expo](../app-stack-expo/SKILL.md)。

ESP32 指设备自带屏幕运行的 GUI，页面使用 PAGE，独立瞬态层使用 DISPLAY_LAYER；驱动、业务和通信按 MODULE 管理。先确认硬件、输入、实际 SDK/GUI 版本和资源预算，再推进 V1–V5。外部手机或电脑控制客户端使用其自身技术栈，按协议与固件衔接。构建、主机模拟、设备运行和用户视觉确认分别记录；具体见 [app-stack-esp32](../app-stack-esp32/SKILL.md)。

Node.js 指实际服务端进程，七阶段使用非视觉的 PROJECT、FOUNDATION、MODULE 与 INTEGRATION。前端与后端按模块分别选栈。最终集成冻结完成模块、实施包、证据清单和实际交付文件，按关键行为验证接口、数据、任务与生命周期；详见 [app-stack-nodejs](../app-stack-nodejs/SKILL.md)。

Cocos、Phaser、Three.js 的编排任务按需要读取以下公共资料，同时保留当前技术栈原生补充：

- 启动验证服务前读取[服务查重与复用](../app-domain-toolkit/references/reference-orchestration-local-service-validation.md)；用户明确要求工作区隔离时读取[隔离规则](../app-domain-toolkit/references/reference-orchestration-worktree-integration.md)。
- 实施与交接时按任务选择[专业编排与交付](../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md)、[游戏实施](../app-domain-toolkit/references/reference-orchestration-game-implementation.md)、[模块拆分](../app-domain-toolkit/references/reference-orchestration-module-decomposition.md)和[依赖能力检查](../app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md)。
- Cocos、Phaser 任务需要归档交付文件时，读取[交付文件保留与引用](../app-domain-toolkit/references/reference-orchestration-delivery-artifacts.md)。
- 需要专业复核时读取[视觉质量](../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md)、[复核分工](../app-domain-toolkit/references/reference-orchestration-review-funnel.md)或[游戏生产里程碑](../app-domain-toolkit/references/reference-orchestration-quality-gates.md)。

任务明确包含 Git 提交时，所有技术栈先按[工作流记录与提交范围](references/workflow.md#工作流记录与提交范围)选择必要文件；Cocos、Phaser、Three.js 再读取[最小提交规则](../app-domain-toolkit/references/git-minimal-submission.md)并结合本栈补充，Unity、Flutter、Expo 使用所选技术栈的 Git 规范。Git 提交或合并须有用户明确要求；任务范围内无副作用的本地集成可按已有授权执行。

## 交接与状态

3D 世界在 V1 搭建或复用白模时，读取[可辨识的功能原型](references/readable-functional-prototype.md)，让对象、任务、可操作状态和反馈可理解。2D、HUD、菜单及 App 使用正式工程和直接功能用例，按需保留静态布局线框、空间规格和数据验证，不使用白模。复用仍有效的机制和验证记录。

实施包、单元结果和证据格式以控制器的 schemas/templates 为准，不手写另一套近似字段。角色职责与交接见[协作边界](references/handoffs.md)；涉及策划、业务/玩法、动态反馈、音频、数值或动画时读取[领域生产交接](references/domain-production.md)。公共流程只规定“必须证明什么”；如何读取引擎对象、布局、输入、资源、构建及性能由各技术技能规定。

游戏新项目或机制增量按[游戏特点识别与专项验证](../app-domain-toolkit/references/game-characteristics.md)衔接需求中的特点识别、V1 的机制风险验证和 QA 用例映射。复用现有 GDD、实施包与证据，按实际机制组合选择，局部任务只更新受影响部分；不单独为类型识别新增阶段、控制器字段或审批，普通应用与服务器不承担游戏专项。

控制器的 `status/check` 只读；`run` 只推进安全控制状态，不能代替实际开发、测试或批准。用户消息是决定来源，本地 JSON 只是记录，不是身份验证或新增执行授权。发布阶段允许完成本地准备，真机、签名、上传、外部写入、付费、破坏性操作与发布须有对应明确授权。

发布工作项默认 `releaseIntent=prepare`，准备材料和必需验证完成后可正常关闭。只有实际执行发布时选择 `init --release-intent publish`；其 F4、精确批准和真实发布结果必须齐备，准备完成不能标成已上线。

无明确请求不自动提交、推送、安装全局技能或修改源技能仓库。可见内容交付按[三类验收结论](references/verification.md#三类验收结论)分别说明结构、工程和视觉状态，以及外部操作状态；截图采集和工程通过不能代替用户的视觉确认。

<!-- capability-route:start -->
## 技术栈原生能力路由

当前公共流程继续由本技能负责。需要处理目标栈专有的资源结构或实现步骤时，先确认项目的 `app-stack-*`，再读取同目录 [native-adapters.json](native-adapters.json)。manifest列出当前栈时，按 `when` 选择 `mode`，使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <当前能力名> [sourceSkill]` 读取对应章节、直接公共依赖及按需资源路径；多模式必须指定 `sourceSkill`，维护本仓库时将 `.agents/skills/` 换为 `skills/`。
manifest未列当前栈时，继续使用该栈的 `app-stack-*` 规范/索引和适用公共流程，不视为能力缺失；只有已声明且选中的专项文件缺失才报告阻断。不得改读其他栈适配或虚构原生API。公共工作流仅在 manifest 的适用栈包含当前栈时读取。
<!-- capability-route:end -->
