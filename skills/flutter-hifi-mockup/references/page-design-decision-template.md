# 页面设计决策

每个页面只维护 `docs/design/pages/<page-name>/design-decision.md`。未冻结的 brief、prompt、候选和评审草稿只在对话中存在。

## 语义合同与功能验证

- 页面 / 状态 / 模块：
- V1 功能验证结果与范围；Code Sketch 按需使用，若使用记录 Level（Full / Lightweight / Reuse）与理由：
- 范围、内容优先级、状态、交互、导航与结果：
- 滚动 owner、断点/重排、系统避让、无障碍：
- data/UI/asset ownership 边界：
- 适用的 layout-spec 路径 / validator / 外部 spec hash（`phase: sketch` 是关系数据，不要求草图画面）：
- 若使用 Code Sketch，记录 snapshot-id、diff、可用的 code SHA 和截图身份，以及独立审阅结论；截图由用户人工检查：

## 高保真冻结

- 全局方向：
- 冻结图路径 / candidate ID / SHA-256 / `目标逻辑视口 × 资源密度（默认 2x）` 尺寸：
- 用户确认时间：
- 必须遵守的视觉约束 / 允许偏差：
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
