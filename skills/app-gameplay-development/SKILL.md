---
name: app-gameplay-development
description: "按已确认的玩法规则实现游戏状态、输入响应、实体行为、反馈触发和可复现的验证。"
---

# 游戏玩法实现

将批准的玩法规则转成权威、可读、可测试的游戏状态与事件行为，保持输入、判定、反馈和存档之间一致。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 玩法目标和已确认规则；相关场景、实体、状态/存档模型；输入与暂停约定；目标帧率、平台和回归用例。

## 共用操作步骤

1. 先定位玩法状态的唯一权威来源、输入入口、场景生命周期、存档接口和既有事件总线，复用已存在的实体与组件。
2. 把规则写成状态表或前置条件—动作—结果：明确合法状态、边界数值、顺序、取消/重复输入及同时事件的优先级。
3. 将输入采集、规则判定、状态变更、表现反馈和持久化分层；玩法真值只在权威逻辑中更新，动画与特效不反向驱动判定。
4. 按单一玩法切片实施：先打通进入条件、主路径、失败/退出路径，再接入输入映射、音画反馈和局部提示。涉及关卡内容时按[内容生产](../app-domain-toolkit/references/game-content-playtesting.md#levels)核对正式数据/编辑器入口和实际消费者；需要批量或专用检查时按[工具选择](../app-domain-toolkit/references/game-content-playtesting.md#tools)复用现有能力，再补最小项目脚本。
5. 为关键状态转移补确定性测试或可重复手工步骤，覆盖极值、快速重复、暂停恢复、销毁/重载和存档回读。按[游戏 V1 专项验证](../app-domain-toolkit/references/game-characteristics.md#v1)从实际机制选择用例，优先验证最大不确定性，并将规则、对象、用例及真实结果交给 QA；白盒仍可选，不等待正式视觉。正式资源或实现调整时按[回归清单](../app-domain-toolkit/references/game-characteristics.md#regression)核对实际影响并复验，保留未受影响证据。
6. 提交改动范围、状态/事件变化、可复现操作、实际验证输出及未覆盖风险；用户可感知的手感和画面仍交独立验收。

Unity、Cocos 任务新增显示元素时，统一遵循[显示元素的编辑器还原](../app-domain-toolkit/references/editor-display-authoring.md)，同步交付正式可编辑源及适用的动态预览。

## 关键边界

- 只实现已批准规则；缺失且影响玩法方向的规则交回用户澄清，继续推进不依赖该决定的工程准备。
- 场景对象、输入系统、帧时序和序列化均须由当前游戏栈适配决定。
- 涉及场景切换或弹出层触发时，按[场景与弹出层统一加载](../app-domain-toolkit/references/reference-domain-display-ownership.md#场景与弹出层统一加载)复用加载服务，明确前台必要数据、请求替代／取消与失败恢复；目标挂载及输入边界就绪后才释放令牌，切换清理旧宿主任务与弹出层并隔离迟到回调。弹窗资源缓存不保存运行实例或业务活动，恢复状态及接口数据由业务层管理。

## 交付

- 按[三项最小约定](../app-creator-workflow/references/output-files.md#每项任务的最小约定)交付本次玩法结果、实际修改路径及验证结论；仅更新受影响的状态／事件、操作和回归，已有规则和证据直接引用，不另写整套说明。实际需要的运行验证与人工体验检查仍按当前功能及原生合同执行。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-gameplay-development [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

