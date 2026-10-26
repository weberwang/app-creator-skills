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
