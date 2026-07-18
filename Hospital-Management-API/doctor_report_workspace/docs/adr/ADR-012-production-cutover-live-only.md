# ADR-012 — Production cutover: live-only Diagnostic Report Workspace

## Status

Accepted (Milestone 12)

## Context

During Phase 1 development the doctor Diagnostic Report Workspace frontend supported a demo/fixture provider selectable via URL (`demo`, default ON) and an unused env toggle (`NEXT_PUBLIC_DIAGNOSTIC_REPORTS_DEMO`). Embedded consultation drawers always forced demo data.

Backend milestones for list, summary, search, filters, detail, artifacts, preview, download, and performance budgets are complete. Continuing to ship a dual-provider factory risks accidental demo mode in production and adds dead abstraction.

## Decision

1. **Single data path:** UI always uses `createLiveWorkspaceProvider()` against production APIs.
2. **Remove runtime demo:** delete `workspace-demo-provider`, provider factory / `resolveWorkspaceProvider`, and URL `demo` state.
3. **No feature flag:** do not introduce `NEXT_PUBLIC_REPORTS_PROVIDER` (it never existed for this workspace); remove any demo env checks.
4. **Keep interface:** retain `DiagnosticReportsWorkspaceProvider` as the typed contract for the live client (not a multi-implementation factory).
5. **Test fixtures only:** relocate sample reports to `workspace-test-fixtures.ts` for unit tests; never import from production UI.
6. **Out of scope:** UI redesign, API/DTO changes, lab-reports demo stack, reintroducing demo mode.

## Consequences

- Full and embedded workspace sessions require authenticated live APIs and clinic scope.
- `?demo=0` / `?demo=1` no longer affect this workspace (lab reports demo remains separate).
- Regression must be validated against a production-like backend before release ([PRODUCTION_CUTOVER.md](../PRODUCTION_CUTOVER.md)).
