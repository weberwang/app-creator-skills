# Unity 场景、UI 与资源

图片还原与运行展示遵循[图片尺寸规则](../../app-ui-layout/references/relative-layout.md#图片尺寸)：普通图片以最终源帧和导入密度确定逻辑尺寸，保持自身及祖先有效变换不改变该尺寸；只有明确配置合法九宫格的皮肤可改变显示框。布局与容器可按原有响应式规则调整，文字和图标不随皮肤整体拉伸。生成素材交付前仍可归一化到约定尺寸，实际显示尺寸需在对应 UI 坐标空间验证，不能把相机投影或屏幕物理像素直接当成源纹理尺寸。

## UI 与布局

普通 UI 图片的原尺寸要求保留独立屏幕装饰背景的等比覆盖例外；背景按明确的覆盖、焦点及裁切策略验证，不能将普通图标、交互或玩法对象归为背景来豁免。

Unity 的资源像素、Sprite 导入密度、UI 原生尺寸、Canvas／Panel 单位和屏幕像素分别核对。Web 共享合同的运行 DPR 封顶与图片生产 DPR 字段不作为 Unity 原生尺寸必填项；实际采用的 UI 路线决定原生尺寸及坐标换算。普通图片保持换算后的源逻辑尺寸，九宫格只改变显示框，不能通过节点或中间祖先整体缩放改变固定角边。

运行时 UI 默认 uGUI + TextMeshPro；需要编辑器扩展时默认 UI Toolkit。按已有项目选择一条 UI 技术路线，屏幕空间布局记录目标分辨率、CanvasScaler 或 PanelSettings、安全区、摄像机、输入坐标转换、显示方向、文本和目标平台预算。World Space UI 单独采用对应的世界空间设计，不套用屏幕布局数据。

记录可复核的节点与组件层级、父子依赖、锚点、Pivot、字体、文本溢出策略、组件状态、资源槽和交互所有者。只有确有使用证据才引入九宫格、Atlas、Addressables、TMP 字体表或响应式断点；不能根据静态图推断实际组件尺寸。

## 图片与动画素材

将创作源文件、送审候选、已确认目标图、正式资源和可再生成验证产物分开保存。效果图帮助定义视觉与布局，不得原图裁切后直接替代 Sprite/贴图；冻结目标还需由独立组件与资源组成，再在目标工程中验证。

逐件核对真实轮廓、有效内容边界、尺寸、透明和半透明区、光效边缘、裁切/切片值、颜色空间、Importer、材质贴图槽、纹理压缩与平台预算。PNG 带 Alpha 或导入成功均不能证明图像视觉合格。纯色背景移除只适用于边缘清楚、复杂度低的硬边素材；毛发、玻璃、发光和柔边要保留遮罩或重制。棋盘格透明预览不得混入正式像素。

图集、序列帧、动画和角色部件逐项绑定稳定资源 ID、子资源 localId、路径、枢轴、像素密度、Clip 帧率/时长/循环、Prefab 消费者和真实播放证据。需要 Spine、2D 骨架或复杂 3D 生产时分别采用有生产级交接与 QA 的专用能力，不能把静态概念图包装成可运行角色。模型几何/PBR 贴图默认 Blender MCP 生产；记录尺度、坐标、Pivot、拓扑、UV、法线、材质槽、LOD、骨骼、碰撞、贴图内存和 GLTF/FBX 导入结果。

## 导入与正式消费

先盘点原有共享资源与许可，登记正式来源、导入规格、稳定身份、唯一所有者和所有消费者。资源移动后同步运行引用、资源目录与验证记录。正式运行内容从项目登记的资源位置加载，不能从临时候选或审阅产物读取；仅在实际需要时启用 `Resources` 或 Addressables。

公共 V4 的资源导入证据与 V5 的 Scene/Prefab 运行证据分别保留：资源通过不能代替最终组合和播放检查。将视觉候选、导入/机器证据、F2 美术判断、F3 工程/运行证据分别记录。生成记录可追溯，但哈希仅作取证线索，不作为视觉合格、用户确认或授权凭证。

来源：`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-visual-assets`、`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-3d-modeling`、`unity-game-3d-texturing/references/pbr-texture-workflow.md`、`unity-development-workflow/references/artifact-storage.md`、`unity-development-workflow/references/resource-loading-and-frame-handoff.md`、`unity-development-workflow/references/3d-asset-workflow.md`。
