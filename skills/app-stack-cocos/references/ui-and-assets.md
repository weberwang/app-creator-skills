# Cocos Creator UI 与视觉资源

## Creator 原生 UI

涉及场景切换或弹出层加载时读取[统一加载与过渡显示](../../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)，复用项目场景与资源加载入口，明确全局视图跨场景的归属、Prefab 实例销毁和资源依赖释放；资源加载完成与场景运行就绪分别验证。

按[实现分流](../../app-domain-toolkit/references/game-design-exploration.md#implementation-routes)在 V1 为每个 3D 世界场景搭建或复用有效白模，按风险选择运行验证。2D 使用平面布局、正式工程与功能用例，不制作白模；HUD、菜单及 App 沿用界面流程。白模按[可辨识的功能原型](../../app-creator-workflow/references/readable-functional-prototype.md)用 Creator 节点和可复用 Prefab 表达对象、状态与反馈，沿用实际场景输入与功能接口。模拟数据只证明实际覆盖范围。

代码结构之外，正式 Scene/Prefab 还须按[显示结构与层级](../../cocos-game-ui-layout/references/display-object-layering.md#scene-与-prefab-显示结构)组织世界、Canvas、页面/HUD、导航和瞬态层的实际挂载、输入及生命周期；在已有技术设计与 V3 材料中落实，不另建结构审批链。

根据目标引擎验证 `Canvas`、`Widget`、`UITransform`、节点/组件布局与坐标行为。构建布局合同需记录锚点、偏移、父容器、Widget 对齐、设备可用区、显示方向、逻辑尺寸和点击目标所有者。Widget、Creator Layout 与代码控制器可能竞争同一节点的位置/尺寸；每个属性只指定一个权威驱动者。

普通图片默认使用已导入 SpriteFrame 的真实原始尺寸，并读回 ContentSize。切片类型与 UI 九点锚定无关；只在源图结构支持时使用九宫格，记录源尺寸和四边切片值，不用 `STRETCH` 或 Widget 静默拉伸单图主体。布局、资源导入和实际运行外观分别验证。

场景内 Canvas UI 及可复用 Prefab 的实体身份从 Creator 序列化数据读取；不依据屏幕截图写一整屏绝对像素来冒充节点、交互或视觉真实接入。可见瞬态 UI 保持与宿主场景分离。

### Label 视觉对齐

1. 先明确对齐轴和参照物，例如框体中心或相邻图标中心。Label 的 `HorizontalAlign` 和 `VerticalAlign` 决定文字在内容框内的排版位置，`UITransform` 和 `Widget` 决定节点的布局位置。数字、标题或图文组合的视觉对齐以可见字形和指定参照物为准。
2. 有视觉偏差时，先核对节点内容框、锚点和 `Widget` 设置，再按项目的 Creator 版本与实际字体类型检查排版度量。BMFont 重点检查 `.fnt` 中的 `xoffset`、`yoffset`、字形宽高及实际字号相对原始字号的缩放。
3. 确认偏差来自字形度量后，可对文字设置局部位置补偿。按实际字体、字号和节点尺寸确定补偿值。倒计时等动态文字选取多个代表值检查，覆盖有差异的字形或位数。
4. 在现有 V5 视觉验收中提供实际运行截图，标明对齐参照物，由用户人工确认视觉结果。属性值和几何计算用于定位偏差。

例如，倒计时显示 `03:00` 时，在该字体、字号和框高下，`VerticalAlign.CENTER` 会使可见数字的中心比框中心约低 16 个 UI 单位，`VerticalAlign.TOP` 则让数字更接近视觉居中。这里的对齐选择和偏差数值仅适用于该配置。

## 视觉资产路线

图片与 UI 路线从 V2 正式视觉目标出发，把图片外观和程序行为拆成独立交付单元；V1 功能验证不等待正式视觉。3D 世界可使用[无图 3D 场景合同](../../app-workflow-control/references/world3d-scenes.md)，在整体空间和方向人工确认后，按[Cocos 模型工作流](./workflow-integration.md)交接代表模块、分批导入与正式替换，不强制拆图或逐对象生图。独立图片、可复用资源与 Creator 原生节点/Label/运行逻辑分别标记，并绑定实际 Node 或 Prefab 消费者。按[正式视觉实现优先级](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#正式视觉实现优先级)先复用合格资源，再独立制作。两种方式都不能满足约束时，才由实际 Creator 组件或 Shader 完整绘制。不要把整个页面或效果图单图铺在 Scene 中作为实施完成。

图像资产核对目标组件状态、有效主体边界、纹理分辨率、导入类型、透明度、边缘、颜色与状态变化。普通图片可直接展示真实候选供用户检查；引擎资源导入和视觉显示验收分别进行。复杂透明边缘、玻璃、发光或半透明边缘应保留适当遮罩或重新创作，不能阈值抠除。

## 资产生命周期

涉及当前范围的项目整理或清理时，遵循[公共清理规范](../../app-artifact-cleanup/references/project-cleanup.md)，核对 AssetDB UUID、导入子资源、Scene／Prefab 引用、Asset Bundle 及动态加载 key 的实际消费者；通过当前工程的原生资源管理流程维护身份，不孤立删除或伪造 `.meta`。按影响范围读回导入和引用并检查适用构建或测试；没有实际 Editor 或运行证据时保持未验证。

Creator 的 `.meta` UUID 是资源引用基础设施的一部分。正式导入使用编辑器实际批量导入能力及显式不覆盖策略；按文件核对完整结果，读回 UUID、真实子资源、AssetDB 就绪和消费者。只有明确动态 `resources.load` 路线才放在 `assets/resources/`。Asset Bundle 留在其独立目录按其自身 key 加载。资源被运行时使用不等于它必须处于 `resources/`。编辑器管理的 UUID、SpriteFrame 和 Prefab 引用不得手工伪造。

来源：`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout`、`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration`、`skills/cocos-game-architecture/references/project-structure.md`、`skills/cocos-game-workflow-control/references/cocos-mcp-protocol.md`。
