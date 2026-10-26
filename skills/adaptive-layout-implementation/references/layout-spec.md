# Layout Spec

`layout-spec.yaml` 是页面实现合同，不是运行时状态、合并信号或审查报告。一个页面在 sketch 与 fidelity 阶段维护同一个文件。

## Sketch

`phase: sketch` 必须包含 page、regions、anchors、breakpoints、content、system avoidance、scroll、text behavior、overlays、implementation、invariants、implementation signals 和 evidence matrix。`text_behavior.line_break` 必须结构化声明父级有限宽度、正文自然软换行、标题/关键文案短语与孤行控制、控件标签和原子文本整体性、动态容器禁止固定高度和截断、反规避规则、完整 fallback 顺序及对应 Widget test id；旧 `wrap` 字段无效。不得出现 `critical_alignments` 或 `parity_cases`，也不得填写尚未产生的目标图、实现截图或测量证据。

`evidence_matrix` 只描述结构场景与实际执行的 test id：每个断点覆盖 b-1/b/b+1，并覆盖同宽不同高、横竖屏、默认/大字号、默认/最长文案、零/非零安全区和关键动作状态。

## Fidelity

`phase: fidelity` 是 sketch 超集。保留已审语义合同字段，增加：

- `critical_alignments`：合同 id、element、稳定 `flutter_key`、reference 语义边界、稳定 `reference_flutter_key`、typed 双轴 target/Flutter relation、双方 `x/y/width/height/center_x/center_y/reference_center_x/reference_center_y`、可复算双轴 delta、`tolerance_logical_px <= 1`、光学信息、双方截图、实际 measurement output、已执行 test id、parity case id。
- `parity_cases`：每条只绑定单个冻结 viewport/state/orientation/target SHA、candidate code SHA 和同视口 target/Flutter 截图。多视口 parity 必须有多张分别冻结的目标图。

结构 `evidence_matrix` 与视觉 `parity_cases` 严格分离。layout-spec 自身 SHA 由外部审阅记录绑定，不能写进自身。

真实叠层仍须登记语义边界、适用视口、遮挡策略和响应式回退。绝对坐标只能辅助诊断，不能替代关系。
