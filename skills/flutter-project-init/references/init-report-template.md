# Flutter Init Report Template

## Project

- App name:
- Target path:
- New or existing:
- Flutter / FVM SDK version:
- 屏幕方向：竖屏 / 横屏 / 双方向（初始化时选择并记录）

## Technical Design Inputs

- Technical design path:
- Verification platform path:
- Approved by:

## Enabled Dependency Profiles

Delete profiles that are not enabled.

| Profile | Packages | Capability requiring it | Rejected lighter option | Runtime/size/maintenance/platform risk |
|---|---|---|---|---|
| Core | | | | |
| Data/API | | | | |
| Complex domain | | | | |
| UI token | | | | |
| 路由 / 网络 / 存储 / 平台 / 服务（按需拆行） | | | | |

## 插件准入与选型落地

- 技术设计中的选型记录位置：
- 实际安装包、解析版本与锁文件（含生成器/原生依赖）：
- 一手来源、核查日期与许可证/维护风险：
- 目标平台、最低系统、原生工具链和未支持能力：
- 已落实的权限、原生配置与 SDK 独立实现 owner：
- 数据出端、同意、客户端配置与可信密钥边界：
- 服务账号/费用 owner 与未决事项：
- 已验证范围、缺失工具链/凭据与证据路径：

## API / Service Boundary

- Service implementation owned here: Yes / No
- Contract and version:
- Auth/permission boundary:
- Idempotency, retry, timeout:
- Migration/rollback and client compatibility:
- External owner/dependency when service implementation is out of scope:

## Generated Local Skill

- Path:
- Active profiles reflected:
- Notes:

## App Setup

- App shell / theme / routing:
- Lints and test scaffolding:
- Conditional code generation:

## Verification

- Applicable generation command:
- `fvm flutter analyze`:
- `fvm flutter test`:
- Representative startup/routing/plugin smoke:
- Evidence and blockers:

## Open Risks

| Risk | Mitigation |
|---|---|
