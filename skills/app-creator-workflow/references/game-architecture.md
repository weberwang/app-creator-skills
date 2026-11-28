# 游戏工程与显示树固定模板

从零研发的游戏按实际技术栈使用一份固定模板。模板的 `project` 定义入口、代码归属及生命周期，`display` 定义原生显示宿主及挂载点。各栈遵循统一的内容、HUD、弹窗、提示与加载顺序；实际节点、渲染和输入机制以本栈模板为准。

| 技术栈 | 唯一模板 | 模板版本 |
| --- | --- | --- |
| Unity | [game-architecture.json](../../app-stack-unity/templates/game-architecture.json) | `unity-game-1.0` |
| Cocos Creator | [game-architecture.json](../../app-stack-cocos/templates/game-architecture.json) | `cocos-game-1.0` |
| Phaser | [game-architecture.json](../../app-stack-phaser/templates/game-architecture.json) | `phaser-game-1.0` |
| Three.js | [game-architecture.json](../../app-stack-threejs/templates/game-architecture.json) | `threejs-game-1.0` |
| Roblox | [game-architecture.json](../../app-stack-roblox/templates/game-architecture.json) | `roblox-game-1.0` |

模板中的 `project.entryPoints`、`project.directories`、`project.lifecycle`、`display.screenHost`、`display.host` 和 `display.layers` 为固定架构约束。`<模块ID>` 等占位符替换为稳定的实际标识；Roblox 分别使用服务端和客户端启动入口。五层依次为 `content`、`hud`、`popups`、`toasts`、`loading`，每层记录挂载位置、所有者、输入及清理。`optional` 为 `true` 的层在本项目无职责时可不创建；弹窗初始只创建空容器，实际实例在打开时创建。

阶段 3 在现有技术方案登记所选模板路径、`templateVersion`、实际入口、模块与层的映射及各层责任；引擎版本或平台能力不支持固定方案时说明具体冲突和受影响范围，通过现有架构决定流程处理。阶段 4 实施入口、目录和公共宿主并读取保存后的实际源码、场景或配置，核对模板与映射；不在此阶段执行玩法、编译或打包验证。阶段 5 的 V1 引用既定挂载点，V3 在模块内部细化节点和布局。阶段 5–7 在正式宿主及跨模块组合中按适用范围验证层序、输入、焦点恢复、场景切换与清理。

Roblox 阶段 4 核对 `StarterGui/GameUI` 的已保存模板，运行时挂载到玩家的 `PlayerGui/GameUI`，并在阶段 5 的 V5 核对实际实例。Phaser 的 `UI` 指固定公共 UI Scene，Three.js 的 `HudOverlay` 指画布上方的公共 DOM 容器。

`display.contentRoot` 固定每个内容场景的根节点名。阶段 4 回读内容根和公共屏幕层，V5 核对实际模块仍挂到内容根或其 V1 指定的屏幕层。

项目能力及场景内容按需求扩展到固定入口与挂载点；模块新增内部组件不构成全局架构变更。更换公共宿主、增减全局层、修改启动入口或跨模块权威状态归属时，回阶段 3 更新方案并按影响重验。已有项目先发现并记录实际结构，局部任务直接依据已有受影响结构推进；经明确委托采用固定模板时按变更范围迁移并验证。
