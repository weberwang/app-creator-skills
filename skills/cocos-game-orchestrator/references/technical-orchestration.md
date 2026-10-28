> 迁移说明：公共阶段流程唯一入口为 `$app-creator-workflow`，公共状态唯一入口为 `$app-workflow-control`。本文件完整保留原技术栈编排正文供领域参考，冲突处遵守当前仓库公共规则：未经用户明确要求不提交、不创建分支或 worktree；截图由用户人工检查。

---
name: app-creator-workflow
description: Cocos Creator 3.x 游戏领域编排角色；在全局控制面已建立 Work Item 后协调各领域交付，不拥有全局状态或审批账本。
---

# Cocos Creator 3.x 游戏编排

以 [`app-workflow-control`](../../app-workflow-control/SKILL.md) 为唯一全局状态、风险门和任务范围权威。本 Skill 负责拆分领域工作、冻结交接物、收集证据并回到控制面，不批准操作、不扩展范围、不创建第二套状态机。

编排 Creator 实施时，Scene/Node/Component、Prefab、AssetDB、资源 UUID 与编辑器操作统一经[Creator MCP 协议](../../cocos-domain-contracts/references/cocos-mcp-protocol.md)路由，并使用实时 `tools/list` schema；不得手写 `.scene`、`.prefab` 或 `.meta` 绑定。刷新、挂脚本或打开构建面板不证明导入、编译、预览或构建成功，必须以读回和真实运行/构建结果报告状态。

## 最短流程

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md#最短流程)。

## 交付边界

- 记录和中间产物整理交给 [`cocos-game-artifact-cleanup`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-artifact-cleanup)：阶段收尾仅清理本任务可再生成且无引用的临时文件，跨任务历史清理须在用户指定范围内另行规划，保留审批、返工及有效证据依赖链。新产物按[产物存放与证据边界](../../cocos-game-architecture/references/artifact-storage.md)落盘；根级审阅/验证目录不代替机器 `evidenceRoot`。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md#交付边界)。

## 视觉与场景

策划、效果图和实现交接同一份[玩家可见表达](../../cocos-game-ui-layout/references/game-copy.md#工作流接入)。委派生成任务时附带可见文字范围与禁止绘制内部说明的约束，委派界面实现时附带短标签、数值来源和显示条件；内部 GDD/brief 全文不能替代这份交接，也不能直接进入画面。

图片交付按[图片优先的确认方式](../../cocos-domain-contracts/references/simplified-workflow.md#图片优先的确认方式)执行：除帧动画须先说明设计理念并取得明确动作方案确认外，领域代理内部整理记录并直接产图或真实预览，主代理展示候选及少量检查点，不以文字提案确认作为常规制作前置；已确认目标内返修直接提交前后对照。真实图片与素材依赖仍按对应阶段确认。

效果图还原和正式 Scene 接入属于当前场景 Work Item；常驻 HUD 随场景闭环。modal/popup 等弹窗按[独立工作项规则](../../cocos-domain-contracts/references/control-model.md#弹窗工作项与场景解耦)另建 DISPLAY_LAYER Work Item，独立提交宿主上下文、组件/状态、布局合同和运行态证据，不影响大厅或其他宿主场景验收。

场景 V3 的布局交付必须同时提供标准布局 PNG、`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`；需要交互对照时通过 `--interactive-review` 额外生成同批自包含 `review.html`，并在独立布局确认及场景根计划中关联同批参考、拆解、决策、节点、PNG 及按需生成的实际审阅页。屏幕 UI 还按[Cocos UI 节点组织](../../cocos-game-ui-layout/references/layout-hierarchy.md)在 V2 定义根层级，在 V3 确认父级职责与 `ui_layout` 字段，在 V5 正式场景中检查职责、输入、裁切边界及视口变化下的运行结果。编排只引用[离线布局审阅产物](../../cocos-game-ui-layout/references/layout-review-artifacts.md)的通用规则，不为场景手写审阅页；页面候选状态不等于人工确认。

## 3D 建模路由

需要制作或修整正式 3D 模型时，调用 [`cocos-game-3d-modeling`](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-3d-modeling)，按[工作流接入](../../cocos-game-3d-modeling/references/workflow-integration.md)把模型规格、Blender 生产、Creator 导入和正式场景消费安排在现有工作项中。制作交接用途、观看距离、视觉基线和预算；建模负责几何、拓扑、法线、UV、LOD 与碰撞代理，资源接入负责 AssetDB、材质绑定与资源级 Prefab，玩法负责实际碰撞和交互语义，QA 分开记录技术证据与用户显示确认。各角色按[模型交接](../../cocos-game-3d-modeling/references/model-handoff.md)串行交接同一源和 Creator 写入权；不把独立纹理、绑定或动画制作隐含并入建模。模型路线不授权替换已冻结的生成式位图，也不跳过适用的 V3/V4/V5 门。

## 汁水感与动态反馈路由

汁水感是按需调用的独立领域能力：用户明确提出汁水、打击感或动态反馈需求时调用；已有任务包含核心反馈，但事件语义仍不清楚时也可按需引用。它沿用当前场景或玩法 Work Item，不把普通玩法修改扩为全量润色，也不增加阶段、审批门或强制工件。按[工作流接入说明](../../cocos-game-juice/references/workflow-integration.md)安排职责：制作在既有 GDD/契约确定意图和关键事件，玩法负责规则、碰撞、状态、触发与交互代码，架构维护跨模块坐标约定；UI 负责布局、焦点表现与布局坐标合同，反馈对象仅使用独立表现偏移，不覆盖基础布局值、不争抢焦点或输入处理。动画与音频沿用各自的生产及生命周期规则，QA 核对事件边界并将动态显示、舒适度和手感交由用户人工验收。完整语义与类型规则见[汁水感设计指南](../../cocos-game-juice/references/design-guide.md)。

## 状态与返工

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md#状态与返工)。

## 本栈配套资料

- [`quality-gates.md`](../../app-domain-toolkit/references/reference-orchestration-quality-gates.md)
- [`module-decomposition.md`](./module-decomposition.md)
- [`game-implementation.md`](./game-implementation.md)
- [`delivery-artifacts.md`](./delivery-artifacts.md)
