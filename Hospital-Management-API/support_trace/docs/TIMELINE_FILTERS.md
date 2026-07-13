# Timeline Filters

Apply via `TimelineFilter` dataclass passed to `TimelineService.build_*()` methods.

## Supported filters

| Filter | Type |
|--------|------|
| `date_from` / `date_to` | datetime range |
| `categories` | tuple of TimelineCategory values |
| `severities` | INFO, WARNING, ERROR, CRITICAL |
| `tags` | any tag match |
| `workflow_types` | e.g. Booking, Routing |
| `actors` | user_id / actor |
| `statuses` | audit status |
| `sources` | ClinicalAudit, BusinessAudit |
| `action_prefix` | e.g. `routing.` |

Filters apply last in the pipeline (after statistics on unfiltered events in current implementation — statistics reflect pre-filter counts when filter is applied at end).

## Example

```python
from support_trace.timeline import TimelineService
from support_trace.timeline.types import TimelineFilter

result = TimelineService.build_correlation_timeline(
    correlation_id,
    filters=TimelineFilter(
        severities=("Error", "Critical"),
        tags=("retry",),
    ),
)
```
