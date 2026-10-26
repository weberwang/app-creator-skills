# Flutter 工程与状态

## 版本与项目结构

使用 FVM 发现或运行当前项目 Flutter/Dart，不可从本机全局版本推断项目 SDK。检查 `pubspec.yaml`、`pubspec.lock`、`.fvmrc`/`fvm_config.json` 和现有分析/生成命令。源仓库不固定 Flutter 与 Dart 小版本、状态管理或路由依赖。

依据项目现有代码将 `lib/` 分出已稳定的共享基础、独立功能 feature、业务/领域逻辑与 presentation Widgets；页面组件、状态 controller/provider、route 定义归入真正拥有它的 feature，不需要为一次性页面建立新包层级。测试统一在对应 `test/` 模块建立，与生产入口清晰隔离。

仅当多个页面真实复用同一稳定能力、且共享接口已经确认后才提到公共层。不用 `common/manager/util` 取代明确归属和接口。项目已确定领域结构时优先沿用，不为命名整齐而全仓迁移页面。

## 状态与页面路由

一项用户任务只选一个实际状态所有者，说明一次状态更新怎样触发界面更新与失败处理。简单局部状态可以使用 StatefulWidget 等现有机制；只有跨 Widget 共享、可测试注入或恢复生命周期的需求才选状态管理。按已选功能档选择 DI、HTTP/JSON 和代码生成；每个依赖说明替代方案与平台/构建风险。

每个 PAGE 工作项对应产品或功能的一页语义身份，需关联当前真正的路由、导航上下文、表单/列表输入、延迟加载/保存、退出/恢复、可见状态以及系统边界。同一页面在用户流程中的目标状态、弹窗显示层和共享导航依赖按实际关系建模，不机械每个 Widget 建立新页面工单。

记录入栈/返回、深链、恢复到页面的异步数据如何消费和释放。确保局部路由自动 dispose listener/controller，并清理异步交付；不能在每次 build 重建持续拥有的业务状态。无导航、数据库、SDK 或 Native plugin 需求时，不预装相应包。

来源：`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-project-init`、`flutter-project-init/references/dependency-profiles.md`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-tech-design`、`flutter-app-orchestrator/references/artifacts.md`。
