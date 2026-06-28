---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
milestone: M1
document_type: current_state_analysis
---

# 04 — Booking Lifecycle

## Purpose

Document how investigations become diagnostic orders today: models, conversion rules, package expansion, pricing snapshots, and routing trigger.

---

## Scope

- `ConsultationInvestigations` / `InvestigationItem` clinical layer
- `DiagnosticOrderCreationService` commercial layer
- Out of scope: future recommendation gate (see gap analysis)

---

## Clinical Container Model

**Note:** There is no model named `InvestigationContainer`. The container is **`ConsultationInvestigations`** (1:1 with `Consultation`).

**File:** `consultations_core/models/investigation.py`

| Model | Role |
|---|---|
| `ConsultationInvestigations` | Parent container (`related_name="investigations"`) |
| `InvestigationItem` | Line item: catalog test, custom test, or package |
| `CustomInvestigation` | Reusable doctor-created master |

**Source enum:** `InvestigationSource` — `catalog`, `custom`, `package`

---

## Investigation CRUD (Clinical)

**Service:** `consultations_core/services/investigation_api_service.py`

| Function | Purpose |
|---|---|
| `get_or_create_investigations_container(consultation)` | Get or create container |
| `add_investigation_item(...)` | Add catalog/custom/package line |
| `build_package_expansion_snapshot(package)` | Freeze package composition at prescription time |
| `get_or_create_custom_investigation_master(...)` | Deduped custom master |
| `soft_delete_item(...)` | Soft delete with position reorder |

**API endpoints:**

- `GET/POST /api/consultations/<id>/investigations/items/`
- `PATCH/DELETE /api/consultations/<id>/investigations/items/<item_id>/`
- `POST /api/investigations/custom/`

**Validation chain:** Serializer → `EncounterLockValidator` → model `clean()` → service duplicate check.

---

## Package Expansion (Two Stages)

### Stage A — Prescription time (clinical snapshot)

When `source=package` in `add_investigation_item()`:

1. Read active `DiagnosticPackageItem` rows
2. Build JSON snapshot: `{service_id, service_code, name, included, quantity, display_order}`
3. Store on `InvestigationItem.package_expansion_snapshot`

### Stage B — Order confirm time (commercial expansion)

**File:** `diagnostics_engine/domain/package_orders.py`

| Function | Purpose |
|---|---|
| `_normalize_package_composition(inv)` | Prefer clinical snapshot; fallback `build_composition_snapshot(pkg)` |
| `expand_confirmed_order_packages(order)` | Create `DiagnosticOrderTestLine` per service × quantity |
| `ensure_test_lines_for_test_items(order)` | Test lines for single-test order items |

Runs when order status is `CONFIRMED` inside atomic transaction.

---

## Order Creation Service

**File:** `diagnostics_engine/domain/order_creation.py`  
**Class:** `DiagnosticOrderCreationService`

**Entry points:**

- `POST /api/diagnostics/orders/create-from-consultation/`
- End-consultation hook in `consultations_core/api/views/preconsultation.py`

### Conversion rules (`_load_and_validate_convertible_items`)

| Source | Converts? | Rule |
|---|---|---|
| `catalog` | Yes | Active `DiagnosticServiceMaster`; requires `catalog_item` |
| `package` | Yes | Active package; composition validated |
| `custom` | **No** | Validation error — not lab-fulfillable |
| Cancelled items | No | Excluded |

### Order item creation (`_create_order_items`)

Per investigation line:

1. Quote via `PricingQuoteService.quote_service_line` or `quote_package_line`
2. Snapshot price, earnings, home eligibility, composition (packages)
3. Link `InvestigationItem.diagnostic_order_item`
4. Set order `sample_collection_mode`:
   - `"home"` if **any** line has `is_home_collection_eligible=True`
   - else `"lab"`

**Without branch:** prices zero; `metadata_snapshot.pricing_pending_branch = True`

### Idempotency

Existing non-cancelled order for same `consultation` + `encounter` → return existing order and re-schedule routing.

### Routing trigger

`_schedule_diagnostic_routing_if_has_test_lines()` → `schedule_routing_after_commit(order.pk)` after test lines exist.

---

## Home Collection Eligibility (Booking Time)

| Line type | Home eligible when |
|---|---|
| Catalog + branch | `BranchServicePricing.home_collection_supported` |
| Catalog, no branch | `DiagnosticServiceMaster.home_collection_possible` |
| Package + branch | `BranchPackagePricing.home_collection_supported` |
| Package, no branch | `False` |

Stored on `DiagnosticOrderItem.is_home_collection_eligible`.

---

## Order Status Flow (Simplified)

```
Created → CONFIRMED (test lines expanded) → routing_status updated by RoutingService
```

Full state machine: [diagnostics_engine/docs/WORKFLOWS.md](../../../diagnostics_engine/docs/WORKFLOWS.md)

---

## Tests (Behavioral Reference)

- `consultations_core/tests/test_investigation_api.py`
- `consultations_core/tests/test_end_consultation_integration.py`
- `diagnostics_engine/tests/test_order_creation_service.py`

---

## Marketplace Impact

Booking orchestration is mature and idempotent. The gap is **timing**: order is created at consultation end without a prior patient-facing recommendation step.

---

## Milestone 2

Package → `service_id` expansion logic must be reusable **before** order persistence. Primary reuse: `_normalize_package_composition()` and catalog active-service validation from order creation.

---

## Reusable Components

| Component | Import path |
|---|---|
| `DiagnosticOrderCreationService.create_order_from_consultation` | `diagnostics_engine.domain.order_creation` |
| `build_package_expansion_snapshot` | `consultations_core.services.investigation_api_service` |
| `_normalize_package_composition` | `diagnostics_engine.domain.package_orders` |
| `expand_confirmed_order_packages` | `diagnostics_engine.domain.package_orders` |
| `AddInvestigationItemSerializer` | `consultations_core.api.serializers.investigations` |

---

## Known Gaps

| Gap | Detail |
|---|---|
| No recommend-only mode | Service always persists `DiagnosticOrder` |
| Custom investigations | Blocked at conversion — no marketplace path |
| Booking before recommendation | Violates Phase 1 requirement 1 |
| Package home eligibility | Package-level flag only; constituent services not re-checked at booking |
| Doctor-selected branch | May differ from routing winner |

---

## Reference

**[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**

Related: [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) · [03_Recommendation_Engine.md](03_Recommendation_Engine.md) · [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md)
