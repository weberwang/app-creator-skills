# Unity 验证与依赖

Unity 版本与证据格式以项目真实 Editor、包和平台为准。逐项核对 Unity 是否编译、导入或域重载完成，记录相关 Console 和实际环境。PlayMode、设备与 Release 构建分别计入任务计划，选择匹配的 EditMode、PlayMode、构建和性能预算检查；无设备证据时不得声称设备运行验证通过。

阶段范围：V3 只核对所需工程类别及 Profile 的 `evidenceRequirements.assetImport`（`asset-import`）：实际导入路径、Importer、GUID/子资源和项目内登记引用。此阶段不要求正式宿主 Scene/Prefab/UI 运行。V4 才检查 Profile 完整 `visual` 要求，读取已集成资产在正式场景中的布局、交互与可见效果；机器导入记录不能代替用户的美术检查。

只读检查发现 Editor 的实际项目路径和锁定 Editor 版本。所有写入面向唯一项目 Editor；写后读回实际 Unity 对象、导入属性、GUID/引用与错误状态。未验证引擎内操作前不得用存在的资产文件或面板已打开声称编辑器接入通过。

优先 EditMode 与无设备构建；未被任务或项目合同要求的 PlayMode、Standalone 与真机不自动触发。屏幕截图及可见效果提供给用户检查，代理默认不得仅从截图自动判定美术验收通过。

新增依赖时先读锁文件并检查现有包，优先使用明确版本的 UPM；避免同一库重复安装到 `Packages/` 和 `Assets/ThirdParty`，不直接修改包缓存。SDK 是否初始化成功只依据对应真实完成信号，不假设应用包包含特定 SDK。

完整来源：`unity-development-workflow/references/project-discovery.md`、`unity-development-workflow/references/project-structure.md`、`unity-development-workflow/references/sdk-initialization.md`、`unity-development-workflow/references/unity-plugin-routing.md`。
