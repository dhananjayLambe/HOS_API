# How to Test Support Runbooks (SQL + APIs)

Practice runbook **[08 Patient Journey](08_Patient_Journey_Runbook.md)** against local Postgres (`demo5_db`): find a real patient, run SQL from [`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md), call Support APIs with the same IDs, and compare results.

```text
Pick name/mobile
  → SQL (P-01 / P-02)
  → Walk Expected DB State (encounter → consultation → … → support_trace)
  → GET /api/v1/support/...
  → Pass if SQL rows ≈ API timeline
```

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## Prerequisites

| Need | How |
|------|-----|
| Postgres | `demo5_db` on `localhost:5432` (see `main/settings.py`) |
| Django venv | `HOS_API/Hospital-Management-API` + `.venv` activated |
| API server | `python manage.py runserver` |
| Doctor JWT | For `/api/patients/search/` (optional double-check) |
| Admin / helpdesk JWT | Required for `/api/v1/support/` |

If your DB has **no consultations yet**, complete one visit in the doctor UI first, then start at Step 2. Empty SQL is not a broken guide — the runbook correctly flags **failure locus = no encounter**.

---

## Step 1 — Open DB shell

```bash
cd HOS_API/Hospital-Management-API
source .venv/bin/activate
python manage.py dbshell
```

Or use any Postgres client: host `localhost`, port `5432`, database `demo5_db`, user `postgres`.

---

## Step 2 — Discover a patient (Quick Triage)

### By name (P-01)

Replace `Rahul` / last name as needed:

```sql
SELECT p.id AS profile_id, p.public_id, p.first_name, p.last_name, p.account_id,
       u.username AS mobile
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE p.first_name ILIKE '%Rahul%' AND p.is_active = true
LIMIT 20;
```

### By mobile (P-02)

```sql
SELECT p.id AS profile_id, p.public_id, p.account_id, u.username AS mobile
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE u.username LIKE '%9876543210%'
LIMIT 20;
```

### No name in mind? List recent profiles

```sql
SELECT p.first_name, p.last_name, p.account_id, p.id AS profile_id, u.username AS mobile
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
ORDER BY p.id DESC
LIMIT 10;
```

**Scratch pad — write these down:**

```text
account_id   (patient_account_id) = ________________
profile_id                        = ________________
mobile                            = ________________
```

---

## Step 3 — Walk Expected DB State (runbook 08 §7)

Run in order. **Empty result at any step = failure locus** → open the matching playbook (01–07).

| # | Check | Query | Expect |
|---|-------|-------|--------|
| 1 | Encounter | P-06 | ≥1 row with `visit_pnr` |
| 2 | Consultation | C-03 | consultation id(s) |
| 3 | Prescription | RX-01 | optional |
| 4 | Booking / order | B-01 | optional; save `id` as `booking_id` |
| 5 | Support Trace | ST-03 | rows for this patient |
| 6 | Clinical audit | C-12 | events for `consultation_id` |

### 3.1 Encounters (P-06)

```sql
SELECT e.id, e.visit_pnr, e.status, e.created_at, e.doctor_id, e.clinic_id
FROM consultations_core_clinicalencounter e
WHERE e.patient_account_id = '<patient_account_id>'
ORDER BY e.created_at DESC
LIMIT 20;
```

### 3.2 Consultations (C-03)

```sql
SELECT c.id, c.started_at, c.is_finalized, e.visit_pnr, e.status
FROM consultations_core_consultation c
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE e.patient_account_id = '<patient_account_id>'
ORDER BY c.started_at DESC NULLS LAST
LIMIT 15;
```

**Save:** `consultation_id = ________________`

### 3.3 Prescription (RX-01) — optional

```sql
SELECT id, prescription_pnr, status, is_active, finalized_at, created_at
FROM consultations_core_prescription
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;
```

### 3.4 Booking / DiagnosticOrder (B-01) — optional

```sql
SELECT id, order_number, consultation_id, encounter_id, branch_id, status, created_at
FROM diagnostics_engine_diagnosticorder
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;
```

**Save:** `booking_id` = order **`id` (UUID)**, not `order_number`.

### 3.5 Support Trace (ST-03)

```sql
SELECT workflow_instance_id, workflow_type, status, last_event,
       consultation_id, booking_id, correlation_id, last_event_at
FROM support_trace
WHERE patient_account_id = '<patient_account_id>'
ORDER BY last_event_at DESC
LIMIT 30;
```

Or by consultation (ST-04):

```sql
SELECT * FROM support_trace WHERE consultation_id = '<consultation_id>';
```

**Save:** `correlation_id = ________________` · `workflow_instance_id = ________________`

### 3.6 Clinical audit (C-12)

```sql
SELECT action, module, outcome, timestamp, correlation_id, resource_id
FROM clinical_audit
WHERE consultation_id = '<consultation_id>'
ORDER BY timestamp;
```

### 3.7 Correlation cross-check (ST-16)

```sql
SELECT 'clinical' AS src, COUNT(*) FROM clinical_audit WHERE correlation_id = '<correlation_id>'
UNION ALL
SELECT 'business', COUNT(*) FROM business_audit WHERE correlation_id = '<correlation_id>'
UNION ALL
SELECT 'support_trace', COUNT(*) FROM support_trace WHERE correlation_id = '<correlation_id>';
```

---

## Step 4 — Cross-check with Support APIs

Keep `runserver` running in another terminal.

### 4.1 Get tokens

```bash
# Doctor (patient search)
curl -s -X POST http://localhost:8000/api/doctor/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"<doctor>","password":"<password>"}' | jq -r .access_token

# Admin or helpdesk (Support APIs)
curl -s -X POST http://localhost:8000/api/admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"<admin>","password":"<password>"}' | jq -r .access_token
```

Export for the rest of the session:

```bash
export DOCTOR_TOKEN="<doctor_access_token>"
export SUPPORT_TOKEN="<admin_or_helpdesk_access_token>"
export ACCOUNT_ID="<patient_account_id>"
export PROFILE_ID="<profile_id>"
export CONSULTATION_ID="<consultation_id>"
export BOOKING_ID="<booking_id>"   # if any
```

### 4.2 Optional: Patient API (same IDs as SQL)

```bash
curl -s "http://localhost:8000/api/patients/search/?query=<name>&limit=10" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" | jq .

curl -s "http://localhost:8000/api/patients/${PROFILE_ID}/summary/" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" | jq .
```

### 4.3 Support investigation

```bash
# All workflows for patient
curl -s "http://localhost:8000/api/v1/support/patient/${ACCOUNT_ID}?expand=timeline,summary,health,relationships" \
  -H "Authorization: Bearer ${SUPPORT_TOKEN}" | jq .

# One consultation
curl -s "http://localhost:8000/api/v1/support/consultation/${CONSULTATION_ID}?expand=timeline,summary,health,relationships,audits" \
  -H "Authorization: Bearer ${SUPPORT_TOKEN}" | jq .

# Booking (if Step 3.4 returned an order)
curl -s "http://localhost:8000/api/v1/support/booking/${BOOKING_ID}?expand=timeline,summary,health,relationships" \
  -H "Authorization: Bearer ${SUPPORT_TOKEN}" | jq .

# Search by mobile
curl -s "http://localhost:8000/api/v1/support/search?q=<mobile>&expand=timeline,summary,health" \
  -H "Authorization: Bearer ${SUPPORT_TOKEN}" | jq .
```

### What to look for in the JSON

| Field | Should match |
|-------|----------------|
| `success` | `true` |
| `data.primary_trace` / traces | Same `consultation_id` / `booking_id` as SQL |
| `metadata.correlation_id` or trace `correlation_id` | Same as ST-03 / C-12 |
| `data.timeline.events[].event` or `.action` | Same actions as `clinical_audit` / `business_audit` |
| `data.summary.narrative` | Human-readable status |

### Optional: incident reconstruction (no REST)

```bash
python manage.py shell
```

```python
from support_trace.incident import IncidentReconstructionService, ReconstructionLevel
report = IncidentReconstructionService.reconstruct_booking("<booking_id>", level=ReconstructionLevel.FULL)
print(report.summary)
for e in report.timeline.events:
    print(e.timeline_sequence, e.event, getattr(e, "summary", ""))
```

CloudWatch (staging/prod only): see [`10_CloudWatch_Runbook.md`](10_CloudWatch_Runbook.md) with the saved `correlation_id`.

---

## Step 5 — Pass / fail checklist

- [ ] P-01 / P-02 (or recent list) returned the patient
- [ ] Encounter + consultation found for the visit (P-06, C-03)
- [ ] `support_trace` row exists for patient or consultation (ST-03 / ST-04)  
      — if audits exist but trace is empty → escalate Backend / projection (runbook 08)
- [ ] Support API returns **200** with primary trace / timeline
- [ ] SQL audit actions ≈ API timeline order and `correlation_id` matches
- [ ] Ticket / notes have: `account_id`, `consultation_id`, `correlation_id`, and `booking_id` if applicable

**Pass:** checklist complete.  
**Fail:** stop at first empty Expected DB link and open the specialized runbook (01 Consultation, 03 Booking, 05–07 Report/WhatsApp, etc.).

---

## Quick reference — query IDs used here

| ID | File section |
|----|----------------|
| P-01, P-02, P-06 | [`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md) — Patient |
| C-03, C-12 | Consultation |
| RX-01 | Prescription |
| B-01 | Booking / Order |
| ST-03, ST-04, ST-16 | Support Trace + Audits |

Full catalog: [`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md).

---

## Scratch pad

```text
Patient name / mobile: ________________________________
account_id:           ________________________________
profile_id:           ________________________________
consultation_id:      ________________________________
booking_id:           ________________________________
correlation_id:       ________________________________
workflow_instance_id: ________________________________
Result (Pass / Fail + gap): ____________________________
```
