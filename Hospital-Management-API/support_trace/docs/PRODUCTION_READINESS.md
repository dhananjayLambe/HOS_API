# Production Readiness (M5.9)

Phase 5 Support Trace platform is **complete** after M5.8 (runtime linking) and M5.9 (certification).

## Capabilities

| Layer | Milestone | Production ready |
|-------|-----------|------------------|
| Mutable projection | M5.1–M5.2 | Yes — audit sync via `on_commit` |
| Identifier resolution | M5.3 | Yes |
| Timeline aggregation | M5.4 | Yes — read-only |
| Investigation engine | M5.5 | Yes |
| REST API | M5.6 | Yes — `/api/v1/support/` |
| Incident reconstruction | M5.7 | Yes |
| Runtime / CloudWatch links | M5.8 | Yes — references only |
| Platform certification | M5.9 | Yes |

## Pre-deploy checklist

1. Run full test suite — baseline **649 passed**
2. Run `CertificationService.run()` against staging golden workflows
3. Verify `APPLICATION_VERSION`, `ENVIRONMENT`, CloudWatch log group env vars
4. Confirm helpdesk JWT role for Support API
5. Review `CERTIFICATION_CHECKLIST.md`

## Explicitly not in Phase 5

- CloudWatch log querying / Log Insights
- OpenSearch, Grafana, X-Ray, OpenTelemetry
- Log content storage in Support Trace
- AI-assisted incident analysis

## Rebuild guarantee

Support Trace remains a **mutable projection**. Full rebuild from Clinical + Business Audit is always possible via `ProjectionEngine`.
