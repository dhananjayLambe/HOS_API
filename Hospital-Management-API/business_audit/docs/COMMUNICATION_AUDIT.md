# Communication Audit Framework

M4.5 establishes the **Communication Audit Framework** — a reusable platform for auditing how information reaches patients. Report delivery is Use Case #1.

## Four-layer audit model

| Layer | Answers |
|-------|---------|
| Clinical Audit (M3.6) | What happened to the clinical record? |
| Business Workflow Audit (M4.2–M4.3) | How did operational workflows execute? |
| Decision Engine Audit (M4.4) | Why was a path chosen? |
| **Communication Audit (M4.5)** | **How was information delivered to the patient?** |

## Communication object

Every communication audit record references a **Communication** root resource:

- `communication_id` — stable per artifact workflow (`str(report.id)` for reports)
- `communication_attempt_id` — one send attempt (`LabReportDeliveryLog.id`)
- `attempt_number` — retry counter (`retry_count + 1`)

Hierarchy: Communication → Attempt → Provider → Webhook

## Package layout

```
business_audit/communication/
  enums.py, constants.py, types.py, context.py, snapshot_builder.py, provider_registry.py
  certification/
  report/          # Use Case #1
  prescription/, reminder/, otp/, invoice/  # stubs (M4.6+)
```

## Future domains (no redesign)

Prescriptions, invoices, reminders, OTPs, receipts, consent, and marketing plug into `communication/{domain}/` using the same Communication object, channel, provider, attempt, strategy, and snapshot schema.

## Related

- [COMMUNICATION_STATE_MACHINE.md](COMMUNICATION_STATE_MACHINE.md)
- [COMMUNICATION_SNAPSHOT.md](COMMUNICATION_SNAPSHOT.md)
- [COMMUNICATION_PROVIDERS.md](COMMUNICATION_PROVIDERS.md)
- [REPORT_DELIVERY_AUDIT.md](REPORT_DELIVERY_AUDIT.md)
