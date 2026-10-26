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
- Splash:

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
