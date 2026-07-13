# Event Display Registry

Configuration-driven event titles, severity, tags, and UI metadata.

## Location

`support_trace/timeline/event_registry.py`

## Entry shape

```python
EventDisplaySpec(
    title="Booking Created",
    category=TimelineCategory.BUSINESS,
    severity=TimelineSeverity.INFO,
    default_summary="Diagnostic booking created",
    tags=("booking",),
    icon="calendar",
    color="green",
)
```

## Usage

Adapters call `EventRegistry.resolve(action, fallback_event=..., fallback_category=...)`.

Unknown actions fall back to audit `event` column with INFO severity.

## Certification

`CERTIFICATION_REQUIRED_ACTIONS` in `constants.py` — all must have registry entries for M5.9 certification.

## Extension

Add one entry per new audit action. No adapter or engine changes required.
