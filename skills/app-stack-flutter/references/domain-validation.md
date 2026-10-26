# Flutter 专业工具接入

公共阶段、实施包和证据使用 [统一控制器](../../app-workflow-control/SKILL.md)。产品规格、技术设计、实现计划、高保真、图集与布局等仍按[完整专业索引](specialist-skills.md)读取原名技能，不用栈概览替代。

## 具体工具与输入

| 工具 | 输入及用途 |
| --- | --- |
| [run-fixtures.js](../../adaptive-layout-implementation/scripts/run-fixtures.js) | 执行保留的 48 个自适应布局夹具；从真实 JSON 输入计算布局，再与期望矩形/约束比较 |
| [adaptive-layout-implementation](native-contracts.md#mode-adaptive-layout-implementation) | 包含布局计算、校验、约束、错误信息及脚本；真实项目仍需对应 Flutter 实现和布局测量 |
| [validate-workflow.js](../../flutter-domain-contracts/tools/scripts/validate-workflow.js) | 维护时核对本栈完整技能、路由、引用及可复算风险场景；不证明 Flutter 工程通过 |
| [flutter-project-init](native-contracts.md#mode-flutter-project-init) | 保留初始化脚本及生成到工程的完整 flutter-dev 技能模板，不把模板计为独立根入口 |

在技能仓库运行 `npm run test:flutter-layout`；安装到项目后可运行：

```powershell
node .agents/skills/adaptive-layout-implementation/scripts/run-fixtures.js
```

Node 专业工具需要依赖时，按仓库安装说明为 `.agents/skills/app-skill-runtime` 安装一次共享依赖。布局夹具通过仅说明纯计算合同，无需启动 Flutter 服务，不证明设备显示效果。

## 接入真实工程与公共证据

Flutter 工程仍按实际 FVM/Flutter 版本执行 `analyze`、定向 widget/unit/integration 测试与必要构建，并按高保真和自适应布局技能提供真实尺寸、SafeArea、文字缩放及交互证据。不能用技能仓库的静态校验替代应用测试。

把领域工具实际命令、退出码、输入路径和结果保存在当前公共 `evidenceRoot` 的 `flutter-domain-checks.json`；成功后向公共 Evidence Manifest 的 `items` 添加 `category: "flutter-domain-checks"`、`status: "PASS"` 与项目相对 `path`。Manifest 保持当前公共工作项、实施包和视觉阶段绑定，由 Work Item 的 `evidenceRef.path` 引用；profile 要求的 `analyze/tests` 和实际视觉/导入类别仍单独提供。

截图由用户人工检查。未执行的真机、模拟器、发布和外部系统操作保持 `NOT_RUN`，不由此工具接入说明自动授权。
