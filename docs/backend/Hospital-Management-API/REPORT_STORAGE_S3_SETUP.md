# Report storage — S3 setup

## Buckets

- Staging: `doctorpro-stage-reports`
- Production: `doctorpro-prod-reports`

Block public access; enable SSE-S3 (AES256).

## Django settings

Set environment variables:

```bash
export AWS_REPORTS_BUCKET=doctorpro-stage-reports
export AWS_S3_REGION_NAME=ap-south-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export REPORT_PRESIGNED_URL_EXPIRY_SECONDS=300
```

When `AWS_REPORTS_BUCKET` is set, `STORAGES["default"]` uses `S3Boto3Storage` (see `main/settings.py`).

Without the bucket, files remain under local `MEDIA_ROOT` (development).

## Object key layout

Storage keys are **infrastructure-oriented** (date + encounter + report UUID). They are separate from share/download filenames.

```
diagnostic-reports/year=<YYYY>/month=<MM>/day=<DD>/encounter=<uuid>/report=<uuid>/artifact_<artifact_id>_v<version>.<ext>
```

| Field | Purpose | Example |
|-------|---------|---------|
| `original_filename` | Audit — operator upload | `CBC final signed.pdf` |
| `stored_filename` | Opaque blob inside the key | `artifact_7f21ab3c_v2.pdf` |
| `download_filename` | WhatsApp / browser download | `Rahul_Kumar_CBC_Report_19_May_2026.pdf` |
| `storage_path` / `file.name` | Full object key | `diagnostic-reports/year=2026/...` |

No patient names or phone numbers in storage keys. Implemented in `diagnostics_engine/storage/report_upload_paths.py`.

## Presigned downloads

- API: `GET /api/v1/diagnostics/reports/{report_id}/download/`
- Never expose `artifact.file.url` in JSON
- Local dev fallback: `?stream=1` returns `FileResponse` for authenticated lab users

## Future: quarantine / virus scan (Phase 2)

```
Upload → quarantine prefix → scan worker → scan_status=safe → mark-ready allowed
```

Do not presign objects until `scan_status=safe` when `REPORT_REQUIRE_VIRUS_SCAN=true`.
