# API Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_IDENTIFIER` | 400 | Bad or disallowed partial search |
| `VALIDATION_ERROR` | 400 | Missing required params |
| `PERMISSION_DENIED` | 403 | Wrong role |
| `WORKFLOW_NOT_FOUND` | 404 | No matching trace |
| `INVESTIGATION_FAILED` | 500 | Engine error (no stack trace) |
| `NOT_IMPLEMENTED` | 501 | Export, suggestions stubs |
