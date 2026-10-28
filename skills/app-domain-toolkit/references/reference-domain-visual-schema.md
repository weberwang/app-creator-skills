# 视觉资源格式与透明合同

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

以下字段描述当前技术栈的领域证据合同；公共控制器的工作项、实施包和结果 Schema 以公共控制规范为准。

各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 视觉阶段 Schema

> 适用技术栈：cocos、phaser、threejs。

生成式位图的源文件、运行时文件和实际输出 MIME 只能是 `image/png` 或 `image/jpeg`，路径扩展名只能是 `.png`、`.jpg`、`.jpeg`；通用 `authored-raster` 不受此专用格式限制。声明 `expected_assets.width/height` 的生成式位图还必须绑定 `normalization_record`（`schema=image-normalization/1`），由 Sharp 记录当前归一化输入/输出路径、尺寸、Alpha、工具版本和完成时间；`alpha=true` 只能交付 PNG 并保留真实 Alpha，`alpha=false` 可交付 JPEG。首次生成输出比例不符时最多再生成一次；第二次仍不符时，若已有冻结裁切焦点和安全事实，可使用 `operation=crop-and-resize-to-contract`，并在 `aspect_ratio_correction` 中记录 `schema=aspect-ratio-correction/1`、触发原因、策略、两条真实原始生成 attempt（`attempt_id`、`generation_record_id`、`generated_at`、文件、实际宽高）、焦点和最大目标比例整数 `crop_rect`；两条 attempt 的实际来源路径必须真实且互不相同；不比较摘要，旧的仅路径数组结构明确拒绝，不要求两次尺寸相同，但第二次实际宽高必须等于当前归一化输入。归一化保持画布比例、Alpha 和主体边界，禁止把棋盘格烘焙成背景，也禁止非等比拉伸、contain、padding、复制边缘和裁切冻结 `reference_target`。已有真实透明图按 provided/reuse 资源合同接入，不伪造生成或去背记录。

> 适用技术栈：cocos、phaser、threejs。

本栈领域 Evidence Manifest、Implementation Package 与 Work Item JSON Schema 共用 `transparentBackgroundProductionRecord`、`transparencyEdgeProfile`、`transparencyGenerationCapability`、`transparencyMaskRecord` 与 `transparencyPreview`。生成资产 `expected_assets.alpha=true` 必须冻结 `transparency_requirements.strategy`（`background-removal|direct-alpha|mask-composition`）和 `edge_profile`（`hard-edge|semi-transparent|glow|soft-shadow|hair|glass|mixed`），记录必须镜像两项并提供非空 `edge_evidence`。所有策略的 generation record 顶层只记录实际 `generator/generator_version`、`parameters`、`postprocess`、`raw_source_file/raw_source_sha256` 和最终归一化 `source_file/source_sha256`；不重复要求顶层 `tool/tool_version`。透明输出声明 PNG 且由验证器解码证明 Alpha。背景去除条件 Schema 仅允许 `edge_profile=hard-edge`，要求不透明源图、背景 HEX、`color_separation_verified=true` 和实际尝试记录；直接 Alpha 的 `capability.tool/tool_version` 必须与 `generator/generator_version` 一致，并要求 `supports_true_alpha=true`、PNG 输出格式、已验证边缘类型及证据；遮罩路线单独记录源、mask、输出各自路径/SHA、处理工具/版本、参数和证据。只有去背路线可以带 `source_background_color` 和 `background_removal_attempts`。`raw_source_has_alpha` 仅表示原始文件是否有 Alpha 通道：RGBA 不透明背景允许为 `true`，不能由 `source_background_mode=opaque` 推断为 `false`。三个策略都要求同一实际候选的浅底、深底预览；构建与 PNG SHA 仅作可选追踪；V4 可 `inspection.status=pending`，V5 必须 `passed` 并附视觉证据。模式、边缘类型、能力和实际文件的跨字段一致性由工作流验证器复核；Schema 不会把工具声明当作真实 Alpha 像素证据。
