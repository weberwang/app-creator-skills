# 公共美术与动态体验验收

本合同定义公共证据格式；当前只对 Unity 可见对象的 V5 强制执行，其他技术栈不因该格式新增验收任务。质量判断复用当前 V5 人工确认，代理只检查记录和文件关系，不自动分析截图或录屏。

## 证据归属

公共 Evidence Manifest 使用现有 `items` 引用，不增加顶层美术字段：

```json
{
  "category": "art-experience-acceptance",
  "status": "PASS",
  "targetId": "main-default",
  "path": ".workflow-control/evidence/WI-ID/art-main.json"
}
```

`SCENE` 的每个当前目标必须有唯一条目，`targetId` 对应公共目标身份；同场景多状态/视口可引用同一文件，但不能用一个目标通过替代其他目标。独立 `DISPLAY_LAYER` 工作项只有一个条目且不带 `targetId`，文件中的情境绑定显示层对象、宿主及当前目标。

条目路径位于当前工作项真实 `evidenceRoot`，文件遵循[公共 schema](../schemas/art-experience-acceptance.schema.json)，可从[模板](../templates/art-experience-acceptance.json)填写真实事实。清单须绑定当前工作项、技术栈、实施包和 V5；不能借用其他工作项的文件。既有冻结记录保持原样，需要继续交付时按新合同重新验收，不双读旧美术字段。

## 文件内容与完成条件

- 绑定工作项、场景/显示层、美术 brief、候选及版本，记录真实人工确认人、时间、消息引用和原文。
- 五项人工质量结果为主题贴合、受众适配、玩法可读、观看舒适、美术完成度，必须逐项通过并说明理由。
- 逐目标覆盖正常游玩、重复反馈、事件峰值、同屏叠加。正常游玩必须适用；其余按事实登记适用或不适用及理由，不伪造采样。
- 适用情境绑定当前目标、状态、视口、目标文件和候选，引用真实录屏、有效时间片段、事件次数、峰值并发及人工观察。不同候选在情境中成对声明 `candidateId`/`candidateVersion`；同候选可使用顶层默认值。
- 不适用可按目标登记；同一情境不能同时存在通用和逐目标记录，避免串用。缺少实际运行材料标记未验证，不能用工程参数代填视觉通过。

Unity 原生 Manifest 只保留引擎事实及布局实测所需的技术 `candidateId`；美术候选版本和验收文件引用由上述公共记录唯一维护。具体 Unity 质量标准由 Unity 栈入口补充。
