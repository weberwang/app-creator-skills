/** 收敛审阅展示方式；只替换已审阅的视觉布局和动画文案，保留原生事实与确认链。 */

// 每条替换均对应仓库中已审阅的具体说法，不修改普通网页、框架文档或 API 链接。
const RULES = [
  ['在同一批同步写入以下五份产物：', '在同一批同步写入布局 PNG、节点 JSON、决策 JSON 和生成结果；仅需要交互对照时生成同批审阅页。'],
  ['同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json`、离线 `review.html` 和 `generation-result.json`', '同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`，需要交互对照时通过 `--interactive-review` 生成同批离线 `review.html`'],
  ['布局 PNG 和 `review.html`，直接请用户检查最终布局图/预览并确认', '布局 PNG，直接请用户检查并确认；需要交互对照时使用 `--interactive-review` 生成并检查同批 `review.html`'],
  ['布局 PNG 与 `review.html`；scene contract', '布局 PNG；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`。scene contract'],
  ['布局 PNG、`review.html` 和结果记录', '布局 PNG 和结果记录；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`'],
  ['布局标注 PNG 与审阅页供视觉确认', '布局标注 PNG 供视觉确认；需要交互对照时使用 `--interactive-review` 生成同批审阅页'],
  ['独立布局标注图及 `review.html`，不能', '独立布局标注图；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`。不能'],
  ['独立布局标注 PNG 与 `review.html`，不能', '独立布局标注 PNG；需要交互对照时使用 `--interactive-review` 生成同批 `review.html`。不能'],
  ['独立布局图/审阅页 →', '独立布局图（按需生成交互审阅页） →'],
  ['布局图及审阅页 →', '布局图（需要交互对照时生成审阅页） →'],
  ['布局 PNG/`review.html`', '布局 PNG（需要交互对照时可使用同批 `review.html`）'],
  ['布局 PNG/审阅页', '布局 PNG（需要交互对照时可使用同批审阅页）'],
  ['布局图/审阅页', '布局图（需要交互对照时可使用同批审阅页）'],
  ['PNG/`review.html`', 'PNG（需要交互对照时可使用同批 `review.html`）'],
  ['用户直接检查布局 PNG 与 `review.html`', '用户默认直接检查布局 PNG，需要交互对照时检查同批 `review.html`'],
  ['`layout-nodes.json`、`layout-decision.json`、自包含 `review.html` 和 `generation-result.json`', '`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`'],
  ['唯一 `layout-nodes.json`、`layout-decision.json`、自包含 `review.html` 和 `generation-result.json`', '唯一 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`'],
  ['布局标注 PNG、节点 JSON、决策 JSON、离线 `review.html` 和生成结果', '布局标注 PNG、节点 JSON、决策 JSON 和生成结果；需要交互对照时通过 `--interactive-review` 生成同批离线 `review.html`'],
  ['唯一 `layout-nodes.json`、布局 PNG、`review.html` 和生成结果', '唯一 `layout-nodes.json`、布局 PNG 和生成结果；需要交互对照时通过 `--interactive-review` 生成同批 `review.html`'],
  ['同批标准 PNG、节点 JSON、决策 JSON、离线 `review.html` 和生成结果 JSON；页面', '同批标准 PNG、节点 JSON、决策 JSON 和生成结果 JSON；需要交互对照时通过 `--interactive-review` 生成的页面'],
  ['标准布局 PNG、`layout-nodes.json`、`layout-decision.json`、自包含 `review.html` 和 `generation-result.json`', '标准布局 PNG、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 生成同批自包含 `review.html`'],
  ['`layout.png`、`layout-nodes.json`、`layout-decision.json`、`review.html` 和 `generation-result.json`', '`layout.png`、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 生成同批 `review.html`'],
  ['`layout.png`、唯一 `layout-nodes.json`、`layout-decision.json`、`review.html` 和 `generation-result.json`', '`layout.png`、唯一 `layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 生成同批 `review.html`'],
  ['`layout.png`、`layout-nodes.json`、`layout-decision.json`、离线 `review.html`、`generation-result.json`', '`layout.png`、`layout-nodes.json`、`layout-decision.json`、`generation-result.json`，需要交互对照时另生成离线 `review.html`'],
  ['同批 `layout.png`、`layout-nodes.json`、`layout-decision.json`、`review.html` 与 `generation-result.json`', '同批 `layout.png`、`layout-nodes.json`、`layout-decision.json` 与 `generation-result.json`，如按需生成 `review.html` 也须保留'],
  ['同批布局 PNG、节点 JSON、决策 JSON、`review.html` 与 `generation-result.json`', '同批布局 PNG、节点 JSON、决策 JSON 与 `generation-result.json`，如按需生成 `review.html` 也须保留'],
  ['布局 PNG、节点 JSON、决策 JSON、`review.html` 与生成记录等同批依赖', '布局 PNG、节点 JSON、决策 JSON、生成记录以及按需生成的 `review.html` 等同批依赖'],
  ['布局图、节点 JSON、决策 JSON、审阅页与生成记录等同批依赖', '布局图、节点 JSON、决策 JSON、生成记录以及按需生成的审阅页等同批依赖'],
  ['`review.html`、节点 JSON、决策 JSON、布局 PNG 和冻结参考图都必须存在且可读取；任何路径越界或必要文件缺失都使本批失败，SHA 变化不影响验收。页面模板的布局标识、内嵌数据和下载字节也应由校验器核对。', '节点 JSON、决策 JSON、布局 PNG 和冻结参考图都必须存在且可读取；任何路径越界或必要文件缺失都使本批失败，SHA 变化不影响验收。仅需交互对照时使用 `--interactive-review` 生成 `review.html`；如提供审阅页，校验器还须核对页面实际文件、业务绑定、布局标识、内嵌数据和下载字节。'],
  ['上述字段必须同时进入独立布局 confirmation、decision record 和 user decision receipt，并在三份记录中逐字段一致。人工确认针对用户实际看到的 `review.html` 与同批布局 PNG 产生', '必要字段必须同时进入独立布局 confirmation、decision record 和 user decision receipt，并在三份记录中逐字段一致；仅实际提供审阅页时才绑定并核验 `layout_review_file`。人工确认默认针对用户实际看到的布局 PNG 产生；提供交互审阅页时同时核验其与同批 PNG 的关系'],
  ['必须绑定 `layout_review_file`、`layout_nodes_file` 及业务标识 以及原有布局和上游身份字段', '必须绑定 `layout_nodes_file`、业务标识以及原有布局和上游身份字段；仅提供交互审阅页时绑定并核验 `layout_review_file`'],
  ['统一使用 `layout_review_file`、`layout_nodes_file`', '统一使用 `layout_nodes_file`（仅提供交互审阅页时还须统一绑定并核验 `layout_review_file`）'],
  ['并把 `layout_review_file`、`layout_nodes_file` 与', '并把 `layout_nodes_file` 与'],
  ['关联同批参考、拆解、决策、节点、PNG 和实际审阅页', '关联同批参考、拆解、决策、节点、PNG 及按需生成的实际审阅页'],
  ['实际五份产物', '实际布局 PNG、节点 JSON、决策 JSON 和生成结果；如提供交互审阅页，另核验其真实文件及绑定'],
  ['节点 JSON、标注 PNG 和审阅页比较', '节点 JSON 和标注 PNG 比较；如提供交互审阅页，还必须核验其与同批节点及 PNG 的绑定'],
  ['| `review.html` | 通用、自包含、', '| `review.html`（仅交互对照时生成） | 通用、自包含、'],
  ['| 审阅页 | `layout_review_file`、`layout_review_sha256`、`layout_review_identity_sha256`；身份投影还应覆盖页面绑定的参考、决策、节点和 PNG 身份。 |', '| 审阅页（按需） | 提供交互审阅页时绑定并核验 `layout_review_file` 及其关联的参考、决策、节点和 PNG；`layout_review_sha256`、`layout_review_identity_sha256` 可作为可选摘要记录。 |'],
  ['记录 `layout.png`、两份布局 JSON 和 `review.html` 的相对路径', '记录 `layout.png`、两份布局 JSON 及按需生成的 `review.html` 的相对路径'],
  ['`review.html` 只能由一个通用模板生成', '需要交互对照时通过 `--interactive-review` 生成 `review.html`，并只能由一个通用模板生成'],
  ['布局审阅页属于 V2 可读展示产物：', '布局审阅页是 V2 需要交互对照时按需生成的展示产物：'],
  ['布局审阅页属于可读展示投影：', '布局审阅页是需要交互对照时按需生成的可读展示投影：'],
  ['确认元素顺序展示真实参考图', '确认元素顺序展示真实参考图'],
  ['图集、报告和 HTML 预览', '图集和报告；需要动画播放时通过 `--output-preview` 指定 HTML 预览路径'],
  ['图集、报告、预览', '图集、报告及实际生成的预览'],
  ['图集、报告和预览', '图集、报告及实际生成的预览'],
  ['报告、预览和 spritesheet 路径', '报告和 spritesheet 路径；需要动画播放时通过 `--output-preview` 生成并绑定预览'],
  ['图集、报告、预览与播放设置', '图集、报告与播放设置；需要动画播放时通过 `--output-preview` 指定并绑定预览'],
  ['预览必须是可读 HTML', '提供播放预览时必须是可读 HTML'],
  ['`--output-report/--output-preview` 可指定独立证据路径', '`--output-report` 可指定报告路径；仅需要动画播放时通过 `--output-preview` 显式指定 HTML 路径，默认不生成网页'],
  ['`--output-report`、`--output-preview` 可指定证据路径', '`--output-report` 可指定报告路径；仅需要动画播放时通过 `--output-preview` 显式指定 HTML 路径，默认不生成网页'],
  ['独立 PNG 图集、JSON 报告、网页预览与', '独立 PNG 图集、JSON 报告；需要动画播放时通过 `--output-preview` 生成网页预览，并维护'],
];

/** 按目标或来源路径限定视觉布局及帧动画文档，避免误改无关 HTML。 */
function isReviewDocument(sourcePath, destination) {
  const path = `${sourcePath ?? ''} ${destination ?? ''}`.replaceAll('\\', '/');
  return /\.md\b/i.test(path) && /(?:app-domain-toolkit\/references|game-(?:asset-integration|ui-layout|orchestrator|architecture|workflow-control)|(?:cocos|phaser4|threejs)-frame-animation|domain-contracts\/references|app-stack-)/i.test(path);
}

/** 统一校正文档已审阅的审阅产物句子，不修改可选网页自身的安全与内容规则。 */
export function adaptOptionalReviewDocument(text, { sourcePath = '', destination = '' } = {}) {
  if (typeof text !== 'string' || !isReviewDocument(sourcePath, destination)) return { text, transforms: [] };
  let output = text;
  for (const [before, after] of RULES) output = output.replaceAll(before, after);
  // 示例默认展示不需要网页的合同；需要播放时才添加 preview 并核验其实际文件。
  if (/(?:frame-animation|frame-reference)/i.test(`${sourcePath} ${destination}`)) {
    output = output.replace(/^\s*"preview": \{ "file": "evidence\/(?:animation|mechanism-open)\.preview\.html"[^\n]*\},\r?\n/gm, '');
  }
  return { text: output, transforms: output === text ? [] : ['optional-review-artifacts'] };
}

