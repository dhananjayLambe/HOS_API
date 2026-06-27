---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Permissions — consultations_core

| Action | Patient | Doctor | Admin | Helpdesk |
|---|---|---|---|---|
| View own encounter | ✅ | ✅ | ✅ | ✅ |
| Pre-consultation edit | Limited | ✅ | ✅ | ✅ |
| Consultation edit | ❌ | ✅ | ❌ | ❌ |
| End consultation | ❌ | ✅ | ❌ | ❌ |
| Order investigation | ❌ | ✅ | ❌ | ❌ |
| View prescription | ✅ | ✅ | ✅ | ✅ |

Verify permission classes on individual views in `api/views/`.
