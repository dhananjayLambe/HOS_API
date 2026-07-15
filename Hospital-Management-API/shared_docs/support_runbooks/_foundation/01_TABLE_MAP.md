# Table Map — Real Django `db_table` Names

Frozen for Support Runbooks. **Do not invent tables.** Booking is **not** a fictional `bookings` table — it is `diagnostics_engine_diagnosticorder`.

Convention: **default** = `{app_label}_{modelclassname.lower()}`. **explicit** = `Meta.db_table`.

Full identifier resolution: [`00_IDENTIFIERS.md`](00_IDENTIFIERS.md).

---

## Patient / User

| Model | db_table | Notes |
|-------|----------|-------|
| `User` | `account_user` | `username` = phone |
| `PatientAccount` | `patient_account_patientaccount` | PK `id` UUID |
| `PatientProfile` | `patient_account_patientprofile` | `public_id` (PAT…), `account_id` |
| `PatientProfileDetails` | `patient_account_patientprofiledetails` | |
| `PatientAddress` | `patient_account_patientaddress` | |
| Clinic M2M | `patient_account_patientaccount_clinics` | |

---

## Consultation / encounter

| Model | db_table | Notes |
|-------|----------|-------|
| `ClinicalEncounter` | `consultations_core_clinicalencounter` | `visit_pnr` |
| `Consultation` | `consultations_core_consultation` | OneToOne `encounter_id` |
| `PreConsultation` | `consultations_core_preconsultation` | |
| `PreConsultationVitals` | `consultations_core_preconsultationvitals` | JSON `data` |
| `ConsultationSymptom` | `consultations_core_consultationsymptom` | |
| `ConsultationDiagnosis` | `consultations_core_consultationdiagnosis` | |
| `CustomDiagnosis` | `consultations_core_customdiagnosis` | |
| `ConsultationFinding` | `consultation_finding` | explicit |
| `ConsultationInvestigations` | `consultation_investigations` | explicit |
| `InvestigationItem` | `consultation_investigation_items` | explicit |
| `FollowUp` | `consultations_core_followup` | |

---

## Prescription

| Model | db_table | Notes |
|-------|----------|-------|
| `Prescription` | `consultations_core_prescription` | `prescription_pnr` |
| `PrescriptionLine` | `consultations_core_prescriptionline` | |
| `PrescriptionInstruction` | `consultations_core_prescriptioninstruction` | |
| `CustomMedicine` | `consultations_core_custommedicine` | |

---

## Diagnostics / booking

| Model | db_table | Notes |
|-------|----------|-------|
| `DiagnosticOrder` | `diagnostics_engine_diagnosticorder` | **Booking**; PK UUID = Support Trace `booking_id`; `order_number` = human id |
| `DiagnosticOrderItem` | `diagnostics_engine_diagnosticorderitem` | |
| `DiagnosticOrderTestLine` | `diagnostics_engine_diagnosticordertestline` | |
| Marketplace recommendation audit | `diagnostics_marketplace_recommendation_api_audit` | `recommendation_id` — no Recommendation ORM |

---

## Routing / lab assignment

| Model | db_table | Notes |
|-------|----------|-------|
| `RoutingRun` | `diagnostics_engine_routingrun` | `diagnostic_order_id` |
| `EligibleLabSnapshot` | `diagnostics_engine_eligiblelabsnapshot` | |
| `RoutingDecisionSnapshot` | `diagnostics_engine_routingdecisionsnapshot` | |
| `RoutingLabOrderAssignment` | `diagnostics_engine_routinglaborderassignment` | |
| `RoutingEvent` | `diagnostics_engine_routingevent` | |
| `LabOrderAssignment` | `lab_order_assignments` | explicit; OneToOne order |

---

## Reports

| Model | db_table | Notes |
|-------|----------|-------|
| `DiagnosticTestReport` | `diagnostics_engine_diagnostictestreport` | Primary report entity |
| `DiagnosticReportArtifact` | `diagnostics_engine_diagnosticreportartifact` | Files / `artifact_public_id` |
| `DiagnosticReport` | `diagnostics_engine_diagnosticreport` | Legacy OneToOne order |
| Lab delivery log | `lab_report_delivery_logs` | |
| Lab review | `lab_report_reviews` | |

---

## WhatsApp

| Model | db_table | Notes |
|-------|----------|-------|
| `WhatsAppMessage` | `whatsapp_messages` | `recipient_mobile_number`, `meta_message_id`; FKs to profile, encounter, prescription, order, report |

---

## Audits + Support Trace

| Model | db_table | Notes |
|-------|----------|-------|
| `ClinicalAudit` | `clinical_audit` | `correlation_id`, consultation/patient string IDs |
| `BusinessAudit` | `business_audit` | `workflow_instance_id`, `state_before`/`state_after` |
| `SupportTrace` | `support_trace` | Mutable projection; identifier index columns |

---

## Clinic / Doctor / Appointment

| Model | db_table | Notes |
|-------|----------|-------|
| `Clinic` | `clinic_clinic` | `code` (CL…) |
| `doctor` | `doctor_doctor` | `public_id` (DOC…), `user_id` |
| Doctor–clinic M2M | `doctor_doctor_clinics` | |
| `Appointment` | `appointments_appointment` | `payment_status` / `payment_mode` only — **no Payment model** |

---

## Labs (org)

| Model | db_table |
|-------|----------|
| Lab org | `lab_organizations` |
| Branch | `lab_branches` |
| Lab user | `lab_users` |

---

## Payment

**No `payment` / `Payment` table.** Use appointment payment fields and optional `support_trace.payment_id` string index if populated later. See [`09_Payment_Runbook.md`](../09_Payment_Runbook.md).

---

## Explicit `Meta.db_table` inventory (non-default)

```
support_trace
clinical_audit
business_audit
whatsapp_messages
finding_master
consultation_finding
consultation_investigations
custom_investigations
consultation_investigation_items
consultation_procedures
clinical_templates
diagnostics_marketplace_recommendation_api_audit
lab_order_assignments
lab_collection_requests
lab_visit_appointments
lab_order_test_executions
lab_sample_tracking
lab_report_delivery_logs
lab_report_reviews
lab_organizations
lab_branches
lab_addresses
lab_schedules
lab_users
lab_documents
labs_branchservicearea
labs_branchservicepricing
labs_branchpackagepricing
calendar_events
```
