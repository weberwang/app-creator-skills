# 离线布局审阅产物

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#离线布局审阅产物)。

## 生成目录与产物

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

| 文件 | 用途与最低内容 |
| --- | --- |
| `layout.png` | `layout-annotation/png/1` 标准布局标注图，继续作为机器验收和可下载的静态证据；在冻结参考图上叠加父子框、编号和右栏说明。 |
| `layout-nodes.json` | 本批实际节点快照，按已确认 `decomposition_elements` 原顺序保存真实父级、独立定位参照、目标 bounds、对齐、中心策略、偏移、锚点、层级和中文显示名；审阅页直接消费它。 |
| `layout-decision.json` | 本批实际消费的 `automatic-layout-decision/1.0` 决策字节及其 ID；不能让页面或节点快照另行推导对齐结果。 |
| `review.html`（仅交互对照时生成） | 通用、自包含、可直接用本地浏览器打开的审阅页；嵌入本批冻结参考图和节点数据，并提供基于内嵌 data URL/原始字节的产物入口。 |
| `generation-result.json` | 记录 `layout.png`、两份布局 JSON 及按需生成的 `review.html` 的相对路径、真实文件 SHA，以及上游绑定摘要；自身 SHA 只由 stdout 返回，避免自引用。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

## 审阅页模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

- 节点选择分别高亮当前节点、真实父级和定位参照，并用独立图例说明颜色。节点卡片展示真实父级、定位参照、水平左/中/右对齐、垂直上/中/下对齐、中心策略、双轴偏移、位置和尺寸。根节点明确显示“无上级”。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

## 数据和安全边界

审阅页不建立坐标、父子关系、对齐规则或名称数据的副本。它只读取同批 `layout-nodes.json` 和生成结果绑定的冻结参考图；布局节点的 `target_bounds`、`parent_target_bounds`、`relative_position`、`axis_alignment`、`self_anchor`、`reference_anchor` 和 `offset` 是唯一事实来源。布局 PNG 仍由确定性渲染器生成并接受现有的 PNG 魔数、尺寸、metadata、节点、编号和像素检查。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

- 每个节点的真实父级与定位参照必须存在，允许的根只能是 `viewport` 或 `safe-area`；父级边与参照边联合后不能自引用、成环或跨 scene/state。使用安全区时必须由 proposal 绑定的决策提供同批实际唯一矩形；viewport 始终保留完整画布 bounds。父框越界例外必须有 `visual_overflow.reason`，但节点仍必须位于稳定根边界内。
- 确认门必须从实际绑定 proposal 与 layout-decision 重新推导目标 bounds、中心策略和父/参照几何，再核对 HTML、JSON 和 PNG；不能信任这些产物自报的 bounds 或生成节点。还须核对功能分组、真实父级与定位参照；三种产物彼此一致不能替代对上游事实的重算。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

## 身份绑定与独立确认

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#身份绑定与独立确认)。

| 身份 | 必须绑定 |
| --- | --- |
| 上游参考与拆解 | 冻结参考图/`target_sha256`、`scene_id`、`state_id`、拆解确认 ID、实际 proposal 文件；页面不能显示一个参考图而绑定另一张图。 |
| 布局决策 | `layout_decision_file`、`layout_decision_id`；`layout_decision_sha256` 可省略；决策逐元素覆盖 proposal 确认元素，并是重算节点对齐、center_alignment 与实际 safe-area bounds 的唯一来源。 |
| 标准标注图 | `layout_annotation_file`、`layout_annotation_sha256`、尺寸、metadata SHA 和 `layout_annotation_identity_sha256`。 |
| 节点快照 | `layout_nodes_file`；页面和下载必须指向本批实际节点内容，`layout_nodes_sha256` 可省略。 |
| 审阅页（按需） | 提供交互审阅页时绑定并核验 `layout_review_file` 及其关联的参考、决策、节点和 PNG；`layout_review_sha256`、`layout_review_identity_sha256` 可作为可选摘要记录。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#身份绑定与独立确认)。

## 可复现调用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。

```text
node skills/threejs-game-asset-integration/scripts/generate_layout_annotation.mjs docs/visual-assets.json --project-root . --scene-id <scene-id> --state-id <state-id> --output .workflow-control/evidence/<work-item-id>/<layout-version>/layout.png --decomposition-confirmation-id <confirmation-id> --decomposition-confirmation-sha256 sha256:<64-lowercase-hex> --proposal-sha256 sha256:<64-lowercase-hex> --layout-decision-file <decision-source.json> --layout-decision-sha256 sha256:<64-lowercase-hex>
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。

## 本栈配套资料

- [功能语义分组约束](./functional-semantic-grouping.md)
- [正式场景视觉还原与校准](../../threejs-game-asset-integration/references/visual-alignment-authoring.md)
