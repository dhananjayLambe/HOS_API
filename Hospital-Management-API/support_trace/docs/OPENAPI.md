# OpenAPI

Support Investigation API schema is documented via drf-yasg helpers in `support_trace/api/openapi.py`.

Main project Swagger UI includes support endpoints under `/api/v1/support/`.

Reserved endpoints (501 in M5.6):
- `POST /export`
- `GET /export/{id}`
- `GET /search/suggestions`

Future: dedicated `GET /api/v1/support/openapi/` subset export.
