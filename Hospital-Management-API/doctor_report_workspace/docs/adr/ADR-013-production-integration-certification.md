# ADR-013 — Production Integration Certification

## Status

Accepted (Milestone 13)

## Context

After Milestone 12 removed the demo provider, the Doctor Report Workspace runs exclusively through `createLiveWorkspaceProvider()` → JWT `backendAxiosClient` → Workspace API v1. Before production go-live, the team needs a repeatable certification that backend contracts, frontend mapping, auth, preview/download, pagination, performance, and observability work together — not another design document.

## Decision

1. **Certify, do not redesign.** Freeze Workspace API v1 DTOs (no add/remove/rename); fix only integration defects (P0 and accepted P1).
2. **Single deliverable:** [INTEGRATION.md](../INTEGRATION.md) holds ownership matrix, journeys, integration matrix, contract certification, Network traces, browser matrix, observability, performance notes, gaps, and the Production Readiness Certificate.
3. **Architecture under test:** UI → live provider → axios → workspace APIs; preview/download via `resolveWorkspaceAccessUrl` (302 Location or authenticated blob). Do not introduce React Query.
4. **Sign-off rule:** Certificate is complete only when **P0 = 0** and every remaining **P1** is accepted in writing with owner + rationale.

## Consequences

- Future releases can reuse INTEGRATION.md as a pre-deploy checklist.
- Known Phase 1 gaps (patient typeahead, `critical` KPI, Phase 2 history) stay documented as accepted P2 — not blockers.
- M13 FE fixes: cursor pagination wired; advanced lab/doctor/branch name-as-id selects disabled until a UUID filter options API exists.

## References

- [INTEGRATION.md](../INTEGRATION.md)
- [API.md](../API.md)
- [ADR-012](ADR-012-production-cutover-live-only.md)
- [PERFORMANCE.md](../PERFORMANCE.md)
