# Communication Snapshots

Snapshots are stored inside `new_value.payload` — no new tables.

## Decision snapshot (mandatory on successful channel delivery)

```json
{
  "communication_attempt_id": "...",
  "communication_id": "...",
  "attempt_number": 1,
  "selected_channel": "WHATSAPP",
  "available_channels": ["WHATSAPP", "EMAIL", "SMS", "PORTAL"],
  "fallback_order": ["EMAIL", "SMS", "PORTAL"],
  "selection_reason": "Primary channel policy",
  "policy": "PRIMARY",
  "communication_strategy": "PRIMARY",
  "provider": "INTERNAL",
  "provider_response": "accepted",
  "delivery_reason": "Channel delivery succeeded"
}
```

## Provider response snapshot (success + failure)

```json
{
  "provider": "META",
  "provider_reference": "wamid.xxx",
  "http_status": 200,
  "provider_code": "accepted",
  "provider_message": "Message accepted",
  "request_payload_hash": "sha256:abc...",
  "response_payload_hash": "sha256:def...",
  "error_classification": null,
  "latency_ms": 340
}
```

PHI is never duplicated — only SHA-256 hashes of normalized request/response bodies.

## Channel selection snapshot (on retry)

```json
{
  "selected_channel": "EMAIL",
  "previous_channel": "WHATSAPP",
  "previous_error": "provider_timeout",
  "communication_strategy": "FALLBACK",
  "fallback_order": ["EMAIL", "SMS", "PORTAL"],
  "selection_reason": "WhatsApp attempt 1 failed; sequential fallback"
}
```

## Attempt timeline

Reconstructed by `ReportCommunicationAuditRepository.reconstruct_attempt_timeline(communication_id)`:

```json
{
  "attempt_timeline": [
    {"attempt_number": 1, "channel": "WHATSAPP", "status": "FAILED", "communication_attempt_id": "..."},
    {"attempt_number": 2, "channel": "EMAIL", "status": "DELIVERED", "communication_attempt_id": "..."}
  ]
}
```

## Delivery metrics

```json
{
  "timings_ms": {
    "queue_wait_ms": 120,
    "provider_latency_ms": 340,
    "total_delivery_ms": 480,
    "retry_delay_ms": 0
  }
}
```

Built by `business_audit/communication/snapshot_builder.py`.
