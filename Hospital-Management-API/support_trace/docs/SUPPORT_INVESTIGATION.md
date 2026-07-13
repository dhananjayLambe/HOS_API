# Support Investigation Playbook

## When to use

Production support should **always** start with `TraceLookupService` — never query audit tables directly.

## Quick start

```python
from support_trace.lookup import TraceLookupService

# Paste any identifier
result = TraceLookupService.lookup_any("wamid.HBgL...")
result = TraceLookupService.lookup_any("pay_xxxxx")

# Typed lookups
result = TraceLookupService.lookup_by_booking(booking_uuid)
result = TraceLookupService.lookup_by_correlation(correlation_id)
```

## Reading the result

1. **`summary.narrative.text`** — one-paragraph for humans / Jira
2. **`summary.structured`** — admin UI fields + `next_expected_step`
3. **`health`** — workflow, communication, provider dimensions
4. **`timeline.events`** — chronological history
5. **`workflow_graph.to_tree()`** — hierarchy for M5.7 UI

## Export for tickets

```python
from support_trace.lookup.report_builder import InvestigationReportBuilder

InvestigationReportBuilder.to_markdown(result)
```

## Fast checks (BASIC level)

```python
from support_trace.lookup import InvestigationLevel

TraceLookupService.lookup_by_workflow(wf_id, level=InvestigationLevel.BASIC)
```
