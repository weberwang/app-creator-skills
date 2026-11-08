# Flutter 工程与状态

## 版本与项目结构

涉及当前范围的项目整理或清理时，遵循[公共清理规范](../../app-artifact-cleanup/references/project-cleanup.md)，核对 `pubspec.yaml` 资源声明、代码生成输入／输出、平台构建及实际 Widget 或动态资源消费者；生成文件仅按项目既有生成合同判定可否重建。按受影响范围检查资源解析、生成结果及适用分析、测试或构建；未运行的平台验证保持未验证。

使用 FVM 发现或运行当前项目 Flutter/Dart，不可从本机全局版本推断项目 SDK。检查 `pubspec.yaml`、`pubspec.lock`、`.fvmrc`/`fvm_config.json` 和现有分析/生成命令。源仓库不固定 Flutter 与 Dart 小版本、状态管理或路由依赖。

依据项目现有代码将 `lib/` 分出已稳定的共享基础、独立功能 feature、业务/领域逻辑与 presentation Widgets；页面组件、状态 controller/provider、route 定义归入真正拥有它的 feature，不需要为一次性页面建立新包层级。测试统一在对应 `test/` 模块建立，与生产入口清晰隔离。

仅当多个页面真实复用同一稳定能力、且共享接口已经确认后才提到公共层。不用 `common/manager/util` 取代明确归属和接口。项目已确定领域结构时优先沿用，不为命名整齐而全仓迁移页面。

## 系统启动屏

目标包含 Android 或 iOS/iPadOS 时，按[系统启动屏规范](../../app-domain-toolkit/references/system-launch-screen.md)配置随包资源、首个稳定帧衔接和适用验证。Flutter Widget 不能替代 Android 原生启动主题或 iOS `LaunchScreen.storyboard` 等实际原生配置；使用生成工具时核对其写入范围，避免覆盖手工配置。优先项目及官方现成能力，沿用现有技术设计、清单和路径，不机械增加插件或新建视觉阶段门；真实显示交用户人工检查，未授权设备运行保持未验证。

## 状态与页面路由

涉及技术设计、新增或替换插件时，按[插件与技术方案选型](plugin-selection.md)和[依赖能力档](../../flutter-project-init/references/dependency-profiles.md)执行；版本、平台准入、替代方案与验证结论写入同一技术设计记录。

第三方 SDK 按[独立管理与初始化规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)接入；独立文件放在实际拥有该能力的 feature，确属跨功能基础能力时可使用 `lib/core/integrations/<sdk>/<sdk>_manager.dart`。应用装配入口通过既有依赖注入方式调用，不把具体 SDK 实现放进 `main.dart` 或页面 Widget。

一项用户任务只选一个实际状态所有者，说明一次状态更新怎样触发界面更新与失败处理。简单局部状态可以使用 StatefulWidget 等现有机制；只有跨 Widget 共享、可测试注入或恢复生命周期的需求才选状态管理。按已选功能档选择 DI、HTTP/JSON 和代码生成；每个依赖说明替代方案与平台/构建风险。

每个 PAGE 工作项对应产品页面或独立公共导航框架的语义身份，按适用范围关联真实路由、导航上下文、表单/列表输入、延迟加载/保存、退出/恢复、可见状态以及系统边界；公共框架可以只承载已有路由，不需要新增专属路由。主页和跨页面常驻框架在确需独立交付时分别管理；局部导航控件保留在所属 PAGE。modal、popup、drawer、toast 使用独立 DISPLAY_LAYER 和单一 `visual.hostId`，不机械为每个 Widget 建立工作项。

共享路由表、导航规则与跨页面状态只设一个明确所有者；跨对象功能可用共享 MODULE 或早期 `feature` INTEGRATION 验证，并按实际行为范围关联相关对象。V1 验证跳转、参数、返回和状态恢复，白盒按风险选择；临时目的地只证明路由通路，不能冒充目的地功能通过。正式组合由 `final` INTEGRATION 按本批次范围重验，无须等待不相关页面 V5。

记录入栈/返回、深链、恢复到页面的异步数据如何消费和释放。确保局部路由自动 dispose listener/controller，并清理异步交付；不能在每次 build 重建持续拥有的业务状态。无导航、数据库、SDK 或 Native plugin 需求时，不预装相应包。

来源：`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-project-init`、`flutter-project-init/references/dependency-profiles.md`、`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-tech-design`、`flutter-app-orchestrator/references/artifacts.md`。
