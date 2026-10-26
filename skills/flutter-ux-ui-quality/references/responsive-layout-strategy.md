# 响应式布局设计输入与交接

本文件只定义 UX/UI 设计阶段需要提供的语义和视觉输入。可执行的布局约束、断点、滚动所有权、系统避让、文本增长和参数化测试由 [`adaptive-layout-implementation`](../../app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation) 维护，避免在设计技能和实现技能之间复制规则。

## 设计阶段必须交接的事实

在 `design-decision.md` 或 `ui-spec.md` 中记录：

- 页面语义区域、内容优先级、状态和交互顺序；
- 视觉锚点（例如标题基线、主操作与内容组的相对关系）和允许的视觉弹性；
- 目标平台/方向、已知最小可读内容宽度、设计系统间距/字号 token；
- 关键本地化文案、RTL 方向、长标题/错误文本和大字号的视觉意图；
- SafeArea、系统栏、键盘、折叠铰链或分屏的设计限制，以及 fixed/floating/docked 元素的产品意图；
- 页面需要保留的任务、状态、路由和动效语义；不得用截图坐标代替这些关系。

## 交接步骤

1. 设计或低保真评审冻结语义关系、内容优先级、状态和视觉方向，不冻结生产坐标。
2. 页面实现前调用 `adaptive-layout-implementation`，将上述输入写入 `docs/design/pages/<page-name>/layout-spec.yaml`。
3. 实现者运行 `adaptive-layout-implementation/scripts/validate-layout-spec.js`，并按其 Flutter adapter 和测试矩阵落地；验证器输出和关系测试 id 随任务简报交接。
4. UX/UI 复核只评估视觉方向、层级、状态反馈、可理解性和与已批准设计输入的一致性；布局关系问题回写规格，不在本文件新增页面特例。

## 视觉证据边界

- Golden 仅用于规格声明的冻结逻辑视口、方向、字号和系统 inset 的精确视觉比较。
- 普通 Widget/集成测试验证关系、可达、换行、无截断、无遮挡和滚动行为，不把绝对坐标作为通用验收标准。
- 设计截图可以说明意图，但不能替代 layout-spec 或关系测试矩阵。
