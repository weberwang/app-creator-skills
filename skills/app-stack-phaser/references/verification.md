# Phaser 验证

根据源语言修改范围选择适用的 TypeScript 类型检查、相关单测与 Vite production build。在正式游戏运行时验证已登记的 Phaser/Scene/Camera/renderer/dynamic asset 消费者和当前投递的交互；如果没有实际运行证据，只报告静态或构建检查完成。

阶段范围：V4 完成当前需要的工程验证及 Profile `evidenceRequirements.assetImport`（`asset-loading`）：按实际 `vite build` 确认静态资源和 loader 路径进入构建，再用最小隔离检查确认所需图集/图片可被目标 loader 读取。无须此时完成正式宿主 Scene 的完整视觉验收。V5 覆盖全部 `visual` 类别，包括正式场景的 viewport、真实指针命中、游戏内资产加载和用户视觉检查。

提交视觉运行证据时，记录构建模式、用户实际视口 CSS 尺寸、Renderer/Game size、Camera、设备方向和真实素材路径。必须检查输入映射时真实投递 Pointer/Keyboard 输入，并记录测试覆盖状态与恢复流程。生产构建成功不证明运行资源解码、输入命中或显示效果正确。

如果布局由 Phaser Canvas 和 DOM 同时组成，分别验证 DOM/Canvas 事件路径、焦点、缩放及 resize。Web 截图里的画布显示可交用户人工检查；用户请求截图视觉显示验证时截图只交付给用户检查，不由代理自行判定通过。

来源：`skills/phaser4-game-architecture/references/production-build.md`、`skills/phaser4-game-ui-layout/references/layout-contract.md`、`skills/phaser4-game-ui-layout/references/layout-runtime-evidence.md`、`skills/phaser4-game-ui-layout/references/phaser-adapter.md`。
