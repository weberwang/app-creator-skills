# Flutter 依赖能力档

依赖按技术设计中的实际能力启用，不默认安装整套包。命中[插件实现触发边界](../../app-stack-flutter/references/plugin-selection.md#插件优先的实现触发边界)后，代码实现优先复用现有插件或采用通过准入的成熟插件；未触发的简单局部逻辑使用 SDK。一个项目可组合多个档位，只安装实际需要的项。

新项目与新增能力按以下候选顺序评估，已有可用实现优先复用。选型、平台准入与证据遵循 [Flutter 插件与技术方案选型](../../app-stack-flutter/references/plugin-selection.md)。候选不锁定版本，不代表全部平台可用；安装前核实发布者文档和项目 SDK。

## 核心档

适用于共享状态、依赖注入、路由或生命周期管理。

| 需要 | 候选依赖 | 启用条件 |
|---|---|---|
| 跨页面/异步状态与依赖注入 | `flutter_riverpod` | 状态确需跨组件共享或可测试注入 |
| Provider 与本地生命周期组合 | `hooks_riverpod`, `flutter_hooks` | Widget 同时需要 Provider 和控制器/焦点/动画生命周期 |

简单应用或局部状态不必启用该档。

## 路由档

| 需要 | 首选候选 | 替代与边界 |
|---|---|---|
| 少量页面入栈/返回 | SDK `Navigator` | 无深链或声明式路由需求时不加包 |
| 深链、URL、声明式路由或多导航分支 | `go_router` | 明确导航 owner、返回、参数与恢复；重定向不代替服务端授权 |

## 网络档

| 需要 | 首选候选 | 替代与边界 |
|---|---|---|
| 普通 HTTP API | `http` | 复用可注入 Client，不为少量请求自建框架 |
| 拦截器、统一取消、上传下载或进度 | `dio` | 确有复杂传输需求时采用；不与 `http` 重复拥有同一 API 客户端 |

HTTP 客户端、DTO、缓存分别决策，不因选 Dio 自动引入接口生成器、全量缓存或自动重试。

## 数据 / API 档

适用于远端 API DTO、持久化 JSON 或生成序列化。

| 需要 | 候选依赖 | 启用条件 |
|---|---|---|
| 注解式 JSON | `json_annotation`; dev `build_runner`, `json_serializable` | 存在 API DTO 或持久化 JSON，且生成代码能降低错误率 |

技术设计同时记录 API 契约与版本、认证授权、幂等/重试、超时、客户端兼容和服务端所有权。不负责服务端实现时只记录依赖与边界。

## 复杂领域档

适用于有大量不可变状态、联合类型或显式失败语义的复杂领域。

| 需要 | 候选依赖 | 启用条件 |
|---|---|---|
| 不可变模型/联合类型 | `freezed_annotation`; dev `build_runner`, `freezed` | 手写等值、复制或联合分支会产生实质复杂度 |
| 显式可恢复失败流 | `fpdart` | 调用方必须组合处理成功与失败，普通异常/结果类型不足 |

不要为少量简单模型或单个错误分支引入该档。

## UI Token 档

| 需要 | 候选依赖 | 启用条件 |
|---|---|---|
| 设计稿尺寸到共享 token 的映射 | `flutter_screenutil` | 项目已决定使用命名 token 映射，且不用于结构响应式布局 |

结构断点、列数、导航、滚动和系统避让仍由约束、`LayoutBuilder` 和 `MediaQuery` 决定。

## 存储档

| 需要 | 首选候选 | 替代与边界 |
|---|---|---|
| 非敏感设置、轻量偏好 | `shared_preferences` | 不存关键数据；写入返回不保证可靠持久化 |
| 会话令牌等敏感小数据 | `flutter_secure_storage` | 核实平台配置、备份/恢复与删除；不等于业务数据库或客户端秘密保险箱 |
| 关系数据、响应式查询、复杂持久化 | `drift` | 接受生成器和平台数据库后端时采用，定义事务、迁移与恢复 |
| 简单 SQL、手写查询 | `sqflite` | 核实实际平台实现；不能假定主包覆盖 Web 与全部桌面平台 |
| 文件、导出或缓存目录 | `path_provider` 加平台文件 API | Web 单独设计浏览器路径；目录定位不等于加密、数据库或持久化保证 |

偏好、安全存储、文件和数据库可按职责组合，同一业务记录只设一个权威存储；同步与备份另按需求设计。

## 平台能力档

| 需要 | 候选 | 启用条件与边界 |
|---|---|---|
| 系统权限 | `permission_handler` 或插件自带接口 | 仅请求当前操作所需权限，避免两套申请逻辑，处理拒绝、撤销与设置返回 |
| 外部链接 | `url_launcher` | 核实 scheme、目标应用与配置，反馈打开失败 |
| 相机/图库选图 | `image_picker` | 持续预览再评估 `camera`，不默认同时安装 |
| 推送或本地提醒 | 后端推送 SDK / `flutter_local_notifications` | 区分远程投递和本地调度，核实权限、时区、后台及重复投递 |

定位、蓝牙、媒体、后台任务等继续执行同一规范，不为目录齐全预装包。Web/桌面能力与移动平台分别核验。

## 服务与商业能力档

| 需要 | 候选方案 | 启用条件与边界 |
|---|---|---|
| 现有自有 API/账号 | 现有契约与客户端 | 优先复用已有后端，不为登录另引入后端 |
| 托管认证/数据/云服务 | Firebase 对应产品包或 `supabase_flutter` | 按数据模型、区域、访问规则、配额、成本与平台选择，不默认双后端或安装整套 |
| 商店内购 | `in_app_purchase` | 核实商品/商店/平台，落实服务端核验、权益与恢复；其他渠道另选官方方案 |
| 崩溃与错误监控 | `sentry_flutter` 或所选后端崩溃产品 | 上报链路有唯一 owner，明确脱敏与同意策略，不默认启用行为分析 |

后端 SDK 只提供客户端能力，可信密钥、授权与交易核验归受信任服务。广告及其他付费服务按供应商、平台和用户授权单独决策。

## 一手资料

以下为候选发布者入口；版本、最低系统和具体能力在项目选型时复核。

- 路由与网络：[go_router](https://pub.dev/packages/go_router)、[http](https://pub.dev/packages/http)、[Dio](https://pub.dev/packages/dio)。
- 存储：[shared_preferences](https://pub.dev/packages/shared_preferences)、[flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage)、[Drift](https://drift.simonbinder.eu/)、[sqflite](https://pub.dev/packages/sqflite)、[path_provider](https://pub.dev/packages/path_provider)。
- 平台：[permission_handler](https://pub.dev/packages/permission_handler)、[url_launcher](https://pub.dev/packages/url_launcher)、[image_picker](https://pub.dev/packages/image_picker)、[camera](https://pub.dev/packages/camera)、[本地通知](https://pub.dev/packages/flutter_local_notifications)。
- 服务：[Firebase](https://firebase.google.com/docs/flutter/setup)、[Supabase](https://supabase.com/docs/reference/dart/introduction)、[内购](https://pub.dev/packages/in_app_purchase)、[Sentry](https://docs.sentry.io/platforms/dart/guides/flutter/)。

## 记录与验证

- `docs/architecture/technical-design.md` 逐项记录启用原因、拒绝的轻量方案、维护/体积/平台风险。
- `docs/architecture/flutter-init.md` 只列实际安装项和对应能力档。
- 只为采用的生成器运行 `fvm dart run build_runner build --delete-conflicting-outputs`。
- 所有项目运行适用的 `fvm flutter analyze` 和 `fvm flutter test`；质量审核只检查实际采用项。
