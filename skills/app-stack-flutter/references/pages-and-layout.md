# Flutter PAGE 与布局

PAGE 表示产品向用户呈现的一个有目的页面或稳定的公共导航框架，不是任意 Widget。主页内容按自身语义作为 PAGE；跨多个页面常驻且确需独立视觉验收的导航框架可另建 PAGE 并赋予稳定 `objectId`，仅属于主页的导航控件留在主页。按对象管理 UI 结构、语义、状态和关系型布局，不直接借用游戏 Scene 的生命周期或 Canvas 空间。

modal、popup、drawer、toast 等瞬态层使用独立 `DISPLAY_LAYER`，每个工作项绑定一个 `visual.hostId`。同一组件可在多个宿主复用，但须分别核对各宿主上下文，不能用一个宿主的验收替代其他宿主；bottom sheet 按实际模态或抽屉行为确定类型。切换选中标签、加载和空状态可作为页面或导航框架自身状态，不为每个 Widget 或状态机械创建工作项。

显示层的阶段确认和 V5 运行上下文须绑定实际宿主及层类型；证据字段、打开和关闭行为以及焦点恢复的适用性见[单目标领域合同](../../app-workflow-control/references/single-target-domain.md)。宿主变化时重新验证受影响上下文，不要求宿主独立建项或先完成 V5。

## PAGE 阶段

- **V0 内部分流**：识别页面身份、现有路由、是否存在页面结构变化、所属模块和已选平台。明确复用页或没有视觉工作时直接走工程验证，不创建空白高保真候选。
- **V1 功能与语义验证**：明确用户任务、页面状态、导航进出和 accessibility；直接实现并测试页面行为，或按风险使用轻量 sketch、原型 Widget。草图按需使用且不作为最终视觉目标，未执行的行为不得记为通过。
- **V2 视觉目标**：根据已验证的行为与状态确定高保真目标，由用户确认并冻结；已有页面按影响范围复用有效目标。
- **V3 拆解与布局**：从 V2 目标拆解 Flutter Widget 和独立图像资产；根据已有结构证据按需深化 `regions`、`anchors`、`breakpoints`、滚动所有者、换行、SafeArea/键盘、overlays 与不变量。Widget tests 覆盖断点边界、同宽不同高、放大文字、方向变化、安全区及关键状态；拆解图和布局图分别确认。
- **V4 正式资源与导入**：按 V3 确认的拆解、资产清单和布局规格制作正式资源并接入项目，核对图像来源、许可、实际路径与构建/读取结果。
- **V5 正式实现与运行验收**：根据实际需要维护布局规格，保持语义和结构测试，并与 V2 高保真目标对照；只有明确要求 `exact` 时才强制完整 `fidelity` 对照。用稳定 `Key`、锚点与测量报告检查关键控件关系；需要截图时交由用户检查，不自动分析图片或判定视觉通过。

公共阶段与确认记录承载页面身份和证据：V1 验证功能，V2 冻结真实目标，V3 分别确认拆解和布局，V4 验收资源，V5 验收实现。确有视觉需求的页面按流程完成，明确无视觉交付的页面可在入口分流为不适用，无须伪造目标图。已确认目标在同一范围内持续复用；仅在真实决策改变时处理对应变更。

## Flutter 布局行为

- 每个页面声明页面最大内容宽度、状态、滚动 owner、视觉与语义锚点、TextField/hit area、Modal/popover 叠层和目标屏幕 Reader。局部布局使用 Flutter 的约束传播、自适应和 `LayoutBuilder`。
- 依照实际画面处理安全区与系统组件；方向、软键盘和文本缩放纳入测试矩阵。文本优先自然换行并保护关键信息，不可依靠固定高度卡片隐藏内容。
- 断点需要在 `b-1`、`b`、`b+1`、同宽不同高、宽屏和横竖屏验证；系统 inset、字体放大和文案长度实际组合可能影响折行与滚动。
- 关键对齐用元素对、文本/控件语义边缘和尺寸目标定义，而非无关视口坐标。只有产品明确要求时才对具体框图建立截图 parity；absolute positioning 只服务真实 overlays/stack 和已定义关系。

来源：`flutter-app-orchestrator/SKILL.md`、`adaptive-layout-implementation/references/layout-spec.md`、`adaptive-layout-implementation/references/implementation-workflow.md`、`adaptive-layout-implementation/references/test-matrix.md`。
