# Reconstruction Examples

## Booking investigation

```python
from support_trace.incident import IncidentReconstructionService, ReconstructionLevel

report = IncidentReconstructionService.reconstruct_booking(
    "booking-uuid",
    level=ReconstructionLevel.DEEP,
)

print(report.summary.status)
print(report.failure.failure_reason if report.failure else "OK")
print(report.narrative)
for rec in report.recommendations:
    print(f"- {rec.action}: {rec.reason}")
```

## Correlation-wide incident

```python
report = IncidentReconstructionService.reconstruct_correlation(correlation_id)
print(report.related_workflows)
print(report.impact.affected_resource_count)
```

## Workflow graph

```python
root = report.workflow_graph.root()
for child in report.workflow_graph.children(root.node_id):
    print(child.label, child.status)
```
