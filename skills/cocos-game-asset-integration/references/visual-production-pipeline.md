# 视觉生产管线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#视觉生产管线)。

## V0 分流

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v0-分流)。

## V1 功能验证与可选白盒

先实现并验证本批次相关功能；白盒、草图和低保真样片仅按风险需要使用。功能未验证不能进入正式视觉目标确认。

## V2 玩法视觉契约与视觉目标

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-玩法视觉契约与视觉目标)。

7. 场景、整套 UI、视觉系统和可选参考模式必须同时读取并冻结 [`cocos-game-ui-layout` 的布局合同](../../cocos-game-ui-layout/references/layout-contract.md)：浏览器 viewport、Canvas、逻辑坐标、safe area 四层关系，Creator 固定宽/固定高/项目 `custom` 设计分辨率策略、响应式锚点/断点重排，背景覆盖目标，留白/裁切/拉伸许可，代表性视口与关键状态，以及动态文本、显隐、滚动、触控、resize 和项目支持方向策略，并声明 `visual_validation.mode=usability|exact`（默认 `usability`）。方向覆盖遵循 `orientationPolicy.allowed`：单方向项目在同方向覆盖窄宽尺寸与连续 resize，双方向项目才验证方向切换；`exact` 方向轴只覆盖声明的方向。只有 `exact` 或明确全覆盖需求时才冻结完整视口/状态矩阵。缺少影响可用性的核心关系标记“响应式契约缺失”，阻断当前场景 Work Item 的 V3。
8. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-玩法视觉契约与视觉目标)。

### V2 条件门：视觉目标与决策记录

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-条件门视觉目标与决策记录)。

## V3 拆解确认与生产方案

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

功能分组遵守[功能语义分组约束](../../cocos-game-ui-layout/references/functional-semantic-grouping.md)。阶段 A 为每个元素明确 `parent_element_id` 和 `semantic_grouping.kind/rationale`：父子树表达功能归属、共同状态、交互或真实布局管理；单纯跟随另一元素定位时，通过 `ui_layout.position_reference_id` 声明参照，不强制增加父容器。简单“底板+图标+文本”优先让底板 Sprite 节点兼任组件根，声明 `element_type=container`、`render_kind=sprite` 和 `kind=component|region`，保留自己的 `component_id`/`placement_id` 图片身份；不要拆成空根和底板叶子。普通纯结构容器不声明 `render_kind` 或 Sprite 尺寸计划。若额外纯结构容器包裹可用底板和内容，`ui_layout.independent_container_reason` 必须写明皮肤独立动画、稳定交互/布局尺寸、独立裁切或动态排布等职责；只写“分组/包含”不成立。机器只校验字段结构和理由非空，不证明语义职责真实，也不自动删除或改写已有确认。文字独立登记但归属对应信息组，不按元素类型集中归组。子项突出非根父框时用 `ui_layout.visual_overflow.reason` 说明，保留父框布局尺寸，不制造联合包围容器。语义歧义留在拆解审阅，机器不根据距离、显示层序或最小包含矩形补父级。阶段 B 继承已确认归属与参照，派生独立参照边界、偏移及图片尺寸计划；普通图片（含兼任容器的底板）保持 RAW 且无 contentSize 写入，只有九宫格图片设置自身目标宽高。九点停靠使用水平/垂直轴对齐、锚点与偏移表示位置关系，不按视觉落入九等分格来推断；它与九宫格纹理切片完全分离。实际归属或参照变更时更新受影响确认及工件，不能复用已失效的布局身份。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

V3 布局必须后置于拆解图确认：阶段 A 先由冻结原图、区域和组件事实生成拆解图及技术 JSON，并明确按确认顺序排列的 `decomposition_elements`；只有图中内容或分组需要更正时，用户才通过指出具体图号提出修改，代理更新 Stage A proposal、重出图片并重新确认。默认不先给文字提案，也不要求用户查看技术 JSON。只有 `visual-decomposition-confirmation/1.0` 通过后，智能布局才结合原图构图、视觉重心和元素语义，为每个确认元素按原顺序生成唯一的 `left/center/right × top/center/bottom` 对齐决策，并为 center 轴解释规范化 `center_alignment`；普通中心轴默认 strict，受 leader 的 `member_ids` 控制时组员继承组策略。Stage A proposal 是历史确认输入，Stage B `automatic-layout-decision/1.0` 是布局生成输入；decision 文件保留原字节，规范化结果写入唯一的同批 `layout-nodes.json`。显式 reference 偏移必须带理由。图文整体居中由 leader 指定 `member_ids`，单图标居中不包含独立广告角标。中心策略可平移节点或整组；父级或定位参照的整体位移也沿关系传播到依赖节点，非 center 轴同样保持原有相对间距。所有位置均在 layout-nodes 中派生，proposal 原 bounds、元素尺寸、身份和顺序保持不变；细则见[居中策略与组合定位](../../cocos-game-ui-layout/references/center-alignment.md)。几何测量不得替代该视觉判断。scene contract 的 `layout_decomposition.layout_source.nodes_file` 直接引用此唯一节点文件，`layout_binding`、annotation 与 confirmation 只保存身份/证据，annotation/confirmation 的 `layout_nodes_file` 必须与 source 路径一致。布局生成器只消费确认 proposal 和 Stage B decision，按原顺序推导节点，不能读取另一份预存 `layout_nodes` 或生成新的视觉参考图、多个布局候选。PNG、`review.html` 和派生快照只读展示，不是第二份手工事实且不得回写 proposal；用户要求布局关系变化时更新 Stage B decision 并重新生成，父子/分组变化则按原 Stage A 规则重新确认。两次确认仍分别是人工确认，且不得合并或跳过。

布局图的每个框必须与右栏共用唯一短编号，并注明父编号，保持确认元素原序；编号避让只能调整标注，不得改变元素布局。右栏逐节点说明自身相对上级的双轴停靠、中心策略、组合成员、锚点与偏移，父容器、空容器同样必填，根明确无上级。底板 Sprite 兼任组件根时显示为一个节点并保留图片身份；额外纯结构容器显示 `independent_container_reason`。九点停靠表示水平/垂直位置关系，不等同于图片九宫格切片。技术 ID 和四边距离仅辅助追溯；长说明必须换行且完整可见，不能用被裁切的文本或元数据完整标记代替可读图。详细规则见 [UI 布局合同](../../cocos-game-ui-layout/references/layout-contract.md#v3-串行拆解与布局标注)。

`docs/visual-assets.json` 使用 schema 1.5。普通资产声明 `not-applicable`；效果图还原进入正式生产前声明 `effect-image/v3-ready`，此时冻结目标、合同回对、coverage、拆解图确认和生产方案必需，而 fidelity case 可为空。coverage 必须逐冻结 scene/state 声明目标画布、画布内 region 和完整性摘要，覆盖率为 1、未覆盖列表为空、状态通过且绑定证据；不能用单个微小区域冒充全覆盖。每个固定视觉 region 还要有稳定编号、实现分类和七个生产合同字段；`production_method` 使用 `image-generation`、`authored-raster`、`authored-svg`、`cocos-graphics`、`runtime-program`、`reuse`，`delivery_kind` 使用 `raster-image`、`vector-image`、`runtime-drawing`、`runtime-program`、`existing-asset`。实现分类为 `generate-now`、`reuse-existing`、`runtime-program`，并在冻结效果图标注图中同时呈现。

拆解提案固定按“冻结视觉事实 → 选择视觉来源路线 → 独立验证场景装配”执行。`visual_route_analysis` 只决定图片资产或 Cocos 原生路线；`assembly_analysis` 只声明原子 Scene 装配、禁止整屏捕获并明确允许独立图片资产。路线判定先把文本委托给 `text_decomposition`，其余区域依据冻结图中的可观察外观事实和 Cocos 实际渲染能力决定。静态纯色矩形、基础几何、规则边框、简单规则渐变、遮罩和进度填充，在 Cocos 能确定性表达冻结外观时可选择 `cocos-native`；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰继续选择独立图片路线。元素语义名称及 `dynamic_requirements.is_dynamic` 单独都不能决定路线；非文本原生资格须有可审计事实和完整 `render_contract`。任何生成步骤都不得从“不能整屏贴图”推导“所有视觉必须程序绘制”。若同一按钮等组件含多种视觉来源，分别建立区域：例如原生框体、独立图标图片和 Creator `Label` 文字各自登记 owner、生产合同及布局/资源节点绑定；交互行为用明确组件/节点引用装配，不以 `composite` 汇总。禁止单一 `composite` region 或 `composite_parts` 闭环生产/验收；检测到职责或来源混合时必须回 V2/PROPOSAL 按可观察边界重拆。如果全部 coverage 都选择 `cocos-native`，必须附带绑定当前目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`；文件门会读取实际文件并逐区核对资格事实，否则停在 V2/PROPOSAL。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

生成式位图的源文件、运行时文件和实际输出仅允许 `image/png` 或 `image/jpeg` 以及 `.png`、`.jpg`、`.jpeg` 后缀；通用 authored-raster 可使用其他位图格式。生成资产 `expected_assets.alpha=true` 时，Schema 必须冻结 `transparency_requirements.strategy` 与 `edge_profile`，并在记录中绑定 `edge_evidence`。`background-removal` 只允许用于 `hard-edge` 且主体与指定纯色背景明显区分的输入，调用公共 `remove-background-local.mjs` 时必须启用纯色校验、`--edge-profile hard-edge` 和 `--color-separation-verified`。半透明、辉光、柔和阴影、毛发、玻璃和混合边缘不得用颜色阈值去背。`direct-alpha` 只有在工具与对应边缘类型的能力已验证时才可选；必须记录实际工具、版本、支持的边缘类型及能力证据，解码输出 PNG 证明真实透明像素。`mask-composition` 记录原始输入、独立遮罩和输出的路径、SHA、工具、版本、参数及证据。能力不足时报告缺口，再使用独立遮罩/人工创作、重新生成或经明确路线变更批准的 Cocos 特效；不得提高容差、硬抠轮廓、删除光效或伪造透明。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

V3 阶段 B 的唯一生成入口还必须在 PNG 输出目录同步写入唯一 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`。scene contract 的 `layout_decomposition.layout_source.nodes_file` 必须指向这份同批 `layout-nodes.json`；annotation 和 confirmation 的 `layout_nodes_file` 必须与之匹配。审阅页直接消费同批参考图/唯一节点数据，使用同一坐标映射展示当前与父节点关系；其余候选状态、离线约束、名称回退及实际文件规则见[离线布局审阅产物](../../cocos-game-ui-layout/references/layout-review-artifacts.md)。这些 PNG/review/派生展示快照只服务于可读审阅，不能成为第二份布局事实或回写 proposal，也不能替代标准 PNG、F2 机器门或 V5 证据。

## V4 正式资源生产与资源级验收

V4 只完成正式资源生产和资源级验收，不要求正式 Scene 功能代码或组合运行轨迹。验收通过后，V5 直接读取 V3 已确认的布局和 V4 已验收资源，在正式 Cocos Scene 中实现、校准和验收画面。离线 `review.html` 与 V3 目标节点保持只读。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v4-正式资源生产与资源级验收)。

3. 逐资源验证透明边缘、尺寸、采样、锚点、九宫格、帧序、缩放、压缩、Cocos 加载、目标视口和预算；F2 还要分别验证满幅背景资源能力与响应式绑定。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v4-正式资源生产与资源级验收)。

### 图片批量生成

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#图片批量生成)。

## V5 正式还原与动态玩法视觉验收

1. 直接消费 V3 确认的节点关系、初始布局和锚点，以及当前场景或合规 shared 的 V4 `accepted` 资源；通过 Creator MCP 在正式 Cocos Scene 中装配 Node、Component、Prefab、命名父节点、显示层和布局/表现配置。不得手写 `.scene`、`.prefab` 或 `.meta` 绑定，不另写一套定位，也不用整张效果图替代可交互结构。详细边界见[美术生产与接入 Skill](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration--creator-编辑器与-assetdb-边界)。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v5-正式还原与动态玩法视觉验收)。

8. 每个 `cocos-native` region 必须提供 `native_runtime_evidence`：实际 `observed_method`、`observed_delivery_kind`、与冻结参数逐值相同的 `render_contract`、`status=passed`、指向消费报告 JSON 的 `evidence` 和本次实际运行标识。`projectRoot` 可用时须读取该文件并要求 JSON 声明 `report_schema='native-render-consumption/1.0'`、`consumed=true`，且 `region_id/scene_id/state_id` 与当前区域身份一致；`observed_method`、`observed_delivery_kind`、`render_contract` 须与 `native_runtime_evidence` 逐值一致；candidate/target/baseline/diff 摘要不参与验收。文件缺失、不可读、JSON 错误或内容/任务归属不匹配均阻断；SHA 对应的无关 JSON 不能作为消费证明。只提交规划中的原生参数、未证明实际渲染和运行消费，不能通过 V5。

## 完成条件

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#完成条件)。

### 拆解图确认（视觉硬门）

V3 完成拆解图、技术 JSON、component×state、生产合同和合同回对后，通过 `visual-decomposition-confirmation/1.0` 冻结 Stage A proposal；该确认以 `confirmation_mode=manual`、`status=accepted` 绑定实际拆解 annotation/proposal、用户决定记录与 receipt、当前工作项/场景/版本、全部编号和用户原文。随后由 Stage B decision 生成唯一 `layout-nodes.json`，再通过独立 `layout-annotation-confirmation/1.0` 以 `confirmation_mode=manual`、`status=accepted` 绑定最终布局图、review、Stage B decision、唯一 `layout_nodes_file` 和上游身份。scene contract 的 `layout_source.nodes_file` 必须与布局 annotation/confirmation 的 `layout_nodes_file` 完全一致；这些 V3 方案身份变化才需要重新确认。V4 的 fixed asset、component×state 与资源 F2 检查，以及 V5 正式场景的同屏组合、适用逐区域 fidelity 与运行 F2 检查，由当前身份的机器证据核对可确定性事实；overlay/diff 仅在 exact 或明确需求时强制。机器不推导视觉舒适、质感或主题结论；V5 按观看情境交付正式运行画面和持续游玩片段供用户检查。后续候选的正常演进不重开无关方向决定，但实际变化的画面仍按当前阶段复验，机器或人工证据缺失时不得宣称整体视觉通过。

### 原子视觉拆解补充

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#原子视觉拆解补充)。
# 场景级效果图还原门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#场景级效果图还原门)。

### 场景还原硬门与 CLI 回执

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#场景还原硬门与-cli-回执)。

### 全局视觉一致性输入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#全局视觉一致性输入)。

## 本栈配套资料

- [全局视觉控制](./global-visual-control.md)
- [提示词合同](./effect-image-prompt-contract.md)
- [帧动画合同](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation)
- [图片递归补帧规则](../../cocos-domain-contracts/resources/frame-animation/references/image-inbetween.md)
- [正式图片生成后的共享与复用](./asset-production-routes.md#正式图片生成后的共享与复用)
- [完整拆解与视觉显著性](./asset-production-routes.md#完整拆解与视觉显著性)
- [程序还原资格与位图回退](./asset-production-routes.md#程序还原资格与位图回退)
- [文字路线判定](../../cocos-game-ui-layout/references/layout-contract.md#文字路线判定)
- [九宫格适用决策](./nine-slice-ui.md)
- [共享资源规划](./asset-production-routes.md#功能与场景阶段的共享规划)
- [视觉还原](./visual-reconstruction.md)
- [游戏美术体验与质量契约](./art-quality-contract.md)
- [控制模型](../../cocos-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../cocos-domain-contracts/references/state-gates.md)
- [忠实还原模式](./visual-reconstruction.md)
- [Effect-image 生成式位图忠实还原提示词合同](./effect-image-prompt-contract.md)
- [生成式透明能力审计](./transparency-capability-audit.md)
- [控制模型](../../cocos-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#工作流接入)
