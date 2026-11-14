# Bitmap Decomposition Standard

在高保真页面目标冻结后、任何正式资产生产前执行。V3 由实际源图推导拆解与规格，V4 才制作和导入。与[设计还原合同](../../flutter-domain-contracts/references/design-reconstruction.md)共同工作：合同是设计项、实现、消费者与当前证据的机器映射，`asset-manifest.md` 记录对应素材来源与制作事实，按相同 ID 引用，页面 design decision 不复制明细。

## 两步分类

1. 先判定内容所有权：runtime data、runtime-rendered UI 或 fixed production visual。
2. 只有 fixed production visual 才判断是否需要 bitmap。

Data 包括文本、数值、日期、图表值、进度、用户内容、运行时头像/照片、地图、远程媒体、二维码/条码和签名。UI 包括容器、控件、布局、mask、图表/二维码 renderer、确定性形状与 Flutter 可还原效果。Bitmap 包括固定摄影、插画、Logo artwork、纹理、背景装饰、自定义图标和 Flutter 无法准确重现的固定填充。

复合视觉必须按 ownership 拆分；不得把代表性 runtime data 裁切、生成、导出或打包为生产 bitmap。固定 frame、overlay、watermark、mask texture 或 decoration 应拆成独立 UI/bitmap 单元。

## 覆盖审计

依据已有明确规格、用户确认的图上标注或明确授权的自动分析结果组织覆盖审计；未经授权不自动分析截图。缺少影响拆解的边界或身份时记录待定并集中澄清，不把估计作为已确认要求；仅补受影响项，不增加现有编号确认之外的审批。

从后到前、从左上到右下扫描冻结图，覆盖页面/分区/边角/裁切背景、纹理、噪点、光晕、overlay、水印、mask、固定阴影、全部导航/动作/状态/装饰图标、Logo、分隔符和遮挡后的视觉。低透明度、裁切或纯装饰不是遗漏理由。

manifest 必须记录 region、layer order、visible element、owner、runtime variability、classification、设计项 ID、implementation ID、asset identity、消费者与 evidence。通过条件：零无 owner 元素、零 data-derived bitmap、每个背景和图标 placement/state 被覆盖、每个 bitmap candidate 只有一个生产决定、重复资产关联全部位置/状态。无导出资产时可记录 `N/A: no bitmap or exported visual assets`，但仍须完成合同中全部原生项的源图定位、结构、样式、状态和当前验证，不能结束 V3 或以全原生说明绕过覆盖。

## 编号图确认

位图编号图是在 exact frozen target 的副本上为候选 bitmap 画紧边界矩形与稳定数字；重复使用同号，不同状态/输出使用不同号。它只说明位图生产范围，不独立证明整个页面已拆解；所有可见原生、动态元素仍须在合同中提供可核对的源图区域。抽象 Widget 树或职责框图不能代替这些定位，也不能未经逐项分析宣布只需头像或全部原生。

沿用 V3 拆解和布局分别确认，源图区域定位也可作为可审阅拆解材料，不为无图片页面强制制作位图编号图；确认后 V4 才执行正式制作。实质改变已确认拆解或布局时 RETURN 到最早受影响阶段，按范围更新并确认，保留旧版。代表样本与单项替换不提升为正式资源或整页通过，不增加逐素材审批。记录真实消息、范围及合同引用，V5 当前完整组合仍由用户人工验收。
