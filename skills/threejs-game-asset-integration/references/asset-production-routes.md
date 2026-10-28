# 资产生产路线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#资产生产路线)。

| 路线 | 可编辑源文件 | 运行时输出 | 关键验收 | 预算 |
| --- | --- | --- | --- | --- |
| UI/图标与字体 `ui-icon-font` | Figma/SVG/矢量源、字体工程、九宫格源图 | SVG 或 PNG/WebP、字体子集、九宫格与布局配置 | 像素密度、透明边缘、图标语法、字体授权、文本安全区、停靠关系 | 纹理尺寸、九宫格数量、Draw Call |
| 像素美术 `pixel-art` | Aseprite/PSD 分层源、调色板 | PNG/WebP、图集与帧数据 | 整数缩放、最近邻采样、调色板、帧边界、像素抖动 | 图集、帧数、纹理内存、采样模式 |
| 通用逐帧动画 [`frame-animation`](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation) | 内部动作时间轴和尺寸/区域计划；真实视频或固定画布首尾/关键帧、双图补帧来源清单 | 独立 PNG 图集、JSON 报告；需要动画播放时通过 `--output-preview` 生成网页预览，并维护 ThreeJS 合同 | V3 内部设计后直接制作真实候选，不等文字设计确认；V4 实际视频人工验收后抽帧，图片确认真实父图后制作依赖帧，最终序列人工验收；V5 接入 ThreeJS | 区域像素预算、FPS、帧数、生成调用数、图集尺寸、纹理内存 |
| 3D 骨骼模型动画 `skinned-model-animation` | Blender/FBX/glTF 工程、骨骼和动画源 | GLB/glTF、`SkinnedMesh`、骨骼及动画 clips | 蒙皮权重、骨架映射、clip 切换、根运动、包围盒、`AnimationMixer` 生命周期 | 骨骼/clip 数、纹理、采样、CPU/GPU 成本 |
| 地图数据与图块环境 `scene-tilemap` | Tiled/LDtk 工程、tileset 源图或项目关卡数据 | 地图/碰撞/对象层数据及项目自建的分块 `Mesh`/对象 | 接缝、碰撞语义、对象层、坐标系、分块加载；three.js 本身不提供 Tilemap 类型 | 图块/图集、地图数据、可见层、Draw Call |
| VFX/粒子/Shader `vfx-particle-shader` | 粒子配置、shader 源码、噪声/遮罩源图 | 配置、GLSL、纹理 | 动态时序、混合模式、降级、遮挡、色觉差异、设备兼容 | 粒子峰值、过绘、纹理、Draw Call、GPU 时间 |
| 装饰满幅背景 `decorative-full-bleed` | 分层绘图/3D 工程或可重现生成记录 | PNG/WebP/AVIF 与 `cover-v1` 适配配置 | 屏幕空间、无交互、统一等比 cover、焦点安全区、裁切/延展、方向资源切换 | 最大纹理、内存、解码峰值 |
| 世界/玩法环境 `gameplay-environment` | Blender/GLB 场景、模块化模型、关卡与碰撞/导航源数据 | 3D 模型、材质、灯光、Camera/关卡数据及碰撞代理；地图数据按项目实现为网格/对象 | 世界尺度、相机、遮挡、碰撞、导航、交互、动画和动态可读性 | 可见纹理、三角形/对象数、材质、Draw Call、GPU、流式加载 |
| AI 合成栅格拆分 `ai-composite-raster` | 分层重绘文件，或固定全局提示前缀、资产段、状态段、负向段、实际生成器/版本、参数、种子、参考输入与后处理记录 | 独立透明位图及清单（生成式位图按 `individual` 交付；其他路线图集须另有显式切片合同） | 基线绑定、锚点、框选编号、边缘补绘、透明度、尺度、可复现性、跨资源一致性与授权 | 生成批次、输出数量、纹理内存、图集 |

通用帧动画按[分类入口](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation--分类入口)选择用途，默认视频抽帧，图片递归补帧须用户明确选择或确认切换。V3 内部分析行为、阶段、事件、衔接、时长、尺寸与 FPS，直接在已有授权内写提示词并制作真实候选，不等待时间轴文字确认；关键玩法事实有决定性歧义时只询问受影响部分。分辨率、条数与预算选择见[区域规划](../../threejs-domain-contracts/resources/frame-animation/references/region-planning.md)，图片默认 768p，确需 2K 时在已有工具与预算授权内直接选择，新增费用或超出授权才询问。V4 人工验收实际最终抽帧视频后才抽帧；图片逐张确认首尾、关键帧及递归父图后继续，最终真实序列人工验收。来源、时间映射、修图成果和 schema 分派见[接入合同](../../threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md)。上游静态图片 individual 禁图集合同不会自动变为帧动画合同，路线切换仍须明确决定；预览确认也不构成付费、外部写入或真机授权。

真实三维世界与角色必须以模型/`SkinnedMesh`、材质、灯光、Camera、关卡/碰撞数据和相应运行逻辑交付；骨骼角色动画由模型管线导入的 clips 与 `AnimationMixer` 驱动。帧动画适用于 HUD、billboard、贴图动画等二维序列表现，不能替代三维骨骼和网格动画。下文 `effect-image` 的图片拆解、UI 九宫格与屏幕空间布局规则仅约束 HUD、DOM、平面贴图等适用的二维表现，不得把真实三维环境或角色拆成图片覆盖场景。

## 路线选择规则

### effect-image 全元素视觉路线

`effect-image` 的忠实还原以冻结参考中的可观察视觉事实为准，由 three.js/DOM 装配、布局、交互和状态行为；本分支仅处理二维屏幕空间表现，不把普通游戏 UI 一律图片化，也不改变非效果图工作流的默认路线。包含三维世界、角色模型或关卡的目标走[三维模型与关卡管线](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline)，本节不将其拆成二维 coverage。每个 `scene_reconstruction_contract.coverage_regions[]` 必须填写唯一的 `visual_route_analysis`，在 V2/V3/V4+ 逐阶段回对元素类别、观察到的材质/轮廓/光影/装饰特征、是否具有明显美术特征、动态要求、原生适用性证据、复用适用性证据、最终 owner、`implementation_plan.mode`、生产方式和交付类型。路线结论必须能从冻结图中的可观察事实和项目实际 three.js 实现的绘制能力复核；“按钮”“面板”等语义名称，以及单独的静态/动态标记，均不能决定路线。

视觉来源与场景装配是两个独立决策。每个二维 coverage region 只能根据冻结参考图的可观察事实选择 `image-asset` 或 `threejs-native`，再用独立的 `assembly_analysis` 证明正式 Scene 采用原子装配且没有整屏捕获。文本交给 `text_decomposition` 判断 DOM/CSS2D 文本、项目自建文本网格/纹理或固定字图。纯色矩形、基础几何、规则边框、可确定性表达的简单规则渐变、遮罩和进度填充，在项目实际 three.js 实现能精确表达冻结外观时可选 `threejs-native`，无论它们是静态还是动态；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰继续使用独立图片路线。不得仅凭元素名称或静态/动态标记选择路线。`uses_full_screen_capture=false` 不得推导 `runtime-program`；原子 `Sprite`、项目自建九宫格网格、独立背景块和其他图片部件仍是结构化实现。

`native_suitability` 必须记录实际 ThreeJS 绘制能力、可审计资格证据和冻结的 `render_contract`：`renderer`、逻辑尺寸 `dimensions.width/height`、`colors`、`line_width`、`corner_radius`、`gradient`、`opacity`、`applicable_states` 与 `unsupported_features`。颜色和渐变 stops 的 `color` 使用 `#RRGGBB`；`gradient.type=none` 时 `stops` 必须为空数组；线性渐变记录 `angle`（0–360）及按顺序排列的 stops。合同冻结参考中观察到的精确值；ThreeJS 不支持或不能确定性表达的视觉特征列入 `unsupported_features` 并阻断该原生路线，不能用近似替代后通过。特色视觉选择原生路线时仍须提交等价性证据，并绑定预先声明的容差或精确例外。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#effect-image-全元素视觉路线)。

视觉外观来源和行为装配分开登记、分别绑定。一个按钮可由原生框体 region、独立图标 image-asset region 和 DOM/CSS2D 文本 region 构成；每项有各自 owner、生产合同、状态与布局/资源绑定，按钮交互行为再通过明确的组件/节点引用装配。不能把来源不同或承担不同职责的部分合并成 `composite` region 或 `composite_parts`，也不能用模糊的大区域覆盖这些归属。若同一视觉事实仍混合程序行为与独立美术资产，必须回到 V2/PROPOSAL 重新划分 coverage/annotation，分别进入各自生产、运行和验收合同。

全部区域都选择 `threejs-native` 时，场景合同必须提供绑定冻结目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`；文件门会读取实际文件并逐区核对资格事实，不能由同一拆解提案用“均为简单视觉”的自声明自行闭环。

| 来源路线 | 适用范围 | 必须满足的硬门 |
| --- | --- | --- |
| `image-asset` | 特色插画、复杂纹饰、不规则轮廓、复杂材质及其他项目实际 three.js 实现不能确定性复现的明显美术特征 | `fixed-production-visual`；适用的 `image-generation`/`authored-raster`/`reuse` 合同及对应交付类型。`Sprite`、项目自建九宫格网格、atlas slice 仍属于图片资产路线，因为视觉来源是纹理 |
| `threejs-native` | 项目实际 three.js 能力可精确表达的二维文本/几何/遮罩/进度表现，以及运行时布局、交互逻辑、动态数据、粒子/Shader/程序特效；静态基础几何同样可选 | 文本必须委托 `text_decomposition`；非文本填写完整 `native_suitability`、原语和 `render_contract`；按真实用途记录 `runtime-data`/`runtime-rendered`/`runtime-program` 与 `threejs-graphics`/`runtime-program`。资格不由静态/动态声明单独成立。特色视觉仍须用等价性证据绑定预声明容差或精确例外 |
| 混合来源与行为装配 | 一个可交互组件由原生外观、独立图片和程序文本等不同来源构成 | 依照可观察边界拆成独立 coverage region，分别记录 owner、生产合同和布局/资源绑定；行为装配通过明确组件/节点引用接线，禁止单一区域 `composite` 闭环 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#effect-image-全元素视觉路线)。

### 功能与场景阶段的共享规划

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#功能与场景阶段的共享规划)。

### 正式图片生成后的共享与复用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#正式图片生成后的共享与复用)。

### 其他资产路线约束

- 装饰满幅背景只覆盖无交互的屏幕空间装饰；世界空间关卡、项目自建地图/图块、碰撞或玩法环境使用场景地图或世界/玩法环境路线。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#其他资产路线约束)。

### 完整拆解与视觉显著性

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#完整拆解与视觉显著性)。

路线先判断视觉作用和内容变化需求，再核对实现能力。明显承担主题、情绪或识别作用的字形、材质、轮廓和光影优先保留为独立位图；视觉特征不明显的操作文字优先考虑 DOM/CSS2D 或项目自建文字渲染，简单色彩填充、规则边框等优先考虑实际可用的原生绘制。文本渲染由项目选择和维护；three.js 不内置通用文本节点。固定美术文字可用整段字图；需要更换文案或复用字形风格时评估位图字体及其字形覆盖。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#完整拆解与视觉显著性)。

### 色彩填充路线判定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#色彩填充路线判定)。

### 程序还原资格与位图回退

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#程序还原资格与位图回退)。

## 生成式位图生产合同硬门禁

视觉清单 schema 1.5 的新合同字段必须显式填写：`production_origin`、`production_method`、`delivery_kind`、`image_generation_required`、`generation_record_required`、`substitution_policy` 和 `expected_assets`。`production_method` 使用 `image-generation` 表示生成式位图分类，也可使用 `authored-raster`、`authored-svg`、`threejs-graphics`、`runtime-program`、`reuse`；`delivery_kind` 仅允许 `raster-image`、`vector-image`、`runtime-drawing`、`runtime-program`、`existing-asset`。系统根据提示词、参考输入、主体材质、透明需求和可用能力决定是否进入 `image-generation`，不绑定供应商；`independent-production` 与 `generate-now` 都不能推断具体生成器；独立生产不等于图片生成，视觉相似不等于生产合同完成。

当 `image_generation_required=true` 时，唯一合格组合是 `production_method=image-generation` 与 `delivery_kind=raster-image`。必须保留独立源/运行时位图、实际生成器与版本、完整提示词、真实参考输入、MIME、宽高、alpha、实际输出文件，以及已被运行时实际消费的证据；`generator` 必须记录实际调用的工具；工具未暴露的版本、模型参数或种子明确记录 `not-provided`，不得编造。单图宽高由验证器按逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 自动计算，`expected_assets.width/height` 和实际输出必须精确等于最小值；`scene_asset_usage.max_dpr` 必须严格为数字 `1`，`padding_policy` 不是 `none` 均失败，尺寸计算合同不需要人工审阅。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 仍按设备值动态取值并封顶为 2，不代表运行时固定使用 2。`authored-svg`、`threejs-graphics`、CanvasTexture 和 runtime drawing 均不能等价完成。生成记录禁止裁切冻结参考图，参考图只能作为输入约束；选择可用生成能力不自动新增外部调用授权。

当生成资产声明 `expected_assets.alpha=true` 时，必须冻结 `transparency_requirements.strategy` 与 `edge_profile`，并在生成记录中用 `edge_evidence` 说明从参考图观察到的边缘事实。路线按实际边缘与生产工具能力选择：`background-removal` 只适用于硬边主体与纯色背景明显分离的图像；`direct-alpha` 只在工具对该边缘类型已有验证、且输出 PNG 解码后确实含透明像素时使用；`mask-composition` 用于独立遮罩或人工创作。`semi-transparent`、`glow`、`soft-shadow`、`hair`、`glass`、`mixed` 禁止阈值去背。工具声明提供透明选项或提示词请求透明均不构成能力证明。复杂边缘没有可靠路线时，报告能力缺口，再选已验证的直接 Alpha、独立遮罩/人工创作、重新生成，或按明确变更流程调整为 ThreeJS 特效；不得提高颜色容差、硬抠轮廓、删除光效或伪造透明结果。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#生成式位图生产合同硬门禁)。

```bash
node skills/threejs-game-asset-integration/scripts/remove-background-local.mjs --source input.png --output output.png --background-color '#00FF00' --tolerance 24 --require-solid-background --edge-profile hard-edge --color-separation-verified --record record.json --preview-dir evidence/preview
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#生成式位图生产合同硬门禁)。

## 机器清单最低字段

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#机器清单最低字段)。

`effect-image` 清单中只有被 fixed coverage 实际引用的资源必须声明 `ownership_type=fixed-production-visual` 并反向完整绑定 `coverage_region_ids`；同一清单中未被效果图引用的 Boot、Loading 或其他场景资产保持普通字段，且禁止伪造这两个还原专用字段。普通 `not-applicable` 清单也禁止还原专用字段。所有资源仍须声明具体 `scene_id` 或受控 `shared` 归属。处于 `producing`、`review` 或 `accepted` 的资源还必须绑定当前基线；`accepted` 必须保留来源或生成记录、适用的版权/许可信息、唯一输出、ThreeJS/玩法视觉与一致性证据。

`reuse-existing` 的 `reuse_source` 是可复核的精确身份，不是路径备注：必须同时记录 `source_asset_id`、`source_manifest`、`source_file`、`license_record`、`compatibility_evidence`、`visual_baseline_id/version` 及适用 scene/state。`source_manifest` 必须是独立的不可变 `asset-reuse-snapshot/1.0` JSON 快照，根节点为 `snapshot_schema`、`snapshot_id`、`asset`，禁止指向当前 `docs/visual-assets.json`；`asset` 记录 accepted 资源的基线、许可、scene/shared 归属、适用 scene/state、来源、runtime_outputs、ThreeJS/玩法/一致性证据，`source_manifest_sha256` 仅作可选追踪，验收按实际快照检查。`--check-files` 会解析快照并核对实际源文件及适用证据，不比较摘要；缺失、漂移、错误基线/许可/归属或 accepted 证据不全都不得通过。冻结 `reference_target.original_file` 默认必须是完整合法的 8 位非交错 RGB/RGBA PNG，且扫描行完整、IHDR 宽高必须与每个目标画布一致。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md#机器清单最低字段)。

## 本栈配套资料

- [生成式透明能力审计](./transparency-capability-audit.md)
- [文字路线判定](../../threejs-game-ui-layout/references/layout-contract.md#文字路线判定)
- [全局视觉控制约束](./global-visual-control.md)
- [Effect-image 生成式位图忠实还原提示词合同](./effect-image-prompt-contract.md)
