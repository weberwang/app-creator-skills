# 资产生产路线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#资产生产路线)。

| 路线 | 可编辑源文件 | 运行时输出 | 关键验收 | 预算 |
| --- | --- | --- | --- | --- |
| UI/图标与字体 `ui-icon-font` | Figma/SVG/矢量源、字体工程、九宫格源图 | SVG 或 PNG/WebP、字体子集、九宫格与布局配置 | 像素密度、透明边缘、图标语法、字体授权、文本安全区、停靠关系 | 纹理尺寸、九宫格数量、Draw Call |
| 像素美术 `pixel-art` | Aseprite/PSD 分层源、调色板 | PNG/WebP、图集与帧数据 | 整数缩放、最近邻采样、调色板、帧边界、像素抖动 | 图集、帧数、纹理内存、采样模式 |
| 通用逐帧动画 [`frame-animation`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation) | 内部动作时间轴和尺寸/区域计划；真实视频或固定画布首尾/关键帧、双图补帧来源清单 | 独立 PNG 图集、JSON 报告；需要动画播放时通过 `--output-preview` 生成网页预览，并维护 Cocos 合同 | V3 完成设计并说明目标感受，用户明确确认当前方案后才制作真实候选；V4 实际视频人工验收后抽帧，图片确认真实父图后制作依赖帧，最终序列人工验收；V5 接入 Cocos | 区域像素预算、FPS、帧数、生成调用数、图集尺寸、纹理内存 |
| 骨骼动画 `skeletal-animation` | Spine/DragonBones 等工程与依赖贴图 | 骨骼数据、atlas、纹理 | 骨骼层级、蒙皮、混合、事件、运行时版本与许可 | 骨骼/插槽数、贴图、采样、CPU/GPU 成本 |
| 场景/Tilemap `scene-tilemap` | Tiled/LDtk 工程、tileset 源图 | 地图 JSON、tileset、碰撞/对象层数据 | 接缝、碰撞语义、对象层、坐标系、分块加载 | 图块/图集、地图数据、可见层、Draw Call |
| VFX/粒子/Shader `vfx-particle-shader` | 粒子配置、shader 源码、噪声/遮罩源图 | 配置、GLSL、纹理 | 动态时序、混合模式、降级、遮挡、色觉差异、设备兼容 | 粒子峰值、过绘、纹理、Draw Call、GPU 时间 |
| 装饰满幅背景 `decorative-full-bleed` | 分层绘图/3D 工程或可重现生成记录 | PNG/WebP/AVIF 与 `cover-v1` 适配配置 | 屏幕空间、无交互、统一等比 cover、焦点安全区、裁切/延展、方向资源切换 | 最大纹理、内存、解码峰值 |
| 世界/玩法环境与 3D 模型 `gameplay-environment` | 分层场景、Tilemap、tileset、模块化关卡源、版本化 Blender 工程 | 独立地块/对象、地图、模型、资源级 Prefab、碰撞及层级数据 | 玩法空间、模型结构/拓扑/法线/UV、比例/Pivot、遮挡、碰撞、导航、交互、动态可读性 | 三角面/顶点、材质槽、LOD、碰撞体、可见纹理、对象数、过绘、Draw Call、流式加载 |
| AI 合成栅格拆分 `ai-composite-raster` | 分层重绘文件，或固定全局提示前缀、资产段、状态段、负向段、实际生成器/版本、参数、种子、参考输入与后处理记录 | 独立透明位图及清单（生成式位图按 `individual` 交付；其他路线图集须另有显式切片合同） | 基线绑定、锚点、框选编号、边缘补绘、透明度、尺度、可复现性、跨资源一致性与授权 | 生成批次、输出数量、纹理内存、图集 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#资产生产路线)。

运行时 3D 模型（包括道具、角色静态网格和模块化环境）使用现有 `gameplay-environment` 路线，由 [`cocos-game-3d-modeling`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-3d-modeling) 通过 Blender MCP 生产，并按[工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)登记和导入。`visual-assets.json` 的通用来源、输出、归属和证据校验不验证模型内部几何；拓扑、UV、LOD、导出回读和 Creator 导入报告作为实际技术证据提交，不伪填图片字段。仅将 3D 工程离线渲染成无交互背景时，最终位图仍走 `decorative-full-bleed`；渲染图不能代替运行时网格。已冻结 `image_generation_required=true` 的区域不得用模型、3D 渲染图或原生体块静默替换。

## 路线选择规则

采用 `runtime-program`、粒子或 Shader 路线新增显示元素时，仍按[编辑器显示元素还原](../../app-domain-toolkit/references/editor-display-authoring.md)交付与运行共用的可编辑模板或生成配置及代表性编辑态预览；运行时可继续动态生成实例。编辑器模板与配置不因此记为生成式位图 asset，也不改变视觉清单的既有字段和路线合同。

### effect-image 全元素视觉路线

`effect-image` 的忠实还原以冻结参考中的可观察视觉事实为准，由 Cocos 装配、布局、交互和状态行为；它不把普通游戏 UI 一律图片化，也不改变非效果图工作流的默认路线。每个 `scene_reconstruction_contract.coverage_regions[]` 必须填写唯一的 `visual_route_analysis`，在 V2/V3/V4+ 逐阶段回对元素类别、观察到的材质/轮廓/光影/装饰特征、是否具有明显美术特征、动态要求、原生适用性证据、复用适用性证据、最终 owner、`implementation_plan.mode`、生产方式和交付类型。路线结论必须能从冻结图中的可观察事实和 Cocos 实际支持的绘制能力复核；“按钮”“面板”等语义名称，以及单独的静态/动态标记，均不能决定路线。

视觉来源与场景装配是两个独立决策。每个 coverage region 只能根据冻结参考图的可观察事实选择 `image-asset` 或 `cocos-native`，再用独立的 `assembly_analysis` 证明正式 Scene 采用原子装配且没有整屏捕获。文本交给 `text_decomposition` 判断运行时字体或固定字图。纯色矩形、基础几何、规则边框、可确定性表达的简单规则渐变、遮罩和进度填充，在 Cocos 原生 API 能精确表达冻结外观时可选 `cocos-native`，无论它们是静态还是动态；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰继续使用独立图片路线。不得仅凭元素名称或静态/动态标记选择路线。`uses_full_screen_capture=false` 不得推导 `runtime-program`；原子 Sprite、NineSlice、独立背景块和其他图片部件仍是结构化实现。

`native_suitability` 必须记录实际 Cocos 绘制能力、可审计资格证据和冻结的 `render_contract`：`renderer`、逻辑尺寸 `dimensions.width/height`、`colors`、`line_width`、`corner_radius`、`gradient`、`opacity`、`applicable_states` 与 `unsupported_features`。颜色和渐变 stops 的 `color` 使用 `#RRGGBB`；`gradient.type=none` 时 `stops` 必须为空数组；线性渐变记录 `angle`（0–360）及按顺序排列的 stops。合同冻结参考中观察到的精确值；Cocos 不支持或不能确定性表达的视觉特征列入 `unsupported_features` 并阻断该原生路线，不能用近似替代后通过。特色视觉选择原生路线时仍须提交等价性证据，并绑定预先声明的容差或精确例外。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#effect-image-全元素视觉路线)。

视觉外观来源和行为装配分开登记、分别绑定。一个按钮可由原生框体 region、独立图标 image-asset region 和 Creator `Label` 文本 region 构成；每项有各自 owner、生产合同、状态与布局/资源绑定，按钮交互行为再通过明确的组件/节点引用装配。不能把来源不同或承担不同职责的部分合并成 `composite` region 或 `composite_parts`，也不能用模糊的大区域覆盖这些归属。若同一视觉事实仍混合程序行为与独立美术资产，必须回到 V2/PROPOSAL 重新划分 coverage/annotation，分别进入各自生产、运行和验收合同。

全部区域都选择 `cocos-native` 时，场景合同必须提供绑定冻结目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`；文件门会读取实际文件并逐区核对资格事实，不能由同一拆解提案用“均为简单视觉”的自声明自行闭环。

| 来源路线 | 适用范围 | 必须满足的硬门 |
| --- | --- | --- |
| `image-asset` | 特色插画、复杂纹饰、不规则轮廓、复杂材质及其他 Cocos 原生能力不能确定性复现的明显美术特征 | `fixed-production-visual`；适用的 `image-generation`/`authored-raster`/`reuse` 合同及对应交付类型。Sprite、NineSlice、atlas slice 仍属于图片资产路线，因为视觉来源是纹理 |
| `cocos-native` | Cocos 原生能力可精确表达的文本、纯色矩形、基础几何、规则边框、简单规则渐变、遮罩、进度填充，以及运行时布局/交互逻辑、动态数据、粒子/Shader/程序特效；静态基础几何同样可选 | 文本必须委托 `text_decomposition`；非文本填写完整 `native_suitability`、原语和 `render_contract`；按真实用途记录 `runtime-data`/`runtime-rendered`/`runtime-program` 与 `cocos-graphics`/`runtime-program`。资格不由静态/动态声明单独成立。特色视觉仍须用等价性证据绑定预声明容差或精确例外 |
| 混合来源与行为装配 | 一个可交互组件由原生外观、独立图片和程序文本等不同来源构成 | 依照可观察边界拆成独立 coverage region，分别记录 owner、生产合同和布局/资源绑定；行为装配通过明确组件/节点引用接线，禁止单一区域 `composite` 闭环 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#effect-image-全元素视觉路线)。

### 功能与场景阶段的共享规划

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#功能与场景阶段的共享规划)。

### 正式图片生成后的共享与复用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#正式图片生成后的共享与复用)。

### 其他资产路线约束

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#其他资产路线约束)。

### 完整拆解与视觉显著性

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#完整拆解与视觉显著性)。

路线先判断视觉作用和内容变化需求，再核对实现能力。明显承担主题、情绪或识别作用的字形、材质、轮廓和光影优先保留为独立位图；视觉特征不明显的操作文字优先考虑系统文本，简单色彩填充、规则边框等优先考虑原生绘制。系统文本使用 Creator `Label` 或 `RichText` 等项目确认的 UI 文本组件，沿用项目字体与多语言覆盖，不为每段普通文案生产字图。固定美术文字可用整段字图；需要更换文案或复用字形风格时评估位图字体及其字形覆盖。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#完整拆解与视觉显著性)。

### 色彩填充路线判定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#色彩填充路线判定)。

### 程序还原资格与位图回退

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#程序还原资格与位图回退)。

## 生成式位图生产合同硬门禁

视觉清单 schema 1.5 的新合同字段必须显式填写：`production_origin`、`production_method`、`delivery_kind`、`image_generation_required`、`generation_record_required`、`substitution_policy` 和 `expected_assets`。`production_method` 使用 `image-generation` 表示生成式位图分类，也可使用 `authored-raster`、`authored-svg`、`cocos-graphics`、`runtime-program`、`reuse`；`delivery_kind` 仅允许 `raster-image`、`vector-image`、`runtime-drawing`、`runtime-program`、`existing-asset`。系统根据提示词、参考输入、主体材质、透明需求和可用能力决定是否进入 `image-generation`，不绑定供应商；`independent-production` 与 `generate-now` 都不能推断具体生成器；独立生产不等于图片生成，视觉相似不等于生产合同完成。

当 `image_generation_required=true` 时，唯一合格组合是 `production_method=image-generation` 与 `delivery_kind=raster-image`。必须保留独立源/运行时位图、实际生成器与版本、完整提示词、真实参考输入、MIME、宽高、alpha、实际输出文件，以及已被运行时实际消费的证据；`generator` 必须记录实际调用的工具；工具未暴露的版本、模型参数或种子明确记录 `not-provided`，不得编造。单图宽高由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，`expected_assets.width/height` 和实际输出必须精确等于最小值；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 不是 `none` 均失败，尺寸计算合同不需要人工审阅。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 仍按设备值动态取值并封顶为 2，不代表运行时固定使用 2。`authored-svg`、`cocos-graphics`、CanvasTexture 和 runtime drawing 均不能等价完成。生成记录禁止裁切冻结参考图，参考图只能作为输入约束；选择可用生成能力不自动新增外部调用授权。

当生成资产声明 `expected_assets.alpha=true` 时，必须冻结 `transparency_requirements.strategy` 与 `edge_profile`，并在生成记录中用 `edge_evidence` 说明从参考图观察到的边缘事实。路线按实际边缘与生产工具能力选择：`background-removal` 只适用于硬边主体与纯色背景明显分离的图像；`direct-alpha` 只在工具对该边缘类型已有验证、且输出 PNG 解码后确实含透明像素时使用；`mask-composition` 用于独立遮罩或人工创作。`semi-transparent`、`glow`、`soft-shadow`、`hair`、`glass`、`mixed` 禁止阈值去背。工具声明提供透明选项或提示词请求透明均不构成能力证明。复杂边缘没有可靠路线时，报告能力缺口，再选已验证的直接 Alpha、独立遮罩/人工创作、重新生成，或按明确变更流程调整为 Cocos 特效；不得提高颜色容差、硬抠轮廓、删除光效或伪造透明结果。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#生成式位图生产合同硬门禁)。

```bash
node skills/cocos-game-asset-integration/scripts/remove-background-local.mjs --source input.png --output output.png --background-color '#00FF00' --tolerance 24 --require-solid-background --edge-profile hard-edge --color-separation-verified --record record.json --preview-dir evidence/preview
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#生成式位图生产合同硬门禁)。

## 机器清单最低字段

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#机器清单最低字段)。

`effect-image` 清单中只有被 fixed coverage 实际引用的资源必须声明 `ownership_type=fixed-production-visual` 并反向完整绑定 `coverage_region_ids`；同一清单中未被效果图引用的 Boot、Loading 或其他场景资产保持普通字段，且禁止伪造这两个还原专用字段。普通 `not-applicable` 清单也禁止还原专用字段。所有资源仍须声明具体 `scene_id` 或受控 `shared` 归属。处于 `producing`、`review` 或 `accepted` 的资源还必须绑定当前基线；`accepted` 必须保留来源或生成记录、适用的版权/许可信息、唯一输出、Cocos/玩法视觉与一致性证据。

`reuse-existing` 的 `reuse_source` 是可复核的精确身份，不是路径备注：必须同时记录 `source_asset_id`、`source_manifest`、`source_file`、`license_record`、`compatibility_evidence`、`visual_baseline_id/version` 及适用 scene/state。`source_manifest` 必须是独立的不可变 `asset-reuse-snapshot/1.0` JSON 快照，根节点为 `snapshot_schema`、`snapshot_id`、`asset`，禁止指向当前 `docs/visual-assets.json`；`asset` 记录 accepted 资源的基线、许可、scene/shared 归属、适用 scene/state、来源、runtime_outputs、Cocos/玩法/一致性证据，`source_manifest_sha256` 仅作可选追踪，验收按实际快照检查。`--check-files` 会解析快照并核对实际源文件及适用证据，不比较摘要；缺失、漂移、错误基线/许可/归属或 accepted 证据不全都不得通过。冻结 `reference_target.original_file` 默认必须是完整合法的 8 位非交错 RGB/RGBA PNG，且扫描行完整、IHDR 宽高必须与每个目标画布一致。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#机器清单最低字段)。

## 本栈配套资料

- [生成式透明能力审计](./transparency-capability-audit.md)
- [文字路线判定](../../cocos-game-ui-layout/references/layout-contract.md#文字路线判定)
- [分类入口](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)
- [设计理念说明](../../cocos-domain-contracts/resources/frame-animation/references/intent-driven-design.md#方案完成后阐述设计理念)
- [区域规划](../../cocos-domain-contracts/resources/frame-animation/references/region-planning.md)
- [接入合同](../../cocos-domain-contracts/resources/frame-animation/references/workflow-integration.md)
- [全局视觉控制约束](./global-visual-control.md)
- [Effect-image 生成式位图忠实还原提示词合同](./effect-image-prompt-contract.md)
