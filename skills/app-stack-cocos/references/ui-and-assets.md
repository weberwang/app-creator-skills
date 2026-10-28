# Cocos Creator UI 与视觉资源

## Creator 原生 UI

代码结构之外，正式 Scene/Prefab 还须按[显示结构与层级](../../cocos-game-ui-layout/references/display-object-layering.md#scene-与-prefab-显示结构)组织世界、Canvas、页面/HUD、导航和瞬态层的实际挂载、输入及生命周期；在已有技术设计与 V3 材料中落实，不另建结构审批链。

根据目标引擎验证 `Canvas`、`Widget`、`UITransform`、节点/组件布局与坐标行为。构建布局合同需记录锚点、偏移、父容器、Widget 对齐、设备可用区、显示方向、逻辑尺寸和点击目标所有者。Widget、Creator Layout 与代码控制器可能竞争同一节点的位置/尺寸；每个属性只指定一个权威驱动者。

普通图片默认使用已导入 SpriteFrame 的真实原始尺寸，并读回 ContentSize。切片类型与 UI 九点锚定无关；只在源图结构支持时使用九宫格，记录源尺寸和四边切片值，不用 `STRETCH` 或 Widget 静默拉伸单图主体。布局、资源导入和实际运行外观分别验证。

场景内 Canvas UI 及可复用 Prefab 的实体身份从 Creator 序列化数据读取；不依据屏幕截图写一整屏绝对像素来冒充节点、交互或视觉真实接入。可见瞬态 UI 保持与宿主场景分离。

## 视觉资产路线

先定义视觉目标，再把图片的外观和程序行为拆成独立交付单元。独立图片、可复用资源与 Creator 原生节点/Label/运行逻辑分别标记，并绑定实际 Node 或 Prefab 消费者。仅在目标视觉可以被具体 Creator UI 组件或 shader 真实还原时选择原生绘制。不要把整个页面或效果图单图铺在 Scene 中作为实施完成。

图像资产核对目标组件状态、有效主体边界、纹理分辨率、导入类型、透明度、边缘、颜色与状态变化。普通图片可直接展示真实候选供用户检查；引擎资源导入和视觉显示验收分别进行。复杂透明边缘、玻璃、发光或半透明边缘应保留适当遮罩或重新创作，不能阈值抠除。

## 资产生命周期

Creator 的 `.meta` UUID 是资源引用基础设施的一部分。正式导入使用编辑器实际批量导入能力及显式不覆盖策略；按文件核对完整结果，读回 UUID、真实子资源、AssetDB 就绪和消费者。只有明确动态 `resources.load` 路线才放在 `assets/resources/`。Asset Bundle 留在其独立目录按其自身 key 加载。资源被运行时使用不等于它必须处于 `resources/`。编辑器管理的 UUID、SpriteFrame 和 Prefab 引用不得手工伪造。

来源：`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout`、`skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration`、`skills/cocos-game-architecture/references/project-structure.md`、`skills/cocos-game-workflow-control/references/cocos-mcp-protocol.md`。
