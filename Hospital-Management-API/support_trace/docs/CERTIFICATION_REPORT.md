# Certification Report (M5.9)

## SupportTraceCertificationReport

| Field | Description |
|-------|-------------|
| `overall_score` | Weighted average of category scores (0.0–1.0) |
| `workflow_score` | Workflow indexing integrity |
| `timeline_score` | Timeline certification |
| `search_score` | Identifier / search validation |
| `runtime_score` | Runtime metadata presence |
| `cloudwatch_score` | CloudWatch link builder |
| `api_score` | REST envelope schema |
| `performance_score` | Soft SLA checks |
| `certification_status` | `PASS`, `WARN`, or `FAIL` |
| `warnings` | Tuple of human-readable issues |
| `generated_at` | UTC timestamp |
| `duration_ms` | Total certification run time |

## Status rules

- **PASS** — `overall_score >= 0.85` and no hard "not found" failures
- **WARN** — `overall_score >= 0.6` with warnings
- **FAIL** — below threshold or certification run error

## Example

```python
report = CertificationService.run(workflow_id=wf_id, booking_id=booking_id)
print(report.certification_status, report.overall_score)
for w in report.warnings:
    print(" -", w)
```
