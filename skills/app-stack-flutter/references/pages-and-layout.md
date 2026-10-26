# Flutter PAGE 与布局

PAGE 表示产品向用户呈现的一个有目的页面或用户流程，不是任意 Widget。页面可以跨多个 Modal、bottom sheet 和 route 状态；按产品页面目标管理 UI 结构、语义、状态和关系型布局，不直接借用游戏 Scene 的生命周期、Canvas 空间或 Scene V0/V1 目标。

## 共用流程的 PAGE 映射

- **V0 内部分流**：识别页面身份、现有路由、是否存在页面结构变化、所属模块和已选平台。明确复用页或没有视觉工作时直接走工程验证，不创建空白高保真候选。
- **V1 语义与 sketch 验证**：先通过用户结果、核心任务、信息优先级、页面状态、导航进出和 accessibility 建立语义契约；用轻量 sketch 和原型 Widget/关系测试验证主要布局是否能成立。此 sketch 是结构可行性材料，不作为最终视觉目标；本阶段末对真实高保真页面目标进行用户确认并冻结，供后续阶段持续对照。
- **V2 拆解与布局**：从已确认的真实高保真目标拆解 Flutter Widget 和独立图像资产；保留 V1 `sketch` layout-spec 里的页面语义、布局关系及结构 evidence matrix，按需深化 `regions`、`anchors`、`breakpoints`、滚动所有者、换行、SafeArea/键盘、overlays 与不变量。Widget tests 覆盖断点边界、同宽不同高、放大文字、方向变化、安全区及关键状态。再独立检查布局图。不得在此重选或替换视觉目标；父级自动布局与子级定位不得重复控制同一属性。
- **V3 正式资源与导入**：只按 V2 确认的拆解、资产清单和布局规格制作正式资源并接入项目，核对图像来源、许可、实际路径与构建/读取结果。本阶段不再次选择或冻结页面目标，也不以页面生产需要为由生成替代效果图。
- **V4 fidelity 与实现验收**：扩展原有 `sketch` spec 为 `fidelity`，保持原语义和结构测试，并与 V1 确认的高保真目标对照。冻结对应 viewport、方向、页面状态和双方截图；用稳定 `Key`、锚点、目标/实际截图和测量报告检查关键控件的尺寸与关系，分别保留结构 evidence matrix 和视觉 parity cases。Widget 测试验证语义关系，fidelity 检查仅基于实际实现、截图和测量证据。本阶段不另选视觉方向。

上述对应关系使用公共视觉阶段与确认记录承载页面身份和证据：V1 冻结真实目标、V2 分别确认拆解和布局、V3 验收正式资源、V4 验收 fidelity 实现。公共 V1/V2 确认均属于需用户执行的真实阶段确认；确有视觉需求的页面按流程完成，明确无视觉交付的页面可在入口分流为不适用，无须伪造目标图。已确认目标在同一范围内持续复用，不在 V2 或 V3 重选或重画；仅在真实决策改变时处理对应变更。

## Flutter 布局行为

- 每个页面声明页面最大内容宽度、状态、滚动 owner、视觉与语义锚点、TextField/hit area、Modal/popover 叠层和目标屏幕 Reader。局部布局使用 Flutter 的约束传播、自适应和 `LayoutBuilder`。
- 依照实际画面处理安全区与系统组件；方向、软键盘和文本缩放纳入测试矩阵。文本优先自然换行并保护关键信息，不可依靠固定高度卡片隐藏内容。
- 断点需要在 `b-1`、`b`、`b+1`、同宽不同高、宽屏和横竖屏验证；系统 inset、字体放大和文案长度实际组合可能影响折行与滚动。
- 关键对齐用元素对、文本/控件语义边缘和尺寸目标定义，而非无关视口坐标。只有产品明确要求时才对具体框图建立截图 parity；absolute positioning 只服务真实 overlays/stack 和已定义关系。

来源：`flutter-app-orchestrator/SKILL.md`、`adaptive-layout-implementation/references/layout-spec.md`、`adaptive-layout-implementation/references/implementation-workflow.md`、`adaptive-layout-implementation/references/test-matrix.md`。
