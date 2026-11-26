# 技术栈证据与任务主责

<a id="stack-evidence"></a>

## 技术栈证据

先定位本轮要改的可运行模块，核对入口及依赖或工程配置。共用仓库根、同名文件和素材格式只提供线索。多个模块共同交付时，按各自入口确认技术栈，并按接口拆分工作项。用户明确指定的新项目技术栈可直接采用。既有项目的指定技术与实际入口冲突且影响实施时，先确认本轮目标。

| 技术栈 | 优先核对 | 版本来源 |
| --- | --- | --- |
| Unity | `Assets/` 和 `ProjectSettings/ProjectVersion.txt`，或当前关联项目的 Unity Editor | 项目 Editor 版本和相关包的实际解析版本 |
| Cocos Creator | Creator 工程配置及实际场景、脚本入口 | 当前 Creator 小版本和启用插件 |
| Phaser | 目标模块声明 `phaser`，运行入口创建 Phaser 游戏 | 目标模块的依赖声明和锁文件 |
| Three.js | 目标模块声明 `three`，运行入口创建并使用渲染器 | 目标模块的依赖声明、锁文件及实际渲染器 |
| Roblox | 关联的 Studio Place，或经核实指向该 Place 的 Rojo 项目 | Studio 与当前实际可用的服务、工具及 API |
| Flutter | `pubspec.yaml` 启用 Flutter，目标模块有 Flutter 应用入口 | FVM 配置、实际工具链及依赖锁文件 |
| Expo | 目标模块依赖 `expo`，实际入口与 Expo 配置一致 | 项目依赖和锁文件解析的 Expo SDK 及相关包 |
| ESP32 | ESP-IDF 工程配置和 ESP32 设备屏幕的 GUI 入口 | 工程所用 ESP-IDF 工具链和组件锁定信息 |
| Node.js | 目标模块有实际服务端启动入口、后台任务或消费者 | 项目及部署环境的 Node 版本、包管理器与锁文件 |

例如 Expo 客户端与 Node.js 服务同仓时，修服务启动读服务端入口。Phaser 与 Three.js 同时出现时，看哪个模块拥有本轮游戏循环或渲染入口。选定后沿用对应 `app-stack-*` 的 `profile.json` 和原生适配，版本以项目核实结果为准。

<a id="task-ownership"></a>

## 任务主责

先判断用户要改变的行为或证据，再选择主能力。只有任务确实涉及独立职责时才加载协作能力。编排模式仍按[任务范围](workflow.md#按任务选择编排)决定，小范围修复、跨模块改动和事实查询据各自范围处理。

| 症状或要求 | 主责 | 按需协作 |
| --- | --- | --- |
| 暂停恢复后自动跳、按键偶尔吞掉、落地或碰撞判定异常 | `app-gameplay-development` 检查输入、规则和状态 | `app-quality-review` 用于独立复现与审查，`app-feedback` 用于确有变化的提示 |
| 命中结果正确，想改善震动、闪光或命中提示 | `app-feedback` 处理体验与触发 | `app-audio` 负责游戏声音素材和播放约束，玩法能力负责确有变化的判定 |
| App 的同一反馈事件触发两次 | `app-feedback` 核对反馈事件与生命周期 | 仅声音播放或录音问题读取[App 音频](../../app-domain-toolkit/references/app-audio.md)，导航或业务状态问题回到实际所有者 |
| 继续游戏恢复错误、失败后需要恢复存档、动态镜头跟随或切换异常 | `app-gameplay-development` 负责当前游戏的存档或镜头行为 | 按玩法入口选读对应专项，测试复现或独立审查需要时使用 `app-quality-review` |
| 首次进场卡顿、长时间运行变慢，原因尚不明 | `app-quality-review` 建立可比较基线并定位 | 瓶颈定位后，由对应的玩法、资源或运行时能力修改 |
| 目标模块起不来、入口或基础运行环境有问题 | `app-project-foundation` 核对已有入口与环境，未声明该能力的栈按当前栈的工程指南处理 | 独立的架构调整或复验按实际影响进入相应能力 |

公共入口按当前安装的技能名查找资料，栈专用章节通过[原生能力路由](../SKILL.md#技术栈原生能力路由)选取。范围含多个栈时，分别核对每项工作实际依赖的适配。

参考上游的[引擎识别表](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/c6ca6c4/router/references/engine-detection.md)和[任务主责表](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/c6ca6c4/router/SKILL.md#L163-L180)。
