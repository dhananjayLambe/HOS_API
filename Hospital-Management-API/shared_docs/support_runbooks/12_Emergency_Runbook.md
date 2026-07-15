# 12 — Emergency Runbook

Platform-down and infrastructure emergencies. Patient journey debugging → [08](08_Patient_Journey_Runbook.md). CloudWatch recipes → [10](10_CloudWatch_Runbook.md).

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Symptom (API 5xx / DB / Redis / Celery / WA / S3)  □ Environment  □ Start time
  First Action: Confirm blast radius (all users vs one tenant) → check runserver/ALB health, Postgres, Redis, Celery inspect, disk
  Expected Output: □ Failed layer identified  □ On-call owner  □ Mitigate or escalate
```

## 1. Purpose

Restore platform availability: API, database, cache/broker, workers, object storage, WhatsApp provider connectivity.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | Production unavailable or data-loss risk |
| **P2** | Degraded (Celery backlog, WA only down) |
| **P3** | Single AZ / non-prod |
| **P4** | Planned maintenance |

## 3. User may say

- “App down / 502 / cannot login anyone.”
- “Jobs not processing / reports not sending.”
- “Everything slow / timeouts.”

## 4. Information to collect

- Environment, region, UTC start, error samples, deploy version if known

## 5. Escalation

| Layer | Owner |
|-------|-------|
| AWS ALB / compute / CW | DevOps / Infra |
| Postgres | Backend / DBA |
| Redis / Celery | Backend |
| S3 | Infra |
| Meta WhatsApp | Infra |
| Bad deploy | DevOps — rollback |

## 6. Investigation flow

```text
Health URL / ALB target health
  → Postgres: SELECT 1; connection count; locks
  → Redis: PING; memory
  → Celery: inspect ping; queue depth
  → S3: put/get test (lab uploads failing)
  → WhatsApp: provider status + recent whatsapp_messages FAILED burst
  → CloudWatch: See 10 for ERROR storm
```

## 7. Expected Database State

N/A — infrastructure. Confirm connectivity only:

```sql
SELECT 1;
SELECT count(*) FROM pg_stat_activity;
```

## 8. API flow

```text
GET /swagger/ or product health endpoint (if any)
POST /api/doctor/login/   # canary auth
GET /api/v1/support/search?q=...  # canary support (needs token)
```

## 9. Expected Audit / Trace / Logs

```text
Expect ERROR/CRITICAL volume spike in CloudWatch — See 10
Support Trace may stop updating if workers/DB stall
```

## 10. SQL / ops commands

```bash
# Celery
celery -A main inspect ping
celery -A main inspect active

# Redis
redis-cli ping

# Django
python manage.py check
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| 502 all APIs | App/container crash; ALB targets unhealthy |
| Timeouts | DB connections exhausted; lock |
| Auth OK, async no | Celery/Redis down |
| Upload fail only | S3 credentials/bucket |
| WA fail only | Meta token / network |

## 12. Resolution

1. Stabilize (scale / restart / failover) per runbook ownership.
2. Rollback last deploy if error rate started at deploy time.
3. Drain Celery backlog after Redis restored.
4. Canary login + one Support search + one known patient read.
5. Post-incident: correlation_ids / CW links on ticket.

**Never** force-push, drop DBs, or recreate production schema from this playbook.

## 13. What Success Looks Like

```text
Success Criteria
  □ API health / login canaries green
  □ Postgres + Redis + Celery healthy
  □ ERROR rate normalized in CloudWatch
  □ Async deliveries resume (WA/report) or backlog plan documented
  □ Incident timeline recorded
```
