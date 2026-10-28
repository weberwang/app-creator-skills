# Flutter Adapter

- 使用 `LayoutBuilder`、`MediaQuery`、`SafeArea`、`ConstrainedBox`、`Flexible`、`Wrap` 或 Sliver 把语义关系翻译为生产布局。
- `Text` 必须先获得父级有限宽度再换行：在 `Row` 中用 `Flexible`/`Expanded`，在普通流中用约束容器；动态文本容器禁止固定高度，也不得用 `FittedBox`、缩字号或插入 `\n` 掩盖约束缺陷。
- 正文保留自然 `softWrap`；标题与关键文案按短语组织并避免孤行。需要控制语义断点时拆分 `TextSpan` 或组件，让布局选择组合方式，不得修改展示字符串来塑造行宽。
- 按钮、标签和数字+单位、快捷键、标识符等原子文本保持整体；空间不足时按扩宽容器→父级重排→增高→语义换行处理，控件标签优先扩展父级或让控件组重排。
- 固定高度区域不得截断动态文本；只有合同明确允许且提供完整语义替代时，非关键文本才可使用 `maxLines`/`overflow`。
- Widget 测试使用 `TextPainter.computeLineMetrics` 或 `RenderParagraph` 在最长文案与大字号组合下核对实际行数、断点和边界；截图只能补充视觉证据。
- 页面只保留一个明确滚动 owner；键盘、SafeArea、系统栏、折叠与分屏边界不得重复应用 inset。
- 为合同元素和参照边界提供稳定 Flutter key，Widget 测试读取实际 RenderBox 几何并输出可复算测量。
- `Stack/Positioned` 可实现有明确父级或参照的相对关系；浮层本体的独立落位边界按[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)执行。登记 boundary、viewport scope、occlusion、fallback 和 test id；叠层本身不构成内部控件使用屏幕固定坐标的理由。不得从目标图绝对坐标直接生成实现。
- 高保真阶段对每条关键对齐同时运行关系断言与 target/Flutter 同视口截图复核。任一缺失都不能 PASS。
