# 从零游戏的阶段记录

`init --type PROJECT --stack <游戏栈> --id <ID> --objective <构想>` 从阶段 1 启动。已建工程的局部任务按实际阶段选择工作项类型。从零项目的阶段 1–3 沿用同一个 PROJECT。阶段 1 的玩法题材构想确认后做一次 Grilling，阶段 2 只验证 Game Loop 并由人工确认，阶段 3 注册[固定工程与显示树模板](../../app-creator-workflow/references/game-architecture.md)。

`game-stage --work-item <PROJECT路径> --spec <阶段记录.json>` 一次提交当前阶段。三份记录均填写 `schemaVersion: "1.0"`、`workItemId`、`projectId`、`stack` 和数字 `stage`。文件引用为 `{path, sha256}`，路径相对项目根，摘要取实际非空文件。人工确认写 `{decision: "APPROVED", targetRef, userMessageRef, userText}`，保留真实答复原文。

| 阶段 | 记录字段 |
| --- | --- |
| 1 | `conceptRef` 最终构想、`approval` 初次人工确认、`grillingRef` 同一工作项的 CLOSED 决定记录、`grillingAfterUserMessageRef` 绑定初次决定。构想实质变化时加 `finalApproval` 指向最终构想。 |
| 2 | `productRef` 产品定义、`prototypeRef` 可玩原型入口或候选文件、`gameLoop` 的 `start/action/resolution/feedback/result`，适用时记录重试或继续，`approval` 指向当前原型。 |
| 3 | `architectureRef` 实际技术方案、`templateVersion` 和发行模板文件的 `templateSha256`。技术方案列出所需模块、接口、状态所有者和挂载关系。 |

等待必要确认时可用 `transition --to BLOCKED --reason <实际影响项>`。确认齐备后提交阶段记录。若后续变化使结论失效，用 `game-stage --return-to <1|2|3> --reason <实际原因>` 撤销受影响阶段及下游引用，保留原文件。

原型后续仍会改动时，先保存用户实际试玩的候选，再引用该候选。基础工程后续会扩展时，保留当前原生回读导出，供后续工作项核对，正式模块继续登记自己的运行证据。

阶段 3 完成后，标准目录中的同一 `projectId`、同栈后续工作项自动绑定 PROJECT 的阶段 1–3 整体摘要，自定义 PROJECT 路径用 `init --game-project <PROJECT路径>`。正式基础工程放入标准工作项目录。阶段 5–7 开始生产前须有同基线的已完成基础工程。核心循环重新确认后，即使技术方案相同，旧工作项也须复核受影响范围并按当前基线重新登记。`SCENE` 默认挂到 `content`，屏幕 HUD 使用 `--mount-layer hud`。瞬态层按类型挂到 `popups` 或 `toasts`。阶段 4 有视觉范围时选择适用的图片路线。

阶段 4 通过实际文件或原生编辑器回读收集 `architecture-structure` 证据。报告提供 `schemaVersion`、`workItemId`、`stack`、`templateVersion`、实测 `entryPoints` 和后到前的 `layers: [{id, mount, nativePath}]`。`mount` 引用模板职责，`nativePath` 记录实际对象路径，使用 `/` 分隔。同一屏幕宿主下的固定节点名为 `HudLayer`、`PopupLayer`、`ToastLayer`、`LoadingLayer`，弹窗层另记实测 `childCount: 0`。用 `nativeSourceRef` 绑定正式场景、显示宿主源码、Place 或原生结构导出文件。必需层齐全，未使用的可选层可省略。报告位于当前 `evidenceRoot`。

阶段 5 在 V1 冻结模板挂载点和 Grilling 决定，V3 在所挂层内细化结构。V5 的 `architecture-mount` 使用同次原生回读，记录 `schemaVersion`、`workItemId`、`stack`、`hostId`、`layer`、`nativePath` 和 `nativeSourceRef`。内容层回读必须属于本栈模板的 `ContentRoot`，屏幕层回读必须指向固定层中的实际对象。Roblox 的阶段 4 回读已保存的 `StarterGui`，V5 回读客户端 `PlayerGui`。

阶段 7 的跨模块用例通过现有系统覆盖映射关联已完成的同基线阶段 6 批次。涉及多个显示对象的用例直接核对，单一显示对象内实际跨模块的用例在范围中记 `crossModule: true`。其余单对象用例沿用阶段 5 的正式证据。

控制器核实记录及文件身份，用户确认和原生回读事实由执行者如实登记。CLI 的 `metadata.progress` 可直接用作最终回复末行，例如 `进度 5/V1·进行中`。
