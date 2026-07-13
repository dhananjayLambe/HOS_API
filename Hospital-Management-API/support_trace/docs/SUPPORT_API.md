# Support Investigation API Platform (M5.6)

Read-only REST API at `/api/v1/support/` exposing M5.5 `TraceLookupService` and M5.4 `TimelineService`.

## Architecture

```
DRF View → InvestigationRequest + SupportInvestigationContext
         → SupportInvestigationFacade
         → TraceLookupService / TimelineService
         → serializers/v1 → ApiEnvelope
```

Controllers contain **zero** investigation logic.

## Authentication

JWT only. Groups: `superadmin`, `admin`, `helpdesk`, `helpdesk_admin`, `operations`. Never patient auth.

## Key features

- `expand=timeline,summary,health,relationships,audits,statistics`
- `investigation_id` in every response metadata
- GET + POST `/search`
- Configurable throttling via `SUPPORT_*_RATE` settings

See [SEARCH_API.md](SEARCH_API.md), [WORKFLOW_API.md](WORKFLOW_API.md), [AUTHORIZATION.md](AUTHORIZATION.md).
