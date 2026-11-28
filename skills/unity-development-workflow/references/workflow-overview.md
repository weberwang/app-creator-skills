# 工作流总览

## 控制面与执行面

`app-workflow-control` 保存 Work Item、状态、风险门、实施包和证据索引；本 Skill 负责 Unity 领域编排；[@Unity](plugin://unity@openai-curated-remote)、`com.unity.pipeline` 与 C# Toolkit 负责 Scene、Prefab、Importer、AssetDatabase、Editor、截图、测试与构建事实。三层不得相互伪造结果。

## 七阶段项目视图

| 阶段 | 主要产物 | Unity 完成事实 |
| --- | --- | --- |
| 玩法与题材立项 | 玩法、题材及核心吸引力 | 人工确认构想后完成一次 Grilling；成本估算属于独立制作管理 |
| 产品定义 | GDD、规则、验收和语言清单 | Game Loop 最小可玩原型由人工确认通过 |
| 制作技术方案 | TDD、Unity 固定模板、模块与平台集合 | 确定模块职责、状态和接口，登记固定模板版本及挂载映射 |
| 基础工程与架构实现 | S00 与基础实施包 | 回读 asmdef、Composition Root、公共显示宿主和初始化配置；不在本阶段验证玩法、编译或打包 |
| 模块实现与体验整合 | SCENE／DISPLAY_LAYER 实施包与 V1–V5 证据 | V1 完整模块方案、V2 全状态和进度模块稿、V3–V5 拆解准备与完整实现验收；实际文案消费者验证键、参数和生命周期 |
| 跨模块集成 | `feature` 集成单元和联合证据 | 回归场景间导航、数据、存档、音频及界面状态 |
| 模块集成与整体验收 | `final` 集成和统一验收版本 | 平台适配、性能、实际游玩及全部必要语言与文案消费者在同一版本验收 |

内部 G0–G2 可作为方案、实施和集成里程碑。另行明确委托的发布独立登记 RELEASE，沿用其批准与验证。

国际化按[初始化时机与阶段职责](text-and-localization.md#初始化时机与阶段职责)执行：S00 完成初始化、正式 JSON 和统一绑定的结构与配置回读；实际加载和运行链路在后续模块及集成验证。未执行的运行检查保持未验证，单场景同样沿用该入口。

## 阶段任务

场景与显示层的 V1–V5 按[阶段规则](../../unity-domain-contracts/references/stage-confirmation.md)推进：模块任务范围不要求常规确认；V1 确认完整模块方案，白盒按需使用；V2 生成并确认覆盖全部适用状态和进度的模块设计；V3 先确认拆解图，再独立确认布局图；V4 验收正式资源和导入，可展示临时组合预览；V5 完成正式 Scene/Prefab/UI 实现、布局校准与运行验收，用户确认后闭合。技术验证通过和初始任务授权不能替代人工确认。

普通阶段内任务采用[三项最小约定](../../app-creator-workflow/references/output-files.md#每项任务的最小约定)，只明确结果、相关写入／输出路径及完成验证。使用控制器或领域结构化任务时，`taskId`、所有权、输入／输出、验收命令和状态等字段按实际 Schema 保留；存在依赖时核对其真实证据，不为普通任务自造 ID、状态或空命令。采用 READY 的实际合同仍须满足对应依赖和证据，目录接近、代理空闲或文件存在不能替代。Foundation 的第三方 SDK 按[唯一初始化入口](./sdk-initialization.md)独立启动；产物位置沿用[原生边界](./artifact-storage.md)。

纯局部修改从最早受影响阶段开始。模块/场景/资源互不相关时不得强制重跑全项目；共享配置、序列化引用、全局基线或发布候选变化时，才扩展失效范围。

## 视觉来源与结构装配

场景使用 V1-V5。每个拆解注释和 item 必须声明 `parentElementId`、`semanticGrouping`、`visualRouteAnalysis`、`assemblyAnalysis` 与 `layoutBinding`。父子关系必须有显式节点事实和真实的定位、布局、交互、状态、裁切或复用依赖；没有这些依赖的共同信息保持同组同级，不能按距离、bounds 或类型猜测。屏幕 UI 的 V3 布局字段按[节点树规则](./ui-layout-and-hierarchy.md)冻结。

视觉来源在 Unity 中只允许 `IMAGE_ASSET`、`UNITY_NATIVE`、`REUSE`、`MODEL_3D`、`MATERIAL`、`VFX`。文字沿用统一 JSON，默认先评估 UniText，并按[完整还原标准](visual-decomposition-routes.md#完整还原的判断标准)确定原生、图片或待验证，非文字的静态特色外观默认独立生产资产；`UNITY_NATIVE` 必须持有文本、动态数据、布局、基础几何、进度、粒子或 Shader 的资格证据。`REUSE` 记录精确 GUID、源路径、实际 Importer 设置和消费节点。单区域禁止使用 `COMPOSITE` 或整屏截图来源；`assemblyAnalysis.fullScreenCapture` 必须为 `false`。

基础几何资格按[路线边界](./visual-decomposition-routes.md)限制在 UI/布局、技术占位、碰撞及非模型资产的原生渲染用途；新增正式可见 3D 模型必须走 `MODEL_3D` 和 Blender MCP，不能用 `UNITY_NATIVE` 绕过。3D 贴图、绑定、动画同样走[3D 流程](./3d-asset-workflow.md)，角色与 Unity 导入使用该流程引用的共同交接。

## 场景与显示层

场景只包含玩法、画面和常驻 HUD。modal、popup、drawer、toast 等瞬态层是独立 `DISPLAY_LAYER` Work Item，`hostSceneId` 只表示运行上下文，不表示实现归属，也不阻断宿主场景 V5。显示层拥有自己的结构、响应式合同、打开/交互/关闭/恢复轨迹和运行证据。

## 失败处置

- `repair`：字段、路径、绑定或可补证据错误，留在当前阶段修复。
- `revalidate`：候选未变，重新执行当前门验证。
- `return`：上游事实失效、范围真实变化或继续会绕过硬门；只回到最早受影响阶段。

控制层不自动选择 `return`，也不自动回滚共享工作区。
