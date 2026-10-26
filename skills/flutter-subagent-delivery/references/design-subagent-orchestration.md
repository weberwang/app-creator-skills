# 设计专项编排

设计链只在页面结构或视觉事实确实变化时启用；普通复用页不强制完整链路。默认当前 checkout 单写者顺序交接，设计候选在冻结前保持 transient。

## 顺序

语义合同 → `phase: sketch` layout-spec → Code Sketch → 关系测试/必要截图 → 独立 Code Sketch Review → 必要时生成/评审候选 → 用户冻结 → 合同回对 → 必要资产编号确认与生产 → 同一 spec 升级 `phase: fidelity` → 生产骨架还原 → fidelity validator、实际测量、同视口 parity → Visual QA。

合同回对若改变范围、状态、导航、滚动 owner、断点、无障碍或 ownership，回到语义/草图阶段并只重做受影响审阅。

## 角色边界

| 角色 | 核心职责 | 禁止事项 |
|---|---|---|
| UX/UI / Page Contract | 语义、状态、交互、响应式和无障碍 | 写页面代码、替用户冻结 |
| Code Sketch | 生产骨架、稳定 key、关系测试 | 建重复页、自审放行 |
| High-Fidelity / Effect Review | 候选生成或独立评审 | 未冻结即持久化或生产资产 |
| Asset / Fidelity | 已确认资产与同一 spec 的高保真实现 | 未确认生产、绝对叠层凑像素 |
| Visual QA | 指定视口的测量和 parity | 用单张截图替代完整证据 |

所有交接使用八字段任务契约；审核绑定 `snapshot-id`，不强制提交。冻结、确认和持久决策由 Controller 记录。
