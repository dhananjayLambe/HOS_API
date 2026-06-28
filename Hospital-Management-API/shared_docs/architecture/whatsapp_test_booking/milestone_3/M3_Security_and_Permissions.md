# M3 — Security and Permissions

## Authentication

- `JWTAuthentication` (SimpleJWT)
- Future: OAuth, service tokens, partner tokens (documented only)

## Permission classes

1. `IsAuthenticated`
2. `IsDiagnosticOrderOrchestrationActor` — doctor, helpdesk, helpdesk_admin, clinic_admin, superuser

## Consultation access (`resolve_consultation_access`)

| Role | Rule |
|------|------|
| superuser | all consultations |
| helpdesk_admin | all (operational) |
| helpdesk | same clinic as encounter |
| clinic_admin | same clinic via `clinic_admin_profile` |
| doctor | `encounter.doctor.user_id == request.user.id` |
| patient | **denied in M3** |

Unknown consultation → 404 `CONSULTATION_NOT_FOUND`  
Known but unauthorized → 403 `PERMISSION_DENIED`

## Rate limiting

`MarketplaceRecommendationRateThrottle`: 20/min per user.

## PII policy

Never log patient name, phone, or address. Audit stores IDs and HTTP metadata only.
