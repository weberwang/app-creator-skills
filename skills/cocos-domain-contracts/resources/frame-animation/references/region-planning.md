# 通用动画分组与区域规划

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#通用动画分组与区域规划)。

## 分组规则

- 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#分组规则)。

## 从效果图推断尺寸

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#从效果图推断尺寸)。

## 视频参数与空间依据

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#视频参数与空间依据)。

### 视频条数与消耗比较

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#视频条数与消耗比较)。

### 图片分辨率约定

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#图片分辨率约定)。

## 生成参数核对与来源空间

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#生成参数核对与来源空间)。

图片来源中的 `canvas` 是全部最终帧共用的真实画布；原生成图保留实际尺寸，SHA 仅作可选追踪。打包逐帧核对最终画布，不按主体包围盒自动裁切、逐帧居中或改变缩放来抵消设计中的主体运动，也不通过放大输出 cell 掩盖源图漂移。`--region` 仍使用整画布坐标，`--anchor` 是区域内的资源坐标；它定义图集/运行时的映射基准，不要求角色根点在每帧处于相同屏幕位置。固定区域与内容留白变换沿用相同语义。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#生成参数核对与来源空间)。

## 按区域抽帧

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

```powershell
node <skill-dir>/scripts/video-to-atlas.mjs `
  --input-video art/animation-batch.mp4 `
  --region 16,16,320,288 `
  --anchor 160,264 `
  --output-sheet assets/animations/mechanism-open.png `
  --width 160 --height 144 --fps 12 --no-loop `
  --animation-key mechanism-open --texture-key mechanism-open `
  --remove-background --background-color '#00ff00' `
  --edge-profile hard-edge --color-separation-verified

node <skill-dir>/scripts/video-to-atlas.mjs `
  --input-video art/animation-batch.mp4 `
  --region 352,16,640,400 `
  --anchor 320,200 `
  --output-sheet assets/animations/impact-burst.png `
  --width 320 --height 200 --fps 12 --no-loop `
  --animation-key impact-burst --texture-key impact-burst `
  --remove-background --background-color '#00ff00' `
  --edge-profile hard-edge --color-separation-verified
```

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

当前 `--fps` 同时控制抽样和 `AnimationClip` 采样，示例数值不代表类型默认节奏；游戏时间先按 [action-timing.md](./action-timing.md)整理。`--no-loop` 对应描述清单中的单次 `Normal` 播放；结束保持、组合和事件按现有 Creator 动画合同记录，不能只改报告来伪造工具能力。未指定 `--region` 时处理整幅画布。`--output-report` 可指定报告路径；仅需要动画播放时通过 `--output-preview` 显式指定 HTML 路径，默认不生成网页。上方命令将图集作为普通静态 Creator 资源使用，因此输出在 `assets/animations/`，省略 `--creator-resource-path`，报告的 `cc.texture` 也不生成该字段。

只有明确按路径使用 `resources.load/loadDir` 时，才将图集写入 `assets/resources/` 并显式提供 `--creator-resource-path`；例如 `assets/resources/animations/impact-burst.png` 对应 `--creator-resource-path animations/impact-burst`。两者必须严格匹配，资源清单与报告 `cc.texture.creator_resource_path` 也须一致；路径在 `resources/` 外却提供 key、`resources/` 内缺少 key，或按文件名/目录自动补 key 都属于无效声明。Asset Bundle 动态加载不使用这条 `resources/` 路径规则，普通目录策略见[项目目录规范](../../../../cocos-game-architecture/references/project-structure.md#资源与引用)。帧图集通过 `spritesheet.creator_resource_path` 已足以声明动态用途，不重复添加 `resource_loading`。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

显式局部锚点使用 `--anchor x,y`，清单 `settings.anchor` 与报告 `input.anchor/settings.anchor` 一致。局部像素坐标从该区域左上角起算，允许半像素；清单将图像锚点映射到 `UITransform.anchorPoint` 的左下归一化坐标，Y 使用 `1 - image_y / cell_height`，不能直接把左上布局像素写入 `Node.position`。特效消失或 UI 隐藏的空透明帧按计划保留，整段全空才拒绝交付。


内部选定的 768p/2K 视频方案与按合同选择的音频属于生成计划和接收检查项，记录当前档位选择依据、视频条数、实际显示尺寸、时间映射、消耗估算与 `input.has_audio` 事实；图片仍沿用自身约定。比较与取舍放在设计工件，不扩展报告或 accepted schema，也不把估算变成文件门的新要求。结构通过不等于生成参数或人工验收通过。原视频与派生视频保留来源身份和空间布局；源中存在且任务要求保留的音轨随时间整理维护，图集交付不代表游戏音效已接入。

视频初始帧数由整理后的抽帧输入时长和目标 FPS 决定，不再要求 3、5、9、17…；输入时长应匹配已确认的游戏时间轴，而非生成器的固定交付时长。替换实际输入时先人工验收新视频再重抽；仅调整抽样 FPS 或输出尺寸可使用仍有有效验收的同一视频重抽并审阅，保留已修图成果。修改提示词或发现动作错误不默认重新生成视频。背景与外观修正优先直接处理抽帧图片，时间问题按[视频节奏整理](./action-timing.md#视频节奏整理)处理。图片按目标槽位补齐，不能套用视频的严格源时间戳规则。

## 本栈配套资料

- [视频节奏整理](./action-timing.md#视频节奏整理)
- [效果与性能平衡](./action-timing.md#效果与性能平衡)
- [视频条数与消耗比较](#视频条数与消耗比较)
- [多区域图片](./image-inbetween.md#多区域图片)
- [SKILL.md 分类入口](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)
- [图片递归补帧](./image-inbetween.md)
