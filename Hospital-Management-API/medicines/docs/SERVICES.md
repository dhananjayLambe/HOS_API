---
owner: medicines-team
module: medicines
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — medicines

Medicine catalog search and prescription autofill engines.

| Service area | Purpose |
|---|---|
| Search engines | Fast medicine lookup for Rx entry |
| Autofill | Template-driven prescription completion |
| Import | `import_medicines` management command |

## Consumers

consultations_core — prescription module.

Base API: `/api/medicines/`

Logic-heavy app — business rules in `services/` (13 modules approximate).
