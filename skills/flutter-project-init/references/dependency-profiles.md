# Flutter 依赖能力档

依赖按技术设计中的实际能力启用，不默认安装整套包。先复用 SDK、现有依赖和项目原语，再选择最小档位；一个项目可组合多个档位。

## 核心档

适用于共享状态、依赖注入、路由或生命周期管理。

| 需要 | 候选依赖 | 启用条件 |
|---|---|---|
| 跨页面/异步状态与依赖注入 | `flutter_riverpod` | 状态确需跨组件共享或可测试注入 |
| Provider 与本地生命周期组合 | `hooks_riverpod`, `flutter_hooks` | Widget 同时需要 Provider 和控制器/焦点/动画生命周期 |

简单应用或局部状态不必启用该档。

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

## 记录与验证

- `docs/architecture/technical-design.md` 逐项记录启用原因、拒绝的轻量方案、维护/体积/平台风险。
- `docs/architecture/flutter-init.md` 只列实际安装项和对应能力档。
- 只为采用的生成器运行 `fvm dart run build_runner build --delete-conflicting-outputs`。
- 所有项目运行适用的 `fvm flutter analyze` 和 `fvm flutter test`；质量审核只检查实际采用项。
