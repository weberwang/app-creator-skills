# 固定画布图片递归补帧

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布图片递归补帧)。

## 适用与边界

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#适用与边界)。

时间轴推导记录与外部操作授权沿用[接入合同](./workflow-integration.md#动作设计与素材确认)。先向用户说明当前方案并取得明确确认，再在已有授权范围制作真实首尾和关键帧；首尾、每张关键帧及递归父图仍须人工确认后才放行依赖它的制作。实际图片生成/编辑交给 `image_generator` 子代理，动画执行代理提供完整任务包并集成结果；本地规划和打包脚本不会调用生成服务。方案确认、图片确认和外部操作授权各自独立，路线选择不构成生成或付费授权。

## 固定画布

在设计工件中冻结 `宽×高`、视角/朝向、对象比例、语义锚点、允许位移、完整运动包络、安全边距、背景处理和目标 cell。对象比例和资源布局依据真实美术基线及完整运动范围，不能继承设计示意的占位造型或包围盒；遵守[设计与美术的边界](./workflow-integration.md#设计与美术的边界)。图片默认 **768p**，具体画幅换成明确宽高；当前已授权预算与工具能力内确需 **2K** 时，按[图片分辨率约定](./region-planning.md#图片分辨率约定)记录依据并纳入当前方案确认，用户确认后再制作。只有新增费用、超预算或改变授权范围时才另行请求批准。视频的少条数与消耗比较不替代图片的固定画布和逐张确认规则。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#固定画布)。

尺寸规范化保持完整运动范围，以统一缩放/留白和固定锚点处理，必要时局部修图。不能逐帧按主体包围盒裁切、独立居中或拉伸身体来凑一致；同一已确认目标下需调整锚点、运动包络或画布时，更新内部时间轴并返修受影响的真实候选供用户审阅。若空间调整改变核心动作方案，先重新说明并确认。原图内容被裁断时，扩图/补绘或在已有授权内重做该图，不能靠留白恢复已丢失内容。

## 首尾、关键帧与递归

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#首尾关键帧与递归)。

## 关键帧的一致性与衔接门

固定画布只约束图片容器，生成器仍可能重画主体尺度、构图、肢体关系和运动方向。在设计工件中区分必须延续的真实美术特征、当前阶段允许的变化和应当达到的动作状态；依据真实基线及相邻已确认帧作比较，不从占位示意取形体或关节点。

| 检查层 | 判断与放行依据 |
| --- | --- |
| 文件与映射 | 核对实际原图、父图、提示词、SHA、画布尺寸和整幅规范化。锚点数值相同仅说明记录相同，不说明实际主体落在同一位置；全图 Alpha 边界只判断完整入框，不能代替身体尺度或接触位置检查 |
| 类型相关的一致性 | 角色比较头壳/头部体量、躯干与肢段比例、机位、装备归属和接触关系；普通动画比较安装点、转轴与部件尺寸；特效比较宿主定位、约定风格及阶段形态；UI 比较布局边界、图标与文字。特效扩散、对象形变或角色位移按内部设计工件判断，不统一锁死外包围盒 |
| 阶段状态与衔接 | 检查当前帧是否实现准备、发力、反向、峰值、消散或状态切换等实际目的；与前后已确认状态比较运动方向、接触、遮挡和轨迹是否可承接。保持造型却没有实现当前阶段，同样不能放行 |

制作提示词明确“哪张是编辑目标、哪张负责前序动作、哪张负责终态或身份”，沿用主要编辑图中已经正确的构图和类型相关特征，只改变当前阶段需要改变或纠错的部分。可信参考只保留解决本帧问题所需的已确认图，不混入未确认图、被否定帧或未区分各图用途的造型图。局部返修可将当前未确认或被否定候选仅作为明确标识的编辑目标，指出待纠错部分及需保留的正确部分；身份、比例、动作与位置约束仍取自已确认真实基线及相邻帧，不能把候选中的缺陷当作必须延续的条件。返修输入与输出的真实身份记入修正记录，不把同索引的返修输入登记为自身父图，修正后重新人工确认才可作为后继的可信父图。角色提示词说明同一肢体/持物手的连续身份、承重脚和具体道具轨迹；后拉不等于换手，压髋不等于整体缩小，发力不等于未计划的主体放大。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#关键帧的一致性与衔接门)。

## 提示词与逐层检查

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

| 内容 | 具体判断 |
| --- | --- |
| 共用约束 | 基线造型/材质/配色，固定画布与视角，锚点、比例、完整运动范围、允许位移及透明背景；不烘入标签、索引或辅助线 |
| 父图与目标帧 | 左右父图索引与实际 SHA、对应游戏时点、本帧索引/时点和所属阶段；要表达的关键状态及与两侧衔接 |
| 类型规则 | 普通检查运动轴/安装点/状态；角色检查轮廓、重心、发力链/接触；特效检查峰值、透明与消散；UI 检查响应状态、文字/信息和布局边界 |
| 时间意图 | 内部工件记录的轨迹和速度变化、本帧距事件的先后关系、有意保持或跟随运动；不以“中间姿态”代替具体位置与动作 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#提示词与逐层检查)。

重点发现角色比例漂移、肢体数量/遮挡关系错误、锚点抖动、方向反转、闪色、局部粘连、半透明边缘断裂，以及未计划的保持或峰值偏移。人工检查目标显示尺寸；特效叠加深浅背景，UI 放入实际布局。文件门不证明动作、节奏或视觉正确，也不自动截图。

## 多区域图片

允许同一组源图的多个固定区域分别制作动画；每个区域单独记录用途类型、锚点、目标尺寸、FPS、关键帧位、有效帧选择和游戏时间映射。相同来源可以共享生成记录和原图，输出图集与来源清单按区域独立绑定。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#多区域图片)。

## 真实来源与修图记录

图片使用 `threejs-image-frame-source/1` 来源清单，所有 `file` 相对 `--project-root`，包括图、父图、生成记录、参考基线和修图记录；拒绝项目外或符号链接逃逸。来源包含 `canvas`、`duration_ms`、`fps`、`loop` 和完整 `frames`。各帧索引必须连续覆盖计划，条目填写顺序可以不同，游戏时间必须对应槽位。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#真实来源与修图记录)。

## 打包与接入

```powershell
node <skill-dir>/scripts/images-to-atlas.mjs `
  --source-manifest evidence/animation.image-source.json `
  --project-root <project-root> `
  --output-sheet public/assets/animation/animation.png `
  --width 128 --height 128 --anchor 384,767 `
  --animation-key animation --texture-key animation `
  --runtime-kind public --deployment-base /game/ --no-remove-background
```

此例假设源画布 768×768、底部语义根为 `(384,767)`；尺寸和根点必须取当前设计值。图片命令的相对来源和输出路径均以 `--project-root` 为基准。打包从来源清单读取 FPS/loop，不能另用 CLI 覆盖，不支持独立逐帧时长。`--output-report` 可指定报告路径；仅需要动画播放时通过 `--output-preview` 显式指定 HTML 路径，默认不生成网页；输出默认拒绝覆盖，修订时使用新候选路径。区域、等比缩放、Alpha 和内容矩形/锚点变换复用视频工具语义。运行加载需显式绑定 `runtime-kind`：public 根据 `project-root` 内的图集路径和 `deployment-base` 推导 URL；module-import 通过 `importer` 与精确相对 `specifier` 生成静态 `?url` 导入。`runtime-url` 只能核对已推导地址，不能独立提供来猜测路径。未绑定时可打包，但报告不生成 Three.js 加载合同，不能进入 accepted。

图片报告使用 `threejs-image-atlas/1`，绑定来源清单路径、每帧实际图与记录，SHA 仅可选追踪、游戏时点、cell 和 ThreeJS 配置；不用 `video_path/source_timestamp`。accepted 使用 `threejs-image-atlas-workflow/1`：

```json
{
  "schema": "threejs-image-atlas-workflow/1",
  "status": "accepted",
  "work_item_id": "work-item-animation",
  "candidate_version": "candidate-animation-v1",
  "settings": { "fps": 6, "width": 128, "height": 128, "remove_background": false, "anchor": { "x": 384, "y": 767 } },
  "source_manifest": { "file": "evidence/animation.image-source.json", "sha256": "sha256:<实际摘要>" },
  "quality_report": { "file": "evidence/animation.image-atlas.json", "sha256": "sha256:<实际摘要>" },  "spritesheet": {
    "file": "public/assets/animation/animation.png",
    "runtime_binding": { "kind": "public", "file": "public/assets/animation/animation.png", "deployment_base": "/game/" },
    "runtime_url": "/game/assets/animation/animation.png",
    "sha256": "sha256:<实际摘要>"
  }
}
```

以上摘要须替换为实际 64 位小写十六进制。模块导入路线的 spritesheet 绑定形如 `{ "kind": "module-import", "file": "src/assets/animation.png", "importer": "src/animation/loader.ts", "specifier": "../assets/animation.png?url" }`，其 `runtime_url` 为 `null`，报告 factory 含 `import atlasUrl from ...` 并以 `loadAsync(atlasUrl)` 加载。资产继续登记 `route: frame-animation`；spritesheet 在 `runtime_outputs`，报告的图集工件路径与 spritesheet 路径、绑定路径一致。通用资源清单的来源、许可和人工证据仍须填写，嵌套来源清单不会替代它们。固定 cell/透明留白属于帧动画合同，不把每个帧登记成普通静态资产来绕过帧动画文件门。若上游已经冻结为静态生成图片的 `individual/atlas_allowed=false` 合同，先按既有变更流程明确选择帧动画路线；本技能不自动覆盖该合同，也不通过虚报生产方法解除其限制。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-image-inbetween.md#打包与接入)。

## 本栈配套资料

- [工作流接入合同](./workflow-integration.md)
- [共用时间轴](./action-timing.md#游戏时间先于来源)
- [一致性及衔接门](#关键帧的一致性与衔接门)
- [共用时间轴](./action-timing.md)
- [来源路线](../../../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation--来源路线)
