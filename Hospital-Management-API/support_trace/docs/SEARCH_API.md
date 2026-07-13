# Search API

Base: `GET|POST /api/v1/support/search`

## GET — simple search

```
GET /api/v1/support/search?q=wamid.xxx&expand=timeline,summary
Authorization: Bearer <token>
```

| Param | Description |
|-------|-------------|
| `q` | Required — identifier string |
| `expand` | Comma-separated expansions |
| `level` | Basic, Standard, Full, Deep |
| `limit` | Max 100, default 20 |

## POST — advanced search

```json
POST /api/v1/support/search
{
  "q": "9876543210",
  "expand": "timeline,summary,health",
  "date_from": "2026-01-01T00:00:00Z",
  "status": "Running",
  "organization_id": "uuid"
}
```

## Suggestions (stub)

`GET /api/v1/support/search/suggestions` — returns 501 (reserved).
