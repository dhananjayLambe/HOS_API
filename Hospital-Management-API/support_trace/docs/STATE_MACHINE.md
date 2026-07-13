# State Machines

Per-workflow FSMs enforced by `WorkflowTransitionValidator` via `state_machine.py`.

## Recommendation

Generated → Queued → Sent → Delivered → Read → Completed

Failure: Generated → Failed → Retry → Delivered / Sent

## Booking

Created → Confirmed → Modified → Closed

Alternatives: Created → Cancelled | Expired

## Routing

Started → Matched → Compared → Discounted → Assigned

Alternatives: Started → Failed; Assigned → Manual Override → Assigned

## Report Delivery

Ready → Requested → Sending → Delivered

Alternatives: Ready → Failed → Retry

## Consultation

Started → Documentation → Prescription → Completed

## Prescription

Created → Signed → Delivered

## Diagnostic Report

Uploaded → Verified → Viewed → Downloaded → Shared

## Rules

- First event (no existing row) skips FSM check.
- Terminal TraceStatus cannot regress unless `allow_regression=True` (retry, manual override).
- Same-state updates are always allowed.
