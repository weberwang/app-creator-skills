/** 四个游戏栈项目文档共用的特点识别、实施与 QA 表格片段。 */
export const GAME_CHARACTERISTICS_TEMPLATE_SECTIONS = Object.freeze({
  'GDD.md': `
## 游戏特点与规则

按[特点识别](../.agents/skills/app-domain-toolkit/references/game-characteristics.md#identify)只记录本次适用机制；复用已有事实和编号，不增加独立审批或记录文件。未决定的规则和验收预期标为待定。

| 实际特点 | 规则及来源 | 功能/对象 | 关键风险 | 可观察验收预期 |
| --- | --- | --- | --- | --- |

## 关卡与内容设计

涉及关卡或内容时，按[关卡生产](../.agents/skills/app-domain-toolkit/references/game-content-playtesting.md#levels)记录当前范围，复用既有设计与编号；不要求增加不适用的内容。

| 内容/关卡与目标 | 既有机制 | 难度/教学意图 | 完成/失败/检查点/恢复 | 数据来源 | 可观察验收 |
| --- | --- | --- | --- | --- | --- |
`,
  'TDD.md': `
## V1 机制验证与正式组合回归

依据 GDD 规则和[V1 专项验证](../.agents/skills/app-domain-toolkit/references/game-characteristics.md#v1)选择当前功能的实际风险；沿用现有工作项、实施单元与证据，不预填验证结果。正式组合按[变更复验](../.agents/skills/app-domain-toolkit/references/game-characteristics.md#regression)记录受影响范围。

| 特点/规则来源 | 关联工作项/实施单元 | 代码或配置入口 | V1 前置/输入与验证方式 | QA 用例引用 | 正式组合回归范围/证据 |
| --- | --- | --- | --- | --- | --- |

## 内容生产与试玩计划

涉及内容时，按[关卡生产](../.agents/skills/app-domain-toolkit/references/game-content-playtesting.md#levels)、[专项工具选择](../.agents/skills/app-domain-toolkit/references/game-content-playtesting.md#tools)和[人工试玩](../.agents/skills/app-domain-toolkit/references/game-content-playtesting.md#playtest)选择适用检查与任务，复用现有计划和证据。

| 内容数据/编辑器入口与消费者 | 自动检查及覆盖边界 | 人工试玩任务 | 受影响回归及证据 |
| --- | --- | --- | --- |
`,
  'qa-plan.md': `
## 游戏特点与 QA 用例映射

按[QA 用例映射](../.agents/skills/app-domain-toolkit/references/game-characteristics.md#qa)复用已有编号，仅覆盖适用机制；记录真实运行、未运行和待用户人工确认的结果。变更后的受影响范围按[回归清单](../.agents/skills/app-domain-toolkit/references/game-characteristics.md#regression)复验。

| 用例/特点及规则来源 | 前置状态/输入 | 可观察预期 | 阶段/功能对象 | 实际结果/证据 | 用户人工确认 | 变更复验范围 |
| --- | --- | --- | --- | --- | --- | --- |

## 人工试玩与调参闭环

涉及人工试玩或调参时，按[试玩与调参](../.agents/skills/app-domain-toolkit/references/game-content-playtesting.md#playtest)复用现有记录，分别填写观察、体验反馈和调整假设；尚未取得的结论保持未确认。

| 试玩版本/条件/任务 | 客观观察及原始证据 | 体验反馈 | 调整假设/参数版本 | 复验结果 | 未确认项 |
| --- | --- | --- | --- | --- | --- |
`,
});
