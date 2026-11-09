# Roblox Studio 原生能力合同

公共编排负责工作项、阶段与审批；本手册只规定 Roblox 原生路线。按当前任务读取[工程与 Studio](engineering.md)、[内容与地形](content.md)、[文本布局](text-layout.md)、[验证与交付](verification.md)和 [Roblox 领域证据](../../roblox-domain-contracts/references/domain-validation.md)。工具名和平台能力以当前实例发现结果为准，以下模式不代表对应工具已经连接或运行。

<!-- native-source:roblox-workflow:start -->
## mode-roblox-workflow

选择目标 Studio 和 Place 后沿用公共六阶段/V0–V5；真实游戏对象使用 `SCENE`，独立瞬态层使用 `DISPLAY_LAYER`，数据及平台能力使用 `MODULE`。同一 Place 的不同数据关卡或功能可以共享宿主，不按关卡数虚构 Place 或状态机。先按[工程与 Studio](engineering.md)确认正式源和 `studio_id`，有显示时按[内容与地形](content.md)衔接阶段；V1 与非视觉模块也要提交实际工程/运行证据。
<!-- native-source:roblox-workflow:end -->

<!-- native-source:roblox-game-production:start -->
## mode-roblox-game-production

明确体验、核心循环、游戏特点、目标用户、客户端/服务端行为、Place 划分及实际功能范围；关卡、随机和联机仅按现有规则选择。按[内容与地形](content.md)交接世界、GUI、资源和完成/失败条件，明确目前可验证的目标设备、输入和未确认取舍。不因目标包含移动设备就为 Roblox 宿主制作独立原生启动屏或引入未选平台。
<!-- native-source:roblox-game-production:end -->

<!-- native-source:roblox-game-architecture:start -->
## mode-roblox-game-architecture

按[工程与 Studio](engineering.md)确认服务端权威、客户端输入/反馈、共享模块和持久化职责；按实际项目梳理脚本位置、公开接口、生命周期、同步方向、唯一写者及退出恢复。Remote、实体和真实数据使用服务端语义验证，不能以客户端碰撞或 UI 为结算权威。共享 SDK/服务的实际需求沿用公共职责，Roblox 内置服务不因模板而强制包装为第三方 SDK。
<!-- native-source:roblox-game-architecture:end -->

<!-- native-source:roblox-project-foundation:start -->
## mode-roblox-project-foundation

先发现可复用 Studio/Place、项目根、正式源和实际版本，按[工程与 Studio](engineering.md)确认 Script Sync、本地 Place 快照及回读路线；没有真实保存证据时不能声明基础工程源已交付。建立适用的客户端/服务端启动及明确依赖，隔离测试 Experience/数据；不自动安装、注册或启动 Studio，不创建不需要的后端或商店工程。
<!-- native-source:roblox-project-foundation:end -->

<!-- native-source:roblox-gameplay-development:start -->
## mode-roblox-gameplay-development

按[工程与 Studio](engineering.md)定位规则的唯一权威、实际对象和 Remote 接口；`Edit` 模板、运行时 `Client` 克隆和 `Server` 状态分别回读。先验证本次规则的进入/成功/失败、输入、重入和状态变化，覆盖实际适用的非法参数、频率、距离、重复请求和多人同步；将真实运行记录交给[验证与交付](verification.md)，未运行不能用离线合同或脚本存在冒充。
<!-- native-source:roblox-gameplay-development:end -->

<!-- native-source:roblox-game-balance:start -->
## mode-roblox-game-balance

使用带单位的参数、配置和可复现情景说明来源、消耗、成功/失败成本、随机与异常；服务端维护影响玩家状态的权威结果。按[验证与交付](verification.md)区分本地模型、测试环境和真实存档；DataStore 与玩家经济只有需求包含时接入，测试不得静默写入线上数据。未定义区间或无实际玩家观察时只报告结果和假设。
<!-- native-source:roblox-game-balance:end -->

<!-- native-source:roblox-game-audio:start -->
## mode-roblox-game-audio

按实际 Place、声音资产及客户端消费上下文定义音乐、音效、事件、优先级、静音和生命周期，登记资源来源、权限、审核及实际加载。相同 Place 内切换遵守公共背景音乐合同；跨 Place 会创建新的运行上下文，应按[工程与 Studio](engineering.md)定义允许的衔接与恢复，不声称保留旧实例。实际声音和体验由用户检查。
<!-- native-source:roblox-game-audio:end -->

<!-- native-source:roblox-game-feedback:start -->
## mode-roblox-game-feedback

按[资源与视觉流程分流](../../app-feedback/references/interaction-feedback.md#资源与视觉流程分流)判断是否需要正式设计或新素材；只覆盖本次事件。以规则已确认事实驱动本栈音画、相机或动效；改变命中、移动、时间和输入权的行为由玩法负责。反馈的实例、客户端、生命周期、并发、中断及资源权限按[内容与地形](content.md)验证，截图交用户人工检查。
<!-- native-source:roblox-game-feedback:end -->

<!-- native-source:roblox-game-ui-layout:start -->
## mode-roblox-game-ui-layout

按[内容与地形](content.md#gui-与世界)明确 `ScreenGui`、安全区、父子关系、位置参照、层序、真实输入及 Edit 模板与 PlayerGui 运行克隆。世界空间使用 studs 和相机，不混作屏幕布局单位。按[文本布局](text-layout.md)验证实际字体、换行、目标语言与视口；正式显示和可读性由用户人工检查。

普通 GuiObject 必须按真实父级或允许的参照相对停靠；原生可表达时使用 `UDim2`、`AnchorPoint` 或父容器的 `UIListLayout`/`UIGridLayout`，列表项与其 Flex 尺寸权限按[屏幕 GUI 合同](../../roblox-domain-contracts/references/domain-validation.md#屏幕-gui-的相对停靠)回读。`ScreenGui` 自身以实际 `ScreenInsets` 绑定视口边界；其子项分别声明位置和双轴尺寸控制者。不得用未验证的相对标记、锚点原点或固定屏幕坐标代替停靠规则；兄弟参照才使用已绑定正式源码的共享计算，实际受控行为记录触发、独占与恢复。V3 冻结计划，V4/V5 校验同一正式源及客户端属性；一次快照不能证明多尺寸运行或视觉通过。
<!-- native-source:roblox-game-ui-layout:end -->

<!-- native-source:roblox-game-asset-integration:start -->
## mode-roblox-game-asset-integration

按[内容与地形](content.md)选择 Part/Model、平台资产、参数模型、生成网格或已有正式源，明确来源、所有权、用途和消费者；每个新增实例保存于正式 Place 并回读。导入、审核、上传和实际运行加载分别记录；未经授权不执行云写入。V2 目标、V3 结构、V4 正式资源和 V5 组合验收沿用当前工作项。
<!-- native-source:roblox-game-asset-integration:end -->

<!-- native-source:roblox-game-3d-modeling:start -->
## mode-roblox-game-3d-modeling

按[内容与地形](content.md)判断原生几何、现有资产、程序化模型、AI 网格或外部模型的适用性，记录尺寸、枢轴、形态、碰撞及消费者。Terrain 以[地形](content.md#地形)的目标区域、材料、恢复依据和实际角色通行验证；不为局部任务清空整个 Terrain，不将测试模型或 Play 状态当作正式源。
<!-- native-source:roblox-game-3d-modeling:end -->

<!-- native-source:roblox-game-3d-texturing:start -->
## mode-roblox-game-3d-texturing

按[内容与地形](content.md)选择 Roblox 原生材质、生成的材质变体、模型纹理或已授权外部贴图；先确认模型、材质槽、真实缩放、来源、版本和预算。生成工具可用性、文件来源、上传与审核分别确认；在正式对象与实际目标显示条件下交用户检查，不以纹理文件存在冒充资产已接入。
<!-- native-source:roblox-game-3d-texturing:end -->

<!-- native-source:roblox-game-animation:start -->
## mode-roblox-game-animation

读取既有玩法动作规则和当前目标角色，确定事件、关键姿态、时长、根位移与取消/中断；将状态/判定所有权交给玩法，动画只按公开事件消费。按[验证与交付](verification.md)核对 Studio 实际资产、Animation/Animator 绑定、测试上下文、资源权限和真实对象播放；用户检查动作与节奏，工具存在不代表动作已通过。
<!-- native-source:roblox-game-animation:end -->

<!-- native-source:roblox-game-character-rigging:start -->
## mode-roblox-game-character-rigging

检查实际模型、骨架、比例、目标 Roblox 角色结构、资源权限和可用的 Avatar 设置能力；自动设置只作为实际工具路线，完成后仍读取骨骼、约束、蒙皮/控制和动画消费者。按[验证与交付](verification.md)分别记录导入检查、运行播放和用户视觉结论，未发现或无法使用的能力不得标为已完成。
<!-- native-source:roblox-game-character-rigging:end -->

<!-- native-source:roblox-game-asset-pipeline:start -->
## mode-roblox-game-asset-pipeline

按[内容与地形](content.md)确定已有本地制作源、实际模型格式与导入路线，检查比例、坐标、枢轴、碰撞、材质、骨架、资产所有权和消费者。先明确本地导入与上传的真实副作用；生成/上传/审核/实际访问分别留证。可使用已发现的原生导入工具，不强制某一外部工具或捏造导入成功。
<!-- native-source:roblox-game-asset-pipeline:end -->

<!-- native-source:roblox-game-qa-performance:start -->
## mode-roblox-game-qa-performance

按[验证与交付](verification.md)绑定源码、Place、Studio、运行模式和被测对象；以实际范围覆盖客户端/服务器规则、权限校验、失败/重试、资源、输入、安全区、多人及性能。依据项目预算与实测环境比较，Studio 模拟与真机、生产服务分别报告；缺少截图人工确认或实际运行不得标为整体通过。
<!-- native-source:roblox-game-qa-performance:end -->

<!-- native-source:roblox-game-release:start -->
## mode-roblox-game-release

默认仅准备真实来源、Place 版本、内容/资源资格、目标受众、平台检查、测试结论和回滚事实；保存、上传、发布、付费和外部配置按具体目标与实际副作用使用公共控制器已有授权。没有执行的 Studio/线上操作标为未运行；Roblox Experience 发布不套用自建 APK/IPA 或商店二进制构建流程。[验证与交付](verification.md)
<!-- native-source:roblox-game-release:end -->

<!-- native-source:roblox-artifact-cleanup:start -->
## mode-roblox-artifact-cleanup

按[工程与 Studio](engineering.md)追踪 Place 快照、同步源码、资源 ID、设计源、项目记录和现有消费者，确认唯一归属及恢复依据。仅整理任务允许范围，Place 对象删除、外部资源处置和覆盖同步源按真实副作用处理；保留用户未完成工作与有效证据，不删除或重写冻结记录。
<!-- native-source:roblox-artifact-cleanup:end -->
