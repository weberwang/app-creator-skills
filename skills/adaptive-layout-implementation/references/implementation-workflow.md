# Implementation Workflow

1. 完成 preflight 和页面语义合同；需要布局合同时建立并校验 `phase: sketch` 的 layout-spec。该阶段名称只表示布局数据规格，不要求白盒画面、Code Sketch 或截图。
2. V1 可直接在生产 Flutter 骨架中实现并验证真实功能，也可按需选择中性 Code Sketch；禁止建立一次性重复页面。实现文本前先落实 `text_behavior.line_break`，不得把展示字符串改写、固定高度、`FittedBox` 或缩字号当成断行方案。
3. 运行 analyze 与适用的参数化 Widget/关系测试。最长文案与大字号组合必须证明正文自然软换行、标题/关键文案短语与孤行控制、控件标签和原子文本整体性，并验证扩宽→父级重排→增高→语义换行的 fallback 顺序；结构通过后按风险决定是否需要确定性截图。
4. 仅选择 Code Sketch 路线时，由独立 Code Sketch Reviewer 审阅不可变 snapshot-id/diff、spec hash、测试输出和适用的截图 hash；已有且获授权的提交才补充 SHA。截图由用户人工检查，代理不得自动分析或据此判定视觉验收通过。
5. V2 基于已验证的功能和页面语义设计视觉目标。高保真目标冻结后回对语义合同；若范围、状态、导航、滚动 owner、断点、无障碍或 ownership 改变，更新合同和实现并重新验证；选择 Code Sketch 路线时同步更新草图并重审。
6. 仅明确选择 `exact` 时，将相关 layout-spec 升级为 `phase: fidelity`，在同一骨架中正常重构并执行 fidelity validator、实际 Widget 几何测量及 target/Flutter 同视口截图 parity；禁止用绝对叠层覆盖旧草图凑像素。默认按 usability 目标验证，不强制完整 fidelity/parity。
7. 执行适用的实际结构、运行和视觉质量验证，并保留用户视觉确认；需要截图时提供给用户人工检查，代理不得自动分析截图或替用户判定视觉验收通过。

仅导航、键盘、SafeArea、系统栏或插件行为需要时复用健康 runtime 实例。真机验收必须用户明确授权。