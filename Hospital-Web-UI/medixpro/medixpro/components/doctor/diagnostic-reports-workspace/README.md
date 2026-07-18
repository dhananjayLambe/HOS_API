# Diagnostic Reports Workspace (UI)

## Two surfaces

| Surface | Entry | Role |
|---------|-------|------|
| Operational workspace | `/lab-tests-reports` · `DiagnosticReportsWorkspacePage` | Cross-patient search, queues, advanced filters |
| Clinical Decision Support panel | Consultation **Reports** · `ConsultationReportsDrawer` → `ConsultationClinicalReportsPanel` | Patient-locked mid-consult decision support |

## CDS Phase 1

Answers: *What previous reports help me diagnose this patient?*

- Quick summary (ready / pending; critical only if > 0; latest report; last consultation)
- Timeline buckets (Today / This week / Last month / Older)
- Search + Laboratory / Radiology / Cardiology / Pathology chips (client modality map over freeform categories)
- Inline preview (`ReportPreviewWorkspace` `variant="cds"`) — View Full / Download / Print
- Empty state: Order diagnostic tests → Investigations; Upload external → `/patients/{id}?tab=labs`; Refresh

## Later

- Phase 2+: Clinical Context Panel tabs; insert findings into Findings / Doctor Notes; report compare
- Phase 3: AI clinical highlights / compare-with-last (see `doctor_report_workspace` roadmap)
