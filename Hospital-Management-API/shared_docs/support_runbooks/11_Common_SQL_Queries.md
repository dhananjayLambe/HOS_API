# 11 — Common SQL Queries

Paste-ready queries for Support. Table names frozen from [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md). Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md).

**Replace** angle-bracket placeholders. Prefer UUIDs from APIs when available.

Query ID convention: `{MODULE}-{NN}` (reference from playbooks).

---

## Patient (P-01 …)

```sql
-- P-01 Profile by name
SELECT p.id AS profile_id, p.public_id, p.first_name, p.last_name, p.account_id,
       u.username AS mobile
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE p.first_name ILIKE '%<FIRST>%' AND p.last_name ILIKE '%<LAST>%'
  AND p.is_active = true
LIMIT 20;

-- P-02 Profile by mobile (username)
SELECT p.id AS profile_id, p.public_id, p.account_id, u.username AS mobile
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE u.username LIKE '%<DIGITS>%'
LIMIT 20;

-- P-03 Account clinics
SELECT a.id AS patient_account_id, c.id AS clinic_id, c.code, c.name
FROM patient_account_patientaccount a
JOIN patient_account_patientaccount_clinics ac ON ac.patientaccount_id = a.id
JOIN clinic_clinic c ON c.id = ac.clinic_id
WHERE a.id = '<patient_account_id>';

-- P-04 Profiles under account
SELECT id, public_id, first_name, last_name, relation, gender, is_active
FROM patient_account_patientprofile
WHERE account_id = '<patient_account_id>';

-- P-05 Public ID (PAT…)
SELECT id, account_id, public_id, first_name, last_name
FROM patient_account_patientprofile
WHERE public_id = '<PAT…>';

-- P-06 Recent encounters for account
SELECT e.id, e.visit_pnr, e.status, e.created_at, e.doctor_id, e.clinic_id
FROM consultations_core_clinicalencounter e
WHERE e.patient_account_id = '<patient_account_id>'
ORDER BY e.created_at DESC
LIMIT 20;

-- P-07 Encounters for profile
SELECT e.id, e.visit_pnr, e.status, e.created_at
FROM consultations_core_clinicalencounter e
WHERE e.patient_profile_id = '<patient_profile_id>'
ORDER BY e.created_at DESC
LIMIT 20;

-- P-08 Visit PNR lookup
SELECT id, patient_account_id, patient_profile_id, doctor_id, clinic_id, status, created_at
FROM consultations_core_clinicalencounter
WHERE visit_pnr = '<VISIT_PNR>';

-- P-09 Count visits by account
SELECT patient_account_id, COUNT(*) AS visits
FROM consultations_core_clinicalencounter
WHERE patient_account_id = '<patient_account_id>'
  AND status NOT IN ('cancelled', 'no_show')
GROUP BY patient_account_id;

-- P-10 User row for mobile
SELECT id, username, first_name, last_name, status, is_active
FROM account_user
WHERE username = '<MOBILE>';

-- P-11 Inactive profiles
SELECT id, account_id, first_name, last_name, is_active
FROM patient_account_patientprofile
WHERE account_id = '<patient_account_id>' AND is_active = false;

-- P-12 Profiles updated today (ops)
SELECT id, first_name, last_name, account_id, updated_at
FROM patient_account_patientprofile
WHERE updated_at::date = CURRENT_DATE
ORDER BY updated_at DESC
LIMIT 50;

-- P-13 Same mobile multiple accounts (collision check)
SELECT u.username, COUNT(DISTINCT a.id) AS accounts
FROM account_user u
JOIN patient_account_patientaccount a ON a.user_id = u.id
WHERE u.username LIKE '%<DIGITS>%'
GROUP BY u.username
HAVING COUNT(DISTINCT a.id) > 1;

-- P-14 Appointment payment fields for account
SELECT id, payment_status, payment_mode, consultation_fee, status, created_at
FROM appointments_appointment
WHERE patient_account_id = '<patient_account_id>'
ORDER BY created_at DESC
LIMIT 20;

-- P-15 Latest diagnosis name for profile
SELECT cd.name, cd.created_at, c.id AS consultation_id
FROM consultations_core_customdiagnosis cd
JOIN consultations_core_consultation c ON c.id = cd.consultation_id
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE e.patient_profile_id = '<patient_profile_id>'
ORDER BY cd.created_at DESC
LIMIT 5;

-- P-16 Open encounters
SELECT id, visit_pnr, status, created_at
FROM consultations_core_clinicalencounter
WHERE patient_account_id = '<patient_account_id>'
  AND status IN ('in_queue', 'pre_consultation', 'pre_consultation_completed', 'consultation_in_progress')
ORDER BY created_at DESC;

-- P-17 Doctor’s patients encounters on date
SELECT e.id, e.visit_pnr, e.patient_account_id, e.status
FROM consultations_core_clinicalencounter e
WHERE e.doctor_id = '<doctor_id>'
  AND e.created_at::date = '<YYYY-MM-DD>'
ORDER BY e.created_at;

-- P-18 Clinic encounters on date
SELECT e.id, e.visit_pnr, e.patient_account_id, e.doctor_id, e.status
FROM consultations_core_clinicalencounter e
WHERE e.clinic_id = '<clinic_id>'
  AND e.created_at::date = '<YYYY-MM-DD>'
ORDER BY e.created_at
LIMIT 100;

-- P-19 Join profile + mobile by profile_id
SELECT p.id, p.public_id, p.first_name, p.last_name, u.username AS mobile, a.id AS account_id
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE p.id = '<patient_profile_id>';

-- P-20 Fuzzy mobile suffix
SELECT p.id, p.first_name, p.last_name, u.username
FROM patient_account_patientprofile p
JOIN patient_account_patientaccount a ON a.id = p.account_id
JOIN account_user u ON u.id = a.user_id
WHERE u.username LIKE '%<LAST6DIGITS>'
LIMIT 20;
```

---

## Consultation (C-01 …)

```sql
-- C-01 Consultation by id
SELECT c.*, e.visit_pnr, e.status AS encounter_status
FROM consultations_core_consultation c
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE c.id = '<consultation_id>';

-- C-02 Consultation by encounter
SELECT * FROM consultations_core_consultation WHERE encounter_id = '<encounter_id>';

-- C-03 Latest consultations for patient
SELECT c.id, c.started_at, c.is_finalized, e.visit_pnr, e.status
FROM consultations_core_consultation c
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE e.patient_account_id = '<patient_account_id>'
ORDER BY c.started_at DESC NULLS LAST
LIMIT 15;

-- C-04 Preconsultation present?
SELECT id, encounter_id, specialty_code, created_at
FROM consultations_core_preconsultation
WHERE encounter_id = '<encounter_id>';

-- C-05 Vitals section
SELECT id, pre_consultation_id, data, updated_at
FROM consultations_core_preconsultationvitals
WHERE pre_consultation_id = (
  SELECT id FROM consultations_core_preconsultation WHERE encounter_id = '<encounter_id>'
);

-- C-06 Symptoms
SELECT * FROM consultations_core_consultationsymptom WHERE consultation_id = '<consultation_id>';

-- C-07 Diagnoses (link + custom)
SELECT cd.id, cd.name, cd.created_at
FROM consultations_core_customdiagnosis cd
WHERE cd.consultation_id = '<consultation_id>';

-- C-08 Findings
SELECT * FROM consultation_finding WHERE consultation_id = '<consultation_id>';

-- C-09 Investigation header
SELECT * FROM consultation_investigations WHERE consultation_id = '<consultation_id>';

-- C-10 Investigation items
SELECT i.*
FROM consultation_investigation_items i
JOIN consultation_investigations ci ON ci.id = i.investigations_id
WHERE ci.consultation_id = '<consultation_id>';

-- C-11 Encounter status log
SELECT * FROM consultations_core_encounterstatuslog
WHERE encounter_id = '<encounter_id>'
ORDER BY changed_at DESC NULLS LAST, id DESC
LIMIT 50;

-- C-12 Clinical audit for consultation
SELECT action, module, outcome, timestamp, correlation_id, resource_id
FROM clinical_audit
WHERE consultation_id = '<consultation_id>'
ORDER BY timestamp;

-- C-13 Clinical audit by correlation
SELECT action, consultation_id, encounter_id, timestamp
FROM clinical_audit
WHERE correlation_id = '<correlation_id>'
ORDER BY timestamp;

-- C-14 Incomplete consultations (doctor day)
SELECT c.id, e.visit_pnr, e.doctor_id, c.started_at, c.is_finalized
FROM consultations_core_consultation c
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE e.doctor_id = '<doctor_id>' AND c.is_finalized = false
ORDER BY c.started_at DESC
LIMIT 50;

-- C-15 Count audit actions for correlation
SELECT action, COUNT(*)
FROM clinical_audit
WHERE correlation_id = '<correlation_id>'
GROUP BY action
ORDER BY action;
```

---

## Prescription (RX-01 …)

```sql
-- RX-01 By consultation
SELECT id, prescription_pnr, status, is_active, finalized_at, created_at
FROM consultations_core_prescription
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;

-- RX-02 By PNR
SELECT * FROM consultations_core_prescription WHERE prescription_pnr = '<PNR>';

-- RX-03 Lines
SELECT id, drug_id, custom_medicine_id, dose_unit_id, route_id, frequency_id, deleted_at
FROM consultations_core_prescriptionline
WHERE prescription_id = '<prescription_id>';

-- RX-04 Active prescriptions for profile
SELECT rx.id, rx.prescription_pnr, rx.status, rx.consultation_id, rx.finalized_at
FROM consultations_core_prescription rx
JOIN consultations_core_consultation c ON c.id = rx.consultation_id
JOIN consultations_core_clinicalencounter e ON e.id = c.encounter_id
WHERE e.patient_profile_id = '<patient_profile_id>'
  AND rx.status = 'FINALIZED' AND rx.is_active = true
ORDER BY rx.finalized_at DESC
LIMIT 20;

-- RX-05 Audit prescription actions
SELECT action, timestamp, correlation_id, resource_id
FROM clinical_audit
WHERE consultation_id = '<consultation_id>'
  AND action LIKE 'prescription%'
ORDER BY timestamp;
```

---

## Booking / Order (B-01 …)

```sql
-- B-01 Order by consultation
SELECT id, order_number, consultation_id, encounter_id, branch_id, status, created_at
FROM diagnostics_engine_diagnosticorder
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;

-- B-02 Order by order_number
SELECT * FROM diagnostics_engine_diagnosticorder WHERE order_number = '<ORDER_NUMBER>';

-- B-03 Order by id (booking_id)
SELECT * FROM diagnostics_engine_diagnosticorder WHERE id = '<booking_id>';

-- B-04 Order items
SELECT * FROM diagnostics_engine_diagnosticorderitem WHERE order_id = '<booking_id>';

-- B-05 Test lines
SELECT * FROM diagnostics_engine_diagnosticordertestline WHERE order_id = '<booking_id>';

-- B-06 Orders for patient profile
SELECT o.id, o.order_number, o.consultation_id, o.status, o.created_at
FROM diagnostics_engine_diagnosticorder o
WHERE o.patient_profile_id = '<patient_profile_id>'
ORDER BY o.created_at DESC
LIMIT 20;

-- B-07 Recommendation API audit
SELECT recommendation_id, consultation_id, request_id, created_at
FROM diagnostics_marketplace_recommendation_api_audit
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC
LIMIT 20;

-- B-08 Business audit for booking resource
SELECT sequence_no, action, state_before, state_after, workflow_instance_id, correlation_id
FROM business_audit
WHERE resource_id = '<booking_id>'
ORDER BY sequence_no;

-- B-09 Lab assignment
SELECT * FROM lab_order_assignments WHERE diagnostic_order_id = '<booking_id>';

-- B-10 Orders without assignment
SELECT o.id, o.order_number, o.created_at
FROM diagnostics_engine_diagnosticorder o
LEFT JOIN lab_order_assignments a ON a.diagnostic_order_id = o.id
WHERE a.id IS NULL
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 50;

-- B-11 Support trace by booking_id
SELECT workflow_instance_id, status, current_state, last_event, correlation_id, routing_id, report_id
FROM support_trace
WHERE booking_id = '<booking_id>';

-- B-12 Orders for encounter
SELECT * FROM diagnostics_engine_diagnosticorder WHERE encounter_id = '<encounter_id>';

-- B-13 Count items per order
SELECT order_id, COUNT(*) FROM diagnostics_engine_diagnosticorderitem
WHERE order_id = '<booking_id>' GROUP BY order_id;

-- B-14 Branch of order
SELECT o.id, o.branch_id, b.name
FROM diagnostics_engine_diagnosticorder o
LEFT JOIN lab_branches b ON b.id = o.branch_id
WHERE o.id = '<booking_id>';

-- B-15 Clinical test.ordered audits
SELECT action, timestamp, resource_id, correlation_id
FROM clinical_audit
WHERE consultation_id = '<consultation_id>'
  AND action IN ('test.ordered', 'recommendation.sent')
ORDER BY timestamp;
```

---

## Routing (R-01 …)

```sql
-- R-01 Runs for order
SELECT id, diagnostic_order_id, status, created_at
FROM diagnostics_engine_routingrun
WHERE diagnostic_order_id = '<booking_id>'
ORDER BY created_at DESC;

-- R-02 Eligible labs
SELECT * FROM diagnostics_engine_eligiblelabsnapshot
WHERE diagnostic_order_id = '<booking_id>';

-- R-03 Decision snapshots
SELECT d.*
FROM diagnostics_engine_routingdecisionsnapshot d
JOIN diagnostics_engine_routingrun r ON r.id = d.routing_run_id
WHERE r.diagnostic_order_id = '<booking_id>';

-- R-04 Routing lab assignment
SELECT * FROM diagnostics_engine_routinglaborderassignment
WHERE diagnostic_order_id = '<booking_id>';

-- R-05 Routing events
SELECT * FROM diagnostics_engine_routingevent
WHERE routing_run_id = '<routing_run_id>'
ORDER BY created_at;

-- R-06 Business audit routing actions
SELECT sequence_no, action, state_after, correlation_id
FROM business_audit
WHERE workflow_type ILIKE '%Routing%'
  AND (resource_id = '<booking_id>' OR workflow_instance_id = '<wf_id>')
ORDER BY sequence_no;

-- R-07 Support routing_id
SELECT * FROM support_trace WHERE routing_id = '<routing_id>';
```

---

## Report (RP-01 …)

```sql
-- RP-01 Reports for order (via test lines)
SELECT r.id, r.status, r.report_number, r.order_test_line_id, r.created_at
FROM diagnostics_engine_diagnostictestreport r
JOIN diagnostics_engine_diagnosticordertestline tl ON tl.id = r.order_test_line_id
WHERE tl.order_id = '<booking_id>'
ORDER BY r.created_at DESC;

-- RP-02 Report by id
SELECT * FROM diagnostics_engine_diagnostictestreport WHERE id = '<report_id>';

-- RP-03 Artifacts
SELECT id, report_id, artifact_public_id, report_public_id, created_at
FROM diagnostics_engine_diagnosticreportartifact
WHERE report_id = '<report_id>';

-- RP-04 Reports without artifacts
SELECT r.id, r.status, r.created_at
FROM diagnostics_engine_diagnostictestreport r
LEFT JOIN diagnostics_engine_diagnosticreportartifact a ON a.report_id = r.id
WHERE a.id IS NULL
  AND r.created_at > NOW() - INTERVAL '7 days'
LIMIT 50;

-- RP-05 Legacy diagnosticreport by order
SELECT * FROM diagnostics_engine_diagnosticreport WHERE order_id = '<booking_id>';

-- RP-06 Lab delivery logs
SELECT * FROM lab_report_delivery_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;

-- RP-07 Lab reviews
SELECT * FROM lab_report_reviews
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;

-- RP-08 Clinical report audits
SELECT action, timestamp, resource_id, correlation_id
FROM clinical_audit
WHERE resource_id = '<report_id>'
   OR (consultation_id = '<consultation_id>' AND action LIKE 'report%')
ORDER BY timestamp;

-- RP-09 Support by report_id
SELECT workflow_instance_id, status, last_event, booking_id, correlation_id
FROM support_trace WHERE report_id = '<report_id>';

-- RP-10 PENDING reports older than 1 day
SELECT id, status, created_at FROM diagnostics_engine_diagnostictestreport
WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '1 day'
ORDER BY created_at
LIMIT 50;

-- RP-11 Artifact public id
SELECT * FROM diagnostics_engine_diagnosticreportartifact
WHERE artifact_public_id = '<ARTIFACT_PUBLIC_ID>';

-- RP-12 Count artifacts per report
SELECT report_id, COUNT(*) FROM diagnostics_engine_diagnosticreportartifact
WHERE report_id = '<report_id>' GROUP BY report_id;

-- RP-13 Patient denorm on artifact
SELECT * FROM diagnostics_engine_diagnosticreportartifact
WHERE patient_account_uuid = '<patient_account_id>'
ORDER BY created_at DESC
LIMIT 20;

-- RP-14 Business audit delivery on report
SELECT sequence_no, action, state_after, retry_count, correlation_id
FROM business_audit
WHERE resource_id = '<report_id>'
ORDER BY sequence_no;

-- RP-15 Supersedes chain
SELECT id, supersedes_id, status, created_at
FROM diagnostics_engine_diagnostictestreport
WHERE id = '<report_id>' OR supersedes_id = '<report_id>';
```

---

## WhatsApp (W-01 …)

```sql
-- W-01 By mobile
SELECT id, status, recipient_mobile_number, template_name, meta_message_id,
       prescription_id, diagnostic_order_id, diagnostic_test_report_id, created_at
FROM whatsapp_messages
WHERE recipient_mobile_number LIKE '%<DIGITS>%'
ORDER BY created_at DESC
LIMIT 30;

-- W-02 By id
SELECT * FROM whatsapp_messages WHERE id = '<message_id>';

-- W-03 By Meta wamid
SELECT * FROM whatsapp_messages WHERE meta_message_id = '<wamid>';

-- W-04 By prescription
SELECT * FROM whatsapp_messages WHERE prescription_id = '<prescription_id>' ORDER BY created_at DESC;

-- W-05 By report
SELECT * FROM whatsapp_messages WHERE diagnostic_test_report_id = '<report_id>' ORDER BY created_at DESC;

-- W-06 By order
SELECT * FROM whatsapp_messages WHERE diagnostic_order_id = '<booking_id>' ORDER BY created_at DESC;

-- W-07 Failed last 24h
SELECT id, status, recipient_mobile_number, template_name, created_at
FROM whatsapp_messages
WHERE status ILIKE '%fail%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- W-08 Status counts last 24h
SELECT status, COUNT(*)
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY COUNT(*) DESC;

-- W-09 By encounter
SELECT * FROM whatsapp_messages WHERE encounter_id = '<encounter_id>' ORDER BY created_at DESC;

-- W-10 By patient profile
SELECT * FROM whatsapp_messages WHERE patient_id = '<patient_profile_id>' ORDER BY created_at DESC LIMIT 30;

-- W-11 Missing meta id but claimed sent
SELECT id, status, created_at FROM whatsapp_messages
WHERE status ILIKE '%sent%' AND (meta_message_id IS NULL OR meta_message_id = '')
  AND created_at > NOW() - INTERVAL '7 days'
LIMIT 50;

-- W-12 Template usage
SELECT template_name, COUNT(*) FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY template_name ORDER BY COUNT(*) DESC;

-- W-13 Support whatsapp index
SELECT * FROM support_trace WHERE whatsapp_message_id = '<message_id>';

-- W-14 Support by phone_number
SELECT workflow_instance_id, workflow_type, status, last_event, booking_id, correlation_id
FROM support_trace
WHERE phone_number = '<DIGITS_ONLY>'
ORDER BY last_event_at DESC
LIMIT 20;

-- W-15 Clinic WhatsApp volume
SELECT clinic_id, COUNT(*) FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY clinic_id ORDER BY COUNT(*) DESC;
```

---

## Support Trace + Audits (ST-01 …)

```sql
-- ST-01 By correlation
SELECT workflow_instance_id, workflow_type, status, current_state, last_event,
       consultation_id, booking_id, report_id, retry_count, duration_ms
FROM support_trace
WHERE correlation_id = '<correlation_id>'
ORDER BY last_event_at;

-- ST-02 By workflow_instance_id
SELECT * FROM support_trace WHERE workflow_instance_id = '<wf_id>';

-- ST-03 By patient_account_id
SELECT workflow_instance_id, workflow_type, status, last_event, consultation_id, booking_id, last_event_at
FROM support_trace
WHERE patient_account_id = '<patient_account_id>'
ORDER BY last_event_at DESC
LIMIT 30;

-- ST-04 By consultation_id
SELECT * FROM support_trace WHERE consultation_id = '<consultation_id>';

-- ST-05 By encounter_id
SELECT * FROM support_trace WHERE encounter_id = '<encounter_id>';

-- ST-06 By booking_id
SELECT * FROM support_trace WHERE booking_id = '<booking_id>';

-- ST-07 By prescription_id
SELECT * FROM support_trace WHERE prescription_id = '<prescription_id>';

-- ST-08 By provider_reference
SELECT * FROM support_trace WHERE provider_reference = '<ref>';

-- ST-09 Failed / unhealthy
SELECT workflow_instance_id, workflow_type, status, workflow_health, last_event, retry_count, last_event_at
FROM support_trace
WHERE status ILIKE '%fail%' OR workflow_health ILIKE '%unhealthy%'
ORDER BY last_event_at DESC
LIMIT 50;

-- ST-10 High retry
SELECT workflow_instance_id, retry_count, status, last_event, booking_id
FROM support_trace
WHERE retry_count >= 2
ORDER BY retry_count DESC, last_event_at DESC
LIMIT 50;

-- ST-11 Runtime metadata sample
SELECT workflow_instance_id, runtime_metadata
FROM support_trace
WHERE workflow_instance_id = '<wf_id>';

-- ST-12 Orphan parent check
SELECT t.workflow_instance_id, t.parent_workflow_instance_id
FROM support_trace t
LEFT JOIN support_trace p ON p.workflow_instance_id = t.parent_workflow_instance_id
WHERE t.parent_workflow_instance_id IS NOT NULL AND p.id IS NULL
LIMIT 50;

-- ST-13 Duplicate workflow_instance_id (should be 0)
SELECT workflow_instance_id, COUNT(*)
FROM support_trace
GROUP BY workflow_instance_id
HAVING COUNT(*) > 1;

-- ST-14 Business audit by correlation
SELECT sequence_no, workflow_type, action, state_before, state_after, resource_id, workflow_instance_id
FROM business_audit
WHERE correlation_id = '<correlation_id>'
ORDER BY sequence_no;

-- ST-15 Business audit by workflow_instance_id
SELECT * FROM business_audit
WHERE workflow_instance_id = '<wf_id>'
ORDER BY sequence_no;

-- ST-16 Clinical + business counts by correlation
SELECT 'clinical' AS src, COUNT(*) FROM clinical_audit WHERE correlation_id = '<correlation_id>'
UNION ALL
SELECT 'business', COUNT(*) FROM business_audit WHERE correlation_id = '<correlation_id>'
UNION ALL
SELECT 'support_trace', COUNT(*) FROM support_trace WHERE correlation_id = '<correlation_id>';

-- ST-17 Search vector contains (JSONB ops vary; exact field preferred)
SELECT workflow_instance_id, booking_id, phone_number
FROM support_trace
WHERE phone_number = '<DIGITS>' OR booking_id = '<booking_id>'
LIMIT 20;

-- ST-18 Recently updated traces
SELECT workflow_instance_id, workflow_type, status, last_event, updated_at
FROM support_trace
ORDER BY updated_at DESC
LIMIT 50;

-- ST-19 Traces missing correlation_id (data quality)
SELECT workflow_instance_id, workflow_type, status, created_at
FROM support_trace
WHERE correlation_id IS NULL OR correlation_id = ''
ORDER BY created_at DESC
LIMIT 50;

-- ST-20 Payment_id populated (rare / future)
SELECT workflow_instance_id, payment_id, invoice_id, booking_id
FROM support_trace
WHERE payment_id IS NOT NULL AND payment_id <> ''
ORDER BY updated_at DESC
LIMIT 20;
```

---

## Admin helpers (A-01 …)

```sql
-- A-01 User groups (verify table name if custom user M2M differs)
SELECT u.id, u.username, g.name
FROM account_user u
JOIN account_user_groups ug ON ug.user_id = u.id
JOIN auth_group g ON g.id = ug.group_id
WHERE u.username = '<USERNAME>';

-- A-02 Doctor + clinics
SELECT d.id, d.public_id, d.user_id, c.code, c.name
FROM doctor_doctor d
LEFT JOIN doctor_doctor_clinics dc ON dc.doctor_id = d.id
LEFT JOIN clinic_clinic c ON c.id = dc.clinic_id
WHERE d.public_id = '<DOC…>' OR d.user_id = '<user_id>';
```

---

## Notes

- `booking_id` in Support Trace = `diagnostics_engine_diagnosticorder.id` (UUID), not `order_number`.
- `phone_number` normalization: digits only (e.g. `919876543210`).
- If a join column name differs in a migrated DB, describe with `\d table` in `psql` and update this file — do not invent alternate booking tables.
