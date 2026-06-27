---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Permissions — labs

| Action | Patient | Doctor | Admin | Lab User |
|---|---|---|---|---|
| View own assignments | ❌ | ❌ | ✅ | ✅ |
| Accept/reject assignment | ❌ | ❌ | ❌ | ✅ |
| Manage collection | ❌ | ❌ | ❌ | ✅ |
| Branch visit check-in | ❌ | ❌ | ❌ | ✅ |
| Upload report | ❌ | ❌ | ❌ | ✅ |
| Pricing catalog admin | ❌ | ❌ | ✅ | ✅ (own branch) |

Implementation: `labs/api/permissions.py`
