# Report artifact storage — local vs S3

Switch storage **with environment variables only**. No code change required to promote from local/dev to production S3.

## Setting: `REPORT_ARTIFACT_STORAGE`

| Value | Behavior |
|-------|----------|
| `auto` (default) | Use **S3** when `AWS_REPORTS_BUCKET` is set; otherwise **local** `MEDIA_ROOT` |
| `local` | Always local disk + authenticated API stream for preview/download |
| `s3` | Require `AWS_REPORTS_BUCKET`; preview/download issue **302** presigned URLs |

## Dev (local)

```bash
REPORT_ARTIFACT_STORAGE=local
# leave AWS_REPORTS_BUCKET unset
```

Files live under Django `MEDIA_ROOT` (default `media/`). Workspace preview/download stream bytes over JWT (no public `/media` dependency).

## Production (S3)

```bash
REPORT_ARTIFACT_STORAGE=s3
# or leave auto and set the bucket:
AWS_REPORTS_BUCKET=your-prod-reports-bucket
AWS_S3_REGION_NAME=ap-south-1
REPORT_PRESIGNED_URL_EXPIRY_SECONDS=300
```

Also configure AWS credentials the usual way (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / instance role).

## Related settings

| Env | Purpose |
|-----|---------|
| `AWS_REPORTS_BUCKET` | Bucket name; empty → local when mode is `auto` |
| `AWS_S3_REGION_NAME` | Region (default `ap-south-1`) |
| `REPORT_PRESIGNED_URL_EXPIRY_SECONDS` | Presigned TTL (default 300) |
| `MEDIA_ROOT` / `MEDIA_URL` | Local filesystem root when not on S3 |

## Code entry points

- Backend mode: `diagnostics_engine.storage.s3_report_storage.reports_storage_backend()`
- Presigned vs stream: `reports_s3_enabled()` / `reports_local_stream_enabled()`
- Workspace views stream locally when S3 mode is off
