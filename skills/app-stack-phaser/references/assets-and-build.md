# Phaser 资产与生产构建

## 静态和动态资源

使用 bundler 导入的资源由 TypeScript 模块绑定并生成正确 URL；`public/assets/` 的路径按部署 base 作为原样文件请求。正式路径在资源登记与消费者中唯一确定，不能混合相对源码路径、根域绝对路径和部署前缀。

下载和编辑源文件、未审候选与正式资源清单分开存放。图片先拆解并决定图片资产、Phaser 运行时绘制或复用现有资产，再对正式地址和加载时机做核对。状态与程序行为不能混进静态整屏海报。对透明图片检查真实像素 Alpha 和边缘，不要把背景去除工具的成功输出当视觉合格判断。

图集与序列帧逐项声明 key、atlas page/texture 依赖、frame 名称/矩形、pivot、动画帧序、时间间隔和实际消费者；读回 Phaser Cache 中可加载资源和游戏内表现。图集打包、静态拷贝和 JS 模块加载是不同路线。

## Vite 构建

使用项目锁文件中的 Vite/npm 命令执行实际 production build。核对构建输出、字体和媒体路径、静态依赖、动态导入、配置模式及错误日志；部署时如果改变站点 base 或 Capacitor `webDir`，需有对应构建验证。开发服务器可辅助迭代，但不能代替生产构建。

开发用 SourceMap 只在实际用途中保留；按构建职责明确定义生产 SourceMap 是否输出和归档，避免将含有源码的 map 纳入不希望公开的分发件。检查首屏同步资源体积与需要后加载的关卡/Scene 资源边界。

## Phaser 角色资产

骨骼角色应选择 Phaser 实际采用且已安装的动画路线，区分骨骼动画导出、图集动画、逐帧 atlas 和帧事件；逐项保存源工程、资源导出配置、内容更新限制与首次 Scene 加载/销毁证据。不要在未识别已有工具前默认安装特定插件。

来源：`skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-asset-integration`、`skills/phaser4-game-architecture/references/production-build.md`、`skills/phaser4-game-architecture/references/project-structure.md`。
