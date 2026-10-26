# 页面设计决策

每个页面只维护 `docs/design/pages/<page-name>/design-decision.md`。未冻结的 brief、prompt、候选和评审草稿只在对话中存在。

## 语义合同与 Code Sketch

- 页面 / 状态 / 模块：
- Code Sketch Level：Full / Lightweight / Reuse；理由：
- 范围、内容优先级、状态、交互、导航与结果：
- 滚动 owner、断点/重排、系统避让、无障碍：
- data/UI/asset ownership 边界：
- `phase: sketch` layout-spec 路径 / validator / 外部 spec hash：
- snapshot-id / diff / code SHA（仅已有且获授权的提交）/ screenshot hashes：
- 独立 Code Sketch Reviewer / 结论：

## 高保真冻结

- 全局方向：
- 冻结图路径 / candidate ID / SHA-256 / `780 x 1688 px` 尺寸：
- 用户确认时间：
- 必须遵守的视觉约束 / 允许偏差：
- 合同回对结论：通过 / 返回语义与草图阶段
- 回对发现的范围、状态、导航、滚动、断点、无障碍或 ownership 变化：

## 资产

- `asset-manifest.md`：路径 / `N/A: no bitmap or exported visual assets`

> ownership、覆盖审计、编号映射和资产生产明细只存在 asset manifest，不在此复制。

## Fidelity 与验收

- 同一 layout-spec 已升级 `phase: fidelity`：
- candidate code SHA：
- fidelity validator：
- 实际 Widget measurement output：
- target/Flutter 同视口 parity cases：
- 独立 Visual QA 结论：
- 已知偏差与接受人：
