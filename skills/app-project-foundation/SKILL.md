---
name: app-project-foundation
description: "为已支持的游戏、应用、ESP32 GUI 或 Node.js 服务器建立最小运行基线，或在既有工程中定向排查并迭代运行时问题。"
---

# 项目初始化与基础运行时

基础工程与插件／SDK 接入按[工具与接入能力核实](../app-domain-toolkit/references/tool-capability-verification.md)区分指导资料、工具连接、操作可执行和结果验证；只检查本次所需操作，复用真实实例，缺口只限制受影响任务，不以插件安装或命令受理代替能力接通。

为新项目建立可复现的最小启动基线，或在已有项目中围绕真实运行时问题做有限迭代。先判断模式；既有项目的修复不得默认重建脚手架或替换成熟架构。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

已选 CrazyGames、微信／抖音小游戏、Google Play 或 App Store 时，按[渠道接入任务](../app-release/references/channel-platform-integration.md#接入任务与完成条件)验证最小目标产物、配置、统一平台识别与 SDK 选择／初始化入口；同一导出方案支持多宿主时复用产物，仅加载实际选中 SDK，未知／冲突环境不猜选。优先暴露引擎适配和宿主差异，不将本地构建等同于真实宿主或商店验证。

- 产品范围、目标平台、仓库和现有运行状态；语言/工具链版本；现有入口、运行时约定、复现步骤及批准的依赖预算。

## 共用操作步骤

1. 先区分新建基础与既有运行时迭代/排错；确认仓库状态、工具链、锁文件、启动入口和用户要求，避免把已有工程当成空白脚手架。
2. 新建时按产品计划和架构选择最小骨架、版本和运行入口，只建设[首条正式功能切片](../app-creator-workflow/references/workflow.md#功能切片与跨对象依赖)必需的基础能力；沿正式入口、模块与测试路径演进，不为未来功能铺满基础设施或建立长期平行 Demo。只有包含客户端界面时，才按[统一流程](../app-creator-workflow/references/workflow.md)确认界面语言、默认显示语言和适用屏幕方向：Flutter、Expo 可选横屏、竖屏或双方向，游戏只选一种，ESP32 按实际屏幕与输入。Node.js 按服务端入口、配置、数据和生命周期建立基线，不要求屏幕或视觉材料。迭代时按[增量影响](../app-creator-workflow/references/professional-conventions.md#incremental-change-impact)保留现有结构，从复现路径、日志和生命周期定位最小受影响区域。
3. 只加入当前任务必需的直接依赖；有界面的新项目补最小运行入口/首场景与资源组织。Android、iOS/iPadOS 按[系统启动屏规范](../app-domain-toolkit/references/system-launch-screen.md)落实原生配置与首帧衔接，不默认添加 Logo＋文本品牌页；服务端补应用装配、集中配置和实际启动/测试入口。均明确环境隔离，迭代时避免无关升级、入口替换或配置重建。
   客户端需要统一 Toast 时，先建立可运行的实际根宿主、浮窗挂载入口和验证入口，随后在业务模块实现之前完成[Toast 前置视觉任务](../app-domain-toolkit/references/ui-copy-principles.md#toast-前置视觉任务)。Toast 以独立 DISPLAY_LAYER 交付 V0–V5，基础工程提供其运行上下文与接口接线。已有适用组件按证据复用。
4. 定义可复现安装/构建命令、环境样例和错误处理；任何密钥和平台凭证留在安全配置通道。
5. 按当前模式验证：新建检查可复现安装、锁定依赖和最小功能路径，贯通实际操作／请求、业务规则、数据、反馈及适用异常恢复；有界面时验证资源与交互，服务端验证配置、应用装配、实际接口/任务与关闭。迭代检查原问题复现路径、修复后回归及相关资源释放；按[质量证据与返修复验](../app-creator-workflow/references/professional-conventions.md#quality-evidence-and-retests)保留可重复执行的关键行为与缺陷回归测试，不仅交付一次性日志。
6. 记录工具版本、实际命令、输出、未运行的目标设备与后续原生规范入口；按[当前项目知识](../app-creator-workflow/references/professional-conventions.md#current-project-knowledge)维护仍可执行的安装、启动、构建与测试说明，只更新变化事实，冻结历史证据不覆盖。标记临时数据、资源及替身的替换条件，后续沿同一正式机制接入资产。

## 关键边界

- 按[工作流输出文件规范](../app-creator-workflow/references/output-files.md)沿用项目已确定的目录映射；新建项目或确有未覆盖的输出时，在已有技术方案中补充实际需要的位置。机器记录沿用工具实际路径，仅创建当前需要的位置；单代理默认负责本次工作，委派或跨角色交接时明确负责人。
- 性能相关基础能力遵循[性能预算、定位与优化复验](../app-domain-toolkit/references/performance-optimization.md)，复用已有运行与采样入口，明确冷／热启动、首次／缓存命中、任务及资源释放边界；只有当前任务需要时才补采集能力，不默认安装性能工具、扩充预加载或引入对象池。设备、外部压测等操作仍按明确授权执行。
- 涉及客户端场景／页面切换或弹出层时，按[场景与弹出层统一加载](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)复用或建立唯一加载服务与随应用宿主就绪的全局显示层及后备入口；场景不透明过渡、弹窗半透明蒙层共用独立令牌和输入隔离。明确请求身份、目标就绪条件、缓存所有者及释放时机，防止服务随旧场景卸载；原生加载和激活由当前栈实现，不为无界面服务器增加显示能力。
- 涉及第三方 SDK 时读取[独立管理与初始化规范](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)，再装配当前技术栈的各 SDK 管理模块。
- 各栈的脚手架、构建与运行环境不同，只加载已确认且声明本能力的原生适配。Node.js 使用服务器工程规范，不套用页面、场景或显示方向；既有固定步长、输入、资源泄漏或后台恢复问题按实际栈迭代排错，不触发基础工程重建。
- 安装依赖可能触发网络与锁文件变化；依照任务范围记录，不额外升级全量依赖。

## 交付

- 已选移动平台的系统启动屏按[任务安排与完成条件](../app-domain-toolkit/references/system-launch-screen.md#任务安排与完成条件)交付平台配置及本地资源、首帧衔接和定向验证；复用现有任务/技术设计，工程结果与用户人工显示确认分开记录，不为 Web、桌面或设备 GUI 自动新增移动启动屏。
- 涉及前台加载显示时，按[加载显示任务拆解与交接](../app-domain-toolkit/references/reference-domain-display-ownership.md#加载显示任务拆解与交接)交付加载服务、两种显示模式的最小视图、后备入口及功能证据；需要交接时传递实际源路径、接口及相关依赖，跨角色明确责任人。最小视图功能通过不能代替正式画面完成。
- 公共 Toast 的交接引用统一接口、正式组件与资源路径、绑定宿主以及当前视觉任务的完成证据，业务模块据此接入。
- 新建任务交付基础工程、版本/依赖清单、环境模板和启动证据；迭代任务交付根因、限定改动、回归结果和未覆盖平台。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-project-foundation [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。
