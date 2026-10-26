# Three.js 架构与世界空间

## 浏览器工程

以已安装 three.js、TypeScript 和项目当前 Vite 版本为准，沿用 `src/` 源码与项目原有 `public/assets/` 正式资源策略。默认浏览器 WebGL 2 `WebGLRenderer`。WebGPU 是按需要验证的路线，需先核对目标环境、渲染特性、材质和实际部署。

`src/game/main.ts` 统一创建 Renderer、注册场景控制器并建立更新循环。Scene 与 HUD 分别由本域组件控制。仅在消费者确需且有成熟接口时将服务上移为模块共享；不为纯函数状态逻辑无故增加单例。

游戏 Scene controller 应具有明确 enter/update/exit/dispose 生命周期，并掌握父 Object3D、Camera、Clock/step update 与清理职责。暂停、切关、页面卸载、渲染 context 恢复分别说明：物理更新是否停止、时间是否积累、动画是否暂停、资源和事件是否还被别处使用。

平台代码按 Web、Android、iOS 或小游戏适配边界选用。浏览器可见性、ResizeObserver、存档和返回导航采用平台独立服务，不在具体 Scene 内重复初始化第三方 SDK。

## 世界空间 vs HUD

真实游戏世界用 `Scene`、`Object3D`、Camera、单位、轴向、层级和世界碰撞描述。记录视野角/正交视口、near/far、相机阻尼、viewport 尺寸、render size、Canvas CSS size、设备像素比、移动端最大 DPR 策略、阴影、景深和透明排序。

屏幕 UI 是 Camera 的 overlay/单独 Scene、DOM 页面、仿世界 UI 的一个真实画面目标选择。固定大小 HUD 和世界空间交互物不能复用同一条坐标或缩放合同。避免在屏幕尺寸或 DPR 变化时再次乘 DPR 把逻辑尺寸放大；屏幕输入只有经真实事件映射到 Viewport、Raycaster 或具体 World Position 后才成立。

世界运行证据记录实际设备窗口尺寸、Renderer、Camera、关键世界坐标/模型尺寸、鼠标光线与命中对象和资源基线；UI 独立记录 HTML overlay 或 CSS 视口。视觉目标图可以指导建模与机位，不能替代可旋转模型或真实环境场景。

来源：`skills/threejs-game-architecture/references/project-structure.md`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-architecture`、`skills/threejs-game-ui-layout/references/layout-contract.md`、`skills/threejs-game-ui-layout/references/threejs-adapter.md`。
