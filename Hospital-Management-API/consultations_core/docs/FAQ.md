---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# FAQ — consultations_core

## Can I edit pre-consultation after consultation started?

No — pre becomes read-only with lock banner when consultation is in progress.

## How do I start a new visit?

Use "Start New Visit" when last encounter is completed; system creates new encounter in `created`.

## What happens on End Consultation?

Status → `consultation_completed`, PDF generated, S3 upload, WhatsApp queued. See [WORKFLOWS.md](WORKFLOWS.md).

## How do investigations become lab orders?

Doctor orders investigation → API creates `DiagnosticOrder` in diagnostics_engine.

## Legacy encounter statuses?

Old values (`pre_consultation`, `in_consultation`, `completed`) normalized via `normalize_encounter_status`.
