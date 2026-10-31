# Bitmap Decomposition Standard

在高保真页面目标冻结后、任何资产生产前执行。本标准与 `asset-manifest.md` 共同工作；manifest 是 ownership、覆盖审计、编号映射和生产结论的唯一权威，页面 design decision 不复制明细。

## 两步分类

1. 先判定内容所有权：runtime data、runtime-rendered UI 或 fixed production visual。
2. 只有 fixed production visual 才判断是否需要 bitmap。

Data 包括文本、数值、日期、图表值、进度、用户内容、运行时头像/照片、地图、远程媒体、二维码/条码和签名。UI 包括容器、控件、布局、mask、图表/二维码 renderer、确定性形状与 Flutter 可还原效果。Bitmap 包括固定摄影、插画、Logo artwork、纹理、背景装饰、自定义图标和 Flutter 无法准确重现的固定填充。

复合视觉必须按 ownership 拆分；不得把代表性 runtime data 裁切、生成、导出或打包为生产 bitmap。固定 frame、overlay、watermark、mask texture 或 decoration 应拆成独立 UI/bitmap 单元。

## 覆盖审计

依据已有明确规格、用户确认的图上标注或明确授权的自动分析结果组织覆盖审计；未经授权不自动分析截图。缺少影响拆解的边界或身份时记录待定并集中澄清，不把估计作为已确认要求；仅补受影响项，不增加现有编号确认之外的审批。

从后到前、从左上到右下扫描冻结图，覆盖页面/分区/边角/裁切背景、纹理、噪点、光晕、overlay、水印、mask、固定阴影、全部导航/动作/状态/装饰图标、Logo、分隔符和遮挡后的视觉。低透明度、裁切或纯装饰不是遗漏理由。

manifest 必须记录 region、layer order、visible element、owner、runtime variability、classification、asset identity 与 evidence。通过条件：零无 owner 元素、零 data-derived bitmap、每个背景和图标 placement/state 被覆盖、每个 bitmap candidate 只有一个生产 verdict、重复资产关联全部位置/状态。无导出资产时记录 `N/A: no bitmap or exported visual assets`。

## 编号图确认

在 exact frozen target 的副本上为每个候选 bitmap 画紧边界矩形与稳定数字；重复使用同号，不同状态/输出使用不同号。图中不得出现名称、说明、图例、箭头或尺寸，不得框选 data、native Flutter UI 或仅包含 bitmap 的整个容器。

Controller 只向用户展示编号图，明确确认后才可生成、适配、提取、导出、透明化或切片。编号 membership、bounds、placement/state、crop、source、background、size 或 verdict 变化时必须重新生成版本并确认。所有编号到资产的映射和确认事实只写入 `asset-manifest.md`。
