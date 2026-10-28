# 正式场景视觉还原与校准

V5 在正式 Cocos Scene 中完成视觉还原、布局校准和运行验收，直接组合 V3 冻结的拆解结构与目标布局、V4 验收通过的正式资源。布局、资源和画面差异在正式运行场景中定位并修复，再对受影响范围复验。

效果图还原沿用 V2 冻结的 `scene_reconstruction_contract`、目标视口、视觉事实、响应式关系和项目容差。V3 负责确定显示节点、父子关系、定位参照、bounds、锚点、停靠/对齐和显示层事实，并将它们写入唯一 `layout-nodes.json`；scene contract 通过 `layout_decomposition.layout_source.nodes_file` 引用该文件，V4/V5 直接读取，不在 UI 合同或 scene 的其它绑定字段复制布局树。V4 负责交付与这些节点对应的正式资源和生产记录；V5 将这些输入装配成可交互、可响应状态变化的正式场景。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景视觉还原与校准)。

## 正式场景实现

1. 将 V3 的节点与布局关系映射到正式 Cocos Scene 的 Node、Component、Prefab、显示层和布局配置。Creator 编辑器操作经[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)执行；不手写 `.scene`、`.prefab` 或 `.meta` 绑定。保留结构化场景，不用整屏截图、隐藏覆盖层或绝对叠层伪造目标画面。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景实现)。

4. 在真实 Cocos viewport 中实现安全区、缩放、方向和 resize 行为。布局重算应由明确的布局入口完成；Scene 创建、唤醒、resize 等生命周期不得累积重复偏移或重复注册监听器。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#正式场景实现)。

布局几何遵守[UI 布局合同](../../cocos-game-ui-layout/references/layout-contract.md)、[Cocos 坐标与布局适配](../../cocos-game-ui-layout/references/cocos-adapter.md)、[Widget 定位策略](../../cocos-game-ui-layout/references/widget-layout.md)与[显示节点锚点及层级](../../cocos-game-ui-layout/references/display-object-layering.md)。V3 `anchor` 表达布局关系；资源透明留白与 Node 的 `UITransform.anchorPoint` 是不同事实，不能互相替代。左上原点布局坐标必须经坐标适配器转换为锚点局部 Y 向上坐标；子节点位置按其目标位置相对直接父节点计算，祖先偏移只累计一次。

V5 消费 V3 派生的 `layout_execution`，逐节点落实位置与尺寸驱动器。两者可以不同：Widget 只定位时，共享布局或当前节点 Creator 原生 `Layout.CONTAINER` 可先计算尺寸，再调用 `updateAlignment()`；自定义项目布局器由 `SHARED` 驱动且可保留 `layout_owner: PARENT`。禁止的是多个机制并行写同一属性。Widget target 必须对应已确认的真实父/祖先节点；合成逻辑 `viewport`/`safe-area` 及兄弟参照、图文整体居中由共享布局求解，合成 `root_nodes` 不是实体节点。`viewport` 使用完整逻辑视口，`safe-area` 使用本批实际安全区小矩形，生成、居中、审阅和正式实现须消费相同快照。父级原生 Layout 排布子节点时，子位置归该 Layout，不再由 Widget 写入。Scene 创建/恢复、资源绑定后、父尺寸、动态文本/状态、方向/DPR、安全区/键盘和 resize 共用幂等布局入口，入口更新 Widget 约束并调用 `updateAlignment()`；不要再用脚本 `setPosition`、Layout 或 `ALWAYS` Widget 同时控制同一位置。V3 默认按 `scale=1`、`rotation=0`、`skew=0` 规划 Widget 路径，选择器不读取尚未采集的运行矩阵；已知非单位路径时显式使用 `SHARED`，V5 实测不符则拒绝并回上游调整。普通图片和底板的 `UITransform.contentSize` 等于正式 SpriteFrame RAW 原尺寸；普通非背景图片的 RAW 保护同时要求到统一逻辑布局空间的变换两轴单位长度且正交，SHARED 不提供缩放豁免；屏幕装饰背景按独立 cover 合同验证，视觉 bounds 另验。拉伸必须符合冻结九宫格或 `element_type: container` 的非 Sprite 容器授权。V5 在 `combination_preacceptance.layout_geometry.component_snapshots` 从 Creator 实际读取所有业务节点的父级、驱动器、Widget/Layout、UITransform、Sprite 和坐标变换；矩阵先换算到冻结布局逻辑坐标空间，不直接使用带屏幕适配缩放/DPR 的 worldMatrix。`layout_bounds`/`reference_bounds` 是实际矩形，独立核验严格中心、中心参照和组合 union；Widget flag 正确本身不能证明居中，快照覆盖全部节点也不要求每个矩形都等于目标 bounds。该组件快照与几何测量矩阵独立，`usability` 也覆盖全部业务节点。字段合同见[Widget 运行快照](../../cocos-game-ui-layout/references/widget-runtime-evidence.md)。

## 运行校准与验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md#运行校准与验收)。

## 本栈配套资料

- [视觉生产管线](./visual-production-pipeline.md)
