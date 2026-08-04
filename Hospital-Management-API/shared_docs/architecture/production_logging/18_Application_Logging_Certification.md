# 18 — Application Logging Certification

DoctorProCare Production Logging & Debug Cleanup

Document Type: Application Quality Gate / Certification Tracker

Version: 1.1

Status: Certified (application adoption)

Related Documents

* [13_Logging_Platform_Certification.md](13_Logging_Platform_Certification.md) — platform (M7) certified
* [03_Logger_Framework.md](03_Logger_Framework.md)
* [01_Logging_Principles.md](01_Logging_Principles.md)
* [15_Logger_Context_Integration.md](15_Logger_Context_Integration.md)
* Live plan: Phase 5.5 — Production Logging & Debug Cleanup

⸻

## Purpose

Milestone M7 certified the **logging platform**. This document certifies that **every application module** adopts that platform consistently, that development-only artifacts are gone, and that the Web UI meets equivalent production-logging standards.

⸻

## Standard API (backend)

```python
from shared.logging import logger, LogModule

logger.info(
    "Doctor created",
    module=LogModule.API,
    action="doctor.created",
    metadata={"doctor_uuid": str(doctor.uuid), "clinic_uuid": str(clinic.uuid)},
)
```

Rules:

* Use the singleton `logger` — there is no `get_logger`.
* Every call requires `module=LogModule.*` and `action="domain.event"`.
* Do not put `correlation_id` / `request_id` in `metadata` (auto-enriched from `LogContext`).
* Prefer `get_context_manager().update(...)` for workflow IDs (`consultation_id`, `report_id`, etc.).

### Allowlisted `print()` / stdlib usage

Keep CLI output in:

* Django management commands
* `scripts/docs/*`
* `shared/logging/certification/*`
* `diagnostics_engine/services/catalog_import/command_helpers.py` (CLI root-logger setup for catalog import commands only)

⸻

## Log levels

| Level | Use |
|-------|-----|
| DEBUG | Development diagnostics only; not required for production ops |
| INFO | Normal business events (login, consultation started, report uploaded) |
| WARNING | Unexpected but recoverable (invalid upload, missing optional data, retry) |
| ERROR | Operation failed (S3/SES/WhatsApp failure, validation/DB exception at boundary) |
| CRITICAL | System unavailable (DB/Redis/Celery/startup failure) |

⸻

## Duplicate logging policy

* There is no global exception-logging middleware.
* Log once at the **handling boundary** with `logger.exception(...)` when catching and recovering or translating.
* If immediately re-raising a DRF/Django `ValidationError` with no extra context, do not also `logger.error` the same message.
* Do not introduce a second global handler in this milestone unless uncaught 500s are invisible in CloudWatch JSON.

⸻

## Sensitive data (must never appear in logs)

* Passwords, JWT / refresh tokens, OTP values
* Authorization headers, AWS secrets / access keys, private keys
* Patient clinical note bodies (unless explicitly required for a named audit path)
* Uploaded file contents

⸻

## TODO / FIXME / XXX / TEMP / DEBUG policy

**Inventory and triage only.** Markers do not block certification unless they indicate unfinished production-unsafe work.

| Location | Marker | Status | Notes |
|----------|--------|--------|-------|
| `medicines/services/suggestion_engine.py` | TODO (×5) | feature note | AI ranking / allergy filtering — future feature |
| `account/api/views.py` | TODO | feature note | SMS gateway integration |
| `clinic/api/urls.py` | TODO | feature note | ClinicSchedule model |
| `consultations_core/models/prescription.py` | TODO | feature note | AI/allergy aggregates |
| `diagnostics_engine/services/reports/report_query_service.py` | TODO | feature note | Bulk query optimization |

No `FIXME` markers in application code. `XXX` hits under masking/`STATUS_TODO` are false positives. **No production blockers.**

⸻

## Phases checklist

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Debug statement audit (API + Web UI) | ☑ |
| 2 | Logging standardization (`shared.logging`) | ☑ |
| 3 | Log level review | ☑ |
| 4 | Duplicate logging review | ☑ |
| 5 | Sensitive data audit | ☑ |
| 6 | Context completeness (Wave-1 workflows) | ☑ |
| 7 | Exception logging hygiene | ☑ |
| 8 | Backend app-by-app certification | ☑ |
| 9 | Frontend certification | ☑ |

⸻

## Backend app certification matrix

Columns: Print removed | Logger standardized | Levels OK | Sensitive data OK | Exceptions OK | Context OK | Certified

| App | Print | Logger | Levels | Sensitive | Exceptions | Context | Certified |
|-----|-------|--------|--------|-----------|------------|---------|-----------|
| account | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| doctor | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| hospitalAdmin | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| hospital_mgmt | ☑ | ☑* | ☑ | ☑ | ☑ | ☑ | ☑ |
| clinic | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| patient_account | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| helpdesk | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| appointments | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| reports | ☑ | ☑* | ☑ | ☑ | ☑ | ☑ | ☑ |
| queue_management | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| consultations_core | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| labs | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| consultation_config | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| support | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| tasks | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| caleder_events | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| medicines | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| analytics | ☑ | ☑* | ☑ | ☑ | ☑ | ☑ | ☑ |
| diagnostics_engine | ☑ | ☑† | ☑ | ☑ | ☑ | ☑ | ☑ |
| doctor_report_workspace | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| notifications | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| clinical_audit | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| business_audit | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| support_trace | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| clinical_documentation | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| shared (excl. logging CLI) | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| main / core | ☑ | ☑* | ☑ | ☑ | ☑ | ☑ | ☑ |

\* No application log call sites (and no stdlib logging) — certified clean.  
† CLI-only stdlib root logger in `catalog_import/command_helpers.py` allowlisted.

⸻

## Frontend certification matrix

Active app: `Hospital-Web-UI/medixpro/medixpro`  
Out of scope: `backup_files/`, stale `cloud_setup/` copies, third-party theme docs.

| Check | Status |
|-------|--------|
| `console.log` / `debugger` / `console.debug` removed from app source | ☑ |
| Dev-only `debugSessionLog` / `/api/dev/debug-session-log` removed | ☑ |
| Dead `*_old*` copies removed | ☑ |
| `compiler.removeConsole` in production (exclude `error`/`warn`) | ☑ |
| ESLint `no-console` for `log`/`debug` (allow `error`/`warn`/`info`) | ☑ |
| BFF `lib/serverLogger.ts` + hotspot API routes migrated | ☑ |
| Sensitive data not logged in client/BFF (auth/bank routes sanitized) | ☑ |
| Frontend certified | ☑ |

Hotspot BFF routes on `serverLogger`: clinic/[id], bank-details, follow-up-policies, doctor-fees, cancellation-policies, digital-signature, login, refresh-token, verify-otp. Remaining API routes may still use `console.error` (allowed); prod build strips `log`/`debug`.

⸻

## Wave-1 context smoke evidence

| Workflow | Correlation ID present | Business IDs present | Evidence |
|----------|------------------------|----------------------|----------|
| Auth OTP / login | ☑ middleware | role in metadata (no OTP value) | `account/api/views.py` shared.logging; CorrelationMiddleware |
| Consultation start / complete | ☑ | encounter_id, consultation_id, patient_* via LogContext | `consultation_start_service._enrich_consultation_log_context` |
| Prescription | ☑ | prescription/consultation metadata on PDF/WhatsApp paths | `prescription_pdf_service`, WhatsApp delivery |
| Report upload | ☑ | report_id, laboratory_id, encounter_id | `artifact_upload_service.upload_report_artifacts` |
| Booking | ☑ | booking_id on create | `appointments/api/views/appointment.py` create |
| WhatsApp notification | ☑ | whatsapp_message_id | `whatsapp_service.send_prescription_message` |

⸻

## Sensitive data audit log

| Finding | Severity | Resolution | Status |
|---------|----------|------------|--------|
| Grep for password/otp/token/Authorization in logger calls | — | No application hits | Clear |
| Patient create previously logged request payloads | Medium | Removed during patient_account migration | Fixed |
| Frontend refresh-token logged response body | Medium | Replaced with status/contentType only | Fixed |
| Frontend bank-details logged full JSON | Medium | Safe meta only (status/hasData) | Fixed |

⸻

## Exception hygiene log

| File | Issue | Resolution | Status |
|------|-------|------------|--------|
| `doctor/api/serializers.py` | bare `except:` | `ObjectDoesNotExist` + `logger.exception` | ☑ |
| `patient_account/api/views.py` | bare `except:` | `PatientAccount.DoesNotExist` + `logger.exception` | ☑ |
| `doctor_report_workspace/.../patient_lab_history_mapper.py` | `except Exception: pass` | structured `logger.warning` | ☑ |
| `clinical_audit/services/clinical_audit_service.py` | `except Exception: pass` | `logger.warning` then intentional swallow | ☑ |
| `business_audit/services/business_audit_service.py` | `except Exception: pass` | `logger.warning` then intentional swallow | ☑ |
| `diagnostics_engine/services/reports/report_workflow_service.py` | `except Exception: pass` | `logger.warning` | ☑ |
| `diagnostics_engine/domain/order_status.py` | `except Exception: pass` | `logger.warning` | ☑ |
| `consultation_config/services/schema_builder.py` | `except Exception: pass` | `logger.warning` | ☑ |

Only remaining `except Exception: pass` is in `main/settings_test.py` (test settings — allowlisted).

⸻

## Exit criteria

* [x] No `print` / `pprint` / `breakpoint` / `pdb` / `console.log` / `debugger` in production application code (CLI allowlisted)
* [x] No remaining stdlib `logging.getLogger` in certified domain apps (CLI allowlist only)
* [x] Every certified module uses `shared.logging` with correct levels, actions, and safe metadata (or has no log sites)
* [x] Silent `pass` eliminated or justified
* [x] Sensitive-field review clean
* [x] App and frontend checklist rows signed certified
* [x] Live deployment plan Phase 5.5 documented; Phase 6 may proceed

⸻

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering | Agent (implementation complete) | 2026-08-04 | ☑ |
| QA | | | ☐ |
| CTO / Tech lead | | | ☐ |
