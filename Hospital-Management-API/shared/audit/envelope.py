"""Audit payload envelope construction."""

from __future__ import annotations

import socket
from datetime import datetime
from typing import Any

from django.conf import settings
from django.utils import timezone

SCHEMA_VERSION = "1.0"
BUILDER_VERSION = "1.0.0"

META_KEY = "_meta"
PAYLOAD_KEY = "payload"
META_SCHEMA_VERSION = "schema_version"
META_BUILDER_VERSION = "builder_version"
META_ORGANIZATION_ID = "organization_id"
META_REQUEST_ID = "request_id"
META_OCCURRED_AT = "occurred_at"
META_TIMEZONE = "timezone"
META_APPLICATION_VERSION = "application_version"
META_SERVICE_NAME = "service_name"
META_HOSTNAME = "hostname"
META_ENVIRONMENT = "environment"
META_DEPLOYMENT = "deployment"
META_TENANT = "tenant"


def build_metadata_envelope(
    *,
    organization_id: str,
    request_id: str | None = None,
    occurred_at: datetime | None = None,
    service_name: str | None = None,
    environment: str | None = None,
    deployment: str | None = None,
    tenant: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        META_SCHEMA_VERSION: SCHEMA_VERSION,
        META_BUILDER_VERSION: BUILDER_VERSION,
        META_ORGANIZATION_ID: organization_id,
    }
    if request_id:
        meta[META_REQUEST_ID] = request_id
    if occurred_at is not None:
        meta[META_OCCURRED_AT] = occurred_at.isoformat()
    else:
        meta[META_OCCURRED_AT] = timezone.now().isoformat()
    meta[META_TIMEZONE] = str(timezone.get_current_timezone())
    meta[META_APPLICATION_VERSION] = getattr(
        settings, "APPLICATION_VERSION", None
    ) or "0.0.0"
    if service_name:
        meta[META_SERVICE_NAME] = service_name
    if environment:
        meta[META_ENVIRONMENT] = environment
    elif hasattr(settings, "ENVIRONMENT"):
        meta[META_ENVIRONMENT] = getattr(settings, "ENVIRONMENT", None)
    if deployment:
        meta[META_DEPLOYMENT] = deployment
    if tenant:
        meta[META_TENANT] = tenant
    try:
        meta[META_HOSTNAME] = socket.gethostname()
    except OSError:
        meta[META_HOSTNAME] = None
    if extra:
        meta.update(extra)
    return meta


def build_new_value_envelope(
    *,
    organization_id: str,
    payload: dict[str, Any] | None,
    request_id: str | None = None,
    occurred_at: datetime | None = None,
    service_name: str | None = None,
    environment: str | None = None,
    deployment: str | None = None,
    tenant: str | None = None,
    meta_extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        META_KEY: build_metadata_envelope(
            organization_id=organization_id,
            request_id=request_id,
            occurred_at=occurred_at,
            service_name=service_name,
            environment=environment,
            deployment=deployment,
            tenant=tenant,
            extra=meta_extra,
        ),
    }
    if payload is not None:
        envelope[PAYLOAD_KEY] = payload
    return envelope
