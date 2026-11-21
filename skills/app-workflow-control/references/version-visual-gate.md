# 全局视觉与模块阶段门禁

所有正式 `PAGE`、`SCENE`、`DISPLAY_LAYER` 都执行此合同。局部工作可复用有效基线和设计文件。绑定[生产总范围](../schemas/production-scope.schema.json)时，用 `versionVisual.workItemPaths` 登记第 7 阶段必须纳入的正式来源。各模块按自身批次推进。

## 第 4 阶段冻结全局视觉

基础工程 Work Item 完成原有工程验收。其 `foundationVisualRef: {path,sha256}` 指向 JSON，字段为 `schemaVersion: "1.0"`、`projectId`、`stack`、`foundationWorkItemPath` 及 `baselines`。各基线记录 `{route,ref:{path,sha256}}`。路线取 `image`、`figma-app` 或 `world-3d`，直接 Figma 条目保留已获授权的 `designSource`。各路线使用既有基线合同，记录用户对代表稿及全局方向的确认，并将清单的准确路径与摘要纳入基础工程的 `systemCoverage.modules[].designRefs`。正式模块绑定同一个 `foundationVisualRef` 和当前路线对应的 `globalVisualBaselineRef`。

## V1 确认方案

`visual.modulePlanRef` 指向带摘要的方案 JSON，记录 `schemaVersion: "1.0"`、`workItemId`、`objectId`、`dependencies`（无外部依赖时为空数组）和 `entries`。显示层还登记 `hostId`。每项填写 `kind`、`id`、`description`、`acceptance`、`requirementId` 和在 V5 运行的 `command`。

`kind` 包括 `function`、`state`、`step`、`transition`、`progress`。多状态登记转换，多步骤登记进度。生产总范围内本对象本批的状态、步骤和转换沿用原有 ID。确认业务规则、异常恢复和验收预期，记录 F0、F1 后进入 V2。按需使用白模、布局或其他专项验证。

## V2 生成并确认模块稿

`visual.moduleDesignRef` 指向带摘要的设计清单，清单记录 `schemaVersion: "1.0"`、`workItemId`、`modulePlanRef`、`baselineRef` 和 `entries`。每个设计条目使用 V1 的 `kind`、`id`，并绑定 `targetRef: {path,sha256}`。Figma 图片路线还用 `designRef` 引用对应的可编辑节点快照。无图 3D 状态可以用独立空间、构图或时序规格表达。清单逐项覆盖全部适用状态、步骤、转换和进度，并与原生确认稿双向核对。

`visual.moduleDesignReviewRef` 指向用户确认的记录，字段为 `schemaVersion: "1.0"`、`workItemId`、`stage: "V2"`、`decision: "approved"`、真实 `userMessageRef` 和与清单一致的 `subjectRef: {path,sha256}`。连续进度可用关键帧和变化规则表达，重复表现可引用共享规格。控制器固定 V2 快照，V3–V5 核对同一版本。设计表达及实际预览由用户人工核对。

## 实现、验收与返工

V3 拆解 V2 确认的稿件，V4 准备资源、接口、共享组件与适用的风险验证。V5 完整实现本轮功能，用 V1 的 `requirementId` 和 `command` 将每项验收关联到当前实施包的需求、验证单元与真实执行输出。通过后固定执行证据摘要，以便第 7 阶段复核来源及正式组合的跨模块状态与端到端路径。

业务规则有实质歧义时做 grilling，更新 V1 后回到 V2。模块稿变更走 `RETURN` 的 `visual:V2` 并重新确认。全局方向变更先更新第 4 阶段，再复核受影响的模块。
