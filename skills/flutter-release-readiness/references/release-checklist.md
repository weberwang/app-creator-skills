# Flutter Release Checklist

## Verdict

- Ready / Not ready:
- Verification platform scope: `docs/architecture/verification-platforms.md`
- Build:

## App Identity

- App name:
- Bundle ID / application ID:
- Version and build number:
- Icons:
- Android/iOS 系统启动屏：原生配置与随包资源、首帧衔接及适用工程检查；实际显示由用户人工检查，未运行平台标记未验证：

## Legal and Privacy

- Privacy policy:
- Terms:
- Consent:
- Data deletion:
- Account deletion:
- Tracking disclosure:
- App Store Privacy Nutrition Labels:
- Google Play Data Safety:
- Data collection disclosure matches SDK behavior:
- Export compliance / encryption declaration:
- iOS entitlements:
- Android permissions and manifest disclosures:

## Monetization

商品、购买、恢复和订阅条目仅在实际提供对应能力时填写；SDK 必要性核对始终适用。

- 商店内购实际功能与 SDK 必要性：购买、订阅、恢复及既有权益逐项核对；无功能时移除专用 SDK 和接入，检查最终包及依赖，范围不明标记待确认。依据为项目根目录 `.agents/skills/app-release/references/release-readiness.md` 的“内购 SDK 必要性与移除”：
- Products configured:
- Purchase flow:
- Failure flow:
- Restore purchase:
- Receipt validation:
- Subscription status sync:

## Reliability

- Crash reporting:
- Analytics:
- Logging:
- Network failure handling:
- Offline behavior:
- Support channel:
- Alert owner:
- Rollback or hotfix plan:

## API / Service Delivery (Conditional)

- Contract/version and compatible client range:
- Authentication/authorization and permission review:
- Idempotency, retry, timeout and rate-limit evidence:
- Database/schema migration rehearsal and rollback:
- Service unit/integration/contract tests:
- Deployment strategy, monitoring, alerts and on-call owner:
- Backup restore test, recovery objectives and evidence:
- External service owner/dependency boundary when server implementation is out of scope:

## Store Assets

- Screenshots:
- Description:
- Keywords:
- Category:
- Age rating:
- Test account:

## CI and Supply Chain

- CI release workflow:
- Dependency license review:
- Signing key storage:
- Production secrets are not committed:

## Verification

- `fvm flutter analyze`:
- `fvm flutter test`:
- Integration tests:
- Foundation startup/routing/plugin smoke evidence:
- Critical-flow primary-target runtime smoke evidence:
- Required platform build and smoke evidence: `docs/architecture/verification-platforms.md`
- Final runtime matrix: complete for every in-scope platform; record evidence in `docs/architecture/verification-platforms.md`
- Physical-device acceptance: only with explicit user authorization

## Integration Gate

- Current checkout snapshot-id:
- Existing authorized commit SHA (if any) and clean worktree evidence:
- Required tests / CI:
- Required F2 conclusions and F3 verdict:
- Merge / release authorization:

## Blockers

| Blocker | Owner | Status |
|---|---|---|

## Non-Blocking Risks

| Risk | Mitigation |
|---|---|
