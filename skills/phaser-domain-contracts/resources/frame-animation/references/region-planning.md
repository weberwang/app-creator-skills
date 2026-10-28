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

图片来源中的 `canvas` 是全部最终帧共用的真实画布；原生成图保留实际尺寸及 SHA。打包逐帧核对最终画布，不按主体包围盒自动裁切、逐帧居中或改变缩放来抵消设计中的主体运动，也不通过放大输出 cell 掩盖源图漂移。`--region` 仍使用整画布坐标，`--anchor` 是区域内的资源坐标；它定义图集/运行时的映射基准，不要求角色根点在每帧处于相同屏幕位置。固定区域与内容留白变换沿用相同语义。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#生成参数核对与来源空间)。

## 按区域抽帧

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

```powershell
node <skill-dir>/scripts/video-to-atlas.mjs `
  --input-video art/animation-batch.mp4 `
  --region 16,16,320,288 `
  --anchor 160,264 `
  --output-sheet public/assets/mechanism-open.png `
  --width 160 --height 144 --fps 12 --no-loop `
  --animation-key mechanism-open --texture-key mechanism-open `
  --runtime-url assets/mechanism-open.png `
  --remove-background --background-color '#00ff00' `
  --edge-profile hard-edge --color-separation-verified

node <skill-dir>/scripts/video-to-atlas.mjs `
  --input-video art/animation-batch.mp4 `
  --region 352,16,640,400 `
  --anchor 320,200 `
  --output-sheet public/assets/impact-burst.png `
  --width 320 --height 200 --fps 12 --no-loop `
  --animation-key impact-burst --texture-key impact-burst `
  --runtime-url assets/impact-burst.png `
  --remove-background --background-color '#00ff00' `
  --edge-profile hard-edge --color-separation-verified
```

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

当前 `--fps` 同时控制抽样和播放，示例数值不代表类型默认节奏；游戏时间先按 [action-timing.md](./action-timing.md)整理。`--no-loop` 用于计划中的单次播放；结束保持、组合和事件按现有运行时合同记录，不能只改报告来伪造工具能力。未指定 `--region` 时处理整幅画布。`--output-report` 可指定报告路径；仅需要动画播放时通过 `--output-preview` 显式指定 HTML 路径，默认不生成网页，`--runtime-url` 使用实际部署 URL，并与资源清单 `spritesheet.runtime_url` 一致。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-region-planning.md#按区域抽帧)。

## 本栈配套资料

- [视频节奏整理](./action-timing.md#视频节奏整理)
- [效果与性能平衡](./action-timing.md#效果与性能平衡)
- [视频条数与消耗比较](#视频条数与消耗比较)
- [多区域图片](./image-inbetween.md#多区域图片)
- [SKILL.md 分类入口](../../../../app-stack-phaser/references/native-contracts.md#mode-phaser4-frame-animation--分类入口)
- [图片递归补帧](./image-inbetween.md)
