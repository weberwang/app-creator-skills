# 视觉与功能还原

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#视觉与功能还原)。

## 忠实还原模式

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#忠实还原模式)。

## V3 拆解确认与生产方案

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v3-拆解确认与生产方案)。

V3 布局标注在拆解图确认之后串行产出：阶段 A 从冻结事实生成按确认顺序排列的拆解 PNG、技术 JSON 和 `decomposition_elements`；用户直接看图确认，若需修改则按编号/区域更新 Stage A proposal、重出 PNG 并重新确认。已确认 proposal 是布局阶段的历史输入。阶段 B 依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果，按同一顺序生成唯一 `automatic-layout-decision/1.0`；未经明确授权不得分析截图，事实不足时标记待定并集中澄清，不得按几何距离猜测。生成器只读取该确认 proposal 与本次 decision，从其推导唯一的 `layout-nodes.json` 并生成布局 PNG 和结果记录；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`，不能读取预存的第二份节点树、按距离猜测对齐、生成新的视觉参考图或提供多个布局候选。scene contract 通过 `layout_decomposition.layout_source.nodes_file` 引用此同批节点文件；`layout_binding`、annotation 和 confirmation 只记录身份/证据，annotation/confirmation 的 `layout_nodes_file` 必须与 source 路径一致。布局图、review 和派生快照是只读展示投影，不是新的手工事实，也不回写 Stage A proposal。只有布局关系变化时更新 Stage B decision 并重生成全部布局产物；分组或父子关系变化时按原规则更新并重新确认 Stage A。用户直接检查最终布局图（需要交互对照时可使用同批审阅页）并独立确认。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v3-拆解确认与生产方案)。

- `visual-decomposition-confirmation/1.0`，由用户确认实际展示的拆解 PNG，关联 Stage A annotation/proposal、对应用户决定记录与 receipt、work item、scene/state、全部编号和用户原文；技术 JSON 仅供后台校验与追溯，不另设文字确认。Stage B 布局另以 `layout-annotation-confirmation/1.0` 绑定用户检查的最终布局 PNG（需要交互对照时可使用同批审阅页）、Stage B layout decision、唯一 `layout_nodes_file` 及上游身份。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v3-拆解确认与生产方案)。

### 来源路线、渲染合同与行为装配

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#来源路线渲染合同与行为装配)。

`visual_route_analysis` 必须依据冻结图中可观察的外观事实，以及当前 Cocos 原生能力能否精确表达这些事实。按钮、面板等语义名称不能决定图片或原生路线；静态/动态属性也不能单独作为原生资格。文本、纯色矩形、基础几何、规则边框、简单规则渐变、遮罩和进度填充，在 Cocos 可确定性表达时可以走原生路线。特色插画、复杂纹饰、不规则轮廓、复杂材质和明显具有美术特征的装饰继续使用独立图片路线。特色视觉拟走原生路线时，必须另有等价性证据并绑定预先声明的容差或精确例外。

每个 `cocos-native` 区域必须冻结 `native_suitability.render_contract`：`renderer`、逻辑像素 `dimensions.width/height`、`colors`、`line_width`、`corner_radius`、`gradient`、`opacity`、`applicable_states` 和 `unsupported_features`。颜色和渐变 stop 的 `color` 均为 `#RRGGBB`；无渐变写 `gradient.type=none` 且 `stops=[]`；线性渐变须冻结 0–360 的 `angle` 及按绘制顺序排列的 stops。参数按冻结参考精确登记。`runtime_implementation.render_contract` 必须镜像原生资格合同并纳入区域定义记录；修改参数会使已有拆解确认失效，不得在行为装配时悄悄更改。Cocos 原生能力不能确定性表达的视觉特征列入 `unsupported_features` 并阻断该路线，禁止以近似绘制代替。

视觉外观来源与行为装配分别记录。一个按钮可由原生框体、独立图标 image-asset 和 Creator `Label` 文字组成；每部分单独记录 owner、状态、生产合同和布局/资源绑定，交互行为再使用显式组件/节点引用接线。不能把不同来源或职责合并成 `composite` region / `composite_parts`，也不能用覆盖整按钮的大区域模糊归属。已冻结 `image_generation_required=true` 的区域必须继续执行图片合同，不得自动换成原生路线；路线变化遵循明确接受的 Change Request。

## 布局与文本拆解

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#布局与文本拆解)。

效果图拆解必须先看整屏构图，再冻结 `decomposition_elements`、视觉元素/组件、状态事实和 `display_layer_planning`；不能先拆资产、最后凭感觉补坐标。proposal 的 `bounds` 是参考图测量事实，不是运行时硬编码；拆解确认后，布局节点由元素 bounds/role 和显式中心策略推导，允许按 strict/reference 策略平移节点或整组位置。父级或定位参照的整体位移沿关系传播到依赖节点，在非 center 轴也保持其相对间距；相关规则见[居中策略与组合定位](../../cocos-game-ui-layout/references/center-alignment.md)。该过程保留 proposal 原 bounds、节点尺寸、身份和顺序。布局合同负责运行时计算和响应式变换；runtime measurement 只是候选证据，不能回写或替代参考事实。

每个 coverage 区域登记唯一 `annotation_number`、`region_id`、owner、实现计划和精确 `bounds`，并以 `layout_node_ids` 建立到唯一 `layout-nodes.json` 的消费索引；这只是区域覆盖映射，不是第二份节点树。每个 placement 必须有唯一 `layout_node_id`，只能引用本区域节点；没有 placement 的运行时区域必须由 `runtime_implementation.layout_node_ids` 消费。节点不得孤立、跨区域、被多个 placement 重复消费或同时被 placement 与 runtime 重复消费，除非另有显式复用合同和 placement 级证据。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#布局与文本拆解)。

父子几何必须可复核：先确定 `parent_layout_node_id`，再冻结 `parent_target_bounds`，测量 child 到父内容框四边的 `relative_position.left/right/top/bottom`。水平 `left/center/right` 与垂直 `top/center/bottom` 依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果写入显式 `axis_alignment`，不能由距离自动反推；未经明确授权不得分析截图，事实不足时标记待定并集中澄清。中心轴的严格/允许偏移策略、组合居中及最终 bounds/offset 派生按[居中策略与组合定位](../../cocos-game-ui-layout/references/center-alignment.md)执行；测量只用于校验与偏移复算，不能把原始中心差自动当作视觉补偿。`offset`、`self_anchor`、`reference_anchor` 必须与该视觉决策一致。

## V4 正式资源验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v4-正式资源验收)。

V5 直接消费 V3 确认的布局目标与 V4 验收的正式资源，在项目正式 Cocos Scene 中实现并校准真实画面；V3 的目标节点和离线审阅页保持只读。具体还原与偏差处置按[正式场景视觉还原与校准](./visual-alignment-authoring.md)执行。

生成式位图区域按 V3 `component_inventory` 收齐全部待生成 component × required state，作为[一个批量生成任务](./visual-production-pipeline.md#图片批量生成)一次提交；每项交付 individual 位图，`atlas_allowed=false`，不能将独立文件要求解释为逐张调度。宽高由逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 决定，`max_dpr=1`，`padding_policy=none`。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 由设备动态读取并封顶为 2，不改变已冻结的资产尺寸；历史 1.5/2 倍生产证据须重生成或标记 `stale`。系统根据提示词、参考输入、主体材质、透明需求和已验证能力选择实际生成工具，并在记录中写入实际工具、版本、输入/输出 SHA、参数和后处理。生成资产的 `expected_assets.alpha=true` 必须冻结透明策略与边缘类型：只对明确硬边且颜色分离通过的素材使用公共纯色去背；直接 Alpha 必须对工具和对应边缘类型完成能力验证，并解码 PNG 证明真实 Alpha；复杂边缘可用独立遮罩/人工创作、重新生成，或按明确变更合同转为 Cocos 特效。半透明、辉光、柔和阴影、毛发、玻璃和混合边缘禁止阈值去背；工具无法可靠交付时报告能力缺口，不提高容差、硬抠轮廓、删除光效或伪造透明。归一化保持 Alpha、比例和主体边界，不能把棋盘格烘焙背景。每条透明路线生成浅底与深底预览，V5 记录主体完整、背景残留、色边和半透明区域的视觉检查。已有真实透明图按资源复用合同接入，不伪造生成或去背记录；`image_generation_required=true` 的冻结合同不能由路线判断或提示词生成器自动替换。

## V5 运行态与动态验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v5-运行态与动态验收)。

## 失败条件

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#失败条件)。

## 常用命令

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#常用命令)。

## 全局基线引用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#全局基线引用)。

## 本栈配套资料

- [全局视觉控制](./global-visual-control.md)
- [游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#资源拆解与界面实现)
- [程序还原资格与位图回退](./asset-production-routes.md#程序还原资格与位图回退)
- [文字路线判定](../../cocos-game-ui-layout/references/layout-contract.md#文字路线判定)
- [《Effect-image 生成式位图忠实还原提示词合同》](./effect-image-prompt-contract.md)
