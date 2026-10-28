# 固定画布图片递归补帧

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布图片递归补帧)。

## 适用与边界

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#适用与边界)。

时间轴推导记录与外部操作授权沿用[接入合同](./workflow-integration.md#动作设计与素材确认)。明确需求时在已有授权范围直接制作真实首尾和关键帧；首尾、每张关键帧及递归父图经人工确认后才放行依赖它的制作。实际图片生成/编辑交给 `image_generator` 子代理，动画执行代理提供完整任务包并集成结果；本地规划和打包脚本不会调用生成服务。实际生成、付费或外部写入必须处于已有授权范围，路线选择不构成授权。

## 固定画布

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布)。

尺寸规范化保持完整运动范围，以任务适用的统一画布变换/留白和资源锚点映射处理，必要时局部修图；同一动画不得逐帧改变缩放或锚点来抵消表演中的主体位移、转向和透视变化。不能逐帧按主体包围盒裁切、独立居中或拉伸身体来凑一致；需要改变资源锚点、运动包络或画布时更新内部时间轴记录，并直接制作受影响的真实候选供用户审阅。只有玩法语义或来源路线实质改变时才询问。若原图内容被裁断，扩图/补绘或在已有授权内重做该图，不能靠留白恢复已丢失内容。

## 首尾、关键帧与递归

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#首尾关键帧与递归)。

## 关键帧的一致性与衔接门

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#关键帧的一致性与衔接门)。

| 检查层 | 判断与放行依据 |
| --- | --- |
| 文件与映射 | 核对实际原图、父图、提示词、SHA、画布尺寸和整幅规范化。锚点数值相同仅说明记录相同，不说明实际主体落在同一位置；全图 Alpha 边界只判断完整入框，不能代替身体尺度或接触位置检查 |
| 类型相关的一致性 | 角色比较可识别身份特征、装备归属、动作因果与接触关系；按设计判断头身比例、轮廓、朝向、透视和遮挡变化是否合理，不因可见比例变化而判错。普通动画比较安装点、转轴与部件尺寸；特效比较宿主定位、约定风格及阶段形态；UI 比较布局边界、图标与文字。特效扩散、对象形变或主体位移按内部设计工件判断，不统一锁死外包围盒 |
| 阶段状态与衔接 | 检查当前帧是否实现准备、发力、转向、腾空、峰值、回收、消散或状态切换等本任务目的；与前后已确认状态比较运动方向、接触、遮挡和轨迹是否符合设计且可承接。预期的旋转、翻腾、透视缩短和大幅位移属于表演变化；保持造型却没有实现当前阶段，同样不能放行 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#关键帧的一致性与衔接门)。

## 提示词与逐层检查

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

| 内容 | 具体判断 |
| --- | --- |
| 共用约束 | 基线身份/材质/配色，固定画布、资源锚点映射、完整运动包络和透明背景；机位、造型、朝向、投影比例与根位置仅在任务明确要求时固定，并将机位与主体朝向分别描述；不烘入标签、索引或辅助线 |
| 父图与目标帧 | 左右父图索引与实际 SHA、对应游戏时点、本帧索引/时点和所属阶段；要表达的关键状态及与两侧衔接 |
| 类型规则 | 普通检查运动轴/安装点/状态；角色检查身份可识别性、重心、发力链/接触，并核对轮廓变化是否符合计划动作；特效检查峰值、透明与消散；UI 检查响应状态、文字/信息和布局边界 |
| 时间意图 | 内部工件记录的轨迹和速度变化、本帧距事件的先后关系、有意保持或跟随运动；不以“中间姿态”代替具体位置与动作 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

## 多区域图片

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#多区域图片)。

## 真实来源与修图记录

图片使用 `phaser4-image-frame-source/1` 来源清单，所有 `file` 相对 `--project-root`，包括图、父图、生成记录、参考基线和修图记录；拒绝项目外或符号链接逃逸。来源包含 `canvas`、`duration_ms`、`fps`、`loop` 和完整 `frames`。各帧索引必须连续覆盖计划，条目填写顺序可以不同，游戏时间必须对应槽位。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#真实来源与修图记录)。

## 打包与接入

```powershell
node <skill-dir>/scripts/images-to-atlas.mjs `
  --source-manifest evidence/animation.image-source.json `
  --project-root <project-root> `
  --output-sheet public/assets/animation.png `
  --width 128 --height 128 --anchor 384,767 `
  --animation-key animation --texture-key animation `
  --runtime-url assets/animation.png --no-remove-background
```

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#打包与接入)。

图片报告使用 `phaser4-image-atlas/1`，绑定来源清单路径、每帧实际图与记录，SHA 仅可选追踪、游戏时点、cell 和 Phaser 配置；不用 `video_path/source_timestamp`。accepted 使用 `phaser4-image-atlas-workflow/1`：

```json
{
  "schema": "phaser4-image-atlas-workflow/1",
  "status": "accepted",
  "work_item_id": "work-item-animation",
  "candidate_version": "candidate-animation-v1",
  "settings": { "fps": 6, "width": 128, "height": 128, "remove_background": false, "anchor": { "x": 384, "y": 767 } },
  "source_manifest": { "file": "evidence/animation.image-source.json", "sha256": "sha256:<实际摘要>" },
  "quality_report": { "file": "evidence/animation.image-atlas.json", "sha256": "sha256:<实际摘要>" },  "spritesheet": { "file": "public/assets/animation.png", "runtime_url": "assets/animation.png", "sha256": "sha256:<实际摘要>" }
}
```

以上摘要须替换为实际 64 位小写十六进制。资产继续登记 `route: frame-animation`；spritesheet 在 `runtime_outputs`，运行时 URL 与报告一致。通用资源清单的来源、许可和人工证据仍须填写，嵌套来源清单不会替代它们。固定 cell/透明留白属于帧动画合同，不把每个帧登记成普通静态资产来绕过帧动画文件门。若上游已经冻结为静态生成图片的 `individual/atlas_allowed=false` 合同，先按既有变更流程明确选择帧动画路线；本技能不自动覆盖该合同，也不通过虚报生产方法解除其限制。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#打包与接入)。

## 本栈配套资料

- [工作流接入合同](./workflow-integration.md)
- [共用时间轴](./action-timing.md#游戏时间先于来源)
- [一致性及衔接门](#关键帧的一致性与衔接门)
- [设计与美术的边界](./workflow-integration.md#设计与美术的边界)
- [图片分辨率约定](./region-planning.md#图片分辨率约定)
- [共用时间轴](./action-timing.md)
- [来源路线](../../../../app-stack-phaser/references/native-contracts.md#mode-phaser4-frame-animation--来源路线)
