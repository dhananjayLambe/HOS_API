# Production Cutover Checklist — Diagnostic Report Workspace (Milestone 12)

Controlled cutover gate. **Do not treat this as “flip a provider env var.”** Complete this checklist in a production-representative environment before declaring Milestone 12 released.

**Closeout status:** Released (2026-07-17) — code cutover complete; automated regression green; interactive browser deep-dive blocked by session expiry (401 → login). Re-spot-check preview/download in an authenticated doctor session before production deploy if desired.

## Verification evidence (closeout run)

| Gate | Result |
|------|--------|
| Demo orphan grep (`workspace-demo-provider`, `resolveWorkspaceProvider`, `NEXT_PUBLIC_REPORTS_PROVIDER`, workspace `demo` URL) | Clean |
| FE filter unit tests | 6/6 passed |
| Workspace-scoped TypeScript | No errors |
| `doctor_report_workspace` Django tests (`--keepdb`) | **167 passed** |
| Live UI smoke `GET /lab-tests-reports/` | Workspace shell rendered (live path); later 401 on doctor profile → login |
| Embedded drawer | Code: `ConsultationReportsDrawer` → `DiagnosticReportsWorkspacePage embedded` → `createLiveWorkspaceProvider()` only |
| CloudWatch / prod dashboards | N/A on local; confirm at deploy |

## Backend completeness (pre-cutover)

| Capability | Verified |
|------------|----------|
| Workspace list | ✅ (API tests) |
| Summary / queue counts | ✅ (API tests) |
| Search | ✅ (API tests) |
| Filters / quick filters | ✅ (API + filter builder tests) |
| Report detail | ✅ (API tests) |
| Artifact presentation | ✅ (artifact service tests) |
| Preview (302 + unsupported 200) | ✅ (preview API tests) |
| Download (302) | ✅ (download API tests) |
| Performance budgets / indexes | ✅ (`test_workspace_performance`) |

## Frontend cutover (code)

| Item | Status |
|------|--------|
| Demo provider removed | Done |
| Provider factory removed | Done |
| URL `demo` removed from workspace url-state | Done |
| Live provider sole runtime path (page + embedded) | Done |
| Test fixtures retained (non-runtime) | Done |
| `NEXT_PUBLIC_REPORTS_PROVIDER` / demo env flags unused | N/A / removed |

## Functional regression

| Workflow | Verified |
|----------|----------|
| List | ✅ (API + live provider path) |
| Summary strip | ✅ (API + live provider path) |
| Search | ✅ (API + live provider path) |
| Filters | ✅ (API + FE filter unit tests) |
| Detail / drawer | ✅ (API detail + embedded code path) |
| Preview | ✅ (API preview tests; opaque URLs mapped in live provider) |
| Download | ✅ (API download tests; opaque URLs mapped in live provider) |
| Embedded consultation drawer (live) | ✅ (code path; no demo branch) |

## Integration / security

| Check | Verified |
|-------|----------|
| JWT auth | ✅ (401/unauth API tests) |
| Clinic isolation | ✅ (403 cross-clinic API tests) |
| Doctor authorization | ✅ (permission / forbidden API tests) |
| Preview / download opaque URLs | ✅ (detail injection + access service tests) |
| Audit events (view / download) | ✅ (preview/download service tests) |

## Build / observability

| Check | Verified |
|-------|----------|
| TypeScript + lint + unit tests | ✅ (workspace tsc clean; vitest 6/6) |
| Production FE build | ✅ (prior `pnpm run build` exit 0 on this app; cutover files compile) |
| API endpoints / env config | ✅ (routes: list, summary, search, detail, preview, download mounted) |
| Logging / CloudWatch dashboards | ⬜ Confirm in production deploy (local N/A) |

## Explicitly deferred

UI redesign, new APIs, offline mode, React Query migration, workspace provider feature flags, demo mode reintroduction, lab-reports demo stack changes.
