# 离线布局审阅产物

本参考定义布局生成器的通用审阅页和同批产物。它服务于 V3 的“拆解图确认 → 内部生成显式布局决策 → 布局图（需要交互对照时生成审阅页） → 独立布局图确认”顺序，不创建新的阶段、Work Item、审批账本或业务状态。每批唯一 `layout-nodes.json` 是分组、父子、定位参照和布局策略的事实源，scene contract 的 `layout_decomposition.layout_source.nodes_file`、annotation 与 confirmation 的 `layout_nodes_file` 必须指向同一实际文件。用户直接查看 PNG（需要交互对照时可使用同批 `review.html`） 并确认图片；`layout-decision.json`、节点数据和其他技术记录由代理维护，不要求先行阅读或文字确认。PNG、review 与派生快照只是只读展示投影，不能另建或修改事实，也不回写 Stage A proposal。布局图中的 bounds、父子关系和对齐用于保证 V3 方案内部一致性，不自动升级运行态的像素验收。运行态默认使用 `visual_validation.mode=usability`，允许合理的位置、尺寸和换行偏差；只有明确的 `exact` 需求才启用严格视觉差异门。需要实现或校验离线审阅页时读取本文件；字段的全局状态语义仍以控制面 Schema 为准。

## 生成目录与产物

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

| 文件 | 用途与最低内容 |
| --- | --- |
| `layout.png` | `layout-annotation/png/1` 标准布局标注图，继续作为机器验收和可下载的静态证据；在冻结参考图上叠加父子框、编号和右栏说明。 |
| `layout-nodes.json` | 本批唯一 V3 布局事实文件，按已确认 `decomposition_elements` 原顺序保存元素/渲染身份、功能父级、有效定位参照、几何关系、九点停靠、适用时的规范化 `center_alignment`（含整体居中成员）、RAW/九宫格尺寸意图及其派生 `layout_execution`；文件 `doc.viewport` 定义所有节点共用的唯一逻辑坐标空间。coverage 的 `region_id` 与 `layout_node_ids` 仅建立区域消费索引；scene contract 通过 `layout_source.nodes_file` 直接引用节点文件，不另存第二份布局树。 |
| `layout-decision.json` | Stage B 本批实际消费的 `automatic-layout-decision/1.0` 决策字节及其 ID；这是生成唯一节点文件的输入，不能让页面或节点快照另行推导对齐结果。 |
| `review.html`（仅交互对照时生成） | 通用、自包含、可直接用本地浏览器打开的审阅页；嵌入本批冻结参考图和节点数据，并提供基于内嵌 data URL/原始字节的产物入口。 |
| `generation-result.json` | 记录 `layout.png`、两份布局 JSON 及按需生成的 `review.html` 的相对路径、真实文件 SHA，以及上游绑定摘要；自身 SHA 只由 stdout 返回，避免自引用。 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#生成目录与产物)。

## 审阅页模板

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

本页保持不可编辑，供用户直观看 V3 布局 PNG、节点关系和页面内容，并据此确认布局图；完整技术节点与决策数据保留在可展开详情中供需要时查看，不构成独立文字确认门。`independent_container_reason` 的机器检查只验证字段位置和非空字符串，不声称已证明容器职责真实；人工可在本页检查理由及对应结构。V5 正式场景直接消费 V3 确认的布局目标和 V4 验收的资源；场景实现中的校准按[正式场景视觉还原与校准](../../cocos-game-asset-integration/references/visual-alignment-authoring.md)执行。不得在此页临时改框再把页面状态冒充已确认数据。

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

- 节点选择同时显示当前节点、实际父节点和定位参照，当前节点与上下文节点使用不同颜色；图例明确说明颜色含义。节点卡片分别展示功能父级和位置参照、水平左/中/右与垂直上/中/下组成的九点停靠、strict/reference 中心策略、组合成员、双轴偏移、位置、尺寸及明确的溢出原因。中心策略的 schema 和计算见[居中策略与组合定位](./center-alignment.md)。另行展示图片渲染类型、Sprite 尺寸模式、`component_id`/`placement_id` 图片身份；底板 Sprite 兼任容器时只列一个节点。额外纯结构容器的 `independent_container_reason` 在卡片详情中可读。省略独立参照时，位置参照显示为实际父级；根节点明确显示“无上级”。九点停靠表示位置锚点关系，不表示纹理九宫格拉伸。
- 节点卡片还应直接展示确认过的功能分组类别与理由，便于检查部件是否属于对应功能组件；不能仅在大区域里列出全部图标和文字就视为完成分组。底板同时作为组件根时展示 `element_type=container` 与 `render_kind=sprite` 及其图片身份；纯结构容器不伪造图片尺寸计划。语义定义见[功能语义分组约束](./functional-semantic-grouping.md)，页面不自行推测或修改归属。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#审阅页模板)。

参考图、唯一节点 JSON 和页面脚本都内嵌在 HTML 中，页面不得引用 CDN、远程字体、网络资源、开发服务器、游戏运行环境或外部 JavaScript。下载入口直接导出内嵌 data URL/原始字节中的本次生成 JSON；不能把页面运行时重新序列化的派生对象冒充 `layout-nodes.json` 或 `layout-decision.json`。对图片及 JSON 的 `data:` 内容、链接和显示摘要应由模板安全生成。

## 数据和安全边界

审阅页不建立坐标、父子关系、定位参照、对齐规则或名称数据的副本。它只读取同批唯一 `layout-nodes.json` 和生成结果绑定的冻结参考图；scene contract 的 `layout_source.nodes_file`、布局 annotation 与 confirmation 的 `layout_nodes_file` 必须落到此文件。节点几何、对齐与 RAW/九宫格/执行结果都以该文件为准，`doc.viewport` 是全批逻辑坐标空间的唯一声明。布局 PNG 仍由确定性渲染器生成并接受现有的 PNG 魔数、尺寸、metadata、节点、编号和像素检查；它与 review 均不能回写 proposal 或充当第二份手工布局事实。

`root_nodes.viewport` 是完整逻辑视口；`root_nodes.safe-area` 必须是本批实际读取的安全区小矩形。所有以 `safe-area` 为父级或参照的节点，快照矩形必须和根记录逐字段一致，审阅页只展示该矩形，不从缺失字段退回全屏。根记录必须使用保留 ID、`is_root_container: true` 和显式 `parent_layout_node_id: null`；业务 `layout_nodes` 不得占用根 ID 或标记 `is_root_container: true`，输出快照中的 `false` 不构成根身份。根记录是合成几何，不能据此声称存在同名 Creator Node 或 Widget target。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

- 每个实际父级和有效定位参照都必须存在于同一 scene/state；坐标空间统一由 `layout-nodes.json.doc.viewport` 定义。父边和参照边不能自引用，合并后的关系图不得成环；父框、参照目标框、相对父框的四边距离和 viewport 边界必须逐项校验。`safe-area` 根快照必须绑定本批实际安全区，所有引用该根的父框/参照框必须逐字段相同。只有明确的 `ui_layout.visual_overflow.reason` 才允许子项超出非根父框，并且不扩展父框，也不豁免 viewport、安全区、裁切与交互约束。
- 必须读取已绑定 proposal 的实际拆解元素，核对功能分组、实际父级、定位参照及其继承；仅让 HTML、JSON 和 PNG 互相一致不够，因为三者可能共同使用了错误关系。`semantic_grouping` 的类别、理由、父级或参照漂移不得复用旧拆解确认，缺失归属不得用最小包含容器补齐，也不得为类型/几何包含增加包装层。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#数据和安全边界)。

## 身份绑定与独立确认

布局生成结果、V3 场景根计划、布局合同和 `layout-annotation-confirmation/1.0` 共同保存以下同批身份。字段名以机器 Schema 为准，实际路径须指向可读取文件，SHA 仅作可选记录。节点元素/渲染类型、图片资产身份、独立容器理由和九点停靠决策属于本批布局事实；它们随对应节点 JSON、PNG metadata 和拆解确认身份绑定。额外纯结构容器若包裹可用底板与内容，机器只验证 `ui_layout.independent_container_reason` 是适用位置上的非空说明，不以该字符串代替人工对职责的判断。已有确认的元素/关系不因新默认策略自动删除或改写，确需调整时沿原确认流程更新受影响工件：

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#身份绑定与独立确认)。

## 可复现调用

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。

```text
node skills/cocos-game-asset-integration/scripts/generate_layout_annotation.mjs docs/visual-assets.json --project-root . --scene-id <scene-id> --state-id <state-id> --output .workflow-control/evidence/<work-item-id>/<layout-version>/layout.png --decomposition-confirmation-id <confirmation-id> --decomposition-confirmation-sha256 sha256:<64-lowercase-hex> --proposal-sha256 sha256:<64-lowercase-hex> --layout-decision-file <decision-source.json> --layout-decision-sha256 sha256:<64-lowercase-hex>
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md#可复现调用)。
