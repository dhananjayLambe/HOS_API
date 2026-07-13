# Certification Checklist (M5.9)

Use before production rollout or after major Support Trace changes.

## Workflow

- [ ] Traces indexed for active workflows
- [ ] `correlation_id` present on all traces
- [ ] Parent workflow links resolve to existing traces
- [ ] Terminal states consistent with audit history

## Identifiers

- [ ] Booking lookup returns expected traces
- [ ] Correlation lookup returns related traces
- [ ] Search vector populated for indexed identifiers

## Investigation

- [ ] `TraceLookupService.lookup_by_workflow` returns primary trace
- [ ] Timeline built with monotonic sequence
- [ ] Investigation certification warnings reviewed

## Incident

- [ ] Booking reconstruction produces graph + narrative
- [ ] Failed WhatsApp / retry scenarios certified

## Runtime (M5.8)

- [ ] `runtime_metadata` populated on new traces
- [ ] `cloudwatch_url` is valid HTTPS console link
- [ ] Celery/Lambda/deployment keys present when applicable

## API (M5.6)

- [ ] Envelope includes `success`, `request_id`, `data`, `metadata`
- [ ] `metadata.investigation_id` and `api_version` present
- [ ] `expand=runtime` returns runtime block

## Integrity

- [ ] No duplicate `workflow_instance_id`
- [ ] No orphan parent references

## Performance

- [ ] Search &lt; 100 ms (soft, 5× in CI)
- [ ] Lookup &lt; 150 ms
- [ ] Timeline &lt; 200 ms
- [ ] Incident &lt; 350 ms
- [ ] Runtime capture &lt; 20 ms

Run programmatically:

```python
CertificationService.run(scope="platform", workflow_id=..., booking_id=..., correlation_id=...)
```
