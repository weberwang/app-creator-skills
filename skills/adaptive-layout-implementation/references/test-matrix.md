# Test Matrix

`evidence_matrix` 驱动结构测试，不承担视觉 parity。至少覆盖每个断点 b-1/b/b+1、同宽不同高、项目声明的方向、默认与大字号、默认与最长文案、零与非零安全区、关键动作默认/禁用/提交状态。

文本断行 test id 必须由 invariant 声明，并至少在 `longest_copy + large text scale` 的组合场景执行。测试读取 `TextPainter.computeLineMetrics` 或 `RenderParagraph` 的实际断行结果，分别核对正文、标题/关键文案、控件标签、原子文本与动态容器，并证明未用展示字符串改写、固定高度、`FittedBox` 或缩字号规避问题，fallback 顺序符合合同。

每个 invariant 与 critical alignment 的 `test_ids` 必须在矩阵中实际执行。高保真关系测试使用稳定 Flutter key 测量 element 与 reference 的双方中心，复算双轴 delta；关键轴线容差不得超过 1 logical px。

每个 `parity_cases` 条目只对应一张明确冻结的目标图及其 viewport/state/orientation/SHA。Golden、validator、“No layout problems”或单独目测都不能代替实际 Widget 测量与独立 Visual QA。
