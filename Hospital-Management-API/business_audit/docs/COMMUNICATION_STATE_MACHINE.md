# Communication State Machine

Extended FSM for `CommunicationStatus` (generic across all use cases).

## Primary path

```
READY → QUEUED → SENDING → SENT → DELIVERED → READ → ACKNOWLEDGED
```

## Failure / retry

```
READY → FAILED → RETRY → (new attempt)
READY → EXPIRED | CANCELLED
```

## Portal path

```
READY → PUBLISHED → VIEWED
```

## Report delivery mapping

| Event | state_before | state_after |
|-------|--------------|-------------|
| `report.ready` | `None` | `READY` |
| `report.delivery_requested` | `READY` | `QUEUED` |
| `report.{channel}_delivery` | `SENDING`/`SENT` | `DELIVERED` |
| `report.portal_delivery` | `QUEUED` | `PUBLISHED` |
| `report.delivery_failed` | pre-terminal | `FAILED` |
| `report.delivery_retried` | `FAILED` | `RETRY` |
| `communication.webhook_received` | `DELIVERED` | `READ`/`ACKNOWLEDGED` (stub) |

## Provider status paths (documented)

| Provider | Typical path |
|----------|--------------|
| Meta | Accepted → Sent → Delivered → Read |
| AWS SES | Queued → Accepted → Delivered |
| SMS | Queued → Sent → Delivered |
| Portal | Ready → Published → Viewed |

State labels live in `business_audit/communication/constants.py`.
