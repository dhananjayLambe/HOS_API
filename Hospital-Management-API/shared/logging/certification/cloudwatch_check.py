"""Optional CloudWatch smoke validation for development environments."""

from __future__ import annotations

import argparse
import json
import os
import sys

from shared.logging import Logger, LogModule
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler


def run_smoke_check(*, log_group: str, region: str, service_name: str) -> int:
    """Send info and exception logs to CloudWatch and flush."""
    handler = CloudWatchLogHandler(
        log_group=log_group,
        region=region,
        formatter=JSONLogFormatter(pretty=False),
        service_name=service_name,
    )
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))

    logger.info(
        "CloudWatch smoke check",
        module=LogModule.MONITORING,
        action="logging.smoke_check",
        metadata={"event": "smoke_check"},
    )
    try:
        raise RuntimeError("smoke check exception")
    except RuntimeError as exc:
        logger.exception(
            "CloudWatch exception smoke check",
            module=LogModule.MONITORING,
            action="logging.smoke_check_exception",
            exc=exc,
            metadata={"event": "smoke_check_exception"},
        )

    logger._dispatcher.flush()
    logger._dispatcher.close()
    print(json.dumps({"status": "ok", "stream": handler.stream_name}))
    return 0


def main(argv: list[str] | None = None) -> int:
    """CLI for CloudWatch validation."""
    parser = argparse.ArgumentParser(description="CloudWatch logging smoke check")
    parser.add_argument(
        "--log-group",
        default=os.getenv("CLOUDWATCH_LOG_GROUP", "/doctorprocare/dev/application"),
    )
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "ap-south-1"))
    parser.add_argument("--service-name", default="doctorprocare-api")
    args = parser.parse_args(argv)

    if os.getenv("CLOUDWATCH_VALIDATION", "").lower() not in {"1", "true", "yes"}:
        print("Set CLOUDWATCH_VALIDATION=1 to run live CloudWatch smoke check")
        return 0

    return run_smoke_check(
        log_group=args.log_group,
        region=args.region,
        service_name=args.service_name,
    )


if __name__ == "__main__":
    sys.exit(main())
