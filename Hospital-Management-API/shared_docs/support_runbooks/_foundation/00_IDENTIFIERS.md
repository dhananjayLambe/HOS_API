# Identifiers — Name / Mobile / Doctor / Date → IDs

Support engineers usually start with a **patient name**, **mobile**, **doctor**, **date**, or **clinic**. This document maps those inputs to the IDs used by Support APIs and SQL.

**Rule:** Support Trace (`/api/v1/support/`) does **not** search by patient name. Resolve name → structured ID first via Patient APIs, then call Support APIs.

---

## Input → Identifier resolution

| What the caller has | First resolve via | You get | Then use |
|---------------------|-------------------|---------|----------|
| Patient name | `GET /api/patients/search/?query={name}` or `GET /api/patients/list/?q={name}` | `patient_account_id`, `patient_id` (profile), `mobile` | Support patient / search |
| Mobile / phone | Same patient search with digits, or Support search | `patient_account_id`, `phone_number` | `GET /api/v1/support/search?q={mobile}` or `/phone/{phone}` |
| Doctor name / DOC id | Doctor profile / admin UI | `doctor_id`, `user_id` | Filter encounters by doctor + date |
| Date + patient | Patient summary or SQL | `consultation_id`, `encounter_id`, `visit_pnr` | Typed Support lookup |
| Clinic name / CL code | Clinic admin | `clinic_id`, `clinic.code` | Scope patient list / encounters |

---

## Canonical identifiers (store these on the ticket)

| Identifier | Typical source table / field | Notes |
|------------|------------------------------|-------|
| `patient_account_id` | `patient_account_patientaccount.id` | Primary patient key for Support |
| `patient_profile_id` | `patient_account_patientprofile.id` | Returned as `id` / `patient_id` in patient search |
| `public_id` (PAT…) | `patient_account_patientprofile.public_id` | Patient-facing ID (not a separate UHID column) |
| `mobile` / phone | `account_user.username` | Digits; also indexed on `support_trace.phone_number`, `whatsapp_messages.recipient_mobile_number` |
| `encounter_id` | `consultations_core_clinicalencounter.id` | Visit container |
| `visit_pnr` | `consultations_core_clinicalencounter.visit_pnr` | Human visit ID (`YYMMDD-CL-XXXXX-XXX`) |
| `consultation_id` | `consultations_core_consultation.id` | Clinical session |
| `prescription_id` | `consultations_core_prescription.id` | |
| `prescription_pnr` | `consultations_core_prescription.prescription_pnr` | Human RX ID |
| `booking_id` | `diagnostics_engine_diagnosticorder.id` (UUID) | **Booking = DiagnosticOrder PK UUID** — used as `support_trace.booking_id` |
| `order_number` | `diagnostics_engine_diagnosticorder.order_number` | Human order id (e.g. `DX…`) — **not** the same as `booking_id` |
| `order_id` | Often same UUID family as DiagnosticOrder | Also on `support_trace.order_id` |
| `recommendation_id` | Marketplace / Support index | No dedicated Recommendation ORM table |
| `routing_id` | Routing run / decision UUID | Indexed on `support_trace.routing_id` |
| `report_id` | `diagnostics_engine_diagnostictestreport.id` | |
| `whatsapp_message_id` | `whatsapp_messages.id` or Meta `meta_message_id` | |
| `correlation_id` | Logs, audits, `support_trace` | Single cross-cut key for the HTTP/celery journey |
| `workflow_instance_id` | `support_trace.workflow_instance_id` | Support Trace unique workflow key |
| `clinic_id` / `clinic.code` | `clinic_clinic` | Scope / filter |
| `doctor_id` / `public_id` (DOC…) | `doctor_doctor` | |

---

## API shortcuts

### Patient name → IDs

```bash
GET /api/patients/search/?query=Rahul&limit=10
Authorization: Bearer <doctor_or_helpdesk_token>
```

Save: `id` (profile), `patient_account_id`, `mobile`.

### Patient summary → consultations / prescriptions

```bash
GET /api/patients/{patient_profile_id}/summary/
Authorization: Bearer <doctor_or_helpdesk_token>
```

Save: latest `consultations[].id`, `prescriptions[].id` / `consultation_id`.

### Support investigation (any structured ID)

```bash
GET /api/v1/support/search?q={any_id}&expand=timeline,summary,health,relationships
Authorization: Bearer <admin_or_helpdesk_token>
```

Typed examples:

| Need | Endpoint |
|------|----------|
| Patient workflows | `GET /api/v1/support/patient/{patient_account_id}` |
| One consultation | `GET /api/v1/support/consultation/{consultation_id}` |
| Booking / order | `GET /api/v1/support/booking/{booking_id}` |
| Correlation | `GET /api/v1/support/correlation/{correlation_id}` |
| Report | `GET /api/v1/support/report/{report_id}` |
| WhatsApp | `GET /api/v1/support/whatsapp/{message_id}` |
| Phone | `GET /api/v1/support/phone/{phone}` or `search?q={phone}` |

Groups allowed on Support APIs: `superadmin`, `admin`, `helpdesk`, `helpdesk_admin`, `operations`.

---

## Naming anchors (do not invent)

- **Booking** = `diagnostics_engine_diagnosticorder` row; Support Trace `booking_id` = order **UUID**, not `order_number`.
- **Mobile** = usually `account_user.username` (digit string).
- **Incident reconstruction** = Django shell / `IncidentReconstructionService` — **no REST endpoint**.

See also: [`01_TABLE_MAP.md`](01_TABLE_MAP.md).
