# 固定画布图片递归补帧

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布图片递归补帧)。

## 适用与边界

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#适用与边界)。

时间轴推导记录与外部操作授权沿用[接入合同](./workflow-integration.md#动作设计与素材确认)。先完成设计理念说明并取得用户对当前动作方案的明确确认，再在已有授权范围内制作真实首尾和关键帧；首尾、每张关键帧及递归父图仍须经人工确认，才放行依赖它的制作。实际图片生成/编辑交给 `image_generator` 子代理，动画执行代理提供完整任务包并集成结果；本地规划和打包脚本不会调用生成服务。实际生成、付费或外部写入必须处于已有授权范围，路线选择不构成授权。

## 固定画布

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布)。

尺寸规范化保持完整运动范围，以任务适用的统一画布变换/留白和资源锚点映射处理，必要时局部修图；同一动画不得逐帧改变缩放或锚点来抵消表演中的主体位移、转向和透视变化。不能逐帧按主体包围盒裁切、独立居中或拉伸身体来凑一致；需要改变资源锚点、运动包络或画布时更新内部时间轴记录，并直接制作受影响的真实候选供用户审阅。若改变已确认的目标感受、核心动作方案、玩法语义或来源路线，先重新说明并确认；局部空间修正沿当前方案返修。若原图内容被裁断，扩图/补绘或在已有授权内重做该图，不能靠留白恢复已丢失内容。

## 首尾、关键帧与递归

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#首尾关键帧与递归)。

## 关键帧的一致性与衔接门

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#关键帧的一致性与衔接门)。

| 检查层 | 判断与放行依据 |
| --- | --- |
| 文件与映射 | 核对实际原图、父图、提示词、画布尺寸和整幅规范化；SHA 只作可选追踪，不是放行条件。锚点数值相同仅说明记录相同，不说明实际主体落在同一位置；全图 Alpha 边界只判断完整入框，不能代替身体尺度或接触位置检查 |
| 类型相关的一致性 | 角色比较可识别身份特征、装备归属、动作因果与接触关系；按设计判断头身比例、轮廓、朝向、透视和遮挡变化是否合理，不因可见比例变化而判错。普通动画比较安装点、转轴与部件尺寸；特效比较宿主定位、约定风格及阶段形态；UI 比较布局边界、图标与文字。特效扩散、对象形变或主体位移按内部设计工件判断，不统一锁死外包围盒 |
| 阶段状态与衔接 | 检查当前帧是否实现准备、发力、转向、腾空、峰值、回收、消散或状态切换等本任务目的；与前后已确认状态比较运动方向、接触、遮挡和轨迹是否符合设计且可承接。预期的旋转、翻腾、透视缩短和大幅位移属于表演变化；保持造型却没有实现当前阶段，同样不能放行 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#关键帧的一致性与衔接门)。

## 提示词与逐层检查

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

| 内容 | 具体判断 |
| --- | --- |
| 共用约束 | 基线身份/材质/配色，固定画布、资源锚点映射、完整运动包络和透明背景；机位、造型、朝向、投影比例与根位置仅在任务明确要求时固定，并将机位与主体朝向分别描述；不烘入标签、索引或辅助线 |
| 父图与目标帧 | 左右父图索引、实际文件和可选 SHA、对应游戏时点、本帧索引/时点和所属阶段；要表达的关键状态及与两侧衔接 |
| 类型规则 | 普通检查运动轴/安装点/状态；角色检查身份可识别性、重心、发力链/接触，并核对轮廓变化是否符合计划动作；特效检查峰值、透明与消散；UI 检查响应状态、文字/信息和布局边界 |
| 时间意图 | 内部工件记录的轨迹和速度变化、本帧距事件的先后关系、有意保持或跟随运动；不以“中间姿态”代替具体位置与动作 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

## 多区域图片

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#多区域图片)。

## 真实来源与修图记录

图片使用 `cocos-image-frame-source/1` 来源清单，所有 `file` 相对 `--project-root`，包括图、父图、生成记录、参考基线和修图记录；拒绝项目外或符号链接逃逸。来源包含 `canvas`、`duration_ms`、`fps`、`loop` 和完整 `frames`。各帧索引必须连续覆盖计划，条目填写顺序可以不同，游戏时间必须对应槽位；SHA 字段可选，仅用于追踪实际文件身份，不作为验收门。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#真实来源与修图记录)。

| 字段 | 含义 |
| --- | --- |
| `index/game_time_ms/kind` | 游戏帧位、毫秒与 endpoint/keyframe/inbetween 类型；不是视频来源时间戳 |
| `source_image` | 实际生成原图的 file；SHA 可选，保留其实际输出尺寸 |
| `image` | 最终固定画布图片的 file；SHA 可选，打包使用此图 |
| `generation_record` | 实际生成记录 JSON 的 file，SHA 可省略，包含非空 prompt、reference_images 与 output_image；输出绑定 source_image，真实参考包含父图 |
| `parents` | 实际用于生成的父图快照 `{index,file,sha256?}`；SHA 可选，中间帧必须两个父索引且位于两侧，依赖无环 |
| `repairs`（有修正时） | `{before,after,record}` 的顺序链，各项绑定实际 file，SHA 可选；从 source_image 连到 image，record 记录问题、方法和前后身份 |

尾端点引用首帧；阶段关键帧可引用至多两张已制作图。生成记录可附实际返回的工具信息；未返回的模型、版本、种子或记录 ID 标记未提供，不捏造。若提供图像 SHA，它只能辅助核对文件身份，不能证明生成器遵循提示词，也不能替代人工确认。

修正文件使用新路径/版本，不覆盖原图、父图快照或已有修图。父图快照必须来自该父帧的原图、最终图或修正链。父图后来修正时保留子帧当时实际引用的父图文件身份；若追踪了 SHA，则保留真实旧值并检查其所有后代是否继承缺陷。需要修复的后代局部修正或在授权内重新生成，确认仍可用的后代保留并记入人工审查。禁止改写旧生成记录来伪造新的父图关系。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#真实来源与修图记录)。

## 打包与接入

```powershell
node <skill-dir>/scripts/images-to-atlas.mjs `
  --source-manifest evidence/animation.image-source.json `
  --project-root <project-root> `
  --output-sheet assets/animations/animation.png `
  --width 128 --height 128 --anchor 384,767 `
  --animation-key animation --texture-key animation --no-remove-background
```

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#打包与接入)。

图片报告使用 `cocos-image-atlas/2`，绑定来源清单路径、每帧实际图与记录，SHA 仅可选追踪、游戏时点、cell 和 Cocos 配置；不用 `video_path/source_timestamp`。报告内的 `cc` 为 `cocos-creator-frame-atlas/2` 描述清单，只说明待接入的 Creator `SpriteFrame`、`UITransform` 与 `AnimationClip`，不代表这些资产已物化。默认图集是 Scene/Prefab 静态 UUID 引用的普通资源，accepted 的 `spritesheet.file` 使用 `assets/animations/` 等已规划目录，并省略 `creator_resource_path`；报告 `cc.texture` 同样省略该字段。accepted 使用 `cocos-image-atlas-workflow/1`：

```json
{
  "schema": "cocos-image-atlas-workflow/1",
  "status": "accepted",
  "work_item_id": "work-item-animation",
  "candidate_version": "candidate-animation-v1",
  "settings": { "fps": 6, "width": 128, "height": 128, "remove_background": false, "anchor": { "x": 384, "y": 767 } },
  "source_manifest": { "file": "evidence/animation.image-source.json", "sha256": "sha256:<实际摘要>" },
  "quality_report": { "file": "evidence/animation.image-atlas.json", "sha256": "sha256:<实际摘要>" },  "spritesheet": { "file": "assets/animations/animation.png", "sha256": "sha256:<实际摘要>" }
}
```

示例摘要仅用于展示可选追踪字段；如填写，须为对应实际文件的 64 位小写十六进制值。资产继续登记 `route: frame-animation`；spritesheet PNG 在普通资源目录下并登记于 `runtime_outputs`，该登记字段不表示动态加载。只有明确通过 `resources.load/loadDir` 按路径动态加载时，才将图集置于 `assets/resources/`，并同时在 spritesheet 与报告 `cc.texture` 中填写相对 `assets/resources/` 的无扩展名 `creator_resource_path`，例如 `animations/animation`。此 key 必须匹配实际文件：`assets/resources/animations/animation.png` 对应 `animations/animation`；资源位于 `resources/` 外却填写 key，或位于 `resources/` 内但缺 key，均应拒绝。不要根据文件名或目录补造 key。图集的显式 `creator_resource_path` 已声明动态用途，不必在通用清单重复写 `resource_loading`；Asset Bundle 动态加载不要求将资源移入 `resources/`。普通资源目录选择见[项目目录规范](../../../../cocos-game-architecture/references/project-structure.md#资源与引用)。通用资源清单的来源、许可和人工证据仍须填写，嵌套来源清单不会替代它们。固定 cell/透明留白属于帧动画合同，不把每个帧登记成普通静态资产来绕过帧动画文件门。若上游已经冻结为静态生成图片的 `individual/atlas_allowed=false` 合同，先按既有变更流程明确选择帧动画路线；本技能不自动覆盖该合同，也不通过虚报生产方法解除其限制。

Creator 资源导入和节点/组件/动画接入按[Creator MCP 协议](../../../references/cocos-mcp-protocol.md)执行，先读取实时 `tools/list` schema；禁止手写 `.meta`、`.scene` 或 `.prefab`。`assetAdvanced_refresh_assets_and_wait` 只等待 `.meta` 存在，随后仍须按协议读回资源信息、UUID 和可发现的子资源。若当前工具 schema 无可用 `SpriteFrame` 子资源查询或所需编辑能力，停止受影响接入并报告 pending/blocked。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#打包与接入)。

## 本栈配套资料

- [工作流接入合同](./workflow-integration.md)
- [共用时间轴](./action-timing.md#游戏时间先于来源)
- [一致性及衔接门](#关键帧的一致性与衔接门)
- [设计与美术的边界](./workflow-integration.md#设计与美术的边界)
- [图片分辨率约定](./region-planning.md#图片分辨率约定)
- [共用时间轴](./action-timing.md)
- [来源路线](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--来源路线)
