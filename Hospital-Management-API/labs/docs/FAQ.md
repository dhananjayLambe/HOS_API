---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# FAQ — labs

## What does assignment ACCEPT mean?

Lab agrees to handle the order — **not** that sample was collected. See [BUSINESS_FLOW.md](BUSINESS_FLOW.md).

## Home collection vs branch visit?

Order fulfillment uses one path: home collection **or** branch visit, not both.

## Where do I upload reports?

Use diagnostics_engine: `POST /api/v1/diagnostics/reports/{report_id}/artifacts/upload/` — never upload to assignment task_id.

## How is branch pricing updated?

`sync_lab_pricing` management command; operator manual in `management/commands/lab_pricing_manual.md`.

## Phlebotomist list API?

`GET /api/labs/phlebotomists/` for home collection assignment.
