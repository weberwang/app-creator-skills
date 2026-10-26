# Implementation Workflow

1. 完成 preflight 和页面语义合同，建立 `phase: sketch` 的 layout-spec。
2. validator 通过后，在生产 Flutter 骨架中实现中性 Code Sketch；禁止建立一次性重复页面。实现文本前先落实 `text_behavior.line_break`，不得把展示字符串改写、固定高度、`FittedBox` 或缩字号当成断行方案。
3. 运行 analyze 与参数化 Widget/关系测试。最长文案与大字号组合必须证明正文自然软换行、标题/关键文案短语与孤行控制、控件标签和原子文本整体性，并验证扩宽→父级重排→增高→语义换行的 fallback 顺序；结构通过后才渲染风险需要的确定性截图。
4. 独立 Code Sketch Reviewer 审阅不可变 snapshot-id/diff、spec hash、测试输出和截图 hash；已有且获授权的提交才补充 SHA。
5. 高保真目标冻结后回对语义合同。若范围、状态、导航、滚动 owner、断点、无障碍或 ownership 改变，退回更新 sketch 并重审。
6. 将同一 layout-spec 升级为 `phase: fidelity`，在同一骨架中正常重构；禁止用绝对叠层覆盖旧草图凑像素。
7. 依次执行 fidelity validator、实际 Widget 几何测量、target/Flutter 同视口截图 parity 和独立 Visual QA。

仅导航、键盘、SafeArea、系统栏或插件行为需要时复用健康 runtime 实例。真机验收必须用户明确授权。
