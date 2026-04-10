# Diagnostic order lifecycle

## Status transitions

Core flow remains: `created` → `confirmed` → `sample_collected` → `in_processing` → `report_ready` → `completed`, with `cancelled` and **`partial`** where some lines finish and others cancel.

## Expand execution lines

`DiagnosticOrderTestLine` rows are created **when the order moves to `confirmed`** (see `DiagnosticOrder.update_status`), not at cart creation. Package lines freeze `composition_snapshot` and expand children from that snapshot.

## Reports

- **Legacy:** optional `DiagnosticReport` rollup per order (nullable `order` when using only per-line reports).
- **Preferred:** `DiagnosticTestReport` per `DiagnosticOrderTestLine`; `OrderStatusAggregationService` updates order status from line-level report states.

## Cancellation

Use `CancellationService`: cancelling a package line cascades to non-terminal test lines; partial per-line cancel is allowed before execution per product policy.
