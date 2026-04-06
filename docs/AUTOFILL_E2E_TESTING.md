# Autofill: end-to-end testing (focus area)

Use this when you work **only on autofill** validation—API contract, backend tests, and frontend manual checks.

---

## 1. Backend contract (source of truth)

- Package: [`Hospital-Management-API/medicines/services/autofill/`](../Hospital-Management-API/medicines/services/autofill/)
- Endpoints embedding `autofill`:
  - `GET /api/medicines/hybrid/`
  - `GET /api/medicines/suggestions/`
- No separate autofill-only endpoint required for Phase 1.

**Run API tests:**

```bash
cd Hospital-Management-API
python manage.py test medicines.tests medicines.test_autofill -v 2 --keepdb
```

**What to assert manually (Postman/curl):**

- Each **hybrid** `results[]` row has `autofill` with `dose`, `frequency`, `timing`, `duration`, `route`, `instructions`.
- Each **suggestions** bucket item includes the same `autofill` shape when drugs are returned.

---

## 2. Frontend (MedixPro)

**Files:**

- [`types/medicine.ts`](../Hospital-Web-UI/medixpro/medixpro/types/medicine.ts) — `MedicineAutofill` types, `MedicineHybridResultRow.autofill`
- [`lib/medicineSuggestionsApi.ts`](../Hospital-Web-UI/medixpro/medixpro/lib/medicineSuggestionsApi.ts) — `MedicineSuggestionDrug.autofill`
- [`hooks/useMedicineSearch.ts`](../Hospital-Web-UI/medixpro/medixpro/hooks/useMedicineSearch.ts) — `byId` stores full rows (`hybridRowToSuggestionDrug` includes `autofill`)
- [`lib/medicine-prescription-utils.ts`](../Hospital-Web-UI/medixpro/medixpro/lib/medicine-prescription-utils.ts) — `buildMedicinePrescriptionFromAutofill`, `hasAutofillPayload`, `mapRouteNameToId`, `normalizeDoseUnit`
- [`components/consultations/consultation-section.tsx`](../Hospital-Web-UI/medixpro/medixpro/components/consultations/consultation-section.tsx) — chip select builds `detail.medicine` in one `addSectionItem` when autofill present

**Manual E2E checklist (doctor consultation UI):**

1. Open a consultation with **medicines** section and API context (doctor + patient as required by `useMedicineSearch`).
2. **Empty search** — suggestions load; pick a drug from chips → right panel opens with **dose/frequency/timing/duration/route/instructions** prefilled from API.
3. **Type search** — hybrid results; pick a row → same expectation.
4. **Edit** any field → values persist (no forced reset).
5. **No second network call** on chip click for autofill (verify DevTools Network: only prior hybrid/suggestions fetch).

**Edge cases:**

- Drug **without** autofill in payload → UI falls back to `buildMedicinePrescriptionFromSuggestion` / default (no crash).
- **Route** mapping: backend sends `route.name` (e.g. `Oral`) → UI `route_id` via `mapRouteNameToId`.

---

## 3. Optional Playwright / E2E (later)

- Stub or use test backend; assert panel visible fields match seeded `autofill` JSON.
- Not required for Phase 1 if manual + API tests pass.

---

## Reference plan

- Backend plan: `.cursor/plans/medicine_autofill_contract_b8d362e5.plan.md` (path on disk may vary; search for `medicine_autofill_contract`).
- FE integration plan: `.cursor/plans/fe-be_autofill_integration_e110e721.plan.md`
