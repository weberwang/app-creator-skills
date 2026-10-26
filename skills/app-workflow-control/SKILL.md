---
name: app-workflow-control
description: 维护五技术栈共用的游戏和应用 Work Item、六阶段状态、V0–V4 视觉对象阶段、执行结果与证据门；不直接编辑引擎项目，不运行构建、设备或发布操作。
---

# 统一工作流控制面

为 Unity、Cocos Creator、Phaser、Three.js 与 Flutter 保留一份权威状态机和证据合同。运行技术任务前加载对应 `app-stack-*` 的 `profile.json`，按当前技术栈读取编译、测试、资源导入和可视化运行规范。Unity 的 `.meta`、Cocos AssetDB、Phaser Vite、Three.js WebGL 和 Flutter 路由验证始终由技术 profile 决定。

## 状态和边界

- 六个阶段：需求与范围、全局基线、基础工程、场景与页面生产、全局集成验证、发布。全局状态只由控制器校验并按显式命令迁移；`run` 仅推进无需再次执行人工决定的早期安全阶段，停在生产实现或发布边界。
- `SCENE`、`PAGE`、`DISPLAY_LAYER` 各用独立 Work Item。显示层须设置 `visual.hostId/layerType`。可见对象按 V0 分流、V1 目标、V2 拆解/布局双确认、V3 资源导入、V4 正式组合和运行闭环推进。
- A0–A6 区分只读调查、规格、原型、生产实现、本地集成、外部状态/设备与发布风险。A4–A6 的外部写入、设备、签名、上传、付费和发布操作必须绑定精确动作、对象与真实用户消息引用。JSON 只追溯决策，不能自行证明身份或授权，也不能让 CLI 执行动作。
- F0–F4 保存需求范围、规格、领域质量、工程验证和高影响审批事实。PASS 只可在实际调查、证据和人工确认支持时记录；空文件、过期工作项或错栈证据不算通过。
- 失败优先修复当前事实并重验。上游范围或事实失效时显式 `RETURN`，必须提供 `--reason` 和 `--affected-scope`，控制器推导恢复入口并作废消费过的计划/证据路径。`BLOCKED`/`RETURN` 是控制记录；其恢复仍须重新满足有效拷问、审批与门禁。

## 工作项和文件

按 [schemas/work-item.schema.json](schemas/work-item.schema.json) 定义单个 JSON 工作项。生成新工作项用 CLI `init`，已有工作项引用指向项目里的机器记录：

- `implementationPackageRef` → 固定顺序实施包。单元默认串行；连续且至少两项的 `parallelGroup` 可形成并行批次，组内声明的目录/文件所有权必须互斥。`dependsOn` 只引用更早批次的单元，不会改变 `sequence` 顺序。
- `evidenceRef` → 当前实施包、工作项、技术栈及视觉阶段相同的 Evidence Manifest。每项必须是 profile 所需类别、真实非空文件，且位于当前 `evidenceRoot`。
- `globalVisualBaselineRef` → 首次视觉基线。首次建立时为同条件三候选、唯一人工选择和五项质量判断；基线绑定同一 `projectId/stack`，可供后续工作项复用。仅选中候选须五项全 PASS；其他候选也逐项记录状态。
- `visual.reviews` → 当前 `objectId` 与 `candidateId` 的用户阶段确认。V2 的拆解和布局使用独立记录，不能拿一条决定关闭两项。
- `assetReviewRef` → V3 已导入素材、技术报告和同一候选的人工结果。AI 位图记录生成来源及去 AI 味审阅；控制器只检查记录和文件，不自动判断图像是否有 AI 味。原生 UI 可以记录真实组件源码与组件检查，不伪造独立位图。
- `grillingRef` → 仅保存确有实质用户取舍的记录。OPEN 拷问停止相关工作；CLOSED 每项决定需有用户回答和消息引用；没有问题就不建立记录。

项目路径以 `/` 表示并相对 `--repo`；绝对路径、路径穿越、跨工作栈或跨执行单元改动会被拒绝。工作项的 `allowedPaths/forbiddenPaths` 是项目范围唯一授权来源，profile 中 `runtimeRoots` 仅提供初始化建议目录。

机器输出不证明命令曾运行。每项执行结果必须列出确实修改且存在的单元文件、与计划命令逐一对应的退出码和非空命令输出文件；`unit-check` 只校验结果，不执行命令。`status` 和 `check` 也只读。`check` 与 `run` 遇到阻断时返回非零状态。

`status` 的 `metadata.activeBatch` 显示可提交结果的当前批次。并行批次的单元可以任意顺序提交，但需等待整批真实结果都通过后才会开放下一批。控制器为同一个 Work Item 的写操作加排他锁；遇到 `BUSY` 时重新读取状态后重试。字段和校验边界见[实施批次与结果状态](references/implementation-execution.md)。

`RELEASING` 只记录已由用户精确批准的发布动作进入外部执行边界，控制器和 `run` 不执行发布。RELEASE 工作项完成时，Evidence Manifest 必须包含 `release-result` 项；其记录要绑定当前工作项、栈、阶段、动作、目标与批准消息，并引用 evidenceRoot 内实际发布凭据。使用 [templates/release-result.json](templates/release-result.json) 建立记录。

## CLI

```text
node skills/app-workflow-control/scripts/workflow-control.mjs init --repo <项目路径> --stack <unity|cocos|phaser|threejs|flutter> --id <ID> --type <FOUNDATION|SCENE|PAGE|...> --objective <目标>
node skills/app-workflow-control/scripts/workflow-control.mjs status --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs check --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs run --repo <项目路径> --work-item <项目相对 JSON 路径>
node skills/app-workflow-control/scripts/workflow-control.mjs transition --repo <项目路径> --work-item <项目相对 JSON 路径> --to <状态>
node skills/app-workflow-control/scripts/workflow-control.mjs visual-stage --repo <项目路径> --work-item <项目相对 JSON 路径> --to <V1|V2|V3|V4>
node skills/app-workflow-control/scripts/workflow-control.mjs unit-check --repo <项目路径> --work-item <项目相对 JSON 路径> --result <项目相对结果 JSON 路径>
```

`init` 只生成 Work Item，不覆盖已有记录。新 PAGE/SCENE/DISPLAY_LAYER 默认要求全局视觉基线；纯工程任务无视觉工作时默认不要求基线。确认不需要全局视觉基线的局部任务可以经证据审查后，在 Work Item 记录 `visualBaselineRequired: false`。

使用 [templates/](templates) 中同名合同记录真实实施包、结果、人工阶段确认、全局基线、素材评审和拷问。不要在已通过的证据里放模板占位符。
