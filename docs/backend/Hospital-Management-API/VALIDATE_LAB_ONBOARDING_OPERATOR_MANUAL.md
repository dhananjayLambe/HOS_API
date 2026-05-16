# Validate Lab Onboarding — Operator Manual

Production-grade, **read-only** Django management command to answer:

> **Is this lab truly ready to serve diagnostic orders for a given pincode and test set?**

Use this as the primary operational tool for onboarding verification, marketplace readiness, support debugging, diagnostics operations, and lab activation QA.

**Command:** `validate_lab_onboarding`  
**Implementation:** [`validate_lab_onboarding.py`](../../../Hospital-Management-API/diagnostics_engine/management/commands/validate_lab_onboarding.py)  
**Validator service:** [`lab_onboarding_validator.py`](../../../Hospital-Management-API/diagnostics_engine/services/routing/lab_onboarding_validator.py)

Runtime help:

```bash
cd Hospital-Management-API
python manage.py help validate_lab_onboarding
```

---

## When to use this vs `debug_lab_routing`

| Tool | Primary use | `--lab-id` | Final status |
|------|-------------|------------|--------------|
| **`validate_lab_onboarding`** | Onboarding / activation QA for **one** branch | **Required** | `READY_FOR_PRODUCTION` / `NOT_READY` |
| **`debug_lab_routing`** | Routing ops; optional multi-branch simulation | Optional | `ELIGIBLE` / `REJECTED` |

Both commands are read-only and call production routing logic (`routable_lab_branches_queryset`, `EligibilityEngine._evaluate_branch`). They do **not** create orders or modify data.

---

## Quick start

From `Hospital-Management-API/` (with virtualenv / pipenv active):

```bash
# Preferred for ops: pass branch_code (not org code)
python manage.py validate_lab_onboarding \
  --branch-code BR530DA223BE \
  --pincode 416002 \
  --test LAB-CBC \
  --home-collection
```

Same command with the alias flag:

```bash
python manage.py validate_lab_onboarding \
  --lab-id BR530DA223BE \
  --pincode 416002 \
  --test LAB-CBC \
  --home-collection
```

- **`--lab-id` / `--branch-code`:** Same argument. Use the value from **`LabBranch.branch_code`** (e.g. `BR530DA223BE`), **not** `organization_code`. You may also pass the branch **UUID** if you have it from the API.
- **`--pincode`:** 6-digit Indian pincode (normalized via `normalize_indian_pincode`).
- **`--test`:** Repeat for multiple tests. Each value is resolved to `DiagnosticServiceMaster` (UUID → exact code → exact name → single `icontains` match).
- **`--home-collection`:** Routing mode `home`. Omit for lab walk-in (`lab`).

---

## Finding and checking the branch code

### What to pass

| Value | Example | Use with command? |
|-------|---------|-------------------|
| **Branch code** | `BR530DA223BE` | **Yes** (recommended) |
| Branch UUID | `a1b2c3d4-…` | Yes |
| Organization code | `ORG-…` | **No** — will not match |

Resolution logic ([`_resolve_branch`](../../../Hospital-Management-API/diagnostics_engine/services/routing/lab_onboarding_validator.py)):

1. If the value parses as a UUID → lookup `LabBranch` by primary key.
2. Otherwise → exact match on `LabBranch.branch_code` (case-sensitive).
3. Only non-deleted branches (`is_deleted=False`).

If nothing matches: `CommandError: Lab branch not found: '…'`.

### Where to get `branch_code`

1. **Django admin** — Labs → Lab branches → column **Branch code** (searchable).
2. **Onboarding API response** — field `branch_id` is the UUID; `branch_code` is returned on branch payloads from [`lab_onboarding_service`](../../../Hospital-Management-API/labs/api/services/lab_onboarding_service.py).
3. **Django shell** (read-only lookup):

```bash
python manage.py shell
```

```python
from labs.models.lab_auth import LabBranch

# By branch code
b = LabBranch.objects.filter(branch_code="BR530DA223BE", is_deleted=False).select_related("organization").first()
print(b.pk, b.branch_code, b.branch_name, b.organization.organization_name)

# By org name (if you only know the lab name)
for b in LabBranch.objects.filter(is_deleted=False, organization__organization_name__icontains="Apollo").select_related("organization"):
    print(b.branch_code, b.branch_name, b.is_active_for_orders)
```

### Confirm the command picked the right branch

Human output always prints the resolved branch at the top:

```
Lab: Apollo Diagnostics — Main Branch (BR530DA223BE)
Branch Code: BR530DA223BE
```

With JSON:

```bash
python manage.py validate_lab_onboarding --branch-code BR530DA223BE ... --json | jq '{lab_id, branch_uuid, checks}'
```

- `lab_id` — echo of `branch_code`
- `branch_uuid` — canonical `LabBranch.id` for APIs

The **Branch** section of the report includes `✓ Branch code present (BR530DA223BE)` when the code exists on the record.

---

## All flags

| Flag | Required | Description |
|------|----------|-------------|
| `--lab-id` / `--branch-code` | Yes (same) | `branch_code` (recommended) or branch UUID |
| `--pincode` | Yes | Patient/service pincode for area matching |
| `--test` | Yes (repeatable) | Catalog test token(s) |
| `--home-collection` | No | Home sample collection (default: walk-in) |
| `--city` | No | City fallback for service area (`city__iexact`, same as production) |
| `--verbose` | No | Marketplace pool count, IR/ER, blockers, timings (human output) |
| `--show-sql` | No | Sample SQL for marketplace / area / pricing querysets |
| `--strict` | No | Exit code **1** when `NOT_READY` (CI / scripts) |
| `--json` | No | Machine-readable JSON only (no styled checklist) |

---

## What gets validated

The validator runs eight checklist sections. Routing rules are **not** reimplemented; production helpers are reused.

### 1. Organization

Direct checks on `LabOrganization`:

- Exists, `is_active`, not `is_deleted`
- `registration_status == APPROVED`
- `is_verified == True`
- `onboarding_completed == True`
- `is_active_for_orders == True`

### 2. Branch

Direct checks on `LabBranch`:

- Exists, `is_active`, not `is_deleted`
- `branch_code` present
- `is_active_for_orders == True`
- Org `onboarding_completed` (org-level gate; branch has no separate onboarding flag)

### 3. Marketplace eligibility

Branch must appear in [`routable_lab_branches_queryset()`](../../../Hospital-Management-API/diagnostics_engine/services/routing/routing_helpers.py).

On failure, prints **exact** blocker strings from [`marketplace_gate_blockers()`](../../../Hospital-Management-API/diagnostics_engine/services/routing/routing_debug.py), e.g.:

```
✗ Not in marketplace pool
Failed conditions:
  * organization.registration_status='pending' (need APPROVED)
  * organization.is_verified=False
```

### 4. Service area

- Active `BranchServiceArea` rows for the branch
- Pincode match via `Trim(pincode)` + `normalize_indian_pincode`
- Optional `--city` fallback
- If **no** area rows exist, production **default-allows** pincode (same as routing engine)

### 5. Home collection (mode `home` only)

- `LabOrganization.home_collection_available`
- `LabBranch.home_collection_available`
- Matched area `is_home_collection_available` (when an area row matched)

Walk-in mode checks `walk_in_collection_available` instead.

### 6. Test catalog

Resolves each `--test` via [`resolve_catalog_services()`](../../../Hospital-Management-API/diagnostics_engine/services/routing/routing_debug.py):

1. UUID  
2. Exact `code` (case-insensitive)  
3. Exact `name`  
4. `name__icontains` only if exactly one match  

Tests must be `is_active=True` and not soft-deleted (`deleted_at` null).

### 7. Pricing

Per requested test, strict `BranchServicePricing`:

- Row exists for branch + catalog UUID (`service_id`)
- `is_active`, `is_available`, not deleted
- `valid_from` / `valid_to` window includes today  

Output includes `selling_price` and `mrp` when configured.

### 8. Production routing eligibility

Authoritative check: [`EligibilityEngine._evaluate_branch`](../../../Hospital-Management-API/diagnostics_engine/services/routing/eligibility_engine.py) (via `evaluate_branch_production`).

Reports production **IR** (ineligibility) and **ER** (eligibility) reason codes, `missing_tests`, and evaluation time in milliseconds.

**Final readiness** = all sections pass **and** marketplace pool membership **and** no production IR codes.

---

## Failure codes

Standardized codes for ops, support, and CI:

| Code | Typical cause |
|------|----------------|
| `ORG_NOT_APPROVED` | `registration_status` not `APPROVED`, or `onboarding_completed` false |
| `ORG_NOT_VERIFIED` | `is_verified` false |
| `ORG_INACTIVE` | Org inactive, deleted, or not `is_active_for_orders` |
| `BRANCH_DISABLED` | Branch inactive, missing code, or not `is_active_for_orders` |
| `BRANCH_DELETED` | `branch.is_deleted` |
| `MARKETPLACE_INELIGIBLE` | Not in `routable_lab_branches_queryset` |
| `PINCODE_UNSUPPORTED` | No matching active service area (when areas exist) |
| `HOME_COLLECTION_DISABLED` | Home/walk-in/radius rejection |
| `TEST_INACTIVE` | Catalog test inactive or deleted |
| `PRICE_MISSING` | No strict pricing row for a requested test |
| `ROUTING_REJECTED` | Other production IR after marketplace OK |

Production IR → onboarding code mapping lives in `lab_onboarding_validator.IR_TO_ONBOARDING`.

---

## Example human output

```
==================================================
LAB READINESS STATUS
==================================================
Lab: Apollo Diagnostics — Main Branch (BR530DA223BE)
Branch Code: BR530DA223BE
Pincode: '416002'  mode: 'home'

--- Organization ---
✓ Organization active
✓ Organization approved
...

==================================================
FINAL STATUS: READY_FOR_PRODUCTION

==================================================
ONBOARDING SUMMARY
==================================================
Organization Checks: PASSED
...
Overall Readiness: READY
Total duration: 42.3ms
```

When not ready:

```
FINAL STATUS: NOT_READY
Blocking Issues:
  * PRICE_MISSING
  * ROUTING_REJECTED
```

---

## JSON output (`--json`)

For automation, monitoring, or admin tooling:

```bash
python manage.py validate_lab_onboarding \
  --lab-id BR530DA223BE \
  --pincode 416002 \
  --test LAB-CBC \
  --home-collection \
  --json
```

Example shape:

```json
{
  "lab_id": "BR530DA223BE",
  "branch_uuid": "…",
  "eligible": false,
  "final_status": "NOT_READY",
  "failure_codes": ["PRICE_MISSING"],
  "checks": {
    "organization": true,
    "branch": true,
    "marketplace": true,
    "service_area": true,
    "home_collection": true,
    "test_catalog": true,
    "pricing": false,
    "routing_eligibility": false
  },
  "blocking_issues": ["PRICE_MISSING"],
  "pincode": "416002",
  "mode": "home",
  "services": [{ "id": "…", "code": "LAB-CBC", "name": "…" }],
  "marketplace_ok": true,
  "marketplace_blockers": [],
  "routing": {
    "mode": "home",
    "ineligibility_reasons": ["missing_test_pricing"],
    "eligibility_reasons": [],
    "evaluation_time_ms": 1.2
  },
  "total_duration_ms": 45.0
}
```

Combine with `--verbose` to include a `verbose` object (pool counts, IR/ER lists).

---

## CI and scripting

Fail the pipeline when the lab is not production-ready:

```bash
python manage.py validate_lab_onboarding \
  --lab-id "$BRANCH_CODE" \
  --pincode "$PINCODE" \
  --test LAB-CBC \
  --home-collection \
  --strict

# Exit 0 = READY_FOR_PRODUCTION
# Exit 1 = NOT_READY
```

Parse JSON in shell:

```bash
python manage.py validate_lab_onboarding ... --json | jq -e '.eligible == true'
```

---

## Debugging tips

| Symptom | What to check |
|---------|----------------|
| `MARKETPLACE_INELIGIBLE` | Read printed `Failed conditions:`; fix org approval, verification, onboarding, order flags in Django admin |
| `PINCODE_UNSUPPORTED` | `BranchServiceArea` for branch: pincode, `is_active`, `is_deleted`; try `--city` if city-based areas exist |
| `PRICE_MISSING` | `BranchServicePricing.service_id` must be catalog **UUID**, not code; check `valid_from`/`valid_to`, `is_available` |
| `HOME_COLLECTION_DISABLED` | Org + branch `home_collection_available`; area `is_home_collection_available`; home radius if lat/long used in orders |
| `TEST_INACTIVE` | `DiagnosticServiceMaster.is_active` and `deleted_at` |
| Routing IR `missing_test_pricing` | Same as pricing; confirm strict row matches production filters |

**SQL introspection:**

```bash
python manage.py validate_lab_onboarding ... --show-sql
```

**Compare with routing debug (multi-lab):**

```bash
python manage.py debug_lab_routing \
  --pincode 416002 \
  --test LAB-CBC \
  --home-collection \
  --lab-id BR530DA223BE
```

---

## Architecture (no duplicated rules)

| Concern | Production source |
|---------|-------------------|
| Marketplace pool | `routable_lab_branches_queryset()` |
| Blocker messages | `marketplace_gate_blockers()` |
| Pincode / location | `normalize_indian_pincode`, `build_manual_location` |
| Catalog resolution | `resolve_catalog_services()` |
| Area / home / pricing helpers | `LabRoutingScenarioDebugger.check_*` |
| Final eligibility | `EligibilityEngine._evaluate_branch` |

---

## Tests

```bash
python manage.py test diagnostics_engine.tests.test_validate_lab_onboarding -v 2
```

Covers happy path, missing pricing, inactive org/branch, pincode mismatch, home collection disabled, marketplace exclusion, `--json`, `--strict`, and read-only behavior.

---

## Related docs and code

- Lab onboarding API: [`labs/api/services/lab_onboarding_service.py`](../../../Hospital-Management-API/labs/api/services/lab_onboarding_service.py)
- Routing debug command: [`debug_lab_routing.py`](../../../Hospital-Management-API/diagnostics_engine/management/commands/debug_lab_routing.py)
- Catalog / branch API: [DIAGNOSTICS_CATALOG_BRANCH_API.md](./DIAGNOSTICS_CATALOG_BRANCH_API.md)
