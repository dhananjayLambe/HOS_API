# Business Audit Service

## Public API

```python
BusinessAuditService.record(...) -> BusinessAuditResult
```

Centralized, fail-open entry point. Business logic must never depend on audit success unless `raise_on_failure=True`.

## BusinessAuditResult

| Field | Type | Description |
|---|---|---|
| `success` | bool | Whether the record was persisted |
| `audit_id` | UUID \| None | Saved row ID |
| `correlation_id` | str | Resolved correlation ID |
| `workflow_instance_id` | str | Workflow execution ID |
| `sequence_no` | int \| None | Assigned sequence within instance |
| `error` | str \| None | Error message on failure |
| `error_type` | str \| None | Exception class name on failure |

## Required parameters

- `action`, `event`
- `workflow_type`, `workflow_instance_id`
- `category`, `domain`, `service`, `operation`
- `resource_type`, `resource_id`
- `organization_id`, `status`, `actor_type`

## Common optional parameters

| Parameter | Default | Notes |
|---|---|---|
| `outcome` | `Unknown` | Result separate from lifecycle status |
| `sequence_no` | auto | Next value from repository max + 1 |
| `parent_workflow_instance_id` | from LogContext | Nested workflow parent |
| `correlation_id` | from LogContext or generated | Patient journey |
| `state_before` / `state_after` | None | Workflow state transition |
| `started_at` / `finished_at` | None | `execution_time_ms` derived when both set |
| `payload` | None | Sanitized and wrapped in envelope |
| `external_provider` / `provider_reference` | None | Third-party correlation |
| `validate_references` | True | Checks organization exists |
| `raise_on_failure` | False | Re-raise on validation/persistence errors |

## Fail-open behavior

On validation, build, or repository errors:

1. Logs `business_audit_record_failed` with correlation and workflow context
2. Returns `BusinessAuditResult(success=False, ...)`
3. Does not interrupt caller unless `raise_on_failure=True`

## Validation rules

- `workflow_instance_id` and `organization_id` must be valid UUIDs
- `domain`, `service`, `operation` are required non-empty strings
- `finished_at` cannot precede `started_at`
- Payloads are sanitized (forbidden keys stripped, size limits enforced)

## Internal flow

```
record()
  → BusinessAuditRequestValidator.validate()
  → BusinessAuditBuilder.build()
  → BusinessAuditRepository.save()
```
