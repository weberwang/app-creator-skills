---
name: app-quality-review
description: "基于可复现证据审核功能、视觉、无障碍、性能、平台差异和回归风险并推动问题闭环。"
---

# 质量审核与性能验证

游戏大场景及复杂 App 流程按[分批生产与整体收口](../app-domain-toolkit/references/incremental-production.md#批次完成与整体收口)分别核对本批功能、累计覆盖和当前正式组合；对照冻结的必要路径、状态及步骤报告已覆盖和未验证范围，用户视觉／体验确认独立记录。

使用可复现的证据发现并归类质量问题，区分工程正确性、用户体验和性能风险，清楚标出未验证部分。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 明确版本与变更范围；验收条件、目标设备/浏览器和性能预算；可复现的运行入口、日志与问题记录。

## 共用操作步骤

1. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)确认被测快照、目标平台和可复用运行实例；把功能、布局/无障碍、性能、资源、存档/网络等风险映射到具体检查项。涉及界面美术时，将[无文字意图可读性](../app-asset-workflow/references/interface-intent.md)纳入已有人工审阅。
2. 先跑最小冒烟和关键路径，再扩展边界/状态组合；每条用例写清前置条件、操作、预期、实际和证据位置。游戏任务按[QA 用例映射](../app-domain-toolkit/references/game-characteristics.md#qa)追踪特点、规则来源、功能/对象和验证结果，复用 V1 专项证据，在 V5 与最终集成重验实际受影响组合及完整游玩周期；不对普通应用或服务器套用游戏检查。
3. 性能检查按[性能预算、定位与优化复验](../app-domain-toolkit/references/performance-optimization.md)选取相关指标，记录源／资源快照、设备、构建及采样模式、场景／负载、缓存条件、预热、采样窗口和原始数据；与基线及预算同条件比较，分别覆盖适用的冷／热路径、首次／缓存命中与反复进出，不凭一次波动或平均 FPS 推断改善。优化后检查成本转移、副作用和功能回归，区分目标达成、相对改善、无可辨收益、退化与未验证。
4. 将发现按影响、频率、可绕过性和证据可信度分级，并按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)分开记录观察事实、推测根因与建议修复。
5. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)只复验失败或受实际影响的区域及必要回归；环境、输入或快照失效时重新检查相关通道，新增副作用时扩展覆盖。游戏从 V1 进入正式组合或调整规则、资源、时基等内容时，按[回归清单](../app-domain-toolkit/references/game-characteristics.md#regression)关联实际变化、用例、可复用证据及当前重验结果。
6. 按[质量证据与返修复验约定](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)汇总通过、失败、阻断、未运行、环境限制和剩余风险，以覆盖范围内的证据说明当前结论，不替用户宣告体验验收。游戏内容和体验调整按[关卡与试玩规范](../app-domain-toolkit/references/game-content-playtesting.md#playtest)整理任务、条件、客观观察、人工反馈和调整后的复验；已有模型/求解器的检查范围与真实游玩结论分开报告。

## 关键边界

目标涉及已选渠道时，按[渠道接入任务与完成条件](../app-release/references/channel-platform-integration.md#接入任务与完成条件)及对应专项核对当前包身份、真实宿主、初始化、生命周期、隐私拒绝及适用广告／支付失败路径。分别记录每个渠道／终端和实际环境，检查资质／审核资料与候选一致，不以本地替身、浏览器、Editor 或单一商店通过代替其他渠道结果。

同包复用时按[平台选择验证](../app-release/references/channel-platform-integration.md#导出方案与运行时平台选择)覆盖各支持宿主、微信内 H5 与小游戏区分、未选 SDK 未加载、未知／冲突识别、重复初始化及加载失败；本地模拟不能标为正式平台通过。

有文件交付时按[工作流输出文件规范](../app-creator-workflow/references/output-files.md)核对实际路径、合同要求的格式及内容；存在版本、依赖或下游消费者时核对其真实引用。区分结果文件、单元实际改动文件、命令原始输出及人工资料，错误位置、断链、覆盖冻结内容或仅有计划／成功摘要均不能算完整交付，未运行和人工待确认分别报告。

涉及客户端打包或商业依赖变化时，按[内购 SDK 必要性与移除](../app-release/references/release-readiness.md#内购-sdk-必要性与移除)核对实际功能、引入者、移除或保留依据及最终包。无内购但专用 SDK 仍入包、只禁用按钮/初始化，或强删共享依赖导致其他能力损坏均须修复；未构建/未检查的平台不能标成 SDK 已移除，真实交易不属于自动验证范围。

涉及商店素材时，按[商店截图与宣传图交付](../app-release/references/store-marketing-assets.md#任务安排与完成条件)核对实际平台规格、截图来源及当前内容、卖点/顺序、制作源和导出文件。规格与引用可技术检查，实际截图及成图的视觉判断交用户人工确认；概念图或生成图不能充当真实游戏截图，未确认材料不能标为可上传。

涉及清理或集成／候选收尾时，按[项目清理任务与验证](../app-artifact-cleanup/references/project-cleanup.md)核对实际动作、工作流记录有效引用及受影响消费者；涉及提交或发布时核对对应去向，委派或跨角色交接时核对责任人。检查实际执行、受影响工作项的可读／续接、导入／构建及功能回归证据。只有清单或文件减少不能算已清理，未知归属和未验证项保留并报告，冻结确认及原始输出不得重新生成冒充历史。

以下布局、Toast、弹窗、文本与显示条款仅用于实际客户端界面。Node.js 服务器按本栈原生模式检查接口、数据、并发、任务与生命周期，不要求 UI 能力或人工视觉验收。

- Android、iOS/iPadOS 启动相关改动按[系统启动屏验收](../app-domain-toolkit/references/system-launch-screen.md#任务安排与完成条件)检查原生配置、随包资源和首帧衔接；分别核对冷/暖启动及热恢复、方向与明暗模式的适用证据。Unity Editor 或应用内启动页不能代替系统启动链路；实际画面由用户人工检查，未获授权不发起真机验收。
- 按[Toast 上飘与淡出动画](../app-domain-toolkit/references/ui-copy-principles.md#toast-上飘与淡出动画)检查默认时间线、200 个逻辑单位的向上位移与同步淡出、并发实例隔离、复用重置和减少动态效果分支；实际显示效果及安全区由用户人工确认。

- 按[场景与弹出层统一加载](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)核对唯一加载服务与显示层、场景不透明／弹窗半透明样式及场景优先级、目标就绪与输入交接；覆盖连续／重复切换、旧场景保留及按预算先卸载后的安全恢复、场景退出关闭旧宿主弹窗、共享资源不被误取消或释放、失败／超时／取消和迟到回调。弹窗首次触发前无批量加载或预创建，关闭销毁实例且模板与图片仍缓存、执行任务已停止，重开创建新实例读取当前数据且无重复订阅；业务状态与接口数据不混入资源缓存。并发任务各自释放令牌，后台任务静默，百分比有真实依据；提供加载过渡资料由用户人工检查闪白、半成品布局、覆盖及衔接，不凭静态规则宣称运行或视觉通过。

- 按[错误提示形式](../app-domain-toolkit/references/ui-copy-principles.md#错误提示形式)核对普通业务错误使用 Toast、需要确认的使用弹窗、后台加载及重试失败保持静默，并验证相同提示每次有效触发均立即使用独立实例、不去重、不排队，空闲实例复用时旧回调不影响新展示；业务重复或失效回调不得重复投递结果；需要确认的流程不能依赖 Toast 自动消失。

- 按[文本宽度、缩放与换行](../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)核对固定行宽、按用途选定的模式及具体最小字号：标题/按钮保持单行并在下限内自动缩放，长描述自然换行且完整可读；内容撑宽、低于下限、长描述被裁切或以缩小抵消系统字体放大均须修复。
- 组件检查同时读取当前栈文本配置指南，核对真实组件类型、版本、原生属性和值；无内置最小字号的组件须有实际下限检测及失败处理，不能把固定宽度、maxLines、关闭换行、裁切模式或整体缩放当作完整适配。文档示例存在不等于目标工程运行通过。
- 项目存在编辑器布局时，按[布局控制权](../app-domain-toolkit/references/editor-display-authoring.md#编辑器位置关系的控制权)核对脚本位置写入是否有明确功能依据、限定范围及结束策略，并验证编辑器调整能在启动、启用和刷新后生效；无功能依据的覆盖作为缺陷处理。
- 对新增显示元素，按[增量显示约束](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)核对正式源与实际实例的父级、位置参照、尺寸、层序和输入，以及受影响的布局/资源材料和当前验证证据；不能仅凭元素出现、旧页面已通过或编辑器已保存判定完成。
- 涉及新增能力、依赖或通用基础设施时，按[技术方案选型顺序](../app-creator-workflow/references/professional-conventions.md#solution-selection)核对来源、版本与适用性证据；采用社区或自研须有上一级方案的具体缺口依据。发现无依据的重复实现时列为审查问题，由实施者修复并定向复验。
- 测试报告不能把未运行或受环境限制的项目标为通过；视觉显示由用户人工检查，除非用户明确授权自动分析。
- 跨端检查的工具、统计指标和布局断点由当前栈及设备配置决定。

- 涉及隐私或 SDK 时，按[隐私流程与 SDK 解耦](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#隐私流程与-sdk-解耦)审查模块依赖、自动初始化副作用和实际用途授权约束；确认隐私弹窗及同意管理等业务未被默认扩展，仅对明确范围内或已有业务检查状态所有者与撤回行为；核对真实验证证据，不能只检查隐私弹窗或广告模块。

## 交付

- 涉及加载显示时按[任务拆解与交接](../app-domain-toolkit/references/reference-domain-display-ownership.md#加载显示任务拆解与交接)核对服务、设计、素材、正式接入及验证的真实交付，按适用范围覆盖消费入口和宿主；跨角色交接时核对责任及相关依赖。加载逻辑或资源导入通过而正式视图缺失时列为交付缺口，人工显示确认缺失时保留待确认，不合并为整项完成。
- 普通审查直接输出带快照身份的报告，包括适用的测试矩阵、复现步骤、性能数据、缺陷分类、修复复验结果和剩余风险；不为报告创建网页或启动服务。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-quality-review [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

