# Test Matrix

`evidence_matrix` 驱动结构测试，不承担视觉 parity。至少覆盖每个断点 b-1/b/b+1、同宽不同高、项目声明的方向、默认与大字号、默认与最长文案、零与非零安全区、关键动作默认/禁用/提交状态。

文本断行及 `font_sizing.styles[].test_ids` 必须由 invariant 声明，并至少在 `longest_copy + large text scale` 的组合场景执行。测试读取 `TextPainter.computeLineMetrics` 或 `RenderParagraph` 的实际断行、字号和字形边界，分别核对正文、标题/关键文案、控件标签、原子文本与动态容器。固定字号保持设计值，有界单行缩小验证触发条件、下限、触底失败及短→长→短恢复，并证明没有抵消用户 `TextScaler`。禁止未声明字符串改写、固定高度、`FittedBox` 或无界缩字号规避问题；fallback 顺序与具体用途符合合同。

每个 invariant 与 critical alignment 的 `test_ids` 必须在矩阵中实际执行。高保真关系测试使用稳定 Flutter key 测量 element 与 reference 的双方中心，复算双轴 delta；容差按被检属性、逻辑单位、参考条件及目标/测量精度论证并记录 `tolerance_basis`，不套用统一像素上限。

每个 `parity_cases` 条目只对应一张明确冻结的目标图及其 viewport/state/orientation/SHA。Golden、validator、“No layout problems”或截图采集不能代替实际 Widget 测量与用户对组合画面的人工确认；未经明确授权，代理不自动分析截图。
