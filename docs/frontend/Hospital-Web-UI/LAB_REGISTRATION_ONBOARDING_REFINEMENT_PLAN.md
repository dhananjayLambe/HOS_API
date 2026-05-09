# Lab Registration Onboarding — Refinement Plan (Phase 1)

**Product decision:** Refactor the **existing** five-step lab flow (`LabOnboarding` + step components + stepper + review). **Do not** replace with a single-page wizard-less form.

**Goal:** Fast, lightweight, healthcare-partner onboarding for small Indian labs—not enterprise compliance software.

---

## What already exists (keep the architecture)

- [`components/lab-admin/lab-onboarding.tsx`](Hospital-Web-UI/medixpro/medixpro/components/lab-admin/lab-onboarding.tsx): step state, `Stepper`, card layout, `ReviewStep`, inline [`SuccessPage`](Hospital-Web-UI/medixpro/medixpro/components/lab-admin/onboarding-steps/success-page.tsx) after submit.
- [`components/lab-admin/onboarding-steps/*`](Hospital-Web-UI/medixpro/medixpro/components/lab-admin/onboarding-steps): one file per step + review + success.
- Submit path: [`review-step.tsx`](Hospital-Web-UI/medixpro/medixpro/components/lab-admin/onboarding-steps/review-step.tsx) → `POST /api/lab-admin/onboarding` → [`app/api/lab-admin/onboarding/route.ts`](Hospital-Web-UI/medixpro/medixpro/app/api/lab-admin/onboarding/route.ts) → backend `http://127.0.0.1:8000/api/diagnostic/lab-onboard/`.

**Pending approval UX:** There is **no** separate `app/auth/register/lab-registration/success/` route today (unlike clinic). Post-submit UX is the **in-tree `SuccessPage` component**. Refine that component (and optionally later add a dedicated route for parity with clinic)—for this phase, **improving `SuccessPage` + review hierarchy** is enough unless product explicitly wants URL-based success.

---

## Stepper labels (rename only in UI)

| Step | New title        | New short description        |
| ---- | ---------------- | ------------------------------ |
| 1    | Contact Details  | How we reach you               |
| 2    | Lab Information  | Your lab’s basic details       |
| 3    | Branch Address   | Primary branch location        |
| 4    | Compliance Documents (Optional) | Upload now or later |
| 5    | Review & Submit  | Confirm and send               |

Update the `steps` array in `lab-onboarding.tsx` accordingly.

---

## Data model (`OnboardingData` in `lab-onboarding.tsx`)

Adjust types and default `useState` so they match the simplified UI (remove unused defaults like `pricing_tier`, `turnaround_time_hours`, empty `service_categories` where no longer collected).

**Suggested shape (keys can stay snake_case for API alignment):**

- **`contact_details`** (recommended rename from `admin_details`; if rename is too wide a ripple, keep prop name `admin_details` but show only “Contact Details” in UI—prefer **rename** for clarity across step + review + API mapper).
  - `username` — mobile (WhatsApp / login identifier); validate as **10-digit Indian mobile** after normalize.
  - `first_name`, `last_name`
  - `email` — optional
  - `designation` — dropdown value (not free text)
  - `whatsapp_same_as_mobile` — boolean; when true, treat WhatsApp as same as `username` for display/submit.

- **`lab_details`**
  - Required: `organization_name`, `display_name`, `lab_type`, `home_sample_collection`, **`walk_in_collection`** (new toggle).
  - Optional: `license_number`, `registration_number` (user asked optional reg # at lab step).
  - **Remove from UI and payload:** `pricing_tier`, `turnaround_time_hours`, `certifications`, `service_categories`, `license_valid_till`.
  - **Deprecate** single `lab_name` if replaced by org + display name—or map `lab_name` → `display_name` for backward compatibility in API route until backend catches up.

- **`address_details`**
  - Keep: address line 1/2, city, state, pincode.
  - **Add:** `landmark` (optional).
  - **Remove from UI:** geolocation / “Detect location”; stop sending lat/long unless backend still requires—prefer omit or send null only if API contract demands.

- **`compliance_details`** (rename from `kyc_details` in UX; type can be `compliance_details` or keep `kyc_details` internally)
  - Optional text: `pan_number`, `gst_number`
  - Optional files: `lab_license_file`, `nabl_certificate_file` (client `File | null` or upload to FormData in a later phase; for JSON-only API, files may need multipart—coordinate with [`route.ts`](Hospital-Web-UI/medixpro/medixpro/app/api/lab-admin/onboarding/route.ts): if backend not ready, keep files UI-only with note in mapper).

---

## Per-step file changes

### 1. Step 1 — `admin-details-step.tsx` → treat as Contact Details

- Rename component/file **only if** worth the churn; minimum: change visible title to **“Contact Details”**, remove “Admin” wording.
- Fields: first name, last name, **mobile** (label as username / WhatsApp mobile per product copy), email optional, **designation `<Select>`** with options: Owner, Lab Admin, Manager, Pathologist, Radiologist, Receptionist, Other.
- **Checkbox:** “WhatsApp number same as mobile” (when checked, hide duplicate WhatsApp field if any existed; primary mobile is the single source).
- Inline validation; no OTP.

### 2. Step 2 — `lab-details-step.tsx`

- Required: Organization Name, Display Name, Lab Type (existing select options—align with product list if already close), Home collection **Switch**, Walk-in **Switch**.
- Optional: License Number, Registration Number.
- Remove: pricing tier, turnaround, certification textarea, service category chips, license validity date.
- Tighten vertical spacing and shorten helper copy.

### 3. Step 3 — `address-details-step.tsx`

- Add optional **Landmark**.
- Remove detect location / map / geolocation UI and related state.

### 4. Step 4 — `kyc-details-step.tsx` (Compliance)

- Section title: **“Compliance Documents (Optional)”**.
- Subcopy: **“Upload documents now or complete later after admin review.”**
- Fields: PAN, GST, Lab License file, NABL Certificate file (simple file rows + optional preview/remove).
- Remove: document type dropdown, dynamic document-type flow, long “enterprise” KYC copy.

### 5. Step 5 — `review-step.tsx`

- Keep overall review pattern; simplify layout density (slightly less padding where oversized).
- **Add** a clear **Registration status** card with badge **PENDING APPROVAL** (pre-submit this is “will be pending after submit” or show as informational—product intent: set expectations **before** submit).
- **Add** note: **“Your lab account will be activated after admin approval.”**
- Update flattening logic to match new fields; remove dropped fields from `flattenedData`.
- Keep existing confirm + error **Dialog** UX; improve copy if it references missing Django server—point users to “try again later” when `/api/diagnostic/lab-onboard/` is unreachable.

### 6. `success-page.tsx` (post-submit)

- Align branding with app (**MedixPro** / MedixPro tone—not “DoctorProCare”) to match clinic onboarding.
- Ensure message matches: *“Our admin team will review your registration and approve your account shortly.”* and status **PENDING APPROVAL** (badge styling consistent with clinic/doctor patterns).
- Primary CTA: **Back to login** (`/auth/login`) in addition or instead of “Go to Home” if that matches clinic/doctor success flows better.
- Optional: reduce extra blocks (email/phone footnotes) if they add noise—keep **short** “what’s next”.

### 7. `lab-onboarding.tsx`

- Update `steps` titles/descriptions.
- Wire renamed step components / props if `contact_details` rename happens.
- Header: lighter subtitle; consider MedixPro alignment with [`clinic-registration/page.tsx`](Hospital-Web-UI/medixpro/medixpro/app/auth/register/clinic-registration/page.tsx) (gradient / copy length)—**small** visual pass, not a full redesign.

### 8. API route [`app/api/lab-admin/onboarding/route.ts`](Hospital-Web-UI/medixpro/medixpro/app/api/lab-admin/onboarding/route.ts)

- **No Django changes in this phase** (per prior constraint)—but the Next proxy already targets **`/api/diagnostic/lab-onboard/`**.
- Update **request body mapping** to send only the simplified payload (omit deprecated keys or send null/empty arrays as required by current backend contract). If backend rejects missing fields, document which fields still need backend relaxation in a follow-up ticket.

---

## Visual UX (global pass)

- Slightly reduce `space-y-*`, card `p-6 md:p-8` → slightly tighter on mobile where noted.
- Shorter helper text under inputs; fewer paragraphs.

---

## Explicit out of scope

- OTP, schedules/timings, enterprise compliance wizardry.
- Replacing stepper with single-page flow.

---

## Implementation todos

1. **`lab-onboarding.tsx`** — step labels, `OnboardingData` shape + defaults, branding micro-copy.
2. **`admin-details-step.tsx`** — Contact Details UX, mobile username, designation select, WhatsApp checkbox, validation.
3. **`lab-details-step.tsx`** — org/display names, toggles, strip heavy fields.
4. **`address-details-step.tsx`** — landmark optional; remove geolocation.
5. **`kyc-details-step.tsx`** — optional compliance copy + simplified fields/uploads.
6. **`review-step.tsx`** — summary sections, status card + note, new flatten payload, loading strings.
7. **`success-page.tsx`** — copy, badge, login CTA, MedixPro tone.
8. **`app/api/lab-admin/onboarding/route.ts`** — transform simplified client payload → backend shape (best-effort until API updated).

---

## Verification

- Manual: complete flow on mobile width; back/next; submit with backend off → error dialog readable; submit with backend on → success page shows pending + summary fields populated.
- Lint/typecheck updated `OnboardingData` consumers only.
