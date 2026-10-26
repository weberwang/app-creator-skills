# Three.js 渲染与验证

新浏览器工程用 WebGL2 `WebGLRenderer`，按实际 Renderer 检查 Context 属性、颜色空间、自动清屏和设备缩放。WebGPU 采用须有单独的目标浏览器运行证据，静态声明或构建通过不足。

根据面数、实例数、灯光、粒子和目标设备校验 `renderer.info`、GPU 纹理预算、阴影绘制、透明排序和目标帧率。基准在加载前、Scene 稳定运行、动画关闭和 Scene 离开后分别采集。World scene 必须通过实际 3D renderer 检查；表格、静态 UI 和局部屏幕元素可单独测。

阶段范围：V3 只核对工程类别和 Profile `evidenceRequirements.assetImport`（`asset-import`），在隔离加载检查中确认实际 GLB/GLTF、纹理、PBR/数据色彩空间及声明的 decoder/transcoder 路径可被加载；不要求建立或运行正式宿主 World Scene。V4 才执行完整 `visual` 证据，包括相机/renderer 世界画面、viewport、交互与退出后的 GPU 资源释放，并把生成的画面交给用户检查。

浏览器/Three scene 捕获生成证据交给用户检查画面，不自动从截图宣称视觉验收通过。Canvas render/build 成功不能证明模型色彩、碰撞、输入映射、缓存所有权、骨骼动画或其释放真实可用。

按源文件和服务分辨率之外确认当前 Vite base、public 路径、decoder URL、透明边界和打包片段。引擎与基础模块按需使用 TypeScript 检查、相关单测、Vite build 及被工作项声明的场景/显存验证。

来源：`skills/threejs-game-architecture/references/production-build.md`、`skills/threejs-game-asset-integration/references/art-quality-contract.md`、`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline`。
