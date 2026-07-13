"""Runtime domain types."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class RuntimeContext:
    correlation_id: str | None = None
    request_id: str | None = None
    log_group: str | None = None
    log_stream: str | None = None
    log_region: str | None = None
    lambda_request_id: str | None = None
    celery_task_id: str | None = None
    celery_worker: str | None = None
    celery_queue: str | None = None
    deployment_version: str | None = None
    git_commit: str | None = None
    release_version: str | None = None
    hostname: str | None = None
    environment: str | None = None
    availability_zone: str | None = None
    aws_account: str | None = None
    container_id: str | None = None
    pod_name: str | None = None
    captured_at: datetime | None = None


@dataclass(frozen=True)
class RuntimeMetadata:
    """Serializable runtime metadata stored on SupportTrace."""

    correlation_id: str | None = None
    request_id: str | None = None
    log_group: str | None = None
    log_stream: str | None = None
    log_region: str | None = None
    cloudwatch_url: str | None = None
    lambda_request_id: str | None = None
    celery_task_id: str | None = None
    celery_worker: str | None = None
    celery_queue: str | None = None
    deployment_version: str | None = None
    git_commit: str | None = None
    release_version: str | None = None
    hostname: str | None = None
    environment: str | None = None
    availability_zone: str | None = None
    aws_account: str | None = None
    container_id: str | None = None
    pod_name: str | None = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict | None) -> RuntimeMetadata:
        if not data:
            return cls()
        fields = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in fields})
