# Roblox 领域证据采集与校验

公共控制器同步调用 `scripts/validate-evidence.mjs` 的 `validateRobloxEngineering(repo, work, manifest, pack)`，以及 `scripts/validate-visual.mjs` 的 `validateRobloxVisual(repo, work, {stage, target, envelope})`。返回的 `record-consistency` 仅表示合同检查通过。`schemas/evidence.schema.json` 是基础结构，跨文件和身份约束以校验器为准；`templates/` 仅供采集前填写，不能直接作为通过证据。

校验器不连接 Studio，不启动 Play，也不创建实际 MCP 调用；通过仅表示提交的材料在规则内相互一致，不能认证来源、阻止未标记的伪造或推断任意 Luau 的隐含副作用。合成测试夹具不能用于生产验收。截图和视觉效果交用户人工检查，并由现有公共门确认。

每份原生记录绑定工作项、项目、Roblox 栈、工作项类型和当前阶段。工程材料由公共 manifest 唯一的 `roblox-engineering` PASS 条目指向；视觉包装的 `robloxEvidenceRef` 必须带路径及 SHA-256。所有证据引用都必须在工作项 evidenceRoot 内；引用的文件必须非空、无符号链接且摘要一致。正式 `.luau` 或 `.rbxl`/`.rbxlx` 源要位于实施单元和工作项允许路径内。

Studio 身份使用 `studioId` 和 `place`：本地未发布 Place 使用 `kind: local`、稳定 `placeKey`、`savedAt` 及有摘要的本地 `snapshotRef`；已发布 Place 还需 `kind: published`、数字字符串 `placeId` 和 `universeId`。先真实保存并记录快照，再采集 Edit 回读及运行；保存与重新读取实际没有发生时不能声明 `saved-readback`。快照只按字节和记录字段绑定，不能证明 Studio 实际打开了该文件。

每个 `.luau` 正式源记录 `unitId`、`ref`、Studio 实例路径 `instancePath` 和 `readbackRef`。使用 Edit 上下文的 `script_read` 或 `execute_luau` 读取完整脚本文本并保留原始响应；磁盘文本与响应全文需相等（允许 BOM 和换行格式差异）。运行和输入采集的 `sourceRefs` 必须包含完整当前源路径及 SHA。若修改磁盘文件，应同步到 Studio 并重新采集；仅更新 SHA 不能证明同步。

采集 JSON 以 `roblox-mcp-capture/1.0` 记录 `origin: studio-mcp`、`execution: actual`、`workItemId/projectId/studioId`、`placeSnapshotRef`、`context`、`toolName`、`observedAt`、原始 `request` 和 `response`、`status`、实际 `effects`；Client 还须 `clientId`。保留工具实际返回内容，不要把示例、占位符或测试数据填成成功结果。`execute_luau` 请求必须绑定 `datamodel_type` 并记录实际执行负载；执行代码、试玩或 Open Cloud 调用要记录 `effectsBasis`。标记真实的采集仍仅为操作者声明，校验器无法认证。

MODULE、INTEGRATION 与 V1/V5 需要声明的 Server/Client 上下文运行检查；检查的预期和实际值相等且实际值出现在原始响应中，状态查询不能代替功能执行。键盘、鼠标和角色导航只属于 Client；输入与关联观察必须绑定同一客户端。其他阶段遵循实际工作项和已有质量门，RELEASE prepare 不要求重新启动 Studio。

副作用按实际操作声明并匹配工作项 action 的批准，不按工具名笼统视为本地。受保护采集绑定 `actionId`、`actionTarget`、`targetScope`，其中 `actionTarget` 与工作项 `action.target` 一致，目标使用 `universe:<数字>`、`place:<数字>` 或 `asset:<数字>`，scope 同时提供 `kind`、`id` 和 `allowedOperations`。Open Cloud 以 `METHOD /规范化端点` 精确列入允许范围并核对端点中的对象 ID；其他工具使用工具名。无法从端点直接定位目标时，`scopeEvidenceRef` 引用同一 Studio 的无副作用结构化读取，实际响应须唯一证明该目标及相关对象。准确识别代码或请求的全部实际副作用仍需人工审查，不应从合同通过推断安全。

V2 原生记录绑定对象、候选、冻结目标、Studio 和 Edit 回读；V3 `layoutSpecRef` 绑定实例路径、类型、父子关系和世界或屏幕坐标。V4 `assetManifestRef` 列出原生实例及外部资产；资源读取的原始响应须含可解析 JSON 节点 `{instancePath, className, properties}`，每个节点必须唯一，属性和值与同一节点关联。外部资产可用性必须有唯一实际结构化结果 `{assetId, status: "available", usable: true, moderation: "approved"}`；无法获取这种结构化实际结果时，该资产未验证，不能用文字推断可用性。明确无外部资产时仍须有实际原生实例回读。

V5 `runtimeContextRef` 包含 Client 身份、运行节点映射、完整源集合和输入到观察的轨迹；原始 JSON 对每节点绑定实际路径、类型及资产属性。显示层 V5 还必须在公共包装与原生文档绑定 `stateId` 和非零 `viewport`。公共清单的 `asset-import` PASS 精确指向当前目标的资源清单，V5 的 `roblox-runtime` PASS 精确指向当前目标的运行记录；V3/V4/V5 的人工记录分别引用对应布局、资源和运行资料。原生运行结果不能代替公共人工视觉确认。

## 屏幕 GUI 的相对停靠

只将实际 GUI 节点映射到屏幕布局；`GuiObject` 使用所属容器的 `screen-scale-offset`，世界对象仍使用 `world-studs`。位于 `BillboardGui` 或 `SurfaceGui` 内的 GuiObject 仍采用容器内二维位置，其世界宿主、投影和跟随行为另按世界合同处理。常见 GUI 类或 `ScreenGui` 不能标成世界坐标来跳过检查。

`ScreenGui` 与其子类是视口容器，本身不伪造 `Position`、`Size` 或 `AnchorPoint`。其 `screenInsets` 取真实枚举名 `None`、`DeviceSafeInsets`、`CoreUISafeInsets` 或 `TopbarSafeInsets`，`clipToDeviceSafeArea` 取真实布尔值；`None` 参照 `viewport`，其他值参照对应的 `safe-area` 边界。该标识只绑定所选 inset，并不证明它必然避开所有设备缺口或 Roblox 控件；按项目实际交互与设备检查覆盖。独立 Frame 根使用 `externalParent: {id, instancePath, className, sizeModifiers}` 绑定真实直接宿主；若宿主为 ScreenGui，还须记录 `screenInsets` 和 `clipToDeviceSafeArea`，为 GuiObject 时还须记录 `sizeConstraint`，并实际回读。

每个 GuiObject 在布局节点中记录 `anchorPoint: {x, y}`，`position: {xScale, xOffset, yScale, yOffset}`、同结构的 `size` 和实际 `sizeConstraint`（`RelativeXY`、`RelativeXX` 或 `RelativeYY`）；`positionReferenceId` 分别保持真实父级、同级或祖先参照，不能借位置关系重写功能父子树。`positionWriters` 必须恰好一个：`UDIM2` 表示原生父级参照；`UIListLayout`、`UIGridLayout` 表示实际父级布局组件负责；`SHARED` 仅用于原生 UDim2 无法直接表达的非父级参照。父布局存在时，不能声明其他位置写入者。`sizeWriters: {horizontal, vertical}` 各轴分别为 `UDIM2`、`LAYOUT` 或 `AUTOMATIC`，表示 Size 属性或排布输入的控制者；网格控制双轴尺寸，列表的 Flex 主轴和 Stretch 交叉轴由布局控制，内容自动尺寸可作为布局的输入。位置和尺寸权限分开，不因停靠而默认拉伸图片。

每个屏幕节点、独立外部宿主及跨世界坐标边界的 GUI 宿主声明 `sizeModifiers` 列表，采集记录的 `SizeModifiers` 枚举实际子级的 `UIConstraint` 与 `UIScale`；当前合同仅验证空列表。任何实际或计划存在的尺寸修饰器（包括 `UISizeConstraint`、`UIAspectRatioConstraint`、`UITextSizeConstraint`、`UIScale`）均须保留未验证，不能忽略后声称最终几何或尺寸所有权已验证。`SizeConstraint` 是 GuiObject 本身的原生轴映射属性，单独按真实属性回读。上述尺寸输入、限制和运行几何不应混为一个未经验证的最终尺寸结论。

容器使用 `layoutController` 绑定其直接子组件的 `instancePath`、`className`、`fillDirection`、`horizontalAlignment`、`verticalAlignment` 和 `sortOrder`。列表还须记录 `padding: {scale, offset}`、`wraps`、`horizontalFlex`、`verticalFlex`、`itemLineAlignment`；网格还须记录 `cellSize`、`cellPadding`（均为 UDim2）、`fillDirectionMaxCells`、`startCorner`。单项 Flex 使用 `flexItem: {instancePath, flexMode, growRatio, shrinkRatio, itemLineAlignment}`，与实际 GUI 子实例及所属列表关联。列表或网格负责的子项不重复设置另一位置驱动。

`SHARED` 必须给出具体 `sharedReason`、绑定当前实施正式 Luau 的 `sharedSourceRef`，及 `sharedDocking.horizontal/vertical` 中的 `self`、`reference`、`offset`、`tolerance`、`toleranceReason`。容差由当前项目的设计和测量条件确定，不能套用统一像素阈值。V5 以实际同坐标系的 `AbsolutePosition`、`AbsoluteSize` 计算双轴关系；已有实现只处理实测 `AbsoluteRotation` 为 0 的矩形，其他变换先保留未验证并提供明确坐标转换方案。拖拽或过渡等可选 `behavior` 记录 `reason`、`trigger`、`recovery`、`properties: ["Position"]` 和 `ownership: "EXCLUSIVE"`；父原生布局持有位置时不允许行为同时争写。当前 V5 快照核对恢复后的基准属性，不能单凭快照断言整个动画或拖拽轨迹通过。

V3 核对上述计划、引用和公共相对关系，不要求 V5 的正式对象提前装配。V4/V5 的 `layout.editObservationRef` 引用同一 Studio、同一已保存 Place 的 Edit `execute_luau` 结构化回读，包含实际节点 `Position`、`Size`、`SizeConstraint`、`AnchorPoint`、`AutomaticSize`、`IsGuiObject`、`LayoutControllers`、`FlexItems` 及 `SizeModifiers`；容器和组件还须包含各自实际属性。V5 再对 PlayerGui 当前客户端实例及其真实父布局执行同样的回读绑定。`inspect-nodes.luau` 自动枚举所选 GUI 的布局、Flex 和尺寸修饰器，目标节点和必要外部父级仍由执行者按实际项目填写。

[屏幕布局草稿](../templates/screen-layout-draft.json)展示单个普通按钮的字段形状；所有项目身份、路径、原生属性与回读引用均须替换为实际事实，示例尺寸和边距不是通用预算。

这些只校验采集记录、已声明写入者和可观察原生组件之间的一致性，不能认证采集来源，不能自动发现未声明的任意脚本写入，也不能由一次快照证明 resize、安全区变化或动态轨迹通过；相关源码、交互与多尺寸结果须通过实际运行另行采集和检查。视觉效果仍由用户人工确认。

`templates/inspect-nodes.luau` 只是可修改的只读采样模板。先替换路径，在所需真实上下文执行并保存原始结果；工具不支持、输出无法解析或实际值缺失时应报告未验证，不要手工补造结果。
