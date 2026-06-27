---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Configuration Reference

Operational settings from `main/settings.py` and environment variables.

## Database

| Setting | Env | Default | Notes |
|---|---|---|---|
| PostgreSQL | `DB_*` / `.env` | — | Primary database |
| `DJANGO_TIME_ZONE` | env | `Asia/Kolkata` | Display timezone |

## Redis / Channels / Celery

| Setting | Env | Notes |
|---|---|---|
| Redis URL | `REDIS_URL` | Celery broker, Channels layer, cache |
| `CELERY_TASK_ALWAYS_EAGER` | env | Sync tasks in dev/test when true |

See [integrations/redis-channels.md](integrations/redis-channels.md).

## Authentication (JWT)

| Setting | Notes |
|---|---|
| `AUTH_USER_MODEL` | `account.User` |
| SimpleJWT | Access/refresh tokens via `rest_framework_simplejwt` |
| Token blacklist | Enabled |

See [architecture/authentication.md](architecture/authentication.md).

## Diagnostics feature flags

| Setting | Env | Default | Purpose |
|---|---|---|---|
| `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING` | — | `False` | Sum-of-services package price fallback |
| `DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS` | env | `50` | Max ineligible branch snapshots |
| `DIAGNOSTICS_ROUTING_JOURNEY_LOG` | `DIAGNOSTIC_ROUTING_JOURNEY_LOG` | off | Verbose routing logs |
| `ENABLE_SUGGESTIONS` | env | `true` | Investigation suggestions |
| `ENABLE_PACKAGE_SUGGESTIONS` | env | `true` | Package suggestions |
| `INV_SUGGEST_*` | env | various | Suggestion limits and cache TTL |

## Report storage (S3)

| Setting | Env | Default | Purpose |
|---|---|---|---|
| `AWS_REPORTS_BUCKET` | env | None | S3 bucket; local MEDIA if unset |
| `AWS_S3_REGION_NAME` | env | `ap-south-1` | Region |
| `REPORT_PRESIGNED_URL_EXPIRY_SECONDS` | env | `300` | Signed URL TTL |
| `MAX_REPORT_UPLOAD_SIZE_MB` | env | `20` | Per-file limit |
| `MAX_REPORT_BATCH_UPLOAD_SIZE_MB` | env | `100` | Batch limit |
| `REPORT_DELIVERY_ASYNC` | env | `true` | Async report delivery |
| `IDEMPOTENCY_KEY_TTL_HOURS` | env | `24` | Upload idempotency |

## WhatsApp (Meta Cloud API)

| Setting | Env | Purpose |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | env | Meta API auth |
| `WHATSAPP_PHONE_NUMBER_ID` | env | Sender phone |
| `WHATSAPP_PRESCRIPTION_TEMPLATE_NAME` | env | Template name |
| `PRESCRIPTION_WHATSAPP_ASYNC` | env | Celery queue for Rx delivery |
| `WHATSAPP_USE_SIMULATED_PROVIDER` | env | Dev/test without Meta |
| `WHATSAPP_DEFAULT_COUNTRY_CODE` | env | `91` for India |

## Appointments

| Setting | Env | Default |
|---|---|---|
| `MAX_BOOKING_DAYS` | env | `30` |
| `BOOKING_SLOT_LEAD_BUFFER_MINUTES` | env | `5` |
| `APPOINTMENT_SLOTS_THROTTLE` | env | `120/min` |

## Consultation cache

| Setting | Env | Default |
|---|---|---|
| `ENABLE_CONSULTATION_SUMMARY_CACHE` | env | `false` |
| `CONSULTATION_SUMMARY_CACHE_TTL_SECONDS` | env | `900` |

## Adding new settings

1. Add row here when introducing env vars or feature flags
2. Document default and purpose
3. Link from affected app's `AI_CONTEXT.md`
