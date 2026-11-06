# ESP32 页面和显示层领域证据

统一控制器继续负责 V0–V5 的状态、功能证据、视觉目标、用户确认及资源评审；本文只说明 ESP32 的 V2–V5 单目标补充。`PAGE` 表示设备上的一个界面；`DISPLAY_LAYER` 表示挂载在具体页面上的弹层。V2 不要求提前制作布局或素材。所有路径使用项目相对 POSIX 路径，`{ "path": "文件", "sha256": "小写 SHA-256" }` 简记为 **ref**；引用的文件必须是非空真实文件，摘要按其实际字节计算。以下示例中的 `REF` 是说明占位符，必须替换为真实 ref，不能当成通过证据。

历史阶段和复用来源引用的设备配置、布局、资源及其产物、源码快照、原始日志均使用版本化不可变工件；后续制作不得覆盖旧版本。实际工程源仍保存在其正式路径，证据快照不取代正式源，也不新建第二套布局真源或状态机。

`visual.domainEvidenceRef` 指向的 JSON 外层与公共单目标合同相同：`schemaVersion: "1.0"`、`workItemId`、`projectId`、`stack: "esp32"`、`workItemType`、`visualStageModel: "function-first-v1"`、当前 `visualStage`、`objectId`、`candidateId`、已在 V2 人工确认的 `referenceTarget`。显示层还需 `hostId` 和 `layerType`，与工作项一致。外层按阶段添加下列引用。

## V2：设备配置

`boardProfileRef` 指向实际记录，例如：

```json
{
  "chip": "ESP32-S3",
  "board": "项目目标板名称",
  "screen": { "width": 320, "height": 240, "colorFormat": "RGB565" },
  "sdk": { "name": "ESP-IDF", "version": "项目实际版本" },
  "gui": { "name": "LVGL", "version": "项目实际版本" }
}
```

板卡、芯片、格式与版本依据项目配置及实物说明填写；分辨率必须是正整数。`visual.reviews.V2` 所指真实用户确认必须包含 `boardProfileRef`，且与外层设备配置引用的路径和摘要一致。V2 和全部后续阶段均重新检查这个绑定；更换设备配置后不能沿用原确认。用户确认设备视觉目标后才能使用其对应的 V2 评审，真实评审与当前 V2 目标由公共门禁核验。

## V3：布局及拆解

外层保留 `boardProfileRef` 并增加 `layoutSpecRef` 和 `layoutSourceRef`。后者指向当前工作项留存的正式源版本快照，不能指向可变正式文件。布局 JSON 绑定同一设备配置和当前对象：

```json
{
  "schemaVersion": "1.0",
  "objectId": "home",
  "boardProfileRef": "REF",
  "screen": { "width": 320, "height": 240 },
  "sourcePath": "main/ui.c",
  "decompositionRef": "REF",
  "rootId": "screen",
  "nodes": [
    { "id": "screen", "parentId": null, "x": 0, "y": 0, "width": 320, "height": 240, "positioning": "relative", "references": ["viewport"] },
    { "id": "title", "parentId": "screen", "x": 8, "y": 8, "width": 304, "height": 24, "positioning": "relative", "references": ["screen"] }
  ]
}
```

`sourcePath` 指向真实存在的正式可编辑布局文件或组件代码，不能越出项目；`layoutSourceRef` 指向从该源实际留存的本工作项不可变快照，必须有非空内容和正确摘要，不得伪造。控制器不要求历史快照与现在的可变正式源字节相同。`decompositionRef` 必须等于工作项的 `visual.reviews.V3Decomposition` 文件身份。`visual.reviews.V3Layout` 必须包含匹配当前规格的 `layoutSpecRef`，V3 及之后每阶段复核；纯实现改动且布局规格和正式源位置未变时，可保留确认，另留当前源码快照并记录当前构建。布局几何、结构、定位或源路径变化须重新确认受影响布局。节点 ID 唯一，宽高为正整数、坐标为整数，父链必须汇入与设备分辨率一致的唯一根节点。

每个节点明确 `positioning` 和 `references`。屏幕根 `parentId` 为 null，引用固定稳定根 `viewport`；不得用真实节点占用该 ID 或声明额外稳定根。普通页面的节点均按相对布局定位，不能声明 `floatingKind`。显示层必须有唯一的浮层本体节点，节点 ID 与工作项 `objectId` 相同、父节点为屏幕根，`floatingKind` 为 `toast`（toast 类型）或 `popup`（其他受支持类型）。仅浮层本体可使用 `absolute`，后代必须使用相对定位且参照留在该本体子树中。布局规格需在项目资料中另行说明关键控件、字体、动态状态、交互范围与坐标语义；控制器的几何检查不证明可读、可点击或画面符合设计。

## V4：资源及预算

外层继续绑定设备与布局，增加 `assetManifestRef`。清单中的每项引用资源源文件、实际转换产物及注册文件；三者可以因实际工程结构指向同一个文件，但必须是项目中已存在的实际资料。

```json
{
  "schemaVersion": "1.0",
  "objectId": "home",
  "boardProfileRef": "REF",
  "layoutSpecRef": "REF",
  "budgetFlashBytes": 65536,
  "items": [
    { "id": "icon", "sourceRef": "REF", "generatedRef": "REF", "registrationRef": "REF", "flashBytes": 2048 }
  ]
}
```

`visual.reviews.V4` 的真实用户确认须包含匹配当前清单的 `assetManifestRef`；V4、V5 都重新检查，更新清单需新的当前确认。声明的各项 `flashBytes` 和预算为非负整数，合计不得超出预算；应附实际尺寸测量记录，数字本身不证明真实占用。完全由原生控件构成且没有外部资产时，使用 `items: []` 并填写非空的 `nativeOnlyReason`。公共 V4 资源评审仍须按实际素材或原生组件提供技术和人工证据。

## V5：真实运行与人工确认

外层继续绑定设备、布局和资源清单，增加 `runtimeContextRef`。上下文文件示例：

```json
{
  "schemaVersion": "1.0",
  "workItemId": "work-home",
  "objectId": "home",
  "candidateId": "candidate-a",
  "boardProfileRef": "REF",
  "layoutSpecRef": "REF",
  "layoutSourceRef": "REF",
  "assetManifestRef": "REF",
  "buildIdentityRef": "REF",
  "environment": "host-simulator",
  "runEvidenceRef": "REF",
  "interactionEvidenceRef": "REF",
  "performanceEvidenceRef": "REF"
}
```

`buildIdentityRef` 指向真实构建身份 JSON：

```json
{
  "schemaVersion": "1.0",
  "sourceRevision": "实际构建时的源码版本或内容身份",
  "boardProfileRef": "REF",
  "layoutSpecRef": "REF",
  "layoutSourceRef": "REF",
  "assetManifestRef": "REF",
  "binaryRef": "REF",
  "buildLogRef": "REF"
}
```

构建身份必须绑定与当前上下文相同的设备、布局、源码快照和资源清单；记录应基于实际编译的源码。`binaryRef` 是实际固件或主机执行产物，`buildLogRef` 是实际构建记录。源码版本非空，所引用文件及摘要必须有效。关联身份仅防止材料错绑，不能证明某个产物确已运行。

三项运行文件分别记录实际运行、关键交互和性能/资源检查的原始结果。`environment` 只能为 `host-simulator` 或 `device`；前者不能作为硬件驱动、显示、触控或峰值资源结果。真实设备情形还须设置 `deviceTarget` 为当前工作项 `action.target`，并设置 `approvalUserMessageRef` 与 `action.approval.userMessageRef` 一致；工作项须包含 `device` 动作及控制器已有精确批准。实际操作之前仍需执行控制器的 `check-action`，满足 F0/F1/F2/F4、动作、阶段及目标要求；事后有日志或在 JSON 中写批准不能代替授权。

`visual.reviews.V5` 所指真实用户确认中，`runtimeContextRef` 必须绑定同一个上下文及摘要。显示层上下文另需 `hostId`、`layerType` 和 `interactions`：`open`、`close`、`focus-restore` 各出现一次；每项为 `{"action":"open","status":"PASS","evidenceRef":"REF"}` 或 `{"action":"open","status":"NOT_APPLICABLE","reason":"具体原因"}`。显示层 V2、V3 拆解、V3 布局、V4 和 V5 的人工确认都必须绑定相同宿主与类型。

生成截图或导出画面只提供给用户人工检查；未获得用户视觉确认时保留待确认状态。控制器只能检查文件身份与记录之间的关系，不能证明执行发生、文本正确或用户消息真实，也不能替代硬件测试或人工视觉验收。
