# Flutter 验证

通过 FVM 运行目标项目的实际锁定 Flutter/Dart；记录真实检查命令、SDK 版本与结果。基本分析和单元/Widget 测试使用适用的 `fvm flutter analyze`、`fvm flutter test`。仅在平台打包、部署或目标性能验证确实属于当前范围时增加 build、设备与性能验证，不默认启动设备验收。

阶段范围：V4 核对必要工程证据和 Profile `evidenceRequirements.assetImport`（`asset-registration`），逐项确认新增图像等资源登记在 `pubspec.yaml`、落在声明的 `assets/` 路径、进入 Flutter bundle 并能被 Flutter AssetBundle 的隔离读取或目标 Widget test 读回。V4 不要求完成整个页面的视觉验收。V5 才检查完整 `visual` 要求，包括正式 PAGE 的自适应布局、真实导航/交互、无障碍及已确认高保真目标的 fidelity；视觉截图仍由用户人工检查。

依据实际变更运行最小关联 Widget test 和断点矩阵。Widget 测试以语义树和可见角色交互为依据；layout spec/evidence matrix 记录屏幕边界测试 ID；fidelity pixel/parity 用冻结 viewport/方向/state、测量报告与已执行测试单独记证。目标图和运行截图由用户检查视觉效果，除非用户明示允许自动截图视觉验收。

验证至少考虑路由进入/退出、异步 loading/success/error/empty、内容滚动、已知安全区与键盘处理、文字缩放、最窄/最宽屏、横竖变向和适用的关键触屏操作。具体验证选择由工作项范围和已采用依赖决定，不预设 Riverpod、HTTP、Web plugin 或 native build。

来源：`flutter-app-orchestrator/SKILL.md`、`adaptive-layout-implementation/references/test-matrix.md`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-tech-design`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-quality-review`。
