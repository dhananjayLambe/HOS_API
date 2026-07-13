# Timeline Examples

## Correlation timeline (full patient journey)

```python
from support_trace.timeline import TimelineService

result = TimelineService.build_correlation_timeline(correlation_id)

for event in result.events:
    print(
        event.timeline_sequence,
        event.timestamp,
        event.severity,
        event.event,
        f"[{event.category}]",
    )

print("Workflow tree:", result.workflow_tree.as_tree())
print("Stats:", result.statistics)
```

Example output shape:

```
1  08:00  Info     Consultation Started     [Clinical]
2  08:03  Info     Symptoms Recorded        [Clinical]
3  08:08  Info     Recommendation Generated [Business]
4  08:10  Info     Booking Created          [Business]
5  08:14  Info     Lab Assigned             [Decision]
6  08:30  Info     WhatsApp Sent            [Communication]
```

## Booking timeline

```python
result = TimelineService.build_booking_timeline(booking_id)
for snap in result.workflow_snapshots:
    print(snap.workflow_type, snap.workflow_health, snap.status)
```

## Workflow timeline with filter

```python
from support_trace.timeline.types import TimelineFilter

result = TimelineService.build_workflow_timeline(
    workflow_instance_id,
    filters=TimelineFilter(action_prefix="routing."),
)
```
