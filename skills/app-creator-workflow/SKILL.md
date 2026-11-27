---
name: app-creator-workflow
description: 开发或迭代游戏、Flutter 与 Expo 应用、ESP32 自带屏幕 GUI 及 Node.js 服务器时，统一编排需求、架构、基础工程、功能、验证与交付。按任务选择技术栈和专项规范。
---

# 游戏与应用统一编排

## 进入任务

1. 先核对项目约束、已有状态、实际技术栈与可复用进程。以入口、依赖、工程配置或已连接的编辑器为依据；通用文件名不足以判断技术栈。多栈项目按接口和模块拆分工作项；信号冲突时按[技术栈证据](references/task-routing.md#stack-evidence)核对目标模块。仅在用户明确要求时创建分支或 worktree。
2. 按[任务编排](references/workflow.md#按任务选择编排)选择直接处理、`light` 或 `standard`。事实查询、纯文案或注释直接处理；单个无视觉的本地工程修复适用轻量模式；正式功能、视觉或跨模块任务按实际[七阶段](references/workflow.md#七阶段)推进。
3. 按[最小约定](references/output-files.md#每项任务的最小约定)明确目标、涉及路径及验收。按[增量变化影响](references/professional-conventions.md#incremental-change-impact)追踪消费者和需要重验的范围，复用有效记录。出现实质取舍时使用 [grilling](../grilling/SKILL.md)，先继续独立工作。
4. 正式工作以 [app-workflow-control](../app-workflow-control/SKILL.md) 为唯一状态、门禁和证据来源。按[系统与模块覆盖](references/system-module-coverage.md)核对本批需求、规则、依赖和验收，通过 `plan --spec` 冻结计划，实施后用 `record --report` 登记真实结果。新项目先贯通[首个正式功能切片](references/workflow.md#功能切片与跨对象依赖)；共享配置和编辑器保留唯一写者。
5. 实施后按[验证与交付](references/verification.md)先推荐 T0–T3、理由、覆盖和命令，再自动执行本地验证。按[持续迭代收尾](references/workflow.md#持续迭代与可接手收尾)更新受影响的当前说明，按[精简交付](references/output-files.md#精简交付)报告真实结论、未验证项及必要产物。

## 按任务读规范

只打开命中条件的参考章节。先前已读且仍适用的公共规范直接引用。多个能力都能解释同一症状时，按[任务主责](references/task-routing.md#task-ownership)根据实际行为或交付物选主能力，再按本页末尾的路由读取原生适配。

| 任务 | 入口 |
| --- | --- |
| 选型、接入和运行 | [技术方案选型](references/professional-conventions.md#solution-selection)、[工具能力核实](../app-domain-toolkit/references/tool-capability-verification.md)、[复用实例与运行验证](../app-quality-review/references/runtime-validation.md) |
| 新客户端或启动链路 | [客户端初始化](references/workflow.md#client-initialization)、适用的[系统启动屏](../app-domain-toolkit/references/system-launch-screen.md) |
| 新增或调整可见内容 | [市场与竞品调研](references/professional-conventions.md#product-market-research)、[全局基线和 V1–V5](references/workflow.md#对象闭环)、[增量显示](../app-domain-toolkit/references/reference-domain-display-ownership.md#新增显示元素的增量约束)、[默认中心锚点](../app-domain-toolkit/references/reference-domain-display-ownership.md#ui-与二维显示元素的默认锚点) |
| App 页面及显示层 | [多页面推进](../app-domain-toolkit/references/incremental-production.md#多页面推进顺序)、[Figma 设计与还原](../app-ui-layout/references/figma-app-design.md)、[错误提示](../app-domain-toolkit/references/ui-copy-principles.md#错误提示形式) |
| 场景、关卡及复杂流程 | [分批生产](../app-domain-toolkit/references/incremental-production.md)、[方案探索](../app-domain-toolkit/references/game-design-exploration.md#explore)、[场景实现路线](../app-domain-toolkit/references/game-design-exploration.md#implementation-routes)、[场景与关卡设计任务](../app-domain-toolkit/references/game-design-exploration.md#v1-scene-design-task)、[3D 设计与模型交接](../app-workflow-control/references/world3d-scenes.md#world-camera-designs) |
| 编辑器、导航和加载 | [编辑器优先](../app-domain-toolkit/references/editor-display-authoring.md#编辑器优先)、[事件持久绑定](../app-domain-toolkit/references/editor-display-authoring.md#editor-event-binding)、[布局脚本止于 V4](../app-domain-toolkit/references/editor-display-authoring.md#layout-script-stop-after-v4)、[统一加载](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载) |
| 游戏策划、音频与反馈 | [可选核心玩法验证](references/workflow.md#optional-core-gameplay-check)、[游戏特点识别与专项验证](../app-domain-toolkit/references/game-characteristics.md)、[广告与反馈](references/domain-production.md#游戏策划中的广告与反馈)、[游戏音效](../app-audio/references/sfx-production.md#design)、[App 音频](../app-domain-toolkit/references/app-audio.md) |
| 性能、资源和清理 | [性能优化](../app-domain-toolkit/references/performance-optimization.md)、[素材来源与消费者](../app-asset-workflow/references/asset-provenance.md)、[产物清理](../app-artifact-cleanup/references/project-cleanup.md) |
| SDK、渠道及发布 | [SDK 选择](../app-release/references/channel-sdk-selection.md)、[渠道接入](../app-release/references/channel-platform-integration.md)、[隐私与 SDK 解耦](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#隐私流程与-sdk-解耦)、[独立发布任务](references/workflow.md#独立的发布任务) |
| 栈专用协作或 Git 提交 | [技术栈专项参考](references/workflow.md#stack-specific-references)、[本地工具目录](references/workflow.md#本地工具目录与项目范围)、[提交范围](references/workflow.md#工作流记录与提交范围) |

按实际项目选择 `app-stack-unity`、`app-stack-roblox`、`app-stack-cocos`、`app-stack-phaser`、`app-stack-threejs`、`app-stack-flutter`、`app-stack-expo`、`app-stack-esp32` 或 `app-stack-nodejs`。Node.js 指实际服务端进程，七阶段使用非视觉合同；ESP32 指设备自带屏幕 GUI。按所选技术栈核对运行入口、工具与验证范围。

## 交接与状态

- 按[协作与交接](references/handoffs.md)分配实际职责；[领域生产交接](references/domain-production.md)按需读对应章节。实施包、执行结果和证据沿用控制器的 Schema 和模板，续作只补变化。
- `status/check` 只读，`run` 只推进控制状态。真机、签名、上传、外部写入、付费、破坏性操作和实际发布须有明确授权；发布准备沿用独立的 `RELEASE` 工作项。Git 提交、推送、全局技能安装和修改源技能仓库仅在明确要求时执行。
- 可见交付分别报告[结构、工程和人工视觉结论](references/verification.md#三类验收结论)。截图交用户检查，未经明确授权不自动分析，不以工程通过代替人工确认。失败优先修复并复验，上游目标或范围失效时使用 `RETURN`。

<!-- capability-route:start -->
## 技术栈原生能力路由

按当前任务选定公共能力，通过其 `native-adapters.json` 的 `when` 选择当前栈模式。运行 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <公共能力> [sourceSkill]`，多模式时必须指定 `sourceSkill`。默认返回本栈原生章节、链接指定的公共片段、清单要求的必读资料及按需引用；其余参考根据实际影响读取，可重复传入 `--reference <路径[#章节]>` 展开当前模式列出的公共参考。维护本仓时将 `.agents/skills/` 换为 `skills/`。

只有选中的模式适用。未声明当前栈时沿该栈规范处理；已声明且选中的必需资料缺失时报告阻断。
<!-- capability-route:end -->
