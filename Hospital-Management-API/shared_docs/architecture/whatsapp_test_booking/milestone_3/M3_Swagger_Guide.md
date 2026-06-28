# M3 — Swagger Guide

## Library

`drf-yasg` — view annotated with `@swagger_auto_schema`.

## Location

- UI: `/swagger/`, `/redoc/`
- JSON: `/swagger.json`

## Annotations

`MarketplaceRecommendationView.post` documents:

- Request: `MarketplaceRecommendationRequestSerializer`
- Responses: 200, 400, 403, 404, 409
- Security: Bearer JWT

## Examples

See [M3_API_Contract.md](./M3_API_Contract.md) for full success and failure JSON.

## Maintenance

When adding envelope fields, update contract doc first, then serializer, then swagger examples.
