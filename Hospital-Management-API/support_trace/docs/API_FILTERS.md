# API Filters

POST `/api/v1/support/search` accepts advanced filters in the JSON body:

| Field | Type | Description |
|-------|------|-------------|
| `q` | string | Primary identifier |
| `date_from` | ISO datetime | Filter traces after date |
| `date_to` | ISO datetime | Filter traces before date |
| `status` | string | Workflow status |
| `organization_id` | UUID | Organization scope |
| `patient_id` | UUID | Patient scope |
| `provider_reference` | string | Provider reference |
| `severity` | string | Event severity |
| `workflow_type` | string | Workflow type filter |

Timeline endpoints accept query params: `date_from`, `date_to`, `category`, `severity`.

Partial search allowed only for: phone, provider_reference, invoice. UUID forces exact match.
