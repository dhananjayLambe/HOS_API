# Handoff: Green `tsc` + green tests (new chat)

Use this document in a **new Cursor chat** to systematically fix TypeScript and test failures. Repo root context: **`HOS_API`** (Django API + optional **`Hospital-Web-UI/medixpro/medixpro`** Next.js app).

---

## Goals

1. **`npx tsc --noEmit`** (run from `Hospital-Web-UI/medixpro/medixpro`) exits **0**.
2. **Django tests** you care about (e.g. `medicines.tests`, `medicines.test_autofill`) exit **0**.
3. Optional: **CI** parity if you have GitHub Actions / similar.

---

## A. Frontend TypeScript (`medixpro`)

**Run:**

```bash
cd Hospital-Web-UI/medixpro/medixpro
npx tsc --noEmit 2>&1 | tee /tmp/tsc.txt
```

### Known errors and fixes (from prior audit)

| Location | Problem | Fix |
|----------|---------|-----|
| [`app/layout.tsx`](../Hospital-Web-UI/medixpro/medixpro/app/layout.tsx) | `<Toaster position="center" />` — `react-hot-toast` does not allow `"center"` for `position` | Use a valid value, e.g. **`position="top-center"`** or **`bottom-center`** (see [react-hot-toast Toaster](https://react-hot-toast.com/docs/toaster)). |
| [`components/ui/sidebar.tsx`](../Hospital-Web-UI/medixpro/medixpro/components/ui/sidebar.tsx) | Imports **`useIsMobile`** from `@/hooks/use-mobile` | [`hooks/use-mobile.ts`](../Hospital-Web-UI/medixpro/medixpro/hooks/use-mobile.ts) exports **`useMobile`** only. **Rename import** to `useMobile` and update usages, **or** add `export const useIsMobile = useMobile` in `use-mobile.ts`. |
| `app/api/queue/doctor/[doctorId]/[clinicId]/route.ts` (+ `.next/types/validator.ts`) | Next.js 15+ expects `context.params` to be a **Promise** in route handlers | Update `GET` signature to `async (request, context) => { const params = await context.params; ... }` per your Next.js version docs. |
| `app/auth/register/page_old.tsx` | Legacy file, broken types | **Delete** or **exclude** from `tsconfig.json` (`exclude`), or fix types if still needed. |
| `components/consultations/dynamic-field-renderer.tsx` | `min`/`max` on validation type; `supported_units` possibly undefined | Narrow types; use optional chaining + fallbacks. |
| `components/consultations/dynamic-section-form.tsx` | Missing `fields` on object | Align with component prop types. |
| `components/consultations/finding-detail-panel.tsx` | `{}` passed where `string` expected | Ensure value is `string \| undefined`. |
| `components/lab-admin/lab-onboarding.tsx` | `pricing_tier` inferred as `string` | Type as `"Low" \| "Medium" \| "Premium"` or validate before setState. |
| [`lib/profile-progress.ts`](../Hospital-Web-UI/medixpro/medixpro/lib/profile-progress.ts) | Object reference comparison always truthy/falsy wrongly | Compare **primitive IDs**, not object references. |
| [`lib/provider.tsx`](../Hospital-Web-UI/medixpro/medixpro/lib/provider.tsx) | `suppressHydrationWarning` on `ThemeProvider` not in props | Remove prop from `ThemeProvider`; put `suppressHydrationWarning` on `<html>` / wrapper if needed. |
| [`store/consultationStore.ts`](../Hospital-Web-UI/medixpro/medixpro/store/consultationStore.ts) | Code sets `primary` on `SectionItemDetail` but type has no `primary` | **Extend** [`SectionItemDetail` in `lib/consultation-types.ts`](../Hospital-Web-UI/medixpro/medixpro/lib/consultation-types.ts) **or** remove `primary` from updates. |

**Strategy:** Fix errors **top-down** from `tsc` output; after each cluster, re-run `tsc`. Use `// @ts-expect-error` only as last resort with a ticket link.

**Optional:** Add `"strict": true` compliance incrementally; do not boil the ocean in one PR.

---

## B. Django tests (API)

**Run (with venv activated):**

```bash
cd Hospital-Management-API
python manage.py test medicines.tests medicines.test_autofill -v 2 --keepdb
```

### Known environment issues

| Symptom | Mitigation |
|---------|------------|
| `database "test_*" already exists` | Use **`--keepdb`** or answer **`yes`** when prompted to destroy, or drop the test DB in Postgres manually. |
| `ObjectInUse: database is being accessed by other users` | Close **other clients** (pgAdmin, second terminal, IDE DB tool). Retry with **`--keepdb`**. Avoid **two parallel** `manage.py test` against the same test DB. |
| `models have changes that are not yet reflected in a migration` | Run **`makemigrations`** for the listed apps and **`migrate`**; or revert unintended model edits. |

### Hybrid / autofill-related tests

- [`medicines/tests.py`](../Hospital-Management-API/medicines/tests.py) — hybrid API, cache key prefix `med_suggest_v2` / `med_hybrid_v2`.
- [`medicines/test_autofill.py`](../Hospital-Management-API/medicines/test_autofill.py) — `build_autofill`, suggestions + hybrid responses.
- [`medicines/services/hybrid_engine.py`](../Hospital-Management-API/medicines/services/hybrid_engine.py) — hybrid runs **suggestions before search** (deadline for cold suggest), **same-thread** DB access (no `ThreadPoolExecutor` + `close_old_connections` breaking the connection).

If tests fail only on **another machine**, compare Postgres version, Django settings, and env vars.

---

## C. Suggested order of work (1 PR or split)

1. **Quick wins:** `layout.tsx` Toaster, `sidebar` / `useMobile`, `consultationStore` / `SectionItemDetail`.
2. **Next route** handler `params` if `tsc` still references `.next/types/validator.ts`.
3. **Exclude or delete** `page_old.tsx` if unused.
4. **Remaining components** (`dynamic-*`, lab, finding panel, provider, profile-progress).
5. **Django:** migrations + full `manage.py test` for your target apps.

---

## D. Copy-paste prompt for the new chat

```
Read the repo handoff at docs/HANDOFF_GREEN_TSC_AND_TESTS.md and fix all issues until:
1) cd Hospital-Web-UI/medixpro/medixpro && npx tsc --noEmit passes
2) cd Hospital-Management-API && python manage.py test medicines.tests medicines.test_autofill --keepdb passes

Work file-by-file; do not silence errors without fixing root cause unless documented.
```

---

## Related docs

- Autofill product + backend E2E testing: [`docs/AUTOFILL_E2E_TESTING.md`](./AUTOFILL_E2E_TESTING.md)
