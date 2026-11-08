# Expo 工程与架构

## 确认实际工程

确认目标平台、构建宿主、应用入口、导航、包管理器与锁文件，以及已安装的 Expo SDK、React Native、React 和 Node 版本。依据 `package.json`、锁文件、`app.json` 或 `app.config.*`、路由及原生工程事实核对；通用文件只是线索。新项目按需求使用适用的官方初始化方案，采用 TypeScript 和 Expo Router 前先核实实际需求、版本和可用模板；现有项目不为套用示例迁移导航或改包管理器。

优先官方能力，其次兼容的成熟社区方案，最后自研。新增模块检查其许可证、目标平台、当前 SDK/React Native 版本、原生实现、构建和权限；使用项目已有包管理器与 Expo 对应依赖安装能力，锁文件由实际工具更新。Expo Go 只包含固定原生能力；需要自定义原生模块或配置时用项目自己的 development build，不能因预览可打开就推断对应原生能力已验证。

## 原生工程与配置来源

明确各平台采用以下哪种维护方式，并记录正式来源和实际构建入口：

1. **CNG**：`app.json`/`app.config.*`、依赖及配置插件是可重复生成原生项目的正式输入。原生自定义通过适配当前版本的 config plugin 或本地模块维护；生成目录的临时改动不能替代输入源。按项目实际模式决定 `android/ios` 是否提交和上传。
2. **直接维护原生工程**：`android/`、`ios/` 中的真实原生源码和配置属于正式项目内容；保留其中已有修改，不自动转换为 CNG，也不以生成目录为由忽略或删除。app config 与实际原生工程的同步责任由该项目的构建方案明确。

`expo prebuild --clean` 会删除并重建原生目录。先核对正式来源、已有修改及恢复方式；不得为了消除构建问题盲目执行。核对 Expo Build 实际接收的文件和生成方式：上传中已有原生目录时，其行为与上传中没有原生目录时不同，不能只根据本地配置假设云端生成。

前端页面、状态、领域服务、平台适配/SDK、数据访问与导航按真实职责分开，已有简单项目不强制为凑目录增加包装。页面和弹窗退出时取消订阅、计时器及可取消请求；不可取消操作以请求身份忽略迟到结果。共享数据和本地业务数据按实际需求管理。

SDK 通过有明确所有权的适配模块接入，沿用[公共初始化与隐私约束](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)：必要前置条件真实满足后执行，非首屏必需的 SDK、广告及网络不得阻塞首帧；隐私流程仅在实际需求包含时实施，但 SDK 的授权条件不可绕过。原生配置插件、自动初始化、权限和最终包要与此一致；不虚构已授权或默认新增隐私界面。

## 配置、构建输入与安全

`EXPO_PUBLIC_` 值会进入客户端包，不能存放密钥、私有令牌或签名材料。按实际环境区分公开配置与构建端密钥，不将密钥写入仓库、产物或日志。客户端与构建环境的变量来源分别核对，OTA 和构建配置不得混用未知环境。

根 `.agents/` 是本地工具目录，遵循[公共目录边界](../../app-creator-workflow/references/workflow.md#本地工具目录与项目范围)；`.expo/` 通常是本地开发状态/缓存，`.eas/workflows/` 是可能被项目实际使用的正式构建流程源，不能一并忽略。存在 `.easignore` 时，它代替 `.gitignore` 作为 Expo Build 上传过滤来源；在不覆盖用户规则的情况下同步必要排除，确保根 `.agents/` 不上传，同时保留构建需要的源、配置和资源。单仓多项目应按实际 Git 仓库根与 EAS 上传根核对，而不是假设 Expo 工程目录就是仓库根。

## 官方依据

- [CNG 与 Prebuild](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS 上传排除](https://docs.expo.dev/build-reference/easignore/)
- [客户端环境变量](https://docs.expo.dev/guides/environment-variables/)

以上仅为事实来源，实施时查项目所用版本的官方资料，不假定不同 SDK 主版本行为相同。
