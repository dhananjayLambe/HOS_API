# M3 — Postman Collection

## Base URL

```
{{base_url}}/api/v1/marketplace/diagnostics/recommendations/
```

## Auth

Header: `Authorization: Bearer {{jwt_token}}`

Optional: `X-Request-ID: {{correlation_id}}`

## Scenarios

### 1. Success

```json
POST /
{
  "consultation_id": "{{consultation_id}}",
  "client_request_id": "postman-1"
}
```

Expect: 200, `recommendation.available=true`, `metadata.recommendation_id` set.

### 2. Consultation not found

```json
{ "consultation_id": "00000000-0000-0000-0000-000000000099" }
```

Expect: 404, `error.code=CONSULTATION_NOT_FOUND`.

### 3. No investigations

Use consultation with empty investigations container.

Expect: 400, `next_action=ADD_INVESTIGATIONS`.

### 4. No eligible lab

Deactivate branch pricing for required services.

Expect: 409, `next_action=CHANGE_LOCATION`.

### 5. Unauthorized

Remove Authorization header.

Expect: 401.

### 6. Wrong doctor

Another doctor's consultation UUID.

Expect: 403, `PERMISSION_DENIED`.

## Collection file

Export stored at: `milestone_3/postman/Marketplace_Recommendation_API.postman_collection.json`
