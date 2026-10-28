# 视觉与功能还原

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#视觉与功能还原)。

## 忠实还原模式

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#忠实还原模式)。

## V3 拆解确认与生产方案

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v3-拆解确认与生产方案)。

### 来源路线、渲染合同与行为装配

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#来源路线渲染合同与行为装配)。

`visual_route_analysis` 必须依据冻结图中可观察的外观事实，以及当前 ThreeJS 原生能力能否精确表达这些事实。按钮、面板等语义名称不能决定图片或原生路线；静态/动态属性也不能单独作为原生资格。文本、纯色矩形、基础几何、规则边框、简单规则渐变、遮罩和进度填充，在 ThreeJS 可确定性表达时可以走原生路线。特色插画、复杂纹饰、不规则轮廓、复杂材质和明显具有美术特征的装饰继续使用独立图片路线。特色视觉拟走原生路线时，必须另有等价性证据并绑定预先声明的容差或精确例外。

每个 `threejs-native` 区域必须冻结 `native_suitability.render_contract`：`renderer`、逻辑像素 `dimensions.width/height`、`colors`、`line_width`、`corner_radius`、`gradient`、`opacity`、`applicable_states` 和 `unsupported_features`。颜色和渐变 stop 的 `color` 均为 `#RRGGBB`；无渐变写 `gradient.type=none` 且 `stops=[]`；线性渐变须冻结 0–360 的 `angle` 及按绘制顺序排列的 stops。参数按冻结参考精确登记。`runtime_implementation.render_contract` 必须镜像原生资格合同并纳入区域定义记录；修改参数会使已有拆解确认失效，不得在行为装配时悄悄更改。ThreeJS 原生能力不能确定性表达的视觉特征列入 `unsupported_features` 并阻断该路线，禁止以近似绘制代替。

视觉外观来源与行为装配分别记录。一个按钮可由原生框体、独立图标 image-asset 和 DOM/CSS2D 文字组成；每部分单独记录 owner、状态、生产合同和布局/资源绑定，交互行为再使用显式组件/节点引用接线。不能把不同来源或职责合并成 `composite` region / `composite_parts`，也不能用覆盖整按钮的大区域模糊归属。已冻结 `image_generation_required=true` 的区域必须继续执行图片合同，不得自动换成原生路线；路线变化遵循明确接受的 Change Request。

## 布局与文本拆解

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#布局与文本拆解)。

## V4 正式资源验收

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md#v4-正式资源验收)。

V5 直接消费 V3 确认的布局目标与 V4 验收的正式资源，在项目正式 ThreeJS Scene 中实现并校准真实画面；V3 的目标节点和离线审阅页保持只读。具体还原与偏差处置按[正式场景视觉还原与校准](./visual-alignment-authoring.md)执行。

生成式位图区域按 V3 `component_inventory` 收齐全部待生成 component × required state，作为[一个批量生成任务](./visual-production-pipeline.md#图片批量生成)一次提交；每项交付 individual 位图，`atlas_allowed=false`，不能将独立文件要求解释为逐张调度。宽高由逻辑像素 `ceil(max placement width/height × intended_scale_range.max)` 决定，`max_dpr=1`，`padding_policy=none`。这里的 1 表示图片按最大约定逻辑显示尺寸 1:1 生产；运行时实际 DPR 由设备动态读取并封顶为 2，不改变已冻结的资产尺寸；历史 1.5/2 倍生产证据须重生成或标记 `stale`。系统根据提示词、参考输入、主体材质、透明需求和已验证能力选择实际生成工具，并在记录中写入实际工具、版本、输入/输出 SHA、参数和后处理。生成资产的 `expected_assets.alpha=true` 必须冻结透明策略与边缘类型：只对明确硬边且颜色分离通过的素材使用公共纯色去背；直接 Alpha 必须对工具和对应边缘类型完成能力验证，并解码 PNG 证明真实 Alpha；复杂边缘可用独立遮罩/人工创作、重新生成，或按明确变更合同转为 ThreeJS 特效。半透明、辉光、柔和阴影、毛发、玻璃和混合边缘禁止阈值去背；工具无法可靠交付时报告能力缺口，不提高容差、硬抠轮廓、删除光效或伪造透明。归一化保持 Alpha、比例和主体边界，不能把棋盘格烘焙背景。每条透明路线生成浅底与深底预览，V5 记录主体完整、背景残留、色边和半透明区域的视觉检查。已有真实透明图按资源复用合同接入，不伪造生成或去背记录；`image_generation_required=true` 的冻结合同不能由路线判断或提示词生成器自动替换。

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
- [游戏内文案](../../threejs-game-ui-layout/references/game-copy.md#资源拆解与界面实现)
- [程序还原资格与位图回退](./asset-production-routes.md#程序还原资格与位图回退)
- [文字路线判定](../../threejs-game-ui-layout/references/layout-contract.md#文字路线判定)
- [《Effect-image 生成式位图忠实还原提示词合同》](./effect-image-prompt-contract.md)
