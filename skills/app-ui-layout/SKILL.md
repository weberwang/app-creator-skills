---
name: app-ui-layout
description: "将界面需求整理为可测量的层级、信息优先级、断点/安全区和输入可达布局规则。"
---

# 界面布局与自适应

让界面在目标尺寸、方向、系统缩放和内容变化下保持层级清楚、操作可达、文字可读和状态可见。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

涉及交互组件时，按[可交互组件结构、命中与输入职责](../app-domain-toolkit/references/ui-interaction.md)确定语义控件、有效命中范围、输入竞争与验收。具体 API 使用当前栈的原生章节。

涉及用户可见文案时，先读取[通用文案原则](../app-domain-toolkit/references/ui-copy-principles.md)，再按当前技术栈完成规格、设计与实现。

开始设计前执行[内容与装饰筛选](../app-asset-workflow/references/interface-intent.md#在设计与输出前筛选内容)，并在输出草图、页面或组件前复核。单独实现原生组件和局部布局也适用。

## 输入

- 页面流程和真实文案；目标屏幕尺寸/方向/输入方式；安全区与系统缩放要求；已有组件、设计稿及内容极值。

## 共用操作步骤

非游戏 App 默认先按[Figma App 流程](references/figma-app-design.md)在 V2 完成分析任务书、imagegen 代表页效果图、反馈修订、用户选图与忠实重建，再进入以下规格提取和实现步骤。业务、内容与平台是硬约束，布局、字体、配色、比例和留白留给模型探索；已确认原图与忠实重建授权有效时不重复选稿。原图确认、重建结构校验和新预览未人工检查分别记录，V4/V5 仍独立验收。

按本次增量应用[设计依据](../app-asset-workflow/references/interface-intent.md#design-basis)，先理解用户、任务、使用压力与真实行为，区分硬约束、视觉方向和可探索细节；只补受影响事实，不等待全项目完成分析。

1. 列出页面状态、主要任务、紧急提示和真实内容；先在现有设计或布局规格中梳理“用户需要判断什么 → 可见线索 → 可以做什么 → 操作反馈 → 仍需保留的精确信息”，再决定是否添加文字，为每处文字说明尚未被画面表达的信息。为每个控件写明语义、优先级、尺寸下限、交互状态与可访问标签。按[无文字意图可读性](../app-asset-workflow/references/interface-intent.md)安排层级、形态与位置关系；阅读、对话、表单和数据内容本身是任务时，不要求隐藏文字后仍能知道具体内容。
   游戏还应区分世界物件、地面区域、角色附属表现、场景浮层和屏幕 HUD。与位置有关的信息优先贴近操作对象，在已有场景或布局规格明确承载面、朝向、空间归属、触发范围和显示状态。例如站入区域自动付款的扩建，费用区贴地并共享地面透视，与待解锁区域建立联系；不要随意改成悬浮说明牌或屏幕卡片，也不为解释用途增加无关建筑、NPC、按钮或机制。
   按真实玩法覆盖适用的未选择、已选择、进行中、完成、离开和恢复状态，交接元素出现、消失和变化；选择工具后自动作业时不要持续显示暗示反复点击的动作按钮。进度优先通过对象变化、覆盖范围、剩余目标及结果表达，只有明确存在信息缺口时才增加进度条或说明文字。静态目标只表示代表瞬间，动态行为须在实现后验证。
2. 按[还原依据与变更边界](references/relative-layout.md#还原依据与变更边界)复用有效设计稿与现有布局规格，区分已确认目标、测量值、估计值及适配规则；按影响补齐，不另建布局源或逐项审批。按[UI 相对布局与定位](references/relative-layout.md)建立布局树和约束：标明容器层级、参照、对齐、间距、可伸缩/固定尺寸、滚动范围、遮挡关系、键盘/手柄焦点顺序。
   按[显示结构约定](../app-domain-toolkit/references/reference-domain-display-ownership.md#公共显示结构约定)把布局树落实到本栈实际节点、Widget 或 DOM，区分显示挂载、功能归属与渲染顺序。V3 先按[节点最小化](../app-domain-toolkit/references/reference-domain-display-ownership.md#节点最小化)判断同一操作的视觉与交互能否共用节点，再按[随动与父子关系](../app-domain-toolkit/references/reference-domain-display-ownership.md#随动与父子关系)为确需分开的元素确定父级。V5 按确认结构还原并验证移动后的相对位置与命中。
3. Unity 文本及国际化按 [UniText 与 JSON 配置](../unity-development-workflow/references/text-and-localization.md)检查安装并实施，异常时由用户选择修复或回退 TMP。Cocos、Phaser、Three.js 按[静态文本的可见表现](../app-domain-toolkit/references/ui-copy-principles.md#静态文本的可见表现)选择位图字体或独立文字图片，Flutter、Expo 使用各自本栈原生文本规范。按[文本宽度、缩放与换行](references/relative-layout.md#文本宽度缩放与换行)保持确认的阅读尺寸与断行，声明适配策略。读取当前栈原生模式引用的 `references/text-layout.md`，核实所选路线的排版能力，再落实断点、安全区、多语言、阅读尺寸放大和最小交互尺寸。
4. 用真实内容及适用的最短、最长、空、错误和加载状态，按[布局与空间](../app-asset-workflow/references/interface-intent.md#layout-space)核对父子边界、内容撑高、滚动、层序与命中；覆盖适用的窄短屏、大字、安全区、键盘、焦点及状态变化。视觉优先级和设计截图默认交用户人工检查，未经明确授权不自动分析截图。
5. 在目标运行环境先核对同条件的设计目标、正式源值与运行值，再检查适用视口和内容适配及触控/鼠标/键盘导航；按[有界复核](../app-asset-workflow/references/interface-intent.md#bounded-review)推演主要任务和一个适用的高压或异常情境。分别记录可证实的结构、工程与待人工判断事项，修复偏差来源，不对单张截图加偏移或隐式改变设计目标。
6. 交付本次受影响的布局规则、验证结果和需用户人工判断的视觉点；有效的断点／内容矩阵、导航顺序和运行验证矩阵直接引用。仅断点、内容适配、导航或输入发生实际变化时补充对应范围，不为局部修改重建无关矩阵。

项目采用可视化编辑器时，统一遵循[编辑器优先](../app-domain-toolkit/references/editor-display-authoring.md#编辑器优先)，将可配置功能保存在正式场景、Prefab、Roblox Place 或原生 UI 源中。新增显示元素时，同步交付正式可编辑源及适用的动态预览。

## 关键边界

- 场景／页面切换与弹出层遵循[统一加载与过渡显示](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)：同一全局加载层按任务切换场景不透明背景与弹窗半透明蒙层，并发时场景优先；缓存命中且同步打开不闪现蒙层，后台预取静默。加载层覆盖 Toast、弹窗及安全区并阻断下层输入，纳入真实宿主的层序、进度、失败后备入口和焦点交接设计；弹窗缓存模板与图片等资源，关闭销毁实例并清理任务，重开创建新实例。

- 已在编辑器设定的位置关系按[布局控制权](../app-domain-toolkit/references/editor-display-authoring.md#编辑器位置关系的控制权)维护；静态布局回到正式源修改，程序仅在明确功能需要及限定属性范围内控制位置，不得在启动或刷新时硬编码重置布局。
- 新增元素按[增量显示约束](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)进入现有布局树与合同，补齐父级、位置参照、尺寸和适配关系；已有页面、复用组件与动态实例均不得只追加运行坐标而遗漏约束及受影响阶段的验证。
- 弹窗与 Toast 按[公共设计顺序](../app-domain-toolkit/references/reference-domain-display-ownership.md#弹窗公共设计方案)在全局视觉设计稿冻结后，先确定所需弹窗公共方案、再设计 Toast。统一公共外壳、字体、色彩、间距、动效及适配规则，业务结构按需变体；复用公共组件，各自验证实际宿主组合。
- UI 内部遵循[相对布局与定位](references/relative-layout.md)；弹窗、浮窗和 Toast 仅本体允许独立定位，内部 UI 仍必须相对布局。世界物件和地面区域按其世界空间归属定位，世界空间 UI 的本体按实际对象或地面锚定，不把位置相关提示一律改为屏幕 HUD；其内部控件仍遵循适用的相对布局。
- 游戏普通屏幕 UI 必须落实[双轴停靠或原生容器排布](references/relative-layout.md#游戏-ui-的停靠与原生机制)；原生能表达时使用原生机制，位置与尺寸分别确定控制者，并核对正式源与运行属性。
- 九宫格图片的像素倍率／切片缩放必须严格为数字 `1`，不得通过配置、预算或额外缩放覆盖；按[图片尺寸](references/relative-layout.md#图片尺寸)核对真实组件，固定角边保持 1 倍，仅以切片规则改变显示框。
- Unity/Creator/Web UI、Flutter Widget 与 Expo React Native 的布局系统并不相同；只使用当前栈匹配的原生适配模式。
- 非游戏 App 按[Figma App 设计流程](references/figma-app-design.md)从已选可编辑节点提取真实父子、布局参照、状态及适配；已表达清楚的信息不重画一套图或重复审批。逐项映射设计与实际消费者，抽象结构框图不足以证明还原；已有组件须证明当前结构、样式和状态符合目标。Flutter 的 `usability` 仍须还原布局、层级、形状、排版和视觉特征，完整像素级矩阵仅按 `exact` 要求执行。
- 效果图供目标确认，不能把按钮、动态文案和交互状态烘焙成不可访问的背景图。

## 交付

- 加载显示按[任务拆解与交接](../app-domain-toolkit/references/reference-domain-display-ownership.md#加载显示任务拆解与交接)明确实际设计结果、相关文件路径及验收方式，交付适用的两种加载样式目标、拆解／布局和进度／失败入口；已有事实直接引用，分工与前置依赖在实际协作时补充。不能只提及蒙层而遗漏正式视图交付，也不为无关内容新增文件。
- 页面/组件结构、布局约束和断点、极值内容用例、目标尺寸回归与用户检查点；按[三类验收结论](../app-creator-workflow/references/verification.md#三类验收结论)分别报告结构完成、工程通过和视觉通过，用户未确认时记录视觉待确认。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-ui-layout [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

