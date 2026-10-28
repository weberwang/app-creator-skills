# 响应式视觉验证公共规则

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

## 响应式视觉验证

> 适用技术栈：cocos、phaser、threejs。

本文件是 QA 的测量字段、假通过禁令、代表性/完整 viewport 证据、同页面动态 resize、根因
分类、只读 Hook 和脚本用法的唯一详细事实来源。视觉验证由 `visual_validation.mode=usability|exact`
控制，默认 `usability`；契约字段和 V2/V3/V4/V5 门禁见总控的
“本栈 UI 布局技能 布局合同”（见本栈配套资料）。
资产流程只引用本文件，不复制规范。

## 适用阶段与结论

> 适用技术栈：cocos、phaser、threejs。

- **V3 F1**：核对当前候选与任务内响应式规格和布局合同一致；不在 F1 执行工程验证。

> 适用技术栈：cocos、phaser、threejs。

- **V5 F2**：确定性机器分别检查资源的满幅能力、锚点/字体/九宫格/缩放和预算；不能
  用算法验证或 Canvas ROI 代替生产场景证据。

## 契约输入

> 适用技术栈：cocos、phaser、threejs。

脚本接受当前技术栈校验器认可的完整 UI 布局合同 JSON 文件或内联 JSON，并从同一工件读取响应式测量配置。下方 JSON 仅示意部分测量字段，缺少必需根字段，不是完整合同，不能直接用于正式校验。

> 适用技术栈：cocos、phaser、threejs。

示例声明双方向，因此 `landscape` 视口和 resize 轨迹属于有效样本；单方向项目应按
`orientationPolicy.allowed` 删除另一方向的视口，并在支持方向内保留窄/宽尺寸、DPR 与连续 resize 覆盖。

## 每视口证据字段

> 适用技术栈：cocos、phaser、threejs。

输出 JSON 的 `viewports[]` 每项至少包含：

> 适用技术栈：cocos、phaser、threejs。

| 字段 | 含义 |
| --- | --- |
| `viewportRect` | 浏览器 CSS viewport，通常 `{x:0,y:0,width,height}` |
| `canvasRect` | Canvas 的 DOM `getBoundingClientRect()`（CSS 像素） |
| `logicalSize` | Hook 提供的逻辑画布宽高；没有 Hook 时为 `null` |
| `edgeGaps` | `left/top/right/bottom`，负值表示溢出 |
| `backgroundCoverage` | Hook 的背景矩形与 viewport 交集面积比例；缺失为 `null` |
| `backgroundFit` | 满幅背景的实际资源尺寸、`cover-v1` 模式及其与合同缩放、位置和裁切的比较结果 |
| `safeArea` | Hook 的四边 inset 和可用矩形；缺失为 `null` |
| `keyUiRects` | Hook 提供的关键 UI 矩形映射 |
| `scaling` | CSS 缩放、运行时实际物理 DPR（动态封顶 2）和逻辑到 CSS 的比例 |
| `screenshot` | 已执行视口的页面截图路径和尺寸；`exact` 模式还要求 `fullPage: true` |
| `hook` | 是否存在、版本和原始只读快照摘要 |

> 适用技术栈：cocos、phaser、threejs。

`resize[]` 还记录代表性相邻视口、触发前后 `canvasRect`/背景适配/关键 UI 变化、策略预期和页面是否
刷新（必须 `false`）。脚本会计算四边空隙和背景覆盖率；项目仍须结合截图判断
裁切焦点、留白、层级和可读性。每项测量还输出 `rootCause.primary/secondary`，
按下文分类标注主次，不把缺证包装成通过；单纯缺证保持 `unverified`，只有门禁曾错误
放行时才分类为验收问题。只有在 `exact` 或明确全覆盖需求时，契约声明的命名视口未全部执行才报告
`matrix.status: decision_gap`；默认 `usability` 允许使用代表性矩阵并记录实际覆盖。

## 只读验证 Hook

> 适用技术栈：cocos、phaser、threejs。

Hook 必须只读、可重复调用且返回 CSS 像素矩形；不得通过 Hook 直接宣称“通过”或构造
逻辑坐标替代 DOM 测量。缺 Hook 时，逻辑尺寸、背景覆盖、安全区和关键 UI 相关
结论均为 `unverified`；Canvas DOM 矩形仍可记录，但绝不假通过。Hook 的快照仅是
过程证据，不能替代已执行视口的截图；`exact` 模式下不能替代完整 viewport 截图。

> 适用技术栈：cocos、phaser、threejs。

合同要求满幅背景时，`viewport.backgroundFit.mode` 必须为 `cover-v1`。QA 使用 Hook 的
`background.sourceSize` 与 `background.rect` 重算两个轴的有效比例，并与
`max(viewportWidth/sourceWidth, viewportHeight/sourceHeight)` 比较；两个轴比例不一致、
缩放值不符、位置与冻结焦点的偏差超过 0.5 CSS 像素或裁切后出现空隙都失败。横竖屏资源可以不同，但不能把
方向判断当作缩放轴判断。

## 假通过禁令与证据要求

> 适用技术栈：cocos、phaser、threejs。

以下证据单独出现时必须判为未验证或失败：`backgroundCoversCanvas`、Canvas 不溢出、
Canvas ROI 截图、把参考图缩放到 ROI、控制台构建元素逻辑坐标、源码/单元测试/构建成功、
底色接近、元素存在或无控制台错误。契约要求满 viewport 且 viewport 为 `360x800`、
Canvas 为 `[0,80,360,640]` 时必须失败（上/下空隙 80），即使底色接近。

> 适用技术栈：cocos、phaser、threejs。

`exact` 模式或明确要求完整覆盖时，页面截图必须在真实 viewport 上以 `fullPage: true` 取得，并与结构化 JSON、视口、
DPR 实际有效值、状态、轨迹、语言、稳定帧和 resize 记录关联。默认 `usability` 至少为每个
代表性视口提供可读截图和结构化测量；缺少关键截图、越界、裁切、关键遮挡、不可读或交互失效只能写
`unverified`/失败，不能写“通过”。

> 适用技术栈：cocos、phaser、threejs。

当契约要求 Hook 时，快照必须带有效版本、至少一个正尺寸 `keyUiRects` 和已执行视口截图；
`safeArea` 只有在包含正尺寸 `rect` 时才算存在。`exact` 矩阵通过不仅比较名称，还只使用运行时
`viewportRect` 和 `scaling.physical.dpr` 逐项比较实际 width、height 和动态有效 DPR；默认 `usability` 只比较已执行代表性视口的关系和可用性。有效值必须为正有限数字且不超过 2。命令行声明值
不能覆盖实测值；声明 DPR 必须有效，原始设备值大于 2 会被封顶，字符串或非正数失败。`resize.required` 还必须在同一 page/context 中观测到
viewport 变化以及 Canvas 或关键 UI 的布局变化；刷新、跨 context 或只有声明变化均失败。

## 根因分类

> 适用技术栈：cocos、phaser、threejs。

报告使用以下互斥优先级；多因时标注主因/次因：

> 适用技术栈：cocos、phaser、threejs。

1. `方案缺失`：目标行为未定义或契约字段缺失（先回 V2）。

> 适用技术栈：cocos、phaser、threejs。

2. `执行问题`：契约已明确，但实现、资源绑定或适配算法不符（回 V4/V5）。

> 适用技术栈：cocos、phaser、threejs。

3. `验收问题`：缺陷存在却已越过门禁或证据不足仍给通过（撤销结论，回对应 F1/F2/F3）。

> 适用技术栈：cocos、phaser、threejs。

尚未给出通过结论的缺证只标记 `unverified`，不能为了填满根因字段而自动归为验收问题。

## 脚本用法

> 适用技术栈：cocos、phaser、threejs。

脚本 `scripts/responsive-visual-validation.mjs` 通过 Node ESM 动态导入 Playwright：

> 适用技术栈：cocos、phaser、threejs。

`--viewports` 可传 JSON 文件、内联 JSON 数组或逗号分隔的 `宽x高`；`--contract` 可传
JSON 文件或内联 JSON；`--identity` 必须传 JSON 文件或内联 JSON，至少包含
`candidate_sha256`、`scene_id`、`state_id`、`layout_contract_version` 和
`visual_baseline_version`；效果图还原在契约声明
`effect_image_reconstruction.applicability: effect-image`（或身份声明
`reconstruction_applicability: effect-image`）并另含 `target_sha256`。SHA 使用
`sha256:<64 位小写十六进制>`。`--output` 写入每个已执行视口的页面 PNG 和
`responsive-report.json`；`exact` 模式或明确全覆盖需求时要求完整页面 PNG。报告原样写入并校验该不可变身份；同时与输入的原始 UI 合同
交叉核对 scope scene/state、根合同版本、代码候选、视觉基线以及适用的冻结目标 SHA。
身份只从当前技术栈校验器接受的完整 UI 合同的上述权威字段派生，并直接复用 UI layout validator
完成全部根字段、结构与关系校验；只有完整合同校验通过才建立身份绑定。调用方自带的
`identityContract`、少量仿造根字段或其他摘要字段不受信任，也不能用来为报告自证。
普通 `not-applicable` 合同的 `visual_baseline_version` 与其可用的
`scope.bindings.visual_baseline` 直接绑定；冻结目标合同则与
`frozen_visual_target.visual_baseline_version` 绑定。
缺失、漂移或无效身份只能形成决策缺口。布局 parity/fidelity case 必须引用这份报告，
上游事实或当前受影响候选身份变化后对应旧报告失效，其他单元报告继续有效。工作流使用运行时动态 DPR，在同一 context/page 调用 `setViewportSize` 完成动态轨迹；
`dpr` 必须是已解析的有效值；原始 `deviceScaleFactor` 原样进入设备环境，报告同时保留原始实测值，并用统一解析器得到封顶为 2 的有效值。非法输入在验证前失败，绝不把错误
设备像素比记录计为同页 resize。Playwright 未
安装时只报告安装/运行缺口，不改变纯计算结论。

> 适用技术栈：cocos、phaser、threejs。

纯计算函数导出自同一脚本，可用 `node --test` 在无浏览器环境运行代表性测试：

> 适用技术栈：cocos、phaser、threejs。

测试至少覆盖 `360x800` 与 `[0,80,360,640]` 满视口失败、未定义留白 `decision_gap`、
FIT 不等于响应式通过和 resize 轨迹；严格满视口断言仅作为 `exact` 模式或明确精确需求的覆盖。
类、函数和复杂分支均应保留简体中文注释。

## 统一高分屏运行证据

> 适用技术栈：cocos、phaser、threejs。

新响应式合同的每个正式 Scene 和独立 `DISPLAY_LAYER` 必须从同一次真实运行采集
`viewportRect`、`canvasRect`、`logicalSize`、`backingSize`、`cssDisplaySize`、
`rawDevicePixelRatio`、`effectiveDevicePixelRatio`、`logicalToCssScale`、
`cssToPhysicalScale`、`cameraViewport`、`cameraZoom`、`cameraOrigin`、`safeArea`、
`edgeGaps`、`backgroundCoverage`、`keyUiRects`、`inputHitResults`、
`resizeTrajectory`、`pageReloaded` 和页面截图。Canvas backing 直接读取元素的
`width/height` 属性，不能用 CSS 尺寸乘声明 DPR 推导后冒充实测值。

> 适用技术栈：cocos、phaser、threejs。

每个正式 Scene 和独立 `DISPLAY_LAYER` 的默认 `usability` 都必须按 `orientationPolicy.allowed`
覆盖代表视口：允许竖屏时覆盖窄/标准竖屏，允许横屏时覆盖横屏/桌面宽屏；单方向项目只在该方向覆盖窄宽尺寸。
矩阵仍须覆盖 DPR 1、DPR 1.25 或 1.5、DPR 2、原始 DPR 大于 2 的封顶、同页连续 resize、DPR 降至 1、
DPR 不变时再次 resize。项目支持双方向时，连续 resize 还须覆盖方向切换。独立 `DISPLAY_LAYER` 另需 `open → interact → resize → close → restore`
轨迹和宿主同屏状态；宿主已通过不能替代该层证据。缺少真实测量统一为 `unverified`。

> 适用技术栈：phaser、threejs。

有效 DPR 必须等于原始正有限设备值封顶 2；非法、字符串、零和负值失败。布局、
安全区、程序化文字和命中区域均使用 CSS 逻辑像素，backing 与 CSS 显示尺寸按有效
DPR 对应。ScaleMode 由项目选择，但 `FIT`、`RESIZE`、`NONE`、Canvas 存在、构建成功、
源码含 DPR 计算或单张静态截图都不能单独驱动通过。
