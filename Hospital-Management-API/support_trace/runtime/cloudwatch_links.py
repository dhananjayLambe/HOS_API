"""CloudWatch console URL builder — no AWS API calls."""

from __future__ import annotations

from datetime import datetime
from urllib.parse import quote

from support_trace.runtime.constants import CLOUDWATCH_CONSOLE_BASE


class CloudWatchLinkBuilder:
    @classmethod
    def build_url(
        cls,
        *,
        region: str,
        log_group: str,
        log_stream: str | None = None,
        timestamp: datetime | None = None,
        request_id: str | None = None,
    ) -> str | None:
        if not region or not log_group:
            return None
        base = CLOUDWATCH_CONSOLE_BASE.format(region=region)
        params = [f"region={quote(region, safe='')}"]
        group_enc = quote(log_group, safe="")
        if log_stream:
            stream_enc = quote(log_stream, safe="")
            path = (
                f"#logsV2:log-groups/log-group/{group_enc}/log-events/{stream_enc}"
            )
        else:
            path = f"#logsV2:log-groups/log-group/{group_enc}"
        url = f"{base}?{'&'.join(params)}{path}"
        if timestamp:
            ts_ms = int(timestamp.timestamp() * 1000)
            url = f"{url}$start={ts_ms}"
        if request_id:
            url = f"{url}&filterPattern={quote(request_id, safe='')}"
        return url
