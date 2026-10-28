# Code Sketch Review Rubric

Code Sketch Reviewer 必须独立于 Code Sketch Agent，只读审阅同一个不可变候选。

本规则只适用于已选择 Code Sketch 的工作项；直接实现并验证功能时不要求草图或草图审阅。截图显示效果由用户检查，未经明确授权不得自动分析截图。

## 输入完整性

- snapshot-id 或完整 diff；已有且获授权的提交才记录代码 SHA。
- `phase: sketch` 的 layout-spec、外部记录的 spec hash、validator 结果。
- analyze、Widget/关系测试输出；按级别要求提供确定性截图及 SHA-256。
- 页面语义合同、Code Sketch Level 与复用来源/delta（如适用）。

## 审阅内容

- 页面范围、内容优先级、状态、导航、交互与结果是否完整。
- 滚动 owner、停靠/叠层、断点重排、文本增长、键盘与 SafeArea/系统栏避让是否符合合同。文本断行按 [Adaptive Layout Implementation](../../app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation) 的权威合同审阅；缺少角色化 `line_break` 或最长文案+大字号实际测试时不得通过。
- 无障碍语义、焦点顺序、关键动作可达性是否存在结构性缺口。
- Flutter 骨架是否为生产实现，是否出现一次性重复页面或用绝对定位伪造结构。
- evidence_matrix 中 test id 是否实际执行，截图是否只被用作低保真功能/层级证据。

## 判定

- `PASS`：输入绑定完整，合同与结构事实一致，无阻断项。
- `CHANGES_REQUESTED`：列出可定位缺口和需重跑证据。
- `BLOCKED`：候选可变、证据未绑定、producer 与 reviewer 相同，或关键输入缺失。

Code Sketch Review 不批准最终视觉几何。高保真目标改变语义合同或 ownership 时，必须退回更新并重审。
