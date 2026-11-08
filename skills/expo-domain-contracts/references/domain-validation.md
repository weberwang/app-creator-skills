# Expo 页面与显示层领域证据

公共控制器继续负责 V0–V5、功能证据和真实用户视觉确认；本合同只提供 Expo 的单目标补充，不创建第二套状态机。路径均为项目相对路径，引用简称 ref，格式为 `{"path":"实际文件","sha256":"对应文件的小写 SHA-256"}`。引用文件必须存在且非空。目录中的 JSON 模板仅展示字段，`REPLACE` 为无效占位符，必须以真实工作项和文件替换，不能伪造通过。

领域证据及其上游确认、构建身份、资源清单、源文件快照和原始输出使用本次工作项的不可变路径；不要覆盖仍有效的历史证据。控制器核对身份和文件关系，不能证明记录所称事件确已发生、应用外观正确或用户消息真实。技术通过与用户视觉确认分别记录。

## 公共外层与 V2

`visual.domainEvidenceRef` 指向实际阶段记录，包含 `schemaVersion: "1.0"`、`workItemId`、`projectId`、`stack: "expo"`、`workItemType`、`visualStageModel: "function-first-v1"`、`visualStage`、`objectId`、`candidateId` 和 `referenceTarget`；显示层额外声明与工作项相同的 `hostId`、`layerType`。外层模板为 [domain.json](../templates/domain.json)，按当前阶段保留适用字段。V2 只要求 `platformProfileRef`，不要求预先生成布局、资源、构建或运行材料。

`platformProfileRef` 指向 [platform-profile.json](../templates/platform-profile.json) 形状的实际资料：`platform` 为 `android`、`ios` 或实际已选的 `web`；`viewport.width/height` 是正的逻辑像素尺寸；`safeArea` 四边为非负逻辑像素，不能占满视口；`fontScale` 为正数；`expoSdkVersion` 和 `reactNativeVersion` 记录项目实际版本。逻辑像素和系统安全区按真实平台读数填写，不套用设备物理像素或 Flutter 专属字段。`visual.reviews.V2` 所指真实用户确认必须包含同一 `platformProfileRef`。变更该配置不能沿用旧确认。

## V3 布局与拆解

增加 `layoutSpecRef` 和 `layoutSourceRef`。前者指向 [layout.json](../templates/layout.json) 形状的布局规格并绑定相同平台资料、当前对象及 `visual.reviews.V3Decomposition`；`visual.reviews.V3Layout` 必须绑定当前 `layoutSpecRef`。节点坐标使用 `unit: "logical-pixel"`，根节点为屏幕逻辑视口且引用固定 `viewport` 稳定根；节点 ID 唯一、父链汇入该根、宽高为正数。资料还须填写 `safeAreaStrategy`、`keyboardStrategy` 和 `textScaleStrategy`，描述项目的实际处理。

`sourcePath` 指向实际项目中的正式组件或布局源；`layoutSourceRef` 指向本工作项留存的该源不可变版本快照，不能是同一个可变正式文件。历史快照不会强制等于之后的正式源；几何、结构、定位或正式源路径变化应重新确认受影响的布局。

普通页面节点遵循公共相对布局，不声明浮层本体。显示层必须包含唯一浮层本体：ID 等于当前 `objectId`，父节点是视口根，`floatingKind` 为 toast 类型对应 `toast`，其他受支持类型对应 `popup`；仅该本体可按公共规则使用绝对定位，其内部元素不能逃逸至外部参照。视觉与输入顺序按实际 React Native 树及原生 Modal 宿主确认；记录不证明控件可见或可交互。

## V4 素材

增加 `assetManifestRef`，指向 [asset-manifest.json](../templates/asset-manifest.json) 形状的清单，绑定当前对象、平台配置和布局。每项有唯一 `id` 与真实 `sourceRef`、`runtimeRef`、`registrationRef`；实际文件相同时允许引用同一文件。确实仅用原生控件、不含外部素材时可填写空 `items` 与非空 `nativeOnlyReason`。V4 确认须绑定当前 `assetManifestRef`；公共资源评审仍分别检查素材和用户决定。

## V5 构建、运行与确认

增加 `runtimeContextRef`，指向 [runtime-context.json](../templates/runtime-context.json)，绑定工作项、对象、候选、平台、当前配置/布局/源快照/资源，并引用 [build-identity.json](../templates/build-identity.json) 形状的构建身份。构建身份提供实际 `sourceRevision`、相同资料引用、`artifactRef` 和 `buildLogRef`；运行上下文提供 `runEvidenceRef`、`interactionEvidenceRef`。这些文件均须有真实内容与匹配摘要，不能仅以声明 PASS 或虚构文件代替实际运行。

`buildKind` 为 `development` 或 `release`。Android 对应 `android-emulator` 或 `android-device`，iOS 对应 `ios-simulator` 或 `ios-device`，且 `runtimeKind` 为 `native-build`；Web 对应 `web-browser` 与 `web-export`。构建身份与运行上下文的平台、构建类型及运行类型必须一致。Expo Go 与浏览器预览不能冒充原生构建，development build 不能冒充 release；系统启动屏的 release 观察按独立启动屏合同记录。

实际设备运行时须先取得公共控制器精确 `device` 授权；上下文的 `deviceTarget`、`approvalUserMessageRef` 分别等于工作项动作目标与批准来源。文件中的声明不能自行授权设备操作。显示层上下文还须声明匹配的 `hostId`、`layerType`，以及 `open`、`close`、`focus-restore` 各一次的 `interactions`，每项引用真实证据，或填写 `NOT_APPLICABLE` 和非空原因。

`visual.reviews.V5` 所指真实用户确认须绑定相同 `runtimeContextRef`；显示层的 V2、V3 拆解、V3 布局、V4 和 V5 确认均须绑定同一宿主和层类型。截图供用户人工检查，代理不自动分析或替用户填写视觉通过。
