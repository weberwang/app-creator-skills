# Module Map Template

Use this before implementation planning. It turns global design and architecture into module boundaries, business-flow levels, and page interaction order. A level is determined by prerequisite business outcomes and dependencies, not by folder or technical-layer naming.

## Global Context

- Product scope:
- Primary user path:
- Navigation model:
- Technical design:
- Flutter init:
- Generated `flutter-dev` skill:

## App Team Role Activation

| Core role | Enabled | Activation reason | Default responsibility |
|---|---|---|---|
| Controller | Yes | Required | Orchestration, user decisions, Gate recording, integration |
| Product Manager | | | Scope, value, metrics, business acceptance |
| UX/UI Lead | | | Flow, interaction, visual, accessibility, handoff |
| Tech Lead | | | Architecture, contracts, technical verdict |
| Flutter Engineer | | | Client implementation and tests |
| Backend/Data Engineer | | | API, data, auth, migration, service tests |
| QA Engineer | | | Independent evidence and quality verdict |
| DevOps/Release Engineer | | | Build, CI/CD, signing, rollout, rollback |

## Module Inventory

| Module | Product responsibility | Route ownership | Data ownership | Shared dependencies | Release priority |
|---|---|---|---|---|---|

## Cross-Module Contracts

| Contract | Provider module | Consumer module | Data or event | Required before |
|---|---|---|---|---|

## API / Service Scope

| Service/API | Implementation owner or external owner | Contract/version | Auth/permissions | Idempotency/retry | Migration/rollback | Tests/operations/recovery | Client compatibility |
|---|---|---|---|---|---|---|---|

## Module Dependency Graph

| Module | Depends on | Blocks | Reason |
|---|---|---|---|

## Business-Flow Levels

| Level | Module | Business-flow prerequisite | Entry task | Exit evidence | Required before next level |
|---|---|---|---|---|---|

## Module Refinement Status

The initial plan may leave refinement pending. Complete each row just in time when the module first becomes eligible for implementation.

| Module | Eligible after | Module grilling status | Grilling confirmation | Confirmed scope file | Function/page refinement status |
|---|---|---|---|---|---|

## Level Advancement Gate

| Level | Required task and contract evidence | Acceptance path | Advancement verdict | Explicitly accepted exception |
|---|---|---|---|---|

## Module Acceptance Paths

| Module | Acceptance path | Start state | Success evidence | Integration smoke path |
|---|---|---|---|---|

## Page Interaction Levels

| Level | Module | Page or state | Previous interaction | Next interaction | Required design gate | Exit evidence |
|---|---|---|---|---|---|---|

## Execution Topology

Default to the current checkout, a single writer, and sequential levels. Independent read-only review may run in parallel. Fill the table only when the user explicitly authorizes branches, worktrees, commits, PRs, or parallel writers.

| Business-flow level | Work item | User authorization | DRI role | Acceptance role | Disjoint write scope | Shared-resource locks |
|---|---|---|---|---|---|---|

## Risks

| Risk | Module | Impact | Mitigation |
|---|---|---|---|
