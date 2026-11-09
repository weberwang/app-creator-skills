# Roblox 工程与 Studio 接入

## 目标与正式源

- 明确项目根、Experience/Place 身份；未发布的 Place 用实际本地文件和当前 Studio 实例定位，不虚构 `placeId` 或 `universeId`。同名或多实例时先消除目标歧义；保存快照前先确认不会覆盖无关工作。
- 同一个 Place 及其 Script Sync 目录由同一写入者负责。按现有路径所有权允许其他工作离线并行准备，串行同步并保存；检查 Studio 与磁盘冲突，不能静默选择覆盖方向。
- 用户明确选择的 `.rbxl` 或 `.rbxlx` 是已保存正式 Place；记录真实路径、内容身份和重新读取结果。平台文档支持本地保存，但当前工具是否能自动保存和重开必须实测；只能人工操作时标为待人工，不以运行内存/截图代替。
- 官方 Script Sync 只同步脚本与文件夹，不同步其他实例、脚本 attributes/tags 或 PackageLink。按项目实际选定服务容器和可追踪的项目内文件，明确唯一来源与同步方向；处理 Script Sync 冲突前保留双方事实并遵循实际授权。

## 平台边界

- Roblox 脚本分别按 Server、Client、共享模块的实际容器和运行上下文组织；公共模板/GUI 在 Edit 中配置，运行时的 PlayerGui 和角色实例是派生对象，不能把 Client/Server 临时变更当作正式源。
- 游戏规则、奖励、进度和共享状态由服务端验证；客户端传入的类型、值、权限、距离、频率和时序必须按实际机制核实。远程事件、提示交互及受客户端网络所有权影响的物理都不能只信客户端断言。
- 在 GDD/TDD 与已有工作项确定核心服务、存档、时间、随机、取消与退出；DataStore、MemoryStore、HTTP、Teleport、Marketplace、Open Cloud 和其他服务仅按已确认需要接入，不引入无消费者的服务器或 SDK。
- 明确 `execute_luau` 和试玩可能触发的真实作用，包括已有脚本在运行时的存档、外部请求、消息与购买。默认隔离测试 Experience 与数据，外部写入和其他受保护操作继续使用公共控制器的明确动作授权；只读也不输出密钥或个人凭据。
- 同一 Place 中场景转换沿用公共加载和背景音乐合同；跨 Place 传送会改变运行上下文，按实际可实现的平台行为约定必要状态移交、加载/音乐衔接和失败恢复，不能宣称原客户端实例跨进程保留。

## Studio 能力与共享服务

连接后调用当前版本的工具列表、目标状态及 `skill`，根据实际实例而非本文例子决定调用。官方文档提供 `script_read`、`multi_edit`、`search_game_tree`、`inspect_instance`、`execute_luau`、`get_studio_state`、`start_stop_play` 与日志/输入等工具；工具可能因版本、连接或权限变化。缺少能力时只阻塞受影响工作并记录可复现事实；不为绕过缺失创建假结果。

需要初始化外部 SDK 时复用[SDK 文件职责与隔离](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)：平台内置服务按实际 API 和生命周期使用，不为强行符合模板创建无用 SDK 包装层。身份、位置、引用和版本进入当前工作项或实际文档，不新增状态机。

## 官方资料

- [Studio MCP](https://create.roblox.com/docs/studio/mcp)
- [Script Sync](https://create.roblox.com/docs/scripting/sync)
- [Place 文件](https://create.roblox.com/docs/projects/place-files)
- [客户端和服务端安全边界](https://create.roblox.com/docs/scripting/security/client-server-boundary)
- [Studio MCP 与 Open Cloud](https://create.roblox.com/docs/studio/mcp-open-cloud)
