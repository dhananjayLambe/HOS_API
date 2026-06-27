---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Permissions — diagnostics_engine

| Endpoint | Patient | Doctor | Admin | Lab |
|---|---|---|---|---|
| Catalog browse | ✅ | ✅ | ✅ | ✅ |
| Create order from consultation | ❌ | ✅ | ✅ | ❌ |
| Confirm / pay order | ✅ | ✅ | ✅ | ❌ |
| Routing summary | ✅ | ✅ | ✅ | ✅ |
| Report upload | ❌ | ❌ | ❌ | ✅ |
| Report download (own) | ✅ | ✅ | ✅ | ✅ |
| Mark ready / deliver | ❌ | ❌ | ❌ | ✅ |
| Catalog admin / import | ❌ | ❌ | ✅ | ❌ |

Exact permission classes vary by view — verify in `api/views/` when implementing.
