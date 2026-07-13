# CloudWatch Integration (M5.8)

M5.8 links Support Trace records to **CloudWatch console URLs**. It does **not** query CloudWatch APIs or store log content.

## CloudWatchLinkBuilder

Pure URL builder in `support_trace/runtime/cloudwatch_links.py`:

```python
from support_trace.runtime.cloudwatch_links import CloudWatchLinkBuilder

url = CloudWatchLinkBuilder.build_url(
    region="us-east-1",
    log_group="/aws/doctorprocare/api",
    log_stream="api/host/2026-07-13",
    request_id="req-abc-123",
)
```

URLs point to the AWS console log-events view with optional filter pattern for `request_id`.

## Stored on trace

`runtime_metadata.cloudwatch_url` is set when `log_group` and `log_region` are available.

## Out of scope

- Log Insights queries
- Live log fetching (`CloudWatchAdapter` remains a stub)
- OpenSearch / Grafana / X-Ray

Support Trace = **references**. CloudWatch = **logs**.
