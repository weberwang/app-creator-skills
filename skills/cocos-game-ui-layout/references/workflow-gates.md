# UI 布局阶段门

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#ui-布局阶段门)。

## 统一门

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#统一门)。

## 阶段映射

## 高分屏与响应式阶段门

- V2：Implementation Package 引用的 project UI layout policy 必须填写 `logicalViewportSpace`、`designResolutionPolicy`、`canvasBackingPolicy`、`runtimeDprPolicy`、`maxRuntimeDpr=2`、`scaleMode`、Camera viewport/zoom/origin、输入坐标、安全区、resize、方向、文字/资源分辨率、targets 与性能预算。effect-image schema 2.0.0 UI 合同只存 `project_policy_file` 路径，不复制这些字段；普通 UI 使用独立 schema 1.2.0 合同。竖屏 1080×1920 按宽、横屏 1920×1080 按高适配，Canvas 填满视口且背景等比 cover；还需说明物理 backing、固定设计视口、弹窗宿主继承、监听清理及显式降级策略。
- V3：机器门确认唯一 `layout-nodes.json` 的节点使用逻辑 CSS 像素，不能依赖物理像素硬编码；schema 2.0.0 UI 合同不内联节点树，scene contract 的 `layout_decomposition.layout_source.nodes_file` 必须与 annotation/confirmation 的 `layout_nodes_file` 一致。按[节点组织规则](./layout-hierarchy.md)核对 Stage A 已确认的父级、容器职责、尺寸与溢出；Stage B decision 派生的布局节点继续保留定位参照、安全区、九点停靠、严格/参考中心、组合成员、`ui_layout` 和 `layout_execution`。按[Widget 定位策略](./widget-layout.md)复算唯一位置驱动器、实际参照与 Widget target、拉伸授权、严格中心零偏移和 `size_driver`；直接参照合成逻辑根 `viewport`/`safe-area` 必须使用 `SHARED`，并统一使用完整视口或整批实际安全区矩形；根跳过仅允许保留根 ID、`is_root_container: true` 与显式空父级同时成立，业务节点不能标记 true 根身份；不得把合成 `root_nodes` 当成 Widget target；位置与尺寸驱动器可以不同，但 `position` 和 `UITransform.contentSize` 各自只能有一个写入者；Creator 原生 Layout 排布子项位置时必须持有 `LAYOUT` 位置权且禁止 Widget 抢写，自定义项目布局器使用 `SHARED` 驱动并可保留 `PARENT` 职责；RAW Sprite 的 `contentSize` 必须保持正式 SpriteFrame 原尺寸；V3 不读取尚不存在的运行矩阵，V5 按实际组件快照检查变换；阻断为 Widget 增加空容器。确认两个人工图像门保持拆解确认和布局确认；Stage A proposal 是历史输入、Stage B decision 是布局生成输入，PNG/审阅页/快照是只读投影。分组或父子变化从 Stage A 原规则重新生成并确认，不把布局事实复制进其他合同。确认 HUD/弹窗与宿主 Scene、Camera/输入合同的关系；确认资源生产 DPR=1 与运行时 DPR 动态封顶 2 分离，资源生产分辨率覆盖 intended scale。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。
- V5：直接使用当前 V3 节点布局和 V4 验收资源实现正式 Scene；提交真实运行证据，记录 `requiredRuntimeEvidence` 全部字段、`designTransform` 主轴比例和可见逻辑区域、raw/effective DPR、CSS/backing 尺寸、Camera、背景完整覆盖、输入命中、resize 轨迹和候选身份。`combination_preacceptance.layout_geometry.component_snapshots` 必须从同一正式 Creator Scene 捕获全部业务节点实际组件，不得复制计划或只报 `passed`；它独立于 `node_measurements` 的几何容差矩阵，`usability` 也不能减少组件快照覆盖。实际 Widget/原生 Layout/共享布局/动画驱动、目标、布局冲突、严格中心和 Sprite RAW 原尺寸必须匹配计划；Widget 计划默认单位变换，若 V5 观测到非单位路径则阻断并回上游改用 `SHARED`。实际严格中心、中心参照和组 union 从 `layout_bounds`、`reference_bounds` 核验，不能仅凭 Widget 对齐 flag；快照覆盖全部节点不要求每个矩形都等于目标 bounds。V5 `widget-runtime.mjs` 还检查普通非背景图片及其祖先的 `node_to_layout` 为单位正交变换；额外缩放或剪切会被拒绝，动画采样也须遵守本约束。该机器检查不证明全部视觉效果。安全区使用本批唯一实际小矩形。资源完成、文字/状态、父尺寸、安全区和 resize 变化通过统一幂等入口重算，且不与其他位置写入者冲突。详细字段见 [Widget 运行快照](./widget-runtime-evidence.md)。默认 usability 覆盖四类代表性视口、DPR 1/1.25 或 1.5/2/大于 2 封顶、连续 resize、DPR 降至 1、同 DPR 再 resize，以及独立 DISPLAY_LAYER 的打开/交互/resize/关闭/宿主恢复；几何测量缺失为 `unverified`。

`FIXED_WIDTH`、`FIXED_HEIGHT` 或 `custom` 的声明都不自动满足填屏约束；实际 Canvas、背景、输入映射和连续 resize 行为必须有运行测量证据，不能单靠模式名称、构建面板、单测或静态截图驱动 V5 PASS。

- V2/V3 处于 `PROPOSAL`、`REVIEW`；V3 固定先生成并人工确认拆解图和技术 JSON，再依据明确设计参数、用户已确认标注或经明确授权的自动截图分析结果生成逐元素双轴对齐决策；未经明确授权不得分析截图，事实不足时标记待定并集中澄清，不得按几何距离猜测。最后由确认 proposal 与该 decision 生成唯一 `layout-nodes.json`、布局 PNG 和生成结果；需要交互对照时通过 `--interactive-review` 生成同批 `review.html`。`layout_source.nodes_file` 引用该节点文件，annotation/confirmation 只绑定身份和人工图像证据。布局决策或布局事实修改后必须重生成并通过独立 `layout-annotation-confirmation/1.0`；缺失视觉决策时不得按距离兜底。PNG/审阅页和派生快照仅为只读投影，不能维护另一棵事实树或回写 proposal。审阅页合同见[离线布局审阅产物](./layout-review-artifacts.md)。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-workflow-gates.md#高分屏与响应式阶段门)。

## 本栈配套资料

- [控制面不可绕过约束](../../app-workflow-control/SKILL.md#不可绕过约束)
- [实际完成情况](../../cocos-domain-contracts/references/control-model.md#按实际完成情况验收)
- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
