# Skeleton 审计与升级

执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。

示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。

## Skeleton 审计与升级

> 适用技术栈：cocos、phaser。

`inspect` 和 `init` 必须从 JSON/Atlas 配置读取正式结构，不依靠截图测量。审计输出至少包含：

> 适用技术栈：cocos、phaser。

- Spine 原版本与目标 Runtime 版本；

> 适用技术栈：cocos、phaser。

- Bone、Slot、Skin、Attachment、Region Attachment、Mesh、Animation 统计；

> 适用技术栈：cocos、phaser。

- 完整动画名称；

> 适用技术栈：cocos、phaser。

- attachment path 到 Atlas Region 的映射、缺失和未使用 Region；

> 适用技术栈：cocos、phaser。

- 每个 Mesh 的 `vertices`、`triangles`、`uvs` 稳定 SHA-256。

> 适用技术栈：cocos、phaser。

升级候选和原 Skeleton 的 SHA-256 仅作可选追踪；`pack` 将实际使用的升级后 Skeleton 一并输出并记录 `build.skeleton_sha256`。最终报告必须同时展示升级前后统计、允许变更、未知变更、实际解析证据；哈希可选记录，不参与验收。
