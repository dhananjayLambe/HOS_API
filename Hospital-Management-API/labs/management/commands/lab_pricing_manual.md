# Lab pricing workbook — operational guide

## Sheets

| Sheet | Purpose |
|-------|---------|
| `metadata` | Branch info (read-only); `branch_code` + `template_version` required for import |
| `instructions` | Quick onboarding guide |
| `pricing_catalog` | Main pricing grid |

## Generate template

```bash
python manage.py generate_lab_pricing_template --branch-code=HEALTHLAB-WAGHOLI-01 --force
```

## pricing_catalog layout

- **Row 1:** Yellow instruction banner (what to edit)
- **Row 2:** Dark blue headers (filters enabled via Excel table)
- **Row 3+:** Service rows sorted by `lab_department` → category → name
- **Frozen panes:** `C3` — keeps `service_code` and `service_name` visible when scrolling

### Column colors

| Color | Meaning |
|-------|---------|
| Blue-gray | Read-only catalog columns (incl. `lab_department`) |
| Light yellow | Editable pricing columns |
| Light green (conditional) | `is_available` = TRUE (offered) |
| Light gray (conditional) | `is_available` = FALSE (not offered) |
| Light red (conditional) | `is_available` = TRUE but `selling_price` blank |
| Dark red (conditional) | `cost_price` > `selling_price` |

### Columns

| Column | Editable |
|--------|----------|
| service_code, service_name, category_name, lab_department, sample_type, default_tat_hours | No |
| selling_price, cost_price, report_delivery_hours, home_collection_supported, is_available, remarks | Yes |

- **`lab_department`** — filter helper only (PATHOLOGY, RADIOLOGY, …); **never imported**
- **`is_available`** — **FALSE** for new rows; preserved from DB when regenerating existing pricing
- **Opt-in onboarding:** set TRUE + prices only for tests offered; leave FALSE for the rest

## Import (`sync_lab_pricing`)

```bash
python manage.py sync_lab_pricing --file=media/lab_pricing_templates/LabPricing_<branch>_v1.xlsx
python manage.py sync_lab_pricing --file=... --dry-run
python manage.py sync_lab_pricing --file=... --strict
```

### Metadata

- Required: `branch_code`, `template_version` (non-empty).
- Branch must exist and not be soft-deleted.

### Rows imported

- **Only** rows where **`is_available` = TRUE** are processed.
- Rows with **FALSE** or blank availability are **skipped** (no DB create/update; unsupported tests are not stored).

### Validation (TRUE rows only)

| Field | Rule |
|-------|------|
| `service_code` | Must match active `DiagnosticServiceMaster` |
| `selling_price` | Required, **> 0** |
| `cost_price` | Required, **>= 0** |
| Margin | `selling_price >= cost_price` |
| `report_delivery_hours` | If set, **1–240**; else default from catalog TAT |

Canonical columns from Excel (`service_name`, `category_name`, `lab_department`, etc.) are **never** written to the DB.

### Behavior

- **Upsert** on `(branch, service)` for active pricing: no bulk delete, no deactivation of catalog via import.
- **Re-import** is idempotent: updates the same active row. Summary line **Unchanged** counts TRUE rows that already matched the DB (not the same as **Skipped**, which means “not offered” / FALSE or blank `is_available`).
- **If you see `Created: 0` / `Updated: 0`:** new template rows default to **`is_available=FALSE`**; only **`TRUE`** rows with prices are written. Set TRUE for each test you want in the catalog.
- **`--dry-run`:** validate and report counts; **no writes**.
- **`--strict`:** abort on first row error (transaction rolled back when not dry-run).
- Without `--strict`, row errors are listed with **Excel row numbers**; command still completes with a summary.

### Snapshots (Phase 1)

On create/update: `lab_payout_snapshot = cost_price`, `doctor_margin_snapshot = 0`, `platform_margin_snapshot = selling_price - cost_price`.

### Routing

Eligible labs use **`is_available=True`** on `BranchServicePricing` (see routing eligibility).
