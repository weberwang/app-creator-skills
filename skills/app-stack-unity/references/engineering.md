# Unity 工程与架构

## 环境发现

首次进入、目标目录切换、Editor 状态变化及任何 Unity 写入前，只读检查目标绝对路径、Unity 版本、渲染管线和包、BuildTarget、Assets/Packages/ProjectSettings、现有测试、已打开的 Editor、Console 与导入状态。需要连接 Unity 或 DCC 前先检查可复用的实例。必须从实时可用能力列表读取插件命令与参数；文档中的例子不能作为能力已连接的证据。发现失败或目标含糊时停止受影响的写入。

## 模块与依赖

目录约定采用资源类型与代码职责边界；项目可以使用已成形的其他布局，但在技术设计中记录唯一映射，不为套模板搬迁已有文件。推荐把入口/基础设施、已稳定复用模块、场景玩法、表现层和 Editor 工具分开。`Shared` 仅收纳至少两个真实消费者共同需要的能力，不预建空壳。

程序集按编译与测试边界设置，依赖保持无环，通常是 `Presentation → Gameplay → Foundation`。玩法规则不依赖 UI、场景表现或 Editor；平台服务以接口隔离。Editor 与 EditMode/PlayMode 测试不进入正常 Runtime/Player 程序集。

多场景应用为持久服务与可切换内容明确生命周期、加载顺序和卸载清理。每个活动显示/输入上下文只能有一个 Camera、AudioListener、EventSystem 或 UI Toolkit 输入路由所有者。弹窗与抽屉按 `DISPLAY_LAYER` 单独记录和交付，公共 `visual.hostId` 表示运行上下文与接线位置，不改变显示层资源的独立归属。

真实存在的大厅或主菜单作为 SCENE；跨场景的路由、持久导航逻辑及可复用 Prefab 由共享模块或资源负责，并由实际宿主分别验证布局、输入和生命周期，不虚构 Scene，也不将常驻导航登记为瞬态 DISPLAY_LAYER。一个显示层工作项只绑定一个宿主；复用组件时分别核对各宿主上下文。V1 先验证当前批次跳转、参数、返回和状态恢复，白盒可选；临时目的地只证明通路，正式场景组合在 `final` INTEGRATION 重验，不等待无关场景 V5。

新增 SDK 或包时，登记唯一初始化所有者、异步完成和失败信号、重试/降级及用户数据和平台依赖。各 SDK 保持独立异步生命周期，不串行阻塞首帧。

在技术设计和工作包中登记目录、模块/程序集边界、资源和文件所有权、场景周期、输入、保存、错误处理、测试入口和平台预算。只为用户选定的平台实现平台服务。

## Unity Editor 写入

- 每个工程维护一个正式 Editor 写入者。`ProjectSettings/`、包清单、Build Settings、跨场景入口和共享 asmdef 串行写入。
- 任何 Scene、Prefab、ScriptableObject、UXML/USS 写入后保存，再读回组件树、属性、依赖和序列化引用。更改前先检查目标场景是否有当前工作以外的未保存改动。
- 仅用 AssetDatabase 和实时插件能力处理导入、移动、重命名；关联 `.meta` 和 GUID，完整回读 Importer、子资源、Prefab/Scene 消费引用及日志。
- 实际 Console、编译/域重载、PlayMode/测试和构建证据分别记录；无证据时标明未运行。完整模板按项目事实选择，不对每项改动强制整个 Unity 项目构建。
- 未获单独明确授权不启动真机、Standalone/Player、不上传、不签名、不发布、不清理正在使用的资源。

来源：`skills/app-stack-unity/references/native-contracts.md#mode-unity-game-architecture`、`unity-development-workflow/references/project-discovery.md`、`unity-development-workflow/references/project-structure.md`。
