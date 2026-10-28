# 离线布局审阅产物

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#离线布局审阅产物)。

## 生成目录与产物

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

| 文件 | 用途与最低内容 |
| --- | --- |
| `layout.png` | `layout-annotation/png/1` 标准布局标注图，继续作为机器验收和可下载的静态证据；在冻结参考图上叠加父子框、编号和右栏说明。 |
| `layout-nodes.json` | 本批实际节点快照，按已确认 `decomposition_elements` 原顺序保存父子关系、坐标、尺寸、对齐、偏移、锚点、层级和中文显示名；审阅页直接消费它。 |
| `layout-decision.json` | 本批实际消费的 `automatic-layout-decision/1.0` 决策字节及其 ID；不能让页面或节点快照另行推导对齐结果。 |
| `review.html`（仅交互对照时生成） | 通用、自包含、可直接用本地浏览器打开的审阅页；嵌入本批冻结参考图和节点数据，并提供基于内嵌 data URL/原始字节的产物入口。 |
| `generation-result.json` | 记录 `layout.png`、两份布局 JSON 及按需生成的 `review.html` 的相对路径、真实文件 SHA，以及上游绑定摘要；自身 SHA 只由 stdout 返回，避免自引用。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

## 审阅页模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

- 节点选择显示当前节点、真实父级与有效定位参照，父级和参照不同时分别标识；卡片展示功能归属、参照、双轴对齐、偏移、位置、尺寸与溢出理由。根节点明确显示“无上级”，不得将同级定位参照误标为父级。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

## 数据和安全边界

审阅页不建立坐标、父子关系、对齐规则或名称数据的副本。它只读取同批节点和冻结参考图；`target_bounds`、父框、参照框、相对距离、对齐、锚点及偏移是唯一事实来源。布局 PNG 继续由确定性渲染器生成，机器检查格式、尺寸、元数据、节点与编号一致性；这些检查不代替人工检查图片显示效果。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

- 每个节点的父级与有效参照必须存在且上下文一致，允许的根只有 `viewport`/`safe-area`；父边与参照边合并后不能成环。父框、参照框、相对距离、显式溢出、viewport 与安全区边界分别校验。
- 必须读取已绑定 proposal 的实际拆解元素，核对功能分组及父级继承；仅让 HTML、JSON 和 PNG 互相一致不够，因为三者可能共同使用了错误分组。`semantic_grouping` 的类别、理由或父级漂移不得复用旧拆解确认，缺失归属不能用最小包含容器补齐。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

## 身份绑定与独立确认

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#身份绑定与独立确认)。

## 可复现调用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。

```text
node skills/phaser4-game-asset-integration/scripts/generate_layout_annotation.mjs docs/visual-assets.json --project-root . --scene-id <scene-id> --state-id <state-id> --output .workflow-control/evidence/<work-item-id>/<layout-version>/layout.png --decomposition-confirmation-id <confirmation-id> --decomposition-confirmation-sha256 sha256:<64-lowercase-hex> --proposal-sha256 sha256:<64-lowercase-hex> --layout-decision-file <decision-source.json> --layout-decision-sha256 sha256:<64-lowercase-hex>
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。

## 本栈配套资料

- [功能语义分组约束](./functional-semantic-grouping.md)
- [正式场景视觉还原与校准](../../phaser4-game-asset-integration/references/visual-alignment-authoring.md)
