# Dynamic Number Field Step Fix — Production Summary

**Status:** Implemented and ready for validation.

## Standard: suffix for all number fields

All dynamic number fields use **suffix** for unit display (e.g. `"suffix": "days"`, `"suffix": "kg"`, `"suffix": "mmHg"`). For scale-only fields (e.g. pain score 0–10), use `"suffix": ""`. This keeps a single, consistent convention across chief complaint, vitals, symptoms, and instructions.

Every number field must have:

| Property | Purpose |
|----------|--------|
| **suffix** | Unit or scale label for display (e.g. "days", "kg", "mmHg", or "" for none). |
| **step** | Increment for spinner and keyboard: `1` for integers, `0.1` for decimals. |
| **min** / **max** | Bounds at field level (not only in validation). |
| **range** | `[min, max]` for UI hints and range resolution. |

Step must match range and unit (e.g. height 30–250 cm / 1.0–8.0 ft → step 0.1; pain 0–10 → step 1).

---

## Implemented changes

### 1. Templates (suffix + range + step)

**Chief Complaint** — `consultations_core/templates_metadata/pre_consultation/chief_complaint/chief_complaint_details.json`

- **duration_value**: `suffix: ""`, `step: 1`, `min: 0`, `max: 999`, `range: [0, 999]`.
- **pain_score**: `suffix: ""`, `step: 1`, `min: 0`, `max: 10`, `range: [0, 10]` (range already present).

**Vitals** — `consultations_core/templates_metadata/pre_consultation/vitals/vitals_details.json`

- **height**: `suffix: "cm"` (step, min, max, range already present).
- **weight**: `suffix: "kg"`, `step: 0.1`, `min: 0.1`, `max: 500`, `range: [0.1, 500]`.
- **systolic** / **diastolic**: `suffix: "mmHg"`, `step: 1`, field-level `min`/`max`/`range`.
- **temperature**: `suffix: "°C"` (step, min, max, range already present).
- **pulse_rate**: `suffix: "/min"`, `step: 1`, `min: 30`, `max: 220`, `range: [30, 220]`.
- **spo2_percent**: `suffix: "%"`, `step: 1`, `min: 0`, `max: 100`, `range: [0, 100]`.
- **resp_rate**: `suffix: "/min"`, `step: 1`, `min: 8`, `max: 60`, `range: [8, 60]`.
- **waist**: `suffix: "cm"`, `step: 0.1`, `min: 50`, `max: 200`, `range: [50, 200]`.
- **pain_score**: `suffix: ""`, `step: 1`, field-level `min`/`max` (range already present).
- **head**: `suffix: "cm"`, `step: 0.1`, `min: 30`, `max: 60`, `range: [30, 60]`.

**Symptoms** — `consultations_core/templates_metadata/consultation/symptoms/symptom_details.json`

- **since_days** (fever): `suffix: "days"` (existing), `step: 1`, `min: 0`, `max: 365`, `range: [0, 365]`.
- **pain_score** (headache): `suffix: ""`, `step: 1`, `range: [1, 10]` (min/max existing).
- **amount** (weight_loss): `suffix: "kg"` (existing), `step: 0.1`, `min: 0`, `max: 500`, `range: [0, 500]`.
- **timeframe** (weight_loss): `suffix: "months"` (existing), `step: 1`, `min: 0`, `max: 120`, `range: [0, 120]`.
- **duration_days** (weakness_fatigue): `suffix: "days"` (existing), `step: 1`, `min: 0`, `max: 365`, `range: [0, 365]`.
- **frequency_per_day** (polyuria): `suffix: "per day"`, `step: 1`, `min: 0`, `max: 24`, `range: [0, 24]`.

**Instructions** — `consultations_core/templates_metadata/consultation/instructions/instruction_details.json`

- **frequency_per_day** (monitor_blood_pressure): `suffix: "per day"`, `step: 1`, `range: [1, 6]` (min/max existing).
- **frequency_per_week** (monitor_blood_sugar): `suffix: "per week"`, `step: 1`, `range: [1, 14]` (min/max existing).
- **limit_per_day** (fluid_intake_restriction): `suffix: "liters"` (existing), `step: 0.1`, `min: 0`, `max: 20`, `range: [0, 20]`.
- **target_weight** (weight_reduction_advice): `suffix: "kg"` (existing), `step: 0.1`, `min: 0`, `max: 500`, `range: [0, 500]`.
- **timeframe_months** (weight_reduction_advice): `suffix: "months"`, `step: 1`, `min: 0`, `max: 120`, `range: [0, 120]`.
- **calorie_limit** (low_sugar_diet): `suffix: "kcal"` (existing), `step: 1`, `min: 0`, `max: 5000`, `range: [0, 5000]`.
- **duration_days** (bed_rest, avoid_lifting_weights): `suffix: "days"` (existing), `step: 1`, `min: 0`, `max: 365`, `range: [0, 365]`.
- **threshold_days** (return_if_fever_persists): `suffix: "days"` (existing), `step: 1`, `min: 0`, `max: 365`, `range: [0, 365]`.

### 2. Frontend defensive default

**File:** `Hospital-Web-UI/medixpro/medixpro/components/consultations/dynamic-field-renderer.tsx`

- When `field.step` is undefined, step is derived as:
  - If the field has a small integer range (min/max or range, both integers, span ≤ 30) → **step 1**.
  - Else if unit is temperature (°C/°F) → **step 1**.
  - Else → **0.01** (previous default).
- This avoids painful 0.01 stepping for any template that omits `step` on integer-scale fields.

---

## Validation checklist (production)

Before release, verify:

- [ ] **Chief Complaint modal**: Duration value moves in steps of 1; Pain Score (0–10) in steps of 1; no 0.01/0.04 values.
- [ ] **Vitals**: Pain score and integer vitals (BP, pulse, SpO₂, resp rate) step by 1; height/weight/temp use 0.1; suffix/unit shown where expected.
- [ ] **Symptoms** (if rendered by same dynamic form): All number fields show correct suffix and step (days, kg, months, per day, etc.).
- [ ] **Instructions** (if rendered by same dynamic form): All number fields show correct suffix and step.
- [ ] **Regression**: Height (cm/ft), weight (kg/lb), temperature (°C/°F) still convert and display correctly; existing validation messages unchanged.
- [ ] **Backend**: Pre-consultation template API returns fields with `suffix`, `step`, `min`, `max`, `range`; no breaking change to existing consumers.

---

## File change summary

| Area | File | Change |
|------|------|--------|
| Templates | `consultations_core/templates_metadata/pre_consultation/chief_complaint/chief_complaint_details.json` | Added suffix, step, min, max, range for duration_value and pain_score. |
| Templates | `consultations_core/templates_metadata/pre_consultation/vitals/vitals_details.json` | Added suffix for all number fields; added step and field-level min/max/range where missing. |
| Templates | `consultations_core/templates_metadata/consultation/symptoms/symptom_details.json` | Added suffix (where missing), step, min, max, range for all number fields. |
| Templates | `consultations_core/templates_metadata/consultation/instructions/instruction_details.json` | Added suffix (where missing), step, min, max, range for all number fields. |
| Frontend | `Hospital-Web-UI/medixpro/medixpro/components/consultations/dynamic-field-renderer.tsx` | Default step to 1 for small integer ranges when field.step is missing. |

---

## Adding new number fields later

For any new number field in templates:

1. **suffix**: Set `"suffix": "unit"` (e.g. `"days"`, `"kg"`) or `"suffix": ""` for scale-only.
2. **range**: Set `"min"`, `"max"`, and `"range": [min, max]` at field level.
3. **step**: Set `"step": 1` for integers, `"step": 0.1` for decimals (match range and unit).
4. Keep `validation.min` / `validation.max` in sync if present.

This keeps the dynamic UI consistent and production-ready.
