# 页面设计决策

页面设计决策按需引用现有控制器工作项与[Figma App 设计流程](../../app-ui-layout/references/figma-app-design.md)，不创建第二套状态或重复批准。候选的真实节点和预览可供用户比较；未选择不能标为正式目标。

## 语义合同与功能验证

- 页面 / 状态 / 模块：
- 正式实现的 V1 模块方案与适用范围（仅设计提案不强制先建运行工程）；Code Sketch 按需使用，若使用记录 Level 与理由：
- 范围、内容优先级、状态、交互、导航与结果：
- 滚动 owner、断点/重排、系统避让、无障碍：
- data/UI/asset ownership 边界：
- 适用的 layout-spec 路径 / validator / 外部 spec hash（`phase: sketch` 是关系数据，不要求草图画面）：
- 若使用 Code Sketch，记录 snapshot-id、diff、可用的 code SHA 和截图身份，以及独立审阅结论；截图由用户人工检查：

## 高保真冻结

- 全局方向：
- 所选 Figma fileKey／nodeId／节点链接／candidate ID／状态／视口：
- 真实预览快照路径及 SHA-256；设计节点结构冻结记录与摘要：
- 用户确认时间：
- 必须遵守的视觉约束 / 允许偏差：
- 参考条件（语言、真实文案、内容状态、安全区；画布与资源密度沿用冻结图记录）：
- 受影响布局依据及来源：链接现有 layout-spec 或正式 Widget 配置，区分已确认目标、测量值、估计值及适配规则，不复制布局树：
- 合同回对结论：通过 / 更新受影响的功能与语义；仅草图路线更新草图审阅
- 回对发现的范围、状态、导航、滚动、断点、无障碍或 ownership 变化：

## 资产

- `asset-manifest.md`：路径 / `N/A: no bitmap or exported visual assets`

> ownership、覆盖审计、编号映射和资产生产明细只存在 asset manifest，不在此复制。

## 布局与验收

- 验收模式：`usability` / 明确要求的 `exact`；仅 `exact` 强制同一 layout-spec 升级 `phase: fidelity`：
- candidate code SHA：
- 适用时 fidelity validator：
- 实际 Widget measurement output：
- 适用时 target/Flutter 同视口 parity cases：
- 独立 Visual QA 结论：
- 已知偏差与接受人：
- 基准还原 / 适配检查：按影响记录设计目标、正式源值、运行值、差异来源、修复及复验；无法测量时如实说明：
- 结构完成 / 工程通过 / 视觉通过：分别记录范围和证据；用户未确认实际组合画面时填“视觉待确认”，Visual QA 和截图采集不能替代人工确认：
