# 视觉生产管线

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#视觉生产管线)。

## V0 分流

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v0-分流)。

## V1 功能验证与可选白盒

先实现并验证本批次相关功能；白盒、草图和低保真样片仅按风险需要使用。功能未验证不能进入正式视觉目标确认。

## V2 玩法视觉契约与视觉目标

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-玩法视觉契约与视觉目标)。

7. 场景、整套 UI、视觉系统和可选参考模式必须同时读取并冻结 [`phaser4-game-ui-layout` 的布局合同](../../phaser4-game-ui-layout/references/layout-contract.md)：浏览器 viewport、Canvas、逻辑坐标、safe area 四层关系，FIT/RESIZE/COVER/响应式锚点/断点重排，背景覆盖目标，留白/裁切/拉伸许可，代表性视口与关键状态，以及动态文本、显隐、滚动、触控、resize 和项目支持方向策略，并声明 `visual_validation.mode=usability|exact`（默认 `usability`）。方向覆盖遵循 `orientationPolicy.allowed`：单方向项目在同方向覆盖窄宽尺寸与连续 resize，双方向项目才验证方向切换；`exact` 方向轴只覆盖声明的方向。只有 `exact` 或明确全覆盖需求时才冻结完整视口/状态矩阵。缺少影响可用性的核心关系标记“响应式契约缺失”，阻断当前场景 Work Item 的 V3。
8. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-玩法视觉契约与视觉目标)。

### V2 条件门：视觉目标与决策记录

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v2-条件门视觉目标与决策记录)。

## V3 拆解确认与生产方案

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

功能分组遵守[功能语义分组约束](../../phaser4-game-ui-layout/references/functional-semantic-grouping.md)。阶段 A 确认 `parent_element_id` 和 `semantic_grouping.kind/rationale`，独立位置依赖写入 `ui_layout.position_reference_id`，非根溢出写明 `visual_overflow.reason`。文字与图标可以同属一个功能组件并互相参照，不为定位改挂父级或增加无职责容器。阶段 B 继承实际归属与有效参照，并按明确居中策略派生目标位置；不回写 proposal 原始测量。结构、参照或理由变化时重新确认受影响拆解，机器不按距离或包含关系猜父级。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

`docs/visual-assets.json` 使用 schema 1.5。普通资产声明 `not-applicable`；效果图还原进入正式生产前声明 `effect-image/v3-ready`，此时冻结目标、合同回对、coverage、拆解图确认和生产方案必需，而 fidelity case 可为空。coverage 必须逐冻结 scene/state 声明目标画布、画布内 region 和完整性摘要，覆盖率为 1、未覆盖列表为空、状态通过且绑定证据；不能用单个微小区域冒充全覆盖。每个固定视觉 region 还要有稳定编号、实现分类和七个生产合同字段；`production_method` 使用 `image-generation`、`authored-raster`、`authored-svg`、`phaser-graphics`、`runtime-program`、`reuse`，`delivery_kind` 使用 `raster-image`、`vector-image`、`runtime-drawing`、`runtime-program`、`existing-asset`。实现分类为 `generate-now`、`reuse-existing`、`runtime-program`，并在冻结效果图标注图中同时呈现。

拆解提案固定按“冻结视觉事实 → 选择视觉来源路线 → 独立验证场景装配”执行。`visual_route_analysis` 只决定图片资产或 Phaser 原生路线；`assembly_analysis` 只声明原子 Scene 装配、禁止整屏捕获并明确允许独立图片资产。路线判定先把文本委托给 `text_decomposition`，其余区域依据冻结图中的可观察外观事实和 Phaser 实际渲染能力决定。静态纯色矩形、基础几何、规则边框、简单规则渐变、遮罩和进度填充，在 Phaser 能确定性表达冻结外观时可选择 `phaser-native`；特色插画、复杂纹饰、不规则轮廓、复杂材质及明显具有美术特征的装饰继续选择独立图片路线。元素语义名称及 `dynamic_requirements.is_dynamic` 单独都不能决定路线；非文本原生资格须有可审计事实和完整 `render_contract`。任何生成步骤都不得从“不能整屏贴图”推导“所有视觉必须程序绘制”。若同一按钮等组件含多种视觉来源，分别建立区域：例如原生框体、独立图标图片和 Phaser.Text 文字各自登记 owner、生产合同及布局/资源节点绑定；交互行为用明确组件/节点引用装配，不以 `composite` 汇总。禁止单一 `composite` region 或 `composite_parts` 闭环生产/验收；检测到职责或来源混合时必须回 V2/PROPOSAL 按可观察边界重拆。如果全部 coverage 都选择 `phaser-native`，必须附带绑定当前目标文件、完整 region 集合和独立 JSON 工件 的 `all_native_justification`；文件门会读取实际文件并逐区核对资格事实，否则停在 V2/PROPOSAL。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

生成式位图的源文件、运行时文件和实际输出仅允许 `image/png` 或 `image/jpeg` 以及 `.png`、`.jpg`、`.jpeg` 后缀；通用 authored-raster 可使用其他位图格式。生成资产 `expected_assets.alpha=true` 时，Schema 必须冻结 `transparency_requirements.strategy` 与 `edge_profile`，并在记录中绑定 `edge_evidence`。`background-removal` 只允许用于 `hard-edge` 且主体与指定纯色背景明显区分的输入，调用公共 `remove-background-local.mjs` 时必须启用纯色校验、`--edge-profile hard-edge` 和 `--color-separation-verified`。半透明、辉光、柔和阴影、毛发、玻璃和混合边缘不得用颜色阈值去背。`direct-alpha` 只有在工具与对应边缘类型的能力已验证时才可选；必须记录实际工具、版本、支持的边缘类型及能力证据，解码输出 PNG 证明真实透明像素。`mask-composition` 记录原始输入、独立遮罩和输出的路径、SHA、工具、版本、参数及证据。能力不足时报告缺口，再使用独立遮罩/人工创作、重新生成或经明确路线变更批准的 Phaser 特效；不得提高容差、硬抠轮廓、删除光效或伪造透明。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v3-拆解确认与生产方案)。

## V4 正式资源生产与资源级验收

V4 只完成正式资源生产和资源级验收，不要求正式 Scene 功能代码或组合运行轨迹。验收通过后，V5 直接读取 V3 已确认的布局和 V4 已验收资源，在正式 Phaser Scene 中实现、校准和验收画面。离线 `review.html` 与 V3 目标节点保持只读。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v4-正式资源生产与资源级验收)。

3. 逐资源验证透明边缘、尺寸、采样、锚点、九宫格、帧序、缩放、压缩、Phaser 加载、目标视口和预算；F2 还要分别验证满幅背景资源能力与响应式绑定。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v4-正式资源生产与资源级验收)。

### 图片批量生成

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#图片批量生成)。

## V5 正式还原与动态玩法视觉验收

1. 直接消费 V3 确认的节点关系、初始布局和锚点，以及当前场景或合规 shared 的 V4 `accepted` 资源；在正式 Phaser Scene 中装配为独立 GameObject、命名容器、图层和布局/表现配置。不得另写一套定位或用整张效果图替代可交互结构。
2. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/gameplay-implementation.md#玩法与美术职责)。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#v5-正式还原与动态玩法视觉验收)。

8. 每个 `phaser-native` region 必须提供 `native_runtime_evidence`：实际 `observed_method`、`observed_delivery_kind`、与冻结参数逐值相同的 `render_contract`、`status=passed`、指向消费报告 JSON 的 `evidence` 和本次实际运行标识。`projectRoot` 可用时须读取该文件并要求 JSON 声明 `report_schema='native-render-consumption/1.0'`、`consumed=true`，且 `region_id/scene_id/state_id` 与当前区域身份一致；`observed_method`、`observed_delivery_kind`、`render_contract` 须与 `native_runtime_evidence` 逐值一致；candidate/target/baseline/diff 摘要不参与验收。文件缺失、不可读、JSON 错误或内容/任务归属不匹配均阻断；SHA 对应的无关 JSON 不能作为消费证明。只提交规划中的原生参数、未证明实际渲染和运行消费，不能通过 V5。

## 完成条件

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#完成条件)。

### 拆解图确认（视觉硬门）

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md#拆解图确认视觉硬门)。

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
- [帧动画合同](../../app-stack-phaser/references/native-contracts.md#mode-phaser4-frame-animation)
- [图片递归补帧规则](../../phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md)
- [正式图片生成后的共享与复用](./asset-production-routes.md#正式图片生成后的共享与复用)
- [离线布局审阅产物](../../phaser4-game-ui-layout/references/layout-review-artifacts.md)
- [完整拆解与视觉显著性](./asset-production-routes.md#完整拆解与视觉显著性)
- [程序还原资格与位图回退](./asset-production-routes.md#程序还原资格与位图回退)
- [文字路线判定](../../phaser4-game-ui-layout/references/layout-contract.md#文字路线判定)
- [UI 布局合同](../../phaser4-game-ui-layout/references/layout-contract.md#v3-串行拆解与布局标注)
- [九宫格适用决策](./nine-slice-ui.md)
- [共享资源规划](./asset-production-routes.md#功能与场景阶段的共享规划)
- [视觉还原](./visual-reconstruction.md)
- [游戏美术体验与质量契约](./art-quality-contract.md)
- [控制模型](../../phaser-domain-contracts/references/control-model.md)
- [状态、阶段与停止门](../../phaser-domain-contracts/references/state-gates.md)
- [忠实还原模式](./visual-reconstruction.md)
- [Effect-image 生成式位图忠实还原提示词合同](./effect-image-prompt-contract.md)
- [生成式透明能力审计](./transparency-capability-audit.md)
- [控制模型](../../phaser-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏内文案](../../phaser4-game-ui-layout/references/game-copy.md#工作流接入)
