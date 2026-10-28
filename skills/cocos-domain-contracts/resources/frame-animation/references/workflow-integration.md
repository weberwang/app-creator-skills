# 通用帧动画工作流接入合同

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#通用帧动画工作流接入合同)。

| 步骤 | 产物 | 停止条件 |
| --- | --- | --- |
| 表演构思与岗位安排 | 导演兼任或独立委派及理由、观看体验、动作亮点、完整段落、空间与朝向演变、跨类型配合 | 先明确核心表演，再安排资源；复杂任务先交接导演构思与依赖，不各自设计冲突段落，不新增导演审批门 |
| 动画与批次规划 | 用途类型及对应规则、独立单元时间轴、事件、播放方式、FPS、尺寸推理、区域与输出 cell；视频的 768p/2K 排布、条数与整组消耗比较 | 完整行为不因阶段或拳数拆生成任务；保留既有输入机制，合批不牺牲完整范围与可读像素，类型不决定批次数量 |
| 动作分析与设计理念说明 | 内部保存动作依据、设计取舍、完整阶段表与事件说明及当前版本；方案完成后、制作前向用户阐述目标感受与动作依据 | 说明后等待用户明确确认当前方案；确认前不进入素材制作和具体实现，无法推导的玩法事件、时长或行为权限先澄清 |
| 提示词与真实候选 | 表演过程与当前参数＋类型规则＋身份与资源要求，每批/帧保存；视频采用推荐的 768p/2K 合批与消耗方案，图片按自身分辨率约定，声音按任务合同 | 用户已确认当前动作方案后，在已有授权范围制作并交付真实候选/预览与简短检查点；外部操作仍受既有授权约束 |
| 视频整理 | 原视频、实际尺寸/音轨、校准区域、有效区间与阶段重定时派生来源 | 不可解码、区域未定或时间偏差未处理时修正；源视频时长不代替游戏时长 |
| 视频人工验收 | 实际抽帧输入视频的实际路径、区域与时间映射、检查要点和用户验收依据 | 未验收、验收失败或视频/映射变化时不抽帧；修正说明不代替当前视频验收 |
| 图片来源 | 固定画布首尾、逐张确认的必要关键帧、递归计划、真实双父图与完整帧位 | 同一连续行为按前序已确认姿态承接；当前帧经一致性及衔接审阅后才推进后继，父图缺陷先修；原图、修图和生成记录齐备，SHA 仅可选追踪，复杂运动不只依赖首尾 |
| 图集 | 视频抽帧或图片清单打包，每区域独立固定 cell、报告与 HTML | 固定区域裁剪后处理背景和等比缩放；参数变化要重建，保留已修图成果；图片循环闭合参考不入图集 |
| 审阅与接入 | 浏览器播放审阅、Cocos 合同 | 动作和外观问题均修对应图片并更新图集与证据；最终动画按游戏要求验收；运行态在全局 V4 验证 |

## 动作设计与素材确认

各职业按[共用设计交付与验收检查点](./intent-driven-design.md#设计师交付与验收检查点)及对应分类参考交付设计依据、类型专属设计内容和人工检查清单。V2 将设计决定与阶段/事件、预期可见现象、参数推导理由关联；V3 沿用该清单审阅真实素材与完整序列，记录当前候选、用户结论和具体偏差；V4 核对既有触发、事件与切换。当前方案使用任务推导的具体建议值，不设跨任务的固定设计参数；未具备检查情境的项保留未验证，不用方案确认或结构检查代替视觉验收。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#动作设计与素材确认)。

设计工件保存当前 Work Item、候选版本、来源路线、阶段/事件参数、实际文件及用户对方案和真实素材的反馈，不放入正式 `asset.runtime_outputs`，不扩展报告或 accepted schema。动作方案确认后，首次素材交付提供真实视频候选/预览或真实图片首帧及关键帧，并附与设计理念对应的简短检查点；素材交付不重复确认文字复述。用户确认实际素材时可同时接受该素材所表现的时序。不新增几何动画、骨架演示或占位播放页作为确认材料。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#动作设计与素材确认)。

## 真实素材审阅与验收

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#真实素材审阅与验收)。

### 设计与美术的边界

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#设计与美术的边界)。

## 视频提示词

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#视频提示词)。

## accepted 资源文件门

两条来源均登记 `asset.route: frame-animation`。视频合同和下方抽帧修正规则只在视频路线读取；图片的来源清单、生成/父图/修图证据及 `cocos-image-atlas-workflow/1` 示例见[图片打包与接入](./image-inbetween.md#打包与接入)。文件门按 schema 分派，图片不用 `video_prompt/source_video/source_timestamp`。通用资产清单的来源、许可与人工证据仍需填写。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#accepted-资源文件门)。

图片来源阶段先执行[一致性与衔接门](./image-inbetween.md#关键帧的一致性与衔接门)，不能把全部关键帧独立生成后才第一次检查相邻关系。固定画布和锚点核对通过，或存在可选 SHA 追踪值，都不代表实际对象比例、接触或轨迹正确；首尾、每张关键帧及递归父图须经用户逐张确认后，才能放行依赖它的生成，最终完整序列验收仍单独进行。发现问题暂停受影响依赖，保留可用成果并直接返修同目标候选、交付前后对照；结构检查通过、补帧数量增加或旧首尾确认不能替代当前帧的视觉确认。检查点、确认与返修状态记录在设计工件，不扩展来源、报告或 accepted 合同。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#accepted-资源文件门)。

视频路线每个动画的 `asset.frame_animation` 绑定提示词、真实视频、自己的报告和 spritesheet 路径；需要动画播放时通过 `--output-preview` 生成并绑定预览；SHA 仅可选追踪。共享输入时，提示词和视频绑定可以相同，区域与独立图集不能混用。文件门读取实际视频，核对区域位置与宽高、真实显示画布边界、FPS、帧数、输出 cell、去背景配置、图集尺寸与 Creator 帧范围。图集 PNG 默认放在 `assets/animations/` 等普通资源目录，并登记在 `asset.runtime_outputs`；该字段记录产物位置，不声明加载方式。只有图集明确通过 `resources.load/loadDir` 按路径动态加载时，才将文件放入 `assets/resources/` 并填写 `spritesheet.creator_resource_path`。此值与报告 `cc.texture.creator_resource_path` 同时出现且必须一致，都是相对 `assets/resources/` 的无扩展名路径，例如 `animations/mechanism-open`；静态 UUID 引用图集时省略两处字段。报告 `cc` 只描述预期的 `SpriteFrame`、`UITransform` 和 `AnimationClip` 关系，不证明 Creator 资产已经创建；不得根据文件名或目录自动补造动态加载 key。

视频的 accepted 合同使用 `cocos-video-atlas-workflow/1`，其 `quality_report` 指向外层 schema `cocos-video-atlas/2`，报告中的 `cc` 使用 `cocos-creator-frame-atlas/2`。以下为 accepted 字段示例：

```json
{
  "schema": "cocos-video-atlas-workflow/1",
  "status": "accepted",
  "work_item_id": "work-item-animation-batch",
  "candidate_version": "candidate-animation-batch-v1",
  "settings": {
    "fps": 12, "width": 160, "height": 144, "remove_background": true,
    "region": { "x": 16, "y": 16, "width": 320, "height": 288 },
    "anchor": { "x": 160, "y": 264 }
  },
  "video_prompt": { "file": "evidence/animation-batch.prompt.txt", "sha256": "sha256:<64位十六进制>" },
  "source_video": { "file": "art/animation-batch.mp4", "sha256": "sha256:<64位十六进制>" },
  "quality_report": { "file": "evidence/mechanism-open.video-atlas.json", "sha256": "sha256:<64位十六进制>" },  "spritesheet": { "file": "assets/animations/mechanism-open.png", "sha256": "sha256:<64位十六进制>" }
}
```

上例是普通静态资源：Scene/Prefab 通过 Creator UUID 引用图集，清单与报告都省略 `creator_resource_path`。若明确改为 `resources.load('animations/mechanism-open')`，则文件放在 `assets/resources/animations/mechanism-open.png`，并在 `spritesheet` 和报告 `cc.texture` 中同时填写 `creator_resource_path: "animations/mechanism-open"`；该 key 必须与相对 `assets/resources/` 的实际文件路径一致。`resources/` 文件缺 key、目录外文件带 key、或仅凭名字推导 key 都应拒绝。帧动画的这个显式字段本身就声明动态用途，无需在通用资源清单重复填写 `resource_loading`。资源目录统一规则见[项目目录规范](../../../../cocos-game-architecture/references/project-structure.md#资源与引用)。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#accepted-资源文件门)。

显式 `settings.anchor` 是区域内部的局部语义根坐标，与报告 `input.anchor/settings.anchor` 绑定一致；省略时由工具使用底部中心建议点（源宽/2、源高-1）。每份报告都必须包含 `cell.source_anchor`、实际缩放内容矩形 `cell.content_rect` 和 `cell.target_anchor`，整画布模式也适用。文件门核对显式或默认源点与缩放留白变换，避免把根点绑定到留白边缘；删除布局字段不能绕过校验。源点可以位于特效中心、物件安装点等，不限定角色脚底。Creator `SpriteFrame.rect` 保持图片像素左上原点坐标，不对 `rect.y` 做翻转；只有映射到 `UITransform.anchorPoint` 时才把左上像素锚点转换为左下归一化坐标 `1 - image_anchor_y / cell_height`。`AnimationClip` 清单描述帧顺序、`sample`、`wrap_mode` 与时长，不代表已有可播放的 Creator 动画资产。

Creator 导入与场景接入按[Creator MCP 协议](../../../references/cocos-mcp-protocol.md)执行：每次先读取实时 `tools/list` schema，不手写 `.meta`、`.scene` 或 `.prefab`。按协议导入后刷新并读回资产信息、UUID 和可发现的子资源；刷新等待 `.meta` 出现不等于导入成功，批量操作要逐项确认子工具结果。若当前工具 schema 没有可用的 `SpriteFrame` 子资源查询或所需编辑能力，停止受影响接入并报告 pending/blocked。

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#accepted-资源文件门)。

## 抽帧后的动作与图片修正

- 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#抽帧后的动作与图片修正)。

- 修改实际图片后重组最终图集，更新实际图集、报告及实际生成的预览，不要求生成或比对 SHA；重新审阅逐帧显示、动作连续性、关键时刻和首尾衔接。若 `source_video.sha256`、报告的 `input.video_sha256` 或帧的 `source_sha256` 已被记录，保留其与初始来源的真实对应关系，不能伪装成修改后的图片 SHA。
- 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-workflow-integration.md#抽帧后的动作与图片修正)。

## 本栈配套资料

- [视频节奏整理](./action-timing.md#视频节奏整理)
- [合批消耗比较](./region-planning.md#视频条数与消耗比较)
- [区域规划](./region-planning.md)
- [意图到制作的交接](./intent-driven-design.md#带入现有阶段与交接)
- [游戏时间先于来源](./action-timing.md#游戏时间先于来源)
- [一致性及衔接门](./image-inbetween.md#关键帧的一致性与衔接门)
- [衔接与循环设计](./character-animation.md#衔接与循环设计)
- [共用时间轴](./action-timing.md)
- [图片分辨率约定](./region-planning.md#图片分辨率约定)
- [动作分析规则](./action-timing.md#动作分析与时间轴)
- [玩法与意图推导](./intent-driven-design.md)
- [效果与性能平衡](./action-timing.md#效果与性能平衡)
- [设计理念说明](./intent-driven-design.md#方案完成后阐述设计理念)
- [生成参数核对与来源空间](./region-planning.md#生成参数核对与来源空间)
- [SKILL.md 的分类入口](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)
- [来源路线](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--来源路线)
- [执行代理](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--执行代理)
- [导演与动作指导](./animation-direction.md)
