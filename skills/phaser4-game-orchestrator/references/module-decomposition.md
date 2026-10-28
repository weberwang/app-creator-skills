# 模块划分、审计与决策边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#模块划分审计与决策边界)。

## 划分模块

目录采用[游戏项目目录规范](../../phaser4-game-architecture/references/project-structure.md)：场景私有规则、实体和常驻 UI 就近归属场景，场景无关服务、平台适配与独立显示层分别归属模块、平台和显示层目录。实际路径映射必须写入 TDD 与实施单元所有权；目录归类不代替职责、依赖与状态所有权审计。

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#划分模块)。

4. 给出 G1 内可独立验证的实施计划。全局基线、foundation-only 边界和场景 V0→V1→V2→V3→V4→V5 顺序以[控制模型](../../phaser-domain-contracts/references/control-model.md)和[状态、阶段与停止门](../../phaser-domain-contracts/references/state-gates.md)为准；本文件只冻结模块/场景/显示层的职责、所有权、依赖和实施单元。基础包只承载场景无关的 `SHARED`/`MODULE` 能力。场景闭环自身规则、画面、常驻 HUD、清理和证据；modal/popup 等弹窗建立独立 DISPLAY_LAYER Work Item，不并入宿主场景完成条件。
5. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#划分模块)。

## 场景与公共基础边界

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#场景与公共基础边界)。

## 审计与审核

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#审计与审核)。

## 实现与变更

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md#实现与变更)。

## 本栈配套资料

- [审核漏斗](./review-funnel.md)
