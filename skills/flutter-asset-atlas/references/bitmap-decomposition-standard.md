# Bitmap Decomposition Standard

用户选定可编辑 Figma 稿后、正式资产生产前执行。V3 由已选节点及其真实属性推导拆解与规格，V4 才制作和导入；[设计还原合同](../../flutter-domain-contracts/references/design-reconstruction.md)承载设计项、实现、消费者与当前证据的机器映射，`asset-manifest.md` 记录对应素材来源与制作事实，按相同 ID 引用。

## 两步分类

1. 先判定内容所有权：runtime data、runtime-rendered UI 或 fixed production visual。
2. 只有 fixed production visual 才判断是否需要 bitmap。

Data 包括文本、数值、日期、图表值、进度、用户内容、运行时头像/照片、地图、远程媒体、二维码/条码和签名。UI 包括容器、控件、布局、mask、图表/二维码 renderer、确定性形状与 Flutter 可还原效果。Bitmap 包括固定摄影、插画、Logo artwork、纹理、背景装饰、自定义图标和 Flutter 无法准确重现的固定填充。

复合视觉必须按 ownership 拆分；不得把代表性 runtime data 裁切、生成、导出或打包为生产 bitmap。固定 frame、overlay、watermark、mask texture 或 decoration 应拆成独立 UI/bitmap 单元。

## 覆盖审计

依据已选 Figma 节点及其可测属性组织覆盖审计；必要时使用可核对的节点边界或经用户确认的已有标注。未经授权不自动分析截图。缺少影响拆解的边界或身份时定向补齐，不把估计作为已确认要求。

检查已选节点的父子结构、层序和可测属性，覆盖页面分区、背景、纹理、overlay、mask、图标、Logo、分隔符及相关状态；设计截图交用户人工检查。低透明度、裁切或纯装饰不是忽略已知设计项的理由。

manifest 必须记录 region、layer order、visible element、owner、runtime variability、classification、设计项 ID、implementation ID、asset identity、消费者与 evidence。通过条件：零无 owner 元素、零 data-derived bitmap、每个背景和图标 placement/state 被覆盖、每个 bitmap candidate 只有一个生产决定、重复资产关联全部位置/状态。无导出资产时可记录 `N/A: no bitmap or exported visual assets`，但仍须完成合同中全部原生项的源图定位、结构、样式、状态和当前验证，不能结束 V3 或以全原生说明绕过覆盖。

## 编号图确认

位图编号图可在确有沟通需要时表达素材范围，重复使用同号，不同状态或输出使用不同号。它只说明位图生产范围，不独立证明整个页面已拆解；所有原生和动态元素可直接以所选 Figma 节点及其边界定位，不强制另画编号图。抽象 Widget 树或职责框图不能代替设计节点，也不能未经逐项分析宣布只需头像或全部原生。

V3 从所选 Figma 稿直接形成必要还原交接；节点已表达清楚的拆解与布局无需再次分别确认，不为无图片页面强制制作编号图。V4 才执行正式制作；实质改变已选目标或交互时 RETURN 到最早受影响阶段，按范围更新并确认，保留旧版。样本与单项替换不提升为正式资源或整页通过，不增加逐素材审批；V5 当前完整组合仍由用户人工验收。
