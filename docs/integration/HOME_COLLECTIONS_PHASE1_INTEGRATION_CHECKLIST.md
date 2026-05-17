# Home Collections Phase 1 — Integration Checklist

## Prerequisites

- [ ] Migration `labs.0006_collection_status_in_progress` applied
- [ ] Lab admin user with branch session (`GET /api/labs/me/`)
- [ ] At least one home diagnostic order with **accepted** assignment

## End-to-end flow

1. [ ] **Orders** — `POST /api/labs/orders/<assignment_id>/accept/` for a home order
2. [ ] Verify `LabCollectionRequest` exists (`PENDING`, `collection_type=HOME`)
3. [ ] Verify `LabOrderTestExecution` rows exist (count = test lines)
4. [ ] **Home Collections** — `GET /api/labs/home-collections/` returns the row
5. [ ] **Summary** — `GET /api/labs/home-collections/summary/` returns non-zero pending if applicable
6. [ ] **Assign** — `POST .../assign/` with `phlebotomist_id` → `ASSIGNED`
7. [ ] **Start** — `POST .../start/` → `IN_PROGRESS`
8. [ ] **Collect** — `POST .../collect/` → `COLLECTED`; execution count unchanged
9. [ ] **Fail path** — new order: assign → start → `POST .../fail/` → `FAILED`
10. [ ] **Retry** — `POST .../retry/` → `PENDING`, `retry_count` incremented

## Negative cases

- [ ] Collect from `PENDING` → 409
- [ ] Collection from another branch → 404
- [ ] List before accept → empty (assignment not accepted)

## UI smoke

- [ ] Open `/lab-dashboard/home-collections/`
- [ ] Tabs filter queue; KPI cards load
- [ ] Row opens drawer; actions match status
- [ ] No call/WhatsApp/map icons on page
- [ ] View Execution disabled on collected rows

## Separation checks

- [ ] Orders page does not expose collection assign/start/collect
- [ ] Home Collections does not upload reports or show execution processing states
