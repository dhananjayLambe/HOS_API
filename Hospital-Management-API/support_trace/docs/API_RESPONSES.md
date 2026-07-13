# API Response Envelope

```json
{
  "success": true,
  "request_id": "http-request-uuid",
  "data": { },
  "metadata": {
    "investigation_id": "inv-uuid",
    "duration_ms": 18.2,
    "generated_at": "2026-07-13T05:41:21Z",
    "api_version": "v1",
    "investigation_level": "Full",
    "correlation_id": "uuid-or-null",
    "partial": false,
    "scope": "booking:uuid"
  }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "WORKFLOW_NOT_FOUND", "message": "..." },
  "metadata": { "investigation_id": "..." }
}
```

See [ERROR_CODES.md](ERROR_CODES.md).
