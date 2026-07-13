# Incident Summary

`IncidentSummaryBuilder` produces structured summary:

- Status, completed flag, has_failure
- Retry count, duration display, affected resource count
- Failure stage when applicable

Composes M5.5 `SummaryBuilder` output without duplication.
