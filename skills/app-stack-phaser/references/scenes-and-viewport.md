# Phaser Scene 与 viewport

## 游戏显示空间

按[Scene 与容器显示结构](../../phaser4-game-ui-layout/references/display-object-layering.md#scene-与容器显示结构)同时规范实际 Display List/Container、Camera 与 DOM 分支，明确导航、内容、HUD、独立瞬态层和功能组件的组织；代码目录不能代替显示树。

分别记录 Phaser `gameSize`、Renderer size、Camera viewport/world view、CSS 宿主尺寸和 Canvas backing size。DOM 的 CSS 盒、WebGL framebuffer 和 Phaser 世界坐标不是同一单位。根据真实 resize 行为更新 scale manager、场景相机、布局根和缓存的输入边界。DPR 是设备和窗口运行事实，不是页面静态坐标合同。

把 Camera 视口、zoom、scroll、世界原点、画布留边模式和游戏交互区域统一规划。选择 FIT/EXPAND/RESIZE、横纵比和圆角裁切策略时，用实际目标尺寸、屏幕方向、动态拉伸与文本要求说明取舍。不能假设不同布局策略能同时满足固定画面和完整世界可见。

## 输入与 DOM 叠层

说明 HTML 根页面到 Phaser Canvas、Pointer/Keyboard 目标的事件路由。至少检查 Canvas 在页面居中、缩放、缩放倍率变化、高 DPR、横纵向和 CSS 偏移时的命中映射。经 Camera transform 后的世界坐标/物理坐标需由真实投递的 Pointer 验证。

如果使用 DOM UI 或原生平台输入组件，记录焦点所有权、键盘/软键盘造成的尺寸变化、pointer events 向 Canvas 的传播或捕获、SafeArea/视口策略和纯文本输入域。避免两个层都响应同一次点按，或 DOM 拦截游戏操作后导致场景持续捕获输入。overlay 的关闭、焦点移交与暂停恢复独立处理。

## 效果图和结构实现

将完整效果图拆成静态图像和由 Phaser 绘制的文本、Shape、进度/状态/交互等动态部分；明确哪些需要独立图片与透明边缘。图像组、button 等互动区域逐个和稳定组件/节点绑定，不把一个整页 PNG 当作 UI。Scene/Container/DOM 每层声明实际位置父级，边距/缩放行为不能靠相互拉扯的 CSS 和 Camera 一起控制。

来源：`skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-ui-layout`、`skills/phaser4-game-ui-layout/references/layout-contract.md`、`skills/phaser4-game-architecture/references/project-structure.md`。
