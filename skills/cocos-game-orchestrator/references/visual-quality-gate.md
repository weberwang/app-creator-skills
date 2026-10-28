# 视觉质量门

场景只验收自身画面和常驻 HUD；modal/popup 等弹窗按[独立工作项规则](../../cocos-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)完成完整上下文、两次 V3 确认、V4 和自身 V5。弹窗状态不进入场景 V5 门。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md#视觉质量门)。

涉及方向、效果图、正式资源与动态视觉时应用[游戏美术体验与质量契约](../../cocos-game-asset-integration/references/art-quality-contract.md)：全局 brief 说明主题、受众、体验目标与刺激预算，所选候选五项人工质量结果均通过后才能冻结。场景目标在冻结前复核，V5 在正式场景中检查同屏组合，并检查约定游玩情境下的重复、叠加与收尾。机器只核对结构、参数、实际文件和人工结果绑定，代理不得在未明确授权时自动分析截图/视频或宣称美术通过。复用现有确认节点，不增设审批流程。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md#视觉质量门)。

正式可见视觉集成的 `visualStage`、`visualStageState`、阶段依赖和不可变证据由[控制模型](../../cocos-domain-contracts/references/control-model.md)、[状态、阶段与停止门](../../cocos-domain-contracts/references/state-gates.md)及 Schema 统一校验；领域文档不复制完成状态枚举。

## 路径

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md#路径)。

每个 V3 布局候选目录必须包含同批标准 PNG、节点 JSON、决策 JSON 和生成结果 JSON；需要交互对照时通过 `--interactive-review` 生成的页面按确认元素顺序展示真实参考图及同坐标父子高亮，但只属于候选审阅，不写入确认或业务状态。独立布局 confirmation、decision 和 receipt 必须绑定 `layout_nodes_file`、业务标识以及原有布局和上游身份字段；仅提供交互审阅页时绑定并核验 `layout_review_file`。具体模板和文件门见[离线布局审阅产物](../../cocos-game-ui-layout/references/layout-review-artifacts.md)。

## 统一门

文案按[游戏内文案](../../cocos-game-ui-layout/references/game-copy.md#检查与返修)在效果图冻结前及 V5 正式运行中复核：实际提示词与文本绑定沿用玩家可见表达，详细规格不进入画面。该项归入已有玩法可读与游戏感检查，不新增确认链；无人工显示结论时保持未验证。

F0-F4、任务范围、高影响操作批准和失败处置以[控制模型](../../cocos-domain-contracts/references/control-model.md)与[状态、阶段与停止门](../../cocos-domain-contracts/references/state-gates.md)为唯一来源。本领域只提交视觉领域 F2、当前候选的 F3 证据，以及与 V3/V4/V5 产物的绑定关系；机器检查不能替代两次 V3 确认。

冻结前候选图、临时提示和评审草稿保持 transient；冻结后记录原图、候选 ID、时间及 scene/state，SHA 仅可选追踪。V1 验证功能，白盒按风险选择；V2 冻结视觉目标及适用事实，V3 固化拆解与布局，V5 按正式 Cocos Scene 实现并校准；fidelity/parity case 必须关联实际目标/候选文件、适用的复现条件、合同/基线版本、双方证据、容差、例外和结论。默认 `visual_validation.mode=usability` 使用代表性视口/状态并检查关系、可读性、边界和交互；只有 `exact` 或明确需求时才要求完整矩阵和严格差异。上游事实或当前受影响候选身份变化才使对应案例失效。

## 失效与返回

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md#失效与返回)。

## 本栈配套资料

- [`app-workflow-control`](../../app-workflow-control/SKILL.md)
