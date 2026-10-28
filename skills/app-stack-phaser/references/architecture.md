# Phaser 工程与架构

## 入口与目录

项目默认 `index.html` + `src/main.ts` 组合宿主和平台入口；`src/game/main.ts` 创建单一 Phaser.Game、登记 Renderer 和 Scene。浏览器资源同时来自通过 ESM 导入的文件，以及 `public/assets` 中需要原样发布的文件。Vite base、静态目录、构建输出和部署前缀须与实际线上相对路径匹配；源码布局是一套可按需要采用的项目约定，不是引擎硬性结构。

按功能把场景规则、实体、私有 UI 和数据聚合在 `src/game/scenes/<id>/`。基础设施按稳定职责存放；至少两个真实使用者确需公共生命周期时才提升到 `modules/` 或 `shared/`。动态模块放平台入口或实际 Scene loader 按需加载。

弹窗、暂停界面等瞬态显示层在 `src/game/display-layers/<id>/` 定义身份、状态、资源、交互和宿主公开接口，不依赖宿主 Scene 私有成员。宿主只是显示上下文，不能成为显示层的隐式所有者。

真实大厅或主菜单使用 SCENE；跨场景路由、常驻导航逻辑与共享资源由共享模块维护，分别在真实宿主验收，不为导航虚构场景或常驻 DISPLAY_LAYER。瞬态显示层工作项绑定单一 `visual.hostId`，组件复用到其他宿主时分别核对上下文。V1 先验证本批次跳转、参数、返回和状态恢复，白盒可选；临时目的地仅证明通路，目的地功能另测，正式组合在 `final` INTEGRATION 重验，不等待无关场景 V5。

## 生命周期与资源责任

一个 Phaser.Game 所有全局 Renderer、输入管理器、全局插件与 Scene Manager。每个 Scene 明确状态 owner、进入、预加载、创建、更新时间更新、关闭和销毁边界；解绑监听器、音频、时间器、键盘/指针事件及 Scene 自有资源。共享 Texture/Cache 由明确公共资产所有者注册和释放；不能在切 Scene 时破坏其他消费者仍使用的共享项。

游戏根应用拥有 Phaser 实例和 Canvas；Stage/Pause overlay 或 DOM 页面内容应按明确显示责任拆分。SPA/热更新路径必须在旧宿主销毁时仅调用一次 Phaser.Game destroy，并确认 Canvas 与 DOM 事件订阅清理。

平台入口隔离浏览器可见性、本地保存、返回导航、后台暂停/恢复和定向支付/分享能力。SDK 初始化不要作为场景启动长屏障，失败时可隔离到该 SDK 的消费者。Web 小游戏和原生宿主按用户实际目标选适配器。

来源：`skills/phaser4-game-architecture/references/project-structure.md`、`skills/phaser4-game-architecture/references/sdk-initialization.md`。
