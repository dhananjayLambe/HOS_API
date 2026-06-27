---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# S3 Report Storage

Reports and prescription PDFs stored in S3 when `AWS_REPORTS_BUCKET` is set.

## Bucket config

See [CONFIGURATION.md](../CONFIGURATION.md).

## Access pattern

- Upload via backend API
- Download via presigned URLs or tokenized download endpoints
- Never expose raw S3 URLs in API responses (INV-007, operational truth table)

## Local fallback

`MEDIA_ROOT` when bucket unset — development only.

## Lifecycle

See [DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md).
