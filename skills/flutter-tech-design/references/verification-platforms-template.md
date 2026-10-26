# Verification Platforms Template

This is the single source of truth for app-wide platform scope. Task briefs and reviews link here instead of copying platform lists.

## Scope

- Owner / last updated:
- Primary target platform:
- Evidence root:
- Physical-device acceptance: only when explicitly authorized by the user

## Layer 1: Shared Foundation Smoke

Run as soon as the shared foundation is usable; do not wait for final integration.

| Representative target | Startup | Routing | Enabled plugins | Command | Evidence / status |
|---|---|---|---|---|---|

## Layer 2: Critical Business-Flow Smoke

Run after each critical flow is complete on the primary target platform.

| Flow | Target | Runtime path | Command | Evidence / status |
|---|---|---|---|---|

## Layer 3: Final Platform Matrix

Run at final integration or release.

| Platform | Runtime target | Required build/test/smoke | Commands | Evidence | Status |
|---|---|---|---|---|---|
| Android | Emulator or authorized device | | | | |
| iOS | Simulator or authorized device | | | | |
| Web | Browser | | | | |
| Desktop | OS target | | | | |

Remove out-of-scope rows and record the reason below.

## Out Of Scope

| Platform | Reason |
|---|---|

## Evidence Rules

- Layer 1 and Layer 2 prove only their named target, route/plugin, or business-flow facts; they never establish full platform coverage.
- A platform is fully verified only when its Layer 3 commands and required runtime/UI evidence pass.
- Record blocked evidence honestly. Do not mark an unrun command or unavailable target as passed.
- Do not automatically launch physical-device acceptance.
