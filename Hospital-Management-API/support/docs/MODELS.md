---
owner: support-team
module: support
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — support

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `SupportTicketSequence`

- **Source:** `support/models/sequence.py`
- **Fields:** `year`, `month`, `last_number`

### `SupportTicket`

- **Source:** `support/models/ticket.py`
- **Fields:** `id`, `ticket_number`, `user_role`, `created_by`, `doctor`, `clinic`, `subject`, `description`, `category`, `priority`, `status`, `assigned_to`, `created_at`, `updated_at`

### `SupportTicketAttachment`

- **Source:** `support/models/ticket.py`
- **Fields:** `ticket`, `file`, `uploaded_at`

### `SupportTicketComment`

- **Source:** `support/models/ticket.py`
- **Fields:** `ticket`, `message`, `created_by`, `created_at`

<!-- auto-generated:end -->
