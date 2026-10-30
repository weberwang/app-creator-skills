# Technical Design Template

## Context

- Product / MVP:
- App and service type:
- Verification platforms: `docs/architecture/verification-platforms.md`
- Server implementation responsibility: In scope / Out of scope; owner and boundary:

## Architecture Decisions

| Area | Decision | Reason | Rejected alternatives |
|---|---|---|---|
| State and dependency injection | | | |
| Routing | | | |
| Persistence | | | |
| Networking | | | |
| Auth and permissions | | | |
| Payments | | | |
| Analytics / crash / logs | | | |
| Environment / secrets | | | |

## Dependency Capability Profiles

Delete unused rows. Quality review checks only adopted items.

| Profile | Package(s) | Capability requiring it | Rejected lighter option | Risk/maintenance notes |
|---|---|---|---|---|
| Core | | | | |
| Data/API | | | | |
| Complex domain | | | | |
| UI token | | | | |
| 路由 / 网络 / 存储 / 平台 / 服务（按需拆行） | | | | |

## 插件与技术方案准入

按项目根目录下 `.agents/skills/app-stack-flutter/references/plugin-selection.md` 的选型规范逐实际能力记录；技能安装位置不同则按实际路径定位。未采用项写明原因，无需求项不创建占位实现。

| 能力 | 采用方案 / 不采用 | 替代方案及拒绝原因 | 锁定版本 / SDK 约束 | 一手来源与核查日期 | 实现 owner |
|---|---|---|---|---|---|
| | | | | | |

| 插件 / 服务 | 目标平台与最低系统 | 原生配置 / 权限 / 工具链 | 数据出端 / 同意 / 密钥 / 费用 | 失败、恢复与释放责任 | 验证命令 / 结果 / 未覆盖项 |
|---|---|---|---|---|---|
| | | | | | |

- 数据权威、离线策略及同步冲突规则（适用时）：
- 客户端与可信服务边界、服务 owner：
- 不支持平台的产品行为：
- 未决产品、账号、成本选择及负责人：

## Module Boundaries

| Module | Responsibility | Route owner | State owner | Data owner | External dependencies |
|---|---|---|---|---|---|

## Adaptive Layout Infrastructure

- Shared breakpoint resolver and content-constraint policy:
- Page container / maximum width / columns / gutter primitives:
- Scroll-owner and nested-scroll policy:
- Fixed, floating, pinned and docked primitives with occlusion padding:
- SafeArea, system-bar, keyboard, fold and split-screen inset policy:
- Layout-spec location and validator command:

## Cross-Module Contracts

| Contract | Provider | Consumer | Data/event | Version | Failure behavior |
|---|---|---|---|---|---|

## API / Service Contract

If service implementation is out of scope, keep only dependency, owner, assumptions, compatibility and escalation boundaries.

- Contract source and versioning policy:
- Request/response/error schema:
- Authentication and authorization:
- Idempotency, retry, timeout and rate limits:
- Client compatibility and deprecation window:
- External owner / availability dependency:

## Data, Migration And Recovery

| Entity/store | Owner | Persistence | Privacy | Migration | Rollback | Backup/recovery |
|---|---|---|---|---|---|---|

## Service Delivery (Conditional)

- Service unit/integration/contract tests:
- Migration rehearsal and rollback verification:
- Deployment environments and rollout:
- Monitoring, logs, metrics, traces and alerts:
- Backup restore test and recovery objectives:

## Error Handling

- Network/auth/payment/offline/data-corruption behavior:
- Retry safety and duplicate prevention:
- User recovery and support escalation:

## Testing And Verification

- Unit / widget / golden / integration:
- API contract and service tests:
- Foundation startup/routing/plugin smoke:
- Critical-flow primary-target runtime smoke:
- Final platform matrix: `docs/architecture/verification-platforms.md`
- Manual physical-device acceptance: user-authorized only

## Verification Commands

- Project-native analysis/test/build commands:
- Contract/migration/service commands when in scope:

## Risks

| Risk | Owner | Mitigation / rollback |
|---|---|---|
