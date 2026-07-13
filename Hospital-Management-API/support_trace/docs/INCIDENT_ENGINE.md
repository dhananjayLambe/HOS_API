# Incident Engine

## Pipeline

```
Identifier → IncidentContext → ReconstructionEngine
  → TraceLookupService (M5.5)
  → Pluggable analyzers (failure, retry, duration, impact)
  → Builders (graph, summary, narrative, recommendations)
  → IncidentReport
```

## Public API

`IncidentReconstructionService` in `support_trace/incident/incident_service.py`:

- `reconstruct_any(raw)`
- `reconstruct_booking`, `reconstruct_report`, `reconstruct_consultation`, etc.
- `reconstruct_workflow`, `reconstruct_correlation`, `reconstruct_patient`

## Levels

| Level | Output |
|-------|--------|
| BASIC | Timeline only |
| STANDARD | + summary |
| FULL | + graph, failures, retries, impact, duration |
| DEEP | + narrative + recommendations |
