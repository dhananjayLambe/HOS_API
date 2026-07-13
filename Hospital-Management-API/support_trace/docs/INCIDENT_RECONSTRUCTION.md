# Production Incident Reconstruction (M5.7)

M5.7 is the **intelligence layer** on top of M5.1–M5.6. It produces a canonical `IncidentReport` — a reconstructed investigation model answering what happened, where/why it failed, downstream impact, retries, durations, and operational recommendations.

**Read-only** — no new persistence or audit writes.

## Entry point

```python
from support_trace.incident import IncidentReconstructionService, ReconstructionLevel

report = IncidentReconstructionService.reconstruct_booking(booking_id, level=ReconstructionLevel.FULL)
```

See [INCIDENT_ENGINE.md](INCIDENT_ENGINE.md), [RECONSTRUCTION_EXAMPLES.md](RECONSTRUCTION_EXAMPLES.md).
