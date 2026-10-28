# 汁水感工作流接入

## 组织决策

采用“独立领域 Skill + 现有流程按需引用”：[threejs-game-juice](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-juice)提供跨视觉、声音、镜头、时间和交互的专门设计入口，[完整指南](./design-guide.md)是详细规则的单一来源；总控、策划、玩法、UI、资源、动画、音频和 QA 保持现有所有权。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#组织决策)。

## 启用条件与范围

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#启用条件与范围)。

## 现有阶段映射

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#现有阶段映射)。

## 领域所有权

| 领域 | 负责 | 不由汁水 Skill 接管 |
| --- | --- | --- |
| 制作策划 | 反馈范围、体验目标、GDD 与功能验收 | 产品方向与玩法选择 |
| 编排 | 依赖、任务包、文件所有权、证据交接 | 全局状态与审批账本仍归控制面 |
| 架构 | 确实需要的事件接口、时间/生命周期边界和模块依赖 | 局部效果不强制新增公共框架 |
| 玩法 | 规则、状态、碰撞、结算、事件触发、实际击退 | 表现动画不决定扣血、费用、库存或胜负 |
| 数值 | 确有规则影响的顿帧、硬直、吸附、输入容错、经济反馈 | 不把纯粒子参数混进经济或战斗模型 |
| UI | 布局、焦点表现、布局坐标合同与可读文字 | 玩法保留交互代码，架构维护跨模块坐标；反馈不覆盖基础布局或另写坐标公式 |
| 美术接入 | 资源生产路线、登记、外观与集成 | 冻结素材不得被未批准的程序简化效果替代 |
| 二维帧动画与三维模型动画 | HUD/billboard/贴图序列，或模型 clips/`AnimationMixer` 与关键帧事件 | 二维序列不替代三维网格/骨骼动画；局部补间不强制升级成帧动画生产 |
| 音频 | 声音分组、变奏、混音、实例、解锁和后台生命周期 | 后台暂停恢复继续引用音频 Skill 的唯一详细约束 |
| QA | 事件、参数、功能、清理、性能和可复现材料 | 显示、舒适和手感由实际人工验收确认 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#领域所有权)。

## 工件与追踪

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#工件与追踪)。

## 验证与交接

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#验证与交接)。

## 最小接入示例

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md#最小接入示例)。

## 本栈配套资料

- [现有显示层规则](../../threejs-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)
- [游戏感质量门](../../threejs-game-asset-integration/references/game-feel-quality-gate.md)
- [美术体验契约](../../threejs-game-asset-integration/references/art-quality-contract.md)
- [玩法视觉契约](../../threejs-game-asset-integration/references/gameplay-visual-contract.md)
