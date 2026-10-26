# Module Scope Template

Use this just in time when a module first becomes eligible for implementation. Audit existing decisions first; run the optional decision sections only when a material gap or conflict requires user input.

## Module

- Name:
- Business-flow level:
- Product responsibility:
- Route ownership:
- Data ownership:
- Source PRD and design artifacts:
- Technical design:
- Existing implementation evidence:

## Module Decision Audit

- Grilling log entry:
- Questions and user answers:
- Included user outcomes confirmed:
- Explicit non-goals confirmed:
- Dependencies and accepted risks confirmed:
- Shared-understanding confirmation:
- Confirmation time:
- Decision needed: Yes / No
- Verdict: Ready / Blocked

## Confirmed Function Inventory

Fill when the audit verdict is `Ready`.

| Function | User outcome | Included behavior | Excluded behavior | Priority | Source decision | Acceptance evidence |
|---|---|---|---|---|---|---|

## Page Function Refinement

Fill only after the confirmed function inventory is complete.

| Page or state | Function | Entry condition | User action | Success result | Empty/loading/error states | Next interaction | Design gate |
|---|---|---|---|---|---|---|---|

## Conditional Module Effect-Image Decision

Complete only when visual scope, page budget, signature strength, or implementation/asset cost needs a new user decision.

- Grilling log entry:
- Module visual outcome:
- Pages and states requiring effect images:
- Page-type budgets and signature requirements:
- Accepted custom-component, motion, bitmap, implementation, and maintenance cost:
- Scope-consistency confirmation:
- Shared-understanding confirmation:
- Confirmation time:
- Gate verdict: Confirmed / Blocked

## Cross-Module Refinement

| Contract | Provider | Consumer | Data or event | Failure behavior | Required before |
|---|---|---|---|---|---|

## API / Service Boundary (Conditional)

- Service implementation owner or external dependency:
- Contract/version and client compatibility:
- Auth/permissions; idempotency/retry/timeout:
- Migration/rollback:
- Service/contract tests:
- Deployment/monitoring and backup/recovery:

## Module Acceptance Path

- Start state:
- Primary path:
- Success evidence:
- Integration smoke path:
- Deferred functions:

## Task Refinement

| Task ID | Vertical slice | Page or state | Depends on | Expected write scope | Acceptance criteria | Verification |
|---|---|---|---|---|---|---|

## Open Decisions

| Decision | Impact | Owner | Blocking |
|---|---|---|---|
