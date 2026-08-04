# Commented Code Certification

**Milestone:** Production code hygiene — remove commented-out executable code, backup/duplicate sources, and obsolete disabled implementations.  
**Status:** Certified  
**Date:** 2026-08-04  
**Scope:** `account`, `doctor`, `patient_account`, `consultations_core`, `diagnostics_engine`, `doctor_report_workspace`, `notifications`, `shared`, `clinic`, `hospital_mgmt`, and `Hospital-Web-UI/medixpro/medixpro` (frontend).

## Standards

Keep comments only when they explain:

- Clinical business rules
- Security decisions
- Regulatory requirements
- Performance trade-offs
- Complex algorithms
- Non-obvious workflows

Do **not** keep comments that disable old code, preserve previous implementations, explain obvious code, or hold temporary debugging leftovers. Git history is the archive for previous implementations.

## Certification matrix

| Application | Commented code removed | Dead / backup removed | Documentation reviewed | Certified |
|-------------|------------------------|-----------------------|------------------------|-----------|
| account | Done | Done | Done | Yes |
| doctor | Done | Done | Done | Yes |
| patient_account | Done | Done | Done | Yes |
| consultations_core | Done | Done (`*_old.json`) | Done | Yes |
| diagnostics_engine | Done | N/A (no dead commented blocks) | Done | Yes |
| doctor_report_workspace | Done | N/A | Done | Yes |
| notifications | Done | N/A | Done | Yes |
| shared | Done | N/A | Done | Yes |
| clinic | Done | Done | Done | Yes |
| hospital_mgmt | Done | Done | Done | Yes |
| frontend | Done | Done (`* copy.tsx`, `backup_files/`) | Done | Yes |

## Major removals

### Backend

- `doctor/utils/progress_calculator.py` — three obsolete commented copies of `calculate_doctor_profile_progress`
- `doctor/api/views.py` — commented `DoctorDashboardSummaryView`; scheduling-rules delete conflict guard replaced with backlog note
- `doctor/api/urls.py` / serializers — dashboard summary route + unused `DoctorDashboardSummarySerializer`
- `account/api/views.py` — superseded commented `CheckUserStatusView`
- `clinic/models.py` — previous commented `ClinicSchedule`
- `hospital_mgmt` — FrontDeskUser model/serializer/view remnants; unused imports
- `main/settings.py` — ghost commented `consultations` / `prescriptions` INSTALLED_APPS entries
- Backup artifacts: `appointments/models/appointment_old.txt`, `templates/prescriptions/base_prescription_backup.html`, unused consultations `*_old.json` masters

### Frontend

- `components/sidebar.tsx` — large commented nav trees
- Dead trailing BFF impls in `app/api/doctor/onboarding/phase1/route.ts` and `app/api/clinic/clinics-list/route.ts`
- Pre-consultation Cancel Visit commented UI/handlers; orphaned Start New Visit path on consultation action bar
- Duplicate UI files: `tabs copy.tsx`, `popover copy.tsx`, `dropdown-menu copy.tsx`
- `Hospital-Web-UI/backup_files/doctor-onboarding6oct.jsx`
- Commented chart Tooltip/Legend stubs and investigation master stubs

## Feature flags

No obsolete `TEMP_FEATURE` / `ENABLE_NEW_API` / `USE_NEW_*` / `OLD_REPORT_FLOW` toggles found in scoped apps.

**Kept intentional runtime toggles:** `ENABLE_SUGGESTIONS`, `ENABLE_PACKAGE_SUGGESTIONS`, `ENABLE_CONSULTATION_SUMMARY_CACHE`, lab `NEXT_PUBLIC_*` helpers (including `@deprecated` rollback toggles). Living legacy report APIs (`diagnostics_engine` legacy modules) remain for a separate dead-API pass.

## Backlog (deferred behavior removed from source)

Track these outside commented code:

1. **Scheduling conflict guard** — block deleting doctor scheduling rules when active appointments exist (`doctor` scheduling rules destroy).
2. **Production ID validation** — enforce PAN/Aadhaar format and require at least one ID at doctor phase-1 onboarding.
3. **Patient group assignment** — assign new patient users to the `patient` group on registration.
4. **Cancel Visit UI** — pre-consultation cancel control + confirm dialog using encounter cancel API.
5. **Start New Visit from consultation action bar** — confirm + `start-new-visit` entry from active consultation header.
6. **Clinic listing default** — optionally default public clinic list to `is_approved=True`.
7. **Doctor memberships persist** — wire `doctorAPI.updateMemberships`.
8. **Birth record edit load-by-id** — fetch record from API instead of sample data.

## Verification commands (post-cleanup)

```bash
# Backend (Hospital-Management-API)
rg -n "^ *# *(class |def |from |import )" --glob '*.py' \
  account doctor patient_account consultations_core diagnostics_engine \
  doctor_report_workspace notifications shared clinic hospital_mgmt main

# Frontend (medixpro/medixpro)
rg -n "// *(import |export |const |return |if |await |fetch)" --glob '*.{ts,tsx}' .
rg -n "\{/\* *<" --glob '*.{tsx,jsx}' .

# Backups / copies
find . -iname '* copy*' -o -iname '*_backup*' -o -iname '*master_old*'
```

Expected: no commented-out executable blocks in scoped production sources; documentation-only comments may remain.

## Exit criteria

- [x] No commented-out executable code in scoped production application code
- [x] No unused backup or duplicate source files in scoped trees
- [x] No obsolete commented implementations beside live versions in hotspot files
- [x] Remaining comments document business rules, architecture, security, or complex logic
- [x] Every scoped backend app and frontend certified in the matrix above
- [x] Repository relies on Git history for previous implementations
