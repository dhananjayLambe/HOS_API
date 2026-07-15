# 10 — CloudWatch Runbook

**Single source of truth** for CloudWatch search. Other playbooks must only say: *See `10_CloudWatch_Runbook.md` — search with these IDs: …*

Logger docs: `shared/logging/README.md`. Support Trace may embed `runtime_metadata.cloudwatch_url` when configured.

---

## When to use

- Need request/response logs for a `correlation_id` or `request_id`
- Auth storms, Celery task failures, Meta WhatsApp errors
- Confirm JSON logs land in the correct log group after deploy

---

## Prerequisites

| Variable | Example |
|----------|---------|
| `AWS_REGION` | `ap-south-1` |
| `CLOUDWATCH_LOG_GROUP` | `/doctorprocare/<env>/application` |
| IAM | Logs Read / Insights access |

Local/dev may only have console JSON — CloudWatch applies to staging/production.

---

## IDs to search (preferred order)

1. **`correlation_id`** — from `clinical_audit` / `business_audit` / `support_trace` / response header `X-Correlation-ID`
2. **`request_id`** — header `X-Request-ID` / Support API envelope
3. **`workflow_instance_id`** — Support Trace
4. **`celery_task_id`** — from `support_trace.runtime_metadata` when present
5. Entity IDs (`consultation_id`, `booking_id`, `meta_message_id`) as secondary filters

---

## Console: Logs Insights patterns

Replace group and ID.

```sql
fields @timestamp, level, module, message, correlation_id, request_id
| filter correlation_id = "<CORRELATION_ID>"
| sort @timestamp asc
| limit 200
```

Errors only:

```sql
fields @timestamp, level, module, message, correlation_id
| filter correlation_id = "<CORRELATION_ID>" and level in ["ERROR", "CRITICAL"]
| sort @timestamp asc
```

WhatsApp / provider:

```sql
fields @timestamp, level, message, correlation_id
| filter correlation_id = "<CORRELATION_ID>"
| filter message like /whatsapp|meta|template/i
| sort @timestamp asc
```

Celery:

```sql
fields @timestamp, level, message, celery_task_id, correlation_id
| filter celery_task_id = "<TASK_ID>" or correlation_id = "<CORRELATION_ID>"
| sort @timestamp asc
```

---

## CLI smoke (optional)

From repo `shared/logging` certification helper:

```bash
export CLOUDWATCH_VALIDATION=1
export AWS_REGION=ap-south-1
export CLOUDWATCH_LOG_GROUP=/doctorprocare/<env>/application
python -m shared.logging.certification.cloudwatch_check
```

---

## Support Trace link

```bash
GET /api/v1/support/workflow/{workflow_instance_id}?expand=runtime
```

If `runtime_metadata.cloudwatch_url` is present, open it; otherwise use Insights with `correlation_id` from the same payload.

---

## Escalation

| Symptom | Owner |
|---------|-------|
| Empty Insights for known correlation after deploy | DevOps — group/stream/retention/env mismatch |
| Logger ERROR storm | Backend + module owner |
| Local only / no CW in development | Expected — use runserver JSON console |

---

## Do not

- Copy these recipes into workflow playbooks (link here instead)
- Search by patient **name** in CloudWatch (not indexed)
- Assume CloudWatch stores clinical PHI payloads beyond configured log fields
